---
sidebar_position: 106
title: "minSize/maxSize 限制策略"
---

# minSize/maxSize 限制策略

minSize 和 maxSize 是 SplitChunksPlugin 的核心配置，通过设置 Chunk 的尺寸边界，平衡代码分割的粒度和 HTTP 请求数。

## 配置概述

### 基本配置

```javascript
module.exports = {
  optimization: {
    splitChunks: {
      // 全局尺寸限制
      minSize: 20000,            // 20KB - 最小分割尺寸
      maxSize: 244000,           // 244KB - 最大 Chunk 尺寸
      
      // 按类型配置
      minSizeReduction: 20000,   // 分割后至少减少的尺寸
      
      cacheGroups: {
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          // cacheGroup 级别的尺寸配置会覆盖全局配置
          minSize: 30000,
          maxSize: 200000,
        },
      },
    },
  },
};
```

### 尺寸类型

```javascript
module.exports = {
  optimization: {
    splitChunks: {
      // 对象形式，按资源类型配置
      minSize: {
        javascript: 20000,
        style: 10000,
      },
      maxSize: {
        javascript: 200000,
        style: 50000,
      },
    },
  },
};
```

## minSize 策略

### 最小尺寸检查

```typescript
class SplitChunksPlugin {
  checkMinSize(
    candidate: SplitCandidate,
    config: CacheGroupConfig
  ): boolean {
    const minSize = this.getMinSize(config);
    
    // 计算候选模块的总大小
    let totalSize = 0;
    for (const module of candidate.modules) {
      totalSize += this.getModuleSize(module);
    }
    
    // 检查是否达到最小尺寸
    return totalSize >= minSize;
  }
  
  getMinSize(config: CacheGroupConfig): number {
    if (config.minSize !== undefined) {
      return config.minSize;
    }
    return this.options.minSize ?? 20000;
  }
  
  getModuleSize(module: Module): number {
    // 获取模块在指定类型下的大小
    const sizes = module.size();
    
    if (typeof sizes === 'number') {
      return sizes;
    }
    
    // 多类型大小，返回总和
    let total = 0;
    for (const size of Object.values(sizes)) {
      total += size;
    }
    return total;
  }
}
```

### 分割价值判断

```typescript
class SplitChunksPlugin {
  // 分割必须产生足够的价值
  isSplitWorthwhile(
    candidate: SplitCandidate,
    config: CacheGroupConfig
  ): boolean {
    const { modules, chunks, size } = candidate;
    
    // 检查最小尺寸
    if (size < this.getMinSize(config)) {
      return false;
    }
    
    // 检查最小尺寸减少
    const minSizeReduction = config.minSizeReduction ?? this.options.minSizeReduction;
    if (minSizeReduction) {
      // 分割后减少的大小 = size * (chunks.size - 1)
      const reduction = size * (chunks.size - 1);
      if (reduction < minSizeReduction) {
        return false;
      }
    }
    
    return true;
  }
}
```

### 强制分割阈值

```typescript
class SplitChunksPlugin {
  // 超过此阈值，忽略其他限制
  checkEnforceSizeThreshold(
    candidate: SplitCandidate,
    config: CacheGroupConfig
  ): boolean {
    const threshold = config.enforceSizeThreshold ?? 
      this.options.enforceSizeThreshold ?? 
      50000;
    
    return candidate.size >= threshold;
  }
  
  shouldSplit(candidate: SplitCandidate, config: CacheGroupConfig): boolean {
    // 强制分割优先
    if (this.checkEnforceSizeThreshold(candidate, config)) {
      return true;
    }
    
    // 常规检查
    return this.checkMinSize(candidate, config) &&
           this.isSplitWorthwhile(candidate, config);
  }
}
```

## maxSize 策略

### 大 Chunk 分割

