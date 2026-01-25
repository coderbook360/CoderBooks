# 组件渲染

组件是构建复杂应用的基础。在 SSR 中，组件渲染需要执行 setup/render 函数获取 VNode 子树，然后递归渲染。

## 组件类型

```typescript
// src/shared/component.ts

export interface Component {
  name?: string
  props?: Record<string, PropValidator>
  setup?: SetupFunction
  render: RenderFunction
}

export type SetupFunction = (
  props: Record<string, any>,
  context: SetupContext
) => Record<string, any> | RenderFunction

export type RenderFunction = (
  props: Record<string, any>,
  context: RenderContext
) => VNode

export interface SetupContext {
  emit: EmitFn
  slots: Slots
  attrs: Record<string, any>
}

export interface RenderContext {
  slots: Slots
  emit: EmitFn
}

export type Slots = Record<string, () => VNode[]>
export type EmitFn = (event: string, ...args: any[]) => void

// Props 验证器
export interface PropValidator {
  type?: Function | Function[]
  required?: boolean
  default?: any
}
```

## 函数组件

最简单的组件形式：

```typescript
// 函数组件类型
export type FunctionalComponent = (
  props: Record<string, any>,
  context: RenderContext
) => VNode

// 判断是否是函数组件
export function isFunctionalComponent(comp: any): comp is FunctionalComponent {
  return typeof comp === 'function' && !comp.render
}

// 渲染函数组件
function renderFunctionalComponent(
  comp: FunctionalComponent,
  props: Record<string, any>,
  context: RenderContext
): VNode {
  return comp(props, context)
}
```

## 有状态组件

```typescript
// 组件实例
export interface ComponentInstance {
  type: Component
  props: Record<string, any>
  slots: Slots
  setupState: Record<string, any> | null
  render: RenderFunction | null
  subTree: VNode | null
  emit: EmitFn
}

// 创建组件实例
function createComponentInstance(
  vnode: VNode
): ComponentInstance {
  const comp = vnode.type as Component
  const props = vnode.props || {}
  const slots = createSlots(vnode.children)
  
  const instance: ComponentInstance = {
    type: comp,
    props,
    slots,
    setupState: null,
    render: null,
    emit: createEmit(),
    subTree: null
  }
  
  return instance
}

// 创建 emit 函数
function createEmit(): EmitFn {
  return (event: string, ...args: any[]) => {
    // SSR 中 emit 不执行实际操作
    // 仅用于保持 API 一致性
  }
}
```

## 组件渲染流程

```typescript
function renderComponentToString(vnode: VNode): string {
  const comp = vnode.type as Component | FunctionalComponent
  const props = vnode.props || {}
  
  // 创建上下文
  const context: RenderContext = {
    slots: createSlots(vnode.children),
    emit: () => {}
  }
  
  let subTree: VNode
  
  // 函数组件
  if (isFunctionalComponent(comp)) {
    subTree = comp(props, context)
  } else {
    // 有状态组件
    const instance = createComponentInstance(vnode)
    
    if (comp.setup) {
      const setupResult = comp.setup(props, {
        emit: instance.emit,
        slots: instance.slots,
        attrs: props
      })
      
      if (typeof setupResult === 'function') {
        // setup 返回渲染函数
        instance.render = setupResult
        subTree = instance.render()
      } else {
        // setup 返回状态对象
        instance.setupState = setupResult
        subTree = comp.render(props, context)
      }
    } else {
      subTree = comp.render(props, context)
    }
    
    instance.subTree = subTree
  }
  
  // 递归渲染子树
  return renderVNode(subTree)
}
```

## Props 处理

```typescript
// 验证和规范化 props
function resolveProps(
  comp: Component,
  rawProps: Record<string, any> | null
): Record<string, any> {
  const props: Record<string, any> = {}
  const propsOptions = comp.props || {}
  
  // 处理声明的 props
  for (const key in propsOptions) {
    const opt = propsOptions[key]
    const value = rawProps?.[key]
    
    if (value === undefined) {
      // 使用默认值
      if (opt.default !== undefined) {
        props[key] = typeof opt.default === 'function'
          ? opt.default()
          : opt.default
      } else if (opt.required) {
        console.warn(`Missing required prop: ${key}`)
      }
    } else {
      // 验证类型
      if (opt.type && !validateProp(value, opt.type)) {
        console.warn(`Invalid prop type for ${key}`)
      }
      props[key] = value
    }
  }
  
  // 添加未声明的 props（作为 attrs）
  if (rawProps) {
    for (const key in rawProps) {
      if (!(key in propsOptions)) {
        props[key] = rawProps[key]
      }
    }
  }
  
  return props
}

function validateProp(value: any, type: Function | Function[]): boolean {
  const types = Array.isArray(type) ? type : [type]
  return types.some(t => {
    if (t === String) return typeof value === 'string'
    if (t === Number) return typeof value === 'number'
    if (t === Boolean) return typeof value === 'boolean'
    if (t === Object) return typeof value === 'object'
    if (t === Array) return Array.isArray(value)
    return value instanceof t
  })
}
```

## Slots 处理

