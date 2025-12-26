---
sidebar_position: 134
title: "Plugin 系统概述"
---

# Plugin 系统概述

Plugin 是 Webpack 的灵魂，通过插件机制实现了高度可扩展的构建流程。本章全面介绍 Plugin 系统架构。

## 插件机制设计

### 核心理念

Webpack 的插件系统基于 Tapable 实现，采用发布-订阅模式：

```typescript
// 插件的本质：在特定时机执行自定义逻辑
interface Plugin {
  apply(compiler: Compiler): void;
}

// Compiler 提供生命周期钩子
class Compiler {
  hooks = {
    // 不同阶段的钩子
    beforeRun: new AsyncSeriesHook(['compiler']),
    run: new AsyncSeriesHook(['compiler']),
    compile: new SyncHook(['params']),
    compilation: new SyncHook(['compilation', 'params']),
    emit: new AsyncSeriesHook(['compilation']),
    done: new AsyncSeriesHook(['stats']),
  };
  
  // 应用插件
  apply(...plugins: Plugin[]): void {
    for (const plugin of plugins) {
      plugin.apply(this);
    }
  }
}
```

### 插件生命周期

```
┌─────────────────────────────────────────────────────────────┐
│                      Plugin Lifecycle                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐             │
│   │environment│ -> │afterEnv  │ -> │entryOption│             │
│   └──────────┘    └──────────┘    └──────────┘             │
│         │                                                    │
│         v                                                    │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐             │
│   │beforeRun │ -> │   run    │ -> │ compile  │             │
│   └──────────┘    └──────────┘    └──────────┘             │
│         │                                                    │
│         v                                                    │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐             │
│   │compilation│ -> │  make    │ -> │ finish   │             │
│   └──────────┘    └──────────┘    └──────────┘             │
│         │                                                    │
│         v                                                    │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐             │
│   │afterComp │ -> │  emit    │ -> │  done    │             │
│   └──────────┘    └──────────┘    └──────────┘             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 基础插件结构

### 最简插件

```typescript
class SimplePlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.done.tap('SimplePlugin', (stats) => {
      console.log('Build complete!');
    });
  }
}

// 使用
const compiler = webpack(config);
new SimplePlugin().apply(compiler);
```

### 带配置的插件

```typescript
interface MyPluginOptions {
  name: string;
  enabled?: boolean;
}

class MyPlugin {
  private options: Required<MyPluginOptions>;
  
  constructor(options: MyPluginOptions) {
    // 参数验证和默认值
    this.options = {
      enabled: true,
      ...options,
    };
  }
  
  apply(compiler: Compiler): void {
    if (!this.options.enabled) {
      return;
    }
    
    const pluginName = 'MyPlugin';
    
    compiler.hooks.compilation.tap(pluginName, (compilation) => {
      console.log(`${this.options.name}: Compilation started`);
    });
    
    compiler.hooks.done.tap(pluginName, (stats) => {
      console.log(`${this.options.name}: Build finished`);
    });
  }
}
```

### 异步插件

```typescript
class AsyncPlugin {
  apply(compiler: Compiler): void {
    // 使用 tapAsync
    compiler.hooks.emit.tapAsync(
      'AsyncPlugin',
      (compilation, callback) => {
        setTimeout(() => {
          console.log('Async work done');
          callback();
        }, 1000);
      }
    );
    
    // 使用 tapPromise
    compiler.hooks.done.tapPromise(
      'AsyncPlugin',
      async (stats) => {
        await this.doAsyncWork();
        console.log('Promise-based work done');
      }
    );
  }
  
  private async doAsyncWork(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 500));
  }
}
```

## 插件分类

### 按作用范围分类

```typescript
// 1. Compiler 级别插件（全局）
class CompilerPlugin {
  apply(compiler: Compiler): void {
    // 影响整个构建过程
    compiler.hooks.run.tap('CompilerPlugin', () => {});
  }
}

// 2. Compilation 级别插件（单次编译）
class CompilationPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap('CompilationPlugin', (compilation) => {
      // 只影响当前编译
      compilation.hooks.processAssets.tap(
        'CompilationPlugin',
        (assets) => {}
      );
    });
  }
}

// 3. Module 级别插件（模块处理）
class ModulePlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap('ModulePlugin', (compilation) => {
      compilation.hooks.buildModule.tap('ModulePlugin', (module) => {
        // 处理单个模块
      });
    });
  }
}
```

### 按功能分类

```typescript
// 资源处理插件
class AssetPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap('AssetPlugin', (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: 'AssetPlugin',
          stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
        },
        (assets) => {
          // 添加或修改资源
        }
      );
    });
  }
}

// 优化插件
class OptimizationPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap('OptimizationPlugin', (compilation) => {
      compilation.hooks.optimizeChunks.tap('OptimizationPlugin', (chunks) => {
        // 优化 chunks
      });
    });
  }
}

