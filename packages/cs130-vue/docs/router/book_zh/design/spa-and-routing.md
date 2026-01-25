# SPA 与路由的关系

单页应用（Single Page Application，SPA）这个术语听起来像是一种限制——只有一个页面。但实际上，它描述的是一种完全不同的应用架构：只加载一次 HTML 页面，之后的所有"页面切换"都通过 JavaScript 动态渲染完成。

在这种架构下，路由不再是服务器的职责，而是前端 JavaScript 需要解决的核心问题。理解 SPA 的运作方式，是理解 Vue Router 设计的基础。

## 传统多页应用的工作方式

在传统的多页应用中，每个 URL 对应一个独立的 HTML 文件。用户从 `/home` 导航到 `/about`，浏览器向服务器请求 about.html（或由服务器动态生成的 HTML），然后完全替换当前页面。

这种模式下，路由是隐式的——URL 结构与文件结构（或服务器路由配置）直接对应。前端不需要关心路由，浏览器和服务器自然完成了这项工作。

但这种模式有一个根本性的问题：每次页面切换都是一次完整的页面加载。JavaScript 运行时被销毁重建，所有状态丢失，用户需要等待新页面的资源加载和渲染。对于需要保持复杂状态的应用，这种体验是不可接受的。

## SPA 的核心理念

SPA 的核心理念是：加载一次，运行永久（或直到用户关闭标签页）。整个应用只有一个 HTML 入口点，通常是一个几乎空白的 HTML 文件：

```html
<!DOCTYPE html>
<html>
<head>
  <title>My App</title>
</head>
<body>
  <div id="app"></div>
  <script src="/app.js"></script>
</body>
</html>
```

JavaScript 负责构建整个 UI。当用户"导航"到不同的"页面"时，实际发生的是：JavaScript 卸载当前的 UI 组件，挂载新的 UI 组件。浏览器没有发起新的页面请求，没有完整的页面刷新，JavaScript 运行时保持存在，应用状态可以持续维护。

这种架构带来了几个显著的优势。页面切换变得即时——不需要等待网络请求和页面渲染。应用可以在页面之间共享状态——用户填写了一半的表单不会因为导航而丢失。复杂的交互和动画变得可能——因为你完全控制了 UI 的渲染过程。

## 路由在 SPA 中的角色

但 SPA 带来了一个新问题：URL 与应用状态脱节了。在传统应用中，URL 天然反映了用户看到的内容。在 SPA 中，如果不做额外处理，无论用户在应用的哪个"页面"，URL 都是同一个 `/`。

这导致了几个问题。用户不能通过 URL 分享应用的特定状态。刷新页面会回到初始状态。浏览器的前进后退按钮失效。搜索引擎无法索引应用的不同"页面"。

前端路由就是为了解决这些问题而存在的。它的核心职责是在 SPA 架构中重建 URL 与应用状态的对应关系。

具体来说，前端路由需要做三件事。第一，监听 URL 变化。当用户点击浏览器的前进后退按钮，或者程序调用导航方法时，路由需要知道 URL 变了。第二，URL 解析与匹配。根据当前 URL 确定应该渲染哪个组件。第三，更新 URL。当应用需要"导航"到新页面时，更新 URL 而不触发页面刷新。

## Vue Router 如何实现这三件事

Vue Router 使用 History API（或 Hash）来实现 URL 的监听和更新。它维护一个路由表，定义 URL 模式与组件的对应关系：

```javascript
const routes = [
  { path: '/', component: Home },
  { path: '/about', component: About },
  { path: '/users/:id', component: UserDetail }
]
```

当 URL 变化时，Vue Router 遍历这个路由表，找到匹配的路由，提取参数，然后通知 Vue 渲染对应的组件。当应用需要导航时，Vue Router 更新 URL（通过 pushState 或 hash），然后触发同样的匹配和渲染流程。

## 组件树与路由的关系

