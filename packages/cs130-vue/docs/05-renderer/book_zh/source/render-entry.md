# render 入口函数

`render` 函数是渲染器的入口点，将 VNode 渲染到容器元素中。这是 `createApp().mount()` 最终调用的函数。

## 函数签名

```typescript
function render(vnode: VNode | null, container: RendererElement): void
```

## 实现

```typescript
const render: RootRenderFunction = (vnode, container) => {
  if (vnode == null) {
    // vnode 为空，卸载
    if (container._vnode) {
      unmount(container._vnode, null, null, true)
    }
  } else {
    // patch 新旧 VNode
    patch(container._vnode || null, vnode, container, null, null, null)
  }
  // 执行后置回调
  flushPostFlushCbs()
  // 缓存当前 vnode
  container._vnode = vnode
}
```

## 执行流程

### 首次渲染（挂载）

```typescript
// container._vnode 为 undefined
render(vnode, container)

// patch(null, vnode, container)
// 走挂载逻辑
```

### 更新渲染

```typescript
// container._vnode 有值
render(newVnode, container)

// patch(oldVnode, newVnode, container)
// 走更新逻辑
```

### 卸载

```typescript
render(null, container)

// unmount(container._vnode)
// 移除所有内容
```

## container._vnode

容器元素存储当前 VNode 树的引用：

```typescript
interface RendererElement {
  _vnode?: VNode | null
}
```

这是 patch 对比的依据。每次 render 后更新：

```typescript
container._vnode = vnode
```

## 与 patch 的关系

render 是入口，patch 是核心：

```typescript
render(vnode, container)
  └── patch(null, vnode, container)
        ├── processElement
        ├── processComponent
        └── ...
```

patch 根据 VNode 类型分发到具体处理函数。

## 与 createApp 的关系

```typescript
function createApp(rootComponent: Component) {
  const app = {
    mount(rootContainer: RendererElement) {
      // 创建根 VNode
      const vnode = createVNode(rootComponent)
      // 调用 render
      render(vnode, rootContainer)
      // 返回组件实例
      return vnode.component!.proxy
    },
    
    unmount() {
      render(null, rootContainer)
    }
  }
  return app
}
```

## 多应用实例

同一容器只能挂载一个应用：

```typescript
const container = document.getElementById('app')

// 第一个应用
const app1 = createApp(Comp1)
app1.mount(container)

// 第二个应用会替换第一个
const app2 = createApp(Comp2)
app2.mount(container)
// 先 unmount app1，再 mount app2
```

## flushPostFlushCbs

render 后立即执行后置回调：

```typescript
const render = (vnode, container) => {
  if (vnode == null) {
    if (container._vnode) {
      unmount(container._vnode, null, null, true)
    }
  } else {
    patch(container._vnode || null, vnode, container)
  }
  
  // 执行 watchPostEffect、onMounted 等
  flushPostFlushCbs()
  
  container._vnode = vnode
}
```

这确保生命周期钩子在 DOM 更新后立即执行。

## hydrate 变体

SSR hydration 使用不同的入口：

```typescript
const hydrate = (vnode, container) => {
  if (container._vnode) {
    warn('Container already has VNode')
  }
  hydrateNode(container.firstChild!, vnode, null, null, null)
  flushPostFlushCbs()
  container._vnode = vnode
}
```

hydrate 复用服务端生成的 DOM，不创建新元素。

## 开发模式增强

```typescript
const render: RootRenderFunction = (vnode, container) => {
  if (__DEV__) {
    // 检查容器是否已被使用
    if (container.__vue_app__) {
      warn(
        'There is already an app instance mounted on this container.'
      )
    }
  }
  
  // ...正常逻辑
  
  if (__DEV__) {
    // 标记容器
    if (vnode) {
      container.__vue_app__ = vnode.appContext?.app
    } else {
      delete container.__vue_app__
    }
  }
}
```

## 错误处理

render 函数的错误由 errorHandling 模块处理：

```typescript
const render = (vnode, container) => {
  try {
    if (vnode == null) {
      // ...
    } else {
      patch(container._vnode || null, vnode, container)
    }
  } catch (e) {
    // 触发 app.config.errorHandler
    handleError(e, vnode?.component, ErrorCodes.RENDER_FUNCTION)
  } finally {
    flushPostFlushCbs()
    container._vnode = vnode
  }
}
```

## 返回值

render 函数没有返回值（void）：

```typescript
const render = (vnode, container): void => {
  // ...
}
```

如需获取组件实例，使用：

```typescript
const instance = vnode.component
const proxy = instance.proxy
```

## 与 renderComponentRoot 的区别

| 函数 | 作用 | 级别 |
|------|------|------|
| render | 渲染入口 | 应用级 |
| renderComponentRoot | 渲染组件 | 组件级 |

```typescript
// 应用级
render(vnode, container)

// 组件级（内部使用）
const subTree = renderComponentRoot(instance)
```

## 最小实现

理解 render 的核心，一个最小实现：

```typescript
function createRenderer() {
  function render(vnode, container) {
    if (vnode == null) {
      // 卸载
      container.innerHTML = ''
      container._vnode = null
    } else {
      // 挂载/更新
      patch(container._vnode, vnode, container)
      container._vnode = vnode
    }
  }
  
  function patch(n1, n2, container) {
    // ... 实际的 diff 逻辑
  }
  
  return { render }
}
```

## 小结

`render` 函数是渲染器的入口，负责协调首次渲染、更新和卸载。它维护 `container._vnode` 作为 patch 对比的依据，并在渲染后执行后置回调。虽然实现简洁，但它串联了整个渲染流程的起点。
