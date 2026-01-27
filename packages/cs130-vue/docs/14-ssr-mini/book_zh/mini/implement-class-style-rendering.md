# 实现 class 与 style 渲染

本章深入探讨 class 和 style 属性的渲染，这是 SSR 中最常用也最复杂的两种属性。

## Class 渲染的多种形式

Vue 支持多种 class 绑定方式，SSR 需要正确处理每一种。

```typescript
// src/server/render-class.ts

/**
 * 渲染 class 属性
 */
export function renderClass(value: unknown): string {
  const normalized = normalizeClass(value)
  if (!normalized) return ''
  return ` class="${escapeHtml(normalized)}"`
}

/**
 * 标准化 class
 * 支持：字符串、数组、对象及其嵌套组合
 */
export function normalizeClass(value: unknown): string {
  // 空值
  if (value == null || value === false || value === '') {
    return ''
  }
  
  // 字符串：最常见的情况
  if (typeof value === 'string') {
    return value.trim()
  }
  
  // 数组：递归处理
  if (Array.isArray(value)) {
    return normalizeClassArray(value)
  }
  
  // 对象：条件 class
  if (typeof value === 'object') {
    return normalizeClassObject(value as Record<string, unknown>)
  }
  
  // 数字等其他类型
  return String(value)
}

/**
 * 处理数组形式的 class
 */
function normalizeClassArray(arr: unknown[]): string {
  const classes: string[] = []
  
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i]
    
    // 跳过空值
    if (item == null || item === false) continue
    
    // 递归标准化
    const normalized = normalizeClass(item)
    if (normalized) {
      classes.push(normalized)
    }
  }
  
  return classes.join(' ')
}

/**
 * 处理对象形式的 class
 */
function normalizeClassObject(obj: Record<string, unknown>): string {
  const classes: string[] = []
  
  for (const key in obj) {
    // 值为真时添加 class
    if (obj[key]) {
      classes.push(key)
    }
  }
  
  return classes.join(' ')
}
```

## Class 合并

当元素同时有静态 class 和动态 class 时，需要合并。

```typescript
/**
 * 合并多个 class
 */
export function mergeClass(...args: unknown[]): string {
  const classes: string[] = []
  
  for (const arg of args) {
    const normalized = normalizeClass(arg)
    if (normalized) {
      classes.push(normalized)
    }
  }
  
  // 去重
  return dedupeClasses(classes.join(' '))
}

/**
 * class 去重
 */
function dedupeClasses(classString: string): string {
  const seen = new Set<string>()
  const result: string[] = []
  
  for (const cls of classString.split(/\s+/)) {
    if (cls && !seen.has(cls)) {
      seen.add(cls)
      result.push(cls)
    }
  }
  
  return result.join(' ')
}
```

## Style 渲染

Style 的处理比 class 更复杂，需要处理单位、驼峰转换、CSS 变量等。

```typescript
// src/server/render-style.ts

/**
 * 渲染 style 属性
 */
export function renderStyle(value: unknown): string {
  const normalized = normalizeStyle(value)
  if (!normalized) return ''
  return ` style="${escapeHtml(normalized)}"`
}

/**
 * 标准化 style
 */
export function normalizeStyle(value: unknown): string {
  // 空值
  if (value == null || value === '') {
    return ''
  }
  
  // 字符串
  if (typeof value === 'string') {
    return normalizeStyleString(value)
  }
  
  // 数组
  if (Array.isArray(value)) {
    return normalizeStyleArray(value)
  }
  
  // 对象
  if (typeof value === 'object') {
    return normalizeStyleObject(value as Record<string, unknown>)
  }
  
  return ''
}

/**
 * 标准化字符串 style
 */
function normalizeStyleString(style: string): string {
  return style
    .trim()
    // 移除多余分号
    .replace(/;+/g, ';')
    // 移除末尾分号
    .replace(/;$/, '')
}

/**
 * 标准化数组 style
 */
function normalizeStyleArray(arr: unknown[]): string {
  const styles: string[] = []
  
  for (const item of arr) {
    const normalized = normalizeStyle(item)
    if (normalized) {
      styles.push(normalized)
    }
  }
  
  return styles.join('; ')
}
```

## Style 对象处理

```typescript
/**
 * 标准化对象 style
 */
function normalizeStyleObject(obj: Record<string, unknown>): string {
  const declarations: string[] = []
  
  for (const key in obj) {
    const value = obj[key]
    
    // 跳过空值
    if (value == null || value === '') continue
    
    // 处理 CSS 变量
    if (key.startsWith('--')) {
      declarations.push(`${key}: ${value}`)
      continue
    }
    
    // 转换属性名
    const prop = toKebabCase(key)
    
    // 处理值
    const val = formatStyleValue(prop, value)
    
    // 处理 !important
    if (typeof value === 'string' && value.includes('!important')) {
      declarations.push(`${prop}: ${val}`)
    } else {
      declarations.push(`${prop}: ${val}`)
    }
  }
  
  return declarations.join('; ')
}

/**
 * 驼峰转连字符
 */
function toKebabCase(str: string): string {
  // 处理特殊前缀
  return str
    .replace(/^(webkit|moz|ms|o)([A-Z])/, '-$1-$2')
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
}
```

