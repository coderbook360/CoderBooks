# 实现插槽渲染

本章实现 Vue 插槽的服务端渲染，包括默认插槽、具名插槽和作用域插槽。

## 插槽渲染架构

插槽本质上是函数，在渲染时被调用并返回 VNode 数组。

```typescript
// src/server/render-slots.ts

import { VNode, Slots, SSRContext } from '../shared'
import { renderVNode, renderChildren } from './render'

/**
 * 渲染插槽内容
 */
export async function renderSlot(
  slots: Slots,
  name: string,
  props: Record<string, any> = {},
  fallback?: VNode[]
): Promise<string> {
  const slot = slots[name]
  
  // 插槽不存在，渲染后备内容
  if (!slot) {
    if (fallback) {
      return renderSlotFallback(fallback)
    }
    return ''
  }
  
  // 调用插槽函数
  const nodes = slot(props)
  
  // 渲染插槽内容
  return renderSlotNodes(nodes)
}

/**
 * 渲染后备内容
 */
async function renderSlotFallback(
  fallback: VNode[]
): Promise<string> {
  if (!fallback || fallback.length === 0) {
    return ''
  }
  
  const results = await Promise.all(
    fallback.map(node => renderVNode(node, {} as SSRContext))
  )
  
  return results.join('')
}

/**
 * 渲染插槽节点
 */
async function renderSlotNodes(
  nodes: VNode | VNode[] | null
): Promise<string> {
  if (!nodes) return ''
  
  if (Array.isArray(nodes)) {
    const results = await Promise.all(
      nodes.map(node => renderVNode(node, {} as SSRContext))
    )
    return results.join('')
  }
  
  return renderVNode(nodes, {} as SSRContext)
}
```

## 插槽标准化

Vue 支持多种形式的子节点传递，需要统一转换为插槽函数。

```typescript
/**
 * 标准化 slots
 */
export function normalizeSlots(
  children: any,
  context?: SSRContext
): Slots {
  const slots: Slots = {}
  
  // 空值
  if (children == null) {
    return slots
  }
  
  // 字符串或数字
  if (typeof children === 'string' || typeof children === 'number') {
    slots.default = () => [createTextVNode(String(children))]
    return slots
  }
  
  // 单个 VNode
  if (isVNode(children)) {
    slots.default = () => [children]
    return slots
  }
  
  // VNode 数组
  if (Array.isArray(children)) {
    slots.default = () => normalizeChildren(children)
    return slots
  }
  
  // 对象形式（具名插槽）
  if (typeof children === 'object') {
    for (const key in children) {
      const value = children[key]
      
      if (typeof value === 'function') {
        // 已经是函数
        slots[key] = value
      } else if (Array.isArray(value)) {
        // 静态数组
        slots[key] = () => normalizeChildren(value)
      } else if (isVNode(value)) {
        // 单个 VNode
        slots[key] = () => [value]
      } else if (value != null) {
        // 其他值转文本
        slots[key] = () => [createTextVNode(String(value))]
      }
    }
  }
  
  return slots
}

/**
 * 标准化子节点数组
 */
function normalizeChildren(children: any[]): VNode[] {
  const result: VNode[] = []
  
  for (const child of children) {
    if (child == null || typeof child === 'boolean') {
      continue
    }
    
    if (typeof child === 'string' || typeof child === 'number') {
      result.push(createTextVNode(String(child)))
    } else if (Array.isArray(child)) {
      result.push(...normalizeChildren(child))
    } else if (isVNode(child)) {
      result.push(child)
    }
  }
  
  return result
}

/**
 * 创建文本 VNode
 */
function createTextVNode(text: string): VNode {
  return {
    type: Text,
    props: null,
    children: text,
    shapeFlag: ShapeFlags.TEXT
  }
}
```

## 作用域插槽

作用域插槽允许父组件访问子组件的数据。

```typescript
/**
 * 创建作用域插槽
 */
export function createScopedSlots(
  slots: Record<string, (props: any) => VNode[]>
): Slots {
  const normalizedSlots: Slots = {}
  
  for (const name in slots) {
    const slotFn = slots[name]
    
    // 包装以确保正确的 this 绑定
    normalizedSlots[name] = (props: any) => {
      try {
        return slotFn(props)
      } catch (error) {
        console.error(`Error in scoped slot "${name}":`, error)
        return []
      }
    }
  }
  
  return normalizedSlots
}

/**
 * 渲染作用域插槽
 */
export async function renderScopedSlot(
  slots: Slots,
  name: string,
  slotProps: Record<string, any>,
  context: SSRContext
): Promise<string> {
  const slot = slots[name]
  
  if (!slot) {
    return ''
  }
  
  // 调用作用域插槽
  const nodes = slot(slotProps)
  
  if (!nodes) return ''
  
  // 渲染结果
  if (Array.isArray(nodes)) {
    const results: string[] = []
    for (const node of nodes) {
      results.push(await renderVNode(node, context))
    }
    return results.join('')
  }
  
  return renderVNode(nodes, context)
}
```

## 组件中使用插槽

```typescript
// 在组件渲染中使用插槽

/**
 * 组件 render 函数中访问插槽
 */
export function useSlots(): Slots {
  const instance = getCurrentInstance()
  if (!instance) {
    console.warn('useSlots() called outside of setup()')
    return {}
  }
  return instance.slots
}

/**
 * 渲染带插槽的组件
 */
async function renderComponentWithSlots(
  vnode: VNode,
  context: SSRContext
): Promise<string> {
  const Component = vnode.type as any
  const { props, children } = vnode
  
  // 标准化插槽
  const slots = normalizeSlots(children, context)
  
  // 创建组件实例
  const instance = createComponentInstance(vnode)
  instance.slots = slots
  
  // ... 继续正常的组件渲染流程
}
```

