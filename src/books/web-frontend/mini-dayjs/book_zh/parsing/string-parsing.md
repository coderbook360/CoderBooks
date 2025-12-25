# 字符串格式解析

除了标准的 ISO 8601 格式，Day.js 还需要处理各种常见的日期字符串格式。

## 常见格式

实际项目中可能遇到这些格式：

```javascript
'December 25, 2024'       // 英文日期
'25/12/2024'              // 日/月/年
'12/25/2024'              // 月/日/年
'2024年12月25日'           // 中文日期
'2024.12.25'              // 点分隔
'20241225'                // 紧凑格式
```

## 格式检测策略

我们按优先级尝试匹配不同格式：

```typescript
// src/parsing/string.ts

interface FormatMatcher {
  regex: RegExp
  parse: (match: RegExpMatchArray) => Date
}

const FORMAT_MATCHERS: FormatMatcher[] = [
  // ISO 格式（最高优先级）
  {
    regex: /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/,
    parse: (m) => new Date(+m[1], +m[2] - 1, +m[3])
  },
  // 紧凑格式 YYYYMMDD
  {
    regex: /^(\d{4})(\d{2})(\d{2})$/,
    parse: (m) => new Date(+m[1], +m[2] - 1, +m[3])
  },
  // 斜杠分隔 MM/DD/YYYY（美式）
  {
    regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    parse: (m) => new Date(+m[3], +m[1] - 1, +m[2])
  },
  // 点分隔 DD.MM.YYYY（欧式）
  {
    regex: /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/,
    parse: (m) => new Date(+m[3], +m[2] - 1, +m[1])
  },
]

export function parseString(input: string): Date {
  const trimmed = input.trim()
  
  for (const matcher of FORMAT_MATCHERS) {
    const match = trimmed.match(matcher.regex)
    if (match) {
      return matcher.parse(match)
    }
  }
  
  // 降级到原生解析
  const date = new Date(trimmed)
  return isNaN(date.getTime()) ? new Date(NaN) : date
}
```

## 自定义格式解析（插件）

Day.js 官方提供 `customParseFormat` 插件支持自定义格式：

```javascript
import customParseFormat from 'dayjs/plugin/customParseFormat'
dayjs.extend(customParseFormat)

dayjs('25-12-2024', 'DD-MM-YYYY')
dayjs('2024年12月25日', 'YYYY年MM月DD日')
```

我们将在插件章节详细实现这个功能。现在先实现核心思路：

```typescript
// src/parsing/custom-format.ts

interface FormatToken {
  token: string
  regex: string
  field: keyof ParsedDate
  transform?: (value: string) => number
}

const FORMAT_TOKENS: FormatToken[] = [
  { token: 'YYYY', regex: '(\\d{4})', field: 'year' },
  { token: 'YY', regex: '(\\d{2})', field: 'year', 
    transform: (v) => +v < 70 ? 2000 + +v : 1900 + +v },
  { token: 'MM', regex: '(\\d{2})', field: 'month',
    transform: (v) => +v - 1 },
  { token: 'M', regex: '(\\d{1,2})', field: 'month',
    transform: (v) => +v - 1 },
  { token: 'DD', regex: '(\\d{2})', field: 'day' },
  { token: 'D', regex: '(\\d{1,2})', field: 'day' },
  { token: 'HH', regex: '(\\d{2})', field: 'hour' },
  { token: 'H', regex: '(\\d{1,2})', field: 'hour' },
  { token: 'mm', regex: '(\\d{2})', field: 'minute' },
  { token: 'm', regex: '(\\d{1,2})', field: 'minute' },
  { token: 'ss', regex: '(\\d{2})', field: 'second' },
  { token: 's', regex: '(\\d{1,2})', field: 'second' },
]

/**
 * 根据格式字符串解析日期
 */
export function parseWithFormat(input: string, format: string): Date | null {
  // 构建正则表达式
  let regexStr = format
  const fields: FormatToken[] = []
  
  // 按 token 长度降序排列，先匹配长的
  const sortedTokens = [...FORMAT_TOKENS].sort(
    (a, b) => b.token.length - a.token.length
  )
  
  for (const token of sortedTokens) {
    const index = regexStr.indexOf(token.token)
    if (index !== -1) {
      regexStr = regexStr.replace(token.token, token.regex)
      fields.push(token)
    }
  }
  
  // 转义特殊字符
  regexStr = regexStr.replace(/[[\]{}()*+?.\\^$|]/g, '\\$&')
  
  const regex = new RegExp(`^${regexStr}$`)
  const match = input.match(regex)
  
  if (!match) {
    return null
  }
  
  // 提取值
  const parsed: Partial<ParsedDate> = {
    year: new Date().getFullYear(),
    month: 0,
    day: 1,
    hour: 0,
    minute: 0,
    second: 0,
    millisecond: 0,
  }
  
  fields.forEach((field, index) => {
    const value = match[index + 1]
    const numValue = field.transform 
      ? field.transform(value) 
      : parseInt(value, 10)
    parsed[field.field] = numValue
  })
  
  return new Date(
    parsed.year!,
    parsed.month!,
    parsed.day!,
    parsed.hour!,
    parsed.minute!,
    parsed.second!,
    parsed.millisecond!
  )
}
```

