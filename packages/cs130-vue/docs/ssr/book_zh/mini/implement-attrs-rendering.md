# 实现属性渲染

本章专注于属性渲染的完整实现，覆盖各种特殊情况和边界条件，确保输出的 HTML 属性完全符合规范。

## 属性渲染架构

属性渲染需要一个统一的入口，根据属性类型分发到不同的处理函数。

```typescript
// src/server/render-attrs.ts

import { escapeHtml } from './utils'

// 属性类别
type AttrCategory =
  | 'skip'           // 跳过
  | 'boolean'        // 布尔属性
  | 'enumerated'     // 可枚举属性
  | 'class'          // class 属性
  | 'style'          // style 属性
  | 'data'           // data-* 属性
  | 'aria'           // aria-* 属性
  | 'svg'            // SVG 属性
  | 'normal'         // 普通属性

/**
 * 渲染所有属性
 */
export function renderAttrs(
  props: Record<string, any>,
  tag: string,
  options: RenderAttrsOptions = {}
): string {
  if (!props || Object.keys(props).length === 0) {
    return ''
  }
  
  const { namespace, mergeProps } = options
  
  // 合并属性
  const mergedProps = mergeProps
    ? { ...props, ...mergeProps }
    : props
  
  let html = ''
  
  for (const key in mergedProps) {
    const value = mergedProps[key]
    
    // 分类处理
    const category = categorizeAttr(key, value, tag, namespace)
    
    if (category === 'skip') continue
    
    // 渲染
    html += renderAttrByCategory(key, value, category, tag)
  }
  
  return html
}

interface RenderAttrsOptions {
  namespace?: string
  mergeProps?: Record<string, any>
}
```

## 属性分类

准确的属性分类是正确渲染的基础。

```typescript
/**
 * 属性分类
 */
function categorizeAttr(
  key: string,
  value: any,
  tag: string,
  namespace?: string
): AttrCategory {
  // 跳过的属性
  if (shouldSkipAttr(key, value)) {
    return 'skip'
  }
  
  // 特殊属性
  if (key === 'class' || key === 'className') return 'class'
  if (key === 'style') return 'style'
  if (key.startsWith('data-')) return 'data'
  if (key.startsWith('aria-')) return 'aria'
  
  // SVG 命名空间
  if (namespace === 'svg') return 'svg'
  
  // 布尔属性
  if (isBooleanAttr(key, tag)) return 'boolean'
  
  // 可枚举属性
  if (isEnumeratedAttr(key)) return 'enumerated'
  
  return 'normal'
}

/**
 * 是否跳过属性
 */
function shouldSkipAttr(key: string, value: any): boolean {
  // 保留属性
  if (RESERVED_PROPS.has(key)) return true
  
  // 事件
  if (isEventHandler(key)) return true
  
  // 内部属性
  if (INTERNAL_PROPS.has(key)) return true
  
  // 空值
  if (value === undefined) return true
  
  return false
}

// 保留属性
const RESERVED_PROPS = new Set([
  'key', 'ref', 'is', 'slot'
])

// 内部属性
const INTERNAL_PROPS = new Set([
  'innerHTML', 'textContent', 'nodeValue'
])

/**
 * 判断是否为事件处理器
 */
function isEventHandler(key: string): boolean {
  return (
    key.startsWith('on') &&
    key.length > 2 &&
    key[2] === key[2].toUpperCase()
  )
}
```

## 布尔属性处理

布尔属性在 HTML 中只需要出现属性名，不需要值。

