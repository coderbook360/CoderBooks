# Day.js 架构概览与设计理念

在动手写代码之前，我们先从宏观视角理解 Day.js 的架构设计。为什么它能做到 2KB？这背后有哪些设计决策？

## 核心设计理念

### 1. 不可变性（Immutability）

Day.js 最重要的设计决策：**所有操作返回新实例，不修改原对象**。

```javascript
const date1 = dayjs('2024-01-01')
const date2 = date1.add(1, 'month')

console.log(date1.format()) // 2024-01-01（未改变）
console.log(date2.format()) // 2024-02-01（新实例）
```

为什么选择不可变？

**可预测性**：对象状态不会被意外修改，调试更容易。

**函数式友好**：可以安全地在 React、Vue 等框架中使用，不会触发意外的副作用。

**链式调用**：每个方法返回新实例，天然支持链式操作。

代价是什么？每次操作都创建新对象，有一定的内存开销。但对于日期处理场景，这个开销完全可接受。

### 2. 轻量化优先

Day.js 的体积只有 2KB（gzip），而 Moment.js 是 70KB。如何做到的？

**最小核心**：核心只包含最常用的功能（解析、格式化、加减、比较）

**插件扩展**：相对时间、时区、高级格式等都是插件

**无依赖**：不依赖任何第三方库

**Tree-shaking 友好**：ES Module 格式，未使用的代码可以被移除

### 3. API 兼容

Day.js 的 API 设计尽量与 Moment.js 保持一致：

```javascript
// Moment.js
moment().add(1, 'day').format('YYYY-MM-DD')

// Day.js（几乎完全相同）
dayjs().add(1, 'day').format('YYYY-MM-DD')
```

这降低了迁移成本，也让熟悉 Moment.js 的开发者能快速上手。

## 架构分层

Day.js 的代码可以分为以下几层：

```
┌─────────────────────────────────────┐
│           Plugins（插件）            │
│  relativeTime, timezone, duration   │
├─────────────────────────────────────┤
│           Locale（本地化）           │
│         zh-cn, en, ja, ko           │
├─────────────────────────────────────┤
│           Dayjs Class               │
│   parse, format, add, diff, etc.    │
├─────────────────────────────────────┤
│         Utils & Constants           │
│   padStart, normalizeUnit, etc.     │
└─────────────────────────────────────┘
```

### Utils 层

最底层是工具函数和常量定义，提供基础能力：

- 单位标准化（`'y'` → `'year'`）
- 数字补零（`1` → `'01'`）
- 时间常量（毫秒、秒、天等）

### Dayjs 类

核心层，封装 Date 对象并提供增强 API：

- **解析**：将各种输入转为内部 Date
- **取值/设值**：year, month, date, hour 等
- **运算**：add, subtract, startOf, endOf
- **格式化**：format 方法
- **比较**：isBefore, isAfter, isSame

### Locale 层

本地化支持，处理不同语言的：

- 月份名称（January vs 一月）
- 星期名称（Sunday vs 星期日）
- 相对时间（1 hour ago vs 1 小时前）

### Plugins 层

通过插件系统扩展功能，保持核心精简：

```javascript
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)
dayjs().fromNow() // 插件提供的方法
```

## 核心数据结构

Dayjs 实例内部存储什么数据？

```typescript
class Dayjs {
  private $d: Date       // 原生 Date 对象
  private $y: number     // 年
  private $M: number     // 月（0-11）
  private $D: number     // 日
  private $H: number     // 时
  private $m: number     // 分
  private $s: number     // 秒
  private $ms: number    // 毫秒
  private $W: number     // 星期（0-6）
}
```

为什么要同时存储 Date 对象和拆分的字段？

**性能优化**：避免反复调用 `getFullYear()`、`getMonth()` 等方法。

**实现简化**：格式化、比较等操作可以直接使用字段值。

## 插件系统设计

Day.js 的插件机制非常简洁：

```typescript
// 插件定义
type PluginFunc = (
  option: any,
  dayjsClass: typeof Dayjs,
  dayjsFactory: typeof dayjs
) => void

// 插件注册
dayjs.extend = function(plugin: PluginFunc, option?: any) {
  plugin(option, Dayjs, dayjs)
  return dayjs
}
```

插件可以做什么？

1. **扩展原型方法**：给 `Dayjs.prototype` 添加新方法
2. **扩展静态方法**：给 `dayjs` 添加新方法
3. **修改解析行为**：钩入 parse 流程

```javascript
// RelativeTime 插件示例
export default function(option, Dayjs, dayjs) {
  Dayjs.prototype.fromNow = function() {
    return formatRelative(this, dayjs())
  }
}
```

## 小结

Day.js 的设计理念可以概括为：

- **不可变优先**：安全、可预测、函数式友好
- **轻量优先**：最小核心 + 插件扩展
- **API 兼容**：与 Moment.js 相似，降低迁移成本
- **分层架构**：Utils → Dayjs → Locale → Plugins

理解了这些设计决策，接下来我们开始实现 Dayjs 类的核心设计。
