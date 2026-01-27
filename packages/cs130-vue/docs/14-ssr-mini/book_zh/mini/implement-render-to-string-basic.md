# 实现基础 renderToString

本章实现 Mini SSR 的核心功能——将虚拟 DOM 渲染为 HTML 字符串。我们从最简单的版本开始，逐步完善。

## 基本架构

renderToString 的核心任务是递归遍历 VNode 树，为每个节点生成对应的 HTML 字符串。这个过程需要处理多种节点类型，包括元素、文本、组件和 Fragment。

```typescript
// src/server/render.ts

import {
  VNode,
  VNodeType,
  Text,
  Comment,
  Fragment,
  ShapeFlags,
  SSRContext,
  createSSRContext
} from '../shared'

/**
 * 将 VNode 渲染为 HTML 字符串
 */
export async function renderToString(
  vnode: VNode,
  context?: SSRContext
): Promise<string> {
  // 创建默认上下文
  const ctx = context || createSSRContext()
  
  try {
    // 渲染 VNode 树
    const html = await renderVNode(vnode, ctx)
    return html
  } catch (error) {
    ctx.errors.push(error as Error)
    throw error
  }
}
```

## 核心渲染函数

renderVNode 是整个渲染过程的入口点，它根据节点类型分发到不同的处理函数。

```typescript
/**
 * 渲染单个 VNode
 */
async function renderVNode(
  vnode: VNode,
  context: SSRContext
): Promise<string> {
  const { type, shapeFlag } = vnode
  
  // 文本节点
  if (type === Text) {
    return renderTextVNode(vnode)
  }
  
  // 注释节点
  if (type === Comment) {
    return renderCommentVNode(vnode)
  }
  
  // Fragment
  if (type === Fragment) {
    return renderFragmentVNode(vnode, context)
  }
  
  // 元素节点
  if (shapeFlag & ShapeFlags.ELEMENT) {
    return renderElementVNode(vnode, context)
  }
  
  // 组件节点
  if (shapeFlag & ShapeFlags.COMPONENT) {
    return renderComponentVNode(vnode, context)
  }
  
  // 未知类型
  console.warn(`Unknown vnode type: ${String(type)}`)
  return ''
}
```

## 文本与注释

文本节点和注释节点的渲染最为简单，只需进行 HTML 转义处理。

```typescript
/**
 * 渲染文本节点
 */
function renderTextVNode(vnode: VNode): string {
  const text = String(vnode.children ?? '')
  return escapeHtml(text)
}

/**
 * 渲染注释节点
 */
function renderCommentVNode(vnode: VNode): string {
  const text = String(vnode.children ?? '')
  return `<!--${escapeHtmlComment(text)}-->`
}

/**
 * HTML 转义
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }
  return text.replace(/[&<>"']/g, char => map[char])
}

/**
 * 注释内容转义
 */
function escapeHtmlComment(text: string): string {
  // 注释中不能包含 -- 序列
  return text.replace(/--/g, '- -')
}
```

## Fragment 渲染

Fragment 本身不产生 HTML 标签，只渲染其子节点。

```typescript
/**
 * 渲染 Fragment
 */
async function renderFragmentVNode(
  vnode: VNode,
  context: SSRContext
): Promise<string> {
  return renderChildren(vnode.children, context)
}

/**
 * 渲染子节点
 */
async function renderChildren(
  children: any,
  context: SSRContext
): Promise<string> {
  if (children == null) {
    return ''
  }
  
  // 文本子节点
  if (typeof children === 'string') {
    return escapeHtml(children)
  }
  
  if (typeof children === 'number') {
    return escapeHtml(String(children))
  }
  
  // 布尔值不渲染
  if (typeof children === 'boolean') {
    return ''
  }
  
  // 单个 VNode
  if (isVNode(children)) {
    return renderVNode(children, context)
  }
  
  // VNode 数组
  if (Array.isArray(children)) {
    const results = await Promise.all(
      children.map(child => renderChildren(child, context))
    )
    return results.join('')
  }
  
  return ''
}

/**
 * 判断是否为 VNode
 */
function isVNode(value: any): value is VNode {
  return value && typeof value === 'object' && 'type' in value && 'shapeFlag' in value
}
```

## 元素渲染

元素节点的渲染需要处理标签、属性和子节点。

