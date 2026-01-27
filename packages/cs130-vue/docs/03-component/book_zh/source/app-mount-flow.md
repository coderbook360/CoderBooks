# app.mount 挂载流程

`mount` 是启动 Vue 应用的最后一步。它将根组件渲染为真实 DOM，插入到指定的容器中。理解挂载流程是理解整个渲染机制的起点。

## 基本用法

```javascript
const app = createApp(App)

// 挂载到 DOM 元素
app.mount('#app')

// 或直接传入元素
app.mount(document.getElementById('app'))
```

`mount` 返回根组件的代理实例，可以访问组件的公开属性和方法：

```javascript
const instance = app.mount('#app')
console.log(instance.someData)
instance.someMethod()
```

## 两层 mount

`mount` 方法有两层实现。外层在 `runtime-dom`，处理 DOM 特定的逻辑：

```typescript
// runtime-dom/src/index.ts
app.mount = (containerOrSelector: Element | ShadowRoot | string): any => {
  // 1. 规范化容器
  const container = normalizeContainer(containerOrSelector)
  if (!container) return
  
  const component = app._component
  
  // 2. 如果组件没有 render 和 template，使用容器的 innerHTML
  if (!isFunction(component) && !component.render && !component.template) {
    component.template = container.innerHTML
  }
  
  // 3. 清空容器
  container.innerHTML = ''
  
  // 4. 调用核心层的 mount
  const proxy = mount(container, false, container instanceof SVGElement)
  
  // 5. 移除 v-cloak，添加 data-v-app
  if (container instanceof Element) {
    container.removeAttribute('v-cloak')
    container.setAttribute('data-v-app', '')
  }
  
  return proxy
}
```

内层在 `runtime-core`，执行实际的挂载逻辑：

```typescript
// runtime-core/src/apiCreateApp.ts
mount(
  rootContainer: HostElement,
  isHydrate?: boolean,
  isSVG?: boolean
): any {
  if (!isMounted) {
    // 1. 创建根组件的 VNode
    const vnode = createVNode(rootComponent, rootProps)
    
    // 2. 存储应用上下文
    vnode.appContext = context
    
    // 3. 开发环境设置重载函数
    if (__DEV__) {
      context.reload = () => {
        render(cloneVNode(vnode), rootContainer, isSVG)
      }
    }
    
    // 4. 渲染
    if (isHydrate && hydrate) {
      hydrate(vnode as VNode<Node, Element>, rootContainer as any)
    } else {
      render(vnode, rootContainer, isSVG)
    }
    
    // 5. 标记已挂载
    isMounted = true
    app._container = rootContainer
    
    // 6. 返回根组件代理
    return getExposeProxy(vnode.component!) || vnode.component!.proxy
  } else if (__DEV__) {
    warn('App has already been mounted.')
  }
}
```

## 容器规范化

`normalizeContainer` 处理选择器字符串：

```typescript
function normalizeContainer(
  container: Element | ShadowRoot | string
): Element | null {
  if (isString(container)) {
    const res = document.querySelector(container)
    if (__DEV__ && !res) {
      warn(`Failed to mount app: mount target selector "${container}" returned null.`)
    }
    return res
  }
  return container as any
}
```

可以传入选择器字符串或 DOM 元素。

## render 函数

`render` 是渲染器的入口：

```typescript
const render: RootRenderFunction = (vnode, container, isSVG) => {
  if (vnode == null) {
    // 卸载
    if (container._vnode) {
      unmount(container._vnode, null, null, true)
    }
  } else {
    // 挂载或更新
    patch(container._vnode || null, vnode, container, null, null, null, isSVG)
  }
  
  // 执行调度任务
  flushPreFlushCbs()
  flushPostFlushCbs()
  
  // 保存当前 VNode
  container._vnode = vnode
}
```

首次挂载时，`container._vnode` 为空，`patch` 执行挂载。后续更新时，`patch` 执行 diff 和更新。

## patch 函数

`patch` 根据 VNode 类型分发处理：

```typescript
const patch: PatchFn = (
  n1,        // 旧 VNode
  n2,        // 新 VNode
  container, // 容器
  anchor,    // 锚点
  parentComponent,
  parentSuspense,
  isSVG,
  slotScopeIds,
  optimized
) => {
  // 如果新旧 VNode 类型不同，直接卸载旧的
  if (n1 && !isSameVNodeType(n1, n2)) {
    unmount(n1, parentComponent, parentSuspense, true)
    n1 = null
  }
  
  const { type, ref, shapeFlag } = n2
  
  switch (type) {
    case Text:
      processText(n1, n2, container, anchor)
      break
    case Comment:
      processCommentNode(n1, n2, container, anchor)
      break
    case Static:
      // 静态节点
      break
    case Fragment:
      processFragment(n1, n2, container, anchor, ...)
      break
    default:
      if (shapeFlag & ShapeFlags.ELEMENT) {
        processElement(n1, n2, container, anchor, ...)
      } else if (shapeFlag & ShapeFlags.COMPONENT) {
        processComponent(n1, n2, container, anchor, ...)
      } else if (shapeFlag & ShapeFlags.TELEPORT) {
        type.process(n1, n2, container, anchor, ...)
      } else if (shapeFlag & ShapeFlags.SUSPENSE) {
        type.process(n1, n2, container, anchor, ...)
      }
  }
  
  // 设置 ref
  if (ref != null && parentComponent) {
    setRef(ref, n1 && n1.ref, parentSuspense, n2 || n1, !n2)
  }
}
```

对于根组件，进入 `processComponent`。

## processComponent

处理组件的挂载和更新：

