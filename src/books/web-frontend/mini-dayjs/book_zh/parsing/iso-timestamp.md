# ISO 8601 与时间戳解析

ISO 8601 是日期时间的国际标准格式，Day.js 原生支持。本章深入实现其解析逻辑。

## ISO 8601 格式规范

ISO 8601 定义了多种日期时间格式：

```
2024                     // 仅年份
2024-12                  // 年-月
2024-12-25               // 年-月-日
2024-12-25T10:30         // 日期+时间
2024-12-25T10:30:45      // 日期+时间（含秒）
2024-12-25T10:30:45.123  // 日期+时间（含毫秒）
2024-12-25T10:30:45Z     // UTC 时间
2024-12-25T10:30:45+08:00 // 带时区偏移
```

## 正则表达式设计

我们用正则来匹配 ISO 格式：

```typescript
// src/parsing/iso.ts

/**
 * ISO 8601 日期时间正则
 * 
 * 分组说明：
 * 1. 年份 (YYYY)
 * 2. 月份 (MM)
 * 3. 日期 (DD)
 * 4. 小时 (HH)
 * 5. 分钟 (mm)
 * 6. 秒 (ss)
 * 7. 毫秒 (SSS)
 */
const ISO_DATE_REGEX = /^(\d{4})(?:[-/](\d{1,2}))?(?:[-/](\d{1,2}))?$/
const ISO_DATETIME_REGEX = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?(?:[.:](\d{1,3}))?/
const TIMEZONE_REGEX = /(Z|[+-]\d{2}(?::?\d{2})?)$/

export interface ISOParseResult {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
  millisecond: number
  offset?: number  // 时区偏移（分钟）
}
```

## 解析函数实现

```typescript
/**
 * 解析 ISO 8601 格式字符串
 */
export function parseISO(input: string): Date | null {
  // 尝试日期时间格式
  let match = input.match(ISO_DATETIME_REGEX)
  if (match) {
    return parseISODateTime(input, match)
  }

  // 尝试纯日期格式
  match = input.match(ISO_DATE_REGEX)
  if (match) {
    return parseISODate(match)
  }

  return null
}

/**
 * 解析纯日期格式：2024、2024-12、2024-12-25
 */
function parseISODate(match: RegExpMatchArray): Date {
  const [, yearStr, monthStr, dayStr] = match
  
  const year = parseInt(yearStr, 10)
  const month = monthStr ? parseInt(monthStr, 10) - 1 : 0
  const day = dayStr ? parseInt(dayStr, 10) : 1
  
  return new Date(year, month, day)
}

/**
 * 解析日期时间格式
 */
function parseISODateTime(input: string, match: RegExpMatchArray): Date {
  const [, yearStr, monthStr, dayStr, hourStr, minuteStr, secondStr, msStr] = match
  
  const year = parseInt(yearStr, 10)
  const month = parseInt(monthStr, 10) - 1
  const day = parseInt(dayStr, 10)
  const hour = parseInt(hourStr, 10)
  const minute = parseInt(minuteStr, 10)
  const second = secondStr ? parseInt(secondStr, 10) : 0
  const millisecond = msStr ? parseMillisecond(msStr) : 0
  
  // 处理时区
  const offset = parseTimezone(input)
  
  if (offset !== null) {
    // 有时区信息，创建 UTC 时间后调整
    const utcMs = Date.UTC(year, month, day, hour, minute, second, millisecond)
    return new Date(utcMs - offset * 60 * 1000)
  }
  
  // 无时区信息，按本地时间处理
  return new Date(year, month, day, hour, minute, second, millisecond)
}
```

## 毫秒解析

毫秒部分需要特殊处理，因为可能是 1-3 位：

```typescript
/**
 * 解析毫秒部分
 * '1' -> 100, '12' -> 120, '123' -> 123
 */
function parseMillisecond(ms: string): number {
  const padded = ms.padEnd(3, '0').substring(0, 3)
  return parseInt(padded, 10)
}
```

为什么要 `padEnd`？

- `'1'` 表示 `0.1` 秒，即 100 毫秒
- `'12'` 表示 `0.12` 秒，即 120 毫秒
- `'123'` 表示 `0.123` 秒，即 123 毫秒

## 时区解析

时区格式有多种：`Z`、`+08:00`、`-0530`

