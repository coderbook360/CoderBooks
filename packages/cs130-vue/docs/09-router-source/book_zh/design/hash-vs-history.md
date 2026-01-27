# Hash vs History 对比

我们已经分别了解了 Hash 模式和 History 模式的工作原理。现在把它们放在一起对比，帮助你在实际项目中做出正确的选择。

## 技术实现对比

两种模式在技术层面有本质的区别。

Hash 模式利用的是 URL 的片段标识符（fragment identifier）。这个部分原本设计用于页面内定位，它的特殊之处在于：修改 hash 不会触发页面刷新，也不会向服务器发送请求。监听 `hashchange` 事件可以知道 hash 何时变化。

History 模式使用的是 HTML5 History API。`pushState` 和 `replaceState` 可以修改 URL 的任何部分（路径、查询参数），同样不会触发页面刷新。但与 hash 不同，这些 URL 变化会影响服务器请求——如果用户刷新页面或直接访问这个 URL，浏览器会向服务器请求这个完整路径。

这个区别导致了两种模式在部署要求上的根本差异。

## URL 形式对比

这是用户最直接感知到的差异：

```
Hash 模式:
https://example.com/#/users/123
https://example.com/#/about
https://example.com/#/posts?page=2

History 模式:
https://example.com/users/123
https://example.com/about
https://example.com/posts?page=2
```

History 模式的 URL 更简洁、更自然，与传统的多页应用 URL 结构一致。Hash 模式的 `#` 对于技术用户来说可以理解，但对普通用户可能造成困惑。

在分享链接时，History 模式的 URL 看起来更专业。在某些场景下（比如需要复制粘贴 URL 的工作流程），没有 `#` 的 URL 更不容易出错。

## 服务器配置要求

这是两种模式最大的差异点。

Hash 模式完全不需要服务器配置。因为 `#` 后面的部分不会发送到服务器，无论用户访问 `/#/users/123` 还是 `/#/about`，服务器收到的请求都是根路径 `/`，返回的都是同一个 index.html。前端 JavaScript 读取 hash，决定渲染什么内容。

History 模式需要服务器配置回退规则。当用户直接访问 `/users/123` 时，服务器需要返回 index.html 而不是尝试寻找 `/users/123` 对应的文件。如果服务器配置不正确，用户会看到 404 错误。

对于不同的服务器，配置方式如下：

```nginx
# Nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

```javascript
// Express
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'))
})
```

```apache
# Apache (.htaccess)
RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

如果你使用的是受限的托管服务（某些静态站点托管），可能无法进行这种配置，这时 Hash 模式可能是唯一选择。

## SEO 考虑

这是一个经常被讨论但常常被误解的话题。

过去，搜索引擎爬虫不会执行 JavaScript，也不会读取 hash 后面的内容。这意味着 Hash 模式的 SPA 基本无法被索引。

现在情况已经改变。Google 的爬虫（Googlebot）可以执行 JavaScript，可以索引 SPA 的内容，包括 Hash 模式的应用。但是：

1. 其他搜索引擎（Bing、百度等）的 JavaScript 执行能力参差不齐
2. JavaScript 渲染会增加爬取成本，可能影响索引效率
3. 社交媒体的链接预览通常不执行 JavaScript

如果 SEO 对你的应用很重要，最佳方案是服务器端渲染（SSR）或静态站点生成（SSG），而不是纠结于 Hash 还是 History 模式。

如果你使用客户端渲染，History 模式确实在 SEO 方面略有优势——至少 URL 看起来更"标准"，某些 SEO 工具对它的支持更好。但这个优势相对于 SSR/SSG 来说是微不足道的。

## 兼容性

Hash 模式有更好的浏览器兼容性。`hashchange` 事件在非常老的浏览器中就已支持。

History 模式依赖 HTML5 History API，在 IE10+ 及所有现代浏览器中支持。考虑到 IE 已经不再被微软支持，这在实践中通常不是问题。

如果你需要支持非常老的浏览器（虽然这种情况越来越少），Hash 模式更安全。

## 特殊使用场景

### 子路径部署

当应用部署在子路径下时（比如 `https://example.com/app/`），两种模式都需要配置 base：

```javascript
// Hash 模式
createWebHashHistory('/app/')
// URL: https://example.com/app/#/users

// History 模式
createWebHistory('/app/')
// URL: https://example.com/app/users
```

History 模式还需要调整服务器配置，让 `/app/*` 的请求都返回 `/app/index.html`。

### 与锚点的共存

Hash 模式占用了 URL 的 hash 部分，这与页面内锚点定位产生冲突。如果你的应用需要使用锚点（比如文档网站的章节跳转），需要用其他方式实现，比如 `scrollIntoView` API。

History 模式没有这个问题，hash 仍然可以用于其原本的用途。

### Electron 应用

在 Electron 应用中，通常使用 Hash 模式，因为 Electron 的本地文件协议（`file://`）与 History API 配合不好。

### 微前端

在微前端架构中，每个子应用的路由需要考虑与主应用的协调。Hash 模式可能更容易隔离（每个子应用使用不同的 hash 前缀），但这也让 URL 变得更加复杂。History 模式需要更仔细的路径规划。

## 决策指南

以下是一个实用的决策流程：

**优先选择 History 模式**，如果：
- 你可以控制服务器配置
- 你的应用是正式产品（不只是原型或内部工具）
- 你关心 URL 的美观度
- 你需要使用页面内锚点

**选择 Hash 模式**，如果：
- 你部署在静态托管服务上，无法配置服务器
- 你在开发快速原型，不想处理配置
- 你需要支持非常老的浏览器
- 你在开发 Electron 应用

**无论选择哪种**：
- 如果 SEO 很重要，考虑 SSR 或 SSG
- 确保在开发和生产环境使用相同的模式
- 在切换模式时，检查所有的硬编码 URL

## 运行时切换

Vue Router 的设计允许你通过简单的配置更改来切换模式：

```javascript
const router = createRouter({
  // 只需改这一行
  history: import.meta.env.PROD 
    ? createWebHistory() 
    : createWebHashHistory(),
  routes
})
```

路由配置本身不需要任何改变。这种解耦的设计让模式切换变得很简单。

## 本章小结

Hash 模式和 History 模式各有优劣。Hash 模式简单、无需配置、兼容性好，但 URL 不够美观。History 模式 URL 自然，但需要服务器配置。

在大多数现代项目中，History 模式是更好的选择。但如果部署环境受限，Hash 模式仍然是可靠的备选方案。

Vue Router 对这两种模式的抽象，让路由的核心逻辑不需要关心底层使用的是哪种模式。无论你选择哪种，应用的其他部分——路由配置、组件、守卫——都保持不变。这种设计给了开发者最大的灵活性。
