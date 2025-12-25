# Duration 插件

`duration` 插件处理时间段，如"2小时30分钟"、"1年零3个月"。与日期不同，Duration 表示的是时间长度。

## 概念区分

```javascript
// Date：时间点
dayjs('2024-06-15')  // 2024年6月15日

// Duration：时间段
dayjs.duration(90, 'minutes')  // 90分钟的时间段
```

## API 设计

```javascript
import duration from 'dayjs/plugin/duration'
dayjs.extend(duration)

// 创建 Duration
dayjs.duration(100)                    // 100 毫秒
dayjs.duration(2, 'hours')             // 2 小时
dayjs.duration({ hours: 2, minutes: 30 })  // 2小时30分钟
dayjs.duration('P1Y2M3DT4H5M6S')       // ISO 8601 格式

// 获取值
duration.years()       // 年份部分
duration.months()      // 月份部分
duration.days()        // 天数部分
duration.hours()       // 小时部分
duration.minutes()     // 分钟部分
duration.seconds()     // 秒数部分
duration.milliseconds() // 毫秒部分

// 转换
duration.asSeconds()   // 转换为总秒数
duration.asMinutes()   // 转换为总分钟数
duration.asHours()     // 转换为总小时数
duration.asDays()      // 转换为总天数

// 运算
duration.add(1, 'hour')
duration.subtract(30, 'minutes')

// 格式化
duration.humanize()    // '2 hours'
duration.format('HH:mm:ss')  // '02:30:00'
```

## Duration 类设计

```typescript
// src/plugins/duration.ts
class Duration {
  private $ms: number  // 内部用毫秒存储
  
  constructor(input: number | object | string, unit?: string) {
    this.$ms = this.parse(input, unit)
  }
  
  private parse(input: number | object | string, unit?: string): number {
    if (typeof input === 'number') {
      return this.fromNumber(input, unit)
    }
    if (typeof input === 'object') {
      return this.fromObject(input)
    }
    if (typeof input === 'string') {
      return this.fromISO(input)
    }
    return 0
  }
  
  private fromNumber(value: number, unit: string = 'milliseconds'): number {
    const conversions: Record<string, number> = {
      milliseconds: 1,
      seconds: 1000,
      minutes: 60 * 1000,
      hours: 60 * 60 * 1000,
      days: 24 * 60 * 60 * 1000,
      weeks: 7 * 24 * 60 * 60 * 1000,
      months: 30 * 24 * 60 * 60 * 1000,  // 近似值
      years: 365 * 24 * 60 * 60 * 1000   // 近似值
    }
    return value * (conversions[unit] || conversions[unit + 's'] || 1)
  }
  
  private fromObject(obj: Record<string, number>): number {
    let ms = 0
    for (const [unit, value] of Object.entries(obj)) {
      ms += this.fromNumber(value, unit)
    }
    return ms
  }
  
  private fromISO(str: string): number {
    // P1Y2M3DT4H5M6S
    const regex = /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/
    const match = str.match(regex)
    
    if (!match) return 0
    
    const [, years, months, days, hours, minutes, seconds] = match
    
    return this.fromObject({
      years: parseInt(years) || 0,
      months: parseInt(months) || 0,
      days: parseInt(days) || 0,
      hours: parseInt(hours) || 0,
      minutes: parseInt(minutes) || 0,
      seconds: parseInt(seconds) || 0
    })
  }
}
```

## Getter 方法

```typescript
class Duration {
  // 获取各个单位的部分值
  years(): number {
    return Math.floor(this.$ms / (365 * 24 * 60 * 60 * 1000))
  }
  
  months(): number {
    return Math.floor(
      (this.$ms % (365 * 24 * 60 * 60 * 1000)) / (30 * 24 * 60 * 60 * 1000)
    )
  }
  
  days(): number {
    return Math.floor(
      (this.$ms % (30 * 24 * 60 * 60 * 1000)) / (24 * 60 * 60 * 1000)
    )
  }
  
  hours(): number {
    return Math.floor(
      (this.$ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000)
    )
  }
  
  minutes(): number {
    return Math.floor(
      (this.$ms % (60 * 60 * 1000)) / (60 * 1000)
    )
  }
  
  seconds(): number {
    return Math.floor(
      (this.$ms % (60 * 1000)) / 1000
    )
  }
  
  milliseconds(): number {
    return this.$ms % 1000
  }
}
```

