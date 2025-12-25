# diff 日期差值计算

`diff` 方法计算两个日期之间的差值，是 Day.js 最常用的方法之一。

## API 设计

```javascript
const a = dayjs('2024-12-25')
const b = dayjs('2024-01-01')

a.diff(b)              // 毫秒差（默认）
a.diff(b, 'day')       // 天数差
a.diff(b, 'month')     // 月数差
a.diff(b, 'year')      // 年数差
a.diff(b, 'month', true)  // 精确月数差（带小数）
```

## 基础实现

```typescript
class Dayjs {
  /**
   * 计算与另一个日期的差值
   * @param date 目标日期
   * @param unit 单位
   * @param float 是否返回小数
   */
  diff(date: DateInput, unit?: string, float?: boolean): number {
    const other = dayjs(date)
    const u = normalizeUnit(unit || 'millisecond')
    
    // 毫秒差
    const diffMs = this.valueOf() - other.valueOf()
    
    // 根据单位转换
    let result: number
    switch (u) {
      case 'year':
        result = this.monthDiff(other) / 12
        break
      case 'month':
        result = this.monthDiff(other)
        break
      case 'quarter':
        result = this.monthDiff(other) / 3
        break
      case 'week':
        result = diffMs / MILLISECONDS_A_WEEK
        break
      case 'day':
        result = diffMs / MILLISECONDS_A_DAY
        break
      case 'hour':
        result = diffMs / MILLISECONDS_A_HOUR
        break
      case 'minute':
        result = diffMs / MILLISECONDS_A_MINUTE
        break
      case 'second':
        result = diffMs / MILLISECONDS_A_SECOND
        break
      default:
        result = diffMs
    }
    
    return float ? result : Math.trunc(result)
  }
}
```

## 月份差值计算

月份差值不能简单地用毫秒除法，因为每月天数不同：

```typescript
class Dayjs {
  /**
   * 计算月份差值（可能为小数）
   */
  private monthDiff(other: Dayjs): number {
    // 判断方向
    const isPositive = this.valueOf() >= other.valueOf()
    const [end, start] = isPositive ? [this, other] : [other, this]
    
    // 完整月份数
    const wholeMonths = 
      (end.$y - start.$y) * 12 + (end.$M - start.$M)
    
    // 计算小数部分
    // anchor：start 加上完整月份后的日期
    const anchor = start.add(wholeMonths, 'month')
    
    // 是否超过了 anchor
    const isAfterAnchor = end.valueOf() >= anchor.valueOf()
    
    let diff: number
    if (isAfterAnchor) {
      // end 在 anchor 之后，计算剩余天数占比
      const nextAnchor = start.add(wholeMonths + 1, 'month')
      const daysInSegment = nextAnchor.valueOf() - anchor.valueOf()
      const daysRemaining = end.valueOf() - anchor.valueOf()
      diff = wholeMonths + daysRemaining / daysInSegment
    } else {
      // end 在 anchor 之前（因为月末日期溢出）
      const prevAnchor = start.add(wholeMonths - 1, 'month')
      const daysInSegment = anchor.valueOf() - prevAnchor.valueOf()
      const daysRemaining = end.valueOf() - prevAnchor.valueOf()
      diff = wholeMonths - 1 + daysRemaining / daysInSegment
    }
    
    return isPositive ? diff : -diff
  }
}
```

为什么月份差值这么复杂？看这个例子：

```javascript
const a = dayjs('2024-01-31')
const b = dayjs('2024-02-29')

// 2月29日 - 1月31日 = ?
// 不到 1 个月（29天），但也不是简单的 29/31
```

## 简化版实现

Day.js 官方实现更简洁：

```typescript
private monthDiff(other: Dayjs): number {
  const yearDiff = this.$y - other.$y
  const monthDiff = this.$M - other.$M
  const dateDiff = (this.$D - other.$D) / 31  // 简化：用 31 天
  
  return yearDiff * 12 + monthDiff + dateDiff
}
```

这是一个近似值，对于大多数场景足够用。

## 负数处理

`diff` 的结果可以是负数：

