# SyncHook 实现：同步钩子

SyncHook 是 Tapable 中最基础的钩子类型。理解它的实现，是掌握整个 Tapable 体系的第一步。

## 设计目标

SyncHook 的行为非常简单：

1. 多个回调按注册顺序依次执行
2. 回调的返回值被忽略
3. 只支持同步回调

```javascript
const hook = new SyncHook(['name', 'age']);

hook.tap('Plugin1', (name, age) => {
  console.log('Plugin1:', name, age);
  return 'ignored'; // 返回值被忽略
});

hook.tap('Plugin2', (name, age) => {
  console.log('Plugin2:', name, age);
});

hook.call('webpack', 5);
// Plugin1: webpack 5
// Plugin2: webpack 5
```

## Hook 基类

在实现 SyncHook 之前，我们先创建 Hook 基类：

```typescript
// src/tapable/Hook.ts

export interface TapOptions {
  name: string;
  stage?: number;
  before?: string | string[];
}

export interface Tap<T extends unknown[], R> {
  type: 'sync' | 'async' | 'promise';
  name: string;
  fn: (...args: any[]) => any;
  stage: number;
  before?: string | string[];
}

export interface Interceptor<T extends unknown[], R> {
  register?: (tap: Tap<T, R>) => Tap<T, R>;
  call?: (...args: T) => void;
  tap?: (tap: Tap<T, R>) => void;
  loop?: (...args: T) => void;
  error?: (error: Error) => void;
  done?: () => void;
  result?: (result: R) => void;
}

export abstract class Hook<T extends unknown[], R = void> {
  protected taps: Tap<T, R>[] = [];
  protected interceptors: Interceptor<T, R>[] = [];
  protected args: string[];
  
  // 缓存编译后的函数
  protected _call?: (...args: T) => R;

  constructor(args: string[] = []) {
    this.args = args;
  }

  /**
   * 同步订阅
   */
  tap(options: string | TapOptions, fn: (...args: T) => R): void {
    this._tap('sync', options, fn);
  }

  /**
   * 内部订阅实现
   */
  protected _tap(
    type: 'sync' | 'async' | 'promise',
    options: string | TapOptions,
    fn: (...args: any[]) => any
  ): void {
    // 标准化选项
    const tapOptions: TapOptions = typeof options === 'string' 
      ? { name: options } 
      : options;

    // 创建 Tap 对象
    let tap: Tap<T, R> = {
      type,
      name: tapOptions.name,
      fn,
      stage: tapOptions.stage ?? 0,
      before: tapOptions.before
    };

    // 调用拦截器的 register
    for (const interceptor of this.interceptors) {
      if (interceptor.register) {
        const newTap = interceptor.register(tap);
        if (newTap !== undefined) {
          tap = newTap;
        }
      }
    }

    // 插入到正确的位置
    this._insert(tap);
    
    // 清除缓存的编译函数
    this._resetCompilation();
  }

  /**
   * 按 stage 和 before 排序插入
   */
  protected _insert(tap: Tap<T, R>): void {
    let insertIndex = this.taps.length;
    
    // 处理 before 选项
    let before: Set<string> | undefined;
    if (tap.before) {
      before = new Set(
        Array.isArray(tap.before) ? tap.before : [tap.before]
      );
    }
    
    // 找到正确的插入位置
    for (let i = this.taps.length - 1; i >= 0; i--) {
      const existingTap = this.taps[i];
      
      // 如果需要在某个插件之前，找到那个插件
      if (before && before.has(existingTap.name)) {
        insertIndex = i;
        continue;
      }
      
      // 按 stage 排序
      if (existingTap.stage <= tap.stage) {
        insertIndex = i + 1;
        break;
      }
      
      insertIndex = i;
    }
    
    this.taps.splice(insertIndex, 0, tap);
  }

  /**
   * 重置编译缓存
   */
  protected _resetCompilation(): void {
    this._call = undefined;
  }

  /**
   * 添加拦截器
   */
  intercept(interceptor: Interceptor<T, R>): void {
    this.interceptors.push(interceptor);
    this._resetCompilation();
  }

  /**
   * 检查是否有订阅者
   */
  isUsed(): boolean {
    return this.taps.length > 0 || this.interceptors.length > 0;
  }

  /**
   * 调用钩子（由子类实现）
   */
  abstract call(...args: T): R;
}
```

这个基类实现了：
- `tap()` 方法用于订阅
- `_insert()` 方法处理插入排序（支持 stage 和 before）
- `intercept()` 方法添加拦截器
- 编译缓存管理

## SyncHook 实现

现在来实现 SyncHook：

