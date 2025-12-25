# Interception 拦截器机制

拦截器是 Tapable 的核心增强功能，允许在 Hook 生命周期的关键节点插入自定义逻辑。

## 设计目标

```javascript
hook.intercept({
  // 每次调用 Hook 时触发
  call: (...args) => console.log('Hook 被调用:', args),

  // 每个回调执行前触发
  tap: (tap) => console.log('执行回调:', tap.name),

  // 新回调注册时触发
  register: (tap) => {
    console.log('注册回调:', tap.name);
    return tap; // 可以修改或替换 tap
  },

  // 循环 Hook 每次迭代时触发
  loop: (...args) => console.log('循环迭代'),

  // 获取结果时触发
  result: (result) => console.log('结果:', result),

  // 发生错误时触发
  error: (err) => console.log('错误:', err),

  // Hook 调用完成时触发
  done: () => console.log('调用完成')
});
```

## 拦截器类型定义

```typescript
// src/tapable/Hook.ts (补充)

export interface Interceptor<T extends unknown[], R = unknown> {
  /** Hook.call() 调用时触发，接收调用参数 */
  call?: (...args: T) => void;

  /** 每个 tap 执行前触发，接收 tap 对象 */
  tap?: (tap: Tap<T, R>) => void;

  /** 新 tap 注册时触发，可修改或替换 tap */
  register?: (tap: Tap<T, R>) => Tap<T, R> | undefined;

  /** SyncLoopHook 每次循环开始时触发 */
  loop?: (...args: T) => void;

  /** 获取返回结果时触发 */
  result?: (result: R) => void;

  /** 发生错误时触发 */
  error?: (err: Error) => void;

  /** Hook 调用完成时触发 */
  done?: () => void;
}
```

## 基类中的拦截器集成

```typescript
// src/tapable/Hook.ts (核心实现)

export abstract class Hook<T extends unknown[], R = unknown> {
  protected interceptors: Interceptor<T, R>[] = [];

  /**
   * 注册拦截器
   */
  intercept(interceptor: Interceptor<T, R>): void {
    this.interceptors.push(interceptor);

    // 对已注册的 tap 调用 register 拦截器
    if (interceptor.register) {
      for (let i = 0; i < this.taps.length; i++) {
        const newTap = interceptor.register(this.taps[i]);
        if (newTap !== undefined) {
          this.taps[i] = newTap;
        }
      }
    }

    this._resetCompilation();
  }

  /**
   * 内部：处理 tap 注册时的拦截
   */
  protected _runRegisterInterceptors(tap: Tap<T, R>): Tap<T, R> {
    let finalTap = tap;

    for (const interceptor of this.interceptors) {
      if (interceptor.register) {
        const newTap = interceptor.register(finalTap);
        if (newTap !== undefined) {
          finalTap = newTap;
        }
      }
    }

    return finalTap;
  }

  /**
   * 修改 tap 方法以支持 register 拦截
   */
  tap(nameOrOptions: string | TapOptions, fn: (...args: T) => R): void {
    let options: TapOptions = typeof nameOrOptions === 'string'
      ? { name: nameOrOptions }
      : nameOrOptions;

    let tap: Tap<T, R> = {
      ...options,
      type: 'sync',
      fn
    };

    // 运行 register 拦截器
    tap = this._runRegisterInterceptors(tap);

    this._insert(tap);
  }
}
```

## 在 SyncHook 中集成拦截器

```typescript
// src/tapable/SyncHook.ts (拦截器调用)

call(...args: T): void {
  // call 拦截器
  for (const interceptor of this.interceptors) {
    if (interceptor.call) {
      interceptor.call(...args);
    }
  }

  try {
    for (const tap of this.taps) {
      // tap 拦截器
      for (const interceptor of this.interceptors) {
        if (interceptor.tap) {
          interceptor.tap(tap);
        }
      }

      tap.fn(...args);
    }

    // done 拦截器
    for (const interceptor of this.interceptors) {
      if (interceptor.done) {
        interceptor.done();
      }
    }
  } catch (err) {
    // error 拦截器
    for (const interceptor of this.interceptors) {
      if (interceptor.error) {
        interceptor.error(err as Error);
      }
    }
    throw err;
  }
}
```