```typescript
// 自闭合标签
const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr'
])

/**
 * 渲染元素节点
 */
async function renderElementVNode(
  vnode: VNode,
  context: SSRContext
): Promise<string> {
  const tag = vnode.type as string
  const { props, children } = vnode
  
  // 开始标签
  let html = `<${tag}`
  
  // 渲染属性
  if (props) {
    html += renderProps(props, tag)
  }
  
  // 自闭合标签
  if (VOID_TAGS.has(tag)) {
    return html + '/>'
  }
  
  html += '>'
  
  // 渲染子节点
  if (children != null) {
    // 对于特殊标签，内容不转义
    if (tag === 'script' || tag === 'style') {
      html += String(children)
    } else {
      html += await renderChildren(children, context)
    }
  }
  
  // 结束标签
  html += `</${tag}>`
  
  return html
}
```

## 属性渲染

属性渲染需要处理多种情况，包括布尔属性、样式、类名等。

```typescript
/**
 * 渲染属性
 */
function renderProps(
  props: Record<string, any>,
  tag: string
): string {
  let html = ''
  
  for (const key in props) {
    const value = props[key]
    
    // 跳过保留属性
    if (isReservedProp(key)) continue
    
    // 跳过事件
    if (key.startsWith('on')) continue
    
    // 渲染属性
    html += renderAttr(key, value, tag)
  }
  
  return html
}

/**
 * 保留属性检查
 */
function isReservedProp(key: string): boolean {
  return key === 'key' || key === 'ref' || key.startsWith('v-')
}

/**
 * 渲染单个属性
 */
function renderAttr(
  key: string,
  value: any,
  tag: string
): string {
  // class 属性
  if (key === 'class') {
    return renderClass(value)
  }
  
  // style 属性
  if (key === 'style') {
    return renderStyle(value)
  }
  
  // 布尔属性
  if (isBooleanAttr(key)) {
    return value ? ` ${key}` : ''
  }
  
  // 普通属性
  if (value == null || value === false) {
    return ''
  }
  
  if (value === true) {
    return ` ${key}`
  }
  
  return ` ${key}="${escapeHtml(String(value))}"`
}

// 布尔属性列表
const BOOLEAN_ATTRS = new Set([
  'async', 'autofocus', 'autoplay', 'checked', 'controls',
  'default', 'defer', 'disabled', 'hidden', 'loop', 'multiple',
  'muted', 'open', 'readonly', 'required', 'reversed', 'selected'
])

function isBooleanAttr(key: string): boolean {
  return BOOLEAN_ATTRS.has(key)
}
```

## Class 渲染

class 属性支持多种格式，包括字符串、数组和对象。

```typescript
/**
 * 渲染 class 属性
 */
function renderClass(value: any): string {
  const className = normalizeClass(value)
  if (!className) return ''
  return ` class="${escapeHtml(className)}"`
}

/**
 * 标准化 class
 */
function normalizeClass(value: any): string {
  if (!value) return ''
  
  // 字符串
  if (typeof value === 'string') {
    return value.trim()
  }
  
  // 数组
  if (Array.isArray(value)) {
    return value
      .map(normalizeClass)
      .filter(Boolean)
      .join(' ')
  }
  
  // 对象
  if (typeof value === 'object') {
    return Object.entries(value)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(' ')
  }
  
  return ''
}
```

## Style 渲染

style 属性同样支持字符串和对象格式。

```typescript
/**
 * 渲染 style 属性
 */
function renderStyle(value: any): string {
  const style = normalizeStyle(value)
  if (!style) return ''
  return ` style="${escapeHtml(style)}"`
}

/**
 * 标准化 style
 */
function normalizeStyle(value: any): string {
  if (!value) return ''
  
  // 字符串
  if (typeof value === 'string') {
    return value.trim()
  }
  
  // 数组
  if (Array.isArray(value)) {
    return value
      .map(normalizeStyle)
      .filter(Boolean)
      .join('; ')
  }
  
  // 对象
  if (typeof value === 'object') {
    return Object.entries(value)
      .filter(([, v]) => v != null && v !== '')
      .map(([k, v]) => {
        // 驼峰转连字符
        const prop = k.replace(/([A-Z])/g, '-$1').toLowerCase()
        // 自动添加 px
        const val = typeof v === 'number' ? `${v}px` : v
        return `${prop}: ${val}`
      })
      .join('; ')
  }
  
  return ''
}
```

## 基础组件渲染

