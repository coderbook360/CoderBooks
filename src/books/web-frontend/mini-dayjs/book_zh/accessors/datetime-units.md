# 年月日时分秒毫秒操作

本章详细讲解各个时间单位的操作实现。

## 时间单位概览

Day.js 支持的时间单位：

| 单位 | 简写 | 方法 | 范围 |
|------|------|------|------|
| 年 | y | year() | 无限制 |
| 月 | M | month() | 0-11 |
| 日 | D/d | date() | 1-31 |
| 星期 | d | day() | 0-6 |
| 小时 | h/H | hour() | 0-23 |
| 分钟 | m | minute() | 0-59 |
| 秒 | s | second() | 0-59 |
| 毫秒 | ms | millisecond() | 0-999 |

## 年份操作

年份是唯一没有范围限制的单位：

```typescript
class Dayjs {
  /**
   * 获取/设置年份
   */
  year(): number
  year(value: number): Dayjs
  year(value?: number): number | Dayjs {
    if (value === undefined) {
      return this.$y
    }
    return this.set('year', value)
  }

  /**
   * 判断是否闰年
   */
  isLeapYear(): boolean {
    const year = this.$y
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
  }
}
```

```javascript
dayjs('2024-02-29').isLeapYear()  // true（2024是闰年）
dayjs('2023-02-28').isLeapYear()  // false
```

## 月份操作

月份是 **0-indexed**（0=一月，11=十二月）：

```typescript
class Dayjs {
  /**
   * 获取/设置月份 (0-11)
   */
  month(): number
  month(value: number): Dayjs
  month(value?: number): number | Dayjs {
    if (value === undefined) {
      return this.$M
    }
    return this.set('month', value)
  }

  /**
   * 获取当月天数
   */
  daysInMonth(): number {
    return this.endOf('month').date()
  }
}
```

为什么 `daysInMonth()` 这样实现？

`endOf('month')` 会返回当月最后一天的 23:59:59.999，取它的 `date()` 就是当月天数。

```javascript
dayjs('2024-02-15').daysInMonth()  // 29（闰年2月）
dayjs('2024-01-15').daysInMonth()  // 31
dayjs('2024-04-15').daysInMonth()  // 30
```

## 日期操作

日期范围 1-31，超出会自动溢出：

```typescript
class Dayjs {
  /**
   * 获取/设置日期 (1-31)
   */
  date(): number
  date(value: number): Dayjs
  date(value?: number): number | Dayjs {
    if (value === undefined) {
      return this.$D
    }
    return this.set('date', value)
  }

  /**
   * 获取当年的第几天 (1-366)
   */
  dayOfYear(): number {
    const startOfYear = this.startOf('year')
    const diff = this.diff(startOfYear, 'day')
    return diff + 1
  }
}
```

```javascript
dayjs('2024-01-01').dayOfYear()  // 1
dayjs('2024-12-31').dayOfYear()  // 366（闰年）
```

## 星期操作

星期（0=周日，6=周六）：

```typescript
class Dayjs {
  /**
   * 获取星期几 (0-6, 0=周日)
   */
  day(): number
  day(value: number): Dayjs
  day(value?: number): number | Dayjs {
    if (value === undefined) {
      return this.$W
    }
    // 设置星期：调整日期
    const currentDay = this.$W
    const diff = value - currentDay
    return this.add(diff, 'day')
  }
}
```

设置星期会调整日期，保持在当前周内：

```javascript
const wed = dayjs('2024-12-25')  // 周三
wed.day()      // 3
wed.day(0)     // 周日 -> 2024-12-22
wed.day(6)     // 周六 -> 2024-12-28
```

## 小时操作

小时范围 0-23：

```typescript
class Dayjs {
  /**
   * 获取/设置小时 (0-23)
   */
  hour(): number
  hour(value: number): Dayjs
  hour(value?: number): number | Dayjs {
    if (value === undefined) {
      return this.$H
    }
    return this.set('hour', value)
  }
}
```

超出范围会溢出到相邻日期：

```javascript
dayjs('2024-12-25T10:00').hour(25)   // 2024-12-26T01:00
dayjs('2024-12-25T10:00').hour(-1)   // 2024-12-24T23:00
```

## 分钟、秒、毫秒操作

实现模式相同：

