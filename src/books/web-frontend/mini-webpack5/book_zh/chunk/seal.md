---
sidebar_position: 96
title: "seal 方法：封装阶段"
---

# seal 方法：封装阶段

seal 方法是 Compilation 的核心方法，负责将模块依赖图封装成 Chunk，是从"模块构建"到"资源输出"的关键转换点。

## seal 方法概览

### 阶段定位

```
构建流程：

make 阶段          seal 阶段              emit 阶段
    │                  │                     │
    ▼                  ▼                     ▼
构建模块 ──────→ 封装成 Chunk ──────→ 输出到文件系统
    │                  │                     │
    ▼                  ▼                     ▼
- 解析文件          - 创建 Chunk          - 写入 dist
- 提取依赖          - 分配模块
- 执行 Loader       - 优化代码
```

### 主要职责

```typescript
class Compilation {
  seal(callback: Callback): void {
    // 1. 准备阶段
    this.hooks.seal.call();
    
    // 2. 优化依赖
    this.hooks.optimizeDependencies.call(this.modules);
    
    // 3. 创建 Chunk
    this.createChunks();
    
    // 4. 优化 Chunk
    this.optimizeChunks();
    
    // 5. 生成模块代码
    this.generateModuleCode();
    
    // 6. 生成 Chunk 代码
    this.generateChunkCode();
    
    callback();
  }
}
```

## 完整实现

### seal 方法主体

```typescript
class Compilation {
  seal(callback: (err?: Error) => void): void {
    const chunkGraph = this.chunkGraph;
    
    // 触发 seal 钩子
    this.hooks.seal.call();
    
    // 优化依赖
    while (this.hooks.optimizeDependencies.call(this.modules)) {
      // 重复直到没有更多优化
    }
    this.hooks.afterOptimizeDependencies.call(this.modules);
    
    // 创建 Chunk 图
    this.hooks.beforeChunks.call();
    this.buildChunkGraph();
    this.hooks.afterChunks.call(this.chunks);
    
    // 优化阶段
    this.hooks.optimize.call();
    
    // 优化模块
    while (this.hooks.optimizeModules.call(this.modules)) {}
    this.hooks.afterOptimizeModules.call(this.modules);
    
    // 优化 Chunk
    while (this.hooks.optimizeChunks.call(this.chunks, this.chunkGroups)) {}
    this.hooks.afterOptimizeChunks.call(this.chunks, this.chunkGroups);
    
    // 优化树
    this.hooks.optimizeTree.callAsync(this.chunks, this.modules, (err) => {
      if (err) return callback(err);
      
      // 分配模块 ID
      this.assignModuleIds();
      
      // 分配 Chunk ID
      this.assignChunkIds();
      
      // 生成哈希
      this.createHash();
      
      // 生成资源
      this.createModuleAssets();
      this.createChunkAssets((err) => {
        if (err) return callback(err);
        
        this.hooks.afterSeal.callAsync(callback);
      });
    });
  }
}
```

### 构建 Chunk 图

```typescript
class Compilation {
  buildChunkGraph(): void {
    // 为每个入口创建 Chunk
    for (const [name, entrypoint] of this.entrypoints) {
      const chunk = entrypoint.getEntrypointChunk();
      
      // 获取入口模块
      const entryModules = this.chunkGraph.getChunkEntryModulesIterable(chunk);
      
      // 遍历模块依赖图
      for (const module of entryModules) {
        this.assignModuleToChunk(module, chunk, entrypoint);
      }
    }
    
    // 处理异步块
    this.processAsyncBlocks();
  }
  
  assignModuleToChunk(
    module: Module,
    chunk: Chunk,
    chunkGroup: ChunkGroup
  ): void {
    // 将模块添加到 Chunk
    this.chunkGraph.connectChunkAndModule(chunk, module);
    
    // 遍历模块的依赖
    for (const block of module.blocks) {
      // 异步块创建新的 ChunkGroup
      this.processAsyncBlock(block, chunkGroup);
    }
    
    // 遍历同步依赖
    for (const dependency of module.dependencies) {
      const depModule = this.moduleGraph.getModule(dependency);
      if (depModule && !this.chunkGraph.isModuleInChunk(depModule, chunk)) {
        this.assignModuleToChunk(depModule, chunk, chunkGroup);
      }
    }
  }
}
```

