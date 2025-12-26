---
sidebar_position: 107
title: "优化阶段概述"
---

# 优化阶段概述

优化阶段是 Webpack 构建流程中提升打包质量的关键环节，通过 Tree Shaking、Scope Hoisting 等技术减少代码体积，提升运行性能。

## 优化阶段定位

### 构建流程中的位置

```
Webpack 构建流程：

make 阶段 ──────→ seal 阶段 ──────→ emit 阶段
(模块构建)        (优化处理)         (资源输出)
                      │
                      ├── 优化依赖
                      ├── 优化模块
                      ├── 优化 Chunk
                      ├── 优化模块树
                      └── 优化 Chunk 树
```

### 优化目标

```
优化前：
├── 未使用的代码（Dead Code）
├── 重复的模块
├── 过多的作用域
├── 未压缩的代码

优化后：
├── 移除未使用代码（Tree Shaking）
├── 合并重复模块
├── 提升作用域（Scope Hoisting）
├── 压缩代码（Terser）
```

## 优化钩子体系

### 钩子执行顺序

```typescript
class Compilation {
  seal(callback: Callback): void {
    // 1. 优化依赖
    this.hooks.optimizeDependencies.call(this.modules);
    this.hooks.afterOptimizeDependencies.call(this.modules);
    
    // 构建 Chunk 图...
    
    // 2. 通用优化
    this.hooks.optimize.call();
    
    // 3. 优化模块
    while (this.hooks.optimizeModules.call(this.modules)) {}
    this.hooks.afterOptimizeModules.call(this.modules);
    
    // 4. 优化 Chunk
    while (this.hooks.optimizeChunks.call(this.chunks, this.chunkGroups)) {}
    this.hooks.afterOptimizeChunks.call(this.chunks, this.chunkGroups);
    
    // 5. 优化模块树
    this.hooks.optimizeTree.callAsync(this.chunks, this.modules, (err) => {
      if (err) return callback(err);
      
      this.hooks.afterOptimizeTree.call(this.chunks, this.modules);
      
      // 6. 优化 Chunk 模块
      while (this.hooks.optimizeChunkModules.call(this.chunks, this.modules)) {}
      this.hooks.afterOptimizeChunkModules.call(this.chunks, this.modules);
      
      // 继续后续处理...
    });
  }
}
```

### 钩子定义

```typescript
class Compilation {
  hooks = {
    // 依赖优化
    optimizeDependencies: new SyncBailHook<[Iterable<Module>]>(['modules']),
    afterOptimizeDependencies: new SyncHook<[Iterable<Module>]>(['modules']),
    
    // 通用优化入口
    optimize: new SyncHook([]),
    
    // 模块优化
    optimizeModules: new SyncBailHook<[Iterable<Module>]>(['modules']),
    afterOptimizeModules: new SyncHook<[Iterable<Module>]>(['modules']),
    
    // Chunk 优化
    optimizeChunks: new SyncBailHook<[Iterable<Chunk>, Iterable<ChunkGroup>]>(['chunks', 'chunkGroups']),
    afterOptimizeChunks: new SyncHook<[Iterable<Chunk>, Iterable<ChunkGroup>]>(['chunks', 'chunkGroups']),
    
    // 树优化（异步）
    optimizeTree: new AsyncSeriesHook<[Iterable<Chunk>, Iterable<Module>]>(['chunks', 'modules']),
    afterOptimizeTree: new SyncHook<[Iterable<Chunk>, Iterable<Module>]>(['chunks', 'modules']),
    
    // Chunk 模块优化
    optimizeChunkModules: new SyncBailHook<[Iterable<Chunk>, Iterable<Module>]>(['chunks', 'modules']),
    afterOptimizeChunkModules: new SyncHook<[Iterable<Chunk>, Iterable<Module>]>(['chunks', 'modules']),
  };
}
```

## 优化插件体系

### 内置优化插件