```typescript
// src/tapable/SyncHook.ts

import { Hook, TapOptions, Tap, Interceptor } from './Hook';

export class SyncHook<T extends unknown[] = []> extends Hook<T, void> {
  constructor(args?: string[]) {
    super(args);
  }

  /**
   * 禁用异步订阅
   */
  tapAsync(options: string | TapOptions, fn: Function): never {
    throw new Error('tapAsync is not supported on SyncHook');
  }

  tapPromise(options: string | TapOptions, fn: Function): never {
    throw new Error('tapPromise is not supported on SyncHook');
  }

  /**
   * 触发钩子
   */
  call(...args: T): void {
    // 如果有缓存的编译函数，直接使用
    if (this._call) {
      return this._call.apply(this, args);
    }

    // 调用拦截器的 call
    for (const interceptor of this.interceptors) {
      if (interceptor.call) {
        interceptor.call(...args);
      }
    }

    // 依次执行所有回调
    for (const tap of this.taps) {
      // 调用拦截器的 tap
      for (const interceptor of this.interceptors) {
        if (interceptor.tap) {
          interceptor.tap(tap);
        }
      }
      
      // 执行回调
      tap.fn(...args);
    }
  }
}
```

## 添加代码生成优化

上面的实现功能正确，但性能可以优化。让我们添加代码生成：

```typescript
// src/tapable/SyncHook.ts

import { Hook, TapOptions, Tap, Interceptor } from './Hook';

export class SyncHook<T extends unknown[] = []> extends Hook<T, void> {
  constructor(args?: string[]) {
    super(args);
  }

  tapAsync(options: string | TapOptions, fn: Function): never {
    throw new Error('tapAsync is not supported on SyncHook');
  }

  tapPromise(options: string | TapOptions, fn: Function): never {
    throw new Error('tapPromise is not supported on SyncHook');
  }

  /**
   * 触发钩子
   */
  call(...args: T): void {
    // 使用缓存的编译函数
    if (!this._call) {
      this._call = this._createCall();
    }
    return this._call.apply(this, args);
  }

  /**
   * 生成调用函数
   */
  private _createCall(): (...args: T) => void {
    // 如果没有订阅者，返回空函数
    if (this.taps.length === 0) {
      return () => {};
    }

    const taps = this.taps;
    const interceptors = this.interceptors;
    const hasIntercept = interceptors.length > 0;

    // 简单情况：无拦截器，单个回调
    if (!hasIntercept && taps.length === 1) {
      const fn = taps[0].fn;
      return (...args: T) => {
        fn(...args);
      };
    }

    // 简单情况：无拦截器，少量回调
    if (!hasIntercept && taps.length <= 3) {
      const fns = taps.map(t => t.fn);
      return (...args: T) => {
        for (const fn of fns) {
          fn(...args);
        }
      };
    }

    // 复杂情况：使用代码生成
    return this._compile();
  }

  /**
   * 代码生成编译
   */
  private _compile(): (...args: T) => void {
    const taps = this.taps;
    const interceptors = this.interceptors;
    const args = this.args;
    
    // 构建参数列表
    const argNames = args.length > 0 
      ? args.join(', ') 
      : '';
    
    // 构建函数体
    let code = '';
    
    // 拦截器 call
    if (interceptors.length > 0) {
      code += `
        var _interceptors = this.interceptors;
        for (var i = 0; i < _interceptors.length; i++) {
          var interceptor = _interceptors[i];
          if (interceptor.call) {
            interceptor.call(${argNames});
          }
        }
      `;
    }
    
    // 获取 taps
    code += `
      var _taps = this.taps;
    `;
    
    // 执行每个 tap
    for (let i = 0; i < taps.length; i++) {
      // 拦截器 tap
      if (interceptors.length > 0) {
        code += `
          for (var j = 0; j < _interceptors.length; j++) {
            var interceptor = _interceptors[j];
            if (interceptor.tap) {
              interceptor.tap(_taps[${i}]);
            }
          }
        `;
      }
      
      // 执行回调
      code += `
        _taps[${i}].fn(${argNames});
      `;
    }
    
    // 创建函数
    return new Function(...args, code) as (...args: T) => void;
  }
}
```

## 单元测试

让我们编写测试来验证实现：

