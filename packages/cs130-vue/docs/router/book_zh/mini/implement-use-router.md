# 实现 useRouter/useRoute

useRouter 和 useRoute 是 Vue Router 的组合式 API，让组件能够访问路由器和当前路由。

## 基本实现

这两个函数的实现非常简单，本质就是依赖注入：

```typescript
// composables/useRouter.ts
import { inject } from 'vue'
import { routerKey, routeKey } from '../router'
import type { Router, RouteLocation } from '../types'

export function useRouter(): Router {
  const router = inject(routerKey)
  
  if (!router) {
    throw new Error(
      'useRouter() is called but there is no router installed. ' +
      'Make sure to call app.use(router) before using useRouter().'
    )
  }
  
  return router
}

export function useRoute(): RouteLocation {
  const route = inject(routeKey)
  
  if (!route) {
    throw new Error(
      'useRoute() is called but there is no router installed. ' +
      'Make sure to call app.use(router) before using useRoute().'
    )
  }
  
  // 返回响应式的当前路由
  // 注意：这里返回的是 Ref 的 value
  return route.value
}
```

不过这个实现有个问题：useRoute 返回的是当前时刻的值，不是响应式的。每次路由变化后需要重新调用才能获取新值。

## 响应式 useRoute

为了让 useRoute 返回的对象在路由变化时自动更新，需要做一些处理：

```typescript
// composables/useRouter.ts
import { inject, computed, reactive, toRefs, Ref } from 'vue'
import { routerKey, routeKey } from '../router'
import type { Router, RouteLocation } from '../types'

export function useRouter(): Router {
  const router = inject(routerKey)
  
  if (!router) {
    throw new Error('No router installed')
  }
  
  return router
}

// 方案一：返回 Ref
export function useRoute(): Ref<RouteLocation> {
  const route = inject(routeKey)
  
  if (!route) {
    throw new Error('No router installed')
  }
  
  return route
}

// 方案二：返回响应式对象（更接近 Vue Router 的实际行为）
export function useRoute(): RouteLocation {
  const route = inject(routeKey)
  
  if (!route) {
    throw new Error('No router installed')
  }
  
  // 使用 computed 创建响应式代理
  return new Proxy({} as RouteLocation, {
    get(target, key: keyof RouteLocation) {
      return route.value[key]
    }
  })
}
```

实际上 Vue Router 的 useRoute 返回的是一个响应式对象，访问它的属性时会追踪依赖，路由变化时会触发更新。

## 更完善的实现

```typescript
// composables/index.ts
import { 
  inject, 
  computed, 
  reactive, 
  ComputedRef 
} from 'vue'
import { routerKey, routeKey } from '../router'
import type { Router, RouteLocation } from '../types'

export function useRouter(): Router {
  const router = inject(routerKey)
  
  if (!router) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        'useRouter() was called but no router was installed. ' +
        'Did you forget to call app.use(router)?'
      )
    }
    throw new Error('No router installed')
  }
  
  return router
}

// 创建响应式路由对象
export function useRoute(): RouteLocation {
  const routeRef = inject(routeKey)
  
  if (!routeRef) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('useRoute() was called but no router was installed.')
    }
    throw new Error('No router installed')
  }
  
  // 使用 reactive + computed 的组合
  const route = {} as RouteLocation
  
  // 为每个属性创建 computed
  const keys: (keyof RouteLocation)[] = [
    'path',
    'name',
    'params',
    'query',
    'hash',
    'fullPath',
    'matched',
    'meta',
    'redirectedFrom'
  ]
  
  for (const key of keys) {
    Object.defineProperty(route, key, {
      get: () => routeRef.value[key],
      enumerable: true
    })
  }
  
  return route
}
```

## useLink 组合式 API

useLink 用于构建自定义的链接组件：

