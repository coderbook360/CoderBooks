# createHydrationRenderer 水合渲染器

`createHydrationRenderer` 创建客户端水合（Hydration）渲染器。水合是 SSR 应用中客户端"激活"服务端渲染 HTML 的过程。

## 水合的必要性

服务端渲染生成静态 HTML，但这些 HTML 没有交互能力：

```html
<!-- 服务端渲染的 HTML -->
<button>Click me</button>
<!-- 点击无反应，因为没有绑定事件 -->
```

水合的作用是：
1. 解析现有 DOM 结构
2. 将 Vue 组件实例与 DOM 关联
3. 附加事件处理器
4. 让应用变得可交互

## 函数签名

```typescript
function createHydrationRenderer(
  options?: RendererOptions
): HydrationRenderer

interface HydrationRenderer {
  render: (vnode: VNode, container: Element) => void
  hydrate: (vnode: VNode, container: Element) => void
}
```

## 水合 vs 渲染

普通渲染会创建新的 DOM 元素：

```typescript
// 创建 DOM
const el = document.createElement('div')
container.appendChild(el)
```

水合复用现有 DOM：

```typescript
// 复用 DOM
const el = container.firstChild
// 验证是否匹配
if (el.tagName === vnode.type.toUpperCase()) {
  // 匹配，继续水合
}
```

## 核心实现

```typescript
function createHydrationRenderer(options = {}) {
  // 基础渲染函数
  const { patch, createVNode } = createRenderer(options)
  
  function hydrate(vnode: VNode, container: Element) {
    // 开始水合
    hydrateNode(container.firstChild, vnode, null)
    
    // 刷新效果
    flushPostFlushCbs()
  }
  
  function hydrateNode(
    node: Node | null,
    vnode: VNode,
    parentComponent: ComponentInternalInstance | null
  ): Node | null {
    const { type, shapeFlag } = vnode
    
    // 关联 DOM 节点
    vnode.el = node
    
    if (shapeFlag & ShapeFlags.ELEMENT) {
      return hydrateElement(node as Element, vnode, parentComponent)
    } else if (shapeFlag & ShapeFlags.COMPONENT) {
      return hydrateComponent(vnode, parentComponent)
    } else if (shapeFlag & ShapeFlags.TEXT) {
      return hydrateText(node, vnode)
    }
    
    return null
  }
  
  return { hydrate }
}
```

## 元素水合

```typescript
function hydrateElement(
  el: Element,
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null
): Node | null {
  const { props, children, shapeFlag } = vnode
  
  // 验证标签名
  if (__DEV__) {
    if (el.tagName.toLowerCase() !== vnode.type) {
      console.warn(`Hydration mismatch: expected <${vnode.type}>, got <${el.tagName}>`)
    }
  }
  
  // 附加事件处理器
  if (props) {
    for (const key in props) {
      if (key.startsWith('on')) {
        const eventName = key.slice(2).toLowerCase()
        el.addEventListener(eventName, props[key])
      }
    }
  }
  
  // 水合子节点
  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    // 文本子节点
    if (el.textContent !== children) {
      __DEV__ && console.warn('Text content mismatch')
      el.textContent = children as string
    }
  } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    // 数组子节点
    hydrateChildren(
      el.firstChild,
      children as VNode[],
      parentComponent
    )
  }
  
  return el.nextSibling
}
```

## 组件水合

```typescript
function hydrateComponent(
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null
): Node | null {
  // 创建组件实例
  const instance = createComponentInstance(vnode, parentComponent)
  
  // 设置组件
  setupComponent(instance)
  
  // 获取渲染结果
  const subTree = instance.render()
  
  // 水合子树
  const el = hydrateNode(
    vnode.el as Node,
    subTree,
    instance
  )
  
  // 更新 vnode.el
  vnode.el = subTree.el
  
  // 触发 mounted 钩子
  queuePostFlushCb(() => {
    if (instance.m) {
      invokeArrayFns(instance.m)
    }
  })
  
  return el
}
```

## 子节点水合

```typescript
function hydrateChildren(
  node: Node | null,
  vnodes: VNode[],
  parentComponent: ComponentInternalInstance | null
) {
  for (let i = 0; i < vnodes.length; i++) {
    const vnode = normalizeVNode(vnodes[i])
    node = hydrateNode(node, vnode, parentComponent)
  }
}
```

## 水合不匹配检测

