# createElement 实现

`createElement`（通常简写为 `h`）是创建 VNode 的核心 API。它提供了一个便捷的接口来构建虚拟 DOM 树。

## 函数签名

```typescript
// src/shared/h.ts

import { 
  VNode, 
  VNodeProps, 
  VNodeChildren, 
  Component,
  createVNode,
  Text,
  Fragment 
} from './vnode'

// 重载签名，支持多种调用方式
export function h(type: string): VNode
export function h(type: string, props: VNodeProps | null): VNode
export function h(type: string, children: VNodeChildren): VNode
export function h(type: string, props: VNodeProps | null, children: VNodeChildren): VNode
export function h(type: Component): VNode
export function h(type: Component, props: VNodeProps | null): VNode
export function h(type: Component, props: VNodeProps | null, children: VNodeChildren): VNode
```

## 核心实现

```typescript
export function h(
  type: string | Component | typeof Fragment | typeof Text,
  propsOrChildren?: VNodeProps | VNodeChildren | null,
  children?: VNodeChildren
): VNode {
  const l = arguments.length
  
  // 处理参数重载
  if (l === 1) {
    // h('div')
    return createVNode(type, null, null)
  }
  
  if (l === 2) {
    // 两个参数：可能是 props 或 children
    if (isVNodeChildren(propsOrChildren)) {
      // h('div', 'text') 或 h('div', [children])
      return createVNode(type, null, propsOrChildren as VNodeChildren)
    } else {
      // h('div', { class: 'foo' })
      return createVNode(type, propsOrChildren as VNodeProps, null)
    }
  }
  
  // l >= 3
  // h('div', { class: 'foo' }, 'text')
  // h('div', { class: 'foo' }, [children])
  return createVNode(type, propsOrChildren as VNodeProps, children!)
}

// 判断是否是子节点类型
function isVNodeChildren(value: any): boolean {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    Array.isArray(value) ||
    (value && value.type !== undefined)  // VNode 对象
  )
}
```

## Props 规范化

```typescript
// 规范化 props
export function normalizeProps(props: VNodeProps | null): VNodeProps | null {
  if (props === null) return null
  
  const normalized: VNodeProps = {}
  
  for (const key in props) {
    const value = props[key]
    
    if (key === 'class') {
      normalized.class = normalizeClass(value)
    } else if (key === 'style') {
      normalized.style = normalizeStyle(value)
    } else {
      normalized[key] = value
    }
  }
  
  return normalized
}

// 规范化 class
export function normalizeClass(value: any): string {
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
export function normalizeStyle(value: any): string {
  if (typeof value === 'string') {
    return value
  }
  
  if (typeof value === 'object' && value !== null) {
    return Object.entries(value)
      .map(([key, val]) => `${toKebabCase(key)}: ${val}`)
      .join('; ')
  }
  
  return ''
}

// 驼峰转短横线
function toKebabCase(str: string): string {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase()
}
```

## Children 规范化

```typescript
// 规范化 children
export function normalizeChildren(children: any): VNodeChildren {
  if (children === null || children === undefined) {
    return null
  }
  
  // 单个字符串或数字
  if (typeof children === 'string' || typeof children === 'number') {
    return String(children)
  }
  
  // 数组
  if (Array.isArray(children)) {
    const normalized: VNode[] = []
    
    for (const child of children) {
      if (child === null || child === undefined || typeof child === 'boolean') {
        continue  // 跳过空值
      }
      
      if (typeof child === 'string' || typeof child === 'number') {
        // 文本转 VNode
        normalized.push(createTextVNode(String(child)))
      } else if (Array.isArray(child)) {
        // 嵌套数组，展平
        normalized.push(...normalizeChildren(child) as VNode[])
      } else {
        // VNode
        normalized.push(child)
      }
    }
    
    return normalized
  }
  
  // 单个 VNode
  if (children.type !== undefined) {
    return [children]
  }
  
  return null
}

// 创建文本 VNode
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

## 便捷 API

```typescript
// 创建文本节点
export function createText(text: string | number): VNode {
  return h(Text, null, String(text))
}

// 创建 Fragment
export function createFragment(children: VNode[]): VNode {
  return h(Fragment, null, children)
}