```typescript
// Webpack 内置的优化插件
const optimizationPlugins = {
  // Tree Shaking 相关
  FlagDependencyExportsPlugin,      // 标记导出
  FlagDependencyUsagePlugin,        // 标记使用
  SideEffectsFlagPlugin,            // 处理 sideEffects
  
  // 模块优化
  ModuleConcatenationPlugin,        // Scope Hoisting
  
  // Chunk 优化
  SplitChunksPlugin,                // 代码分割
  RuntimeChunkPlugin,               // 运行时分离
  
  // ID 优化
  ModuleIdPlugin,                   // 模块 ID 优化
  ChunkIdPlugin,                    // Chunk ID 优化
  
  // 代码压缩
  TerserPlugin,                     // JS 压缩
};
```

### 插件注册位置

```typescript
class WebpackOptionsApply {
  process(options: WebpackOptions, compiler: Compiler): void {
    // 开发模式优化
    if (options.mode === 'development') {
      new ModuleIdPlugin({ type: 'named' }).apply(compiler);
    }
    
    // 生产模式优化
    if (options.mode === 'production') {
      // Tree Shaking
      new FlagDependencyExportsPlugin().apply(compiler);
      new FlagDependencyUsagePlugin(true).apply(compiler);
      new SideEffectsFlagPlugin().apply(compiler);
      
      // Scope Hoisting
      if (options.optimization.concatenateModules) {
        new ModuleConcatenationPlugin().apply(compiler);
      }
      
      // 代码压缩
      if (options.optimization.minimize) {
        for (const minimizer of options.optimization.minimizer) {
          minimizer.apply(compiler);
        }
      }
    }
  }
}
```

## 优化配置

### optimization 配置项

```javascript
module.exports = {
  optimization: {
    // 模块优化
    concatenateModules: true,       // Scope Hoisting
    usedExports: true,              // 标记使用的导出
    sideEffects: true,              // 处理 sideEffects
    
    // Chunk 优化
    splitChunks: { /* ... */ },     // 代码分割
    runtimeChunk: 'single',         // 运行时分离
    
    // ID 优化
    moduleIds: 'deterministic',     // 确定性模块 ID
    chunkIds: 'deterministic',      // 确定性 Chunk ID
    
    // 代码压缩
    minimize: true,                 // 启用压缩
    minimizer: [/* ... */],         // 压缩器
    
    // 其他
    removeAvailableModules: true,   // 移除可用模块
    removeEmptyChunks: true,        // 移除空 Chunk
    mergeDuplicateChunks: true,     // 合并重复 Chunk
  },
};
```

### 按模式默认配置

```typescript
class WebpackOptionsDefaulter {
  applyOptimizationDefaults(
    optimization: OptimizationOptions,
    mode: Mode
  ): void {
    const production = mode === 'production';
    const development = mode === 'development';
    
    // 默认值
    optimization.minimize = production;
    optimization.concatenateModules = production;
    optimization.usedExports = production;
    optimization.sideEffects = production;
    
    optimization.moduleIds = production ? 'deterministic' : 'named';
    optimization.chunkIds = production ? 'deterministic' : 'named';
    
    optimization.removeAvailableModules = production;
    optimization.removeEmptyChunks = true;
    optimization.mergeDuplicateChunks = true;
  }
}
```

## 优化阶段实现

### 模块优化

```typescript
class Compilation {
  optimizeModules(): void {
    // 移除未使用的模块
    this.removeUnusedModules();
    
    // 合并可合并的模块（Scope Hoisting）
    if (this.options.optimization.concatenateModules) {
      this.concatenateModules();
    }
  }
  
  removeUnusedModules(): void {
    const usedModules = new Set<Module>();
    
    // 从入口模块开始遍历
    for (const entrypoint of this.entrypoints.values()) {
      const chunk = entrypoint.getEntrypointChunk();
      const entryModules = this.chunkGraph.getChunkEntryModulesIterable(chunk);
      
      for (const module of entryModules) {
        this.collectUsedModules(module, usedModules);
      }
    }
    
    // 移除未使用的模块
    for (const module of this.modules) {
      if (!usedModules.has(module)) {
        this.modules.delete(module);
      }
    }
  }
}
```

