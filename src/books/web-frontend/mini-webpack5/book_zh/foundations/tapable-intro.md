# Tapable 事件系统入门

在深入 Webpack 源码之前，我们必须先理解 **Tapable**——这是 Webpack 插件系统的核心，也是理解整个 Webpack 架构的关键。

本章将介绍 Tapable 的基本概念和使用方式，为后续的源码实现做好铺垫。

## 为什么需要 Tapable？

思考一下：Webpack 的构建流程有几十个阶段，每个阶段都需要执行不同的操作。如何让这些操作可扩展？

最直接的想法是使用**事件发射器**（EventEmitter）：

```javascript
const EventEmitter = require('events');

class Compiler extends EventEmitter {
  run() {
    this.emit('beforeRun');
    // 执行编译
    this.emit('compile');
    // 完成
    this.emit('done');
  }
}

const compiler = new Compiler();
compiler.on('done', () => {
  console.log('构建完成');
});
```

这能工作，但 EventEmitter 有局限：

1. **只支持同步回调**：无法等待异步操作完成
2. **无法控制执行顺序**：多个监听器的执行顺序不确定
3. **无法传递结果**：监听器之间无法传递处理结果
4. **无法中断执行**：一个监听器无法阻止后续监听器执行

Webpack 的需求远比这复杂：

- 需要支持同步和异步钩子
- 需要支持串行和并行执行
- 需要支持结果传递（瀑布流）
- 需要支持提前中断（熔断）
- 需要支持循环执行

**Tapable** 就是为这些需求设计的。

## Tapable 是什么？

Tapable 是一个**钩子（Hook）管理库**，它提供了多种类型的钩子，满足不同的执行需求。

核心概念：

- **Hook**：钩子，可以理解为一个事件
- **Tap**：订阅钩子，注册回调函数
- **Call**：触发钩子，执行所有回调

```javascript
const { SyncHook } = require('tapable');

// 创建钩子
const hook = new SyncHook(['arg1', 'arg2']);

// 订阅钩子
hook.tap('PluginA', (arg1, arg2) => {
  console.log('PluginA:', arg1, arg2);
});

hook.tap('PluginB', (arg1, arg2) => {
  console.log('PluginB:', arg1, arg2);
});

// 触发钩子
hook.call('hello', 'world');

// 输出：
// PluginA: hello world
// PluginB: hello world
```

## 钩子类型概览

Tapable 提供了 9 种钩子类型，可以按两个维度分类：

### 按执行方式分类

| 类型 | 描述 |
|------|------|
| **Basic** | 普通执行，所有回调依次执行 |
| **Bail** | 熔断执行，任一回调返回非 undefined 则停止 |
| **Waterfall** | 瀑布流执行，前一个回调的返回值传给下一个 |
| **Loop** | 循环执行，任一回调返回非 undefined 则重新开始 |

### 按同步/异步分类

| 类型 | 描述 |
|------|------|
| **Sync** | 同步执行，使用 `tap` 订阅，`call` 触发 |
| **AsyncSeries** | 异步串行，依次执行，等待前一个完成 |
| **AsyncParallel** | 异步并行，同时执行所有回调 |

组合起来，就有以下钩子：

**同步钩子**：
- `SyncHook` - 基础同步钩子
- `SyncBailHook` - 同步熔断钩子
- `SyncWaterfallHook` - 同步瀑布流钩子
- `SyncLoopHook` - 同步循环钩子

**异步钩子**：
- `AsyncParallelHook` - 异步并行钩子
- `AsyncParallelBailHook` - 异步并行熔断钩子
- `AsyncSeriesHook` - 异步串行钩子
- `AsyncSeriesBailHook` - 异步串行熔断钩子
- `AsyncSeriesWaterfallHook` - 异步串行瀑布流钩子

## 同步钩子详解

### SyncHook：基础同步钩子

最简单的钩子，所有回调依次执行，返回值被忽略：

```javascript
const { SyncHook } = require('tapable');

const hook = new SyncHook(['name']);

hook.tap('Plugin1', (name) => {
  console.log('Plugin1:', name);
  return 'ignored'; // 返回值被忽略
});

hook.tap('Plugin2', (name) => {
  console.log('Plugin2:', name);
});

hook.call('webpack');
// Plugin1: webpack
// Plugin2: webpack
```

**应用场景**：简单的通知机制，如 `compiler.hooks.done`。

### SyncBailHook：熔断钩子

任一回调返回非 `undefined` 值时，停止后续回调的执行：