```typescript
// 创建 slots 对象
function createSlots(children: VNodeChildren): Slots {
  const slots: Slots = {}
  
  if (!children) {
    return slots
  }
  
  // 字符串 children 作为默认 slot
  if (typeof children === 'string') {
    slots.default = () => [createTextVNode(children)]
    return slots
  }
  
  // 数组 children
  if (Array.isArray(children)) {
    // 检查是否有命名 slot
    const namedSlots: Record<string, VNode[]> = {}
    const defaultSlotChildren: VNode[] = []
    
    for (const child of children) {
      const slotName = child.props?.slot || 'default'
      
      if (slotName === 'default') {
        defaultSlotChildren.push(child)
      } else {
        if (!namedSlots[slotName]) {
          namedSlots[slotName] = []
        }
        namedSlots[slotName].push(child)
      }
    }
    
    if (defaultSlotChildren.length > 0) {
      slots.default = () => defaultSlotChildren
    }
    
    for (const name in namedSlots) {
      slots[name] = () => namedSlots[name]
    }
  }
  
  return slots
}

// 渲染 slot
function renderSlot(
  slots: Slots,
  name: string,
  props?: Record<string, any>,
  fallback?: () => VNode[]
): VNode[] {
  const slot = slots[name]
  
  if (slot) {
    // 有 slot 内容
    return slot()
  }
  
  // 使用 fallback
  if (fallback) {
    return fallback()
  }
  
  return []
}
```

## 组件示例

```typescript
// 定义组件
const Button: Component = {
  name: 'Button',
  
  props: {
    type: { type: String, default: 'primary' },
    disabled: { type: Boolean, default: false }
  },
  
  setup(props) {
    // 返回渲染函数
    return () => h(
      'button',
      {
        class: `btn btn-${props.type}`,
        disabled: props.disabled
      },
      'Click me'
    )
  }
}

// 带 slots 的组件
const Card: Component = {
  name: 'Card',
  
  render(props, { slots }) {
    return h('div', { class: 'card' }, [
      h('div', { class: 'card-header' }, 
        renderSlot(slots, 'header', {}, () => [
          h('span', null, 'Default Header')
        ])
      ),
      h('div', { class: 'card-body' },
        renderSlot(slots, 'default')
      ),
      h('div', { class: 'card-footer' },
        renderSlot(slots, 'footer')
      )
    ])
  }
}

// 使用
const html = renderToString(
  h(Card, null, [
    h('template', { slot: 'header' }, [
      h('h2', null, 'Custom Header')
    ]),
    h('p', null, 'Card content'),
    h('template', { slot: 'footer' }, [
      h('button', null, 'OK')
    ])
  ])
)
```

## 嵌套组件

```typescript
const Header: Component = {
  render() {
    return h('header', { class: 'header' }, [
      h('h1', null, 'My App')
    ])
  }
}

const Footer: Component = {
  render() {
    return h('footer', { class: 'footer' }, [
      h('p', null, '© 2024')
    ])
  }
}

const App: Component = {
  render() {
    return h('div', { id: 'app' }, [
      h(Header, null, null),
      h('main', null, [
        h('p', null, 'Welcome!')
      ]),
      h(Footer, null, null)
    ])
  }
}

// 渲染整个应用
const html = renderToString(h(App, null, null))
```

## 完整的组件渲染实现

```typescript
// src/server/component.ts

import { VNode, Component, VNodeChildren } from '../shared/vnode'
import { h } from '../shared/h'

export function renderComponent(vnode: VNode): VNode {
  const comp = vnode.type as Component
  const props = resolveProps(comp, vnode.props)
  const slots = createSlots(vnode.children)
  
  const context = {
    slots,
    emit: () => {}
  }
  
  // 执行 setup
  if (comp.setup) {
    const result = comp.setup(props, {
      emit: context.emit,
      slots,
      attrs: props
    })
    
    if (typeof result === 'function') {
      return result()
    }
  }
  
  // 执行 render
  return comp.render(props, context)
}

function resolveProps(
  comp: Component,
  rawProps: Record<string, any> | null
): Record<string, any> {
  const props: Record<string, any> = {}
  const options = comp.props || {}
  
  for (const key in options) {
    const opt = options[key]
    const value = rawProps?.[key]
    
    if (value === undefined && opt.default !== undefined) {
      props[key] = typeof opt.default === 'function'
        ? opt.default()
        : opt.default
    } else {
      props[key] = value
    }
  }
  
  // Pass through other props
  if (rawProps) {
    for (const key in rawProps) {
      if (!(key in options)) {
        props[key] = rawProps[key]
      }
    }
  }
  
  return props
}

function createSlots(children: VNodeChildren): Record<string, () => VNode[]> {
  if (!children) return {}
  
  if (typeof children === 'string') {
    return {
      default: () => [{ 
        type: 'Text', 
        props: null, 
        children, 
        shapeFlag: 2 
      } as VNode]
    }
  }
  
  return {
    default: () => children as VNode[]
  }
}
```

## 小结

组件渲染的核心流程：

1. **识别组件类型**：函数组件或有状态组件
2. **解析 props**：验证、应用默认值
3. **创建 slots**：从 children 提取
4. **执行 setup**：获取状态或渲染函数
5. **执行 render**：获取 VNode 子树
6. **递归渲染**：将子树渲染为 HTML

组件系统让我们可以构建模块化、可复用的 UI 结构。
