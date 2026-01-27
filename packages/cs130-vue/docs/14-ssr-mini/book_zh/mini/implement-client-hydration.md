# 实现客户端激活

本章实现客户端 hydration，让服务端渲染的静态 HTML 变成可交互的 Vue 应用。

## Hydration 架构

Hydration 的核心是复用服务端生成的 DOM，而不是重新创建。

```typescript
// src/runtime/hydrate.ts

import { VNode, ComponentInstance, ShapeFlags, SSRContext } from '../shared'

/**
 * 激活入口
 */
export function hydrate(
  vnode: VNode,
  container: Element
): void {
  // 获取第一个子节点
  const firstChild = container.firstChild
  
  if (!firstChild) {
    console.warn('Hydration failed: container is empty')
    // 降级到客户端渲染
    render(vnode, container)
    return
  }
  
  // 开始激活
  const result = hydrateNode(firstChild, vnode, null)
  
  if (!result) {
    console.warn('Hydration mismatch, falling back to client render')
    container.innerHTML = ''
    render(vnode, container)
  }
}

/**
 * 激活单个节点
 */
function hydrateNode(
  node: Node,
  vnode: VNode,
  parentComponent: ComponentInstance | null
): Node | null {
  const { type, shapeFlag } = vnode
  
  // 保存 DOM 引用
  vnode.el = node
  
  // 文本节点
  if (type === Text) {
    return hydrateText(node, vnode)
  }
  
  // 注释节点
  if (type === Comment) {
    return hydrateComment(node, vnode)
  }
  
  // Fragment
  if (type === Fragment) {
    return hydrateFragment(node, vnode, parentComponent)
  }
  
  // 元素
  if (shapeFlag & ShapeFlags.ELEMENT) {
    return hydrateElement(node, vnode, parentComponent)
  }
  
  // 组件
  if (shapeFlag & ShapeFlags.COMPONENT) {
    return hydrateComponent(node, vnode, parentComponent)
  }
  
  return null
}
```

## 文本节点激活

```typescript
/**
 * 激活文本节点
 */
function hydrateText(
  node: Node,
  vnode: VNode
): Node | null {
  // 验证节点类型
  if (node.nodeType !== Node.TEXT_NODE) {
    console.warn('Hydration mismatch: expected text node')
    return null
  }
  
  // 比较文本内容
  const expected = String(vnode.children ?? '')
  const actual = node.textContent || ''
  
  if (expected !== actual) {
    console.warn(
      `Hydration text mismatch:\n` +
      `  Expected: ${expected}\n` +
      `  Actual: ${actual}`
    )
    // 修复内容
    node.textContent = expected
  }
  
  return node.nextSibling
}

/**
 * 激活注释节点
 */
function hydrateComment(
  node: Node,
  vnode: VNode
): Node | null {
  if (node.nodeType !== Node.COMMENT_NODE) {
    console.warn('Hydration mismatch: expected comment node')
    return null
  }
  
  return node.nextSibling
}
```

## 元素激活

```typescript
/**
 * 激活元素节点
 */
function hydrateElement(
  node: Node,
  vnode: VNode,
  parentComponent: ComponentInstance | null
): Node | null {
  // 验证节点类型
  if (node.nodeType !== Node.ELEMENT_NODE) {
    console.warn('Hydration mismatch: expected element node')
    return null
  }
  
  const el = node as Element
  const { type, props, children, shapeFlag } = vnode
  
  // 验证标签名
  if (el.tagName.toLowerCase() !== (type as string).toLowerCase()) {
    console.warn(
      `Hydration tag mismatch: ` +
      `expected <${type}>, got <${el.tagName.toLowerCase()}>`
    )
    return null
  }
  
  // 激活属性（添加事件监听器等）
  if (props) {
    hydrateProps(el, props)
  }
  
  // 激活子节点
  if (children != null) {
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // 文本子节点
      const expected = String(children)
      if (el.textContent !== expected) {
        console.warn('Hydration text content mismatch')
        el.textContent = expected
      }
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      // 数组子节点
      hydrateChildren(el, children as VNode[], parentComponent)
    }
  }
  
  return el.nextSibling
}

/**
 * 激活属性
 */
function hydrateProps(
  el: Element,
  props: Record<string, any>
): void {
  for (const key in props) {
    const value = props[key]
    
    // 跳过保留属性
    if (key === 'key' || key === 'ref') continue
    
    // 处理事件
    if (key.startsWith('on')) {
      const event = key.slice(2).toLowerCase()
      if (typeof value === 'function') {
        el.addEventListener(event, value)
      }
      continue
    }
    
    // 验证属性（开发模式）
    if (process.env.NODE_ENV !== 'production') {
      validateProp(el, key, value)
    }
  }
}

/**
 * 验证属性
 */
function validateProp(
  el: Element,
  key: string,
  expected: any
): void {
  const actual = el.getAttribute(key)
  
  // class 特殊处理
  if (key === 'class') {
    const normalizedExpected = normalizeClass(expected)
    if (el.className !== normalizedExpected) {
      console.warn(
        `Hydration class mismatch on <${el.tagName.toLowerCase()}>:\n` +
        `  Expected: ${normalizedExpected}\n` +
        `  Actual: ${el.className}`
      )
    }
    return
  }
  
  // style 特殊处理
  if (key === 'style') {
    // style 比较比较复杂，这里简化处理
    return
  }
  
  // 普通属性
  const expectedStr = expected === true ? '' : String(expected)
  if (actual !== expectedStr && !(expected === false && actual === null)) {
    console.warn(
      `Hydration attribute mismatch [${key}] on <${el.tagName.toLowerCase()}>:\n` +
      `  Expected: ${expected}\n` +
      `  Actual: ${actual}`
    )
  }
}
```

