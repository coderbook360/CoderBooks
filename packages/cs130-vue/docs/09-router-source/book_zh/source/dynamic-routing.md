# 动态路由实现

Vue Router 支持在运行时添加和删除路由，适用于权限控制、模块化加载等场景。

## API 概览

```typescript
// 添加路由
router.addRoute(route: RouteRecordRaw): () => void
router.addRoute(parentName: string, route: RouteRecordRaw): () => void

// 删除路由
router.removeRoute(name: string): void

// 检查路由
router.hasRoute(name: string): boolean

// 获取所有路由
router.getRoutes(): RouteRecordNormalized[]
```

## addRoute 实现

```typescript
function addRoute(
  parentOrRoute: RouteRecordName | RouteRecordRaw,
  route?: RouteRecordRaw
): () => void {
  let parent: RouteRecordMatcher | undefined
  let record: RouteRecordRaw

  if (isRouteName(parentOrRoute)) {
    // addRoute('parent', route)
    parent = matcher.getRecordMatcher(parentOrRoute)
    record = route!
  } else {
    // addRoute(route)
    record = parentOrRoute
  }

  // 添加到 matcher
  return matcher.addRoute(record, parent)
}
```

## Matcher.addRoute

```typescript
function addRoute(
  record: RouteRecordRaw,
  parent?: RouteRecordMatcher,
  originalRecord?: RouteRecordMatcher
): () => void {
  // 规范化路由记录
  const normalizedRecord = normalizeRouteRecord(record)
  
  // 处理嵌套路径
  if (parent) {
    normalizedRecord.path = parent.record.path + 
      (normalizedRecord.path.startsWith('/') ? '' : '/') + 
      normalizedRecord.path
  }

  // 创建匹配器
  const matcher = createRouteRecordMatcher(normalizedRecord, parent)

  // 处理别名
  if ('alias' in record) {
    const aliases = Array.isArray(record.alias) ? record.alias : [record.alias]
    for (const alias of aliases) {
      addRoute(
        { ...record, path: alias, aliasOf: matcher.record },
        parent,
        matcher
      )
    }
  }

  // 添加到匹配器列表
  insertMatcher(matcher)

  // 添加到命名索引
  if (matcher.record.name) {
    matcherMap.set(matcher.record.name, matcher)
  }

  // 处理子路由
  if (record.children) {
    for (const child of record.children) {
      addRoute(child, matcher)
    }
  }

  // 返回删除函数
  return () => {
    removeRoute(normalizedRecord.name!)
  }
}
```

## insertMatcher

按优先级插入：

```typescript
function insertMatcher(matcher: RouteRecordMatcher) {
  let i = 0
  
  while (
    i < matchers.length &&
    comparePathParserScore(matcher, matchers[i]) >= 0
  ) {
    i++
  }
  
  matchers.splice(i, 0, matcher)
}
```

确保更具体的路由排在前面。

## removeRoute 实现

```typescript
function removeRoute(name: RouteRecordName): void {
  const matcher = matcherMap.get(name)
  
  if (matcher) {
    // 从命名索引删除
    matcherMap.delete(name)
    
    // 从匹配器列表删除
    const index = matchers.indexOf(matcher)
    if (index > -1) {
      matchers.splice(index, 1)
    }
    
    // 删除子路由
    matcher.children.forEach(child => {
      removeRoute(child.record.name!)
    })
    
    // 删除别名
    matcher.alias.forEach(alias => {
      removeRoute(alias.record.name!)
    })
  }
}
```

## 权限路由示例

```typescript
// 基础路由
const publicRoutes = [
  { path: '/login', component: Login },
  { path: '/home', component: Home }
]

const router = createRouter({
  history: createWebHistory(),
  routes: publicRoutes
})

// 登录后添加权限路由
async function setupRoutes(permissions: string[]) {
  const routes = await fetchRoutesByPermissions(permissions)
  
  routes.forEach(route => {
    router.addRoute(route)
  })
  
  // 添加 404 路由（必须最后添加）
  router.addRoute({
    path: '/:pathMatch(.*)*',
    component: NotFound
  })
}

// 登出时重置
function resetRoutes() {
  const routes = router.getRoutes()
  
  routes.forEach(route => {
    if (route.name && !publicRouteNames.includes(route.name)) {
      router.removeRoute(route.name)
    }
  })
}
```

## 模块化路由

```typescript
// 按模块定义路由
const userModule = {
  name: 'user-module',
  routes: [
    { path: '/users', component: UserList },
    { path: '/users/:id', component: UserDetail }
  ]
}

// 动态加载模块
async function loadModule(module: RouteModule) {
  module.routes.forEach(route => {
    router.addRoute(route)
  })
}

// 卸载模块
function unloadModule(module: RouteModule) {
  module.routes.forEach(route => {
    if (route.name) {
      router.removeRoute(route.name)
    }
  })
}
```

## 添加嵌套路由

```typescript
// 父路由已存在
const routes = [
  {
    name: 'admin',
    path: '/admin',
    component: AdminLayout,
    children: []
  }
]

// 动态添加子路由
router.addRoute('admin', {
  path: 'users',
  component: AdminUsers
})

router.addRoute('admin', {
  path: 'settings',
  component: AdminSettings
})
```

## 注意事项

**添加后需要重新导航**：

```typescript
router.addRoute(newRoute)

// 如果当前 URL 匹配新路由，需要重新导航
if (router.currentRoute.value.matched.length === 0) {
  router.replace(router.currentRoute.value.fullPath)
}
```

**404 路由必须最后添加**：

```typescript
// ❌ 错误：404 会匹配所有路径
router.addRoute({ path: '/:pathMatch(.*)*', component: NotFound })
router.addRoute({ path: '/users', component: Users })  // 永远不会匹配

// ✅ 正确
router.addRoute({ path: '/users', component: Users })
router.addRoute({ path: '/:pathMatch(.*)*', component: NotFound })
```

**命名路由的重要性**：

```typescript
// 没有名称无法删除
router.addRoute({ path: '/temp', component: Temp })  // ❌

// 有名称可以删除
router.addRoute({ name: 'temp', path: '/temp', component: Temp })  // ✅
router.removeRoute('temp')
```

## 本章小结

动态路由的关键点：

1. **addRoute**：添加到 matcher，返回删除函数
2. **removeRoute**：按名称删除，包括子路由和别名
3. **权限控制**：登录后动态添加，登出时重置
4. **嵌套添加**：通过父路由名称添加子路由
5. **注意顺序**：404 路由必须最后添加

动态路由是实现权限系统和模块化架构的基础。