## 月份名称解析

处理英文月份名称：

```typescript
const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
]

const MONTH_SHORT_NAMES = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
]

/**
 * 解析月份名称
 */
function parseMonthName(name: string): number {
  const lower = name.toLowerCase()
  
  // 尝试完整名称
  const fullIndex = MONTH_NAMES.indexOf(lower)
  if (fullIndex !== -1) return fullIndex
  
  // 尝试缩写
  const shortIndex = MONTH_SHORT_NAMES.indexOf(lower)
  if (shortIndex !== -1) return shortIndex
  
  return -1
}

/**
 * 解析英文日期格式
 * "December 25, 2024" -> Date
 */
function parseEnglishDate(input: string): Date | null {
  const regex = /^(\w+)\s+(\d{1,2}),?\s*(\d{4})$/
  const match = input.match(regex)
  
  if (!match) return null
  
  const month = parseMonthName(match[1])
  if (month === -1) return null
  
  return new Date(+match[3], month, +match[2])
}
```

## 宽松模式解析

Day.js 默认是严格模式，但有些场景需要宽松解析：

```typescript
/**
 * 宽松解析：尝试提取日期数字
 */
function parseLoose(input: string): Date | null {
  // 提取所有数字
  const numbers = input.match(/\d+/g)
  if (!numbers || numbers.length < 3) return null
  
  // 假设格式：第一个是年（4位）或日，最后一个是年
  let year: number, month: number, day: number
  
  if (numbers[0].length === 4) {
    // YYYY-MM-DD 顺序
    year = +numbers[0]
    month = +numbers[1] - 1
    day = +numbers[2]
  } else if (numbers[2].length === 4) {
    // DD-MM-YYYY 或 MM-DD-YYYY
    year = +numbers[2]
    // 无法确定月日顺序，假设 MM-DD
    month = +numbers[0] - 1
    day = +numbers[1]
  } else {
    return null
  }
  
  const date = new Date(year, month, day)
  return isNaN(date.getTime()) ? null : date
}
```

## 严格模式 vs 宽松模式

Day.js 提供严格模式选项：

```javascript
// 严格模式（第三个参数为 true）
dayjs('2024-13-01', 'YYYY-MM-DD', true) // Invalid Date（月份超出范围）

// 宽松模式
dayjs('2024-13-01', 'YYYY-MM-DD')       // 2025-01-01（自动溢出）
```

```typescript
export function parseWithFormat(
  input: string, 
  format: string, 
  strict: boolean = false
): Date | null {
  const date = parseWithFormatInternal(input, format)
  
  if (!date) return null
  
  if (strict) {
    // 严格模式：验证日期有效性
    if (!isValidDate(date)) {
      return null
    }
  }
  
  return date
}

function isValidDate(date: Date): boolean {
  return !isNaN(date.getTime())
}
```

## 测试用例

```typescript
describe('字符串格式解析', () => {
  it('解析紧凑格式', () => {
    const d = dayjs('20241225')
    expect(d.format('YYYY-MM-DD')).toBe('2024-12-25')
  })

  it('解析美式日期', () => {
    const d = dayjs('12/25/2024')
    expect(d.month()).toBe(11)
    expect(d.date()).toBe(25)
  })

  it('解析欧式日期', () => {
    const d = dayjs('25.12.2024')
    expect(d.date()).toBe(25)
    expect(d.month()).toBe(11)
  })

  it('自定义格式解析', () => {
    dayjs.extend(customParseFormat)
    const d = dayjs('25-12-2024', 'DD-MM-YYYY')
    expect(d.date()).toBe(25)
    expect(d.month()).toBe(11)
    expect(d.year()).toBe(2024)
  })

  it('严格模式拒绝无效日期', () => {
    dayjs.extend(customParseFormat)
    const d = dayjs('2024-13-01', 'YYYY-MM-DD', true)
    expect(d.isValid()).toBe(false)
  })
})
```

## 小结

本章实现了多种字符串格式解析：

- **格式检测**：按优先级尝试匹配不同格式
- **自定义格式**：Token 替换 + 正则匹配
- **月份名称**：支持完整名称和缩写
- **严格/宽松模式**：控制日期验证行为

下一章我们将处理时区与 UTC。
