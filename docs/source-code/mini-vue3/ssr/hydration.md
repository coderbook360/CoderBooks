# 客户端激活：Hydration 的实现

服务端渲染生成了静态 HTML，但按钮点击等交互还需要 JavaScript。**Vue 如何在不重新渲染 DOM 的情况下，给静态 HTML 赋予交互能力？**

**这个过程称为 Hydration（客户端激活）——SSR 的关键技术。** 理解它，能帮你避免常见的 Hydration 不匹配问题。

## Hydration 概述

```javascript
// 服务端生成的 HTML
// <div id="app">
//   <button>Count: 0</button>
// </div>

// 浏览器显示静态 HTML（用户可见）

// JavaScript 加载后，进行 Hydration
import { createSSRApp } from 'vue'

const app = createSSRApp({
  setup() {
    const count = ref(0)
    return { count }
  },
  template: '<button @click="count++">Count: {{ count }}</button>'
})

// mount 时进行 hydration
app.mount('#app')

// DOM 被复用，事件监听器被附加
// 按钮现在可以响应点击
```

核心特点：

1. **复用 DOM**：不重新创建元素
2. **附加事件**：绑定交互监听器
3. **建立响应式**：关联数据与视图

## createSSRApp

```javascript
function createSSRApp(rootComponent, rootProps = null) {
  const app = createApp(rootComponent, rootProps)
  
  // 标记 SSR 模式
  app._isSsr = true
  
  // 替换 mount 方法
  const originalMount = app.mount
  
  app.mount = (container) => {
    const containerEl = typeof container === 'string'
      ? document.querySelector(container)
      : container
    
    // 检查是否有服务端内容
    const hasServerContent = containerEl.innerHTML.trim() !== ''
    
    if (hasServerContent) {
      // 进行 hydration
      return hydrateApp(app, containerEl)
    } else {
      // 降级为普通渲染
      return originalMount.call(app, container)
    }
  }
  
  return app
}
```

## Hydration 核心流程

```javascript
function hydrateApp(app, container) {
  // 创建根 VNode
  const vnode = createVNode(app._component, app._props)
  vnode.appContext = app._context
  
  // 获取第一个 DOM 节点
  const node = container.firstChild
  
  // 开始 hydration
  hydrateNode(node, vnode, null)
  
  return app
}

function hydrateNode(node, vnode, parentComponent) {
  const { type, shapeFlag } = vnode
  
  // 关联 DOM 与 VNode
  vnode.el = node
  
  switch (type) {
    case Text:
      return hydrateText(node, vnode)
      
    case Comment:
      return hydrateComment(node, vnode)
      
    case Fragment:
      return hydrateFragment(node, vnode, parentComponent)
      
    default:
      if (shapeFlag & ShapeFlags.ELEMENT) {
        return hydrateElement(node, vnode, parentComponent)
      }
      if (shapeFlag & ShapeFlags.COMPONENT) {
        return hydrateComponent(node, vnode, parentComponent)
      }
  }
}
```

## 元素 Hydration

```javascript
function hydrateElement(el, vnode, parentComponent) {
  const { props, children, shapeFlag } = vnode
  
  // 1. 关联 DOM
  vnode.el = el
  
  // 2. 处理属性（主要是事件监听器）
  if (props) {
    for (const key in props) {
      if (isOn(key)) {
        // 附加事件监听器
        patchProp(el, key, null, props[key])
      }
      // 其他属性假设服务端已正确设置
    }
  }
  
  // 3. 递归处理子节点
  if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    hydrateChildren(el.firstChild, children, parentComponent)
  }
  
  return el.nextSibling
}

function hydrateChildren(node, children, parentComponent) {
  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    
    if (child.type === Text && !node) {
      // 服务端可能优化掉了空文本节点
      continue
    }
    
    node = hydrateNode(node, child, parentComponent)
  }
}
```

## 组件 Hydration

```javascript
function hydrateComponent(node, vnode, parentComponent) {
  const { type: Component } = vnode
  
  // 创建组件实例
  const instance = createComponentInstance(vnode, parentComponent)
  vnode.component = instance
  
  // 执行 setup
  setupComponent(instance)
  
  // 获取子树
  const subTree = instance.subTree = instance.render()
  
  // 递归 hydrate 子树
  const nextNode = hydrateNode(node, subTree, instance)
  
  // 调用 mounted 钩子
  queuePostFlushCb(() => {
    instance.isMounted = true
    if (instance.m) {
      invokeArrayFns(instance.m)
    }
  })
  
  return nextNode
}
```

