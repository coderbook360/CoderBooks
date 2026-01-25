# 路由守卫 beforeEnter

`beforeEnter` 是路由级守卫，直接定义在路由配置中。它只在进入该路由时触发，不在参数变化时触发。

## 基本用法

```typescript
const routes = [
  {
    path: '/admin',
    component: AdminPanel,
    beforeEnter: (to, from) => {
      if (!isAdmin()) {
        return '/login'
      }
    }
  }
]
```

## 与 beforeEach 的区别

| 特性 | beforeEach | beforeEnter |
|------|------------|-------------|
| 定义位置 | 全局 | 路由配置 |
| 触发范围 | 所有导航 | 仅进入该路由 |
| 参数变化 | 触发 | 不触发 |
| 复用场景 | 权限框架 | 特定路由逻辑 |

## 源码实现

在 navigate 函数中，`beforeEnter` 在 `beforeRouteUpdate` 之后执行：

```typescript
function navigate(to, from) {
  // ... beforeRouteLeave, beforeEach, beforeRouteUpdate

  return runGuardQueue(updateGuards)
    .then(() => {
      // beforeEnter 守卫
      const guards: NavigationGuard[] = []
      
      for (const record of to.matched) {
        // 只对新进入的路由执行
        if (record.beforeEnter && !from.matched.includes(record)) {
          // 支持数组形式
          if (Array.isArray(record.beforeEnter)) {
            for (const beforeEnter of record.beforeEnter) {
              guards.push(guardToPromiseFn(beforeEnter, to, from))
            }
          } else {
            guards.push(guardToPromiseFn(record.beforeEnter, to, from))
          }
        }
      }

      return runGuardQueue(guards)
    })
    // ... 后续守卫
}
```

## 关键逻辑

**只对新进入的路由执行**：

```typescript
if (record.beforeEnter && !from.matched.includes(record)) {
  // 执行
}
```

这意味着：

```typescript
// /users/1 → /users/2
// 同一个 UserProfile 组件，beforeEnter 不触发

// /home → /users/1
// 进入 UserProfile，beforeEnter 触发
```

## 数组形式

支持多个守卫：

```typescript
function validateAdmin(to, from) {
  if (!isAdmin()) return '/login'
}

function logNavigation(to, from) {
  console.log('Entering admin:', to.path)
}

const routes = [
  {
    path: '/admin',
    component: AdminPanel,
    beforeEnter: [validateAdmin, logNavigation]
  }
]
```

## 工厂函数模式

可以创建可复用的守卫：

```typescript
function requireAuth(role: string) {
  return (to: RouteLocationNormalized) => {
    if (!hasRole(role)) {
      return {
        name: 'login',
        query: { redirect: to.fullPath }
      }
    }
  }
}

function requireFeature(feature: string) {
  return (to: RouteLocationNormalized) => {
    if (!hasFeature(feature)) {
      return '/upgrade'
    }
  }
}

const routes = [
  {
    path: '/admin',
    component: AdminPanel,
    beforeEnter: [requireAuth('admin'), requireFeature('dashboard')]
  },
  {
    path: '/reports',
    component: Reports,
    beforeEnter: [requireAuth('viewer')]
  }
]
```

## 嵌套路由

父路由的 `beforeEnter` 只在首次进入时触发：

```typescript
const routes = [
  {
    path: '/admin',
    component: AdminLayout,
    beforeEnter: () => {
      console.log('Entering admin section')
    },
    children: [
      { path: 'users', component: AdminUsers },
      { path: 'settings', component: AdminSettings }
    ]
  }
]

// /home → /admin/users
// beforeEnter 触发

// /admin/users → /admin/settings
// beforeEnter 不触发（仍在 /admin 下）
```

## 异步守卫

支持异步操作：

```typescript
{
  path: '/post/:id',
  component: PostDetail,
  beforeEnter: async (to) => {
    // 检查文章是否存在
    const exists = await postService.exists(to.params.id)
    if (!exists) {
      return '/404'
    }
  }
}
```

## 与 meta 配合

常见模式是用 meta 配置权限，用全局守卫检查：

```typescript
// 方式一：beforeEnter
{
  path: '/admin',
  beforeEnter: requireAuth('admin'),
  component: AdminPanel
}

// 方式二：meta + beforeEach
{
  path: '/admin',
  meta: { requiresAuth: true, role: 'admin' },
  component: AdminPanel
}

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !hasRole(to.meta.role)) {
    return '/login'
  }
})
```

方式二更适合统一的权限框架，方式一更适合特定路由的特殊逻辑。

## 本章小结

`beforeEnter` 是路由级守卫：

1. **定义位置**：路由配置中
2. **触发条件**：仅在进入新路由时
3. **数组支持**：可以传入多个守卫
4. **工厂模式**：可创建可复用的守卫函数
5. **嵌套路由**：父路由守卫只在首次进入时触发

使用 `beforeEnter` 可以将特定路由的逻辑内聚到路由配置中。
