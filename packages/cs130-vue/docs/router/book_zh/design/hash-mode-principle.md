# Hash 模式原理

Hash 模式是前端路由最早的实现方案，也是最简单、兼容性最好的方案。它利用 URL 中 `#` 后面的部分来表示路由状态，巧妙地避开了浏览器的默认行为。要真正理解 Vue Router 的 Hash 模式，我们需要先理解 URL hash 的原始用途和特殊性质。

## URL Hash 的本质

在 Web 的早期，`#` 被设计用来在页面内定位。访问 `page.html#section2` 时，浏览器会加载 page.html，然后滚动到 id 为 section2 的元素。这被称为"片段标识符"（fragment identifier）。

这个设计带来了几个重要的特性，正是这些特性让 hash 可以被用于路由。

第一，hash 变化不会触发页面刷新。从 `page.html#a` 变成 `page.html#b`，浏览器不会向服务器发送新请求，只是尝试滚动到新的锚点。这意味着 JavaScript 运行时不会中断，应用状态得以保持。

第二，hash 变化会被记录在历史记录中。每次 hash 改变，浏览器都会在历史栈中添加一个新条目。用户可以使用前进后退按钮在这些条目之间导航。

第三，hash 不会被发送到服务器。当浏览器请求 `example.com/page.html#section2` 时，服务器只会收到对 `/page.html` 的请求，`#section2` 部分完全在客户端处理。这意味着 hash 路由不需要任何服务器端配置。

## hashchange 事件

浏览器提供了 `hashchange` 事件来通知 JavaScript hash 的变化：

```javascript
window.addEventListener('hashchange', (event) => {
  console.log('Old URL:', event.oldURL)
  console.log('New URL:', event.newURL)
  console.log('Current hash:', window.location.hash)
})
```

这个事件在以下情况触发：用户点击页面内的锚点链接、JavaScript 修改 `window.location.hash`、用户使用前进后退按钮。

但要注意，直接设置 `window.location.href` 为一个带有不同 hash 的完整 URL 也会触发 hashchange。而如果用户手动在地址栏修改 hash 然后按回车，页面会刷新，但刷新完成后的页面会有正确的 hash 值。

## 实现一个基本的 Hash 路由器

理解了这些原理，我们可以构建一个最简单的 hash 路由器：

```javascript
class HashRouter {
  constructor() {
    this.routes = {}
    this.currentPath = ''
    
    // 监听 hash 变化
    window.addEventListener('hashchange', () => {
      this.handleRoute()
    })
    
    // 处理初始加载
    window.addEventListener('load', () => {
      this.handleRoute()
    })
  }
  
  // 注册路由
  register(path, callback) {
    this.routes[path] = callback
  }
  
  // 处理当前路由
  handleRoute() {
    // 获取 hash，去掉开头的 #
    const hash = window.location.hash.slice(1) || '/'
    this.currentPath = hash
    
    // 调用对应的回调
    const handler = this.routes[hash]
    if (handler) {
      handler()
    } else {
      console.log('No route found for:', hash)
    }
  }
  
  // 编程式导航
  push(path) {
    window.location.hash = path
    // hashchange 事件会自动触发 handleRoute
  }
}
```

使用这个路由器很直观：

```javascript
const router = new HashRouter()

router.register('/', () => {
  document.body.innerHTML = '<h1>Home Page</h1>'
})

router.register('/about', () => {
  document.body.innerHTML = '<h1>About Page</h1>'
})

router.register('/contact', () => {
  document.body.innerHTML = '<h1>Contact Page</h1>'
})
```

现在访问 `index.html#/about`，页面会显示 About Page。点击浏览器的后退按钮，URL 变回之前的 hash，页面内容也随之变化。

## 路径参数的处理

上面的实现只支持精确匹配。实际的路由器需要支持动态路径，比如 `/users/:id`。这需要将路径模式转换为正则表达式：

```javascript
function pathToRegex(path) {
  // /users/:id -> /users/([^/]+)
  const pattern = path
    .replace(/:[^/]+/g, '([^/]+)')  // :param -> 捕获组
    .replace(/\//g, '\\/')          // / -> \/
  
  return new RegExp(`^${pattern}$`)
}

function extractParams(path, pattern) {
  // 提取参数名
  const paramNames = (path.match(/:[^/]+/g) || [])
    .map(p => p.slice(1))  // 去掉 :
  
  // 提取参数值
  const regex = pathToRegex(path)
  const match = pattern.match(regex)
  
  if (!match) return null
  
  const params = {}
  paramNames.forEach((name, index) => {
    params[name] = match[index + 1]
  })
  
  return params
}
```

