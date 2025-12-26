---
sidebar_position: 93
title: "Chunk 设计与职责"
---

# Chunk 设计与职责

Chunk 是 Webpack 打包输出的基本单位，代表一组模块的集合，最终会生成一个或多个文件。

## Chunk 核心概念

### 什么是 Chunk

```
Module（模块）      Chunk（代码块）        Asset（资源）
  ┌─────────┐
  │ entry.js│ ──┐
  └─────────┘   │    ┌──────────┐      ┌─────────────┐
  ┌─────────┐   ├──→ │  main    │ ───→ │  main.js    │
  │ utils.js│ ──┤    │  chunk   │      └─────────────┘
  └─────────┘   │    └──────────┘
  ┌─────────┐   │
  │  a.js   │ ──┘
  └─────────┘

  ┌─────────┐        ┌──────────┐      ┌─────────────┐
  │ lazy.js │ ─────→ │  lazy    │ ───→ │  lazy.js    │
  └─────────┘        │  chunk   │      └─────────────┘
                     └──────────┘
```

### Chunk 类型

```typescript
// 入口 Chunk
// 由 entry 配置直接生成
const entryChunk = {
  name: 'main',
  hasRuntime: true,  // 包含运行时代码
  entryModule: module,
};

// 异步 Chunk
// 由 import() 动态导入生成
const asyncChunk = {
  name: 'async-module',
  hasRuntime: false,  // 不包含运行时
};

// 初始 Chunk
// 页面加载时必须加载的 chunk
const initialChunk = {
  isInitial: true,
};

// 仅运行时 Chunk
// 只包含运行时代码
const runtimeChunk = {
  hasRuntime: true,
  hasModules: false,
};
```

## Chunk 类实现

### 核心属性

```typescript
class Chunk {
  // 标识
  id: string | number | null = null;
  ids: (string | number)[] | null = null;
  name: string | null = null;
  
  // 调试信息
  idNameHints: SortableSet<string>;
  
  // 文件信息
  filenameTemplate?: string;
  files: Set<string>;
  auxiliaryFiles: Set<string>;
  
  // 运行时信息
  runtime: RuntimeSpec;
  
  // 标志
  preventIntegration: boolean = false;
  
  // 所属 ChunkGroup
  private _groups: SortableSet<ChunkGroup>;
  
  constructor(name?: string) {
    this.name = name || null;
    this.idNameHints = new SortableSet();
    this.files = new Set();
    this.auxiliaryFiles = new Set();
    this._groups = new SortableSet(undefined, compareChunkGroupsByIndex);
  }
}
```

### 核心方法

```typescript
class Chunk {
  // 获取所有模块数量
  getNumberOfModules(): number {
    // 通过 ChunkGraph 获取
    return this._chunkGraph?.getNumberOfChunkModules(this) ?? 0;
  }
  
  // 是否只包含入口模块
  hasEntryModule(): boolean {
    return this._chunkGraph?.getNumberOfEntryModules(this) > 0;
  }
  
  // 添加到 ChunkGroup
  addGroup(chunkGroup: ChunkGroup): void {
    this._groups.add(chunkGroup);
  }
  
  // 获取所有 ChunkGroup
  get groupsIterable(): Iterable<ChunkGroup> {
    return this._groups;
  }
  
  // 是否是初始 chunk
  canBeInitial(): boolean {
    for (const group of this._groups) {
      if (group.isInitial()) return true;
    }
    return false;
  }
  
  // 是否只能是初始 chunk
  isOnlyInitial(): boolean {
    if (this._groups.size === 0) return false;
    for (const group of this._groups) {
      if (!group.isInitial()) return false;
    }
    return true;
  }
  
  // 是否包含运行时
  hasRuntime(): boolean {
    for (const group of this._groups) {
      if (group.getRuntimeChunk() === this) return true;
    }
    return false;
  }
}
```

## ChunkGraph 关联

### 模块与 Chunk 的关系

```typescript
class ChunkGraph {
  // Chunk -> 模块集合
  private _chunkModulesMap: Map<Chunk, Set<Module>>;
  
  // 模块 -> Chunk 集合
  private _moduleChunksMap: Map<Module, Set<Chunk>>;
  
  // Chunk -> 入口模块
  private _chunkEntryModulesMap: Map<Chunk, Map<Module, Entrypoint>>;
  
  // 获取 Chunk 的所有模块
  getChunkModules(chunk: Chunk): Module[] {
    const modules = this._chunkModulesMap.get(chunk);
    return modules ? Array.from(modules) : [];
  }
  
  // 连接模块到 Chunk
  connectChunkAndModule(chunk: Chunk, module: Module): void {
    let chunkModules = this._chunkModulesMap.get(chunk);
    if (!chunkModules) {
      chunkModules = new Set();
      this._chunkModulesMap.set(chunk, chunkModules);
    }
    chunkModules.add(module);
    
    let moduleChunks = this._moduleChunksMap.get(module);
    if (!moduleChunks) {
      moduleChunks = new Set();
      this._moduleChunksMap.set(module, moduleChunks);
    }
    moduleChunks.add(chunk);
  }
  
  // 断开模块与 Chunk 的连接
  disconnectChunkAndModule(chunk: Chunk, module: Module): void {
    const chunkModules = this._chunkModulesMap.get(chunk);
    if (chunkModules) {
      chunkModules.delete(module);
    }
    
    const moduleChunks = this._moduleChunksMap.get(module);
    if (moduleChunks) {
      moduleChunks.delete(chunk);
    }
  }
}
```

### 入口模块

