# 路由懒加载设计

当应用规模增长，将所有页面组件打包到一个文件会导致首屏加载缓慢。用户可能只访问其中几个页面，却要下载整个应用的代码。路由懒加载解决这个问题——只在用户实际访问某个路由时，才加载该路由对应的组件代码。

## 懒加载的基本原理

传统路由配置直接导入组件：

```javascript
import Home from './views/Home.vue'
import About from './views/About.vue'
import UserList from './views/UserList.vue'

const routes = [
  { path: '/', component: Home },
  { path: '/about', component: About },
  { path: '/users', component: UserList }
]
```

这种方式下，所有组件代码都在应用启动时加载。

懒加载使用动态 import：

```javascript
const routes = [
  { path: '/', component: () => import('./views/Home.vue') },
  { path: '/about', component: () => import('./views/About.vue') },
  { path: '/users', component: () => import('./views/UserList.vue') }
]
```

`component` 不再是组件对象，而是一个返回 Promise 的函数。这个 Promise 在解析后返回组件模块。Vue Router 在需要渲染该路由时才调用这个函数，触发实际的网络请求去加载对应的 JavaScript 文件。

## 代码分割的工作机制

动态 `import()` 是 ES2020 标准的一部分。当 Webpack、Vite 或 Rollup 遇到这种语法时，会自动进行代码分割，将动态导入的模块打包到单独的文件（chunk）中。

构建后的产物可能是：

```
dist/
  index.html
  assets/
    main.abc123.js        # 主 bundle
    Home.def456.js        # Home 组件的 chunk
    About.ghi789.js       # About 组件的 chunk
    UserList.jkl012.js    # UserList 组件的 chunk
```

用户首次访问时只下载 `main.js`。导航到 `/about` 时，浏览器才请求 `About.xxx.js`。

## 命名 chunk

默认情况下，chunk 文件名是自动生成的哈希值，难以辨认。可以使用魔法注释来命名：

```javascript
const routes = [
  { 
    path: '/about', 
    component: () => import(/* webpackChunkName: "about" */ './views/About.vue') 
  }
]
```

Vite 使用类似语法：

```javascript
const routes = [
  { 
    path: '/about', 
    component: () => import('./views/About.vue')  // Vite 自动使用文件名
  }
]
```

Vite 默认会基于文件路径生成有意义的 chunk 名，通常不需要额外配置。

## 分组打包

有时希望把相关的组件打包到同一个 chunk 中。比如用户管理的多个页面可以一起加载：

```javascript
// Webpack
const UserList = () => import(/* webpackChunkName: "users" */ './views/UserList.vue')
const UserDetail = () => import(/* webpackChunkName: "users" */ './views/UserDetail.vue')
const UserCreate = () => import(/* webpackChunkName: "users" */ './views/UserCreate.vue')

const routes = [
  { path: '/users', component: UserList },
  { path: '/users/:id', component: UserDetail },
  { path: '/users/create', component: UserCreate }
]
```

相同的 `webpackChunkName` 会把这些组件打包到同一个文件。用户访问任何一个用户页面时，会加载整个用户模块。

这是一个权衡：减少了网络请求次数，但可能加载了暂时不需要的代码。根据用户行为来决定——如果用户访问列表后很可能会访问详情，合并打包是合理的。

## 预加载与预取

浏览器提供了 prefetch 和 preload 机制来优化资源加载：

- **Prefetch**：浏览器空闲时预先下载，优先级低
- **Preload**：立即开始下载，优先级高

Webpack 支持通过魔法注释控制：

```javascript
// 预取：浏览器空闲时下载
const About = () => import(/* webpackPrefetch: true */ './views/About.vue')

// 预加载：与主 chunk 并行下载
const Dashboard = () => import(/* webpackPreload: true */ './views/Dashboard.vue')
```

Prefetch 适合用户"可能会访问"的页面。Preload 适合用户"很可能会访问"的关键页面。

也可以在路由守卫中手动预加载：

```javascript
router.beforeEach((to, from) => {
  // 当用户访问列表页时，预加载详情页组件
  if (to.path === '/users') {
    import('./views/UserDetail.vue')  // 不等待结果，只触发加载
  }
})
```

## 加载状态处理

动态导入需要时间，用户可能看到短暂的空白。Vue Router 本身不提供加载状态，但可以配合 Vue 的异步组件来处理：

