# SyncBailHook 实现：熔断钩子

SyncBailHook 在 SyncHook 的基础上增加了"熔断"能力：当某个回调返回非 `undefined` 值时，后续回调将不再执行。

## 设计目标

```javascript
const hook = new SyncBailHook(['request']);

hook.tap('CachePlugin', (request) => {
  const cached = getFromCache(request);
  if (cached) {
    return cached; // 命中缓存，中断后续处理
  }
  // 返回 undefined，继续执行
});

hook.tap('FilePlugin', (request) => {
  return readFromFile(request);
});

hook.tap('NetworkPlugin', (request) => {
  return fetchFromNetwork(request);
});

// 如果 CachePlugin 命中，FilePlugin 和 NetworkPlugin 不会执行
const result = hook.call('/api/data');
```

这种模式常用于：
- 模块解析：多个解析器竞争处理
- 请求处理：缓存优先策略
- 验证流程：任一验证失败则中断

## 实现

```typescript
// src/tapable/SyncBailHook.ts

import { Hook, TapOptions, Tap, Interceptor } from './Hook';

export class SyncBailHook<T extends unknown[], R = unknown> extends Hook<T, R | undefined> {
  constructor(args?: string[]) {
    super(args);
  }

  /**
   * 禁用异步订阅
   */
  tapAsync(options: string | TapOptions, fn: Function): never {
    throw new Error('tapAsync is not supported on SyncBailHook');
  }

  tapPromise(options: string | TapOptions, fn: Function): never {
    throw new Error('tapPromise is not supported on SyncBailHook');
  }

  /**
   * 触发钩子
   */
  call(...args: T): R | undefined {
    if (!this._call) {
      this._call = this._createCall();
    }
    return this._call.apply(this, args);
  }

  /**
   * 生成调用函数
   */
  private _createCall(): (...args: T) => R | undefined {
    // 无订阅者
    if (this.taps.length === 0) {
      return () => undefined;
    }

    const taps = this.taps;
    const interceptors = this.interceptors;
    const hasIntercept = interceptors.length > 0;

    // 简单情况：无拦截器，单个回调
    if (!hasIntercept && taps.length === 1) {
      const fn = taps[0].fn;
      return (...args: T) => fn(...args);
    }

    // 一般情况
    return (...args: T): R | undefined => {
      // 调用拦截器的 call
      for (const interceptor of interceptors) {
        if (interceptor.call) {
          interceptor.call(...args);
        }
      }

      // 依次执行回调，直到有返回值
      for (const tap of taps) {
        // 调用拦截器的 tap
        for (const interceptor of interceptors) {
          if (interceptor.tap) {
            interceptor.tap(tap);
          }
        }

        // 执行回调
        const result = tap.fn(...args);

        // 如果有返回值（非 undefined），熔断
        if (result !== undefined) {
          // 调用拦截器的 result
          for (const interceptor of interceptors) {
            if (interceptor.result) {
              interceptor.result(result);
            }
          }
          return result;
        }
      }

      // 所有回调都返回 undefined
      return undefined;
    };
  }
}
```

## 关键实现细节

### 熔断判断

熔断的判断条件是 `result !== undefined`：

```typescript
const result = tap.fn(...args);
if (result !== undefined) {
  return result; // 熔断
}
```

为什么不是 `result != null`（排除 null）？

这是 Tapable 的设计选择。`undefined` 明确表示"没有处理结果"，而 `null` 可能是一个有意义的返回值（比如"查询结果为空"）。

### 拦截器 result

SyncBailHook 新增了 `result` 拦截器，在熔断时触发：

```typescript
hook.intercept({
  result: (result) => {
    console.log('熔断结果:', result);
  }
});
```

## 代码生成优化

让我们添加代码生成版本：

```typescript
/**
 * 代码生成编译
 */
private _compile(): (...args: T) => R | undefined {
  const taps = this.taps;
  const interceptors = this.interceptors;
  const args = this.args;
  
  const argNames = args.length > 0 ? args.join(', ') : '';
  
  let code = '';
  
  // 拦截器 call
  if (interceptors.length > 0) {
    code += `
      var _interceptors = this.interceptors;
      for (var i = 0; i < _interceptors.length; i++) {
        if (_interceptors[i].call) {
          _interceptors[i].call(${argNames});
        }
      }
    `;
  }
  
  code += `
    var _taps = this.taps;
    var _result;
  `;
  
  // 执行每个 tap
  for (let i = 0; i < taps.length; i++) {
    // 拦截器 tap
    if (interceptors.length > 0) {
      code += `
        for (var j = 0; j < _interceptors.length; j++) {
          if (_interceptors[j].tap) {
            _interceptors[j].tap(_taps[${i}]);
          }
        }
      `;
    }
    
    // 执行回调并检查返回值
    code += `
      _result = _taps[${i}].fn(${argNames});
      if (_result !== undefined) {
    `;
    
    // 拦截器 result
    if (interceptors.length > 0) {
      code += `
        for (var j = 0; j < _interceptors.length; j++) {
          if (_interceptors[j].result) {
            _interceptors[j].result(_result);
          }
        }
      `;
    }
    
    code += `
        return _result;
      }
    `;
  }
  
  code += `
    return undefined;
  `;
  
  return new Function(...args, code) as (...args: T) => R | undefined;
}
```

## 单元测试