## slot 元素渲染

在模板中使用 `<slot>` 时，需要特殊处理。

```typescript
/**
 * 渲染 slot 元素
 */
export async function renderSlotElement(
  vnode: VNode,
  slots: Slots,
  context: SSRContext
): Promise<string> {
  const { props } = vnode
  
  // 获取插槽名
  const name = props?.name || 'default'
  
  // 获取作用域属性
  const slotProps: Record<string, any> = {}
  if (props) {
    for (const key in props) {
      if (key !== 'name') {
        slotProps[key] = props[key]
      }
    }
  }
  
  // 获取后备内容
  const fallback = vnode.children as VNode[] | undefined
  
  // 渲染插槽
  const slot = slots[name]
  
  if (slot) {
    const nodes = slot(slotProps)
    if (nodes && nodes.length > 0) {
      return renderSlotNodes(nodes)
    }
  }
  
  // 渲染后备内容
  if (fallback && fallback.length > 0) {
    return renderSlotFallback(fallback)
  }
  
  return ''
}
```

## 动态插槽名

```typescript
/**
 * 处理动态插槽名
 */
export function resolveDynamicSlotName(
  name: string | (() => string)
): string {
  if (typeof name === 'function') {
    return name()
  }
  return name
}

/**
 * 渲染动态插槽
 */
export async function renderDynamicSlot(
  slots: Slots,
  nameOrFn: string | (() => string),
  props: Record<string, any>,
  fallback: VNode[] | undefined,
  context: SSRContext
): Promise<string> {
  const name = resolveDynamicSlotName(nameOrFn)
  return renderSlot(slots, name, props, fallback)
}
```

## 插槽内容提升

```typescript
/**
 * 检测静态插槽内容
 */
function isStaticSlotContent(nodes: VNode[]): boolean {
  return nodes.every(node => {
    // 文本节点是静态的
    if (node.type === Text) return true
    
    // 元素节点需要检查属性和子节点
    if (typeof node.type === 'string') {
      // 没有动态属性
      if (node.patchFlag && node.patchFlag > 0) return false
      // 递归检查子节点
      if (Array.isArray(node.children)) {
        return isStaticSlotContent(node.children)
      }
      return true
    }
    
    // 组件不是静态的
    return false
  })
}

/**
 * 缓存静态插槽结果
 */
const staticSlotCache = new WeakMap<VNode[], string>()

async function renderStaticSlot(
  nodes: VNode[],
  context: SSRContext
): Promise<string> {
  // 检查缓存
  const cached = staticSlotCache.get(nodes)
  if (cached) return cached
  
  // 渲染
  const result = await renderSlotNodes(nodes)
  
  // 如果是静态内容，缓存结果
  if (isStaticSlotContent(nodes)) {
    staticSlotCache.set(nodes, result)
  }
  
  return result
}
```

## 使用示例

```typescript
// 定义带插槽的组件
const Card = {
  name: 'Card',
  setup(props: any, { slots }: { slots: Slots }) {
    return () => h('div', { class: 'card' }, [
      // 头部插槽
      h('div', { class: 'card-header' }, [
        slots.header?.() || h('span', null, 'Default Header')
      ]),
      // 默认插槽
      h('div', { class: 'card-body' }, [
        slots.default?.()
      ]),
      // 底部插槽
      h('div', { class: 'card-footer' }, [
        slots.footer?.() || h('span', null, 'Default Footer')
      ])
    ])
  }
}

// 使用组件
const vnode = h(Card, null, {
  header: () => h('h3', null, 'Card Title'),
  default: () => [
    h('p', null, 'Card content goes here.')
  ],
  footer: () => h('button', null, 'Action')
})

// 渲染结果
renderToString(vnode).then(html => {
  console.log(html)
  /*
  <div class="card">
    <div class="card-header"><h3>Card Title</h3></div>
    <div class="card-body"><p>Card content goes here.</p></div>
    <div class="card-footer"><button>Action</button></div>
  </div>
  */
})

// 作用域插槽示例
const List = {
  name: 'List',
  props: {
    items: Array
  },
  setup(props: { items: any[] }, { slots }: { slots: Slots }) {
    return () => h('ul', null,
      props.items.map((item, index) =>
        h('li', { key: index }, [
          slots.item?.({ item, index }) || h('span', null, String(item))
        ])
      )
    )
  }
}

const listVNode = h(List, { items: ['a', 'b', 'c'] }, {
  item: ({ item, index }: { item: string; index: number }) =>
    h('span', null, `${index + 1}. ${item.toUpperCase()}`)
})

renderToString(listVNode).then(html => {
  console.log(html)
  /*
  <ul>
    <li><span>1. A</span></li>
    <li><span>2. B</span></li>
    <li><span>3. C</span></li>
  </ul>
  */
})
```

## 小结

本章实现了完整的插槽渲染：

1. **插槽标准化**：统一处理各种子节点形式
2. **默认插槽**：处理默认内容
3. **具名插槽**：支持多个命名插槽
4. **作用域插槽**：传递子组件数据
5. **后备内容**：插槽为空时的默认显示
6. **动态插槽名**：运行时确定插槽名
7. **性能优化**：静态内容缓存

插槽是组件化开发的重要特性，正确的 SSR 实现确保了服务端和客户端的一致性。
