# addRoute 添加路由

`addRoute` 是 Vue Router 的动态路由添加方法。它允许在应用运行时添加新路由，常用于权限控制、模块化加载等场景。

## API 形式

Router 暴露的 `addRoute` 有两种调用形式：

```typescript
// 添加顶级路由
router.addRoute({ path: '/new', component: NewPage })

// 添加为某个路由的子路由
router.addRoute('parentName', { path: 'child', component: ChildPage })
```

第一种直接添加到根级别，第二种添加到指定命名路由下作为子路由。

## Router 中的包装

在 `createRouter` 中，`addRoute` 是对 matcher 的包装：

```typescript
function addRoute(
  parentOrRoute: RouteRecordName | RouteRecordRaw,
  route?: RouteRecordRaw
): () => void {
  let parent: RouteRecordMatcher | undefined
  let record: RouteRecordRaw

  // 判断是否指定了父路由
  if (isRouteName(parentOrRoute)) {
    parent = matcher.getRecordMatcher(parentOrRoute)
    record = route!
  } else {
    record = parentOrRoute
  }

  return matcher.addRoute(record, parent)
}
```

如果第一个参数是路由名称（字符串或 Symbol），就查找对应的父路由匹配器。否则直接作为顶级路由添加。

## Matcher 中的实现

真正的添加逻辑在 `createRouterMatcher` 中：

```typescript
function addRoute(
  record: RouteRecordRaw,
  parent?: RouteRecordMatcher,
  originalRecord?: RouteRecordMatcher
): () => void {
  // 检查是否已存在同名路由
  const isRootAdd = !originalRecord
  const mainNormalizedRecord = normalizeRouteRecord(record)

  // 记录原始记录（用于别名处理）
  mainNormalizedRecord.aliasOf = originalRecord && originalRecord.record

  // 合并选项
  const options: PathParserOptions = mergeOptions(globalOptions, record)

  // 处理别名：为每个别名创建独立记录
  const normalizedRecords: NormalizedRouteRecord[] = [mainNormalizedRecord]
  
  if ('alias' in record) {
    const aliases = typeof record.alias === 'string'
      ? [record.alias]
      : record.alias!
    
    for (const alias of aliases) {
      normalizedRecords.push(
        Object.assign({}, mainNormalizedRecord, {
          // 别名路由使用不同的路径
          path: alias,
          // 指向原始记录
          aliasOf: mainNormalizedRecord
        })
      )
    }
  }

  let matcher: RouteRecordMatcher
  let originalMatcher: RouteRecordMatcher | undefined

  for (const normalizedRecord of normalizedRecords) {
    const { path } = normalizedRecord

    // 非绝对路径时，拼接父路径
    if (parent && path[0] !== '/') {
      const parentPath = parent.record.path
      const connectingSlash = parentPath[parentPath.length - 1] === '/' ? '' : '/'
      normalizedRecord.path = parent.record.path + connectingSlash + path
    }

    // 创建匹配器
    matcher = createRouteRecordMatcher(normalizedRecord, parent, options)

    // 处理同名路由的覆盖
    if (mainNormalizedRecord.record.name && !isAliasRecord(matcher)) {
      const existingMatcher = matcherMap.get(mainNormalizedRecord.record.name)
      if (existingMatcher) {
        // 移除旧的
        removeRoute(existingMatcher)
      }
    }

    // 递归添加子路由
    if ('children' in record) {
      const children = record.children!
      for (let i = 0; i < children.length; i++) {
        addRoute(
          children[i],
          matcher,
          originalRecord && originalRecord.children[i]
        )
      }
    }

    // 记录原始匹配器（第一个，非别名的）
    originalRecord = originalRecord || matcher

    // 插入到 matchers 数组
    insertMatcher(matcher)
  }

  // 返回移除函数
  return () => {
    removeRoute(matcher)
  }
}
```

这个函数做了很多事情，让我们分解来看。

## 路由规范化

```typescript
const mainNormalizedRecord = normalizeRouteRecord(record)

function normalizeRouteRecord(record: RouteRecordRaw): NormalizedRouteRecord {
  return {
    path: record.path,
    redirect: record.redirect,
    name: record.name,
    meta: record.meta || {},
    aliasOf: undefined,
    beforeEnter: record.beforeEnter,
    props: normalizeRecordProps(record),
    children: record.children || [],
    instances: {},
    leaveGuards: new Set(),
    updateGuards: new Set(),
    enterCallbacks: {},
    components: 'components' in record
      ? record.components || {}
      : record.component
        ? { default: record.component }
        : {}
  }
}
```

