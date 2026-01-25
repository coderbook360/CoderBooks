# Transition 过渡设计

动画和过渡是现代用户界面的重要组成部分。它们不仅让界面更加美观，还提供了重要的视觉反馈——帮助用户理解界面状态的变化。Vue 的 Transition 组件让添加进入/离开动画变得简单直观。

## 为什么需要 Transition

在没有框架支持的情况下，处理元素的进入/离开动画需要大量代码：

```javascript
// 手动处理离开动画
element.classList.add('leaving')
element.addEventListener('transitionend', () => {
  element.remove()
}, { once: true })
```

问题在于：你需要在动画完成后才能移除元素。这需要监听 `transitionend` 事件，考虑多个属性的动画完成时机，处理动画被中断的情况。代码很快变得复杂。

Vue 的 Transition 组件封装了这些复杂性，提供声明式的解决方案：

```vue
<template>
  <Transition name="fade">
    <div v-if="show">内容</div>
  </Transition>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
```

只需几行 CSS，元素的进入和离开就有了平滑的淡入淡出效果。

## CSS 过渡类名

Transition 在元素进入/离开时会自动添加和移除特定的 CSS 类。这些类遵循明确的命名约定：

**进入阶段**：
- `v-enter-from`：进入的起始状态，元素插入前添加，插入后一帧移除
- `v-enter-active`：整个进入阶段都存在，定义过渡的持续时间和缓动函数
- `v-enter-to`：进入的结束状态，`v-enter-from` 移除后添加，过渡完成后移除

**离开阶段**：
- `v-leave-from`：离开的起始状态，离开触发时添加，一帧后移除
- `v-leave-active`：整个离开阶段都存在
- `v-leave-to`：离开的结束状态，`v-leave-from` 移除后添加，过渡完成后移除

使用 `name` 属性时，`v-` 前缀会被替换：

```vue
<Transition name="slide">
  <!-- slide-enter-from, slide-enter-active, 等等 -->
</Transition>
```

## CSS 动画

除了 CSS transition，Transition 组件也支持 CSS animation：

```vue
<template>
  <Transition name="bounce">
    <div v-if="show">弹跳效果</div>
  </Transition>
</template>

<style>
.bounce-enter-active {
  animation: bounce-in 0.5s;
}
.bounce-leave-active {
  animation: bounce-in 0.5s reverse;
}

@keyframes bounce-in {
  0% {
    transform: scale(0);
  }
  50% {
    transform: scale(1.25);
  }
  100% {
    transform: scale(1);
  }
}
</style>
```

animation 的好处是可以定义更复杂的关键帧动画，不限于两个状态之间的线性过渡。

## JavaScript 钩子

对于更复杂的动画需求，可以使用 JavaScript 钩子：

```vue
<template>
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
    <div v-if="show">内容</div>
  </Transition>
</template>

<script setup>
function onEnter(el, done) {
  // 使用 GSAP 或其他动画库
  gsap.to(el, {
    opacity: 1,
    duration: 0.5,
    onComplete: done
  })
}

function onLeave(el, done) {
  gsap.to(el, {
    opacity: 0,
    duration: 0.5,
    onComplete: done
  })
}
</script>
```

`done` 回调告诉 Vue 动画何时完成。如果使用 JavaScript 钩子但不使用 CSS 过渡，添加 `:css="false"` 可以跳过 CSS 检测，获得更好的性能：

```vue
<Transition :css="false" @enter="onEnter" @leave="onLeave">
  <!-- ... -->
</Transition>
```

## 过渡模式

当在两个元素之间切换时，默认情况下进入和离开动画同时发生。这可能不是期望的效果——有时希望旧元素先离开，新元素再进入。

```vue
<template>
  <Transition name="fade" mode="out-in">
    <component :is="currentView" />
  </Transition>
</template>
```

`mode` 属性控制过渡的顺序：
- `out-in`：当前元素先离开，完成后新元素进入
- `in-out`：新元素先进入，完成后当前元素离开

大多数场景下 `out-in` 是更自然的选择。

## 列表过渡：TransitionGroup

