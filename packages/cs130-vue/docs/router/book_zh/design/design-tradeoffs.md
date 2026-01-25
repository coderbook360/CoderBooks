# 设计权衡与取舍

任何技术决策都涉及权衡。Vue Router 的设计者在多个维度上做出了取舍，理解这些取舍能帮助我们更好地使用它，也能在遇到边界情况时做出正确的判断。

## Hash 模式 vs History 模式

这是最直观的权衡之一。

Hash 模式使用 URL 的 hash 部分（`#/path`）来模拟路由。它的优势是完全客户端实现，不需要服务器配置。任何静态文件服务器、CDN、甚至直接打开 HTML 文件都能工作。

但 hash 模式有明显的缺点：URL 不美观，包含 `#` 符号。SEO 不友好，虽然现代爬虫能处理 hash，但传统意义上 hash 后的内容不被视为路径的一部分。分享链接时 hash 部分可能被某些平台截断或处理不当。

History 模式使用标准的 URL 路径（`/path`），看起来和传统多页面应用一样。URL 美观，SEO 友好，分享没有问题。

代价是需要服务器支持。所有路由都需要返回 `index.html`，否则刷新页面会 404。这需要配置 nginx、Apache 或使用支持 SPA 的托管服务。

选择建议：如果能控制服务器配置，使用 History 模式。如果部署在不可控的静态服务器上，或者只是内部工具，Hash 模式完全可以接受。

## 声明式 vs 编程式导航

Vue Router 同时支持两种导航方式：

```html
<!-- 声明式 -->
<RouterLink to="/about">关于</RouterLink>

<!-- 编程式 -->
<button @click="router.push('/about')">关于</button>
```

声明式导航更符合 Vue 的模板思想，意图清晰，自动处理激活状态。编程式导航更灵活，可以在复杂逻辑后再决定跳转。

两者不是非此即彼的关系。通常的做法是：简单的导航链接用 `RouterLink`，需要额外逻辑（如表单提交后跳转、条件导航）时用编程式。

有一个常见错误是在 `RouterLink` 的 `@click` 中使用 `router.push`：

```html
<!-- 错误：会导航两次或行为异常 -->
<RouterLink to="/about" @click="router.push('/about')">关于</RouterLink>
```

如果需要在点击时执行额外逻辑，正确的方式是：

```html
<RouterLink to="/about" @click="handleClick">关于</RouterLink>

<!-- 或者完全用编程式 -->
<button @click="navigateToAbout">关于</button>
```

## 路由配置的静态 vs 动态

Vue Router 支持静态和动态两种路由配置方式：

静态配置在创建路由器时一次性定义所有路由：

```javascript
const router = createRouter({
  routes: [
    { path: '/', component: Home },
    { path: '/about', component: About },
    { path: '/admin', component: Admin }
  ]
})
```

动态配置可以在运行时添加或删除路由：

```javascript
router.addRoute({ path: '/new', component: NewPage })
router.removeRoute('routeName')
```

静态配置简单、可预测，便于代码分析和类型检查。动态配置灵活，适合根据用户权限动态添加路由的场景。

权衡在于：动态路由增加了运行时的不确定性，调试更困难，页面刷新后需要重新添加。大多数应用应该优先使用静态配置，只在真正需要时才使用动态路由。

## 导航守卫的粒度

Vue Router 提供了多层导航守卫：

```javascript
// 全局守卫 - 作用于所有路由
router.beforeEach((to, from) => { /* ... */ })

// 路由独享守卫 - 作用于特定路由
{ path: '/admin', beforeEnter: (to, from) => { /* ... */ } }

// 组件内守卫 - 作用于特定组件
onBeforeRouteLeave((to, from) => { /* ... */ })
```

这种分层设计是个权衡。好处是灵活，可以在合适的层级处理不同关注点。坏处是复杂，需要理解执行顺序，容易在多个地方重复逻辑。

实践建议：

全局守卫处理通用逻辑（认证检查、页面标题、进度条）
路由独享守卫处理特定路由的准入条件
组件内守卫处理组件状态相关的逻辑（如未保存表单提示）

