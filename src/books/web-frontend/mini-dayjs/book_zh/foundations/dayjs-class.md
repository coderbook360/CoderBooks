# Dayjs 类的核心设计

现在我们开始实现 Mini-Dayjs 的核心：`Dayjs` 类。这是整个库的心脏，所有的日期操作都围绕它展开。

## 设计目标

我们要实现的 `Dayjs` 类需要满足：

1. **不可变**：所有操作返回新实例
2. **链式调用**：支持 `dayjs().add(1, 'day').format()`
3. **多格式输入**：支持字符串、时间戳、Date 对象、Dayjs 实例
4. **高性能**：缓存常用字段值

## 类型定义

首先定义类型：

```typescript
// src/types.ts
export type DateInput = string | number | Date | Dayjs | null | undefined

export type UnitType = 
  | 'year' | 'month' | 'day' | 'date' 
  | 'hour' | 'minute' | 'second' | 'millisecond'
  | 'week' | 'quarter'
  | 'y' | 'M' | 'D' | 'd' | 'h' | 'm' | 's' | 'ms' | 'w' | 'Q'

export interface DayjsConfig {
  date: DateInput
  utc?: boolean
  locale?: string
}
```

## 基础类结构

```typescript
// src/dayjs.ts
import { DateInput, UnitType } from './types'
import { normalizeUnit, padStart } from './utils'

export class Dayjs {
  // 内部存储的原生 Date 对象
  private $d: Date
  
  // 缓存的时间字段
  private $y: number   // year
  private $M: number   // month (0-11)
  private $D: number   // date (1-31)
  private $H: number   // hour (0-23)
  private $m: number   // minute (0-59)
  private $s: number   // second (0-59)
  private $ms: number  // millisecond (0-999)
  private $W: number   // weekday (0-6, 0=Sunday)

  constructor(date?: DateInput) {
    this.$d = this.parse(date)
    this.init()
  }

  /**
   * 解析输入，返回 Date 对象
   */
  private parse(date?: DateInput): Date {
    if (date === null || date === undefined) {
      return new Date()
    }
    if (date instanceof Date) {
      return new Date(date.getTime())
    }
    if (date instanceof Dayjs) {
      return new Date(date.$d.getTime())
    }
    if (typeof date === 'number') {
      return new Date(date)
    }
    if (typeof date === 'string') {
      // 简单实现：依赖原生解析
      // 后续章节会详细实现各种格式解析
      return new Date(date)
    }
    return new Date()
  }

  /**
   * 初始化缓存字段
   */
  private init(): void {
    const d = this.$d
    this.$y = d.getFullYear()
    this.$M = d.getMonth()
    this.$D = d.getDate()
    this.$H = d.getHours()
    this.$m = d.getMinutes()
    this.$s = d.getSeconds()
    this.$ms = d.getMilliseconds()
    this.$W = d.getDay()
  }
}
```

思考一下：为什么 `parse` 方法对 Date 和 Dayjs 输入要调用 `new Date(timestamp)`？

答案是**防御性拷贝**。如果直接使用传入的 Date 对象，外部修改会影响 Dayjs 实例的状态，破坏不可变性。

## 实现 clone 方法

不可变的核心是 `clone`，几乎所有操作都依赖它：

```typescript
class Dayjs {
  // ... 前面的代码

  /**
   * 克隆当前实例
   */
  clone(): Dayjs {
    return new Dayjs(this.$d)
  }

  /**
   * 返回原生 Date 对象的副本
   */
  toDate(): Date {
    return new Date(this.$d.getTime())
  }

  /**
   * 返回时间戳（毫秒）
   */
  valueOf(): number {
    return this.$d.getTime()
  }

  /**
   * 返回 Unix 时间戳（秒）
   */
  unix(): number {
    return Math.floor(this.valueOf() / 1000)
  }
}
```

