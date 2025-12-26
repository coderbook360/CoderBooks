---
sidebar_position: 136
title: "Compilation Hooks 详解"
---

# Compilation Hooks 详解

Compilation 对象代表一次编译过程，提供了更细粒度的钩子来处理模块、Chunk 和资源。本章详细解析 Compilation Hooks。

## 模块构建钩子

### buildModule

```typescript
// 模块开始构建
compilation.hooks.buildModule.tap('MyPlugin', (module) => {
  console.log('Building:', module.identifier());
  
  // 记录开始时间
  module.buildInfo = module.buildInfo || {};
  module.buildInfo.startTime = Date.now();
});
```

### succeedModule

```typescript
// 模块构建成功
compilation.hooks.succeedModule.tap('MyPlugin', (module) => {
  const duration = Date.now() - (module.buildInfo?.startTime || 0);
  
  console.log(`Built: ${module.identifier()} (${duration}ms)`);
  
  // 收集构建信息
  if (duration > 1000) {
    console.warn(`Slow module: ${module.resource}`);
  }
});
```

### failedModule

```typescript
// 模块构建失败
compilation.hooks.failedModule.tap('MyPlugin', (module, error) => {
  console.error(`Failed to build: ${module.identifier()}`);
  console.error(`Error: ${error.message}`);
  
  // 记录失败模块
  this.failedModules.push({
    module: module.resource,
    error: error.message,
  });
});
```

### stillValidModule

```typescript
// 缓存中的模块仍然有效
compilation.hooks.stillValidModule.tap('MyPlugin', (module) => {
  console.log(`Cache hit: ${module.identifier()}`);
});
```

## 依赖处理钩子

### addEntry

```typescript
// 添加入口点
compilation.hooks.addEntry.tap('MyPlugin', (entry, options) => {
  console.log('Adding entry:', options.name);
  console.log('Dependency:', entry.request);
});
```

### succeedEntry

```typescript
// 入口处理成功
compilation.hooks.succeedEntry.tap('MyPlugin', (entry, options, module) => {
  console.log(`Entry "${options.name}" resolved to: ${module.resource}`);
});
```

### failedEntry

```typescript
// 入口处理失败
compilation.hooks.failedEntry.tap('MyPlugin', (entry, options, error) => {
  console.error(`Failed to process entry "${options.name}":`, error.message);
});
```

## Chunk 处理钩子

### optimizeChunks

```typescript
// 优化 Chunks
compilation.hooks.optimizeChunks.tap('MyPlugin', (chunks) => {
  for (const chunk of chunks) {
    console.log(`Chunk: ${chunk.name || chunk.id}`);
    console.log(`  Modules: ${compilation.chunkGraph.getNumberOfChunkModules(chunk)}`);
  }
  
  // 返回 true 表示需要再次优化
  return false;
});
```

### optimizeChunkModules

```typescript
// 优化 Chunk 中的模块
compilation.hooks.optimizeChunkModules.tap('MyPlugin', (chunks, modules) => {
  for (const chunk of chunks) {
    const chunkModules = compilation.chunkGraph.getChunkModules(chunk);
    
    console.log(`Chunk ${chunk.name}:`, chunkModules.length, 'modules');
  }
});
```

### afterOptimizeChunks

```typescript
// Chunk 优化完成后
compilation.hooks.afterOptimizeChunks.tap('MyPlugin', (chunks) => {
  console.log(`Optimization complete: ${chunks.length} chunks`);
});
```

## 模块优化钩子

### optimizeModules

```typescript
// 优化模块
compilation.hooks.optimizeModules.tap('MyPlugin', (modules) => {
  console.log(`Optimizing ${modules.length} modules`);
  
  for (const module of modules) {
    // 标记未使用的导出
    if (this.isUnused(module)) {
      module.buildMeta.sideEffectFree = true;
    }
  }
});
```

### afterOptimizeModules

```typescript
// 模块优化完成后
compilation.hooks.afterOptimizeModules.tap('MyPlugin', (modules) => {
  const usedCount = Array.from(modules).filter(m => 
    compilation.moduleGraph.getUsedExports(m)
  ).length;
  
  console.log(`Used modules: ${usedCount}/${modules.length}`);
});
```

