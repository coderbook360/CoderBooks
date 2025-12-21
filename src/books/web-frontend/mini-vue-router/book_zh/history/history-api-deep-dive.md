# History API 深度剖析

在实现 `createWebHistory` 之前，我们需要彻底理解浏览器的 History API。这是现代前端路由的基石。

## History API 是什么

**History API** 是 HTML5 提供的一组 JavaScript 接口，用于操作浏览器的会话历史记录。

思考一下：为什么需要这个 API？

在传统的 Web 应用中，每次页面跳转都会向服务器发送请求，浏览器会自动管理历史记录。但在单页应用（SPA）中，页面不刷新，URL 需要由 JavaScript 手动管理。

History API 让我们可以：
- **修改 URL 而不刷新页面**
- **监听用户的前进/后退操作**
- **管理会话历史栈**

## 核心接口

### window.history 对象

```typescript
interface History {
  readonly length: number;     // 历史记录数量
  readonly state: any;          // 当前状态
  scrollRestoration: 'auto' | 'manual';  // 滚动恢复行为
  
  back(): void;                // 后退
  forward(): void;             // 前进
  go(delta?: number): void;    // 跳转到指定位置
  pushState(state: any, title: string, url?: string): void;  // 新增记录
  replaceState(state: any, title: string, url?: string): void;  // 替换记录
}
```

### pushState：添加新历史记录

```javascript
history.pushState(state, title, url);
```

**参数**：
- `state`：与历史记录关联的状态对象，可以是任意可序列化的数据
- `title`：标题（目前所有浏览器都忽略这个参数）
- `url`：新的 URL（可选，相对或绝对路径）

**示例**：

```javascript
// 添加新记录
history.pushState(
  { page: 1 },       // 状态数据
  '',                 // 标题（忽略）
  '/page/1'          // 新 URL
);

console.log(location.pathname);  // '/page/1'
console.log(history.state);      // { page: 1 }
```

**关键特性**：
- ✅ URL 改变了，但**页面不刷新**
- ✅ 浏览器历史记录增加了一条
- ✅ 用户可以点击后退按钮返回

### replaceState：替换当前记录

```javascript
history.replaceState(state, title, url);
```

与 `pushState` 类似，但**不增加新记录**，而是替换当前记录。

**使用场景**：
- 修正当前 URL
- 更新状态数据但不希望增加历史记录

```javascript
// 当前 URL: /user/123

// 使用 pushState（增加记录）
history.pushState(null, '', '/user/456');
history.length;  // +1

// 使用 replaceState（替换记录）
history.replaceState(null, '', '/user/789');
history.length;  // 不变
```

### go/back/forward：导航历史记录

```javascript
history.go(-1);    // 后退 1 步
history.go(1);     // 前进 1 步
history.go(-2);    // 后退 2 步

history.back();    // 等同于 go(-1)
history.forward(); // 等同于 go(1)
```

**注意**：这些方法**可能不会立即执行**，是异步的。

### popstate 事件：监听历史变化

当用户点击浏览器的前进/后退按钮时，触发 `popstate` 事件。

```javascript
window.addEventListener('popstate', (event) => {
  console.log('URL 变化了:', location.pathname);
  console.log('状态数据:', event.state);
});
```

**重要**：`pushState` 和 `replaceState` **不会触发** `popstate` 事件。

```javascript
// 不会触发 popstate
history.pushState(null, '', '/page1');

// 用户点击后退按钮，触发 popstate
```

## 完整示例：手动实现路由切换

让我们用 History API 手动实现一个简单的路由：

```html
<!DOCTYPE html>
<html>
<body>
  <nav>
    <a href="/" data-link>首页</a>
    <a href="/about" data-link>关于</a>
    <a href="/contact" data-link>联系</a>
  </nav>
  <div id="app"></div>
  
  <script>
    // 路由配置
    const routes = {
      '/': '<h1>首页</h1><p>欢迎来到首页</p>',
      '/about': '<h1>关于</h1><p>这是关于页面</p>',
      '/contact': '<h1>联系</h1><p>联系我们</p>'
    };
    
    // 渲染页面
    function render() {
      const path = location.pathname;
      const html = routes[path] || '<h1>404</h1>';
      document.getElementById('app').innerHTML = html;
    }
    
    // 导航到新路由
    function navigateTo(url) {
      history.pushState(null, '', url);
      render();
    }
    
    // 拦截链接点击
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-link]')) {
        e.preventDefault();
        navigateTo(e.target.href);
      }
    });
    
    // 监听浏览器前进/后退
    window.addEventListener('popstate', render);
    
    // 初始渲染
    render();
  </script>
</body>
</html>
```

