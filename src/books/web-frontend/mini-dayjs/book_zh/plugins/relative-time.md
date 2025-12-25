# RelativeTime 插件

`relativeTime` 插件提供人性化的相对时间表达，如"3分钟前"、"2天后"。

## API 设计

```javascript
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(relativeTime)

dayjs().from(dayjs('2024-01-01'))     // 'in 5 months'
dayjs().fromNow()                      // '3 minutes ago'
dayjs().to(dayjs('2024-12-31'))       // 'in 6 months'
dayjs().toNow()                        // '3 minutes ago'
```

## 阈值配置

相对时间根据时间差选择合适的单位：

```typescript
const thresholds = [
  { limit: 45, unit: 'second', text: 'seconds' },
  { limit: 90, unit: 'minute', text: 'a minute' },
  { limit: 45 * 60, unit: 'minute', text: 'minutes' },
  { limit: 90 * 60, unit: 'hour', text: 'an hour' },
  { limit: 22 * 60 * 60, unit: 'hour', text: 'hours' },
  { limit: 36 * 60 * 60, unit: 'day', text: 'a day' },
  { limit: 26 * 24 * 60 * 60, unit: 'day', text: 'days' },
  { limit: 45 * 24 * 60 * 60, unit: 'month', text: 'a month' },
  { limit: 320 * 24 * 60 * 60, unit: 'month', text: 'months' },
  { limit: 548 * 24 * 60 * 60, unit: 'year', text: 'a year' },
  { limit: Infinity, unit: 'year', text: 'years' },
]
```

## 核心实现

```typescript
// src/plugins/relativeTime.ts
interface RelativeTimeOptions {
  rounding?: (n: number) => number
  thresholds?: Array<{
    limit: number
    unit: string
    text: string
  }>
}

export default function(
  option: RelativeTimeOptions = {},
  DayjsClass: typeof Dayjs,
  dayjs: typeof dayjsFactory
) {
  const rounding = option.rounding || Math.round
  
  // 获取相对时间文本
  function getRelativeTime(diff: number, withoutSuffix: boolean): string {
    const absSeconds = Math.abs(diff)
    const isFuture = diff > 0
    
    // 查找合适的阈值
    const threshold = findThreshold(absSeconds)
    const value = calculateValue(absSeconds, threshold.unit)
    const text = formatText(threshold, value)
    
    if (withoutSuffix) {
      return text
    }
    
    return isFuture ? `in ${text}` : `${text} ago`
  }
  
  function findThreshold(seconds: number) {
    for (const t of thresholds) {
      if (seconds < t.limit) {
        return t
      }
    }
    return thresholds[thresholds.length - 1]
  }
  
  function calculateValue(seconds: number, unit: string): number {
    const dividers: Record<string, number> = {
      second: 1,
      minute: 60,
      hour: 3600,
      day: 86400,
      month: 2592000,  // 30 天
      year: 31536000   // 365 天
    }
    return rounding(seconds / (dividers[unit] || 1))
  }
  
  function formatText(threshold: { text: string }, value: number): string {
    if (threshold.text.startsWith('a ')) {
      return threshold.text
    }
    return `${value} ${threshold.text}`
  }
  
  // 扩展实例方法
  DayjsClass.prototype.from = function(
    compared: DateInput,
    withoutSuffix = false
  ): string {
    const diffSeconds = this.diff(dayjs(compared), 'second')
    return getRelativeTime(diffSeconds, withoutSuffix)
  }
  
  DayjsClass.prototype.fromNow = function(withoutSuffix = false): string {
    return this.from(dayjs(), withoutSuffix)
  }
  
  DayjsClass.prototype.to = function(
    compared: DateInput,
    withoutSuffix = false
  ): string {
    const diffSeconds = dayjs(compared).diff(this, 'second')
    return getRelativeTime(diffSeconds, withoutSuffix)
  }
  
  DayjsClass.prototype.toNow = function(withoutSuffix = false): string {
    return this.to(dayjs(), withoutSuffix)
  }
}
```

## 本地化支持