```typescript
class Dayjs {
  /**
   * 获取/设置分钟 (0-59)
   */
  minute(): number
  minute(value: number): Dayjs
  minute(value?: number): number | Dayjs {
    if (value === undefined) {
      return this.$m
    }
    return this.set('minute', value)
  }

  /**
   * 获取/设置秒 (0-59)
   */
  second(): number
  second(value: number): Dayjs
  second(value?: number): number | Dayjs {
    if (value === undefined) {
      return this.$s
    }
    return this.set('second', value)
  }

  /**
   * 获取/设置毫秒 (0-999)
   */
  millisecond(): number
  millisecond(value: number): Dayjs
  millisecond(value?: number): number | Dayjs {
    if (value === undefined) {
      return this.$ms
    }
    return this.set('millisecond', value)
  }
}
```

## 便捷方法

Day.js 还提供了一些便捷方法：

```typescript
class Dayjs {
  /**
   * 获取时间戳（毫秒）
   */
  valueOf(): number {
    return this.$d.getTime()
  }

  /**
   * 获取 Unix 时间戳（秒）
   */
  unix(): number {
    return Math.floor(this.valueOf() / 1000)
  }

  /**
   * 返回原生 Date 对象的副本
   */
  toDate(): Date {
    return new Date(this.$d.getTime())
  }

  /**
   * 返回 ISO 字符串
   */
  toISOString(): string {
    return this.$d.toISOString()
  }

  /**
   * 返回 JSON 格式（ISO 字符串）
   */
  toJSON(): string {
    return this.toISOString()
  }
}
```

## 批量设置

有时需要一次设置多个值：

```typescript
class Dayjs {
  /**
   * 批量设置多个字段
   */
  set(values: Partial<DateUnits>): Dayjs {
    let result: Dayjs = this
    
    if (values.year !== undefined) result = result.year(values.year)
    if (values.month !== undefined) result = result.month(values.month)
    if (values.date !== undefined) result = result.date(values.date)
    if (values.hour !== undefined) result = result.hour(values.hour)
    if (values.minute !== undefined) result = result.minute(values.minute)
    if (values.second !== undefined) result = result.second(values.second)
    if (values.millisecond !== undefined) result = result.millisecond(values.millisecond)
    
    return result
  }
}

interface DateUnits {
  year: number
  month: number
  date: number
  hour: number
  minute: number
  second: number
  millisecond: number
}
```

```javascript
dayjs().set({ year: 2025, month: 0, date: 1 })
// 等价于
dayjs().year(2025).month(0).date(1)
```

## 测试用例

```typescript
describe('时间单位操作', () => {
  describe('年份', () => {
    it('isLeapYear() 判断闰年', () => {
      expect(dayjs('2024-01-01').isLeapYear()).toBe(true)
      expect(dayjs('2023-01-01').isLeapYear()).toBe(false)
      expect(dayjs('2000-01-01').isLeapYear()).toBe(true)
      expect(dayjs('1900-01-01').isLeapYear()).toBe(false)
    })
  })

  describe('月份', () => {
    it('daysInMonth() 返回当月天数', () => {
      expect(dayjs('2024-02-15').daysInMonth()).toBe(29)
      expect(dayjs('2023-02-15').daysInMonth()).toBe(28)
      expect(dayjs('2024-01-15').daysInMonth()).toBe(31)
    })
  })

  describe('日期', () => {
    it('dayOfYear() 返回当年第几天', () => {
      expect(dayjs('2024-01-01').dayOfYear()).toBe(1)
      expect(dayjs('2024-02-01').dayOfYear()).toBe(32)
    })
  })

  describe('星期', () => {
    it('day() 设置会调整日期', () => {
      const wed = dayjs('2024-12-25') // 周三
      expect(wed.day()).toBe(3)
      expect(wed.day(0).format('YYYY-MM-DD')).toBe('2024-12-22')
      expect(wed.day(6).format('YYYY-MM-DD')).toBe('2024-12-28')
    })
  })

  describe('溢出处理', () => {
    it('小时溢出到下一天', () => {
      const d = dayjs('2024-12-25T23:00')
      expect(d.hour(25).date()).toBe(26)
    })

    it('日期溢出到下个月', () => {
      const d = dayjs('2024-01-15')
      expect(d.date(32).month()).toBe(1) // 2月
    })
  })
})
```

## 小结

本章详细实现了各时间单位的操作：

- **年份**：year()、isLeapYear()
- **月份**：month()、daysInMonth()
- **日期**：date()、dayOfYear()
- **星期**：day()（设置会调整日期）
- **时分秒毫秒**：hour()、minute()、second()、millisecond()
- **便捷方法**：valueOf()、unix()、toDate()、toISOString()

所有 setter 都返回新实例，保持不可变性。
