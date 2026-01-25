# Transition 组件实现

Transition 是 Vue 的过渡动画组件。它在元素进入和离开时自动应用 CSS 类或执行 JavaScript 钩子，实现平滑的动画效果。

## 基本用法

```html
<template>
  <button @click="show = !show">Toggle</button>
  <Transition name="fade">
    <div v-if="show">Content</div>
  </Transition>
</template>

<style>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
```

## Transition 组件定义

```typescript
const Transition: FunctionalComponent<TransitionProps> = (props, { slots }) =>
  h(BaseTransition, resolveTransitionProps(props), slots)

Transition.displayName = 'Transition'
```

Transition 是对 BaseTransition 的包装，处理 CSS 类名。

## resolveTransitionProps

将用户 props 转换为 BaseTransition props：

```typescript
export function resolveTransitionProps(
  rawProps: TransitionProps
): BaseTransitionProps<Element> {
  const baseProps: BaseTransitionProps<Element> = {}
  
  for (const key in rawProps) {
    if (!(key in DOMTransitionPropsValidators)) {
      (baseProps as any)[key] = (rawProps as any)[key]
    }
  }

  if (rawProps.css === false) {
    return baseProps
  }

  const {
    name = 'v',
    type,
    duration,
    enterFromClass = `${name}-enter-from`,
    enterActiveClass = `${name}-enter-active`,
    enterToClass = `${name}-enter-to`,
    appearFromClass = enterFromClass,
    appearActiveClass = enterActiveClass,
    appearToClass = enterToClass,
    leaveFromClass = `${name}-leave-from`,
    leaveActiveClass = `${name}-leave-active`,
    leaveToClass = `${name}-leave-to`
  } = rawProps

  const durations = normalizeDuration(duration)
  const enterDuration = durations && durations[0]
  const leaveDuration = durations && durations[1]

  const {
    onBeforeEnter,
    onEnter,
    onEnterCancelled,
    onLeave,
    onLeaveCancelled,
    onBeforeAppear = onBeforeEnter,
    onAppear = onEnter,
    onAppearCancelled = onEnterCancelled
  } = rawProps

  const finishEnter = (el: Element, isAppear: boolean, done?: () => void) => {
    removeTransitionClass(el, isAppear ? appearToClass : enterToClass)
    removeTransitionClass(el, isAppear ? appearActiveClass : enterActiveClass)
    done && done()
  }

  const finishLeave = (el: Element & { _isLeaving?: boolean }, done?: () => void) => {
    el._isLeaving = false
    removeTransitionClass(el, leaveFromClass)
    removeTransitionClass(el, leaveToClass)
    removeTransitionClass(el, leaveActiveClass)
    done && done()
  }

  const makeEnterHook = (isAppear: boolean) => {
    return (el: Element, done: () => void) => {
      const hook = isAppear ? onAppear : onEnter
      const resolve = () => finishEnter(el, isAppear, done)
      
      callHook(hook, [el, resolve])
      
      nextFrame(() => {
        removeTransitionClass(el, isAppear ? appearFromClass : enterFromClass)
        addTransitionClass(el, isAppear ? appearToClass : enterToClass)
        
        if (!hasExplicitCallback(hook)) {
          whenTransitionEnds(el, type, enterDuration, resolve)
        }
      })
    }
  }

  return extend(baseProps, {
    onBeforeEnter(el) {
      callHook(onBeforeEnter, [el])
      addTransitionClass(el, enterFromClass)
      addTransitionClass(el, enterActiveClass)
    },
    onBeforeAppear(el) {
      callHook(onBeforeAppear, [el])
      addTransitionClass(el, appearFromClass)
      addTransitionClass(el, appearActiveClass)
    },
    onEnter: makeEnterHook(false),
    onAppear: makeEnterHook(true),
    onLeave(el, done) {
      el._isLeaving = true
      const resolve = () => finishLeave(el, done)
      
      addTransitionClass(el, leaveFromClass)
      forceReflow()
      addTransitionClass(el, leaveActiveClass)
      
      nextFrame(() => {
        if (!el._isLeaving) return
        removeTransitionClass(el, leaveFromClass)
        addTransitionClass(el, leaveToClass)
        
        if (!hasExplicitCallback(onLeave)) {
          whenTransitionEnds(el, type, leaveDuration, resolve)
        }
      })
      
      callHook(onLeave, [el, resolve])
    },
    onEnterCancelled(el) {
      finishEnter(el, false)
      callHook(onEnterCancelled, [el])
    },
    onAppearCancelled(el) {
      finishEnter(el, true)
      callHook(onAppearCancelled, [el])
    },
    onLeaveCancelled(el) {
      finishLeave(el)
      callHook(onLeaveCancelled, [el])
    }
  })
}
```

