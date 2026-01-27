# processComponent 组件处理

`processComponent` 处理组件 VNode 的挂载和更新。组件是 Vue 的核心抽象，它封装了状态、逻辑和渲染。

## 函数签名

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
) => { ... }
```

## 实现

```typescript
const processComponent = (
  n1,
  n2,
  container,
  anchor,
  parentComponent,
  parentSuspense,
  isSVG,
  slotScopeIds,
  optimized
) => {
  n2.slotScopeIds = slotScopeIds
  
  if (n1 == null) {
    // 挂载
    if (n2.shapeFlag & ShapeFlags.COMPONENT_KEPT_ALIVE) {
      // KeepAlive 激活
      ;(parentComponent!.ctx as KeepAliveContext).activate(
        n2,
        container,
        anchor,
        isSVG,
        optimized
      )
    } else {
      // 普通挂载
      mountComponent(
        n2,
        container,
        anchor,
        parentComponent,
        parentSuspense,
        isSVG,
        optimized
      )
    }
  } else {
    // 更新
    updateComponent(n1, n2, optimized)
  }
}
```

## 挂载：mountComponent

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
  const instance: ComponentInternalInstance =
    (initialVNode.component = createComponentInstance(
      initialVNode,
      parentComponent,
      parentSuspense
    ))

  // 2. 处理 KeepAlive
  if (isKeepAlive(initialVNode)) {
    ;(instance.ctx as KeepAliveContext).renderer = internals
  }

  // 3. 设置组件（解析 props、slots、setup 等）
  setupComponent(instance)

  // 4. 处理异步组件
  if (__FEATURE_SUSPENSE__ && instance.asyncDep) {
    parentSuspense && parentSuspense.registerDep(instance, setupRenderEffect)
    
    // 创建占位节点
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

## 组件实例：createComponentInstance

```typescript
function createComponentInstance(
  vnode: VNode,
  parent: ComponentInternalInstance | null,
  suspense: SuspenseBoundary | null
): ComponentInternalInstance {
  const type = vnode.type as ConcreteComponent
  const appContext = 
    (parent ? parent.appContext : vnode.appContext) || emptyAppContext

  const instance: ComponentInternalInstance = {
    uid: uid++,
    vnode,
    type,
    parent,
    appContext,
    root: null!,
    next: null,
    subTree: null!,
    effect: null!,
    update: null!,
    scope: new EffectScope(true),
    render: null,
    proxy: null,
    exposed: null,
    exposeProxy: null,
    withProxy: null,
    provides: parent ? parent.provides : Object.create(appContext.provides),
    accessCache: null!,
    renderCache: [],

    // 组件本地状态
    components: null,
    directives: null,

    // props 相关
    propsOptions: normalizePropsOptions(type, appContext),
    emitsOptions: normalizeEmitsOptions(type, appContext),

    // emit
    emit: null!,
    emitted: null,

    // props 默认值
    propsDefaults: EMPTY_OBJ,

    // inheritAttrs
    inheritAttrs: type.inheritAttrs,

    // 状态
    ctx: EMPTY_OBJ,
    data: EMPTY_OBJ,
    props: EMPTY_OBJ,
    attrs: EMPTY_OBJ,
    slots: EMPTY_OBJ,
    refs: EMPTY_OBJ,
    setupState: EMPTY_OBJ,
    setupContext: null,

    // suspense
    suspense,
    suspenseId: suspense ? suspense.pendingId : 0,
    asyncDep: null,
    asyncResolved: false,

    // 生命周期
    isMounted: false,
    isUnmounted: false,
    isDeactivated: false,
    bc: null,  // beforeCreate
    c: null,   // created
    bm: null,  // beforeMount
    m: null,   // mounted
    bu: null,  // beforeUpdate
    u: null,   // updated
    um: null,  // unmount
    bum: null, // beforeUnmount
    da: null,  // deactivated
    a: null,   // activated
    rtg: null, // renderTriggered
    rtc: null, // renderTracked
    ec: null,  // errorCaptured
    sp: null,  // serverPrefetch
  }

  instance.ctx = { _: instance }
  instance.root = parent ? parent.root : instance
  instance.emit = emit.bind(null, instance)

  return instance
}
```

## setupComponent

```typescript
function setupComponent(
  instance: ComponentInternalInstance,
  isSSR = false
): Promise<void> | undefined {
  const { props, children } = instance.vnode
  const isStateful = instance.vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT

  // 初始化 props
  initProps(instance, props, isStateful, isSSR)
  // 初始化 slots
  initSlots(instance, children)

  // 有状态组件执行 setup
  const setupResult = isStateful
    ? setupStatefulComponent(instance, isSSR)
    : undefined

  return setupResult
}
```

## setupRenderEffect

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
      let vnodeHook: VNodeHook | null | undefined
      const { el, props } = initialVNode
      const { bm, m, parent } = instance
      const isAsyncWrapperVNode = isAsyncWrapper(initialVNode)

      // beforeMount 钩子
      if (bm) {
        invokeArrayFns(bm)
      }
      // onVnodeBeforeMount
      if ((vnodeHook = props && props.onVnodeBeforeMount)) {
        invokeVNodeHook(vnodeHook, parent, initialVNode)
      }

      // 渲染子树
      const subTree = (instance.subTree = renderComponentRoot(instance))

      // patch 子树
      patch(
        null,
        subTree,
        container,
        anchor,
        instance,
        parentSuspense,
        isSVG
      )
      
      // 保存 el 引用
      initialVNode.el = subTree.el

      // mounted 钩子（post queue）
      if (m) {
        queuePostRenderEffect(m, parentSuspense)
      }
      // onVnodeMounted
      if ((vnodeHook = props && props.onVnodeMounted)) {
        const scopedInitialVNode = initialVNode
        queuePostRenderEffect(
          () => invokeVNodeHook(vnodeHook!, parent, scopedInitialVNode),
          parentSuspense
        )
      }

      instance.isMounted = true
    } else {
      // 更新
      let { next, bu, u, parent, vnode } = instance
      let originNext = next
      let vnodeHook: VNodeHook | null | undefined

      if (next) {
        next.el = vnode.el
        updateComponentPreRender(instance, next, optimized)
      } else {
        next = vnode
      }

      // beforeUpdate
      if (bu) {
        invokeArrayFns(bu)
      }
      if ((vnodeHook = next.props && next.props.onVnodeBeforeUpdate)) {
        invokeVNodeHook(vnodeHook, parent, next, vnode)
      }

      // 渲染新子树
      const nextTree = renderComponentRoot(instance)
      const prevTree = instance.subTree
      instance.subTree = nextTree

      // patch
      patch(
        prevTree,
        nextTree,
        hostParentNode(prevTree.el!)!,
        getNextHostNode(prevTree),
        instance,
        parentSuspense,
        isSVG
      )

      next.el = nextTree.el

      // updated 钩子
      if (u) {
        queuePostRenderEffect(u, parentSuspense)
      }
      if ((vnodeHook = next.props && next.props.onVnodeUpdated)) {
        queuePostRenderEffect(
          () => invokeVNodeHook(vnodeHook!, parent, next!, vnode),
          parentSuspense
        )
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
  
  // 首次执行
  update()
}
```

