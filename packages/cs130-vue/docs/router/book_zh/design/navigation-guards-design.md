# 导航守卫设计思想

导航守卫是 Vue Router 最强大的特性之一。它让你能够在导航发生前后介入，决定是否允许导航、重定向到其他页面，或者在导航完成后执行某些操作。认证、权限检查、数据预加载、页面追踪——这些常见需求都依赖导航守卫实现。

## 守卫的本质：导航的生命周期

如果把一次导航看作一个生命周期，守卫就是这个生命周期中的钩子。从用户点击链接到新页面渲染完成，中间经过多个阶段，每个阶段都可以插入守卫代码。

Vue Router 的设计哲学是：导航是异步的，守卫可以是异步的，整个流程可以被打断、重定向或取消。这种设计给了开发者极大的控制力。

## 守卫的类型与触发时机

Vue Router 提供了三个层级的守卫：

全局守卫作用于所有导航。`beforeEach` 在每次导航开始时调用，`beforeResolve` 在所有组件内守卫和异步路由组件解析完之后调用，`afterEach` 在导航确认后调用。

路由独享守卫定义在路由配置中，只对特定路由生效。`beforeEnter` 在进入该路由时调用。

组件内守卫定义在组件内，与组件的生命周期关联。`beforeRouteEnter` 在导航确认前调用（此时组件尚未创建），`beforeRouteUpdate` 在当前路由改变但组件被复用时调用，`beforeRouteLeave` 在离开当前路由时调用。

这种层级设计让你可以在合适的粒度上定义守卫逻辑。

## 全局守卫：应用级别的控制

`beforeEach` 是最常用的守卫，用于实现全局的访问控制：

```javascript
router.beforeEach((to, from) => {
  // to: 即将进入的目标路由
  // from: 当前导航正要离开的路由
  
  // 返回值决定导航行为
  // true 或 undefined: 继续导航
  // false: 取消导航
  // 路由地址: 重定向到该地址
})
```

一个典型的认证守卫：

```javascript
router.beforeEach((to, from) => {
  const isAuthenticated = checkAuth()
  
  // 需要认证的路由
  if (to.meta.requiresAuth && !isAuthenticated) {
    // 重定向到登录页，记住原目标
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  
  // 已登录用户访问登录页，重定向到首页
  if (to.name === 'login' && isAuthenticated) {
    return { name: 'home' }
  }
})
```

`beforeResolve` 在所有组件内守卫和异步组件加载完成后、导航确认前调用。这是获取数据或执行其他操作的最后机会：

```javascript
router.beforeResolve(async to => {
  // 确保关键数据在页面渲染前已加载
  if (to.meta.requiresData) {
    await store.dispatch('fetchPageData', to.params.id)
  }
})
```

`afterEach` 在导航确认后调用，无法影响导航本身，适合做一些后置操作：

```javascript
router.afterEach((to, from) => {
  // 页面追踪
  analytics.trackPageView(to.fullPath)
  
  // 更新文档标题
  document.title = to.meta.title || 'My App'
  
  // 滚动到顶部
  window.scrollTo(0, 0)
})
```

## 路由独享守卫

有些守卫逻辑只与特定路由相关，放在全局守卫里需要额外的条件判断。路由独享守卫让配置更加内聚：

```javascript
const routes = [
  {
    path: '/admin',
    component: AdminPanel,
    beforeEnter: (to, from) => {
      if (!isAdmin()) {
        return { name: 'forbidden' }
      }
    }
  }
]
```

`beforeEnter` 可以是一个函数，也可以是函数数组（按顺序执行）：

```javascript
{
  path: '/admin',
  component: AdminPanel,
  beforeEnter: [checkAuth, checkAdmin, logAccess]
}
```

这种模式让守卫逻辑可以复用：

```javascript
// 可复用的守卫
function checkAuth(to, from) {
  if (!isAuthenticated()) {
    return { name: 'login' }
  }
}

function checkAdmin(to, from) {
  if (!isAdmin()) {
    return { name: 'forbidden' }
  }
}

// 组合使用
{ path: '/admin', beforeEnter: [checkAuth, checkAdmin] }
{ path: '/settings', beforeEnter: [checkAuth] }
```

