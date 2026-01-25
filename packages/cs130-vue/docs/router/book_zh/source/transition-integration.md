# 过渡动画实现

Vue Router 与 Vue 的 Transition 组件配合，实现路由切换时的过渡动画。

## 基本用法

```vue
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

## RouterView 作用域插槽

RouterView 暴露 Component 和 route：

```typescript
// RouterView.ts
return () => {
  const route = routeToDisplay.value
  const matchedRoute = matchedRouteRef.value
  const ViewComponent = matchedRoute?.components?.[props.name]

  // 创建 vnode
  const vnode = h(ViewComponent, componentProps)

  // 通过插槽暴露
  return slots.default
    ? slots.default({ Component: vnode, route })
    : vnode
}
```

## 为什么需要作用域插槽

直接使用 Transition 包裹 RouterView 不起作用：

```vue
<!-- ❌ 不工作 -->
<Transition name="fade">
  <RouterView />
</Transition>

<!-- ✅ 正确方式 -->
<RouterView v-slot="{ Component }">
  <Transition name="fade">
    <component :is="Component" />
  </Transition>
</RouterView>
```

因为 Transition 需要直接包裹变化的元素，而 RouterView 本身不变。

## 动态过渡

根据路由配置不同的过渡效果：

```vue
<template>
  <RouterView v-slot="{ Component, route }">
    <Transition :name="route.meta.transition || 'fade'">
      <component :is="Component" />
    </Transition>
  </RouterView>
</template>
```

路由配置：

```typescript
const routes = [
  {
    path: '/home',
    component: Home,
    meta: { transition: 'slide-left' }
  },
  {
    path: '/about',
    component: About,
    meta: { transition: 'slide-right' }
  }
]
```

## 方向感知过渡

根据导航方向切换动画：

```vue
<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const transitionName = ref('fade')

router.afterEach((to, from) => {
  // 根据路由索引判断方向
  const toIndex = to.meta.index ?? 0
  const fromIndex = from.meta.index ?? 0
  
  transitionName.value = toIndex > fromIndex ? 'slide-left' : 'slide-right'
})
</script>

<template>
  <RouterView v-slot="{ Component }">
    <Transition :name="transitionName">
      <component :is="Component" />
    </Transition>
  </RouterView>
</template>
```

## 与 KeepAlive 配合

```vue
<template>
  <RouterView v-slot="{ Component }">
    <Transition name="fade">
      <KeepAlive>
        <component :is="Component" />
      </KeepAlive>
    </Transition>
  </RouterView>
</template>
```

顺序很重要：Transition 在外，KeepAlive 在内。

## 条件 KeepAlive

```vue
<template>
  <RouterView v-slot="{ Component, route }">
    <Transition name="fade">
      <KeepAlive :include="cachedViews">
        <component :is="Component" :key="route.fullPath" />
      </KeepAlive>
    </Transition>
  </RouterView>
</template>
```

## key 的作用

```vue
<!-- 相同组件不同参数时强制重新渲染 -->
<component :is="Component" :key="route.fullPath" />
```

如果不加 key，同一组件的参数变化不会触发过渡：

```
/users/1 → /users/2
```

使用相同的 UserDetail 组件，需要 key 来触发过渡。

## 过渡模式

```vue
<Transition name="fade" mode="out-in">
  <component :is="Component" />
</Transition>
```

模式说明：
- **默认**：进入和离开同时进行
- **out-in**：先离开再进入
- **in-out**：先进入再离开

## 滚动与过渡的配合

```typescript
const router = createRouter({
  scrollBehavior(to, from, savedPosition) {
    // 等待过渡完成
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(savedPosition || { top: 0 })
      }, 300)  // 与过渡时间匹配
    })
  }
})
```

## 路由级过渡配置

```typescript
interface RouteMeta {
  transition?: string
  transitionDuration?: number
}

const routes = [
  {
    path: '/modal',
    component: Modal,
    meta: {
      transition: 'modal',
      transitionDuration: 500
    }
  }
]
```

```vue
<template>
  <RouterView v-slot="{ Component, route }">
    <Transition 
      :name="route.meta.transition"
      :duration="route.meta.transitionDuration"
    >
      <component :is="Component" />
    </Transition>
  </RouterView>
</template>
```

## 本章小结

路由过渡动画的关键：

1. **作用域插槽**：使用 `v-slot="{ Component }"` 获取组件
2. **Transition 包裹**：包裹动态组件而非 RouterView
3. **动态过渡**：通过 `route.meta` 配置不同效果
4. **key 控制**：确保参数变化时触发过渡
5. **模式选择**：`out-in` 避免布局抖动

理解过渡实现原理，可以创建流畅的页面切换体验。
