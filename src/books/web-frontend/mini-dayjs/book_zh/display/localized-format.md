# 本地化格式支持

Day.js 支持本地化格式，让日期显示符合不同地区的习惯。

## 本地化格式 Token

Day.js 提供了一系列以 `L` 开头的本地化格式 Token：

| Token | 示例（en-US）| 说明 |
|-------|-------------|------|
| LT | 2:30 PM | 时间 |
| LTS | 2:30:45 PM | 完整时间 |
| L | 06/15/2024 | 日期 |
| LL | June 15, 2024 | 完整日期 |
| LLL | June 15, 2024 2:30 PM | 日期时间 |
| LLLL | Saturday, June 15, 2024 2:30 PM | 完整日期时间 |

```javascript
dayjs().format('L')     // 06/15/2024
dayjs().format('LL')    // June 15, 2024
dayjs().format('LLLL')  // Saturday, June 15, 2024 2:30 PM
```

## 不同地区的格式

同样的 `L` Token，不同地区显示不同：

```javascript
// 英文（美国）
dayjs().locale('en').format('L')      // 06/15/2024
dayjs().locale('en').format('LL')     // June 15, 2024

// 中文
dayjs().locale('zh-cn').format('L')   // 2024/06/15
dayjs().locale('zh-cn').format('LL')  // 2024年6月15日

// 日文
dayjs().locale('ja').format('L')      // 2024/06/15
dayjs().locale('ja').format('LL')     // 2024年6月15日
```

## Locale 对象结构

```typescript
interface Locale {
  name: string
  
  // 月份
  months: string[]
  monthsShort: string[]
  
  // 星期
  weekdays: string[]
  weekdaysShort: string[]
  weekdaysMin: string[]
  
  // 本地化格式
  formats: {
    LT: string
    LTS: string
    L: string
    LL: string
    LLL: string
    LLLL: string
  }
  
  // 相对时间（relativeTime 插件）
  relativeTime?: {
    future: string
    past: string
    s: string
    m: string
    mm: string
    h: string
    hh: string
    d: string
    dd: string
    M: string
    MM: string
    y: string
    yy: string
  }
  
  // 序数词
  ordinal?: (n: number) => string
  
  // AM/PM
  meridiem?: (hour: number, minute: number, isLower: boolean) => string
  
  // 一周第一天
  weekStart?: number
}
```

## 英文 Locale 实现

```typescript
// src/locale/en.ts
const locale: Locale = {
  name: 'en',
  
  months: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ],
  
  monthsShort: [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ],
  
  weekdays: [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday',
    'Thursday', 'Friday', 'Saturday'
  ],
  
  weekdaysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  
  weekdaysMin: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
  
  formats: {
    LT: 'h:mm A',
    LTS: 'h:mm:ss A',
    L: 'MM/DD/YYYY',
    LL: 'MMMM D, YYYY',
    LLL: 'MMMM D, YYYY h:mm A',
    LLLL: 'dddd, MMMM D, YYYY h:mm A',
  },
  
  ordinal: (n: number): string => {
    const s = ['th', 'st', 'nd', 'rd']
    const v = n % 100
    return n + (s[(v - 20) % 10] || s[v] || s[0])
  },
  
  weekStart: 0, // 周日
}

export default locale
```

## 中文 Locale 实现

```typescript
// src/locale/zh-cn.ts
const locale: Locale = {
  name: 'zh-cn',
  
  months: [
    '一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月'
  ],
  
  monthsShort: [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月'
  ],
  
  weekdays: [
    '星期日', '星期一', '星期二', '星期三',
    '星期四', '星期五', '星期六'
  ],
  
  weekdaysShort: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
  
  weekdaysMin: ['日', '一', '二', '三', '四', '五', '六'],
  
  formats: {
    LT: 'HH:mm',
    LTS: 'HH:mm:ss',
    L: 'YYYY/MM/DD',
    LL: 'YYYY年M月D日',
    LLL: 'YYYY年M月D日 HH:mm',
    LLLL: 'YYYY年M月D日dddd HH:mm',
  },
  
  meridiem: (hour: number, minute: number, isLower: boolean): string => {
    const h = hour * 100 + minute
    if (h < 600) return '凌晨'
    if (h < 900) return '早上'
    if (h < 1130) return '上午'
    if (h < 1230) return '中午'
    if (h < 1800) return '下午'
    return '晚上'
  },
  
  ordinal: (n: number): string => `${n}日`,
  
  weekStart: 1, // 周一
}

export default locale
```