```typescript
// 全局布尔属性
const BOOLEAN_ATTRS = new Set([
  'allowfullscreen',
  'async',
  'autofocus',
  'autoplay',
  'checked',
  'controls',
  'default',
  'defer',
  'disabled',
  'formnovalidate',
  'hidden',
  'inert',
  'ismap',
  'itemscope',
  'loop',
  'multiple',
  'muted',
  'nomodule',
  'novalidate',
  'open',
  'playsinline',
  'readonly',
  'required',
  'reversed',
  'scoped',
  'seamless',
  'selected',
  'truespeed'
])

// 标签特定的布尔属性
const ELEMENT_BOOLEAN_ATTRS: Record<string, string[]> = {
  audio: ['autoplay', 'controls', 'loop', 'muted'],
  button: ['autofocus', 'disabled', 'formnovalidate'],
  details: ['open'],
  dialog: ['open'],
  fieldset: ['disabled'],
  form: ['novalidate'],
  iframe: ['allowfullscreen'],
  img: ['ismap'],
  input: ['autofocus', 'checked', 'disabled', 'formnovalidate', 'multiple', 'readonly', 'required'],
  link: ['disabled'],
  ol: ['reversed'],
  optgroup: ['disabled'],
  option: ['disabled', 'selected'],
  script: ['async', 'defer', 'nomodule'],
  select: ['autofocus', 'disabled', 'multiple', 'required'],
  style: ['scoped'],
  textarea: ['autofocus', 'disabled', 'readonly', 'required'],
  track: ['default'],
  video: ['autoplay', 'controls', 'loop', 'muted', 'playsinline']
}

/**
 * 判断是否为布尔属性
 */
function isBooleanAttr(key: string, tag: string): boolean {
  // 全局布尔属性
  if (BOOLEAN_ATTRS.has(key)) return true
  
  // 标签特定布尔属性
  const tagBoolAttrs = ELEMENT_BOOLEAN_ATTRS[tag]
  if (tagBoolAttrs?.includes(key)) return true
  
  return false
}

/**
 * 渲染布尔属性
 */
function renderBooleanAttr(key: string, value: any): string {
  // 假值不渲染
  if (!value) return ''
  
  // 真值只渲染属性名
  return ` ${key}`
}
```

## 可枚举属性处理

可枚举属性有固定的值范围，需要标准化处理。

```typescript
// 可枚举属性及其有效值
const ENUMERATED_ATTRS: Record<string, EnumAttrConfig> = {
  autocomplete: {
    values: ['on', 'off'],
    default: 'on'
  },
  contenteditable: {
    values: ['true', 'false', 'inherit', 'plaintext-only'],
    default: 'inherit',
    truthy: 'true',
    falsy: 'false'
  },
  crossorigin: {
    values: ['anonymous', 'use-credentials'],
    default: 'anonymous'
  },
  dir: {
    values: ['ltr', 'rtl', 'auto']
  },
  draggable: {
    values: ['true', 'false'],
    truthy: 'true',
    falsy: 'false'
  },
  inputmode: {
    values: ['none', 'text', 'decimal', 'numeric', 'tel', 'search', 'email', 'url']
  },
  loading: {
    values: ['eager', 'lazy'],
    default: 'eager'
  },
  spellcheck: {
    values: ['true', 'false'],
    truthy: 'true',
    falsy: 'false'
  },
  translate: {
    values: ['yes', 'no'],
    truthy: 'yes',
    falsy: 'no'
  },
  wrap: {
    values: ['hard', 'soft', 'off'],
    default: 'soft'
  }
}

interface EnumAttrConfig {
  values: string[]
  default?: string
  truthy?: string
  falsy?: string
}

/**
 * 判断是否为可枚举属性
 */
function isEnumeratedAttr(key: string): boolean {
  return key in ENUMERATED_ATTRS
}

/**
 * 渲染可枚举属性
 */
function renderEnumeratedAttr(key: string, value: any): string {
  const config = ENUMERATED_ATTRS[key]
  if (!config) return ''
  
  let normalizedValue: string
  
  // 布尔值处理
  if (typeof value === 'boolean') {
    if (config.truthy && value) {
      normalizedValue = config.truthy
    } else if (config.falsy && !value) {
      normalizedValue = config.falsy
    } else {
      return ''
    }
  } else {
    normalizedValue = String(value)
  }
  
  // 验证值是否有效
  if (config.values && !config.values.includes(normalizedValue)) {
    // 使用默认值或原值
    normalizedValue = config.default || normalizedValue
  }
  
  return ` ${key}="${escapeHtml(normalizedValue)}"`
}
```

## Class 属性处理

```typescript
/**
 * 渲染 class 属性
 */
function renderClassAttr(value: any): string {
  const normalized = normalizeClass(value)
  if (!normalized) return ''
  return ` class="${escapeHtml(normalized)}"`
}

/**
 * 标准化 class 值
 */
function normalizeClass(value: unknown): string {
  if (value == null) return ''
  
  // 字符串：直接返回
  if (typeof value === 'string') {
    return value.trim()
  }
  
  // 数组：递归处理
  if (Array.isArray(value)) {
    const result: string[] = []
    for (let i = 0; i < value.length; i++) {
      const normalized = normalizeClass(value[i])
      if (normalized) result.push(normalized)
    }
    return result.join(' ')
  }
  
  // 对象：过滤真值
  if (typeof value === 'object') {
    const result: string[] = []
    for (const key in value) {
      if ((value as Record<string, any>)[key]) {
        result.push(key)
      }
    }
    return result.join(' ')
  }
  
  // 其他：转字符串
  return String(value)
}
```

