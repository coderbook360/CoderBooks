# 命名路由与命名视图

随着应用规模增长，路由配置变得复杂，直接使用路径字符串导航会越来越难以维护。命名路由提供了一种更健壮的导航方式——通过名称而不是路径来标识路由。命名视图则解决了在同一层级渲染多个组件的需求。

## 命名路由：告别硬编码路径

考虑这样一个场景：用户详情页的路径是 `/users/:id`。在应用的很多地方，你需要导航到这个页面：

```javascript
// 多处使用硬编码路径
router.push(`/users/${userId}`)
```

某天，产品决定把 URL 结构改成 `/members/:id`。你需要全局搜索替换所有的 `/users/` 字符串。如果遗漏了某处，就会产生 bug。

命名路由解决了这个问题。给路由一个名称，导航时使用名称：

```javascript
// 路由配置
{
  name: 'user-detail',
  path: '/users/:id',
  component: UserDetail
}

// 导航
router.push({ name: 'user-detail', params: { id: userId } })
```

现在修改路径只需要改一处——路由配置。所有通过名称导航的地方自动更新。

## 命名的最佳实践

路由名称应该是唯一的。Vue Router 不会阻止重复的名称，但会用后者覆盖前者，可能导致意外行为。

命名约定没有强制规定，但保持一致性很重要。常见的风格有：

```javascript
// kebab-case（推荐，与 URL 风格一致）
name: 'user-detail'
name: 'user-settings-profile'

// 嵌套使用点分隔（表达层级关系）
name: 'admin.users.list'
name: 'admin.users.detail'

// 与组件名一致
name: 'UserDetail'
```

对于嵌套路由，父路由可以不命名（如果你不需要直接导航到它）：

```javascript
{
  path: '/users',
  component: UsersLayout,  // 无名称
  children: [
    { name: 'user-list', path: '', component: UserList },
    { name: 'user-detail', path: ':id', component: UserDetail }
  ]
}
```

## 在模板中使用命名路由

`<RouterLink>` 同样支持命名导航：

```html
<RouterLink :to="{ name: 'user-detail', params: { id: user.id } }">
  {{ user.name }}
</RouterLink>
```

相比路径字符串，这种写法更安全——如果路由名称写错，Vue Router 会在控制台警告。字符串路径写错只会静默失败。

## 命名视图：一个路由，多个组件

常规路由配置中，一个路由对应一个组件。但有时候你需要在同一层级渲染多个组件。典型场景是布局中有主内容和侧边栏，它们是并列的而不是嵌套的关系：

```
+------------------------------------------+
| 头部导航                                  |
+------------------------------------------+
| 侧边栏组件    |   主内容组件              |
| (SidebarA)   |   (MainA)                |
+------------------------------------------+
```

不同路由可能有不同的侧边栏和主内容组合。命名视图让这变得简单：

```javascript
const routes = [
  {
    path: '/dashboard',
    components: {
      default: DashboardMain,
      sidebar: DashboardSidebar
    }
  },
  {
    path: '/settings',
    components: {
      default: SettingsMain,
      sidebar: SettingsSidebar
    }
  }
]
```

模板中使用命名的 `<RouterView>`：

```html
<template>
  <header>...</header>
  <div class="container">
    <aside>
      <RouterView name="sidebar" />
    </aside>
    <main>
      <RouterView />  <!-- 默认视图 -->
    </main>
  </div>
</template>
```

`name="sidebar"` 对应 `components.sidebar`，无名称的 `<RouterView>` 对应 `components.default`。

## 嵌套命名视图

命名视图可以与嵌套路由结合。考虑一个用户设置页面，不同的设置项有不同的帮助面板：

```javascript
{
  path: '/settings',
  component: SettingsLayout,
  children: [
    {
      path: 'profile',
      components: {
        default: ProfileForm,
        helper: ProfileHelper
      }
    },
    {
      path: 'account',
      components: {
        default: AccountForm,
        helper: AccountHelper
      }
    }
  ]
}
```

SettingsLayout 中：

```html
<template>
  <div class="settings">
    <nav>...</nav>
    <div class="content">
      <RouterView />  <!-- ProfileForm 或 AccountForm -->
    </div>
    <aside class="helper">
      <RouterView name="helper" />  <!-- ProfileHelper 或 AccountHelper -->
    </aside>
  </div>
</template>
```

切换路由时，主内容和帮助面板同时变化。

## 视图别名

有时候你希望某个路由只渲染部分命名视图：

```javascript
{
  path: '/minimal',
  components: {
    default: MinimalContent
    // sidebar 没有定义，该视图位置为空
  }
}
```

或者多个路由共享同一个侧边栏：

```javascript
const SharedSidebar = Sidebar

const routes = [
  {
    path: '/dashboard',
    components: {
      default: DashboardMain,
      sidebar: SharedSidebar  // 同一个组件
    }
  },
  {
    path: '/reports',
    components: {
      default: ReportsMain,
      sidebar: SharedSidebar  // 同一个组件
    }
  }
]
```

## 导航时的路由解析

使用 `router.resolve()` 可以解析命名路由，获取完整的路由信息而不实际导航：

```javascript
const resolved = router.resolve({ 
  name: 'user-detail', 
  params: { id: 123 } 
})

console.log(resolved.href)     // '/users/123'
console.log(resolved.fullPath) // '/users/123'
console.log(resolved.matched)  // 匹配的路由记录
```

这在需要生成链接 URL（比如分享功能）或检查路由是否有效时很有用。

## 命名路由与 TypeScript

Vue Router 支持类型安全的命名路由。通过定义路由名称和参数的类型映射，可以在编译时检查导航参数：

```typescript
// router.ts
declare module 'vue-router' {
  interface RouteRecordNameMap {
    'user-detail': { id: string }
    'user-list': Record<string, never>  // 无参数
  }
}

// 使用时有类型提示和检查
router.push({ name: 'user-detail', params: { id: '123' } })  // OK
router.push({ name: 'user-detail' })  // 错误：缺少 id 参数
```

这需要一些额外的类型定义工作，但在大型项目中可以避免很多运行时错误。

## 何时使用命名路由

并非所有路由都需要命名。命名最有价值的场景是：

频繁导航的路由。如果一个路由在多处被引用，命名它可以减少重复并便于修改。

有参数的路由。命名导航配合 params 对象比模板字符串更清晰、更不容易出错。

需要编程式访问的路由。在代码中使用 `router.push({ name: '...' })` 比字符串更可读。

对于只被使用一次的简单路由，直接使用路径也可以。关键是在团队中保持一致性。

## 本章小结

命名路由通过名称而非路径标识路由，让导航代码与 URL 结构解耦。修改 URL 只需要改路由配置一处，所有导航自动更新。

命名视图让一个路由可以渲染多个并列的组件，解决了复杂布局的需求。通过 `components` 对象定义多个组件，在模板中用 `name` 属性的 `<RouterView>` 渲染它们。

这两个特性都是为了让路由配置更加灵活和可维护。在大型应用中，合理使用命名可以显著降低维护成本。