## 组件内守卫

组件内守卫让组件可以控制自己的导航行为。

`beforeRouteEnter` 在导航确认前调用，此时组件实例还没创建，所以不能访问 `this`。如果需要访问组件实例，可以通过 `next` 回调：

```javascript
export default {
  beforeRouteEnter(to, from, next) {
    // 不能访问 this
    fetchData(to.params.id).then(data => {
      next(vm => {
        // 通过 vm 访问组件实例
        vm.setData(data)
      })
    })
  }
}
```

使用 Composition API 时，可以用 `onBeforeRouteLeave` 和 `onBeforeRouteUpdate`，但没有 `onBeforeRouteEnter`（因为组件尚未创建）：

```javascript
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'

export default {
  setup() {
    onBeforeRouteLeave((to, from) => {
      // 检查未保存的更改
      if (hasUnsavedChanges.value) {
        const answer = window.confirm('有未保存的更改，确定离开？')
        if (!answer) return false
      }
    })
    
    onBeforeRouteUpdate((to, from) => {
      // 路由参数变化时重新加载数据
      fetchData(to.params.id)
    })
  }
}
```

## 完整的导航解析流程

当导航被触发时，守卫按以下顺序调用：

1. 触发导航
2. 在失活的组件里调用 `beforeRouteLeave` 守卫
3. 调用全局的 `beforeEach` 守卫
4. 在重用的组件里调用 `beforeRouteUpdate` 守卫
5. 在路由配置里调用 `beforeEnter`
6. 解析异步路由组件
7. 在被激活的组件里调用 `beforeRouteEnter`
8. 调用全局的 `beforeResolve` 守卫
9. 导航被确认
10. 调用全局的 `afterEach` 钩子
11. 触发 DOM 更新
12. 调用 `beforeRouteEnter` 守卫中传给 `next` 的回调函数

理解这个顺序对于调试和设计守卫逻辑很重要。

## 异步守卫

守卫可以是异步的。返回一个 Promise，或者使用 async/await：

```javascript
router.beforeEach(async (to, from) => {
  // 等待认证状态确认
  await store.dispatch('checkAuth')
  
  if (to.meta.requiresAuth && !store.state.isAuthenticated) {
    return { name: 'login' }
  }
})
```

这让守卫可以执行异步操作，比如检查服务器端的认证状态、预加载数据等。

## 导航失败的处理

守卫取消导航或重定向时，原来的导航就"失败"了。可以捕获这些失败：

```javascript
router.push('/admin').catch(err => {
  if (isNavigationFailure(err, NavigationFailureType.aborted)) {
    console.log('导航被取消')
  } else if (isNavigationFailure(err, NavigationFailureType.duplicated)) {
    console.log('导航到相同位置')
  }
})
```

或者在 `afterEach` 中检查：

```javascript
router.afterEach((to, from, failure) => {
  if (failure) {
    console.log('导航失败:', failure)
  }
})
```

## 设计原则

设计守卫时，有几个原则值得遵循。

单一职责。每个守卫函数做一件事。认证检查是一个守卫，权限检查是另一个守卫，可以组合使用。

避免副作用。守卫应该是纯粹的检查逻辑，尽量避免在守卫中修改状态。数据加载可以在 `beforeResolve` 中做，但要小心处理错误。

快速失败。认证相关的检查放在最前面。如果用户未登录，没必要执行后续的权限检查或数据加载。

优雅降级。考虑网络错误等异常情况。如果认证检查失败，是拒绝访问还是允许继续？

## 本章小结

导航守卫让你完全控制导航的生命周期。通过全局、路由级和组件级三种守卫，可以在合适的粒度上实现访问控制、数据预加载、页面追踪等功能。

守卫可以是同步或异步的，可以取消导航或重定向到其他页面。理解守卫的执行顺序对于正确设计守卫逻辑至关重要。

在实际项目中，认证守卫几乎是必需的。结合路由元信息（meta），可以灵活地标记哪些路由需要什么级别的访问控制。
