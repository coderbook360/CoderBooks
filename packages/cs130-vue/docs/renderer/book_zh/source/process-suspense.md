# processSuspense 处理流程

Suspense 组件的处理流程由 process 方法统一调度，根据新旧节点状态分发到挂载或更新逻辑。这个方法是 Suspense 生命周期的核心入口，它需要处理异步内容的首次加载、内容更新、以及各种边界情况。

## 处理入口

当渲染器的 patch 函数遇到 Suspense 类型的 VNode 时，会调用组件自身的 process 方法：

```typescript
const SuspenseImpl = {
  name: 'Suspense',
  __isSuspense: true,
  
  process(
    n1: VNode | null,
    n2: VNode,
    container: RendererElement,
    anchor: RendererNode | null,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
    slotScopeIds: string[] | null,
    optimized: boolean,
    rendererInternals: RendererInternals
  ) {
    if (n1 == null) {
      mountSuspense(
        n2,
        container,
        anchor,
        parentComponent,
        parentSuspense,
        isSVG,
        slotScopeIds,
        optimized,
        rendererInternals
      )
    } else {
      patchSuspense(
        n1,
        n2,
        container,
        anchor,
        parentComponent,
        isSVG,
        slotScopeIds,
        optimized,
        rendererInternals
      )
    }
  }
}
```

process 方法的结构非常清晰：旧节点不存在时执行挂载，存在时执行更新。这种分离让两种场景的处理逻辑保持独立，便于维护和理解。

## 挂载细节

mountSuspense 负责 Suspense 的首次渲染，它需要完成边界创建、内容渲染、状态判断三个核心任务：

```typescript
function mountSuspense(
  vnode: VNode,
  container: RendererElement,
  anchor: RendererNode | null,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: SuspenseBoundary | null,
  isSVG: boolean,
  slotScopeIds: string[] | null,
  optimized: boolean,
  rendererInternals: RendererInternals
) {
  const {
    p: patch,
    o: { createElement }
  } = rendererInternals
  
  // 创建隐藏容器
  const hiddenContainer = createElement('div')
  
  // 创建 Suspense 边界对象
  const suspense = (vnode.suspense = createSuspenseBoundary(
    vnode,
    parentSuspense,
    parentComponent,
    container,
    hiddenContainer,
    anchor,
    isSVG,
    slotScopeIds,
    optimized,
    rendererInternals
  ))

  // 在隐藏容器中渲染 default 内容
  patch(
    null,
    (suspense.pendingBranch = vnode.ssContent!),
    hiddenContainer,
    null,
    parentComponent,
    suspense,
    isSVG,
    slotScopeIds
  )

  // 判断是否有异步依赖
  if (suspense.deps > 0) {
    // 有异步依赖：触发事件、标记状态、渲染 fallback
    triggerEvent(vnode, 'onPending')
    triggerEvent(vnode, 'onFallback')
    
    suspense.isInFallback = true
    
    patch(
      null,
      (suspense.activeBranch = vnode.ssFallback!),
      container,
      anchor,
      parentComponent,
      null,
      isSVG,
      slotScopeIds
    )
    setActiveBranch(suspense, suspense.activeBranch!)
  } else {
    // 无异步依赖：直接 resolve
    suspense.resolve(false, true)
  }
}
```

隐藏容器的使用是这段代码的精妙之处。default 内容先在离屏的 div 中渲染，这样做有两个好处：一是避免未完成的内容闪现给用户，二是可以安全地触发异步依赖的注册。渲染过程中，如果遇到异步组件或异步 setup，它们会调用 suspense.registerDep 来增加 deps 计数。

渲染完成后检查 deps：如果大于零，说明有异步依赖需要等待，就显示 fallback 并等待；如果为零，说明一切同步完成，可以直接 resolve。

## 更新流程

patchSuspense 处理 Suspense 的更新，这比挂载复杂得多，需要考虑当前状态和内容变化：

