---
sidebar_position: 27
title: "Compilation Hooks 体系"
---

# Compilation Hooks 体系

Compilation 的 Hooks 是 Webpack 插件系统的核心战场。绝大多数插件的主要逻辑都注册在 Compilation 的钩子上，因为这里才是真正"干活"的地方。

## 为什么 Compilation Hooks 如此重要？

回顾一下 Compiler 和 Compilation 的分工：

- **Compiler Hooks**：控制整体流程（开始、结束、创建 Compilation）
- **Compilation Hooks**：控制具体工作（解析模块、优化、生成代码）

如果你想修改 Webpack 的构建行为——比如自定义 Tree Shaking、修改输出代码、添加额外资源——你需要的是 Compilation Hooks。

## Hooks 分类概览

Compilation 的钩子按照构建阶段可以分为以下几类：

```
┌────────────────────────────────────────────────────────────┐
│                    Compilation Hooks                        │
├─────────────────┬──────────────────────────────────────────┤
│  Make 阶段       │  buildModule, succeedModule, failedModule │
├─────────────────┼──────────────────────────────────────────┤
│  Seal 阶段入口   │  seal, afterSeal                          │
├─────────────────┼──────────────────────────────────────────┤
│  优化阶段        │  optimize, optimizeModules, optimizeChunks │
│                 │  optimizeTree, optimizeChunkModules        │
├─────────────────┼──────────────────────────────────────────┤
│  代码生成阶段    │  beforeCodeGeneration, afterCodeGeneration │
├─────────────────┼──────────────────────────────────────────┤
│  哈希阶段        │  beforeHash, contentHash, afterHash        │
├─────────────────┼──────────────────────────────────────────┤
│  资源阶段        │  processAssets, afterProcessAssets         │
└─────────────────┴──────────────────────────────────────────┘
```

## 完整 Hooks 定义

```typescript
import { 
  SyncHook, 
  SyncBailHook, 
  SyncWaterfallHook,
  AsyncSeriesHook,
  AsyncParallelHook,
  AsyncSeriesBailHook 
} from 'tapable';
import { Module } from './Module';
import { Chunk } from './Chunk';
import { ChunkGroup } from './ChunkGroup';
import { Source } from 'webpack-sources';

export interface CompilationHooks {
  // =================== Make 阶段 ===================
  
  /** 模块构建开始前 */
  buildModule: SyncHook<[Module]>;
  
  /** 模块构建失败 */
  failedModule: SyncHook<[Module, Error]>;
  
  /** 模块构建成功（在存入缓存之前） */
  succeedModule: SyncHook<[Module]>;
  
  /** 模块构建完成后 */
  afterBuildModule: SyncHook<[Module]>;
  
  // =================== Seal 阶段入口 ===================
  
  /** 封装阶段开始 */
  seal: SyncHook<[]>;
  
  /** 封装阶段结束 */
  afterSeal: AsyncSeriesHook<[]>;
  
  // =================== 优化阶段 ===================
  
  /** 优化开始 */
  optimize: SyncHook<[]>;
  
  /** 模块优化 */
  optimizeModules: SyncBailHook<[Iterable<Module>], boolean | void>;
  
  /** 模块优化后 */
  afterOptimizeModules: SyncHook<[Iterable<Module>]>;
  
  /** Chunk 优化 */
  optimizeChunks: SyncBailHook<[Iterable<Chunk>, ChunkGroup[]], boolean | void>;
  
  /** Chunk 优化后 */
  afterOptimizeChunks: SyncHook<[Iterable<Chunk>, ChunkGroup[]]>;
  
  /** Tree Shaking 优化（异步） */
  optimizeTree: AsyncSeriesHook<[Iterable<Chunk>, Iterable<Module>]>;
  
  /** Tree Shaking 优化后 */
  afterOptimizeTree: SyncHook<[Iterable<Chunk>, Iterable<Module>]>;
  
  /** Chunk 模块优化（异步，可中断） */
  optimizeChunkModules: AsyncSeriesBailHook<[Iterable<Chunk>, Iterable<Module>], boolean | void>;
  
  /** Chunk 模块优化后 */
  afterOptimizeChunkModules: SyncHook<[Iterable<Chunk>, Iterable<Module>]>;
  
  // =================== 代码生成阶段 ===================
  
  /** 代码生成前 */
  beforeCodeGeneration: SyncHook<[]>;
  
  /** 代码生成后 */
  afterCodeGeneration: SyncHook<[]>;
  
  // =================== 哈希阶段 ===================
  
  /** 哈希计算前 */
  beforeHash: SyncHook<[]>;
  
  /** 内容哈希计算 */
  contentHash: SyncHook<[Chunk]>;
  
  /** 哈希计算后 */
  afterHash: SyncHook<[]>;
  
  // =================== 资源阶段 ===================
  
  /** 模块资源处理前 */
  beforeModuleAssets: SyncHook<[]>;
  
  /** 额外资源（已废弃，用 processAssets 替代） */
  additionalAssets: AsyncSeriesHook<[]>;
  
  /** 处理资源（核心钩子，有多个阶段） */
  processAssets: AsyncSeriesHook<[Record<string, Source>]>;
  
  /** 资源处理后 */
  afterProcessAssets: SyncHook<[Record<string, Source>]>;
  
  // =================== 统计与记录 ===================
  
  /** 记录 */
  record: SyncHook<[Compilation, any]>;
  
  /** 从记录恢复 */
  reviveModules: SyncHook<[Iterable<Module>, any]>;
  
  /** 记录模块 */
  recordModules: SyncHook<[Iterable<Module>, any]>;
  
  /** 恢复 Chunks */
  reviveChunks: SyncHook<[Iterable<Chunk>, any]>;
  
  /** 记录 Chunks */
  recordChunks: SyncHook<[Iterable<Chunk>, any]>;
  
  // =================== 子编译 ===================
  
  /** 子编译器 */
  childCompiler: SyncHook<[Compiler, string, number]>;
}
```

