# TransitionGroup 组件源码

TransitionGroup 用于对列表中多个元素的进入/离开/移动进行动画处理，基于 FLIP 技术实现平滑的位置过渡。

## 组件定义

```typescript
// packages/runtime-dom/src/components/TransitionGroup.ts
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
      if (!prevChildren.length) {
        return
      }
      const moveClass = props.moveClass || `${props.name || 'v'}-move`
      
      if (!hasCSSTransform(
        prevChildren[0].el as ElementWithTransition,
        instance.vnode.el as Node,
        moveClass
      )) {
        return
      }

      // FLIP 动画
      prevChildren.forEach(callPendingCbs)
      prevChildren.forEach(recordPosition)
      
      const movedChildren = prevChildren.filter(applyTranslation)

      forceReflow()

      movedChildren.forEach(c => {
        const el = c.el as ElementWithTransition
        const style = el.style
        
        addTransitionClass(el, moveClass)
        
        style.transform = style.webkitTransform = style.transitionDuration = ''
        
        const cb = ((el as any)._moveCb = (e: TransitionEvent) => {
          if (e && e.target !== el) {
            return
          }
          if (!e || /transform$/.test(e.propertyName)) {
            el.removeEventListener('transitionend', cb)
            ;(el as any)._moveCb = null
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
          positionMap.set(child, (child.el as Element).getBoundingClientRect())
        }
      }

      return createVNode(tag, null, children)
    }
  }
}

export const TransitionGroup = TransitionGroupImpl as unknown as {
  new (): {
    $props: TransitionGroupProps
  }
}
```

## FLIP 技术

FLIP = First, Last, Invert, Play

```typescript
// First: 记录初始位置
prevChildren.forEach(recordPosition)

// Last: 计算最终位置（DOM 更新后）
const movedChildren = prevChildren.filter(applyTranslation)

// Invert: 应用反向 transform
// Play: 移除 transform 触发动画
```

## recordPosition 记录位置

```typescript
function recordPosition(c: VNode) {
  newPositionMap.set(c, (c.el as Element).getBoundingClientRect())
}
```

## applyTranslation 应用位移

```typescript
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

## callPendingCbs 处理回调

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

```typescript
function hasCSSTransform(
  el: ElementWithTransition,
  root: Node,
  moveClass: string
): boolean {
  const clone = el.cloneNode() as HTMLElement
  
  if (el._vtc) {
    el._vtc.forEach(cls => {
      cls.split(/\s+/).forEach(c => c && clone.classList.remove(c))
    })
  }
  
  moveClass.split(/\s+/).forEach(c => c && clone.classList.add(c))
  clone.style.display = 'none'
  
  const container = (root.nodeType === 1 ? root : root.parentNode) as HTMLElement
  container.appendChild(clone)
  
  const { hasTransform } = getTransitionInfo(clone)
  container.removeChild(clone)
  
  return hasTransform
}
```

## 离开动画的特殊处理

```typescript
// 在 leave 时设置绝对定位
const leavingVNodesCache: Record<string, VNode> = Object.create(null)

const resolvedProps = resolveTransitionProps(rawProps)
const { onLeave } = resolvedProps

resolvedProps.onLeave = (el, done) => {
  const pos = (el as HTMLElement).getBoundingClientRect()
  
  const s = (el as HTMLElement).style
  s.left = pos.left + 'px'
  s.top = pos.top + 'px'
  s.width = pos.width + 'px'
  s.height = pos.height + 'px'
  s.position = 'absolute'
  
  onLeave && onLeave(el, done)
}
```

## 使用示例

### 基础列表动画

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
/* 离开时脱离文档流 */
.list-leave-active {
  position: absolute;
}
</style>
```

### 拖拽排序

```vue
<template>
  <TransitionGroup name="flip" tag="div">
    <div
      v-for="item in items"
      :key="item.id"
      draggable="true"
      @dragstart="onDragStart(item)"
      @drop="onDrop(item)"
    >
      {{ item.text }}
    </div>
  </TransitionGroup>
</template>

<style>
.flip-move {
  transition: transform 0.3s;
}
</style>
```

### 交错动画

```vue
<template>
  <TransitionGroup
    name="stagger"
    tag="div"
    :css="false"
    @before-enter="onBeforeEnter"
    @enter="onEnter"
    @leave="onLeave"
  >
    <div
      v-for="(item, index) in items"
      :key="item.id"
      :data-index="index"
    >
      {{ item.text }}
    </div>
  </TransitionGroup>
</template>

<script setup>
const onEnter = (el, done) => {
  gsap.to(el, {
    opacity: 1,
    delay: el.dataset.index * 0.1,
    onComplete: done
  })
}
</script>
```

## 关键 key

```vue
<!-- 必须有 key -->
<TransitionGroup>
  <div v-for="item in items" :key="item.id">
    {{ item.text }}
  </div>
</TransitionGroup>
```

没有 key 会导致动画失效。

## 与 Transition 的区别

| 特性 | Transition | TransitionGroup |
|------|------------|-----------------|
| 子元素 | 单个 | 多个 |
| 移动动画 | 不支持 | 支持 |
| 默认渲染 | 无 | span |
| key 要求 | 可选 | 必需 |

## 小结

TransitionGroup 组件源码的核心要点：

1. **FLIP 技术**：First-Last-Invert-Play 实现平滑移动
2. **位置记录**：recordPosition 记录元素位置
3. **反向 transform**：applyTranslation 计算位移
4. **move-class**：控制移动动画样式
5. **必须 key**：列表项必须有唯一 key

下一章将分析组件更新流程。
