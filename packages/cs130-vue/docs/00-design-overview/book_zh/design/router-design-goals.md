# Vue Router 的设计目标

Vue Router 是 Vue 官方的路由管理库。它的设计目标是提供一套声明式的路由方案，让单页应用的页面导航像多页应用一样直观。

## 声明式路由

Vue Router 的核心设计理念是声明式路由配置。开发者通过配置对象描述 URL 与组件的映射关系，而不是命令式地控制页面切换。

```javascript
const routes = [
  { path: '/', component: Home },
  { path: '/about', component: About },
  { path: '/user/:id', component: User }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})
```

这种设计让路由结构一目了然。只看配置就能理解应用的页面结构，不需要追踪代码中的跳转逻辑。

声明式配置还带来了可预测性。相同的 URL 总是渲染相同的组件，状态完全由 URL 决定。这让应用的行为更容易理解和调试。

## 与 Vue 组件系统的深度集成

Vue Router 不是一个独立的工具，而是 Vue 生态的一部分。它与 Vue 的组件系统深度集成，路由切换就是组件切换。

```vue
<template>
  <nav>
    <router-link to="/">Home</router-link>
    <router-link to="/about">About</router-link>
  </nav>
  
  <router-view />
</template>
```

`<router-view>` 是一个特殊的组件，根据当前路由渲染对应的组件。`<router-link>` 替代传统的 `<a>` 标签，提供声明式的导航。

这种集成让路由成为组件树的一部分。父组件可以通过 `<router-view>` 渲染子路由，形成嵌套路由的结构。

```javascript
const routes = [
  {
    path: '/user/:id',
    component: User,
    children: [
      { path: 'profile', component: UserProfile },
      { path: 'posts', component: UserPosts }
    ]
  }
]
```

嵌套路由让复杂的页面布局变得清晰。每一层路由对应一层布局，职责分明。

## 响应式路由状态

Vue Router 的路由状态是响应式的。`useRoute()` 返回的路由对象会随着 URL 变化自动更新，组件会自动重新渲染。

```javascript
import { useRoute } from 'vue-router'

export default {
  setup() {
    const route = useRoute()
    
    // route.params 是响应式的
    // 当 URL 变化时，组件自动更新
    return () => h('div', `User ID: ${route.params.id}`)
  }
}
```

这种设计利用了 Vue 的响应式系统，让路由变化和数据变化使用相同的更新机制。开发者不需要手动订阅路由事件，一切都是自动的。

## 导航守卫

现实中的应用需要在页面切换前后执行各种逻辑：权限验证、数据预加载、离开确认等。Vue Router 通过导航守卫提供这些能力。

```javascript
router.beforeEach((to, from) => {
  if (to.meta.requiresAuth && !isLoggedIn()) {
    return '/login'
  }
})
```

导航守卫是拦截器模式的应用。路由切换被分解为多个阶段，每个阶段都可以插入自定义逻辑。

全局守卫作用于所有路由切换，路由独享守卫只作用于特定路由，组件内守卫只作用于特定组件。这种分层设计让不同粒度的逻辑有合适的存放位置。

## 懒加载与代码分割

单页应用的一个问题是初始加载包含所有页面的代码。Vue Router 支持路由级别的代码分割，只在访问时加载对应的组件。

```javascript
const routes = [
  {
    path: '/admin',
    component: () => import('./views/Admin.vue')
  }
]
```

动态导入返回一个 Promise，Vue Router 会在导航时等待组件加载完成。这与现代打包工具（Vite、webpack）的代码分割能力配合，实现按需加载。

这种设计让大型应用的初始加载时间大幅减少。用户只需下载当前页面的代码，其他页面的代码在需要时才加载。

## 历史模式的统一抽象

浏览器提供了两种管理 URL 的方式：History API 和 hash。Vue Router 将这两种方式统一抽象为 history 接口。

```javascript
// HTML5 History 模式
createWebHistory()

// Hash 模式
createWebHashHistory()

// 内存模式（用于 SSR）
createMemoryHistory()
```

不同的 history 实现共享相同的接口。上层的路由逻辑不需要关心底层使用哪种方式，这让切换模式只需要改一行配置。

这种抽象也让 SSR 成为可能。服务端使用内存模式，客户端使用 Web History 或 Hash 模式，上层代码保持一致。

## 滚动行为控制

页面切换时的滚动位置是一个常被忽略的用户体验细节。前进时滚动到顶部，后退时恢复之前的位置——这是用户的自然预期。

```javascript
const router = createRouter({
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition  // 后退时恢复位置
    }
    return { top: 0 }  // 前进时滚动到顶部
  }
})
```

Vue Router 提供了 scrollBehavior 钩子，让开发者精确控制滚动行为。还支持滚动到锚点、延迟滚动等高级功能。

## 类型安全

Vue Router 4 完全使用 TypeScript 重写，提供了完整的类型支持。

```typescript
const routes: RouteRecordRaw[] = [
  { path: '/', component: Home }
]

// route.params 是类型安全的
const route = useRoute()
```

类型安全在大型项目中尤其重要。编辑器可以提供自动补全，类型错误在编译时就能发现，减少了运行时错误的可能。

## 设计哲学

Vue Router 的设计体现了几个核心理念：

**URL 是应用状态的来源**。URL 完全描述了当前页面应该展示什么。这让应用可以被书签保存、被分享链接、被浏览器历史正确处理。

**组合优于继承**。路由配置是可组合的对象，不是需要继承的类。这让配置更灵活，也更容易动态生成。

**渐进式复杂度**。简单应用只需要路径和组件的映射。随着需求增长，可以逐步引入嵌套路由、导航守卫、懒加载等高级特性。

这些设计让 Vue Router 既能满足简单应用的需求，也能支撑复杂的企业级应用。