```typescript
function patchSuspense(
  n1: VNode,
  n2: VNode,
  container: RendererElement,
  anchor: RendererNode | null,
  parentComponent: ComponentInternalInstance | null,
  isSVG: boolean,
  slotScopeIds: string[] | null,
  optimized: boolean,
  { p: patch, um: unmount, o: { createElement } }: RendererInternals
) {
  const suspense = (n2.suspense = n1.suspense!)
  suspense.vnode = n2
  n2.el = n1.el

  // 获取新的 default 和 fallback 内容
  const newBranch = n2.ssContent!
  const newFallback = n2.ssFallback!

  const { activeBranch, pendingBranch, isInFallback, isHydrating } = suspense

  if (pendingBranch) {
    // 有待定内容，更新待定内容
    suspense.pendingBranch = newBranch
    
    if (isSameVNodeType(newBranch, pendingBranch)) {
      // 类型相同，直接 patch
      patch(
        pendingBranch,
        newBranch,
        suspense.hiddenContainer,
        null,
        parentComponent,
        suspense,
        isSVG,
        slotScopeIds,
        optimized
      )
      
      if (suspense.deps <= 0) {
        suspense.resolve()
      } else if (isInFallback) {
        // 仍在 fallback 状态，更新 fallback
        patch(
          activeBranch,
          newFallback,
          container,
          anchor,
          parentComponent,
          null,
          isSVG,
          slotScopeIds,
          optimized
        )
        setActiveBranch(suspense, newFallback)
      }
    } else {
      // 类型变化，增加 pendingId 使旧的 pending 失效
      suspense.pendingId++
      
      if (isHydrating) {
        suspense.isHydrating = false
        suspense.activeBranch = pendingBranch
      } else {
        unmount(pendingBranch, parentComponent, suspense)
      }
      
      // 重置依赖计数
      suspense.deps = 0
      suspense.effects.length = 0
      suspense.hiddenContainer = createElement('div')
      
      if (isInFallback) {
        // 在 fallback 状态，重新渲染新的 pending
        patch(
          null,
          newBranch,
          suspense.hiddenContainer,
          null,
          parentComponent,
          suspense,
          isSVG,
          slotScopeIds,
          optimized
        )
        
        if (suspense.deps <= 0) {
          suspense.resolve()
        } else {
          // 更新 fallback
          patch(
            activeBranch,
            newFallback,
            container,
            anchor,
            parentComponent,
            null,
            isSVG,
            slotScopeIds,
            optimized
          )
          setActiveBranch(suspense, newFallback)
        }
      } else if (activeBranch && isSameVNodeType(newBranch, activeBranch)) {
        // 新 pending 与当前 active 类型相同
        patch(
          activeBranch,
          newBranch,
          container,
          anchor,
          parentComponent,
          suspense,
          isSVG,
          slotScopeIds,
          optimized
        )
        suspense.resolve(true)
      } else {
        // 完全不同的新内容
        patch(
          null,
          newBranch,
          suspense.hiddenContainer,
          null,
          parentComponent,
          suspense,
          isSVG,
          slotScopeIds,
          optimized
        )
        
        if (suspense.deps <= 0) {
          suspense.resolve()
        }
      }
    }
  } else {
    // 无待定内容，当前显示的是实际内容
    if (activeBranch && isSameVNodeType(newBranch, activeBranch)) {
      // 类型相同，直接更新
      patch(
        activeBranch,
        newBranch,
        container,
        anchor,
        parentComponent,
        suspense,
        isSVG,
        slotScopeIds,
        optimized
      )
      setActiveBranch(suspense, newBranch)
    } else {
      // 类型变化，触发 onPending
      triggerEvent(n2, 'onPending')
      
      // 设置新的 pending
      suspense.pendingBranch = newBranch
      suspense.pendingId++
      
      // 在隐藏容器中渲染新内容
      patch(
        null,
        newBranch,
        suspense.hiddenContainer,
        null,
        parentComponent,
        suspense,
        isSVG,
        slotScopeIds,
        optimized
      )
      
      if (suspense.deps <= 0) {
        // 无新的异步依赖，直接 resolve
        suspense.resolve()
      } else {
        // 有异步依赖
        const { timeout, pendingId } = suspense
        
        if (timeout > 0) {
          // 设置超时定时器
          setTimeout(() => {
            if (suspense.pendingId === pendingId) {
              suspense.fallback(newFallback)
            }
          }, timeout)
        } else if (timeout === 0) {
          // 立即显示 fallback
          suspense.fallback(newFallback)
        }
        // timeout < 0 时保持当前内容
      }
    }
  }
}
```

