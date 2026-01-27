# 与 Next.js/Nuxt 架构对比

Next.js 和 Nuxt 是 React 和 Vue 生态中最成熟的全栈框架。它们都解决了 SSR、路由、数据获取等问题，但设计理念和实现有明显差异。

## 框架定位

Next.js 是 React 的全栈框架，由 Vercel 开发和维护。它从一开始就定位为"用于生产的 React 框架"，强调开箱即用的最佳实践。

Nuxt 是 Vue 的全栈框架，由社区驱动开发。它的目标是让 Vue 应用的服务端渲染变得简单，同时提供优秀的开发体验。

两者都是成熟的、生产级的框架，在各自的生态中占据主导地位。

## 路由设计

两者都采用基于文件系统的路由。

Next.js App Router：

```
app/
  page.js          → /
  about/
    page.js        → /about
  blog/
    [slug]/
      page.js      → /blog/:slug
```

Nuxt 3：

```
pages/
  index.vue        → /
  about.vue        → /about
  blog/
    [slug].vue     → /blog/:slug
```

两者的动态路由语法略有不同。Next.js 使用 `[param]` 目录，Nuxt 使用 `[param].vue` 文件。

Next.js 13 引入的 App Router 是一个重大变化。它引入了 Server Components、嵌套布局等新概念，但也增加了学习曲线。

Nuxt 的路由系统更接近传统的 Vue Router，迁移成本较低。

## 数据获取

Next.js App Router 使用 Server Components 和 `use` hook：

```jsx
// Server Component - 默认在服务端运行
async function Posts() {
  const posts = await fetch('https://api.example.com/posts')
  return <PostList posts={posts} />
}

// Client Component - 需要显式标记
'use client'
function InteractiveWidget() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(c + 1)}>{count}</button>
}
```

Nuxt 3 使用 composables：

```vue
<script setup>
// 在服务端和客户端都可用，自动处理 SSR
const { data: posts } = await useFetch('/api/posts')
</script>
```

Next.js 的 Server Components 是更激进的设计。组件默认在服务端渲染，完全不发送到客户端。这减少了 JavaScript bundle 大小，但也增加了"服务端组件"和"客户端组件"的心智负担。

Nuxt 的 `useFetch` 更透明。同一个组件在 SSR 和客户端导航时行为一致，开发者不需要关心在哪个环境运行。

## 渲染模式

Next.js 支持多种渲染模式：

SSR（服务端渲染）：每个请求都在服务端渲染。

SSG（静态站点生成）：构建时渲染，适合内容不变的页面。

ISR（增量静态再生）：SSG 的增强版，可以定期重新生成。

```jsx
// Next.js 静态生成
export async function generateStaticParams() {
  const posts = await getPosts()
  return posts.map(post => ({ slug: post.slug }))
}
```

Nuxt 3 也支持这些模式：

```javascript
// nuxt.config.ts
export default defineNuxtConfig({
  routeRules: {
    '/': { prerender: true },           // SSG
    '/blog/**': { swr: 3600 },          // ISR，1小时重新验证
    '/api/**': { cors: true },          // API 路由
    '/admin/**': { ssr: false }         // 纯客户端
  }
})
```

Nuxt 的 routeRules 提供了更细粒度的控制，可以为不同路由指定不同的渲染策略。

## 布局系统

Next.js App Router 使用嵌套的 layout.js：

```jsx
// app/layout.js - 根布局
export default function RootLayout({ children }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  )
}

// app/blog/layout.js - 博客布局
export default function BlogLayout({ children }) {
  return (
    <div>
      <BlogSidebar />
      {children}
    </div>
  )
}
```

Nuxt 使用 layouts 目录和页面元数据：

```vue
<!-- layouts/default.vue -->
<template>
  <div>
    <header>导航</header>
    <slot />
    <footer>页脚</footer>
  </div>
</template>

<!-- pages/index.vue -->
<script setup>
definePageMeta({
  layout: 'default'
})
</script>
```

Next.js 的嵌套布局是自动的，基于目录结构。Nuxt 的布局是显式的，通过 `definePageMeta` 指定。

## 中间件

两者都支持中间件处理请求拦截。

Next.js 中间件运行在 Edge Runtime：

```javascript
// middleware.js
export function middleware(request) {
  if (!request.cookies.has('token')) {
    return NextResponse.redirect('/login')
  }
}

export const config = {
  matcher: ['/dashboard/:path*']
}
```

Nuxt 中间件运行在服务端：

```javascript
// middleware/auth.ts
export default defineNuxtRouteMiddleware((to, from) => {
  const user = useUser()
  if (!user.value && to.path.startsWith('/dashboard')) {
    return navigateTo('/login')
  }
})
```

Next.js 的 Edge 中间件在 CDN 边缘运行，延迟更低，但能力受限。Nuxt 的中间件是完整的 Node.js 环境，功能更强大。

## API 路由

两者都支持在同一项目中编写 API：

Next.js：

```javascript
// app/api/users/route.js
export async function GET(request) {
  const users = await db.users.findMany()
  return Response.json(users)
}
```

Nuxt：

```javascript
// server/api/users.get.ts
export default defineEventHandler(async (event) => {
  const users = await db.users.findMany()
  return users
})
```

两者的 API 设计都很简洁。Nuxt 使用文件名后缀表示 HTTP 方法（`.get.ts`、`.post.ts`），Next.js 使用导出的函数名（`GET`、`POST`）。

## 生态与工具

Next.js 背靠 Vercel，有完整的部署平台和边缘计算支持。Vercel 的一键部署体验非常流畅。

Nuxt 与多个托管平台集成，包括 Vercel、Netlify、Cloudflare 等。Nuxt 团队也在开发 NuxtHub，提供类似的托管服务。

两者都有丰富的模块生态：

Next.js：next-auth、next-intl、next-seo 等

Nuxt：@nuxtjs/auth、@nuxtjs/i18n、@nuxtjs/seo 等

## 选型建议

如果团队使用 React，Next.js 是自然的选择。它是 React 生态的事实标准。

如果团队使用 Vue，Nuxt 是推荐的选择。它提供了完整的 Vue 3 SSR 解决方案。

两者都是成熟的、生产级的框架。技术上没有绝对的优劣，选择主要取决于你使用的 UI 库（React vs Vue）以及团队的熟悉程度。

对于新项目，两个框架都值得考虑。它们代表了现代全栈框架的最佳实践，学习其中一个的经验也可以迁移到另一个。
