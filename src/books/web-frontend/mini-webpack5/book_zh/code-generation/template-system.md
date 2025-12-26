---
sidebar_position: 118
title: "Template 模板系统"
---

# Template 模板系统

Template 模板系统是 Webpack 代码生成的核心抽象层，负责将模块、Chunk 和依赖转换为最终的 JavaScript 代码。

## 模板层次结构

### 架构概览

```
Template（基类）
    │
    ├── MainTemplate     → 主入口模板
    ├── ChunkTemplate    → Chunk 模板
    ├── ModuleTemplate   → 模块模板
    └── RuntimeTemplate  → 运行时模板
```

### Template 基类

```typescript
class Template {
  // 生成注释
  static toComment(str: string): string {
    if (!str) return '';
    return `/*! ${str.replace(/\*\//g, '* /')} */`;
  }
  
  // 生成正常注释
  static toNormalComment(str: string): string {
    if (!str) return '';
    return `/* ${str.replace(/\*\//g, '* /')} */`;
  }
  
  // 生成标识符
  static toIdentifier(str: string): string {
    return str
      .replace(/^[^a-zA-Z$_]/, '_')
      .replace(/[^a-zA-Z0-9$_]/g, '_');
  }
  
  // 缩进代码
  static indent(s: string | string[]): string {
    if (Array.isArray(s)) {
      return s.map(line => `\t${line}`).join('\n');
    }
    return s.split('\n').map(line => `\t${line}`).join('\n');
  }
  
  // 添加前缀
  static prefix(s: string | string[], prefix: string): string {
    const lines = Array.isArray(s) ? s : s.split('\n');
    return lines.map(line => `${prefix}${line}`).join('\n');
  }
  
  // 数组转代码
  static asString(str: string | string[]): string {
    if (Array.isArray(str)) {
      return str.join('\n');
    }
    return str;
  }
}
```

## RuntimeTemplate

### 核心功能

```typescript
class RuntimeTemplate {
  constructor(
    private compilation: Compilation,
    private outputOptions: OutputOptions
  ) {}
  
  // 生成模块访问表达式
  moduleExports({ module, request }: ModuleExportsOptions): string {
    const moduleId = this.compilation.chunkGraph.getModuleId(module);
    
    return `__webpack_require__(${JSON.stringify(moduleId)})`;
  }
  
  // 生成命名空间导出
  moduleNamespace({ module }: ModuleNamespaceOptions): string {
    const moduleId = this.compilation.chunkGraph.getModuleId(module);
    
    return (
      `__webpack_require__(${JSON.stringify(moduleId)})`
    );
  }
  
  // 生成命名空间对象
  moduleNamespaceObject({ module }: ModuleNamespaceOptions): string {
    return `__webpack_require__.t(${this.moduleExports({ module })}, 2)`;
  }
}
```

### 导出访问表达式

```typescript
class RuntimeTemplate {
  // 访问模块导出
  exportFromImport({
    module,
    request,
    exportName,
    originModule,
    asiSafe,
    isCall,
    callContext,
    importVar
  }: ExportFromImportOptions): string {
    if (!module) {
      return 'undefined';
    }
    
    const exportsInfo = this.compilation.moduleGraph.getExportsInfo(module);
    const usedName = exportsInfo.getUsedName(exportName);
    
    if (usedName === false) {
      return 'undefined /* unused export */';
    }
    
    // 默认导出
    if (exportName === 'default') {
      if (module.buildMeta?.defaultObject === 'redirect') {
        return importVar;
      }
      return `${importVar}["default"]`;
    }
    
    // 命名导出
    if (typeof usedName === 'string') {
      return `${importVar}[${JSON.stringify(usedName)}]`;
    }
    
    // 嵌套导出
    if (Array.isArray(usedName)) {
      let result = importVar;
      for (const name of usedName) {
        result += `[${JSON.stringify(name)}]`;
      }
      return result;
    }
    
    return importVar;
  }
  
  // 生成块加载
  blockPromise({ block, message, chunkGraph, runtimeRequirements }: BlockPromiseOptions): string {
    const chunkGroup = chunkGraph.getBlockChunkGroup(block);
    
    if (!chunkGroup || chunkGroup.chunks.length === 0) {
      return 'Promise.resolve()';
    }
    
    runtimeRequirements.add(RuntimeGlobals.ensureChunk);
    
    const chunks = [...chunkGroup.chunks];
    
    if (chunks.length === 1) {
      const chunk = chunks[0];
      const chunkId = chunkGraph.getChunkId(chunk);
      
      return `__webpack_require__.e(${JSON.stringify(chunkId)})`;
    }
    
    // 多个 chunk
    const promises = chunks.map(chunk => {
      const chunkId = chunkGraph.getChunkId(chunk);
      return `__webpack_require__.e(${JSON.stringify(chunkId)})`;
    });
    
    return `Promise.all([${promises.join(', ')}])`;
  }
}
```

