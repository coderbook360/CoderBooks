# TransitionGroup 实现

TransitionGroup 用于处理列表的过渡动画。与 Transition 不同，它会渲染一个真实的 DOM 元素，并能处理多个子元素的进入、离开和位置变化。

## 基本用法

```vue
<template>
  <TransitionGroup name="list" tag="ul">
    <li v-for="item in items" :key="item.id">
      {{ item.text }}
    </li>
  </TransitionGroup>
</template>

<style>
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
/* 移动动画 */
.list-move {
  transition: transform 0.5s ease;
}
</style>
```

## 组件定义

```typescript
const TransitionGroupImpl: ComponentOptions = {
  name: 'TransitionGroup',

  props: extend({}, TransitionPropsValidators, {
    tag: String,
    moveClass: String
  }),

  setup(props: TransitionGroupProps, { slots }: SetupContext) {
    const instance = getCurrentInstance()!
    const state = useTransitionState()
    let prevChildren: VNode[]
    let children: VNode[]

    onUpdated(() => {
      // 更新后处理移动动画
      if (!prevChildren.length) {
        return
      }
      const moveClass = props.moveClass || `${props.name || 'v'}-move`

      if (!hasCSSTransform(
        prevChildren[0].el as ElementWithTransition,
        instance.vnode.el as Element,
        moveClass
      )) {
        return
      }

      // 强制同步布局
      prevChildren.forEach(callPendingCbs)
      prevChildren.forEach(recordPosition)
      const movedChildren = prevChildren.filter(applyTranslation)

      forceReflow()

      movedChildren.forEach(c => {
        const el = c.el as ElementWithTransition
        const style = el.style
        addTransitionClass(el, moveClass)
        style.transform = style.webkitTransform = style.transitionDuration = ''
        const cb = (el._moveCb = (e: TransitionEvent) => {
          if (e && e.target !== el) {
            return
          }
          if (!e || /transform$/.test(e.propertyName)) {
            el.removeEventListener('transitionend', cb)
            el._moveCb = null
            removeTransitionClass(el, moveClass)
          }
        })
        el.addEventListener('transitionend', cb)
      })
    })

    return () => {
      const rawProps = toRaw(props)
      const cssTransitionProps = resolveTransitionProps(rawProps)
      let tag = rawProps.tag || Fragment

      prevChildren = children
      children = slots.default ? getTransitionRawChildren(slots.default()) : []

      for (let i = 0; i < children.length; i++) {
        const child = children[i]
        if (child.key != null) {
          setTransitionHooks(
            child,
            resolveTransitionHooks(child, cssTransitionProps, state, instance)
          )
        }
      }

      if (prevChildren) {
        for (let i = 0; i < prevChildren.length; i++) {
          const child = prevChildren[i]
          setTransitionHooks(
            child,
            resolveTransitionHooks(child, cssTransitionProps, state, instance)
          )
          recordPosition(child)
        }
      }

      return createVNode(tag, null, children)
    }
  }
}
```

## 位置记录与计算

记录元素位置用于计算位移：

```typescript
function recordPosition(c: VNode) {
  newPositionMap.set(c, (c.el as Element).getBoundingClientRect())
}

function applyTranslation(c: VNode): VNode | undefined {
  const oldPos = positionMap.get(c)!
  const newPos = newPositionMap.get(c)!
  const dx = oldPos.left - newPos.left
  const dy = oldPos.top - newPos.top
  
  if (dx || dy) {
    const s = (c.el as HTMLElement).style
    s.transform = s.webkitTransform = `translate(${dx}px,${dy}px)`
    s.transitionDuration = '0s'
    return c
  }
}
```

## 强制布局

FLIP 动画需要强制同步布局：

```typescript
export function forceReflow() {
  return document.body.offsetHeight
}
```

读取 offsetHeight 会强制浏览器同步计算布局。

## 处理待执行回调

在新动画开始前完成之前的动画：

```typescript
function callPendingCbs(c: VNode) {
  const el = c.el as any
  if (el._moveCb) {
    el._moveCb()
  }
  if (el._enterCb) {
    el._enterCb()
  }
}
```

## hasCSSTransform 检测

检测是否支持移动动画：