## 格式化实现

在 `format` 方法中展开本地化格式：

```typescript
class Dayjs {
  format(formatStr?: string): string {
    if (!this.isValid()) {
      return 'Invalid Date'
    }
    
    const locale = this.$locale || DEFAULT_LOCALE
    let str = formatStr || 'YYYY-MM-DDTHH:mm:ssZ'
    
    // 展开本地化格式 Token
    str = str.replace(/(\[[^\]]+\])|LTS?|L{1,4}/g, (match) => {
      // 跳过转义内容
      if (match[0] === '[') {
        return match
      }
      // 查找本地化格式
      return locale.formats[match as keyof typeof locale.formats] || match
    })
    
    return this.formatString(str, locale)
  }
}
```

## 动态切换语言

```typescript
// 全局设置
dayjs.locale('zh-cn')

// 单实例设置
dayjs().locale('ja').format('LL')

// 链式调用
dayjs('2024-06-15')
  .locale('zh-cn')
  .format('LL')  // 2024年6月15日
```

实现：

```typescript
class Dayjs {
  private $locale: Locale
  
  /**
   * 设置/获取 locale
   */
  locale(preset?: string | Locale): Dayjs | string {
    if (!preset) {
      return this.$locale.name
    }
    
    const newLocale = typeof preset === 'string' 
      ? getLocale(preset) 
      : preset
    
    const clone = this.clone()
    clone.$locale = newLocale
    return clone
  }
}
```

## 注册 Locale

```typescript
const LOCALES: Map<string, Locale> = new Map()

// 注册默认 locale
LOCALES.set('en', enLocale)

/**
 * 获取 locale
 */
function getLocale(name: string): Locale {
  return LOCALES.get(name) || LOCALES.get('en')!
}

/**
 * 注册 locale
 */
dayjs.locale = function(preset: string | Locale, object?: Locale): string {
  if (typeof preset === 'string' && object) {
    // 注册新 locale
    LOCALES.set(preset, object)
    return preset
  }
  
  if (typeof preset === 'string') {
    // 设置全局 locale
    globalLocale = getLocale(preset)
    return preset
  }
  
  // 注册并设置
  LOCALES.set(preset.name, preset)
  globalLocale = preset
  return preset.name
}
```

## 测试用例

```typescript
describe('本地化格式', () => {
  describe('英文', () => {
    const date = dayjs('2024-06-15T14:30:45').locale('en')
    
    it('L', () => {
      expect(date.format('L')).toBe('06/15/2024')
    })
    
    it('LL', () => {
      expect(date.format('LL')).toBe('June 15, 2024')
    })
    
    it('LLLL', () => {
      expect(date.format('LLLL'))
        .toBe('Saturday, June 15, 2024 2:30 PM')
    })
  })

  describe('中文', () => {
    beforeAll(() => {
      dayjs.extend(zhCnLocale)
    })
    
    const date = dayjs('2024-06-15T14:30:45').locale('zh-cn')
    
    it('L', () => {
      expect(date.format('L')).toBe('2024/06/15')
    })
    
    it('LL', () => {
      expect(date.format('LL')).toBe('2024年6月15日')
    })
    
    it('LLLL', () => {
      expect(date.format('LLLL')).toBe('2024年6月15日星期六 14:30')
    })
  })

  describe('月份名称', () => {
    it('英文月份', () => {
      expect(dayjs('2024-06-15').locale('en').format('MMMM'))
        .toBe('June')
    })
    
    it('中文月份', () => {
      expect(dayjs('2024-06-15').locale('zh-cn').format('MMMM'))
        .toBe('六月')
    })
  })

  describe('星期名称', () => {
    it('英文星期', () => {
      expect(dayjs('2024-06-15').locale('en').format('dddd'))
        .toBe('Saturday')
    })
    
    it('中文星期', () => {
      expect(dayjs('2024-06-15').locale('zh-cn').format('dddd'))
        .toBe('星期六')
    })
  })
})
```

## 小结

本章实现了本地化格式支持：

- **本地化 Token**：L、LL、LLL、LLLL 等
- **Locale 对象**：月份、星期、格式、序数词
- **中英文实现**：不同地区的格式差异
- **动态切换**：全局设置和实例设置

本地化是国际化应用的基础，Day.js 的设计让这变得简单。
