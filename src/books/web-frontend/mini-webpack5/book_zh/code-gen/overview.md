# 代码生成阶段概述

代码生成阶段是 Webpack 构建流程的最后环节，负责将 Module、Chunk 转换为最终可执行的代码。

## 代码生成流程

```
Compilation.seal()
  └─> createChunkAssets()
      └─> getRenderManifest()
          └─> Generator.generate()
              └─> Template.apply()
                  └─> RuntimeTemplate
                      └─> Source
```

## 核心职责

### 1. Module 代码生成

每个 Module 根据其类型生成对应代码：

```typescript
class NormalModule {
  codeGeneration(context) {
    const sources = new Map()
    const runtimeRequirements = new Set()
    
    // 使用 Generator 生成代码
    const generator = this.createGenerator(context)
    const source = generator.generate(this, context)
    
    sources.set('javascript', source)
    
    return {
      sources,
      runtimeRequirements
    }
  }
}
```

### 2. Runtime 代码生成

生成运行时辅助代码：

```typescript
// __webpack_require__
function __webpack_require__(moduleId) {
  // 检查模块缓存
  if (__webpack_module_cache__[moduleId]) {
    return __webpack_module_cache__[moduleId].exports
  }
  
  // 创建模块
  const module = __webpack_module_cache__[moduleId] = {
    exports: {}
  }
  
  // 执行模块
  __webpack_modules__[moduleId](module, module.exports, __webpack_require__)
  
  return module.exports
}
```

### 3. Chunk 代码生成

生成 Chunk 文件：

```typescript
class Chunk {
  render(options) {
    const { moduleGraph, chunkGraph } = options
    
    // 获取 Chunk 中的所有模块
    const modules = chunkGraph.getChunkModules(this)
    
    // 生成模块注册表
    const modulesList = modules.map(module => {
      const source = module.codeGeneration()
      return `"${module.id}": ${source}`
    }).join(',\n')
    
    // 生成 Chunk 代码
    return `
      (function(modules) {
        // Runtime code
      })({
        ${modulesList}
      })
    `
  }
}
```

## Generator 体系

### JavascriptGenerator

处理 JavaScript 模块：

```typescript
class JavascriptGenerator {
  generate(module, generateContext) {
    const source = new ReplaceSource(module.originalSource())
    
    // 应用所有依赖的模板
    for (const dependency of module.dependencies) {
      const template = this.getDependencyTemplate(dependency)
      template.apply(dependency, source, templateContext)
    }
    
    return source
  }
}
```

### AssetGenerator

处理资源模块：

```typescript
class AssetGenerator {
  generate(module) {
    return new RawSource(module.content)
  }
}
```

## Template 系统

### DependencyTemplate

处理依赖替换：

```typescript
class HarmonyImportDependencyTemplate {
  apply(dependency, source, templateContext) {
    const { module, moduleGraph } = templateContext
    const importedModule = moduleGraph.getModule(dependency)
    
    // 替换 import 语句
    source.replace(
      dependency.range[0],
      dependency.range[1],
      `__webpack_require__(${JSON.stringify(importedModule.id)})`
    )
  }
}
```

### RuntimeTemplate

生成运行时代码片段：

```typescript
class RuntimeTemplate {
  moduleExports(options) {
    const { module, moduleGraph, request } = options
    return `__webpack_require__(${JSON.stringify(module.id)})`
  }
  
  returningFunction(returnValue) {
    return `function() { return ${returnValue}; }`
  }
}
```

## Source 处理

### webpack-sources

使用 webpack-sources 库处理代码：

```typescript
import { 
  RawSource, 
  ReplaceSource, 
  ConcatSource,
  SourceMapSource 
} from 'webpack-sources'

// 原始源码
const raw = new RawSource('console.log("hello")')

// 替换源码
const replace = new ReplaceSource(raw)
replace.replace(0, 7, 'alert')

// 合并源码
const concat = new ConcatSource(
  '(function() {',
  raw,
  '})()'
)
```

## 完整流程

```typescript
class Compilation {
  seal(callback) {
    // ... 优化阶段
    
    // 创建 Chunk 资源
    this.createChunkAssets()
    
    callback()
  }
  
  createChunkAssets() {
    for (const chunk of this.chunks) {
      // 生成 Chunk 代码
      const manifest = this.getRenderManifest({
        chunk,
        codeGenerationResults: this.codeGenerationResults
      })
      
      for (const entry of manifest) {
        // 创建资源
        this.emitAsset(entry.filename, entry.source)
      }
    }
  }
}
```

## 实战示例

### 简单打包结果

输入：

```javascript
// src/index.js
import { add } from './math.js'
console.log(add(1, 2))

// src/math.js
export function add(a, b) {
  return a + b
}
```

输出：

```javascript
(function(modules) {
  const __webpack_module_cache__ = {}
  
  function __webpack_require__(moduleId) {
    if (__webpack_module_cache__[moduleId]) {
      return __webpack_module_cache__[moduleId].exports
    }
    
    const module = __webpack_module_cache__[moduleId] = { exports: {} }
    modules[moduleId](module, module.exports, __webpack_require__)
    return module.exports
  }
  
  return __webpack_require__("./src/index.js")
})({
  "./src/index.js": function(module, exports, __webpack_require__) {
    const math = __webpack_require__("./src/math.js")
    console.log(math.add(1, 2))
  },
  "./src/math.js": function(module, exports) {
    exports.add = function(a, b) {
      return a + b
    }
  }
})
```

## 总结

- 代码生成阶段将抽象的 Module/Chunk 转换为可执行代码
- Generator 负责生成模块代码
- Template 负责处理依赖替换
- RuntimeTemplate 生成运行时辅助代码
- webpack-sources 提供 Source 操作能力
- 最终生成包含运行时和模块的完整代码