这样 `/users/:id` 可以匹配 `/users/123`，并提取出 `{ id: '123' }`。

## Vue Router 的 Hash 实现

Vue Router 的 Hash 模式实现更加完善，但核心思路是一样的。它封装在 `createWebHashHistory` 函数中，返回一个符合 history 接口的对象：

```typescript
function createWebHashHistory(base?: string): RouterHistory {
  // 获取当前位置
  function getCurrentLocation(): string {
    const hash = window.location.hash.slice(1)
    return hash || '/'
  }
  
  // 监听变化
  function setupListeners(callback: NavigationCallback) {
    window.addEventListener('hashchange', () => {
      callback(getCurrentLocation())
    })
  }
  
  // 导航方法
  function push(to: string, state?: any) {
    window.location.hash = to
  }
  
  function replace(to: string, state?: any) {
    // 使用 replaceState 来替换而不是添加历史条目
    const url = `${window.location.pathname}${window.location.search}#${to}`
    window.history.replaceState(state, '', url)
  }
  
  return {
    location: getCurrentLocation(),
    push,
    replace,
    go: (delta: number) => window.history.go(delta),
    listen: setupListeners
  }
}
```

这里有一个有趣的细节：`replace` 方法使用了 `history.replaceState`。虽然我们是 Hash 模式，但可以借用 History API 来实现"替换"而不是"添加"历史记录的功能。直接设置 `window.location.hash` 总是会添加新的历史条目，而 `replaceState` 可以在不添加条目的情况下修改 URL。

## Base 的处理

在某些部署场景下，应用可能不是部署在域名根路径。比如 `example.com/app/#/home`。Vue Router 的 Hash 模式支持 base 参数来处理这种情况：

```javascript
const router = createRouter({
  history: createWebHashHistory('/app/'),
  routes: [...]
})
```

base 参数影响的是链接的生成。当你使用 `<RouterLink to="/home">` 时，生成的实际链接是 `/app/#/home`。但路由匹配本身仍然是对 hash 部分进行的。

## Hash 模式的局限性

Hash 模式虽然简单可靠，但有一些固有的局限。

首先是 URL 美观度。`example.com/#/users/123` 不如 `example.com/users/123` 自然。对于某些用户来说，`#` 可能造成困惑。

其次是 SEO 考虑。虽然现代搜索引擎已经能够执行 JavaScript 并索引 SPA 内容，但 hash 部分不会被发送到服务器，这可能影响某些服务器端渲染或预渲染的场景。

第三是与原本的锚点功能冲突。如果你的应用需要使用页面内锚点定位（比如跳转到文档的某个章节），hash 路由可能会造成冲突。当然，可以通过一些技巧来处理这个问题，比如使用 `scrollIntoView` API 来实现锚点功能。

## 何时选择 Hash 模式

尽管有这些局限，Hash 模式在很多场景下仍然是最佳选择。

如果你的应用部署在静态文件服务器上，没有能力进行服务器端配置（比如 GitHub Pages），Hash 模式是唯一可行的选择。

如果你需要支持一些老旧的浏览器环境（虽然现在这种情况越来越少），Hash 模式有更好的兼容性。

如果你只是快速原型开发，不想处理服务器配置的复杂性，Hash 模式可以让你立即开始工作。

在下一章中，我们将探讨 History 模式，了解它如何利用 HTML5 History API 实现更优雅的 URL，以及它需要怎样的服务器端配合。

## 本章小结

Hash 模式利用了 URL hash 的三个关键特性：变化不触发页面刷新、变化被记录在历史栈中、hash 不会发送到服务器。通过监听 hashchange 事件，JavaScript 可以在 hash 变化时更新页面内容，实现前端路由。

这种方案的优势是简单、无需服务器配置、兼容性好。劣势是 URL 不够美观，与原本的锚点功能有语义冲突。Vue Router 将 Hash 模式封装为一个符合统一接口的 history 对象，让路由核心逻辑不需要关心底层使用的是哪种模式。
