# CustomParseFormat 插件

默认的日期解析依赖浏览器的 `Date.parse()`，解析能力有限。`customParseFormat` 插件支持自定义格式解析。

## 问题场景

```javascript
// 这些格式浏览器可能无法正确解析
dayjs('15-06-2024')           // 可能失败或解析错误
dayjs('2024年6月15日')         // 可能失败
dayjs('15/06/2024 14:30')     // 可能失败
```

## API 设计

```javascript
import customParseFormat from 'dayjs/plugin/customParseFormat'
dayjs.extend(customParseFormat)

// 指定格式解析
dayjs('15-06-2024', 'DD-MM-YYYY')
dayjs('2024年6月15日', 'YYYY年M月D日')
dayjs('15/06/2024 14:30', 'DD/MM/YYYY HH:mm')

// 多种格式尝试
dayjs('06-15-2024', ['DD-MM-YYYY', 'MM-DD-YYYY'])

// 严格模式
dayjs('2024-6-15', 'YYYY-MM-DD', true)  // null（月份应该是两位）
```

## 格式标记

| 标记 | 含义 | 示例 |
|------|------|------|
| YYYY | 4位年份 | 2024 |
| YY | 2位年份 | 24 |
| M | 月份 | 1-12 |
| MM | 月份（补零） | 01-12 |
| D | 日期 | 1-31 |
| DD | 日期（补零） | 01-31 |
| H | 24小时制小时 | 0-23 |
| HH | 24小时制小时（补零） | 00-23 |
| h | 12小时制小时 | 1-12 |
| hh | 12小时制小时（补零） | 01-12 |
| m | 分钟 | 0-59 |
| mm | 分钟（补零） | 00-59 |
| s | 秒 | 0-59 |
| ss | 秒（补零） | 00-59 |
| A | AM/PM | AM, PM |
| a | am/pm | am, pm |

## 核心实现

```typescript
// src/plugins/customParseFormat.ts
interface ParsedResult {
  year?: number
  month?: number
  day?: number
  hour?: number
  minute?: number
  second?: number
  millisecond?: number
  isPM?: boolean
}

const tokenPatterns: Record<string, { regex: string; field: keyof ParsedResult }> = {
  YYYY: { regex: '(\\d{4})', field: 'year' },
  YY: { regex: '(\\d{2})', field: 'year' },
  M: { regex: '(\\d{1,2})', field: 'month' },
  MM: { regex: '(\\d{2})', field: 'month' },
  D: { regex: '(\\d{1,2})', field: 'day' },
  DD: { regex: '(\\d{2})', field: 'day' },
  H: { regex: '(\\d{1,2})', field: 'hour' },
  HH: { regex: '(\\d{2})', field: 'hour' },
  h: { regex: '(\\d{1,2})', field: 'hour' },
  hh: { regex: '(\\d{2})', field: 'hour' },
  m: { regex: '(\\d{1,2})', field: 'minute' },
  mm: { regex: '(\\d{2})', field: 'minute' },
  s: { regex: '(\\d{1,2})', field: 'second' },
  ss: { regex: '(\\d{2})', field: 'second' },
  SSS: { regex: '(\\d{3})', field: 'millisecond' },
  A: { regex: '(AM|PM)', field: 'isPM' },
  a: { regex: '(am|pm)', field: 'isPM' }
}

export default function(option, DayjsClass, dayjs) {
  const oldParse = dayjs
  
  // 覆盖 dayjs 工厂函数
  const newDayjs = function(
    date?: DateInput,
    format?: string | string[],
    strict?: boolean
  ) {
    // 无格式参数，使用原解析
    if (!format) {
      return oldParse(date)
    }
    
    // 多格式尝试
    if (Array.isArray(format)) {
      for (const f of format) {
        const result = parseWithFormat(date as string, f, strict)
        if (result) return oldParse(result)
      }
      return oldParse(new Date(NaN))
    }
    
    // 单格式解析
    const result = parseWithFormat(date as string, format, strict)
    return oldParse(result)
  }
  
  // 复制原有属性
  Object.assign(newDayjs, oldParse)
  
  return newDayjs
}

function parseWithFormat(
  input: string,
  format: string,
  strict?: boolean
): Date | null {
  // 构建正则表达式
  const { regex, fields } = buildRegex(format, strict)
  
  const match = input.match(new RegExp(`^${regex}$`))
  if (!match) return null
  
  // 提取值
  const result: ParsedResult = {}
  fields.forEach((field, index) => {
    const value = match[index + 1]
    
    if (field === 'isPM') {
      result.isPM = value.toLowerCase() === 'pm'
    } else {
      result[field] = parseInt(value, 10)
    }
  })
  
  // 处理两位年份
  if (result.year !== undefined && result.year < 100) {
    result.year += result.year > 68 ? 1900 : 2000
  }
  
  // 处理 12 小时制
  if (result.isPM !== undefined && result.hour !== undefined) {
    if (result.isPM && result.hour < 12) {
      result.hour += 12
    }
    if (!result.isPM && result.hour === 12) {
      result.hour = 0
    }
  }
  
  // 构建日期
  return new Date(
    result.year || 0,
    (result.month || 1) - 1,
    result.day || 1,
    result.hour || 0,
    result.minute || 0,
    result.second || 0,
    result.millisecond || 0
  )
}

function buildRegex(
  format: string,
  strict?: boolean
): { regex: string; fields: string[] } {
  let regex = ''
  const fields: string[] = []
  
  // 按长度排序，优先匹配长的（YYYY 优先于 YY）
  const sortedTokens = Object.keys(tokenPatterns)
    .sort((a, b) => b.length - a.length)
  
  let i = 0
  while (i < format.length) {
    let matched = false
    
    for (const token of sortedTokens) {
      if (format.slice(i, i + token.length) === token) {
        const pattern = tokenPatterns[token]
        regex += pattern.regex
        fields.push(pattern.field)
        i += token.length
        matched = true
        break
      }
    }
    
    if (!matched) {
      // 普通字符，转义正则特殊字符
      const char = format[i]
      regex += escapeRegex(char)
      i++
    }
  }
  
  return { regex, fields }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
```

