# 实现嵌套路由

嵌套路由允许在父路由组件内部渲染子路由组件，这是构建复杂应用布局的基础。

## 嵌套路由的数据结构

路由配置中的 children 字段定义了嵌套关系：

```typescript
const routes = [
  {
    path: '/users',
    component: UsersLayout,
    children: [
      {
        path: '',  // /users
        component: UsersList
      },
      {
        path: ':id',  // /users/:id
        component: UserDetail,
        children: [
          {
            path: 'posts',  // /users/:id/posts
            component: UserPosts
          }
        ]
      }
    ]
  }
]
```

## 路径规范化

子路由的路径需要与父路由拼接：

```typescript
// matcher/normalize.ts
import type { RouteRecordRaw, RouteRecord } from '../types'

export function normalizeRouteRecord(
  record: RouteRecordRaw,
  parent?: RouteRecord
): RouteRecord {
  // 处理路径
  let path = record.path
  
  // 绝对路径保持不变
  if (!path.startsWith('/')) {
    if (parent) {
      // 相对路径拼接父路径
      const parentPath = parent.path.endsWith('/') 
        ? parent.path.slice(0, -1) 
        : parent.path
      path = path ? `${parentPath}/${path}` : parentPath
    } else {
      // 没有父路由，添加 / 前缀
      path = '/' + path
    }
  }
  
  // 规范化：移除多余斜杠
  path = path.replace(/\/+/g, '/')
  
  // 规范化组件
  const components: Record<string, any> = {}
  if (record.component) {
    components.default = record.component
  }
  if (record.components) {
    Object.assign(components, record.components)
  }
  
  return {
    path,
    name: record.name,
    components,
    redirect: record.redirect,
    children: [],  // 稍后填充
    meta: record.meta || {},
    beforeEnter: normalizeGuards(record.beforeEnter),
    props: normalizeProps(record.props),
    parent
  }
}

function normalizeGuards(guards: any): any[] {
  if (!guards) return []
  return Array.isArray(guards) ? guards : [guards]
}

function normalizeProps(props: any): Record<string, any> {
  if (!props) return {}
  if (typeof props === 'boolean' || typeof props === 'function') {
    return { default: props }
  }
  return props
}
```

## 构建路由树

在匹配器中递归处理子路由：

```typescript
// matcher/index.ts
export function createRouterMatcher(routes: RouteRecordRaw[]) {
  const matchers: RouteRecordMatcher[] = []
  const matcherMap = new Map<string, RouteRecordMatcher>()
  
  function addRoute(
    record: RouteRecordRaw,
    parent?: RouteRecordMatcher
  ): () => void {
    // 规范化路由记录
    const normalized = normalizeRouteRecord(
      record, 
      parent?.record
    )
    
    // 创建匹配器
    const matcher: RouteRecordMatcher = {
      record: normalized,
      pathMatcher: createPathParser(normalized.path),
      parent,
      children: []
    }
    
    // 建立父子关系
    if (parent) {
      parent.children.push(matcher)
      normalized.parent = parent.record
    }
    
    // 存储
    matchers.push(matcher)
    if (normalized.name) {
      matcherMap.set(normalized.name as string, matcher)
    }
    
    // 递归处理子路由
    if (record.children) {
      for (const child of record.children) {
        addRoute(child, matcher)
      }
    }
    
    return () => removeMatcher(matcher)
  }
  
  function removeMatcher(matcher: RouteRecordMatcher) {
    // 移除自己
    const index = matchers.indexOf(matcher)
    if (index > -1) matchers.splice(index, 1)
    
    if (matcher.record.name) {
      matcherMap.delete(matcher.record.name as string)
    }
    
    // 从父级移除
    if (matcher.parent) {
      const siblings = matcher.parent.children
      const childIndex = siblings.indexOf(matcher)
      if (childIndex > -1) siblings.splice(childIndex, 1)
    }
    
    // 递归移除子路由
    for (const child of matcher.children) {
      removeMatcher(child)
    }
  }
  
  // 初始化
  for (const route of routes) {
    addRoute(route)
  }
  
  return {
    addRoute,
    removeRoute: (name: string) => {
      const matcher = matcherMap.get(name)
      if (matcher) removeMatcher(matcher)
    },
    getRoutes: () => matchers.map(m => m.record),
    getRecordMatcher: (name: string) => matcherMap.get(name)?.record,
    resolve: (to, current) => resolve(to, current, matchers, matcherMap)
  }
}
```

## 构建 matched 数组

matched 数组是嵌套路由的关键，它包含从根到当前路由的所有记录：

```typescript
function buildMatched(matcher: RouteRecordMatcher): RouteRecord[] {
  const matched: RouteRecord[] = []
  
  // 从当前节点向上遍历
  let current: RouteRecordMatcher | undefined = matcher
  while (current) {
    // 插入到开头，确保父在前子在后
    matched.unshift(current.record)
    current = current.parent
  }
  
  return matched
}
```

