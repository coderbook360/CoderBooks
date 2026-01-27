# 懒加载实现

路由懒加载通过动态导入实现，只在需要时加载组件代码。Vue Router 在解析阶段自动处理异步组件。

## 基本用法

```typescript
const routes = [
  {
    path: '/about',
    component: () => import('./views/About.vue')
  }
]
```

## 路由记录中的组件

普通组件和异步组件的区别：

```typescript
// 同步组件
{
  path: '/home',
  component: Home  // 组件对象
}

// 异步组件
{
  path: '/about',
  component: () => import('./About.vue')  // 返回 Promise 的函数
}
```

## 解析时机

在 `beforeRouteEnter` 之前解析：

```typescript
function navigate(to, from) {
  return runGuardQueue(leaveGuards)
    .then(() => runGuardQueue(beforeEachGuards))
    .then(() => runGuardQueue(updateGuards))
    .then(() => runGuardQueue(beforeEnterGuards))
    .then(() => {
      // 在这里解析异步组件
      to.matched.forEach(record => {
        record.enterCallbacks = {}
      })

      // 提取 beforeRouteEnter 前先解析组件
      return Promise.all(
        to.matched.map(record => loadAsyncComponents(record))
      )
    })
    .then(() => {
      // 现在可以提取组件守卫了
      guards = extractComponentsGuards(
        enteringRecords,
        'beforeRouteEnter',
        to,
        from
      )
      return runGuardQueue(guards)
    })
}
```

## loadAsyncComponents

```typescript
function loadAsyncComponents(
  record: RouteRecordNormalized
): Promise<void[]> {
  return Promise.all(
    Object.keys(record.components).map(name => {
      const rawComponent = record.components[name]
      
      // 检查是否是函数（异步组件）
      if (typeof rawComponent === 'function' && !('displayName' in rawComponent)) {
        // 调用函数获取组件
        return (rawComponent as Lazy<RouteComponent>)().then(resolved => {
          // 处理 ES Module 默认导出
          if (resolved && typeof resolved === 'object') {
            resolved = resolved.default || resolved
          }
          
          // 替换为解析后的组件
          record.components[name] = resolved
        })
      }
    })
  )
}
```

## ES Module 处理

动态导入返回 ES Module：

```typescript
// import() 返回
{
  default: ComponentDefinition,
  __esModule: true
}

// 需要提取 default
resolved = resolved.default || resolved
```

## 加载状态

Vue Router 本身不处理加载状态，需要配合其他方案：

**使用 Suspense**：

```html
<template>
  <RouterView v-slot="{ Component }">
    <Suspense>
      <component :is="Component" />
      <template #fallback>
        <LoadingSpinner />
      </template>
    </Suspense>
  </RouterView>
</template>
```

**使用全局进度条**：

```typescript
import NProgress from 'nprogress'

router.beforeEach(() => {
  NProgress.start()
})

router.afterEach(() => {
  NProgress.done()
})
```

## 错误处理

加载失败时的处理：

```typescript
const routes = [
  {
    path: '/about',
    component: () => import('./About.vue').catch(() => {
      // 加载失败时显示错误组件
      return import('./ErrorComponent.vue')
    })
  }
]
```

或使用全局错误处理：

```typescript
router.onError((error, to) => {
  if (error.message.includes('Failed to fetch dynamically imported module')) {
    // 可能是网络问题，提示刷新
    window.location.href = to.fullPath
  }
})
```

## 分块命名

使用魔法注释命名 chunk：

```typescript
{
  path: '/admin',
  component: () => import(/* webpackChunkName: "admin" */ './Admin.vue')
}
```

Vite 中使用：

```typescript
{
  path: '/admin',
  component: () => import('./Admin.vue')  // Vite 自动处理
}
```

## 分组加载

相关组件放入同一 chunk：

```typescript
const AdminUsers = () => import(/* webpackChunkName: "admin" */ './AdminUsers.vue')
const AdminSettings = () => import(/* webpackChunkName: "admin" */ './AdminSettings.vue')
const AdminReports = () => import(/* webpackChunkName: "admin" */ './AdminReports.vue')

const routes = [
  {
    path: '/admin',
    children: [
      { path: 'users', component: AdminUsers },
      { path: 'settings', component: AdminSettings },
      { path: 'reports', component: AdminReports }
    ]
  }
]
```

## 预加载

鼠标悬停时预加载：

```html
<template>
  <RouterLink 
    to="/admin"
    @mouseenter="preload"
  >
    Admin
  </RouterLink>
</template>

<script setup>
const AdminComponent = () => import('./Admin.vue')

function preload() {
  AdminComponent()
}
</script>
```

## 本章小结

路由懒加载的实现要点：

1. **函数形式**：组件定义为返回 Promise 的函数
2. **解析时机**：在 `beforeRouteEnter` 之前解析
3. **ES Module**：自动处理 `default` 导出
4. **错误处理**：需要手动或全局处理加载失败
5. **分块策略**：使用魔法注释或构建工具配置

懒加载是优化首屏加载的重要手段，Vue Router 无缝支持这一特性。
