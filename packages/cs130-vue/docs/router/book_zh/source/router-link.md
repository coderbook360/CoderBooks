# RouterLink 组件实现

RouterLink 是声明式导航组件，渲染为 `<a>` 标签，支持自定义渲染。

## 基本用法

```vue
<template>
  <!-- 字符串路径 -->
  <RouterLink to="/about">About</RouterLink>
  
  <!-- 对象路径 -->
  <RouterLink :to="{ name: 'user', params: { id: '123' } }">
    User
  </RouterLink>
  
  <!-- 自定义渲染 -->
  <RouterLink to="/about" v-slot="{ href, navigate, isActive }">
    <button :class="{ active: isActive }" @click="navigate">
      About
    </button>
  </RouterLink>
</template>
```

## 组件定义

```typescript
export const RouterLinkImpl = defineComponent({
  name: 'RouterLink',
  
  props: {
    to: {
      type: [String, Object] as PropType<RouteLocationRaw>,
      required: true
    },
    replace: Boolean,
    activeClass: String,
    exactActiveClass: String,
    custom: Boolean,
    ariaCurrentValue: {
      type: String as PropType<'page' | 'step' | 'location' | 'date' | 'time' | 'true' | 'false'>,
      default: 'page'
    }
  },

  setup(props, { slots }) {
    const router = inject(routerKey)!
    const currentRoute = inject(routeLocationKey)!

    // 解析目标路由
    const route = computed(() => router.resolve(props.to))

    // 活动状态
    const activeRecordIndex = computed(() => {
      const { matched } = route.value
      const { length } = matched
      const routeMatched = matched[length - 1]
      const currentMatched = currentRoute.matched
      
      if (!routeMatched || !currentMatched.length) return -1
      
      const index = currentMatched.findIndex(
        isSameRouteRecord.bind(null, routeMatched)
      )
      
      return index > -1 ? index : findLastIndex(
        currentMatched,
        (record, index, array) => {
          const matchedChild = array[index + 1]
          return matchedChild
            ? matchedChild.aliasOf !== routeMatched
            : false
        }
      )
    })

    const isActive = computed(
      () => activeRecordIndex.value > -1 &&
        includesParams(currentRoute.params, route.value.params)
    )

    const isExactActive = computed(
      () => activeRecordIndex.value === currentRoute.matched.length - 1 &&
        isSameRouteLocationParams(currentRoute.params, route.value.params)
    )

    // 导航处理
    function navigate(e: MouseEvent = {} as MouseEvent): Promise<NavigationFailure | void> {
      if (guardEvent(e)) {
        return router[props.replace ? 'replace' : 'push'](props.to)
          .catch(noop)
      }
      return Promise.resolve()
    }

    return () => {
      const children = slots.default?.(link)
      
      // 自定义渲染
      if (props.custom) {
        return children
      }

      // 默认渲染为 a 标签
      return h(
        'a',
        {
          'aria-current': isExactActive.value ? props.ariaCurrentValue : null,
          href: route.value.href,
          onClick: navigate,
          class: elClass.value
        },
        children
      )
    }
  }
})
```

## 活动状态判断

**isActive**：目标路由是当前路由的父级或本身

```typescript
const isActive = computed(() => {
  // 在 currentRoute.matched 中找到匹配
  return activeRecordIndex.value > -1 &&
    includesParams(currentRoute.params, route.value.params)
})
```

**isExactActive**：目标路由就是当前路由

```typescript
const isExactActive = computed(() => {
  // 是最后一个匹配的记录
  return activeRecordIndex.value === currentRoute.matched.length - 1 &&
    isSameRouteLocationParams(currentRoute.params, route.value.params)
})
```

示例：

```typescript
// 当前路由: /admin/users/123

// RouterLink to="/admin"
isActive: true       // /admin 是 /admin/users/123 的父级
isExactActive: false

// RouterLink to="/admin/users/123"
isActive: true
isExactActive: true

// RouterLink to="/profile"
isActive: false
isExactActive: false
```

## guardEvent

阻止默认的导航行为：

```typescript
function guardEvent(e: MouseEvent): boolean {
  // 不要拦截这些情况
  if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey) return false
  if (e.defaultPrevented) return false
  if (e.button !== undefined && e.button !== 0) return false
  if (e.currentTarget?.target === '_blank') return false
  
  // 阻止默认行为
  e.preventDefault()
  return true
}
```

这确保了：
- Cmd/Ctrl+Click 在新标签打开
- 右键点击正常工作
- target="_blank" 的链接正常工作

## 作用域插槽

RouterLink 暴露丰富的作用域数据：

```typescript
const link = reactive({
  route: route.value,
  href: route.value.href,
  isActive: isActive.value,
  isExactActive: isExactActive.value,
  navigate
})

return () => {
  return slots.default?.(link)
}
```

使用：

```vue
<RouterLink to="/about" v-slot="{ href, navigate, isActive, isExactActive, route }">
  <li :class="{ 'active': isActive, 'exact-active': isExactActive }">
    <a :href="href" @click="navigate">
      {{ route.meta.title }}
    </a>
  </li>
</RouterLink>
```

## custom 属性

`custom` 跳过默认的 `<a>` 渲染：

```vue
<!-- 默认：渲染为 a -->
<RouterLink to="/about">About</RouterLink>
<!-- <a href="/about">About</a> -->

<!-- custom：只渲染插槽内容 -->
<RouterLink to="/about" custom v-slot="{ navigate }">
  <button @click="navigate">About</button>
</RouterLink>
<!-- <button>About</button> -->
```

实现：

```typescript
return () => {
  const children = slots.default?.(link)
  
  if (props.custom) {
    return children  // 直接返回插槽内容
  }

  return h('a', { ... }, children)
}
```

## 类名配置

```typescript
// 全局配置
const router = createRouter({
  linkActiveClass: 'is-active',
  linkExactActiveClass: 'is-exact-active'
})

// 单个链接配置
<RouterLink 
  to="/about" 
  activeClass="my-active"
  exactActiveClass="my-exact-active"
>
  About
</RouterLink>
```

实现：

```typescript
const elClass = computed(() => ({
  [getLinkClass(props.activeClass, router.options.linkActiveClass, 'router-link-active')]: isActive.value,
  [getLinkClass(props.exactActiveClass, router.options.linkExactActiveClass, 'router-link-exact-active')]: isExactActive.value
}))
```

## 本章小结

RouterLink 的核心功能：

1. **路由解析**：使用 `router.resolve` 获取目标信息
2. **活动状态**：`isActive` 和 `isExactActive` 判断
3. **事件处理**：`guardEvent` 处理各种点击情况
4. **作用域插槽**：暴露完整的导航信息
5. **custom 模式**：支持完全自定义渲染

RouterLink 将声明式导航和响应式活动状态封装为易用的组件。