## Style 属性处理

```typescript
/**
 * 渲染 style 属性
 */
function renderStyleAttr(value: any): string {
  const normalized = normalizeStyle(value)
  if (!normalized) return ''
  return ` style="${escapeHtml(normalized)}"`
}

/**
 * 标准化 style 值
 */
function normalizeStyle(value: unknown): string {
  if (value == null) return ''
  
  // 字符串
  if (typeof value === 'string') {
    return value.trim()
  }
  
  // 数组
  if (Array.isArray(value)) {
    const result: string[] = []
    for (let i = 0; i < value.length; i++) {
      const normalized = normalizeStyle(value[i])
      if (normalized) result.push(normalized)
    }
    return result.join('; ')
  }
  
  // 对象
  if (typeof value === 'object') {
    return stringifyStyleObject(value as Record<string, any>)
  }
  
  return ''
}

/**
 * 序列化样式对象
 */
function stringifyStyleObject(style: Record<string, any>): string {
  const declarations: string[] = []
  
  for (const key in style) {
    const value = style[key]
    
    // 跳过空值
    if (value == null || value === '') continue
    
    // 处理属性名
    const prop = normalizeStyleProp(key)
    
    // 处理属性值
    const val = normalizeStyleValue(prop, value)
    
    declarations.push(`${prop}: ${val}`)
  }
  
  return declarations.join('; ')
}

/**
 * 标准化样式属性名
 */
function normalizeStyleProp(key: string): string {
  // CSS 变量保持原样
  if (key.startsWith('--')) return key
  
  // 驼峰转连字符
  return key.replace(/([A-Z])/g, '-$1').toLowerCase()
}

// 不需要单位的属性
const UNITLESS_CSS_PROPS = new Set([
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
 * 标准化样式值
 */
function normalizeStyleValue(prop: string, value: any): string {
  // 字符串直接返回
  if (typeof value === 'string') return value
  
  // 数值处理
  if (typeof value === 'number') {
    // 0 不需要单位
    if (value === 0) return '0'
    
    // 无单位属性
    if (UNITLESS_CSS_PROPS.has(prop)) return String(value)
    
    // 添加 px
    return `${value}px`
  }
  
  return String(value)
}
```

## Data 和 Aria 属性

```typescript
/**
 * 渲染 data-* 属性
 */
function renderDataAttr(key: string, value: any): string {
  // null 和 undefined 不渲染
  if (value == null) return ''
  
  // 布尔值
  if (typeof value === 'boolean') {
    return value ? ` ${key}` : ''
  }
  
  // 对象和数组序列化
  if (typeof value === 'object') {
    return ` ${key}="${escapeHtml(JSON.stringify(value))}"`
  }
  
  return ` ${key}="${escapeHtml(String(value))}"`
}

/**
 * 渲染 aria-* 属性
 */
function renderAriaAttr(key: string, value: any): string {
  // null 和 undefined 不渲染
  if (value == null) return ''
  
  // 布尔值转字符串
  if (typeof value === 'boolean') {
    return ` ${key}="${value}"`
  }
  
  return ` ${key}="${escapeHtml(String(value))}"`
}
```

## SVG 属性

SVG 属性需要保持正确的大小写。

