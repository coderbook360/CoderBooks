# Memory 模式与 SSR

除了 Hash 和 History 模式，Vue Router 还提供了第三种模式：Memory 模式。顾名思义，这种模式不依赖浏览器的 URL 或 History API，而是完全在内存中管理路由状态。它的存在主要是为了解决两个特殊场景：服务器端渲染和自动化测试。

## 为什么需要 Memory 模式

在浏览器中，路由依赖 `window.location` 和 `history` 对象。但在 Node.js 环境中，这些对象不存在。当你尝试在 Node.js 中使用 `createWebHistory` 或 `createWebHashHistory`，代码会直接报错。

这在服务器端渲染（SSR）场景下是个问题。SSR 的基本流程是：服务器收到一个 URL 请求，在 Node.js 中运行 Vue 应用，渲染出 HTML 字符串，返回给浏览器。在这个过程中，Vue 应用需要知道当前的路由是什么，才能渲染正确的页面组件。

Memory 模式提供了一个在任何 JavaScript 环境中都能工作的路由历史实现。它在内存中维护一个历史栈和当前位置，模拟浏览器的行为。

## Memory 模式的实现原理

Memory 模式的核心是一个简单的数据结构——一个数组作为历史栈，一个指针指向当前位置：

```javascript
function createMemoryHistory(base = '/') {
  // 历史栈
  const queue = [{ path: base, state: {} }]
  // 当前位置索引
  let position = 0
  // 当前的路由位置
  let location = base
  
  function push(to, state = {}) {
    // 添加新条目，删除当前位置之后的所有条目
    queue.splice(position + 1)
    queue.push({ path: to, state })
    position++
    location = to
    triggerListeners(to, state)
  }
  
  function replace(to, state = {}) {
    // 替换当前条目
    queue[position] = { path: to, state }
    location = to
    triggerListeners(to, state)
  }
  
  function go(delta) {
    const newPosition = position + delta
    if (newPosition < 0 || newPosition >= queue.length) {
      return  // 超出范围，不做任何事
    }
    position = newPosition
    const entry = queue[position]
    location = entry.path
    triggerListeners(entry.path, entry.state)
  }
  
  // 监听器
  const listeners = []
  function listen(callback) {
    listeners.push(callback)
    return () => {
      const index = listeners.indexOf(callback)
      if (index > -1) listeners.splice(index, 1)
    }
  }
  
  function triggerListeners(to, state) {
    listeners.forEach(cb => cb(to, state))
  }
  
  return {
    get location() { return location },
    push,
    replace,
    go,
    back: () => go(-1),
    forward: () => go(1),
    listen
  }
}
```

这个实现模拟了浏览器历史栈的行为。push 添加新条目并移动指针。如果在历史中间 push，之后的条目会被删除——这和浏览器的行为一致。replace 替换当前条目。go 移动指针，正数前进，负数后退。

## SSR 中的使用

在 SSR 场景中，每个请求都需要创建一个新的路由器实例，并用请求的 URL 初始化：

```javascript
// server.js
import { createSSRApp } from 'vue'
import { createRouter, createMemoryHistory } from 'vue-router'
import { renderToString } from 'vue/server-renderer'
import App from './App.vue'
import routes from './routes'

async function handleRequest(req, res) {
  // 为每个请求创建新的 app 和 router
  const app = createSSRApp(App)
  
  const router = createRouter({
    history: createMemoryHistory(),  // 使用 memory 模式
    routes
  })
  
  app.use(router)
  
  // 导航到请求的 URL
  await router.push(req.url)
  await router.isReady()
  
  // 渲染
  const html = await renderToString(app)
  
  res.send(`
    <!DOCTYPE html>
    <html>
      <body>
        <div id="app">${html}</div>
        <script src="/client.js"></script>
      </body>
    </html>
  `)
}
```

关键步骤是 `router.push(req.url)` 和 `router.isReady()`。push 告诉路由器当前的 URL 是什么，isReady 等待所有异步的路由守卫和组件加载完成。