```typescript
// composables/useLink.ts
import { computed, Ref, unref } from 'vue'
import { useRouter, useRoute } from './index'
import type { RouteLocationRaw, RouteLocation } from '../types'

export interface UseLinkOptions {
  to: RouteLocationRaw | Ref<RouteLocationRaw>
  replace?: boolean | Ref<boolean>
}

export interface UseLinkReturn {
  route: ComputedRef<RouteLocation>
  href: ComputedRef<string>
  isActive: ComputedRef<boolean>
  isExactActive: ComputedRef<boolean>
  navigate: (e?: MouseEvent) => Promise<void>
}

export function useLink(props: UseLinkOptions): UseLinkReturn {
  const router = useRouter()
  const currentRoute = useRoute()
  
  // 解析目标路由
  const route = computed(() => {
    const to = unref(props.to)
    return router.resolve(to)
  })
  
  // href
  const href = computed(() => route.value.fullPath)
  
  // 活动状态
  const isActive = computed(() => {
    const current = currentRoute.path
    const target = route.value.path
    
    return current.startsWith(target) && (
      current === target || 
      current[target.length] === '/'
    )
  })
  
  const isExactActive = computed(() => {
    return currentRoute.path === route.value.path
  })
  
  // 导航函数
  async function navigate(e?: MouseEvent) {
    if (e) {
      // 检查修饰键
      if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey) {
        return
      }
      if (e.button !== 0) {
        return
      }
      if (e.defaultPrevented) {
        return
      }
      e.preventDefault()
    }
    
    const to = unref(props.to)
    const replace = unref(props.replace)
    
    if (replace) {
      await router.replace(to)
    } else {
      await router.push(to)
    }
  }
  
  return {
    route,
    href,
    isActive,
    isExactActive,
    navigate
  }
}
```

## 组件内守卫

组合式 API 版本的组件守卫：

```typescript
// composables/guards.ts
import { 
  inject, 
  onUnmounted, 
  getCurrentInstance 
} from 'vue'
import { matchedRouteKey } from '../router'
import type { NavigationGuard } from '../types'

export function onBeforeRouteLeave(guard: NavigationGuard): void {
  if (!getCurrentInstance()) {
    console.warn(
      'onBeforeRouteLeave must be called inside setup()'
    )
    return
  }
  
  const matchedRoute = inject(matchedRouteKey)
  
  if (!matchedRoute?.value) {
    console.warn('No matched route found for onBeforeRouteLeave')
    return
  }
  
  const record = matchedRoute.value
  
  // 添加守卫
  if (!record.leaveGuards) {
    record.leaveGuards = []
  }
  record.leaveGuards.push(guard)
  
  // 组件卸载时移除
  onUnmounted(() => {
    const index = record.leaveGuards!.indexOf(guard)
    if (index > -1) {
      record.leaveGuards!.splice(index, 1)
    }
  })
}

export function onBeforeRouteUpdate(guard: NavigationGuard): void {
  if (!getCurrentInstance()) {
    console.warn(
      'onBeforeRouteUpdate must be called inside setup()'
    )
    return
  }
  
  const matchedRoute = inject(matchedRouteKey)
  
  if (!matchedRoute?.value) {
    console.warn('No matched route found for onBeforeRouteUpdate')
    return
  }
  
  const record = matchedRoute.value
  
  if (!record.updateGuards) {
    record.updateGuards = []
  }
  record.updateGuards.push(guard)
  
  onUnmounted(() => {
    const index = record.updateGuards!.indexOf(guard)
    if (index > -1) {
      record.updateGuards!.splice(index, 1)
    }
  })
}
```

## 使用示例

基本使用：

```html
<script setup>
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

function goToUser(id) {
  router.push({ name: 'user', params: { id } })
}

// 响应式访问
console.log(route.params.id)
</script>
```

使用 useLink：

```html
<script setup>
import { useLink } from 'vue-router'

const props = defineProps({
  to: {
    type: [String, Object],
    required: true
  }
})

const { href, isActive, navigate } = useLink({ to: props.to })
</script>

<template>
  <a :href="href" :class="{ active: isActive }" @click="navigate">
    <slot />
  </a>
</template>
```

组件守卫：

```html
<script setup>
import { ref } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'

const hasUnsavedChanges = ref(false)

onBeforeRouteLeave((to, from) => {
  if (hasUnsavedChanges.value) {
    const answer = window.confirm('确定要离开吗？')
    if (!answer) return false
  }
})

onBeforeRouteUpdate((to, from) => {
  // 路由参数变化时的处理
  console.log('Route updated:', to.params)
})
</script>
```

## 本章小结

useRouter/useRoute 的实现要点：

1. **依赖注入**：通过 inject 获取路由器和路由
2. **响应式代理**：useRoute 返回响应式对象
3. **错误处理**：未安装路由时给出明确错误
4. **useLink**：封装链接相关的响应式状态和方法
5. **组件守卫**：onBeforeRouteLeave 和 onBeforeRouteUpdate

这些 API 让路由功能可以在组合式 API 风格的组件中便捷使用。