在 Vue 应用中，路由决定了组件树的结构。RouterView 是一个占位组件，它在运行时被替换为当前路由匹配的组件：

```vue
<template>
  <header>
    <nav>
      <RouterLink to="/">Home</RouterLink>
      <RouterLink to="/about">About</RouterLink>
    </nav>
  </header>
  
  <main>
    <RouterView />  <!-- 这里渲染路由组件 -->
  </main>
  
  <footer>...</footer>
</template>
```

Header 和 Footer 是布局组件，始终存在。RouterView 的内容根据当前路由变化。这种结构让路由成为应用架构的核心——它决定了用户在任何时刻看到什么。

嵌套路由进一步扩展了这个概念。一个页面可以包含多个 RouterView，每个 RouterView 对应路由配置中的一层：

```javascript
const routes = [
  {
    path: '/users',
    component: UsersLayout,
    children: [
      { path: '', component: UserList },
      { path: ':id', component: UserDetail }
    ]
  }
]
```

访问 `/users` 时，UsersLayout 渲染在最外层 RouterView，UserList 渲染在 UsersLayout 内的 RouterView。访问 `/users/123` 时，UserDetail 替换 UserList。这种嵌套结构让复杂的页面布局变得可管理。

## 路由与状态管理

路由本身也是一种状态管理。当前路由（路径、参数、查询字符串）是应用状态的一部分，而且是一种特殊的状态——它同步反映在 URL 中，可以被书签、分享、刷新后恢复。

这就引出了一个设计决策：什么状态应该放在路由中，什么状态应该放在 Pinia 或组件本地状态中？

一个有用的原则是：如果这个状态应该在刷新后恢复，或者应该能被分享，那它应该反映在 URL 中。分页的当前页码、搜索的关键词、列表的筛选条件——这些都适合作为查询参数。用户 ID、文章 slug——这些适合作为路径参数。

而临时的 UI 状态——比如一个下拉菜单是否展开、一个模态框是否显示——通常不需要反映在 URL 中。当然，这不是绝对的规则。如果你的应用需要"分享一个带有打开的模态框的页面"，那模态框的状态也可以放在 URL 中。

## 导航的生命周期

在 SPA 中，"导航"是一个复杂的过程，不仅仅是 URL 的改变。Vue Router 提供了一系列钩子让你介入这个过程：

```javascript
router.beforeEach((to, from) => {
  // 导航开始前
  // 可以返回 false 取消导航
  // 可以返回一个路由地址来重定向
})

router.afterEach((to, from) => {
  // 导航完成后
  // 无法影响导航本身，但可以做一些后续操作
})
```

这些钩子让你可以实现认证守卫（用户必须登录才能访问某些页面）、权限检查（用户是否有权限访问）、数据预获取（在进入页面前加载必要数据）、页面追踪（发送分析事件）等功能。

组件级别的守卫进一步细化了这个控制：

```javascript
export default {
  beforeRouteEnter(to, from, next) {
    // 在渲染该组件的路由被确认前调用
    // 不能访问 this，因为组件实例还没创建
  },
  beforeRouteUpdate(to, from) {
    // 当路由改变，但该组件被复用时调用
    // 比如 /users/1 -> /users/2
  },
  beforeRouteLeave(to, from) {
    // 在离开该组件的路由时调用
    // 可以用来提示用户保存未完成的工作
  }
}
```

## 本章小结

SPA 架构将路由从服务器移到了前端，让 JavaScript 成为了页面内容的唯一决定者。这带来了更流畅的用户体验，但也带来了新的挑战——前端需要自己管理 URL 与应用状态的对应关系。

Vue Router 提供了一整套解决方案：History/Hash 模式处理 URL 的监听和更新，路由匹配器处理 URL 到组件的映射，RouterView 和 RouterLink 提供声明式的 UI 集成，导航守卫提供流程控制的能力。

在接下来的章节中，我们将深入探讨这些组件的具体工作原理，从 Hash 模式和 History 模式的底层机制开始。