Transition 用于单个元素的进入/离开。对于列表（v-for 渲染的多个元素），使用 TransitionGroup：

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
</style>
```

TransitionGroup 的特点：

- 默认渲染为 `<span>`，可以用 `tag` 属性指定其他元素
- 子元素必须有唯一的 `key`
- CSS 过渡类应用到每个子元素

## 移动过渡

TransitionGroup 还支持元素位置变化的过渡。当列表排序变化时，元素会平滑地移动到新位置：

```vue
<template>
  <TransitionGroup name="flip" tag="ul">
    <li v-for="item in sortedItems" :key="item.id">
      {{ item.text }}
    </li>
  </TransitionGroup>
</template>

<style>
.flip-move {
  transition: transform 0.5s;
}
</style>
```

`*-move` 类在元素位置变化时添加。结合 FLIP（First, Last, Invert, Play）技术，Vue 可以让位置变化的动画非常流畅。

## 动态过渡

过渡的效果可以是动态的，通过 props 控制：

```vue
<template>
  <Transition :name="transitionName" :duration="duration">
    <div v-if="show">内容</div>
  </Transition>
</template>

<script setup>
import { ref, computed } from 'vue'

const transitionType = ref('fade')
const transitionName = computed(() => transitionType.value)
const duration = computed(() => transitionType.value === 'fade' ? 300 : 500)
</script>
```

`duration` 属性可以显式指定过渡时长，覆盖 CSS 中的定义：

```vue
<!-- 单一时长 -->
<Transition :duration="500">

<!-- 分别指定进入和离开 -->
<Transition :duration="{ enter: 500, leave: 800 }">
```

## 性能考虑

过渡动画是有性能开销的。一些最佳实践：

**优先使用 CSS**。CSS 过渡和动画由浏览器优化，通常比 JavaScript 动画更高效。使用 `transform` 和 `opacity` 属性，它们可以被 GPU 加速。

**避免触发重排**。动画涉及的属性如果触发重排（如 `width`、`height`、`margin`），性能会受影响。使用 `transform` 代替：

```css
/* 避免 */
.slide-enter-from {
  margin-left: -100px;
}

/* 推荐 */
.slide-enter-from {
  transform: translateX(-100px);
}
```

**使用 will-change 提示**。对于复杂的动画，使用 `will-change` 提示浏览器提前优化：

```css
.complex-animation-enter-active {
  will-change: transform, opacity;
}
```

但不要过度使用 `will-change`，它也有内存开销。

## 实现原理

Transition 组件的核心是在正确的时机添加和移除 CSS 类，并协调元素的插入和移除：

```javascript
// 简化的进入流程
function performEnter(el) {
  // 1. 添加 enter-from 和 enter-active
  addClass(el, 'enter-from')
  addClass(el, 'enter-active')
  
  // 2. 下一帧，移除 enter-from，添加 enter-to
  nextFrame(() => {
    removeClass(el, 'enter-from')
    addClass(el, 'enter-to')
  })
  
  // 3. 过渡完成后，移除所有类
  whenTransitionEnds(el, () => {
    removeClass(el, 'enter-active')
    removeClass(el, 'enter-to')
  })
}

// 简化的离开流程
function performLeave(el, remove) {
  addClass(el, 'leave-from')
  addClass(el, 'leave-active')
  
  nextFrame(() => {
    removeClass(el, 'leave-from')
    addClass(el, 'leave-to')
  })
  
  whenTransitionEnds(el, () => {
    removeClass(el, 'leave-active')
    removeClass(el, 'leave-to')
    remove()  // 动画完成后才移除元素
  })
}
```

关键点是 `whenTransitionEnds`——它监听 `transitionend` 或 `animationend` 事件，确保在动画完成后才执行后续操作。

## 小结

Transition 和 TransitionGroup 提供了声明式的动画能力。通过 CSS 类名约定和 JavaScript 钩子，你可以轻松实现各种进入/离开动画，让界面变化更加平滑自然。

过渡模式（`mode`）控制多个元素切换时的动画顺序。TransitionGroup 处理列表的动画，包括位置移动。动态过渡让动画效果可以根据条件变化。

在下一章中，我们将探讨函数式组件的设计思想——一种更轻量的组件形式，适用于没有状态的纯展示场景。
