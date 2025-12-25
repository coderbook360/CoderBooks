# 格式化 Token 解析

深入理解格式化 Token 的设计与实现细节。

## Token 设计原则

Day.js 的 Token 设计继承自 Moment.js：

1. **大写敏感**：`M` 是月份，`m` 是分钟
2. **长度语义**：`M` 不补零，`MM` 补零
3. **可组合**：Token 可以与普通字符自由组合
4. **可扩展**：插件可以添加新 Token

## Token 分类

### 年份 Token

| Token | 示例 | 说明 |
|-------|------|------|
| YYYY | 2024 | 四位年份 |
| YY | 24 | 两位年份 |

```typescript
const yearTokens = {
  YYYY: (d: Dayjs) => padStart(d.$y, 4),
  YY: (d: Dayjs) => String(d.$y).slice(-2),
}
```

### 月份 Token

| Token | 示例 | 说明 |
|-------|------|------|
| M | 1-12 | 月份数字 |
| MM | 01-12 | 月份（补零）|
| MMM | Jan-Dec | 月份缩写 |
| MMMM | January-December | 月份全称 |

```typescript
const monthTokens = {
  M: (d: Dayjs) => String(d.$M + 1),
  MM: (d: Dayjs) => padStart(d.$M + 1),
  MMM: (d: Dayjs, locale: Locale) => locale.monthsShort[d.$M],
  MMMM: (d: Dayjs, locale: Locale) => locale.months[d.$M],
}
```

### 日期 Token

| Token | 示例 | 说明 |
|-------|------|------|
| D | 1-31 | 日期 |
| DD | 01-31 | 日期（补零）|
| Do | 1st-31st | 日期（序数词）|

```typescript
const dateTokens = {
  D: (d: Dayjs) => String(d.$D),
  DD: (d: Dayjs) => padStart(d.$D),
  Do: (d: Dayjs, locale: Locale) => locale.ordinal(d.$D),
}
```

### 星期 Token

| Token | 示例 | 说明 |
|-------|------|------|
| d | 0-6 | 星期数字（0=周日）|
| dd | Su-Sa | 最短缩写 |
| ddd | Sun-Sat | 短缩写 |
| dddd | Sunday-Saturday | 全称 |

```typescript
const weekdayTokens = {
  d: (d: Dayjs) => String(d.$W),
  dd: (d: Dayjs, locale: Locale) => locale.weekdaysMin[d.$W],
  ddd: (d: Dayjs, locale: Locale) => locale.weekdaysShort[d.$W],
  dddd: (d: Dayjs, locale: Locale) => locale.weekdays[d.$W],
}
```

### 时间 Token

| Token | 示例 | 说明 |
|-------|------|------|
| H | 0-23 | 24小时制 |
| HH | 00-23 | 24小时制（补零）|
| h | 1-12 | 12小时制 |
| hh | 01-12 | 12小时制（补零）|
| m | 0-59 | 分钟 |
| mm | 00-59 | 分钟（补零）|
| s | 0-59 | 秒 |
| ss | 00-59 | 秒（补零）|
| S | 0-9 | 毫秒（1位）|
| SS | 00-99 | 毫秒（2位）|
| SSS | 000-999 | 毫秒（3位）|

```typescript
const timeTokens = {
  H: (d: Dayjs) => String(d.$H),
  HH: (d: Dayjs) => padStart(d.$H),
  h: (d: Dayjs) => String(d.$H % 12 || 12),
  hh: (d: Dayjs) => padStart(d.$H % 12 || 12),
  m: (d: Dayjs) => String(d.$m),
  mm: (d: Dayjs) => padStart(d.$m),
  s: (d: Dayjs) => String(d.$s),
  ss: (d: Dayjs) => padStart(d.$s),
  S: (d: Dayjs) => String(Math.floor(d.$ms / 100)),
  SS: (d: Dayjs) => padStart(Math.floor(d.$ms / 10)),
  SSS: (d: Dayjs) => padStart(d.$ms, 3),
}
```

### AM/PM Token

| Token | 示例 | 说明 |
|-------|------|------|
| A | AM/PM | 大写 |
| a | am/pm | 小写 |

```typescript
const meridiemTokens = {
  A: (d: Dayjs, locale: Locale) => {
    const hour = d.$H
    return locale.meridiem?.(hour, d.$m, false) 
      || (hour < 12 ? 'AM' : 'PM')
  },
  a: (d: Dayjs, locale: Locale) => {
    const hour = d.$H
    return locale.meridiem?.(hour, d.$m, true) 
      || (hour < 12 ? 'am' : 'pm')
  },
}
```

### 时区 Token

| Token | 示例 | 说明 |
|-------|------|------|
| Z | +08:00 | 时区偏移（带冒号）|
| ZZ | +0800 | 时区偏移（无冒号）|

## Token 注册机制

使用对象合并所有 Token：

```typescript
interface TokenFormatter {
  (d: Dayjs, locale: Locale): string
}

const TOKEN_FORMATTERS: Record<string, TokenFormatter> = {
  ...yearTokens,
  ...monthTokens,
  ...dateTokens,
  ...weekdayTokens,
  ...timeTokens,
  ...meridiemTokens,
  Z: (d) => d.formatTimezone(true),
  ZZ: (d) => d.formatTimezone(false),
}
```

