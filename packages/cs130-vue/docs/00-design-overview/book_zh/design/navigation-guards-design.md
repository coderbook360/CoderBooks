# 导航守卫的设计思想

导航守卫是 Vue Router 的核心特性之一。它们提供了在路由切换过程中执行自定义逻辑的能力，实现了拦截器模式在前端路由中的应用。

## 拦截器模式

导航守卫本质上是拦截器。当用户从一个页面导航到另一个页面时，这个过程被分解为多个阶段，每个阶段都可以插入守卫函数。

```javascript
router.beforeEach((to, from) => {
  console.log(`从 ${from.path} 导航到 ${to.path}`)
  // 返回 true 继续导航
  // 返回 false 取消导航
  // 返回路由位置重定向
})
```

这种设计的优势是关注点分离。权限验证、数据预加载、页面埋点等逻辑可以独立编写，不侵入组件代码。

## 守卫的分类

Vue Router 提供了三个层级的守卫：全局守卫、路由独享守卫、组件内守卫。

全局守卫作用于所有路由切换：

```javascript
// 全局前置守卫
router.beforeEach((to, from) => { ... })

// 全局解析守卫
router.beforeResolve((to, from) => { ... })

// 全局后置钩子
router.afterEach((to, from) => { ... })
```

路由独享守卫只作用于特定路由：

```javascript
const routes = [
  {
    path: '/admin',
    component: Admin,
    beforeEnter: (to, from) => {
      // 只在进入 /admin 时执行
    }
  }
]
```

组件内守卫只作用于特定组件：

```javascript
export default {
  beforeRouteEnter(to, from, next) {
    // 进入该组件的路由时调用
  },
  beforeRouteUpdate(to, from) {
    // 路由参数变化，组件复用时调用
  },
  beforeRouteLeave(to, from) {
    // 离开该组件时调用
  }
}
```

这种分层设计让不同粒度的逻辑有合适的存放位置。全局的认证检查放在全局守卫，特定页面的权限检查放在路由守卫，组件的离开确认放在组件内守卫。

## 执行顺序

导航守卫按照特定的顺序执行。理解这个顺序对于正确使用守卫很重要。

当从路由 A 导航到路由 B 时，执行顺序是：

1. 调用 A 组件的 `beforeRouteLeave`
2. 调用全局的 `beforeEach`
3. 调用 B 路由的 `beforeEnter`（如果 B 是新路由）
4. 解析异步路由组件
5. 调用 B 组件的 `beforeRouteEnter`
6. 调用全局的 `beforeResolve`
7. 导航确认
8. 调用全局的 `afterEach`
9. DOM 更新
10. 调用 `beforeRouteEnter` 中传给 next 的回调

这个顺序的设计考虑了几个因素：

离开守卫先于进入守卫执行，让离开确认可以取消整个导航。

`beforeResolve` 在组件解析后执行，此时可以确保组件已加载。

`afterEach` 在导航确认后执行，不能影响导航本身。

## 异步支持

导航守卫支持异步操作。守卫函数可以返回 Promise，Vue Router 会等待 Promise 解决后再继续导航。

```javascript
router.beforeEach(async (to, from) => {
  if (to.meta.requiresAuth) {
    const isLoggedIn = await checkAuthStatus()
    if (!isLoggedIn) {
      return '/login'
    }
  }
})
```

这种设计让数据预加载变得简单：

```javascript
router.beforeResolve(async (to) => {
  if (to.meta.preload) {
    await store.dispatch('preloadData', to.params)
  }
})
```

页面渲染前，数据已经准备好，避免了白屏或加载状态的闪烁。

## 导航控制

守卫函数可以通过返回值控制导航行为：

```javascript
router.beforeEach((to, from) => {
  // 继续导航
  return true
  
  // 取消导航
  return false
  
  // 重定向到另一个路由
  return '/login'
  // 或
  return { name: 'login', query: { redirect: to.fullPath } }
})
```

在 Vue Router 3 中，通过 `next()` 回调控制导航。Vue Router 4 改为使用返回值，这让代码更简洁，也避免了忘记调用 `next()` 导致的死锁问题。

但组件内的 `beforeRouteEnter` 仍然使用回调模式，因为组件实例在此时还不存在：

```javascript
beforeRouteEnter(to, from, next) {
  // 这里不能访问 this
  next(vm => {
    // 在这里可以访问组件实例
    vm.initData()
  })
}
```

## 典型应用场景

导航守卫的常见应用包括：

**权限验证**：检查用户是否有权限访问目标页面。

```javascript
router.beforeEach((to, from) => {
  if (to.meta.requiresAuth && !store.state.isLoggedIn) {
    return {
      path: '/login',
      query: { redirect: to.fullPath }
    }
  }
})
```

**离开确认**：用户编辑表单后导航离开时提示确认。

```javascript
beforeRouteLeave(to, from) {
  if (this.hasUnsavedChanges) {
    const answer = window.confirm('有未保存的更改，确定离开吗？')
    if (!answer) return false
  }
}
```

**页面埋点**：记录用户的页面访问行为。

```javascript
router.afterEach((to, from) => {
  analytics.trackPageView(to.fullPath)
})
```

**加载状态**：显示全局的加载指示器。

```javascript
router.beforeEach((to, from) => {
  NProgress.start()
})

router.afterEach(() => {
  NProgress.done()
})
```

## 与 Composition API 的集成

在 Composition API 中，可以使用函数式的守卫：

```javascript
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'

export default {
  setup() {
    onBeforeRouteLeave((to, from) => {
      // ...
    })
    
    onBeforeRouteUpdate((to, from) => {
      // ...
    })
  }
}
```

这些函数可以在 composables 中使用，实现守卫逻辑的复用：

```javascript
// composables/useUnsavedChanges.js
export function useUnsavedChanges(hasChanges) {
  onBeforeRouteLeave(() => {
    if (hasChanges.value) {
      return window.confirm('有未保存的更改，确定离开吗？')
    }
  })
}
```

## 设计思考

导航守卫的设计体现了几个原则：

**分层职责**：全局守卫处理应用级逻辑，路由守卫处理页面级逻辑，组件守卫处理组件级逻辑。

**可预测顺序**：守卫的执行顺序是确定的，这让复杂的守卫组合行为可以预测。

**非侵入性**：守卫不需要修改组件代码，通过配置和全局注册即可生效。

**渐进式使用**：简单应用不需要守卫，随着需求增长逐步引入。

这种设计让路由切换的控制既强大又可管理。
