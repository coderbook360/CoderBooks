---
sidebar_position: 102
title: "Chunk 分割算法"
---

# Chunk 分割算法

Chunk 分割算法是 SplitChunksPlugin 的核心，决定了哪些模块应该被提取到公共 Chunk 中，以及如何平衡各种约束条件。

## 算法概述

### 核心思想

```
输入：
- 模块集合 M
- Chunk 集合 C
- 模块到 Chunk 的映射关系
- 分割配置（minSize, minChunks, cacheGroups...）

输出：
- 新的 Chunk 集合 C'
- 更新后的模块映射

目标：
最大化代码复用，最小化总加载体积，满足所有约束条件
```

### 算法框架

```typescript
class ChunkSplittingAlgorithm {
  split(compilation: Compilation): void {
    // 阶段1：构建模块使用图
    const moduleUsageGraph = this.buildModuleUsageGraph(compilation);
    
    // 阶段2：识别分割候选
    const candidates = this.identifySplitCandidates(moduleUsageGraph);
    
    // 阶段3：评分与排序
    const rankedCandidates = this.rankCandidates(candidates);
    
    // 阶段4：贪心分割
    this.greedySplit(compilation, rankedCandidates);
    
    // 阶段5：后处理
    this.postProcess(compilation);
  }
}
```

## 模块使用图

### 构建使用关系

```typescript
interface ModuleUsage {
  module: Module;
  chunks: Set<Chunk>;
  size: number;
  depth: number;  // 依赖深度
}

class ChunkSplittingAlgorithm {
  buildModuleUsageGraph(compilation: Compilation): Map<Module, ModuleUsage> {
    const graph = new Map<Module, ModuleUsage>();
    const chunkGraph = compilation.chunkGraph;
    
    for (const module of compilation.modules) {
      const chunks = new Set(chunkGraph.getModuleChunks(module));
      
      // 过滤不参与分割的 Chunk
      const filteredChunks = this.filterChunks(chunks);
      
      if (filteredChunks.size > 0) {
        graph.set(module, {
          module,
          chunks: filteredChunks,
          size: module.size(),
          depth: this.calculateDepth(module, compilation),
        });
      }
    }
    
    return graph;
  }
  
  filterChunks(chunks: Set<Chunk>): Set<Chunk> {
    const result = new Set<Chunk>();
    
    for (const chunk of chunks) {
      // 根据 chunks 配置过滤
      if (this.options.chunks === 'all') {
        result.add(chunk);
      } else if (this.options.chunks === 'async' && !chunk.canBeInitial()) {
        result.add(chunk);
      } else if (this.options.chunks === 'initial' && chunk.canBeInitial()) {
        result.add(chunk);
      }
    }
    
    return result;
  }
}
```

### 计算模块深度

```typescript
class ChunkSplittingAlgorithm {
  calculateDepth(module: Module, compilation: Compilation): number {
    const moduleGraph = compilation.moduleGraph;
    const visited = new Set<Module>();
    
    const getDepth = (m: Module): number => {
      if (visited.has(m)) return 0;
      visited.add(m);
      
      // 获取依赖当前模块的模块
      const incomingConnections = moduleGraph.getIncomingConnections(m);
      let maxParentDepth = 0;
      
      for (const connection of incomingConnections) {
        if (connection.originModule) {
          const parentDepth = getDepth(connection.originModule);
          maxParentDepth = Math.max(maxParentDepth, parentDepth + 1);
        }
      }
      
      return maxParentDepth;
    };
    
    return getDepth(module);
  }
}
```

## 分割候选识别

### 候选结构

```typescript
interface SplitCandidate {
  key: string;
  modules: Set<Module>;
  chunks: Set<Chunk>;
  cacheGroup: CacheGroupConfig;
  size: number;
  name: string | undefined;
}

class ChunkSplittingAlgorithm {
  identifySplitCandidates(
    moduleUsage: Map<Module, ModuleUsage>
  ): Map<string, SplitCandidate> {
    const candidates = new Map<string, SplitCandidate>();
    
    for (const [module, usage] of moduleUsage) {
      // 遍历所有 cacheGroup
      for (const [groupKey, cacheGroup] of this.cacheGroups) {
        if (!this.matchesCacheGroup(module, cacheGroup)) {
          continue;
        }
        
        // 生成候选键
        const chunksKey = this.getChunksKey(usage.chunks);
        const candidateKey = `${groupKey}~${chunksKey}`;
        
        // 合并到候选
        let candidate = candidates.get(candidateKey);
        if (!candidate) {
          candidate = {
            key: candidateKey,
            modules: new Set(),
            chunks: new Set(usage.chunks),
            cacheGroup,
            size: 0,
            name: this.getName(cacheGroup, usage.chunks),
          };
          candidates.set(candidateKey, candidate);
        }
        
        candidate.modules.add(module);
        candidate.size += usage.size;
      }
    }
    
    return candidates;
  }
  
  getChunksKey(chunks: Set<Chunk>): string {
    const ids = Array.from(chunks)
      .map(c => c.id || c.name || 'unnamed')
      .sort();
    return ids.join('~');
  }
}
```

