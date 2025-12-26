---
sidebar_position: 97
title: "Chunk 创建与分配"
---

# Chunk 创建与分配

Chunk 的创建与分配是将模块依赖图转换为可输出资源的核心过程，决定了最终打包文件的结构。

## 创建策略

### 入口 Chunk 创建

```typescript
class Compilation {
  // 处理入口配置
  processEntries(): void {
    for (const [name, entry] of Object.entries(this.options.entry)) {
      this.createEntryChunk(name, entry);
    }
  }
  
  createEntryChunk(name: string, entry: EntryConfig): Chunk {
    // 创建 Entrypoint
    const entrypoint = new Entrypoint({ name });
    
    // 创建入口 Chunk
    const chunk = new Chunk(name);
    entrypoint.pushChunk(chunk);
    chunk.addGroup(entrypoint);
    
    // 注册
    this.entrypoints.set(name, entrypoint);
    this.chunkGroups.push(entrypoint);
    this.chunks.add(chunk);
    this.namedChunks.set(name, chunk);
    
    return chunk;
  }
}
```

### 异步 Chunk 创建

```typescript
class Compilation {
  // 处理动态导入
  processAsyncDependency(
    block: AsyncDependenciesBlock,
    parentChunk: Chunk,
    parentChunkGroup: ChunkGroup
  ): void {
    const name = block.chunkName;
    
    // 检查是否已存在同名 Chunk
    let chunk = name ? this.namedChunks.get(name) : null;
    let chunkGroup: ChunkGroup;
    
    if (chunk) {
      // 复用已存在的 Chunk
      chunkGroup = chunk.groupsIterable[Symbol.iterator]().next().value;
    } else {
      // 创建新的 Chunk 和 ChunkGroup
      chunk = new Chunk(name);
      chunkGroup = new ChunkGroup({ name });
      
      chunkGroup.pushChunk(chunk);
      chunk.addGroup(chunkGroup);
      
      this.chunkGroups.push(chunkGroup);
      this.chunks.add(chunk);
      
      if (name) {
        this.namedChunks.set(name, chunk);
      }
    }
    
    // 建立父子关系
    parentChunkGroup.addChild(chunkGroup);
    
    // 记录来源
    chunkGroup.addOrigin(block.parent, block.loc, block.request);
    
    // 将异步依赖的模块分配到这个 Chunk
    this.assignBlockModulesToChunk(block, chunk, chunkGroup);
  }
  
  assignBlockModulesToChunk(
    block: AsyncDependenciesBlock,
    chunk: Chunk,
    chunkGroup: ChunkGroup
  ): void {
    for (const dep of block.dependencies) {
      const module = this.moduleGraph.getModule(dep);
      if (module) {
        this.chunkGraph.connectChunkAndModule(chunk, module);
        
        // 递归处理模块的依赖
        this.assignModuleDependenciesToChunk(module, chunk, chunkGroup);
      }
    }
  }
}
```

## 分配算法

### 模块到 Chunk 的分配

```typescript
class Compilation {
  // 主分配算法
  buildChunkGraph(): void {
    const chunkGraph = this.chunkGraph;
    const queue: QueueItem[] = [];
    const visited = new Set<string>();
    
    // 从入口点开始
    for (const [name, entrypoint] of this.entrypoints) {
      const chunk = entrypoint.getEntrypointChunk();
      const entryModules = chunkGraph.getChunkEntryModulesIterable(chunk);
      
      for (const module of entryModules) {
        queue.push({
          module,
          chunk,
          chunkGroup: entrypoint,
        });
      }
    }
    
    // 广度优先遍历
    while (queue.length > 0) {
      const { module, chunk, chunkGroup } = queue.shift()!;
      
      const key = `${module.identifier()}|${chunk.id}`;
      if (visited.has(key)) continue;
      visited.add(key);
      
      // 连接模块到 Chunk
      chunkGraph.connectChunkAndModule(chunk, module);
      
      // 处理模块的依赖
      this.processModuleDependencies(module, chunk, chunkGroup, queue);
    }
  }
  
  processModuleDependencies(
    module: Module,
    chunk: Chunk,
    chunkGroup: ChunkGroup,
    queue: QueueItem[]
  ): void {
    // 处理同步依赖
    for (const dep of module.dependencies) {
      const depModule = this.moduleGraph.getModule(dep);
      if (depModule) {
        queue.push({
          module: depModule,
          chunk,
          chunkGroup,
        });
      }
    }
    
    // 处理异步块
    for (const block of module.blocks) {
      this.processAsyncDependency(block, chunk, chunkGroup);
    }
  }
}
```