```typescript
// 中文本地化
const zhCN = {
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
}

function getRelativeTimeWithLocale(
  diff: number, 
  withoutSuffix: boolean,
  locale: typeof zhCN
): string {
  const absSeconds = Math.abs(diff)
  const isFuture = diff > 0
  
  let key: string
  let value: number
  
  if (absSeconds < 45) {
    key = 's'
    value = absSeconds
  } else if (absSeconds < 90) {
    key = 'm'
    value = 1
  } else if (absSeconds < 45 * 60) {
    key = 'mm'
    value = Math.round(absSeconds / 60)
  } else if (absSeconds < 90 * 60) {
    key = 'h'
    value = 1
  } else if (absSeconds < 22 * 60 * 60) {
    key = 'hh'
    value = Math.round(absSeconds / 3600)
  } else if (absSeconds < 36 * 60 * 60) {
    key = 'd'
    value = 1
  } else if (absSeconds < 26 * 24 * 60 * 60) {
    key = 'dd'
    value = Math.round(absSeconds / 86400)
  } else if (absSeconds < 45 * 24 * 60 * 60) {
    key = 'M'
    value = 1
  } else if (absSeconds < 320 * 24 * 60 * 60) {
    key = 'MM'
    value = Math.round(absSeconds / 2592000)
  } else if (absSeconds < 548 * 24 * 60 * 60) {
    key = 'y'
    value = 1
  } else {
    key = 'yy'
    value = Math.round(absSeconds / 31536000)
  }
  
  const text = locale[key].replace('%d', String(value))
  
  if (withoutSuffix) {
    return text
  }
  
  const template = isFuture ? locale.future : locale.past
  return template.replace('%s', text)
}
```

## 使用场景

### 社交媒体时间线

```javascript
function formatPostTime(createdAt) {
  const postDate = dayjs(createdAt)
  const now = dayjs()
  const diffDays = now.diff(postDate, 'day')
  
  // 7天内显示相对时间
  if (diffDays < 7) {
    return postDate.fromNow()
  }
  
  // 今年内显示月日
  if (postDate.year() === now.year()) {
    return postDate.format('M月D日')
  }
  
  // 更早显示完整日期
  return postDate.format('YYYY年M月D日')
}
```

### 倒计时

```javascript
function getCountdown(targetDate) {
  const target = dayjs(targetDate)
  const now = dayjs()
  
  if (target.isBefore(now)) {
    return '已结束'
  }
  
  return target.fromNow(true) + '后开始'
}
```

### 消息时间

```javascript
function formatMessageTime(timestamp) {
  const msgDate = dayjs(timestamp)
  const now = dayjs()
  
  // 1分钟内
  if (now.diff(msgDate, 'minute') < 1) {
    return '刚刚'
  }
  
  // 1小时内
  if (now.diff(msgDate, 'hour') < 1) {
    return msgDate.fromNow()
  }
  
  // 今天
  if (msgDate.isSame(now, 'day')) {
    return msgDate.format('HH:mm')
  }
  
  // 昨天
  if (msgDate.isSame(now.subtract(1, 'day'), 'day')) {
    return '昨天 ' + msgDate.format('HH:mm')
  }
  
  // 本周
  if (now.diff(msgDate, 'day') < 7) {
    const days = ['日', '一', '二', '三', '四', '五', '六']
    return '周' + days[msgDate.day()] + ' ' + msgDate.format('HH:mm')
  }
  
  // 更早
  return msgDate.format('YYYY/MM/DD HH:mm')
}
```

## 测试用例

```typescript
describe('relativeTime', () => {
  const now = dayjs('2024-06-15 12:00:00')
  
  beforeAll(() => {
    jest.useFakeTimers()
    jest.setSystemTime(now.toDate())
  })

  describe('fromNow', () => {
    it('几秒前', () => {
      const past = now.subtract(30, 'second')
      expect(past.fromNow()).toBe('a few seconds ago')
    })

    it('几分钟前', () => {
      const past = now.subtract(5, 'minute')
      expect(past.fromNow()).toBe('5 minutes ago')
    })

    it('几小时前', () => {
      const past = now.subtract(3, 'hour')
      expect(past.fromNow()).toBe('3 hours ago')
    })

    it('几天前', () => {
      const past = now.subtract(5, 'day')
      expect(past.fromNow()).toBe('5 days ago')
    })

    it('未来时间', () => {
      const future = now.add(2, 'hour')
      expect(future.fromNow()).toBe('in 2 hours')
    })
  })

  describe('from', () => {
    it('与指定日期比较', () => {
      const date1 = dayjs('2024-06-10')
      const date2 = dayjs('2024-06-15')
      expect(date1.from(date2)).toBe('5 days ago')
    })
  })

  describe('withoutSuffix', () => {
    it('不带后缀', () => {
      const past = now.subtract(5, 'minute')
      expect(past.fromNow(true)).toBe('5 minutes')
    })
  })
})
```

## 小结

本章实现了 `relativeTime` 插件：

- **核心方法**：`from`、`fromNow`、`to`、`toNow`
- **阈值配置**：根据时间差选择合适单位
- **本地化**：支持不同语言的相对时间文本
- **实用场景**：社交时间线、倒计时、消息时间

这是用户界面中最常用的日期显示方式。
