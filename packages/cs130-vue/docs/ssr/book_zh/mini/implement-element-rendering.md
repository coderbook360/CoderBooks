# 实现元素渲染

本章深入元素渲染的细节，完善各种边界情况的处理，构建一个健壮的元素渲染器。

## 完整的元素渲染器

在基础版本上，我们需要处理更多细节：innerHTML、危险内容、特殊标签等。

```typescript
// src/server/render-element.ts

import { VNode, ShapeFlags, SSRContext } from '../shared'
import { escapeHtml, renderChildren } from './render'

// 自闭合标签
const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr'
])

// 原始文本标签（内容不转义）
const RAW_TEXT_TAGS = new Set(['script', 'style', 'textarea'])

// 需要特殊处理的标签
const SPECIAL_TAGS = new Set(['svg', 'math'])

/**
 * 渲染元素节点
 */
export async function renderElementVNode(
  vnode: VNode,
  context: SSRContext,
  parentNamespace?: string
): Promise<string> {
  const tag = vnode.type as string
  const { props, children, shapeFlag } = vnode
  
  // 确定命名空间
  const namespace = getNamespace(tag, parentNamespace)
  
  // 开始标签
  let html = `<${tag}`
  
  // 渲染属性
  if (props) {
    html += renderElementProps(props, tag, namespace)
  }
  
  // 自闭合标签
  if (VOID_TAGS.has(tag)) {
    return namespace === 'svg' || namespace === 'math'
      ? html + '/>'
      : html + '>'
  }
  
  html += '>'
  
  // 渲染内容
  html += await renderElementContent(
    vnode,
    children,
    shapeFlag,
    tag,
    context,
    namespace
  )
  
  // 结束标签
  html += `</${tag}>`
  
  return html
}

/**
 * 获取命名空间
 */
function getNamespace(tag: string, parentNamespace?: string): string | undefined {
  if (tag === 'svg') return 'svg'
  if (tag === 'math') return 'math'
  return parentNamespace
}
```

## 元素内容渲染

元素内容需要根据不同情况进行处理。innerHTML 需要特别小心，因为它涉及安全问题。

```typescript
/**
 * 渲染元素内容
 */
async function renderElementContent(
  vnode: VNode,
  children: any,
  shapeFlag: number,
  tag: string,
  context: SSRContext,
  namespace?: string
): Promise<string> {
  const { props } = vnode
  
  // 优先处理 innerHTML
  if (props?.innerHTML) {
    // 警告：innerHTML 存在 XSS 风险
    return props.innerHTML
  }
  
  // 处理 textContent
  if (props?.textContent) {
    // 对于非原始文本标签，需要转义
    if (RAW_TEXT_TAGS.has(tag)) {
      return props.textContent
    }
    return escapeHtml(props.textContent)
  }
  
  // 空内容
  if (children == null) {
    return ''
  }
  
  // 原始文本标签
  if (RAW_TEXT_TAGS.has(tag)) {
    return renderRawTextContent(children, tag)
  }
  
  // 文本子节点
  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    return escapeHtml(String(children))
  }
  
  // 数组子节点
  if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    return renderChildrenArray(children, context, namespace)
  }
  
  // 其他情况
  return renderChildren(children, context)
}

/**
 * 渲染原始文本内容
 */
function renderRawTextContent(children: any, tag: string): string {
  const content = String(children)
  
  // script 标签需要防止提前关闭
  if (tag === 'script') {
    return content.replace(/<\/script/gi, '<\\/script')
  }
  
  // style 标签需要防止提前关闭
  if (tag === 'style') {
    return content.replace(/<\/style/gi, '<\\/style')
  }
  
  return content
}

/**
 * 渲染子节点数组
 */
async function renderChildrenArray(
  children: VNode[],
  context: SSRContext,
  namespace?: string
): Promise<string> {
  const results: string[] = []
  
  for (const child of children) {
    if (child == null) continue
    
    // 文本节点
    if (typeof child === 'string' || typeof child === 'number') {
      results.push(escapeHtml(String(child)))
      continue
    }
    
    // VNode
    if (isVNode(child)) {
      // 传递命名空间
      const html = await renderVNodeWithNamespace(child, context, namespace)
      results.push(html)
    }
  }
  
  return results.join('')
}
```

## 完整的属性渲染

属性渲染需要处理多种特殊情况。