组件渲染需要实例化组件并执行其 render 函数。

```typescript
/**
 * 渲染组件节点
 */
async function renderComponentVNode(
  vnode: VNode,
  context: SSRContext
): Promise<string> {
  const Component = vnode.type as any
  
  // 函数组件
  if (typeof Component === 'function') {
    return renderFunctionalComponent(vnode, context)
  }
  
  // 有状态组件
  return renderStatefulComponent(vnode, context)
}

/**
 * 渲染函数组件
 */
async function renderFunctionalComponent(
  vnode: VNode,
  context: SSRContext
): Promise<string> {
  const Component = vnode.type as Function
  const props = vnode.props || {}
  
  // 调用函数组件
  const result = Component(props, {
    slots: {},
    attrs: {},
    emit: () => {}
  })
  
  if (!result) return ''
  
  return renderVNode(result, context)
}

/**
 * 渲染有状态组件
 */
async function renderStatefulComponent(
  vnode: VNode,
  context: SSRContext
): Promise<string> {
  const Component = vnode.type as any
  const props = vnode.props || {}
  
  // 创建组件实例（简化版）
  const instance = createComponentInstance(vnode)
  
  // 执行 setup
  if (Component.setup) {
    const setupResult = Component.setup(props, {
      attrs: {},
      slots: {},
      emit: () => {},
      expose: () => {}
    })
    
    if (typeof setupResult === 'function') {
      instance.render = setupResult
    } else if (setupResult) {
      instance.setupState = setupResult
    }
  }
  
  // 执行 serverPrefetch
  if (Component.serverPrefetch) {
    await Component.serverPrefetch.call(instance)
  }
  
  // 获取 render 函数
  const render = instance.render || Component.render
  if (!render) {
    console.warn('Component has no render function')
    return ''
  }
  
  // 执行渲染
  const subTree = render.call(instance)
  if (!subTree) return ''
  
  return renderVNode(subTree, context)
}

/**
 * 创建组件实例
 */
function createComponentInstance(vnode: VNode): any {
  return {
    uid: uid++,
    type: vnode.type,
    vnode,
    parent: null,
    props: vnode.props || {},
    attrs: {},
    slots: {},
    setupState: null,
    render: null,
    isMounted: false,
    isUnmounted: false
  }
}

let uid = 0
```

## 使用示例

```typescript
// 测试基础 renderToString

// 简单元素
const simpleVNode = {
  type: 'div',
  props: { class: 'container' },
  children: 'Hello World',
  shapeFlag: ShapeFlags.ELEMENT | ShapeFlags.TEXT_CHILDREN
}

renderToString(simpleVNode).then(html => {
  console.log(html)
  // 输出: <div class="container">Hello World</div>
})

// 嵌套元素
const nestedVNode = {
  type: 'div',
  props: null,
  children: [
    {
      type: 'h1',
      props: null,
      children: 'Title',
      shapeFlag: ShapeFlags.ELEMENT | ShapeFlags.TEXT_CHILDREN
    },
    {
      type: 'p',
      props: null,
      children: 'Content',
      shapeFlag: ShapeFlags.ELEMENT | ShapeFlags.TEXT_CHILDREN
    }
  ],
  shapeFlag: ShapeFlags.ELEMENT | ShapeFlags.ARRAY_CHILDREN
}

renderToString(nestedVNode).then(html => {
  console.log(html)
  // 输出: <div><h1>Title</h1><p>Content</p></div>
})

// 函数组件
const Greeting = (props: { name: string }) => ({
  type: 'span',
  props: null,
  children: `Hello, ${props.name}!`,
  shapeFlag: ShapeFlags.ELEMENT | ShapeFlags.TEXT_CHILDREN
})

const componentVNode = {
  type: Greeting,
  props: { name: 'Vue' },
  children: null,
  shapeFlag: ShapeFlags.FUNCTIONAL_COMPONENT
}

renderToString(componentVNode).then(html => {
  console.log(html)
  // 输出: <span>Hello, Vue!</span>
})
```

## 小结

本章实现了 renderToString 的基础版本：

1. **核心函数**：renderToString 和 renderVNode
2. **文本处理**：HTML 转义和注释处理
3. **元素渲染**：标签、属性、子节点
4. **属性处理**：class、style、布尔属性
5. **组件渲染**：函数组件和有状态组件

下一章将继续完善元素渲染，处理更多边界情况。