## 关键 Hooks 详解

### 1. buildModule / succeedModule / failedModule

这三个钩子围绕模块构建的生命周期：

```typescript
class MyPlugin {
  apply(compiler: Compiler) {
    compiler.hooks.compilation.tap('MyPlugin', (compilation) => {
      // 模块开始构建
      compilation.hooks.buildModule.tap('MyPlugin', (module) => {
        console.log(`开始构建: ${module.identifier()}`);
      });
      
      // 模块构建成功
      compilation.hooks.succeedModule.tap('MyPlugin', (module) => {
        console.log(`构建成功: ${module.identifier()}`);
      });
      
      // 模块构建失败
      compilation.hooks.failedModule.tap('MyPlugin', (module, error) => {
        console.error(`构建失败: ${module.identifier()}`, error);
      });
    });
  }
}
```

**典型用例**：
- ProgressPlugin 用这些钩子显示构建进度
- 自定义日志和监控

### 2. seal / afterSeal

seal 标志着从"收集模块"到"生成代码"的转折点：

```typescript
compilation.hooks.seal.tap('MyPlugin', () => {
  // seal 触发时，所有模块已经收集完毕
  console.log(`共收集 ${compilation.modules.size} 个模块`);
  
  // 可以在这里做一些预处理
});

compilation.hooks.afterSeal.tapAsync('MyPlugin', (callback) => {
  // 所有优化和代码生成都完成了
  console.log(`共生成 ${Object.keys(compilation.assets).length} 个文件`);
  callback();
});
```

### 3. optimize 系列钩子

这是一组按顺序执行的优化钩子：

```
optimize
   │
   ▼
optimizeModules ──▶ afterOptimizeModules
   │
   ▼
optimizeChunks ──▶ afterOptimizeChunks
   │
   ▼
optimizeTree ──▶ afterOptimizeTree (Tree Shaking)
   │
   ▼
optimizeChunkModules ──▶ afterOptimizeChunkModules
```

