# SSR 概述：服务端渲染的原理与挑战

传统 SPA 在服务端返回一个几乎为空的 HTML，所有内容都由 JavaScript 在浏览器中渲染。**这带来了两个问题：首屏白屏时间长，搜索引擎难以抓取内容。**

**SSR（Server-Side Rendering）在服务端生成完整 HTML，解决这些问题。** 理解 SSR 的原理，能帮你做出更好的架构决策。

## SSR vs CSR

CSR（Client-Side Rendering）流程：

```
请求 → 空 HTML → 下载 JS → 执行 JS → 获取数据 → 渲染 → 可交互
       |________________白屏时间________________|
```

SSR 流程：

```
请求 → 服务端渲染 → 完整 HTML → 首屏可见 → 下载 JS → 激活
       |__服务端处理__|          |___可见但不可交互___|
```

SSR 的优势：

1. **首屏性能**：用户立即看到内容
2. **SEO 友好**：搜索引擎可直接抓取 HTML
3. **慢速网络**：内容先于 JavaScript 到达

代价：

1. **服务端压力**：每个请求都需要渲染
2. **开发复杂度**：需要处理服务端/客户端差异
3. **TTFB 增加**：服务端渲染需要时间

## SSR 工作流程

```
┌────────────────────────────────────────────────────────┐
│                    SSR 完整流程                         │
├────────────────────────────────────────────────────────┤
│                                                         │
│  浏览器请求                                             │
│      │                                                  │
│      ▼                                                  │
│  Node.js 服务接收请求                                   │
│      │                                                  │
│      ▼                                                  │
│  创建 Vue 应用实例（每请求一个）                        │
│      │                                                  │
│      ▼                                                  │
│  路由匹配 + 数据预取                                    │
│      │                                                  │
│      ▼                                                  │
│  renderToString() 生成 HTML                            │
│      │                                                  │
│      ▼                                                  │
│  发送 HTML 到浏览器                                     │
│      │                                                  │
│      ▼                                                  │
│  用户看到首屏内容                                       │
│      │                                                  │
│      ▼                                                  │
│  JavaScript 下载并执行                                  │
│      │                                                  │
│      ▼                                                  │
│  Hydration（客户端激活）                                │
│      │                                                  │
│      ▼                                                  │
│  应用可交互                                             │
│                                                         │
└────────────────────────────────────────────────────────┘
```

## Vue 3 SSR 架构

```javascript
// 服务端入口
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
import App from './App.vue'

export async function render(url) {
  // 每请求创建新实例
  const app = createSSRApp(App)
  
  // 路由处理
  const router = createRouter()
  app.use(router)
  await router.push(url)
  await router.isReady()
  
  // 数据预取
  await fetchData(router.currentRoute.value)
  
  // 渲染
  const html = await renderToString(app)
  
  return html
}
```

```javascript
// 客户端入口
import { createSSRApp } from 'vue'
import App from './App.vue'

const app = createSSRApp(App)
app.mount('#app')  // 激活而非重新渲染
```

## 核心挑战

### 跨请求状态隔离

```javascript
// ❌ 错误：模块级状态被所有请求共享
const store = reactive({ user: null })

// ✅ 正确：每请求创建新实例
function createStore() {
  return reactive({ user: null })
}
```

### 生命周期差异

```javascript
// 服务端只执行：
// - setup()
// - beforeCreate / created

// 服务端不执行：
// - mounted / updated / unmounted
// - 任何 DOM 操作
```

### 仅客户端的 API

```javascript
setup() {
  // 服务端没有 window
  if (typeof window !== 'undefined') {
    // 浏览器专属代码
  }
  
  // 或使用 onMounted（只在客户端执行）
  onMounted(() => {
    window.addEventListener('scroll', handler)
  })
}
```

## 渲染模式对比

除了 SSR，还有其他渲染策略可以选择：

**CSR（Client-Side Rendering）**
- 首屏：慢（需等待 JS 下载执行）
- SEO：差（爬虫看不到内容）
- 服务端负载：低
- 适用场景：后台管理系统

**SSR（Server-Side Rendering）**
- 首屏：快（直接返回 HTML）
- SEO：好
- 服务端负载：高（每请求都要渲染）
- 适用场景：内容网站、电商首页

**SSG（Static Site Generation）**
- 首屏：最快（预构建的静态文件）
- SEO：好
- 服务端负载：无（只需静态文件服务）
- 适用场景：博客、文档站点

**ISR（Incremental Static Regeneration）**
- 首屏：快（缓存 + 按需更新）
- SEO：好
- 服务端负载：中（仅过期时重新生成）
- 适用场景：电商、新闻网站

**选择建议**：
- 内容不常变 → SSG
- 需要实时数据 → SSR
- 混合场景 → ISR
- 纯后台应用 → CSR

## 本章小结

本章介绍了 SSR 的核心概念：

- **SSR vs CSR**：首屏性能和 SEO 的权衡
- **工作流程**：服务端渲染 → 发送 HTML → 客户端激活
- **核心挑战**：状态隔离、生命周期、平台差异

下一章将分析 `renderToString` 的实现原理。
