# AsyncSeriesWaterfallHook 实现

AsyncSeriesWaterfallHook 结合了 AsyncSeriesHook（串行执行）和 WaterfallHook（值传递）的特性：每个回调的返回值作为下一个回调的第一个参数传递。

## 设计目标

```javascript
const hook = new AsyncSeriesWaterfallHook(['value']);

hook.tapPromise('Parser', async (source) => {
  const ast = await parse(source);
  return ast;
});

hook.tapPromise('Transform', async (ast) => {
  const transformed = await transform(ast);
  return transformed;
});

hook.tapPromise('Codegen', async (ast) => {
  const code = await generate(ast);
  return code;
});

const result = await hook.promise('const x = 1;');
// result: 生成的代码
```

## 实现

```typescript
// src/tapable/AsyncSeriesWaterfallHook.ts

import { Hook, TapOptions, Tap, Callback } from './Hook';

export class AsyncSeriesWaterfallHook<T extends [unknown, ...unknown[]], R = T[0]> extends Hook<T, R> {
  constructor(args?: string[]) {
    super(args);
    if (!args || args.length === 0) {
      throw new Error('AsyncSeriesWaterfallHook requires at least one argument');
    }
  }

  call(...args: T): never {
    throw new Error('call is not supported on AsyncSeriesWaterfallHook');
  }

  callAsync(...argsWithCallback: [...T, Callback<R>]): void {
    const callback = argsWithCallback.pop() as Callback<R>;
    const args = argsWithCallback as unknown as T;

    if (!this._callAsync) {
      this._callAsync = this._createCallAsync();
    }

    this._callAsync.call(this, ...args, callback);
  }

  promise(...args: T): Promise<R> {
    return new Promise((resolve, reject) => {
      this.callAsync(...args, ((err?: Error | null, result?: R) => {
        if (err) {
          reject(err);
        } else {
          resolve(result as R);
        }
      }) as any);
    });
  }

  private _createCallAsync(): (...args: [...T, Callback<R>]) => void {
    const taps = this.taps;
    const interceptors = this.interceptors;

    if (taps.length === 0) {
      return (...argsWithCallback: [...T, Callback<R>]): void => {
        const callback = argsWithCallback.pop() as Callback<R>;
        const args = argsWithCallback as unknown as T;
        callback(null, args[0] as unknown as R);
      };
    }

    return (...argsWithCallback: [...T, Callback<R>]): void => {
      const callback = argsWithCallback.pop() as Callback<R>;
      const args = argsWithCallback as unknown as T;

      for (const interceptor of interceptors) {
        if (interceptor.call) {
          interceptor.call(...args);
        }
      }

      let index = 0;
      let currentValue = args[0]; // 传递的值

      const next = (err?: Error | null, result?: unknown): void => {
        if (err) {
          callback(err);
          return;
        }

        // 更新传递值（只有返回非 undefined 时才更新）
        if (result !== undefined) {
          currentValue = result;
        }

        // 所有回调执行完毕
        if (index >= taps.length) {
          callback(null, currentValue as R);
          return;
        }

        const tap = taps[index++];

        for (const interceptor of interceptors) {
          if (interceptor.tap) {
            interceptor.tap(tap);
          }
        }

        // 构建参数：第一个参数是传递值，其余保持不变
        const tapArgs = [currentValue, ...args.slice(1)] as T;

        switch (tap.type) {
          case 'sync':
            try {
              const result = tap.fn(...tapArgs);
              next(null, result);
            } catch (err) {
              next(err as Error);
            }
            break;

          case 'async':
            try {
              tap.fn(...tapArgs, next);
            } catch (err) {
              next(err as Error);
            }
            break;

          case 'promise':
            try {
              const promise = tap.fn(...tapArgs);
              if (!promise || typeof promise.then !== 'function') {
                throw new Error('tapPromise must return a promise');
              }
              promise.then(
                (result: unknown) => next(null, result),
                (err: Error) => next(err)
              );
            } catch (err) {
              next(err as Error);
            }
            break;
        }
      };

      next(null, currentValue);
    };
  }
}
```

## 关键设计：值的传递

```typescript
let currentValue = args[0]; // 初始值

const next = (err?: Error | null, result?: unknown): void => {
  // 只有返回非 undefined 时才更新
  if (result !== undefined) {
    currentValue = result;
  }

  // 构建下一个回调的参数
  const tapArgs = [currentValue, ...args.slice(1)] as T;
  // ...
};
```

这个设计确保：
1. 初始值从调用参数获取
2. 每个回调可以通过返回值修改传递值
3. 返回 `undefined` 时保持当前值不变
4. 额外参数保持不变

## 单元测试

