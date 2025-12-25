# startOf 与 endOf 实现

`startOf` 和 `endOf` 用于获取某个时间单位的开始或结束时刻。

## API 设计

```javascript
dayjs().startOf('day')   // 当天 00:00:00.000
dayjs().endOf('day')     // 当天 23:59:59.999
dayjs().startOf('month') // 当月第一天 00:00:00.000
dayjs().endOf('year')    // 当年最后一天 23:59:59.999
```

## startOf 实现

```typescript
class Dayjs {
  /**
   * 返回指定单位的开始时刻
   */
  startOf(unit: string): Dayjs {
    const u = normalizeUnit(unit)
    
    switch (u) {
      case 'year':
        return this.set('month', 0).startOf('month')
      
      case 'month':
        return this.set('date', 1).startOf('day')
      
      case 'week':
        return this.subtract(this.day(), 'day').startOf('day')
      
      case 'day':
      case 'date':
        return this.set('hour', 0).startOf('hour')
      
      case 'hour':
        return this.set('minute', 0).startOf('minute')
      
      case 'minute':
        return this.set('second', 0).startOf('second')
      
      case 'second':
        return this.set('millisecond', 0)
      
      default:
        return this.clone()
    }
  }
}
```

这里用了**递归式的实现**：
- `startOf('year')` → 设置月份为 0，然后 `startOf('month')`
- `startOf('month')` → 设置日期为 1，然后 `startOf('day')`
- 以此类推，直到 `startOf('second')` 设置毫秒为 0

这种实现简洁且易于理解。

## 优化实现

递归版本每次调用会创建多个中间实例。可以优化为直接计算：

```typescript
class Dayjs {
  startOf(unit: string): Dayjs {
    const u = normalizeUnit(unit)
    const d = new Date(this.$d.getTime())
    
    // 根据单位，逐级清零
    switch (u) {
      case 'year':
        d.setMonth(0)
        // fall through
      case 'month':
        d.setDate(1)
        // fall through
      case 'day':
      case 'date':
        d.setHours(0)
        // fall through
      case 'hour':
        d.setMinutes(0)
        // fall through
      case 'minute':
        d.setSeconds(0)
        // fall through
      case 'second':
        d.setMilliseconds(0)
        break
      
      case 'week':
        // 特殊处理：回到本周第一天
        d.setDate(d.getDate() - d.getDay())
        d.setHours(0, 0, 0, 0)
        break
    }
    
    return new Dayjs(d, { utc: this.$u })
  }
}
```

使用 switch 的 fall-through 特性，从高层级单位开始，逐级清零到毫秒。

## endOf 实现

`endOf` 是"下一个单位开始前的最后一刻"：

```typescript
class Dayjs {
  /**
   * 返回指定单位的结束时刻
   */
  endOf(unit: string): Dayjs {
    // endOf = startOf 下一个单位 - 1ms
    return this.startOf(unit).add(1, unit).subtract(1, 'millisecond')
  }
}
```

这个实现非常简洁：
1. 获取当前单位的开始
2. 加一个单位
3. 减一毫秒

```javascript
dayjs('2024-06-15').endOf('month')
// startOf('month') -> 2024-06-01 00:00:00.000
// add(1, 'month')  -> 2024-07-01 00:00:00.000
// subtract(1, 'ms') -> 2024-06-30 23:59:59.999
```

## 直接实现

也可以直接计算，避免多次实例创建：

```typescript
class Dayjs {
  endOf(unit: string): Dayjs {
    const u = normalizeUnit(unit)
    const d = new Date(this.$d.getTime())
    
    switch (u) {
      case 'year':
        d.setMonth(11)
        // fall through
      case 'month':
        d.setDate(getDaysInMonth(d.getFullYear(), d.getMonth()))
        // fall through
      case 'day':
      case 'date':
        d.setHours(23)
        // fall through
      case 'hour':
        d.setMinutes(59)
        // fall through
      case 'minute':
        d.setSeconds(59)
        // fall through
      case 'second':
        d.setMilliseconds(999)
        break
      
      case 'week':
        // 本周最后一天（周六）
        d.setDate(d.getDate() + (6 - d.getDay()))
        d.setHours(23, 59, 59, 999)
        break
    }
    
    return new Dayjs(d, { utc: this.$u })
  }
}
```

