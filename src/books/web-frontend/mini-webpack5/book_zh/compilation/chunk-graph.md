---
sidebar_position: 29
title: "ChunkGraph 代码块依赖图"
---

# ChunkGraph 代码块依赖图

如果说 ModuleGraph 回答的是"模块之间的依赖关系"，那么 ChunkGraph 回答的是"模块如何被分组到代码块（Chunk）中"。

## Chunk 与 Module 的关系

在 Webpack 中，Module 是代码的逻辑单位，而 Chunk 是输出的物理单位：

```
┌─────────────────────────────────────────────────────────┐
│                        Modules                           │
│   ┌───────┐  ┌───────┐  ┌───────┐  ┌───────┐  ┌───────┐ │
│   │   A   │  │   B   │  │   C   │  │   D   │  │   E   │ │
│   └───┬───┘  └───┬───┘  └───┬───┘  └───┬───┘  └───┬───┘ │
└───────┼──────────┼──────────┼──────────┼──────────┼─────┘
        │          │          │          │          │
        ▼          ▼          ▼          ▼          ▼
┌─────────────────────────────────────────────────────────┐
│                        Chunks                            │
│   ┌─────────────────┐   ┌─────────────────────────────┐ │
│   │   main.js       │   │        vendor.js            │ │
│   │   [A, B, C]     │   │        [D, E]               │ │
│   └─────────────────┘   └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

ChunkGraph 负责管理这种"模块 → Chunk"的映射关系。

## 为什么需要 ChunkGraph？

在 Webpack 4 中，模块与 Chunk 的关系存储在各自对象上：

```typescript
// Webpack 4
module._chunks;    // 模块属于哪些 chunks
chunk._modules;    // chunk 包含哪些模块
```

这种双向引用带来问题：

1. **数据冗余**：同一份信息存两份
2. **一致性风险**：两边需要同步更新
3. **代码分割复杂**：模块可能属于多个 Chunk，状态管理困难

ChunkGraph 将这些关系集中管理，提供统一的查询接口。

## ChunkGraph 的核心职责

```
                    ┌──────────────────────────────────┐
                    │          ChunkGraph              │
                    │                                  │
   Chunk A ─────────│  记录: A 包含 [Module1, Module2]  │
                    │  记录: Module1 属于 [A, B]        │
   Chunk B ─────────│  记录: 运行时信息                 │
                    │  记录: 模块在 Chunk 中的 ID        │
   Module1 ─────────│                                  │
                    │  支持查询、遍历、统计             │
   Module2 ─────────│                                  │
                    └──────────────────────────────────┘
```

ChunkGraph 负责：

1. **模块 ↔ Chunk 的双向映射**
2. **运行时模块管理**
3. **模块 ID 分配**
4. **Chunk 连接关系**

## 核心数据结构

### 两层映射

```typescript
/**
 * Chunk 级别的图信息
 */
export interface ChunkGraphChunk {
  /** Chunk 包含的模块 */
  modules: Set<Module>;
  
  /** 入口模块 */
  entryModules: Map<Module, Entrypoint>;
  
  /** 运行时模块 */
  runtimeModules: Set<RuntimeModule>;
  
  /** 完整的运行时哈希 */
  fullHashModules?: Set<Module>;
  
  /** 依赖的运行时 Chunks */
  runtimeRequirements: Set<string>;
}

/**
 * Module 级别的图信息
 */
export interface ChunkGraphModule {
  /** 模块所属的 Chunks */
  chunks: Set<Chunk>;
  
  /** 模块在各 Chunk 中的 ID */
  id: string | number | null;
  
  /** 运行时需求 */
  runtimeRequirements?: Map<Chunk, Set<string>>;
  
  /** 模块哈希 */
  hashes?: Map<Chunk, string>;
}
```

### TypeScript 完整定义

```typescript
import { Module, RuntimeModule } from './Module';
import { Chunk } from './Chunk';
import { Entrypoint, ChunkGroup } from './ChunkGroup';
import { ModuleGraph } from './ModuleGraph';

export class ChunkGraph {
  /** ModuleGraph 引用 */
  private moduleGraph: ModuleGraph;
  
