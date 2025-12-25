# 时区与 UTC 处理

时区是日期处理中最复杂的部分。本章讲解 Day.js 如何处理时区和 UTC 时间。

## JavaScript 时区基础

原生 Date 对象的时区行为：

```javascript
// 创建本地时间
new Date(2024, 11, 25, 8, 0, 0)  // 本地时间 2024-12-25 08:00

// 创建 UTC 时间
new Date(Date.UTC(2024, 11, 25, 0, 0, 0))  // UTC 时间，本地显示会加时区偏移

// 获取时区偏移（分钟）
new Date().getTimezoneOffset()  // -480（东八区）
```

注意：`getTimezoneOffset()` 返回的是 **UTC 减去本地时间** 的分钟数，东八区返回 -480。

## Day.js 的 UTC 模式

Day.js 提供 UTC 模式，通过插件支持：

```javascript
import utc from 'dayjs/plugin/utc'
dayjs.extend(utc)

// 以 UTC 模式解析
dayjs.utc('2024-12-25')

// 转换为 UTC 模式
dayjs('2024-12-25').utc()

// 从 UTC 转为本地
dayjs.utc('2024-12-25').local()
```

## 实现 UTC 支持

首先扩展 `Dayjs` 类的配置：

```typescript
// src/dayjs.ts
export class Dayjs {
  private $d: Date
  private $u: boolean  // 是否 UTC 模式
  
  // ... 其他字段
  
  constructor(date?: DateInput, options?: { utc?: boolean }) {
    this.$u = options?.utc ?? false
    this.$d = this.parse(date)
    this.init()
  }
  
  private init(): void {
    const d = this.$d
    
    if (this.$u) {
      // UTC 模式使用 getUTC* 方法
      this.$y = d.getUTCFullYear()
      this.$M = d.getUTCMonth()
      this.$D = d.getUTCDate()
      this.$H = d.getUTCHours()
      this.$m = d.getUTCMinutes()
      this.$s = d.getUTCSeconds()
      this.$ms = d.getUTCMilliseconds()
      this.$W = d.getUTCDay()
    } else {
      // 本地模式使用 get* 方法
      this.$y = d.getFullYear()
      this.$M = d.getMonth()
      this.$D = d.getDate()
      this.$H = d.getHours()
      this.$m = d.getMinutes()
      this.$s = d.getSeconds()
      this.$ms = d.getMilliseconds()
      this.$W = d.getDay()
    }
  }
  
  /**
   * 是否 UTC 模式
   */
  isUTC(): boolean {
    return this.$u
  }
}
```

## UTC 插件实现

```typescript
// src/plugins/utc.ts
import { Dayjs, dayjs } from '../index'

declare module '../dayjs' {
  interface Dayjs {
    utc(): Dayjs
    local(): Dayjs
    utcOffset(): number
  }
}

export default function utcPlugin(
  option: unknown,
  DayjsClass: typeof Dayjs,
  dayjsFactory: typeof dayjs
) {
  // 添加静态方法 dayjs.utc()
  dayjsFactory.utc = function(date?: DateInput): Dayjs {
    return new DayjsClass(date, { utc: true })
  }
  
  // 添加实例方法 .utc()
  DayjsClass.prototype.utc = function(): Dayjs {
    return new DayjsClass(this.$d, { utc: true })
  }
  
  // 添加实例方法 .local()
  DayjsClass.prototype.local = function(): Dayjs {
    return new DayjsClass(this.$d, { utc: false })
  }
  
  // 添加实例方法 .utcOffset()
  DayjsClass.prototype.utcOffset = function(): number {
    if (this.$u) {
      return 0
    }
    return -this.$d.getTimezoneOffset()
  }
}
```

## UTC 模式下的操作

在 UTC 模式下，所有操作都基于 UTC 时间：

```typescript
class Dayjs {
  /**
   * 设置值（考虑 UTC 模式）
   */
  set(unit: UnitType, value: number): Dayjs {
    const d = new Date(this.$d.getTime())
    const normalizedUnit = normalizeUnit(unit)
    
    if (this.$u) {
      // UTC 模式使用 setUTC* 方法
      switch (normalizedUnit) {
        case 'year': d.setUTCFullYear(value); break
        case 'month': d.setUTCMonth(value); break
        case 'date': d.setUTCDate(value); break
        case 'hour': d.setUTCHours(value); break
        case 'minute': d.setUTCMinutes(value); break
        case 'second': d.setUTCSeconds(value); break
        case 'millisecond': d.setUTCMilliseconds(value); break
      }
    } else {
      // 本地模式使用 set* 方法
      switch (normalizedUnit) {
        case 'year': d.setFullYear(value); break
        case 'month': d.setMonth(value); break
        case 'date': d.setDate(value); break
        case 'hour': d.setHours(value); break
        case 'minute': d.setMinutes(value); break
        case 'second': d.setSeconds(value); break
        case 'millisecond': d.setMilliseconds(value); break
      }
    }
    
    return new Dayjs(d, { utc: this.$u })
  }
}
```