```typescript
class ChunkGraph {
  // 设置入口模块
  connectChunkAndEntryModule(
    chunk: Chunk,
    module: Module,
    entrypoint: Entrypoint
  ): void {
    let entryModules = this._chunkEntryModulesMap.get(chunk);
    if (!entryModules) {
      entryModules = new Map();
      this._chunkEntryModulesMap.set(chunk, entryModules);
    }
    entryModules.set(module, entrypoint);
  }
  
  // 获取入口模块
  getChunkEntryModulesIterable(chunk: Chunk): Iterable<Module> {
    const entryModules = this._chunkEntryModulesMap.get(chunk);
    if (!entryModules) return [];
    return entryModules.keys();
  }
  
  // 获取入口模块数量
  getNumberOfEntryModules(chunk: Chunk): number {
    const entryModules = this._chunkEntryModulesMap.get(chunk);
    return entryModules ? entryModules.size : 0;
  }
}
```

## Chunk 标识

### ID 分配

```typescript
class Chunk {
  // 设置 ID
  set id(id: string | number | null) {
    this._id = id;
  }
  
  get id(): string | number | null {
    return this._id;
  }
}

class Compilation {
  assignChunkIds(): void {
    const chunks = this.chunks;
    const usedIds = new Set<string | number>();
    
    // 收集已使用的 ID
    for (const chunk of chunks) {
      if (chunk.id !== null) {
        usedIds.add(chunk.id);
      }
    }
    
    // 分配 ID
    let nextId = 0;
    for (const chunk of chunks) {
      if (chunk.id === null) {
        while (usedIds.has(nextId)) {
          nextId++;
        }
        chunk.id = nextId;
        chunk.ids = [nextId];
        nextId++;
      }
    }
  }
}
```

### 名称提示

```typescript
class Chunk {
  // 添加名称提示
  addIdNameHint(hint: string): void {
    this.idNameHints.add(hint);
  }
  
  // 获取排序后的名称提示
  getIdNameHints(): string[] {
    return Array.from(this.idNameHints).sort();
  }
}

// 使用示例
// import(/* webpackChunkName: "my-chunk" */ './module')
chunk.addIdNameHint('my-chunk');
```

## 运行时

### Runtime 概念

```typescript
// 运行时标识
type RuntimeSpec = Set<string> | string | undefined;

class Chunk {
  // 当前 chunk 的运行时
  runtime: RuntimeSpec;
  
  // 设置运行时
  setRuntime(runtime: RuntimeSpec): void {
    this.runtime = runtime;
  }
  
  // 合并运行时
  addRuntime(runtime: RuntimeSpec): void {
    if (this.runtime === undefined) {
      this.runtime = runtime;
    } else if (typeof this.runtime === 'string') {
      if (typeof runtime === 'string') {
        this.runtime = new Set([this.runtime, runtime]);
      } else if (runtime) {
        this.runtime = new Set([this.runtime, ...runtime]);
      }
    } else {
      if (typeof runtime === 'string') {
        this.runtime.add(runtime);
      } else if (runtime) {
        for (const r of runtime) {
          this.runtime.add(r);
        }
      }
    }
  }
}
```

### 运行时 Chunk

```typescript
class ChunkGroup {
  private _runtimeChunk: Chunk | null = null;
  
  // 获取运行时 Chunk
  getRuntimeChunk(): Chunk | null {
    // 如果配置了单独的运行时 chunk
    if (this._runtimeChunk) return this._runtimeChunk;
    
    // 否则使用第一个 chunk
    for (const chunk of this.chunks) {
      return chunk;
    }
    
    return null;
  }
  
  // 设置运行时 Chunk
  setRuntimeChunk(chunk: Chunk): void {
    this._runtimeChunk = chunk;
  }
}
```

## Chunk 大小计算

```typescript
class ChunkGraph {
  // 计算 Chunk 大小
  getChunkSize(
    chunk: Chunk,
    options: ChunkSizeOptions = {}
  ): number {
    const modules = this.getChunkModules(chunk);
    let size = 0;
    
    for (const module of modules) {
      size += this.getModuleSize(module, options.chunkOverhead);
    }
    
    // 添加 chunk 开销
    if (options.chunkOverhead !== undefined) {
      size += options.chunkOverhead;
    }
    
    // 入口模块开销
    if (options.entryChunkMultiplicator !== undefined) {
      const entryModules = this.getNumberOfEntryModules(chunk);
      if (entryModules > 0) {
        size *= options.entryChunkMultiplicator;
      }
    }
    
    return size;
  }
  
  // 计算集成后的大小
  getIntegratedChunksSize(
    chunkA: Chunk,
    chunkB: Chunk,
    options: ChunkSizeOptions = {}
  ): number {
    const modulesA = new Set(this.getChunkModules(chunkA));
    const modulesB = this.getChunkModules(chunkB);
    
    // 合并模块
    for (const module of modulesB) {
      modulesA.add(module);
    }
    
    let size = 0;
    for (const module of modulesA) {
      size += this.getModuleSize(module, options.chunkOverhead);
    }
    
    return size;
  }
}
```

## 总结

Chunk 设计的核心要点：

**核心概念**：
- 模块的集合
- 输出文件的单位
- 运行时的载体

**类型分类**：
- 入口 Chunk
- 异步 Chunk
- 运行时 Chunk

**与 ChunkGraph**：
- 管理模块关系
- 入口模块追踪
- 大小计算

**标识系统**：
- ID 分配
- 名称提示
- 运行时标识

**下一章**：我们将学习 ChunkGroup 代码块组。