```typescript
// SplitChunksPlugin 使用 optimizeChunks 钩子
compilation.hooks.optimizeChunks.tap('SplitChunksPlugin', (chunks) => {
  // 分析 chunks，决定哪些模块应该提取到公共 chunk
  for (const chunk of chunks) {
    // 执行分割逻辑
  }
});

// Tree Shaking 使用 optimizeTree 钩子
compilation.hooks.optimizeTree.tapAsync('MyTreeShaking', (chunks, modules, callback) => {
  for (const module of modules) {
    // 分析 unused exports
  }
  callback();
});
```

**Bail 钩子的特殊性**：

`optimizeModules` 和 `optimizeChunks` 是 BailHook，返回 `true` 可以跳过后续优化：

```typescript
compilation.hooks.optimizeChunks.tap('SkipOptimization', (chunks) => {
  if (someCondition) {
    return true; // 返回 true 表示已处理，跳过后续
  }
  // 返回 undefined 继续执行后续插件
});
```

### 4. processAssets（Webpack 5 核心钩子）

这是 Webpack 5 新增的最重要的资源处理钩子，取代了之前分散的多个钩子：

```typescript
// processAssets 有多个阶段（stage）
const { Compilation } = require('webpack');

compilation.hooks.processAssets.tapAsync(
  {
    name: 'MyPlugin',
    stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONS, // 阶段
  },
  (assets, callback) => {
    // 添加额外资源
    compilation.emitAsset('extra.txt', new RawSource('Hello'));
    callback();
  }
);
```

**processAssets 的阶段（Stage）**：

```typescript
// 按执行顺序排列
const STAGES = {
  PROCESS_ASSETS_STAGE_ADDITIONAL: -2000,      // 添加额外资源
  PROCESS_ASSETS_STAGE_PRE_PROCESS: -1000,     // 预处理
  PROCESS_ASSETS_STAGE_DERIVED: -200,          // 派生资源
  PROCESS_ASSETS_STAGE_ADDITIONS: -100,        // 添加内容
  PROCESS_ASSETS_STAGE_NONE: 0,                // 默认
  PROCESS_ASSETS_STAGE_OPTIMIZE: 100,          // 优化
  PROCESS_ASSETS_STAGE_OPTIMIZE_COUNT: 200,    // 优化数量
  PROCESS_ASSETS_STAGE_OPTIMIZE_COMPATIBILITY: 300, // 兼容性优化
  PROCESS_ASSETS_STAGE_OPTIMIZE_SIZE: 400,     // 体积优化
  PROCESS_ASSETS_STAGE_DEV_TOOLING: 500,       // 开发工具
  PROCESS_ASSETS_STAGE_OPTIMIZE_INLINE: 700,   // 内联优化
  PROCESS_ASSETS_STAGE_SUMMARIZE: 1000,        // 汇总
  PROCESS_ASSETS_STAGE_OPTIMIZE_HASH: 2500,    // 哈希优化
  PROCESS_ASSETS_STAGE_OPTIMIZE_TRANSFER: 3000,// 传输优化
  PROCESS_ASSETS_STAGE_ANALYSE: 4000,          // 分析
  PROCESS_ASSETS_STAGE_REPORT: 5000,           // 报告
};
```

**典型用例**：

```typescript
// TerserPlugin 在 OPTIMIZE_SIZE 阶段压缩代码
compilation.hooks.processAssets.tapPromise(
  {
    name: 'TerserPlugin',
    stage: Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_SIZE,
  },
  async (assets) => {
    for (const [name, source] of Object.entries(assets)) {
      if (name.endsWith('.js')) {
        const minified = await terser.minify(source.source());
        compilation.updateAsset(name, new RawSource(minified.code));
      }
    }
  }
);

// BannerPlugin 在 ADDITIONS 阶段添加 banner
compilation.hooks.processAssets.tap(
  {
    name: 'BannerPlugin',
    stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
  },
  (assets) => {
    for (const [name, source] of Object.entries(assets)) {
      if (name.endsWith('.js')) {
        const banner = '/*! My App v1.0 */\n';
        compilation.updateAsset(name, new ConcatSource(banner, source));
      }
    }
  }
);
```

