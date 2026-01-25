# 前端路由发展历程

在 SPA（单页应用）出现之前，网页之间的跳转完全依赖服务器端：用户点击链接，浏览器向服务器发送请求，服务器返回一个完整的 HTML 页面，浏览器重新渲染整个页面。这种模式简单直接，但每次页面跳转都意味着完整的请求-响应循环，用户体验上会有明显的"白屏"等待时间。

前端路由的出现改变了这一切。它让浏览器在不向服务器请求新页面的情况下，根据 URL 的变化动态更新页面内容。理解前端路由的发展历程，有助于我们理解 Vue Router 的设计选择。

## 多页应用时代：服务器主导一切

在 Web 1.0 时代，每个 URL 对应服务器上的一个物理文件或动态生成的页面。用户访问 `/about`，服务器就返回 about.html 或者通过模板引擎渲染的 about 页面。这种架构的优势是直观——URL 与内容是一一对应的，SEO 友好，浏览器的前进后退按钮天然支持。

但问题也很明显。每次导航都是完整的页面刷新，JavaScript 和 CSS 需要重新加载和解析，页面状态全部丢失。对于内容密集、交互频繁的应用，这种体验越来越难以接受。

## Ajax 时代：局部更新的曙光

2005年前后，XMLHttpRequest（后来被称为 Ajax）开始流行。页面不再需要完全刷新就能获取新数据，Gmail 和 Google Maps 等应用展示了前端能做到什么程度的交互体验。

但 Ajax 带来了一个新问题：页面内容变了，URL 没变。用户刷新页面，回到初始状态；用户分享链接，别人看到的是不同的内容；浏览器的前进后退按钮失效了。URL 与应用状态脱节，这在用户体验上是严重的倒退。

## Hash 路由的诞生

开发者们开始寻找方法让 URL 反映应用状态，同时不触发页面刷新。他们注意到了 URL 中的 hash（#）部分。

hash 原本是用于页面内锚点定位的。访问 `page.html#section2` 时，浏览器会跳转到 id 为 section2 的元素。关键在于：改变 hash 不会触发页面刷新，也不会向服务器发送请求，但会被记录在浏览器历史中。

于是 hash 路由应运而生：

```javascript
// 监听 hash 变化
window.addEventListener('hashchange', () => {
  const route = window.location.hash.slice(1)  // 去掉 #
  // 根据 route 渲染对应内容
})

// 导航
function navigate(path) {
  window.location.hash = path
}
```

这种方案巧妙地利用了浏览器的原生行为。URL 从 `app.html#/home` 变成 `app.html#/about`，浏览器不会刷新页面，但会触发 hashchange 事件，JavaScript 可以据此更新页面内容。前进后退按钮也能正常工作，因为 hash 变化会被记录在历史栈中。

hash 路由成为了早期 SPA 的标准方案。Backbone.js、AngularJS 1.x 等框架都默认使用这种模式。

## HTML5 History API：更优雅的方案

hash 路由虽然解决了问题，但 URL 中的 `#` 总显得有些别扭。`example.com/#/users/123` 不如 `example.com/users/123` 来得自然。而且 hash 在语义上是页面内定位，用它来表示路由状态算是一种"hack"。

2010年，HTML5 引入了 History API，提供了 `pushState` 和 `replaceState` 方法，以及 `popstate` 事件。这让前端获得了直接操作浏览器历史记录的能力：

```javascript
// 添加历史记录
history.pushState({ page: 'about' }, '', '/about')

// 替换当前记录
history.replaceState({ page: 'home' }, '', '/home')

// 监听前进后退
window.addEventListener('popstate', (event) => {
  // event.state 是之前传入的状态对象
  renderPage(event.state)
})
```

pushState 可以改变 URL 而不触发页面刷新，也不会向服务器发送请求。关键区别是：它可以改变 URL 的任何部分（路径、查询参数），而不仅仅是 hash。

但 History 模式需要服务器配合。当用户直接访问 `example.com/users/123` 或刷新这个页面时，浏览器会向服务器请求这个 URL。服务器需要配置成：对于所有前端路由路径，都返回同一个 index.html，然后由前端 JavaScript 接管路由。

这就是为什么 Vue Router 的 History 模式需要服务器配置，而 Hash 模式不需要——hash 部分根本不会发送到服务器。

## 两种模式的权衡

Hash 模式和 History 模式各有优缺点，选择取决于项目需求。

Hash 模式的优势在于简单和兼容性。它不需要服务器配置，在任何静态文件服务器上都能工作。部署到 GitHub Pages、Netlify 等平台时，不需要额外设置。它的兼容性也更好，可以支持一些不支持 History API 的老旧浏览器。

Hash 模式的劣势主要是美观度——URL 中的 `#` 不够优雅，对某些用户来说可能造成困惑。另外，hash 不会被发送到服务器，这在某些需要服务器端分析 URL 的场景下可能是问题。

History 模式的 URL 更自然，与传统的多页应用 URL 结构一致。这对 SEO 可能有一定帮助（尽管现代搜索引擎已经能很好地处理 Hash URL）。它也更符合 Web 标准的语义。

History 模式需要服务器配置是它的主要复杂性来源。如果配置不当，用户直接访问非根路径时会看到 404 错误。在某些托管环境中，这个配置可能不那么直观。

## Memory 模式：为非浏览器环境而生

除了 Hash 和 History，还有一种 Memory 模式。它不依赖浏览器的 URL 或历史记录 API，而是在内存中维护一个历史栈。

这种模式主要用于两个场景：服务器端渲染（SSR）和 Node.js 环境。在 SSR 时，代码在 Node.js 中运行，没有 `window.location` 或 `history` 对象。Memory 模式提供了一个与浏览器行为一致的 API，让路由代码可以在服务端正常工作。

在测试环境中，Memory 模式也很有用。它让路由测试不需要依赖真实的浏览器环境。

## Vue Router 的选择

Vue Router 同时支持这三种模式，让开发者可以根据项目需求选择：

```javascript
import { createRouter, createWebHistory, createWebHashHistory, createMemoryHistory } from 'vue-router'

// History 模式
const router = createRouter({
  history: createWebHistory(),
  routes: [...]
})

// Hash 模式
const router = createRouter({
  history: createWebHashHistory(),
  routes: [...]
})

// Memory 模式（SSR 或测试）
const router = createRouter({
  history: createMemoryHistory(),
  routes: [...]
})
```

这种设计将路由逻辑与 history 实现分离，是一个典型的策略模式应用。路由的核心功能——匹配、导航、守卫——不需要关心底层使用的是哪种 history 模式。这让代码更容易测试，也让不同模式之间的切换变得简单。

## 本章小结

前端路由的发展是对用户体验追求的结果。从服务器主导的多页应用，到 Ajax 带来的局部更新，再到 Hash 路由和 History API，每一步都在尝试在 Web 平台的限制中找到更好的解决方案。

理解这段历史，有助于理解为什么 Vue Router 要同时支持多种模式，也有助于在实际项目中做出正确的选择。在下一章中，我们将深入探讨 SPA 与路由的关系，理解前端路由在单页应用架构中扮演的角色。
