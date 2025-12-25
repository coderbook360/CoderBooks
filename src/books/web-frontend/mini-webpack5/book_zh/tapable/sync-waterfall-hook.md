# SyncWaterfallHook 实现：瀑布流钩子

SyncWaterfallHook 实现了数据的链式传递：每个回调的返回值会作为下一个回调的第一个参数传入。

## 设计目标

```javascript
const hook = new SyncWaterfallHook(['content']);

hook.tap('Markdown', (content) => {
  return content + '\n\n---\n\n';  // 添加分隔线
});

hook.tap('Header', (content) => {
  return '# Title\n\n' + content;  // 添加标题
});

hook.tap('Footer', (content) => {
  return content + '\n\n© 2024';  // 添加版权
});

const result = hook.call('Hello World');
console.log(result);
// # Title
//
// Hello World
//
// ---
//
// © 2024
```

数据像瀑布一样流过每个回调，逐步被加工处理。

## 关键特性

1. **结果传递**：前一个回调的返回值成为下一个回调的第一个参数
2. **必须有返回值**：如果回调返回 `undefined`，使用上一个值继续传递
3. **至少一个参数**：瀑布流需要至少一个参数来传递数据
4. **返回最终结果**：`call()` 返回最后一个回调的结果

## 实现

```typescript
// src/tapable/SyncWaterfallHook.ts

import { Hook, TapOptions, Tap, Interceptor } from './Hook';

export class SyncWaterfallHook<T extends [unknown, ...unknown[]]> extends Hook<T, T[0]> {
  constructor(args?: string[]) {
    super(args);
    // 瀑布流至少需要一个参数
    if (!args || args.length === 0) {
      throw new Error('SyncWaterfallHook requires at least one argument');
    }
  }

  /**
   * 禁用异步订阅
   */
  tapAsync(options: string | TapOptions, fn: Function): never {
    throw new Error('tapAsync is not supported on SyncWaterfallHook');
  }

  tapPromise(options: string | TapOptions, fn: Function): never {
    throw new Error('tapPromise is not supported on SyncWaterfallHook');
  }

  /**
   * 触发钩子
   */
  call(...args: T): T[0] {
    if (!this._call) {
      this._call = this._createCall();
    }
    return this._call.apply(this, args);
  }

  /**
   * 生成调用函数
   */
  private _createCall(): (...args: T) => T[0] {
    const taps = this.taps;
    const interceptors = this.interceptors;
    const hasIntercept = interceptors.length > 0;

    // 无订阅者，直接返回第一个参数
    if (taps.length === 0) {
      return (...args: T) => args[0];
    }

    // 简单情况：无拦截器，单个回调
    if (!hasIntercept && taps.length === 1) {
      const fn = taps[0].fn;
      return (...args: T): T[0] => {
        const result = fn(...args);
        return result !== undefined ? result : args[0];
      };
    }

    // 一般情况
    return (...args: T): T[0] => {
      // 调用拦截器的 call
      for (const interceptor of interceptors) {
        if (interceptor.call) {
          interceptor.call(...args);
        }
      }

      // 当前传递的值
      let current: T[0] = args[0];

      // 依次执行回调
      for (const tap of taps) {
        // 调用拦截器的 tap
        for (const interceptor of interceptors) {
          if (interceptor.tap) {
            interceptor.tap(tap);
          }
        }

        // 执行回调，传入当前值和其他参数
        const result = tap.fn(current, ...args.slice(1));

        // 如果有返回值，更新当前值
        if (result !== undefined) {
          current = result;
        }
      }

      return current;
    };
  }
}
```

## 实现细节

### 参数验证

瀑布流必须至少有一个参数，因为需要一个初始值来传递：

```typescript
constructor(args?: string[]) {
  super(args);
  if (!args || args.length === 0) {
    throw new Error('SyncWaterfallHook requires at least one argument');
  }
}
```

### undefined 处理

如果回调返回 `undefined`，保持上一个值不变：

```typescript
const result = tap.fn(current, ...args.slice(1));
if (result !== undefined) {
  current = result;
}
```

这允许某些回调"跳过"处理，不影响数据流：

```javascript
hook.tap('ConditionalPlugin', (content) => {
  if (shouldSkip) {
    return undefined; // 不修改，传递原值
  }
  return modifiedContent;
});
```

### 其他参数

除了第一个参数（传递的值），其他参数保持不变：

```javascript
const hook = new SyncWaterfallHook(['content', 'options']);

hook.tap('Plugin1', (content, options) => {
  console.log(options); // 始终是初始传入的 options
  return content + '!';
});

hook.tap('Plugin2', (content, options) => {
  console.log(options); // 同样的 options
  return content + '?';
});

hook.call('Hello', { format: 'html' });
```

## 单元测试