## 异步块处理

### 创建异步 ChunkGroup

```typescript
class Compilation {
  processAsyncBlocks(): void {
    const queue: Array<{
      block: AsyncDependenciesBlock;
      chunkGroup: ChunkGroup;
    }> = [];
    
    // 收集所有异步块
    for (const module of this.modules) {
      for (const block of module.blocks) {
        const chunkGroup = this.getChunkGroupForModule(module);
        queue.push({ block, chunkGroup });
      }
    }
    
    // 处理异步块
    for (const { block, chunkGroup } of queue) {
      this.processAsyncBlock(block, chunkGroup);
    }
  }
  
  processAsyncBlock(
    block: AsyncDependenciesBlock,
    parentChunkGroup: ChunkGroup
  ): ChunkGroup {
    // 创建新的 ChunkGroup
    const chunkGroup = new ChunkGroup({
      name: block.chunkName,
    });
    
    // 创建新的 Chunk
    const chunk = new Chunk(block.chunkName);
    chunkGroup.pushChunk(chunk);
    chunk.addGroup(chunkGroup);
    
    // 建立父子关系
    parentChunkGroup.addChild(chunkGroup);
    
    // 记录来源
    chunkGroup.addOrigin(
      block.parent,
      block.loc,
      block.request
    );
    
    // 注册到 Compilation
    this.chunkGroups.push(chunkGroup);
    this.chunks.add(chunk);
    
    // 处理异步块的依赖
    for (const dep of block.dependencies) {
      const module = this.moduleGraph.getModule(dep);
      if (module) {
        this.chunkGraph.connectChunkAndModule(chunk, module);
      }
    }
    
    return chunkGroup;
  }
}
```

### 块名称处理

```typescript
class AsyncDependenciesBlock {
  chunkName: string | null;
  
  constructor(
    groupOptions: GroupOptions,
    loc: DependencyLocation,
    request: string
  ) {
    // 从魔法注释获取名称
    this.chunkName = groupOptions.name || null;
  }
}

// import(/* webpackChunkName: "my-chunk" */ './module')
// 会创建名为 "my-chunk" 的 Chunk
```

## 优化阶段

### 模块优化

```typescript
class Compilation {
  optimizeModules(): void {
    // 触发模块优化钩子
    // Tree Shaking 等优化在这里执行
    this.hooks.optimizeModules.call(this.modules);
    
    // 移除未使用的模块
    this.removeUnusedModules();
  }
  
  removeUnusedModules(): void {
    const unusedModules = new Set<Module>();
    
    for (const module of this.modules) {
      // 检查模块是否被使用
      const chunks = this.chunkGraph.getModuleChunks(module);
      if (chunks.length === 0) {
        unusedModules.add(module);
      }
    }
    
    // 移除未使用的模块
    for (const module of unusedModules) {
      this.modules.delete(module);
    }
  }
}
```

### Chunk 优化

```typescript
class Compilation {
  optimizeChunks(): void {
    // 合并小 Chunk
    this.mergeSimilarChunks();
    
    // 触发 Chunk 优化钩子
    // SplitChunksPlugin 在这里执行
    this.hooks.optimizeChunks.call(this.chunks, this.chunkGroups);
  }
  
  mergeSimilarChunks(): void {
    const chunksByContent = new Map<string, Chunk[]>();
    
    for (const chunk of this.chunks) {
      // 计算 Chunk 内容哈希
      const contentKey = this.getChunkContentKey(chunk);
      
      const similar = chunksByContent.get(contentKey) || [];
      similar.push(chunk);
      chunksByContent.set(contentKey, similar);
    }
    
    // 合并相同内容的 Chunk
    for (const chunks of chunksByContent.values()) {
      if (chunks.length > 1) {
        this.mergeChunks(chunks[0], ...chunks.slice(1));
      }
    }
  }
  
  getChunkContentKey(chunk: Chunk): string {
    const modules = this.chunkGraph.getChunkModules(chunk);
    const ids = modules.map(m => m.identifier()).sort();
    return ids.join('|');
  }
}
```

