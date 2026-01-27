# 路由过渡动画

页面切换时的过渡动画能提升用户体验，让应用感觉更流畅、更有反馈感。Vue Router 与 Vue 的 Transition 组件配合，可以实现各种页面切换效果。

## 基本过渡配置

Vue Router 4 使用作用域插槽暴露当前组件和路由：

```html
<template>
  <RouterView v-slot="{ Component }">
    <Transition name="fade">
      <component :is="Component" />
    </Transition>
  </RouterView>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
```

`RouterView` 的默认插槽提供 `Component`（当前路由组件）和 `route`（当前路由对象）。将 `Component` 传给 `<component :is>` 实现动态组件渲染，外层包裹 `Transition` 实现过渡效果。

`name` 属性决定了 CSS 类名前缀。`fade` 对应 `.fade-enter-from`、`.fade-enter-active`、`.fade-enter-to` 等类名。

## 过渡模式

默认情况下，进入和离开的元素会同时进行动画，可能导致两个组件同时可见。使用 `mode` 属性可以控制顺序：

```html
<Transition name="fade" mode="out-in">
  <component :is="Component" />
</Transition>
```

`out-in` 表示先等旧组件离开完成，再让新组件进入——这是最常用的模式。`in-out` 则相反，新组件先进入，旧组件再离开。

对于滑动效果，通常不使用 mode，让两个组件同时滑动：

```html
<template>
  <RouterView v-slot="{ Component }">
    <Transition name="slide">
      <component :is="Component" />
    </Transition>
  </RouterView>
</template>

<style>
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from {
  transform: translateX(100%);
}

.slide-leave-to {
  transform: translateX(-100%);
}
</style>
```

这会产生新页面从右侧滑入、旧页面向左滑出的效果。

## 基于路由的动态过渡

不同路由可能需要不同的过渡效果。通过 `route.meta` 可以配置：

```javascript
const routes = [
  { path: '/', component: Home, meta: { transition: 'fade' } },
  { path: '/about', component: About, meta: { transition: 'slide-up' } },
  { path: '/contact', component: Contact, meta: { transition: 'slide-left' } }
]
```

```html
<template>
  <RouterView v-slot="{ Component, route }">
    <Transition :name="route.meta.transition || 'fade'">
      <component :is="Component" />
    </Transition>
  </RouterView>
</template>
```

## 根据导航方向切换动画

更智能的方式是根据导航方向决定动画。前进时向左滑，后退时向右滑：

```html
<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const transitionName = ref('slide-left')

router.afterEach((to, from) => {
  const toDepth = to.path.split('/').length
  const fromDepth = from.path.split('/').length
  
  transitionName.value = toDepth >= fromDepth ? 'slide-left' : 'slide-right'
})
</script>

<template>
  <RouterView v-slot="{ Component }">
    <Transition :name="transitionName">
      <component :is="Component" />
    </Transition>
  </RouterView>
</template>

<style>
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.3s ease;
  position: absolute;
  width: 100%;
}

.slide-left-enter-from {
  transform: translateX(100%);
}
.slide-left-leave-to {
  transform: translateX(-100%);
}

.slide-right-enter-from {
  transform: translateX(-100%);
}
.slide-right-leave-to {
  transform: translateX(100%);
}
</style>
```

注意 `position: absolute` 和 `width: 100%`——同时滑动时需要脱离文档流，否则两个组件会堆叠而不是并排滑动。

## 结合 KeepAlive

有时希望缓存某些页面的状态，同时保留过渡效果：

```html
<template>
  <RouterView v-slot="{ Component, route }">
    <Transition name="fade" mode="out-in">
      <KeepAlive :include="cachedViews">
        <component :is="Component" :key="route.fullPath" />
      </KeepAlive>
    </Transition>
  </RouterView>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

// 根据 meta 决定哪些路由需要缓存
const cachedViews = computed(() => {
  return route.matched
    .filter(r => r.meta.keepAlive)
    .map(r => r.components.default.name)
})
</script>
```

`key` 属性很重要——相同组件用于不同路由时（如 `/user/1` 和 `/user/2`），key 确保 Vue 将它们视为不同实例，触发过渡动画。

## 嵌套路由的过渡

嵌套路由可以有独立的过渡效果：

