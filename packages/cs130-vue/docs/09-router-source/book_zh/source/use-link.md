# useLink 组合函数

`useLink` 封装了 RouterLink 的核心逻辑，允许在自定义组件中复用导航功能。

## 基本用法

```typescript
import { useLink, RouterLinkProps } from 'vue-router'

const props = defineProps<RouterLinkProps>()

const { 
  route,       // 解析后的路由对象
  href,        // 完整的 URL
  isActive,    // 是否活动
  isExactActive, // 是否精确活动
  navigate     // 导航函数
} = useLink(props)
```

## 实现原理

```typescript
export function useLink(props: UseLinkOptions) {
  const router = inject(routerKey)!
  const currentRoute = inject(routeLocationKey)!

  // 解析目标路由
  const route = computed(() => router.resolve(unref(props.to)))

  // 计算活动状态
  const activeRecordIndex = computed(() => {
    const { matched } = route.value
    const { length } = matched
    const routeMatched = matched[length - 1]
    const currentMatched = currentRoute.matched
    
    if (!routeMatched || !currentMatched.length) return -1
    
    const index = currentMatched.findIndex(
      isSameRouteRecord.bind(null, routeMatched)
    )
    
    return index
  })

  const isActive = computed(
    () => activeRecordIndex.value > -1 &&
      includesParams(currentRoute.params, route.value.params)
  )

  const isExactActive = computed(
    () => activeRecordIndex.value === currentRoute.matched.length - 1 &&
      isSameRouteLocationParams(currentRoute.params, route.value.params)
  )

  // 导航函数
  function navigate(e: MouseEvent = {} as MouseEvent): Promise<NavigationFailure | void> {
    if (guardEvent(e)) {
      return router[unref(props.replace) ? 'replace' : 'push'](
        unref(props.to)
      ).catch(noop)
    }
    return Promise.resolve()
  }

  return {
    route,
    href: computed(() => route.value.href),
    isActive,
    isExactActive,
    navigate
  }
}
```

## 使用场景

**自定义导航按钮**：

```html
<script setup lang="ts">
import { useLink } from 'vue-router'

const props = defineProps<{
  to: string
  icon: string
}>()

const { href, navigate, isActive } = useLink(props)
</script>

<template>
  <button 
    :class="{ 'active': isActive }"
    @click="navigate"
  >
    <Icon :name="icon" />
    <slot />
  </button>
</template>
```

**导航卡片**：

```html
<script setup lang="ts">
import { useLink } from 'vue-router'

const props = defineProps<{
  to: string
  title: string
  description: string
}>()

const { route, navigate, isExactActive } = useLink(props)
</script>

<template>
  <article 
    :class="{ 'current': isExactActive }"
    @click="navigate"
  >
    <h3>{{ title }}</h3>
    <p>{{ description }}</p>
    <span class="meta">{{ route.meta.category }}</span>
  </article>
</template>
```

**面包屑组件**：

```html
<script setup lang="ts">
import { useLink } from 'vue-router'

const props = defineProps<{
  items: Array<{ to: string; label: string }>
}>()
</script>

<template>
  <nav class="breadcrumb">
    <template v-for="(item, index) in items" :key="item.to">
      <BreadcrumbItem :to="item.to">
        {{ item.label }}
      </BreadcrumbItem>
      <span v-if="index < items.length - 1">/</span>
    </template>
  </nav>
</template>

<!-- BreadcrumbItem.vue -->
<script setup lang="ts">
import { useLink } from 'vue-router'

const props = defineProps<{ to: string }>()
const { href, navigate, isExactActive } = useLink(props)
</script>

<template>
  <a 
    :href="href"
    :class="{ 'current': isExactActive }"
    @click="navigate"
  >
    <slot />
  </a>
</template>
```

## 与 RouterLink 的区别

| 特性 | RouterLink | useLink |
|------|------------|---------|
| 形式 | 组件 | Composition 函数 |
| 渲染 | 默认 `<a>` | 完全自定义 |
| 灵活性 | 通过 v-slot | 完全控制 |
| 复用 | 继承 | 组合 |

## 响应式 to

`useLink` 支持响应式的 `to`：

```typescript
const props = defineProps<{
  userId: string
}>()

const to = computed(() => ({
  name: 'user',
  params: { id: props.userId }
}))

const { route, navigate } = useLink({ to })

// 当 userId 变化时，route 自动更新
```

## UseLinkOptions 类型

```typescript
interface UseLinkOptions {
  to: MaybeRef<RouteLocationRaw>
  replace?: MaybeRef<boolean | undefined>
}
```

`MaybeRef` 表示可以是普通值或 ref。

## 导航事件处理

```typescript
function navigate(e: MouseEvent = {} as MouseEvent) {
  // guardEvent 处理修饰键
  if (guardEvent(e)) {
    return router[unref(props.replace) ? 'replace' : 'push'](
      unref(props.to)
    ).catch(noop)  // 静默处理错误
  }
  return Promise.resolve()
}
```

`guardEvent` 确保：
- Ctrl/Cmd+Click 在新标签打开
- 右键菜单正常工作
- 普通点击执行 SPA 导航

## 本章小结

useLink 提供 RouterLink 的核心功能：

1. **route**：解析后的目标路由
2. **href**：用于 `<a>` 标签的链接
3. **isActive/isExactActive**：活动状态
4. **navigate**：处理点击的导航函数
5. **响应式**：支持响应式的 to 参数

使用 useLink 可以创建完全自定义的导航组件，同时保持与 RouterLink 一致的行为。
