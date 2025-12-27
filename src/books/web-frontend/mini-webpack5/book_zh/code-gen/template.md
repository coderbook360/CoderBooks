# Template 模板系统

Template 系统负责将依赖转换为具体的运行时代码，是代码生成的关键组件。

## DependencyTemplate

依赖模板基类：

```typescript
abstract class DependencyTemplate {
  /**
   * 应用模板，将依赖转换为代码
   */
  abstract apply(
    dependency: Dependency,
    source: ReplaceSource,
    templateContext: TemplateContext
  ): void
}
```

## TemplateContext

模板上下文：

```typescript
interface TemplateContext {
  /**
   * 运行时模板
   */
  runtimeTemplate: RuntimeTemplate
  
  /**
   * 依赖模板映射
   */
  dependencyTemplates: DependencyTemplates
  
  /**
   * 模块图
   */
  moduleGraph: ModuleGraph
  
  /**
   * Chunk 图
   */
  chunkGraph: ChunkGraph
  
  /**
   * 运行时需求
   */
  runtimeRequirements: Set<string>
  
  /**
   * 初始化片段
   */
  initFragments: InitFragment[]
  
  /**
   * 模块
   */
  module: Module
  
  /**
   * Runtime
   */
  runtime: RuntimeSpec
}
```

## 核心模板实现

### HarmonyImportSpecifierDependencyTemplate

ESM import 模板：

```typescript
class HarmonyImportSpecifierDependencyTemplate extends DependencyTemplate {
  apply(dependency, source, templateContext) {
    const { moduleGraph, runtimeTemplate, initFragments } = templateContext
    
    const importedModule = moduleGraph.getModule(dependency)
    
    if (!importedModule) {
      // 模块未找到
      source.replace(
        dependency.range[0],
        dependency.range[1] - 1,
        'undefined'
      )
      return
    }
    
    // 生成 import 变量名
    const importVar = `__WEBPACK_IMPORTED_MODULE_${dependency.id}__`
    
    // 添加 import 声明
    initFragments.push(
      new InitFragment(
        `import ${importVar} from ${JSON.stringify(importedModule.id)};\n`,
        InitFragment.STAGE_HARMONY_IMPORTS,
        dependency.sourceOrder
      )
    )
    
    // 替换使用位置
    const ids = dependency.ids
    const propertyAccess = ids.length > 0
      ? ids.map(id => `[${JSON.stringify(id)}]`).join('')
      : ''
    
    source.replace(
      dependency.range[0],
      dependency.range[1] - 1,
      `${importVar}${propertyAccess}`
    )
  }
}
```

### HarmonyExportSpecifierDependencyTemplate

ESM export 模板：

```typescript
class HarmonyExportSpecifierDependencyTemplate extends DependencyTemplate {
  apply(dependency, source, templateContext) {
    const { runtimeTemplate, initFragments, runtimeRequirements } = templateContext
    
    const exportName = dependency.name
    const localName = dependency.id
    
    initFragments.push(
      new InitFragment(
        runtimeTemplate.defineEsModuleFlagStatement({
          exportsArgument: '__webpack_exports__'
        }),
        InitFragment.STAGE_HARMONY_EXPORTS,
        0
      )
    )
    
    initFragments.push(
      new InitFragment(
        `__webpack_require__.d(__webpack_exports__, ${JSON.stringify(exportName)}, function() { return ${localName}; });\n`,
        InitFragment.STAGE_HARMONY_EXPORTS,
        dependency.sourceOrder
      )
    )
    
    runtimeRequirements.add('exports')
    runtimeRequirements.add('definePropertyGetters')
  }
}
```

### CommonJsRequireDependencyTemplate

CommonJS require 模板：

```typescript
class CommonJsRequireDependencyTemplate extends DependencyTemplate {
  apply(dependency, source, templateContext) {
    const { moduleGraph, runtimeRequirements } = templateContext
    
    const importedModule = moduleGraph.getModule(dependency)
    
    if (!importedModule) {
      source.replace(
        dependency.range[0],
        dependency.range[1] - 1,
        'undefined'
      )
      return
    }
    
    source.replace(
      dependency.range[0],
      dependency.range[1] - 1,
      `__webpack_require__(${JSON.stringify(importedModule.id)})`
    )
    
    runtimeRequirements.add('require')
  }
}
```