```typescript
// test/tapable/SyncWaterfallHook.test.ts

import { describe, it, expect, vi } from 'vitest';
import { SyncWaterfallHook } from '../../src/tapable/SyncWaterfallHook';

describe('SyncWaterfallHook', () => {
  describe('基本功能', () => {
    it('应该传递结果到下一个回调', () => {
      const hook = new SyncWaterfallHook<[number]>(['value']);

      hook.tap('Plugin1', (value) => value + 1);
      hook.tap('Plugin2', (value) => value * 2);
      hook.tap('Plugin3', (value) => value - 3);

      // 1 -> 2 -> 4 -> 1
      expect(hook.call(1)).toBe(1);
    });

    it('应该支持字符串处理', () => {
      const hook = new SyncWaterfallHook<[string]>(['content']);

      hook.tap('Upper', (content) => content.toUpperCase());
      hook.tap('Wrap', (content) => `[${content}]`);
      hook.tap('Prefix', (content) => `Hello: ${content}`);

      expect(hook.call('world')).toBe('Hello: [WORLD]');
    });

    it('返回 undefined 时应该保持上一个值', () => {
      const hook = new SyncWaterfallHook<[number]>(['value']);

      hook.tap('Plugin1', (value) => value + 10);
      hook.tap('Plugin2', (value) => undefined); // 跳过
      hook.tap('Plugin3', (value) => value * 2);

      // 1 -> 11 -> 11 -> 22
      expect(hook.call(1)).toBe(22);
    });

    it('没有订阅者时应该返回初始值', () => {
      const hook = new SyncWaterfallHook<[string]>(['content']);

      expect(hook.call('original')).toBe('original');
    });
  });

  describe('多参数', () => {
    it('应该传递额外参数', () => {
      const hook = new SyncWaterfallHook<[string, object]>(['content', 'options']);
      const receivedOptions: object[] = [];

      hook.tap('Plugin1', (content, options) => {
        receivedOptions.push(options);
        return content + '1';
      });

      hook.tap('Plugin2', (content, options) => {
        receivedOptions.push(options);
        return content + '2';
      });

      const opts = { key: 'value' };
      hook.call('start', opts);

      expect(receivedOptions[0]).toBe(opts);
      expect(receivedOptions[1]).toBe(opts);
    });

    it('只有第一个参数被传递', () => {
      const hook = new SyncWaterfallHook<[number, number]>(['a', 'b']);
      const values: [number, number][] = [];

      hook.tap('Plugin1', (a, b) => {
        values.push([a, b]);
        return a + 100;
      });

      hook.tap('Plugin2', (a, b) => {
        values.push([a, b]);
        return a + 200;
      });

      const result = hook.call(1, 2);

      expect(values[0]).toEqual([1, 2]);
      expect(values[1]).toEqual([101, 2]); // a 变了，b 不变
      expect(result).toBe(301);
    });
  });

  describe('构造函数', () => {
    it('无参数时应该抛出错误', () => {
      expect(() => {
        new SyncWaterfallHook([]);
      }).toThrow('requires at least one argument');
    });

    it('undefined 参数时应该抛出错误', () => {
      expect(() => {
        new SyncWaterfallHook(undefined as any);
      }).toThrow('requires at least one argument');
    });
  });

  describe('拦截器', () => {
    it('应该触发 call 拦截器', () => {
      const hook = new SyncWaterfallHook<[string]>(['content']);
      const callInterceptor = vi.fn();

      hook.intercept({
        call: callInterceptor
      });

      hook.tap('Plugin1', (c) => c);
      hook.call('test');

      expect(callInterceptor).toHaveBeenCalledWith('test');
    });

    it('应该在每个回调前触发 tap 拦截器', () => {
      const hook = new SyncWaterfallHook<[string]>(['content']);
      const tapInterceptor = vi.fn();

      hook.intercept({
        tap: tapInterceptor
      });

      hook.tap('Plugin1', (c) => c + '1');
      hook.tap('Plugin2', (c) => c + '2');
      hook.call('start');

      expect(tapInterceptor).toHaveBeenCalledTimes(2);
    });
  });

  describe('实际场景', () => {
    it('Markdown 处理管道', () => {
      const hook = new SyncWaterfallHook<[string]>(['markdown']);

      // 标题处理
      hook.tap('HeaderPlugin', (md) => {
        return md.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');
      });

      // 粗体处理
      hook.tap('BoldPlugin', (md) => {
        return md.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      });

      // 换行处理
      hook.tap('LineBreakPlugin', (md) => {
        return md.replace(/\n/g, '<br>');
      });

      const result = hook.call('# Hello\n**World**');
      expect(result).toBe('<h1>Hello</h1><br><strong>World</strong>');
    });

    it('配置合并', () => {
      const hook = new SyncWaterfallHook<[object]>(['config']);

      hook.tap('DefaultsPlugin', (config) => ({
        ...config,
        mode: 'development',
        devtool: 'source-map'
      }));

      hook.tap('UserPlugin', (config) => ({
        ...config,
        mode: 'production'
      }));

      hook.tap('OptimizePlugin', (config: any) => ({
        ...config,
        optimization: { minimize: config.mode === 'production' }
      }));

      const result = hook.call({});
      expect(result).toEqual({
        mode: 'production',
        devtool: 'source-map',
        optimization: { minimize: true }
      });
    });
  });
});
```

## 与 SyncHook、SyncBailHook 的对比

| 特性 | SyncHook | SyncBailHook | SyncWaterfallHook |
|------|----------|--------------|-------------------|
| 返回值 | 忽略 | 判断熔断 | 传递给下一个 |
| 执行策略 | 全部执行 | 可中断 | 全部执行 |
| call 返回值 | undefined | 熔断值/undefined | 最终处理结果 |
| 使用场景 | 通知 | 竞争处理 | 数据转换 |

## 本章小结

- SyncWaterfallHook 实现数据的链式传递
- 每个回调接收上一个回调的返回值作为第一个参数
- 返回 `undefined` 表示跳过，保持上一个值
- 至少需要一个参数
- 适用于数据转换管道、配置合并等场景

下一章，我们将实现 SyncLoopHook——循环钩子。
