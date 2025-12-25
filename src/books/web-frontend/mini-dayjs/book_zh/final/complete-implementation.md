# 完整实现

本章整合前面所有内容，呈现一个功能完整的 mini-dayjs 实现。

## 项目结构

```
mini-dayjs/
├── src/
│   ├── index.ts          # 入口
│   ├── dayjs.ts          # 核心类
│   ├── parse.ts          # 解析逻辑
│   ├── format.ts         # 格式化逻辑
│   ├── types.ts          # 类型定义
│   ├── constants.ts      # 常量
│   ├── utils.ts          # 工具函数
│   ├── locale/
│   │   ├── index.ts      # Locale 管理
│   │   ├── en.ts         # 英文
│   │   └── zh-cn.ts      # 中文
│   └── plugins/
│       ├── isBetween.ts
│       ├── relativeTime.ts
│       ├── duration.ts
│       ├── timezone.ts
│       └── customParseFormat.ts
├── test/
│   └── ...
├── package.json
└── tsconfig.json
```

## 类型定义

```typescript
// src/types.ts
export type DateInput = 
  | string 
  | number 
  | Date 
  | Dayjs 
  | null 
  | undefined

export type UnitType = 
  | 'year' | 'years' | 'y'
  | 'month' | 'months' | 'M'
  | 'day' | 'days' | 'd'
  | 'hour' | 'hours' | 'h'
  | 'minute' | 'minutes' | 'm'
  | 'second' | 'seconds' | 's'
  | 'millisecond' | 'milliseconds' | 'ms'
  | 'week' | 'weeks' | 'w'

export interface Locale {
  name: string
  weekdays: string[]
  weekdaysShort: string[]
  weekdaysMin: string[]
  months: string[]
  monthsShort: string[]
  ordinal: (n: number) => string
  weekStart: number
  formats: {
    LT: string
    LTS: string
    L: string
    LL: string
    LLL: string
    LLLL: string
  }
  relativeTime: {
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
  meridiem?: (hour: number) => string
}

export type PluginFunc<T = unknown> = (
  option: T,
  DayjsClass: typeof Dayjs,
  dayjs: typeof dayjsFactory
) => void
```

## 核心类

