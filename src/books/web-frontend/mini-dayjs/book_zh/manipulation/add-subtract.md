# add 与 subtract 实现

日期加减是最常用的操作。Day.js 提供了 `add()` 和 `subtract()` 方法。

## API 设计

```javascript
dayjs().add(7, 'day')        // 加 7 天
dayjs().add(1, 'month')      // 加 1 个月
dayjs().subtract(1, 'year')  // 减 1 年
```

## 实现 add 方法

```typescript
class Dayjs {
  /**
   * 增加指定的时间量
   * @param value 数值
   * @param unit 单位
   */
  add(value: number, unit: string): Dayjs {
    const u = normalizeUnit(unit)
    
    switch (u) {
      case 'year':
        return this.set('year', this.$y + value)
      
      case 'month':
        return this.addMonth(value)
      
      case 'week':
        return this.add(value * 7, 'day')
      
      case 'day':
      case 'date':
        return this.addDay(value)
      
      case 'hour':
        return this.addTime(value * MILLISECONDS_A_HOUR)
      
      case 'minute':
        return this.addTime(value * MILLISECONDS_A_MINUTE)
      
      case 'second':
        return this.addTime(value * MILLISECONDS_A_SECOND)
      
      case 'millisecond':
        return this.addTime(value)
      
      default:
        return this.clone()
    }
  }

  /**
   * 减少指定的时间量
   */
  subtract(value: number, unit: string): Dayjs {
    return this.add(-value, unit)
  }
}
```

`subtract` 只是 `add` 的负数版本，非常简洁。

## 添加天数

天数的添加比较简单，直接操作毫秒：

```typescript
class Dayjs {
  /**
   * 添加天数
   */
  private addDay(days: number): Dayjs {
    const d = new Date(this.$d.getTime())
    d.setDate(d.getDate() + days)
    return new Dayjs(d, { utc: this.$u })
  }

  /**
   * 通过毫秒添加时间
   */
  private addTime(ms: number): Dayjs {
    const newTime = this.$d.getTime() + ms
    return new Dayjs(newTime, { utc: this.$u })
  }
}
```

为什么不直接用 `addTime(days * MILLISECONDS_A_DAY)`？

因为**夏令时**！某些日期可能只有 23 小时或 25 小时。使用 `setDate` 能正确处理这种情况。

## 添加月份

月份的添加比较复杂，需要处理日期溢出：

```typescript
class Dayjs {
  /**
   * 添加月份
   */
  private addMonth(months: number): Dayjs {
    const d = new Date(this.$d.getTime())
    const currentDate = d.getDate()
    
    // 先设置日期为 1，避免溢出
    d.setDate(1)
    // 加月份
    d.setMonth(d.getMonth() + months)
    // 获取目标月份的最大天数
    const daysInMonth = getDaysInMonth(d.getFullYear(), d.getMonth())
    // 设置日期（不超过最大天数）
    d.setDate(Math.min(currentDate, daysInMonth))
    
    return new Dayjs(d, { utc: this.$u })
  }
}
```

为什么这样实现？考虑这个场景：

```javascript
dayjs('2024-01-31').add(1, 'month')
// 期望：2024-02-29（2月最后一天）
// 如果直接 setMonth，Date 会溢出到 3月2日或3日
```

Day.js 的行为是保持日期不超过目标月份的最大天数。

## 处理边界情况

### 跨年处理

```javascript
dayjs('2024-12-15').add(1, 'month')  // 2025-01-15
dayjs('2024-01-15').add(-2, 'month') // 2023-11-15
```

这些 Date 对象会自动处理。

### 闰年处理

```javascript
dayjs('2024-02-29').add(1, 'year')   // 2025-02-28（非闰年）
dayjs('2023-02-28').add(1, 'year')   // 2024-02-28（虽然是闰年）
```

### 负数处理

```javascript
dayjs().add(-1, 'day')     // 等同于 subtract(1, 'day')
dayjs().add(-1.5, 'hour')  // 减去 1.5 小时
```

## 小数处理

Day.js 支持小数值：

