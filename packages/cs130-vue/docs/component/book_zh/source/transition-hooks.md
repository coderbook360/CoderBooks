# 过渡钩子函数

过渡钩子函数是 Transition 组件的核心机制。它们在过渡的各个阶段被调用，让开发者能够精确控制动画行为。

## 钩子调用时机

过渡钩子按照固定的顺序调用。进入时依次是 beforeEnter、enter、afterEnter；离开时依次是 beforeLeave、leave、afterLeave。如果动画被取消，则调用 enterCancelled 或 leaveCancelled。

```typescript
interface TransitionHooks {
  mode: string
  persisted: boolean
  beforeEnter(el: TransitionElement): void
  enter(el: TransitionElement): void
  leave(el: TransitionElement, remove: () => void): void
  clone(vnode: VNode): TransitionHooks
  afterLeave?(): void
  delayLeave?(
    el: TransitionElement,
    earlyRemove: () => void,
    delayedLeave: () => void
  ): void
  delayedLeave?(): void
}
```

## setTransitionHooks

将过渡钩子绑定到 VNode：

```typescript
export function setTransitionHooks(vnode: VNode, hooks: TransitionHooks) {
  if (vnode.shapeFlag & ShapeFlags.COMPONENT && vnode.component) {
    setTransitionHooks(vnode.component.subTree, hooks)
  } else if (__FEATURE_SUSPENSE__ && vnode.shapeFlag & ShapeFlags.SUSPENSE) {
    vnode.ssContent!.transition = hooks
    vnode.ssFallback!.transition = hooks
  } else {
    vnode.transition = hooks
  }
}
```

对于组件节点，钩子会递归设置到子树；对于 Suspense，同时设置到 content 和 fallback。

## 钩子的注入与执行

在渲染器中，过渡钩子在 patch 过程中被调用：

```typescript
// mountElement
const needCallTransitionHooks =
  (!parentSuspense || (parentSuspense && !parentSuspense.pendingBranch)) &&
  transition &&
  !transition.persisted

if (needCallTransitionHooks) {
  transition!.beforeEnter(el)
}

// 插入 DOM
hostInsert(el, container, anchor)

if (
  (vnodeHook = props && props.onVnodeMounted) ||
  needCallTransitionHooks ||
  dirs
) {
  queuePostRenderEffect(() => {
    vnodeHook && invokeVNodeHook(vnodeHook, parentComponent, vnode)
    needCallTransitionHooks && transition!.enter(el)
    dirs && invokeDirectiveHook(vnode, null, parentComponent, 'mounted')
  }, parentSuspense)
}
```

beforeEnter 同步调用，enter 在 post 阶段异步调用。

## 离开钩子的特殊处理

离开钩子控制元素的移除时机：

```typescript
// unmount
const performRemove = () => {
  hostRemove(vnode.el!)
  if (transition && !transition.persisted && transition.afterLeave) {
    transition.afterLeave()
  }
}

if (vnode.shapeFlag & ShapeFlags.ELEMENT && transition && !transition.persisted) {
  const { leave, delayLeave } = transition
  
  const performLeave = () => leave(el, performRemove)
  
  if (delayLeave) {
    delayLeave(vnode.el!, performRemove, performLeave)
  } else {
    performLeave()
  }
} else {
  performRemove()
}
```

元素不会立即移除，而是等待 leave 钩子调用 done 回调。

## 完成回调机制

钩子函数通过 done 回调告知动画完成：

```typescript
// enter 钩子中
const done = (el._enterCb = (cancelled?) => {
  if (called) return
  called = true
  if (cancelled) {
    callHook(cancelHook, [el])
  } else {
    callHook(afterHook, [el])
  }
  if (hooks.delayedLeave) {
    hooks.delayedLeave()
  }
  el._enterCb = undefined
})

if (hook) {
  hook(el, done)
  // 如果钩子函数参数数量 <= 1，说明是同步的
  if (hook.length <= 1) {
    done()
  }
} else {
  done()
}
```

通过检查函数的 length 属性判断是否为异步钩子。

## appear 钩子

首次渲染时的钩子：