### optimizeTree

```typescript
// 优化依赖树
compilation.hooks.optimizeTree.tapAsync(
  'MyPlugin',
  async (chunks, modules, callback) => {
    // Tree Shaking 逻辑
    for (const module of modules) {
      const usedExports = compilation.moduleGraph.getUsedExports(module);
      
      if (usedExports === false) {
        // 模块完全未使用
        compilation.moduleGraph.setUsedExports(module, new Set());
      }
    }
    
    callback();
  }
);
```

## 资源处理钩子

### processAssets

```typescript
// 处理资源（多阶段钩子）
compilation.hooks.processAssets.tap(
  {
    name: 'MyPlugin',
    stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
  },
  (assets) => {
    // 添加额外资源
    compilation.emitAsset(
      'extra.txt',
      new RawSource('Extra content')
    );
  }
);

// 优化阶段
compilation.hooks.processAssets.tap(
  {
    name: 'MyPlugin',
    stage: Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE,
  },
  (assets) => {
    // 优化资源
    for (const [name, source] of Object.entries(assets)) {
      if (name.endsWith('.css')) {
        const optimized = this.optimizeCss(source.source());
        compilation.updateAsset(name, new RawSource(optimized));
      }
    }
  }
);

// 处理阶段
compilation.hooks.processAssets.tap(
  {
    name: 'MyPlugin',
    stage: Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE,
  },
  (assets) => {
    // 生成摘要
    const summary = this.generateSummary(assets);
    compilation.emitAsset('summary.json', new RawSource(summary));
  }
);
```

### processAssets 阶段常量

```typescript
// 资源处理阶段（按顺序）
const STAGES = {
  // 添加额外资源
  PROCESS_ASSETS_STAGE_ADDITIONAL: -2000,
  
  // 预处理
  PROCESS_ASSETS_STAGE_PRE_PROCESS: -1000,
  
  // 派生资源
  PROCESS_ASSETS_STAGE_DERIVED: -200,
  
  // 添加内容
  PROCESS_ASSETS_STAGE_ADDITIONS: -100,
  
  // 默认阶段
  PROCESS_ASSETS_STAGE_NONE: 0,
  
  // 优化
  PROCESS_ASSETS_STAGE_OPTIMIZE: 100,
  
  // 优化数量
  PROCESS_ASSETS_STAGE_OPTIMIZE_COUNT: 200,
  
  // 优化兼容性
  PROCESS_ASSETS_STAGE_OPTIMIZE_COMPATIBILITY: 300,
  
  // 优化大小
  PROCESS_ASSETS_STAGE_OPTIMIZE_SIZE: 400,
  
  // 开发工具（Source Map）
  PROCESS_ASSETS_STAGE_DEV_TOOLING: 500,
  
  // 优化内联
  PROCESS_ASSETS_STAGE_OPTIMIZE_INLINE: 700,
  
  // 汇总
  PROCESS_ASSETS_STAGE_SUMMARIZE: 1000,
  
  // 优化 Hash
  PROCESS_ASSETS_STAGE_OPTIMIZE_HASH: 2500,
  
  // 优化传输
  PROCESS_ASSETS_STAGE_OPTIMIZE_TRANSFER: 3000,
  
  // 分析
  PROCESS_ASSETS_STAGE_ANALYSE: 4000,
  
  // 报告
  PROCESS_ASSETS_STAGE_REPORT: 5000,
};
```

### afterProcessAssets

```typescript
// 资源处理完成后
compilation.hooks.afterProcessAssets.tap('MyPlugin', (assets) => {
  console.log('Final assets:');
  
  for (const [name, source] of Object.entries(assets)) {
    console.log(`  ${name}: ${source.size()} bytes`);
  }
});
```

## Seal 阶段钩子

### seal

```typescript
// 开始封装
compilation.hooks.seal.tap('MyPlugin', () => {
  console.log('Sealing compilation');
  console.log(`Modules: ${compilation.modules.size}`);
  console.log(`Chunks: ${compilation.chunks.size}`);
});
```

### afterSeal