```typescript
/**
 * 渲染元素属性
 */
function renderElementProps(
  props: Record<string, any>,
  tag: string,
  namespace?: string
): string {
  let html = ''
  
  // 按照特定顺序渲染属性（可选优化）
  const propsOrder = ['id', 'class', 'style']
  const orderedKeys = [
    ...propsOrder.filter(k => k in props),
    ...Object.keys(props).filter(k => !propsOrder.includes(k))
  ]
  
  for (const key of orderedKeys) {
    const value = props[key]
    
    // 跳过特殊属性
    if (shouldSkipProp(key, value)) continue
    
    // 渲染属性
    html += renderProp(key, value, tag, namespace)
  }
  
  return html
}

/**
 * 是否跳过属性
 */
function shouldSkipProp(key: string, value: any): boolean {
  // 保留属性
  if (key === 'key' || key === 'ref') return true
  
  // v- 开头的指令
  if (key.startsWith('v-')) return true
  
  // 事件处理器
  if (key.startsWith('on') && key.length > 2) return true
  
  // innerHTML 和 textContent 单独处理
  if (key === 'innerHTML' || key === 'textContent') return true
  
  // undefined 和 null
  if (value === undefined || value === null) return true
  
  return false
}

/**
 * 渲染单个属性
 */
function renderProp(
  key: string,
  value: any,
  tag: string,
  namespace?: string
): string {
  // class 属性
  if (key === 'class' || key === 'className') {
    return renderClassProp(value)
  }
  
  // style 属性
  if (key === 'style') {
    return renderStyleProp(value)
  }
  
  // 布尔属性
  if (isBooleanAttr(key, tag)) {
    return renderBooleanAttr(key, value)
  }
  
  // 可枚举属性（如 contenteditable）
  if (isEnumeratedAttr(key)) {
    return renderEnumeratedAttr(key, value)
  }
  
  // SVG 属性
  if (namespace === 'svg') {
    return renderSVGAttr(key, value)
  }
  
  // 普通属性
  return renderNormalAttr(key, value)
}
```

## 特殊属性处理

```typescript
// 布尔属性
const BOOLEAN_ATTRS = new Set([
  'allowfullscreen', 'async', 'autofocus', 'autoplay', 'checked',
  'controls', 'default', 'defer', 'disabled', 'formnovalidate',
  'hidden', 'inert', 'ismap', 'itemscope', 'loop', 'multiple',
  'muted', 'nomodule', 'novalidate', 'open', 'playsinline',
  'readonly', 'required', 'reversed', 'selected', 'truespeed'
])

// 特定标签的布尔属性
const TAG_BOOLEAN_ATTRS: Record<string, Set<string>> = {
  input: new Set(['checked', 'disabled', 'readonly', 'required']),
  select: new Set(['disabled', 'multiple', 'required']),
  textarea: new Set(['disabled', 'readonly', 'required']),
  button: new Set(['disabled', 'formnovalidate']),
  option: new Set(['disabled', 'selected']),
  optgroup: new Set(['disabled']),
  fieldset: new Set(['disabled']),
  video: new Set(['autoplay', 'controls', 'loop', 'muted', 'playsinline']),
  audio: new Set(['autoplay', 'controls', 'loop', 'muted']),
  img: new Set(['ismap']),
  script: new Set(['async', 'defer', 'nomodule']),
  iframe: new Set(['allowfullscreen'])
}

/**
 * 判断是否为布尔属性
 */
function isBooleanAttr(key: string, tag: string): boolean {
  if (BOOLEAN_ATTRS.has(key)) return true
  const tagAttrs = TAG_BOOLEAN_ATTRS[tag]
  return tagAttrs ? tagAttrs.has(key) : false
}

/**
 * 渲染布尔属性
 */
function renderBooleanAttr(key: string, value: any): string {
  // false、null、undefined 不渲染
  if (value === false || value == null) return ''
  // 其他真值渲染属性名
  return ` ${key}`
}

// 可枚举属性
const ENUMERATED_ATTRS = new Set([
  'contenteditable', 'draggable', 'spellcheck', 'autocapitalize',
  'translate', 'inputmode'
])

/**
 * 判断是否为可枚举属性
 */
function isEnumeratedAttr(key: string): boolean {
  return ENUMERATED_ATTRS.has(key)
}

/**
 * 渲染可枚举属性
 */
function renderEnumeratedAttr(key: string, value: any): string {
  // 特殊处理 contenteditable
  if (key === 'contenteditable') {
    if (value === '' || value === true) return ` contenteditable="true"`
    if (value === false) return ` contenteditable="false"`
    if (value === 'inherit') return ` contenteditable="inherit"`
    return ` contenteditable="${escapeHtml(String(value))}"`
  }
  
  // 通用处理
  if (value === true) return ` ${key}="true"`
  if (value === false) return ` ${key}="false"`
  return ` ${key}="${escapeHtml(String(value))}"`
}
```

