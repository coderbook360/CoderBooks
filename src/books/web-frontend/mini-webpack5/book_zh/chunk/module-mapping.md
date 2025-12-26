---
sidebar_position: 98
title: "模块到 Chunk 的映射"
---

# 模块到 Chunk 的映射

模块到 Chunk 的映射是 Webpack 构建过程中的核心数据结构，决定了哪些模块会被打包到哪个输出文件中。

## 映射数据结构

### ChunkGraph 核心结构

```typescript
class ChunkGraph {
  // 双向映射
  private _moduleChunksMap: WeakMap<Module, Set<Chunk>>;
  private _chunkModulesMap: WeakMap<Chunk, Set<Module>>;
  
  // 模块元信息
  private _moduleGraphHashMap: WeakMap<Module, string>;
  private _moduleGraphHashIdMap: WeakMap<Module, string>;
  
  // Chunk 元信息
  private _chunkEntryModulesMap: WeakMap<Chunk, Map<Module, Entrypoint>>;
  
  constructor() {
    this._moduleChunksMap = new WeakMap();
    this._chunkModulesMap = new WeakMap();
    this._moduleGraphHashMap = new WeakMap();
    this._moduleGraphHashIdMap = new WeakMap();
    this._chunkEntryModulesMap = new WeakMap();
  }
}
```

### 模块到 Chunk 查询

```typescript
class ChunkGraph {
  // 获取模块所在的所有 Chunk
  getModuleChunks(module: Module): Chunk[] {
    const chunks = this._moduleChunksMap.get(module);
    return chunks ? Array.from(chunks) : [];
  }
  
  // 获取模块所在的 Chunk 数量
  getNumberOfModuleChunks(module: Module): number {
    const chunks = this._moduleChunksMap.get(module);
    return chunks ? chunks.size : 0;
  }
  
  // 检查模块是否在指定 Chunk 中
  isModuleInChunk(module: Module, chunk: Chunk): boolean {
    const chunks = this._moduleChunksMap.get(module);
    return chunks ? chunks.has(chunk) : false;
  }
  
  // 检查模块是否只在一个 Chunk 中
  isModuleInSingleChunk(module: Module): boolean {
    const chunks = this._moduleChunksMap.get(module);
    return chunks ? chunks.size === 1 : false;
  }
}
```

### Chunk 到模块查询

```typescript
class ChunkGraph {
  // 获取 Chunk 的所有模块
  getChunkModules(chunk: Chunk): Module[] {
    const modules = this._chunkModulesMap.get(chunk);
    return modules ? Array.from(modules) : [];
  }
  
  // 获取 Chunk 的模块数量
  getNumberOfChunkModules(chunk: Chunk): number {
    const modules = this._chunkModulesMap.get(chunk);
    return modules ? modules.size : 0;
  }
  
  // 获取 Chunk 的模块迭代器
  getChunkModulesIterable(chunk: Chunk): Iterable<Module> {
    const modules = this._chunkModulesMap.get(chunk);
    return modules || [];
  }
  
  // 按条件过滤 Chunk 的模块
  getChunkModulesFiltered(
    chunk: Chunk,
    filter: (module: Module) => boolean
  ): Module[] {
    const modules = this._chunkModulesMap.get(chunk);
    if (!modules) return [];
    
    return Array.from(modules).filter(filter);
  }
}
```

## 映射操作

### 建立连接

```typescript
class ChunkGraph {
  // 连接模块和 Chunk
  connectChunkAndModule(chunk: Chunk, module: Module): void {
    // 模块 -> Chunk
    let moduleChunks = this._moduleChunksMap.get(module);
    if (!moduleChunks) {
      moduleChunks = new Set();
      this._moduleChunksMap.set(module, moduleChunks);
    }
    moduleChunks.add(chunk);
    
    // Chunk -> 模块
    let chunkModules = this._chunkModulesMap.get(chunk);
    if (!chunkModules) {
      chunkModules = new Set();
      this._chunkModulesMap.set(chunk, chunkModules);
    }
    chunkModules.add(module);
  }
  
  // 批量连接
  connectChunkAndModules(chunk: Chunk, modules: Iterable<Module>): void {
    for (const module of modules) {
      this.connectChunkAndModule(chunk, module);
    }
  }
}
```

### 断开连接

