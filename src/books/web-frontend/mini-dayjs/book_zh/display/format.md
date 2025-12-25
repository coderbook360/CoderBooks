# format 格式化核心实现

`format` 方法将日期对象格式化为字符串，是 Day.js 最重要的输出方法。

## API 设计

```javascript
dayjs().format()                    // 默认 ISO 格式
dayjs().format('YYYY-MM-DD')        // 2024-12-25
dayjs().format('YYYY年MM月DD日')    // 2024年12月25日
dayjs().format('HH:mm:ss')          // 14:30:45
```

## 支持的格式化 Token

| Token | 输出 | 说明 |
|-------|------|------|
| YY | 24 | 两位年份 |
| YYYY | 2024 | 四位年份 |
| M | 1-12 | 月份 |
| MM | 01-12 | 月份（补零）|
| D | 1-31 | 日期 |
| DD | 01-31 | 日期（补零）|
| d | 0-6 | 星期（0=周日）|
| dd | Su-Sa | 星期缩写 |
| ddd | Sun-Sat | 星期缩写 |
| dddd | Sunday-Saturday | 星期全称 |
| H | 0-23 | 小时（24小时制）|
| HH | 00-23 | 小时（24小时制，补零）|
| h | 1-12 | 小时（12小时制）|
| hh | 01-12 | 小时（12小时制，补零）|
| m | 0-59 | 分钟 |
| mm | 00-59 | 分钟（补零）|
| s | 0-59 | 秒 |
| ss | 00-59 | 秒（补零）|
| SSS | 000-999 | 毫秒 |
| A | AM/PM | 上午/下午 |
| a | am/pm | 上午/下午（小写）|
| Z | +08:00 | 时区偏移 |
| ZZ | +0800 | 时区偏移（无冒号）|

## 核心实现

```typescript
class Dayjs {
  /**
   * 格式化日期
   */
  format(formatStr?: string): string {
    if (!this.isValid()) {
      return 'Invalid Date'
    }
    
    const str = formatStr || 'YYYY-MM-DDTHH:mm:ssZ'
    return this.formatString(str)
  }

  private formatString(formatStr: string): string {
    const locale = this.$locale || DEFAULT_LOCALE
    
    // Token 替换映射
    const matches: Record<string, () => string> = {
      YY: () => String(this.$y).slice(-2),
      YYYY: () => padStart(this.$y, 4),
      M: () => String(this.$M + 1),
      MM: () => padStart(this.$M + 1),
      D: () => String(this.$D),
      DD: () => padStart(this.$D),
      d: () => String(this.$W),
      dd: () => locale.weekdaysMin[this.$W],
      ddd: () => locale.weekdaysShort[this.$W],
      dddd: () => locale.weekdays[this.$W],
      H: () => String(this.$H),
      HH: () => padStart(this.$H),
      h: () => String(this.$H % 12 || 12),
      hh: () => padStart(this.$H % 12 || 12),
      m: () => String(this.$m),
      mm: () => padStart(this.$m),
      s: () => String(this.$s),
      ss: () => padStart(this.$s),
      SSS: () => padStart(this.$ms, 3),
      A: () => this.$H < 12 ? 'AM' : 'PM',
      a: () => this.$H < 12 ? 'am' : 'pm',
      Z: () => this.formatTimezone(true),
      ZZ: () => this.formatTimezone(false),
    }
    
    return this.replaceTokens(formatStr, matches)
  }
}
```

## Token 替换逻辑

关键是**按长度降序匹配**，避免短 Token 干扰长 Token：

```typescript
class Dayjs {
  private replaceTokens(
    str: string, 
    matches: Record<string, () => string>
  ): string {
    // 按长度降序排列 Token
    const tokens = Object.keys(matches).sort((a, b) => b.length - a.length)
    
    // 创建正则匹配所有 Token
    const regex = new RegExp(tokens.join('|'), 'g')
    
    return str.replace(regex, (match) => {
      const fn = matches[match]
      return fn ? fn() : match
    })
  }
}
```

为什么要按长度降序？

```javascript
// 如果不排序，'M' 会先匹配 'MM' 中的第一个 M
'MM'.replace(/M|MM/g, ...)  // 错误

// 按长度降序后，'MM' 先匹配
'MM'.replace(/MM|M/g, ...)  // 正确
```

## 转义字符处理

用方括号包裹的内容不解析：

