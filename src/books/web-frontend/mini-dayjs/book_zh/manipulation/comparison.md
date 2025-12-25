# 日期比较方法

Day.js 提供了多种日期比较方法：`isBefore`、`isAfter`、`isSame`、`isSameOrBefore`、`isSameOrAfter`。

## 基础比较

最简单的比较是直接比较时间戳：

```typescript
class Dayjs {
  /**
   * 是否在指定日期之前
   */
  isBefore(date: DateInput, unit?: string): boolean {
    const other = dayjs(date)
    
    if (!unit) {
      // 无单位：比较毫秒时间戳
      return this.valueOf() < other.valueOf()
    }
    
    // 有单位：比较指定精度
    return this.endOf(unit).valueOf() < other.startOf(unit).valueOf()
  }

  /**
   * 是否在指定日期之后
   */
  isAfter(date: DateInput, unit?: string): boolean {
    const other = dayjs(date)
    
    if (!unit) {
      return this.valueOf() > other.valueOf()
    }
    
    return this.startOf(unit).valueOf() > other.endOf(unit).valueOf()
  }

  /**
   * 是否与指定日期相同
   */
  isSame(date: DateInput, unit?: string): boolean {
    const other = dayjs(date)
    
    if (!unit) {
      return this.valueOf() === other.valueOf()
    }
    
    // 同一单位开始时刻相同
    return this.startOf(unit).valueOf() === other.startOf(unit).valueOf()
  }
}
```

## 理解单位比较

当指定单位时，比较的是"在该单位精度下是否满足条件"。

```javascript
const a = dayjs('2024-12-25 10:30')
const b = dayjs('2024-12-25 14:00')

// 无单位：精确比较
a.isBefore(b)              // true（10:30 < 14:00）

// 指定单位：按该精度比较
a.isBefore(b, 'day')       // false（同一天）
a.isSame(b, 'day')         // true（同一天）
a.isBefore(b, 'hour')      // true（10点 < 14点）
```

## isSameOrBefore / isSameOrAfter

这两个方法是 `isSame` 和 `isBefore`/`isAfter` 的组合：

```typescript
class Dayjs {
  /**
   * 是否相同或之前
   */
  isSameOrBefore(date: DateInput, unit?: string): boolean {
    return this.isSame(date, unit) || this.isBefore(date, unit)
  }

  /**
   * 是否相同或之后
   */
  isSameOrAfter(date: DateInput, unit?: string): boolean {
    return this.isSame(date, unit) || this.isAfter(date, unit)
  }
}
```

Day.js 官方将这两个方法放在 `isSameOrBefore` 和 `isSameOrAfter` 插件中。

## 优化实现

上面的 `isSameOrBefore` 实现调用了两次比较，可以优化：

```typescript
class Dayjs {
  isSameOrBefore(date: DateInput, unit?: string): boolean {
    const other = dayjs(date)
    
    if (!unit) {
      return this.valueOf() <= other.valueOf()
    }
    
    return this.startOf(unit).valueOf() <= other.startOf(unit).valueOf()
  }

  isSameOrAfter(date: DateInput, unit?: string): boolean {
    const other = dayjs(date)
    
    if (!unit) {
      return this.valueOf() >= other.valueOf()
    }
    
    return this.startOf(unit).valueOf() >= other.startOf(unit).valueOf()
  }
}
```

## isBetween 方法

判断日期是否在两个日期之间：

```typescript
class Dayjs {
  /**
   * 是否在两个日期之间
   * @param a 开始日期
   * @param b 结束日期
   * @param unit 比较单位
   * @param inclusivity 包含方式：'()', '[]', '[)', '(]'
   */
  isBetween(
    a: DateInput, 
    b: DateInput, 
    unit?: string, 
    inclusivity: string = '()'
  ): boolean {
    const start = dayjs(a)
    const end = dayjs(b)
    
    const isBeforeStart = inclusivity[0] === '(' 
      ? this.isBefore(start, unit) 
      : !this.isAfter(start, unit)
    
    const isAfterEnd = inclusivity[1] === ')' 
      ? this.isAfter(end, unit) 
      : !this.isBefore(end, unit)
    
    return !isBeforeStart && !isAfterEnd
  }
}
```

`inclusivity` 参数控制边界包含：
- `'()'`：不包含两端（默认）
- `'[]'`：包含两端
- `'[)'`：包含开始，不包含结束
- `'(]'`：不包含开始，包含结束