## Token 匹配正则

构建匹配正则时需要注意：

1. 按长度降序排列
2. 处理特殊字符转义
3. 处理方括号转义

```typescript
function buildTokenRegex(tokens: string[]): RegExp {
  // 按长度降序
  const sorted = [...tokens].sort((a, b) => b.length - a.length)
  
  // 转义特殊正则字符
  const escaped = sorted.map(t => 
    t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  )
  
  return new RegExp(escaped.join('|'), 'g')
}
```

## 完整格式化实现

```typescript
class Dayjs {
  format(formatStr?: string): string {
    if (!this.isValid()) {
      return 'Invalid Date'
    }
    
    const str = formatStr || 'YYYY-MM-DDTHH:mm:ssZ'
    const locale = this.$locale || DEFAULT_LOCALE
    
    // 1. 提取转义内容
    const escaped: string[] = []
    let processed = str.replace(/\[([^\]]+)\]/g, (_, content) => {
      escaped.push(content)
      return `\x00${escaped.length - 1}\x00`
    })
    
    // 2. 构建正则
    const tokens = Object.keys(TOKEN_FORMATTERS)
    const regex = buildTokenRegex(tokens)
    
    // 3. 替换 Token
    processed = processed.replace(regex, (match) => {
      const formatter = TOKEN_FORMATTERS[match]
      return formatter ? formatter(this, locale) : match
    })
    
    // 4. 还原转义内容
    processed = processed.replace(/\x00(\d+)\x00/g, (_, i) => escaped[+i])
    
    return processed
  }
}
```

## 插件扩展 Token

插件可以添加自定义 Token：

```typescript
// advancedFormat 插件
export default function(option: unknown, DayjsClass: typeof Dayjs) {
  const oldFormat = DayjsClass.prototype.format
  
  DayjsClass.prototype.format = function(formatStr?: string): string {
    const str = formatStr || ''
    
    // 添加新 Token
    const extended = str
      // Q: 季度
      .replace(/Q/g, String(this.quarter()))
      // Do: 序数日期
      .replace(/Do/g, this.$locale.ordinal(this.date()))
      // wo: 序数周
      .replace(/wo/g, this.$locale.ordinal(this.week()))
    
    return oldFormat.call(this, extended)
  }
}
```

```javascript
dayjs.extend(advancedFormat)
dayjs('2024-06-15').format('YYYY年第Q季度')  // 2024年第2季度
dayjs('2024-06-15').format('Do')  // 15th
```

## 性能优化

格式化是高频操作，可以缓存正则：

```typescript
// 缓存编译后的格式化函数
const formatCache = new Map<string, (d: Dayjs, l: Locale) => string>()

function getFormatter(formatStr: string) {
  if (formatCache.has(formatStr)) {
    return formatCache.get(formatStr)!
  }
  
  const formatter = compileFormat(formatStr)
  formatCache.set(formatStr, formatter)
  return formatter
}

function compileFormat(formatStr: string): (d: Dayjs, l: Locale) => string {
  // 预处理格式字符串，生成高效的格式化函数
  // ...
}
```

## 测试用例

```typescript
describe('Token 解析', () => {
  const date = dayjs('2024-06-05T09:05:03.007')

  describe('年份', () => {
    it('YYYY', () => expect(date.format('YYYY')).toBe('2024'))
    it('YY', () => expect(date.format('YY')).toBe('24'))
  })

  describe('月份', () => {
    it('M', () => expect(date.format('M')).toBe('6'))
    it('MM', () => expect(date.format('MM')).toBe('06'))
  })

  describe('日期', () => {
    it('D', () => expect(date.format('D')).toBe('5'))
    it('DD', () => expect(date.format('DD')).toBe('05'))
  })

  describe('时间', () => {
    it('H', () => expect(date.format('H')).toBe('9'))
    it('HH', () => expect(date.format('HH')).toBe('09'))
    it('h', () => expect(date.format('h')).toBe('9'))
    it('hh', () => expect(date.format('hh')).toBe('09'))
  })

  describe('毫秒', () => {
    it('S', () => expect(date.format('S')).toBe('0'))
    it('SS', () => expect(date.format('SS')).toBe('00'))
    it('SSS', () => expect(date.format('SSS')).toBe('007'))
  })

  describe('AM/PM', () => {
    it('A (上午)', () => expect(date.format('A')).toBe('AM'))
    it('A (下午)', () => {
      expect(dayjs('2024-01-01T14:00').format('A')).toBe('PM')
    })
  })

  describe('组合', () => {
    it('常用格式', () => {
      expect(date.format('YYYY-MM-DD HH:mm:ss'))
        .toBe('2024-06-05 09:05:03')
    })
  })
})
```

## 小结

本章深入讲解了格式化 Token：

- **Token 分类**：年、月、日、时、分、秒、毫秒、星期、AM/PM、时区
- **长度语义**：单字符不补零，双字符补零，更多字符有特殊含义
- **匹配策略**：长度降序匹配，避免冲突
- **扩展机制**：插件可以添加自定义 Token

理解 Token 系统是掌握 Day.js 格式化的关键。
