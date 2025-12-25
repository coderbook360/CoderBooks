---
sidebar_position: 26
title: "Compilation 类设计与职责"
---

# Compilation 类设计与职责

如果说 Compiler 是构建流程的"调度中心"，那么 Compilation 就是每次构建的"工作现场"——它承载着模块解析、依赖分析、代码生成等所有实际工作。

## 核心问题：为什么需要 Compilation？

思考一下，Webpack 的 watch 模式下，文件改动会触发重新编译。如果所有状态都存在 Compiler 中，每次重编译都要清理上次的数据，这既麻烦又容易出错。

更好的设计是：**每次编译创建一个独立的 Compilation 对象**，编译完成后这个对象就完成了使命。这就是 Compilation 存在的意义——隔离每次编译的状态。

## Compilation 的核心职责

```
                    ┌─────────────────────────────────┐
                    │         Compilation              │
                    │                                  │
   Entry ──────────▶│  1. 模块解析（Module Resolution）  │
                    │  2. 依赖分析（Dependency Analysis） │
                    │  3. 代码优化（Optimization）       │
                    │  4. 代码生成（Code Generation）    │
                    │  5. 资源封装（Asset Sealing）      │
                    │                                  │
                    └──────────────┬──────────────────┘
                                   │
                                   ▼
                              Assets（产物）
```

Compilation 负责的五大核心职责：

1. **模块解析**：从入口出发，找到所有需要的模块
2. **依赖分析**：分析模块之间的依赖关系，构建 ModuleGraph
3. **代码优化**：Tree Shaking、Scope Hoisting 等优化手段
4. **代码生成**：将模块转换为最终的 JavaScript 代码
5. **资源封装**：将代码组织成 Chunk，准备输出

## 类设计与属性

```typescript
import { Compiler } from './Compiler';
import { Module } from './Module';
import { Chunk } from './Chunk';
import { ChunkGroup, Entrypoint } from './ChunkGroup';
import { ModuleGraph } from './ModuleGraph';
import { ChunkGraph } from './ChunkGraph';
import { Dependency } from './Dependency';
import { Source } from 'webpack-sources';
import { 
  SyncHook, 
  SyncBailHook, 
  SyncWaterfallHook,
  AsyncSeriesHook,
  AsyncParallelHook 
} from 'tapable';

export interface CompilationParams {
  normalModuleFactory: NormalModuleFactory;
  contextModuleFactory: ContextModuleFactory;
}

export interface Asset {
  source: Source;
  info: AssetInfo;
}

export interface AssetInfo {
  immutable?: boolean;
  development?: boolean;
  hotModuleReplacement?: boolean;
  sourceFilename?: string;
  javascriptModule?: boolean;
}

export interface EntryData {
  dependencies: Dependency[];
  includeDependencies: Dependency[];
  options: EntryOptions;
}

export class Compilation {
  // 关联对象
  compiler: Compiler;
  params: CompilationParams;
  
  // 模块相关
  modules: Set<Module>;                    // 所有模块集合
  moduleGraph: ModuleGraph;                // 模块依赖图
  
  // Chunk 相关
  chunks: Set<Chunk>;                      // 所有代码块集合
  chunkGraph: ChunkGraph;                  // 代码块依赖图
  chunkGroups: ChunkGroup[];               // 代码块组
  entrypoints: Map<string, Entrypoint>;    // 入口点映射
  
  // 资源相关
  assets: Record<string, Asset>;           // 输出资源
  assetsInfo: Map<string, AssetInfo>;      // 资源元信息
  
  // 入口相关
  entries: Map<string, EntryData>;         // 入口配置
  
  // 编译状态
  bail: boolean;                           // 遇错即停
  name?: string;                           // 编译名称
  hash?: string;                           // 编译哈希
  fullHash?: string;                       // 完整哈希
  
  // 错误与警告
  errors: Error[];
  warnings: Error[];
  
  // 钩子系统
  hooks: CompilationHooks;
  
  constructor(compiler: Compiler, params: CompilationParams) {
    this.compiler = compiler;
    this.params = params;
    
    // 初始化集合
    this.modules = new Set();
    this.chunks = new Set();
    this.chunkGroups = [];
    this.entrypoints = new Map();
    this.entries = new Map();
    this.assets = {};
    this.assetsInfo = new Map();
    this.errors = [];
    this.warnings = [];
    
    // 初始化依赖图
    this.moduleGraph = new ModuleGraph();
    this.chunkGraph = new ChunkGraph(this.moduleGraph);
    
    // 从 Compiler 继承配置
    this.bail = compiler.options.bail ?? false;
    
    // 初始化钩子
    this.hooks = this.createHooks();
  }
  
  private createHooks(): CompilationHooks {
    return {
      // 构建阶段
      buildModule: new SyncHook(['module']),
      succeedModule: new SyncHook(['module']),
      failedModule: new SyncHook(['module', 'error']),
      
      // 封装阶段
      seal: new SyncHook([]),
      afterSeal: new AsyncSeriesHook([]),
      
      // 优化阶段
      optimize: new SyncHook([]),
      optimizeModules: new SyncBailHook(['modules']),
      afterOptimizeModules: new SyncHook(['modules']),
      optimizeChunks: new SyncBailHook(['chunks', 'chunkGroups']),
      afterOptimizeChunks: new SyncHook(['chunks', 'chunkGroups']),
      
      // Tree Shaking
      optimizeTree: new AsyncSeriesHook(['chunks', 'modules']),
      afterOptimizeTree: new SyncHook(['chunks', 'modules']),
      
      // Chunk 优化
      optimizeChunkModules: new AsyncSeriesBailHook(['chunks', 'modules']),
      afterOptimizeChunkModules: new SyncHook(['chunks', 'modules']),
      
      // 代码生成
      beforeCodeGeneration: new SyncHook([]),
      afterCodeGeneration: new SyncHook([]),
      
      // 哈希计算
      beforeHash: new SyncHook([]),
      afterHash: new SyncHook([]),
      
      // 资源生成
      beforeModuleAssets: new SyncHook([]),
      additionalAssets: new AsyncSeriesHook([]),
      processAssets: new AsyncSeriesHook(['assets']),
      afterProcessAssets: new SyncHook(['assets']),
      
      // 完成
      afterSeal: new AsyncSeriesHook([]),
    };
  }
}
```

