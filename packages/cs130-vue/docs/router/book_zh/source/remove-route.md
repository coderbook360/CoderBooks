# removeRoute 移除路由

`removeRoute` 是 `addRoute` 的逆操作，用于从路由器中移除已注册的路由。在实现权限动态路由、模块卸载等场景时非常有用。

## API 形式

```typescript
router.removeRoute(name: RouteRecordName): void
```

只能通过路由名称移除。这意味着要动态移除的路由必须有名称。

## Router 中的包装

```typescript
function removeRoute(name: RouteRecordName): void {
  const recordMatcher = matcher.getRecordMatcher(name)
  if (recordMatcher) {
    matcher.removeRoute(recordMatcher)
  }
}
```

先通过名称查找匹配器，然后调用 matcher 的 `removeRoute`。

如果找不到对应的路由，静默返回，不抛出错误。这简化了调用方的逻辑——不需要先检查路由是否存在。

## Matcher 中的实现

```typescript
function removeRoute(matcherRef: RouteRecordMatcher): void {
  // 从 matchers 数组移除
  const index = matchers.indexOf(matcherRef)
  if (index > -1) {
    matchers.splice(index, 1)
  }

  // 从命名索引移除
  if (matcherRef.record.name) {
    matcherMap.delete(matcherRef.record.name)
  }

  // 递归移除子路由
  matcherRef.children.forEach(child => removeRoute(child))

  // 移除别名
  matcherRef.alias.forEach(alias => removeRoute(alias))
}
```

移除操作包括：

1. 从 `matchers` 数组中删除
2. 从 `matcherMap` 命名索引中删除
3. 递归移除所有子路由
4. 移除所有别名路由

## 子路由的处理

当移除一个父路由时，它的所有子路由也会被移除：

```typescript
// 添加嵌套路由
router.addRoute({
  name: 'admin',
  path: '/admin',
  component: AdminLayout,
  children: [
    { name: 'admin-dashboard', path: '', component: Dashboard },
    { name: 'admin-users', path: 'users', component: Users }
  ]
})

// 移除父路由会同时移除所有子路由
router.removeRoute('admin')
// admin-dashboard 和 admin-users 也被移除了
```

这是直觉正确的行为——父路由不存在了，子路由自然也不应该存在。

## 别名的处理

```typescript
matcherRef.alias.forEach(alias => removeRoute(alias))
```

别名路由与主路由是关联的。移除主路由时，所有别名也会被移除。

```typescript
router.addRoute({
  name: 'user',
  path: '/user',
  alias: ['/member', '/profile'],
  component: User
})

// 移除会同时移除所有别名
router.removeRoute('user')
// /user、/member、/profile 都不再可访问
```

但反过来不行——你不能单独移除一个别名。别名没有自己的名称（`aliasOf` 指向主记录），不能被直接移除。

## 与 addRoute 返回值的对比

`addRoute` 返回一个移除函数，这是另一种移除路由的方式：

```typescript
// 方式一：使用返回的移除函数
const remove = router.addRoute({ name: 'user', path: '/user', component: User })
remove()  // 移除

// 方式二：使用 removeRoute
router.addRoute({ name: 'user', path: '/user', component: User })
router.removeRoute('user')  // 移除
```

两种方式效果相同。使用哪种取决于你的代码组织：

- 如果在同一作用域添加和移除，返回值更方便
- 如果在不同地方移除，`removeRoute` 更灵活

## 移除后的影响

**当前路由**：

如果用户正在访问被移除的路由，当前页面不会立即变化。但如果触发导航（包括刷新），会找不到路由。

```typescript
// 用户在 /admin
router.removeRoute('admin')
// 页面仍然显示 admin 内容

router.push('/admin')  // 导航失败，路由不存在
```

**RouterLink**：

指向已移除路由的 RouterLink 会失效：

```vue
<router-link to="/admin">Admin</router-link>
<!-- 点击后导航失败 -->
```

**hasRoute 检查**：

```typescript
router.hasRoute('admin')  // false
```

## 实际应用

**登出时移除权限路由**：

```typescript
// 存储添加的路由移除函数
const routeRemovers: (() => void)[] = []

async function onLogin(user) {
  // 添加权限路由
  const routes = getRoutesForRole(user.role)
  routes.forEach(route => {
    const remove = router.addRoute(route)
    routeRemovers.push(remove)
  })
}

function onLogout() {
  // 移除所有动态添加的路由
  routeRemovers.forEach(remove => remove())
  routeRemovers.length = 0
  
  router.push('/login')
}
```

**模块卸载**：

```typescript
class Module {
  private removeRoutes: (() => void)[] = []

  mount(router: Router) {
    this.routes.forEach(route => {
      const remove = router.addRoute(route)
      this.removeRoutes.push(remove)
    })
  }

  unmount() {
    this.removeRoutes.forEach(remove => remove())
    this.removeRoutes = []
  }
}
```

## 注意事项

**命名要求**：

只有命名路由才能被 `removeRoute` 移除。如果需要动态管理路由，务必给它们命名。

```typescript
// 这个路由无法被 removeRoute 移除
router.addRoute({ path: '/temp', component: Temp })

// 这个可以
router.addRoute({ name: 'temp', path: '/temp', component: Temp })
router.removeRoute('temp')
```

**不存在时静默**：

```typescript
router.removeRoute('not-exists')  // 不会报错
```

**嵌套路由的移除**：

如果只想移除子路由而保留父路由，需要给子路由命名：

```typescript
router.addRoute({
  name: 'admin',
  path: '/admin',
  component: AdminLayout,
  children: [
    { name: 'admin-users', path: 'users', component: Users }
  ]
})

// 只移除子路由
router.removeRoute('admin-users')
// /admin 仍然存在，只是 /admin/users 不存在了
```

## 本章小结

`removeRoute` 通过名称移除路由：

1. 查找命名匹配器
2. 从 matchers 数组和 matcherMap 中删除
3. 递归移除子路由和别名

只有命名路由才能被移除。`addRoute` 返回的移除函数是另一种便捷的移除方式。

移除后不会影响当前正在显示的页面，但后续导航会失效。在权限路由和模块化场景中，配合 `addRoute` 使用可以实现灵活的路由管理。