## 子节点激活

```typescript
/**
 * 激活子节点
 */
function hydrateChildren(
  container: Element,
  vnodes: VNode[],
  parentComponent: ComponentInstance | null
): void {
  let node: Node | null = container.firstChild
  
  for (let i = 0; i < vnodes.length; i++) {
    const vnode = vnodes[i]
    
    if (!node) {
      console.warn(
        `Hydration children mismatch: ` +
        `expected ${vnodes.length} children, got ${i}`
      )
      // 创建缺失的节点
      mountVNode(vnode, container)
      continue
    }
    
    // 跳过空白文本节点
    while (node && isEmptyTextNode(node)) {
      const next = node.nextSibling
      container.removeChild(node)
      node = next
    }
    
    if (!node) break
    
    // 激活节点
    node = hydrateNode(node, vnode, parentComponent)
  }
  
  // 移除多余的节点
  while (node) {
    const next = node.nextSibling
    if (!isEmptyTextNode(node)) {
      console.warn('Hydration: removing extra node')
    }
    container.removeChild(node)
    node = next
  }
}

/**
 * 判断是否为空白文本节点
 */
function isEmptyTextNode(node: Node): boolean {
  return (
    node.nodeType === Node.TEXT_NODE &&
    (node.textContent || '').trim() === ''
  )
}
```

## Fragment 激活

```typescript
/**
 * 激活 Fragment
 */
function hydrateFragment(
  node: Node,
  vnode: VNode,
  parentComponent: ComponentInstance | null
): Node | null {
  // Fragment 开始标记
  const fragmentStart = node
  
  // 找到 Fragment 的所有子节点
  const children = vnode.children
  
  if (!children || !Array.isArray(children)) {
    return node.nextSibling
  }
  
  let current = node
  
  for (const childVNode of children) {
    if (!current) break
    
    current = hydrateNode(current, childVNode, parentComponent)
  }
  
  return current
}
```

## 组件激活

```typescript
/**
 * 激活组件
 */
function hydrateComponent(
  node: Node,
  vnode: VNode,
  parentComponent: ComponentInstance | null
): Node | null {
  const Component = vnode.type as any
  
  // 创建组件实例
  const instance = createComponentInstance(vnode, parentComponent)
  vnode.component = instance
  
  // 设置当前实例
  setCurrentInstance(instance)
  
  try {
    // 初始化
    initProps(instance, Component, vnode.props)
    initSlots(instance, vnode.children)
    
    // 执行 setup
    setupComponent(instance, Component)
    
    // 恢复 SSR 状态
    restoreComponentState(instance)
    
    // 获取 render 函数
    const render = instance.render || Component.render
    if (!render) {
      return node.nextSibling
    }
    
    // 渲染子树
    const subTree = render.call(instance.proxy)
    instance.subTree = subTree
    
    // 激活子树
    const nextNode = hydrateNode(node, subTree, instance)
    
    // 标记为已挂载
    instance.isMounted = true
    
    // 调用 mounted 钩子
    if (Component.mounted) {
      queuePostFlushCb(() => {
        Component.mounted.call(instance.proxy)
      })
    }
    
    return nextNode
  } finally {
    setCurrentInstance(null)
  }
}

/**
 * 恢复组件状态
 */
function restoreComponentState(instance: ComponentInstance): void {
  const Component = instance.type
  const componentId = `${Component.name}-${instance.uid}`
  
  // 从 SSR 状态中获取
  const ssrState = getSSRState<any>()
  
  if (ssrState?.components?.[componentId]) {
    const savedState = ssrState.components[componentId]
    
    // 恢复 setup 状态
    if (instance.setupState) {
      for (const key in savedState) {
        if (key in instance.setupState) {
          if (isRef(instance.setupState[key])) {
            instance.setupState[key].value = savedState[key]
          } else {
            instance.setupState[key] = savedState[key]
          }
        }
      }
    }
  }
}
```

