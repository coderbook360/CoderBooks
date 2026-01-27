# 客户端挂载

SSR 应用需要在客户端重新挂载，激活服务端渲染的静态 HTML。客户端挂载需要创建 Vue 应用实例并与现有 DOM 建立连接。

## 挂载流程概览

```typescript
// 客户端入口
// entry-client.ts
import { createApp } from './runtime'
import App from './App'

const app = createApp(App)

// 挂载到服务端渲染的容器
app.mount('#app')
```

## createApp 实现

```typescript
// src/runtime/app.ts

import { VNode, Component } from '../shared/vnode'
import { h } from '../shared/h'

export interface App {
  mount(container: string | Element): void
  unmount(): void
  component(name: string, component?: Component): Component | App
  use(plugin: Plugin): App
}

export interface Plugin {
  install(app: App): void
}

export function createApp(rootComponent: Component): App {
  const context = {
    components: new Map<string, Component>(),
    provides: new Map<string, any>()
  }
  
  let isMounted = false
  let rootVNode: VNode | null = null
  let container: Element | null = null
  
  const app: App = {
    mount(containerOrSelector) {
      // 获取容器元素
      container = typeof containerOrSelector === 'string'
        ? document.querySelector(containerOrSelector)
        : containerOrSelector
        
      if (!container) {
        throw new Error(`Container not found: ${containerOrSelector}`)
      }
      
      // 创建根 VNode
      rootVNode = h(rootComponent, null, null)
      
      // 检查是否需要 hydration
      if (container.hasAttribute('data-server-rendered')) {
        // Hydration 模式
        hydrate(rootVNode, container)
      } else {
        // 普通挂载
        render(rootVNode, container)
      }
      
      isMounted = true
    },
    
    unmount() {
      if (container) {
        render(null, container)
        isMounted = false
        rootVNode = null
        container = null
      }
    },
    
    component(name, component) {
      if (component) {
        context.components.set(name, component)
        return app
      }
      return context.components.get(name)!
    },
    
    use(plugin) {
      plugin.install(app)
      return app
    }
  }
  
  return app
}
```

## render 函数

```typescript
// src/runtime/render.ts

let currentContainer: Element | null = null

export function render(vnode: VNode | null, container: Element) {
  if (vnode) {
    // 挂载或更新
    patch(container._vnode || null, vnode, container)
  } else if (container._vnode) {
    // 卸载
    unmount(container._vnode)
    container.innerHTML = ''
  }
  
  container._vnode = vnode
}

// 扩展 Element 类型
declare global {
  interface Element {
    _vnode?: VNode | null
  }
}
```

## patch 函数

```typescript
export function patch(
  n1: VNode | null,
  n2: VNode,
  container: Element,
  anchor: Node | null = null
) {
  // 如果类型不同，卸载旧节点
  if (n1 && n1.type !== n2.type) {
    unmount(n1)
    n1 = null
  }
  
  const { type, shapeFlag } = n2
  
  switch (type) {
    case 'Text':
      processText(n1, n2, container, anchor)
      break
    case 'Comment':
      processComment(n1, n2, container, anchor)
      break
    case 'Fragment':
      processFragment(n1, n2, container, anchor)
      break
    default:
      if (shapeFlag & ShapeFlags.ELEMENT) {
        processElement(n1, n2, container, anchor)
      } else if (shapeFlag & ShapeFlags.COMPONENT) {
        processComponent(n1, n2, container, anchor)
      }
  }
}
```

## 处理元素

```typescript
function processElement(
  n1: VNode | null,
  n2: VNode,
  container: Element,
  anchor: Node | null
) {
  if (!n1) {
    // 挂载新元素
    mountElement(n2, container, anchor)
  } else {
    // 更新元素
    patchElement(n1, n2)
  }
}

function mountElement(
  vnode: VNode,
  container: Element,
  anchor: Node | null
) {
  // 创建 DOM 元素
  const el = document.createElement(vnode.type as string)
  vnode.el = el
  
  // 设置属性
  if (vnode.props) {
    for (const key in vnode.props) {
      patchProp(el, key, null, vnode.props[key])
    }
  }
  
  // 处理子节点
  if (vnode.shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    el.textContent = vnode.children as string
  } else if (vnode.shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    mountChildren(vnode.children as VNode[], el)
  }
  
  // 插入到容器
  container.insertBefore(el, anchor)
}

function mountChildren(children: VNode[], container: Element) {
  for (const child of children) {
    patch(null, child, container)
  }
}
```

