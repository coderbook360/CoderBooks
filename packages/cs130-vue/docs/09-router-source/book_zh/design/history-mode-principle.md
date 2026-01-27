# History 模式原理

History 模式是现代前端路由的主流选择。它使用 HTML5 History API 来操作浏览器历史记录，让 URL 看起来和传统的多页应用一样自然——没有 `#`，直接是 `/users/123` 这样的路径。但这种优雅的外表下，隐藏着需要理解的复杂性。

## HTML5 History API

HTML5 引入的 History API 为 JavaScript 提供了操作浏览器历史记录的能力。核心是两个方法和一个事件。

`pushState` 方法向历史栈中添加一个新条目：

```javascript
// 参数：状态对象、标题（被忽略）、URL
history.pushState({ page: 'about' }, '', '/about')
```

调用后，浏览器地址栏变成了 `/about`，但页面不会刷新，也不会向服务器发送请求。这正是我们需要的——改变 URL 而不触发页面加载。

状态对象可以存储任意可序列化的数据，最大限制通常是 640KB 左右。这个状态在用户前进后退时可以通过 `popstate` 事件获取。标题参数被大多数浏览器忽略，传空字符串即可。

`replaceState` 方法替换当前的历史条目，而不是添加新的：

```javascript
history.replaceState({ page: 'home' }, '', '/home')
```

这在需要修正 URL 但不希望用户后退到之前状态时很有用，比如重定向场景。

`popstate` 事件在用户点击前进或后退按钮时触发：

```javascript
window.addEventListener('popstate', (event) => {
  console.log('State:', event.state)
  console.log('Current path:', window.location.pathname)
})
```

注意一个重要的细节：`pushState` 和 `replaceState` 本身不会触发 `popstate` 事件。只有用户的导航动作（前进、后退）才会触发。这意味着在调用 `pushState` 后，你需要自己处理页面更新，而不能依赖事件。

## 实现一个基本的 History 路由器

基于这些 API，我们可以构建一个 History 模式的路由器：

```javascript
class HistoryRouter {
  constructor() {
    this.routes = {}
    this.currentPath = ''
    
    // 监听前进后退
    window.addEventListener('popstate', () => {
      this.handleRoute()
    })
    
    // 处理初始加载
    window.addEventListener('load', () => {
      this.handleRoute()
    })
  }
  
  register(path, callback) {
    this.routes[path] = callback
  }
  
  handleRoute() {
    const path = window.location.pathname
    this.currentPath = path
    
    const handler = this.routes[path]
    if (handler) {
      handler()
    }
  }
  
  push(path, state = {}) {
    history.pushState(state, '', path)
    this.handleRoute()  // 手动触发，因为 pushState 不触发 popstate
  }
  
  replace(path, state = {}) {
    history.replaceState(state, '', path)
    this.handleRoute()
  }
  
  go(delta) {
    history.go(delta)
    // popstate 事件会自动触发 handleRoute
  }
}
```

使用方式和 Hash 路由器类似，但 URL 更干净：

```javascript
const router = new HistoryRouter()

router.register('/', () => {
  document.body.innerHTML = '<h1>Home</h1>'
})

router.register('/about', () => {
  document.body.innerHTML = '<h1>About</h1>'
})

// 导航到 /about
router.push('/about')
// URL 变成 http://example.com/about
```

## 服务器配置的必要性

这里有一个 Hash 模式不存在的问题。当用户直接访问 `http://example.com/about`（比如通过书签、分享链接、或者刷新页面），浏览器会向服务器请求 `/about`。

在传统多页应用中，服务器会返回 about.html。但在 SPA 中，没有这个文件——所有内容都在 index.html 中由 JavaScript 生成。如果服务器按传统方式处理，就会返回 404 错误。

解决方案是配置服务器：对于所有的前端路由路径，都返回 index.html。这通常被称为"回退"（fallback）配置。

对于 Nginx：

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

这告诉 Nginx：先尝试找与请求路径匹配的文件，如果找不到，返回 index.html。

对于 Apache，使用 `.htaccess`：

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

对于 Node.js/Express：

```javascript
const express = require('express')
const path = require('path')
const app = express()

// 静态文件
app.use(express.static('public'))

// 所有其他请求都返回 index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})
```

对于开发服务器（Vite、webpack-dev-server），通常默认就支持这种配置。

## 状态对象的使用

History API 的状态对象是一个常被忽视的功能。它让你可以在历史记录中存储额外的数据：

