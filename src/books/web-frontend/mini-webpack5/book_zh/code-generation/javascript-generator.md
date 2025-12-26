---
sidebar_position: 117
title: "JavascriptGenerator 实现"
---

# JavascriptGenerator 实现

JavascriptGenerator 是 Webpack 中负责将模块转换为可执行 JavaScript 代码的核心类。

## 类结构

### 基础定义

```typescript
class JavascriptGenerator extends Generator {
  // 支持的输出类型
  getTypes(module: Module): Set<string> {
    return new Set(['javascript']);
  }
  
  // 获取输出大小
  getSize(module: Module, type: string): number {
    const source = module.originalSource();
    return source ? source.size() : 0;
  }
  
  // 核心生成方法
  generate(
    module: NormalModule,
    context: GenerateContext
  ): Source {
    const originalSource = module.originalSource();
    
    if (!originalSource) {
      return new RawSource('throw new Error("No source available");');
    }
    
    // 创建可替换的源
    const source = new ReplaceSource(originalSource);
    
    // 初始化片段收集器
    const initFragments: InitFragment[] = [];
    
    // 处理依赖
    this.sourceDependencies(
      module,
      source,
      initFragments,
      context
    );
    
    // 合并初始化片段
    return InitFragment.addToSource(
      source,
      initFragments,
      context
    );
  }
}
```

## 依赖处理

### 遍历依赖

```typescript
class JavascriptGenerator {
  sourceDependencies(
    module: NormalModule,
    source: ReplaceSource,
    initFragments: InitFragment[],
    context: GenerateContext
  ): void {
    const { dependencyTemplates, runtimeTemplate, moduleGraph, runtime } = context;
    
    // 模板上下文
    const templateContext: TemplateContext = {
      runtimeTemplate,
      moduleGraph,
      module,
      runtime,
      initFragments,
      runtimeRequirements: new Set(),
    };
    
    // 处理普通依赖
    for (const dependency of module.dependencies) {
      this.sourceDependency(
        dependency,
        dependencyTemplates,
        source,
        templateContext
      );
    }
    
    // 处理 block 中的依赖（异步块）
    for (const block of module.blocks) {
      this.sourceBlock(
        block,
        dependencyTemplates,
        source,
        templateContext
      );
    }
    
    // 收集运行时需求
    context.runtimeRequirements = templateContext.runtimeRequirements;
  }
  
  sourceDependency(
    dependency: Dependency,
    templates: DependencyTemplates,
    source: ReplaceSource,
    context: TemplateContext
  ): void {
    const template = templates.get(dependency.constructor);
    
    if (!template) {
      // 无模板，跳过
      return;
    }
    
    template.apply(dependency, source, context);
  }
  
  sourceBlock(
    block: AsyncDependenciesBlock,
    templates: DependencyTemplates,
    source: ReplaceSource,
    context: TemplateContext
  ): void {
    // 处理块的依赖
    for (const dependency of block.dependencies) {
      this.sourceDependency(dependency, templates, source, context);
    }
    
    // 递归处理嵌套块
    for (const childBlock of block.blocks) {
      this.sourceBlock(childBlock, templates, source, context);
    }
  }
}
```

## 核心依赖模板

### HarmonyImportDependencyTemplate

```typescript
class HarmonyImportDependencyTemplate extends DependencyTemplate {
  apply(
    dep: HarmonyImportDependency,
    source: ReplaceSource,
    context: TemplateContext
  ): void {
    const { moduleGraph, module, initFragments, runtimeRequirements } = context;
    const importedModule = moduleGraph.getModule(dep);
    
    if (!importedModule) return;
    
    // 添加运行时需求
    runtimeRequirements.add(RuntimeGlobals.require);
    
    // 生成导入变量名
    const importVar = this.getImportVar(dep, importedModule, context);
    
    // 添加初始化片段
    initFragments.push(
      new HarmonyImportInitFragment(
        dep.request,
        importedModule,
        importVar
      )
    );
    
    // 移除原始 import 语句
    if (dep.range) {
      source.replace(dep.range[0], dep.range[1] - 1, '');
    }
  }
  
  getImportVar(
    dep: HarmonyImportDependency,
    module: Module,
    context: TemplateContext
  ): string {
    // 生成唯一的导入变量名
    const request = dep.request.replace(/[^a-zA-Z0-9]/g, '_');
    return `_${request}__WEBPACK_IMPORTED_MODULE_${context.moduleGraph.getModuleId(module)}__`;
  }
}
```