```javascript
dayjs('2024-01-01').diff('2024-12-31', 'day')  // -365
dayjs('2024-12-31').diff('2024-01-01', 'day')  // 365
```

Day.js 始终返回 `this - other`，所以：
- `this` 在 `other` 之后 → 正数
- `this` 在 `other` 之前 → 负数

## 取整行为

默认情况下，`diff` 向零取整（`Math.trunc`）：

```javascript
dayjs('2024-01-02').diff('2024-01-01', 'day')   // 1
dayjs('2024-01-01').diff('2024-01-02', 'day')   // -1

// 0.5 天
dayjs('2024-01-01T12:00').diff('2024-01-01T00:00', 'day')       // 0
dayjs('2024-01-01T12:00').diff('2024-01-01T00:00', 'day', true) // 0.5
```

## 精确差值

第三个参数 `float: true` 返回精确值：

```javascript
const a = dayjs('2024-06-15')
const b = dayjs('2024-01-01')

a.diff(b, 'month')        // 5
a.diff(b, 'month', true)  // 5.451612903225806
```

## 实用示例

### 计算年龄

```javascript
function getAge(birthday) {
  return dayjs().diff(birthday, 'year')
}

getAge('1990-05-15')  // 34（假设今天是2024年12月）
```

### 计算天数

```javascript
function getDaysUntil(targetDate) {
  return dayjs(targetDate).diff(dayjs(), 'day')
}

getDaysUntil('2024-12-31')  // 距离年底还有几天
```

### 计算持续时间

```javascript
function getDuration(startTime, endTime) {
  const hours = dayjs(endTime).diff(startTime, 'hour')
  const minutes = dayjs(endTime).diff(startTime, 'minute') % 60
  return `${hours}小时${minutes}分钟`
}
```

### 相对时间计算

```javascript
function getRelativeTime(date) {
  const diff = dayjs().diff(date, 'second')
  
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`
  return `${Math.floor(diff / 86400)}天前`
}
```

## 测试用例

```typescript
describe('diff', () => {
  describe('基础差值', () => {
    it('毫秒差（默认）', () => {
      const a = dayjs('2024-01-01T00:00:00')
      const b = dayjs('2024-01-01T00:00:01')
      expect(b.diff(a)).toBe(1000)
    })

    it('天数差', () => {
      const a = dayjs('2024-01-01')
      const b = dayjs('2024-01-10')
      expect(b.diff(a, 'day')).toBe(9)
    })

    it('月份差', () => {
      const a = dayjs('2024-01-15')
      const b = dayjs('2024-06-15')
      expect(b.diff(a, 'month')).toBe(5)
    })

    it('年份差', () => {
      const a = dayjs('2020-01-01')
      const b = dayjs('2024-01-01')
      expect(b.diff(a, 'year')).toBe(4)
    })
  })

  describe('负数', () => {
    it('过去的日期返回负数', () => {
      const past = dayjs('2024-01-01')
      const future = dayjs('2024-12-31')
      expect(past.diff(future, 'day')).toBeLessThan(0)
    })
  })

  describe('精确值', () => {
    it('float=true 返回小数', () => {
      const a = dayjs('2024-01-01T00:00')
      const b = dayjs('2024-01-01T12:00')
      expect(b.diff(a, 'day', true)).toBe(0.5)
    })
  })

  describe('取整', () => {
    it('向零取整', () => {
      const a = dayjs('2024-01-01T00:00')
      const b = dayjs('2024-01-01T23:59')
      expect(b.diff(a, 'day')).toBe(0) // 不满 1 天
    })
  })

  describe('月份差特殊情况', () => {
    it('跨年月份差', () => {
      const a = dayjs('2023-12-15')
      const b = dayjs('2024-02-15')
      expect(b.diff(a, 'month')).toBe(2)
    })
  })
})
```

## 小结

本章实现了 `diff` 方法：

- **基础计算**：毫秒差值转换为目标单位
- **月份差值**：特殊处理，考虑每月天数不同
- **负数支持**：this 在 other 之前返回负数
- **精确值**：`float: true` 返回小数

`diff` 是日期计算中最常用的方法之一，理解其实现细节很重要。