```typescript
class SplitChunksPlugin {
  enforceMaxSize(compilation: Compilation): void {
    const maxSize = this.options.maxSize;
    if (!maxSize) return;
    
    for (const chunk of compilation.chunks) {
      const chunkSize = this.getChunkSize(compilation, chunk);
      
      if (chunkSize > maxSize) {
        this.splitOversizedChunk(compilation, chunk, maxSize);
      }
    }
  }
  
  getChunkSize(compilation: Compilation, chunk: Chunk): number {
    const modules = compilation.chunkGraph.getChunkModules(chunk);
    let size = 0;
    
    for (const module of modules) {
      size += this.getModuleSize(module);
    }
    
    return size;
  }
}
```

### 分割算法

```typescript
class SplitChunksPlugin {
  splitOversizedChunk(
    compilation: Compilation,
    chunk: Chunk,
    maxSize: number
  ): void {
    const modules = compilation.chunkGraph.getChunkModules(chunk);
    
    // 按大小排序（大模块优先处理）
    modules.sort((a, b) => this.getModuleSize(b) - this.getModuleSize(a));
    
    // 贪心分组
    const groups = this.greedyPartition(modules, maxSize);
    
    if (groups.length <= 1) {
      // 无法进一步分割
      return;
    }
    
    // 创建新 Chunk
    this.createPartitionedChunks(compilation, chunk, groups);
  }
  
  greedyPartition(modules: Module[], maxSize: number): Module[][] {
    const groups: Module[][] = [];
    let currentGroup: Module[] = [];
    let currentSize = 0;
    
    for (const module of modules) {
      const moduleSize = this.getModuleSize(module);
      
      // 如果单个模块超过 maxSize，单独成组
      if (moduleSize >= maxSize) {
        if (currentGroup.length > 0) {
          groups.push(currentGroup);
          currentGroup = [];
          currentSize = 0;
        }
        groups.push([module]);
        continue;
      }
      
      // 如果添加后超过限制，开始新组
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
    
    return groups;
  }
}
```

### 创建分割 Chunk

```typescript
class SplitChunksPlugin {
  createPartitionedChunks(
    compilation: Compilation,
    originalChunk: Chunk,
    groups: Module[][]
  ): void {
    const chunkGraph = compilation.chunkGraph;
    const baseName = originalChunk.name || 'chunk';
    
    // 保留第一组在原 Chunk
    const firstGroup = groups[0];
    const remainingModules = new Set(
      chunkGraph.getChunkModules(originalChunk)
    );
    
    for (const module of firstGroup) {
      remainingModules.delete(module);
    }
    
    // 从原 Chunk 移除其他模块
    for (const module of remainingModules) {
      chunkGraph.disconnectChunkAndModule(originalChunk, module);
    }
    
    // 为其他组创建新 Chunk
    for (let i = 1; i < groups.length; i++) {
      const group = groups[i];
      const newChunk = new Chunk(`${baseName}~${i}`);
      
      compilation.chunks.add(newChunk);
      
      // 复制 ChunkGroup 关系
      for (const chunkGroup of originalChunk.groupsIterable) {
        chunkGroup.insertChunk(newChunk, originalChunk);
        newChunk.addGroup(chunkGroup);
      }
      
      // 添加模块
      for (const module of group) {
        chunkGraph.connectChunkAndModule(newChunk, module);
      }
    }
  }
}
```

## 自动命名

### maxSize 分割命名

```typescript
class SplitChunksPlugin {
  generatePartitionName(
    originalChunk: Chunk,
    partitionIndex: number,
    modules: Module[]
  ): string {
    const baseName = originalChunk.name || 'chunk';
    const delimiter = this.options.automaticNameDelimiter || '~';
    
    // 基于模块内容生成哈希
    const contentHash = this.generateContentHash(modules);
    
    return `${baseName}${delimiter}${contentHash.slice(0, 4)}`;
  }
  
  generateContentHash(modules: Module[]): string {
    const hash = createHash('md4');
    
    for (const module of modules) {
      hash.update(module.identifier());
    }
    
    return hash.digest('hex');
  }
}
```