## Mismatch 检测

服务端和客户端渲染结果不一致时，需要警告：

```javascript
function hydrateElement(el, vnode, parentComponent) {
  // 检查标签名
  if (__DEV__) {
    if (el.tagName.toLowerCase() !== vnode.type) {
      warn(
        `Hydration mismatch: expected <${vnode.type}> ` +
        `but found <${el.tagName.toLowerCase()}>`
      )
    }
  }
  
  // 检查文本内容
  if (vnode.shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    if (__DEV__ && el.textContent !== vnode.children) {
      warn(
        `Hydration text mismatch:` +
        `\n  Server: ${el.textContent}` +
        `\n  Client: ${vnode.children}`
      )
    }
  }
  
  // ...
}
```

常见 mismatch 原因：

1. **时间戳**：服务端和客户端时间不同
2. **随机数**：每次渲染结果不同
3. **浏览器 API**：服务端使用了 `window`
4. **条件渲染**：服务端和客户端条件不同

## Mismatch 修复

发生 mismatch 时，Vue 会尝试修复：

```javascript
function hydrateText(node, vnode) {
  const text = vnode.children
  
  if (node.nodeType !== Node.TEXT_NODE) {
    // 节点类型不匹配，创建新节点
    return handleMismatch(node, vnode)
  }
  
  if (node.textContent !== text) {
    if (__DEV__) {
      warn('Hydration text mismatch')
    }
    // 修复：更新文本
    node.textContent = text
  }
  
  vnode.el = node
  return node.nextSibling
}

function handleMismatch(node, vnode, parentComponent) {
  // 降级为客户端渲染
  const container = node.parentNode
  const next = node.nextSibling
  
  // 移除服务端节点
  container.removeChild(node)
  
  // 创建新节点
  patch(null, vnode, container, next)
  
  return next
}
```

## 部分 Hydration

Vue 3.5 引入了 Lazy Hydration，支持多种激活策略：

```javascript
import { defineAsyncComponent, hydrateOnVisible, hydrateOnIdle } from 'vue'

// 可见时激活（IntersectionObserver）
const LazyComponent = defineAsyncComponent({
  loader: () => import('./HeavyComponent.vue'),
  hydrate: hydrateOnVisible()
})

// 空闲时激活（requestIdleCallback）
const IdleComponent = defineAsyncComponent({
  loader: () => import('./IdleLoad.vue'),
  hydrate: hydrateOnIdle()
})
```

自定义激活条件：

```javascript
const LazyHydrate = {
  setup(props, { slots }) {
    const shouldHydrate = ref(false)
    
    onMounted(() => {
      const observer = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) {
          shouldHydrate.value = true
          observer.disconnect()
        }
      })
      observer.observe(el)
    })
    
    return () => shouldHydrate.value
      ? slots.default()
      : h('div', { innerHTML: serverHTML })
  }
}
```

## Islands Architecture

Islands 架构是一种更激进的部分 Hydration 方案：

```
┌────────────────────────────────────────┐
│              静态 HTML                  │
│  ┌──────────┐         ┌──────────┐    │
│  │  Island  │         │  Island  │    │
│  │（交互）  │         │（交互）  │    │
│  └──────────┘         └──────────┘    │
│                                        │
│         大部分是静态内容                 │
└────────────────────────────────────────┘
```

核心思想：
- **大部分页面是静态的**，不需要 JavaScript
- **只在需要交互的"岛屿"加载 JavaScript**
- **显著减少客户端 JS 体积**

实现要点：

```javascript
// 标记为 Island 的组件
const Counter = defineComponent({
  // 这个组件会被单独激活
  __island: true,
  setup() {
    const count = ref(0)
    return { count }
  }
})
```

## 本章小结

本章分析了 Hydration 的实现：

- **createSSRApp**：标记 SSR 模式，替换 mount
- **核心流程**：复用 DOM、附加事件、建立响应式
- **元素/组件 Hydration**：递归处理子节点
- **Mismatch 检测**：开发模式警告
- **Lazy Hydration**：按需激活组件
- **Islands Architecture**：部分页面激活策略

下一章将分析流式渲染的实现。
