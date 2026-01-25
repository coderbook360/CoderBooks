# 实现组件渲染

本章实现组件的服务端渲染，包括函数组件、有状态组件、以及各种生命周期的处理。

## 组件渲染架构

组件渲染需要创建组件实例，执行 setup 或 render 函数，然后递归渲染子树。

```typescript
// src/server/render-component.ts

import {
  VNode,
  Component,
  ComponentInstance,
  ShapeFlags,
  SSRContext
} from '../shared'
import { renderVNode } from './render'

/**
 * 渲染组件
 */
export async function renderComponentVNode(
  vnode: VNode,
  context: SSRContext
): Promise<string> {
  const Component = vnode.type
  
  // 函数组件
  if (typeof Component === 'function') {
    // 检查是否有 props 定义（区分函数组件和类组件）
    if (!Component.prototype || !Component.prototype.render) {
      return renderFunctionalComponent(vnode, context)
    }
  }
  
  // 有状态组件
  return renderStatefulComponent(vnode, context)
}
```

## 函数组件

函数组件是最简单的组件形式，直接调用函数获取渲染结果。

```typescript
/**
 * 渲染函数组件
 */
async function renderFunctionalComponent(
  vnode: VNode,
  context: SSRContext
): Promise<string> {
  const Component = vnode.type as Function
  const { props, children } = vnode
  
  // 准备 slots
  const slots = normalizeSlots(children)
  
  // 分离 props 和 attrs
  const [componentProps, attrs] = resolveProps(
    Component,
    props || {}
  )
  
  // 创建函数组件上下文
  const functionalContext = {
    attrs,
    slots,
    emit: createEmitFn()
  }
  
  try {
    // 调用函数组件
    const result = Component(componentProps, functionalContext)
    
    // 处理返回值
    if (result == null) {
      return ''
    }
    
    // 如果是 Promise，等待解析
    const subTree = result instanceof Promise
      ? await result
      : result
    
    // 渲染子树
    return renderVNode(subTree, context)
  } catch (error) {
    handleComponentError(error, vnode, context)
    return ''
  }
}

/**
 * 创建空的 emit 函数（SSR 中事件不执行）
 */
function createEmitFn(): (event: string, ...args: any[]) => void {
  return () => {
    // SSR 中不处理事件
  }
}
```

## 有状态组件

有状态组件需要创建完整的组件实例。

```typescript
// 全局实例 ID
let uid = 0

/**
 * 渲染有状态组件
 */
async function renderStatefulComponent(
  vnode: VNode,
  context: SSRContext
): Promise<string> {
  const Component = vnode.type as Component
  
  // 创建组件实例
  const instance = createComponentInstance(vnode)
  
  // 设置当前实例（用于 setup 中的 API）
  setCurrentInstance(instance)
  
  try {
    // 初始化 props
    initProps(instance, Component, vnode.props)
    
    // 初始化 slots
    initSlots(instance, vnode.children)
    
    // 执行 setup
    await setupComponent(instance, Component)
    
    // 执行 serverPrefetch
    if (Component.serverPrefetch) {
      await Component.serverPrefetch.call(instance.proxy)
    }
    
    // 收集组件状态
    collectComponentState(instance, context)
    
    // 获取渲染函数
    const render = instance.render || Component.render
    if (!render) {
      console.warn(`Component ${Component.name || 'Anonymous'} has no render function`)
      return ''
    }
    
    // 执行渲染
    const subTree = render.call(instance.proxy)
    
    if (!subTree) {
      return ''
    }
    
    // 递归渲染
    return renderVNode(subTree, context)
  } catch (error) {
    handleComponentError(error, vnode, context)
    return ''
  } finally {
    // 清除当前实例
    setCurrentInstance(null)
  }
}

/**
 * 创建组件实例
 */
function createComponentInstance(vnode: VNode): ComponentInstance {
  const instance: ComponentInstance = {
    uid: uid++,
    type: vnode.type as Component,
    vnode,
    parent: null,
    
    // Props 和状态
    props: {},
    attrs: {},
    slots: {},
    setupState: null,
    data: {},
    
    // 渲染
    render: null,
    subTree: null,
    
    // 生命周期
    isMounted: false,
    isUnmounted: false,
    
    // 更新
    update: null,
    
    // 暴露
    exposed: null,
    
    // Refs
    refs: {},
    
    // 代理
    proxy: null,
    ctx: {},
    
    // SSR
    asyncDep: null,
    asyncResolved: false
  }
  
  // 创建代理
  instance.proxy = createInstanceProxy(instance)
  
  return instance
}
```

## 组件代理

