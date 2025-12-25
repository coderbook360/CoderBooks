# AsyncSeriesHook 实现：异步串行钩子

AsyncSeriesHook 按顺序**串行执行**所有回调，每个回调完成后才执行下一个。这是 Webpack 中最常用的异步钩子类型。

## 设计目标

```javascript
const hook = new AsyncSeriesHook(['compiler']);

hook.tapAsync('InitPlugin', (compiler, callback) => {
  console.log('1. 初始化开始');
  setTimeout(() => {
    console.log('1. 初始化完成');
    callback();
  }, 100);
});

hook.tapPromise('LoadPlugin', async (compiler) => {
  console.log('2. 加载开始');
  await delay(50);
  console.log('2. 加载完成');
});

hook.tap('SyncPlugin', (compiler) => {
  console.log('3. 同步处理');
});

await hook.promise(compiler);
console.log('全部完成');

// 输出（严格按顺序）：
// 1. 初始化开始
// 1. 初始化完成
// 2. 加载开始
// 2. 加载完成
// 3. 同步处理
// 全部完成
```

## 实现

```typescript
// src/tapable/AsyncSeriesHook.ts

import { Hook, TapOptions, Tap, Callback } from './Hook';

export class AsyncSeriesHook<T extends unknown[] = []> extends Hook<T, void> {
  constructor(args?: string[]) {
    super(args);
  }

  /**
   * 同步调用不支持
   */
  call(...args: T): never {
    throw new Error('call is not supported on AsyncSeriesHook, use callAsync or promise');
  }

  /**
   * 异步触发（callback 风格）
   */
  callAsync(...argsWithCallback: [...T, Callback<void>]): void {
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

      let index = 0;

      /**
       * 执行下一个回调
       */
      const next = (err?: Error | null): void => {
        if (err) {
          callback(err);
          return;
        }

        // 所有回调执行完毕
        if (index >= taps.length) {
          callback();
          return;
        }

        const tap = taps[index++];

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
              next();
            } catch (err) {
              next(err as Error);
            }
            break;

          case 'async':
            try {
              tap.fn(...args, next);
            } catch (err) {
              next(err as Error);
            }
            break;

          case 'promise':
            try {
              const promise = tap.fn(...args);
              if (!promise || typeof promise.then !== 'function') {
                throw new Error('tapPromise must return a promise');
              }
              promise.then(
                () => next(),
                (err: Error) => next(err)
              );
            } catch (err) {
              next(err as Error);
            }
            break;
        }
      };

      // 开始执行第一个
      next();
    };
  }
}
```

## 与 AsyncParallelHook 的对比

关键区别在于执行方式：

**AsyncParallelHook**：同时启动所有回调

```typescript
// 并行：同时启动所有
for (const tap of taps) {
  executeTap(tap, done);
}
```

**AsyncSeriesHook**：等待上一个完成后再启动下一个

```typescript
// 串行：递归调用
const next = () => {
  if (index >= taps.length) {
    callback();
    return;
  }
  const tap = taps[index++];
  executeTap(tap, next);
};
next();
```

## 单元测试

