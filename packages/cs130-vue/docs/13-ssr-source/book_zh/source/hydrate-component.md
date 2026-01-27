# hydrateComponent 组件水合

`hydrateComponent` 处理 Vue 组件的水合过程。组件水合是最复杂的情况，涉及实例创建、状态恢复、响应式建立等多个步骤。

## 组件水合的特殊性

组件不直接对应单个 DOM 节点，而是一棵 DOM 子树。水合时需要：

1. 创建组件实例
2. 执行 setup
3. 渲染得到 subTree
4. 将 subTree 与 DOM 关联
5. 建立响应式更新机制

## 函数签名

```typescript
function hydrateComponent(
  node: Node | null,
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null,
  optimized: boolean
): Node | null
```

## 核心实现

```typescript
function hydrateComponent(
  node: Node | null,
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null,
  optimized: boolean
): Node | null {
  // 创建组件实例
  const instance = createComponentInstance(vnode, parentComponent)
  vnode.component = instance
  
  // 标记为水合模式
  instance.isHydrating = true
  
  // 设置组件
  setupComponent(instance)
  
  // 设置渲染效果
  setupRenderEffect(instance, vnode, node, optimized)
  
  // 标记水合完成
  instance.isHydrating = false
  
  // 返回组件后的下一个节点
  return locateNextSibling(instance)
}
```

## 组件实例创建

```typescript
function createComponentInstance(
  vnode: VNode,
  parent: ComponentInternalInstance | null
): ComponentInternalInstance {
  const instance: ComponentInternalInstance = {
    vnode,
    parent,
    type: vnode.type as Component,
    props: {},
    attrs: {},
    slots: {},
    refs: {},
    emit: null!,
    proxy: null,
    
    // 生命周期
    isMounted: false,
    isUnmounted: false,
    isHydrating: false,
    
    // 渲染
    render: null,
    subTree: null!,
    update: null!,
    
    // 生命周期钩子
    bc: null,  // beforeCreate
    c: null,   // created
    bm: null,  // beforeMount
    m: null,   // mounted
    // ...
  }
  
  instance.emit = createEmit(instance)
  
  return instance
}
```

## Setup 执行

```typescript
function setupComponent(instance: ComponentInternalInstance) {
  const Component = instance.type
  const { props, children } = instance.vnode
  
  // 初始化 props
  initProps(instance, props)
  
  // 初始化 slots
  initSlots(instance, children)
  
  // 执行 setup
  if (Component.setup) {
    const setupContext = createSetupContext(instance)
    
    // 设置当前实例
    setCurrentInstance(instance)
    
    // 执行 setup（可能是异步的）
    const setupResult = Component.setup(instance.props, setupContext)
    
    // 重置当前实例
    setCurrentInstance(null)
    
    // 处理 setup 返回值
    handleSetupResult(instance, setupResult)
  }
  
  // 编译模板或使用 render 函数
  finishComponentSetup(instance)
}
```

## 渲染效果设置

```typescript
function setupRenderEffect(
  instance: ComponentInternalInstance,
  vnode: VNode,
  hydrateNode: Node | null,
  optimized: boolean
) {
  // 创建响应式效果
  const effect = new ReactiveEffect(
    () => componentUpdateFn(instance, hydrateNode, optimized),
    () => queueJob(instance.update)
  )
  
  // 保存 update 函数
  instance.update = effect.run.bind(effect)
  
  // 首次执行
  instance.update()
}

function componentUpdateFn(
  instance: ComponentInternalInstance,
  hydrateNode: Node | null,
  optimized: boolean
) {
  if (!instance.isMounted) {
    // 首次挂载（水合）
    
    // 调用 beforeMount 钩子
    if (instance.bm) {
      invokeArrayFns(instance.bm)
    }
    
    // 获取渲染结果
    const subTree = (instance.subTree = instance.render!.call(instance.proxy))
    
    // 水合子树
    hydrateNode(hydrateNode, subTree, instance, optimized)
    
    // 更新 vnode.el
    vnode.el = subTree.el
    
    // 标记已挂载
    instance.isMounted = true
    
    // 调用 mounted 钩子
    if (instance.m) {
      queuePostFlushCb(instance.m)
    }
  } else {
    // 后续更新走正常 patch 流程
    const prevTree = instance.subTree
    const nextTree = (instance.subTree = instance.render!.call(instance.proxy))
    
    patch(prevTree, nextTree, hostParentNode(prevTree.el!), null, instance, optimized)
    
    vnode.el = nextTree.el
  }
}
```

## 异步组件水合

异步组件需要等待加载：

```typescript
async function hydrateAsyncComponent(
  node: Node | null,
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null
): Promise<Node | null> {
  const asyncComp = vnode.type as AsyncComponentLoader
  
  // 加载组件
  const resolvedComp = await asyncComp.loader()
  
  // 替换 type
  vnode.type = resolvedComp
  
  // 水合解析后的组件
  return hydrateComponent(node, vnode, parentComponent, false)
}
```