```typescript
const processComponent = (
  n1: VNode | null,
  n2: VNode,
  container: RendererElement,
  anchor: RendererNode | null,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: SuspenseBoundary | null,
  isSVG: boolean,
  slotScopeIds: string[] | null,
  optimized: boolean
) => {
  if (n1 == null) {
    // 挂载
    if (n2.shapeFlag & ShapeFlags.COMPONENT_KEPT_ALIVE) {
      // KeepAlive 激活
      parentComponent!.ctx.activate(n2, container, anchor, isSVG, optimized)
    } else {
      // 正常挂载
      mountComponent(n2, container, anchor, parentComponent, parentSuspense, isSVG, optimized)
    }
  } else {
    // 更新
    updateComponent(n1, n2, optimized)
  }
}
```

## mountComponent

组件挂载的核心：

```typescript
const mountComponent: MountComponentFn = (
  initialVNode,
  container,
  anchor,
  parentComponent,
  parentSuspense,
  isSVG,
  optimized
) => {
  // 1. 创建组件实例
  const instance: ComponentInternalInstance = (
    initialVNode.component = createComponentInstance(
      initialVNode,
      parentComponent,
      parentSuspense
    )
  )
  
  // 2. 设置 KeepAlive 的注入（如果需要）
  if (isKeepAlive(initialVNode)) {
    instance.ctx.renderer = internals
  }
  
  // 3. 设置组件
  setupComponent(instance)
  
  // 4. 处理异步 setup（Suspense）
  if (__FEATURE_SUSPENSE__ && instance.asyncDep) {
    parentSuspense && parentSuspense.registerDep(instance, setupRenderEffect)
    
    if (!initialVNode.el) {
      const placeholder = (instance.subTree = createVNode(Comment))
      processCommentNode(null, placeholder, container, anchor)
    }
    return
  }
  
  // 5. 设置渲染副作用
  setupRenderEffect(
    instance,
    initialVNode,
    container,
    anchor,
    parentSuspense,
    isSVG,
    optimized
  )
}
```

这个函数串联了组件初始化的主要步骤：创建实例 → 设置组件 → 设置渲染副作用。

## setupRenderEffect

建立响应式渲染：

```typescript
const setupRenderEffect: SetupRenderEffectFn = (
  instance,
  initialVNode,
  container,
  anchor,
  parentSuspense,
  isSVG,
  optimized
) => {
  const componentUpdateFn = () => {
    if (!instance.isMounted) {
      // 首次挂载
      const { el, props } = initialVNode
      const { bm, m, parent } = instance
      
      // beforeMount 钩子
      if (bm) {
        invokeArrayFns(bm)
      }
      
      // 渲染组件
      const subTree = (instance.subTree = renderComponentRoot(instance))
      
      // 挂载子树
      patch(null, subTree, container, anchor, instance, parentSuspense, isSVG)
      
      // 保存 el
      initialVNode.el = subTree.el
      
      // mounted 钩子
      if (m) {
        queuePostRenderEffect(m, parentSuspense)
      }
      
      instance.isMounted = true
    } else {
      // 更新
      let { next, bu, u, parent, vnode } = instance
      
      if (next) {
        next.el = vnode.el
        updateComponentPreRender(instance, next, optimized)
      } else {
        next = vnode
      }
      
      // beforeUpdate 钩子
      if (bu) {
        invokeArrayFns(bu)
      }
      
      // 渲染新的子树
      const nextTree = renderComponentRoot(instance)
      const prevTree = instance.subTree
      instance.subTree = nextTree
      
      // diff 更新
      patch(prevTree, nextTree, hostParentNode(prevTree.el!)!, getNextHostNode(prevTree), instance, parentSuspense, isSVG)
      
      next.el = nextTree.el
      
      // updated 钩子
      if (u) {
        queuePostRenderEffect(u, parentSuspense)
      }
    }
  }
  
  // 创建响应式副作用
  const effect = (instance.effect = new ReactiveEffect(
    componentUpdateFn,
    () => queueJob(update),
    instance.scope
  ))
  
  const update: SchedulerJob = (instance.update = () => effect.run())
  update.id = instance.uid
  
  // 触发首次渲染
  update()
}
```

这是组件渲染的核心。`ReactiveEffect` 包装了渲染函数，当依赖的响应式数据变化时，`queueJob(update)` 将更新加入调度队列。

## 挂载流程总结

完整的挂载流程：

```
app.mount('#app')
  │
  ├─ normalizeContainer('#app')     // 获取容器元素
  │
  ├─ createVNode(rootComponent)     // 创建根组件 VNode
  │
  └─ render(vnode, container)
       │
       └─ patch(null, vnode, container)
            │
            └─ processComponent(null, vnode, container)
                 │
                 └─ mountComponent(vnode, container)
                      │
                      ├─ createComponentInstance()    // 创建实例
                      │
                      ├─ setupComponent()             // 设置组件
                      │
                      └─ setupRenderEffect()          // 设置响应式渲染
                           │
                           ├─ renderComponentRoot()   // 渲染组件
                           │
                           └─ patch(null, subTree)    // 挂载子树（递归）
```

## 卸载

`app.unmount()` 卸载应用：

```typescript
unmount() {
  if (isMounted) {
    render(null, app._container)
    delete app._container.__vue_app__
  }
}
```

传入 `null` 给 `render`，触发卸载逻辑。

## 小结

`app.mount` 是 Vue 应用启动的入口。它创建根组件的 VNode，调用渲染器的 `render` 函数，最终通过 `patch` 将组件挂载到 DOM。

挂载流程的核心是 `mountComponent`——创建组件实例，设置组件，建立响应式渲染。`setupRenderEffect` 是响应式更新的关键，它将组件渲染包装在 `ReactiveEffect` 中，实现数据驱动的自动更新。

在下一章中，我们将分析 `defineComponent` 的实现。
