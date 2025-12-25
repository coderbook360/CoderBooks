# Tapable 设计理念与架构

从这一章开始，我们将深入实现 Tapable 事件系统。Tapable 是 Webpack 插件架构的基石，理解并实现它，将帮助我们彻底掌握 Webpack 的扩展机制。

## 设计目标

在动手实现之前，让我们先明确 Tapable 的设计目标：

**1. 支持多种执行模式**

不同场景需要不同的执行策略：
- 简单通知：所有回调依次执行
- 竞争处理：第一个返回结果的回调获胜
- 数据传递：回调之间传递处理结果
- 重复执行：满足条件前循环执行

**2. 支持同步和异步**

现代 JavaScript 充斥着异步操作。Tapable 需要优雅地处理：
- 同步回调
- callback 风格的异步
- Promise 风格的异步

**3. 高性能**

Webpack 构建过程中，钩子会被触发成千上万次。Tapable 需要尽可能高效：
- 避免不必要的对象创建
- 减少函数调用开销
- 使用代码生成优化热路径

**4. 类型安全**

现代开发需要良好的类型支持：
- 参数类型检查
- 返回值类型推导
- IDE 自动补全支持

## 核心设计决策

### 决策一：Hook 作为独立对象

为什么不直接在类上定义方法，而要使用独立的 Hook 对象？

```javascript
// 方案 A：直接在类上定义
class Compiler {
  onBeforeRun(callback) { }
  onRun(callback) { }
  onDone(callback) { }
}

// 方案 B：使用 Hook 对象
class Compiler {
  constructor() {
    this.hooks = {
      beforeRun: new AsyncSeriesHook(['compiler']),
      run: new AsyncSeriesHook(['compiler']),
      done: new AsyncSeriesHook(['stats'])
    };
  }
}
```

方案 B 的优势：

1. **关注点分离**：Hook 的实现与业务类解耦
2. **灵活组合**：同一类可以使用不同类型的 Hook
3. **统一接口**：所有 Hook 有一致的 tap/call 接口
4. **易于扩展**：添加新的 Hook 类型不影响业务类

### 决策二：工厂函数 vs 类

Tapable 使用类而非工厂函数：

```javascript
// 使用类
const hook = new SyncHook(['arg1', 'arg2']);

// 而非工厂函数
const hook = createSyncHook(['arg1', 'arg2']);
```

使用类的原因：

1. **明确的类型标识**：`hook instanceof SyncHook`
2. **原型链复用**：方法在原型上共享，节省内存
3. **继承关系清晰**：所有 Hook 继承自基类

### 决策三：代码生成

这是 Tapable 最巧妙的设计。来看一个对比：

**常规实现**：

```javascript
class SyncHook {
  call(...args) {
    for (const tap of this.taps) {
      tap.fn.apply(null, args);
    }
  }
}
```

**代码生成实现**：

```javascript
class SyncHook {
  call(...args) {
    // 动态生成的函数
    const fn = new Function('arg1', 'arg2', `
      var _x = this._x;
      _x[0](arg1, arg2);
      _x[1](arg1, arg2);
      _x[2](arg1, arg2);
    `);
    return fn.apply(this, args);
  }
}
```

代码生成的优势：

1. **消除循环开销**：展开循环，直接调用
2. **内联参数**：避免 apply/spread 开销
3. **JIT 优化友好**：生成的代码更容易被 V8 优化

当然，代码生成也有代价：首次调用需要编译。Tapable 通过缓存编译结果来平衡。

## 架构概览

Tapable 的架构分为三层：

```
┌─────────────────────────────────────────────────────┐
│                    Hook 子类                         │
│  SyncHook  SyncBailHook  AsyncSeriesHook  ...       │
└─────────────────────────────────────────────────────┘
                          ▲
                          │ 继承
┌─────────────────────────────────────────────────────┐
│                    Hook 基类                         │
│  - tap() / tapAsync() / tapPromise()               │
│  - call() / callAsync() / promise()                │
│  - intercept()                                      │
└─────────────────────────────────────────────────────┘
                          │ 使用
                          ▼
┌─────────────────────────────────────────────────────┐
│               HookCodeFactory                       │
│  - 动态生成 call/callAsync/promise 函数             │
│  - 根据 Hook 类型生成不同的执行逻辑                  │
└─────────────────────────────────────────────────────┘
```

### Hook 基类

Hook 基类定义了所有钩子共有的行为：