## 在 SyncBailHook 中集成 result 拦截器

```typescript
// src/tapable/SyncBailHook.ts (result 拦截器)

call(...args: T): R | undefined {
  for (const interceptor of this.interceptors) {
    if (interceptor.call) {
      interceptor.call(...args);
    }
  }

  for (const tap of this.taps) {
    for (const interceptor of this.interceptors) {
      if (interceptor.tap) {
        interceptor.tap(tap);
      }
    }

    const result = tap.fn(...args);
    if (result !== undefined) {
      // result 拦截器
      for (const interceptor of this.interceptors) {
        if (interceptor.result) {
          interceptor.result(result);
        }
      }
      return result;
    }
  }

  return undefined;
}
```

## 在 SyncLoopHook 中集成 loop 拦截器

```typescript
// src/tapable/SyncLoopHook.ts (loop 拦截器)

call(...args: T): void {
  for (const interceptor of this.interceptors) {
    if (interceptor.call) {
      interceptor.call(...args);
    }
  }

  let looping = true;
  while (looping) {
    looping = false;

    // loop 拦截器
    for (const interceptor of this.interceptors) {
      if (interceptor.loop) {
        interceptor.loop(...args);
      }
    }

    for (const tap of this.taps) {
      for (const interceptor of this.interceptors) {
        if (interceptor.tap) {
          interceptor.tap(tap);
        }
      }

      const result = tap.fn(...args);
      if (result !== undefined) {
        looping = true;
        break;
      }
    }
  }

  for (const interceptor of this.interceptors) {
    if (interceptor.done) {
      interceptor.done();
    }
  }
}
```

## 单元测试

