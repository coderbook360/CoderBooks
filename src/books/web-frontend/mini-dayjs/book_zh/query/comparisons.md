# isBefore/isAfter/isSame 实现

本章详细讲解日期比较方法的实现。

## 核心比较方法

### isBefore

判断当前日期是否在目标日期之前：

```typescript
class Dayjs {
  isBefore(date: DateInput, unit?: string): boolean {
    const other = dayjs(date)
    const u = normalizeUnit(unit)
    
    if (!u) {
      return this.valueOf() < other.valueOf()
    }
    
    return this.endOf(u).valueOf() < other.startOf(u).valueOf()
  }
}
```

**无单位**：直接比较时间戳

**有单位**：比较的是"当前实例的该单位结束时刻"与"目标的该单位开始时刻"

```javascript
const a = dayjs('2024-06-15 10:30')
const b = dayjs('2024-06-15 14:00')

a.isBefore(b)          // true（毫秒级比较）
a.isBefore(b, 'day')   // false（同一天）
a.isBefore(b, 'hour')  // true（10点 < 14点）
```

### isAfter

判断当前日期是否在目标日期之后：

```typescript
class Dayjs {
  isAfter(date: DateInput, unit?: string): boolean {
    const other = dayjs(date)
    const u = normalizeUnit(unit)
    
    if (!u) {
      return this.valueOf() > other.valueOf()
    }
    
    return this.startOf(u).valueOf() > other.endOf(u).valueOf()
  }
}
```

### isSame

判断两个日期是否相同：

```typescript
class Dayjs {
  isSame(date: DateInput, unit?: string): boolean {
    const other = dayjs(date)
    const u = normalizeUnit(unit)
    
    if (!u) {
      return this.valueOf() === other.valueOf()
    }
    
    return this.startOf(u).valueOf() === other.startOf(u).valueOf()
  }
}
```

**有单位**：比较该单位的开始时刻是否相同

```javascript
const a = dayjs('2024-06-15 10:30')
const b = dayjs('2024-06-15 14:00')

a.isSame(b)            // false（毫秒不同）
a.isSame(b, 'day')     // true（同一天）
a.isSame(b, 'month')   // true（同一月）
a.isSame(b, 'hour')    // false（不同小时）
```

## 边界情况

### 比较不同精度

```javascript
dayjs('2024-01-01').isSame('2024-12-31', 'year')  // true
dayjs('2024-01-01').isSame('2024-12-31', 'month') // false
```

### 跨年比较

```javascript
dayjs('2024-12-31').isBefore('2025-01-01', 'day')   // true
dayjs('2024-12-31').isBefore('2025-01-01', 'year')  // true
```

### 无效日期

```javascript
dayjs('invalid').isBefore('2024-01-01')  // false
dayjs('2024-01-01').isAfter('invalid')   // false
```

## 使用场景

### 检查日期有效性

```javascript
function isDateInRange(date, start, end) {
  const d = dayjs(date)
  return d.isAfter(start) && d.isBefore(end)
}

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

### 检查是否是同一周

```javascript
function isSameWeek(date1, date2) {
  return dayjs(date1).isSame(date2, 'week')
}
```

## 测试用例

```typescript
describe('比较方法', () => {
  const earlier = dayjs('2024-06-15T10:00')
  const later = dayjs('2024-06-15T14:00')
  const nextDay = dayjs('2024-06-16T10:00')

  describe('isBefore', () => {
    it('毫秒比较', () => {
      expect(earlier.isBefore(later)).toBe(true)
      expect(later.isBefore(earlier)).toBe(false)
      expect(earlier.isBefore(earlier)).toBe(false)
    })

    it('按天比较', () => {
      expect(earlier.isBefore(later, 'day')).toBe(false)
      expect(earlier.isBefore(nextDay, 'day')).toBe(true)
    })
  })

  describe('isAfter', () => {
    it('毫秒比较', () => {
      expect(later.isAfter(earlier)).toBe(true)
      expect(earlier.isAfter(later)).toBe(false)
    })
  })

  describe('isSame', () => {
    it('毫秒比较', () => {
      expect(earlier.isSame(earlier.clone())).toBe(true)
      expect(earlier.isSame(later)).toBe(false)
    })

    it('按天比较', () => {
      expect(earlier.isSame(later, 'day')).toBe(true)
      expect(earlier.isSame(nextDay, 'day')).toBe(false)
    })
  })
})
```

## 小结

本章实现了三个核心比较方法：

- **isBefore**：判断是否在目标之前
- **isAfter**：判断是否在目标之后
- **isSame**：判断是否与目标相同

所有方法都支持可选的 `unit` 参数来控制比较精度。