避免在多个层级做同样的检查，保持每个守卫的职责单一。

## 懒加载的粒度

每个路由组件懒加载会产生很多小文件，每个都需要一次 HTTP 请求。把多个路由打包在一起减少请求数，但可能加载不需要的代码。

极端的按路由分割：

```javascript
routes: [
  { path: '/a', component: () => import('./A.vue') },
  { path: '/b', component: () => import('./B.vue') },
  { path: '/c', component: () => import('./C.vue') }
]
```

适度的分组：

```javascript
const UserModule = () => import('./user-module.js')
routes: [
  { path: '/users', component: UserModule.UserList },
  { path: '/users/:id', component: UserModule.UserDetail }
]
```

没有一刀切的答案。考虑因素包括：

页面大小：大页面值得单独分割
访问模式：经常一起访问的页面可以合并
用户带宽：低带宽用户更需要精细分割
HTTP/2：多请求并行能力减轻了小文件的负担

一个合理的起点是：首屏必要的路由静态导入，其他路由懒加载，相关的管理页面可以分组。

## 路由元信息的使用边界

`meta` 是个万能容器，可以放任何东西。但放太多会让 `meta` 变成一个杂乱的配置堆。

适合放在 `meta` 中的：

路由的静态配置（权限要求、布局选择）
需要在守卫中检查的标志
页面级的元数据（标题、面包屑）

不适合放在 `meta` 中的：

动态数据（应该放在 store 或组件状态中）
复杂的业务逻辑（应该封装在函数中）
组件特定的配置（应该作为 props 传递）

保持 `meta` 简单，存储声明性的配置而非命令性的逻辑。

## 嵌套路由 vs 扁平路由

嵌套路由反映 UI 的层级结构：

```javascript
routes: [
  {
    path: '/user',
    component: UserLayout,
    children: [
      { path: 'profile', component: Profile },
      { path: 'settings', component: Settings }
    ]
  }
]
```

扁平路由更简单直接：

```javascript
routes: [
  { path: '/user/profile', component: Profile },
  { path: '/user/settings', component: Settings }
]
```

嵌套路由的好处是可以共享布局，URL 结构清晰，`meta` 可以继承。缺点是配置更复杂，组件树更深，理解执行流程需要更多心智负担。

选择原则：如果多个路由确实共享相同的布局组件，使用嵌套路由。如果只是 URL 有层级关系但 UI 独立，扁平路由更简单。

## 滚动行为的复杂度

简单的"始终滚动到顶部"很容易实现。但真实应用的需求更复杂：

后退时恢复位置
某些页面保持位置
有锚点时滚动到锚点
过渡动画时延迟滚动
多滚动区域

Vue Router 的 `scrollBehavior` 足够灵活以处理这些情况，但配置会越来越复杂。

权衡点在于：追求完美的滚动体验需要大量代码和边界情况处理。对于大多数应用，简单的"后退恢复，其他滚动顶部"就足够了：

```javascript
scrollBehavior(to, from, savedPosition) {
  return savedPosition || { top: 0 }
}
```

只有当用户反馈滚动体验有问题时，再逐步增加复杂度。

## 类型安全的代价

Vue Router 4 提供了较好的 TypeScript 支持，但完整的类型安全需要额外工作：

```typescript
// 基本使用 - 类型安全有限
router.push('/user/123')

// 更安全的方式
router.push({ name: 'user', params: { id: '123' } })

// 完全类型安全需要额外定义
declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
  }
}
```

权衡在于：完整的类型定义增加了前期工作量和维护成本，但减少了运行时错误。对于大型应用，这个投入是值得的。对于小型项目，可能过度设计。

## 本章小结

Vue Router 的设计体现了多处权衡：简单性与灵活性、静态与动态、集中与分散。没有完美的解决方案，只有针对特定场景的合理选择。

理解这些权衡能帮助我们：在项目初期做出合适的技术决策，在遇到边界情况时知道为什么某些事情比较困难，以及避免不必要的过度设计。

最重要的原则是：从简单开始，在真正需要时增加复杂度。大多数应用不需要用到 Vue Router 的所有功能。选择适合当前规模的方案，保持代码的可维护性。