```javascript
// 保存滚动位置
const state = {
  scrollTop: window.scrollY,
  data: { userId: 123 }
}
history.pushState(state, '', '/users/123')

// 用户后退时恢复
window.addEventListener('popstate', (event) => {
  if (event.state) {
    window.scrollTo(0, event.state.scrollTop)
    // 使用 event.state.data
  }
})
```

Vue Router 利用这个特性来实现滚动行为的保存和恢复。当用户导航离开一个页面，当前的滚动位置被保存在状态中。当用户后退时，滚动位置被恢复。

但状态对象有一些限制。它必须是可序列化的——不能包含函数、DOM 节点、Symbol 等。它有大小限制——不同浏览器限制不同，通常在 640KB 左右。过大的状态会导致异常。

## 与 Hash 模式的对比

History 模式相对于 Hash 模式有几个显著优势。

URL 更美观、更自然。`/users/123` 比 `/#/users/123` 更符合用户的预期，也更容易理解和分享。

与服务器端渲染更好地配合。当服务器收到请求时，可以根据完整的 URL 路径来决定预渲染什么内容。Hash 部分不会发送到服务器，这在 SSR 场景下是个问题。

状态对象提供了额外的数据存储能力，这在 Hash 模式下不可用。

但 History 模式也有劣势。

需要服务器配置，这增加了部署的复杂性。在某些受限的托管环境中，可能无法进行这种配置。

如果服务器配置不正确，用户直接访问非根路径会看到 404 错误，这是一个非常糟糕的用户体验。

对于纯静态部署（如 GitHub Pages），需要额外的技巧来实现，比如使用 404.html 页面做重定向。

## Vue Router 的实现

Vue Router 的 `createWebHistory` 封装了所有这些细节：

```typescript
function createWebHistory(base?: string): RouterHistory {
  const historyState = {
    // 当前状态
    current: buildState(null, getCurrentLocation(), null, true)
  }
  
  function getCurrentLocation(): string {
    const { pathname, search, hash } = window.location
    return pathname + search + hash
  }
  
  function push(to: string, data?: any) {
    const state = buildState(historyState.current, to, data)
    history.pushState(state, '', to)
    historyState.current = state
  }
  
  function replace(to: string, data?: any) {
    const state = buildState(null, to, data, true)
    history.replaceState(state, '', to)
    historyState.current = state
  }
  
  function setupListeners(callback: NavigationCallback) {
    window.addEventListener('popstate', ({ state }) => {
      historyState.current = state
      callback(getCurrentLocation(), state)
    })
  }
  
  return {
    location: getCurrentLocation(),
    state: historyState.current,
    push,
    replace,
    go: (delta) => history.go(delta),
    listen: setupListeners
  }
}
```

注意它维护了一个 `historyState` 对象来追踪当前状态。这是因为 `history.state` 在某些情况下可能不可靠（比如跨域 iframe），而且在 `pushState` 后立即读取可能得到旧值。

## 处理 Base 路径

当应用部署在子路径下时（比如 `example.com/app/`），需要处理 base 路径：

```javascript
const router = createRouter({
  history: createWebHistory('/app/'),
  routes: [...]
})
```

这影响几个方面。生成的链接会加上 base 前缀：`/home` 变成 `/app/home`。路由匹配会去掉 base 前缀：收到 `/app/home` 的请求，匹配的是 `/home` 路由。

实现上，这需要在读取和写入 URL 时都考虑 base：

```javascript
function createWebHistory(base = '/') {
  // 规范化 base
  base = base.replace(/\/$/, '')  // 去掉尾部斜杠
  
  function getCurrentLocation() {
    let path = window.location.pathname
    // 去掉 base 前缀
    if (path.startsWith(base)) {
      path = path.slice(base.length) || '/'
    }
    return path + window.location.search + window.location.hash
  }
  
  function push(to) {
    // 加上 base 前缀
    const url = base + to
    history.pushState(null, '', url)
  }
  
  // ...
}
```

## 本章小结

History 模式使用 HTML5 History API 来实现更自然的 URL。`pushState` 和 `replaceState` 改变 URL 而不刷新页面，`popstate` 事件响应用户的前进后退操作。

这种模式的主要复杂性在于服务器配置——必须让所有前端路由路径都返回同一个 index.html。配置正确的话，History 模式提供了比 Hash 模式更好的用户体验和更大的灵活性。

在实际项目中，如果你能控制服务器配置，History 模式通常是更好的选择。如果部署环境受限，Hash 模式是可靠的备选方案。Vue Router 对两种模式的统一抽象，让你可以在开发中使用 History 模式，在必要时切换到 Hash 模式，而不需要修改路由配置本身。
