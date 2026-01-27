# 与状态管理集成

路由和状态管理是 SPA 的两大支柱。路由决定当前展示什么页面，状态管理维护应用的数据。两者经常需要协作——根据用户状态决定路由跳转，根据路由变化更新状态，或在导航时持久化某些数据。

## 路由守卫中访问 Store

最常见的集成场景是在导航守卫中检查用户认证状态：

```javascript
import { createRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  // ...
})

router.beforeEach((to, from) => {
  const authStore = useAuthStore()
  
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
})
```

这里有一个时机问题需要注意。`useAuthStore()` 需要在 Pinia 实例创建之后调用。在 Vue 应用的典型启动流程中，Pinia 在 `app.use(pinia)` 时创建，而路由守卫可能在这之前就注册了。

解决方案是确保守卫注册发生在应用完全初始化之后：

```javascript
// main.js
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter } from 'vue-router'

const app = createApp(App)
const pinia = createPinia()
const router = createRouter({ /* ... */ })

app.use(pinia)
app.use(router)

// 在这之后注册守卫
import { useAuthStore } from '@/stores/auth'

router.beforeEach((to, from) => {
  const authStore = useAuthStore()
  // ...
})

app.mount('#app')
```

或者将 store 的创建延迟到守卫执行时：

```javascript
// router/index.js
let authStore = null

router.beforeEach((to, from) => {
  // 延迟获取 store
  if (!authStore) {
    authStore = useAuthStore()
  }
  
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'login' }
  }
})
```

## 路由参数与 Store 同步

有时候需要在路由参数变化时更新 store，或者反过来：

```javascript
// 路由 → Store
router.afterEach((to) => {
  const userStore = useUserStore()
  
  if (to.params.userId) {
    userStore.loadUser(to.params.userId)
  }
})
```

反向同步（Store → 路由）需要更谨慎，避免循环：

```javascript
// Store 内部
const userStore = defineStore('user', {
  state: () => ({
    currentUserId: null
  }),
  
  actions: {
    setCurrentUser(id) {
      if (this.currentUserId !== id) {
        this.currentUserId = id
        // 更新路由（如果当前路由需要这个参数）
        if (router.currentRoute.value.name === 'user-detail') {
          router.replace({ params: { userId: id } })
        }
      }
    }
  }
})
```

`replace` 而不是 `push`，避免创建额外的历史记录。

## 路由状态的 Store 化

有些应用选择将路由状态完全放入 store，实现单一数据源：

```javascript
// stores/router.js
export const useRouterStore = defineStore('router', {
  state: () => ({
    currentRoute: null,
    history: []
  }),
  
  actions: {
    sync(route) {
      this.currentRoute = {
        path: route.path,
        params: route.params,
        query: route.query,
        meta: route.meta
      }
    }
  }
})

// 在 afterEach 中同步
router.afterEach((to) => {
  const routerStore = useRouterStore()
  routerStore.sync(to)
})
```

这样组件可以从 store 获取路由信息，而不是直接使用 `useRoute()`。好处是可以在 store 的 action 中访问路由状态，坏处是增加了一层间接性。

通常不推荐这种做法，除非有特殊需求（如需要在 Vuex devtools 中追踪路由变化）。`useRoute()` 本身就是响应式的，足以满足大多数场景。

## 等待 Store 初始化

应用启动时可能需要从服务器加载用户信息，在此之前不应该进行路由守卫检查：

```javascript
// stores/auth.js
export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    initialized: false
  }),
  
  actions: {
    async initialize() {
      try {
        const response = await api.getCurrentUser()
        this.user = response.data
      } catch {
        this.user = null
      } finally {
        this.initialized = true
      }
    }
  },
  
  getters: {
    isAuthenticated: (state) => !!state.user
  }
})
```

```javascript
// router/index.js
router.beforeEach(async (to, from) => {
  const authStore = useAuthStore()
  
  // 等待初始化完成
  if (!authStore.initialized) {
    await authStore.initialize()
  }
  
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'login' }
  }
})
```

第一次导航会等待 `initialize()` 完成，后续导航直接使用缓存的状态。

如果初始化很慢，可以先显示加载状态：