```javascript
import { defineAsyncComponent } from 'vue'

const AsyncAbout = defineAsyncComponent({
  loader: () => import('./views/About.vue'),
  loadingComponent: LoadingSpinner,
  delay: 200,  // 200ms 后才显示加载组件
  errorComponent: ErrorComponent,
  timeout: 10000
})

const routes = [
  { path: '/about', component: AsyncAbout }
]
```

`delay` 避免了网络快时的闪烁——只有加载超过 200ms 才显示 spinner。`timeout` 处理加载超时的情况。

另一种方式是使用全局加载指示器：

```javascript
router.beforeEach((to, from, next) => {
  NProgress.start()  // 开始进度条
  next()
})

router.afterEach(() => {
  NProgress.done()  // 结束进度条
})
```

NProgress 或类似库可以在页面顶部显示进度条，给用户"正在加载"的反馈。

## 错误处理

网络可能失败，动态导入可能出错。需要优雅处理这些情况：

```javascript
import { defineAsyncComponent } from 'vue'

const AsyncAbout = defineAsyncComponent({
  loader: () => import('./views/About.vue'),
  errorComponent: {
    template: `
      <div class="error-page">
        <p>页面加载失败</p>
        <button @click="$emit('retry')">重试</button>
      </div>
    `
  },
  onError(error, retry, fail, attempts) {
    if (attempts <= 3) {
      retry()  // 自动重试最多 3 次
    } else {
      fail()
    }
  }
})
```

也可以在路由层面处理：

```javascript
router.onError((error) => {
  if (error.message.includes('Loading chunk')) {
    // chunk 加载失败，可能是部署了新版本
    window.location.reload()
  }
})
```

常见的 chunk 加载失败原因是部署了新版本，旧的 chunk 文件已被删除。强制刷新可以加载新版本。

## 懒加载粒度的选择

并非所有组件都需要懒加载。要考虑：

**适合懒加载的**：
- 大型页面组件
- 用户不常访问的路由
- 包含大型第三方库的页面（如图表库、编辑器）
- 后台管理页面（大多数用户不会访问）

**不适合懒加载的**：
- 首页和核心页面（用户必访问）
- 很小的组件（chunk 的 HTTP 开销可能大于节省）
- 频繁切换的页面（每次切换都会有短暂延迟）

一个常见策略：

```javascript
// 首页和核心功能静态导入
import Home from './views/Home.vue'
import Login from './views/Login.vue'

// 其他页面懒加载
const Dashboard = () => import('./views/Dashboard.vue')
const Settings = () => import('./views/Settings.vue')
const Admin = () => import('./views/Admin.vue')
```

## 与其他功能的交互

懒加载与导航守卫结合时需要注意顺序。组件的 `beforeRouteEnter` 只有在组件加载完成后才会执行：

```javascript
// 执行顺序：
// 1. 全局 beforeEach
// 2. 路由 beforeEnter
// 3. 异步加载组件
// 4. 组件 beforeRouteEnter
// 5. 全局 beforeResolve
// 6. 导航确认
// 7. 全局 afterEach
// 8. 组件 created/mounted
```

如果认证检查放在组件的 `beforeRouteEnter` 中，用户可能先看到组件加载，再被重定向——体验不好。应该把认证检查放在全局守卫或路由级 `beforeEnter` 中。

## 构建优化

现代构建工具提供了更多优化选项：

```javascript
// vite.config.js
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // 把相关路由组件打包在一起
          'user-pages': [
            './src/views/UserList.vue',
            './src/views/UserDetail.vue'
          ],
          // 把大型第三方库单独打包
          'vendor-chart': ['echarts'],
          'vendor-editor': ['monaco-editor']
        }
      }
    }
  }
}
```

这种控制让你可以精确决定代码的分割策略，而不是完全依赖自动分析。

## 本章小结

路由懒加载通过动态 `import()` 实现按需加载，是优化大型 SPA 首屏加载的关键技术。构建工具自动进行代码分割，将每个懒加载组件打包到独立文件。

使用魔法注释可以命名 chunk 和控制分组打包。Prefetch 和 preload 可以进一步优化加载时机。配合 `defineAsyncComponent` 可以处理加载状态和错误。

选择懒加载粒度时要权衡：太细会增加请求数，太粗会降低懒加载效果。核心页面可以静态导入，其他页面按访问频率和大小决定是否懒加载。
