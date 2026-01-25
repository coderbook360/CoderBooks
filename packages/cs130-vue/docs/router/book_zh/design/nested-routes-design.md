# 嵌套路由设计

真实的应用界面往往是层级结构的。一个用户管理页面可能有顶部导航和侧边栏，内容区域根据子路由显示用户列表或用户详情。嵌套路由让这种 UI 结构自然地映射到路由配置上。

## 为什么需要嵌套路由

考虑一个简单的用户管理界面：

```
+--------------------------------------------------+
| 顶部导航                                          |
+--------------------------------------------------+
| 侧边栏     |  内容区域                             |
|  - 用户    |  [根据路由变化]                       |
|  - 设置    |  - /users → 用户列表                  |
|            |  - /users/123 → 用户详情              |
|            |  - /users/123/edit → 编辑用户         |
+--------------------------------------------------+
```

导航和侧边栏在所有子页面中保持不变，只有内容区域随路由变化。如果没有嵌套路由，你需要在每个页面组件中重复布局代码，或者用一些 hack 来实现。

嵌套路由让这变得自然：父路由负责布局，子路由负责具体内容。

## 基本的嵌套配置

```javascript
const routes = [
  {
    path: '/users',
    component: UsersLayout,
    children: [
      {
        path: '',  // 匹配 /users
        component: UserList
      },
      {
        path: ':id',  // 匹配 /users/123
        component: UserDetail
      },
      {
        path: ':id/edit',  // 匹配 /users/123/edit
        component: UserEdit
      }
    ]
  }
]
```

注意几个要点：

子路由的 `path` 不需要以斜杠开头。它会自动与父路由的路径拼接。`:id` 会变成 `/users/:id`。

空字符串 `path: ''` 表示与父路由相同的路径。访问 `/users` 时，渲染 UsersLayout 和 UserList。

## 嵌套的 RouterView

父组件需要包含 `<RouterView>` 来渲染子路由的组件：

```html
<!-- UsersLayout.vue -->
<template>
  <div class="users-layout">
    <aside class="sidebar">
      <nav>
        <RouterLink to="/users">所有用户</RouterLink>
      </nav>
    </aside>
    
    <main class="content">
      <!-- 子路由组件渲染在这里 -->
      <RouterView />
    </main>
  </div>
</template>
```

当访问 `/users` 时：
1. 顶层 `<RouterView>`（在 App.vue 中）渲染 UsersLayout
2. UsersLayout 内的 `<RouterView>` 渲染 UserList

当访问 `/users/123` 时：
1. 顶层 `<RouterView>` 仍然渲染 UsersLayout（布局保持）
2. UsersLayout 内的 `<RouterView>` 渲染 UserDetail

这就是嵌套路由的核心：每一层 `<RouterView>` 对应配置中的一层嵌套。

## 多层嵌套

嵌套可以有任意多层：

```javascript
const routes = [
  {
    path: '/admin',
    component: AdminLayout,
    children: [
      {
        path: 'users',
        component: UsersSection,
        children: [
          { path: '', component: UserList },
          { 
            path: ':id', 
            component: UserDetail,
            children: [
              { path: '', component: UserOverview },
              { path: 'posts', component: UserPosts },
              { path: 'settings', component: UserSettings }
            ]
          }
        ]
      }
    ]
  }
]
```

访问 `/admin/users/123/posts` 时，渲染链是：
AdminLayout → UsersSection → UserDetail → UserPosts

每一层都需要一个 `<RouterView>` 来渲染下一层的组件。

## 命名视图：同级多组件

有时候在同一个层级需要渲染多个组件，比如主内容和侧边栏是不同的组件，但都属于同一层路由。命名视图解决这个问题：

```javascript
const routes = [
  {
    path: '/dashboard',
    components: {
      default: DashboardMain,
      sidebar: DashboardSidebar
    }
  }
]
```

注意是 `components`（复数），值是一个对象。模板中使用命名的 `<RouterView>`：

```html
<template>
  <div class="dashboard">
    <RouterView name="sidebar" />  <!-- 渲染 DashboardSidebar -->
    <RouterView />                  <!-- 渲染 DashboardMain（default） -->
  </div>
</template>
```

没有 `name` 属性的 `<RouterView>` 渲染 `default` 组件。

命名视图可以与嵌套路由结合：