## 样式值格式化

```typescript
// 无单位 CSS 属性
const UNITLESS_PROPS = new Set([
  'animation-iteration-count',
  'border-image-outset',
  'border-image-slice',
  'border-image-width',
  'box-flex',
  'box-flex-group',
  'box-ordinal-group',
  'column-count',
  'columns',
  'fill-opacity',
  'flex',
  'flex-grow',
  'flex-negative',
  'flex-order',
  'flex-positive',
  'flex-shrink',
  'flood-opacity',
  'font-weight',
  'grid-area',
  'grid-column',
  'grid-column-end',
  'grid-column-span',
  'grid-column-start',
  'grid-row',
  'grid-row-end',
  'grid-row-span',
  'grid-row-start',
  'line-clamp',
  'line-height',
  'opacity',
  'order',
  'orphans',
  'scale',
  'stop-opacity',
  'stroke-dasharray',
  'stroke-dashoffset',
  'stroke-miterlimit',
  'stroke-opacity',
  'stroke-width',
  'tab-size',
  'widows',
  'z-index',
  'zoom'
])

/**
 * 格式化样式值
 */
function formatStyleValue(prop: string, value: unknown): string {
  // 字符串直接返回
  if (typeof value === 'string') {
    return value
  }
  
  // 数值处理
  if (typeof value === 'number') {
    // 0 不需要单位
    if (value === 0) return '0'
    
    // NaN 和无穷
    if (!isFinite(value)) return ''
    
    // 无单位属性
    if (UNITLESS_PROPS.has(prop)) {
      return String(value)
    }
    
    // 添加 px
    return `${value}px`
  }
  
  // 数组值（如 transform）
  if (Array.isArray(value)) {
    return value.map(v => formatStyleValue(prop, v)).join(', ')
  }
  
  return String(value)
}
```

## Style 合并

```typescript
/**
 * 合并多个 style
 */
export function mergeStyle(...args: unknown[]): string {
  const merged: Record<string, string> = {}
  
  for (const arg of args) {
    if (!arg) continue
    
    if (typeof arg === 'string') {
      // 解析字符串 style
      const parsed = parseStyleString(arg)
      Object.assign(merged, parsed)
    } else if (typeof arg === 'object' && !Array.isArray(arg)) {
      // 直接合并对象
      for (const key in arg as Record<string, unknown>) {
        const value = (arg as Record<string, unknown>)[key]
        if (value != null && value !== '') {
          const prop = key.startsWith('--') ? key : toKebabCase(key)
          merged[prop] = formatStyleValue(prop, value)
        }
      }
    } else if (Array.isArray(arg)) {
      // 递归处理数组
      Object.assign(merged, parseStyleString(normalizeStyleArray(arg)))
    }
  }
  
  // 序列化
  return Object.entries(merged)
    .map(([k, v]) => `${k}: ${v}`)
    .join('; ')
}

/**
 * 解析字符串 style
 */
function parseStyleString(style: string): Record<string, string> {
  const result: Record<string, string> = {}
  
  // 分割声明
  const declarations = style.split(';')
  
  for (const decl of declarations) {
    const colonIndex = decl.indexOf(':')
    if (colonIndex === -1) continue
    
    const prop = decl.slice(0, colonIndex).trim()
    const value = decl.slice(colonIndex + 1).trim()
    
    if (prop && value) {
      result[prop] = value
    }
  }
  
  return result
}
```

## 浏览器前缀处理

```typescript
// 需要前缀的属性
const PREFIXED_PROPS: Record<string, string[]> = {
  'transform': ['-webkit-transform', '-ms-transform'],
  'transition': ['-webkit-transition'],
  'animation': ['-webkit-animation'],
  'flex': ['-webkit-flex', '-ms-flex'],
  'flex-direction': ['-webkit-flex-direction', '-ms-flex-direction'],
  'justify-content': ['-webkit-justify-content', '-ms-flex-pack'],
  'align-items': ['-webkit-align-items', '-ms-flex-align'],
  'user-select': ['-webkit-user-select', '-moz-user-select', '-ms-user-select'],
  'backdrop-filter': ['-webkit-backdrop-filter'],
  'appearance': ['-webkit-appearance', '-moz-appearance']
}

/**
 * 添加浏览器前缀（可选功能）
 */
function addPrefixes(
  prop: string,
  value: string,
  declarations: string[]
): void {
  const prefixes = PREFIXED_PROPS[prop]
  
  if (prefixes) {
    for (const prefixed of prefixes) {
      declarations.push(`${prefixed}: ${value}`)
    }
  }
  
  declarations.push(`${prop}: ${value}`)
}
```

