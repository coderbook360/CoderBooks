---
sidebar_position: 17
title: Subscription 类实现
---

# Subscription 类实现

本章实现 Subscription 类——RxJS 资源管理的核心。

## 设计目标

1. **资源释放**：提供统一的 unsubscribe 机制
2. **层次管理**：支持父子 Subscription 关系
3. **清理逻辑**：支持任意清理函数
4. **幂等性**：多次 unsubscribe 无副作用
5. **错误隔离**：一个清理失败不影响其他清理

## 类型定义

```typescript
// src/types.ts

/**
 * 清理逻辑类型
 */
export type TeardownLogic =
  | Subscription    // 子 Subscription
  | Unsubscribable  // 有 unsubscribe 方法的对象
  | (() => void)    // 清理函数
  | void            // 无操作

/**
 * 可取消订阅接口
 */
export interface Unsubscribable {
  unsubscribe(): void
}

/**
 * Subscription 接口
 */
export interface SubscriptionLike extends Unsubscribable {
  readonly closed: boolean
  unsubscribe(): void
}
```

## 基础实现

```typescript
// src/internal/Subscription.ts

import type { TeardownLogic, SubscriptionLike, Unsubscribable } from '../types'

/**
 * Subscription - 表示可释放资源的类
 * 
 * 主要功能：
 * 1. 调用 unsubscribe() 释放资源
 * 2. 通过 add() 添加子资源，级联释放
 * 3. 支持清理函数和子 Subscription
 */
export class Subscription implements SubscriptionLike {
  /** 表示空的 Subscription */
  public static EMPTY = (() => {
    const empty = new Subscription()
    empty.closed = true
    return empty
  })()

  /** 是否已取消 */
  public closed = false

  /** 清理逻辑列表 */
  private _teardowns: Set<Exclude<TeardownLogic, void>> | null = null

  /** 父 Subscription 列表 */
  private _parentage: Subscription[] | Subscription | null = null

  /**
   * 创建 Subscription
   * @param initialTeardown 初始清理函数
   */
  constructor(private initialTeardown?: (() => void) | null) {}

  /**
   * 取消订阅，释放所有资源
   */
  unsubscribe(): void {
    if (this.closed) return

    this.closed = true

    // 从父级移除自己
    const { _parentage } = this
    if (_parentage) {
      this._parentage = null
      if (Array.isArray(_parentage)) {
        for (const parent of _parentage) {
          parent.remove(this)
        }
      } else {
        _parentage.remove(this)
      }
    }

    // 执行初始清理
    const { initialTeardown } = this
    if (typeof initialTeardown === 'function') {
      try {
        initialTeardown()
      } catch (e) {
        reportError(e)
      }
    }

    // 执行所有添加的清理逻辑
    const { _teardowns } = this
    if (_teardowns) {
      this._teardowns = null
      for (const teardown of _teardowns) {
        try {
          execTeardown(teardown)
        } catch (e) {
          reportError(e)
        }
      }
    }
  }

  /**
   * 添加清理逻辑
   */
  add(teardown: TeardownLogic): void {
    // 忽略空值
    if (!teardown || teardown === this) return

    // 已关闭则立即执行
    if (this.closed) {
      execTeardown(teardown)
      return
    }

    // 如果是 Subscription，建立父子关系
    if (teardown instanceof Subscription) {
      if (teardown.closed) return
      teardown._addParent(this)
    }

    // 添加到清理列表
    if (!this._teardowns) {
      this._teardowns = new Set()
    }
    this._teardowns.add(teardown)
  }

  /**
   * 移除清理逻辑
   */
  remove(teardown: Exclude<TeardownLogic, void>): void {
    this._teardowns?.delete(teardown)
  }

  /**
   * 添加父级
   */
  private _addParent(parent: Subscription): void {
    const { _parentage } = this
    if (_parentage === parent) return

    if (!_parentage) {
      this._parentage = parent
    } else if (Array.isArray(_parentage)) {
      if (!_parentage.includes(parent)) {
        _parentage.push(parent)
      }
    } else if (_parentage !== parent) {
      this._parentage = [_parentage, parent]
    }
  }
}

/**
 * 执行清理逻辑
 */
function execTeardown(teardown: Exclude<TeardownLogic, void>): void {
  if (typeof teardown === 'function') {
    teardown()
  } else {
    teardown.unsubscribe()
  }
}

/**
 * 报告错误（异步抛出）
 */
function reportError(err: unknown): void {
  setTimeout(() => { throw err }, 0)
}
```

## 核心逻辑详解

### unsubscribe 流程

```
unsubscribe()
     │
     ▼
┌──────────────────┐
│ 已经关闭？        │──是──▶ 返回（幂等）
└──────────────────┘
     │否
     ▼
设置 closed = true
     │
     ▼
从所有父级移除自己
     │
     ▼
执行 initialTeardown
     │
     ▼
遍历执行所有 _teardowns
     │
     ▼
完成
```

### add 流程

```
add(teardown)
     │
     ▼
┌──────────────────┐
│ 空值或自身？      │──是──▶ 返回
└──────────────────┘
     │否
     ▼
┌──────────────────┐
│ 已经关闭？        │──是──▶ 立即执行 teardown
└──────────────────┘
     │否
     ▼
┌──────────────────┐
│ 是 Subscription？ │──是──▶ 建立父子关系
└──────────────────┘
     │
     ▼
添加到 _teardowns 集合
```

### 父子关系管理

为什么需要父子关系？

```typescript
const parent = source1$.subscribe(console.log)
const child = source2$.subscribe(console.log)

parent.add(child)

// 此时 child._parentage = parent

parent.unsubscribe()
// 1. parent.closed = true
// 2. 执行 child.unsubscribe()
// 3. child 从 parent 移除自己（但 parent 已关闭，无影响）
```