```typescript
abstract class Hook<T extends unknown[], R> {
  // 存储订阅的回调
  protected taps: Tap<T, R>[] = [];
  
  // 参数名列表（用于代码生成）
  protected args: string[];
  
  // 拦截器
  protected interceptors: Interceptor<T, R>[] = [];
  
  // 编译后的调用函数
  protected _call?: (...args: T) => R;
  protected _callAsync?: (...args: [...T, Callback<R>]) => void;
  protected _promise?: (...args: T) => Promise<R>;
  
  // 订阅方法
  tap(name: string | TapOptions, fn: (...args: T) => R): void;
  tapAsync(name: string | TapOptions, fn: (...args: [...T, Callback<R>]) => void): void;
  tapPromise(name: string | TapOptions, fn: (...args: T) => Promise<R>): void;
  
  // 触发方法（由子类实现具体逻辑）
  abstract call(...args: T): R;
  abstract callAsync(...args: [...T, Callback<R>]): void;
  abstract promise(...args: T): Promise<R>;
  
  // 拦截器
  intercept(interceptor: Interceptor<T, R>): void;
  
  // 编译（生成执行函数）
  protected abstract compile(options: CompileOptions): Function;
}
```

### Hook 子类

每个 Hook 子类定义自己的执行逻辑：

```typescript
class SyncHook<T extends unknown[]> extends Hook<T, void> {
  // SyncHook 不支持异步订阅
  tapAsync(): never {
    throw new Error('tapAsync is not supported on SyncHook');
  }
  
  tapPromise(): never {
    throw new Error('tapPromise is not supported on SyncHook');
  }
  
  // 实现编译逻辑
  protected compile(options: CompileOptions): Function {
    // 生成顺序调用所有回调的代码
  }
}
```

### HookCodeFactory

代码生成工厂，根据 Hook 类型生成不同的执行代码：

```typescript
class HookCodeFactory {
  // 生成 call 函数的代码
  create(options: CreateOptions): Function {
    const code = this.generateCode(options);
    return new Function(...this.args, code);
  }
  
  // 根据 Hook 类型生成不同的代码
  protected generateCode(options: CreateOptions): string {
    switch (options.type) {
      case 'sync':
        return this.generateSyncCode(options);
      case 'async':
        return this.generateAsyncCode(options);
      case 'promise':
        return this.generatePromiseCode(options);
    }
  }
}
```

## 我们的实现策略

为了便于理解，我们的 Mini-Tapable 实现将采用**简化策略**：

1. **先实现功能，再优化性能**：首先使用常规循环实现，确保正确性
2. **逐步添加代码生成**：在理解原理后，添加代码生成优化
3. **保持类型安全**：使用 TypeScript 提供类型检查

## 类型定义

让我们定义基础类型：

```typescript
// 回调选项
interface TapOptions {
  name: string;
  stage?: number;      // 执行顺序，数字越小越先执行
  before?: string | string[];  // 在指定插件之前执行
}

// 回调信息
interface Tap<T extends unknown[], R> {
  type: 'sync' | 'async' | 'promise';
  name: string;
  fn: (...args: any[]) => any;
  stage: number;
  before?: string | string[];
}

// 回调函数类型
type Callback<R> = (error: Error | null, result?: R) => void;

// 拦截器
interface Interceptor<T extends unknown[], R> {
  // 每次 tap 时调用
  register?: (tap: Tap<T, R>) => Tap<T, R>;
  // 每次 call 时调用
  call?: (...args: T) => void;
  // 每个回调执行前调用
  tap?: (tap: Tap<T, R>) => void;
  // 循环钩子中，每次循环调用
  loop?: (...args: T) => void;
  // 出错时调用
  error?: (error: Error) => void;
  // 完成时调用
  done?: () => void;
  // 返回结果时调用
  result?: (result: R) => void;
}
```

## 实现路线图

接下来的章节将按以下顺序实现：

1. **SyncHook**：最基础的同步钩子
2. **SyncBailHook**：带熔断的同步钩子
3. **SyncWaterfallHook**：瀑布流同步钩子
4. **SyncLoopHook**：循环同步钩子
5. **AsyncParallelHook**：异步并行钩子
6. **AsyncSeriesHook**：异步串行钩子
7. **AsyncSeriesBailHook**：异步串行熔断钩子
8. **AsyncSeriesWaterfallHook**：异步串行瀑布流钩子
9. **HookMap 与 MultiHook**：钩子集合
10. **Interception**：拦截器机制

每个实现都将包含：
- 设计思路分析
- 核心代码实现
- 单元测试验证
- 与官方实现的对比

## 本章小结

- Tapable 的设计目标：多执行模式、同步/异步支持、高性能、类型安全
- 核心设计决策：Hook 作为独立对象、使用类、代码生成优化
- 三层架构：Hook 子类 → Hook 基类 → HookCodeFactory
- 我们将采用简化策略：先功能后性能，保持类型安全

下一章，我们将实现第一个钩子：SyncHook。