```javascript
const date = dayjs('2024-06-15')
const start = dayjs('2024-06-01')
const end = dayjs('2024-06-30')

date.isBetween(start, end)           // true
date.isBetween(start, date, 'day')   // false（不包含结束）
date.isBetween(start, date, 'day', '[]')  // true（包含两端）
```

## 实用示例

### 检查日期是否过期

```javascript
function isExpired(expiryDate) {
  return dayjs().isAfter(expiryDate)
}
```

### 检查是否是今天

```javascript
function isToday(date) {
  return dayjs(date).isSame(dayjs(), 'day')
}
```

### 检查是否在有效期内

```javascript
function isValid(startDate, endDate) {
  const now = dayjs()
  return now.isBetween(startDate, endDate, 'day', '[]')
}
```

### 检查是否是同一周

```javascript
function isSameWeek(date1, date2) {
  return dayjs(date1).isSame(date2, 'week')
}
```

## 插件实现

Day.js 将部分比较方法放在插件中：

```typescript
// src/plugins/isSameOrBefore.ts
export default function(option: unknown, DayjsClass: typeof Dayjs) {
  DayjsClass.prototype.isSameOrBefore = function(
    date: DateInput, 
    unit?: string
  ): boolean {
    return this.isSame(date, unit) || this.isBefore(date, unit)
  }
}

// src/plugins/isSameOrAfter.ts
export default function(option: unknown, DayjsClass: typeof Dayjs) {
  DayjsClass.prototype.isSameOrAfter = function(
    date: DateInput, 
    unit?: string
  ): boolean {
    return this.isSame(date, unit) || this.isAfter(date, unit)
  }
}

// src/plugins/isBetween.ts
export default function(option: unknown, DayjsClass: typeof Dayjs) {
  DayjsClass.prototype.isBetween = function(
    a: DateInput,
    b: DateInput,
    unit?: string,
    inclusivity?: string
  ): boolean {
    // ... 实现
  }
}
```

## 测试用例

```typescript
describe('日期比较', () => {
  const earlier = dayjs('2024-06-15 10:00')
  const later = dayjs('2024-06-15 14:00')
  const nextDay = dayjs('2024-06-16 10:00')

  describe('isBefore', () => {
    it('无单位比较', () => {
      expect(earlier.isBefore(later)).toBe(true)
      expect(later.isBefore(earlier)).toBe(false)
    })

    it('按天比较', () => {
      expect(earlier.isBefore(later, 'day')).toBe(false) // 同一天
      expect(earlier.isBefore(nextDay, 'day')).toBe(true)
    })

    it('按小时比较', () => {
      expect(earlier.isBefore(later, 'hour')).toBe(true)
    })
  })

  describe('isAfter', () => {
    it('无单位比较', () => {
      expect(later.isAfter(earlier)).toBe(true)
    })

    it('按天比较', () => {
      expect(later.isAfter(earlier, 'day')).toBe(false) // 同一天
    })
  })

  describe('isSame', () => {
    it('精确比较', () => {
      expect(earlier.isSame(earlier.clone())).toBe(true)
      expect(earlier.isSame(later)).toBe(false)
    })

    it('按天比较', () => {
      expect(earlier.isSame(later, 'day')).toBe(true)
    })

    it('按月比较', () => {
      expect(earlier.isSame(nextDay, 'month')).toBe(true)
    })
  })

  describe('isBetween', () => {
    const start = dayjs('2024-06-01')
    const middle = dayjs('2024-06-15')
    const end = dayjs('2024-06-30')

    it('默认不包含边界', () => {
      expect(middle.isBetween(start, end)).toBe(true)
      expect(start.isBetween(start, end)).toBe(false)
    })

    it('包含边界', () => {
      expect(start.isBetween(start, end, 'day', '[]')).toBe(true)
      expect(end.isBetween(start, end, 'day', '[]')).toBe(true)
    })
  })
})
```

## 小结

本章实现了日期比较方法：

- **isBefore/isAfter**：判断是否在指定日期前/后
- **isSame**：判断是否相同（可指定精度）
- **isSameOrBefore/isSameOrAfter**：包含边界的比较
- **isBetween**：范围判断，支持边界控制

这些方法在日期验证和范围查询中非常常用。