## 时区偏移处理

```typescript
/**
 * 设置 UTC 偏移
 */
DayjsClass.prototype.utcOffset = function(
  offset?: number | string, 
  keepLocalTime?: boolean
): Dayjs | number {
  // 无参数：返回当前偏移
  if (offset === undefined) {
    return this.$u ? 0 : -this.$d.getTimezoneOffset()
  }
  
  // 解析偏移值
  let offsetMinutes: number
  if (typeof offset === 'string') {
    // '+08:00' -> 480
    offsetMinutes = parseTimezoneOffset(offset)
  } else {
    offsetMinutes = offset
  }
  
  if (keepLocalTime) {
    // 保持本地时间，只改变时区
    return new DayjsClass(this.$d, { utc: true })
      .set('minute', this.minute() - offsetMinutes + this.utcOffset())
  }
  
  // 转换到新时区
  const diff = offsetMinutes - this.utcOffset()
  return this.add(diff, 'minute')
}

function parseTimezoneOffset(tz: string): number {
  const match = tz.match(/([+-])(\d{2}):?(\d{2})?/)
  if (!match) return 0
  
  const sign = match[1] === '-' ? -1 : 1
  const hours = parseInt(match[2], 10)
  const minutes = parseInt(match[3] || '0', 10)
  
  return sign * (hours * 60 + minutes)
}
```

## 格式化中的时区

UTC 模式影响格式化输出：

```typescript
/**
 * 格式化时区部分
 */
function formatTimezone(d: Dayjs): string {
  if (d.isUTC()) {
    return 'Z'
  }
  
  const offset = d.utcOffset()
  const sign = offset >= 0 ? '+' : '-'
  const absOffset = Math.abs(offset)
  const hours = Math.floor(absOffset / 60)
  const minutes = absOffset % 60
  
  return `${sign}${padStart(hours)}:${padStart(minutes)}`
}
```

## 常见陷阱

### 陷阱一：本地时间 vs UTC 时间混淆

```javascript
// 创建的是本地时间 2024-12-25 00:00
const local = dayjs('2024-12-25')

// 创建的是 UTC 时间 2024-12-25 00:00
const utc = dayjs.utc('2024-12-25')

// 两者的时间戳不同！
console.log(local.valueOf() !== utc.valueOf())
```

### 陷阱二：时区偏移符号

```javascript
// getTimezoneOffset() 返回 UTC - 本地
// 东八区返回 -480（UTC 比本地少 8 小时）

// 而 ISO 格式 +08:00 表示本地比 UTC 多 8 小时
// 符号相反！
```

### 陷阱三：夏令时

```javascript
// 某些地区有夏令时，同一个本地时间可能对应两个 UTC 时间
// Day.js 依赖原生 Date 处理夏令时
```

## 测试用例

```typescript
describe('UTC 处理', () => {
  beforeAll(() => {
    dayjs.extend(utc)
  })

  it('dayjs.utc() 创建 UTC 时间', () => {
    const d = dayjs.utc('2024-12-25')
    expect(d.isUTC()).toBe(true)
  })

  it('.utc() 转换为 UTC 模式', () => {
    const local = dayjs('2024-12-25T08:00:00')
    const utc = local.utc()
    expect(utc.isUTC()).toBe(true)
    // 时间戳相同
    expect(utc.valueOf()).toBe(local.valueOf())
  })

  it('.local() 转换为本地模式', () => {
    const utc = dayjs.utc('2024-12-25')
    const local = utc.local()
    expect(local.isUTC()).toBe(false)
  })

  it('.utcOffset() 返回偏移分钟', () => {
    const d = dayjs.utc('2024-12-25')
    expect(d.utcOffset()).toBe(0)
  })

  it('UTC 模式格式化带 Z', () => {
    const d = dayjs.utc('2024-12-25T00:00:00')
    expect(d.format()).toContain('Z')
  })
})
```

## 小结

本章实现了时区与 UTC 处理：

- **UTC 模式**：通过 `$u` 标志区分
- **get/set 方法**：根据模式选择 UTC 或本地方法
- **模式转换**：utc()、local() 方法
- **时区偏移**：utcOffset() 获取和设置

时区处理是日期库中最容易出错的部分，理解 UTC 和本地时间的区别是关键。
