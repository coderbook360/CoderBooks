# Getter/Setter 统一设计

Day.js 的 getter/setter 采用了一种优雅的统一设计：**同一个方法，无参数时是 getter，有参数时是 setter**。

## 设计理念

这种设计来自 jQuery 时代：

```javascript
// jQuery 的设计
$('#el').text()         // getter，返回文本
$('#el').text('hello')  // setter，设置文本

// Day.js 继承了这种风格
dayjs().year()      // getter，返回年份
dayjs().year(2025)  // setter，设置年份（返回新实例）
```

优点是 API 简洁，记忆负担小。

## 类型定义

TypeScript 中需要用函数重载来表达这种设计：

```typescript
// src/types.ts
export interface Dayjs {
  // 年份
  year(): number
  year(value: number): Dayjs
  
  // 月份
  month(): number
  month(value: number): Dayjs
  
  // 日期
  date(): number
  date(value: number): Dayjs
  
  // ... 其他类似
}
```

## 实现统一的 get/set 方法

我们先实现一个通用的内部方法，然后让各个具体方法调用它：

```typescript
// src/dayjs.ts
export class Dayjs {
  private $d: Date
  private $u: boolean
  // ... 缓存字段

  /**
   * 通用的 getter/setter
   */
  private $g(unit: string): number
  private $g(unit: string, value: number): Dayjs
  private $g(unit: string, value?: number): number | Dayjs {
    if (value === undefined) {
      return this.get(unit)
    }
    return this.set(unit, value)
  }

  /**
   * 获取指定单位的值
   */
  get(unit: string): number {
    switch (normalizeUnit(unit)) {
      case 'year': return this.$y
      case 'month': return this.$M
      case 'date': return this.$D
      case 'day': return this.$W
      case 'hour': return this.$H
      case 'minute': return this.$m
      case 'second': return this.$s
      case 'millisecond': return this.$ms
      default: return NaN
    }
  }

  /**
   * 设置指定单位的值（返回新实例）
   */
  set(unit: string, value: number): Dayjs {
    const d = new Date(this.$d.getTime())
    const u = normalizeUnit(unit)
    
    const setter = this.$u ? UTC_SETTERS : LOCAL_SETTERS
    setter[u]?.(d, value)
    
    return new Dayjs(d, { utc: this.$u })
  }
}

// 本地时间 setter 映射
const LOCAL_SETTERS: Record<string, (d: Date, v: number) => void> = {
  year: (d, v) => d.setFullYear(v),
  month: (d, v) => d.setMonth(v),
  date: (d, v) => d.setDate(v),
  hour: (d, v) => d.setHours(v),
  minute: (d, v) => d.setMinutes(v),
  second: (d, v) => d.setSeconds(v),
  millisecond: (d, v) => d.setMilliseconds(v),
}

// UTC setter 映射
const UTC_SETTERS: Record<string, (d: Date, v: number) => void> = {
  year: (d, v) => d.setUTCFullYear(v),
  month: (d, v) => d.setUTCMonth(v),
  date: (d, v) => d.setUTCDate(v),
  hour: (d, v) => d.setUTCHours(v),
  minute: (d, v) => d.setUTCMinutes(v),
  second: (d, v) => d.setUTCSeconds(v),
  millisecond: (d, v) => d.setUTCMilliseconds(v),
}
```

## 具体方法实现

有了通用方法，各个具体方法的实现就非常简洁：

```typescript
class Dayjs {
  // 年份
  year(): number
  year(value: number): Dayjs
  year(value?: number): number | Dayjs {
    return this.$g('year', value as number)
  }

  // 月份 (0-11)
  month(): number
  month(value: number): Dayjs
  month(value?: number): number | Dayjs {
    return this.$g('month', value as number)
  }

  // 日期 (1-31)
  date(): number
  date(value: number): Dayjs
  date(value?: number): number | Dayjs {
    return this.$g('date', value as number)
  }

  // 星期 (0-6)，只读
  day(): number {
    return this.$W
  }

  // 小时 (0-23)
  hour(): number
  hour(value: number): Dayjs
  hour(value?: number): number | Dayjs {
    return this.$g('hour', value as number)
  }

  // 分钟 (0-59)
  minute(): number
  minute(value: number): Dayjs
  minute(value?: number): number | Dayjs {
    return this.$g('minute', value as number)
  }

  // 秒 (0-59)
  second(): number
  second(value: number): Dayjs
  second(value?: number): number | Dayjs {
    return this.$g('second', value as number)
  }

  // 毫秒 (0-999)
  millisecond(): number
  millisecond(value: number): Dayjs
  millisecond(value?: number): number | Dayjs {
    return this.$g('millisecond', value as number)
  }
}
```

## 链式调用

由于 setter 返回新实例，天然支持链式调用：

```javascript
dayjs('2024-01-01')
  .year(2025)
  .month(5)
  .date(15)
  .hour(10)
  .minute(30)
// 结果：2025-06-15 10:30
```

每一步都返回新实例，原实例不变。

## 特殊情况处理

### 月份边界

设置月份时，如果当前日期超过目标月份的天数，Date 会自动溢出：

```javascript
dayjs('2024-01-31').month(1)  // 设置为2月
// 结果：2024-03-02（2月没有31日，溢出到3月）
```

Day.js 保持这个行为。如果需要避免溢出，可以先设置日期再设置月份。

### 星期设置

`day()` 在 Day.js 中可以设置，但行为特殊：

```typescript
// 设置星期几，会调整日期
day(value: number): Dayjs {
  if (value === undefined) {
    return this.$W
  }
  // 计算需要调整的天数
  const diff = value - this.$W
  return this.add(diff, 'day')
}
```

```javascript
dayjs('2024-12-25').day(0)  // 设置为周日
// 2024-12-25 是周三(3)，设置为周日(0)
// 结果：2024-12-22（往前3天）
```

## 测试用例

```typescript
describe('Getter/Setter', () => {
  const base = dayjs('2024-06-15T10:30:45.123')

  describe('Getter', () => {
    it('year()', () => expect(base.year()).toBe(2024))
    it('month()', () => expect(base.month()).toBe(5)) // 0-indexed
    it('date()', () => expect(base.date()).toBe(15))
    it('day()', () => expect(base.day()).toBe(6)) // 周六
    it('hour()', () => expect(base.hour()).toBe(10))
    it('minute()', () => expect(base.minute()).toBe(30))
    it('second()', () => expect(base.second()).toBe(45))
    it('millisecond()', () => expect(base.millisecond()).toBe(123))
  })

  describe('Setter', () => {
    it('year() 返回新实例', () => {
      const newDate = base.year(2025)
      expect(newDate.year()).toBe(2025)
      expect(base.year()).toBe(2024) // 原实例不变
    })

    it('month() 设置月份', () => {
      expect(base.month(0).month()).toBe(0) // 一月
    })

    it('链式调用', () => {
      const result = base.year(2025).month(0).date(1)
      expect(result.format('YYYY-MM-DD')).toBe('2025-01-01')
    })
  })

  describe('边界情况', () => {
    it('月份溢出', () => {
      const jan31 = dayjs('2024-01-31')
      const feb = jan31.month(1)
      // 2月没有31日，溢出到3月
      expect(feb.month()).toBe(2)
    })
  })
})
```

## 小结

本章实现了统一的 getter/setter 设计：

- **统一 API**：无参数 getter，有参数 setter
- **不可变**：setter 返回新实例
- **链式调用**：天然支持
- **UTC 支持**：根据模式选择正确的原生方法

这种设计简洁优雅，是 Day.js API 的核心特征。