## 更新：updateComponent

```typescript
const updateComponent = (n1: VNode, n2: VNode, optimized: boolean) => {
  const instance = (n2.component = n1.component)!
  
  if (shouldUpdateComponent(n1, n2, optimized)) {
    // 需要更新
    instance.next = n2
    // 取消已排队的更新
    invalidateJob(instance.update)
    // 执行更新
    instance.update()
  } else {
    // 不需要更新，只复制属性
    n2.el = n1.el
    instance.vnode = n2
  }
}
```

## shouldUpdateComponent

```typescript
function shouldUpdateComponent(
  prevVNode: VNode,
  nextVNode: VNode,
  optimized?: boolean
): boolean {
  const { props: prevProps, children: prevChildren } = prevVNode
  const { props: nextProps, children: nextChildren, patchFlag } = nextVNode

  // 有指令或 transition 总是更新
  if (nextVNode.dirs || nextVNode.transition) {
    return true
  }

  if (optimized && patchFlag >= 0) {
    if (patchFlag & PatchFlags.DYNAMIC_SLOTS) {
      return true
    }
    if (patchFlag & PatchFlags.FULL_PROPS) {
      if (!prevProps) return !!nextProps
      return hasPropsChanged(prevProps, nextProps!)
    } else if (patchFlag & PatchFlags.PROPS) {
      const dynamicProps = nextVNode.dynamicProps!
      for (let i = 0; i < dynamicProps.length; i++) {
        const key = dynamicProps[i]
        if (nextProps![key] !== prevProps![key]) {
          return true
        }
      }
    }
  } else {
    // 非优化模式
    if (prevChildren || nextChildren) {
      if (!nextChildren || !(nextChildren as any).$stable) {
        return true
      }
    }
    if (prevProps === nextProps) {
      return false
    }
    if (!prevProps) {
      return !!nextProps
    }
    if (!nextProps) {
      return true
    }
    return hasPropsChanged(prevProps, nextProps)
  }

  return false
}
```

## 生命周期流程

挂载：
1. createComponentInstance
2. setupComponent (props, slots, setup)
3. beforeMount
4. renderComponentRoot（生成 subTree）
5. patch(subTree)
6. mounted（异步）

更新：
1. shouldUpdateComponent 检查
2. beforeUpdate
3. renderComponentRoot（新 subTree）
4. patch(prevTree, nextTree)
5. updated（异步）

## 小结

`processComponent` 是组件处理的核心，分为挂载和更新两条路径。挂载时创建实例、执行 setup、设置响应式副作用。更新时通过 shouldUpdateComponent 判断是否需要重新渲染。组件实例维护了完整的状态和生命周期信息。