```javascript
const { SyncBailHook } = require('tapable');

const hook = new SyncBailHook(['request']);

hook.tap('Plugin1', (request) => {
  if (request.startsWith('http')) {
    return request; // 返回非 undefined，中断执行
  }
  // 返回 undefined，继续执行
});

hook.tap('Plugin2', (request) => {
  console.log('Plugin2 执行了');
  return request + '.js';
});

console.log(hook.call('http://example.com')); // http://example.com
console.log(hook.call('./module')); // ./module.js
```

**应用场景**：多个处理器竞争处理同一请求，如模块解析 `resolver.hooks.resolve`。

### SyncWaterfallHook：瀑布流钩子

前一个回调的返回值作为下一个回调的第一个参数：

```javascript
const { SyncWaterfallHook } = require('tapable');

const hook = new SyncWaterfallHook(['content']);

hook.tap('Plugin1', (content) => {
  return content + ' -> Plugin1';
});

hook.tap('Plugin2', (content) => {
  return content + ' -> Plugin2';
});

hook.tap('Plugin3', (content) => {
  return content + ' -> Plugin3';
});

console.log(hook.call('Start'));
// Start -> Plugin1 -> Plugin2 -> Plugin3
```

**应用场景**：数据需要经过多个插件依次处理，如 `compilation.hooks.optimizeChunkAssets`。

### SyncLoopHook：循环钩子

任一回调返回非 `undefined` 值时，从第一个回调重新开始执行：

```javascript
const { SyncLoopHook } = require('tapable');

const hook = new SyncLoopHook([]);
let count = 0;

hook.tap('Plugin1', () => {
  console.log('Plugin1 执行，count =', count);
  if (count < 3) {
    count++;
    return true; // 返回非 undefined，重新开始
  }
  // 返回 undefined，继续执行
});

hook.tap('Plugin2', () => {
  console.log('Plugin2 执行');
});

hook.call();
// Plugin1 执行，count = 0
// Plugin1 执行，count = 1
// Plugin1 执行，count = 2
// Plugin1 执行，count = 3
// Plugin2 执行
```

**应用场景**：需要重复执行直到满足条件，如依赖解析的迭代处理。

## 异步钩子详解

异步钩子支持三种订阅方式：

- `tap`：同步回调
- `tapAsync`：异步回调，通过 callback 通知完成
- `tapPromise`：异步回调，返回 Promise

### AsyncSeriesHook：异步串行钩子

依次执行所有回调，等待前一个完成后再执行下一个：

```javascript
const { AsyncSeriesHook } = require('tapable');

const hook = new AsyncSeriesHook(['name']);

// 使用 tapAsync
hook.tapAsync('Plugin1', (name, callback) => {
  setTimeout(() => {
    console.log('Plugin1:', name);
    callback(); // 通知完成
  }, 1000);
});

// 使用 tapPromise
hook.tapPromise('Plugin2', (name) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('Plugin2:', name);
      resolve();
    }, 500);
  });
});

// 使用 callAsync 触发
hook.callAsync('webpack', () => {
  console.log('所有插件执行完成');
});

// 或使用 promise 触发
hook.promise('webpack').then(() => {
  console.log('所有插件执行完成');
});
```

### AsyncParallelHook：异步并行钩子

同时执行所有回调，全部完成后才算完成：

```javascript
const { AsyncParallelHook } = require('tapable');

const hook = new AsyncParallelHook(['name']);

hook.tapPromise('Plugin1', (name) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('Plugin1 完成:', name);
      resolve();
    }, 1000);
  });
});

hook.tapPromise('Plugin2', (name) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('Plugin2 完成:', name);
      resolve();
    }, 500);
  });
});

hook.promise('webpack').then(() => {
  console.log('所有插件执行完成');
});

// Plugin2 完成: webpack (500ms)
// Plugin1 完成: webpack (1000ms)
// 所有插件执行完成
```

### AsyncSeriesBailHook：异步串行熔断

串行执行，任一回调返回非 undefined 则停止：

```javascript
const { AsyncSeriesBailHook } = require('tapable');

const hook = new AsyncSeriesBailHook(['request']);

hook.tapPromise('CachePlugin', async (request) => {
  const cached = await getFromCache(request);
  if (cached) {
    return cached; // 命中缓存，中断后续处理
  }
  // 返回 undefined，继续执行
});

hook.tapPromise('FetchPlugin', async (request) => {
  return await fetchFromNetwork(request);
});
```

## Tapable 在 Webpack 中的应用

现在让我们看看 Tapable 在 Webpack 中是如何使用的。

### Compiler 中的钩子

