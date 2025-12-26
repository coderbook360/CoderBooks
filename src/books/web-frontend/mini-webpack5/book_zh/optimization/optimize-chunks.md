---
sidebar_position: 109
title: "optimizeChunks 代码块优化"
---

# optimizeChunks 代码块优化

optimizeChunks 钩子负责 Chunk 级别的优化，包括代码分割、Chunk 合并、移除空 Chunk 等操作，直接影响最终输出文件的结构。

## 钩子机制

### 钩子定义

```typescript
class Compilation {
  hooks = {
    // Chunk 优化钩子
    optimizeChunks: new SyncBailHook<[Iterable<Chunk>, Iterable<ChunkGroup>]>(
      ['chunks', 'chunkGroups']
    ),
    afterOptimizeChunks: new SyncHook<[Iterable<Chunk>, Iterable<ChunkGroup>]>(
      ['chunks', 'chunkGroups']
    ),
  };
  
  optimizeChunks(): void {
    // 循环调用直到没有更多优化
    while (this.hooks.optimizeChunks.call(this.chunks, this.chunkGroups)) {
      // 返回 true 表示有优化发生，继续循环
    }
    
    this.hooks.afterOptimizeChunks.call(this.chunks, this.chunkGroups);
  }
}
```

### 优化阶段

```typescript
// 优化阶段常量
const STAGE_BASIC = -10;
const STAGE_DEFAULT = 0;
const STAGE_ADVANCED = 10;

class ChunkOptimizationPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap(
      'ChunkOptimizationPlugin',
      (compilation) => {
        compilation.hooks.optimizeChunks.tap(
          {
            name: 'ChunkOptimizationPlugin',
            stage: STAGE_DEFAULT,  // 指定执行阶段
          },
          (chunks, chunkGroups) => {
            // 执行优化
            return this.optimize(chunks, chunkGroups, compilation);
          }
        );
      }
    );
  }
}
```

## 空 Chunk 移除

### RemoveEmptyChunksPlugin

```typescript
class RemoveEmptyChunksPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap(
      'RemoveEmptyChunksPlugin',
      (compilation) => {
        compilation.hooks.optimizeChunks.tap(
          {
            name: 'RemoveEmptyChunksPlugin',
            stage: STAGE_BASIC,
          },
          (chunks) => {
            const chunkGraph = compilation.chunkGraph;
            let hasRemoved = false;
            
            for (const chunk of chunks) {
              // 检查 Chunk 是否为空
              if (this.isEmptyChunk(chunk, chunkGraph)) {
                this.removeChunk(chunk, compilation);
                hasRemoved = true;
              }
            }
            
            return hasRemoved;
          }
        );
      }
    );
  }
  
  isEmptyChunk(chunk: Chunk, chunkGraph: ChunkGraph): boolean {
    // 没有模块且没有运行时
    return chunkGraph.getNumberOfChunkModules(chunk) === 0 &&
           !chunk.hasRuntime();
  }
  
  removeChunk(chunk: Chunk, compilation: Compilation): void {
    // 从所有 ChunkGroup 中移除
    for (const group of Array.from(chunk.groupsIterable)) {
      group.removeChunk(chunk);
      
      // 如果 ChunkGroup 为空，也移除
      if (group.chunks.length === 0) {
        const idx = compilation.chunkGroups.indexOf(group);
        if (idx >= 0) {
          compilation.chunkGroups.splice(idx, 1);
        }
        
        // 从父 ChunkGroup 中移除
        for (const parent of Array.from(group.parentsIterable)) {
          parent.removeChild(group);
        }
      }
    }
    
    // 从 Compilation 中移除
    compilation.chunks.delete(chunk);
    if (chunk.name) {
      compilation.namedChunks.delete(chunk.name);
    }
  }
}
```

## 重复 Chunk 合并

### MergeDuplicateChunksPlugin