```typescript
// SVG 属性名映射（驼峰 -> 正确格式）
const SVG_ATTR_MAP: Record<string, string> = {
  // xlink 命名空间
  xlinkActuate: 'xlink:actuate',
  xlinkArcrole: 'xlink:arcrole',
  xlinkHref: 'xlink:href',
  xlinkRole: 'xlink:role',
  xlinkShow: 'xlink:show',
  xlinkTitle: 'xlink:title',
  xlinkType: 'xlink:type',
  
  // xml 命名空间
  xmlBase: 'xml:base',
  xmlLang: 'xml:lang',
  xmlSpace: 'xml:space',
  
  // 保持大小写的属性
  viewBox: 'viewBox',
  preserveAspectRatio: 'preserveAspectRatio',
  clipPathUnits: 'clipPathUnits',
  gradientTransform: 'gradientTransform',
  gradientUnits: 'gradientUnits',
  markerHeight: 'markerHeight',
  markerUnits: 'markerUnits',
  markerWidth: 'markerWidth',
  maskContentUnits: 'maskContentUnits',
  maskUnits: 'maskUnits',
  patternContentUnits: 'patternContentUnits',
  patternTransform: 'patternTransform',
  patternUnits: 'patternUnits',
  spreadMethod: 'spreadMethod',
  textLength: 'textLength',
  lengthAdjust: 'lengthAdjust',
  
  // 常见的驼峰到连字符
  fillOpacity: 'fill-opacity',
  fillRule: 'fill-rule',
  strokeDasharray: 'stroke-dasharray',
  strokeDashoffset: 'stroke-dashoffset',
  strokeLinecap: 'stroke-linecap',
  strokeLinejoin: 'stroke-linejoin',
  strokeMiterlimit: 'stroke-miterlimit',
  strokeOpacity: 'stroke-opacity',
  strokeWidth: 'stroke-width',
  fontFamily: 'font-family',
  fontSize: 'font-size',
  fontStyle: 'font-style',
  fontWeight: 'font-weight',
  textAnchor: 'text-anchor',
  textDecoration: 'text-decoration'
}

/**
 * 渲染 SVG 属性
 */
function renderSVGAttr(key: string, value: any): string {
  // 跳过事件
  if (isEventHandler(key)) return ''
  
  // null 和 undefined 不渲染
  if (value == null) return ''
  
  // false 不渲染
  if (value === false) return ''
  
  // 获取正确的属性名
  const attrName = SVG_ATTR_MAP[key] || hyphenate(key)
  
  // true 只渲染属性名
  if (value === true) {
    return ` ${attrName}`
  }
  
  return ` ${attrName}="${escapeHtml(String(value))}"`
}

/**
 * 驼峰转连字符
 */
function hyphenate(str: string): string {
  return str.replace(/\B([A-Z])/g, '-$1').toLowerCase()
}
```

## 普通属性

```typescript
/**
 * 渲染普通属性
 */
function renderNormalAttr(key: string, value: any): string {
  // null 不渲染
  if (value === null) return ''
  
  // undefined 不渲染
  if (value === undefined) return ''
  
  // false 不渲染（除非是 aria-* 或 data-*）
  if (value === false) return ''
  
  // true 只渲染属性名
  if (value === true) {
    return ` ${key}`
  }
  
  // 对象序列化
  if (typeof value === 'object') {
    return ` ${key}="${escapeHtml(JSON.stringify(value))}"`
  }
  
  // 其他值
  return ` ${key}="${escapeHtml(String(value))}"`
}
```

## 属性分发

```typescript
/**
 * 根据类别渲染属性
 */
function renderAttrByCategory(
  key: string,
  value: any,
  category: AttrCategory,
  tag: string
): string {
  switch (category) {
    case 'skip':
      return ''
    case 'boolean':
      return renderBooleanAttr(key, value)
    case 'enumerated':
      return renderEnumeratedAttr(key, value)
    case 'class':
      return renderClassAttr(value)
    case 'style':
      return renderStyleAttr(value)
    case 'data':
      return renderDataAttr(key, value)
    case 'aria':
      return renderAriaAttr(key, value)
    case 'svg':
      return renderSVGAttr(key, value)
    case 'normal':
    default:
      return renderNormalAttr(key, value)
  }
}
```

## 使用示例

```typescript
// 测试属性渲染

// 基本属性
renderAttrs({ id: 'app', title: 'Hello' }, 'div')
// 输出: ' id="app" title="Hello"'

// 布尔属性
renderAttrs({ disabled: true, readonly: false }, 'input')
// 输出: ' disabled'

// Class
renderAttrs({ class: ['a', { b: true, c: false }] }, 'div')
// 输出: ' class="a b"'

// Style
renderAttrs({
  style: { color: 'red', fontSize: 16 }
}, 'div')
// 输出: ' style="color: red; font-size: 16px"'

// SVG
renderAttrs({
  viewBox: '0 0 100 100',
  strokeWidth: 2,
  fillOpacity: 0.5
}, 'svg', { namespace: 'svg' })
// 输出: ' viewBox="0 0 100 100" stroke-width="2" fill-opacity="0.5"'

// Data 和 Aria
renderAttrs({
  'data-id': 123,
  'aria-label': 'Button'
}, 'button')
// 输出: ' data-id="123" aria-label="Button"'
```

## 小结

本章实现了完整的属性渲染系统：

1. **属性分类**：准确识别属性类型
2. **布尔属性**：正确处理各种布尔属性
3. **可枚举属性**：标准化处理特殊属性
4. **Class 处理**：支持字符串、数组、对象
5. **Style 处理**：驼峰转换、自动添加单位
6. **SVG 属性**：保持正确的命名格式
7. **Data/Aria**：符合规范的处理

属性渲染是 SSR 中容易出错的地方，需要仔细处理各种边界情况。