### CacheGroup 匹配

```typescript
class ChunkSplittingAlgorithm {
  matchesCacheGroup(module: Module, cacheGroup: CacheGroupConfig): boolean {
    // 检查 test 条件
    if (cacheGroup.test) {
      const resource = module.resource;
      
      if (typeof cacheGroup.test === 'function') {
        if (!cacheGroup.test(module)) return false;
      } else if (cacheGroup.test instanceof RegExp) {
        if (!resource || !cacheGroup.test.test(resource)) return false;
      } else if (typeof cacheGroup.test === 'string') {
        if (!resource || !resource.includes(cacheGroup.test)) return false;
      }
    }
    
    // 检查 type 条件
    if (cacheGroup.type) {
      if (module.type !== cacheGroup.type) return false;
    }
    
    return true;
  }
}
```

## 候选评分

### 评分函数

```typescript
class ChunkSplittingAlgorithm {
  rankCandidates(
    candidates: Map<string, SplitCandidate>
  ): SplitCandidate[] {
    const ranked: Array<{ candidate: SplitCandidate; score: number }> = [];
    
    for (const candidate of candidates.values()) {
      // 检查基本条件
      if (!this.checkBasicConditions(candidate)) {
        continue;
      }
      
      const score = this.calculateScore(candidate);
      ranked.push({ candidate, score });
    }
    
    // 按分数排序
    ranked.sort((a, b) => b.score - a.score);
    
    return ranked.map(r => r.candidate);
  }
  
  calculateScore(candidate: SplitCandidate): number {
    const { modules, chunks, cacheGroup, size } = candidate;
    
    // 基础分：节省的字节数
    // 被 N 个 chunk 共享，节省 (N-1) * size
    let score = size * (chunks.size - 1);
    
    // 优先级加成
    const priority = cacheGroup.priority ?? 0;
    score += priority * 100000;
    
    // 模块数量加成（更多模块意味着更好的聚合）
    score += modules.size * 100;
    
    // 深度惩罚（更深的模块优先级更低）
    const avgDepth = this.getAverageDepth(modules);
    score -= avgDepth * 50;
    
    return score;
  }
  
  getAverageDepth(modules: Set<Module>): number {
    let totalDepth = 0;
    for (const module of modules) {
      totalDepth += this.moduleDepthCache.get(module) ?? 0;
    }
    return totalDepth / modules.size;
  }
}
```

### 条件检查

```typescript
class ChunkSplittingAlgorithm {
  checkBasicConditions(candidate: SplitCandidate): boolean {
    const { modules, chunks, cacheGroup, size } = candidate;
    
    // 检查 minSize
    const minSize = cacheGroup.minSize ?? this.options.minSize;
    if (size < minSize) {
      return false;
    }
    
    // 检查 minChunks
    const minChunks = cacheGroup.minChunks ?? this.options.minChunks;
    if (chunks.size < minChunks) {
      return false;
    }
    
    // 检查请求限制（延迟到实际分割时再检查）
    
    return true;
  }
}
```

## 贪心分割

### 分割执行

```typescript
class ChunkSplittingAlgorithm {
  greedySplit(
    compilation: Compilation,
    rankedCandidates: SplitCandidate[]
  ): void {
    const processedModules = new Set<Module>();
    
    for (const candidate of rankedCandidates) {
      // 过滤已处理的模块
      const remainingModules = new Set<Module>();
      for (const module of candidate.modules) {
        if (!processedModules.has(module)) {
          remainingModules.add(module);
        }
      }
      
      if (remainingModules.size === 0) {
        continue;
      }
      
      // 重新计算大小
      const newSize = this.calculateSize(remainingModules);
      const minSize = candidate.cacheGroup.minSize ?? this.options.minSize;
      
      if (newSize < minSize) {
        continue;
      }
      
      // 检查请求限制
      if (!this.checkRequestLimits(compilation, candidate.chunks)) {
        continue;
      }
      
      // 尝试复用现有 Chunk
      const existingChunk = this.tryReuseChunk(compilation, remainingModules);
      
      if (existingChunk) {
        this.reuseChunk(compilation, existingChunk, remainingModules, candidate);
      } else {
        this.createNewChunk(compilation, remainingModules, candidate);
      }
      
      // 标记模块为已处理
      for (const module of remainingModules) {
        processedModules.add(module);
      }
    }
  }
}
```

