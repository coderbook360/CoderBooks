# 前端路由的前世今生

在开始实现 Mini Vue Router 之前，我们需要理解：前端路由为什么存在？它解决了什么问题？它是如何演进的？

## 从服务端路由说起

在 Web 应用早期，路由完全由服务器控制。用户点击链接，浏览器发送请求，服务器返回新页面。

**传统服务端路由的流程**：

1. 用户访问 `/home`
2. 浏览器向服务器发送 HTTP 请求
3. 服务器渲染 `home.html` 并返回
4. 浏览器刷新，显示新页面

这种模式简单直接，但有明显的缺陷：

- **页面闪烁**：每次跳转都要完全刷新页面
- **性能浪费**：重复加载相同的 CSS、JS、HTML 结构
- **体验割裂**：无法实现流畅的页面过渡动画
- **状态丢失**：页面刷新会丢失内存中的状态

## Ajax 的出现：异步数据的可能

2005年，Ajax（Asynchronous JavaScript and XML）技术开始流行。开发者可以通过 JavaScript 异步请求数据，无需刷新页面。

```javascript
// Ajax 时代的异步数据请求
function loadUserData(userId) {
  const xhr = new XMLHttpRequest();
  xhr.open('GET', `/api/users/${userId}`);
  xhr.onload = () => {
    const data = JSON.parse(xhr.responseText);
    updatePage(data);
  };
  xhr.send();
}
```

这解决了数据请求的问题，但**URL 不变，无法前进后退，无法分享链接**。

思考一下：如果我们能在不刷新页面的情况下，修改浏览器的 URL，是不是就能解决这个问题？

## Hash 模式：第一代前端路由方案

浏览器的 URL 中有一个特殊的部分：Hash（`#` 后面的内容）。

```
https://example.com/app#/user/123
                         ^^^^^^^^
                         这是 Hash
```

**Hash 的特性**：

- **不触发页面刷新**：修改 Hash 不会向服务器发送请求
- **可监听变化**：通过 `hashchange` 事件监听 Hash 变化
- **支持历史记录**：浏览器会记录 Hash 的变化，可以前进后退

基于这些特性，我们可以实现前端路由：

```javascript
// 最简单的 Hash 路由实现
class HashRouter {
  constructor() {
    this.routes = {};
    
    // 监听 Hash 变化
    window.addEventListener('hashchange', () => {
      this.handleRouteChange();
    });
    
    // 初始加载
    this.handleRouteChange();
  }
  
  // 注册路由
  route(path, handler) {
    this.routes[path] = handler;
  }
  
  // 处理路由变化
  handleRouteChange() {
    const hash = window.location.hash.slice(1) || '/';
    const handler = this.routes[hash];
    
    if (handler) {
      handler();
    }
  }
  
  // 导航到新路由
  push(path) {
    window.location.hash = path;
  }
}

// 使用示例
const router = new HashRouter();

router.route('/', () => {
  document.body.innerHTML = '<h1>首页</h1>';
});

router.route('/user', () => {
  document.body.innerHTML = '<h1>用户页</h1>';
});

// 跳转
router.push('/user');
```

这就是最原始的前端路由。现在我们回答开头的问题：

**前端路由解决了什么问题？**
- 无刷新切换页面
- 保持 URL 与页面状态同步
- 支持浏览器前进后退
- 可以分享和收藏链接

## Hash 模式的局限

Hash 路由简单有效，但也有明显的缺点：

**URL 不美观**：
```
❌ https://example.com/#/user/123
✅ https://example.com/user/123
```

**SEO 不友好**：搜索引擎早期不索引 Hash 后的内容（现在 Google 已支持）。

**服务端无法感知路由**：服务器看到的永远是 `index.html`，无法做服务端路由判断。

那么，有没有办法在不刷新页面的同时，使用正常的 URL 路径呢？

## History API：现代前端路由的基石