## UTC 模式处理

在 UTC 模式下，需要使用 UTC 方法：

```typescript
class Dayjs {
  startOf(unit: string): Dayjs {
    const u = normalizeUnit(unit)
    const d = new Date(this.$d.getTime())
    
    if (this.$u) {
      // UTC 模式
      switch (u) {
        case 'year':
          d.setUTCMonth(0)
        case 'month':
          d.setUTCDate(1)
        case 'day':
          d.setUTCHours(0)
        case 'hour':
          d.setUTCMinutes(0)
        case 'minute':
          d.setUTCSeconds(0)
        case 'second':
          d.setUTCMilliseconds(0)
          break
        // ... week 处理
      }
    } else {
      // 本地模式（前面的实现）
      // ...
    }
    
    return new Dayjs(d, { utc: this.$u })
  }
}
```

## 常见使用场景

### 获取今天的时间范围

```javascript
const today = dayjs()
const start = today.startOf('day')
const end = today.endOf('day')

// 查询今天的数据
db.query({
  createdAt: {
    $gte: start.toDate(),
    $lte: end.toDate()
  }
})
```

### 获取本月的时间范围

```javascript
const thisMonth = dayjs()
const start = thisMonth.startOf('month')
const end = thisMonth.endOf('month')

console.log(start.format('YYYY-MM-DD'))  // 2024-12-01
console.log(end.format('YYYY-MM-DD'))    // 2024-12-31
```

### 获取本周的时间范围

```javascript
const thisWeek = dayjs()
const start = thisWeek.startOf('week')  // 周日
const end = thisWeek.endOf('week')      // 周六

// ISO 周（从周一开始）需要使用 isoWeek 插件
```

## 测试用例

```typescript
describe('startOf/endOf', () => {
  const date = dayjs('2024-06-15T14:30:45.123')

  describe('startOf', () => {
    it('startOf("year")', () => {
      const result = date.startOf('year')
      expect(result.format('YYYY-MM-DD HH:mm:ss.SSS'))
        .toBe('2024-01-01 00:00:00.000')
    })

    it('startOf("month")', () => {
      const result = date.startOf('month')
      expect(result.format('YYYY-MM-DD HH:mm:ss.SSS'))
        .toBe('2024-06-01 00:00:00.000')
    })

    it('startOf("week")', () => {
      const result = date.startOf('week')
      expect(result.day()).toBe(0) // 周日
      expect(result.hour()).toBe(0)
    })

    it('startOf("day")', () => {
      const result = date.startOf('day')
      expect(result.format('HH:mm:ss.SSS')).toBe('00:00:00.000')
    })

    it('startOf("hour")', () => {
      const result = date.startOf('hour')
      expect(result.format('mm:ss.SSS')).toBe('00:00.000')
    })

    it('startOf("minute")', () => {
      const result = date.startOf('minute')
      expect(result.format('ss.SSS')).toBe('00.000')
    })

    it('startOf("second")', () => {
      const result = date.startOf('second')
      expect(result.millisecond()).toBe(0)
    })
  })

  describe('endOf', () => {
    it('endOf("year")', () => {
      const result = date.endOf('year')
      expect(result.format('YYYY-MM-DD HH:mm:ss.SSS'))
        .toBe('2024-12-31 23:59:59.999')
    })

    it('endOf("month")', () => {
      const result = date.endOf('month')
      expect(result.format('YYYY-MM-DD')).toBe('2024-06-30')
      expect(result.format('HH:mm:ss.SSS')).toBe('23:59:59.999')
    })

    it('endOf("day")', () => {
      const result = date.endOf('day')
      expect(result.format('HH:mm:ss.SSS')).toBe('23:59:59.999')
    })
  })

  describe('不可变性', () => {
    it('原实例不变', () => {
      const original = dayjs('2024-06-15T12:00:00')
      original.startOf('day')
      expect(original.hour()).toBe(12)
    })
  })
})
```

## 小结

本章实现了 `startOf` 和 `endOf`：

- **startOf**：获取指定单位的开始时刻
- **endOf**：获取指定单位的结束时刻（startOf 下一单位 - 1ms）
- **支持的单位**：year、month、week、day、hour、minute、second
- **UTC 模式**：使用 UTC 方法

这两个方法在日期范围查询中非常常用。
