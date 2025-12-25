# 多格式日期解析入口

日期解析是 Day.js 最复杂的部分之一。用户可能传入各种格式的日期，我们需要统一处理。

## 支持的输入格式

Day.js 支持多种输入：

```javascript
dayjs()                        // 当前时间
dayjs(null)                    // 当前时间
dayjs(undefined)               // 当前时间
dayjs(1703462400000)           // Unix 时间戳（毫秒）
dayjs('2024-12-25')            // ISO 日期字符串
dayjs('2024-12-25T10:30:00')   // ISO 日期时间字符串
dayjs('2024-12-25T10:30:00Z')  // ISO UTC 时间
dayjs(new Date())              // Date 对象
dayjs(dayjs())                 // Dayjs 实例
```

## 解析入口设计

我们需要一个统一的解析入口来处理各种输入：

```typescript
// src/parse.ts
import { DateInput } from './types'
import { parseISO } from './parsing/iso'

export interface ParsedDate {
  year: number
  month: number   // 0-11
  day: number     // 1-31
  hour: number    // 0-23
  minute: number  // 0-59
  second: number  // 0-59
  millisecond: number // 0-999
  utc?: boolean
}

/**
 * 解析各种格式的日期输入
 */
export function parseDate(input?: DateInput): Date {
  // 1. 空值处理
  if (input === null || input === undefined) {
    return new Date()
  }

  // 2. 已经是 Date 对象
  if (input instanceof Date) {
    return new Date(input.getTime())
  }

  // 3. Dayjs 实例
  if (isDayjsInstance(input)) {
    return new Date(input.valueOf())
  }

  // 4. 数字（时间戳）
  if (typeof input === 'number') {
    return new Date(input)
  }

  // 5. 字符串
  if (typeof input === 'string') {
    return parseString(input)
  }

  // 6. 无法识别的输入
  return new Date(NaN)
}

function isDayjsInstance(value: unknown): boolean {
  return value !== null && 
         typeof value === 'object' && 
         '$d' in value
}
```

## 字符串解析策略

字符串解析是最复杂的部分。Day.js 支持多种字符串格式：

```typescript
// src/parsing/string.ts
const ISO_REGEX = /^(\d{4})[-/]?(\d{1,2})?[-/]?(\d{0,2})[Tt\s]*(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?[.:]?(\d+)?$/
const TIMEZONE_REGEX = /Z|([+-]\d{2}):?(\d{2})?$/

/**
 * 解析字符串日期
 */
export function parseString(input: string): Date {
  const trimmed = input.trim()
  
  // 尝试 ISO 格式解析
  const isoResult = parseISO(trimmed)
  if (isoResult) {
    return isoResult
  }
  
  // 降级到原生解析
  const date = new Date(trimmed)
  if (!isNaN(date.getTime())) {
    return date
  }
  
  // 解析失败返回 Invalid Date
  return new Date(NaN)
}

/**
 * 解析 ISO 8601 格式
 */
function parseISO(input: string): Date | null {
  const match = input.match(ISO_REGEX)
  if (!match) {
    return null
  }

  const [, year, month, day, hour, minute, second, ms] = match

  // 处理时区
  const timezoneMatch = input.match(TIMEZONE_REGEX)
  const isUTC = timezoneMatch && timezoneMatch[0] === 'Z'

  const parsed: ParsedDate = {
    year: parseInt(year, 10),
    month: (parseInt(month, 10) || 1) - 1, // 转为 0-indexed
    day: parseInt(day, 10) || 1,
    hour: parseInt(hour, 10) || 0,
    minute: parseInt(minute, 10) || 0,
    second: parseInt(second, 10) || 0,
    millisecond: ms ? parseInt(ms.substring(0, 3).padEnd(3, '0'), 10) : 0,
    utc: isUTC,
  }

  return createDate(parsed)
}
```

## 创建 Date 对象

根据解析结果创建 Date 对象：

```typescript
/**
 * 从解析结果创建 Date 对象
 */
function createDate(parsed: ParsedDate): Date {
  const { year, month, day, hour, minute, second, millisecond, utc } = parsed

  if (utc) {
    return new Date(Date.UTC(year, month, day, hour, minute, second, millisecond))
  }

  return new Date(year, month, day, hour, minute, second, millisecond)
}
```

为什么要区分 UTC 和本地时间？

当输入包含 `Z` 后缀（如 `2024-12-25T00:00:00Z`），表示这是 UTC 时间。我们需要用 `Date.UTC()` 创建，否则会被当作本地时间处理。

## 集成到 Dayjs 类

更新 `Dayjs` 类的 `parse` 方法：

```typescript
// src/dayjs.ts
import { parseDate } from './parse'

export class Dayjs {
  private $d: Date
  // ... 其他字段

  constructor(date?: DateInput) {
    this.$d = parseDate(date)
    this.init()
  }

  // ... 其他方法

  /**
   * 判断日期是否有效
   */
  isValid(): boolean {
    return !isNaN(this.$d.getTime())
  }
}
```

## 处理无效日期

当解析失败时，Date 对象会返回 `Invalid Date`：

```typescript
const invalid = dayjs('not a date')
console.log(invalid.isValid())  // false
console.log(invalid.format())   // 'Invalid Date'
```

这符合 Day.js 的行为：不抛出异常，而是返回一个表示"无效"的实例。

## 测试用例

```typescript
describe('日期解析', () => {
  it('解析 ISO 日期', () => {
    const d = dayjs('2024-12-25')
    expect(d.year()).toBe(2024)
    expect(d.month()).toBe(11)
    expect(d.date()).toBe(25)
  })

  it('解析 ISO 日期时间', () => {
    const d = dayjs('2024-12-25T10:30:45')
    expect(d.hour()).toBe(10)
    expect(d.minute()).toBe(30)
    expect(d.second()).toBe(45)
  })

  it('解析 UTC 时间', () => {
    const d = dayjs('2024-12-25T00:00:00Z')
    // UTC 转本地时间后验证
    expect(d.isValid()).toBe(true)
  })

  it('处理无效输入', () => {
    const d = dayjs('invalid')
    expect(d.isValid()).toBe(false)
  })

  it('解析时间戳', () => {
    const ts = Date.now()
    const d = dayjs(ts)
    expect(d.valueOf()).toBe(ts)
  })
})
```

## 小结

本章实现了日期解析入口：

- **多格式支持**：空值、Date、Dayjs、时间戳、字符串
- **ISO 8601 解析**：支持日期、日期时间、UTC 时间
- **优雅降级**：无法识别的格式尝试原生解析
- **无效日期处理**：返回 Invalid Date 实例，不抛异常

下一章我们将深入 ISO 8601 和时间戳解析的细节。