开发模式下检测不匹配：

```typescript
function checkHydrationMismatch(node: Node, vnode: VNode): boolean {
  // 检查节点类型
  if (vnode.type === 'text') {
    if (node.nodeType !== Node.TEXT_NODE) {
      return false
    }
  } else if (node.nodeType !== Node.ELEMENT_NODE) {
    return false
  }
  
  // 检查标签名
  if (typeof vnode.type === 'string') {
    if ((node as Element).tagName.toLowerCase() !== vnode.type) {
      return false
    }
  }
  
  return true
}
```

## 不匹配处理

当检测到不匹配时：

```typescript
function handleMismatch(node: Node, vnode: VNode) {
  if (__DEV__) {
    console.warn('Hydration mismatch detected:', {
      expected: vnode,
      received: node
    })
  }
  
  // 两种策略：
  // 1. 强制替换 DOM（更安全但可能闪烁）
  const parent = node.parentNode
  if (parent) {
    const newNode = createNode(vnode)
    parent.replaceChild(newNode, node)
  }
  
  // 2. 尝试修复（可能有风险）
  // patchNode(node, vnode)
}
```

## 事件附加

水合最重要的任务之一是附加事件：

```typescript
function attachEvents(el: Element, props: Record<string, any>) {
  for (const key in props) {
    if (key.startsWith('on')) {
      const eventName = key.slice(2).toLowerCase()
      const handler = props[key]
      
      if (typeof handler === 'function') {
        el.addEventListener(eventName, handler)
      } else if (Array.isArray(handler)) {
        // 多个处理器
        handler.forEach(h => el.addEventListener(eventName, h))
      }
    }
  }
}
```

## 响应式激活

水合时建立响应式关联：

```typescript
function hydrateComponent(vnode: VNode, ...) {
  const instance = createComponentInstance(vnode, parentComponent)
  
  // 设置响应式
  instance.proxy = new Proxy(instance.ctx, PublicInstanceProxyHandlers)
  
  // 建立渲染效果
  const effect = new ReactiveEffect(
    () => instance.render(),
    () => queueJob(update)
  )
  
  // 后续更新走正常渲染路径
  instance.update = () => {
    patch(instance.subTree, instance.render())
  }
}
```

## 优化策略

**静态节点跳过**。编译器标记的静态节点可以跳过水合：

```typescript
if (vnode.shapeFlag & ShapeFlags.STATIC) {
  // 静态节点，只关联 el，不递归水合
  vnode.el = node
  return node.nextSibling
}
```

**惰性水合**。某些组件可以延迟水合：

```typescript
const LazyComponent = defineAsyncComponent({
  loader: () => import('./HeavyComponent.vue'),
  hydrate: whenIdle  // 空闲时水合
})
```

## 部分水合（Partial Hydration）

Vue 3.5 支持选择性水合：

```typescript
function hydrateWithPriority(vnode: VNode, container: Element) {
  // 优先水合可视区域
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        hydrateNode(entry.target, findVNode(entry.target))
      }
    })
  })
  
  // 观察需要水合的元素
  container.querySelectorAll('[data-hydrate]').forEach(el => {
    observer.observe(el)
  })
}
```

## 完整示例

```javascript
// client-entry.js
import { createSSRApp, hydrateApp } from 'vue'
import App from './App.vue'

// 获取服务端渲染的状态
const initialState = window.__INITIAL_STATE__

// 创建应用
const app = createSSRApp(App)

// 恢复状态
if (initialState) {
  app.config.globalProperties.$state = initialState
}

// 水合
app.mount('#app')  // 使用 SSR app，自动进入水合模式
```

## 调试技巧

开发模式下的水合调试：

```typescript
// 启用详细的水合日志
app.config.performance = true

// 监听水合事件
app.config.warnHandler = (msg, vm, trace) => {
  if (msg.includes('Hydration')) {
    console.group('Hydration Warning')
    console.log(msg)
    console.log('Component:', vm)
    console.log('Trace:', trace)
    console.groupEnd()
  }
}
```

## 小结

`createHydrationRenderer` 创建水合渲染器：

1. 复用服务端渲染的 DOM
2. 将 Vue 组件实例与 DOM 关联
3. 附加事件处理器
4. 建立响应式关联
5. 检测并处理不匹配

水合是 SSR 应用客户端部分的核心。理解水合过程，有助于调试 SSR 问题和优化应用性能。
