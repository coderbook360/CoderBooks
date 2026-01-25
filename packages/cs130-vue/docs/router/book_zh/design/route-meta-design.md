# 路由元信息设计

路由元信息（meta）是一种附加在路由配置上的自定义数据机制。它不影响路由匹配本身，但让你可以给路由"打标签"，在导航守卫、组件或其他地方使用这些标签来决定行为。

## 元信息的基本用法

在路由配置中使用 `meta` 字段：

```javascript
const routes = [
  {
    path: '/',
    component: Home,
    meta: { title: '首页' }
  },
  {
    path: '/admin',
    component: AdminPanel,
    meta: { 
      requiresAuth: true,
      requiresAdmin: true,
      title: '管理后台'
    }
  },
  {
    path: '/public',
    component: PublicPage,
    meta: { title: '公开页面' }
  }
]
```

`meta` 可以是任何对象，存储你需要的任何信息。常见的用途包括：

权限标记（`requiresAuth`、`requiresAdmin`、`roles`）
页面标题（`title`）
过渡动画名称（`transition`）
布局类型（`layout`）
是否缓存（`keepAlive`）
面包屑信息（`breadcrumb`）

## 在守卫中使用元信息

元信息最常见的使用场景是导航守卫。通过检查目标路由的 `meta`，决定是否允许导航：

```javascript
router.beforeEach((to, from) => {
  // 检查是否需要认证
  if (to.meta.requiresAuth) {
    if (!isAuthenticated()) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }
  }
  
  // 检查是否需要管理员权限
  if (to.meta.requiresAdmin) {
    if (!isAdmin()) {
      return { name: 'forbidden' }
    }
  }
})
```

这比在守卫中硬编码路径列表更加灵活。新增一个需要认证的路由时，只需要在该路由的 `meta` 中添加 `requiresAuth: true`，不需要修改守卫代码。

## 嵌套路由的元信息合并

对于嵌套路由，子路由可以有自己的 `meta`，也可以继承父路由的 `meta`。`route.meta` 只包含当前匹配路由的 `meta`，但 `route.matched` 数组包含了所有匹配的路由记录：

```javascript
const routes = [
  {
    path: '/admin',
    component: AdminLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: 'users',
        component: AdminUsers,
        meta: { requiresAdmin: true }
      }
    ]
  }
]
```

访问 `/admin/users` 时，`route.matched` 包含两个记录：AdminLayout 和 AdminUsers。

要检查整个匹配链中是否有某个 `meta`，可以这样写：

```javascript
router.beforeEach((to, from) => {
  // 检查匹配链中是否有需要认证的路由
  if (to.matched.some(record => record.meta.requiresAuth)) {
    if (!isAuthenticated()) {
      return { name: 'login' }
    }
  }
})
```

使用 `some()` 而不是直接检查 `to.meta`，确保即使父路由标记了 `requiresAuth`，子路由也会被正确保护。

## 动态页面标题

一个常见需求是根据路由更新页面标题：

```javascript
const routes = [
  { path: '/', component: Home, meta: { title: '首页' } },
  { path: '/about', component: About, meta: { title: '关于我们' } },
  { path: '/users/:id', component: UserDetail, meta: { title: '用户详情' } }
]

router.afterEach((to) => {
  document.title = to.meta.title || '默认标题'
})
```

对于动态标题（比如包含用户名），可以在组件中更新：

```javascript
// UserDetail.vue
import { watchEffect } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

watchEffect(() => {
  document.title = `${userName.value} - 用户详情`
})
```

或者使用 vue-router 4.1+ 的 `titleTemplate` 功能配合一些库来管理。

## 控制过渡动画

元信息可以控制页面切换的过渡效果：

```javascript
const routes = [
  { path: '/home', component: Home, meta: { transition: 'slide-left' } },
  { path: '/about', component: About, meta: { transition: 'slide-right' } },
  { path: '/modal', component: Modal, meta: { transition: 'fade' } }
]
```

在根组件中：

```html
<template>
  <RouterView v-slot="{ Component, route }">
    <Transition :name="route.meta.transition || 'fade'">
      <component :is="Component" />
    </Transition>
  </RouterView>
</template>
```

更复杂的场景可以根据导航方向决定动画：