比如访问 `/users/123/posts` 时，matched 数组是：

```typescript
[
  { path: '/users', component: UsersLayout },
  { path: '/users/:id', component: UserDetail },
  { path: '/users/:id/posts', component: UserPosts }
]
```

## RouterView 深度匹配

每个 RouterView 根据深度从 matched 数组中取对应的组件：

```typescript
// components/RouterView.ts
export const RouterView = defineComponent({
  setup(props, { slots }) {
    const currentRoute = inject(routeKey)!
    const depth = inject(routerViewDepthKey, ref(0))
    
    // 根据深度获取路由记录
    const matchedRoute = computed(() => {
      const matched = currentRoute.value.matched
      return matched[depth.value]
    })
    
    // 为子 RouterView 提供递增的深度
    provide(routerViewDepthKey, computed(() => depth.value + 1))
    
    return () => {
      const route = matchedRoute.value
      if (!route) return null
      
      const component = route.components[props.name || 'default']
      return component ? h(component) : null
    }
  }
})
```

深度机制确保了：

- 根 RouterView 的深度是 0，渲染 matched[0] 的组件
- 第一层嵌套的 RouterView 深度是 1，渲染 matched[1] 的组件
- 以此类推

## 路由匹配的优先级

嵌套路由需要正确的匹配顺序：

```typescript
function resolve(
  to: RouteLocationRaw,
  current: RouteLocation,
  matchers: RouteRecordMatcher[],
  matcherMap: Map<string, RouteRecordMatcher>
): RouteLocation {
  const path = typeof to === 'string' ? to : to.path || '/'
  
  // 优先匹配更具体的路径
  // matchers 已经按添加顺序排列
  // 子路由在父路由之后添加，所以自然会先匹配到子路由
  
  // 但我们需要找到最深的匹配
  let bestMatch: RouteRecordMatcher | null = null
  
  for (const matcher of matchers) {
    if (matcher.pathMatcher.parse(path)) {
      // 找到更深的匹配
      if (!bestMatch || matcher.record.path.length > bestMatch.record.path.length) {
        bestMatch = matcher
      }
    }
  }
  
  if (bestMatch) {
    return {
      path,
      name: bestMatch.record.name,
      params: bestMatch.pathMatcher.parse(path) || {},
      query: {},
      hash: '',
      fullPath: path,
      matched: buildMatched(bestMatch),
      meta: mergeMeta(buildMatched(bestMatch))
    }
  }
  
  // 没有匹配
  return {
    path,
    params: {},
    query: {},
    hash: '',
    fullPath: path,
    matched: [],
    meta: {}
  }
}

function mergeMeta(matched: RouteRecord[]): Record<string, unknown> {
  return matched.reduce((meta, record) => {
    return { ...meta, ...record.meta }
  }, {})
}
```

## 使用示例

定义嵌套路由：

```typescript
const routes = [
  {
    path: '/admin',
    component: AdminLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'admin-home',
        component: AdminDashboard
      },
      {
        path: 'users',
        name: 'admin-users',
        component: AdminUsers,
        children: [
          {
            path: ':id',
            name: 'admin-user-detail',
            component: AdminUserDetail
          }
        ]
      }
    ]
  }
]
```

父组件模板：

```html
<!-- AdminLayout.vue -->
<template>
  <div class="admin-layout">
    <aside class="sidebar">
      <nav>
        <RouterLink to="/admin">Dashboard</RouterLink>
        <RouterLink to="/admin/users">Users</RouterLink>
      </nav>
    </aside>
    <main class="content">
      <!-- 子路由在这里渲染 -->
      <RouterView />
    </main>
  </div>
</template>
```

二级嵌套：

```html
<!-- AdminUsers.vue -->
<template>
  <div class="users-page">
    <h1>Users</h1>
    <div class="user-list">
      <!-- 用户列表 -->
    </div>
    <!-- 用户详情在这里渲染 -->
    <RouterView />
  </div>
</template>
```

## 空路径子路由

空路径子路由用于默认内容：

```typescript
const routes = [
  {
    path: '/users',
    component: UsersLayout,
    children: [
      {
        path: '',  // 匹配 /users
        component: UsersIndex
      },
      {
        path: 'new',  // 匹配 /users/new
        component: CreateUser
      }
    ]
  }
]
```

访问 `/users` 时，UsersLayout 渲染，其内部的 RouterView 渲染 UsersIndex。

## 本章小结

嵌套路由的实现要点：

1. **路径拼接**：子路由路径与父路由拼接
2. **树形结构**：通过 parent 和 children 维护关系
3. **matched 数组**：从根到叶的路由记录链
4. **深度管理**：RouterView 通过深度找到对应组件
5. **meta 合并**：子路由继承父路由的 meta

嵌套路由是构建复杂应用布局的核心机制。