## 状态恢复

从服务端传递的状态需要在水合时恢复：

```typescript
function restoreState(instance: ComponentInternalInstance) {
  const { type } = instance
  
  // 从 window 获取服务端注入的状态
  const serverState = window.__INITIAL_STATE__
  
  if (serverState && type.__serverStateKey) {
    const componentState = serverState[type.__serverStateKey]
    
    if (componentState) {
      // 合并到组件的响应式数据
      Object.assign(instance.data, componentState)
    }
  }
}
```

## Suspense 中的组件水合

在 Suspense 边界内的组件水合：

```typescript
function hydrateComponentInSuspense(
  node: Node | null,
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null,
  suspense: SuspenseBoundary
): Node | null {
  const instance = createComponentInstance(vnode, parentComponent)
  
  // 关联 Suspense 边界
  instance.suspense = suspense
  
  // 异步 setup 会注册到 Suspense
  if (instance.type.setup?.constructor.name === 'AsyncFunction') {
    suspense.registerAsyncDep(instance)
  }
  
  return hydrateComponent(node, vnode, parentComponent, false)
}
```

## 函数式组件

函数式组件没有实例，直接调用：

```typescript
function hydrateFunctionalComponent(
  node: Node | null,
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null
): Node | null {
  const Component = vnode.type as FunctionalComponent
  
  // 直接调用获取 VNode
  const subTree = Component(vnode.props, {
    slots: vnode.children,
    emit: () => {},
    attrs: vnode.props
  })
  
  // 水合返回的 VNode
  return hydrateNode(node, normalizeVNode(subTree), parentComponent)
}
```

## 定位下一个节点

组件水合后需要找到下一个兄弟节点：

```typescript
function locateNextSibling(instance: ComponentInternalInstance): Node | null {
  const subTree = instance.subTree
  
  if (subTree.shapeFlag & ShapeFlags.COMPONENT) {
    // 子树也是组件，递归
    return locateNextSibling(subTree.component!)
  }
  
  // 子树是元素或 Fragment
  if (subTree.type === Fragment) {
    // Fragment 的最后一个元素
    const children = subTree.children as VNode[]
    const lastChild = children[children.length - 1]
    return lastChild?.el?.nextSibling || null
  }
  
  return subTree.el?.nextSibling || null
}
```

## 生命周期钩子

水合时的生命周期执行：

```typescript
function executeLifecycleHooks(instance: ComponentInternalInstance) {
  // beforeMount 同步执行
  if (instance.bm) {
    invokeArrayFns(instance.bm)
  }
  
  // mounted 需要在 DOM 更新后执行
  if (instance.m) {
    queuePostFlushCb(() => {
      invokeArrayFns(instance.m!)
    })
  }
}
```

## 完整示例

```typescript
function hydrateComponentFull(
  node: Node | null,
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null
): Node | null {
  const instance = createComponentInstance(vnode, parentComponent)
  vnode.component = instance
  
  // 1. 初始化
  const { props, children } = vnode
  initProps(instance, props)
  initSlots(instance, children)
  
  // 2. Setup
  instance.isHydrating = true
  setupComponent(instance)
  
  // 3. 获取渲染结果
  const subTree = instance.render!.call(instance.proxy)
  instance.subTree = subTree
  
  // 4. 水合子树
  hydrateNode(node, subTree, instance, false)
  
  // 5. 关联 el
  vnode.el = subTree.el
  
  // 6. 设置响应式
  const effect = new ReactiveEffect(
    () => {
      if (instance.isMounted) {
        // 更新逻辑
        const prevTree = instance.subTree
        const nextTree = instance.render!.call(instance.proxy)
        instance.subTree = nextTree
        patch(prevTree, nextTree)
      }
    },
    () => queueJob(instance.update)
  )
  
  instance.update = () => effect.run()
  instance.isMounted = true
  instance.isHydrating = false
  
  // 7. 触发 mounted
  if (instance.m) {
    queuePostFlushCb(instance.m)
  }
  
  return locateNextSibling(instance)
}
```

## 调试

```typescript
if (__DEV__) {
  instance.__debug = {
    hydrateStart: performance.now(),
    propsReceived: { ...props },
    nodeHydrated: node
  }
}
```

## 小结

`hydrateComponent` 处理组件节点的水合：

1. 创建组件实例
2. 执行 setup 和渲染
3. 将渲染结果与 DOM 关联
4. 建立响应式更新机制
5. 执行生命周期钩子
6. 定位并返回下一个节点

组件水合是 SSR 应用客户端激活的核心，它让服务端渲染的静态 HTML 变成可交互的 Vue 应用。