```typescript
// test/tapable/SyncHook.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncHook } from '../../src/tapable/SyncHook';

describe('SyncHook', () => {
  describe('基本功能', () => {
    it('应该按顺序调用所有回调', () => {
      const hook = new SyncHook<[string]>(['name']);
      const calls: string[] = [];

      hook.tap('Plugin1', (name) => {
        calls.push(`Plugin1:${name}`);
      });

      hook.tap('Plugin2', (name) => {
        calls.push(`Plugin2:${name}`);
      });

      hook.call('webpack');

      expect(calls).toEqual(['Plugin1:webpack', 'Plugin2:webpack']);
    });

    it('应该忽略返回值', () => {
      const hook = new SyncHook<[number]>(['value']);
      let result = 0;

      hook.tap('Plugin1', (value) => {
        result += value;
        return 100; // 返回值被忽略
      });

      hook.tap('Plugin2', (value) => {
        result += value * 2;
      });

      hook.call(5);

      expect(result).toBe(15); // 5 + 5*2
    });

    it('应该支持多个参数', () => {
      const hook = new SyncHook<[string, number, boolean]>(['a', 'b', 'c']);
      const fn = vi.fn();

      hook.tap('Plugin1', fn);
      hook.call('hello', 42, true);

      expect(fn).toHaveBeenCalledWith('hello', 42, true);
    });

    it('没有订阅者时 call 应该正常执行', () => {
      const hook = new SyncHook<[string]>(['name']);
      
      expect(() => hook.call('test')).not.toThrow();
    });
  });

  describe('排序', () => {
    it('应该支持 stage 排序', () => {
      const hook = new SyncHook<[]>([]);
      const calls: string[] = [];

      hook.tap({ name: 'Plugin1', stage: 10 }, () => {
        calls.push('Plugin1');
      });

      hook.tap({ name: 'Plugin2', stage: -10 }, () => {
        calls.push('Plugin2');
      });

      hook.tap({ name: 'Plugin3', stage: 0 }, () => {
        calls.push('Plugin3');
      });

      hook.call();

      expect(calls).toEqual(['Plugin2', 'Plugin3', 'Plugin1']);
    });

    it('应该支持 before 选项', () => {
      const hook = new SyncHook<[]>([]);
      const calls: string[] = [];

      hook.tap('Plugin1', () => {
        calls.push('Plugin1');
      });

      hook.tap('Plugin2', () => {
        calls.push('Plugin2');
      });

      hook.tap({ name: 'Plugin3', before: 'Plugin2' }, () => {
        calls.push('Plugin3');
      });

      hook.call();

      expect(calls).toEqual(['Plugin1', 'Plugin3', 'Plugin2']);
    });
  });

  describe('拦截器', () => {
    it('应该在 call 时触发 call 拦截器', () => {
      const hook = new SyncHook<[string]>(['name']);
      const callInterceptor = vi.fn();

      hook.intercept({
        call: callInterceptor
      });

      hook.tap('Plugin1', () => {});
      hook.call('webpack');

      expect(callInterceptor).toHaveBeenCalledWith('webpack');
    });

    it('应该在每个回调执行前触发 tap 拦截器', () => {
      const hook = new SyncHook<[]>([]);
      const tapInterceptor = vi.fn();

      hook.intercept({
        tap: tapInterceptor
      });

      hook.tap('Plugin1', () => {});
      hook.tap('Plugin2', () => {});
      hook.call();

      expect(tapInterceptor).toHaveBeenCalledTimes(2);
      expect(tapInterceptor.mock.calls[0][0].name).toBe('Plugin1');
      expect(tapInterceptor.mock.calls[1][0].name).toBe('Plugin2');
    });

    it('应该在注册时触发 register 拦截器', () => {
      const hook = new SyncHook<[]>([]);
      const registerInterceptor = vi.fn((tap) => tap);

      hook.intercept({
        register: registerInterceptor
      });

      hook.tap('Plugin1', () => {});

      expect(registerInterceptor).toHaveBeenCalledTimes(1);
      expect(registerInterceptor.mock.calls[0][0].name).toBe('Plugin1');
    });

    it('register 拦截器可以修改 tap', () => {
      const hook = new SyncHook<[]>([]);
      const originalFn = vi.fn();
      const wrappedFn = vi.fn();

      hook.intercept({
        register: (tap) => {
          return {
            ...tap,
            fn: wrappedFn
          };
        }
      });

      hook.tap('Plugin1', originalFn);
      hook.call();

      expect(originalFn).not.toHaveBeenCalled();
      expect(wrappedFn).toHaveBeenCalled();
    });
  });

  describe('错误处理', () => {
    it('tapAsync 应该抛出错误', () => {
      const hook = new SyncHook<[]>([]);

      expect(() => {
        hook.tapAsync('Plugin1', () => {});
      }).toThrow('tapAsync is not supported on SyncHook');
    });

    it('tapPromise 应该抛出错误', () => {
      const hook = new SyncHook<[]>([]);

      expect(() => {
        hook.tapPromise('Plugin1', () => Promise.resolve());
      }).toThrow('tapPromise is not supported on SyncHook');
    });
  });

  describe('isUsed', () => {
    it('无订阅者时返回 false', () => {
      const hook = new SyncHook<[]>([]);
      expect(hook.isUsed()).toBe(false);
    });

    it('有订阅者时返回 true', () => {
      const hook = new SyncHook<[]>([]);
      hook.tap('Plugin1', () => {});
      expect(hook.isUsed()).toBe(true);
    });

    it('有拦截器时返回 true', () => {
      const hook = new SyncHook<[]>([]);
      hook.intercept({ call: () => {} });
      expect(hook.isUsed()).toBe(true);
    });
  });
});
```

运行测试：

```bash
npm run test -- test/tapable/SyncHook.test.ts
```

## 与官方实现对比

官方 Tapable 的 SyncHook 实现更加复杂，主要区别：

1. **更激进的代码生成**：官方版本完全使用代码生成，我们在简单情况下使用直接调用
2. **HookCodeFactory**：官方使用独立的代码生成工厂类
3. **编译缓存策略**：官方的缓存更加精细

但核心逻辑是相同的：按顺序调用回调，忽略返回值。

## 本章小结

- SyncHook 是最基础的钩子，按顺序执行所有回调
- Hook 基类实现了 tap、intercept、排序等通用逻辑
- 代码生成可以提升性能，但增加了复杂度
- 测试覆盖了基本功能、排序、拦截器、错误处理等场景

下一章，我们将实现 SyncBailHook——带熔断功能的同步钩子。