## Mini-Webpack Hooks 实现

```typescript
export class Compilation {
  hooks: {
    // Make 阶段
    buildModule: SyncHook<[Module]>;
    succeedModule: SyncHook<[Module]>;
    failedModule: SyncHook<[Module, Error]>;
    
    // Seal 阶段
    seal: SyncHook<[]>;
    afterSeal: AsyncSeriesHook<[]>;
    
    // 优化阶段
    optimize: SyncHook<[]>;
    optimizeModules: SyncBailHook<[Set<Module>], boolean | void>;
    afterOptimizeModules: SyncHook<[Set<Module>]>;
    optimizeChunks: SyncBailHook<[Set<Chunk>], boolean | void>;
    afterOptimizeChunks: SyncHook<[Set<Chunk>]>;
    optimizeTree: AsyncSeriesHook<[Set<Chunk>, Set<Module>]>;
    
    // 代码生成
    beforeCodeGeneration: SyncHook<[]>;
    afterCodeGeneration: SyncHook<[]>;
    
    // 哈希
    beforeHash: SyncHook<[]>;
    afterHash: SyncHook<[]>;
    
    // 资源处理
    processAssets: AsyncSeriesHook<[Record<string, Source>]>;
    afterProcessAssets: SyncHook<[Record<string, Source>]>;
  };
  
  // 资源处理阶段常量
  static PROCESS_ASSETS_STAGE_ADDITIONAL = -2000;
  static PROCESS_ASSETS_STAGE_PRE_PROCESS = -1000;
  static PROCESS_ASSETS_STAGE_ADDITIONS = -100;
  static PROCESS_ASSETS_STAGE_NONE = 0;
  static PROCESS_ASSETS_STAGE_OPTIMIZE = 100;
  static PROCESS_ASSETS_STAGE_OPTIMIZE_SIZE = 400;
  static PROCESS_ASSETS_STAGE_DEV_TOOLING = 500;
  static PROCESS_ASSETS_STAGE_SUMMARIZE = 1000;
  static PROCESS_ASSETS_STAGE_REPORT = 5000;
  
  constructor(compiler: Compiler, params: CompilationParams) {
    // ... 其他初始化
    
    this.hooks = {
      buildModule: new SyncHook(['module']),
      succeedModule: new SyncHook(['module']),
      failedModule: new SyncHook(['module', 'error']),
      
      seal: new SyncHook([]),
      afterSeal: new AsyncSeriesHook([]),
      
      optimize: new SyncHook([]),
      optimizeModules: new SyncBailHook(['modules']),
      afterOptimizeModules: new SyncHook(['modules']),
      optimizeChunks: new SyncBailHook(['chunks']),
      afterOptimizeChunks: new SyncHook(['chunks']),
      optimizeTree: new AsyncSeriesHook(['chunks', 'modules']),
      
      beforeCodeGeneration: new SyncHook([]),
      afterCodeGeneration: new SyncHook([]),
      
      beforeHash: new SyncHook([]),
      afterHash: new SyncHook([]),
      
      processAssets: new AsyncSeriesHook(['assets']),
      afterProcessAssets: new SyncHook(['assets']),
    };
  }
}
```

### 支持 Stage 的 processAssets

真正的 Webpack 的 `processAssets` 支持 stage 参数。我们用一个包装器实现：

