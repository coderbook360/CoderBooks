# Transition 组件源码

Transition 是 Vue 3 的内置过渡组件，为元素和组件的进入/离开提供动画效果。本章分析其核心实现。

## 组件定义

```typescript
// packages/runtime-dom/src/components/Transition.ts
export const Transition: FunctionalComponent<TransitionProps> = (
  props,
  { slots }
) => h(BaseTransition, resolveTransitionProps(props), slots)

Transition.displayName = 'Transition'
```

## TransitionProps 定义

```typescript
export interface TransitionProps extends BaseTransitionProps<Element> {
  name?: string
  type?: AnimationTypes
  css?: boolean
  duration?: number | { enter: number; leave: number }
  enterFromClass?: string
  enterActiveClass?: string
  enterToClass?: string
  appearFromClass?: string
  appearActiveClass?: string
  appearToClass?: string
  leaveFromClass?: string
  leaveActiveClass?: string
  leaveToClass?: string
}

type AnimationTypes = 'transition' | 'animation'
```

## resolveTransitionProps 解析

```typescript
export function resolveTransitionProps(
  rawProps: TransitionProps
): BaseTransitionProps<Element> {
  const baseProps: BaseTransitionProps<Element> = {}
  
  for (const key in rawProps) {
    if (!(key in DOMTransitionPropsValidators)) {
      ;(baseProps as any)[key] = (rawProps as any)[key]
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
  } = baseProps

  // 定义进入钩子
  const finishEnter = (el: Element, isAppear: boolean, done?: () => void) => {
    removeTransitionClass(el, isAppear ? appearToClass : enterToClass)
    removeTransitionClass(el, isAppear ? appearActiveClass : enterActiveClass)
    done && done()
  }

  const finishLeave = (el: Element, done?: () => void) => {
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
      const resolve = () => finishLeave(el, done)
      addTransitionClass(el, leaveFromClass)
      
      // 强制重排
      forceReflow()
      
      addTransitionClass(el, leaveActiveClass)
      
      nextFrame(() => {
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
  } as BaseTransitionProps<Element>)
}
```

## CSS 类操作

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

## nextFrame 下一帧

```typescript
const TRANSITION = 'transition'
const ANIMATION = 'animation'

const nextFrame = (cb: () => void) => {
  requestAnimationFrame(() => {
    requestAnimationFrame(cb)
  })
}
```

两次 requestAnimationFrame 确保 CSS 类已生效。

## forceReflow 强制重排

```typescript
export function forceReflow() {
  return document.body.offsetHeight
}
```

## whenTransitionEnds 监听结束

```typescript
export function whenTransitionEnds(
  el: Element,
  expectedType: TransitionProps['type'] | undefined,
  explicitTimeout: number | null,
  resolve: () => void
) {
  const id = (el as any)._endId = ++endId
  
  const resolveIfNotStale = () => {
    if (id === (el as any)._endId) {
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
    if (e.target === el) {
      if (++ended >= propCount) {
        end()
      }
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

## getTransitionInfo 获取过渡信息

```typescript
export function getTransitionInfo(
  el: Element,
  expectedType?: TransitionProps['type']
): {
  type: typeof TRANSITION | typeof ANIMATION | null
  propCount: number
  timeout: number
  hasTransform: boolean
} {
  const styles = window.getComputedStyle(el)
  
  const getStyleProperties = (key: string) =>
    (styles[key as any] || '').split(', ')
  
  const transitionDelays = getStyleProperties(`${TRANSITION}Delay`)
  const transitionDurations = getStyleProperties(`${TRANSITION}Duration`)
  const transitionTimeout = getTimeout(transitionDelays, transitionDurations)
  
  const animationDelays = getStyleProperties(`${ANIMATION}Delay`)
  const animationDurations = getStyleProperties(`${ANIMATION}Duration`)
  const animationTimeout = getTimeout(animationDelays, animationDurations)

  let type: typeof TRANSITION | typeof ANIMATION | null = null
  let timeout = 0
  let propCount = 0

  if (expectedType === TRANSITION) {
    if (transitionTimeout > 0) {
      type = TRANSITION
      timeout = transitionTimeout
      propCount = transitionDurations.length
    }
  } else if (expectedType === ANIMATION) {
    if (animationTimeout > 0) {
      type = ANIMATION
      timeout = animationTimeout
      propCount = animationDurations.length
    }
  } else {
    timeout = Math.max(transitionTimeout, animationTimeout)
    type =
      timeout > 0
        ? transitionTimeout > animationTimeout
          ? TRANSITION
          : ANIMATION
        : null
    propCount = type
      ? type === TRANSITION
        ? transitionDurations.length
        : animationDurations.length
      : 0
  }

  const hasTransform =
    type === TRANSITION &&
    /\b(transform|all)(,|$)/.test(
      getStyleProperties(`${TRANSITION}Property`).toString()
    )

  return {
    type,
    timeout,
    propCount,
    hasTransform
  }
}
```

## CSS 过渡类名

```css
/* 默认名称 v */
.v-enter-from { opacity: 0; }
.v-enter-active { transition: opacity 0.3s; }
.v-enter-to { opacity: 1; }

.v-leave-from { opacity: 1; }
.v-leave-active { transition: opacity 0.3s; }
.v-leave-to { opacity: 0; }
```

## 使用示例

### 基础用法

```vue
<template>
  <button @click="show = !show">Toggle</button>
  <Transition name="fade">
    <div v-if="show">Hello</div>
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

### JS 钩子

```vue
<template>
  <Transition
    @before-enter="onBeforeEnter"
    @enter="onEnter"
    @leave="onLeave"
    :css="false"
  >
    <div v-if="show">Hello</div>
  </Transition>
</template>

<script setup>
const onEnter = (el, done) => {
  gsap.to(el, { opacity: 1, onComplete: done })
}
</script>
```

## 小结

Transition 组件源码的核心要点：

1. **函数式组件**：包装 BaseTransition
2. **resolveTransitionProps**：将 CSS 配置转换为钩子
3. **类名操作**：addTransitionClass/removeTransitionClass
4. **nextFrame**：双 rAF 确保 CSS 生效
5. **whenTransitionEnds**：监听 transitionend/animationend

下一章将分析 TransitionGroup 组件源码。