### 保持名称稳定性

```typescript
class SplitChunksPlugin {
  // 确保相同内容生成相同的 Chunk 名称
  getStableChunkName(
    modules: Set<Module>,
    cacheGroup: CacheGroupConfig
  ): string {
    // 收集模块标识
    const identifiers = Array.from(modules)
      .map(m => m.identifier())
      .sort();
    
    // 生成稳定哈希
    const hash = createHash('md4');
    hash.update(cacheGroup.name || 'default');
    for (const id of identifiers) {
      hash.update(id);
    }
    
    const hashDigest = hash.digest('hex').slice(0, 8);
    const prefix = cacheGroup.idHint || cacheGroup.name || 'chunk';
    
    return `${prefix}-${hashDigest}`;
  }
}
```

## 尺寸计算

### 模块尺寸

```typescript
class Module {
  // 获取模块大小
  size(type?: string): number | Record<string, number> {
    if (type) {
      return this._sizes.get(type) || 0;
    }
    
    // 返回所有类型的大小
    const result: Record<string, number> = {};
    for (const [t, size] of this._sizes) {
      result[t] = size;
    }
    return result;
  }
  
  // 更新模块大小
  updateSize(): void {
    // 根据生成的代码计算大小
    const source = this.originalSource();
    if (source) {
      this._sizes.set('javascript', source.size());
    }
  }
}
```

### Chunk 尺寸

```typescript
class ChunkGraph {
  getChunkSize(
    chunk: Chunk,
    options?: ChunkSizeOptions
  ): number {
    let size = 0;
    
    // 模块大小
    const modules = this.getChunkModules(chunk);
    for (const module of modules) {
      size += this.getModuleSize(module, options?.sizeType);
    }
    
    // Chunk 开销
    if (options?.chunkOverhead) {
      size += options.chunkOverhead;
    }
    
    // 入口开销
    if (options?.entryChunkMultiplicator) {
      const entryModules = this.getNumberOfEntryModules(chunk);
      if (entryModules > 0) {
        size = Math.ceil(size * options.entryChunkMultiplicator);
      }
    }
    
    return size;
  }
}
```

## 策略权衡

### 尺寸与请求数

```
小 minSize（5KB）：
├── 优点：更细粒度的缓存
├── 缺点：更多 HTTP 请求
└── 适用：HTTP/2 环境

大 minSize（50KB）：
├── 优点：减少请求数
├── 缺点：缓存粒度粗
└── 适用：HTTP/1.1 环境

小 maxSize（100KB）：
├── 优点：并行加载更快
├── 缺点：更多文件管理
└── 适用：高带宽环境

大 maxSize（500KB）：
├── 优点：减少文件数
├── 缺点：单个文件加载慢
└── 适用：低带宽环境
```

### 推荐配置

```javascript
// 现代 Web 应用推荐配置
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      minSize: 20000,              // 20KB
      maxSize: 244000,             // 244KB
      minRemainingSize: 0,
      minChunks: 1,
      maxAsyncRequests: 30,
      maxInitialRequests: 30,
      enforceSizeThreshold: 50000, // 50KB
      
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
    },
  },
};
```

## 总结

minSize/maxSize 限制策略的核心要点：

**minSize 作用**：
- 防止过度分割
- 确保分割价值
- 支持强制阈值

**maxSize 作用**：
- 限制 Chunk 大小
- 自动拆分大 Chunk
- 优化并行加载

**分割算法**：
- 贪心分组
- 按大小排序
- 保持名称稳定

**尺寸计算**：
- 模块大小
- Chunk 开销
- 入口系数

**权衡考虑**：
- 请求数 vs 缓存粒度
- 网络环境适配
- HTTP 版本影响

**下一章**：我们将进入优化阶段，学习优化阶段概述。
