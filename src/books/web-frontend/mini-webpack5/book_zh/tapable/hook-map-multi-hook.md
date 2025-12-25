# HookMap 与 MultiHook 实现

本章实现两个高级工具：HookMap（按键管理多个 Hook）和 MultiHook（将多个 Hook 组合为一个）。

## HookMap 设计目标

HookMap 按键创建和管理 Hook，常用于按资源类型、按模块类型分类注册回调：

```javascript
const hookMap = new HookMap(() => new SyncHook(['arg']));

// 按键获取（不存在则创建）
hookMap.for('javascript').tap('Plugin', (arg) => { /* ... */ });
hookMap.for('css').tap('Plugin', (arg) => { /* ... */ });

// 调用特定键的 Hook
hookMap.for('javascript').call('test');
```

## HookMap 实现

```typescript
// src/tapable/HookMap.ts

import { Hook } from './Hook';

export class HookMap<T extends Hook<any, any>> {
  private _map: Map<string, T> = new Map();
  private _factory: (key: string) => T;
  private _interceptors: HookMapInterceptor<T>[] = [];

  constructor(factory: (key: string) => T) {
    this._factory = factory;
  }

  /**
   * 获取指定键的 Hook，不存在则创建
   */
  for(key: string): T {
    let hook = this._map.get(key);

    if (!hook) {
      hook = this._factory(key);
      this._map.set(key, hook);

      // 触发拦截器
      for (const interceptor of this._interceptors) {
        if (interceptor.factory) {
          interceptor.factory(key, hook);
        }
      }
    }

    return hook;
  }

  /**
   * 获取指定键的 Hook，不存在返回 undefined
   */
  get(key: string): T | undefined {
    return this._map.get(key);
  }

  /**
   * 添加拦截器
   */
  intercept(interceptor: HookMapInterceptor<T>): void {
    this._interceptors.push(interceptor);
  }

  /**
   * 获取所有键
   */
  keys(): IterableIterator<string> {
    return this._map.keys();
  }

  /**
   * 获取所有值
   */
  values(): IterableIterator<T> {
    return this._map.values();
  }

  /**
   * 获取所有键值对
   */
  entries(): IterableIterator<[string, T]> {
    return this._map.entries();
  }

  /**
   * 获取 Hook 数量
   */
  get size(): number {
    return this._map.size;
  }
}

export interface HookMapInterceptor<T extends Hook<any, any>> {
  factory?: (key: string, hook: T) => void;
}
```

## MultiHook 设计目标

MultiHook 将多个 Hook 组合为一个，统一注册回调：

```javascript
const hook1 = new SyncHook(['arg']);
const hook2 = new SyncHook(['arg']);

const multi = new MultiHook([hook1, hook2]);

// 一次注册到多个 Hook
multi.tap('Plugin', (arg) => console.log(arg));

// 等同于
hook1.tap('Plugin', (arg) => console.log(arg));
hook2.tap('Plugin', (arg) => console.log(arg));
```

## MultiHook 实现

```typescript
// src/tapable/MultiHook.ts

import { Hook, TapOptions, TapAsyncOptions } from './Hook';

export class MultiHook<T extends Hook<any, any>> {
  private _hooks: T[];

  constructor(hooks: T[]) {
    this._hooks = hooks;
  }

  /**
   * 同步订阅到所有 Hook
   */
  tap(nameOrOptions: string | TapOptions, fn: (...args: any[]) => any): void {
    for (const hook of this._hooks) {
      hook.tap(nameOrOptions, fn);
    }
  }

  /**
   * 异步回调订阅到所有 Hook
   */
  tapAsync(nameOrOptions: string | TapAsyncOptions, fn: (...args: any[]) => void): void {
    for (const hook of this._hooks) {
      if ('tapAsync' in hook) {
        (hook as any).tapAsync(nameOrOptions, fn);
      }
    }
  }

  /**
   * Promise 订阅到所有 Hook
   */
  tapPromise(nameOrOptions: string | TapOptions, fn: (...args: any[]) => Promise<any>): void {
    for (const hook of this._hooks) {
      if ('tapPromise' in hook) {
        (hook as any).tapPromise(nameOrOptions, fn);
      }
    }
  }

  /**
   * 添加拦截器到所有 Hook
   */
  intercept(interceptor: any): void {
    for (const hook of this._hooks) {
      hook.intercept(interceptor);
    }
  }

  /**
   * 是否使用（检查任意 Hook 是否有订阅）
   */
  isUsed(): boolean {
    return this._hooks.some(hook => hook.isUsed());
  }

  /**
   * 获取包含的 Hook 数量
   */
  get length(): number {
    return this._hooks.length;
  }
}
```

