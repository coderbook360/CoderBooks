---
sidebar_position: 141
title: "Plugin 间通信"
---

# Plugin 间通信

在复杂的构建系统中，插件之间需要共享数据和协调工作。本章学习 Webpack 插件间通信的各种方式。

## 通信方式概述

### 通信场景

```
┌─────────────────────────────────────────────────────────────┐
│                    Plugin Communication                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   1. Hooks 传递数据                                          │
│      PluginA --[hook data]--> PluginB                       │
│                                                              │
│   2. Compilation 对象共享                                     │
│      PluginA --[compilation.customData]--> PluginB          │
│                                                              │
│   3. WeakMap 关联数据                                        │
│      PluginA --[WeakMap<Module, Data>]--> PluginB           │
│                                                              │
│   4. 自定义 Hooks                                            │
│      PluginA --[custom hook]--> PluginB                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Hooks 传递数据

### Waterfall Hook

```typescript
// Waterfall Hook 允许修改传递的数据
class PluginA {
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap('PluginA', (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: 'PluginA',
          stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
        },
        (assets) => {
          // 添加元数据供其他插件使用
          for (const [name, source] of Object.entries(assets)) {
            const info = compilation.assetsInfo.get(name) || {};
            info.processedBy = info.processedBy || [];
            info.processedBy.push('PluginA');
            compilation.assetsInfo.set(name, info);
          }
        }
      );
    });
  }
}

class PluginB {
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap('PluginB', (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: 'PluginB',
          stage: Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE,
        },
        (assets) => {
          // 读取 PluginA 添加的元数据
          for (const [name] of Object.entries(assets)) {
            const info = compilation.assetsInfo.get(name);
            
            if (info?.processedBy?.includes('PluginA')) {
              console.log(`${name} was processed by PluginA`);
            }
          }
        }
      );
    });
  }
}
```

### 使用 Stage 控制顺序

```typescript
class OrderedPluginA {
  static STAGE = 100;
  
  apply(compiler: Compiler): void {
    compiler.hooks.emit.tap(
      { name: 'OrderedPluginA', stage: OrderedPluginA.STAGE },
      (compilation) => {
        compilation._pluginAData = { processed: true };
      }
    );
  }
}

class OrderedPluginB {
  static STAGE = 200; // 在 A 之后
  
  apply(compiler: Compiler): void {
    compiler.hooks.emit.tap(
      { name: 'OrderedPluginB', stage: OrderedPluginB.STAGE },
      (compilation) => {
        // 可以访问 PluginA 的数据
        if (compilation._pluginAData?.processed) {
          console.log('PluginA already processed');
        }
      }
    );
  }
}
```

## Compilation 数据共享

### 使用 buildInfo

```typescript
// 在模块上存储数据
class ModuleAnnotatorPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap('ModuleAnnotator', (compilation) => {
      compilation.hooks.succeedModule.tap('ModuleAnnotator', (module) => {
        // 在模块的 buildInfo 中存储数据
        module.buildInfo = module.buildInfo || {};
        module.buildInfo.customData = {
          analyzedAt: Date.now(),
          dependencies: module.dependencies.length,
        };
      });
    });
  }
}

// 读取数据
class ModuleReaderPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap('ModuleReader', (compilation) => {
      compilation.hooks.afterOptimizeModules.tap('ModuleReader', (modules) => {
        for (const module of modules) {
          const customData = module.buildInfo?.customData;
          
          if (customData) {
            console.log(`Module ${module.identifier()}:`, customData);
          }
        }
      });
    });
  }
}
```

### 使用 buildMeta

```typescript
// buildMeta 用于存储模块元数据
class MetaPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap('MetaPlugin', (compilation) => {
      compilation.hooks.succeedModule.tap('MetaPlugin', (module) => {
        // buildMeta 通常用于存储模块类型信息
        module.buildMeta = module.buildMeta || {};
        module.buildMeta.sideEffectFree = this.checkSideEffects(module);
        module.buildMeta.exportsType = 'namespace';
      });
    });
  }
  
  private checkSideEffects(module: Module): boolean {
    // 检查模块是否有副作用
    return false;
  }
}
```

## WeakMap 关联

### 模块数据关联

```typescript
// 使用 WeakMap 避免内存泄漏
const moduleDataMap = new WeakMap<Module, ModuleData>();

class DataCollectorPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap('DataCollector', (compilation) => {
      compilation.hooks.buildModule.tap('DataCollector', (module) => {
        moduleDataMap.set(module, {
          startTime: Date.now(),
          context: compilation.options.context,
        });
      });
      
      compilation.hooks.succeedModule.tap('DataCollector', (module) => {
        const data = moduleDataMap.get(module);
        
        if (data) {
          data.endTime = Date.now();
          data.duration = data.endTime - data.startTime;
        }
      });
    });
  }
}

class DataConsumerPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap('DataConsumer', (compilation) => {
      compilation.hooks.afterOptimizeModules.tap('DataConsumer', (modules) => {
        for (const module of modules) {
          const data = moduleDataMap.get(module);
          
          if (data) {
            console.log(`Module build time: ${data.duration}ms`);
          }
        }
      });
    });
  }
}

interface ModuleData {
  startTime: number;
  endTime?: number;
  duration?: number;
  context: string;
}
```

### Chunk 数据关联

```typescript
const chunkMetrics = new WeakMap<Chunk, ChunkMetrics>();

class ChunkAnalyzerPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap('ChunkAnalyzer', (compilation) => {
      compilation.hooks.afterOptimizeChunks.tap('ChunkAnalyzer', (chunks) => {
        for (const chunk of chunks) {
          const modules = compilation.chunkGraph.getChunkModules(chunk);
          
          chunkMetrics.set(chunk, {
            moduleCount: modules.length,
            totalSize: modules.reduce((sum, m) => sum + m.size(), 0),
          });
        }
      });
    });
  }
}

// 其他插件可以访问这些数据
class ChunkReporterPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap('ChunkReporter', (compilation) => {
      compilation.hooks.processAssets.tap(
        { name: 'ChunkReporter', stage: Compilation.PROCESS_ASSETS_STAGE_REPORT },
        () => {
          for (const chunk of compilation.chunks) {
            const metrics = chunkMetrics.get(chunk);
            
            if (metrics) {
              console.log(`Chunk ${chunk.name}: ${metrics.moduleCount} modules`);
            }
          }
        }
      );
    });
  }
}

interface ChunkMetrics {
  moduleCount: number;
  totalSize: number;
}
```

## 自定义 Hooks

### 创建自定义 Hook

```typescript
import { SyncHook, AsyncSeriesHook } from 'tapable';

// 定义共享的 hooks 容器
class PluginHooksRegistry {
  static hooks = {
    beforeCustomProcess: new SyncHook<[CustomProcessData]>(['data']),
    afterCustomProcess: new AsyncSeriesHook<[CustomProcessResult]>(['result']),
    moduleAnalyzed: new SyncHook<[Module, AnalysisResult]>(['module', 'result']),
  };
}

interface CustomProcessData {
  assets: Record<string, Source>;
  compilation: Compilation;
}

interface CustomProcessResult {
  processed: string[];
  skipped: string[];
}
```

### 使用自定义 Hook

```typescript
// 发布者插件
class PublisherPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap('PublisherPlugin', (compilation) => {
      compilation.hooks.processAssets.tap(
        { name: 'PublisherPlugin', stage: 0 },
        (assets) => {
          // 触发自定义 hook
          PluginHooksRegistry.hooks.beforeCustomProcess.call({
            assets,
            compilation,
          });
          
          // 处理资源
          const result = this.process(assets);
          
          // 触发完成 hook
          PluginHooksRegistry.hooks.afterCustomProcess.promise(result);
        }
      );
    });
  }
  
  private process(assets: Record<string, Source>): CustomProcessResult {
    return { processed: [], skipped: [] };
  }
}