## 属性处理

```typescript
// src/runtime/props.ts

export function patchProp(
  el: Element,
  key: string,
  prevValue: any,
  nextValue: any
) {
  if (key === 'class') {
    patchClass(el, nextValue)
  } else if (key === 'style') {
    patchStyle(el as HTMLElement, prevValue, nextValue)
  } else if (isEvent(key)) {
    patchEvent(el, key, prevValue, nextValue)
  } else if (shouldSetAsProp(el, key)) {
    patchDOMProp(el, key, nextValue)
  } else {
    patchAttr(el, key, nextValue)
  }
}

function patchClass(el: Element, value: string | null) {
  if (value == null) {
    el.removeAttribute('class')
  } else {
    el.className = value
  }
}

function patchStyle(
  el: HTMLElement,
  prev: Record<string, string> | null,
  next: Record<string, string> | null
) {
  const style = el.style
  
  // 移除旧样式
  if (prev) {
    for (const key in prev) {
      if (!next || !(key in next)) {
        style.removeProperty(key)
      }
    }
  }
  
  // 设置新样式
  if (next) {
    for (const key in next) {
      style.setProperty(key, next[key])
    }
  }
}

function isEvent(key: string): boolean {
  return key.startsWith('on')
}

function patchEvent(
  el: Element,
  key: string,
  prevValue: Function | null,
  nextValue: Function | null
) {
  const eventName = key.slice(2).toLowerCase()
  
  // 使用 invoker 包装，避免频繁 add/remove
  const invokers = el._vei || (el._vei = {})
  const existingInvoker = invokers[key]
  
  if (nextValue && existingInvoker) {
    // 更新
    existingInvoker.value = nextValue
  } else {
    if (nextValue) {
      // 添加
      const invoker = createInvoker(nextValue)
      invokers[key] = invoker
      el.addEventListener(eventName, invoker)
    } else if (existingInvoker) {
      // 移除
      el.removeEventListener(eventName, existingInvoker)
      delete invokers[key]
    }
  }
}

interface Invoker extends EventListener {
  value: Function
}

function createInvoker(initialValue: Function): Invoker {
  const invoker: Invoker = (e: Event) => {
    invoker.value(e)
  }
  invoker.value = initialValue
  return invoker
}

function shouldSetAsProp(el: Element, key: string): boolean {
  // 某些属性需要通过 property 设置
  if (key === 'innerHTML' || key === 'textContent') {
    return true
  }
  
  if (key in el) {
    // 表单元素的 value
    if (el.tagName === 'INPUT' && key === 'value') {
      return true
    }
  }
  
  return false
}

function patchDOMProp(el: Element, key: string, value: any) {
  (el as any)[key] = value
}

function patchAttr(el: Element, key: string, value: any) {
  if (value == null) {
    el.removeAttribute(key)
  } else {
    el.setAttribute(key, String(value))
  }
}

// 扩展 Element 类型
declare global {
  interface Element {
    _vei?: Record<string, Invoker>
  }
}
```

## 组件挂载