## as* 方法

```typescript
class Duration {
  // 转换为指定单位的总数
  asMilliseconds(): number {
    return this.$ms
  }
  
  asSeconds(): number {
    return this.$ms / 1000
  }
  
  asMinutes(): number {
    return this.$ms / (60 * 1000)
  }
  
  asHours(): number {
    return this.$ms / (60 * 60 * 1000)
  }
  
  asDays(): number {
    return this.$ms / (24 * 60 * 60 * 1000)
  }
  
  asWeeks(): number {
    return this.$ms / (7 * 24 * 60 * 60 * 1000)
  }
  
  asMonths(): number {
    return this.$ms / (30 * 24 * 60 * 60 * 1000)
  }
  
  asYears(): number {
    return this.$ms / (365 * 24 * 60 * 60 * 1000)
  }
}
```

## 运算方法

```typescript
class Duration {
  add(input: number | Duration, unit?: string): Duration {
    if (input instanceof Duration) {
      return new Duration(this.$ms + input.$ms)
    }
    const ms = new Duration(input, unit).$ms
    return new Duration(this.$ms + ms)
  }
  
  subtract(input: number | Duration, unit?: string): Duration {
    if (input instanceof Duration) {
      return new Duration(this.$ms - input.$ms)
    }
    const ms = new Duration(input, unit).$ms
    return new Duration(this.$ms - ms)
  }
  
  // 克隆
  clone(): Duration {
    return new Duration(this.$ms)
  }
}
```

## 格式化

```typescript
class Duration {
  format(formatStr: string = 'HH:mm:ss'): string {
    const hours = Math.floor(this.$ms / 3600000)
    const minutes = Math.floor((this.$ms % 3600000) / 60000)
    const seconds = Math.floor((this.$ms % 60000) / 1000)
    
    return formatStr
      .replace('HH', String(hours).padStart(2, '0'))
      .replace('H', String(hours))
      .replace('mm', String(minutes).padStart(2, '0'))
      .replace('m', String(minutes))
      .replace('ss', String(seconds).padStart(2, '0'))
      .replace('s', String(seconds))
  }
  
  humanize(withSuffix = false): string {
    const seconds = Math.abs(this.$ms / 1000)
    
    let text: string
    if (seconds < 60) {
      text = 'a few seconds'
    } else if (seconds < 3600) {
      const mins = Math.round(seconds / 60)
      text = mins === 1 ? 'a minute' : `${mins} minutes`
    } else if (seconds < 86400) {
      const hours = Math.round(seconds / 3600)
      text = hours === 1 ? 'an hour' : `${hours} hours`
    } else {
      const days = Math.round(seconds / 86400)
      text = days === 1 ? 'a day' : `${days} days`
    }
    
    if (withSuffix) {
      return this.$ms >= 0 ? `in ${text}` : `${text} ago`
    }
    
    return text
  }
  
  toISOString(): string {
    const h = this.hours()
    const m = this.minutes()
    const s = this.seconds()
    const d = this.days()
    
    let result = 'P'
    if (d) result += `${d}D`
    if (h || m || s) {
      result += 'T'
      if (h) result += `${h}H`
      if (m) result += `${m}M`
      if (s) result += `${s}S`
    }
    
    return result || 'PT0S'
  }
}
```

## 插件注册

```typescript
export default function(
  option: unknown,
  DayjsClass: typeof Dayjs,
  dayjs: typeof dayjsFactory
) {
  // 添加静态方法
  dayjs.duration = function(
    input: number | object | string,
    unit?: string
  ): Duration {
    return new Duration(input, unit)
  }
  
  // 判断是否为 Duration
  dayjs.isDuration = function(obj: unknown): obj is Duration {
    return obj instanceof Duration
  }
}
```