### HarmonyImportSpecifierDependencyTemplate

```typescript
class HarmonyImportSpecifierDependencyTemplate extends DependencyTemplate {
  apply(
    dep: HarmonyImportSpecifierDependency,
    source: ReplaceSource,
    context: TemplateContext
  ): void {
    const { moduleGraph, runtimeTemplate } = context;
    const importedModule = moduleGraph.getModule(dep);
    
    if (!importedModule) return;
    
    // 获取导出访问表达式
    const exportExpr = this.getExportExpression(dep, importedModule, context);
    
    // 替换标识符
    source.replace(dep.range[0], dep.range[1] - 1, exportExpr);
  }
  
  getExportExpression(
    dep: HarmonyImportSpecifierDependency,
    module: Module,
    context: TemplateContext
  ): string {
    const { moduleGraph, runtime } = context;
    const exportsInfo = moduleGraph.getExportsInfo(module);
    
    // 获取导入变量
    const importVar = this.getImportVar(dep, module, context);
    
    // 获取使用的名称
    const exportName = dep.name;
    const usedName = exportsInfo.getUsedName(exportName, runtime);
    
    if (usedName === false) {
      // 导出未使用
      return 'undefined';
    }
    
    if (exportName === 'default') {
      // 默认导出
      return `${importVar}["default"]`;
    }
    
    // 命名导出
    return `${importVar}[${JSON.stringify(usedName)}]`;
  }
}
```

### HarmonyExportSpecifierDependencyTemplate

```typescript
class HarmonyExportSpecifierDependencyTemplate extends DependencyTemplate {
  apply(
    dep: HarmonyExportSpecifierDependency,
    source: ReplaceSource,
    context: TemplateContext
  ): void {
    const { moduleGraph, module, initFragments, runtimeRequirements } = context;
    const exportsInfo = moduleGraph.getExportsInfo(module);
    const exportInfo = exportsInfo.getExportInfo(dep.name);
    
    // 检查导出是否被使用
    const usedName = exportInfo.getUsedName(dep.name, context.runtime);
    
    if (usedName === false) {
      // 未使用，添加注释
      source.insert(
        dep.range[1],
        `\n/* unused harmony export ${dep.name} */`
      );
      return;
    }
    
    // 添加运行时需求
    runtimeRequirements.add(RuntimeGlobals.exports);
    runtimeRequirements.add(RuntimeGlobals.definePropertyGetters);
    
    // 添加导出初始化片段
    initFragments.push(
      new HarmonyExportInitFragment(
        module,
        usedName,
        dep.id  // 本地绑定名
      )
    );
    
    // 移除 export 关键字
    if (dep.range) {
      source.replace(dep.range[0], dep.range[1] - 1, '');
    }
  }
}
```

## 初始化片段实现

### HarmonyImportInitFragment

```typescript
class HarmonyImportInitFragment extends InitFragment {
  constructor(
    private request: string,
    private module: Module,
    private importVar: string
  ) {
    super(
      undefined,
      InitFragment.STAGE_HARMONY_IMPORTS,
      0
    );
  }
  
  getContent(context: GenerateContext): string {
    const { chunkGraph, runtime } = context;
    const moduleId = chunkGraph.getModuleId(this.module);
    
    return (
      `/* harmony import */ ` +
      `var ${this.importVar} = __webpack_require__(${JSON.stringify(moduleId)});\n`
    );
  }
  
  merge(other: InitFragment): InitFragment {
    // 相同模块的导入可以合并
    if (
      other instanceof HarmonyImportInitFragment &&
      other.module === this.module
    ) {
      return this;
    }
    return undefined;
  }
}
```

### HarmonyExportInitFragment

```typescript
class HarmonyExportInitFragment extends InitFragment {
  constructor(
    private module: Module,
    private exportName: string,
    private localBinding: string
  ) {
    super(
      undefined,
      InitFragment.STAGE_HARMONY_EXPORTS,
      0
    );
  }
  
  getContent(context: GenerateContext): string {
    return '';  // 导出声明在模块开头，但定义在结尾
  }
  
  getEndContent(context: GenerateContext): string {
    return (
      `\n/* harmony export */ ` +
      `__webpack_require__.d(__webpack_exports__, ` +
      `${JSON.stringify(this.exportName)}, ` +
      `function() { return ${this.localBinding}; });`
    );
  }
}
```

