# 中文本地化

本章实现完整的中文（简体）本地化配置。

## 中文 Locale

```typescript
// src/locale/zh-cn.ts
import { Locale } from './types'

const locale: Locale = {
  name: 'zh-cn',
  weekdays: ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'],
  weekdaysShort: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
  weekdaysMin: ['日', '一', '二', '三', '四', '五', '六'],
  months: [
    '一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月'
  ],
  monthsShort: [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月'
  ],
  ordinal: (n: number) => `${n}日`,
  weekStart: 1,  // 中国习惯周一为一周开始
  formats: {
    LT: 'HH:mm',
    LTS: 'HH:mm:ss',
    L: 'YYYY/MM/DD',
    LL: 'YYYY年M月D日',
    LLL: 'YYYY年M月D日Ah点mm分',
    LLLL: 'YYYY年M月D日ddddAh点mm分',
    l: 'YYYY/M/D',
    ll: 'YYYY年M月D日',
    lll: 'YYYY年M月D日 HH:mm',
    llll: 'YYYY年M月D日dddd HH:mm'
  },
  relativeTime: {
    future: '%s后',
    past: '%s前',
    s: '几秒',
    m: '1 分钟',
    mm: '%d 分钟',
    h: '1 小时',
    hh: '%d 小时',
    d: '1 天',
    dd: '%d 天',
    M: '1 个月',
    MM: '%d 个月',
    y: '1 年',
    yy: '%d 年'
  },
  meridiem: (hour: number): string => {
    if (hour < 6) return '凌晨'
    if (hour < 9) return '早上'
    if (hour < 12) return '上午'
    if (hour === 12) return '中午'
    if (hour < 18) return '下午'
    return '晚上'
  }
}

export default locale
```

## 时间段称呼

中文对一天的时间段有更细致的划分：

```typescript
function getMeridiem(hour: number): string {
  if (hour < 6) return '凌晨'   // 0:00 - 5:59
  if (hour < 9) return '早上'   // 6:00 - 8:59
  if (hour < 12) return '上午'  // 9:00 - 11:59
  if (hour === 12) return '中午' // 12:00 - 12:59
  if (hour < 18) return '下午'  // 13:00 - 17:59
  return '晚上'                 // 18:00 - 23:59
}
```

## 集成 Meridiem

在格式化中支持 `A` 标记使用 locale 的 meridiem：

```typescript
class Dayjs {
  format(formatStr?: string): string {
    const locale = this.localeData()
    
    // ...其他替换
    
    // 时间段
    let result = str.replace(/A/g, () => {
      if (locale.meridiem) {
        return locale.meridiem(this.hour())
      }
      return this.hour() < 12 ? 'AM' : 'PM'
    })
    
    return result
  }
}
```

## 使用示例

```javascript
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'

dayjs.locale('zh-cn')

const d = dayjs('2024-06-15 14:30')

// 日期格式
d.format('L')     // "2024/06/15"
d.format('LL')    // "2024年6月15日"
d.format('LLLL')  // "2024年6月15日星期六下午2点30分"

// 星期
d.format('dddd')  // "星期六"
d.format('ddd')   // "周六"
d.format('dd')    // "六"

// 月份
d.format('MMMM')  // "六月"
d.format('MMM')   // "6月"

// 时间段
d.format('A')     // "下午"

// 相对时间
d.fromNow()       // "5 分钟前"
```

## 周起始日

中国习惯周一为一周的开始：

```typescript
class Dayjs {
  // 获取本周的开始
  startOfWeek(): Dayjs {
    const locale = this.localeData()
    const weekStart = locale.weekStart || 0
    
    let day = this.day()
    let diff = day - weekStart
    if (diff < 0) diff += 7
    
    return this.subtract(diff, 'day').startOf('day')
  }
  
  // 获取一周中的第几天（考虑 weekStart）
  weekday(): number {
    const locale = this.localeData()
    const weekStart = locale.weekStart || 0
    
    return (this.day() - weekStart + 7) % 7
  }
}
```

```javascript
dayjs.locale('en')
dayjs('2024-06-15').startOfWeek().format('YYYY-MM-DD')  // "2024-06-09" (周日)

dayjs.locale('zh-cn')
dayjs('2024-06-15').startOfWeek().format('YYYY-MM-DD')  // "2024-06-10" (周一)
```

