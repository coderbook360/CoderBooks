# VNode 定义

VNode（虚拟节点）是 SSR 的基础数据结构。它是对真实 DOM 的 JavaScript 描述，让我们可以在服务端操作"DOM"结构而不需要真正的浏览器环境。

## 基础类型定义

```typescript
// src/shared/vnode.ts

// VNode 类型标记
export const enum VNodeType {
  ELEMENT = 1,
  TEXT = 2,
  COMPONENT = 4,
  FRAGMENT = 8
}

// 子节点类型
export type VNodeChildren = VNode[] | string | null

// VNode 主类型
export interface VNode {
  // 节点类型：标签名、组件或特殊类型
  type: string | Component | typeof Fragment | typeof Text
  
  // 属性
  props: VNodeProps | null
  
  // 子节点
  children: VNodeChildren
  
  // 类型标记（用于快速判断）
  shapeFlag: VNodeType
  
  // 关联的真实 DOM（水合时使用）
  el?: Element | Text | null
  
  // 组件实例（组件 VNode 使用）
  component?: ComponentInstance | null
  
  // key（用于 diff，我们暂不实现）
  key?: string | number | null
}

// Props 类型
export interface VNodeProps {
  [key: string]: any
  class?: string | Record<string, boolean> | string[]
  style?: string | Record<string, string>
}
```

## 特殊节点类型

```typescript
// 文本节点标记
export const Text = Symbol('Text')

// Fragment 标记
export const Fragment = Symbol('Fragment')

// 文本 VNode
export interface TextVNode extends VNode {
  type: typeof Text
  children: string
}

// Fragment VNode
export interface FragmentVNode extends VNode {
  type: typeof Fragment
  children: VNode[]
}
```

## 组件类型

```typescript
// 组件定义
export interface Component {
  // 组件名称（调试用）
  name?: string
  
  // 渲染函数
  render: (props: VNodeProps, context: RenderContext) => VNode
  
  // setup 函数（可选）
  setup?: (props: VNodeProps) => Record<string, any> | (() => VNode)
}

// 渲染上下文
export interface RenderContext {
  slots: Record<string, () => VNode[]>
  emit: (event: string, ...args: any[]) => void
}

// 组件实例
export interface ComponentInstance {
  // 组件定义
  type: Component
  
  // Props
  props: VNodeProps
  
  // setup 返回值
  setupState: Record<string, any> | null
  
  // 子树 VNode
  subTree: VNode | null
  
  // 挂载状态
  isMounted: boolean
}
```

## VNode 创建函数

```typescript
// 创建 VNode
export function createVNode(
  type: VNode['type'],
  props: VNodeProps | null,
  children: VNodeChildren
): VNode {
  // 确定 shapeFlag
  const shapeFlag = getShapeFlag(type)
  
  // 规范化子节点
  const normalizedChildren = normalizeChildren(children)
  
  return {
    type,
    props,
    children: normalizedChildren,
    shapeFlag,
    el: null,
    component: null,
    key: props?.key ?? null
  }
}

// 判断节点类型
function getShapeFlag(type: VNode['type']): VNodeType {
  if (typeof type === 'string') {
    return VNodeType.ELEMENT
  }
  if (type === Text) {
    return VNodeType.TEXT
  }
  if (type === Fragment) {
    return VNodeType.FRAGMENT
  }
  // 组件（函数或对象）
  return VNodeType.COMPONENT
}

// 规范化子节点
function normalizeChildren(children: VNodeChildren): VNodeChildren {
  if (children === null || children === undefined) {
    return null
  }
  
  if (typeof children === 'string') {
    return children
  }
  
  if (Array.isArray(children)) {
    return children.map(child => {
      if (typeof child === 'string') {
        return createTextVNode(child)
      }
      return child
    })
  }
  
  return null
}
```

## 辅助创建函数

```typescript
// 创建文本 VNode
export function createTextVNode(text: string): VNode {
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

// 创建元素 VNode
export function createElementVNode(
  tag: string,
  props: VNodeProps | null,
  children: VNodeChildren
): VNode {
  return createVNode(tag, props, children)
}

// 创建组件 VNode
export function createComponentVNode(
  component: Component,
  props: VNodeProps | null,
  children: VNodeChildren
): VNode {
  return createVNode(component, props, children)
}

// 创建 Fragment
export function createFragmentVNode(children: VNode[]): VNode {
  return createVNode(Fragment, null, children)
}
```

## 类型判断工具

```typescript
// 是否是元素节点
export function isElementVNode(vnode: VNode): boolean {
  return (vnode.shapeFlag & VNodeType.ELEMENT) > 0
}

// 是否是文本节点
export function isTextVNode(vnode: VNode): boolean {
  return (vnode.shapeFlag & VNodeType.TEXT) > 0
}

// 是否是组件节点
export function isComponentVNode(vnode: VNode): boolean {
  return (vnode.shapeFlag & VNodeType.COMPONENT) > 0
}

// 是否是 Fragment
export function isFragmentVNode(vnode: VNode): boolean {
  return (vnode.shapeFlag & VNodeType.FRAGMENT) > 0
}

// 是否有子节点
export function hasChildren(vnode: VNode): boolean {
  return vnode.children !== null && vnode.children !== undefined
}

// 子节点是字符串
export function isTextChildren(vnode: VNode): vnode is VNode & { children: string } {
  return typeof vnode.children === 'string'
}

// 子节点是数组
export function isArrayChildren(vnode: VNode): vnode is VNode & { children: VNode[] } {
  return Array.isArray(vnode.children)
}
```

## 使用示例

```typescript
// 创建元素
const div = createVNode('div', { class: 'container' }, [
  createVNode('h1', null, 'Hello'),
  createVNode('p', null, 'World')
])

// 创建文本
const text = createTextVNode('Hello World')

// 创建组件
const MyComponent = {
  name: 'MyComponent',
  render(props: VNodeProps) {
    return createVNode('div', null, props.message)
  }
}

const comp = createVNode(MyComponent, { message: 'Hi' }, null)

// 创建 Fragment
const fragment = createVNode(Fragment, null, [
  createVNode('li', null, 'Item 1'),
  createVNode('li', null, 'Item 2')
])
```

## 调试辅助

```typescript
// 打印 VNode 结构（开发环境）
export function debugVNode(vnode: VNode, indent: number = 0): string {
  const prefix = '  '.repeat(indent)
  let result = ''
  
  if (isTextVNode(vnode)) {
    result = `${prefix}Text: "${vnode.children}"\n`
  } else if (isElementVNode(vnode)) {
    result = `${prefix}<${vnode.type}>\n`
    if (isArrayChildren(vnode)) {
      for (const child of vnode.children) {
        result += debugVNode(child, indent + 1)
      }
    } else if (isTextChildren(vnode)) {
      result += `${prefix}  "${vnode.children}"\n`
    }
    result += `${prefix}</${vnode.type}>\n`
  } else if (isComponentVNode(vnode)) {
    const name = (vnode.type as Component).name || 'Anonymous'
    result = `${prefix}[Component: ${name}]\n`
  }
  
  return result
}
```

## 小结

VNode 定义是整个 SSR 框架的基础：

1. **类型字段**：标识节点种类（元素、文本、组件、Fragment）
2. **Props**：存储属性、事件、样式
3. **Children**：子节点（字符串或数组）
4. **ShapeFlag**：快速类型判断
5. **el/component**：关联真实 DOM 或组件实例

有了这个基础，我们可以开始实现 createElement 函数了。