```typescript
// test/tapable/SyncBailHook.test.ts

import { describe, it, expect, vi } from 'vitest';
import { SyncBailHook } from '../../src/tapable/SyncBailHook';

describe('SyncBailHook', () => {
  describe('熔断行为', () => {
    it('返回非 undefined 时应该熔断', () => {
      const hook = new SyncBailHook<[string], string>(['request']);
      const calls: string[] = [];

      hook.tap('Plugin1', (request) => {
        calls.push('Plugin1');
        return 'result1';
      });

      hook.tap('Plugin2', (request) => {
        calls.push('Plugin2');
        return 'result2';
      });

      const result = hook.call('test');

      expect(result).toBe('result1');
      expect(calls).toEqual(['Plugin1']);
    });

    it('返回 undefined 时应该继续执行', () => {
      const hook = new SyncBailHook<[string], string>(['request']);
      const calls: string[] = [];

      hook.tap('Plugin1', (request) => {
        calls.push('Plugin1');
        return undefined;
      });

      hook.tap('Plugin2', (request) => {
        calls.push('Plugin2');
        return 'result2';
      });

      const result = hook.call('test');

      expect(result).toBe('result2');
      expect(calls).toEqual(['Plugin1', 'Plugin2']);
    });

    it('返回 null 时应该熔断', () => {
      const hook = new SyncBailHook<[string], string | null>(['request']);
      const calls: string[] = [];

      hook.tap('Plugin1', (request) => {
        calls.push('Plugin1');
        return null;
      });

      hook.tap('Plugin2', (request) => {
        calls.push('Plugin2');
        return 'result2';
      });

      const result = hook.call('test');

      expect(result).toBe(null);
      expect(calls).toEqual(['Plugin1']);
    });

    it('返回 false 时应该熔断', () => {
      const hook = new SyncBailHook<[], boolean>([]);

      hook.tap('Plugin1', () => false);
      hook.tap('Plugin2', () => true);

      expect(hook.call()).toBe(false);
    });

    it('返回 0 时应该熔断', () => {
      const hook = new SyncBailHook<[], number>([]);

      hook.tap('Plugin1', () => 0);
      hook.tap('Plugin2', () => 1);

      expect(hook.call()).toBe(0);
    });

    it('返回空字符串时应该熔断', () => {
      const hook = new SyncBailHook<[], string>([]);

      hook.tap('Plugin1', () => '');
      hook.tap('Plugin2', () => 'hello');

      expect(hook.call()).toBe('');
    });
  });

  describe('所有回调返回 undefined', () => {
    it('应该返回 undefined', () => {
      const hook = new SyncBailHook<[string], string>(['request']);

      hook.tap('Plugin1', () => undefined);
      hook.tap('Plugin2', () => undefined);

      expect(hook.call('test')).toBe(undefined);
    });

    it('没有订阅者时应该返回 undefined', () => {
      const hook = new SyncBailHook<[], string>([]);

      expect(hook.call()).toBe(undefined);
    });
  });

  describe('拦截器', () => {
    it('应该在熔断时触发 result 拦截器', () => {
      const hook = new SyncBailHook<[], string>([]);
      const resultInterceptor = vi.fn();

      hook.intercept({
        result: resultInterceptor
      });

      hook.tap('Plugin1', () => 'bail-result');
      hook.call();

      expect(resultInterceptor).toHaveBeenCalledWith('bail-result');
    });

    it('未熔断时不应该触发 result 拦截器', () => {
      const hook = new SyncBailHook<[], string>([]);
      const resultInterceptor = vi.fn();

      hook.intercept({
        result: resultInterceptor
      });

      hook.tap('Plugin1', () => undefined);
      hook.call();

      expect(resultInterceptor).not.toHaveBeenCalled();
    });
  });

  describe('实际场景', () => {
    it('缓存优先策略', () => {
      const hook = new SyncBailHook<[string], string>(['key']);
      const cache = new Map([['cached-key', 'cached-value']]);

      hook.tap('CachePlugin', (key) => {
        return cache.get(key);
      });

      hook.tap('DatabasePlugin', (key) => {
        return `db-${key}`;
      });

      // 命中缓存
      expect(hook.call('cached-key')).toBe('cached-value');
      
      // 未命中，走数据库
      expect(hook.call('other-key')).toBe('db-other-key');
    });

    it('模块解析器', () => {
      const hook = new SyncBailHook<[string], string | null>(['request']);

      // 内置模块解析器
      hook.tap('BuiltinResolver', (request) => {
        if (request === 'fs' || request === 'path') {
          return `builtin:${request}`;
        }
      });

      // 相对路径解析器
      hook.tap('RelativeResolver', (request) => {
        if (request.startsWith('./') || request.startsWith('../')) {
          return `/resolved${request.slice(1)}`;
        }
      });

      // 包解析器
      hook.tap('PackageResolver', (request) => {
        return `/node_modules/${request}`;
      });

      expect(hook.call('fs')).toBe('builtin:fs');
      expect(hook.call('./utils')).toBe('/resolved/utils');
      expect(hook.call('lodash')).toBe('/node_modules/lodash');
    });
  });
});
```

## 与 SyncHook 的对比

| 特性 | SyncHook | SyncBailHook |
|------|----------|--------------|
| 返回值 | 忽略 | 作为熔断判断 |
| 执行策略 | 全部执行 | 可提前终止 |
| 结果拦截器 | 无 | 有 |
| 使用场景 | 通知 | 竞争处理 |

## 本章小结

- SyncBailHook 在回调返回非 `undefined` 值时熔断
- `null`、`false`、`0`、`''` 等值都会触发熔断
- 新增 `result` 拦截器，在熔断时触发
- 适用于缓存优先、竞争处理等场景

下一章，我们将实现 SyncWaterfallHook——瀑布流钩子。