## 繁体中文

```typescript
// src/locale/zh-tw.ts
const locale: Locale = {
  name: 'zh-tw',
  weekdays: ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'],
  weekdaysShort: ['週日', '週一', '週二', '週三', '週四', '週五', '週六'],
  weekdaysMin: ['日', '一', '二', '三', '四', '五', '六'],
  months: [
    '一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月'
  ],
  monthsShort: [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月'
  ],
  ordinal: (n: number) => `${n}日`,
  weekStart: 1,
  formats: {
    LT: 'HH:mm',
    LTS: 'HH:mm:ss',
    L: 'YYYY/MM/DD',
    LL: 'YYYY年M月D日',
    LLL: 'YYYY年M月D日 HH:mm',
    LLLL: 'YYYY年M月D日dddd HH:mm'
  },
  relativeTime: {
    future: '%s後',
    past: '%s前',
    s: '幾秒',
    m: '1 分鐘',
    mm: '%d 分鐘',
    h: '1 小時',
    hh: '%d 小時',
    d: '1 天',
    dd: '%d 天',
    M: '1 個月',
    MM: '%d 個月',
    y: '1 年',
    yy: '%d 年'
  }
}

export default locale
```

## 农历扩展

中文场景常需要农历支持，可以通过插件实现：

```javascript
// 示例：农历转换（简化版）
function toLunar(date) {
  // 实际实现需要完整的农历算法
  // 这里只是示意
  return {
    year: '甲辰',
    month: '五月',
    day: '初十',
    animal: '龙'
  }
}

// 插件形式
export default function lunarPlugin(option, DayjsClass) {
  DayjsClass.prototype.lunar = function() {
    return toLunar(this.$d)
  }
}

// 使用
dayjs.extend(lunarPlugin)
dayjs('2024-06-15').lunar()
// { year: '甲辰', month: '五月', day: '初十', animal: '龙' }
```

## 测试用例

```typescript
describe('zh-cn locale', () => {
  beforeAll(() => {
    dayjs.locale('zh-cn')
  })

  describe('日期格式', () => {
    const d = dayjs('2024-06-15')

    it('完整日期', () => {
      expect(d.format('LL')).toBe('2024年6月15日')
    })

    it('短日期', () => {
      expect(d.format('L')).toBe('2024/06/15')
    })
  })

  describe('星期', () => {
    const d = dayjs('2024-06-15')  // 周六

    it('完整名称', () => {
      expect(d.format('dddd')).toBe('星期六')
    })

    it('简写', () => {
      expect(d.format('ddd')).toBe('周六')
    })

    it('最简', () => {
      expect(d.format('dd')).toBe('六')
    })
  })

  describe('时间段', () => {
    it('凌晨', () => {
      expect(dayjs('2024-06-15 03:00').format('A')).toBe('凌晨')
    })

    it('上午', () => {
      expect(dayjs('2024-06-15 10:00').format('A')).toBe('上午')
    })

    it('下午', () => {
      expect(dayjs('2024-06-15 15:00').format('A')).toBe('下午')
    })

    it('晚上', () => {
      expect(dayjs('2024-06-15 20:00').format('A')).toBe('晚上')
    })
  })

  describe('周起始', () => {
    it('周一开始', () => {
      const d = dayjs('2024-06-15')  // 周六
      const start = d.startOfWeek()
      expect(start.format('YYYY-MM-DD')).toBe('2024-06-10')  // 周一
    })
  })

  describe('相对时间', () => {
    it('过去时间', () => {
      const past = dayjs().subtract(5, 'minute')
      expect(past.fromNow()).toBe('5 分钟前')
    })

    it('未来时间', () => {
      const future = dayjs().add(2, 'hour')
      expect(future.fromNow()).toBe('2 小时后')
    })
  })
})
```

## 小结

本章实现了中文本地化：

- **完整配置**：星期、月份、日期格式、相对时间
- **时间段**：凌晨、早上、上午、中午、下午、晚上
- **周起始**：周一为一周开始
- **繁体支持**：zh-tw locale

中文本地化是日期库在国内应用的必备功能。