### 共享模块处理

```typescript
class Compilation {
  // 处理被多个 Chunk 共享的模块
  processSharedModules(): void {
    const moduleChunksMap = new Map<Module, Set<Chunk>>();
    
    // 收集每个模块所在的 Chunk
    for (const chunk of this.chunks) {
      const modules = this.chunkGraph.getChunkModules(chunk);
      for (const module of modules) {
        let chunks = moduleChunksMap.get(module);
        if (!chunks) {
          chunks = new Set();
          moduleChunksMap.set(module, chunks);
        }
        chunks.add(chunk);
      }
    }
    
    // 处理共享模块
    for (const [module, chunks] of moduleChunksMap) {
      if (chunks.size > 1) {
        // 模块被多个 Chunk 共享
        // SplitChunksPlugin 会处理这种情况
        this.handleSharedModule(module, chunks);
      }
    }
  }
  
  handleSharedModule(module: Module, chunks: Set<Chunk>): void {
    // 检查是否应该提取到公共 Chunk
    const shouldExtract = this.shouldExtractToCommonChunk(module, chunks);
    
    if (shouldExtract) {
      // 创建或获取公共 Chunk
      const commonChunk = this.getOrCreateCommonChunk(chunks);
      
      // 从原 Chunk 中移除模块
      for (const chunk of chunks) {
        this.chunkGraph.disconnectChunkAndModule(chunk, module);
      }
      
      // 添加到公共 Chunk
      this.chunkGraph.connectChunkAndModule(commonChunk, module);
    }
  }
}
```

## Chunk 复用策略

### 同名 Chunk 复用

```typescript
class Compilation {
  // 获取或创建命名 Chunk
  getOrCreateChunk(name: string): Chunk {
    const existingChunk = this.namedChunks.get(name);
    
    if (existingChunk) {
      return existingChunk;
    }
    
    const chunk = new Chunk(name);
    this.chunks.add(chunk);
    this.namedChunks.set(name, chunk);
    
    return chunk;
  }
}

// 使用示例
// 多个 import() 使用相同的 chunkName 会复用同一个 Chunk
import(/* webpackChunkName: "shared" */ './a');
import(/* webpackChunkName: "shared" */ './b');
// a 和 b 会被放入同一个 "shared" Chunk
```

### 条件复用

```typescript
class Compilation {
  // 检查是否应该复用现有 Chunk
  shouldReuseChunk(
    newModules: Set<Module>,
    existingChunk: Chunk
  ): boolean {
    const existingModules = new Set(
      this.chunkGraph.getChunkModules(existingChunk)
    );
    
    // 检查模块重叠度
    let overlap = 0;
    for (const module of newModules) {
      if (existingModules.has(module)) {
        overlap++;
      }
    }
    
    const overlapRatio = overlap / newModules.size;
    
    // 如果重叠度超过阈值，复用
    return overlapRatio > 0.8;
  }
}
```

## 增量分配

### 监听模式下的增量更新

```typescript
class Compilation {
  // 增量更新 Chunk
  updateChunks(changedModules: Set<Module>): void {
    for (const module of changedModules) {
      // 获取模块所在的 Chunk
      const chunks = this.chunkGraph.getModuleChunks(module);
      
      for (const chunk of chunks) {
        // 标记 Chunk 需要重新生成
        this.markChunkDirty(chunk);
        
        // 重新计算 Chunk 哈希
        this.invalidateChunkHash(chunk);
      }
    }
  }
  
  markChunkDirty(chunk: Chunk): void {
    this.dirtyChunks.add(chunk);
    
    // 同时标记依赖这个 Chunk 的其他 Chunk
    for (const group of chunk.groupsIterable) {
      for (const parentGroup of group.parentsIterable) {
        for (const parentChunk of parentGroup.chunks) {
          if (parentChunk.hasRuntime()) {
            this.dirtyChunks.add(parentChunk);
          }
        }
      }
    }
  }
}
```

