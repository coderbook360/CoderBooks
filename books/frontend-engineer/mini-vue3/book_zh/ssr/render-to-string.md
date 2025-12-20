# SSR 渲染器：renderToString 的实现

`renderToString` 是 SSR 的核心函数，**将 Vue 组件树转换为 HTML 字符串**。

**理解它的实现原理，能帮你更好地优化 SSR 性能。** 本章将分析其实现原理。

## API 设计

```javascript
import { renderToString } from '@vue/server-renderer'

const html = await renderToString(app, {
  // SSR 上下文
  user: currentUser
})
```

函数签名：

```typescript
async function renderToString(
  input: App | VNode,
  context?: SSRContext
): Promise<string>

interface SSRContext {
  modules?: Set<string>   // 收集使用的模块
  teleports?: Record<string, string>  // Teleport 内容
  [key: string]: any      // 自定义数据
}
```

## 渲染流程

```
┌─────────────────────────────────────────┐
│          renderToString 流程            │
├─────────────────────────────────────────┤
│                                         │
│  Vue App                                │
│      │                                  │
│      ▼ createVNode                      │
│  Root VNode                             │
│      │                                  │
│      ▼ renderComponentVNode            │
│  ┌──────────────────────────────────┐  │
│  │         递归渲染                  │  │
│  │  Component → VNode → Children    │  │
│  └──────────────────────────────────┘  │
│      │                                  │
│      ▼ push to buffer                   │
│  SSRBuffer ──────────▶ HTML String     │
│                                         │
└─────────────────────────────────────────┘
```

## 缓冲区机制

直接拼接字符串性能较差，使用缓冲区优化：

```javascript
type SSRBuffer = SSRBufferItem[]
type SSRBufferItem = string | SSRBuffer | Promise<SSRBuffer>

function createBuffer() {
  let appendable = true
  const buffer = []
  
  return {
    getBuffer() {
      return buffer
    },
    
    push(item) {
      // 优化：合并相邻字符串
      if (appendable && typeof item === 'string') {
        const lastIndex = buffer.length - 1
        if (typeof buffer[lastIndex] === 'string') {
          buffer[lastIndex] += item
          return
        }
      }
      buffer.push(item)
      appendable = typeof item === 'string'
    }
  }
}
```

关键优化：相邻字符串自动合并，减少数组操作。

## 核心实现

```javascript
async function renderToString(input, context = {}) {
  // 创建根 VNode
  const vnode = isApp(input)
    ? createVNode(input._component, input._props)
    : input
  
  // 设置应用上下文
  if (isApp(input)) {
    vnode.appContext = input._context
  }
  
  // 创建缓冲区
  const buffer = createBuffer()
  
  // 递归渲染
  await renderVNode(buffer.push, vnode, context)
  
  // 展平缓冲区为字符串
  return unrollBuffer(buffer.getBuffer())
}

async function unrollBuffer(buffer) {
  let result = ''
  
  for (const item of buffer) {
    if (typeof item === 'string') {
      result += item
    } else if (Array.isArray(item)) {
      result += await unrollBuffer(item)
    } else {
      // Promise
      result += await unrollBuffer(await item)
    }
  }
  
  return result
}
```

## VNode 渲染分发

```javascript
async function renderVNode(push, vnode, context) {
  const { type, shapeFlag } = vnode
  
  switch (type) {
    case Text:
      push(escapeHtml(vnode.children))
      break
      
    case Comment:
      push(`<!--${vnode.children || ''}-->`)
      break
      
    case Static:
      push(vnode.children)
      break
      
    case Fragment:
      await renderChildren(push, vnode.children, context)
      break
      
    default:
      if (shapeFlag & ShapeFlags.ELEMENT) {
        await renderElement(push, vnode, context)
      } else if (shapeFlag & ShapeFlags.COMPONENT) {
        await renderComponent(push, vnode, context)
      } else if (shapeFlag & ShapeFlags.TELEPORT) {
        await renderTeleport(push, vnode, context)
      } else if (shapeFlag & ShapeFlags.SUSPENSE) {
        await renderSuspense(push, vnode, context)
      }
  }
}
```

## 元素渲染

```javascript
async function renderElement(push, vnode, context) {
  const { type: tag, props, children, shapeFlag } = vnode
  
  // 开始标签
  push(`<${tag}`)
  
  // 属性
  if (props) {
    for (const key in props) {
      push(renderAttr(key, props[key]))
    }
  }
  
  // 自闭合标签
  if (isVoidTag(tag)) {
    push('/>')
    return
  }
  
  push('>')
  
  // 子内容
  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    push(escapeHtml(children))
  } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    await renderChildren(push, children, context)
  }
  
  // 结束标签
  push(`</${tag}>`)
}
```

## 组件渲染

**元素渲染处理的是原生 HTML 标签（`<div>`、`<span>` 等），而组件渲染则复杂得多**——需要创建组件实例、执行 setup 函数、获取渲染结果。

**首先要问的是**：组件渲染与元素渲染的核心区别是什么？

- **元素**：直接输出 HTML 标签和属性
- **组件**：需要实例化 → 执行 setup → 调用 render → 递归渲染子树

```javascript
async function renderComponent(push, vnode, context) {
  const { type: Component } = vnode
  
  // 创建组件实例
  const instance = createComponentInstance(vnode)
  
  // 执行 setup
  const setupResult = Component.setup?.(
    instance.props,
    { attrs: instance.attrs, slots: instance.slots, emit: instance.emit }
  )
  
  // 获取渲染函数
  let render = Component.render
  if (typeof setupResult === 'function') {
    render = setupResult
  } else if (setupResult) {
    instance.setupState = setupResult
  }
  
  // SSR 优化：使用 ssrRender（如果有）
  if (Component.ssrRender) {
    Component.ssrRender(instance.proxy, push, instance)
  } else {
    // 回退到普通渲染
    const subTree = render.call(instance.proxy)
    await renderVNode(push, subTree, context)
  }
}
```

## 异步组件处理

```javascript
async function renderComponent(push, vnode, context) {
  const { type: Component } = vnode
  
  // 异步组件
  if (Component.__asyncLoader) {
    const resolvedComp = await Component.__asyncLoader()
    vnode.type = resolvedComp
    return renderComponent(push, vnode, context)
  }
  
  // ...
}
```

## Suspense 渲染

```javascript
async function renderSuspense(push, vnode, context) {
  const { default: defaultSlot, fallback } = vnode.children
  
  try {
    // 尝试渲染默认内容
    await renderSlot(push, defaultSlot, context)
  } catch (error) {
    if (error instanceof Promise) {
      // 等待异步内容
      await error
      await renderSlot(push, defaultSlot, context)
    } else if (fallback) {
      // 渲染 fallback
      await renderSlot(push, fallback, context)
    }
  }
}
```

## 本章小结

本章分析了 `renderToString` 的实现：

- **缓冲区机制**：优化字符串拼接性能
- **VNode 分发**：根据类型调用不同渲染函数
- **元素渲染**：标签、属性、子内容
- **组件渲染**：实例化、执行 setup、调用 render
- **异步处理**：异步组件和 Suspense

下一章将分析客户端激活（Hydration）的实现。
