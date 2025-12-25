# Timezone 插件

时区处理是日期库中最复杂的部分。`timezone` 插件让 Day.js 能够处理不同时区的日期时间。

## 为什么需要时区？

```javascript
// 同一时刻，不同时区显示不同时间
const timestamp = 1718438400000  // 2024-06-15 12:00:00 UTC

// 北京时间 (UTC+8)
new Date(timestamp).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
// "2024/6/15 20:00:00"

// 纽约时间 (UTC-4，夏令时）
new Date(timestamp).toLocaleString('en-US', { timeZone: 'America/New_York' })
// "6/15/2024, 8:00:00 AM"
```

## API 设计

```javascript
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

// 设置时区
dayjs().tz('Asia/Shanghai')
dayjs().tz('America/New_York')

// 在指定时区解析
dayjs.tz('2024-06-15 12:00', 'Asia/Shanghai')

// 设置默认时区
dayjs.tz.setDefault('Asia/Shanghai')

// 获取时区
dayjs().tz().format()
```

## 依赖 UTC 插件

时区插件依赖 UTC 插件：

```typescript
// src/plugins/utc.ts
export default function(option, DayjsClass, dayjs) {
  // UTC 模式标记
  DayjsClass.prototype.$u = false
  
  // 转为 UTC 模式
  DayjsClass.prototype.utc = function(keepLocalTime?: boolean) {
    const ins = this.clone()
    ins.$u = true
    if (keepLocalTime) {
      // 保持本地时间数值
      ins.$d = new Date(
        Date.UTC(
          this.year(),
          this.month(),
          this.date(),
          this.hour(),
          this.minute(),
          this.second(),
          this.millisecond()
        )
      )
    }
    return ins
  }
  
  // 转为本地模式
  DayjsClass.prototype.local = function() {
    const ins = this.clone()
    ins.$u = false
    return ins
  }
  
  // 是否为 UTC 模式
  DayjsClass.prototype.isUTC = function() {
    return this.$u
  }
  
  // 获取 UTC 偏移（分钟）
  DayjsClass.prototype.utcOffset = function(offset?: number, keepLocalTime?: boolean) {
    if (offset === undefined) {
      return this.$u ? 0 : -this.$d.getTimezoneOffset()
    }
    // 设置偏移...
  }
  
  // 静态方法
  dayjs.utc = function(date?: DateInput) {
    const d = dayjs(date)
    d.$u = true
    return d
  }
}
```

## Timezone 实现

```typescript
// src/plugins/timezone.ts
let defaultTimezone: string | undefined

export default function(option, DayjsClass, dayjs) {
  // 检查依赖
  if (!DayjsClass.prototype.$u) {
    console.warn('timezone plugin requires utc plugin')
    return
  }
  
  // 实例方法：转换到指定时区
  DayjsClass.prototype.tz = function(
    timezone?: string,
    keepLocalTime?: boolean
  ) {
    const tz = timezone || defaultTimezone
    if (!tz) return this
    
    const targetOffset = getTimezoneOffset(tz, this.$d)
    
    if (keepLocalTime) {
      // 保持时间显示不变，改变时区
      const localOffset = -this.$d.getTimezoneOffset()
      const diff = targetOffset - localOffset
      return this.utcOffset(targetOffset, true)
    }
    
    // 转换时间到目标时区
    const utcTime = this.valueOf() + this.$d.getTimezoneOffset() * 60000
    const targetTime = utcTime + targetOffset * 60000
    
    const result = dayjs(targetTime)
    result.$x = result.$x || {}
    result.$x.$timezone = tz
    result.$u = false
    
    return result
  }
  
  // 静态方法：在指定时区解析
  dayjs.tz = function(input: DateInput, timezone?: string) {
    const tz = timezone || defaultTimezone
    if (!tz) return dayjs(input)
    
    // 假设输入是目标时区的本地时间
    const localDate = dayjs(input)
    const offset = getTimezoneOffset(tz, localDate.$d)
    
    // 转换为 UTC
    const utcTime = localDate.valueOf() - offset * 60000
    
    const result = dayjs(utcTime)
    result.$x = result.$x || {}
    result.$x.$timezone = tz
    
    return result.tz(tz)
  }
  
  // 设置默认时区
  dayjs.tz.setDefault = function(timezone?: string) {
    defaultTimezone = timezone
  }
  
  // 获取默认时区
  dayjs.tz.guess = function(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  }
}

// 获取时区偏移（分钟）
function getTimezoneOffset(timezone: string, date: Date): number {
  // 使用 Intl API 获取偏移
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'longOffset'
  })
  
  const parts = formatter.formatToParts(date)
  const tzPart = parts.find(p => p.type === 'timeZoneName')
  
  if (!tzPart) return 0
  
  // 解析偏移字符串，如 "GMT+08:00"
  const match = tzPart.value.match(/GMT([+-])(\d{2}):(\d{2})/)
  if (!match) return 0
  
  const sign = match[1] === '+' ? 1 : -1
  const hours = parseInt(match[2])
  const minutes = parseInt(match[3])
  
  return sign * (hours * 60 + minutes)
}
```