```typescript
// test/tapable/Interception.test.ts

import { describe, it, expect, vi } from 'vitest';
import { SyncHook } from '../../src/tapable/SyncHook';
import { SyncBailHook } from '../../src/tapable/SyncBailHook';
import { SyncLoopHook } from '../../src/tapable/SyncLoopHook';

describe('Interception', () => {
  describe('call 拦截器', () => {
    it('应该在调用时触发', () => {
      const hook = new SyncHook<[string]>(['arg']);
      const callFn = vi.fn();

      hook.intercept({ call: callFn });
      hook.tap('Plugin', () => {});
      hook.call('test');

      expect(callFn).toHaveBeenCalledWith('test');
    });

    it('应该在所有回调之前触发', () => {
      const hook = new SyncHook<[string]>(['arg']);
      const order: string[] = [];

      hook.intercept({ call: () => order.push('call') });
      hook.tap('Plugin', () => order.push('tap'));
      hook.call('test');

      expect(order).toEqual(['call', 'tap']);
    });
  });

  describe('tap 拦截器', () => {
    it('应该在每个回调执行前触发', () => {
      const hook = new SyncHook<[string]>(['arg']);
      const tapFn = vi.fn();

      hook.intercept({ tap: tapFn });
      hook.tap('Plugin1', () => {});
      hook.tap('Plugin2', () => {});
      hook.call('test');

      expect(tapFn).toHaveBeenCalledTimes(2);
      expect(tapFn.mock.calls[0][0].name).toBe('Plugin1');
      expect(tapFn.mock.calls[1][0].name).toBe('Plugin2');
    });
  });

  describe('register 拦截器', () => {
    it('应该在注册时触发', () => {
      const hook = new SyncHook<[string]>(['arg']);
      const registerFn = vi.fn((tap) => tap);

      hook.intercept({ register: registerFn });
      hook.tap('Plugin', () => {});

      expect(registerFn).toHaveBeenCalledTimes(1);
      expect(registerFn.mock.calls[0][0].name).toBe('Plugin');
    });

    it('应该能修改 tap', () => {
      const hook = new SyncHook<[string]>(['arg']);
      const modified = vi.fn();

      hook.intercept({
        register: (tap) => ({
          ...tap,
          fn: modified
        })
      });

      hook.tap('Plugin', () => {});
      hook.call('test');

      expect(modified).toHaveBeenCalled();
    });

    it('后注册的拦截器应该应用到已有 tap', () => {
      const hook = new SyncHook<[string]>(['arg']);
      const registerFn = vi.fn((tap) => tap);

      hook.tap('Plugin', () => {});
      hook.intercept({ register: registerFn });

      expect(registerFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('result 拦截器', () => {
    it('应该在获取结果时触发', () => {
      const hook = new SyncBailHook<[string], string>(['arg']);
      const resultFn = vi.fn();

      hook.intercept({ result: resultFn });
      hook.tap('Plugin', () => 'result');
      hook.call('test');

      expect(resultFn).toHaveBeenCalledWith('result');
    });
  });

  describe('loop 拦截器', () => {
    it('应该在每次循环开始时触发', () => {
      const hook = new SyncLoopHook<[number]>(['count']);
      const loopFn = vi.fn();
      let counter = 0;

      hook.intercept({ loop: loopFn });
      hook.tap('Counter', (count) => {
        counter++;
        return counter < 3 ? true : undefined;
      });
      hook.call(0);

      expect(loopFn).toHaveBeenCalledTimes(3);
    });
  });

  describe('error 拦截器', () => {
    it('应该在错误时触发', () => {
      const hook = new SyncHook<[string]>(['arg']);
      const errorFn = vi.fn();
      const error = new Error('Test error');

      hook.intercept({ error: errorFn });
      hook.tap('Plugin', () => { throw error; });

      expect(() => hook.call('test')).toThrow(error);
      expect(errorFn).toHaveBeenCalledWith(error);
    });
  });

  describe('done 拦截器', () => {
    it('应该在完成时触发', () => {
      const hook = new SyncHook<[string]>(['arg']);
      const doneFn = vi.fn();

      hook.intercept({ done: doneFn });
      hook.tap('Plugin', () => {});
      hook.call('test');

      expect(doneFn).toHaveBeenCalled();
    });
  });

  describe('多个拦截器', () => {
    it('应该按注册顺序执行', () => {
      const hook = new SyncHook<[string]>(['arg']);
      const order: number[] = [];

      hook.intercept({ call: () => order.push(1) });
      hook.intercept({ call: () => order.push(2) });
      hook.intercept({ call: () => order.push(3) });

      hook.tap('Plugin', () => {});
      hook.call('test');

      expect(order).toEqual([1, 2, 3]);
    });
  });
});
```

## 实际应用：性能监控

```typescript
// 创建性能监控拦截器
function createPerformanceInterceptor(hookName: string) {
  return {
    call: (...args: unknown[]) => {
      console.log(`[${hookName}] 开始执行`);
      console.time(hookName);
    },
    tap: (tap: { name: string }) => {
      console.log(`[${hookName}] 执行插件: ${tap.name}`);
    },
    done: () => {
      console.timeEnd(hookName);
    },
    error: (err: Error) => {
      console.error(`[${hookName}] 错误:`, err.message);
    }
  };
}

// 使用
compiler.hooks.compile.intercept(
  createPerformanceInterceptor('compile')
);
```

## 实际应用：调试工具

```typescript
// 创建调试拦截器
function createDebugInterceptor() {
  return {
    register: (tap) => {
      const originalFn = tap.fn;
      return {
        ...tap,
        fn: (...args) => {
          console.log(`[DEBUG] ${tap.name} 输入:`, args);
          const result = originalFn(...args);
          console.log(`[DEBUG] ${tap.name} 输出:`, result);
          return result;
        }
      };
    }
  };
}
```

## 本章小结

- 拦截器提供了 Hook 生命周期的完整控制
- `call`/`tap`/`register`/`loop`/`result`/`error`/`done` 覆盖了所有关键节点
- `register` 拦截器可以修改或替换 tap，是最强大的拦截点
- 拦截器适用于性能监控、调试、日志等横切关注点

至此，Tapable 事件系统的核心实现已完成。下一部分将进入 Compiler 核心实现。