// 克隆 VNode
export function cloneVNode(vnode: VNode, extraProps?: VNodeProps): VNode {
  return {
    ...vnode,
    props: extraProps ? { ...vnode.props, ...extraProps } : vnode.props,
    el: null,
    component: null
  }
}

// 合并 props
export function mergeProps(...args: (VNodeProps | null)[]): VNodeProps {
  const result: VNodeProps = {}
  
  for (const props of args) {
    if (!props) continue
    
    for (const key in props) {
      if (key === 'class') {
        result.class = normalizeClass([result.class, props.class])
      } else if (key === 'style') {
        result.style = [result.style, props.style]
          .filter(Boolean)
          .map(normalizeStyle)
          .join('; ')
      } else if (key.startsWith('on') && typeof props[key] === 'function') {
        // 合并事件处理器
        const existing = result[key]
        const incoming = props[key]
        
        if (existing) {
          result[key] = (...args: any[]) => {
            existing(...args)
            incoming(...args)
          }
        } else {
          result[key] = incoming
        }
      } else {
        result[key] = props[key]
      }
    }
  }
  
  return result
}
```

## 使用示例

```typescript
// 基础元素
const div = h('div')
const divWithClass = h('div', { class: 'container' })
const divWithText = h('div', 'Hello World')
const divFull = h('div', { class: 'container' }, 'Hello World')

// 嵌套结构
const nested = h('div', { class: 'card' }, [
  h('h2', { class: 'title' }, 'Card Title'),
  h('p', { class: 'content' }, 'Card content goes here'),
  h('button', { onClick: () => console.log('clicked') }, 'Click me')
])

// 动态 class
const dynamicClass = h('div', { 
  class: { 
    active: true, 
    disabled: false,
    'is-loading': isLoading 
  } 
}, 'Content')

// 动态 style
const dynamicStyle = h('div', {
  style: {
    color: 'red',
    fontSize: '14px',
    backgroundColor: 'white'
  }
}, 'Styled')

// 组件
const App = {
  render() {
    return h('div', { class: 'app' }, [
      h(Header, { title: 'My App' }),
      h(Content, null, [
        h('p', null, 'Hello')
      ]),
      h(Footer)
    ])
  }
}

// Fragment（无包装元素）
const list = h(Fragment, null, [
  h('li', null, 'Item 1'),
  h('li', null, 'Item 2'),
  h('li', null, 'Item 3')
])

// 条件渲染
const conditional = h('div', null, [
  showHeader && h(Header),
  h('main', null, content),
  showFooter ? h(Footer) : null
].filter(Boolean))

// 列表渲染
const items = ['a', 'b', 'c']
const listItems = h('ul', null, 
  items.map(item => h('li', { key: item }, item))
)
```

## JSX 兼容

如果使用 JSX，需要配置 tsconfig.json：

```json
{
  "compilerOptions": {
    "jsx": "react",
    "jsxFactory": "h",
    "jsxFragmentFactory": "Fragment"
  }
}
```

然后可以这样使用：

```tsx
// 需要导入
import { h, Fragment } from './h'

// JSX 语法
const App = () => (
  <div class="app">
    <h1>Hello</h1>
    <>
      <p>Fragment content 1</p>
      <p>Fragment content 2</p>
    </>
  </div>
)
```

## 类型安全

```typescript
// 类型化的 h 函数
interface IntrinsicElements {
  div: HTMLDivElement
  span: HTMLSpanElement
  p: HTMLParagraphElement
  h1: HTMLHeadingElement
  // ... 更多元素
}

// 带类型的事件
interface EventProps {
  onClick?: (e: MouseEvent) => void
  onInput?: (e: InputEvent) => void
  onSubmit?: (e: SubmitEvent) => void
  // ...
}

// 强类型 props
type ElementProps<T extends keyof IntrinsicElements> = 
  Partial<IntrinsicElements[T]> & EventProps & VNodeProps
```

## 小结

`h` 函数是构建虚拟 DOM 的核心工具：

1. **灵活的参数处理**：支持多种调用方式
2. **Props 规范化**：统一处理 class 和 style
3. **Children 规范化**：处理字符串、数组、嵌套等情况
4. **便捷 API**：提供 Fragment、克隆等辅助函数
5. **JSX 兼容**：可配置为 JSX 的运行时

下一章我们将使用这些 VNode 实现服务端渲染。
