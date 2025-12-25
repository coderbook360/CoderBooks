# SyncLoopHook 实现：循环钩子

SyncLoopHook 是同步钩子中最特殊的一个：当任意回调返回非 `undefined` 值时，会从第一个回调重新开始执行，直到所有回调都返回 `undefined`。

## 设计目标

```javascript
const hook = new SyncLoopHook(['context']);

let count = 0;

hook.tap('CounterPlugin', (context) => {
  console.log('Counter:', count);
  if (count < 3) {
    count++;
    return true; // 返回非 undefined，重新开始
  }
  // 返回 undefined，继续下一个回调
});

hook.tap('FinalPlugin', (context) => {
  console.log('Final');
});

hook.call({});

// 输出：
// Counter: 0
// Counter: 1
// Counter: 2
// Counter: 3
// Final
```

这种模式适用于需要迭代处理直到达到稳定状态的场景。

## 执行逻辑

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐    │
│  │ Plugin1  │ → │ Plugin2  │ → │ Plugin3  │    │
│  └────┬─────┘   └────┬─────┘   └────┬─────┘    │
│       │              │              │          │
│       ▼              ▼              ▼          │
│   undefined?     undefined?     undefined?     │
│       │              │              │          │
│    N  │ Y         N  │ Y         N  │ Y        │
│    ▼  │           ▼  │           ▼  │          │
│  ┌────┴───────────────────────────────┐        │
│  │         从头开始                    │        │
│  └────────────────────────────────────┘        │
│                                      │         │
│                                      ▼         │
│                                   完成         │
└─────────────────────────────────────────────────┘
```

## 实现

```typescript
// src/tapable/SyncLoopHook.ts

import { Hook, TapOptions, Tap, Interceptor } from './Hook';

export class SyncLoopHook<T extends unknown[] = []> extends Hook<T, void> {
  constructor(args?: string[]) {
    super(args);
  }

  /**
   * 禁用异步订阅
   */
  tapAsync(options: string | TapOptions, fn: Function): never {
    throw new Error('tapAsync is not supported on SyncLoopHook');
  }

  tapPromise(options: string | TapOptions, fn: Function): never {
    throw new Error('tapPromise is not supported on SyncLoopHook');
  }

  /**
   * 触发钩子
   */
  call(...args: T): void {
    if (!this._call) {
      this._call = this._createCall();
    }
    return this._call.apply(this, args);
  }

  /**
   * 生成调用函数
   */
  private _createCall(): (...args: T) => void {
    const taps = this.taps;
    const interceptors = this.interceptors;

    // 无订阅者
    if (taps.length === 0) {
      return () => {};
    }

    return (...args: T): void => {
      // 调用拦截器的 call
      for (const interceptor of interceptors) {
        if (interceptor.call) {
          interceptor.call(...args);
        }
      }

      // 循环执行
      let loop = true;
      
      while (loop) {
        loop = false;
        
        // 调用拦截器的 loop
        for (const interceptor of interceptors) {
          if (interceptor.loop) {
            interceptor.loop(...args);
          }
        }

        // 依次执行每个回调
        for (const tap of taps) {
          // 调用拦截器的 tap
          for (const interceptor of interceptors) {
            if (interceptor.tap) {
              interceptor.tap(tap);
            }
          }

          // 执行回调
          const result = tap.fn(...args);

          // 如果返回非 undefined，重新开始循环
          if (result !== undefined) {
            loop = true;
            break; // 跳出内层循环，从头开始
          }
        }
      }
    };
  }
}
```

## 关键实现细节

### 循环控制

使用 `loop` 标志位控制外层循环：

```typescript
let loop = true;