// 订阅者插件
class SubscriberPlugin {
  apply(compiler: Compiler): void {
    // 订阅自定义 hook
    PluginHooksRegistry.hooks.beforeCustomProcess.tap(
      'SubscriberPlugin',
      (data) => {
        console.log('About to process', Object.keys(data.assets).length, 'assets');
      }
    );
    
    PluginHooksRegistry.hooks.afterCustomProcess.tapPromise(
      'SubscriberPlugin',
      async (result) => {
        console.log('Processed:', result.processed.length);
        console.log('Skipped:', result.skipped.length);
      }
    );
  }
}
```

### Compilation 上的自定义 Hook

```typescript
// 在 Compilation 上添加自定义 hooks
class CompilationHooksPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap('CompilationHooks', (compilation) => {
      // 添加自定义 hooks
      if (!compilation.hooks.customAssetProcess) {
        compilation.hooks.customAssetProcess = new SyncHook(['asset', 'name']);
      }
    });
  }
}

// 使用自定义 hooks
class AssetProcessorPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap('AssetProcessor', (compilation) => {
      // 注册处理器
      compilation.hooks.customAssetProcess?.tap('AssetProcessor', (asset, name) => {
        console.log('Processing asset:', name);
      });
    });
  }
}

class AssetTriggerPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap('AssetTrigger', (compilation) => {
      compilation.hooks.processAssets.tap(
        { name: 'AssetTrigger', stage: 0 },
        (assets) => {
          for (const [name, asset] of Object.entries(assets)) {
            // 触发自定义 hook
            compilation.hooks.customAssetProcess?.call(asset, name);
          }
        }
      );
    });
  }
}
```

## 插件协作模式

### 管道模式

```typescript
// 多个插件形成处理管道
class PipelinePlugin {
  private pipeline: PipelineStep[] = [];
  
  addStep(step: PipelineStep): void {
    this.pipeline.push(step);
  }
  
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap('Pipeline', (compilation) => {
      compilation.hooks.processAssets.tapPromise(
        { name: 'Pipeline', stage: 0 },
        async (assets) => {
          let result = assets;
          
          for (const step of this.pipeline) {
            result = await step.process(result, compilation);
          }
          
          return result;
        }
      );
    });
  }
}

interface PipelineStep {
  name: string;
  process(
    assets: Record<string, Source>,
    compilation: Compilation
  ): Promise<Record<string, Source>>;
}
```

### 事件总线模式

```typescript
// 简单的事件总线
class PluginEventBus {
  private static listeners = new Map<string, Function[]>();
  
  static on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }
  
  static emit(event: string, ...args: any[]): void {
    const callbacks = this.listeners.get(event) || [];
    for (const callback of callbacks) {
      callback(...args);
    }
  }
  
  static off(event: string, callback?: Function): void {
    if (!callback) {
      this.listeners.delete(event);
    } else {
      const callbacks = this.listeners.get(event) || [];
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }
}

// 使用事件总线
class EmitterPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.done.tap('Emitter', (stats) => {
      PluginEventBus.emit('build:complete', {
        hash: stats.hash,
        time: stats.endTime - stats.startTime,
      });
    });
  }
}

class ListenerPlugin {
  apply(compiler: Compiler): void {
    PluginEventBus.on('build:complete', (data: any) => {
      console.log('Build completed:', data);
    });
  }
}
```

## 总结

插件间通信的核心要点：

**Hooks 传递**：
- 使用 stage 控制顺序
- Waterfall hooks 传递数据
- AssetInfo 存储元数据

**数据共享**：
- buildInfo/buildMeta
- Compilation 属性
- WeakMap 关联

**自定义 Hooks**：
- 创建共享 hooks
- 发布-订阅模式
- Compilation 扩展

**协作模式**：
- 管道模式
- 事件总线
- 状态共享

**下一章**：我们将学习 Plugin 调试与性能优化。