## scoped style 处理

Vue 的 scoped style 需要特殊处理。

```typescript
/**
 * 添加 scoped 属性
 */
export function addScopedId(
  html: string,
  scopeId: string
): string {
  // 匹配开始标签
  return html.replace(
    /<([a-z][a-z0-9-]*)((?:\s[^>]*)?)(\/?)>/gi,
    (match, tag, attrs, selfClose) => {
      // 跳过注释和特殊标签
      if (tag === 'template' || tag === 'slot') {
        return match
      }
      
      // 添加 scope id
      return `<${tag}${attrs} ${scopeId}${selfClose}>`
    }
  )
}

/**
 * 在 SSR 上下文中注入样式
 */
export function injectStyles(
  context: SSRContext,
  styles: string[]
): void {
  for (const style of styles) {
    if (!context.head.includes(style)) {
      context.head.push(`<style>${style}</style>`)
    }
  }
}
```

## 关键帧和媒体查询

```typescript
/**
 * 处理复杂的 CSS 值
 */
function handleComplexValue(value: unknown): string {
  if (typeof value !== 'object' || value === null) {
    return String(value)
  }
  
  // 处理关键帧对象
  if ('from' in value || '0%' in value) {
    return formatKeyframes(value as Record<string, unknown>)
  }
  
  return JSON.stringify(value)
}

/**
 * 格式化关键帧
 */
function formatKeyframes(keyframes: Record<string, unknown>): string {
  const frames: string[] = []
  
  for (const key in keyframes) {
    const styles = normalizeStyleObject(keyframes[key] as Record<string, unknown>)
    frames.push(`${key} { ${styles} }`)
  }
  
  return frames.join(' ')
}
```

## 使用示例

```typescript
// Class 示例

// 字符串
normalizeClass('foo bar')
// => 'foo bar'

// 数组
normalizeClass(['foo', 'bar', { baz: true }])
// => 'foo bar baz'

// 对象
normalizeClass({ active: true, disabled: false })
// => 'active'

// 嵌套
normalizeClass(['a', ['b', { c: true }], { d: true }])
// => 'a b c d'

// Style 示例

// 字符串
normalizeStyle('color: red; font-size: 14px')
// => 'color: red; font-size: 14px'

// 对象
normalizeStyle({
  color: 'red',
  fontSize: 14,
  marginTop: 0,
  '--custom': 'value'
})
// => 'color: red; font-size: 14px; margin-top: 0; --custom: value'

// 数组
normalizeStyle([
  { color: 'red' },
  'background: blue',
  { fontSize: 14 }
])
// => 'color: red; background: blue; font-size: 14px'

// 合并
mergeStyle(
  'color: red',
  { backgroundColor: 'blue' },
  { color: 'green' }  // 覆盖
)
// => 'color: green; background-color: blue'
```

## 性能优化

```typescript
// 缓存常见的 class 组合
const classCache = new Map<string, string>()

/**
 * 带缓存的 class 标准化
 */
export function normalizeClassCached(value: unknown): string {
  // 只缓存简单字符串
  if (typeof value === 'string') {
    const cached = classCache.get(value)
    if (cached !== undefined) return cached
    
    const normalized = value.trim()
    
    // 限制缓存大小
    if (classCache.size < 1000) {
      classCache.set(value, normalized)
    }
    
    return normalized
  }
  
  return normalizeClass(value)
}

// style 对象序列化缓存
const styleCache = new WeakMap<object, string>()

/**
 * 带缓存的 style 标准化
 */
export function normalizeStyleCached(value: unknown): string {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const cached = styleCache.get(value)
    if (cached !== undefined) return cached
    
    const normalized = normalizeStyleObject(value as Record<string, unknown>)
    styleCache.set(value, normalized)
    
    return normalized
  }
  
  return normalizeStyle(value)
}
```

## 小结

本章深入实现了 class 和 style 渲染：

1. **Class 标准化**：支持字符串、数组、对象
2. **Class 合并**：处理多来源 class
3. **Style 标准化**：对象、数组、字符串
4. **值格式化**：驼峰转换、自动添加 px
5. **Style 合并**：属性覆盖和解析
6. **Scoped 支持**：添加作用域 ID
7. **性能优化**：缓存常见值

class 和 style 是最常用的动态属性，正确处理它们对 SSR 输出质量至关重要。