```typescript
beforeEnter(el) {
  let hook = onBeforeEnter
  if (!state.isMounted) {
    if (appear) {
      hook = onBeforeAppear || onBeforeEnter
    } else {
      return  // 不触发
    }
  }
  // ...
}
```

appear 钩子优先于 enter 钩子，不设置 appear 则首次不触发。

## 取消机制

动画取消时的处理：

```typescript
beforeEnter(el) {
  // 取消之前的离开动画
  if (el._leaveCb) {
    el._leaveCb(true /* cancelled */)
  }
  // 检查是否有正在离开的同类节点
  const leavingVNode = leavingVNodesCache[key]
  if (leavingVNode && isSameVNodeType(vnode, leavingVNode) && leavingVNode.el!._leaveCb) {
    leavingVNode.el!._leaveCb()
  }
  callHook(hook, [el])
}
```

新元素进入时，自动取消同一元素的离开动画。

## 钩子克隆

为不同 VNode 创建独立的钩子实例：

```typescript
clone(vnode) {
  return resolveTransitionHooks(vnode, props, state, instance)
}
```

每个 VNode 需要独立的钩子状态。

## callHook 实现

统一的钩子调用方式：

```typescript
const callHook: TransitionHookCaller = (hook, args) => {
  hook && callWithAsyncErrorHandling(
    hook,
    instance,
    ErrorCodes.TRANSITION_HOOK,
    args
  )
}
```

通过错误处理包装，确保钩子异常不会中断应用。

## CSS 过渡与钩子配合

钩子在 CSS 过渡中的作用：

```typescript
onEnter: makeEnterHook(false),

const makeEnterHook = (isAppear: boolean) => {
  return (el: Element, done: () => void) => {
    const hook = isAppear ? onAppear : onEnter
    const resolve = () => finishEnter(el, isAppear, done)
    
    // 调用用户钩子
    callHook(hook, [el, resolve])
    
    // 下一帧切换类
    nextFrame(() => {
      removeTransitionClass(el, isAppear ? appearFromClass : enterFromClass)
      addTransitionClass(el, isAppear ? appearToClass : enterToClass)
      
      // 没有显式回调则自动检测结束
      if (!hasExplicitCallback(hook)) {
        whenTransitionEnds(el, type, enterDuration, resolve)
      }
    })
  }
}
```

## delayLeave 机制

in-out 模式的延迟离开：

```typescript
if (mode === 'in-out' && child.type !== Comment) {
  leavingHooks.delayLeave = (el, earlyRemove, delayedLeave) => {
    // 缓存正在离开的节点
    const leavingVNodesCache = getLeavingNodesForType(state, oldInnerChild)
    leavingVNodesCache[String(oldInnerChild.key)] = oldInnerChild
    
    el._leaveCb = () => {
      earlyRemove()
      el._leaveCb = undefined
      delete enterHooks.delayedLeave
    }
    
    // 新元素进入完成后再离开
    enterHooks.delayedLeave = delayedLeave
  }
}
```

## 使用示例

```javascript
// 纯 CSS 过渡，无需 JS 钩子
<Transition name="fade">
  <div v-if="show">Content</div>
</Transition>

// JavaScript 动画
<Transition
  @enter="(el, done) => {
    anime({
      targets: el,
      opacity: [0, 1],
      translateY: [20, 0],
      duration: 400,
      easing: 'easeOutQuad',
      complete: done
    })
  }"
  @leave="(el, done) => {
    anime({
      targets: el,
      opacity: 0,
      translateY: -20,
      duration: 400,
      easing: 'easeInQuad',
      complete: done
    })
  }"
  :css="false"
>
  <div v-if="show">Content</div>
</Transition>
```

## 小结

过渡钩子的关键点：

1. **时机控制**：beforeEnter 同步，enter 异步
2. **完成通知**：通过 done 回调控制动画结束
3. **取消处理**：新动画自动取消旧动画
4. **模式支持**：delayLeave 实现 in-out 模式
5. **错误处理**：统一通过 callWithAsyncErrorHandling 调用

钩子系统让 CSS 和 JavaScript 动画都能精确控制。

下一章将分析 TransitionGroup 的实现。