### 新模块分配

```typescript
class Compilation {
  // 处理新增模块
  handleNewModule(module: Module): void {
    // 确定模块应该分配到哪个 Chunk
    const targetChunk = this.findTargetChunk(module);
    
    if (targetChunk) {
      this.chunkGraph.connectChunkAndModule(targetChunk, module);
    } else {
      // 创建新 Chunk
      this.createChunkForModule(module);
    }
  }
  
  findTargetChunk(module: Module): Chunk | null {
    // 根据模块的导入者确定目标 Chunk
    const incomingConnections = this.moduleGraph.getIncomingConnections(module);
    
    const parentChunks = new Set<Chunk>();
    for (const connection of incomingConnections) {
      if (connection.originModule) {
        const chunks = this.chunkGraph.getModuleChunks(connection.originModule);
        for (const chunk of chunks) {
          parentChunks.add(chunk);
        }
      }
    }
    
    // 选择最合适的 Chunk
    if (parentChunks.size === 1) {
      return parentChunks.values().next().value;
    }
    
    return null;
  }
}
```

## 分配验证

### 完整性检查

```typescript
class Compilation {
  // 验证 Chunk 分配
  validateChunkAssignment(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // 检查所有模块都被分配
    for (const module of this.modules) {
      const chunks = this.chunkGraph.getModuleChunks(module);
      if (chunks.length === 0) {
        warnings.push(`模块 ${module.identifier()} 未分配到任何 Chunk`);
      }
    }
    
    // 检查入口模块
    for (const [name, entrypoint] of this.entrypoints) {
      const chunk = entrypoint.getEntrypointChunk();
      const entryModules = this.chunkGraph.getChunkEntryModulesIterable(chunk);
      
      let hasEntryModule = false;
      for (const _ of entryModules) {
        hasEntryModule = true;
        break;
      }
      
      if (!hasEntryModule) {
        errors.push(`入口点 ${name} 没有入口模块`);
      }
    }
    
    // 检查循环依赖
    this.checkCircularChunkDependencies(errors);
    
    return { errors, warnings };
  }
  
  checkCircularChunkDependencies(errors: string[]): void {
    const visited = new Set<ChunkGroup>();
    const stack = new Set<ChunkGroup>();
    
    const check = (group: ChunkGroup): boolean => {
      if (stack.has(group)) {
        errors.push(`检测到 ChunkGroup 循环依赖: ${group.name}`);
        return true;
      }
      
      if (visited.has(group)) return false;
      
      visited.add(group);
      stack.add(group);
      
      for (const child of group.childrenIterable) {
        if (check(child)) return true;
      }
      
      stack.delete(group);
      return false;
    };
    
    for (const group of this.chunkGroups) {
      check(group);
    }
  }
}
```

### 大小分析

```typescript
class Compilation {
  // 分析 Chunk 大小分布
  analyzeChunkSizes(): ChunkSizeAnalysis {
    const analysis: ChunkSizeAnalysis = {
      total: 0,
      chunks: [],
    };
    
    for (const chunk of this.chunks) {
      const size = this.chunkGraph.getChunkSize(chunk);
      const moduleCount = this.chunkGraph.getNumberOfChunkModules(chunk);
      
      analysis.total += size;
      analysis.chunks.push({
        name: chunk.name || String(chunk.id),
        size,
        moduleCount,
        isInitial: chunk.canBeInitial(),
        hasRuntime: chunk.hasRuntime(),
      });
    }
    
    // 按大小排序
    analysis.chunks.sort((a, b) => b.size - a.size);
    
    return analysis;
  }
}
```

## 总结

Chunk 创建与分配的核心要点：

**创建策略**：
- 入口 Chunk 创建
- 异步 Chunk 创建
- 命名 Chunk 复用

**分配算法**：
- 广度优先遍历
- 同步依赖同 Chunk
- 异步依赖新 Chunk

**共享处理**：
- 识别共享模块
- 公共 Chunk 提取
- 重复消除

**增量更新**：
- 脏 Chunk 标记
- 增量重分配
- 哈希失效

**验证机制**：
- 完整性检查
- 循环依赖检测
- 大小分析

**下一章**：我们将学习模块到 Chunk 的映射。
