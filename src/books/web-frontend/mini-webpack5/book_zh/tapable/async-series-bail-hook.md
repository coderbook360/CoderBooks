# AsyncSeriesBailHook 实现

AsyncSeriesBailHook 结合了 AsyncSeriesHook（串行执行）和 BailHook（熔断）的特性：回调串行执行，任一回调返回非 `undefined` 值时停止。

## 设计目标

```javascript
const hook = new AsyncSeriesBailHook(['request']);

hook.tapPromise('CachePlugin', async (request) => {
  const cached = await getFromCache(request);
  if (cached) {
    return cached; // 命中缓存，熔断
  }
  // 返回 undefined，继续
});

hook.tapPromise('DatabasePlugin', async (request) => {
  const result = await queryDatabase(request);
  if (result) {
    return result;
  }
});

hook.tapPromise('NetworkPlugin', async (request) => {
  return await fetchFromNetwork(request);
});

const result = await hook.promise('/api/data');
```

## 实现

```typescript
// src/tapable/AsyncSeriesBailHook.ts

import { Hook, TapOptions, Tap, Callback } from './Hook';

export class AsyncSeriesBailHook<T extends unknown[], R = unknown> extends Hook<T, R | undefined> {
  constructor(args?: string[]) {
    super(args);
  }

  call(...args: T): never {
    throw new Error('call is not supported on AsyncSeriesBailHook');
  }

  callAsync(...argsWithCallback: [...T, Callback<R | undefined>]): void {
    const callback = argsWithCallback.pop() as Callback<R | undefined>;
    const args = argsWithCallback as unknown as T;

    if (!this._callAsync) {
      this._callAsync = this._createCallAsync();
    }

    this._callAsync.call(this, ...args, callback);
  }

  promise(...args: T): Promise<R | undefined> {
    return new Promise((resolve, reject) => {
      this.callAsync(...args, ((err?: Error | null, result?: R) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      }) as any);
    });
  }

  private _createCallAsync(): (...args: [...T, Callback<R | undefined>]) => void {
    const taps = this.taps;
    const interceptors = this.interceptors;

    if (taps.length === 0) {
      return (...argsWithCallback: [...T, Callback<R | undefined>]): void => {
        const callback = argsWithCallback.pop() as Callback<R | undefined>;
        callback(null, undefined);
      };
    }

    return (...argsWithCallback: [...T, Callback<R | undefined>]): void => {
      const callback = argsWithCallback.pop() as Callback<R | undefined>;
      const args = argsWithCallback as unknown as T;

      for (const interceptor of interceptors) {
        if (interceptor.call) {
          interceptor.call(...args);
        }
      }

      let index = 0;

      const next = (err?: Error | null, result?: R): void => {
        if (err) {
          callback(err);
          return;
        }

        // 熔断：有返回值
        if (result !== undefined) {
          for (const interceptor of interceptors) {
            if (interceptor.result) {
              interceptor.result(result);
            }
          }
          callback(null, result);
          return;
        }

        // 所有回调执行完毕
        if (index >= taps.length) {
          callback(null, undefined);
          return;
        }

        const tap = taps[index++];

        for (const interceptor of interceptors) {
          if (interceptor.tap) {
            interceptor.tap(tap);
          }
        }

        switch (tap.type) {
          case 'sync':
            try {
              const result = tap.fn(...args);
              next(null, result);
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
                (result: R) => next(null, result),
                (err: Error) => next(err)
              );
            } catch (err) {
              next(err as Error);
            }
            break;
        }
      };

      next();
    };
  }
}
```

## 关键区别

与 AsyncSeriesHook 的区别：

```typescript
// AsyncSeriesHook: next 只传递错误
const next = (err?: Error | null): void => {
  if (err) { callback(err); return; }
  // ...
};

// AsyncSeriesBailHook: next 传递错误和结果
const next = (err?: Error | null, result?: R): void => {
  if (err) { callback(err); return; }
  if (result !== undefined) { callback(null, result); return; } // 熔断
  // ...
};
```

## 单元测试

