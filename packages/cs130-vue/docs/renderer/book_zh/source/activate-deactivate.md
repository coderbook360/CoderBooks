# activate 与 deactivate

KeepAlive 组件的核心在于 activate 和 deactivate 两个方法，它们分别负责将缓存的组件激活（恢复显示）和停用（移入隐藏容器）。这两个方法与渲染器紧密配合，实现了组件实例的复用而非销毁重建。

## 渲染器集成点

在渲染器的组件处理流程中，有专门的分支处理带有 COMPONENT_KEPT_ALIVE 标记的 VNode：

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
  n2.slotScopeIds = slotScopeIds
  
  if (n1 == null) {
    // 挂载
    if (n2.shapeFlag & ShapeFlags.COMPONENT_KEPT_ALIVE) {
      // 从缓存激活，调用 activate
      ;(parentComponent!.ctx as KeepAliveContext).activate(
        n2,
        container,
        anchor,
        isSVG,
        optimized
      )
    } else {
      // 正常挂载
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

当旧节点为 null（挂载场景）且新 VNode 带有 `COMPONENT_KEPT_ALIVE` 标记时，渲染器不会执行常规的 mountComponent，而是调用父组件上下文中的 activate 方法。这个父组件就是 KeepAlive，它在 setup 时将 activate 方法注册到了自己的 ctx 上。

## activate 详解

activate 方法负责将缓存的组件从隐藏容器移回可见的 DOM 树，并触发相应的生命周期钩子：

```typescript
sharedContext.activate = (
  vnode: VNode,
  container: RendererElement,
  anchor: RendererNode | null,
  isSVG: boolean,
  optimized: boolean
) => {
  const instance = vnode.component!
  
  // 步骤 1：移动 DOM 节点
  move(vnode, container, anchor, MoveType.ENTER, parentSuspense)
  
  // 步骤 2：同步 props 变化
  // 缓存期间 props 可能已经变化，需要 patch 来同步
  patch(
    instance.vnode,
    vnode,
    container,
    anchor,
    instance,
    parentSuspense,
    isSVG,
    vnode.slotScopeIds,
    optimized
  )
  
  // 步骤 3：异步触发生命周期
  queuePostRenderEffect(() => {
    // 标记为非停用状态
    instance.isDeactivated = false
    
    // 调用 activated 钩子数组
    if (instance.a) {
      invokeArrayFns(instance.a)
    }
    
    // 调用 VNode 的 onVnodeMounted 钩子
    const vnodeHook = vnode.props && vnode.props.onVnodeMounted
    if (vnodeHook) {
      invokeVNodeHook(vnodeHook, instance.parent, vnode)
    }
  }, parentSuspense)
  
  // 开发工具通知
  if (__DEV__ || __FEATURE_PROD_DEVTOOLS__) {
    devtoolsComponentAdded(instance)
  }
}
```

这段代码清晰地展示了激活的三个阶段。首先是 DOM 移动——这是最关键的一步，将组件的整个子树从隐藏容器移到目标位置。move 函数会递归处理子节点，确保整个 DOM 结构正确迁移。

然后是 props 同步。组件在缓存期间可能错过了 props 的更新，activate 时需要通过 patch 将当前的 props 同步到组件实例。这个 patch 调用会触发组件的更新逻辑，但由于 DOM 已经存在，不会重新创建元素。

最后是生命周期触发。activated 钩子在 post 队列中调用，确保在当前渲染周期完成后执行。这让开发者可以在钩子中安全地访问更新后的 DOM。

## MoveType.ENTER

move 函数接收一个 MoveType 参数来区分不同的移动场景：

```typescript
export const enum MoveType {
  ENTER,
  LEAVE,
  REORDER
}
```

ENTER 表示组件正在进入可见状态，这对 Transition 组件很重要——如果组件包装在 Transition 中，ENTER 类型会触发进入动画。相应地，LEAVE 类型触发离开动画，REORDER 用于列表重排序时的简单移动。

## deactivate 详解

deactivate 方法将组件移入隐藏容器并触发 deactivated 钩子：

```typescript
sharedContext.deactivate = (vnode: VNode) => {
  const instance = vnode.component!
  
  // 步骤 1：移动到隐藏容器
  move(vnode, storageContainer, null, MoveType.LEAVE, parentSuspense)
  
  // 步骤 2：异步触发生命周期
  queuePostRenderEffect(() => {
    // 调用 deactivated 钩子数组
    if (instance.da) {
      invokeArrayFns(instance.da)
    }
    
    // 调用 VNode 的 onVnodeUnmounted 钩子
    const vnodeHook = vnode.props && vnode.props.onVnodeUnmounted
    if (vnodeHook) {
      invokeVNodeHook(vnodeHook, instance.parent, vnode)
    }
    
    // 标记为停用状态
    instance.isDeactivated = true
  }, parentSuspense)
  
  // 开发工具通知
  if (__DEV__ || __FEATURE_PROD_DEVTOOLS__) {
    devtoolsComponentRemoved(instance)
  }
}
```

与 activate 相比，deactivate 更简单一些。组件被移动到 storageContainer 这个离屏容器中，然后异步触发 deactivated 钩子。注意 isDeactivated 标记是在钩子之后设置的，这让钩子函数可以检查组件的前一个状态。

## 隐藏容器

storageContainer 是 KeepAlive 维护的一个离屏 DOM 元素：

```typescript
// 在 KeepAlive setup 中创建
const storageContainer = createElement('div')
```

这个 div 永远不会插入到文档的 DOM 树中，但它持有对被停用组件 DOM 子树的引用，防止这些节点被垃圾回收。当组件重新激活时，这些节点会被移回可见的容器。

这种设计有几个好处：DOM 节点保持完整，避免重建开销；事件监听器和内部状态保留；与浏览器的渲染管线解耦，不在屏幕上占用任何空间。

## 渲染器卸载集成

卸载流程也需要特殊处理 KeepAlive 组件的子节点：

```typescript
const unmount: UnmountFn = (
  vnode,
  parentComponent,
  parentSuspense,
  doRemove = false,
  optimized = false
) => {
  const {
    type,
    props,
    ref,
    children,
    dynamicChildren,
    shapeFlag,
    patchFlag,
    dirs
  } = vnode

  // 其他卸载逻辑...

  if (shapeFlag & ShapeFlags.COMPONENT) {
    if (shapeFlag & ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE) {
      // 需要保活：调用 deactivate 而非销毁
      ;(parentComponent!.ctx as KeepAliveContext).deactivate(vnode)
    } else {
      // 正常卸载
      unmountComponent(vnode.component!, parentSuspense, doRemove)
    }
  }
}
```

当卸载的 VNode 带有 `COMPONENT_SHOULD_KEEP_ALIVE` 标记时，渲染器调用 deactivate 而非 unmountComponent。这是 KeepAlive 实现"假卸载"的关键——组件看起来被卸载了，实际上只是移到了隐藏容器。

## 生命周期钩子

Vue 为 KeepAlive 场景提供了专门的生命周期钩子：

```typescript
// 组合式 API
import { onActivated, onDeactivated } from 'vue'

export default {
  setup() {
    onActivated(() => {
      // 组件从缓存激活时调用
      console.log('Component activated')
    })
    
    onDeactivated(() => {
      // 组件被停用进入缓存时调用
      console.log('Component deactivated')
    })
  }
}

// 选项式 API
export default {
  activated() {
    // 激活时调用
  },
  deactivated() {
    // 停用时调用
  }
}
```

这些钩子对于管理组件的副作用很有用。比如，可以在 activated 中恢复定时器或重新订阅数据源，在 deactivated 中暂停它们以节省资源。

## 钩子注册机制

activated 和 deactivated 钩子在组件实例上存储为数组：

```typescript
export interface ComponentInternalInstance {
  // ...其他属性
  
  // activated 钩子数组
  a: LifecycleHook
  
  // deactivated 钩子数组
  da: LifecycleHook
  
  // 停用状态标记
  isDeactivated: boolean
}

// 注册钩子的函数
export const onActivated = (hook: Function) => {
  const instance = getCurrentInstance()!
  if (instance) {
    registerKeepAliveHook(instance, 'a', hook)
  }
}

export const onDeactivated = (hook: Function) => {
  const instance = getCurrentInstance()!
  if (instance) {
    registerKeepAliveHook(instance, 'da', hook)
  }
}
```

钩子注册时会向上查找父级的 KeepAlive，确保钩子只在真正被 KeepAlive 包裹时才有意义。

## 与 Transition 的配合

KeepAlive 和 Transition 可以组合使用，实现带动画的组件缓存切换：

```html
<Transition>
  <KeepAlive>
    <component :is="currentView" />
  </KeepAlive>
</Transition>
```

当组件激活时，move 函数使用 MoveType.ENTER，触发 Transition 的进入动画；停用时使用 MoveType.LEAVE，触发离开动画。这种组合让缓存组件的切换也能拥有流畅的视觉效果。

## 小结

activate 和 deactivate 是 KeepAlive 与渲染器协作的桥梁。activate 通过 DOM 移动和 props 同步恢复缓存组件的显示，deactivate 将组件移入隐藏容器保持存活。ShapeFlag 标记让渲染器知道何时调用这些方法而非执行常规的挂载卸载流程。专门的生命周期钩子为开发者提供了管理副作用的时机。这套机制让 Vue 能够在保持组件实例和 DOM 状态的同时实现高效的组件切换。