```typescript
/**
 * 创建实例代理
 */
function createInstanceProxy(instance: ComponentInstance): any {
  return new Proxy(instance, {
    get(target, key: string) {
      // setupState
      if (target.setupState && key in target.setupState) {
        return target.setupState[key]
      }
      
      // data
      if (key in target.data) {
        return target.data[key]
      }
      
      // props
      if (key in target.props) {
        return target.props[key]
      }
      
      // 特殊属性
      switch (key) {
        case '$props':
          return target.props
        case '$attrs':
          return target.attrs
        case '$slots':
          return target.slots
        case '$refs':
          return target.refs
        case '$el':
          return null // SSR 中无 DOM
        case '$emit':
          return createEmitFn()
      }
      
      return undefined
    },
    
    set(target, key: string, value) {
      if (target.setupState && key in target.setupState) {
        target.setupState[key] = value
        return true
      }
      
      if (key in target.data) {
        target.data[key] = value
        return true
      }
      
      return false
    }
  })
}
```

## Props 处理

```typescript
/**
 * 初始化 Props
 */
function initProps(
  instance: ComponentInstance,
  Component: Component,
  rawProps: Record<string, any> | null
): void {
  const props: Record<string, any> = {}
  const attrs: Record<string, any> = {}
  
  const propsOptions = Component.props || {}
  
  if (rawProps) {
    for (const key in rawProps) {
      const value = rawProps[key]
      
      // 跳过保留属性
      if (key === 'key' || key === 'ref') continue
      
      // 判断是 prop 还是 attr
      if (key in propsOptions || key.startsWith('on')) {
        props[key] = value
      } else {
        attrs[key] = value
      }
    }
  }
  
  // 处理默认值
  for (const key in propsOptions) {
    if (!(key in props)) {
      const opt = propsOptions[key]
      if (opt && typeof opt === 'object' && 'default' in opt) {
        const defaultValue = opt.default
        props[key] = typeof defaultValue === 'function'
          ? defaultValue()
          : defaultValue
      }
    }
  }
  
  instance.props = props
  instance.attrs = attrs
}

/**
 * 分离 props 和 attrs
 */
function resolveProps(
  Component: any,
  rawProps: Record<string, any>
): [Record<string, any>, Record<string, any>] {
  const props: Record<string, any> = {}
  const attrs: Record<string, any> = {}
  
  const propsOptions = Component.props || {}
  
  for (const key in rawProps) {
    if (key === 'key' || key === 'ref') continue
    
    if (key in propsOptions) {
      props[key] = rawProps[key]
    } else {
      attrs[key] = rawProps[key]
    }
  }
  
  return [props, attrs]
}
```

## Slots 处理

```typescript
/**
 * 初始化 Slots
 */
function initSlots(
  instance: ComponentInstance,
  children: any
): void {
  instance.slots = normalizeSlots(children)
}

/**
 * 标准化 slots
 */
function normalizeSlots(children: any): Record<string, Function> {
  const slots: Record<string, Function> = {}
  
  if (!children) {
    return slots
  }
  
  // 单个 VNode 或文本作为默认插槽
  if (typeof children === 'string' || isVNode(children)) {
    slots.default = () => [children]
    return slots
  }
  
  // 数组作为默认插槽
  if (Array.isArray(children)) {
    slots.default = () => children
    return slots
  }
  
  // 对象形式的具名插槽
  if (typeof children === 'object') {
    for (const key in children) {
      const slot = children[key]
      if (typeof slot === 'function') {
        slots[key] = slot
      } else {
        slots[key] = () => [slot]
      }
    }
  }
  
  return slots
}

/**
 * 判断是否为 VNode
 */
function isVNode(value: any): boolean {
  return value && typeof value === 'object' && 'type' in value
}
```

## Setup 执行

```typescript
// 当前实例
let currentInstance: ComponentInstance | null = null

/**
 * 设置当前实例
 */
function setCurrentInstance(instance: ComponentInstance | null): void {
  currentInstance = instance
}

/**
 * 获取当前实例
 */
export function getCurrentInstance(): ComponentInstance | null {
  return currentInstance
}

/**
 * 执行 setup
 */
async function setupComponent(
  instance: ComponentInstance,
  Component: Component
): Promise<void> {
  if (!Component.setup) {
    return
  }
  
  // 创建 setup 上下文
  const setupContext = {
    attrs: instance.attrs,
    slots: instance.slots,
    emit: createEmitFn(),
    expose: (exposed: Record<string, any>) => {
      instance.exposed = exposed
    }
  }
  
  // 执行 setup
  const setupResult = Component.setup(instance.props, setupContext)
  
  // 处理异步 setup
  if (setupResult instanceof Promise) {
    instance.asyncDep = setupResult
    const resolved = await setupResult
    handleSetupResult(instance, resolved)
    instance.asyncResolved = true
  } else {
    handleSetupResult(instance, setupResult)
  }
}

/**
 * 处理 setup 返回值
 */
function handleSetupResult(
  instance: ComponentInstance,
  setupResult: any
): void {
  if (!setupResult) {
    return
  }
  
  // 返回 render 函数
  if (typeof setupResult === 'function') {
    instance.render = setupResult
    return
  }
  
  // 返回状态对象
  if (typeof setupResult === 'object') {
    instance.setupState = setupResult
  }
}
```