```typescript
// 封装完成
compilation.hooks.afterSeal.tapAsync('MyPlugin', (callback) => {
  console.log('Compilation sealed');
  
  // 最后的处理
  this.postProcess(compilation)
    .then(() => callback())
    .catch(callback);
});
```

### needAdditionalSeal

```typescript
// 检查是否需要重新封装
compilation.hooks.needAdditionalSeal.tap('MyPlugin', () => {
  if (this.needsReseal) {
    return true;
  }
  return undefined;
});
```

## Hash 计算钩子

### beforeHash

```typescript
// Hash 计算前
compilation.hooks.beforeHash.tap('MyPlugin', () => {
  console.log('Starting hash calculation');
});
```

### afterHash

```typescript
// Hash 计算后
compilation.hooks.afterHash.tap('MyPlugin', () => {
  console.log('Compilation hash:', compilation.hash);
  console.log('Full hash:', compilation.fullHash);
});
```

### chunkHash

```typescript
// 单个 Chunk 的 Hash 计算
compilation.hooks.chunkHash.tap('MyPlugin', (chunk, hash) => {
  // 添加自定义数据到 hash
  hash.update(`chunk-${chunk.name}-${Date.now()}`);
});
```

### contentHash

```typescript
// 内容 Hash 计算
compilation.hooks.contentHash.tap('MyPlugin', (chunk) => {
  // 可以修改 chunk 的 contentHash
});
```

## 记录钩子

### recordModules

```typescript
// 记录模块信息
compilation.hooks.recordModules.tap('MyPlugin', (modules, records) => {
  records.modules = {};
  
  for (const module of modules) {
    records.modules[module.identifier()] = {
      id: module.id,
      hash: module.hash,
    };
  }
});
```

### recordChunks

```typescript
// 记录 Chunk 信息
compilation.hooks.recordChunks.tap('MyPlugin', (chunks, records) => {
  records.chunks = {};
  
  for (const chunk of chunks) {
    records.chunks[chunk.id] = {
      name: chunk.name,
      files: Array.from(chunk.files),
    };
  }
});
```

## 实用示例

### 资源大小检查

```typescript
class AssetSizePlugin {
  constructor(private maxSize: number = 250 * 1024) {}
  
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap('AssetSizePlugin', (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: 'AssetSizePlugin',
          stage: Compilation.PROCESS_ASSETS_STAGE_REPORT,
        },
        (assets) => {
          for (const [name, source] of Object.entries(assets)) {
            const size = source.size();
            
            if (size > this.maxSize) {
              compilation.warnings.push(
                new WebpackError(
                  `Asset ${name} exceeds size limit (${size} > ${this.maxSize})`
                )
              );
            }
          }
        }
      );
    });
  }
}
```

### 模块依赖分析

```typescript
class DependencyAnalyzerPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap('DependencyAnalyzer', (compilation) => {
      compilation.hooks.afterOptimizeModules.tap(
        'DependencyAnalyzer',
        (modules) => {
          const graph = new Map<string, string[]>();
          
          for (const module of modules) {
            const deps: string[] = [];
            
            for (const dep of module.dependencies) {
              const resolved = compilation.moduleGraph.getModule(dep);
              if (resolved) {
                deps.push(resolved.identifier());
              }
            }
            
            graph.set(module.identifier(), deps);
          }
          
          // 检测循环依赖
          const cycles = this.findCycles(graph);
          
          for (const cycle of cycles) {
            compilation.warnings.push(
              new WebpackError(`Circular dependency: ${cycle.join(' -> ')}`)
            );
          }
        }
      );
    });
  }
}
```

## 总结

Compilation Hooks 的核心要点：

**模块构建**：
- buildModule/succeedModule/failedModule
- 监控模块构建过程

**优化阶段**：
- optimizeModules/optimizeChunks
- optimizeTree 进行 Tree Shaking

**资源处理**：
- processAssets 多阶段处理
- 按阶段添加/修改/分析资源

**封装阶段**：
- seal/afterSeal
- Hash 计算

**下一章**：我们将学习 ContextModuleFactory 和 NormalModuleFactory 的钩子。