注意 `toDate()` 返回的是**副本**，不是内部的 `$d` 对象。这样外部修改返回值不会影响 Dayjs 实例。

## 基础 Getter 实现

```typescript
class Dayjs {
  // ... 前面的代码

  year(): number {
    return this.$y
  }

  month(): number {
    return this.$M
  }

  date(): number {
    return this.$D
  }

  day(): number {
    return this.$W
  }

  hour(): number {
    return this.$H
  }

  minute(): number {
    return this.$m
  }

  second(): number {
    return this.$s
  }

  millisecond(): number {
    return this.$ms
  }
}
```

直接返回缓存值，性能优于每次调用 `Date.getXxx()`。

## 实现 set 方法

Day.js 的 getter/setter 是统一设计的：不传参是 get，传参是 set。

```typescript
class Dayjs {
  // ... 前面的代码

  /**
   * 设置指定单位的值，返回新实例
   */
  set(unit: UnitType, value: number): Dayjs {
    const normalizedUnit = normalizeUnit(unit)
    
    // 创建新的 Date 对象
    const d = new Date(this.$d.getTime())
    
    switch (normalizedUnit) {
      case 'year':
        d.setFullYear(value)
        break
      case 'month':
        d.setMonth(value)
        break
      case 'date':
      case 'day':
        d.setDate(value)
        break
      case 'hour':
        d.setHours(value)
        break
      case 'minute':
        d.setMinutes(value)
        break
      case 'second':
        d.setSeconds(value)
        break
      case 'millisecond':
        d.setMilliseconds(value)
        break
    }
    
    return new Dayjs(d)
  }
}
```

注意：`set` 不修改当前实例，而是返回**新实例**。这就是不可变的核心。

## 使用示例

```typescript
import dayjs from './index'

// 创建实例
const date = dayjs('2024-12-25')

// Getter
console.log(date.year())   // 2024
console.log(date.month())  // 11 (0-indexed)
console.log(date.date())   // 25

// Setter（返回新实例）
const nextYear = date.set('year', 2025)
console.log(date.year())     // 2024（原实例不变）
console.log(nextYear.year()) // 2025（新实例）

// 链式调用
const newDate = date
  .set('year', 2025)
  .set('month', 0)
  .set('date', 1)
console.log(newDate.format('YYYY-MM-DD')) // 2025-01-01
```

## 测试用例

```typescript
import { describe, it, expect } from 'vitest'
import dayjs from '../src'

describe('Dayjs 核心', () => {
  describe('创建实例', () => {
    it('无参数创建当前时间', () => {
      const d = dayjs()
      const now = new Date()
      expect(d.year()).toBe(now.getFullYear())
    })

    it('从字符串创建', () => {
      const d = dayjs('2024-12-25')
      expect(d.year()).toBe(2024)
      expect(d.month()).toBe(11)
      expect(d.date()).toBe(25)
    })

    it('从时间戳创建', () => {
      const ts = 1703462400000 // 2023-12-25 00:00:00 UTC
      const d = dayjs(ts)
      expect(d.valueOf()).toBe(ts)
    })
  })

  describe('不可变性', () => {
    it('set 返回新实例', () => {
      const d1 = dayjs('2024-01-01')
      const d2 = d1.set('year', 2025)
      expect(d1.year()).toBe(2024)
      expect(d2.year()).toBe(2025)
      expect(d1).not.toBe(d2)
    })

    it('clone 创建独立副本', () => {
      const d1 = dayjs('2024-01-01')
      const d2 = d1.clone()
      expect(d1.valueOf()).toBe(d2.valueOf())
      expect(d1).not.toBe(d2)
    })
  })
})
```

## 小结

本章实现了 `Dayjs` 类的核心：

- **构造函数**：解析多种输入格式
- **字段缓存**：提升 getter 性能
- **不可变设计**：clone、set 都返回新实例
- **基础 API**：year、month、date、hour、minute、second 等

下一章，我们将深入实现多格式日期解析。