注意我们为每个请求创建新的 app 和 router 实例。这是 SSR 的重要原则——不能在请求之间共享状态，否则会导致状态污染。Memory 模式的每个实例都是独立的，这正是 SSR 所需要的。

## 客户端 Hydration

服务器渲染的 HTML 只是初始状态。当 JavaScript 加载完成后，需要"激活"这个静态 HTML，让它变成可交互的 Vue 应用。这个过程叫做 hydration。

在客户端，路由器需要切换到浏览器的 History 或 Hash 模式：

```javascript
// client.js
import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import routes from './routes'

const app = createApp(App)

const router = createRouter({
  history: createWebHistory(),  // 客户端使用浏览器的 history
  routes
})

app.use(router)

// 等待路由器准备好，然后挂载
router.isReady().then(() => {
  app.mount('#app')
})
```

Vue Router 会检测到当前 URL 与服务器渲染时相同（因为浏览器加载的就是那个 URL），不会触发额外的页面更新。hydration 过程会复用服务器渲染的 DOM，只是附加事件监听器和建立响应式连接。

## 测试中的使用

Memory 模式在单元测试中也很有价值。测试不需要依赖真实的浏览器环境，可以在 Node.js 中直接运行：

```javascript
import { describe, it, expect } from 'vitest'
import { createRouter, createMemoryHistory } from 'vue-router'
import { mount } from '@vue/test-utils'
import App from './App.vue'
import routes from './routes'

describe('Router', () => {
  it('navigates to about page', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes
    })
    
    const wrapper = mount(App, {
      global: {
        plugins: [router]
      }
    })
    
    // 导航
    await router.push('/about')
    await router.isReady()
    
    // 断言
    expect(wrapper.text()).toContain('About Page')
  })
  
  it('handles navigation guards', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: Home },
        { 
          path: '/protected', 
          component: Protected,
          meta: { requiresAuth: true }
        }
      ]
    })
    
    router.beforeEach((to) => {
      if (to.meta.requiresAuth) {
        return '/'  // 重定向到首页
      }
    })
    
    await router.push('/protected')
    
    // 应该被重定向到首页
    expect(router.currentRoute.value.path).toBe('/')
  })
})
```

使用 Memory 模式的测试运行速度更快（不需要启动浏览器），更可靠（不受浏览器环境影响），也更容易在 CI 环境中运行。

## 初始位置的设置

Memory 模式可以指定初始位置，这在测试特定路由时很有用：

```javascript
const router = createRouter({
  history: createMemoryHistory('/users/123'),
  routes
})

// router.currentRoute.value.path 一开始就是 '/users/123'
```

在 SSR 中，这通常是请求的 URL。在测试中，这可以是你想要测试的特定路由。

## 与浏览器模式的差异

Memory 模式在行为上尽量模拟浏览器，但有一些根本性的差异。

没有真正的 URL。浏览器的地址栏不会变化，也不能通过地址栏直接输入 URL 导航。当然，在 Node.js 环境中本来就没有地址栏。

没有 popstate 事件。在浏览器中，用户可以点击前进后退按钮触发导航。Memory 模式中没有这个概念，所有的导航都是程序触发的。

不持久化。刷新页面（如果有页面的话）会丢失所有历史记录。Memory 模式的状态只存在于当前的 JavaScript 运行时中。

## 本章小结

Memory 模式是 Vue Router 为非浏览器环境提供的解决方案。它在内存中模拟浏览器的历史栈行为，让路由代码可以在 Node.js 中运行。

在 SSR 场景中，服务器使用 Memory 模式处理请求，渲染出正确的页面。客户端接管后，切换到 History 或 Hash 模式继续处理用户的导航。

在测试场景中，Memory 模式让路由测试可以脱离浏览器环境，更快速、更可靠地运行。

这三种模式的统一接口设计，是 Vue Router 架构的一个亮点。无论使用哪种模式，路由器的其他部分——匹配、守卫、组件渲染——都不需要改变。这是策略模式的优雅应用。
