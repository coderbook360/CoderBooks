---
sidebar_position: 116
title: "代码生成概述"
---

# 代码生成概述

代码生成是 Webpack 将模块转换为可执行 JavaScript 代码的阶段，是打包流程中的核心环节。

## 生成流程

### 整体架构

```
Module ──→ CodeGeneration ──→ Runtime ──→ Assets
   │            │               │           │
   ▼            ▼               ▼           ▼
 解析完成    生成模块代码     添加运行时    输出文件
```

### 触发时机

```typescript
class Compilation {
  seal(callback: Callback): void {
    // ... 优化阶段完成后
    
    // 代码生成
    this.codeGeneration((err) => {
      if (err) return callback(err);
      
      // 创建模块资源
      this.createModuleAssets();
      
      // 创建 chunk 资源
      this.createChunkAssets(callback);
    });
  }
}
```

## CodeGeneration 阶段

### 核心实现

```typescript
class Compilation {
  codeGenerationResults: CodeGenerationResults;
  
  codeGeneration(callback: Callback): void {
    const { chunkGraph, moduleGraph } = this;
    
    // 并行生成所有模块的代码
    asyncLib.forEach(
      this.modules,
      (module, callback) => {
        this.codeGenerationModule(module, (err, result) => {
          if (err) return callback(err);
          
          // 存储生成结果
          this.codeGenerationResults.add(module, result);
          callback();
        });
      },
      callback
    );
  }
  
  codeGenerationModule(
    module: Module,
    callback: Callback<CodeGenerationResult>
  ): void {
    // 获取模块所属的运行时
    const runtimes = chunkGraph.getModuleRuntimes(module);
    
    // 为每个运行时生成代码
    const results = new Map<string, Source>();
    
    for (const runtime of runtimes) {
      const context: CodeGenerationContext = {
        chunkGraph: this.chunkGraph,
        moduleGraph: this.moduleGraph,
        runtime,
        runtimeTemplate: this.runtimeTemplate,
        dependencyTemplates: this.dependencyTemplates,
      };
      
      // 调用模块的代码生成方法
      const result = module.codeGeneration(context);
      results.set(runtime, result);
    }
    
    callback(null, { results });
  }
}
```

### CodeGenerationResult 结构

```typescript
interface CodeGenerationResult {
  // 生成的源代码，按类型分类
  sources: Map<string, Source>;
  
  // 运行时需求
  runtimeRequirements: Set<string>;
  
  // 数据（用于传递额外信息）
  data?: Map<string, any>;
}

// 示例结果
{
  sources: Map {
    'javascript' => RawSource('function add(a, b) { return a + b; }'),
  },
  runtimeRequirements: Set {
    '__webpack_require__',
    '__webpack_exports__',
  },
}
```

## 模块代码生成

### JavascriptGenerator

```typescript
class JavascriptGenerator {
  generate(module: NormalModule, context: GenerateContext): Source {
    const source = new ReplaceSource(module.originalSource());
    
    // 初始化生成器
    const initFragments: InitFragment[] = [];
    
    // 处理每个依赖
    for (const dependency of module.dependencies) {
      this.processDependency(
        dependency,
        source,
        initFragments,
        context
      );
    }
    
    // 合并初始化片段
    return InitFragment.addToSource(
      source,
      initFragments,
      context
    );
  }
  
  processDependency(
    dependency: Dependency,
    source: ReplaceSource,
    initFragments: InitFragment[],
    context: GenerateContext
  ): void {
    // 获取依赖的模板
    const template = context.dependencyTemplates.get(dependency.constructor);
    
    if (template) {
      template.apply(dependency, source, {
        ...context,
        initFragments,
      });
    }
  }
}
```

### 依赖模板系统

```typescript
// 依赖模板：将依赖转换为代码
class HarmonyImportSpecifierDependencyTemplate {
  apply(
    dep: HarmonyImportSpecifierDependency,
    source: ReplaceSource,
    context: TemplateContext
  ): void {
    const { moduleGraph, module, runtime } = context;
    const importedModule = moduleGraph.getModule(dep);
    
    // 生成导入代码
    const exportExpr = this.getExportExpression(
      dep,
      importedModule,
      context
    );
    
    // 替换原始代码
    source.replace(
      dep.range[0],
      dep.range[1] - 1,
      exportExpr
    );
  }
  
  getExportExpression(
    dep: HarmonyImportSpecifierDependency,
    module: Module,
    context: TemplateContext
  ): string {
    const { runtimeTemplate } = context;
    
    // 获取模块访问表达式
    const moduleAccess = runtimeTemplate.moduleExportsAccess({
      module,
      request: dep.request,
    });
    
    // 获取导出名称
    const exportName = dep.name;
    
    if (exportName === 'default') {
      return `${moduleAccess}["default"]`;
    }
    
    return `${moduleAccess}[${JSON.stringify(exportName)}]`;
  }
}
```

## 初始化片段

### InitFragment 概念

```typescript
// 初始化片段：在模块代码开头或结尾添加的代码
abstract class InitFragment {
  stage: number;
  position: number;
  
  abstract getContent(context: GenerateContext): string;
  abstract getEndContent(context: GenerateContext): string;
  
  static addToSource(
    source: Source,
    fragments: InitFragment[],
    context: GenerateContext
  ): Source {
    // 按优先级排序
    fragments.sort((a, b) => {
      if (a.stage !== b.stage) return a.stage - b.stage;
      return a.position - b.position;
    });
    
    const concatSource = new ConcatSource();
    
    // 添加开头内容
    for (const fragment of fragments) {
      const content = fragment.getContent(context);
      if (content) {
        concatSource.add(content);
      }
    }
    
    // 添加原始源码
    concatSource.add(source);
    
    // 添加结尾内容
    for (const fragment of fragments.reverse()) {
      const endContent = fragment.getEndContent(context);
      if (endContent) {
        concatSource.add(endContent);
      }
    }
    
    return concatSource;
  }
}
```