HTML5 引入了 **History API**，提供了操作浏览器历史记录的能力。

**核心方法**：

```javascript
// 修改 URL 而不刷新页面
history.pushState(state, title, url);

// 替换当前历史记录
history.replaceState(state, title, url);

// 前进后退
history.go(-1);    // 后退
history.go(1);     // 前进
history.back();    // 后退
history.forward(); // 前进
```

**监听历史变化**：

```javascript
// 用户点击浏览器前进/后退按钮时触发
window.addEventListener('popstate', (event) => {
  console.log('URL 变化了:', location.pathname);
  console.log('状态数据:', event.state);
});
```

基于 History API，我们可以实现 **History 模式路由**：

```javascript
class HistoryRouter {
  constructor() {
    this.routes = {};
    
    // 监听浏览器前进后退
    window.addEventListener('popstate', () => {
      this.handleRouteChange();
    });
    
    // 拦截所有链接点击
    document.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') {
        e.preventDefault();
        const href = e.target.getAttribute('href');
        this.push(href);
      }
    });
    
    this.handleRouteChange();
  }
  
  route(path, handler) {
    this.routes[path] = handler;
  }
  
  handleRouteChange() {
    const path = window.location.pathname;
    const handler = this.routes[path];
    
    if (handler) {
      handler();
    }
  }
  
  push(path) {
    // 修改 URL 不刷新
    history.pushState(null, '', path);
    // 手动触发路由处理
    this.handleRouteChange();
  }
}
```

## History 模式的权衡

History 模式实现了美观的 URL，但也引入了新的挑战：

**服务器配置要求**：

用户直接访问 `/user/123` 时，浏览器会向服务器请求这个路径。如果服务器没有这个文件，会返回 404。

**解决方案**：配置服务器，所有路由都返回 `index.html`。

```nginx
# Nginx 配置示例
location / {
  try_files $uri $uri/ /index.html;
}
```

这带来了一个副作用：真正的 404 页面需要由前端路由处理。

## 对比：Hash vs History

| 特性 | Hash 模式 | History 模式 |
|------|-----------|--------------|
| URL 外观 | `#/user/123` | `/user/123` |
| 服务器配置 | 不需要 | 需要配置 |
| 浏览器兼容性 | IE8+ | IE10+ |
| SEO | 一般 | 友好 |
| 实现复杂度 | 简单 | 稍复杂 |

## Vue Router 的实践

Vue Router 同时支持这两种模式，并增加了 **Memory 模式**（用于 SSR 和测试）：

```javascript
import { createRouter, createWebHistory, createWebHashHistory, createMemoryHistory } from 'vue-router';

// History 模式
const router = createRouter({
  history: createWebHistory(),
  routes: [...]
});

// Hash 模式
const router = createRouter({
  history: createWebHashHistory(),
  routes: [...]
});

// Memory 模式
const router = createRouter({
  history: createMemoryHistory(),
  routes: [...]
});
```

**设计智慧**：通过抽象统一接口，不同模式的切换只需修改一行代码，路由逻辑完全解耦。

## 总结

前端路由的演进历程：

1. **服务端路由**：每次跳转都刷新页面，体验差
2. **Ajax 异步请求**：数据无刷新，但 URL 不变
3. **Hash 路由**：利用 `#` 实现无刷新路由，但 URL 不美观
4. **History 路由**：使用 History API 实现美观的 URL，但需要服务器配合

**核心思想**：在单页应用中，通过 JavaScript 控制 URL 与页面状态的同步，实现无刷新的页面切换。

**Vue Router 的贡献**：提供了完整的路由解决方案，不仅仅是 URL 管理，还包括：
- 路由匹配与参数解析
- 导航守卫与权限控制
- 嵌套路由与视图管理
- 懒加载与代码分割
- 完善的类型系统

现在你理解了前端路由的本质，下一章我们将深入 Vue Router 4 的架构设计，看看它是如何优雅地实现这些功能的。
