# 国际化系统设计

Day.js 的国际化（i18n）系统让日期显示适应不同语言和地区。

## 设计目标

- **按需加载**：只加载需要的语言包
- **全局与局部**：支持全局设置和单次使用
- **易于扩展**：简单的语言包格式

## Locale 接口

```typescript
interface Locale {
  name: string                    // 语言标识，如 'zh-cn'
  weekdays: string[]              // 周日到周六的完整名称
  weekdaysShort: string[]         // 周日到周六的简写
  weekdaysMin: string[]           // 周日到周六的最简写
  months: string[]                // 月份完整名称
  monthsShort: string[]           // 月份简写
  ordinal: (n: number) => string  // 序数词，如 1st, 2nd
  weekStart: number               // 一周开始的日期，0=周日，1=周一
  formats: {                      // 本地化格式
    LT: string                    // 时间
    LTS: string                   // 时间（含秒）
    L: string                     // 日期
    LL: string                    // 日期（完整月份）
    LLL: string                   // 日期时间
    LLLL: string                  // 日期时间（完整）
    l?: string
    ll?: string
    lll?: string
    llll?: string
  }
  relativeTime: {                 // 相对时间
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
}
```

## 内置英文 Locale

```typescript
// src/locale/en.ts
const locale: Locale = {
  name: 'en',
  weekdays: [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday',
    'Thursday', 'Friday', 'Saturday'
  ],
  weekdaysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  weekdaysMin: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
  months: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ],
  monthsShort: [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ],
  ordinal: (n: number) => {
    const s = ['th', 'st', 'nd', 'rd']
    const v = n % 100
    return n + (s[(v - 20) % 10] || s[v] || s[0])
  },
  weekStart: 0,  // 周日
  formats: {
    LT: 'h:mm A',
    LTS: 'h:mm:ss A',
    L: 'MM/DD/YYYY',
    LL: 'MMMM D, YYYY',
    LLL: 'MMMM D, YYYY h:mm A',
    LLLL: 'dddd, MMMM D, YYYY h:mm A'
  },
  relativeTime: {
    future: 'in %s',
    past: '%s ago',
    s: 'a few seconds',
    m: 'a minute',
    mm: '%d minutes',
    h: 'an hour',
    hh: '%d hours',
    d: 'a day',
    dd: '%d days',
    M: 'a month',
    MM: '%d months',
    y: 'a year',
    yy: '%d years'
  }
}

export default locale
```

## Locale 管理

```typescript
// src/locale/index.ts
import enLocale from './en'

const locales: Record<string, Locale> = {
  en: enLocale
}

let globalLocale = 'en'

export function getLocale(name?: string): Locale {
  return locales[name || globalLocale] || locales.en
}

export function setGlobalLocale(name: string): void {
  if (locales[name]) {
    globalLocale = name
  }
}

export function registerLocale(locale: Locale): void {
  locales[locale.name] = locale
}

export function getGlobalLocaleName(): string {
  return globalLocale
}
```

## 集成到 Dayjs

```typescript
// src/dayjs.ts
import { getLocale, setGlobalLocale, registerLocale } from './locale'

class Dayjs {
  private $L: string  // 当前实例的 locale
  
  constructor(date?: DateInput, locale?: string) {
    this.$d = this.parse(date)
    this.$L = locale || getGlobalLocaleName()
  }
  
  // 获取当前 locale
  locale(): string
  // 设置 locale 并返回新实例
  locale(name: string): Dayjs
  locale(name?: string): string | Dayjs {
    if (name === undefined) {
      return this.$L
    }
    const ins = this.clone()
    ins.$L = name
    return ins
  }
  
  // 获取 locale 对象
  localeData(): Locale {
    return getLocale(this.$L)
  }
}

// 静态方法
dayjs.locale = function(name?: string, locale?: Locale): string {
  if (locale) {
    registerLocale(locale)
  }
  if (name) {
    setGlobalLocale(name)
  }
  return getGlobalLocaleName()
}
```

## 格式化中使用 Locale

```typescript
class Dayjs {
  format(formatStr?: string): string {
    const locale = this.localeData()
    const str = formatStr || locale.formats.L
    
    // 替换本地化格式标记
    const localizedStr = str
      .replace(/\bLLLL\b/g, locale.formats.LLLL)
      .replace(/\bLLL\b/g, locale.formats.LLL)
      .replace(/\bLL\b/g, locale.formats.LL)
      .replace(/\bLTS\b/g, locale.formats.LTS)
      .replace(/\bLT\b/g, locale.formats.LT)
      .replace(/\bL\b/g, locale.formats.L)
    
    // 替换标准标记
    return localizedStr
      .replace(/MMMM/g, locale.months[this.month()])
      .replace(/MMM/g, locale.monthsShort[this.month()])
      .replace(/dddd/g, locale.weekdays[this.day()])
      .replace(/ddd/g, locale.weekdaysShort[this.day()])
      .replace(/dd/g, locale.weekdaysMin[this.day()])
      .replace(/Do/g, locale.ordinal(this.date()))
      // ...其他标记
  }
}
```

## 使用示例

```javascript
import dayjs from 'dayjs'
import zhCn from 'dayjs/locale/zh-cn'

// 方式1：全局设置
dayjs.locale('zh-cn')
dayjs().format('LL')  // "2024年6月15日"

// 方式2：单次使用
dayjs().locale('zh-cn').format('LL')  // "2024年6月15日"

// 方式3：注册并使用
dayjs.locale('zh-cn', zhCn)
dayjs().format('LLLL')  // "2024年6月15日星期六 下午2:30"
```

## 测试用例

```typescript
describe('Locale System', () => {
  describe('全局 locale', () => {
    afterEach(() => {
      dayjs.locale('en')
    })

    it('默认使用英文', () => {
      expect(dayjs().locale()).toBe('en')
    })

    it('设置全局 locale', () => {
      dayjs.locale('zh-cn')
      expect(dayjs().locale()).toBe('zh-cn')
    })
  })

  describe('实例 locale', () => {
    it('单次指定 locale', () => {
      const d = dayjs().locale('zh-cn')
      expect(d.locale()).toBe('zh-cn')
    })

    it('不影响其他实例', () => {
      dayjs().locale('zh-cn')
      expect(dayjs().locale()).toBe('en')  // 新实例仍是英文
    })
  })

  describe('格式化', () => {
    it('英文月份', () => {
      expect(dayjs('2024-06-15').format('MMMM')).toBe('June')
    })

    it('英文星期', () => {
      expect(dayjs('2024-06-15').format('dddd')).toBe('Saturday')
    })

    it('本地化日期格式', () => {
      expect(dayjs('2024-06-15').format('L')).toBe('06/15/2024')
    })
  })
})
```

## 设计要点

**按需加载**：
Locale 文件单独打包，用户只需导入需要的语言。

**不可变性**：
`.locale()` 返回新实例，不修改原对象。

**默认值**：
英文 locale 内置，确保始终可用。

**灵活注册**：
支持运行时注册自定义 locale。

## 小结

本章设计了国际化系统：

- **Locale 接口**：定义语言包的标准格式
- **Locale 管理**：注册、获取、设置全局 locale
- **实例 locale**：支持单个实例使用不同 locale
- **格式化集成**：月份、星期、本地化格式

下一章我们将创建中文 locale。
