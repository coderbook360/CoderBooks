# AsyncParallelHook 实现：异步并行钩子

从这一章开始，我们进入异步钩子的领域。AsyncParallelHook 是最简单的异步钩子：所有回调**并行执行**，全部完成后才算完成。

## 设计目标

```javascript
const hook = new AsyncParallelHook(['name']);

hook.tapAsync('Plugin1', (name, callback) => {
  setTimeout(() => {
    console.log('Plugin1:', name);
    callback();
  }, 1000);
});

hook.tapPromise('Plugin2', async (name) => {
  await delay(500);
  console.log('Plugin2:', name);
});

hook.tap('Plugin3', (name) => {
  console.log('Plugin3:', name); // 同步回调也支持
});

// 使用 callAsync
hook.callAsync('webpack', (err) => {
  console.log('All done!');
});

// 或使用 promise
await hook.promise('webpack');
console.log('All done!');

// 输出（按完成时间）：
// Plugin3: webpack (立即)
// Plugin2: webpack (500ms)
// Plugin1: webpack (1000ms)
// All done!
```

## 异步钩子基类

在实现 AsyncParallelHook 之前，我们需要扩展 Hook 基类以支持异步操作：

```typescript
// src/tapable/Hook.ts - 扩展

export type Callback<R = void> = (error?: Error | null, result?: R) => void;

export abstract class Hook<T extends unknown[], R = void> {
  // ... 之前的代码

  /**
   * 异步订阅（callback 风格）
   */
  tapAsync(options: string | TapOptions, fn: (...args: [...T, Callback<R>]) => void): void {
    this._tap('async', options, fn);
  }

  /**
   * 异步订阅（Promise 风格）
   */
  tapPromise(options: string | TapOptions, fn: (...args: T) => Promise<R>): void {
    this._tap('promise', options, fn);
  }

  // 缓存编译后的异步函数
  protected _callAsync?: (...args: [...T, Callback<R>]) => void;
  protected _promise?: (...args: T) => Promise<R>;

  /**
   * 异步触发（callback 风格）
   */
  abstract callAsync(...args: [...T, Callback<R>]): void;

  /**
   * 异步触发（Promise 风格）
   */
  abstract promise(...args: T): Promise<R>;

  protected _resetCompilation(): void {
    this._call = undefined;
    this._callAsync = undefined;
    this._promise = undefined;
  }
}
```

## AsyncParallelHook 实现

```typescript
// src/tapable/AsyncParallelHook.ts

import { Hook, TapOptions, Tap, Callback } from './Hook';

export class AsyncParallelHook<T extends unknown[] = []> extends Hook<T, void> {
  constructor(args?: string[]) {
    super(args);
  }

  /**
   * 同步调用不支持
   */
  call(...args: T): never {
    throw new Error('call is not supported on AsyncParallelHook, use callAsync or promise');
  }

  /**
   * 异步触发（callback 风格）
   */
  callAsync(...argsWithCallback: [...T, Callback<void>]): void {
    // 分离参数和回调
    const callback = argsWithCallback.pop() as Callback<void>;
    const args = argsWithCallback as unknown as T;

    if (!this._callAsync) {
      this._callAsync = this._createCallAsync();
    }

    this._callAsync.call(this, ...args, callback);
  }

  /**
   * 异步触发（Promise 风格）
   */
  promise(...args: T): Promise<void> {
    return new Promise((resolve, reject) => {
      this.callAsync(...args, ((err?: Error | null) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }) as any);
    });
  }

  /**
   * 生成 callAsync 函数
   */
  private _createCallAsync(): (...args: [...T, Callback<void>]) => void {
    const taps = this.taps;
    const interceptors = this.interceptors;

    // 无订阅者
    if (taps.length === 0) {
      return (...argsWithCallback: [...T, Callback<void>]): void => {
        const callback = argsWithCallback.pop() as Callback<void>;
        callback();
      };
    }

    return (...argsWithCallback: [...T, Callback<void>]): void => {
      const callback = argsWithCallback.pop() as Callback<void>;
      const args = argsWithCallback as unknown as T;

      // 调用拦截器的 call
      for (const interceptor of interceptors) {
        if (interceptor.call) {
          interceptor.call(...args);
        }
      }

      let remaining = taps.length;
      let hasError = false;

      /**
       * 单个回调完成的处理函数
       */
      const done = (err?: Error | null): void => {
        if (hasError) return; // 已经有错误，忽略后续

        if (err) {
          hasError = true;
          callback(err);
          return;
        }

        remaining--;
        if (remaining === 0) {
          callback();
        }
      };

      // 并行执行所有回调
      for (const tap of taps) {
        // 调用拦截器的 tap
        for (const interceptor of interceptors) {
          if (interceptor.tap) {
            interceptor.tap(tap);
          }
        }

        // 根据类型执行
        switch (tap.type) {
          case 'sync':
            try {
              tap.fn(...args);
              done();
            } catch (err) {
              done(err as Error);
            }
            break;

          case 'async':
            try {
              tap.fn(...args, done);
            } catch (err) {
              done(err as Error);
            }
            break;

          case 'promise':
            try {
              const promise = tap.fn(...args);
              if (!promise || typeof promise.then !== 'function') {
                throw new Error('tapPromise must return a promise');
              }
              promise.then(
                () => done(),
                (err: Error) => done(err)
              );
            } catch (err) {
              done(err as Error);
            }
            break;
        }
      }
    };
  }
}
```