```typescript
// src/dayjs.ts
import { DateInput, UnitType, Locale, PluginFunc } from './types'
import { parse } from './parse'
import { formatDate } from './format'
import { getLocale, setGlobalLocale, getGlobalLocaleName } from './locale'
import { normalizeUnit, isLeapYear, daysInMonth } from './utils'

class Dayjs {
  private $d: Date
  private $L: string
  private $valid: boolean
  $x: Record<string, unknown> = {}
  
  constructor(date?: DateInput, locale?: string) {
    const parsed = parse(date)
    this.$d = parsed.date
    this.$valid = parsed.valid
    this.$L = locale || getGlobalLocaleName()
  }
  
  // ===== 解析与验证 =====
  
  isValid(): boolean {
    return this.$valid && !isNaN(this.$d.getTime())
  }
  
  // ===== Getter =====
  
  year(): number { return this.$d.getFullYear() }
  month(): number { return this.$d.getMonth() }
  date(): number { return this.$d.getDate() }
  day(): number { return this.$d.getDay() }
  hour(): number { return this.$d.getHours() }
  minute(): number { return this.$d.getMinutes() }
  second(): number { return this.$d.getSeconds() }
  millisecond(): number { return this.$d.getMilliseconds() }
  
  // ===== Setter =====
  
  set(unit: UnitType, value: number): Dayjs {
    const u = normalizeUnit(unit)
    const d = new Date(this.$d)
    
    switch (u) {
      case 'year': d.setFullYear(value); break
      case 'month': d.setMonth(value); break
      case 'date': d.setDate(value); break
      case 'hour': d.setHours(value); break
      case 'minute': d.setMinutes(value); break
      case 'second': d.setSeconds(value); break
      case 'millisecond': d.setMilliseconds(value); break
    }
    
    return new Dayjs(d, this.$L)
  }
  
  // ===== 操作 =====
  
  add(value: number, unit: UnitType): Dayjs {
    const u = normalizeUnit(unit)
    
    if (u === 'month') {
      return this.set('month', this.month() + value)
    }
    if (u === 'year') {
      return this.set('year', this.year() + value)
    }
    
    const ms = this.valueOf() + value * this.getUnitMs(u)
    return new Dayjs(ms, this.$L)
  }
  
  subtract(value: number, unit: UnitType): Dayjs {
    return this.add(-value, unit)
  }
  
  startOf(unit: UnitType): Dayjs {
    const u = normalizeUnit(unit)
    const d = new Date(this.$d)
    
    switch (u) {
      case 'year':
        d.setMonth(0)
        // falls through
      case 'month':
        d.setDate(1)
        // falls through
      case 'day':
      case 'date':
        d.setHours(0)
        // falls through
      case 'hour':
        d.setMinutes(0)
        // falls through
      case 'minute':
        d.setSeconds(0)
        // falls through
      case 'second':
        d.setMilliseconds(0)
    }
    
    if (u === 'week') {
      const locale = this.localeData()
      const day = d.getDay()
      const diff = (day - locale.weekStart + 7) % 7
      d.setDate(d.getDate() - diff)
      d.setHours(0, 0, 0, 0)
    }
    
    return new Dayjs(d, this.$L)
  }
  
  endOf(unit: UnitType): Dayjs {
    return this.startOf(unit).add(1, unit).subtract(1, 'millisecond')
  }
  
  // ===== 比较 =====
  
  isBefore(date: DateInput, unit?: UnitType): boolean {
    const other = dayjs(date)
    if (unit) {
      return this.startOf(unit).valueOf() < other.startOf(unit).valueOf()
    }
    return this.valueOf() < other.valueOf()
  }
  
  isAfter(date: DateInput, unit?: UnitType): boolean {
    const other = dayjs(date)
    if (unit) {
      return this.startOf(unit).valueOf() > other.startOf(unit).valueOf()
    }
    return this.valueOf() > other.valueOf()
  }
  
  isSame(date: DateInput, unit?: UnitType): boolean {
    const other = dayjs(date)
    if (unit) {
      return this.startOf(unit).valueOf() === other.startOf(unit).valueOf()
    }
    return this.valueOf() === other.valueOf()
  }
  
  diff(date: DateInput, unit?: UnitType, float = false): number {
    const other = dayjs(date)
    const diff = this.valueOf() - other.valueOf()
    
    if (!unit) return diff
    
    const u = normalizeUnit(unit)
    let result: number
    
    switch (u) {
      case 'year':
        result = this.monthDiff(other) / 12
        break
      case 'month':
        result = this.monthDiff(other)
        break
      default:
        result = diff / this.getUnitMs(u)
    }
    
    return float ? result : Math.trunc(result)
  }
  
  // ===== 格式化 =====
  
  format(formatStr?: string): string {
    if (!this.isValid()) return 'Invalid Date'
    return formatDate(this, formatStr, this.localeData())
  }
  
  toISOString(): string {
    return this.$d.toISOString()
  }
  
  toJSON(): string {
    return this.toISOString()
  }
  
  toString(): string {
    return this.$d.toString()
  }
  
  // ===== 转换 =====
  
  valueOf(): number {
    return this.$d.getTime()
  }
  
  unix(): number {
    return Math.floor(this.valueOf() / 1000)
  }
  
  toDate(): Date {
    return new Date(this.$d)
  }
  
  // ===== Locale =====
  
  locale(): string
  locale(name: string): Dayjs
  locale(name?: string): string | Dayjs {
    if (name === undefined) return this.$L
    const ins = this.clone()
    ins.$L = name
    return ins
  }
  
  localeData(): Locale {
    return getLocale(this.$L)
  }
  
  // ===== 工具方法 =====
  
  clone(): Dayjs {
    const ins = new Dayjs(this.$d, this.$L)
    ins.$x = { ...this.$x }
    return ins
  }
  
  daysInMonth(): number {
    return daysInMonth(this.year(), this.month())
  }
  
  isLeapYear(): boolean {
    return isLeapYear(this.year())
  }
  
  // ===== 私有方法 =====
  
  private getUnitMs(unit: string): number {
    const units: Record<string, number> = {
      millisecond: 1,
      second: 1000,
      minute: 60 * 1000,
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000
    }
    return units[unit] || 1
  }
  
  private monthDiff(other: Dayjs): number {
    const yearDiff = this.year() - other.year()
    const monthDiff = this.month() - other.month()
    const dayDiff = (this.date() - other.date()) / 31
    return yearDiff * 12 + monthDiff + dayDiff
  }
}
```