### 常见初始化片段

```typescript
// 导入声明片段
class HarmonyImportDependencyInitFragment extends InitFragment {
  constructor(
    private request: string,
    private moduleId: string
  ) {
    super();
    this.stage = InitFragment.STAGE_HARMONY_IMPORTS;
  }
  
  getContent(context: GenerateContext): string {
    return `var ${this.getVarName()} = __webpack_require__(${JSON.stringify(this.moduleId)});\n`;
  }
  
  getVarName(): string {
    return `_${this.request.replace(/[^a-zA-Z0-9]/g, '_')}__WEBPACK_IMPORTED_MODULE_0__`;
  }
}

// 导出声明片段
class HarmonyExportInitFragment extends InitFragment {
  constructor(private exportName: string) {
    super();
    this.stage = InitFragment.STAGE_HARMONY_EXPORTS;
  }
  
  getContent(context: GenerateContext): string {
    return '';  // 导出在末尾
  }
  
  getEndContent(context: GenerateContext): string {
    return `\n__webpack_require__.d(__webpack_exports__, ${JSON.stringify(this.exportName)}, function() { return ${this.exportName}; });`;
  }
}
```

## 运行时需求

### RuntimeRequirements

```typescript
// 运行时需求常量
const RuntimeGlobals = {
  require: '__webpack_require__',
  exports: '__webpack_exports__',
  module: 'module',
  definePropertyGetters: '__webpack_require__.d',
  makeNamespaceObject: '__webpack_require__.r',
  hasOwnProperty: '__webpack_require__.o',
  publicPath: '__webpack_require__.p',
  ensureChunk: '__webpack_require__.e',
  getFullHash: '__webpack_require__.h',
  // ...
};
```

### 收集运行时需求

```typescript
class Compilation {
  processRuntimeRequirements(): void {
    // 收集模块的运行时需求
    for (const module of this.modules) {
      const result = this.codeGenerationResults.get(module);
      
      for (const requirement of result.runtimeRequirements) {
        this.addRuntimeRequirement(module, requirement);
      }
    }
    
    // 处理 chunk 的运行时需求
    for (const chunk of this.chunks) {
      this.processChunkRuntimeRequirements(chunk);
    }
  }
  
  processChunkRuntimeRequirements(chunk: Chunk): void {
    const runtimeRequirements = new Set<string>();
    
    // 收集 chunk 中所有模块的需求
    for (const module of this.chunkGraph.getChunkModulesIterable(chunk)) {
      const moduleRequirements = this.codeGenerationResults
        .get(module)
        ?.runtimeRequirements;
      
      if (moduleRequirements) {
        for (const req of moduleRequirements) {
          runtimeRequirements.add(req);
        }
      }
    }
    
    // 存储到 chunk
    this.chunkGraph.addChunkRuntimeRequirements(chunk, runtimeRequirements);
  }
}
```

## 生成结果存储

### CodeGenerationResults

```typescript
class CodeGenerationResults {
  private map: Map<Module, Map<string, CodeGenerationResult>>;
  
  add(module: Module, runtime: string, result: CodeGenerationResult): void {
    let runtimeMap = this.map.get(module);
    
    if (!runtimeMap) {
      runtimeMap = new Map();
      this.map.set(module, runtimeMap);
    }
    
    runtimeMap.set(runtime, result);
  }
  
  get(module: Module, runtime?: string): CodeGenerationResult | undefined {
    const runtimeMap = this.map.get(module);
    if (!runtimeMap) return undefined;
    
    if (runtime) {
      return runtimeMap.get(runtime);
    }
    
    // 返回第一个结果
    return runtimeMap.values().next().value;
  }
  
  getSource(module: Module, runtime: string, type: string): Source | undefined {
    const result = this.get(module, runtime);
    return result?.sources.get(type);
  }
}
```

## 生成阶段 Hook

### 钩子列表

```typescript
class Compilation {
  hooks: {
    // 模块代码生成前
    beforeModuleHash: SyncHook<[Module]>;
    
    // 模块代码生成后
    afterModuleHash: SyncHook<[Module]>;
    
    // 运行时需求处理
    additionalModuleRuntimeRequirements: SyncHook<[Module, Set<string>]>;
    runtimeRequirementInModule: HookMap<SyncBailHook<[Module, Set<string>]>>;
    
    // Chunk 代码生成
    beforeChunkAsset: SyncHook<[Chunk]>;
    renderManifest: SyncWaterfallHook<[RenderManifestEntry[], RenderManifestOptions]>;
  };
}
```

## 总结

代码生成概述的核心要点：

**生成流程**：
1. codeGeneration 阶段
2. 收集运行时需求
3. 创建资源

**核心组件**：
- JavascriptGenerator：模块代码生成
- DependencyTemplate：依赖转换
- InitFragment：初始化片段

**运行时需求**：
- 模块级别收集
- Chunk 级别聚合
- 按需生成运行时

**结果存储**：
- CodeGenerationResults
- 按模块和运行时索引

**下一章**：我们将学习 JavascriptGenerator 的详细实现。