## 严格模式

严格模式下，输入必须完全匹配格式：

```javascript
// 非严格模式
dayjs('2024-6-15', 'YYYY-MM-DD')  // 成功（M 匹配 6）

// 严格模式
dayjs('2024-6-15', 'YYYY-MM-DD', true)  // 失败（需要 06）
dayjs('2024-06-15', 'YYYY-MM-DD', true) // 成功
```

实现严格模式：

```typescript
function parseWithFormat(input, format, strict) {
  const { regex } = buildRegex(format, strict)
  
  // 严格模式使用严格的正则
  const pattern = strict ? `^${regex}$` : `^${regex}`
  const match = input.match(new RegExp(pattern))
  
  if (!match) return null
  // ...
}

function buildRegex(format, strict) {
  // 严格模式使用精确匹配
  const patterns = strict ? strictPatterns : loosePatterns
  // ...
}

const strictPatterns = {
  YYYY: { regex: '(\\d{4})', field: 'year' },
  MM: { regex: '(\\d{2})', field: 'month' },  // 必须两位
  DD: { regex: '(\\d{2})', field: 'day' },    // 必须两位
  // ...
}

const loosePatterns = {
  YYYY: { regex: '(\\d{4})', field: 'year' },
  MM: { regex: '(\\d{1,2})', field: 'month' },  // 一位或两位
  DD: { regex: '(\\d{1,2})', field: 'day' },    // 一位或两位
  // ...
}
```

## 使用场景

### 解析用户输入

```javascript
function parseUserDate(input) {
  // 尝试多种常见格式
  const formats = [
    'YYYY-MM-DD',
    'YYYY/MM/DD',
    'DD-MM-YYYY',
    'DD/MM/YYYY',
    'YYYY年MM月DD日',
    'YYYY年M月D日'
  ]
  
  const date = dayjs(input, formats)
  
  return date.isValid() ? date : null
}
```

### 解析日志时间

```javascript
function parseLogTimestamp(line) {
  // [2024-06-15 14:30:45.123] INFO: message
  const match = line.match(/\[(.*?)\]/)
  if (!match) return null
  
  return dayjs(match[1], 'YYYY-MM-DD HH:mm:ss.SSS')
}
```

### 解析 CSV 日期

```javascript
function parseCSVDates(rows, dateColumn, format) {
  return rows.map(row => ({
    ...row,
    [dateColumn]: dayjs(row[dateColumn], format)
  }))
}

parseCSVDates(data, 'date', 'DD/MM/YYYY')
```

## 测试用例

```typescript
describe('customParseFormat', () => {
  describe('标准格式', () => {
    it('YYYY-MM-DD', () => {
      const d = dayjs('2024-06-15', 'YYYY-MM-DD')
      expect(d.year()).toBe(2024)
      expect(d.month()).toBe(5)  // 0-indexed
      expect(d.date()).toBe(15)
    })

    it('DD/MM/YYYY', () => {
      const d = dayjs('15/06/2024', 'DD/MM/YYYY')
      expect(d.format('YYYY-MM-DD')).toBe('2024-06-15')
    })
  })

  describe('时间格式', () => {
    it('HH:mm:ss', () => {
      const d = dayjs('14:30:45', 'HH:mm:ss')
      expect(d.hour()).toBe(14)
      expect(d.minute()).toBe(30)
      expect(d.second()).toBe(45)
    })

    it('12小时制', () => {
      const d = dayjs('02:30 PM', 'hh:mm A')
      expect(d.hour()).toBe(14)
    })
  })

  describe('中文格式', () => {
    it('YYYY年MM月DD日', () => {
      const d = dayjs('2024年06月15日', 'YYYY年MM月DD日')
      expect(d.format('YYYY-MM-DD')).toBe('2024-06-15')
    })
  })

  describe('多格式', () => {
    it('尝试多种格式', () => {
      const formats = ['DD-MM-YYYY', 'YYYY-MM-DD']
      
      const d1 = dayjs('2024-06-15', formats)
      const d2 = dayjs('15-06-2024', formats)
      
      expect(d1.format('YYYY-MM-DD')).toBe('2024-06-15')
      expect(d2.format('YYYY-MM-DD')).toBe('2024-06-15')
    })
  })

  describe('严格模式', () => {
    it('严格匹配', () => {
      const d1 = dayjs('2024-6-15', 'YYYY-MM-DD', true)
      const d2 = dayjs('2024-06-15', 'YYYY-MM-DD', true)
      
      expect(d1.isValid()).toBe(false)
      expect(d2.isValid()).toBe(true)
    })
  })

  describe('无效输入', () => {
    it('格式不匹配', () => {
      const d = dayjs('invalid', 'YYYY-MM-DD')
      expect(d.isValid()).toBe(false)
    })
  })
})
```

## 小结

本章实现了 `customParseFormat` 插件：

- **格式解析**：支持自定义格式字符串
- **多格式尝试**：数组格式依次尝试
- **严格模式**：精确匹配格式
- **丰富标记**：年、月、日、时、分、秒、毫秒、AM/PM

这是处理多样化日期输入的关键工具。