```typescript
function hasCSSTransform(
  el: ElementWithTransition,
  root: Element,
  moveClass: string
): boolean {
  // 克隆节点测试
  const clone = el.cloneNode() as HTMLElement
  if (el._vtc) {
    el._vtc.forEach(cls => {
      cls.split(/\s+/).forEach(c => c && clone.classList.remove(c))
    })
  }
  moveClass.split(/\s+/).forEach(c => c && clone.classList.add(c))
  clone.style.display = 'none'
  
  const container = (root.nodeType === 1 ? root : root.parentNode) as Element
  container.appendChild(clone)
  
  const { hasTransform } = getTransitionInfo(clone)
  container.removeChild(clone)
  
  return hasTransform
}
```

## 离开元素的定位处理

离开的元素需要脱离文档流：

```typescript
// TransitionGroup 的 leave 钩子
onLeave(el, done) {
  // 原有 leave 逻辑...
  
  // 关键：将元素设为绝对定位
  // 这样它不会影响其他元素的布局
  const style = (el as HTMLElement).style
  style.position = 'absolute'
  style.top = `${el.offsetTop}px`
  style.left = `${el.offsetLeft}px`
  style.width = `${el.offsetWidth}px`
  style.height = `${el.offsetHeight}px`
}
```

## FLIP 动画原理

FLIP 是 First, Last, Invert, Play 的缩写：

```typescript
// 1. First: 记录初始位置
prevChildren.forEach(recordPosition)

// 2. Last: DOM 更新后获取最终位置（框架自动完成）

// 3. Invert: 计算差值，应用反向变换
const dx = oldPos.left - newPos.left
const dy = oldPos.top - newPos.top
s.transform = `translate(${dx}px,${dy}px)`
s.transitionDuration = '0s'

// 4. Play: 移除变换，让 CSS 过渡生效
forceReflow()
s.transform = ''
s.transitionDuration = ''
addTransitionClass(el, moveClass)
```

## 与 Transition 的差异

```typescript
// Transition: 只处理单个元素
const Transition = (props, { slots }) => h(BaseTransition, resolveTransitionProps(props), slots)

// TransitionGroup: 处理多个元素
setup(props, { slots }) {
  return () => {
    // 1. 获取所有子元素
    children = getTransitionRawChildren(slots.default())
    
    // 2. 为每个子元素设置过渡钩子
    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      if (child.key != null) {
        setTransitionHooks(child, resolveTransitionHooks(child, ...))
      }
    }
    
    // 3. 渲染真实容器元素
    return createVNode(tag, null, children)
  }
}
```

## key 的重要性

TransitionGroup 要求每个子元素必须有唯一 key：

```vue
<!-- 正确 -->
<TransitionGroup>
  <div v-for="item in items" :key="item.id">{{ item.text }}</div>
</TransitionGroup>

<!-- 错误：使用 index 作为 key -->
<TransitionGroup>
  <div v-for="(item, index) in items" :key="index">{{ item.text }}</div>
</TransitionGroup>
```

key 用于追踪元素身份，错误的 key 会导致动画异常。

## 完整示例

```vue
<template>
  <TransitionGroup 
    name="flip-list" 
    tag="ul"
    @before-enter="onBeforeEnter"
    @enter="onEnter"
    @leave="onLeave"
  >
    <li 
      v-for="item in items" 
      :key="item.id"
      :data-index="item.id"
    >
      {{ item.text }}
    </li>
  </TransitionGroup>
</template>

<script setup>
const onBeforeEnter = (el) => {
  el.style.opacity = 0
  el.style.height = '0px'
}

const onEnter = (el, done) => {
  gsap.to(el, {
    opacity: 1,
    height: 'auto',
    delay: el.dataset.index * 0.1,
    onComplete: done
  })
}

const onLeave = (el, done) => {
  gsap.to(el, {
    opacity: 0,
    height: 0,
    onComplete: done
  })
}
</script>

<style>
.flip-list-move {
  transition: transform 0.5s ease;
}
.flip-list-leave-active {
  position: absolute;
}
</style>
```

## 小结

TransitionGroup 的核心要点：

1. **真实容器**：通过 tag 属性渲染真实 DOM 元素
2. **多元素追踪**：通过 key 追踪每个子元素
3. **FLIP 动画**：记录位置变化，应用过渡效果
4. **离开定位**：离开元素设为绝对定位避免影响布局
5. **批量钩子**：为每个子元素独立设置过渡钩子

TransitionGroup 让列表动画变得简单而强大。

下一章将分析 BaseTransition 的基础实现。
