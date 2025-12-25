# 星期与季度处理

除了基本的年月日时分秒，Day.js 还支持星期和季度的操作。

## 星期处理

### 获取星期

Day.js 的 `day()` 返回 0-6，其中 0 表示周日：

```typescript
class Dayjs {
  /**
   * 获取星期几 (0=周日, 1=周一, ..., 6=周六)
   */
  day(): number {
    return this.$W
  }
}
```

```javascript
dayjs('2024-12-25').day()  // 3（周三）
dayjs('2024-12-22').day()  // 0（周日）
```

### 设置星期

设置星期会调整日期，保持在当前周：

```typescript
class Dayjs {
  day(value: number): Dayjs {
    const currentDay = this.$W
    const diff = value - currentDay
    return this.add(diff, 'day')
  }
}
```

```javascript
const wed = dayjs('2024-12-25')  // 周三
wed.day(0)  // 2024-12-22（同周的周日）
wed.day(1)  // 2024-12-23（同周的周一）
wed.day(6)  // 2024-12-28（同周的周六）
```

### ISO 星期

ISO 标准中，星期一是一周的开始（1=周一，7=周日）：

```typescript
class Dayjs {
  /**
   * 获取 ISO 星期几 (1=周一, ..., 7=周日)
   */
  isoWeekday(): number
  isoWeekday(value: number): Dayjs
  isoWeekday(value?: number): number | Dayjs {
    if (value === undefined) {
      // 周日(0) 转为 7，其他不变
      return this.$W === 0 ? 7 : this.$W
    }
    // 设置 ISO 星期
    const isoDay = this.isoWeekday()
    const diff = value - isoDay
    return this.add(diff, 'day')
  }
}
```

```javascript
dayjs('2024-12-22').isoWeekday()  // 7（周日）
dayjs('2024-12-23').isoWeekday()  // 1（周一）
```

### 获取当年第几周

ISO 周数的计算规则：
- 每周从周一开始
- 每年第一周是包含该年第一个周四的那一周

```typescript
class Dayjs {
  /**
   * 获取当年第几周 (ISO week)
   */
  isoWeek(): number
  isoWeek(value: number): Dayjs
  isoWeek(value?: number): number | Dayjs {
    if (value === undefined) {
      return getISOWeek(this.$d)
    }
    // 设置周数
    const currentWeek = this.isoWeek()
    const diff = value - currentWeek
    return this.add(diff * 7, 'day')
  }
}

/**
 * 计算 ISO 周数
 */
function getISOWeek(date: Date): number {
  // 创建当前日期的副本
  const d = new Date(date.getTime())
  // 设置为最近的周四
  d.setDate(d.getDate() + 4 - (d.getDay() || 7))
  // 计算年初
  const yearStart = new Date(d.getFullYear(), 0, 1)
  // 计算周数
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}
```

```javascript
dayjs('2024-01-01').isoWeek()  // 1
dayjs('2024-12-31').isoWeek()  // 1（属于2025年第1周）
```

## 季度处理

季度是按 3 个月划分的：Q1(1-3月)、Q2(4-6月)、Q3(7-9月)、Q4(10-12月)。

### 获取季度

```typescript
class Dayjs {
  /**
   * 获取季度 (1-4)
   */
  quarter(): number
  quarter(value: number): Dayjs
  quarter(value?: number): number | Dayjs {
    if (value === undefined) {
      return Math.ceil((this.$M + 1) / 3)
    }
    // 设置季度
    const currentQuarter = this.quarter()
    const diff = value - currentQuarter
    return this.add(diff * 3, 'month')
  }
}
```

```javascript
dayjs('2024-01-15').quarter()  // 1
dayjs('2024-04-15').quarter()  // 2
dayjs('2024-07-15').quarter()  // 3
dayjs('2024-10-15').quarter()  // 4
```

### 季度的开始和结束

```typescript
class Dayjs {
  startOf(unit: string): Dayjs {
    const u = normalizeUnit(unit)
    
    switch (u) {
      case 'quarter':
        // 季度开始：该季度第一个月的第一天
        const quarterStartMonth = (this.quarter() - 1) * 3
        return this.month(quarterStartMonth).startOf('month')
      
      // ... 其他单位
    }
  }

  endOf(unit: string): Dayjs {
    const u = normalizeUnit(unit)
    
    switch (u) {
      case 'quarter':
        // 季度结束：该季度最后一个月的最后一天
        const quarterEndMonth = this.quarter() * 3 - 1
        return this.month(quarterEndMonth).endOf('month')
      
      // ... 其他单位
    }
  }
}
```

```javascript
dayjs('2024-05-15').startOf('quarter')  // 2024-04-01 00:00:00.000
dayjs('2024-05-15').endOf('quarter')    // 2024-06-30 23:59:59.999
```

