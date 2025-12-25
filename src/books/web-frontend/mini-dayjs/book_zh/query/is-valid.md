# isValid 有效性验证

在解析用户输入的日期时，我们需要判断解析结果是否有效。`isValid` 方法就是为此而设计的。

## 无效日期的产生

```javascript
dayjs('invalid')           // 无效
dayjs('2024-13-01')        // 无效（月份超出范围）
dayjs('2024-02-30')        // 无效（2月没有30号）
dayjs(NaN)                 // 无效
dayjs(undefined)           // 有效（当前时间）
dayjs(null)                // 有效（当前时间）
```

## 实现

```typescript
// src/dayjs.ts
class Dayjs {
  private $d: Date
  private valid: boolean = true
  
  constructor(date?: DateInput) {
    const parsed = this.parse(date)
    this.$d = parsed.date
    this.valid = parsed.valid
  }
  
  private parse(date?: DateInput): { date: Date; valid: boolean } {
    if (date === undefined || date === null) {
      return { date: new Date(), valid: true }
    }
    
    if (date instanceof Date) {
      return { 
        date: new Date(date), 
        valid: !isNaN(date.getTime()) 
      }
    }
    
    if (typeof date === 'number') {
      return { 
        date: new Date(date), 
        valid: !isNaN(date) 
      }
    }
    
    if (typeof date === 'string') {
      const d = new Date(date)
      return { 
        date: d, 
        valid: !isNaN(d.getTime()) 
      }
    }
    
    return { date: new Date(NaN), valid: false }
  }
  
  isValid(): boolean {
    return this.valid && !isNaN(this.$d.getTime())
  }
}
```

## 严格模式验证

浏览器的 Date 解析比较宽松：

```javascript
new Date('2024-02-30')  // 自动修正为 2024-03-01
```

如果需要严格验证，我们需要额外的检查：

```typescript
function parseStrict(dateStr: string, format: string): { date: Date; valid: boolean } {
  // 尝试解析
  const parsed = parseFormat(dateStr, format)
  
  if (!parsed.valid) {
    return { date: new Date(NaN), valid: false }
  }
  
  // 创建日期对象
  const date = new Date(parsed.year, parsed.month - 1, parsed.day)
  
  // 严格验证：检查日期是否被修正
  const isStrictValid = 
    date.getFullYear() === parsed.year &&
    date.getMonth() === parsed.month - 1 &&
    date.getDate() === parsed.day
  
  return { date, valid: isStrictValid }
}
```

## 验证各个组件

```typescript
function validateDateParts(
  year: number,
  month: number,  // 1-12
  day: number
): boolean {
  // 月份范围
  if (month < 1 || month > 12) return false
  
  // 日期范围
  const daysInMonth = getDaysInMonth(year, month)
  if (day < 1 || day > daysInMonth) return false
  
  return true
}

function validateTimeParts(
  hour: number,
  minute: number,
  second: number,
  millisecond: number
): boolean {
  if (hour < 0 || hour > 23) return false
  if (minute < 0 || minute > 59) return false
  if (second < 0 || second > 59) return false
  if (millisecond < 0 || millisecond > 999) return false
  
  return true
}

function getDaysInMonth(year: number, month: number): number {
  const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  
  if (month === 2 && isLeapYear(year)) {
    return 29
  }
  
  return days[month - 1]
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}
```

## 链式调用中的处理

当日期无效时，链式调用应该如何处理？

```typescript
class Dayjs {
  add(value: number, unit: string): Dayjs {
    if (!this.isValid()) {
      return this.clone()  // 返回无效日期的副本
    }
    // ...正常逻辑
  }
  
  format(formatStr?: string): string {
    if (!this.isValid()) {
      return 'Invalid Date'
    }
    // ...正常逻辑
  }
}
```

## 使用场景

### 表单验证

```javascript
function validateBirthday(input) {
  const date = dayjs(input)
  
  if (!date.isValid()) {
    return { valid: false, error: '日期格式无效' }
  }
  
  if (date.isAfter(dayjs())) {
    return { valid: false, error: '出生日期不能在未来' }
  }
  
  if (date.isBefore(dayjs().subtract(120, 'year'))) {
    return { valid: false, error: '年龄超出合理范围' }
  }
  
  return { valid: true, date }
}
```

### API 响应处理

```javascript
function parseApiDate(data) {
  const date = dayjs(data.created_at)
  return date.isValid() ? date : null
}
```

### 批量数据清洗

```javascript
function cleanDates(records) {
  return records.map(record => ({
    ...record,
    date: dayjs(record.date).isValid() 
      ? dayjs(record.date).format('YYYY-MM-DD')
      : null
  }))
}
```

## 测试用例

```typescript
describe('isValid', () => {
  describe('有效日期', () => {
    it('undefined 返回当前时间', () => {
      expect(dayjs().isValid()).toBe(true)
    })

    it('null 返回当前时间', () => {
      expect(dayjs(null).isValid()).toBe(true)
    })

    it('合法字符串', () => {
      expect(dayjs('2024-06-15').isValid()).toBe(true)
    })

    it('合法时间戳', () => {
      expect(dayjs(1718380800000).isValid()).toBe(true)
    })
  })

  describe('无效日期', () => {
    it('无效字符串', () => {
      expect(dayjs('invalid').isValid()).toBe(false)
    })

    it('NaN', () => {
      expect(dayjs(NaN).isValid()).toBe(false)
    })

    it('空字符串', () => {
      expect(dayjs('').isValid()).toBe(false)
    })
  })

  describe('格式化无效日期', () => {
    it('返回 Invalid Date', () => {
      expect(dayjs('invalid').format()).toBe('Invalid Date')
    })
  })
})
```

## 与 Moment.js 的对比

| 场景 | Moment.js | Day.js |
|------|-----------|--------|
| 严格模式 | `moment(str, format, true)` | 需要插件 |
| 无效值格式化 | `"Invalid date"` | `"Invalid Date"` |
| 链式安全 | 返回无效对象 | 返回无效对象 |

## 小结

本章实现了 `isValid` 方法：

- **基础验证**：判断 Date 对象是否有效
- **严格验证**：检查日期组件是否在合理范围
- **链式安全**：无效日期也能安全链式调用

这是处理用户输入的关键防御措施。