### Chunk 优化

```typescript
class Compilation {
  optimizeChunks(): void {
    // 移除空 Chunk
    this.removeEmptyChunks();
    
    // 合并重复 Chunk
    this.mergeDuplicateChunks();
    
    // 移除可用模块
    this.removeAvailableModules();
  }
  
  removeEmptyChunks(): void {
    for (const chunk of this.chunks) {
      if (this.chunkGraph.getNumberOfChunkModules(chunk) === 0 &&
          !chunk.hasRuntime()) {
        // 从所有 ChunkGroup 中移除
        for (const group of chunk.groupsIterable) {
          group.removeChunk(chunk);
        }
        this.chunks.delete(chunk);
      }
    }
  }
  
  mergeDuplicateChunks(): void {
    const chunksByContent = new Map<string, Chunk>();
    
    for (const chunk of this.chunks) {
      const key = this.getChunkContentKey(chunk);
      const existing = chunksByContent.get(key);
      
      if (existing) {
        this.mergeChunks(existing, chunk);
      } else {
        chunksByContent.set(key, chunk);
      }
    }
  }
}
```

## 优化效果度量

### 统计信息收集

```typescript
class Compilation {
  getOptimizationStats(): OptimizationStats {
    return {
      // Tree Shaking 效果
      usedExports: this.getUsedExportsStats(),
      sideEffects: this.getSideEffectsStats(),
      
      // Scope Hoisting 效果
      concatenatedModules: this.getConcatenatedModulesStats(),
      
      // Chunk 优化效果
      removedChunks: this.removedChunksCount,
      mergedChunks: this.mergedChunksCount,
    };
  }
  
  getUsedExportsStats(): UsedExportsStats {
    let totalExports = 0;
    let usedExports = 0;
    
    for (const module of this.modules) {
      const exports = this.moduleGraph.getExportsInfo(module);
      totalExports += exports.getTotalCount();
      usedExports += exports.getUsedCount();
    }
    
    return {
      total: totalExports,
      used: usedExports,
      unused: totalExports - usedExports,
      reductionRatio: (totalExports - usedExports) / totalExports,
    };
  }
}
```

### 优化报告

```typescript
class StatsPlugin {
  generateOptimizationReport(compilation: Compilation): string {
    const stats = compilation.getOptimizationStats();
    
    return `
优化报告：
═══════════════════════════════════
Tree Shaking:
  - 总导出: ${stats.usedExports.total}
  - 使用的导出: ${stats.usedExports.used}
  - 移除的导出: ${stats.usedExports.unused}
  - 减少比例: ${(stats.usedExports.reductionRatio * 100).toFixed(1)}%

Scope Hoisting:
  - 合并的模块: ${stats.concatenatedModules.merged}
  - 根模块数: ${stats.concatenatedModules.roots}

Chunk 优化:
  - 移除的 Chunk: ${stats.removedChunks}
  - 合并的 Chunk: ${stats.mergedChunks}
═══════════════════════════════════
    `;
  }
}
```

## 总结

优化阶段概述的核心要点：

**阶段定位**：
- seal 阶段的核心部分
- 提升打包质量
- 减少代码体积

**优化钩子**：
- 依赖优化
- 模块优化
- Chunk 优化
- 树优化

**内置插件**：
- Tree Shaking 插件
- Scope Hoisting 插件
- 代码分割插件
- 压缩插件

**配置方式**：
- optimization 配置项
- 按模式默认配置

**效果度量**：
- 统计信息收集
- 优化报告生成

**下一章**：我们将深入学习 optimizeModules 模块优化。
