---
sidebar_position: 101
title: "SplitChunksPlugin 设计"
---

# SplitChunksPlugin 设计

SplitChunksPlugin 是 Webpack 内置的代码分割插件，通过智能分析模块依赖关系，自动提取公共代码，实现最优的打包策略。

## 设计目标

### 解决的问题

```
问题1：代码重复
多个入口都引用了 lodash，每个 bundle 都包含一份

问题2：缓存失效
业务代码改动导致第三方库也需要重新下载

问题3：请求过多
过度分割导致 HTTP 请求数过多

目标：
在代码体积、缓存效率、请求数之间找到最佳平衡
```

### 核心原则

```typescript
// SplitChunksPlugin 的核心原则
const principles = {
  // 1. 按需分割：只分割真正需要的代码
  splitOnDemand: true,
  
  // 2. 尺寸限制：太小的模块不值得单独分割
  respectSizeConstraints: true,
  
  // 3. 请求限制：避免过多并行请求
  limitParallelRequests: true,
  
  // 4. 缓存优化：提取稳定代码便于长期缓存
  optimizeCaching: true,
};
```

## 插件架构

### 核心结构

```typescript
class SplitChunksPlugin {
  private options: SplitChunksOptions;
  private cacheGroups: Map<string, CacheGroupConfig>;
  
  constructor(options: SplitChunksOptions = {}) {
    this.options = this.normalizeOptions(options);
    this.cacheGroups = this.buildCacheGroups(options.cacheGroups);
  }
  
  apply(compiler: Compiler): void {
    compiler.hooks.thisCompilation.tap(
      'SplitChunksPlugin',
      (compilation, { normalModuleFactory }) => {
        // 注册到 optimizeChunks 钩子
        compilation.hooks.optimizeChunks.tap(
          {
            name: 'SplitChunksPlugin',
            stage: STAGE_ADVANCED,
          },
          (chunks) => {
            this.optimize(compilation, chunks);
          }
        );
      }
    );
  }
}
```

### 配置规范化

```typescript
class SplitChunksPlugin {
  normalizeOptions(options: Partial<SplitChunksOptions>): SplitChunksOptions {
    const defaults: SplitChunksOptions = {
      chunks: 'async',
      minSize: 20000,
      minRemainingSize: 0,
      minChunks: 1,
      maxAsyncRequests: 30,
      maxInitialRequests: 30,
      enforceSizeThreshold: 50000,
      cacheGroups: {
        defaultVendors: {
          test: /[\\/]node_modules[\\/]/,
          priority: -10,
          reuseExistingChunk: true,
        },
        default: {
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true,
        },
      },
    };
    
    return {
      ...defaults,
      ...options,
      cacheGroups: {
        ...defaults.cacheGroups,
        ...options.cacheGroups,
      },
    };
  }
}
```

## 优化流程

### 主优化方法

```typescript
class SplitChunksPlugin {
  optimize(compilation: Compilation, chunks: Chunk[]): void {
    const chunkGraph = compilation.chunkGraph;
    
    // 第一步：收集模块信息
    const chunksInfoMap = this.collectChunksInfo(compilation);
    
    // 第二步：找出最佳分割点
    while (true) {
      const bestMatch = this.findBestMatch(chunksInfoMap);
      
      if (!bestMatch) break;
      
      // 第三步：执行分割
      this.performSplit(compilation, bestMatch);
      
      // 第四步：更新信息
      this.updateChunksInfo(chunksInfoMap, bestMatch);
    }
  }
}
```

### 收集 Chunk 信息

```typescript
interface ChunksInfo {
  modules: Set<Module>;
  chunks: Set<Chunk>;
  cacheGroup: CacheGroupConfig;
  cacheGroupKey: string;
  name: string | undefined;
  size: number;
}

class SplitChunksPlugin {
  collectChunksInfo(compilation: Compilation): Map<string, ChunksInfo> {
    const result = new Map<string, ChunksInfo>();
    const chunkGraph = compilation.chunkGraph;
    
    // 遍历所有模块
    for (const module of compilation.modules) {
      // 获取模块所在的 Chunk
      const chunks = chunkGraph.getModuleChunks(module);
      
      // 过滤符合条件的 Chunk
      const filteredChunks = this.filterChunks(chunks);
      
      if (filteredChunks.size < this.options.minChunks) {
        continue;
      }
      
      // 匹配 cacheGroups
      for (const [key, cacheGroup] of this.cacheGroups) {
        if (this.matchesCacheGroup(module, cacheGroup)) {
          this.addToChunksInfo(result, {
            module,
            chunks: filteredChunks,
            cacheGroup,
            cacheGroupKey: key,
          });
        }
      }
    }
    
    return result;
  }
}
```

### 找出最佳分割

```typescript
class SplitChunksPlugin {
  findBestMatch(chunksInfoMap: Map<string, ChunksInfo>): ChunksInfo | null {
    let bestMatch: ChunksInfo | null = null;
    let bestScore = 0;
    
    for (const info of chunksInfoMap.values()) {
      // 检查是否满足分割条件
      if (!this.checkSplitConditions(info)) {
        continue;
      }
      
      // 计算分割价值
      const score = this.calculateSplitScore(info);
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = info;
      }
    }
    
    return bestMatch;
  }
  
  calculateSplitScore(info: ChunksInfo): number {
    const { modules, chunks, cacheGroup } = info;
    
    // 基础分数：节省的字节数
    let score = info.size * (chunks.size - 1);
    
    // 权重：cacheGroup 优先级
    score += (cacheGroup.priority || 0) * 10000;
    
    // 惩罚：增加的请求数
    score -= chunks.size * 100;
    
    return score;
  }
}
```

## 分割条件检查

### 尺寸检查