```typescript
function processComponent(
  n1: VNode | null,
  n2: VNode,
  container: Element,
  anchor: Node | null
) {
  if (!n1) {
    mountComponent(n2, container, anchor)
  } else {
    updateComponent(n1, n2)
  }
}

function mountComponent(
  vnode: VNode,
  container: Element,
  anchor: Node | null
) {
  const component = vnode.type as Component
  
  // 创建组件实例
  const instance: ComponentInstance = {
    vnode,
    type: component,
    props: {},
    slots: {},
    setupState: null,
    subTree: null,
    isMounted: false,
    update: null!
  }
  
  vnode.component = instance
  
  // 解析 props
  instance.props = resolveProps(
    component.props,
    vnode.props
  ).props
  
  // 创建 slots
  instance.slots = createSlots(vnode.children)
  
  // 执行 setup
  if (component.setup) {
    const setupResult = component.setup(instance.props, {
      emit: createEmit(instance),
      slots: instance.slots,
      attrs: {}
    })
    
    if (typeof setupResult === 'function') {
      instance.render = setupResult
    } else {
      instance.setupState = setupResult
      instance.render = component.render
    }
  } else {
    instance.render = component.render
  }
  
  // 设置渲染效果
  setupRenderEffect(instance, container, anchor)
}

function setupRenderEffect(
  instance: ComponentInstance,
  container: Element,
  anchor: Node | null
) {
  // 使用响应式系统监听更新
  const update = () => {
    if (!instance.isMounted) {
      // 初次挂载
      const subTree = instance.render!(
        instance.props,
        { slots: instance.slots, emit: createEmit(instance) }
      )
      
      patch(null, subTree, container, anchor)
      
      instance.subTree = subTree
      instance.isMounted = true
    } else {
      // 更新
      const prevTree = instance.subTree!
      const nextTree = instance.render!(
        instance.props,
        { slots: instance.slots, emit: createEmit(instance) }
      )
      
      patch(prevTree, nextTree, container, anchor)
      
      instance.subTree = nextTree
    }
  }
  
  // 创建响应式效果
  instance.update = effect(update)
  
  // 立即执行一次
  update()
}

// 简化的响应式 effect
function effect(fn: () => void): () => void {
  fn()
  return fn
}
```

## 文本和注释节点

```typescript
function processText(
  n1: VNode | null,
  n2: VNode,
  container: Element,
  anchor: Node | null
) {
  if (!n1) {
    // 创建文本节点
    const textNode = document.createTextNode(n2.children as string)
    n2.el = textNode
    container.insertBefore(textNode, anchor)
  } else {
    // 更新文本内容
    const el = (n2.el = n1.el) as Text
    if (n2.children !== n1.children) {
      el.textContent = n2.children as string
    }
  }
}

function processComment(
  n1: VNode | null,
  n2: VNode,
  container: Element,
  anchor: Node | null
) {
  if (!n1) {
    const commentNode = document.createComment(n2.children as string || '')
    n2.el = commentNode
    container.insertBefore(commentNode, anchor)
  } else {
    n2.el = n1.el
  }
}

function processFragment(
  n1: VNode | null,
  n2: VNode,
  container: Element,
  anchor: Node | null
) {
  if (!n1) {
    mountChildren(n2.children as VNode[], container)
  } else {
    patchChildren(n1, n2, container)
  }
}
```

## 卸载

```typescript
function unmount(vnode: VNode) {
  const { shapeFlag, component, el } = vnode
  
  if (shapeFlag & ShapeFlags.COMPONENT) {
    unmountComponent(component!)
  } else {
    // 移除 DOM 节点
    if (el && el.parentNode) {
      el.parentNode.removeChild(el)
    }
  }
}

function unmountComponent(instance: ComponentInstance) {
  // 清理
  if (instance.subTree) {
    unmount(instance.subTree)
  }
}
```

## 完整客户端入口

```typescript
// src/runtime/index.ts

export { createApp } from './app'
export { h } from '../shared/h'
export { render } from './render'

// 自动判断是否 hydration
export function createSSRApp(rootComponent: Component) {
  const app = createApp(rootComponent)
  
  const originalMount = app.mount
  app.mount = (container: string | Element) => {
    const el = typeof container === 'string'
      ? document.querySelector(container)
      : container
      
    if (!el) {
      throw new Error('Container not found')
    }
    
    // 检测服务端渲染标记
    if (el.innerHTML.trim()) {
      el.setAttribute('data-server-rendered', 'true')
    }
    
    originalMount.call(app, container)
  }
  
  return app
}
```

## 使用示例

```typescript
// App.ts
const App: Component = {
  setup() {
    return () => h('div', { id: 'app' }, [
      h('h1', null, 'Hello SSR'),
      h('p', null, 'This is rendered on the server')
    ])
  }
}

// entry-client.ts
import { createSSRApp } from './runtime'
import App from './App'

const app = createSSRApp(App)
app.mount('#app')
```

## 小结

客户端挂载的核心流程：

1. **创建应用**：createApp 创建应用实例
2. **获取容器**：解析选择器获取 DOM 元素
3. **检测 SSR**：判断是否需要 hydration
4. **渲染组件**：递归处理 VNode 树
5. **绑定事件**：为 DOM 元素添加事件监听

下一章我们将实现 hydration 逻辑，复用服务端渲染的 DOM。