## 属性分类详解

### 1. 关联对象

```typescript
// Compilation 与 Compiler 的关系
this.compiler = compiler;  // 反向引用
this.params = params;      // 创建参数（包含两个工厂）
```

Compilation 持有对 Compiler 的引用，可以访问全局配置和插件。`params` 包含两个模块工厂：
- `normalModuleFactory`：处理普通模块（js、css等）
- `contextModuleFactory`：处理 require.context

### 2. 模块相关

```typescript
modules: Set<Module>;       // 所有解析出的模块
moduleGraph: ModuleGraph;   // 模块之间的依赖关系图
```

`modules` 是一个 Set，存储这次编译中所有被解析的模块。`moduleGraph` 则记录模块之间的依赖关系——谁依赖谁，导出了什么，导入了什么。

### 3. Chunk 相关

```typescript
chunks: Set<Chunk>;                      // 代码块集合
chunkGraph: ChunkGraph;                  // 代码块关系图
chunkGroups: ChunkGroup[];               // 代码块组
entrypoints: Map<string, Entrypoint>;    // 入口点
```

Webpack 的输出单位是 Chunk，不是 Module。多个 Module 会被打包进一个或多个 Chunk。`chunkGraph` 记录了哪些模块属于哪些 Chunk。

### 4. 资源相关

```typescript
assets: Record<string, Asset>;        // 最终输出的文件
assetsInfo: Map<string, AssetInfo>;   // 文件的元信息
```

`assets` 是最终要写入磁盘的内容，键是文件名，值是文件内容和元信息。

## Compilation 生命周期

```
addEntry()           ──▶  添加入口依赖
     │
     ▼
factorizeModule()    ──▶  创建模块实例
     │
     ▼
buildModule()        ──▶  解析源码，提取依赖
     │
     ▼
processModuleDependencies()  ──▶  递归处理依赖
     │
     ▼
seal()               ──▶  封装阶段开始
     │
     ├──▶ 创建 Chunks
     ├──▶ 优化 Modules
     ├──▶ 优化 Chunks
     ├──▶ Tree Shaking
     ├──▶ Code Generation
     └──▶ 生成 Assets
```

这个流程可以分为两大阶段：

1. **Make 阶段**：模块解析与依赖收集
2. **Seal 阶段**：优化、生成、封装

## Mini-Webpack 实现