## BaseTransition

基础过渡组件：

```typescript
const BaseTransitionImpl: ComponentOptions = {
  name: `BaseTransition`,

  props: {
    mode: String,
    appear: Boolean,
    persisted: Boolean,
    onBeforeEnter: TransitionHookValidator,
    onEnter: TransitionHookValidator,
    onAfterEnter: TransitionHookValidator,
    onEnterCancelled: TransitionHookValidator,
    onBeforeLeave: TransitionHookValidator,
    onLeave: TransitionHookValidator,
    onAfterLeave: TransitionHookValidator,
    onLeaveCancelled: TransitionHookValidator,
    onBeforeAppear: TransitionHookValidator,
    onAppear: TransitionHookValidator,
    onAfterAppear: TransitionHookValidator,
    onAppearCancelled: TransitionHookValidator
  },

  setup(props: BaseTransitionProps, { slots }: SetupContext) {
    const instance = getCurrentInstance()!
    const state = useTransitionState()

    let prevTransitionKey: any

    return () => {
      const children =
        slots.default && getTransitionRawChildren(slots.default(), true)
      if (!children || !children.length) {
        return
      }

      let child = children[0]
      
      // ... 省略复杂逻辑

      const rawProps = toRaw(props)
      const { mode } = rawProps

      // 设置过渡钩子
      const enterHooks = resolveTransitionHooks(
        child,
        rawProps,
        state,
        instance
      )
      setTransitionHooks(child, enterHooks)

      const oldChild = instance.subTree
      const oldInnerChild = oldChild && getKeepAliveChild(oldChild)

      // 处理离开
      if (oldInnerChild && !isSameVNodeType(child, oldInnerChild)) {
        const leavingHooks = resolveTransitionHooks(
          oldInnerChild,
          rawProps,
          state,
          instance
        )
        setTransitionHooks(oldInnerChild, leavingHooks)

        // out-in 模式
        if (mode === 'out-in') {
          state.isLeaving = true
          leavingHooks.afterLeave = () => {
            state.isLeaving = false
            instance.update()
          }
          return emptyPlaceholder(child)
        }
        
        // in-out 模式
        if (mode === 'in-out' && child.type !== Comment) {
          leavingHooks.delayLeave = (el, earlyRemove, delayedLeave) => {
            const leavingVNodesCache = getLeavingNodesForType(
              state,
              oldInnerChild
            )
            leavingVNodesCache[String(oldInnerChild.key)] = oldInnerChild
            el._leaveCb = () => {
              earlyRemove()
              el._leaveCb = undefined
              delete enterHooks.delayedLeave
            }
            enterHooks.delayedLeave = delayedLeave
          }
        }
      }

      return child
    }
  }
}
```

## resolveTransitionHooks

解析过渡钩子：

```typescript
export function resolveTransitionHooks(
  vnode: VNode,
  props: BaseTransitionProps<any>,
  state: TransitionState,
  instance: ComponentInternalInstance
): TransitionHooks {
  const {
    appear,
    mode,
    persisted = false,
    onBeforeEnter,
    onEnter,
    onAfterEnter,
    onEnterCancelled,
    onBeforeLeave,
    onLeave,
    onAfterLeave,
    onLeaveCancelled,
    onBeforeAppear,
    onAppear,
    onAfterAppear,
    onAppearCancelled
  } = props

  const key = String(vnode.key)
  const leavingVNodesCache = getLeavingNodesForType(state, vnode)

  const callHook: TransitionHookCaller = (hook, args) => {
    hook && callWithAsyncErrorHandling(
      hook,
      instance,
      ErrorCodes.TRANSITION_HOOK,
      args
    )
  }

  const hooks: TransitionHooks = {
    mode,
    persisted,
    beforeEnter(el) {
      let hook = onBeforeEnter
      if (!state.isMounted) {
        if (appear) {
          hook = onBeforeAppear || onBeforeEnter
        } else {
          return
        }
      }
      // 取消之前的离开动画
      if (el._leaveCb) {
        el._leaveCb(true /* cancelled */)
      }
      const leavingVNode = leavingVNodesCache[key]
      if (leavingVNode && isSameVNodeType(vnode, leavingVNode) && leavingVNode.el!._leaveCb) {
        leavingVNode.el!._leaveCb()
      }
      callHook(hook, [el])
    },

    enter(el) {
      let hook = onEnter
      let afterHook = onAfterEnter
      let cancelHook = onEnterCancelled
      
      if (!state.isMounted) {
        if (appear) {
          hook = onAppear || onEnter
          afterHook = onAfterAppear || onAfterEnter
          cancelHook = onAppearCancelled || onEnterCancelled
        } else {
          return
        }
      }
      
      let called = false
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
        if (hook.length <= 1) {
          done()
        }
      } else {
        done()
      }
    },

    leave(el, remove) {
      const key = String(vnode.key)
      
      if (el._enterCb) {
        el._enterCb(true /* cancelled */)
      }
      
      if (state.isUnmounting) {
        return remove()
      }
      
      callHook(onBeforeLeave, [el])
      
      let called = false
      const done = (el._leaveCb = (cancelled?) => {
        if (called) return
        called = true
        remove()
        if (cancelled) {
          callHook(onLeaveCancelled, [el])
        } else {
          callHook(onAfterLeave, [el])
        }
        el._leaveCb = undefined
        if (leavingVNodesCache[key] === vnode) {
          delete leavingVNodesCache[key]
        }
      })
      
      leavingVNodesCache[key] = vnode
      
      if (onLeave) {
        onLeave(el, done)
        if (onLeave.length <= 1) {
          done()
        }
      } else {
        done()
      }
    },

    clone(vnode) {
      return resolveTransitionHooks(vnode, props, state, instance)
    }
  }

  return hooks
}
```