  /** Chunk → ChunkGraphChunk 映射 */
  private _chunks: WeakMap<Chunk, ChunkGraphChunk> = new WeakMap();
  
  /** Module → ChunkGraphModule 映射 */
  private _modules: WeakMap<Module, ChunkGraphModule> = new WeakMap();
  
  /** 运行时 ID 映射 */
  private _runtimeIds: Map<string, string | number> = new Map();
  
  constructor(moduleGraph: ModuleGraph) {
    this.moduleGraph = moduleGraph;
  }
  
  // =================== Chunk 操作 ===================
  
  /**
   * 获取或创建 Chunk 的图信息
   */
  private _getChunkGraphChunk(chunk: Chunk): ChunkGraphChunk {
    let cgc = this._chunks.get(chunk);
    
    if (!cgc) {
      cgc = {
        modules: new Set(),
        entryModules: new Map(),
        runtimeModules: new Set(),
        runtimeRequirements: new Set(),
      };
      this._chunks.set(chunk, cgc);
    }
    
    return cgc;
  }
  
  /**
   * 获取 Chunk 包含的模块数量
   */
  getNumberOfChunkModules(chunk: Chunk): number {
    const cgc = this._chunks.get(chunk);
    return cgc ? cgc.modules.size : 0;
  }
  
  /**
   * 获取 Chunk 包含的模块（可迭代）
   */
  getChunkModulesIterable(chunk: Chunk): Iterable<Module> {
    const cgc = this._chunks.get(chunk);
    return cgc ? cgc.modules : [];
  }
  
  /**
   * 获取 Chunk 包含的模块（数组）
   */
  getChunkModules(chunk: Chunk): Module[] {
    return [...this.getChunkModulesIterable(chunk)];
  }
  
  /**
   * 获取按顺序排列的 Chunk 模块
   */
  getOrderedChunkModules(
    chunk: Chunk,
    comparator: (a: Module, b: Module) => number
  ): Module[] {
    const modules = this.getChunkModules(chunk);
    return modules.sort(comparator);
  }
  
  /**
   * 获取 Chunk 的入口模块
   */
  getChunkEntryModulesIterable(chunk: Chunk): Iterable<Module> {
    const cgc = this._chunks.get(chunk);
    return cgc ? cgc.entryModules.keys() : [];
  }
  
  /**
   * 获取 Chunk 的运行时模块
   */
  getChunkRuntimeModulesIterable(chunk: Chunk): Iterable<RuntimeModule> {
    const cgc = this._chunks.get(chunk);
    return cgc ? cgc.runtimeModules : [];
  }
  
  // =================== Module 操作 ===================
  
  /**
   * 获取或创建 Module 的图信息
   */
  private _getChunkGraphModule(module: Module): ChunkGraphModule {
    let cgm = this._modules.get(module);
    
    if (!cgm) {
      cgm = {
        chunks: new Set(),
        id: null,
      };
      this._modules.set(module, cgm);
    }
    
    return cgm;
  }
  
  /**
   * 获取模块所属的 Chunk 数量
   */
  getNumberOfModuleChunks(module: Module): number {
    const cgm = this._modules.get(module);
    return cgm ? cgm.chunks.size : 0;
  }
  
  /**
   * 获取模块所属的 Chunks
   */
  getModuleChunksIterable(module: Module): Iterable<Chunk> {
    const cgm = this._modules.get(module);
    return cgm ? cgm.chunks : [];
  }
  
  /**
   * 获取模块所属的 Chunks（数组）
   */
  getModuleChunks(module: Module): Chunk[] {
    return [...this.getModuleChunksIterable(module)];
  }
  
  /**
   * 检查模块是否属于某 Chunk
   */
  isModuleInChunk(module: Module, chunk: Chunk): boolean {
    const cgm = this._modules.get(module);
    return cgm ? cgm.chunks.has(chunk) : false;
  }
  
  /**
   * 检查模块是否仅属于一个 Chunk
   */
  isModuleInChunkGroup(module: Module, chunkGroup: ChunkGroup): boolean {
    for (const chunk of chunkGroup.chunks) {
      if (this.isModuleInChunk(module, chunk)) {
        return true;
      }
    }
    return false;
  }
  