```html
<!-- 主布局 -->
<template>
  <div class="layout">
    <aside>Sidebar</aside>
    <main>
      <RouterView v-slot="{ Component }">
        <Transition name="fade" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>
  </div>
</template>

<!-- 用户页面组件（本身也有嵌套路由） -->
<template>
  <div class="user-page">
    <nav>User Nav</nav>
    <RouterView v-slot="{ Component }">
      <Transition name="slide" mode="out-in">
        <component :is="Component" />
      </Transition>
    </RouterView>
  </div>
</template>
```

不同层级的 RouterView 可以有不同的过渡效果。主布局使用 fade，用户页面内部使用 slide。

## 禁用过渡

某些场景可能不需要过渡，比如初次加载或快速连续导航：

```html
<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const enableTransition = ref(true)

// 初次加载不显示过渡
onMounted(() => {
  setTimeout(() => {
    enableTransition.value = true
  }, 100)
})
</script>

<template>
  <RouterView v-slot="{ Component }">
    <Transition :name="enableTransition ? 'fade' : ''" mode="out-in">
      <component :is="Component" />
    </Transition>
  </RouterView>
</template>
```

也可以通过 `route.meta` 来控制：

```javascript
const routes = [
  { path: '/modal', component: Modal, meta: { noTransition: true } }
]
```

```html
<Transition :name="route.meta.noTransition ? '' : 'fade'" mode="out-in">
  <component :is="Component" />
</Transition>
```

## 过渡钩子

除了 CSS 过渡，还可以使用 JavaScript 钩子实现更复杂的动画：

```html
<template>
  <RouterView v-slot="{ Component }">
    <Transition
      @before-enter="onBeforeEnter"
      @enter="onEnter"
      @after-enter="onAfterEnter"
      @before-leave="onBeforeLeave"
      @leave="onLeave"
      @after-leave="onAfterLeave"
      :css="false"
    >
      <component :is="Component" />
    </Transition>
  </RouterView>
</template>

<script setup>
import gsap from 'gsap'

const onEnter = (el, done) => {
  gsap.from(el, {
    opacity: 0,
    y: 20,
    duration: 0.3,
    onComplete: done
  })
}

const onLeave = (el, done) => {
  gsap.to(el, {
    opacity: 0,
    y: -20,
    duration: 0.3,
    onComplete: done
  })
}
</script>
```

`:css="false"` 告诉 Vue 不要添加 CSS 过渡类，完全由 JavaScript 控制。必须调用 `done` 回调来告知过渡完成。

## 性能考虑

过渡动画可能影响性能：

**使用 transform 和 opacity**：这两个属性可以由 GPU 加速，而 `top`、`left`、`width` 等会触发回流。

```css
/* 好 */
.slide-enter-from {
  transform: translateX(100%);
}

/* 不好 */
.slide-enter-from {
  left: 100%;
}
```

**使用 will-change**：提示浏览器准备好 GPU 加速。

```css
.page {
  will-change: transform, opacity;
}
```

但不要滥用 `will-change`，它会消耗额外内存。只在确实需要的元素上使用。

**避免过长的动画**：页面切换动画最好控制在 200-400ms。太短感觉生硬，太长让人等得不耐烦。

**考虑减少动画的偏好**：尊重用户的系统设置。

```css
@media (prefers-reduced-motion: reduce) {
  .fade-enter-active,
  .fade-leave-active {
    transition: none;
  }
}
```

## 与滚动行为的配合

过渡和滚动可能冲突——动画进行中滚动会很奇怪。一种方案是延迟滚动：

```javascript
const router = createRouter({
  // ...
  scrollBehavior(to, from, savedPosition) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(savedPosition || { top: 0 })
      }, 300)  // 等待过渡动画完成
    })
  }
})
```

或者在 `afterEach` 中等待 `nextTick`：

```javascript
router.afterEach(() => {
  nextTick(() => {
    window.scrollTo(0, 0)
  })
})
```

## 本章小结

Vue Router 与 Transition 组件配合可以实现丰富的页面切换效果。使用 `RouterView` 的作用域插槽获取当前组件，包裹 Transition 实现过渡。

`mode="out-in"` 是最常用的过渡模式，确保旧组件完全离开后新组件才进入。通过 `route.meta` 可以为不同路由配置不同效果，根据导航深度可以实现方向感知的滑动效果。

同时使用过渡和 KeepAlive 时，注意组件的 key 属性。使用 transform 和 opacity 实现 GPU 加速的流畅动画。尊重用户的减少动画偏好设置。

过渡动画应该提升而非阻碍用户体验——保持简短、流畅、有意义。