## 单元测试

```typescript
// test/tapable/HookMap.test.ts

import { describe, it, expect, vi } from 'vitest';
import { HookMap } from '../../src/tapable/HookMap';
import { SyncHook } from '../../src/tapable/SyncHook';

describe('HookMap', () => {
  describe('基本功能', () => {
    it('应该按键创建 Hook', () => {
      const hookMap = new HookMap(() => new SyncHook<[string]>(['arg']));

      const hook1 = hookMap.for('type1');
      const hook2 = hookMap.for('type2');

      expect(hook1).toBeInstanceOf(SyncHook);
      expect(hook2).toBeInstanceOf(SyncHook);
      expect(hook1).not.toBe(hook2);
    });

    it('相同键应该返回相同 Hook', () => {
      const hookMap = new HookMap(() => new SyncHook<[string]>(['arg']));

      const hook1 = hookMap.for('type1');
      const hook2 = hookMap.for('type1');

      expect(hook1).toBe(hook2);
    });

    it('应该支持工厂函数接收 key', () => {
      const factory = vi.fn((key: string) => new SyncHook<[string]>([key]));
      const hookMap = new HookMap(factory);

      hookMap.for('myKey');

      expect(factory).toHaveBeenCalledWith('myKey');
    });
  });

  describe('get 方法', () => {
    it('存在时应该返回 Hook', () => {
      const hookMap = new HookMap(() => new SyncHook<[string]>(['arg']));
      const hook = hookMap.for('type1');

      expect(hookMap.get('type1')).toBe(hook);
    });

    it('不存在时应该返回 undefined', () => {
      const hookMap = new HookMap(() => new SyncHook<[string]>(['arg']));

      expect(hookMap.get('nonexistent')).toBeUndefined();
    });
  });

  describe('拦截器', () => {
    it('应该在创建时调用拦截器', () => {
      const hookMap = new HookMap(() => new SyncHook<[string]>(['arg']));
      const factoryInterceptor = vi.fn();

      hookMap.intercept({ factory: factoryInterceptor });
      const hook = hookMap.for('type1');

      expect(factoryInterceptor).toHaveBeenCalledWith('type1', hook);
    });

    it('已存在的 Hook 不应触发拦截器', () => {
      const hookMap = new HookMap(() => new SyncHook<[string]>(['arg']));
      const factoryInterceptor = vi.fn();

      hookMap.for('type1'); // 先创建
      hookMap.intercept({ factory: factoryInterceptor });
      hookMap.for('type1'); // 再获取

      expect(factoryInterceptor).not.toHaveBeenCalled();
    });
  });

  describe('迭代器', () => {
    it('应该支持遍历', () => {
      const hookMap = new HookMap(() => new SyncHook<[string]>(['arg']));
      hookMap.for('a');
      hookMap.for('b');
      hookMap.for('c');

      expect([...hookMap.keys()]).toEqual(['a', 'b', 'c']);
      expect(hookMap.size).toBe(3);
    });
  });

  describe('实际使用', () => {
    it('按类型分发回调', () => {
      const hookMap = new HookMap(() => new SyncHook<[string]>(['content']));
      const results: string[] = [];

      hookMap.for('js').tap('JSHandler', (content) => {
        results.push(`JS: ${content}`);
      });

      hookMap.for('css').tap('CSSHandler', (content) => {
        results.push(`CSS: ${content}`);
      });

      hookMap.for('js').call('console.log()');
      hookMap.for('css').call('.red { color: red }');

      expect(results).toEqual([
        'JS: console.log()',
        'CSS: .red { color: red }'
      ]);
    });
  });
});
```