```typescript
class SplitChunksPlugin {
  checkSizeConstraints(info: ChunksInfo): boolean {
    const { size, cacheGroup } = info;
    const minSize = cacheGroup.minSize ?? this.options.minSize;
    const maxSize = cacheGroup.maxSize ?? this.options.maxSize;
    
    // 检查最小尺寸
    if (size < minSize) {
      return false;
    }
    
    // maxSize 会在后续处理中进一步分割
    return true;
  }
  
  checkMinChunks(info: ChunksInfo): boolean {
    const { chunks, cacheGroup } = info;
    const minChunks = cacheGroup.minChunks ?? this.options.minChunks;
    
    return chunks.size >= minChunks;
  }
}
```

### 请求数检查

```typescript
class SplitChunksPlugin {
  checkRequestLimits(
    compilation: Compilation,
    info: ChunksInfo
  ): boolean {
    const { chunks } = info;
    
    for (const chunk of chunks) {
      if (chunk.canBeInitial()) {
        // 初始 Chunk：检查 maxInitialRequests
        const initialRequests = this.countInitialRequests(compilation, chunk);
        if (initialRequests >= this.options.maxInitialRequests) {
          return false;
        }
      } else {
        // 异步 Chunk：检查 maxAsyncRequests
        const asyncRequests = this.countAsyncRequests(compilation, chunk);
        if (asyncRequests >= this.options.maxAsyncRequests) {
          return false;
        }
      }
    }
    
    return true;
  }
  
  countInitialRequests(compilation: Compilation, chunk: Chunk): number {
    let count = 0;
    
    for (const group of chunk.groupsIterable) {
      if (group.isInitial()) {
        count = Math.max(count, group.chunks.length);
      }
    }
    
    return count;
  }
}
```

## 执行分割

### 创建新 Chunk

```typescript
class SplitChunksPlugin {
  performSplit(compilation: Compilation, info: ChunksInfo): Chunk {
    const { modules, chunks, cacheGroup, name } = info;
    const chunkGraph = compilation.chunkGraph;
    
    // 创建新 Chunk
    const newChunk = new Chunk(name);
    compilation.chunks.add(newChunk);
    
    if (name) {
      compilation.namedChunks.set(name, newChunk);
    }
    
    // 创建 ChunkGroup
    const chunkGroup = new ChunkGroup({
      name: cacheGroup.name,
    });
    chunkGroup.pushChunk(newChunk);
    newChunk.addGroup(chunkGroup);
    compilation.chunkGroups.push(chunkGroup);
    
    // 移动模块到新 Chunk
    for (const module of modules) {
      // 从原 Chunk 中移除
      for (const chunk of chunks) {
        chunkGraph.disconnectChunkAndModule(chunk, module);
      }
      
      // 添加到新 Chunk
      chunkGraph.connectChunkAndModule(newChunk, module);
    }
    
    // 建立依赖关系
    for (const chunk of chunks) {
      for (const group of chunk.groupsIterable) {
        group.addChild(chunkGroup);
      }
    }
    
    return newChunk;
  }
}
```

### 复用已存在的 Chunk

```typescript
class SplitChunksPlugin {
  tryReuseExistingChunk(
    compilation: Compilation,
    info: ChunksInfo
  ): Chunk | null {
    if (!info.cacheGroup.reuseExistingChunk) {
      return null;
    }
    
    const { modules, chunks } = info;
    
    // 查找只包含这些模块的现有 Chunk
    for (const chunk of chunks) {
      const chunkModules = compilation.chunkGraph.getChunkModules(chunk);
      
      // 检查是否完全匹配
      if (chunkModules.length === modules.size) {
        let allMatch = true;
        for (const module of chunkModules) {
          if (!modules.has(module)) {
            allMatch = false;
            break;
          }
        }
        
        if (allMatch) {
          return chunk;
        }
      }
    }
    
    return null;
  }
}
```

## maxSize 处理

### 大 Chunk 拆分

```typescript
class SplitChunksPlugin {
  enforceMaxSize(compilation: Compilation): void {
    const maxSize = this.options.maxSize;
    if (!maxSize) return;
    
    for (const chunk of compilation.chunks) {
      const chunkSize = compilation.chunkGraph.getChunkSize(chunk);
      
      if (chunkSize > maxSize) {
        this.splitOversizedChunk(compilation, chunk, maxSize);
      }
    }
  }
  
  splitOversizedChunk(
    compilation: Compilation,
    chunk: Chunk,
    maxSize: number
  ): void {
    const modules = compilation.chunkGraph.getChunkModules(chunk);
    
    // 按模块大小排序
    modules.sort((a, b) => b.size() - a.size());
    
    // 贪心分割
    const groups: Module[][] = [];
    let currentGroup: Module[] = [];
    let currentSize = 0;
    
    for (const module of modules) {
      const moduleSize = module.size();
      
      if (currentSize + moduleSize > maxSize && currentGroup.length > 0) {
        groups.push(currentGroup);
        currentGroup = [];
        currentSize = 0;
      }
      
      currentGroup.push(module);
      currentSize += moduleSize;
    }
    
    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }
    
    // 为每个组创建新 Chunk
    if (groups.length > 1) {
      this.createSplitChunks(compilation, chunk, groups);
    }
  }
}
```

## 总结

SplitChunksPlugin 设计的核心要点：

**设计目标**：
- 消除代码重复
- 优化缓存效率
- 控制请求数量

**优化流程**：
- 收集模块信息
- 匹配 cacheGroups
- 评估分割价值
- 执行最优分割

**条件检查**：
- 尺寸约束
- 请求数限制
- 共享次数

**分割执行**：
- 创建新 Chunk
- 移动模块
- 建立依赖
- 复用策略

**下一章**：我们将深入学习 Chunk 分割算法。
