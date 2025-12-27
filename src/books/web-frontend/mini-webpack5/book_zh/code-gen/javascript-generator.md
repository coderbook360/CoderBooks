# JavascriptGenerator 实现

JavascriptGenerator 是处理 JavaScript 模块的核心 Generator，负责将 AST 和依赖转换为可执行代码。

## 核心实现

```typescript
class JavascriptGenerator extends Generator {
  generate(module, generateContext) {
    const {
      moduleGraph,
      runtimeTemplate,
      runtimeRequirements,
      dependencyTemplates,
      codeGenerationResults
    } = generateContext
    
    const source = this.createSource(module)
    
    // 初始化依赖
    const initFragments = []
    
    // 处理所有依赖
    this.handleDependencies(
      module,
      source,
      generateContext,
      initFragments
    )
    
    // 应用初始化片段
    return this.applyInitFragments(source, initFragments, generateContext)
  }
  
  createSource(module) {
    const originalSource = module.originalSource()
    return new ReplaceSource(originalSource)
  }
  
  handleDependencies(module, source, context, initFragments) {
    const { dependencies, presentationalDependencies } = module
    
    // 处理普通依赖
    for (const dependency of dependencies) {
      this.handleDependency(dependency, source, context, initFragments)
    }
    
    // 处理展示性依赖
    for (const dependency of presentationalDependencies || []) {
      this.handleDependency(dependency, source, context, initFragments)
    }
  }
  
  handleDependency(dependency, source, context, initFragments) {
    const template = context.dependencyTemplates.get(dependency.constructor)
    
    if (!template) {
      throw new Error(`No template for ${dependency.constructor.name}`)
    }
    
    template.apply(dependency, source, {
      ...context,
      initFragments
    })
  }
  
  applyInitFragments(source, initFragments, context) {
    if (initFragments.length === 0) {
      return source
    }
    
    // 排序初始化片段
    initFragments.sort((a, b) => {
      if (a.stage !== b.stage) return a.stage - b.stage
      return a.position - b.position
    })
    
    // 合并源码
    const sources = [source]
    const endContents = []
    
    for (const fragment of initFragments) {
      if (fragment.endContent) {
        endContents.push(fragment.endContent)
      }
      
      sources.unshift(fragment.getContent(context))
    }
    
    sources.push(...endContents.reverse())
    
    return new ConcatSource(...sources)
  }
}
```

## InitFragment

初始化代码片段：

```typescript
class InitFragment {
  constructor(content, stage, position, key, endContent) {
    this.content = content
    this.stage = stage
    this.position = position
    this.key = key
    this.endContent = endContent
  }
  
  getContent(context) {
    if (typeof this.content === 'function') {
      return this.content(context)
    }
    return this.content
  }
  
  merge(other) {
    // 合并相同 key 的片段
    return this
  }
}
```

## 依赖模板应用

### import 语句

```typescript
class HarmonyImportDependencyTemplate {
  apply(dependency, source, templateContext) {
    const { moduleGraph, runtimeRequirements, initFragments } = templateContext
    
    const importedModule = moduleGraph.getModule(dependency)
    const importVar = `__WEBPACK_IMPORTED_MODULE_${dependency.id}__`
    
    // 添加 import 变量声明
    initFragments.push(
      new InitFragment(
        `var ${importVar} = __webpack_require__(${JSON.stringify(importedModule.id)});\n`,
        InitFragment.STAGE_HARMONY_IMPORTS,
        dependency.sourceOrder,
        `harmony-import-${dependency.id}`
      )
    )
    
    // 替换使用位置
    if (dependency.ids.length > 0) {
      const propertyAccess = dependency.ids
        .map(id => `[${JSON.stringify(id)}]`)
        .join('')
      
      source.replace(
        dependency.range[0],
        dependency.range[1] - 1,
        `${importVar}${propertyAccess}`
      )
    }
    
    runtimeRequirements.add('require')
  }
}
```

### require 语句

```typescript
class CommonJsRequireDependencyTemplate {
  apply(dependency, source, templateContext) {
    const { moduleGraph, runtimeRequirements } = templateContext
    
    const importedModule = moduleGraph.getModule(dependency)
    
    source.replace(
      dependency.range[0],
      dependency.range[1] - 1,
      `__webpack_require__(${JSON.stringify(importedModule.id)})`
    )
    
    runtimeRequirements.add('require')
  }
}
```

### export 语句

```typescript
class HarmonyExportDependencyTemplate {
  apply(dependency, source, templateContext) {
    const { initFragments, runtimeRequirements } = templateContext
    
    initFragments.push(
      new InitFragment(
        `__webpack_require__.d(__webpack_exports__, ${JSON.stringify(dependency.name)}, function() { return ${dependency.id}; });\n`,
        InitFragment.STAGE_HARMONY_EXPORTS,
        dependency.sourceOrder
      )
    )
    
    runtimeRequirements.add('definePropertyGetters')
    runtimeRequirements.add('exports')
  }
}
```

## Runtime Requirements

运行时需求：

```typescript
const RuntimeGlobals = {
  require: '__webpack_require__',
  exports: '__webpack_exports__',
  module: 'module',
  definePropertyGetters: '__webpack_require__.d',
  hasOwnProperty: '__webpack_require__.o',
  makeNamespaceObject: '__webpack_require__.r',
  publicPath: '__webpack_require__.p',
  loadScript: '__webpack_require__.l',
  createFakeNamespaceObject: '__webpack_require__.t'
}
```

## 生成结果示例

输入：

```javascript
import { add } from './math'
console.log(add(1, 2))
```

输出：

```javascript
var __WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./math.js");
__webpack_require__.r(__webpack_exports__);

console.log(__WEBPACK_IMPORTED_MODULE_0__["add"](1, 2));
```

## Strict Mode

处理严格模式：

```typescript
class JavascriptGenerator {
  generate(module, generateContext) {
    const source = this.createSource(module)
    const initFragments = []
    
    // 添加严格模式
    if (module.buildInfo.strict) {
      initFragments.push(
        new InitFragment(
          '"use strict";\n',
          InitFragment.STAGE_CONSTANTS,
          -10
        )
      )
    }
    
    // ...
  }
}
```

## Source Map

处理 SourceMap：

```typescript
class JavascriptGenerator {
  createSource(module) {
    const originalSource = module.originalSource()
    
    if (originalSource instanceof SourceMapSource) {
      return new ReplaceSource(originalSource)
    }
    
    return new ReplaceSource(
      new OriginalSource(originalSource.source(), module.resource)
    )
  }
}
```

## 总结

- JavascriptGenerator 处理 JavaScript 模块
- 使用 ReplaceSource 替换依赖
- InitFragment 管理初始化代码
- DependencyTemplate 处理具体依赖类型
- RuntimeRequirements 跟踪运行时需求
- 支持 SourceMap 和严格模式