## 状态收集

```typescript
/**
 * 收集组件状态用于客户端激活
 */
function collectComponentState(
  instance: ComponentInstance,
  context: SSRContext
): void {
  const Component = instance.type
  const componentName = Component.name || 'Anonymous'
  
  // 收集 setup 状态
  if (instance.setupState) {
    const state = serializeState(instance.setupState)
    if (Object.keys(state).length > 0) {
      context.state.components.set(
        `${componentName}-${instance.uid}`,
        state
      )
    }
  }
}

/**
 * 序列化状态
 */
function serializeState(state: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {}
  
  for (const key in state) {
    const value = state[key]
    
    // 跳过函数
    if (typeof value === 'function') continue
    
    // 跳过响应式代理的内部属性
    if (key.startsWith('__')) continue
    
    // 处理 ref
    if (isRef(value)) {
      result[key] = value.value
      continue
    }
    
    // 处理 reactive
    if (isReactive(value)) {
      result[key] = toRaw(value)
      continue
    }
    
    // 普通值
    if (isSerializable(value)) {
      result[key] = value
    }
  }
  
  return result
}

/**
 * 判断是否可序列化
 */
function isSerializable(value: any): boolean {
  const type = typeof value
  
  if (value === null) return true
  if (type === 'boolean' || type === 'number' || type === 'string') return true
  if (Array.isArray(value)) return value.every(isSerializable)
  if (type === 'object') {
    for (const key in value) {
      if (!isSerializable(value[key])) return false
    }
    return true
  }
  
  return false
}
```

## 错误处理

```typescript
/**
 * 处理组件错误
 */
function handleComponentError(
  error: unknown,
  vnode: VNode,
  context: SSRContext
): void {
  const Component = vnode.type as Component
  const componentName = Component.name || 'Anonymous'
  
  console.error(`Error rendering component ${componentName}:`, error)
  
  // 记录错误
  context.errors.push(
    error instanceof Error
      ? error
      : new Error(String(error))
  )
  
  // 查找错误边界
  // 这里简化处理，实际 Vue 会向上查找 errorCaptured
}
```

## 生命周期

```typescript
// SSR 中支持的生命周期
const SSR_LIFECYCLE_HOOKS = [
  'beforeCreate',
  'created',
  'serverPrefetch'
]

/**
 * 调用生命周期钩子
 */
function callLifecycleHook(
  instance: ComponentInstance,
  hook: string
): void {
  const Component = instance.type
  const hookFn = (Component as any)[hook]
  
  if (hookFn) {
    try {
      hookFn.call(instance.proxy)
    } catch (error) {
      console.error(`Error in ${hook} hook:`, error)
    }
  }
}
```

## 使用示例

```typescript
// 函数组件
const Greeting = (props: { name: string }) => {
  return h('span', null, `Hello, ${props.name}!`)
}

// 有状态组件
const Counter = {
  name: 'Counter',
  props: {
    initial: { type: Number, default: 0 }
  },
  setup(props: { initial: number }) {
    const count = ref(props.initial)
    
    return () => h('div', null, [
      h('span', null, `Count: ${count.value}`),
      h('button', { onClick: () => count.value++ }, '+')
    ])
  }
}

// 带 serverPrefetch 的组件
const AsyncData = {
  name: 'AsyncData',
  async setup() {
    const data = ref(null)
    
    return { data }
  },
  async serverPrefetch() {
    // 服务端预取数据
    this.data = await fetchData()
  },
  render() {
    return h('div', null, this.data?.title || 'Loading...')
  }
}

// 渲染
const vnode = h(Counter, { initial: 10 })
renderToString(vnode).then(html => {
  console.log(html)
  // 输出: <div><span>Count: 10</span><button>+</button></div>
})
```

## 小结

本章实现了组件的服务端渲染：

1. **函数组件**：简单调用，获取渲染结果
2. **有状态组件**：创建实例，执行 setup
3. **Props 处理**：分离 props 和 attrs
4. **Slots 处理**：标准化各种形式
5. **Setup 执行**：同步和异步支持
6. **状态收集**：用于客户端激活
7. **错误处理**：捕获并记录错误

组件渲染是 SSR 的核心，正确处理生命周期和状态是关键。
