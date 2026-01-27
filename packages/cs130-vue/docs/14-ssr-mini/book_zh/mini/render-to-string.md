# renderToString 实现

`renderToString` 是服务端渲染的核心函数，将 VNode 树递归转换为 HTML 字符串。

## 基础结构

```typescript
// src/server/render.ts

import { 
  VNode, 
  VNodeType,
  Text,
  Fragment,
  Component,
  isElementVNode,
  isTextVNode,
  isComponentVNode,
  isFragmentVNode,
  isArrayChildren,
  isTextChildren
} from '../shared/vnode'

export async function renderToString(vnode: VNode): Promise<string> {
  return renderVNode(vnode)
}

function renderVNode(vnode: VNode): string {
  // 根据类型分发
  if (isTextVNode(vnode)) {
    return renderText(vnode)
  }
  
  if (isElementVNode(vnode)) {
    return renderElement(vnode)
  }
  
  if (isComponentVNode(vnode)) {
    return renderComponent(vnode)
  }
  
  if (isFragmentVNode(vnode)) {
    return renderFragment(vnode)
  }
  
  return ''
}
```

## 文本渲染

```typescript
function renderText(vnode: VNode): string {
  const text = vnode.children as string
  return escapeHtml(text)
}

// HTML 转义
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}
```

## 元素渲染

```typescript
// 自闭合标签
const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 
  'img', 'input', 'link', 'meta', 'param', 
  'source', 'track', 'wbr'
])

function renderElement(vnode: VNode): string {
  const tag = vnode.type as string
  
  // 渲染开标签
  let html = `<${tag}`
  
  // 渲染属性
  if (vnode.props) {
    html += renderProps(vnode.props)
  }
  
  // 自闭合标签
  if (VOID_TAGS.has(tag)) {
    return html + '>'
  }
  
  html += '>'
  
  // 渲染子节点
  html += renderChildren(vnode)
  
  // 闭标签
  html += `</${tag}>`
  
  return html
}
```

## 属性渲染

```typescript
function renderProps(props: Record<string, any>): string {
  let result = ''
  
  for (const key in props) {
    const value = props[key]
    
    // 跳过事件和特殊属性
    if (key.startsWith('on') || key === 'ref' || key === 'key') {
      continue
    }
    
    result += renderAttr(key, value)
  }
  
  return result
}

function renderAttr(key: string, value: any): string {
  // 布尔属性
  if (typeof value === 'boolean') {
    return value ? ` ${key}` : ''
  }
  
  // null/undefined
  if (value === null || value === undefined) {
    return ''
  }
  
  // class 特殊处理
  if (key === 'class') {
    const classValue = normalizeClass(value)
    return classValue ? ` class="${escapeHtml(classValue)}"` : ''
  }
  
  // style 特殊处理
  if (key === 'style') {
    const styleValue = normalizeStyle(value)
    return styleValue ? ` style="${escapeHtml(styleValue)}"` : ''
  }
  
  // innerHTML/textContent
  if (key === 'innerHTML' || key === 'textContent') {
    return ''  // 在 children 中处理
  }
  
  // 普通属性
  return ` ${key}="${escapeHtml(String(value))}"`
}

// 规范化 class
function normalizeClass(value: any): string {
  if (typeof value === 'string') {
    return value
  }
  
  if (Array.isArray(value)) {
    return value.map(normalizeClass).filter(Boolean).join(' ')
  }
  
  if (typeof value === 'object' && value !== null) {
    return Object.entries(value)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(' ')
  }
  
  return ''
}

// 规范化 style
function normalizeStyle(value: any): string {
  if (typeof value === 'string') {
    return value
  }
  
  if (typeof value === 'object' && value !== null) {
    return Object.entries(value)
      .filter(([, v]) => v !== null && v !== undefined && v !== '')
      .map(([key, val]) => `${toKebabCase(key)}: ${val}`)
      .join('; ')
  }
  
  return ''
}

function toKebabCase(str: string): string {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase()
}
```

## 子节点渲染

```typescript
function renderChildren(vnode: VNode): string {
  const { children, props } = vnode
  
  // innerHTML 优先
  if (props?.innerHTML) {
    return props.innerHTML
  }
  
  // textContent
  if (props?.textContent) {
    return escapeHtml(String(props.textContent))
  }
  
  // 无子节点
  if (children === null) {
    return ''
  }
  
  // 文本子节点
  if (typeof children === 'string') {
    return escapeHtml(children)
  }
  
  // 数组子节点
  if (Array.isArray(children)) {
    return children.map(renderVNode).join('')
  }
  
  return ''
}
```

## 组件渲染

```typescript
function renderComponent(vnode: VNode): string {
  const component = vnode.type as Component
  const props = vnode.props || {}
  
  // 创建渲染上下文
  const context: RenderContext = {
    slots: createSlots(vnode.children),
    emit: () => {}  // SSR 中事件不生效
  }
  
  let result: VNode
  
  // 有 setup
  if (component.setup) {
    const setupResult = component.setup(props)
    
    if (typeof setupResult === 'function') {
      // setup 返回渲染函数
      result = setupResult()
    } else {
      // setup 返回状态对象
      result = component.render(props, context)
    }
  } else {
    // 直接调用 render
    result = component.render(props, context)
  }
  
  // 递归渲染子树
  return renderVNode(result)
}

// 创建 slots
function createSlots(children: VNodeChildren): Record<string, () => VNode[]> {
  if (!children) {
    return {}
  }
  
  // 简化处理：只支持默认 slot
  if (typeof children === 'string') {
    return {
      default: () => [createTextVNode(children)]
    }
  }
  
  if (Array.isArray(children)) {
    return {
      default: () => children
    }
  }
  
  return {}
}

function createTextVNode(text: string): VNode {
  return {
    type: Text,
    props: null,
    children: text,
    shapeFlag: VNodeType.TEXT,
    el: null,
    component: null,
    key: null
  }
}
```