```javascript
dayjs().format('[Today is] dddd')  // Today is Wednesday
dayjs().format('[YYYY]')           // YYYY（不解析）
```

```typescript
class Dayjs {
  private replaceTokens(
    str: string, 
    matches: Record<string, () => string>
  ): string {
    // 先提取转义内容
    const escapeRegex = /\[([^\]]+)\]/g
    const escaped: string[] = []
    
    str = str.replace(escapeRegex, (match, content) => {
      escaped.push(content)
      return `\x00${escaped.length - 1}\x00`  // 占位符
    })
    
    // Token 替换
    const tokens = Object.keys(matches).sort((a, b) => b.length - a.length)
    const regex = new RegExp(tokens.join('|'), 'g')
    str = str.replace(regex, (match) => matches[match]?.() ?? match)
    
    // 还原转义内容
    str = str.replace(/\x00(\d+)\x00/g, (_, index) => escaped[+index])
    
    return str
  }
}
```

## 时区格式化

```typescript
class Dayjs {
  /**
   * 格式化时区偏移
   */
  private formatTimezone(withColon: boolean): string {
    if (this.$u) {
      return 'Z'
    }
    
    const offset = -this.$d.getTimezoneOffset()
    const sign = offset >= 0 ? '+' : '-'
    const absOffset = Math.abs(offset)
    const hours = Math.floor(absOffset / 60)
    const minutes = absOffset % 60
    
    const formatted = `${sign}${padStart(hours)}${padStart(minutes)}`
    return withColon 
      ? `${sign}${padStart(hours)}:${padStart(minutes)}`
      : formatted
  }
}
```

## 本地化格式

不同地区有不同的日期格式习惯：

```typescript
const LOCALE_FORMATS: Record<string, string> = {
  LT: 'h:mm A',           // 时间
  LTS: 'h:mm:ss A',       // 完整时间
  L: 'MM/DD/YYYY',        // 日期
  LL: 'MMMM D, YYYY',     // 完整日期
  LLL: 'MMMM D, YYYY h:mm A',
  LLLL: 'dddd, MMMM D, YYYY h:mm A',
}

class Dayjs {
  format(formatStr?: string): string {
    let str = formatStr || 'YYYY-MM-DDTHH:mm:ssZ'
    
    // 展开本地化格式
    str = str.replace(/\b(LT|LTS|L{1,4})\b/g, (match) => {
      return LOCALE_FORMATS[match] || match
    })
    
    return this.formatString(str)
  }
}
```

```javascript
dayjs().format('L')      // 12/25/2024
dayjs().format('LL')     // December 25, 2024
dayjs().format('LLLL')   // Wednesday, December 25, 2024 2:30 PM
```

## 测试用例

```typescript
describe('format', () => {
  const date = dayjs('2024-06-15T14:30:45.123')

  describe('日期部分', () => {
    it('YYYY-MM-DD', () => {
      expect(date.format('YYYY-MM-DD')).toBe('2024-06-15')
    })

    it('YY/M/D', () => {
      expect(date.format('YY/M/D')).toBe('24/6/15')
    })
  })

  describe('时间部分', () => {
    it('HH:mm:ss', () => {
      expect(date.format('HH:mm:ss')).toBe('14:30:45')
    })

    it('h:mm A', () => {
      expect(date.format('h:mm A')).toBe('2:30 PM')
    })

    it('毫秒', () => {
      expect(date.format('SSS')).toBe('123')
    })
  })

  describe('星期', () => {
    it('d', () => {
      expect(date.format('d')).toBe('6') // 周六
    })

    it('dddd', () => {
      expect(date.format('dddd')).toBe('Saturday')
    })
  })

  describe('转义', () => {
    it('方括号内不解析', () => {
      expect(date.format('[YYYY]')).toBe('YYYY')
      expect(date.format('[Today is] dddd')).toBe('Today is Saturday')
    })
  })

  describe('默认格式', () => {
    it('无参数返回 ISO 格式', () => {
      expect(date.format()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })
  })

  describe('无效日期', () => {
    it('返回 Invalid Date', () => {
      expect(dayjs('invalid').format()).toBe('Invalid Date')
    })
  })
})
```

## 小结

本章实现了 `format` 核心：

- **Token 系统**：支持年月日时分秒等 Token
- **长度优先匹配**：避免短 Token 干扰长 Token
- **转义处理**：方括号内容不解析
- **时区格式化**：Z 和 ZZ 格式

下一章详细讲解格式化 Token 的解析机制。