## 关键实现细节

### 三种回调类型统一处理

异步钩子需要处理三种不同类型的回调：

```typescript
switch (tap.type) {
  case 'sync':
    // 同步回调：直接调用，完成后立即 done
    try {
      tap.fn(...args);
      done();
    } catch (err) {
      done(err);
    }
    break;

  case 'async':
    // callback 风格：传入 done 作为回调
    try {
      tap.fn(...args, done);
    } catch (err) {
      done(err);
    }
    break;

  case 'promise':
    // Promise 风格：等待 Promise 完成
    try {
      tap.fn(...args).then(
        () => done(),
        (err) => done(err)
      );
    } catch (err) {
      done(err);
    }
    break;
}
```

### 并行完成计数

使用计数器追踪完成状态：

```typescript
let remaining = taps.length;
let hasError = false;

const done = (err) => {
  if (hasError) return; // 已经出错，忽略后续

  if (err) {
    hasError = true;
    callback(err); // 第一个错误立即回调
    return;
  }

  remaining--;
  if (remaining === 0) {
    callback(); // 全部完成
  }
};
```

### 错误处理策略

AsyncParallelHook 的错误处理策略是：**第一个错误立即回调，但不中断其他正在执行的回调**。

这与 `Promise.all` 的行为类似。

## 单元测试