## Fragment 渲染

```typescript
function renderFragment(vnode: VNode): string {
  const children = vnode.children
  
  if (!children || !Array.isArray(children)) {
    return ''
  }
  
  return children.map(renderVNode).join('')
}
```

## 完整实现

```typescript
// src/server/render.ts

import { 
  VNode, 
  VNodeType, 
  Text, 
  Fragment, 
  Component,
  VNodeProps,
  VNodeChildren
} from '../shared/vnode'

const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 
  'img', 'input', 'link', 'meta', 'param', 
  'source', 'track', 'wbr'
])

export async function renderToString(vnode: VNode): Promise<string> {
  return render(vnode)
}

function render(vnode: VNode): string {
  const { type, props, children, shapeFlag } = vnode
  
  // 文本
  if (shapeFlag & VNodeType.TEXT) {
    return escapeHtml(children as string)
  }
  
  // Fragment
  if (shapeFlag & VNodeType.FRAGMENT) {
    return renderChildren(children)
  }
  
  // 组件
  if (shapeFlag & VNodeType.COMPONENT) {
    return renderComponent(vnode)
  }
  
  // 元素
  if (shapeFlag & VNodeType.ELEMENT) {
    const tag = type as string
    let html = `<${tag}`
    
    if (props) {
      html += renderProps(props)
    }
    
    if (VOID_TAGS.has(tag)) {
      return html + '>'
    }
    
    html += '>'
    
    if (props?.innerHTML) {
      html += props.innerHTML
    } else {
      html += renderChildren(children)
    }
    
    return html + `</${tag}>`
  }
  
  return ''
}

function renderChildren(children: VNodeChildren): string {
  if (children === null) return ''
  if (typeof children === 'string') return escapeHtml(children)
  if (Array.isArray(children)) return children.map(render).join('')
  return ''
}

function renderProps(props: VNodeProps): string {
  let result = ''
  
  for (const key in props) {
    if (key.startsWith('on') || key === 'ref' || key === 'key') continue
    if (key === 'innerHTML' || key === 'textContent') continue
    
    const value = props[key]
    
    if (value === false || value === null || value === undefined) continue
    
    if (value === true) {
      result += ` ${key}`
    } else if (key === 'class') {
      const cls = normalizeClass(value)
      if (cls) result += ` class="${escapeHtml(cls)}"`
    } else if (key === 'style') {
      const style = normalizeStyle(value)
      if (style) result += ` style="${escapeHtml(style)}"`
    } else {
      result += ` ${key}="${escapeHtml(String(value))}"`
    }
  }
  
  return result
}

function renderComponent(vnode: VNode): string {
  const comp = vnode.type as Component
  const props = vnode.props || {}
  
  const context = {
    slots: {
      default: () => {
        if (!vnode.children) return []
        if (typeof vnode.children === 'string') {
          return [{ type: Text, props: null, children: vnode.children, shapeFlag: VNodeType.TEXT }]
        }
        return vnode.children as VNode[]
      }
    },
    emit: () => {}
  }
  
  let subTree: VNode
  
  if (comp.setup) {
    const result = comp.setup(props)
    subTree = typeof result === 'function' ? result() : comp.render(props, context)
  } else {
    subTree = comp.render(props, context)
  }
  
  return render(subTree)
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

function normalizeClass(value: any): string {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(normalizeClass).filter(Boolean).join(' ')
  if (typeof value === 'object') {
    return Object.entries(value).filter(([,v]) => v).map(([k]) => k).join(' ')
  }
  return ''
}

function normalizeStyle(value: any): string {
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    return Object.entries(value)
      .filter(([,v]) => v != null && v !== '')
      .map(([k,v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${v}`)
      .join('; ')
  }
  return ''
}
```

## 使用示例

```typescript
import { h } from '../shared/h'
import { renderToString } from './render'

// 简单元素
const html1 = await renderToString(
  h('div', { class: 'container' }, 'Hello World')
)
// <div class="container">Hello World</div>

// 嵌套结构
const html2 = await renderToString(
  h('div', { class: 'card' }, [
    h('h2', null, 'Title'),
    h('p', null, 'Content')
  ])
)
// <div class="card"><h2>Title</h2><p>Content</p></div>

// 组件
const Button = {
  render(props: any) {
    return h('button', { class: 'btn', disabled: props.disabled }, props.text)
  }
}

const html3 = await renderToString(
  h(Button, { text: 'Click', disabled: true })
)
// <button class="btn" disabled>Click</button>
```

## 小结

`renderToString` 的核心流程：

1. **类型分发**：根据 VNode 类型选择渲染方法
2. **元素渲染**：开标签 + 属性 + 子节点 + 闭标签
3. **属性处理**：转义、规范化 class/style
4. **组件渲染**：执行 render 获取子树，递归渲染
5. **HTML 转义**：防止 XSS

下一章我们将实现流式渲染。