## 工厂函数

```typescript
// src/index.ts
import { Dayjs } from './dayjs'
import { DateInput, PluginFunc, Locale } from './types'
import { setGlobalLocale, registerLocale, getGlobalLocaleName } from './locale'

const installedPlugins: PluginFunc[] = []

function dayjs(date?: DateInput): Dayjs {
  return new Dayjs(date)
}

// 静态方法
dayjs.extend = function<T>(plugin: PluginFunc<T>, option?: T): typeof dayjs {
  if (!installedPlugins.includes(plugin)) {
    installedPlugins.push(plugin)
    plugin(option as T, Dayjs, dayjs)
  }
  return dayjs
}

dayjs.locale = function(name?: string, locale?: Locale): string {
  if (locale) registerLocale(locale)
  if (name) setGlobalLocale(name)
  return getGlobalLocaleName()
}

dayjs.isDayjs = function(obj: unknown): obj is Dayjs {
  return obj instanceof Dayjs
}

dayjs.unix = function(timestamp: number): Dayjs {
  return dayjs(timestamp * 1000)
}

export default dayjs
export { Dayjs }
```

## 使用示例

```typescript
import dayjs from 'mini-dayjs'
import 'mini-dayjs/locale/zh-cn'
import relativeTime from 'mini-dayjs/plugins/relativeTime'
import duration from 'mini-dayjs/plugins/duration'

// 注册插件
dayjs.extend(relativeTime)
dayjs.extend(duration)

// 设置语言
dayjs.locale('zh-cn')

// 基础使用
const now = dayjs()
console.log(now.format('YYYY年MM月DD日'))  // 2024年06月15日

// 操作
const nextWeek = now.add(1, 'week')
const lastMonth = now.subtract(1, 'month')

// 比较
console.log(now.isBefore(nextWeek))  // true
console.log(now.diff(lastMonth, 'day'))  // 约 30

// 格式化
console.log(now.format('LLLL'))  // 2024年6月15日星期六下午2点30分

// 相对时间
console.log(now.subtract(5, 'minute').fromNow())  // 5 分钟前

// Duration
const d = dayjs.duration({ hours: 2, minutes: 30 })
console.log(d.asMinutes())  // 150
console.log(d.humanize())   // 2 hours
```

## 构建配置

```json
// package.json
{
  "name": "mini-dayjs",
  "version": "1.0.0",
  "main": "dist/index.js",
  "module": "dist/index.esm.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.esm.js",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./locale/*": {
      "import": "./dist/locale/*.esm.js",
      "require": "./dist/locale/*.js"
    },
    "./plugins/*": {
      "import": "./dist/plugins/*.esm.js",
      "require": "./dist/plugins/*.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "rollup -c",
    "test": "vitest"
  }
}
```

## 小结

本章整合了完整实现：

- **核心类**：Dayjs 类及所有方法
- **工厂函数**：dayjs() 和静态方法
- **类型系统**：完整的 TypeScript 类型
- **模块结构**：清晰的项目组织

下一章将与官方 Day.js 进行对比分析。
