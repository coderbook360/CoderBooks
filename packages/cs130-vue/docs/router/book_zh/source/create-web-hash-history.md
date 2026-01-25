# createWebHashHistory 实现

`createWebHashHistory` 创建基于 URL hash 的路由历史管理器。它产生的 URL 形如 `http://example.com/#/users/123`。这种模式不需要服务器配置，兼容性最好。

## 与 createWebHistory 的关系

有趣的是，`createWebHashHistory` 在内部复用了 `createWebHistory` 的实现：

```typescript
export function createWebHashHistory(base?: string): RouterHistory {
  // 将 base 转换为 hash 形式
  base = location.host ? base || location.pathname + location.search : ''
  
  // 确保以 # 开头
  if (!base.includes('#')) base += '#'

  // 复用 createWebHistory
  return createWebHistory(base)
}
```

关键洞察：hash 模式本质上就是把所有路径放到 `#` 后面。通过设置 base 为 `#`，`createWebHistory` 的逻辑可以直接复用。

## base 处理

```typescript
base = location.host ? base || location.pathname + location.search : ''
```

这行代码处理了几种情况：

1. **在浏览器中**（`location.host` 存在）：如果没有指定 base，使用当前页面的路径和查询字符串
2. **在 SSR 中**：使用空字符串

```typescript
if (!base.includes('#')) base += '#'
```

确保 base 包含 `#`。如果调用者传入的 base 不含 `#`，自动添加。

实际效果：

```typescript
// 不指定 base
createWebHashHistory()
// base = '#'（假设当前页面是 http://example.com/）

// 指定 base
createWebHashHistory('/app/')
// base = '/app/#'

// 带查询字符串的页面
// 假设当前 URL 是 http://example.com/index.html?v=1
createWebHashHistory()
// base = '/index.html?v=1#'
```

## 为什么可以复用 createWebHistory

理解这一点需要回顾 `createWebHistory` 的实现：

```typescript
// createWebHistory 中的 changeLocation
function changeLocation(to, state, replace) {
  const url = createBaseLocation() + 
    (base.startsWith('#') ? '' : base) + 
    to
  // ...
}
```

当 base 以 `#` 开头时，URL 的构建会跳过额外的 base 前缀处理。

```typescript
// createWebHistory 中的 createCurrentLocation
function createCurrentLocation(base: string, location: Location): HistoryLocation {
  const { pathname, search, hash } = location
  
  // 如果 base 包含 #，从 hash 提取路径
  const hashPos = base.indexOf('#')
  if (hashPos > -1) {
    let pathFromHash = hash.includes(base.slice(hashPos))
      ? hash.slice(base.length - hashPos)
      : hash.slice(1)
    return pathFromHash + search
  }
  
  // 否则从 pathname 提取
  const path = stripBase(pathname, base)
  return path + search + hash
}
```

关键在于 `createCurrentLocation` 会检查 base 是否包含 `#`：

- 如果包含，从 `location.hash` 提取路径
- 如果不包含，从 `location.pathname` 提取路径

这个分支让同一套代码可以处理两种模式。

## Hash 模式的特殊行为

虽然内部复用了相同的代码，但 hash 模式有一些特殊的外部表现：

**URL 格式**：

```
Web History:  http://example.com/users/123
Hash History: http://example.com/#/users/123
```

**浏览器行为**：

hash 变化不会向服务器发送请求。这就是为什么 hash 模式不需要服务器配置——服务器只需要返回 index.html，路由完全在客户端处理。

**History API 的使用**：

两种模式都使用 `history.pushState` 和 `replaceState`。区别在于 URL 的格式：

```javascript
// Web History
history.pushState(state, '', '/users/123')

// Hash History
history.pushState(state, '', '#/users/123')
```

`pushState` 可以修改 hash 部分，同时不会触发页面刷新。

## hashchange 事件

你可能会问：为什么不用 `hashchange` 事件？

Vue Router 早期版本确实使用 `hashchange`。但现代浏览器都支持 History API，使用 `pushState` + `popstate` 有几个优势：

1. **统一的代码路径**：两种模式共享相同的实现
2. **状态存储**：`pushState` 可以保存自定义状态
3. **不会刷新**：`location.hash = '...'` 会触发 hashchange 和滚动，pushState 不会

当然，如果浏览器不支持 History API（IE9 及以下），就只能依赖 `hashchange` 了。但 Vue 3 已经放弃了对这些古老浏览器的支持。

## 示例对比

让我们对比两种模式处理同样的路由：

```typescript
const routes = [
  { path: '/', component: Home },
  { path: '/users/:id', component: User }
]

// Web History
const router1 = createRouter({
  history: createWebHistory(),
  routes
})

// Hash History
const router2 = createRouter({
  history: createWebHashHistory(),
  routes
})
```

访问用户页面：

```javascript
router1.push('/users/123')
// URL: http://example.com/users/123

router2.push('/users/123')
// URL: http://example.com/#/users/123
```

获取当前路由：

```javascript
// 两种模式下 route.path 都是 '/users/123'
// 两种模式下 route.params 都是 { id: '123' }
```

从应用代码的角度，两种模式是透明的。只有 URL 的外观和服务器配置要求不同。

## 何时使用 Hash 模式

**适合场景**：

1. **静态文件托管**：GitHub Pages、S3、OSS 等不支持 URL 重写
2. **文件协议**：直接用浏览器打开 HTML 文件
3. **遗留环境**：无法修改服务器配置
4. **快速原型**：不想配置开发服务器

**不适合场景**：

1. **需要 SEO**：爬虫对 hash 路由的支持不如正常 URL
2. **追求美观 URL**：`#` 看起来不够专业
3. **SSR**：服务端渲染通常需要真实路径

## 本章小结

`createWebHashHistory` 通过巧妙地设置 base 为 `#`，复用了 `createWebHistory` 的全部实现。这种设计减少了代码重复，也确保了两种模式的行为一致。

Hash 模式的核心优势是不需要服务器配置，代价是 URL 不够美观。在技术实现上，它同样使用 History API，只是 URL 的路径部分放在了 `#` 后面。

选择哪种模式取决于部署环境和业务需求。好消息是，切换模式只需要改一行代码，应用的其他部分不需要修改。