```typescript
class ChunkGraph {
  // 断开模块和 Chunk 的连接
  disconnectChunkAndModule(chunk: Chunk, module: Module): void {
    // 从模块的 Chunk 集合中移除
    const moduleChunks = this._moduleChunksMap.get(module);
    if (moduleChunks) {
      moduleChunks.delete(chunk);
      if (moduleChunks.size === 0) {
        this._moduleChunksMap.delete(module);
      }
    }
    
    // 从 Chunk 的模块集合中移除
    const chunkModules = this._chunkModulesMap.get(chunk);
    if (chunkModules) {
      chunkModules.delete(module);
      if (chunkModules.size === 0) {
        this._chunkModulesMap.delete(chunk);
      }
    }
  }
  
  // 清空 Chunk 的所有模块
  clearChunkModules(chunk: Chunk): void {
    const modules = this._chunkModulesMap.get(chunk);
    if (modules) {
      for (const module of modules) {
        const moduleChunks = this._moduleChunksMap.get(module);
        if (moduleChunks) {
          moduleChunks.delete(chunk);
        }
      }
      this._chunkModulesMap.delete(chunk);
    }
  }
}
```

### 移动模块

```typescript
class ChunkGraph {
  // 将模块从一个 Chunk 移动到另一个
  moveModules(
    sourceChunk: Chunk,
    targetChunk: Chunk,
    modules?: Iterable<Module>
  ): void {
    const modulesToMove = modules || this.getChunkModules(sourceChunk);
    
    for (const module of modulesToMove) {
      this.disconnectChunkAndModule(sourceChunk, module);
      this.connectChunkAndModule(targetChunk, module);
    }
  }
  
  // 复制模块到另一个 Chunk
  copyModules(
    sourceChunk: Chunk,
    targetChunk: Chunk,
    filter?: (module: Module) => boolean
  ): void {
    const modules = this.getChunkModules(sourceChunk);
    
    for (const module of modules) {
      if (!filter || filter(module)) {
        this.connectChunkAndModule(targetChunk, module);
      }
    }
  }
}
```

## 入口模块映射

### 入口模块管理

```typescript
class ChunkGraph {
  // 连接入口模块
  connectChunkAndEntryModule(
    chunk: Chunk,
    module: Module,
    entrypoint: Entrypoint
  ): void {
    // 普通连接
    this.connectChunkAndModule(chunk, module);
    
    // 记录入口关系
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
  
  // 获取模块的入口点
  getModuleEntrypoint(module: Module, chunk: Chunk): Entrypoint | undefined {
    const entryModules = this._chunkEntryModulesMap.get(chunk);
    if (!entryModules) return undefined;
    return entryModules.get(module);
  }
  
  // 检查是否是入口模块
  isEntryModule(module: Module): boolean {
    for (const [chunk] of this._chunkEntryModulesMap) {
      const entryModules = this._chunkEntryModulesMap.get(chunk);
      if (entryModules && entryModules.has(module)) {
        return true;
      }
    }
    return false;
  }
}
```

### 入口依赖模块

```typescript
class ChunkGraph {
  // 获取入口模块的依赖模块
  getChunkEntryDependentModulesIterable(chunk: Chunk): Iterable<Module> {
    const result = new Set<Module>();
    const entryModules = this._chunkEntryModulesMap.get(chunk);
    
    if (entryModules) {
      for (const [entryModule] of entryModules) {
        // 收集入口模块的所有依赖
        this.collectDependentModules(entryModule, result);
      }
    }
    
    return result;
  }
  
  private collectDependentModules(
    module: Module,
    result: Set<Module>,
    visited: Set<Module> = new Set()
  ): void {
    if (visited.has(module)) return;
    visited.add(module);
    
    for (const dep of module.dependencies) {
      const depModule = this.moduleGraph.getModule(dep);
      if (depModule) {
        result.add(depModule);
        this.collectDependentModules(depModule, result, visited);
      }
    }
  }
}
```

## 运行时映射

### 运行时模块

```typescript
class ChunkGraph {
  // 运行时模块映射
  private _chunkRuntimeModulesMap: WeakMap<Chunk, Set<RuntimeModule>>;
  
  // 添加运行时模块
  addChunkRuntimeModule(chunk: Chunk, module: RuntimeModule): void {
    let runtimeModules = this._chunkRuntimeModulesMap.get(chunk);
    if (!runtimeModules) {
      runtimeModules = new Set();
      this._chunkRuntimeModulesMap.set(chunk, runtimeModules);
    }
    runtimeModules.add(module);
    
    // 同时添加到普通模块映射
    this.connectChunkAndModule(chunk, module);
  }
  
  // 获取运行时模块
  getChunkRuntimeModulesIterable(chunk: Chunk): Iterable<RuntimeModule> {
    const runtimeModules = this._chunkRuntimeModulesMap.get(chunk);
    return runtimeModules || [];
  }
  
  // 获取所有运行时模块（按类型分组）
  getChunkRuntimeModulesInOrder(chunk: Chunk): RuntimeModule[] {
    const runtimeModules = this._chunkRuntimeModulesMap.get(chunk);
    if (!runtimeModules) return [];
    
    // 按 stage 排序
    return Array.from(runtimeModules).sort((a, b) => {
      return (a.stage || 0) - (b.stage || 0);
    });
  }
}
```