```typescript
// test/tapable/MultiHook.test.ts

import { describe, it, expect, vi } from 'vitest';
import { MultiHook } from '../../src/tapable/MultiHook';
import { SyncHook } from '../../src/tapable/SyncHook';
import { AsyncSeriesHook } from '../../src/tapable/AsyncSeriesHook';

describe('MultiHook', () => {
  describe('tap', () => {
    it('应该注册到所有 Hook', () => {
      const hook1 = new SyncHook<[string]>(['arg']);
      const hook2 = new SyncHook<[string]>(['arg']);
      const multi = new MultiHook([hook1, hook2]);

      const fn = vi.fn();
      multi.tap('Plugin', fn);

      hook1.call('test1');
      hook2.call('test2');

      expect(fn).toHaveBeenCalledTimes(2);
      expect(fn).toHaveBeenNthCalledWith(1, 'test1');
      expect(fn).toHaveBeenNthCalledWith(2, 'test2');
    });
  });

  describe('tapAsync', () => {
    it('应该注册到支持 tapAsync 的 Hook', async () => {
      const hook1 = new AsyncSeriesHook<[string]>(['arg']);
      const hook2 = new AsyncSeriesHook<[string]>(['arg']);
      const multi = new MultiHook([hook1, hook2]);

      const fn = vi.fn((arg, callback) => callback());
      multi.tapAsync('Plugin', fn);

      await hook1.promise('test1');
      await hook2.promise('test2');

      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('isUsed', () => {
    it('任一 Hook 有订阅时返回 true', () => {
      const hook1 = new SyncHook<[string]>(['arg']);
      const hook2 = new SyncHook<[string]>(['arg']);
      const multi = new MultiHook([hook1, hook2]);

      expect(multi.isUsed()).toBe(false);

      hook1.tap('Plugin', () => {});
      expect(multi.isUsed()).toBe(true);
    });
  });

  describe('intercept', () => {
    it('应该添加拦截器到所有 Hook', () => {
      const hook1 = new SyncHook<[string]>(['arg']);
      const hook2 = new SyncHook<[string]>(['arg']);
      const multi = new MultiHook([hook1, hook2]);

      const callFn = vi.fn();
      multi.intercept({ call: callFn });

      hook1.call('test');
      hook2.call('test');

      expect(callFn).toHaveBeenCalledTimes(2);
    });
  });
});
```

## 在 Webpack 中的应用

```javascript
// HookMap 用于按模块类型分发解析器
class ParserFactory {
  hooks = {
    createParser: new HookMap(() => new SyncHook(['options']))
  };

  createParser(type) {
    this.hooks.createParser.for(type).call({});
    // ...
  }
}

// MultiHook 用于组合生命周期钩子
class Compilation {
  hooks = {
    optimizeModules: new SyncHook(['modules']),
    afterOptimizeModules: new SyncHook(['modules'])
  };

  // 允许插件同时订阅两个钩子
  get optimizeModulesHook() {
    return new MultiHook([
      this.hooks.optimizeModules,
      this.hooks.afterOptimizeModules
    ]);
  }
}
```

## 本章小结

- HookMap 按键管理多个 Hook，适用于按类型分发的场景
- MultiHook 将多个 Hook 组合为一个，统一注册接口
- 两者都是 Tapable 的高级工具，增强了 Hook 的灵活性

下一章将实现拦截器机制。