## 插件实现

Day.js 的周和季度功能通过插件提供：

```typescript
// src/plugins/isoWeek.ts
export default function isoWeekPlugin(
  option: unknown,
  DayjsClass: typeof Dayjs
) {
  DayjsClass.prototype.isoWeekday = function(value?: number) {
    if (value === undefined) {
      return this.day() === 0 ? 7 : this.day()
    }
    return this.day(value === 7 ? 0 : value)
  }

  DayjsClass.prototype.isoWeek = function(value?: number) {
    if (value === undefined) {
      return getISOWeek(this.toDate())
    }
    const currentWeek = this.isoWeek()
    return this.add((value - currentWeek) * 7, 'day')
  }

  // 扩展 startOf/endOf 支持 'isoWeek'
  const oldStartOf = DayjsClass.prototype.startOf
  DayjsClass.prototype.startOf = function(unit: string) {
    if (normalizeUnit(unit) === 'isoweek') {
      // ISO 周从周一开始
      const day = this.isoWeekday()
      return this.subtract(day - 1, 'day').startOf('day')
    }
    return oldStartOf.call(this, unit)
  }
}
```

```typescript
// src/plugins/quarterOfYear.ts
export default function quarterOfYearPlugin(
  option: unknown,
  DayjsClass: typeof Dayjs
) {
  DayjsClass.prototype.quarter = function(value?: number) {
    if (value === undefined) {
      return Math.ceil((this.month() + 1) / 3)
    }
    const currentQuarter = this.quarter()
    return this.add((value - currentQuarter) * 3, 'month')
  }

  // 扩展 startOf/endOf 支持 'quarter'
  const oldStartOf = DayjsClass.prototype.startOf
  DayjsClass.prototype.startOf = function(unit: string) {
    if (normalizeUnit(unit) === 'quarter') {
      const quarterStartMonth = (this.quarter() - 1) * 3
      return this.month(quarterStartMonth).startOf('month')
    }
    return oldStartOf.call(this, unit)
  }

  const oldEndOf = DayjsClass.prototype.endOf
  DayjsClass.prototype.endOf = function(unit: string) {
    if (normalizeUnit(unit) === 'quarter') {
      const quarterEndMonth = this.quarter() * 3 - 1
      return this.month(quarterEndMonth).endOf('month')
    }
    return oldEndOf.call(this, unit)
  }
}
```

## 使用示例

```javascript
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import quarterOfYear from 'dayjs/plugin/quarterOfYear'

dayjs.extend(isoWeek)
dayjs.extend(quarterOfYear)

const date = dayjs('2024-12-25')

// ISO 星期
date.isoWeekday()           // 3（周三）
date.isoWeek()              // 52

// 季度
date.quarter()              // 4
date.startOf('quarter')     // 2024-10-01
date.endOf('quarter')       // 2024-12-31
```

## 测试用例

```typescript
describe('星期处理', () => {
  it('day() 返回 0-6', () => {
    expect(dayjs('2024-12-22').day()).toBe(0) // 周日
    expect(dayjs('2024-12-25').day()).toBe(3) // 周三
  })

  it('isoWeekday() 返回 1-7', () => {
    expect(dayjs('2024-12-22').isoWeekday()).toBe(7) // 周日
    expect(dayjs('2024-12-23').isoWeekday()).toBe(1) // 周一
  })

  it('isoWeek() 返回周数', () => {
    expect(dayjs('2024-01-01').isoWeek()).toBe(1)
  })
})

describe('季度处理', () => {
  it('quarter() 返回 1-4', () => {
    expect(dayjs('2024-01-01').quarter()).toBe(1)
    expect(dayjs('2024-04-01').quarter()).toBe(2)
    expect(dayjs('2024-07-01').quarter()).toBe(3)
    expect(dayjs('2024-10-01').quarter()).toBe(4)
  })

  it('startOf("quarter") 返回季度开始', () => {
    const d = dayjs('2024-05-15').startOf('quarter')
    expect(d.format('YYYY-MM-DD')).toBe('2024-04-01')
  })

  it('endOf("quarter") 返回季度结束', () => {
    const d = dayjs('2024-05-15').endOf('quarter')
    expect(d.format('YYYY-MM-DD')).toBe('2024-06-30')
  })
})
```

## 小结

本章实现了星期和季度处理：

- **day()**：获取/设置星期（0-6）
- **isoWeekday()**：ISO 星期（1-7）
- **isoWeek()**：ISO 周数
- **quarter()**：季度（1-4）
- **startOf/endOf**：扩展支持 isoWeek 和 quarter

这些功能通过插件提供，保持核心精简。