while (loop) {
  loop = false; // 假设这次不需要循环
  
  for (const tap of taps) {
    const result = tap.fn(...args);
    
    if (result !== undefined) {
      loop = true; // 需要重新循环
      break;       // 跳出内层，回到 while 开头
    }
  }
}
```

### loop 拦截器

SyncLoopHook 特有的 `loop` 拦截器，在每次循环开始时触发：

```typescript
hook.intercept({
  loop: (...args) => {
    console.log('开始新一轮循环');
  }
});
```

### 无限循环防护

SyncLoopHook 可能导致无限循环，使用时需要谨慎：

```javascript
// ⚠️ 危险：无限循环
hook.tap('BadPlugin', () => {
  return true; // 永远返回非 undefined
});
```

在实际使用中，应该有明确的终止条件。

## 单元测试

```typescript
// test/tapable/SyncLoopHook.test.ts

import { describe, it, expect, vi } from 'vitest';
import { SyncLoopHook } from '../../src/tapable/SyncLoopHook';

describe('SyncLoopHook', () => {
  describe('基本循环行为', () => {
    it('返回非 undefined 时应该从头重新开始', () => {
      const hook = new SyncLoopHook<[]>([]);
      const calls: string[] = [];
      let count = 0;

      hook.tap('Plugin1', () => {
        calls.push(`Plugin1:${count}`);
        if (count < 2) {
          count++;
          return true; // 重新循环
        }
      });

      hook.tap('Plugin2', () => {
        calls.push('Plugin2');
      });

      hook.call();

      expect(calls).toEqual([
        'Plugin1:0',
        'Plugin1:1',
        'Plugin1:2',
        'Plugin2'
      ]);
    });

    it('所有回调返回 undefined 时应该结束', () => {
      const hook = new SyncLoopHook<[]>([]);
      const fn1 = vi.fn();
      const fn2 = vi.fn();

      hook.tap('Plugin1', fn1);
      hook.tap('Plugin2', fn2);

      hook.call();

      expect(fn1).toHaveBeenCalledTimes(1);
      expect(fn2).toHaveBeenCalledTimes(1);
    });

    it('没有订阅者时应该正常结束', () => {
      const hook = new SyncLoopHook<[]>([]);
      expect(() => hook.call()).not.toThrow();
    });
  });

  describe('多个回调的循环', () => {
    it('第二个回调导致循环', () => {
      const hook = new SyncLoopHook<[]>([]);
      const calls: string[] = [];
      let count = 0;

      hook.tap('Plugin1', () => {
        calls.push('Plugin1');
      });

      hook.tap('Plugin2', () => {
        calls.push(`Plugin2:${count}`);
        if (count < 2) {
          count++;
          return true;
        }
      });

      hook.tap('Plugin3', () => {
        calls.push('Plugin3');
      });

      hook.call();

      expect(calls).toEqual([
        'Plugin1',
        'Plugin2:0',
        'Plugin1',
        'Plugin2:1',
        'Plugin1',
        'Plugin2:2',
        'Plugin3'
      ]);
    });

    it('多个回调交替导致循环', () => {
      const hook = new SyncLoopHook<[]>([]);
      let count1 = 0;
      let count2 = 0;
      const calls: string[] = [];

      hook.tap('Plugin1', () => {
        calls.push(`P1:${count1}`);
        if (count1 < 1) {
          count1++;
          return true;
        }
      });

      hook.tap('Plugin2', () => {
        calls.push(`P2:${count2}`);
        if (count2 < 1) {
          count2++;
          return true;
        }
      });

      hook.call();

      expect(calls).toEqual([
        'P1:0',      // Plugin1 触发循环
        'P1:1',      // Plugin1 不再循环
        'P2:0',      // Plugin2 触发循环
        'P1:1',      // 回到 Plugin1
        'P2:1',      // Plugin2 不再循环
      ]);
    });
  });

  describe('带参数的循环', () => {
    it('应该每次循环都传递相同参数', () => {
      const hook = new SyncLoopHook<[object]>(['context']);
      const receivedContexts: object[] = [];
      let count = 0;

      hook.tap('Plugin1', (context) => {
        receivedContexts.push(context);
        if (count < 2) {
          count++;
          return true;
        }
      });

      const ctx = { id: 1 };
      hook.call(ctx);

      expect(receivedContexts).toHaveLength(3);
      receivedContexts.forEach(c => {
        expect(c).toBe(ctx); // 同一个对象
      });
    });
  });

  describe('拦截器', () => {
    it('应该在每次循环开始时触发 loop 拦截器', () => {
      const hook = new SyncLoopHook<[]>([]);
      const loopInterceptor = vi.fn();
      let count = 0;

      hook.intercept({
        loop: loopInterceptor
      });

      hook.tap('Plugin1', () => {
        if (count < 2) {
          count++;
          return true;
        }
      });

      hook.call();

      expect(loopInterceptor).toHaveBeenCalledTimes(3);
    });

    it('应该在每个回调执行前触发 tap 拦截器', () => {
      const hook = new SyncLoopHook<[]>([]);
      const tapInterceptor = vi.fn();
      let count = 0;

      hook.intercept({
        tap: tapInterceptor
      });

      hook.tap('Plugin1', () => {
        if (count < 1) {
          count++;
          return true;
        }
      });

      hook.tap('Plugin2', () => {});

      hook.call();

      // Plugin1 执行 2 次，Plugin2 执行 1 次
      expect(tapInterceptor).toHaveBeenCalledTimes(3);
    });
  });

  describe('实际场景', () => {
    it('依赖解析迭代', () => {
      const hook = new SyncLoopHook<[Set<string>]>(['dependencies']);
      const resolveDependency = (dep: string): string[] => {
        const map: Record<string, string[]> = {
          'A': ['B', 'C'],
          'B': ['D'],
          'C': [],
          'D': []
        };
        return map[dep] || [];
      };

      const resolved = new Set<string>();
      const pending = new Set<string>();

      hook.tap('ResolverPlugin', (dependencies) => {
        // 找出未解析的依赖
        const unresolved = [...dependencies].filter(d => !resolved.has(d));
        
        if (unresolved.length === 0) {
          return; // 全部解析完成
        }

        // 解析第一个未解析的依赖
        const dep = unresolved[0];
        resolved.add(dep);

        // 添加新依赖
        const newDeps = resolveDependency(dep);
        for (const newDep of newDeps) {
          if (!resolved.has(newDep)) {
            dependencies.add(newDep);
          }
        }

        return true; // 继续循环
      });

      const deps = new Set(['A']);
      hook.call(deps);

      expect(resolved).toEqual(new Set(['A', 'B', 'C', 'D']));
    });

    it('状态机迭代', () => {
      const hook = new SyncLoopHook<[{ state: string; value: number }]>(['ctx']);
      const transitions: string[] = [];

      hook.tap('StateMachine', (ctx) => {
        transitions.push(ctx.state);

        switch (ctx.state) {
          case 'init':
            ctx.state = 'processing';
            ctx.value = 1;
            return true;
          case 'processing':
            ctx.value *= 2;
            if (ctx.value < 8) {
              return true;
            }
            ctx.state = 'done';
            return true;
          case 'done':
            return; // 结束
        }
      });

      const ctx = { state: 'init', value: 0 };
      hook.call(ctx);

      expect(transitions).toEqual(['init', 'processing', 'processing', 'processing', 'done']);
      expect(ctx.value).toBe(8);
    });
  });
});
```

## 使用注意事项

1. **确保终止条件**：每个回调最终都应该返回 `undefined`
2. **避免无限循环**：设置最大循环次数或超时保护
3. **性能考虑**：循环次数过多会影响性能
4. **状态管理**：通常需要外部状态来控制循环

```javascript
// 安全示例：带最大循环次数保护
const MAX_ITERATIONS = 1000;
let iterations = 0;

hook.tap('SafePlugin', () => {
  if (iterations++ > MAX_ITERATIONS) {
    throw new Error('Maximum iterations exceeded');
  }
  // ... 实际逻辑
});
```

## 本章小结

- SyncLoopHook 在回调返回非 `undefined` 时从头重新执行
- 特有 `loop` 拦截器，在每次循环开始时触发
- 适用于迭代处理、状态机等场景
- 使用时必须确保有终止条件，避免无限循环

下一章，我们将开始实现异步钩子：AsyncParallelHook。