```typescript
export class Compilation {
  compiler: Compiler;
  params: CompilationParams;
  
  // 核心数据结构
  modules: Set<Module> = new Set();
  moduleGraph: ModuleGraph;
  chunks: Set<Chunk> = new Set();
  chunkGraph: ChunkGraph;
  entrypoints: Map<string, Entrypoint> = new Map();
  entries: Map<string, EntryData> = new Map();
  
  // 输出资源
  assets: Record<string, Source> = {};
  
  // 错误收集
  errors: Error[] = [];
  warnings: Error[] = [];
  
  // 钩子（简化版本）
  hooks = {
    buildModule: new SyncHook<[Module]>(['module']),
    succeedModule: new SyncHook<[Module]>(['module']),
    failedModule: new SyncHook<[Module, Error]>(['module', 'error']),
    seal: new SyncHook([]),
    optimize: new SyncHook([]),
    afterSeal: new AsyncSeriesHook([]),
    processAssets: new AsyncSeriesHook<[Record<string, Source>]>(['assets']),
  };
  
  // 内部状态
  private processingModules: Map<string, Promise<Module>> = new Map();
  
  constructor(compiler: Compiler, params: CompilationParams) {
    this.compiler = compiler;
    this.params = params;
    
    this.moduleGraph = new ModuleGraph();
    this.chunkGraph = new ChunkGraph(this.moduleGraph);
  }
  
  /**
   * 获取配置的便捷方法
   */
  get options() {
    return this.compiler.options;
  }
  
  get inputFileSystem() {
    return this.compiler.inputFileSystem;
  }
  
  get outputFileSystem() {
    return this.compiler.outputFileSystem;
  }
  
  /**
   * 添加错误
   */
  addError(error: Error): void {
    this.errors.push(error);
  }
  
  /**
   * 添加警告
   */
  addWarning(warning: Error): void {
    this.warnings.push(warning);
  }
  
  /**
   * 检查是否有错误
   */
  hasErrors(): boolean {
    return this.errors.length > 0;
  }
  
  /**
   * 获取模块（通过标识符）
   */
  getModule(identifier: string): Module | undefined {
    for (const module of this.modules) {
      if (module.identifier() === identifier) {
        return module;
      }
    }
    return undefined;
  }
  
  /**
   * 获取入口模块
   */
  getEntryModules(): Module[] {
    const entryModules: Module[] = [];
    
    for (const [name, entryData] of this.entries) {
      for (const dep of entryData.dependencies) {
        const module = this.moduleGraph.getModule(dep);
        if (module) {
          entryModules.push(module);
        }
      }
    }
    
    return entryModules;
  }
  
  /**
   * 创建统计信息
   */
  getStats() {
    return new Stats(this);
  }
}
```

## 关键设计决策

### 1. Set vs Array

Webpack 使用 Set 存储 modules 和 chunks，而不是 Array。为什么？

```typescript
// 使用 Set 的优势
this.modules = new Set<Module>();

// 1. O(1) 的查重效率
this.modules.add(module);  // 自动去重

// 2. O(1) 的存在性检查
this.modules.has(module);

// 如果使用 Array
this.modules.push(module);
// 每次都要检查是否存在
if (!this.modules.find(m => m.identifier() === module.identifier())) {
  this.modules.push(module);
}
```

在大型项目中，模块数量可能达到数千甚至上万，Set 的性能优势非常明显。

### 2. 双图结构

Webpack 使用两个图结构：

```typescript
moduleGraph: ModuleGraph;   // 模块级别的依赖关系
chunkGraph: ChunkGraph;     // Chunk 级别的包含关系
```

为什么要分开？

- **ModuleGraph** 关注"谁依赖谁"——模块 A 依赖模块 B，导入了什么符号
- **ChunkGraph** 关注"谁属于谁"——模块 A 被打包进 Chunk X

这两个维度的信息是正交的，分开管理更清晰。

### 3. 入口数据结构

```typescript
entries: Map<string, EntryData>;

interface EntryData {
  dependencies: Dependency[];       // 入口依赖
  includeDependencies: Dependency[];// 额外包含的依赖
  options: EntryOptions;            // 入口配置
}
```

入口不是直接存储模块，而是存储依赖。这允许同一个模块被多个入口复用。

## 与 Compiler 的协作

```typescript
// Compiler 中创建 Compilation
class Compiler {
  compile(callback) {
    const params = this.newCompilationParams();
    
    this.hooks.beforeCompile.callAsync(params, err => {
      if (err) return callback(err);
      
      this.hooks.compile.call(params);
      
      // 创建新的 Compilation
      const compilation = this.newCompilation(params);
      
      // 触发 make 钩子，开始构建
      this.hooks.make.callAsync(compilation, err => {
        if (err) return callback(err);
        
        // 封装
        compilation.seal(err => {
          if (err) return callback(err);
          
          this.hooks.afterCompile.callAsync(compilation, err => {
            callback(err, compilation);
          });
        });
      });
    });
  }
  
  newCompilation(params) {
    const compilation = new Compilation(this, params);
    
    // 触发钩子，让插件有机会操作 compilation
    this.hooks.thisCompilation.call(compilation, params);
    this.hooks.compilation.call(compilation, params);
    
    return compilation;
  }
}
```

## 小结

Compilation 是 Webpack 构建过程的核心执行者。理解它的设计，你就理解了 Webpack 的一半。

关键要点：

1. **每次编译独立**：Compilation 隔离了每次编译的状态
2. **双图结构**：ModuleGraph 记录依赖，ChunkGraph 记录分组
3. **两阶段流程**：Make 阶段收集模块，Seal 阶段优化生成
4. **钩子驱动**：通过 hooks 让插件介入各个阶段

下一节，我们将深入 Compilation 的 Hooks 体系，看看它提供了哪些扩展点。