## CSS 类管理

```typescript
export function addTransitionClass(el: Element, cls: string) {
  cls.split(/\s+/).forEach(c => c && el.classList.add(c))
  ;(
    (el as ElementWithTransition)._vtc ||
    ((el as ElementWithTransition)._vtc = new Set())
  ).add(cls)
}

export function removeTransitionClass(el: Element, cls: string) {
  cls.split(/\s+/).forEach(c => c && el.classList.remove(c))
  const { _vtc } = el as ElementWithTransition
  if (_vtc) {
    _vtc.delete(cls)
    if (!_vtc!.size) {
      ;(el as ElementWithTransition)._vtc = undefined
    }
  }
}
```

## 过渡结束检测

```typescript
export function whenTransitionEnds(
  el: Element & { _endId?: number },
  expectedType: TransitionProps['type'] | undefined,
  explicitTimeout: number | null,
  resolve: () => void
) {
  const id = (el._endId = ++endId)
  const resolveIfNotStale = () => {
    if (id === el._endId) {
      resolve()
    }
  }

  if (explicitTimeout) {
    return setTimeout(resolveIfNotStale, explicitTimeout)
  }

  const { type, timeout, propCount } = getTransitionInfo(el, expectedType)
  
  if (!type) {
    return resolve()
  }

  const endEvent = type + 'end'
  let ended = 0
  
  const end = () => {
    el.removeEventListener(endEvent, onEnd)
    resolveIfNotStale()
  }
  
  const onEnd = (e: Event) => {
    if (e.target === el && ++ended >= propCount) {
      end()
    }
  }
  
  setTimeout(() => {
    if (ended < propCount) {
      end()
    }
  }, timeout + 1)
  
  el.addEventListener(endEvent, onEnd)
}
```

## 过渡模式

```html
<!-- out-in：先离开，后进入 -->
<Transition mode="out-in">
  <component :is="currentComp" />
</Transition>

<!-- in-out：先进入，后离开 -->
<Transition mode="in-out">
  <component :is="currentComp" />
</Transition>
```

## JavaScript 钩子

```html
<Transition
  @before-enter="onBeforeEnter"
  @enter="onEnter"
  @after-enter="onAfterEnter"
  @enter-cancelled="onEnterCancelled"
  @before-leave="onBeforeLeave"
  @leave="onLeave"
  @after-leave="onAfterLeave"
  @leave-cancelled="onLeaveCancelled"
>
  <div v-if="show">Content</div>
</Transition>
```

```javascript
function onEnter(el, done) {
  // 使用 JS 动画库
  gsap.to(el, {
    opacity: 1,
    duration: 0.5,
    onComplete: done
  })
}
```

## 小结

Transition 的实现要点：

1. **CSS 类管理**：自动添加和移除过渡类
2. **钩子系统**：提供完整的生命周期钩子
3. **过渡检测**：自动检测 transition/animation 结束
4. **模式支持**：out-in 和 in-out 模式
5. **取消处理**：动画被打断时正确清理

Transition 让 CSS 和 JavaScript 动画都变得简单直观。

下一章将分析 TransitionGroup 的实现。