```typescript
// test/tapable/AsyncSeriesWaterfallHook.test.ts

import { describe, it, expect, vi } from 'vitest';
import { AsyncSeriesWaterfallHook } from '../../src/tapable/AsyncSeriesWaterfallHook';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

describe('AsyncSeriesWaterfallHook', () => {
  describe('值传递', () => {
    it('应该传递和转换值', async () => {
      const hook = new AsyncSeriesWaterfallHook<[number], number>(['value']);

      hook.tapPromise('Add10', async (value) => value + 10);
      hook.tapPromise('Double', async (value) => value * 2);
      hook.tapPromise('Add5', async (value) => value + 5);

      const result = await hook.promise(5);
      expect(result).toBe((5 + 10) * 2 + 5); // 35
    });

    it('返回 undefined 时应该保持当前值', async () => {
      const hook = new AsyncSeriesWaterfallHook<[number], number>(['value']);

      hook.tapPromise('Add10', async (value) => value + 10);
      hook.tapPromise('Log', async (value) => {
        console.log(value);
        return undefined; // 不改变值
      });
      hook.tapPromise('Double', async (value) => value * 2);

      const result = await hook.promise(5);
      expect(result).toBe((5 + 10) * 2); // 30
    });

    it('无订阅时应该返回初始值', async () => {
      const hook = new AsyncSeriesWaterfallHook<[string], string>(['value']);
      const result = await hook.promise('initial');
      expect(result).toBe('initial');
    });
  });

  describe('异步执行', () => {
    it('应该按顺序串行执行', async () => {
      const hook = new AsyncSeriesWaterfallHook<[string], string>(['value']);
      const log: string[] = [];

      hook.tapPromise('First', async (value) => {
        log.push(`First: ${value}`);
        await delay(50);
        return value + '-first';
      });

      hook.tapPromise('Second', async (value) => {
        log.push(`Second: ${value}`);
        await delay(30);
        return value + '-second';
      });

      const result = await hook.promise('start');

      expect(result).toBe('start-first-second');
      expect(log).toEqual([
        'First: start',
        'Second: start-first'
      ]);
    });
  });

  describe('额外参数', () => {
    it('应该保持额外参数不变', async () => {
      const hook = new AsyncSeriesWaterfallHook<[string, number], string>(['value', 'extra']);

      hook.tapPromise('Plugin', async (value, extra) => {
        return value + '-' + extra;
      });

      const result = await hook.promise('start', 42);
      expect(result).toBe('start-42');
    });
  });

  describe('错误处理', () => {
    it('错误应该停止执行', async () => {
      const hook = new AsyncSeriesWaterfallHook<[number], number>(['value']);
      const error = new Error('Test error');
      const fn2 = vi.fn();

      hook.tapPromise('Plugin1', async () => {
        throw error;
      });

      hook.tapPromise('Plugin2', fn2);

      await expect(hook.promise(1)).rejects.toBe(error);
      expect(fn2).not.toHaveBeenCalled();
    });
  });

  describe('混合订阅', () => {
    it('应该支持 sync/async/promise 混合', async () => {
      const hook = new AsyncSeriesWaterfallHook<[number], number>(['value']);

      hook.tap('Sync', (value) => value + 1);
      hook.tapAsync('Async', (value, callback) => {
        setTimeout(() => callback(null, value * 2), 10);
      });
      hook.tapPromise('Promise', async (value) => value + 3);

      const result = await hook.promise(5);
      expect(result).toBe((5 + 1) * 2 + 3); // 15
    });
  });

  describe('实际场景', () => {
    it('编译管道', async () => {
      interface Code {
        source: string;
        ast?: object;
        transformed?: object;
      }

      const hook = new AsyncSeriesWaterfallHook<[Code], Code>(['code']);

      hook.tapPromise('Parse', async (code) => ({
        ...code,
        ast: { type: 'Program', body: [] }
      }));

      hook.tapPromise('Transform', async (code) => ({
        ...code,
        transformed: { ...code.ast, optimized: true }
      }));

      hook.tapPromise('Generate', async (code) => ({
        ...code,
        source: '/* optimized */ ' + code.source
      }));

      const result = await hook.promise({ source: 'const x = 1;' });

      expect(result.source).toContain('/* optimized */');
      expect(result.ast).toBeDefined();
      expect(result.transformed).toBeDefined();
    });
  });
});
```

## 本章小结

- AsyncSeriesWaterfallHook 实现了串行异步的值传递
- 每个回调的返回值作为下一个回调的第一个参数
- 返回 `undefined` 保持当前值不变
- 适用于异步编译管道、数据处理流水线等场景

下一章将实现 HookMap 和 MultiHook。