```typescript
// test/tapable/AsyncSeriesBailHook.test.ts

import { describe, it, expect, vi } from 'vitest';
import { AsyncSeriesBailHook } from '../../src/tapable/AsyncSeriesBailHook';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

describe('AsyncSeriesBailHook', () => {
  describe('熔断行为', () => {
    it('返回非 undefined 时应该熔断', async () => {
      const hook = new AsyncSeriesBailHook<[string], string>(['request']);
      const calls: string[] = [];

      hook.tapPromise('Plugin1', async (request) => {
        calls.push('Plugin1');
        return 'result1';
      });

      hook.tapPromise('Plugin2', async (request) => {
        calls.push('Plugin2');
        return 'result2';
      });

      const result = await hook.promise('test');

      expect(result).toBe('result1');
      expect(calls).toEqual(['Plugin1']);
    });

    it('返回 undefined 时应该继续', async () => {
      const hook = new AsyncSeriesBailHook<[], string>([]);
      const calls: string[] = [];

      hook.tapPromise('Plugin1', async () => {
        calls.push('Plugin1');
        return undefined;
      });

      hook.tapPromise('Plugin2', async () => {
        calls.push('Plugin2');
        return 'result2';
      });

      const result = await hook.promise();

      expect(result).toBe('result2');
      expect(calls).toEqual(['Plugin1', 'Plugin2']);
    });

    it('所有返回 undefined 时结果应为 undefined', async () => {
      const hook = new AsyncSeriesBailHook<[], string>([]);

      hook.tapPromise('Plugin1', async () => undefined);
      hook.tapPromise('Plugin2', async () => undefined);

      const result = await hook.promise();
      expect(result).toBe(undefined);
    });
  });

  describe('异步执行', () => {
    it('应该按顺序串行执行', async () => {
      const hook = new AsyncSeriesBailHook<[], string>([]);
      const timestamps: number[] = [];
      const start = Date.now();

      hook.tapPromise('Plugin1', async () => {
        timestamps.push(Date.now() - start);
        await delay(50);
      });

      hook.tapPromise('Plugin2', async () => {
        timestamps.push(Date.now() - start);
        await delay(30);
        return 'result';
      });

      await hook.promise();

      // Plugin2 应该在 Plugin1 完成后才开始
      expect(timestamps[1]).toBeGreaterThanOrEqual(50);
    });
  });

  describe('错误处理', () => {
    it('错误应该停止执行并传递', async () => {
      const hook = new AsyncSeriesBailHook<[], string>([]);
      const error = new Error('Test error');
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
    it('应该回调结果', (done) => {
      const hook = new AsyncSeriesBailHook<[], string>([]);

      hook.tapAsync('Plugin1', (callback) => {
        callback(null, 'result');
      });

      hook.callAsync((err, result) => {
        expect(err).toBeNull();
        expect(result).toBe('result');
        done();
      });
    });
  });

  describe('实际场景', () => {
    it('缓存穿透', async () => {
      const hook = new AsyncSeriesBailHook<[string], object | null>(['key']);
      const cache = new Map([['cached', { data: 'from cache' }]]);
      const database = new Map([['db-key', { data: 'from db' }]]);

      hook.tapPromise('L1Cache', async (key) => {
        return cache.get(key);
      });

      hook.tapPromise('Database', async (key) => {
        const result = database.get(key);
        if (result) {
          cache.set(key, result); // 回填缓存
        }
        return result;
      });

      hook.tapPromise('Default', async () => {
        return null; // 默认值
      });

      expect(await hook.promise('cached')).toEqual({ data: 'from cache' });
      expect(await hook.promise('db-key')).toEqual({ data: 'from db' });
      expect(await hook.promise('not-found')).toBeNull();
    });
  });
});
```

## 本章小结

- AsyncSeriesBailHook 结合了串行执行和熔断特性
- 回调可以通过返回非 `undefined` 值来中断后续执行
- 适用于多级缓存、多数据源查询等场景

下一章将实现 AsyncSeriesWaterfallHook。