```typescript
class MergeDuplicateChunksPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap(
      'MergeDuplicateChunksPlugin',
      (compilation) => {
        compilation.hooks.optimizeChunks.tap(
          {
            name: 'MergeDuplicateChunksPlugin',
            stage: STAGE_BASIC,
          },
          (chunks) => {
            return this.mergeDuplicates(compilation);
          }
        );
      }
    );
  }
  
  mergeDuplicates(compilation: Compilation): boolean {
    const chunkGraph = compilation.chunkGraph;
    const chunksByContent = new Map<string, Chunk[]>();
    
    // 按内容分组
    for (const chunk of compilation.chunks) {
      const key = this.getChunkContentKey(chunk, chunkGraph);
      
      let group = chunksByContent.get(key);
      if (!group) {
        group = [];
        chunksByContent.set(key, group);
      }
      group.push(chunk);
    }
    
    // 合并相同内容的 Chunk
    let hasMerged = false;
    for (const group of chunksByContent.values()) {
      if (group.length > 1) {
        const primary = group[0];
        
        for (let i = 1; i < group.length; i++) {
          this.mergeChunks(primary, group[i], compilation);
          hasMerged = true;
        }
      }
    }
    
    return hasMerged;
  }
  
  getChunkContentKey(chunk: Chunk, chunkGraph: ChunkGraph): string {
    const modules = chunkGraph.getChunkModules(chunk);
    const ids = modules.map(m => m.identifier()).sort();
    return ids.join('|');
  }
  
  mergeChunks(target: Chunk, source: Chunk, compilation: Compilation): void {
    const chunkGraph = compilation.chunkGraph;
    
    // 合并模块（实际上内容相同，不需要移动）
    
    // 合并 ChunkGroup 关系
    for (const group of Array.from(source.groupsIterable)) {
      // 替换 Chunk
      group.replaceChunk(source, target);
      target.addGroup(group);
    }
    
    // 移除源 Chunk
    compilation.chunks.delete(source);
    if (source.name) {
      compilation.namedChunks.delete(source.name);
    }
  }
}
```

## 可用模块移除

### RemoveParentModulesPlugin

```typescript
class RemoveParentModulesPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap(
      'RemoveParentModulesPlugin',
      (compilation) => {
        compilation.hooks.optimizeChunks.tap(
          {
            name: 'RemoveParentModulesPlugin',
            stage: STAGE_BASIC,
          },
          (chunks, chunkGroups) => {
            return this.removeAvailableModules(compilation);
          }
        );
      }
    );
  }
  
  removeAvailableModules(compilation: Compilation): boolean {
    const chunkGraph = compilation.chunkGraph;
    let hasRemoved = false;
    
    for (const chunkGroup of compilation.chunkGroups) {
      // 获取父级可用的模块
      const availableModules = this.getAvailableModules(chunkGroup, chunkGraph);
      
      if (availableModules.size === 0) continue;
      
      // 从当前 ChunkGroup 的 Chunk 中移除可用模块
      for (const chunk of chunkGroup.chunks) {
        for (const module of chunkGraph.getChunkModules(chunk)) {
          if (availableModules.has(module)) {
            chunkGraph.disconnectChunkAndModule(chunk, module);
            hasRemoved = true;
          }
        }
      }
    }
    
    return hasRemoved;
  }
  
  getAvailableModules(
    chunkGroup: ChunkGroup,
    chunkGraph: ChunkGraph
  ): Set<Module> {
    const available = new Set<Module>();
    
    // 收集所有父级 ChunkGroup 的模块
    for (const parent of chunkGroup.parentsIterable) {
      for (const chunk of parent.chunks) {
        for (const module of chunkGraph.getChunkModules(chunk)) {
          available.add(module);
        }
      }
      
      // 递归收集父级的可用模块
      const parentAvailable = this.getAvailableModules(parent, chunkGraph);
      for (const module of parentAvailable) {
        available.add(module);
      }
    }
    
    return available;
  }
}
```

## 代码分割

### SplitChunksPlugin 集成

```typescript
class SplitChunksPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.thisCompilation.tap(
      'SplitChunksPlugin',
      (compilation) => {
        compilation.hooks.optimizeChunks.tap(
          {
            name: 'SplitChunksPlugin',
            stage: STAGE_ADVANCED,
          },
          (chunks) => {
            // 执行代码分割
            this.optimize(compilation, chunks);
            return false;  // 不需要重复执行
          }
        );
      }
    );
  }
  
  optimize(compilation: Compilation, chunks: Iterable<Chunk>): void {
    // 收集模块信息
    const chunksInfoMap = this.collectChunksInfo(compilation);
    
    // 迭代分割
    while (true) {
      const bestMatch = this.findBestMatch(chunksInfoMap);
      
      if (!bestMatch) break;
      
      // 执行分割
      this.performSplit(compilation, bestMatch);
      
      // 更新信息
      this.updateChunksInfo(chunksInfoMap, bestMatch);
    }
  }
}
```

## Chunk 合并优化

### EnsureChunkConditionsPlugin