### 创建新 Chunk

```typescript
class ChunkSplittingAlgorithm {
  createNewChunk(
    compilation: Compilation,
    modules: Set<Module>,
    candidate: SplitCandidate
  ): Chunk {
    const { chunks, cacheGroup, name } = candidate;
    const chunkGraph = compilation.chunkGraph;
    
    // 创建 Chunk
    const newChunk = new Chunk(name);
    compilation.chunks.add(newChunk);
    
    if (name) {
      compilation.namedChunks.set(name, newChunk);
    }
    
    // 设置 ID 提示
    if (cacheGroup.idHint) {
      newChunk.idNameHints.add(cacheGroup.idHint);
    }
    
    // 移动模块
    for (const module of modules) {
      // 从原 Chunk 移除
      for (const chunk of chunks) {
        chunkGraph.disconnectChunkAndModule(chunk, module);
      }
      
      // 添加到新 Chunk
      chunkGraph.connectChunkAndModule(newChunk, module);
    }
    
    // 建立 ChunkGroup 关系
    const chunkGroup = new ChunkGroup({ name });
    chunkGroup.pushChunk(newChunk);
    newChunk.addGroup(chunkGroup);
    compilation.chunkGroups.push(chunkGroup);
    
    // 设置为被分割 Chunk 的父级依赖
    for (const chunk of chunks) {
      for (const group of chunk.groupsIterable) {
        group.addChild(chunkGroup);
      }
    }
    
    return newChunk;
  }
}
```

## 后处理

### 清理空 Chunk

```typescript
class ChunkSplittingAlgorithm {
  postProcess(compilation: Compilation): void {
    // 移除空 Chunk
    this.removeEmptyChunks(compilation);
    
    // 合并相同 Chunk
    this.mergeDuplicateChunks(compilation);
    
    // 处理 maxSize
    this.enforceMaxSize(compilation);
  }
  
  removeEmptyChunks(compilation: Compilation): void {
    const chunksToRemove: Chunk[] = [];
    
    for (const chunk of compilation.chunks) {
      const moduleCount = compilation.chunkGraph.getNumberOfChunkModules(chunk);
      const hasRuntime = chunk.hasRuntime();
      
      if (moduleCount === 0 && !hasRuntime) {
        chunksToRemove.push(chunk);
      }
    }
    
    for (const chunk of chunksToRemove) {
      // 从 ChunkGroup 中移除
      for (const group of Array.from(chunk.groupsIterable)) {
        group.removeChunk(chunk);
        
        // 如果 ChunkGroup 为空，也移除
        if (group.chunks.length === 0) {
          const idx = compilation.chunkGroups.indexOf(group);
          if (idx >= 0) {
            compilation.chunkGroups.splice(idx, 1);
          }
        }
      }
      
      compilation.chunks.delete(chunk);
    }
  }
}
```

### 合并重复 Chunk

```typescript
class ChunkSplittingAlgorithm {
  mergeDuplicateChunks(compilation: Compilation): void {
    const chunksByContent = new Map<string, Chunk[]>();
    
    for (const chunk of compilation.chunks) {
      const key = this.getChunkContentKey(compilation, chunk);
      
      let chunks = chunksByContent.get(key);
      if (!chunks) {
        chunks = [];
        chunksByContent.set(key, chunks);
      }
      chunks.push(chunk);
    }
    
    for (const chunks of chunksByContent.values()) {
      if (chunks.length > 1) {
        const primary = chunks[0];
        
        for (let i = 1; i < chunks.length; i++) {
          this.mergeChunks(compilation, primary, chunks[i]);
        }
      }
    }
  }
  
  getChunkContentKey(compilation: Compilation, chunk: Chunk): string {
    const modules = compilation.chunkGraph.getChunkModules(chunk);
    return modules
      .map(m => m.identifier())
      .sort()
      .join('|');
  }
}
```

## 总结

Chunk 分割算法的核心要点：

**算法流程**：
1. 构建模块使用图
2. 识别分割候选
3. 评分与排序
4. 贪心分割
5. 后处理

**评分因素**：
- 节省字节数
- 优先级配置
- 模块聚合度
- 依赖深度

**分割策略**：
- 复用现有 Chunk
- 创建新 Chunk
- 模块移动

**后处理**：
- 清理空 Chunk
- 合并重复
- maxSize 限制

**下一章**：我们将学习 cacheGroups 配置解析。