```javascript
{
  path: '/settings',
  component: SettingsLayout,
  children: [
    {
      path: 'profile',
      components: {
        default: ProfileSettings,
        helper: ProfileHelper
      }
    },
    {
      path: 'security',
      components: {
        default: SecuritySettings,
        helper: SecurityHelper
      }
    }
  ]
}
```

不同的子路由可以在同一个布局的不同区域渲染不同的组件。

## 空组件的嵌套

有时候你只需要路由分组，不需要额外的布局组件。可以使用 `<RouterView>` 作为"透传"组件：

```javascript
const routes = [
  {
    path: '/admin',
    // 只分组，不添加布局
    children: [
      { path: 'users', component: AdminUsers },
      { path: 'settings', component: AdminSettings }
    ]
  }
]
```

但这样父路由没有 `component`，子路由会直接渲染在上一级的 `<RouterView>` 中。

如果确实需要一个父级但不想添加额外的 DOM 层级，可以用 `<RouterView>` 组件：

```javascript
import { RouterView } from 'vue-router'

{
  path: '/admin',
  component: RouterView,  // 透传
  children: [...]
}
```

或者使用 `h(RouterView)` 的函数式组件写法。

## 路由重定向

嵌套路由常常需要重定向。比如访问 `/users` 时自动跳转到 `/users/list`：

```javascript
{
  path: '/users',
  component: UsersLayout,
  redirect: '/users/list',  // 或者 { name: 'user-list' }
  children: [
    { path: 'list', name: 'user-list', component: UserList },
    { path: ':id', component: UserDetail }
  ]
}
```

重定向也可以是函数，根据条件决定跳转目标：

```javascript
redirect: to => {
  // to 是目标路由
  return { name: 'user-list' }
}
```

## 别名

别名让一个路由可以通过多个路径访问：

```javascript
{
  path: '/users',
  alias: ['/people', '/members'],
  component: UsersLayout,
  children: [...]
}
```

现在 `/users`、`/people`、`/members` 都会渲染 UsersLayout。这在重构 URL 结构时很有用——保持旧 URL 可用，同时使用新 URL。

## 嵌套路由与参数

子路由可以访问父路由的参数：

```javascript
{
  path: '/users/:userId',
  component: UserLayout,
  children: [
    { path: 'posts/:postId', component: UserPost }
  ]
}

// 访问 /users/123/posts/456
// route.params = { userId: '123', postId: '456' }
```

所有层级的参数会合并到一个 `params` 对象中。确保参数名不重复，否则子路由的参数会覆盖父路由的。

## 过渡动画

嵌套路由天然支持过渡动画。在 `<RouterView>` 外包裹 `<Transition>`：

```html
<template>
  <div class="content">
    <RouterView v-slot="{ Component }">
      <Transition name="fade">
        <component :is="Component" />
      </Transition>
    </RouterView>
  </div>
</template>
```

`v-slot` 暴露了当前路由匹配的组件，让你可以用 `<Transition>` 或 `<KeepAlive>` 包裹它。

不同层级可以有不同的过渡效果——父布局可以是滑动，子内容可以是淡入淡出。

## 设计原则

设计嵌套路由时，有几个原则值得遵循。

匹配 UI 层级结构。路由的嵌套应该反映 UI 的嵌套。如果两个页面共享相同的布局，它们应该是同一个父路由的子路由。

避免过度嵌套。超过三四层的嵌套会让配置难以理解和维护。如果发现嵌套太深，考虑是否可以扁平化一些。

合理使用命名。给重要的路由命名，方便在代码中引用。嵌套深的路由用命名导航比路径拼接更可靠。

考虑数据加载。每一层路由都可能需要加载自己的数据。设计时考虑清楚哪一层负责加载什么数据，避免重复请求。

## 本章小结

嵌套路由让复杂的 UI 层级结构与路由配置自然对应。父路由提供布局，子路由提供内容，每一层通过 `<RouterView>` 连接。

命名视图扩展了这个概念，允许同一层路由渲染多个组件。结合重定向、别名和参数继承，嵌套路由提供了构建复杂应用所需的全部灵活性。

理解嵌套路由的关键是理解 `<RouterView>` 的作用——它是路由配置层级与组件层级的桥梁，每一个 `<RouterView>` 对应配置中的一层 children。