```typescript
// test/tapable/AsyncParallelHook.test.ts

import { describe, it, expect, vi } from 'vitest';
import { AsyncParallelHook } from '../../src/tapable/AsyncParallelHook';

// 辅助函数
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

describe('AsyncParallelHook', () => {
  describe('callAsync', () => {
    it('应该并行执行所有回调', async () => {
      const hook = new AsyncParallelHook<[string]>(['name']);
      const calls: string[] = [];
      const startTime = Date.now();

      hook.tapAsync('Plugin1', (name, callback) => {
        setTimeout(() => {
          calls.push(`Plugin1:${name}`);
          callback();
        }, 100);
      });

      hook.tapAsync('Plugin2', (name, callback) => {
        setTimeout(() => {
          calls.push(`Plugin2:${name}`);
          callback();
        }, 50);
      });

      await new Promise<void>((resolve) => {
        hook.callAsync('test', () => {
          const elapsed = Date.now() - startTime;
          // 应该约 100ms（并行，取最长）而非 150ms（串行）
          expect(elapsed).toBeLessThan(150);
          expect(elapsed).toBeGreaterThanOrEqual(100);
          resolve();
        });
      });

      // Plugin2 先完成
      expect(calls).toEqual(['Plugin2:test', 'Plugin1:test']);
    });

    it('没有订阅者时应该立即回调', async () => {
      const hook = new AsyncParallelHook<[]>([]);
      const callback = vi.fn();

      hook.callAsync(callback);

      // 应该同步调用
      expect(callback).toHaveBeenCalledWith();
    });
  });

  describe('promise', () => {
    it('应该返回 Promise', async () => {
      const hook = new AsyncParallelHook<[string]>(['name']);
      const calls: string[] = [];

      hook.tapPromise('Plugin1', async (name) => {
        await delay(50);
        calls.push(`Plugin1:${name}`);
      });

      hook.tapPromise('Plugin2', async (name) => {
        await delay(25);
        calls.push(`Plugin2:${name}`);
      });

      await hook.promise('test');

      expect(calls).toEqual(['Plugin2:test', 'Plugin1:test']);
    });

    it('没有订阅者时应该立即 resolve', async () => {
      const hook = new AsyncParallelHook<[]>([]);
      await expect(hook.promise()).resolves.toBeUndefined();
    });
  });

  describe('混合订阅类型', () => {
    it('应该支持 tap、tapAsync、tapPromise 混合', async () => {
      const hook = new AsyncParallelHook<[]>([]);
      const calls: string[] = [];

      hook.tap('Sync', () => {
        calls.push('Sync');
      });

      hook.tapAsync('Async', (callback) => {
        setTimeout(() => {
          calls.push('Async');
          callback();
        }, 50);
      });

      hook.tapPromise('Promise', async () => {
        await delay(25);
        calls.push('Promise');
      });

      await hook.promise();

      // Sync 立即完成，Promise 25ms，Async 50ms
      expect(calls).toEqual(['Sync', 'Promise', 'Async']);
    });
  });

  describe('错误处理', () => {
    it('callAsync 应该在第一个错误时回调', async () => {
      const hook = new AsyncParallelHook<[]>([]);
      const error = new Error('Test error');

      hook.tapAsync('Plugin1', (callback) => {
        setTimeout(() => callback(error), 10);
      });

      hook.tapAsync('Plugin2', (callback) => {
        setTimeout(() => callback(), 50);
      });

      await new Promise<void>((resolve) => {
        hook.callAsync((err) => {
          expect(err).toBe(error);
          resolve();
        });
      });
    });

    it('promise 应该在第一个错误时 reject', async () => {
      const hook = new AsyncParallelHook<[]>([]);
      const error = new Error('Test error');

      hook.tapPromise('Plugin1', async () => {
        await delay(10);
        throw error;
      });

      await expect(hook.promise()).rejects.toBe(error);
    });

    it('同步回调抛出异常应该被捕获', async () => {
      const hook = new AsyncParallelHook<[]>([]);
      const error = new Error('Sync error');

      hook.tap('Plugin1', () => {
        throw error;
      });

      await expect(hook.promise()).rejects.toBe(error);
    });

    it('tapPromise 返回非 Promise 应该报错', async () => {
      const hook = new AsyncParallelHook<[]>([]);

      hook.tapPromise('Plugin1', (() => 'not a promise') as any);

      await expect(hook.promise()).rejects.toThrow('must return a promise');
    });
  });

  describe('拦截器', () => {
    it('应该在开始时触发 call 拦截器', async () => {
      const hook = new AsyncParallelHook<[string]>(['name']);
      const callInterceptor = vi.fn();

      hook.intercept({
        call: callInterceptor
      });

      hook.tapAsync('Plugin1', (name, callback) => callback());

      await hook.promise('test');

      expect(callInterceptor).toHaveBeenCalledWith('test');
    });

    it('应该在每个回调前触发 tap 拦截器', async () => {
      const hook = new AsyncParallelHook<[]>([]);
      const tapInterceptor = vi.fn();

      hook.intercept({
        tap: tapInterceptor
      });

      hook.tapAsync('Plugin1', (callback) => callback());
      hook.tapAsync('Plugin2', (callback) => callback());

      await hook.promise();

      expect(tapInterceptor).toHaveBeenCalledTimes(2);
    });
  });

  describe('call 方法', () => {
    it('应该抛出错误', () => {
      const hook = new AsyncParallelHook<[]>([]);

      expect(() => hook.call()).toThrow('call is not supported');
    });
  });

  describe('实际场景', () => {
    it('并行资源加载', async () => {
      const hook = new AsyncParallelHook<[string[]]>(['resources']);
      const loadedResources: string[] = [];

      // 模拟资源加载
      hook.tapPromise('ResourceLoader', async (resources) => {
        const loads = resources.map(async (resource) => {
          await delay(10); // 模拟网络延迟
          loadedResources.push(resource);
        });
        await Promise.all(loads);
      });

      await hook.promise(['a.js', 'b.css', 'c.png']);

      expect(loadedResources.sort()).toEqual(['a.js', 'b.css', 'c.png']);
    });

    it('并行编译任务', async () => {
      const hook = new AsyncParallelHook<[object]>(['compilation']);
      const tasks: string[] = [];

      hook.tapPromise('TypeScriptCompiler', async () => {
        await delay(30);
        tasks.push('TypeScript');
      });

      hook.tapPromise('SassCompiler', async () => {
        await delay(20);
        tasks.push('Sass');
      });

      hook.tapPromise('ImageOptimizer', async () => {
        await delay(10);
        tasks.push('Image');
      });

      const start = Date.now();
      await hook.promise({});
      const elapsed = Date.now() - start;

      // 并行执行，总时间约等于最长任务
      expect(elapsed).toBeLessThan(50);
      expect(tasks).toEqual(['Image', 'Sass', 'TypeScript']);
    });
  });
});
```

## 与同步钩子的对比

| 特性 | SyncHook | AsyncParallelHook |
|------|----------|-------------------|
| 执行方式 | 同步顺序 | 异步并行 |
| 订阅方法 | tap | tap, tapAsync, tapPromise |
| 触发方法 | call | callAsync, promise |
| 完成时机 | call 返回 | 所有回调完成 |
| 错误处理 | 抛出异常 | callback/reject |

## 本章小结

- AsyncParallelHook 并行执行所有回调
- 支持三种订阅方式：`tap`、`tapAsync`、`tapPromise`
- 支持两种触发方式：`callAsync`、`promise`
- 第一个错误立即回调，但不中断其他回调
- 适用于并行任务处理、资源加载等场景

下一章，我们将实现 AsyncSeriesHook——异步串行钩子。
