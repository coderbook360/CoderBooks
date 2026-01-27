# History 模式 vs Hash 模式

Vue Router 支持两种 URL 模式：History 模式和 Hash 模式。这两种模式的选择影响 URL 的外观、服务器配置需求，以及某些边缘情况的行为。

## URL 外观差异

最直观的区别是 URL 的外观。

History 模式产生"干净"的 URL：

```
https://example.com/user/123
https://example.com/about
```

Hash 模式在路径前添加 `#`：

```
https://example.com/#/user/123
https://example.com/#/about
```

从用户体验角度，History 模式的 URL 更简洁、更符合传统网站的风格。Hash 模式的 `#` 看起来像是技术实现的妥协。

## 技术原理

History 模式使用 HTML5 History API。`pushState` 和 `replaceState` 方法可以修改浏览器地址栏的 URL，而不触发页面刷新。

```javascript
// History API 示例
history.pushState({ page: 1 }, '', '/user/123')
// URL 变为 /user/123，但页面不刷新
```

浏览器的前进后退按钮触发 `popstate` 事件，路由库监听这个事件来响应导航。

Hash 模式利用 URL 的 hash 部分（`#` 后面的内容）。修改 hash 不会触发页面刷新，这是浏览器的原生行为。

```javascript
// 修改 hash
location.hash = '/user/123'
// URL 变为 .../#/user/123，页面不刷新
```

hash 变化触发 `hashchange` 事件，路由库监听这个事件来响应导航。

## 服务器配置

两种模式对服务器的要求不同，这是选择时的重要考量。

Hash 模式不需要特殊的服务器配置。因为 hash 部分不会发送到服务器，服务器总是收到相同的请求路径。

```
请求: https://example.com/#/user/123
服务器收到: https://example.com/
```

所以只需要配置服务器返回 `index.html`，前端路由就能正常工作。

History 模式需要服务器配置 fallback。当用户直接访问 `/user/123` 或刷新页面时，服务器需要返回 `index.html` 而不是 404。

```nginx
# Nginx 配置示例
location / {
  try_files $uri $uri/ /index.html;
}
```

如果没有正确配置，用户刷新页面或直接访问深层链接时会看到 404 错误。

## 兼容性

从浏览器兼容性角度，两种模式在现代浏览器中都能正常工作。History API 在 IE10+ 以及所有现代浏览器中都有支持。

但在某些受限环境中，Hash 模式可能是唯一选择。比如：

静态文件托管服务（如 GitHub Pages）可能不支持 URL rewrite 配置。

某些企业内网环境可能有代理或防火墙限制 URL 的处理方式。

Electron 或 Cordova 等混合应用框架中，file:// 协议下 History 模式可能有问题。

## SEO 影响

搜索引擎对两种模式的处理有区别。

现代搜索引擎能够正常处理 History 模式的 URL。Google 的爬虫可以执行 JavaScript，解析 SPA 的内容。

Hash 模式在历史上对 SEO 不友好。早期的爬虫会忽略 hash 后面的内容，将所有页面视为同一个 URL。虽然现在的搜索引擎已经改进，但 History 模式仍然是 SEO 场景的更安全选择。

对于需要 SEO 的应用，最佳方案是使用 SSR（服务端渲染）配合 History 模式。

## 锚点冲突

Hash 模式有一个技术限制：它占用了 hash，导致页面内锚点功能受影响。

传统的锚点链接使用 hash 跳转到页面内的特定位置：

```html
<a href="#section-2">跳转到第二节</a>
<h2 id="section-2">第二节</h2>
```

在 Hash 模式下，这个功能和路由功能冲突。`#/user/123#section-2` 这样的 URL 解析会变得复杂。

Vue Router 提供了一些解决方案，比如 scrollBehavior 配合 hash 参数。但这终究是一个额外的复杂度。

History 模式没有这个问题，hash 可以正常用于页面内导航。

## 代码切换

Vue Router 让两种模式的切换变得简单。只需要修改创建路由器时的 history 选项：

```javascript
import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router'

// History 模式
const router = createRouter({
  history: createWebHistory(),
  routes
})

// Hash 模式
const router = createRouter({
  history: createWebHashHistory(),
  routes
})
```

上层的路由配置和组件代码完全不需要修改。这种抽象设计让模式切换只是一个配置问题。

## 选型建议

对于大多数新项目，推荐使用 History 模式。它提供更干净的 URL，对 SEO 更友好，也不会影响锚点功能。

但需要确保服务器配置正确。在部署前测试直接访问和刷新深层链接的行为。

如果项目部署在无法配置服务器的环境（如静态托管），或者是内部工具不关心 URL 美观性，Hash 模式是更简单的选择。它不需要任何服务器配置，开箱即用。

对于需要 SEO 的公开网站，考虑使用 Nuxt.js 等 SSR 框架。它们在服务端渲染页面内容，同时使用 History 模式提供良好的 URL。

无论选择哪种模式，确保团队理解其工作原理。这样在遇到问题时能够快速定位原因。