```javascript
class Compiler {
  constructor() {
    this.hooks = {
      // 运行前
      beforeRun: new AsyncSeriesHook(['compiler']),
      // 开始运行
      run: new AsyncSeriesHook(['compiler']),
      // 编译完成
      done: new AsyncSeriesHook(['stats']),
      // 编译失败
      failed: new SyncHook(['error']),
      // 监听模式无效化
      invalid: new SyncHook(['filename', 'changeTime']),
      // 开始编译
      compile: new SyncHook(['params']),
      // 创建 compilation
      compilation: new SyncHook(['compilation', 'params']),
      // 生成资源
      emit: new AsyncSeriesHook(['compilation']),
      // 资源输出后
      afterEmit: new AsyncSeriesHook(['compilation'])
    };
  }
}
```

### 插件如何使用钩子

```javascript
class MyPlugin {
  apply(compiler) {
    // 同步钩子使用 tap
    compiler.hooks.compile.tap('MyPlugin', (params) => {
      console.log('编译开始');
    });
    
    // 异步钩子使用 tapAsync 或 tapPromise
    compiler.hooks.emit.tapAsync('MyPlugin', (compilation, callback) => {
      // 在资源输出前做一些处理
      setTimeout(() => {
        console.log('资源即将输出');
        callback();
      }, 100);
    });
    
    // 使用 tapPromise
    compiler.hooks.done.tapPromise('MyPlugin', async (stats) => {
      await uploadStats(stats);
      console.log('构建统计已上传');
    });
  }
}
```

### 执行流程示例

```javascript
class Compiler {
  async run() {
    // 触发 beforeRun 钩子（异步串行）
    await this.hooks.beforeRun.promise(this);
    
    // 触发 run 钩子
    await this.hooks.run.promise(this);
    
    // 触发 compile 钩子（同步）
    this.hooks.compile.call(compilationParams);
    
    // 创建 Compilation
    const compilation = new Compilation(this);
    
    // 触发 compilation 钩子
    this.hooks.compilation.call(compilation, compilationParams);
    
    // 执行编译...
    await this.compile(compilation);
    
    // 触发 emit 钩子
    await this.hooks.emit.promise(compilation);
    
    // 输出文件...
    
    // 触发 afterEmit 钩子
    await this.hooks.afterEmit.promise(compilation);
    
    // 触发 done 钩子
    await this.hooks.done.promise(stats);
  }
}
```

## 拦截器（Interception）

Tapable 支持在钩子执行过程中添加拦截器：

```javascript
hook.intercept({
  // 每次调用 tap 时触发
  register: (tapInfo) => {
    console.log(`注册插件：${tapInfo.name}`);
    return tapInfo;
  },
  
  // 每次调用 call 时触发
  call: (...args) => {
    console.log('钩子被触发，参数：', args);
  },
  
  // 每个回调执行前触发
  tap: (tapInfo) => {
    console.log(`执行插件：${tapInfo.name}`);
  },
  
  // 循环钩子中，每次循环触发
  loop: (...args) => {
    console.log('循环执行');
  }
});
```

拦截器常用于调试和性能分析。

## HookMap

当需要根据不同的 key 创建不同的钩子时，可以使用 `HookMap`：

```javascript
const { HookMap, SyncHook } = require('tapable');

const keyedHooks = new HookMap(() => new SyncHook(['arg']));

// 为不同的 key 订阅
keyedHooks.for('js').tap('Plugin1', (arg) => {
  console.log('处理 JS:', arg);
});

keyedHooks.for('css').tap('Plugin1', (arg) => {
  console.log('处理 CSS:', arg);
});

// 触发特定 key 的钩子
keyedHooks.for('js').call('file.js');  // 处理 JS: file.js
keyedHooks.for('css').call('style.css'); // 处理 CSS: style.css
```

**应用场景**：为不同类型的模块注册不同的处理器。

## 本章小结

- **Tapable** 是 Webpack 插件系统的核心，提供了丰富的钩子类型
- 钩子按执行方式分为：Basic、Bail、Waterfall、Loop
- 钩子按同步/异步分为：Sync、AsyncSeries、AsyncParallel
- 同步钩子使用 `tap` 订阅、`call` 触发
- 异步钩子使用 `tapAsync`/`tapPromise` 订阅、`callAsync`/`promise` 触发
- **拦截器**可用于调试和监控钩子执行
- **HookMap** 用于按 key 管理多个钩子

在下一章，我们将搭建 Mini-Webpack 的开发环境，然后在第二部分开始逐个实现这些钩子。
