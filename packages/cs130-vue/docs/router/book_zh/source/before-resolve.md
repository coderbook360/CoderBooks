# beforeResolve 守卫

`beforeResolve` 是全局守卫，在所有组件内守卫和异步路由组件解析之后、导航确认之前触发。

## 执行时机

```
beforeRouteLeave (组件)
        ↓
  beforeEach (全局)
        ↓
beforeRouteUpdate (组件)
        ↓
  beforeEnter (路由)
        ↓
解析异步组件 ← 关键：此时组件已加载
        ↓
beforeRouteEnter (组件)
        ↓
beforeResolve (全局) ← 这里
        ↓
导航确认
        ↓
  afterEach (全局)
```

## 与 beforeEach 的区别

`beforeResolve` 在异步组件解析之后执行，这意味着：

1. 可以确保所有组件都已加载
2. 可以获取组件定义的 meta 信息
3. 适合做最终的导航确认

```typescript
// beforeEach 时，异步组件尚未加载
router.beforeEach((to) => {
  // to.matched[0].components.default 可能是函数（未解析）
})

// beforeResolve 时，组件已加载
router.beforeResolve((to) => {
  // to.matched[0].components.default 是组件对象
})
```

## 源码实现

```typescript
// createRouter.ts
const beforeResolveGuards = useCallbacks<NavigationGuardWithThis<undefined>>()

function beforeResolve(guard: NavigationGuardWithThis<undefined>): () => void {
  return beforeResolveGuards.add(guard)
}

// navigate 函数中
function navigate(to, from) {
  return runGuardQueue(leaveGuards)
    .then(() => runGuardQueue(beforeEachGuards))
    .then(() => runGuardQueue(updateGuards))
    .then(() => runGuardQueue(beforeEnterGuards))
    .then(() => resolveAsyncComponents())
    .then(() => runGuardQueue(beforeRouteEnterGuards))
    .then(() => {
      // 最后执行 beforeResolve
      const guards = []
      for (const guard of beforeResolveGuards.list()) {
        guards.push(guardToPromiseFn(guard, to, from))
      }
      return runGuardQueue(guards)
    })
}
```

## 典型使用场景

**数据预取确认**：

```typescript
router.beforeResolve(async (to) => {
  // 此时组件已加载，可以调用组件的静态方法
  const component = to.matched[0]?.components?.default

  if (component?.fetchData) {
    try {
      await component.fetchData(to.params)
    } catch (error) {
      // 数据获取失败，阻止导航
      return false
    }
  }
})
```

**加载指示器**：

```typescript
router.beforeEach(() => {
  showLoadingIndicator()
})

router.beforeResolve(() => {
  // 所有组件加载完成后隐藏
  hideLoadingIndicator()
})
```

**最终权限检查**：

```typescript
router.beforeResolve((to) => {
  // 组件可能定义了更细粒度的权限
  const component = to.matched[0]?.components?.default
  
  if (component?.permissions) {
    if (!hasPermissions(component.permissions)) {
      return '/403'
    }
  }
})
```

## 代码示例

```typescript
// 完整的导航守卫设置
const router = createRouter({
  history: createWebHistory(),
  routes
})

// 1. 权限检查（早期）
router.beforeEach((to) => {
  if (to.meta.requiresAuth && !isLoggedIn()) {
    return '/login'
  }
})

// 2. 确保数据加载（组件解析后）
router.beforeResolve(async (to) => {
  // 检查路由是否需要预取数据
  const fetchList = to.matched
    .map(record => record.components?.default?.beforeRouteData)
    .filter(Boolean)

  if (fetchList.length) {
    try {
      await Promise.all(fetchList.map(fn => fn(to)))
    } catch (error) {
      console.error('Data fetch failed:', error)
      return false
    }
  }
})

// 3. 记录日志（导航完成后）
router.afterEach((to, from) => {
  analytics.track('page_view', { path: to.path })
})
```

## 返回值

与 `beforeEach` 相同：

```typescript
// 继续导航
router.beforeResolve(() => {
  return true
})

// 阻止导航
router.beforeResolve(() => {
  return false
})

// 重定向
router.beforeResolve(() => {
  return '/other-page'
})
```

## 何时使用 beforeResolve

| 场景 | beforeEach | beforeResolve |
|------|------------|---------------|
| 权限验证 | ✅ 推荐 | 可用 |
| 进度条开始 | ✅ 推荐 | 太晚 |
| 数据预取 | 可用 | ✅ 推荐 |
| 组件权限 | 组件未加载 | ✅ 推荐 |

## 本章小结

`beforeResolve` 是导航守卫的最后一道关卡：

1. **执行时机**：在异步组件解析之后
2. **组件可用**：可以访问已加载的组件定义
3. **使用场景**：数据预取确认、组件级权限检查
4. **返回值**：与 `beforeEach` 相同

当需要在组件加载完成后做最终确认时，使用 `beforeResolve`。