## 不匹配处理

```typescript
/**
 * 不匹配信息
 */
interface HydrationMismatch {
  type: 'tag' | 'text' | 'children' | 'attr'
  expected: any
  actual: any
  node: Node
  vnode: VNode
}

const mismatches: HydrationMismatch[] = []

/**
 * 记录不匹配
 */
function recordMismatch(mismatch: HydrationMismatch): void {
  mismatches.push(mismatch)
  
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Hydration mismatch:', mismatch)
  }
}

/**
 * 获取所有不匹配
 */
export function getHydrationMismatches(): HydrationMismatch[] {
  return [...mismatches]
}

/**
 * 清除不匹配记录
 */
export function clearHydrationMismatches(): void {
  mismatches.length = 0
}

/**
 * 严格模式激活
 */
export function hydrateStrict(
  vnode: VNode,
  container: Element
): boolean {
  clearHydrationMismatches()
  
  hydrate(vnode, container)
  
  if (mismatches.length > 0) {
    console.error(
      `Hydration completed with ${mismatches.length} mismatches`
    )
    return false
  }
  
  return true
}
```

## 渐进式激活

```typescript
/**
 * 延迟激活
 */
export function lazyHydrate(
  vnode: VNode,
  container: Element,
  trigger: HydrationTrigger
): () => void {
  let hydrated = false
  
  const doHydrate = () => {
    if (hydrated) return
    hydrated = true
    
    hydrate(vnode, container)
    cleanup()
  }
  
  let cleanup: () => void
  
  switch (trigger) {
    case 'idle':
      const idleId = requestIdleCallback(doHydrate)
      cleanup = () => cancelIdleCallback(idleId)
      break
    
    case 'visible':
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            doHydrate()
          }
        },
        { rootMargin: '200px' }
      )
      observer.observe(container)
      cleanup = () => observer.disconnect()
      break
    
    case 'interaction':
      const events = ['click', 'focus', 'touchstart', 'mouseover']
      const handler = () => doHydrate()
      
      events.forEach(e => container.addEventListener(e, handler, { once: true }))
      cleanup = () => {
        events.forEach(e => container.removeEventListener(e, handler))
      }
      break
    
    case 'media':
      const mediaQuery = window.matchMedia('(min-width: 768px)')
      const mediaHandler = (e: MediaQueryListEvent) => {
        if (e.matches) doHydrate()
      }
      mediaQuery.addEventListener('change', mediaHandler)
      if (mediaQuery.matches) doHydrate()
      cleanup = () => mediaQuery.removeEventListener('change', mediaHandler)
      break
    
    default:
      cleanup = () => {}
  }
  
  return doHydrate
}

type HydrationTrigger = 'idle' | 'visible' | 'interaction' | 'media'
```

## 使用示例

```typescript
// 基本激活
import { createApp } from 'vue'
import App from './App.vue'

const app = createApp(App)

// 使用 hydrate 而不是 mount
app.mount('#app', true) // true 表示 hydrate 模式

// 手动激活
import { hydrate, lazyHydrate } from './runtime/hydrate'

const vnode = h(App, props)
const container = document.getElementById('app')!

// 立即激活
hydrate(vnode, container)

// 延迟激活
lazyHydrate(vnode, container, 'visible')

// 严格模式检查
const success = hydrateStrict(vnode, container)
if (!success) {
  console.error('Hydration failed, check mismatches')
}
```

## 小结

本章实现了客户端激活：

1. **节点匹配**：验证 DOM 与 VNode 对应
2. **属性激活**：添加事件监听器
3. **子节点处理**：递归激活
4. **组件激活**：恢复状态和生命周期
5. **不匹配处理**：记录和报告
6. **渐进式激活**：延迟和条件激活

Hydration 是 SSR 体验的关键，正确实现确保了无缝的交互过渡。