## 使用场景

### 视频时长

```javascript
function formatVideoDuration(seconds) {
  const d = dayjs.duration(seconds, 'seconds')
  
  if (d.asHours() >= 1) {
    return d.format('H:mm:ss')
  }
  return d.format('m:ss')
}

formatVideoDuration(3725)  // "1:02:05"
formatVideoDuration(185)   // "3:05"
```

### 倒计时

```javascript
function getCountdown(targetDate) {
  const now = dayjs()
  const target = dayjs(targetDate)
  const diff = target.diff(now)
  
  if (diff <= 0) {
    return '已结束'
  }
  
  const d = dayjs.duration(diff)
  
  if (d.asDays() >= 1) {
    return `${d.days()}天${d.hours()}小时${d.minutes()}分钟`
  }
  if (d.asHours() >= 1) {
    return `${d.hours()}小时${d.minutes()}分钟${d.seconds()}秒`
  }
  return `${d.minutes()}分${d.seconds()}秒`
}
```

### 任务耗时

```javascript
function calculateTaskDuration(startTime, endTime) {
  const duration = dayjs.duration(
    dayjs(endTime).diff(dayjs(startTime))
  )
  
  return {
    human: duration.humanize(),
    formatted: duration.format('HH:mm:ss'),
    totalMinutes: Math.round(duration.asMinutes())
  }
}
```

## 测试用例

```typescript
describe('Duration', () => {
  describe('创建', () => {
    it('从毫秒创建', () => {
      const d = dayjs.duration(1000)
      expect(d.asSeconds()).toBe(1)
    })

    it('从数值和单位创建', () => {
      const d = dayjs.duration(2, 'hours')
      expect(d.asMinutes()).toBe(120)
    })

    it('从对象创建', () => {
      const d = dayjs.duration({ hours: 2, minutes: 30 })
      expect(d.asMinutes()).toBe(150)
    })

    it('从 ISO 字符串创建', () => {
      const d = dayjs.duration('PT2H30M')
      expect(d.asMinutes()).toBe(150)
    })
  })

  describe('getter', () => {
    const d = dayjs.duration({ hours: 25, minutes: 30 })

    it('hours 返回小时部分', () => {
      expect(d.hours()).toBe(1)  // 25小时 = 1天1小时
    })

    it('days 返回天数部分', () => {
      expect(d.days()).toBe(1)
    })
  })

  describe('as* 方法', () => {
    const d = dayjs.duration(90, 'minutes')

    it('asMinutes', () => {
      expect(d.asMinutes()).toBe(90)
    })

    it('asHours', () => {
      expect(d.asHours()).toBe(1.5)
    })
  })

  describe('运算', () => {
    it('add', () => {
      const d = dayjs.duration(1, 'hour')
        .add(30, 'minutes')
      expect(d.asMinutes()).toBe(90)
    })

    it('subtract', () => {
      const d = dayjs.duration(2, 'hours')
        .subtract(30, 'minutes')
      expect(d.asMinutes()).toBe(90)
    })
  })

  describe('格式化', () => {
    it('format', () => {
      const d = dayjs.duration({ hours: 2, minutes: 5, seconds: 30 })
      expect(d.format('HH:mm:ss')).toBe('02:05:30')
    })

    it('humanize', () => {
      const d = dayjs.duration(2, 'hours')
      expect(d.humanize()).toBe('2 hours')
    })
  })
})
```

## 小结

本章实现了 `duration` 插件：

- **Duration 类**：独立于 Dayjs，专门处理时间段
- **创建方式**：数值、对象、ISO 字符串
- **获取方法**：`years()`、`months()` 等获取各部分
- **转换方法**：`asHours()`、`asMinutes()` 等获取总量
- **格式化**：`format()` 和 `humanize()`

Duration 和 Dayjs 配合使用，覆盖了日期时间处理的完整场景。