### 运行时信息

```typescript
class ChunkGraph {
  // 获取 Chunk 的运行时 Chunk
  getRuntimeChunks(chunk: Chunk): Chunk[] {
    const result: Chunk[] = [];
    
    for (const group of chunk.groupsIterable) {
      const runtimeChunk = group.getRuntimeChunk();
      if (runtimeChunk && !result.includes(runtimeChunk)) {
        result.push(runtimeChunk);
      }
    }
    
    return result;
  }
  
  // 检查 Chunk 是否包含运行时
  hasChunkRuntime(chunk: Chunk): boolean {
    for (const group of chunk.groupsIterable) {
      if (group.getRuntimeChunk() === chunk) {
        return true;
      }
    }
    return false;
  }
}
```

## 映射查询优化

### 缓存策略

```typescript
class ChunkGraph {
  // 模块排序缓存
  private _sortedModulesCache: WeakMap<Chunk, Module[]>;
  
  // 获取排序后的模块
  getOrderedChunkModules(chunk: Chunk): Module[] {
    let cached = this._sortedModulesCache.get(chunk);
    if (cached) return cached;
    
    const modules = this.getChunkModules(chunk);
    
    // 按 ID 排序
    modules.sort((a, b) => {
      const idA = this.getModuleId(a);
      const idB = this.getModuleId(b);
      
      if (idA < idB) return -1;
      if (idA > idB) return 1;
      return 0;
    });
    
    this._sortedModulesCache.set(chunk, modules);
    return modules;
  }
  
  // 失效缓存
  invalidateCache(chunk: Chunk): void {
    this._sortedModulesCache.delete(chunk);
  }
}
```

### 批量查询

```typescript
class ChunkGraph {
  // 获取多个 Chunk 的共同模块
  getCommonModules(chunks: Chunk[]): Module[] {
    if (chunks.length === 0) return [];
    if (chunks.length === 1) return this.getChunkModules(chunks[0]);
    
    const firstModules = new Set(this.getChunkModules(chunks[0]));
    
    for (let i = 1; i < chunks.length; i++) {
      const chunkModules = this.getChunkModules(chunks[i]);
      const chunkModulesSet = new Set(chunkModules);
      
      for (const module of firstModules) {
        if (!chunkModulesSet.has(module)) {
          firstModules.delete(module);
        }
      }
    }
    
    return Array.from(firstModules);
  }
  
  // 获取模块的所有相关 Chunk（包括运行时）
  getModuleRelevantChunks(module: Module): Chunk[] {
    const chunks = this.getModuleChunks(module);
    const result = new Set(chunks);
    
    // 添加运行时 Chunk
    for (const chunk of chunks) {
      const runtimeChunks = this.getRuntimeChunks(chunk);
      for (const rc of runtimeChunks) {
        result.add(rc);
      }
    }
    
    return Array.from(result);
  }
}
```

## 映射序列化

### 导出映射信息

```typescript
class ChunkGraph {
  // 序列化映射关系
  toJSON(): ChunkGraphJSON {
    const chunks: ChunkJSON[] = [];
    
    for (const [chunk, modules] of this._chunkModulesMap) {
      chunks.push({
        id: chunk.id,
        name: chunk.name,
        modules: Array.from(modules).map(m => ({
          id: this.getModuleId(m),
          identifier: m.identifier(),
          size: m.size(),
        })),
      });
    }
    
    return { chunks };
  }
  
  // 生成模块映射表
  getModuleChunksMap(): Map<string, string[]> {
    const result = new Map<string, string[]>();
    
    for (const [module, chunks] of this._moduleChunksMap) {
      const moduleId = String(this.getModuleId(module));
      const chunkIds = Array.from(chunks).map(c => String(c.id));
      result.set(moduleId, chunkIds);
    }
    
    return result;
  }
}
```

## 总结

模块到 Chunk 映射的核心要点：

**数据结构**：
- 双向 WeakMap
- 模块元信息
- 入口模块映射

**基本操作**：
- 建立连接
- 断开连接
- 移动/复制模块

**入口模块**：
- 入口模块管理
- 入口依赖追踪

**运行时映射**：
- 运行时模块
- 运行时 Chunk

**查询优化**：
- 缓存策略
- 批量查询

**下一章**：我们将学习 Chunk 之间的连接关系。