```typescript
/**
 * 解析时区偏移
 * 返回相对 UTC 的偏移分钟数
 */
function parseTimezone(input: string): number | null {
  const match = input.match(TIMEZONE_REGEX)
  if (!match) {
    return null
  }

  const tz = match[1]
  
  // Z 表示 UTC
  if (tz === 'Z') {
    return 0
  }
  
  // 解析 +HH:mm 或 +HHmm 格式
  const sign = tz[0] === '-' ? -1 : 1
  const hours = parseInt(tz.substring(1, 3), 10)
  const minutes = tz.length > 3 
    ? parseInt(tz.replace(':', '').substring(3, 5), 10) 
    : 0
  
  return sign * (hours * 60 + minutes)
}
```

## 时间戳解析

时间戳解析相对简单，但需要区分秒和毫秒：

```typescript
/**
 * 解析时间戳
 * Day.js 默认处理毫秒时间戳
 * 小于合理范围的数字会被当作秒时间戳（需要插件支持）
 */
export function parseTimestamp(input: number): Date {
  // Day.js 默认只支持毫秒时间戳
  // Unix 秒时间戳需要通过 dayjs.unix() 方法
  return new Date(input)
}
```

Day.js 还提供了 `dayjs.unix()` 静态方法处理秒时间戳：

```typescript
// 添加到 dayjs 工厂函数
dayjs.unix = function(timestamp: number): Dayjs {
  return dayjs(timestamp * 1000)
}
```

## 边界情况处理

### 月份溢出

```typescript
// 原生 Date 会自动溢出处理
new Date(2024, 12, 1)  // 2025-01-01（12月溢出到下一年1月）
```

Day.js 保持这个行为，不做额外校验。

### 日期溢出

```typescript
// 31天的月份输入32，会溢出到下月
new Date(2024, 0, 32)  // 2024-02-01
```

### 负数处理

```typescript
// 负数会反向计算
new Date(2024, 0, 0)   // 2023-12-31（1月0日 = 12月31日）
new Date(2024, -1, 1)  // 2023-12-01（-1月 = 去年12月）
```

## 完整测试

```typescript
describe('ISO 解析', () => {
  it('解析年份', () => {
    const d = dayjs('2024')
    expect(d.year()).toBe(2024)
    expect(d.month()).toBe(0)
    expect(d.date()).toBe(1)
  })

  it('解析年月', () => {
    const d = dayjs('2024-06')
    expect(d.year()).toBe(2024)
    expect(d.month()).toBe(5)
    expect(d.date()).toBe(1)
  })

  it('解析完整日期', () => {
    const d = dayjs('2024-12-25')
    expect(d.year()).toBe(2024)
    expect(d.month()).toBe(11)
    expect(d.date()).toBe(25)
  })

  it('解析日期时间', () => {
    const d = dayjs('2024-12-25T10:30:45')
    expect(d.hour()).toBe(10)
    expect(d.minute()).toBe(30)
    expect(d.second()).toBe(45)
  })

  it('解析毫秒', () => {
    const d = dayjs('2024-12-25T10:30:45.123')
    expect(d.millisecond()).toBe(123)
  })

  it('解析 UTC 时间', () => {
    const d = dayjs('2024-12-25T00:00:00Z')
    expect(d.isValid()).toBe(true)
  })

  it('解析带时区偏移', () => {
    const d = dayjs('2024-12-25T08:00:00+08:00')
    expect(d.isValid()).toBe(true)
    // UTC 时间应该是 00:00
  })
})

describe('时间戳解析', () => {
  it('解析毫秒时间戳', () => {
    const now = Date.now()
    const d = dayjs(now)
    expect(d.valueOf()).toBe(now)
  })

  it('dayjs.unix 解析秒时间戳', () => {
    const unix = Math.floor(Date.now() / 1000)
    const d = dayjs.unix(unix)
    expect(d.unix()).toBe(unix)
  })
})
```

## 小结

本章实现了 ISO 8601 和时间戳解析：

- **ISO 日期**：支持 YYYY、YYYY-MM、YYYY-MM-DD
- **ISO 日期时间**：支持 T 分隔、毫秒、时区
- **时区处理**：Z、±HH:mm、±HHmm
- **时间戳**：毫秒时间戳（默认）、秒时间戳（dayjs.unix）

下一章我们将实现更复杂的字符串格式解析。