## 代码替换

### ReplaceSource 使用

```typescript
class JavascriptGenerator {
  // 示例：处理 require 调用
  processRequireCall(
    dep: CommonJsRequireDependency,
    source: ReplaceSource,
    context: TemplateContext
  ): void {
    const { moduleGraph, chunkGraph } = context;
    const requiredModule = moduleGraph.getModule(dep);
    
    if (!requiredModule) return;
    
    const moduleId = chunkGraph.getModuleId(requiredModule);
    
    // 原始代码: require('./module')
    // 替换为: __webpack_require__(/*! ./module */ 1)
    
    const replacement = `__webpack_require__(/*! ${dep.request} */ ${JSON.stringify(moduleId)})`;
    
    source.replace(
      dep.range[0],
      dep.range[1] - 1,
      replacement
    );
  }
}
```

### 多次替换示例

```typescript
// 原始代码
const original = `
import { add, subtract } from './math';
const result = add(1, 2);
export { result };
`;

// 经过多个模板处理后
const generated = `
/* harmony import */ var _math__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1);

const result = _math__WEBPACK_IMPORTED_MODULE_0__["add"](1, 2);

/* harmony export */ __webpack_require__.d(__webpack_exports__, "result", function() { return result; });
`;
```

## 特殊情况处理

### 动态导入

```typescript
class ImportDependencyTemplate extends DependencyTemplate {
  apply(
    dep: ImportDependency,
    source: ReplaceSource,
    context: TemplateContext
  ): void {
    const { runtimeRequirements, chunkGraph } = context;
    const block = dep.block;
    const chunkGroup = chunkGraph.getBlockChunkGroup(block);
    
    if (!chunkGroup) return;
    
    // 添加运行时需求
    runtimeRequirements.add(RuntimeGlobals.ensureChunk);
    
    // 获取 chunk id
    const chunks = [...chunkGroup.chunks];
    const chunkIds = chunks.map(c => chunkGraph.getChunkId(c));
    
    // 生成动态导入代码
    const importExpr = this.generateImportExpression(chunkIds, dep, context);
    
    source.replace(dep.range[0], dep.range[1] - 1, importExpr);
  }
  
  generateImportExpression(
    chunkIds: string[],
    dep: ImportDependency,
    context: TemplateContext
  ): string {
    if (chunkIds.length === 1) {
      return (
        `__webpack_require__.e(${JSON.stringify(chunkIds[0])})` +
        `.then(__webpack_require__.bind(__webpack_require__, ${JSON.stringify(dep.module.id)}))`
      );
    }
    
    // 多个 chunk
    const promises = chunkIds.map(id => `__webpack_require__.e(${JSON.stringify(id)})`);
    return (
      `Promise.all([${promises.join(', ')}])` +
      `.then(__webpack_require__.bind(__webpack_require__, ${JSON.stringify(dep.module.id)}))`
    );
  }
}
```

### 上下文模块

```typescript
class ContextDependencyTemplate extends DependencyTemplate {
  apply(
    dep: ContextDependency,
    source: ReplaceSource,
    context: TemplateContext
  ): void {
    const { moduleGraph, chunkGraph } = context;
    const contextModule = moduleGraph.getModule(dep);
    
    if (!(contextModule instanceof ContextModule)) return;
    
    const moduleId = chunkGraph.getModuleId(contextModule);
    
    // require.context('./dir', true, /\.js$/)
    // 转换为对上下文模块的调用
    source.replace(
      dep.range[0],
      dep.range[1] - 1,
      `__webpack_require__(${JSON.stringify(moduleId)})`
    );
  }
}
```

## 总结

JavascriptGenerator 实现的核心要点：

**生成流程**：
1. 创建 ReplaceSource
2. 收集初始化片段
3. 处理依赖模板
4. 合并生成最终源码

**依赖模板**：
- HarmonyImportDependencyTemplate
- HarmonyExportSpecifierDependencyTemplate
- ImportDependencyTemplate

**初始化片段**：
- 按阶段排序
- 添加到模块开头/结尾
- 可合并相同片段

**代码替换**：
- ReplaceSource 处理
- 保留位置信息
- 支持 Source Map

**下一章**：我们将学习 Template 模板系统。
