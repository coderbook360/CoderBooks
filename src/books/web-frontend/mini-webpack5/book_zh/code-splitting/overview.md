---
sidebar_position: 100
title: "代码分割原理概述"
---

# 代码分割原理概述

代码分割是 Webpack 最重要的优化特性之一，通过将代码拆分成多个 Chunk，实现按需加载和并行加载，显著提升应用性能。

## 为什么需要代码分割

### 单一打包的问题

```
所有代码打包成一个文件：

bundle.js (2MB)
├── 入口代码 (100KB)
├── React (150KB)
├── Lodash (80KB)
├── 业务代码 (500KB)
├── 管理后台 (800KB)     ← 普通用户永远不会访问
└── 其他依赖 (370KB)

问题：
1. 首屏加载时间长
2. 用户下载了不需要的代码
3. 任何改动都会使整个缓存失效
```

### 代码分割的目标

```
代码分割后：

main.js (200KB)          ← 首屏必需
├── 入口代码
└── 核心业务

vendor.js (300KB)        ← 长期缓存
├── React
└── Lodash

admin.js (800KB)         ← 按需加载
└── 管理后台

lazy-feature.js (100KB)  ← 懒加载
└── 特定功能

优势：
1. 首屏只加载必要代码
2. 第三方库独立缓存
3. 按需加载非首屏代码
```

## 分割策略

### 三种分割方式

```typescript
// 1. 入口分割 - 配置多个入口
module.exports = {
  entry: {
    main: './src/index.js',
    admin: './src/admin.js',
  },
};

// 2. 动态导入 - 运行时按需加载
const loadFeature = () => import('./feature');

// 3. SplitChunksPlugin - 自动提取公共代码
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
    },
  },
};
```

### 策略对比

```
入口分割：
├── 简单直接
├── 需要手动配置
└── 适合明确的页面分离

动态导入：
├── 灵活控制加载时机
├── 自动创建异步 Chunk
└── 适合功能模块按需加载

SplitChunksPlugin：
├── 自动分析依赖
├── 智能提取公共代码
└── 适合优化缓存和减少重复
```

## 核心概念

### Initial Chunk 与 Async Chunk

```typescript
// Initial Chunk - 页面加载时必须加载
// 入口模块及其同步依赖形成 Initial Chunk

// Async Chunk - 运行时按需加载
// 动态导入的模块形成 Async Chunk

class Chunk {
  // 是否可以作为初始 Chunk
  canBeInitial(): boolean {
    for (const group of this.groupsIterable) {
      if (group.isInitial()) return true;
    }
    return false;
  }
  
  // 是否只能作为初始 Chunk
  isOnlyInitial(): boolean {
    for (const group of this.groupsIterable) {
      if (!group.isInitial()) return false;
    }
    return true;
  }
}
```

### Chunk 拆分条件

```typescript
interface SplitChunksOptions {
  // 哪些 Chunk 参与分割
  chunks: 'all' | 'async' | 'initial' | ((chunk: Chunk) => boolean);
  
  // 最小尺寸限制
  minSize: number;
  
  // 最大尺寸限制
  maxSize: number;
  
  // 最少被多少 Chunk 共享
  minChunks: number;
  
  // 最大异步请求数
  maxAsyncRequests: number;
  
  // 最大初始请求数
  maxInitialRequests: number;
}
```

## 分割流程

### 整体流程

```
模块依赖图 ──→ 初始 Chunk 创建 ──→ 分析共享模块
                    │
                    ▼
              应用分割规则
                    │
                    ▼
              创建新 Chunk ──→ 移动模块 ──→ 建立依赖关系
                                              │
                                              ▼
                                        优化 Chunk 图
```

### 流程实现

```typescript
class SplitChunksPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.thisCompilation.tap('SplitChunksPlugin', (compilation) => {
      compilation.hooks.optimizeChunks.tap(
        'SplitChunksPlugin',
        (chunks) => {
          // 1. 收集模块使用信息
          const moduleUsageInfo = this.collectModuleUsage(compilation);
          
          // 2. 查找可分割的模块组
          const splitPoints = this.findSplitPoints(moduleUsageInfo);
          
          // 3. 应用分割规则
          for (const point of splitPoints) {
            if (this.shouldSplit(point)) {
              this.performSplit(compilation, point);
            }
          }
          
          // 4. 清理空 Chunk
          this.removeEmptyChunks(compilation);
        }
      );
    });
  }
}
```