### ImportDependencyTemplate

动态 import() 模板：

```typescript
class ImportDependencyTemplate extends DependencyTemplate {
  apply(dependency, source, templateContext) {
    const { runtimeTemplate, moduleGraph, chunkGraph, runtimeRequirements } = templateContext
    
    const importedModule = moduleGraph.getModule(dependency)
    const block = moduleGraph.getParentBlock(dependency)
    const chunkGroup = chunkGraph.getBlockChunkGroup(block)
    const chunkIds = chunkGroup.chunks.map(c => c.id)
    
    const promise = runtimeTemplate.moduleNamespacePromise({
      chunkGraph,
      block,
      module: importedModule,
      request: dependency.request,
      strict: true,
      message: 'import()'
    })
    
    source.replace(
      dependency.range[0],
      dependency.range[1] - 1,
      promise
    )
    
    runtimeRequirements.add('ensureChunk')
  }
}
```

## RuntimeTemplate

运行时代码生成辅助：

```typescript
class RuntimeTemplate {
  /**
   * 定义 ES Module 标志
   */
  defineEsModuleFlagStatement({ exportsArgument }) {
    return `__webpack_require__.r(${exportsArgument});\n`
  }
  
  /**
   * 模块命名空间 Promise
   */
  moduleNamespacePromise(options) {
    const { module, block, chunkGraph } = options
    const chunkGroup = chunkGraph.getBlockChunkGroup(block)
    const chunkIds = chunkGroup.chunks.map(c => JSON.stringify(c.id))
    
    return `__webpack_require__.e(${chunkIds.join(', ')}).then(__webpack_require__.bind(__webpack_require__, ${JSON.stringify(module.id)}))`
  }
  
  /**
   * 模块导出访问
   */
  moduleExports(options) {
    const { module, moduleGraph } = options
    return `__webpack_require__(${JSON.stringify(module.id)})`
  }
  
  /**
   * 返回函数
   */
  returningFunction(returnValue, args = '') {
    return `function(${args}) { return ${returnValue}; }`
  }
  
  /**
   * 基础函数
   */
  basicFunction(args, body) {
    return `function(${args}) {\n${body}\n}`
  }
}
```

## InitFragment 阶段

```typescript
class InitFragment {
  static STAGE_CONSTANTS = 10
  static STAGE_ASYNC_BOUNDARY = 20
  static STAGE_HARMONY_EXPORTS = 30
  static STAGE_HARMONY_IMPORTS = 40
  static STAGE_PROVIDES = 50
  static STAGE_ASYNC_DEPENDENCIES = 60
  static STAGE_ASYNC_HARMONY_IMPORTS = 70
}
```

## 模板注册

```typescript
class Compilation {
  constructor() {
    this.dependencyTemplates = new DependencyTemplates()
    
    // 注册内置模板
    this.dependencyTemplates.set(
      HarmonyImportDependency,
      new HarmonyImportDependencyTemplate()
    )
    
    this.dependencyTemplates.set(
      HarmonyExportDependency,
      new HarmonyExportDependencyTemplate()
    )
    
    this.dependencyTemplates.set(
      CommonJsRequireDependency,
      new CommonJsRequireDependencyTemplate()
    )
    
    this.dependencyTemplates.set(
      ImportDependency,
      new ImportDependencyTemplate()
    )
  }
}
```

## 生成示例

输入代码：

```javascript
import { name } from './person'
export default function hello() {
  return `Hello ${name}`
}
```

模板处理后：

```javascript
// Stage 30: Harmony Exports
__webpack_require__.r(__webpack_exports__);

// Stage 40: Harmony Imports
var __WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./person.js");

// Stage 30: Harmony Exports
__webpack_require__.d(__webpack_exports__, "default", function() { return hello; });

// 原始代码（经过替换）
function hello() {
  return `Hello ${__WEBPACK_IMPORTED_MODULE_0__["name"]}`
}
```

## 总结

- Template 系统将依赖转换为运行时代码
- DependencyTemplate 是模板基类
- InitFragment 管理初始化代码片段
- RuntimeTemplate 提供运行时代码生成辅助
- 通过 stage 控制片段顺序
- 支持 ESM、CommonJS、动态 import 等