  // =================== 连接操作 ===================
  
  /**
   * 将模块连接到 Chunk
   */
  connectChunkAndModule(chunk: Chunk, module: Module): void {
    const cgc = this._getChunkGraphChunk(chunk);
    const cgm = this._getChunkGraphModule(module);
    
    cgc.modules.add(module);
    cgm.chunks.add(chunk);
  }
  
  /**
   * 断开模块与 Chunk 的连接
   */
  disconnectChunkAndModule(chunk: Chunk, module: Module): void {
    const cgc = this._chunks.get(chunk);
    const cgm = this._modules.get(module);
    
    if (cgc) cgc.modules.delete(module);
    if (cgm) cgm.chunks.delete(chunk);
  }
  
  /**
   * 设置入口模块
   */
  connectChunkAndEntryModule(
    chunk: Chunk,
    module: Module,
    entrypoint: Entrypoint
  ): void {
    const cgc = this._getChunkGraphChunk(chunk);
    cgc.entryModules.set(module, entrypoint);
    
    // 同时连接普通模块关系
    this.connectChunkAndModule(chunk, module);
  }
  
  /**
   * 添加运行时模块
   */
  connectChunkAndRuntimeModule(
    chunk: Chunk,
    runtimeModule: RuntimeModule
  ): void {
    const cgc = this._getChunkGraphChunk(chunk);
    cgc.runtimeModules.add(runtimeModule);
    
    // 运行时模块也是模块
    this.connectChunkAndModule(chunk, runtimeModule);
  }
  
  // =================== ID 管理 ===================
  
  /**
   * 获取模块 ID
   */
  getModuleId(module: Module): string | number | null {
    const cgm = this._modules.get(module);
    return cgm?.id ?? null;
  }
  
  /**
   * 设置模块 ID
   */
  setModuleId(module: Module, id: string | number): void {
    const cgm = this._getChunkGraphModule(module);
    cgm.id = id;
  }
  
  /**
   * 检查 Chunk 是否有运行时
   */
  hasChunkRuntime(chunk: Chunk): boolean {
    const cgc = this._chunks.get(chunk);
    return cgc ? cgc.runtimeModules.size > 0 : false;
  }
  
  // =================== 运行时需求 ===================
  
  /**
   * 添加运行时需求
   */
  addChunkRuntimeRequirements(
    chunk: Chunk,
    requirements: Iterable<string>
  ): void {
    const cgc = this._getChunkGraphChunk(chunk);
    for (const req of requirements) {
      cgc.runtimeRequirements.add(req);
    }
  }
  
  /**
   * 获取 Chunk 的运行时需求
   */
  getChunkRuntimeRequirements(chunk: Chunk): Set<string> {
    const cgc = this._chunks.get(chunk);
    return cgc?.runtimeRequirements ?? new Set();
  }
  
  /**
   * 添加模块的运行时需求
   */
  addModuleRuntimeRequirements(
    module: Module,
    chunk: Chunk,
    requirements: Iterable<string>
  ): void {
    const cgm = this._getChunkGraphModule(module);
    
    if (!cgm.runtimeRequirements) {
      cgm.runtimeRequirements = new Map();
    }
    
    let chunkReqs = cgm.runtimeRequirements.get(chunk);
    if (!chunkReqs) {
      chunkReqs = new Set();
      cgm.runtimeRequirements.set(chunk, chunkReqs);
    }
    
    for (const req of requirements) {
      chunkReqs.add(req);
    }
  }
  
  // =================== 哈希 ===================
  
  /**
   * 设置模块哈希
   */
  setModuleHashes(
    module: Module,
    chunk: Chunk,
    hash: string
  ): void {
    const cgm = this._getChunkGraphModule(module);
    
    if (!cgm.hashes) {
      cgm.hashes = new Map();
    }
    
    cgm.hashes.set(chunk, hash);
  }
  
  /**
   * 获取模块哈希
   */
  getModuleHash(module: Module, chunk: Chunk): string | undefined {
    const cgm = this._modules.get(module);
    return cgm?.hashes?.get(chunk);
  }
  
