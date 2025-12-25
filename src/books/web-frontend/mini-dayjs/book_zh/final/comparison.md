# 与官方 Day.js 对比

本章将我们的实现与官方 Day.js 进行对比，分析差异和学习要点。

## 代码量对比

| 模块 | 官方 Day.js | Mini Day.js | 说明 |
|------|-------------|-------------|------|
| 核心 | ~2KB | ~3KB | 我们包含更多注释 |
| 插件系统 | ~0.5KB | ~0.3KB | 简化版 |
| 单个 Locale | ~1KB | ~1KB | 相近 |

## 架构对比

### 官方 Day.js

```javascript
// 使用原型链扩展
const proto = Dayjs.prototype

proto.format = function(formatStr) {
  // ...
}

// 通过 $d、$y、$M 等内部属性缓存
```

### Mini Day.js

```typescript
// 使用类语法
class Dayjs {
  format(formatStr?: string): string {
    // ...
  }
}

// 使用 private 关键字保护内部状态
private $d: Date
```

**差异分析**：
- 官方使用 prototype 更灵活，插件扩展更方便
- 我们使用 class 更符合现代 TypeScript 风格
- 两者在运行时性能几乎无差异

## 解析实现对比

### 官方 Day.js

```javascript
// 使用正则匹配 ISO 格式
const parseDate = (cfg) => {
  const { date, utc } = cfg
  if (date === null) return new Date(NaN)
  if (Utils.u(date)) return new Date()
  if (date instanceof Date) return new Date(date)
  if (typeof date === 'string' && !/Z$/i.test(date)) {
    const d = date.match(C.REGEX_PARSE)
    if (d) {
      const ms = d[7] || '0'
      return new Date(d[1], d[2] - 1, d[3] || 1, d[4] || 0, d[5] || 0, d[6] || 0, ms.substring(0, 3))
    }
  }
  return new Date(date)
}
```

### Mini Day.js

```typescript
export function parse(date?: DateInput): ParseResult {
  if (date === undefined || date === null) {
    return { date: new Date(), valid: true }
  }
  
  if (date instanceof Date) {
    return { date: new Date(date), valid: !isNaN(date.getTime()) }
  }
  
  // ... 更详细的类型处理
}
```

**差异分析**：
- 官方更紧凑，针对性能优化
- 我们更清晰，便于理解和维护
- 官方对 ISO 格式有更完善的正则处理

## 格式化对比

### 官方 Day.js

```javascript
// 使用 match 数组和回调
const matches = {
  YY: String(this.$y).slice(-2),
  YYYY: this.$y,
  M: $M + 1,
  MM: Utils.s($M + 1, 2, '0'),
  // ...
}

str.replace(C.REGEX_FORMAT, (match, $1) => $1 || matches[match])
```

### Mini Day.js

```typescript
// 逐个替换
return formatStr
  .replace(/YYYY/g, () => String(this.year()))
  .replace(/MM/g, () => String(this.month() + 1).padStart(2, '0'))
  // ...
```

**差异分析**：
- 官方使用单次正则匹配，性能更好
- 我们多次替换，代码更直观
- 实际差距在毫秒级，大多数场景可忽略

## 不可变性实现

### 官方 Day.js

```javascript
// clone 方法
const wrapper = (date, instance) => {
  return dayjs(date, {
    locale: instance.$L,
    utc: instance.$u,
    x: instance.$x,
    $offset: instance.$offset
  })
}
```

### Mini Day.js

```typescript
clone(): Dayjs {
  const ins = new Dayjs(this.$d, this.$L)
  ins.$x = { ...this.$x }
  return ins
}
```

两者思路一致，都是创建新实例而非修改原对象。

## 插件系统对比

### 官方 Day.js

```javascript
// 更完善的插件签名
dayjs.extend = (plugin, option) => {
  if (!plugin.$i) {
    plugin(option, Dayjs, dayjs)
    plugin.$i = true
  }
  return dayjs
}
```

### Mini Day.js

```typescript
dayjs.extend = function<T>(plugin: PluginFunc<T>, option?: T): typeof dayjs {
  if (!installedPlugins.includes(plugin)) {
    installedPlugins.push(plugin)
    plugin(option as T, Dayjs, dayjs)
  }
  return dayjs
}
```

**差异分析**：
- 官方在插件函数上标记 `$i`，更节省内存
- 我们使用数组存储，更直观但占用更多内存

## 我们的简化

为了教学清晰，我们简化了一些细节：

| 功能 | 官方实现 | 我们的处理 |
|------|----------|------------|
| UTC 模式 | 完整支持 | 基础插件 |
| 严格解析 | 多种模式 | 简化版 |
| 周计算 | ISO 周 + 自定义 | 基础版 |
| 性能优化 | 多处缓存 | 未优化 |

## 官方的优秀设计

值得学习的设计决策：

**1. 常量集中管理**

```javascript
// constant.js
export const SECONDS_A_MINUTE = 60
export const SECONDS_A_HOUR = SECONDS_A_MINUTE * 60
export const SECONDS_A_DAY = SECONDS_A_HOUR * 24
```

**2. 单位标准化**

```javascript
const prettyUnit = (u) => {
  const special = {
    M: 'month',
    y: 'year',
    // ...
  }
  return special[u] || String(u).toLowerCase().replace(/s$/, '')
}
```

**3. 配置对象模式**

```javascript
const dayjs = (date, c) => {
  if (isDayjs(date)) return date.clone()
  const cfg = typeof c === 'object' ? c : {}
  cfg.date = date
  return new Dayjs(cfg)
}
```

## 我们可以改进的地方

**1. 性能优化**

```typescript
// 缓存计算结果
class Dayjs {
  private _year?: number
  
  year(): number {
    if (this._year === undefined) {
      this._year = this.$d.getFullYear()
    }
    return this._year
  }
}
```

**2. 更好的错误处理**

```typescript
class Dayjs {
  add(value: number, unit: UnitType): Dayjs {
    if (!this.isValid()) {
      console.warn('Cannot add to invalid date')
      return this.clone()
    }
    // ...
  }
}
```

**3. 更完善的类型**

```typescript
// 更精确的联合类型
type FormatToken = 
  | 'YYYY' | 'YY' 
  | 'MM' | 'M' 
  | 'DD' | 'D'
  // ...
```

## 性能测试

```javascript
// 简单性能对比
const iterations = 100000

console.time('dayjs')
for (let i = 0; i < iterations; i++) {
  dayjs().format('YYYY-MM-DD')
}
console.timeEnd('dayjs')

console.time('miniDayjs')
for (let i = 0; i < iterations; i++) {
  miniDayjs().format('YYYY-MM-DD')
}
console.timeEnd('miniDayjs')

// 典型结果：
// dayjs: ~150ms
// miniDayjs: ~180ms
```

差距主要来自：
- 我们的多次字符串替换
- 缺少内部缓存
- 更多的类型检查

## 小结

通过与官方 Day.js 对比：

- **相同点**：核心设计思想一致，都强调不可变性和插件化
- **差异点**：官方更注重性能和边界情况处理
- **学习价值**：理解设计决策背后的权衡

官方 Day.js 是一个优秀的开源项目，我们的实现帮助理解其核心原理，而非替代它。