// 分析插件
class AnalysisPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.done.tap('AnalysisPlugin', (stats) => {
      // 分析构建结果
      const json = stats.toJson();
      console.log(`Modules: ${json.modules?.length}`);
    });
  }
}
```

## Compiler Hooks

### 主要钩子

```typescript
class Compiler {
  hooks = {
    // 初始化阶段
    environment: new SyncHook([]),
    afterEnvironment: new SyncHook([]),
    entryOption: new SyncBailHook(['context', 'entry']),
    afterPlugins: new SyncHook(['compiler']),
    afterResolvers: new SyncHook(['compiler']),
    
    // 运行阶段
    beforeRun: new AsyncSeriesHook(['compiler']),
    run: new AsyncSeriesHook(['compiler']),
    watchRun: new AsyncSeriesHook(['compiler']),
    
    // 编译阶段
    normalModuleFactory: new SyncHook(['normalModuleFactory']),
    contextModuleFactory: new SyncHook(['contextModuleFactory']),
    beforeCompile: new AsyncSeriesHook(['params']),
    compile: new SyncHook(['params']),
    thisCompilation: new SyncHook(['compilation', 'params']),
    compilation: new SyncHook(['compilation', 'params']),
    make: new AsyncParallelHook(['compilation']),
    
    // 完成阶段
    afterCompile: new AsyncSeriesHook(['compilation']),
    shouldEmit: new SyncBailHook(['compilation']),
    emit: new AsyncSeriesHook(['compilation']),
    afterEmit: new AsyncSeriesHook(['compilation']),
    done: new AsyncSeriesHook(['stats']),
    failed: new SyncHook(['error']),
  };
}
```

### 钩子使用示例

```typescript
class FullLifecyclePlugin {
  apply(compiler: Compiler): void {
    const name = 'FullLifecyclePlugin';
    
    // 初始化
    compiler.hooks.environment.tap(name, () => {
      console.log('1. Environment setup');
    });
    
    // 运行前
    compiler.hooks.beforeRun.tapAsync(name, (compiler, callback) => {
      console.log('2. Before run');
      callback();
    });
    
    // 编译
    compiler.hooks.compilation.tap(name, (compilation) => {
      console.log('3. Compilation created');
      
      // 在 compilation 上注册更多钩子
      compilation.hooks.buildModule.tap(name, (module) => {
        console.log(`   Building: ${module.identifier()}`);
      });
    });
    
    // make 阶段
    compiler.hooks.make.tapAsync(name, (compilation, callback) => {
      console.log('4. Make phase');
      callback();
    });
    
    // 输出
    compiler.hooks.emit.tapAsync(name, (compilation, callback) => {
      console.log('5. Emitting assets');
      callback();
    });
    
    // 完成
    compiler.hooks.done.tap(name, (stats) => {
      console.log('6. Build done');
      console.log(`   Time: ${stats.endTime - stats.startTime}ms`);
    });
  }
}
```

## Compilation Hooks

### 主要钩子

```typescript
class Compilation {
  hooks = {
    // 模块构建
    buildModule: new SyncHook(['module']),
    succeedModule: new SyncHook(['module']),
    failedModule: new SyncHook(['module', 'error']),
    
    // 依赖处理
    addEntry: new SyncHook(['entry', 'options']),
    succeedEntry: new SyncHook(['entry', 'options', 'module']),
    
    // 优化阶段
    optimize: new SyncHook([]),
    optimizeModules: new SyncBailHook(['modules']),
    optimizeChunks: new SyncBailHook(['chunks']),
    optimizeTree: new AsyncSeriesHook(['chunks', 'modules']),
    
    // 资源处理
    processAssets: new AsyncSeriesHook(['assets']),
    afterProcessAssets: new SyncHook(['assets']),
    
    // Seal 阶段
    seal: new SyncHook([]),
    afterSeal: new AsyncSeriesHook([]),
  };
}
```

## 实用示例

### Banner 插件

```typescript
class BannerPlugin {
  private banner: string;
  
  constructor(options: { banner: string }) {
    this.banner = options.banner;
  }
  
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap('BannerPlugin', (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: 'BannerPlugin',
          stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
        },
        (assets) => {
          for (const [name, source] of Object.entries(assets)) {
            if (name.endsWith('.js')) {
              const newSource = new ConcatSource(
                `/* ${this.banner} */\n`,
                source
              );
              compilation.updateAsset(name, newSource);
            }
          }
        }
      );
    });
  }
}
```

## 总结

Plugin 系统的核心要点：

**设计理念**：
- 基于 Tapable 的发布-订阅
- 生命周期钩子机制
- 可扩展的架构

**插件结构**：
- apply 方法入口
- 注册钩子处理函数
- 同步/异步支持

**钩子类型**：
- Compiler 钩子（全局）
- Compilation 钩子（单次编译）
- 各阶段钩子

**常见用途**：
- 资源处理
- 优化增强
- 构建分析

**下一章**：我们将深入学习 Compiler Hooks 的详细用法。
