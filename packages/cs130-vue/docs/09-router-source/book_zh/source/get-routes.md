# getRoutes 获取路由列表

`getRoutes` 返回当前注册的所有路由记录。这是一个查询方法，常用于调试、权限检查、菜单生成等场景。

## API 形式

```typescript
router.getRoutes(): RouteRecordNormalized[]
```

返回规范化后的路由记录数组。

## Router 中的实现

```typescript
function getRoutes(): RouteRecordNormalized[] {
  return matcher.getRoutes().map(routeMatcher => routeMatcher.record)
}
```

从 matcher 获取所有匹配器，然后提取出路由记录。

## Matcher 中的实现

```typescript
function getRoutes(): RouteRecordMatcher[] {
  return matchers
}
```

直接返回 `matchers` 数组。这个数组按优先级排序，存储了所有已注册的路由匹配器。

注意返回的是内部数组的引用。虽然可以直接修改（Vue Router 没有做防护），但这样做会破坏内部状态。应该将返回值视为只读。

## RouteRecordNormalized 结构

返回的每个元素是规范化后的路由记录：

```typescript
interface RouteRecordNormalized {
  path: string
  redirect?: RouteRecordRedirect
  name?: RouteRecordName
  components: Record<string, Component> | null
  children: RouteRecordRaw[]
  meta: RouteMeta
  props: Record<string, _RouteRecordProps>
  beforeEnter?: NavigationGuardWithThis<undefined>
  leaveGuards: Set<NavigationGuard>
  updateGuards: Set<NavigationGuard>
  enterCallbacks: Record<string, NavigationGuardNextCallback[]>
  instances: Record<string, ComponentPublicInstance | undefined | null>
  aliasOf?: RouteRecordNormalized
}
```

这比用户传入的 `RouteRecordRaw` 包含更多信息：

- `components` 替代了 `component`
- 添加了运行时状态（`instances`、守卫集合等）
- 路径已经完全解析（包含父路径）

## 返回顺序

返回的数组按匹配优先级排序：

```typescript
const routes = [
  { path: '/users/create', component: CreateUser },
  { path: '/users/:id', component: UserDetail },
  { path: '/users', component: UserList },
  { path: '/', component: Home },
  { path: '/:pathMatch(.*)*', component: NotFound }
]

router.getRoutes().map(r => r.path)
// 可能是：['/users/create', '/users/:id', '/users', '/', '/:pathMatch(.*)*']
```

静态路径优先于动态路径，具体路径优先于通配符。这个顺序与匹配时的检查顺序一致。

## 包含别名和子路由

`getRoutes` 返回所有匹配器对应的记录，包括别名和嵌套路由：

```typescript
router.addRoute({
  name: 'user',
  path: '/user',
  alias: '/profile',
  component: User,
  children: [
    { path: 'settings', component: Settings }
  ]
})

const routes = router.getRoutes()
// 包含：/user, /profile（别名）, /user/settings
```

如果只想获取非别名的主路由，需要过滤：

```typescript
const mainRoutes = router.getRoutes().filter(r => !r.aliasOf)
```

## 实际应用

**调试路由配置**：

```typescript
// 在开发工具中查看所有路由
console.table(
  router.getRoutes().map(r => ({
    name: r.name,
    path: r.path,
    hasComponent: !!r.components?.default
  }))
)
```

**生成导航菜单**：

```typescript
function buildMenu() {
  return router.getRoutes()
    .filter(route => {
      // 过滤出需要显示在菜单中的路由
      return route.meta.showInMenu && !route.aliasOf
    })
    .map(route => ({
      label: route.meta.title,
      path: route.path,
      icon: route.meta.icon
    }))
}
```

**权限检查**：

```typescript
function hasAccessTo(path: string): boolean {
  const route = router.getRoutes().find(r => r.path === path)
  if (!route) return false
  
  const requiredRole = route.meta.requiredRole
  if (!requiredRole) return true
  
  return currentUser.roles.includes(requiredRole)
}
```

**路由数量统计**：

```typescript
function getRouteStats() {
  const routes = router.getRoutes()
  return {
    total: routes.length,
    named: routes.filter(r => r.name).length,
    withGuards: routes.filter(r => r.beforeEnter).length,
    lazy: routes.filter(r => {
      const comp = r.components?.default
      return typeof comp === 'function'
    }).length
  }
}
```

## hasRoute 的关系

除了 `getRoutes`，还有 `hasRoute` 用于检查特定命名路由是否存在：

```typescript
function hasRoute(name: RouteRecordName): boolean {
  return !!matcher.getRecordMatcher(name)
}
```

两者的区别：

- `hasRoute(name)`：检查特定命名路由，O(1) 复杂度
- `getRoutes()`：获取所有路由，然后手动查找

```typescript
// 推荐：直接使用 hasRoute
if (router.hasRoute('admin')) {
  // ...
}

// 不推荐：遍历所有路由
if (router.getRoutes().some(r => r.name === 'admin')) {
  // ...
}
```

## getRecordMatcher

Matcher 还提供了 `getRecordMatcher` 方法，用于获取特定命名路由的匹配器：

```typescript
function getRecordMatcher(name: RouteRecordName): RouteRecordMatcher | undefined {
  return matcherMap.get(name)
}
```

这个方法主要在内部使用（如 `addRoute` 查找父路由），但也暴露在 Router API 中：

```typescript
// 不是标准 API，但可以访问
const matcher = router.getRecordMatcher('user')
```

实际上 Vue Router 4 没有在 Router 类型中暴露这个方法，它是 Matcher 的内部方法。如果需要按名称查找路由记录，可以：

```typescript
const route = router.getRoutes().find(r => r.name === 'user')
```

## 性能考虑

`getRoutes` 每次调用都会创建新数组（通过 `map`）。对于大量路由的应用，频繁调用可能影响性能。如果需要多次使用，可以缓存结果：

```typescript
// 缓存路由列表
let cachedRoutes: RouteRecordNormalized[] | null = null

function getCachedRoutes() {
  if (!cachedRoutes) {
    cachedRoutes = router.getRoutes()
  }
  return cachedRoutes
}

// 路由变化时清除缓存
router.afterEach(() => {
  cachedRoutes = null
})
```

但对于大多数应用，这种优化是不必要的。路由数量通常在几十到几百级别，`map` 操作的开销可以忽略。

## 本章小结

`getRoutes` 返回所有已注册路由的规范化记录：

1. 从 matcher 获取匹配器数组
2. 提取每个匹配器的路由记录
3. 按优先级排序返回
4. 包含别名和嵌套路由

常用于调试、菜单生成、权限检查等场景。对于检查特定命名路由，使用 `hasRoute` 更高效。返回值应视为只读，不要直接修改。