## ID 分配

### 模块 ID

```typescript
class Compilation {
  assignModuleIds(): void {
    const usedIds = new Set<string | number>();
    
    // 收集已使用的 ID
    for (const module of this.modules) {
      if (module.id !== null) {
        usedIds.add(module.id);
      }
    }
    
    // 分配新 ID
    let nextId = 0;
    for (const module of this.modules) {
      if (module.id === null) {
        while (usedIds.has(nextId)) {
          nextId++;
        }
        this.chunkGraph.setModuleId(module, nextId);
        usedIds.add(nextId);
        nextId++;
      }
    }
  }
}
```

### Chunk ID

```typescript
class Compilation {
  assignChunkIds(): void {
    // 命名 Chunk 使用名称作为 ID
    for (const chunk of this.chunks) {
      if (chunk.name) {
        chunk.id = chunk.name;
        chunk.ids = [chunk.name];
      }
    }
    
    // 未命名 Chunk 使用数字 ID
    let nextId = 0;
    const usedIds = new Set<string | number>();
    
    for (const chunk of this.chunks) {
      if (chunk.id !== null) {
        usedIds.add(chunk.id);
      }
    }
    
    for (const chunk of this.chunks) {
      if (chunk.id === null) {
        while (usedIds.has(nextId)) {
          nextId++;
        }
        chunk.id = nextId;
        chunk.ids = [nextId];
        usedIds.add(nextId);
        nextId++;
      }
    }
  }
}
```

## 哈希生成

```typescript
class Compilation {
  createHash(): void {
    const outputOptions = this.outputOptions;
    const hashFunction = outputOptions.hashFunction || 'md4';
    const hashDigest = outputOptions.hashDigest || 'hex';
    const hashDigestLength = outputOptions.hashDigestLength || 20;
    
    // 创建编译哈希
    const hash = createHash(hashFunction);
    
    // 添加模块内容到哈希
    for (const module of this.modules) {
      const moduleHash = this.chunkGraph.getModuleHash(module);
      hash.update(moduleHash);
    }
    
    // 设置编译哈希
    this.hash = hash.digest(hashDigest).slice(0, hashDigestLength);
    
    // 为每个 Chunk 创建哈希
    for (const chunk of this.chunks) {
      this.createChunkHash(chunk);
    }
  }
  
  createChunkHash(chunk: Chunk): void {
    const hash = createHash(this.outputOptions.hashFunction);
    
    // 添加 Chunk 的模块到哈希
    const modules = this.chunkGraph.getChunkModules(chunk);
    for (const module of modules) {
      hash.update(module.identifier());
      hash.update(this.chunkGraph.getModuleHash(module));
    }
    
    // 设置 Chunk 哈希
    chunk.hash = hash.digest('hex');
    chunk.contentHash = {
      javascript: chunk.hash.slice(0, 8),
    };
  }
}
```

## 资源生成

```typescript
class Compilation {
  createChunkAssets(callback: Callback): void {
    asyncLib.forEach(
      this.chunks,
      (chunk, callback) => {
        // 获取 Chunk 的模板
        const template = chunk.hasRuntime()
          ? this.mainTemplate
          : this.chunkTemplate;
        
        // 渲染 Chunk
        const source = template.render(chunk, this);
        
        // 确定文件名
        const filename = this.getPath(
          chunk.filenameTemplate || this.outputOptions.filename,
          { chunk }
        );
        
        // 添加到资源
        this.assets[filename] = source;
        chunk.files.add(filename);
        
        callback();
      },
      callback
    );
  }
}
```

## 总结

seal 方法封装阶段的核心要点：

**阶段定位**：
- 模块构建之后
- 资源输出之前
- 关键转换点

**主要步骤**：
1. 优化依赖
2. 构建 Chunk 图
3. 处理异步块
4. 优化 Chunk
5. 分配 ID
6. 生成哈希
7. 创建资源

**优化时机**：
- 模块优化
- Chunk 优化
- 树形优化

**ID 管理**：
- 模块 ID 分配
- Chunk ID 分配

**下一章**：我们将学习 Chunk 创建与分配。