## 模块复用分析

### 收集共享信息

```typescript
class SplitChunksPlugin {
  collectModuleUsage(compilation: Compilation): ModuleUsageMap {
    const usage = new Map<Module, Set<Chunk>>();
    
    for (const chunk of compilation.chunks) {
      const modules = compilation.chunkGraph.getChunkModules(chunk);
      
      for (const module of modules) {
        let chunks = usage.get(module);
        if (!chunks) {
          chunks = new Set();
          usage.set(module, chunks);
        }
        chunks.add(chunk);
      }
    }
    
    return usage;
  }
  
  // 查找被多个 Chunk 共享的模块
  findSharedModules(usage: ModuleUsageMap, minChunks: number): Module[] {
    const shared: Module[] = [];
    
    for (const [module, chunks] of usage) {
      if (chunks.size >= minChunks) {
        shared.push(module);
      }
    }
    
    return shared;
  }
}
```

### 分组策略

```typescript
class SplitChunksPlugin {
  // 根据 cacheGroups 对模块进行分组
  groupModulesByCacheGroups(
    modules: Module[],
    cacheGroups: CacheGroupOptions[]
  ): Map<string, Module[]> {
    const groups = new Map<string, Module[]>();
    
    for (const module of modules) {
      const matchingGroup = this.findMatchingCacheGroup(module, cacheGroups);
      
      if (matchingGroup) {
        let groupModules = groups.get(matchingGroup.name);
        if (!groupModules) {
          groupModules = [];
          groups.set(matchingGroup.name, groupModules);
        }
        groupModules.push(module);
      }
    }
    
    return groups;
  }
  
  findMatchingCacheGroup(
    module: Module,
    cacheGroups: CacheGroupOptions[]
  ): CacheGroupOptions | null {
    // 按优先级排序
    const sorted = [...cacheGroups].sort((a, b) => 
      (b.priority || 0) - (a.priority || 0)
    );
    
    for (const group of sorted) {
      if (this.matchesCacheGroup(module, group)) {
        return group;
      }
    }
    
    return null;
  }
}
```

## 运行时支持

### 异步加载机制

```javascript
// Webpack 生成的异步加载代码
__webpack_require__.e = function(chunkId) {
  return Promise.all(
    Object.keys(__webpack_require__.f).reduce((promises, key) => {
      __webpack_require__.f[key](chunkId, promises);
      return promises;
    }, [])
  );
};

// JSONP 加载
__webpack_require__.f.j = function(chunkId, promises) {
  var installedChunkData = installedChunks[chunkId];
  
  if (installedChunkData !== 0) {
    if (installedChunkData) {
      promises.push(installedChunkData[2]);
    } else {
      var promise = new Promise((resolve, reject) => {
        installedChunkData = installedChunks[chunkId] = [resolve, reject];
      });
      promises.push(installedChunkData[2] = promise);
      
      // 创建 script 标签
      var script = document.createElement('script');
      script.src = __webpack_require__.p + chunkId + '.js';
      document.head.appendChild(script);
    }
  }
};
```

### Chunk 加载追踪

```typescript
class ChunkLoadingRuntimeModule extends RuntimeModule {
  generate(): string {
    const { chunkGraph, chunk } = this;
    
    // 获取需要加载的 Chunk 映射
    const chunkMap = this.getChunkMap();
    
    return Template.asString([
      '// 已安装的 Chunks',
      `var installedChunks = ${JSON.stringify(this.getInstalledChunks())};`,
      '',
      '// Chunk 加载函数',
      '__webpack_require__.e = function(chunkId) {',
      Template.indent([
        'return new Promise((resolve, reject) => {',
        Template.indent([
          'if (installedChunks[chunkId]) {',
          Template.indent('return resolve();'),
          '}',
          '// 动态加载 Chunk',
          'loadChunk(chunkId, resolve, reject);',
        ]),
        '});',
      ]),
      '};',
    ]);
  }
}
```

## 总结

代码分割原理的核心要点：

**分割目标**：
- 减少首屏加载
- 提升缓存效率
- 按需加载代码

**三种方式**：
- 入口分割
- 动态导入
- SplitChunksPlugin

**核心概念**：
- Initial/Async Chunk
- 共享模块分析
- 分组策略

**运行时支持**：
- 异步加载机制
- Chunk 状态追踪

**下一章**：我们将深入学习 SplitChunksPlugin 设计。