运行这个例子，你会发现：
- 点击链接，URL 变化，内容更新，**但页面不刷新**
- 点击浏览器后退/前进按钮，内容会正确切换
- 刷新页面会 404（因为服务器没有这些路径）

这就是 History 模式路由的原理。

## State 对象的妙用

`pushState` 的 `state` 参数可以存储任意数据，在 `popstate` 事件中取回。

### 场景1：保存滚动位置

```javascript
// 导航时保存滚动位置
function navigateTo(url) {
  history.pushState(
    { scroll: { x: window.scrollX, y: window.scrollY } },
    '',
    url
  );
  render();
}

// 恢复滚动位置
window.addEventListener('popstate', (event) => {
  render();
  if (event.state && event.state.scroll) {
    window.scrollTo(event.state.scroll.x, event.state.scroll.y);
  }
});
```

### 场景2：保存表单状态

```javascript
// 用户填写表单时
history.replaceState(
  { formData: { name: 'John', email: 'john@example.com' } },
  '',
  location.href
);

// 刷新后恢复
if (history.state && history.state.formData) {
  // 恢复表单数据
}
```

## History API 的局限

### 1. 服务器配置要求

用户直接访问 `/about` 时，浏览器会向服务器请求 `/about`。

如果服务器没有配置，会返回 404。

**解决方案**：配置服务器，所有路由都返回 `index.html`。

```nginx
# Nginx 配置
location / {
  try_files $uri $uri/ /index.html;
}
```

```javascript
// Express 配置
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
```

### 2. 同源限制

`pushState` 只能修改**同源**的 URL。

```javascript
// ✅ 允许（同源）
history.pushState(null, '', '/page');
history.pushState(null, '', '/page?id=1');

// ❌ 报错（跨域）
history.pushState(null, '', 'https://other-domain.com/page');
```

### 3. URL 长度限制

浏览器对 URL 长度有限制（通常 2000 字符），不要在 URL 中存储大量数据。

### 4. 兼容性

History API 需要 IE10+。如果需要兼容旧浏览器，使用 Hash 模式。

## History API vs Hash 模式

| 特性 | History API | Hash 模式 |
|------|-------------|-----------|
| URL 形式 | `/user/123` | `/#/user/123` |
| 原理 | `pushState` | `location.hash` |
| 服务器配置 | 需要 | 不需要 |
| 兼容性 | IE10+ | IE8+ |
| SEO | 友好 | 一般 |

## 实战细节：需要注意的坑

### 坑1：popstate 在页面加载时可能触发

某些浏览器在页面加载时会触发一次 `popstate`，需要过滤：

```javascript
let isFirstLoad = true;

window.addEventListener('popstate', (event) => {
  if (isFirstLoad) {
    isFirstLoad = false;
    return;
  }
  // 处理路由变化
});
```

### 坑2：pushState 不触发 popstate

```javascript
// 这不会触发 popstate
history.pushState(null, '', '/page');

// 需要手动调用渲染
render();
```

### 坑3：state 对象有大小限制

不同浏览器对 `state` 大小限制不同（通常 640KB - 2MB）。

**建议**：不要存储大量数据，只存储关键信息。

### 坑4：title 参数被忽略

```javascript
history.pushState(null, '新标题', '/page');
```

`title` 参数目前所有浏览器都忽略，需要手动修改：

```javascript
document.title = '新标题';
```

## 与 Vue Router 的对应关系

Vue Router 的 `createWebHistory` 就是对 History API 的封装：

| History API | Vue Router |
|-------------|------------|
| `pushState` | `router.push()` |
| `replaceState` | `router.replace()` |
| `go/back/forward` | `router.go/back/forward()` |
| `popstate` 事件 | 内部监听，触发路由更新 |
| `state` 对象 | 存储路由元信息 |

## 总结

History API 的核心能力：

**修改 URL**：`pushState` 和 `replaceState` 可以修改 URL 而不刷新页面。

**监听变化**：`popstate` 事件监听用户的前进/后退操作。

**状态管理**：`state` 对象存储与历史记录关联的数据。

**导航控制**：`go/back/forward` 控制历史记录栈。

**关键设计思想**：将 URL 与应用状态同步，实现无刷新的页面切换。

**局限性**：需要服务器配置，有同源限制，兼容性要求 IE10+。

理解了 History API，下一章我们将动手实现 `createWebHistory`，封装这些底层 API，提供更高层的抽象。