## ModuleTemplate

### 模块包装

```typescript
class ModuleTemplate {
  render(
    module: Module,
    renderContext: RenderContext,
    hooks: ModuleTemplateHooks
  ): Source {
    const { chunkGraph, runtimeTemplate } = renderContext;
    
    // 获取模块源码
    const moduleSource = this.getModuleSource(module, renderContext);
    
    // 包装模块
    const source = new ConcatSource();
    
    // 模块函数开始
    source.add(this.renderModuleStart(module, renderContext));
    
    // 模块内容
    source.add(moduleSource);
    
    // 模块函数结束
    source.add(this.renderModuleEnd(module, renderContext));
    
    return source;
  }
  
  renderModuleStart(module: Module, context: RenderContext): string {
    const { chunkGraph } = context;
    const moduleId = chunkGraph.getModuleId(module);
    
    // 模块函数签名
    return (
      `\n${JSON.stringify(moduleId)}: ` +
      `function(module, __webpack_exports__, __webpack_require__) {\n`
    );
  }
  
  renderModuleEnd(module: Module, context: RenderContext): string {
    return '\n},\n';
  }
}
```

### 严格模式处理

```typescript
class ModuleTemplate {
  getModuleSource(module: Module, context: RenderContext): Source {
    const { compilation, runtimeTemplate } = context;
    
    // 获取代码生成结果
    const result = compilation.codeGenerationResults.get(module);
    const source = result?.sources.get('javascript');
    
    if (!source) {
      return new RawSource('/* (ignored) */');
    }
    
    // 添加严格模式标记
    const concatSource = new ConcatSource();
    
    if (this.shouldAddStrictMode(module)) {
      concatSource.add('"use strict";\n');
    }
    
    // 添加 ESM 命名空间标记
    if (module.buildMeta?.exportsType === 'namespace') {
      concatSource.add('__webpack_require__.r(__webpack_exports__);\n');
    }
    
    concatSource.add(source);
    
    return concatSource;
  }
  
  shouldAddStrictMode(module: Module): boolean {
    // ESM 模块默认严格模式
    if (module.buildMeta?.exportsType === 'namespace') {
      return true;
    }
    
    // 检查模块是否已有严格模式
    return module.buildMeta?.strictHarmonyModule === true;
  }
}
```

## ChunkTemplate

### Chunk 渲染

```typescript
class ChunkTemplate {
  render(
    chunk: Chunk,
    outputOptions: OutputOptions,
    renderContext: RenderContext
  ): Source {
    const { compilation, chunkGraph } = renderContext;
    
    // 获取模块源码
    const moduleSources = this.renderChunkModules(chunk, renderContext);
    
    // 渲染 chunk 包装
    return this.renderChunkWrapper(chunk, moduleSources, renderContext);
  }
  
  renderChunkModules(chunk: Chunk, context: RenderContext): Source {
    const { chunkGraph, compilation } = context;
    const source = new ConcatSource();
    
    source.add('{\n');
    
    const modules = chunkGraph.getChunkModulesIterableBySourceType(chunk, 'javascript');
    
    for (const module of modules) {
      const moduleSource = this.renderModule(module, context);
      source.add(moduleSource);
    }
    
    source.add('}');
    
    return source;
  }
  
  renderChunkWrapper(
    chunk: Chunk,
    moduleSources: Source,
    context: RenderContext
  ): Source {
    // 非入口 chunk 使用 JSONP
    if (!chunk.hasRuntime()) {
      return this.renderAsyncChunk(chunk, moduleSources, context);
    }
    
    // 入口 chunk 使用完整运行时
    return this.renderEntryChunk(chunk, moduleSources, context);
  }
  
  renderAsyncChunk(
    chunk: Chunk,
    moduleSources: Source,
    context: RenderContext
  ): Source {
    const { chunkGraph } = context;
    const chunkId = chunkGraph.getChunkId(chunk);
    
    const source = new ConcatSource();
    
    // JSONP 回调
    source.add(`(self["webpackChunk"] = self["webpackChunk"] || []).push([`);
    source.add(`[${JSON.stringify(chunkId)}],`);
    source.add(moduleSources);
    source.add(']);');
    
    return source;
  }
}
```

## MainTemplate

### 入口渲染

```typescript
class MainTemplate {
  render(
    chunk: Chunk,
    outputOptions: OutputOptions,
    renderContext: RenderContext
  ): Source {
    const source = new ConcatSource();
    
    // 添加运行时
    source.add(this.renderBootstrap(chunk, renderContext));
    
    // 添加模块
    source.add(this.renderModules(chunk, renderContext));
    
    // 添加启动代码
    source.add(this.renderStartup(chunk, renderContext));
    
    return source;
  }
  
  renderBootstrap(chunk: Chunk, context: RenderContext): Source {
    const { compilation, chunkGraph } = context;
    
    // 获取运行时需求
    const runtimeRequirements = chunkGraph.getTreeRuntimeRequirements(chunk);
    
    const source = new ConcatSource();
    
    // 添加运行时模块
    source.add(this.renderRuntime(chunk, runtimeRequirements, context));
    
    return source;
  }
  
  renderRuntime(
    chunk: Chunk,
    runtimeRequirements: Set<string>,
    context: RenderContext
  ): Source {
    const source = new ConcatSource();
    
    // __webpack_require__ 核心
    source.add(this.renderRequireFunction(context));
    
    // 按需添加运行时辅助函数
    if (runtimeRequirements.has(RuntimeGlobals.definePropertyGetters)) {
      source.add(this.renderDefinePropertyGetters());
    }
    
    if (runtimeRequirements.has(RuntimeGlobals.makeNamespaceObject)) {
      source.add(this.renderMakeNamespaceObject());
    }
    
    if (runtimeRequirements.has(RuntimeGlobals.ensureChunk)) {
      source.add(this.renderEnsureChunk(chunk, context));
    }
    
    return source;
  }
  
  renderRequireFunction(context: RenderContext): string {
    return `
// 模块缓存
var __webpack_module_cache__ = {};

// require 函数
function __webpack_require__(moduleId) {
  // 检查缓存
  var cachedModule = __webpack_module_cache__[moduleId];
  if (cachedModule !== undefined) {
    return cachedModule.exports;
  }
  
  // 创建新模块并缓存
  var module = __webpack_module_cache__[moduleId] = {
    exports: {}
  };
  
  // 执行模块函数
  __webpack_modules__[moduleId](module, module.exports, __webpack_require__);
  
  // 返回导出
  return module.exports;
}
`;
  }
}
```

## DependencyTemplates

### 模板注册

```typescript
class DependencyTemplates {
  private templates: Map<Function, DependencyTemplate>;
  
  constructor() {
    this.templates = new Map();
  }
  
  set(dependencyClass: Function, template: DependencyTemplate): void {
    this.templates.set(dependencyClass, template);
  }
  
  get(dependencyClass: Function): DependencyTemplate | undefined {
    return this.templates.get(dependencyClass);
  }
}

// 注册默认模板
class JavascriptModulesPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap(
      'JavascriptModulesPlugin',
      (compilation, { normalModuleFactory }) => {
        const { dependencyTemplates } = compilation;
        
        // 注册 Harmony 模板
        dependencyTemplates.set(
          HarmonyImportDependency,
          new HarmonyImportDependencyTemplate()
        );
        
        dependencyTemplates.set(
          HarmonyImportSpecifierDependency,
          new HarmonyImportSpecifierDependencyTemplate()
        );
        
        dependencyTemplates.set(
          HarmonyExportSpecifierDependency,
          new HarmonyExportSpecifierDependencyTemplate()
        );
        
        // 注册 CommonJS 模板
        dependencyTemplates.set(
          CommonJsRequireDependency,
          new CommonJsRequireDependencyTemplate()
        );
      }
    );
  }
}
```

## 模板 Hooks

### 扩展点

```typescript
class Compilation {
  hooks: {
    // 渲染模块
    renderModule: SyncWaterfallHook<[Source, Module, RenderContext]>;
    
    // 渲染 chunk
    renderChunk: SyncWaterfallHook<[Source, Chunk, RenderContext]>;
    
    // 渲染主模块
    renderMain: SyncWaterfallHook<[Source, Chunk, RenderContext]>;
    
    // 添加运行时模块
    additionalChunkRuntimeRequirements: SyncHook<[Chunk, Set<string>]>;
    
    // 渲染清单
    renderManifest: SyncWaterfallHook<[RenderManifestEntry[], RenderManifestOptions]>;
  };
}
```

## 总结

Template 模板系统的核心要点：

**模板层次**：
- Template：基础工具类
- RuntimeTemplate：运行时表达式
- ModuleTemplate：模块包装
- ChunkTemplate：Chunk 包装
- MainTemplate：入口生成

**核心功能**：
- 代码生成表达式
- 模块函数包装
- 运行时注入

**扩展机制**：
- DependencyTemplates 注册
- 模板 Hooks 扩展

**最佳实践**：
- 使用 ConcatSource 组合
- 按需生成运行时
- 保留 Source Map 信息

**下一章**：我们将学习 RuntimeModule 运行时模块。