## 使用场景

### 全球会议时间

```javascript
function showMeetingTime(utcTime, timezones) {
  const meeting = dayjs(utcTime)
  
  return timezones.map(tz => ({
    timezone: tz,
    time: meeting.tz(tz).format('YYYY-MM-DD HH:mm'),
    offset: meeting.tz(tz).format('Z')
  }))
}

showMeetingTime('2024-06-15T08:00:00Z', [
  'Asia/Shanghai',
  'America/New_York',
  'Europe/London'
])
// [
//   { timezone: 'Asia/Shanghai', time: '2024-06-15 16:00', offset: '+08:00' },
//   { timezone: 'America/New_York', time: '2024-06-15 04:00', offset: '-04:00' },
//   { timezone: 'Europe/London', time: '2024-06-15 09:00', offset: '+01:00' }
// ]
```

### 用户本地时间存储

```javascript
// 存储：用户在上海输入的时间
function saveEvent(localTimeStr, userTimezone) {
  // 解析为用户时区的时间
  const eventTime = dayjs.tz(localTimeStr, userTimezone)
  
  // 存储为 UTC
  return {
    utcTime: eventTime.utc().toISOString(),
    timezone: userTimezone
  }
}

// 显示：在任意时区显示
function displayEvent(event, viewerTimezone) {
  const utcTime = dayjs(event.utcTime)
  return utcTime.tz(viewerTimezone).format('YYYY-MM-DD HH:mm')
}
```

### 跨时区日程

```javascript
function convertSchedule(schedule, fromTz, toTz) {
  return schedule.map(item => ({
    ...item,
    startTime: dayjs.tz(item.startTime, fromTz).tz(toTz).format(),
    endTime: dayjs.tz(item.endTime, fromTz).tz(toTz).format()
  }))
}
```

## 时区数据

完整的时区支持需要时区数据库（IANA Time Zone Database）。Day.js 官方使用 `dayjs-plugin-timezone-data` 提供数据。

简化版实现使用浏览器的 `Intl` API：

```typescript
function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone })
    return true
  } catch (e) {
    return false
  }
}
```

## 夏令时处理

夏令时（DST）让时区偏移在一年中变化：

```javascript
// 纽约冬季 UTC-5，夏季 UTC-4
dayjs.tz('2024-01-15 12:00', 'America/New_York').format('Z')  // -05:00
dayjs.tz('2024-07-15 12:00', 'America/New_York').format('Z')  // -04:00
```

我们的实现通过 `Intl.DateTimeFormat` 自动处理 DST。

## 测试用例

```typescript
describe('timezone', () => {
  beforeAll(() => {
    dayjs.extend(utc)
    dayjs.extend(timezone)
  })

  describe('tz 方法', () => {
    it('转换到指定时区', () => {
      const utcNoon = dayjs.utc('2024-06-15 12:00')
      const shanghai = utcNoon.tz('Asia/Shanghai')
      
      expect(shanghai.hour()).toBe(20)  // UTC+8
    })

    it('支持多种时区', () => {
      const utcTime = dayjs.utc('2024-06-15 12:00')
      
      expect(utcTime.tz('Asia/Tokyo').hour()).toBe(21)     // UTC+9
      expect(utcTime.tz('Europe/London').hour()).toBe(13)  // UTC+1 (BST)
    })
  })

  describe('dayjs.tz 解析', () => {
    it('在指定时区解析时间', () => {
      const shanghaiNoon = dayjs.tz('2024-06-15 12:00', 'Asia/Shanghai')
      
      expect(shanghaiNoon.utc().hour()).toBe(4)  // 12 - 8 = 4
    })
  })

  describe('默认时区', () => {
    afterEach(() => {
      dayjs.tz.setDefault(undefined)
    })

    it('设置默认时区', () => {
      dayjs.tz.setDefault('Asia/Shanghai')
      
      const d = dayjs().tz()
      expect(d.$x.$timezone).toBe('Asia/Shanghai')
    })
  })

  describe('时区猜测', () => {
    it('返回系统时区', () => {
      const tz = dayjs.tz.guess()
      expect(typeof tz).toBe('string')
    })
  })
})
```

## 小结

本章实现了 `timezone` 插件：

- **依赖 UTC**：必须先安装 UTC 插件
- **时区转换**：`tz()` 方法转换时区
- **时区解析**：`dayjs.tz()` 在指定时区解析
- **默认时区**：`setDefault()` 设置全局默认时区
- **自动 DST**：通过 Intl API 自动处理夏令时

时区处理是国际化应用的必备功能。