```javascript
router.afterEach((to, from) => {
  const toDepth = to.path.split('/').length
  const fromDepth = from.path.split('/').length
  to.meta.transition = toDepth > fromDepth ? 'slide-left' : 'slide-right'
})
```

## KeepAlive 缓存控制

元信息可以指示哪些组件应该被缓存：

```javascript
const routes = [
  { path: '/list', component: List, meta: { keepAlive: true } },
  { path: '/detail/:id', component: Detail, meta: { keepAlive: false } }
]
```

```html
<template>
  <RouterView v-slot="{ Component, route }">
    <KeepAlive v-if="route.meta.keepAlive">
      <component :is="Component" />
    </KeepAlive>
    <component v-else :is="Component" />
  </RouterView>
</template>
```

这比使用 `include`/`exclude` 按组件名缓存更灵活——同一个组件在不同路由下可以有不同的缓存策略。

## 布局切换

大型应用通常有多种布局——有侧边栏的、无侧边栏的、全屏的等。元信息可以控制布局选择：

```javascript
const routes = [
  { path: '/', component: Home, meta: { layout: 'default' } },
  { path: '/login', component: Login, meta: { layout: 'blank' } },
  { path: '/dashboard', component: Dashboard, meta: { layout: 'admin' } }
]
```

```html
<!-- App.vue -->
<template>
  <component :is="layoutComponent">
    <RouterView />
  </component>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import DefaultLayout from './layouts/Default.vue'
import BlankLayout from './layouts/Blank.vue'
import AdminLayout from './layouts/Admin.vue'

const route = useRoute()

const layouts = {
  default: DefaultLayout,
  blank: BlankLayout,
  admin: AdminLayout
}

const layoutComponent = computed(() => {
  return layouts[route.meta.layout] || DefaultLayout
})
</script>
```

## 面包屑导航

元信息可以存储面包屑所需的信息：

```javascript
const routes = [
  { 
    path: '/', 
    component: Home, 
    meta: { breadcrumb: '首页' } 
  },
  { 
    path: '/users', 
    component: Users, 
    meta: { breadcrumb: '用户管理' },
    children: [
      { 
        path: ':id', 
        component: UserDetail, 
        meta: { breadcrumb: '用户详情' } 
      }
    ]
  }
]
```

面包屑组件可以遍历 `matched` 数组：

```html
<template>
  <nav class="breadcrumb">
    <RouterLink 
      v-for="(record, index) in route.matched" 
      :key="record.path"
      :to="record.path"
    >
      {{ record.meta.breadcrumb }}
      <span v-if="index < route.matched.length - 1"> / </span>
    </RouterLink>
  </nav>
</template>
```

## TypeScript 类型扩展

使用 TypeScript 时，可以扩展 `RouteMeta` 类型来获得类型提示：

```typescript
// router.d.ts 或在 router 文件中
import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    requiresAdmin?: boolean
    title?: string
    transition?: string
    layout?: 'default' | 'blank' | 'admin'
    keepAlive?: boolean
  }
}
```

现在访问 `route.meta` 时会有类型提示和检查。

## 设计建议

元信息应该存储"关于路由的配置"，而不是"路由的数据"。区别在于：配置在应用运行期间不变，数据会动态变化。用户列表不应该存在 `meta` 里，但"这个页面需要认证"可以。

保持 `meta` 结构的一致性。在团队中约定 `meta` 的字段名称和类型，最好用 TypeScript 来强制执行。

不要过度使用 `meta`。如果某个信息只在一个地方使用，放在 `meta` 里可能过度设计。`meta` 最有价值的场景是信息被多处使用（守卫、组件、布局）。

## 本章小结

路由元信息是一种简单而强大的机制，让你可以给路由附加自定义数据。通过在守卫中检查 `meta`，可以实现灵活的访问控制。通过在组件中读取 `meta`，可以控制布局、动画、缓存等行为。

对于嵌套路由，记得使用 `matched.some()` 来检查整个匹配链中的 `meta`。对于 TypeScript 项目，扩展 `RouteMeta` 类型可以获得更好的开发体验。

元信息的设计原则是：存储配置而非数据，保持结构一致，在有明确需求时使用。
