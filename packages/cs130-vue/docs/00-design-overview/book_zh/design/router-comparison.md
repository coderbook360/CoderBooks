# 与 React Router 设计对比

Vue Router 和 React Router 是前端路由的两大主流方案。它们解决相同的问题，但设计理念和 API 风格有明显差异。理解这些差异有助于在不同框架间迁移，也能从不同角度理解路由设计。

## 配置方式

Vue Router 采用集中式的路由配置：

```javascript
const routes = [
  { path: '/', component: Home },
  { path: '/user/:id', component: User },
  {
    path: '/admin',
    component: Admin,
    children: [
      { path: 'users', component: AdminUsers },
      { path: 'settings', component: AdminSettings }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})
```

所有路由在一个配置对象中定义，结构清晰，一目了然。

React Router v6 采用 JSX 组件化的路由配置：

```jsx
function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/user/:id" element={<User />} />
      <Route path="/admin" element={<Admin />}>
        <Route path="users" element={<AdminUsers />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>
    </Routes>
  )
}
```

路由配置是组件树的一部分，与 React 的组件化理念一致。

两种方式各有优劣。集中式配置让路由结构一目了然，适合大型应用的路由管理。组件化配置更灵活，可以在运行时动态组合路由。

## 导航方式

Vue Router 提供命令式和声明式两种导航：

```javascript
// 命令式
import { useRouter } from 'vue-router'

const router = useRouter()
router.push('/user/123')

// 声明式
<router-link to="/user/123">用户详情</router-link>
```

React Router 的导航 API：

```jsx
// 命令式
import { useNavigate } from 'react-router-dom'

const navigate = useNavigate()
navigate('/user/123')

// 声明式
<Link to="/user/123">用户详情</Link>
```

两者非常相似。`router.push` 对应 `navigate`，`<router-link>` 对应 `<Link>`。

一个区别是 Vue Router 的 `router.push` 返回 Promise，可以知道导航何时完成：

```javascript
await router.push('/user/123')
console.log('导航完成')
```

React Router 的 `navigate` 是同步调用，不直接反馈导航结果。

## 路由守卫 vs 数据加载

Vue Router 的导航守卫是路由系统的核心特性：

```javascript
router.beforeEach(async (to, from) => {
  if (to.meta.requiresAuth) {
    const isLoggedIn = await checkAuth()
    if (!isLoggedIn) return '/login'
  }
})
```

React Router v6.4 引入了 loader 和 action 的概念，灵感来自 Remix：

```jsx
const router = createBrowserRouter([
  {
    path: '/user/:id',
    element: <User />,
    loader: async ({ params }) => {
      return fetchUser(params.id)
    }
  }
])
```

loader 在导航前执行，数据加载完成后才渲染组件。这与 Vue Router 的 `beforeResolve` 守卫类似。

但 React Router 的 loader 更专注于数据加载，而 Vue Router 的守卫是通用的拦截机制。Vue Router 中实现相同的功能需要在守卫中手动将数据存储到状态管理中。

## 嵌套路由

两者都支持嵌套路由，但插槽的实现不同。

Vue Router 使用 `<router-view>`：

```vue
<!-- Parent.vue -->
<template>
  <div>
    <h1>父组件</h1>
    <router-view />  <!-- 子路由渲染在这里 -->
  </div>
</template>
```

React Router 使用 `<Outlet>`：

```jsx
// Parent.jsx
function Parent() {
  return (
    <div>
      <h1>父组件</h1>
      <Outlet />  {/* 子路由渲染在这里 */}
    </div>
  )
}
```

概念上完全相同，只是命名不同。

## 路由参数

获取路由参数的方式也很相似。

Vue Router：

```javascript
import { useRoute } from 'vue-router'

const route = useRoute()
console.log(route.params.id)
console.log(route.query.page)
```

React Router：

```jsx
import { useParams, useSearchParams } from 'react-router-dom'

const params = useParams()
console.log(params.id)

const [searchParams] = useSearchParams()
console.log(searchParams.get('page'))
```

Vue Router 将 params 和 query 统一在 route 对象中。React Router 分成 `useParams` 和 `useSearchParams` 两个 hooks。

Vue Router 的 route 对象是响应式的，参数变化时组件自动更新。React Router 需要在组件中使用这些 hooks，React 的重渲染机制处理更新。

## 编程式路由信息

Vue Router 提供更丰富的路由元信息：

```javascript
const route = useRoute()

// 完整路径
route.fullPath  // /user/123?page=1

// 匹配的所有路由记录
route.matched

// 路由元数据
route.meta.requiresAuth
```

React Router 的路由信息相对简单。获取完整 URL 需要使用 `useLocation`：

```jsx
const location = useLocation()
console.log(location.pathname)
console.log(location.search)
```

## 路由懒加载

两者都支持路由级别的代码分割。

Vue Router：

```javascript
const routes = [
  {
    path: '/admin',
    component: () => import('./views/Admin.vue')
  }
]
```

React Router：

```jsx
const Admin = React.lazy(() => import('./views/Admin'))

<Route path="/admin" element={
  <Suspense fallback={<Loading />}>
    <Admin />
  </Suspense>
} />
```

Vue Router 内置处理懒加载组件。React Router 需要配合 `React.lazy` 和 `Suspense` 使用。

## 类型安全

Vue Router 4 使用 TypeScript 编写，提供了类型支持。但路由参数的类型推断有限：

```typescript
const route = useRoute()
route.params.id  // string | string[]
```

React Router 的类型支持类似。社区有一些方案增强类型安全，如 typesafe-routes。

## 设计哲学差异

Vue Router 的设计更偏向"约定优于配置"。它提供了完整的解决方案，包括导航守卫、滚动行为、过渡动画等。开发者按照约定使用即可。

React Router 的设计更偏向"组合优于约定"。它提供了基础的路由能力，高级功能通过组合 hooks 和组件实现。这符合 React 生态的风格。

对于从 React 迁移到 Vue 的开发者，Vue Router 的集中式配置和守卫系统需要一些适应。但核心概念是相通的，迁移成本不高。

对于从 Vue 迁移到 React 的开发者，需要适应 JSX 组件化的路由配置，以及用 loader/action 替代守卫的思维方式。

两种设计都是成熟的方案，选择取决于你使用的框架和团队的偏好。