```javascript
// main.js
const app = createApp(App)
app.use(pinia)
app.use(router)

// 初始化 store
const authStore = useAuthStore()
await authStore.initialize()

// 所有准备就绪后再挂载
app.mount('#app')
```

这样用户在初始化完成前看到的是空白页或 loading，而不是闪烁的重定向。

## 权限路由的动态添加

有些应用根据用户角色动态添加路由：

```javascript
// stores/auth.js
export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    dynamicRoutesAdded: false
  }),
  
  actions: {
    async login(credentials) {
      const response = await api.login(credentials)
      this.user = response.data
      
      // 根据角色添加路由
      this.addDynamicRoutes()
    },
    
    addDynamicRoutes() {
      if (this.dynamicRoutesAdded) return
      
      if (this.user.role === 'admin') {
        router.addRoute({
          path: '/admin',
          component: () => import('@/views/Admin.vue'),
          meta: { requiresAdmin: true }
        })
      }
      
      this.dynamicRoutesAdded = true
    },
    
    logout() {
      this.user = null
      // 可以选择移除动态路由
      // 或者刷新页面重置状态
      window.location.href = '/login'
    }
  }
})
```

动态添加的路由在页面刷新后会丢失。如果应用需要刷新后保持状态，需要在初始化时重新添加：

```javascript
async initialize() {
  const token = localStorage.getItem('token')
  if (token) {
    try {
      const response = await api.getCurrentUser()
      this.user = response.data
      this.addDynamicRoutes()
    } catch {
      localStorage.removeItem('token')
    }
  }
  this.initialized = true
}
```

## 导航失败的状态处理

导航可能因为守卫拦截或其他原因失败，store 可能需要知道这些信息：

```javascript
// stores/ui.js
export const useUIStore = defineStore('ui', {
  state: () => ({
    navigationError: null,
    isNavigating: false
  }),
  
  actions: {
    setNavigating(value) {
      this.isNavigating = value
    },
    
    setNavigationError(error) {
      this.navigationError = error
    },
    
    clearNavigationError() {
      this.navigationError = null
    }
  }
})
```

```javascript
// router/index.js
router.beforeEach((to, from) => {
  const uiStore = useUIStore()
  uiStore.setNavigating(true)
  uiStore.clearNavigationError()
})

router.afterEach(() => {
  const uiStore = useUIStore()
  uiStore.setNavigating(false)
})

router.onError((error) => {
  const uiStore = useUIStore()
  uiStore.setNavigating(false)
  uiStore.setNavigationError(error.message)
})
```

组件可以根据 `isNavigating` 显示加载指示器，根据 `navigationError` 显示错误提示。

## 表单数据的路由保护

用户填写表单时离开页面，可能需要提示保存：

```javascript
// stores/form.js
export const useFormStore = defineStore('form', {
  state: () => ({
    isDirty: false,
    formData: {}
  }),
  
  actions: {
    setDirty(value) {
      this.isDirty = value
    },
    
    updateField(key, value) {
      this.formData[key] = value
      this.isDirty = true
    },
    
    reset() {
      this.formData = {}
      this.isDirty = false
    }
  }
})
```

```javascript
// router/index.js
router.beforeEach((to, from) => {
  const formStore = useFormStore()
  
  if (formStore.isDirty) {
    const confirmed = window.confirm('您有未保存的更改，确定要离开吗？')
    if (!confirmed) {
      return false
    }
    formStore.reset()
  }
})
```

更好的方式是使用组件级守卫 `onBeforeRouteLeave`，可以提供更细粒度的控制。

## 本章小结

路由与状态管理的集成核心在于两点：在守卫中安全地访问 store，以及在 store 中适当地触发导航。

访问 store 时注意初始化时机，确保 Pinia 已经就绪。使用 `initialized` 标志来等待异步初始化完成。动态路由需要在初始化时根据用户角色重新添加。

避免过度设计——不是所有路由信息都需要放入 store。`useRoute()` 本身是响应式的，直接使用通常就够了。只有当需要在非组件代码中访问路由状态，或需要额外的追踪能力时，才考虑同步到 store。

路由和状态管理各司其职：路由管理 URL 和导航，store 管理应用数据。两者协作但保持独立，是保持代码清晰的关键。