```typescript
// test/tapable/AsyncSeriesHook.test.ts

import { describe, it, expect, vi } from 'vitest';
import { AsyncSeriesHook } from '../../src/tapable/AsyncSeriesHook';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

describe('AsyncSeriesHook', () => {
  describe('串行执行', () => {
    it('应该按顺序执行回调', async () => {
      const hook = new AsyncSeriesHook<[string]>(['name']);
      const calls: string[] = [];

      hook.tapAsync('Plugin1', (name, callback) => {
        setTimeout(() => {
          calls.push('Plugin1');
          callback();
        }, 50);
      });

      hook.tapAsync('Plugin2', (name, callback) => {
        setTimeout(() => {
          calls.push('Plugin2');
          callback();
        }, 10);
      });

      await hook.promise('test');

      // Plugin1 虽然延迟更长，但先完成（因为串行）
      expect(calls).toEqual(['Plugin1', 'Plugin2']);
    });

    it('应该等待前一个完成后再执行下一个', async () => {
      const hook = new AsyncSeriesHook<[]>([]);
      const startTimes: number[] = [];
      const endTimes: number[] = [];
      const start = Date.now();

      hook.tapPromise('Plugin1', async () => {
        startTimes.push(Date.now() - start);
        await delay(50);
        endTimes.push(Date.now() - start);
      });

      hook.tapPromise('Plugin2', async () => {
        startTimes.push(Date.now() - start);
        await delay(30);
        endTimes.push(Date.now() - start);
      });

      await hook.promise();

      // Plugin2 应该在 Plugin1 完成后才开始
      expect(startTimes[1]).toBeGreaterThanOrEqual(endTimes[0]);
    });

    it('没有订阅者时应该立即完成', async () => {
      const hook = new AsyncSeriesHook<[]>([]);
      await expect(hook.promise()).resolves.toBeUndefined();
    });
  });

  describe('混合订阅类型', () => {
    it('应该正确处理 tap、tapAsync、tapPromise 混合', async () => {
      const hook = new AsyncSeriesHook<[]>([]);
      const calls: string[] = [];

      hook.tap('Sync', () => {
        calls.push('Sync');
      });

      hook.tapAsync('Async', (callback) => {
        setTimeout(() => {
          calls.push('Async');
          callback();
        }, 20);
      });

      hook.tapPromise('Promise', async () => {
        await delay(10);
        calls.push('Promise');
      });

      await hook.promise();

      expect(calls).toEqual(['Sync', 'Async', 'Promise']);
    });
  });

  describe('错误处理', () => {
    it('应该在错误时停止执行后续回调', async () => {
      const hook = new AsyncSeriesHook<[]>([]);
      const calls: string[] = [];
      const error = new Error('Test error');

      hook.tapAsync('Plugin1', (callback) => {
        calls.push('Plugin1');
        callback();
      });

      hook.tapAsync('Plugin2', (callback) => {
        calls.push('Plugin2');
        callback(error);
      });

      hook.tapAsync('Plugin3', (callback) => {
        calls.push('Plugin3');
        callback();
      });

      await expect(hook.promise()).rejects.toBe(error);
      expect(calls).toEqual(['Plugin1', 'Plugin2']); // Plugin3 未执行
    });

    it('同步回调抛出异常应该停止执行', async () => {
      const hook = new AsyncSeriesHook<[]>([]);
      const error = new Error('Sync error');
      const fn2 = vi.fn();

      hook.tap('Plugin1', () => {
        throw error;
      });

      hook.tap('Plugin2', fn2);

      await expect(hook.promise()).rejects.toBe(error);
      expect(fn2).not.toHaveBeenCalled();
    });

    it('Promise 拒绝应该停止执行', async () => {
      const hook = new AsyncSeriesHook<[]>([]);
      const error = new Error('Promise error');
      const fn2 = vi.fn();

      hook.tapPromise('Plugin1', async () => {
        throw error;
      });

      hook.tapPromise('Plugin2', fn2);

      await expect(hook.promise()).rejects.toBe(error);
      expect(fn2).not.toHaveBeenCalled();
    });
  });

  describe('callAsync', () => {
    it('应该正确回调', (done) => {
      const hook = new AsyncSeriesHook<[string]>(['name']);
      const calls: string[] = [];

      hook.tapAsync('Plugin1', (name, callback) => {
        calls.push(name);
        callback();
      });

      hook.callAsync('test', (err) => {
        expect(err).toBeUndefined();
        expect(calls).toEqual(['test']);
        done();
      });
    });

    it('应该在错误时回调错误', (done) => {
      const hook = new AsyncSeriesHook<[]>([]);
      const error = new Error('Test');

      hook.tapAsync('Plugin1', (callback) => {
        callback(error);
      });

      hook.callAsync((err) => {
        expect(err).toBe(error);
        done();
      });
    });
  });

  describe('拦截器', () => {
    it('应该在开始时触发 call 拦截器一次', async () => {
      const hook = new AsyncSeriesHook<[]>([]);
      const callInterceptor = vi.fn();

      hook.intercept({ call: callInterceptor });

      hook.tapAsync('Plugin1', (cb) => cb());
      hook.tapAsync('Plugin2', (cb) => cb());

      await hook.promise();

      expect(callInterceptor).toHaveBeenCalledTimes(1);
    });

    it('应该在每个回调执行前触发 tap 拦截器', async () => {
      const hook = new AsyncSeriesHook<[]>([]);
      const tapInterceptor = vi.fn();

      hook.intercept({ tap: tapInterceptor });

      hook.tapAsync('Plugin1', (cb) => cb());
      hook.tapAsync('Plugin2', (cb) => cb());

      await hook.promise();

      expect(tapInterceptor).toHaveBeenCalledTimes(2);
      expect(tapInterceptor.mock.calls[0][0].name).toBe('Plugin1');
      expect(tapInterceptor.mock.calls[1][0].name).toBe('Plugin2');
    });
  });

  describe('实际场景', () => {
    it('Webpack 构建流程', async () => {
      const hook = new AsyncSeriesHook<[object]>(['compiler']);
      const phases: string[] = [];

      hook.tapPromise('InitPlugin', async () => {
        phases.push('init:start');
        await delay(10);
        phases.push('init:end');
      });

      hook.tapPromise('CompilePlugin', async () => {
        phases.push('compile:start');
        await delay(20);
        phases.push('compile:end');
      });

      hook.tapPromise('EmitPlugin', async () => {
        phases.push('emit:start');
        await delay(5);
        phases.push('emit:end');
      });

      await hook.promise({});

      expect(phases).toEqual([
        'init:start',
        'init:end',
        'compile:start',
        'compile:end',
        'emit:start',
        'emit:end'
      ]);
    });

    it('数据库事务', async () => {
      const hook = new AsyncSeriesHook<[object]>(['transaction']);
      const operations: string[] = [];

      hook.tapPromise('BeginTransaction', async (tx: any) => {
        operations.push('BEGIN');
        tx.active = true;
      });

      hook.tapPromise('InsertData', async (tx: any) => {
        if (!tx.active) throw new Error('No active transaction');
        operations.push('INSERT');
      });

      hook.tapPromise('UpdateData', async (tx: any) => {
        if (!tx.active) throw new Error('No active transaction');
        operations.push('UPDATE');
      });

      hook.tapPromise('CommitTransaction', async (tx: any) => {
        operations.push('COMMIT');
        tx.active = false;
      });

      const tx = { active: false };
      await hook.promise(tx);

      expect(operations).toEqual(['BEGIN', 'INSERT', 'UPDATE', 'COMMIT']);
      expect(tx.active).toBe(false);
    });
  });
});
```

## 性能比较

```javascript
// 场景：3 个任务，每个耗时 100ms

// AsyncParallelHook
// 总时间 ≈ 100ms（并行）

// AsyncSeriesHook
// 总时间 ≈ 300ms（串行）
```

选择依据：
- **有依赖关系**：使用 AsyncSeriesHook
- **无依赖关系**：使用 AsyncParallelHook
- **Webpack 构建流程**：大多使用 AsyncSeriesHook（阶段间有依赖）

## 本章小结

- AsyncSeriesHook 按顺序串行执行所有回调
- 每个回调完成后才执行下一个
- 错误会中断后续回调的执行
- 支持 tap、tapAsync、tapPromise 三种订阅方式
- 适用于有依赖关系的异步任务流程

下一章，我们将实现 AsyncSeriesBailHook——异步串行熔断钩子。