更新逻辑的复杂性源于需要处理多种状态组合。核心思路是：如果有待定内容就更新待定内容，如果当前显示实际内容就判断是否需要创建新的待定。每次处理都需要检查是否可以立即 resolve。

pendingId 机制用于处理并发更新。每次创建新的 pending 时递增 pendingId，旧的 pending 的回调在执行时会检查 id 是否匹配，不匹配则说明已过时，应该放弃执行。

timeout 属性控制切换到 fallback 的时机：正值表示等待指定毫秒后切换，零表示立即切换，负值（默认 -1）表示永不切换到 fallback（保持当前内容直到新内容就绪）。

## 子内容规范化

Suspense 的两个插槽内容在 VNode 创建时需要规范化：

```typescript
export function normalizeSuspenseChildren(vnode: VNode) {
  const { shapeFlag, children } = vnode
  const isSlotChildren = shapeFlag & ShapeFlags.SLOTS_CHILDREN
  
  // 获取 default 和 fallback 内容
  let content: VNode
  let fallback: VNode
  
  if (isSlotChildren) {
    const slots = children as Slots
    content = normalizeSuspenseSlot(slots.default)
    fallback = normalizeSuspenseSlot(slots.fallback)
  } else {
    // 直接子节点作为 default
    content = normalizeSuspenseSlot(children as VNodeChild)
    fallback = normalizeVNode(null)
  }
  
  vnode.ssContent = content
  vnode.ssFallback = fallback
}

function normalizeSuspenseSlot(s: any): VNode {
  let block: VNode[] | null | undefined
  
  if (isFunction(s)) {
    const trackBlock = isBlockTreeEnabled && s._c
    if (trackBlock) {
      s._d = false
      openBlock()
    }
    s = s()
    if (trackBlock) {
      s._d = true
      block = currentBlock
      closeBlock()
    }
  }
  
  if (isArray(s)) {
    const singleChild = filterSingleRoot(s)
    s = singleChild
  }
  
  s = normalizeVNode(s)
  
  if (block && !s.dynamicChildren) {
    s.dynamicChildren = block.filter(c => c !== s)
  }
  
  return s
}
```

规范化确保无论用户如何书写 Suspense 的内容，最终都能得到统一格式的 VNode。如果是插槽形式，从 default 和 fallback 插槽提取；如果是直接子节点，将其作为 default，fallback 为空。插槽函数会被执行以获取实际的 VNode。

## 事件触发

Suspense 提供了生命周期事件供开发者监听：

```typescript
function triggerEvent(
  vnode: VNode,
  name: 'onResolve' | 'onPending' | 'onFallback'
) {
  const eventListener = vnode.props && vnode.props[name]
  if (isFunction(eventListener)) {
    eventListener()
  }
}
```

三个事件分别对应：onPending 在进入等待状态时触发、onFallback 在显示 fallback 时触发、onResolve 在异步内容就绪时触发。这些事件让开发者能够在状态转换时执行自定义逻辑，比如记录加载时间或显示额外的 UI 反馈。

## 边界标记

setActiveBranch 函数用于更新 Suspense 边界的活动分支并维护 VNode 引用：

```typescript
function setActiveBranch(
  suspense: SuspenseBoundary,
  branch: VNode
) {
  suspense.activeBranch = branch
  const { vnode, parentComponent } = suspense
  const el = (vnode.el = branch.el)
  
  // 更新父组件的根元素引用
  if (parentComponent && parentComponent.subTree === vnode) {
    parentComponent.vnode.el = el
    updateHOCHostEl(parentComponent, el)
  }
}
```

这个函数确保 Suspense 的 el 属性始终指向当前活动分支的根元素，这对于父组件正确获取子树的 DOM 引用很重要。

## 小结

processSuspense 的处理流程体现了 Vue 对异步场景的周密考虑。挂载时使用离屏渲染避免不完整内容闪现，更新时通过 pendingId 处理并发，timeout 机制提供灵活的 fallback 控制。规范化确保了各种写法的兼容性，事件系统给予开发者状态变化的可观测性。这些设计共同构成了一个健壮的异步内容管理方案。