规范化做了几件事：

1. 填充默认值（`meta: {}`、`children: []`）
2. 将 `component` 转换为 `components.default`
3. 初始化运行时状态（`instances`、`leaveGuards` 等）

## 别名处理

```typescript
if ('alias' in record) {
  const aliases = typeof record.alias === 'string'
    ? [record.alias]
    : record.alias!
  
  for (const alias of aliases) {
    normalizedRecords.push(
      Object.assign({}, mainNormalizedRecord, {
        path: alias,
        aliasOf: mainNormalizedRecord
      })
    )
  }
}
```

别名会创建多个路由记录，它们指向同一个组件。`aliasOf` 指向原始记录，用于在匹配时获取正确的组件。

```typescript
// 用法
{ path: '/users', alias: ['/people', '/team'], component: Users }

// 访问 /users、/people、/team 都会渲染 Users 组件
```

## 路径拼接

```typescript
if (parent && path[0] !== '/') {
  const parentPath = parent.record.path
  const connectingSlash = parentPath[parentPath.length - 1] === '/' ? '' : '/'
  normalizedRecord.path = parent.record.path + connectingSlash + path
}
```

子路由的路径会拼接父路径。如果子路径以 `/` 开头，则视为绝对路径，不拼接。

```typescript
// 相对路径
{ path: '/users', children: [{ path: 'profile' }] }
// 结果：/users/profile

// 绝对路径
{ path: '/users', children: [{ path: '/profile' }] }
// 结果：/profile
```

## 同名路由覆盖

```typescript
if (mainNormalizedRecord.record.name && !isAliasRecord(matcher)) {
  const existingMatcher = matcherMap.get(mainNormalizedRecord.record.name)
  if (existingMatcher) {
    removeRoute(existingMatcher)
  }
}
```

如果添加的路由与已有路由同名，会先移除旧的。这允许动态替换路由。

```typescript
router.addRoute({ name: 'user', path: '/user', component: UserV1 })
// 后来替换
router.addRoute({ name: 'user', path: '/user-new', component: UserV2 })
// 旧的被移除，现在 /user-new 生效
```

## 子路由递归

```typescript
if ('children' in record) {
  const children = record.children!
  for (let i = 0; i < children.length; i++) {
    addRoute(
      children[i],
      matcher,  // 当前匹配器作为父
      originalRecord && originalRecord.children[i]
    )
  }
}
```

递归添加子路由，传入当前匹配器作为父。

## 插入排序

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

  if (matcher.record.name && !isAliasRecord(matcher)) {
    matcherMap.set(matcher.record.name, matcher)
  }
}
```

匹配器按优先级排序插入。同时更新 `matcherMap` 命名索引。

## 返回值

`addRoute` 返回一个移除函数：

```typescript
return () => {
  removeRoute(matcher)
}
```

这种模式让调用者可以方便地撤销添加：

```typescript
const removeUserRoute = router.addRoute({ path: '/user', component: User })

// 后续需要移除时
removeUserRoute()
```

## 实际应用

**权限路由**：

```typescript
// 登录后根据权限添加路由
async function onLogin(user) {
  if (user.isAdmin) {
    router.addRoute({
      path: '/admin',
      component: AdminLayout,
      children: [
        { path: '', component: AdminDashboard },
        { path: 'users', component: AdminUsers }
      ]
    })
  }
}
```

**模块懒加载**：

```typescript
// 动态导入模块并添加路由
async function loadModule(moduleName) {
  const module = await import(`./modules/${moduleName}`)
  module.routes.forEach(route => {
    router.addRoute(route)
  })
}
```

## 注意事项

**添加后需要导航**：

```typescript
router.addRoute({ path: '/new', component: New })
// 如果当前就在 /new，需要手动触发导航
if (router.currentRoute.value.path === '/new') {
  router.replace('/new')
}
```

已添加的路由不会自动生效于当前 URL，需要触发一次导航。

**开发模式警告**：

添加已存在的命名路由会在控制台警告（然后替换）。生产模式静默处理。

## 本章小结

`addRoute` 实现了动态路由添加：

1. 支持顶级添加和作为子路由添加
2. 自动处理别名，创建多个匹配器
3. 子路径自动拼接父路径
4. 同名路由会替换旧路由
5. 返回移除函数便于撤销

动态路由是构建复杂权限系统的基础，理解其工作机制有助于正确使用。