如果没有父子关系：

```typescript
child.unsubscribe()
// child 需要知道 parent 才能从中移除自己
// 否则 parent._teardowns 中还有对 child 的引用
// 可能导致重复执行
```

## 错误隔离

一个清理失败不应影响其他清理：

```typescript
const sub = new Subscription()

sub.add(() => console.log('A'))
sub.add(() => { throw new Error('B 失败') })
sub.add(() => console.log('C'))

sub.unsubscribe()

// 输出:
// A
// C
// (异步) Uncaught Error: B 失败
```

所有清理都会执行，错误不会中断流程。

## 静态 EMPTY

预创建的已关闭 Subscription：

```typescript
const empty = Subscription.EMPTY

console.log(empty.closed)  // true

empty.add(() => console.log('会立即执行'))
// 输出: 会立即执行

empty.unsubscribe()  // 无操作
```

用途：

1. 表示"无需清理"的情况
2. 作为默认值避免 null 检查
3. 测试时的占位符

## 使用示例

### 基本使用

```typescript
const sub = new Subscription()

// 添加清理函数
sub.add(() => console.log('清理资源1'))
sub.add(() => console.log('清理资源2'))

// 取消
sub.unsubscribe()
// 输出:
// 清理资源1
// 清理资源2
```

### 嵌套订阅

```typescript
const parent = new Subscription()
const child1 = new Subscription(() => console.log('child1 清理'))
const child2 = new Subscription(() => console.log('child2 清理'))

parent.add(child1)
parent.add(child2)

parent.unsubscribe()
// 输出:
// child1 清理
// child2 清理
```

### 与 Observable 结合

```typescript
const source$ = new Observable(subscriber => {
  const timer = setInterval(() => {
    subscriber.next(Date.now())
  }, 1000)

  // 返回清理函数
  return () => {
    clearInterval(timer)
    console.log('定时器已清理')
  }
})

const sub = source$.subscribe(console.log)

// 5秒后取消
setTimeout(() => {
  sub.unsubscribe()  // 输出: 定时器已清理
}, 5000)
```

## 测试

```typescript
import { describe, it, expect, vi } from 'vitest'
import { Subscription } from './Subscription'

describe('Subscription', () => {
  describe('unsubscribe', () => {
    it('应该执行清理函数', () => {
      const teardown = vi.fn()
      const sub = new Subscription(teardown)

      sub.unsubscribe()

      expect(teardown).toHaveBeenCalledTimes(1)
    })

    it('应该是幂等的', () => {
      const teardown = vi.fn()
      const sub = new Subscription(teardown)

      sub.unsubscribe()
      sub.unsubscribe()
      sub.unsubscribe()

      expect(teardown).toHaveBeenCalledTimes(1)
    })

    it('应该设置 closed 为 true', () => {
      const sub = new Subscription()

      expect(sub.closed).toBe(false)
      sub.unsubscribe()
      expect(sub.closed).toBe(true)
    })
  })

  describe('add', () => {
    it('应该执行添加的清理函数', () => {
      const fn1 = vi.fn()
      const fn2 = vi.fn()
      const sub = new Subscription()

      sub.add(fn1)
      sub.add(fn2)
      sub.unsubscribe()

      expect(fn1).toHaveBeenCalled()
      expect(fn2).toHaveBeenCalled()
    })

    it('添加到已关闭的 Subscription 应立即执行', () => {
      const fn = vi.fn()
      const sub = new Subscription()

      sub.unsubscribe()
      sub.add(fn)

      expect(fn).toHaveBeenCalled()
    })

    it('应该级联取消子 Subscription', () => {
      const childTeardown = vi.fn()
      const parent = new Subscription()
      const child = new Subscription(childTeardown)

      parent.add(child)
      parent.unsubscribe()

      expect(child.closed).toBe(true)
      expect(childTeardown).toHaveBeenCalled()
    })
  })

  describe('remove', () => {
    it('应该移除清理逻辑', () => {
      const fn = vi.fn()
      const sub = new Subscription()

      sub.add(fn)
      sub.remove(fn)
      sub.unsubscribe()

      expect(fn).not.toHaveBeenCalled()
    })
  })

  describe('错误隔离', () => {
    it('一个清理失败不应影响其他', () => {
      vi.useFakeTimers()

      const fn1 = vi.fn()
      const fn2 = vi.fn(() => { throw new Error('test') })
      const fn3 = vi.fn()

      const sub = new Subscription()
      sub.add(fn1)
      sub.add(fn2)
      sub.add(fn3)

      sub.unsubscribe()

      expect(fn1).toHaveBeenCalled()
      expect(fn3).toHaveBeenCalled()

      vi.useRealTimers()
    })
  })

  describe('EMPTY', () => {
    it('应该是已关闭的', () => {
      expect(Subscription.EMPTY.closed).toBe(true)
    })

    it('add 应该立即执行', () => {
      const fn = vi.fn()
      Subscription.EMPTY.add(fn)
      expect(fn).toHaveBeenCalled()
    })
  })
})
```

## 本章小结

本章实现了完整的 Subscription 类：

- **核心属性**：closed 表示是否已取消
- **核心方法**：unsubscribe、add、remove
- **父子关系**：支持级联取消
- **错误隔离**：清理错误不影响其他清理
- **幂等性**：多次 unsubscribe 无副作用
- **静态 EMPTY**：预创建的已关闭实例

Subscription 是 RxJS 资源管理的基石。下一章，我们将学习如何优雅地组合多个 Subscription。

---

**思考题**：

1. 为什么 _teardowns 使用 Set 而不是数组？
2. 如果 add 的是一个已关闭的子 Subscription，应该怎么处理？
3. 如何实现一个有超时自动取消功能的 Subscription？