## Class 处理

```typescript
/**
 * 渲染 class 属性
 */
function renderClassProp(value: any): string {
  const normalized = normalizeClass(value)
  if (!normalized) return ''
  return ` class="${escapeHtml(normalized)}"`
}

/**
 * 标准化 class
 */
function normalizeClass(value: any): string {
  if (!value) return ''
  
  if (typeof value === 'string') {
    return value.trim()
  }
  
  if (Array.isArray(value)) {
    const classes: string[] = []
    for (const item of value) {
      const normalized = normalizeClass(item)
      if (normalized) classes.push(normalized)
    }
    return classes.join(' ')
  }
  
  if (typeof value === 'object') {
    const classes: string[] = []
    for (const [key, active] of Object.entries(value)) {
      if (active) classes.push(key)
    }
    return classes.join(' ')
  }
  
  return String(value)
}
```

## Style 处理

```typescript
// 数值类型的 CSS 属性需要自动添加 px
const CSS_NUMBER_PROPS = new Set([
  'animation-iteration-count', 'border-image-outset', 'border-image-slice',
  'border-image-width', 'box-flex', 'box-flex-group', 'box-ordinal-group',
  'column-count', 'columns', 'flex', 'flex-grow', 'flex-positive',
  'flex-shrink', 'flex-negative', 'flex-order', 'grid-row', 'grid-row-end',
  'grid-row-span', 'grid-row-start', 'grid-column', 'grid-column-end',
  'grid-column-span', 'grid-column-start', 'font-weight', 'line-clamp',
  'line-height', 'opacity', 'order', 'orphans', 'tab-size', 'widows',
  'z-index', 'zoom', 'fill-opacity', 'flood-opacity', 'stop-opacity',
  'stroke-dasharray', 'stroke-dashoffset', 'stroke-miterlimit',
  'stroke-opacity', 'stroke-width'
])

/**
 * 渲染 style 属性
 */
function renderStyleProp(value: any): string {
  const normalized = normalizeStyle(value)
  if (!normalized) return ''
  return ` style="${escapeHtml(normalized)}"`
}

/**
 * 标准化 style
 */
function normalizeStyle(value: any): string {
  if (!value) return ''
  
  if (typeof value === 'string') {
    return value.trim()
  }
  
  if (Array.isArray(value)) {
    const styles: string[] = []
    for (const item of value) {
      const normalized = normalizeStyle(item)
      if (normalized) styles.push(normalized)
    }
    return styles.join('; ')
  }
  
  if (typeof value === 'object') {
    const declarations: string[] = []
    
    for (const [key, val] of Object.entries(value)) {
      if (val == null || val === '') continue
      
      // 转换驼峰为连字符
      const prop = hyphenate(key)
      
      // 处理值
      const cssValue = formatStyleValue(prop, val)
      
      declarations.push(`${prop}: ${cssValue}`)
    }
    
    return declarations.join('; ')
  }
  
  return ''
}

/**
 * 驼峰转连字符
 */
function hyphenate(str: string): string {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase()
}

/**
 * 格式化样式值
 */
function formatStyleValue(prop: string, value: any): string {
  if (typeof value === 'number') {
    // 0 不需要单位
    if (value === 0) return '0'
    // 无单位属性
    if (CSS_NUMBER_PROPS.has(prop)) return String(value)
    // 自动添加 px
    return `${value}px`
  }
  
  return String(value)
}
```

## SVG 属性

SVG 属性需要特殊处理，因为它们是大小写敏感的。