```typescript
class EnsureChunkConditionsPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap(
      'EnsureChunkConditionsPlugin',
      (compilation) => {
        compilation.hooks.optimizeChunks.tap(
          'EnsureChunkConditionsPlugin',
          (chunks) => {
            return this.ensureConditions(compilation);
          }
        );
      }
    );
  }
  
  ensureConditions(compilation: Compilation): boolean {
    const chunkGraph = compilation.chunkGraph;
    let hasChanges = false;
    
    for (const chunk of compilation.chunks) {
      const modules = chunkGraph.getChunkModules(chunk);
      
      for (const module of modules) {
        // 检查模块是否满足条件
        if (!this.checkModuleCondition(module, chunk, compilation)) {
          // 移动到合适的 Chunk
          const targetChunk = this.findSuitableChunk(module, compilation);
          
          if (targetChunk) {
            chunkGraph.disconnectChunkAndModule(chunk, module);
            chunkGraph.connectChunkAndModule(targetChunk, module);
            hasChanges = true;
          }
        }
      }
    }
    
    return hasChanges;
  }
  
  checkModuleCondition(
    module: Module,
    chunk: Chunk,
    compilation: Compilation
  ): boolean {
    // 检查模块类型是否适合当前 Chunk
    // 例如：异步模块不应该在入口 Chunk 中
    if (module.type === 'async') {
      return !chunk.canBeInitial();
    }
    
    return true;
  }
}
```

### LimitChunkCountPlugin

```typescript
class LimitChunkCountPlugin {
  constructor(private options: { maxChunks?: number }) {}
  
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap(
      'LimitChunkCountPlugin',
      (compilation) => {
        compilation.hooks.optimizeChunks.tap(
          {
            name: 'LimitChunkCountPlugin',
            stage: STAGE_ADVANCED,
          },
          (chunks) => {
            return this.limitChunks(compilation);
          }
        );
      }
    );
  }
  
  limitChunks(compilation: Compilation): boolean {
    const { maxChunks } = this.options;
    if (!maxChunks) return false;
    
    let hasChanges = false;
    
    while (compilation.chunks.size > maxChunks) {
      // 找到最适合合并的两个 Chunk
      const [chunkA, chunkB] = this.findBestMergeCandidates(compilation);
      
      if (!chunkA || !chunkB) break;
      
      // 合并 Chunk
      this.mergeChunks(chunkA, chunkB, compilation);
      hasChanges = true;
    }
    
    return hasChanges;
  }
  
  findBestMergeCandidates(compilation: Compilation): [Chunk?, Chunk?] {
    const chunkGraph = compilation.chunkGraph;
    let bestPair: [Chunk?, Chunk?] = [undefined, undefined];
    let minCost = Infinity;
    
    const chunks = Array.from(compilation.chunks);
    
    for (let i = 0; i < chunks.length; i++) {
      for (let j = i + 1; j < chunks.length; j++) {
        const chunkA = chunks[i];
        const chunkB = chunks[j];
        
        // 计算合并成本
        const cost = this.calculateMergeCost(chunkA, chunkB, chunkGraph);
        
        if (cost < minCost) {
          minCost = cost;
          bestPair = [chunkA, chunkB];
        }
      }
    }
    
    return bestPair;
  }
  
  calculateMergeCost(
    chunkA: Chunk,
    chunkB: Chunk,
    chunkGraph: ChunkGraph
  ): number {
    // 成本 = 合并后的大小增加
    const sizeA = chunkGraph.getChunkSize(chunkA);
    const sizeB = chunkGraph.getChunkSize(chunkB);
    const integratedSize = chunkGraph.getIntegratedChunksSize(chunkA, chunkB);
    
    return integratedSize - Math.max(sizeA, sizeB);
  }
}
```

## 优化后处理

### 重新分配 ID

```typescript
class Compilation {
  afterOptimizeChunks(): void {
    // 在 Chunk 优化后，可能需要重新分配 ID
    this.hooks.afterOptimizeChunks.call(this.chunks, this.chunkGroups);
    
    // 清除可能失效的缓存
    this.clearChunkCaches();
  }
  
  clearChunkCaches(): void {
    for (const chunk of this.chunks) {
      // 清除哈希缓存
      chunk.hash = undefined;
      chunk.contentHash = {};
    }
  }
}
```

## 总结

optimizeChunks 代码块优化的核心要点：

**钩子机制**：
- 循环调用直到无优化
- 支持执行阶段控制

**空 Chunk 移除**：
- 检测空 Chunk
- 清理 ChunkGroup

**重复合并**：
- 按内容分组
- 合并相同 Chunk

**可用模块移除**：
- 父级模块分析
- 移除冗余模块

**代码分割**：
- SplitChunksPlugin
- STAGE_ADVANCED 阶段

**Chunk 限制**：
- LimitChunkCountPlugin
- 合并成本计算

**下一章**：我们将学习 Tree Shaking 原理与实现。