```typescript
class Dayjs {
  add(value: number, unit: string): Dayjs {
    const u = normalizeUnit(unit)
    
    // 对于月/年，只取整数部分
    if (u === 'month' || u === 'year') {
      const intValue = Math.trunc(value)
      return this.addMonth(u === 'year' ? intValue * 12 : intValue)
    }
    
    // 其他单位支持小数
    switch (u) {
      case 'week':
        return this.addTime(value * MILLISECONDS_A_WEEK)
      case 'day':
        return this.addTime(value * MILLISECONDS_A_DAY)
      case 'hour':
        return this.addTime(value * MILLISECONDS_A_HOUR)
      case 'minute':
        return this.addTime(value * MILLISECONDS_A_MINUTE)
      case 'second':
        return this.addTime(value * MILLISECONDS_A_SECOND)
      case 'millisecond':
        return this.addTime(Math.round(value))
      default:
        return this.clone()
    }
  }
}
```

```javascript
dayjs('2024-01-01T00:00').add(1.5, 'hour')  
// 2024-01-01T01:30:00

dayjs('2024-01-01').add(0.5, 'day')
// 2024-01-01T12:00:00
```

## 链式调用

```javascript
dayjs('2024-01-01')
  .add(1, 'year')
  .add(2, 'month')
  .add(3, 'day')
  .add(4, 'hour')
// 2025-03-04T04:00:00
```

每次调用返回新实例，可以安全地链式调用。

## 性能考量

对于大量日期计算，可以减少中间实例的创建：

```typescript
// 低效：创建多个中间实例
const result = dayjs()
  .add(1, 'year')
  .add(2, 'month')
  .add(3, 'day')

// 高效：直接计算最终时间戳
const base = dayjs()
const totalMs = 
  1 * MILLISECONDS_A_DAY * 365 +  // 约 1 年
  2 * MILLISECONDS_A_DAY * 30 +   // 约 2 月
  3 * MILLISECONDS_A_DAY          // 3 天
const result = dayjs(base.valueOf() + totalMs)
```

但通常情况下，不可变设计的清晰性比这点性能损失更重要。

## 测试用例

```typescript
describe('add/subtract', () => {
  const base = dayjs('2024-06-15T12:30:45')

  describe('add', () => {
    it('加年', () => {
      expect(base.add(1, 'year').year()).toBe(2025)
    })

    it('加月（正常）', () => {
      expect(base.add(1, 'month').month()).toBe(6) // 7月
    })

    it('加月（月末处理）', () => {
      const jan31 = dayjs('2024-01-31')
      const feb = jan31.add(1, 'month')
      expect(feb.month()).toBe(1) // 2月
      expect(feb.date()).toBe(29) // 闰年
    })

    it('加周', () => {
      const result = base.add(1, 'week')
      expect(result.date()).toBe(22)
    })

    it('加天', () => {
      expect(base.add(5, 'day').date()).toBe(20)
    })

    it('加小时', () => {
      expect(base.add(2, 'hour').hour()).toBe(14)
    })

    it('加小数', () => {
      const result = dayjs('2024-01-01T00:00').add(1.5, 'hour')
      expect(result.hour()).toBe(1)
      expect(result.minute()).toBe(30)
    })
  })

  describe('subtract', () => {
    it('等同于 add 负数', () => {
      expect(base.subtract(1, 'day').valueOf())
        .toBe(base.add(-1, 'day').valueOf())
    })
  })

  describe('链式调用', () => {
    it('多次操作', () => {
      const result = dayjs('2024-01-01')
        .add(1, 'month')
        .add(1, 'day')
      expect(result.format('YYYY-MM-DD')).toBe('2024-02-02')
    })
  })
})
```

## 小结

本章实现了日期加减操作：

- **add()**：支持年、月、周、日、时、分、秒、毫秒
- **subtract()**：add 的负数版本
- **月份处理**：自动处理月末溢出
- **小数支持**：时间单位支持小数
- **链式调用**：每次返回新实例

下一章我们将实现 `startOf` 和 `endOf` 方法。