```typescript
// SVG 属性名映射
const SVG_ATTRS: Record<string, string> = {
  'xlink:href': 'xlink:href',
  'xlink:actuate': 'xlink:actuate',
  'xlink:arcrole': 'xlink:arcrole',
  'xlink:role': 'xlink:role',
  'xlink:show': 'xlink:show',
  'xlink:title': 'xlink:title',
  'xlink:type': 'xlink:type',
  'xml:base': 'xml:base',
  'xml:lang': 'xml:lang',
  'xml:space': 'xml:space',
  // 驼峰到连字符映射
  viewBox: 'viewBox',
  preserveAspectRatio: 'preserveAspectRatio',
  strokeWidth: 'stroke-width',
  strokeLinecap: 'stroke-linecap',
  strokeLinejoin: 'stroke-linejoin',
  strokeDasharray: 'stroke-dasharray',
  strokeDashoffset: 'stroke-dashoffset',
  fillOpacity: 'fill-opacity',
  strokeOpacity: 'stroke-opacity'
}

/**
 * 渲染 SVG 属性
 */
function renderSVGAttr(key: string, value: any): string {
  // 查找正确的属性名
  const attrName = SVG_ATTRS[key] || hyphenate(key)
  
  if (value === true) {
    return ` ${attrName}`
  }
  
  if (value === false || value == null) {
    return ''
  }
  
  return ` ${attrName}="${escapeHtml(String(value))}"`
}

/**
 * 渲染普通属性
 */
function renderNormalAttr(key: string, value: any): string {
  if (value === true) {
    return ` ${key}`
  }
  
  if (value === false || value == null) {
    return ''
  }
  
  // 数据属性保持原样
  if (key.startsWith('data-') || key.startsWith('aria-')) {
    return ` ${key}="${escapeHtml(String(value))}"`
  }
  
  return ` ${hyphenate(key)}="${escapeHtml(String(value))}"`
}
```

## 表单元素处理

表单元素有特殊的值处理逻辑。

```typescript
/**
 * 处理表单元素
 */
function handleFormElement(
  tag: string,
  props: Record<string, any>
): Record<string, any> {
  const result = { ...props }
  
  // input 元素
  if (tag === 'input') {
    const type = props.type || 'text'
    
    // checkbox 和 radio 的 checked 属性
    if (type === 'checkbox' || type === 'radio') {
      if ('checked' in props) {
        result.checked = !!props.checked
      }
    }
    
    // value 属性
    if ('value' in props && props.value != null) {
      result.value = String(props.value)
    }
  }
  
  // select 元素
  if (tag === 'select') {
    // select 的 value 需要在 option 上处理
    delete result.value
  }
  
  // textarea 元素
  if (tag === 'textarea') {
    // textarea 的 value 作为内容
    delete result.value
  }
  
  return result
}

/**
 * 渲染 textarea 内容
 */
function renderTextareaContent(props: Record<string, any>): string {
  // 优先使用 value
  if ('value' in props) {
    return escapeHtml(String(props.value))
  }
  // 其次使用 defaultValue
  if ('defaultValue' in props) {
    return escapeHtml(String(props.defaultValue))
  }
  return ''
}
```

## 使用示例

```typescript
// 测试元素渲染

// 复杂 class
const classVNode = {
  type: 'div',
  props: {
    class: ['container', { active: true, disabled: false }]
  },
  children: null,
  shapeFlag: ShapeFlags.ELEMENT
}
// 输出: <div class="container active"></div>

// 复杂 style
const styleVNode = {
  type: 'div',
  props: {
    style: {
      color: 'red',
      fontSize: 16,
      marginTop: 0
    }
  },
  children: null,
  shapeFlag: ShapeFlags.ELEMENT
}
// 输出: <div style="color: red; font-size: 16px; margin-top: 0"></div>

// SVG 元素
const svgVNode = {
  type: 'svg',
  props: {
    viewBox: '0 0 100 100',
    strokeWidth: 2
  },
  children: [{
    type: 'circle',
    props: { cx: 50, cy: 50, r: 40 },
    children: null,
    shapeFlag: ShapeFlags.ELEMENT
  }],
  shapeFlag: ShapeFlags.ELEMENT | ShapeFlags.ARRAY_CHILDREN
}
// 输出: <svg viewBox="0 0 100 100" stroke-width="2"><circle cx="50" cy="50" r="40"/></svg>
```

## 小结

本章完善了元素渲染的各个细节：

1. **命名空间处理**：SVG 和 MathML
2. **内容渲染**：innerHTML、textContent、原始文本
3. **属性分类**：布尔属性、可枚举属性、普通属性
4. **Class 标准化**：字符串、数组、对象
5. **Style 标准化**：驼峰转换、自动添加 px
6. **SVG 属性**：大小写敏感处理
7. **表单元素**：value、checked 等特殊处理

下一章将继续完善属性渲染的边界情况。