```typescript
class StageAwareAsyncSeriesHook<T extends any[]> extends AsyncSeriesHook<T> {
  private stageHandlers: Map<number, Array<{ name: string; fn: (...args: T) => Promise<void> | void }>> = new Map();
  
  tapAsync(
    options: { name: string; stage?: number } | string,
    fn: (...args: [...T, (err?: Error) => void]) => void
  ): void {
    const { name, stage = 0 } = typeof options === 'string' 
      ? { name: options, stage: 0 }
      : options;
    
    if (!this.stageHandlers.has(stage)) {
      this.stageHandlers.set(stage, []);
    }
    
    this.stageHandlers.get(stage)!.push({
      name,
      fn: (...args: T) => new Promise<void>((resolve, reject) => {
        fn(...args, (err) => err ? reject(err) : resolve());
      }),
    });
  }
  
  tapPromise(
    options: { name: string; stage?: number } | string,
    fn: (...args: T) => Promise<void>
  ): void {
    const { name, stage = 0 } = typeof options === 'string'
      ? { name: options, stage: 0 }
      : options;
    
    if (!this.stageHandlers.has(stage)) {
      this.stageHandlers.set(stage, []);
    }
    
    this.stageHandlers.get(stage)!.push({ name, fn });
  }
  
  async promise(...args: T): Promise<void> {
    // 按 stage 排序
    const sortedStages = [...this.stageHandlers.keys()].sort((a, b) => a - b);
    
    for (const stage of sortedStages) {
      const handlers = this.stageHandlers.get(stage)!;
      for (const { fn } of handlers) {
        await fn(...args);
      }
    }
  }
}

// 使用
this.hooks.processAssets = new StageAwareAsyncSeriesHook(['assets']);
```

## 钩子使用模式

### 模式一：日志与监控

```typescript
class BuildLoggerPlugin {
  apply(compiler: Compiler) {
    compiler.hooks.compilation.tap('BuildLoggerPlugin', (compilation) => {
      let moduleCount = 0;
      
      compilation.hooks.buildModule.tap('BuildLoggerPlugin', (module) => {
        moduleCount++;
        process.stdout.write(`\r构建中... ${moduleCount} 个模块`);
      });
      
      compilation.hooks.afterSeal.tapAsync('BuildLoggerPlugin', (callback) => {
        console.log(`\n构建完成，共 ${moduleCount} 个模块`);
        callback();
      });
    });
  }
}
```

### 模式二：资源修改

```typescript
class AddMetaPlugin {
  apply(compiler: Compiler) {
    compiler.hooks.compilation.tap('AddMetaPlugin', (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: 'AddMetaPlugin',
          stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
        },
        (assets) => {
          // 为每个 JS 文件添加版本信息
          const meta = `/* Built at ${new Date().toISOString()} */\n`;
          
          for (const [name, source] of Object.entries(assets)) {
            if (name.endsWith('.js')) {
              compilation.updateAsset(
                name,
                new ConcatSource(meta, source)
              );
            }
          }
        }
      );
    });
  }
}
```

### 模式三：自定义优化

```typescript
class RemoveEmptyChunksPlugin {
  apply(compiler: Compiler) {
    compiler.hooks.compilation.tap('RemoveEmptyChunksPlugin', (compilation) => {
      compilation.hooks.optimizeChunks.tap('RemoveEmptyChunksPlugin', (chunks) => {
        for (const chunk of [...chunks]) {
          const modules = compilation.chunkGraph.getChunkModulesIterable(chunk);
          const hasModules = !![...modules].length;
          
          if (!hasModules && !chunk.hasRuntime()) {
            // 移除空 chunk
            chunks.delete(chunk);
          }
        }
      });
    });
  }
}
```

## 小结

Compilation Hooks 是 Webpack 插件生态的基础设施。理解这些钩子，你就能：

1. **读懂主流插件**：TerserPlugin、HtmlWebpackPlugin 等都基于这些钩子
2. **编写自己的插件**：根据需求选择合适的钩子
3. **调试构建问题**：知道问题可能出在哪个阶段

关键要点：

- **Make 阶段**：buildModule / succeedModule / failedModule
- **Seal 阶段**：seal / afterSeal
- **优化阶段**：optimize → optimizeModules → optimizeChunks → optimizeTree
- **资源阶段**：processAssets（带 stage 的多阶段处理）

下一节，我们将深入 ModuleGraph——Webpack 如何管理模块之间的依赖关系。
