# 插件系统设计

Day.js 的核心只有 2KB，但通过插件系统可以扩展到功能丰富的日期库。这种设计模式值得我们深入学习。

## 设计理念

**核心小而美**：

```javascript
// 核心只包含最基本的功能
dayjs().format('YYYY-MM-DD')  // ✓ 核心
dayjs().fromNow()             // ✗ 需要 relativeTime 插件
dayjs().tz('Asia/Shanghai')   // ✗ 需要 timezone 插件
```

**按需加载**：

```javascript
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(relativeTime)
dayjs.extend(timezone)
```

## 插件接口

```typescript
type PluginFunc<T = unknown> = (
  option: T,
  DayjsClass: typeof Dayjs,
  dayjs: typeof dayjsFactory
) => void
```

三个参数的作用：

| 参数 | 用途 |
|------|------|
| option | 插件配置项 |
| DayjsClass | Dayjs 类，用于扩展原型 |
| dayjs | dayjs 工厂函数，用于添加静态方法 |

## extend 实现

```typescript
// src/dayjs.ts
const installedPlugins: PluginFunc[] = []

function dayjs(date?: DateInput): Dayjs {
  return new Dayjs(date)
}

dayjs.extend = function<T>(plugin: PluginFunc<T>, option?: T): typeof dayjs {
  // 防止重复安装
  if (!installedPlugins.includes(plugin)) {
    installedPlugins.push(plugin)
    plugin(option as T, Dayjs, dayjs)
  }
  return dayjs
}

export default dayjs
```

## 插件模板

```typescript
// 标准插件结构
export default function(
  option: PluginOption | undefined, 
  DayjsClass: typeof Dayjs, 
  dayjs: typeof dayjsFactory
) {
  // 1. 扩展实例方法
  DayjsClass.prototype.myMethod = function() {
    // this 是 Dayjs 实例
    return this
  }
  
  // 2. 扩展静态方法
  dayjs.myStaticMethod = function() {
    // ...
  }
  
  // 3. 扩展原有方法（谨慎使用）
  const oldFormat = DayjsClass.prototype.format
  DayjsClass.prototype.format = function(formatStr?: string) {
    // 新增逻辑
    if (formatStr === 'custom') {
      return 'custom format'
    }
    // 调用原方法
    return oldFormat.call(this, formatStr)
  }
}
```

## 实际示例：isBetween 插件

```typescript
// src/plugins/isBetween.ts
import { Dayjs, DateInput } from '../types'

export interface IsBetweenPlugin {
  isBetween(
    start: DateInput,
    end: DateInput,
    unit?: string | null,
    inclusivity?: string
  ): boolean
}

export default function(
  option: unknown, 
  DayjsClass: typeof Dayjs
) {
  DayjsClass.prototype.isBetween = function(
    start: DateInput,
    end: DateInput,
    unit?: string | null,
    inclusivity: string = '()'
  ): boolean {
    const dayjs = (this as any).constructor
    const startDate = dayjs(start)
    const endDate = dayjs(end)
    
    const includeStart = inclusivity[0] === '['
    const includeEnd = inclusivity[1] === ']'
    
    const afterStart = includeStart
      ? !this.isBefore(startDate, unit || undefined)
      : this.isAfter(startDate, unit || undefined)
    
    const beforeEnd = includeEnd
      ? !this.isAfter(endDate, unit || undefined)
      : this.isBefore(endDate, unit || undefined)
    
    return afterStart && beforeEnd
  }
}
```

## 类型声明扩展

```typescript
// types/plugin/isBetween.d.ts
import { Dayjs, DateInput } from 'dayjs'

declare module 'dayjs' {
  interface Dayjs {
    isBetween(
      start: DateInput,
      end: DateInput,
      unit?: string | null,
      inclusivity?: string
    ): boolean
  }
}

declare const plugin: PluginFunc
export default plugin
```

## 插件依赖

有些插件依赖其他插件：

```typescript
// timezone 插件依赖 utc 插件
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)      // 必须先安装
dayjs.extend(timezone) // 才能安装 timezone
```

实现依赖检查：

```typescript
export default function timezone(option, DayjsClass, dayjs) {
  // 检查依赖
  if (!DayjsClass.prototype.$u) {
    throw new Error('timezone plugin requires utc plugin')
  }
  
  // 插件逻辑...
}
```

## 插件配置

```typescript
// 带配置的插件
export default function customPlugin(
  option: { prefix?: string } = {},
  DayjsClass: typeof Dayjs
) {
  const prefix = option.prefix || ''
  
  DayjsClass.prototype.customFormat = function() {
    return prefix + this.format('YYYY-MM-DD')
  }
}

// 使用
dayjs.extend(customPlugin, { prefix: 'Date: ' })
dayjs().customFormat()  // 'Date: 2024-06-15'
```

## 内置插件列表

Day.js 官方提供的常用插件：

| 插件 | 功能 |
|------|------|
| advancedFormat | 更多格式化选项 |
| relativeTime | 相对时间 |
| duration | 持续时间 |
| timezone | 时区支持 |
| utc | UTC 模式 |
| isBetween | 范围判断 |
| isSameOrAfter | 相同或之后 |
| isSameOrBefore | 相同或之前 |
| customParseFormat | 自定义解析格式 |
| weekOfYear | 年中第几周 |
| dayOfYear | 年中第几天 |
| quarterOfYear | 季度 |

## 测试插件

```typescript
describe('Plugin System', () => {
  it('should extend instance methods', () => {
    const plugin = (opt, Dayjs) => {
      Dayjs.prototype.test = function() {
        return 'test'
      }
    }
    
    dayjs.extend(plugin)
    expect(dayjs().test()).toBe('test')
  })

  it('should extend static methods', () => {
    const plugin = (opt, Dayjs, d) => {
      d.staticTest = () => 'static'
    }
    
    dayjs.extend(plugin)
    expect(dayjs.staticTest()).toBe('static')
  })

  it('should not install twice', () => {
    let count = 0
    const plugin = () => { count++ }
    
    dayjs.extend(plugin)
    dayjs.extend(plugin)
    
    expect(count).toBe(1)
  })

  it('should pass options', () => {
    let receivedOption
    const plugin = (opt) => { receivedOption = opt }
    
    dayjs.extend(plugin, { key: 'value' })
    
    expect(receivedOption).toEqual({ key: 'value' })
  })
})
```

## 小结

本章设计了插件系统：

- **extend 方法**：注册插件，防止重复安装
- **三参数接口**：option、DayjsClass、dayjs
- **扩展方式**：实例方法、静态方法、覆盖原方法
- **类型安全**：通过声明合并扩展类型

这种设计让核心保持精简，同时提供无限扩展可能。