  // =================== 统计与遍历 ===================
  
  /**
   * 获取 Chunk 的总模块大小
   */
  getChunkSize(chunk: Chunk, options?: { chunkOverhead?: number }): number {
    const overhead = options?.chunkOverhead ?? 0;
    let size = overhead;
    
    for (const module of this.getChunkModulesIterable(chunk)) {
      size += module.size();
    }
    
    return size;
  }
  
  /**
   * 获取两个 Chunk 的公共模块
   */
  getCommonChunkModules(chunkA: Chunk, chunkB: Chunk): Module[] {
    const modulesA = new Set(this.getChunkModulesIterable(chunkA));
    const common: Module[] = [];
    
    for (const module of this.getChunkModulesIterable(chunkB)) {
      if (modulesA.has(module)) {
        common.push(module);
      }
    }
    
    return common;
  }
  
  /**
   * 检查两个 Chunk 是否有公共模块
   */
  hasSharedModules(chunkA: Chunk, chunkB: Chunk): boolean {
    const modulesA = new Set(this.getChunkModulesIterable(chunkA));
    
    for (const module of this.getChunkModulesIterable(chunkB)) {
      if (modulesA.has(module)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * 整合 Chunk（将 source 的模块合并到 target）
   */
  integrateChunks(target: Chunk, source: Chunk): void {
    // 移动所有模块
    for (const module of this.getChunkModulesIterable(source)) {
      this.disconnectChunkAndModule(source, module);
      this.connectChunkAndModule(target, module);
    }
    
    // 移动入口模块
    const sourceCgc = this._chunks.get(source);
    const targetCgc = this._getChunkGraphChunk(target);
    
    if (sourceCgc) {
      for (const [module, entrypoint] of sourceCgc.entryModules) {
        targetCgc.entryModules.set(module, entrypoint);
      }
      
      // 移动运行时模块
      for (const runtimeModule of sourceCgc.runtimeModules) {
        targetCgc.runtimeModules.add(runtimeModule);
      }
      
      // 合并运行时需求
      for (const req of sourceCgc.runtimeRequirements) {
        targetCgc.runtimeRequirements.add(req);
      }
    }
  }
}
```

## 运行时需求（Runtime Requirements）

运行时需求是 Webpack 5 的重要概念，表示 Chunk 需要哪些运行时功能：

```typescript
// 常见的运行时需求
const RuntimeGlobals = {
  // 模块系统
  require: '__webpack_require__',
  module: 'module',
  exports: 'exports',
  
  // 模块加载
  ensureChunk: '__webpack_require__.e',
  ensureChunkHandlers: '__webpack_require__.f',
  
  // 模块定义
  definePropertyGetters: '__webpack_require__.d',
  makeNamespaceObject: '__webpack_require__.r',
  
  // 异步加载
  loadScript: '__webpack_require__.l',
  publicPath: '__webpack_require__.p',
  
  // HMR
  hmrDownloadManifest: '__webpack_require__.hmrM',
  hmrDownloadUpdateHandlers: '__webpack_require__.hmrC',
};

// 使用示例
class MyPlugin {
  apply(compiler: Compiler) {
    compiler.hooks.compilation.tap('MyPlugin', (compilation) => {
      compilation.hooks.additionalChunkRuntimeRequirements.tap(
        'MyPlugin',
        (chunk, runtimeRequirements) => {
          // 添加运行时需求
          if (needsAsyncLoading(chunk)) {
            runtimeRequirements.add(RuntimeGlobals.ensureChunk);
            runtimeRequirements.add(RuntimeGlobals.loadScript);
          }
        }
      );
    });
  }
}
```

## 实际使用场景

### 场景一：代码分割

```typescript
// SplitChunksPlugin 使用 ChunkGraph 决定分割策略
class SimpleSplitChunksPlugin {
  apply(compiler: Compiler) {
    compiler.hooks.compilation.tap('SimpleSplitChunksPlugin', (compilation) => {
      compilation.hooks.optimizeChunks.tap('SimpleSplitChunksPlugin', (chunks) => {
        const { chunkGraph } = compilation;
        
        // 找出在多个 Chunk 中重复的模块
        const moduleChunkCounts = new Map<Module, number>();
        
        for (const chunk of chunks) {
          for (const module of chunkGraph.getChunkModulesIterable(chunk)) {
            const count = moduleChunkCounts.get(module) ?? 0;
            moduleChunkCounts.set(module, count + 1);
          }
        }
        
        // 将重复模块提取到公共 Chunk
        const sharedModules = [...moduleChunkCounts.entries()]
          .filter(([, count]) => count > 1)
          .map(([module]) => module);
        
        if (sharedModules.length > 0) {
          // 创建新的 Chunk
          const commonChunk = new Chunk('common');
          chunks.add(commonChunk);
          
          // 移动模块
          for (const module of sharedModules) {
            // 从原 Chunks 移除
            for (const chunk of chunkGraph.getModuleChunksIterable(module)) {
              if (chunk !== commonChunk) {
                chunkGraph.disconnectChunkAndModule(chunk, module);
              }
            }
            // 添加到公共 Chunk
            chunkGraph.connectChunkAndModule(commonChunk, module);
          }
        }
      });
    });
  }
}
```

### 场景二：生成资源

```typescript
// 使用 ChunkGraph 生成输出
class Compilation {
  createChunkAssets() {
    for (const chunk of this.chunks) {
      // 获取 Chunk 的模块
      const modules = this.chunkGraph.getOrderedChunkModules(
        chunk,
        (a, b) => a.identifier().localeCompare(b.identifier())
      );
      
      // 生成代码
      let code = '';
      
      for (const module of modules) {
        const moduleId = this.chunkGraph.getModuleId(module);
        const moduleCode = module.source();
        
        code += `__webpack_modules__[${JSON.stringify(moduleId)}] = ${moduleCode};\n`;
      }
      
      // 添加运行时
      const runtimeModules = this.chunkGraph.getChunkRuntimeModulesIterable(chunk);
      for (const runtimeModule of runtimeModules) {
        code += runtimeModule.getSource();
      }
      
      // 创建资源
      this.emitAsset(chunk.files[0], new RawSource(code));
    }
  }
}
```

### 场景三：分析依赖

```typescript
// 分析 Chunk 之间的依赖关系
function analyzeChunkDependencies(
  chunk: Chunk,
  compilation: Compilation
): Set<Chunk> {
  const { chunkGraph, moduleGraph } = compilation;
  const dependentChunks = new Set<Chunk>();
  
  // 遍历 Chunk 中的所有模块
  for (const module of chunkGraph.getChunkModulesIterable(chunk)) {
    // 获取模块的依赖
    for (const connection of moduleGraph.getOutgoingConnections(module)) {
      const depModule = connection.module;
      
      // 找出依赖模块所在的 Chunks
      for (const depChunk of chunkGraph.getModuleChunksIterable(depModule)) {
        if (depChunk !== chunk) {
          dependentChunks.add(depChunk);
        }
      }
    }
  }
  
  return dependentChunks;
}
```

## ModuleGraph vs ChunkGraph

| 维度 | ModuleGraph | ChunkGraph |
|------|-------------|------------|
| 关注点 | 模块间依赖 | 模块与 Chunk 归属 |
| 核心问题 | A 依赖谁？谁依赖 A？ | 模块在哪些 Chunk？Chunk 有哪些模块？ |
| 用于 | 依赖分析、Tree Shaking | 代码分割、资源生成 |
| 边 | 依赖关系（Connection） | 包含关系 |
| 创建时机 | Make 阶段 | Seal 阶段 |

## 小结

ChunkGraph 是 Webpack 5 代码分割的核心数据结构。理解它，你就理解了 Webpack 如何将模块组织成最终的输出文件。

关键要点：

1. **双向映射**：Chunk → Modules 和 Module → Chunks
2. **运行时管理**：RuntimeModules 和 RuntimeRequirements
3. **ID 分配**：模块在 Chunk 中的标识符
4. **整合操作**：支持 Chunk 合并

下一节，我们将学习 addEntry 方法——Webpack 是如何从入口开始构建模块的。
