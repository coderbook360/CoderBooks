# RouterView 命名视图

命名视图允许在同一路由下渲染多个组件，用于复杂布局场景。

## 基本用法

```html
<template>
  <div class="layout">
    <RouterView name="header" />
    <div class="main">
      <RouterView name="sidebar" />
      <RouterView />  <!-- 默认视图 -->
    </div>
    <RouterView name="footer" />
  </div>
</template>
```

路由配置：

```typescript
const routes = [
  {
    path: '/dashboard',
    components: {
      default: DashboardMain,
      header: DashboardHeader,
      sidebar: DashboardSidebar,
      footer: DashboardFooter
    }
  }
]
```

## 实现原理

```typescript
// RouterView.ts
props: {
  name: {
    type: String,
    default: 'default'  // 默认视图名
  }
}

setup(props) {
  return () => {
    const matchedRoute = matchedRouteRef.value
    
    // 根据 name 获取对应组件
    const ViewComponent = matchedRoute?.components?.[props.name]
    
    if (!ViewComponent) {
      return null
    }
    
    return h(ViewComponent, componentProps)
  }
}
```

## 路由记录规范化

创建路由时，`component` 被转换为 `components`：

```typescript
function normalizeRouteRecord(record: RouteRecordRaw): RouteRecordNormalized {
  return {
    // 单个组件转为命名形式
    components: 'components' in record
      ? record.components
      : { default: record.component },
    
    // props 也转为命名形式
    props: normalizeRecordProps(record)
  }
}

function normalizeRecordProps(record: RouteRecordRaw) {
  const propsObject: Record<string, boolean | Record<string, any> | Function> = {}
  
  if ('component' in record) {
    propsObject.default = record.props ?? false
  } else {
    for (const name in record.components) {
      propsObject[name] = record.props?.[name] ?? false
    }
  }
  
  return propsObject
}
```

## 嵌套命名视图

命名视图可以与嵌套路由结合：

```typescript
const routes = [
  {
    path: '/admin',
    components: {
      default: AdminLayout,
      sidebar: AdminSidebar
    },
    children: [
      {
        path: 'users',
        components: {
          default: UserList,
          detail: UserDetail  // 嵌套的命名视图
        }
      }
    ]
  }
]
```

```html
<!-- App.vue (深度 0) -->
<RouterView />           <!-- AdminLayout -->
<RouterView name="sidebar" />  <!-- AdminSidebar -->

<!-- AdminLayout.vue (深度 1) -->
<RouterView />           <!-- UserList -->
<RouterView name="detail" />   <!-- UserDetail -->
```

## props 与命名视图

每个命名视图可以有独立的 props 配置：

```typescript
{
  path: '/user/:id',
  components: {
    default: UserMain,
    sidebar: UserSidebar
  },
  props: {
    default: true,                    // 布尔模式
    sidebar: { static: 'value' }      // 对象模式
  }
}
```

实现：

```typescript
const routeProps = matchedRoute.props[props.name]

const componentProps = routeProps
  ? routeProps === true
    ? route.params
    : typeof routeProps === 'function'
      ? routeProps(route)
      : routeProps
  : null
```

## 动态命名视图

可以根据条件渲染不同命名视图：

```html
<template>
  <RouterView :name="isMobile ? 'mobile' : 'desktop'" />
</template>
```

```typescript
{
  path: '/dashboard',
  components: {
    mobile: MobileDashboard,
    desktop: DesktopDashboard
  }
}
```

## 命名视图与过渡

```html
<template>
  <RouterView v-slot="{ Component }" name="sidebar">
    <transition name="slide">
      <component :is="Component" />
    </transition>
  </RouterView>
  
  <RouterView v-slot="{ Component }">
    <transition name="fade">
      <component :is="Component" />
    </transition>
  </RouterView>
</template>
```

每个命名视图可以有独立的过渡效果。

## 使用场景

**复杂布局**：

```typescript
// 三栏布局
{
  path: '/app',
  components: {
    left: LeftPanel,
    default: MainContent,
    right: RightPanel
  }
}
```

**条件渲染**：

```typescript
// 根据用户类型显示不同侧边栏
{
  path: '/dashboard',
  components: {
    default: Dashboard,
    adminSidebar: AdminSidebar,
    userSidebar: UserSidebar
  }
}
```

```html
<RouterView :name="isAdmin ? 'adminSidebar' : 'userSidebar'" />
```

## 本章小结

命名视图的关键点：

1. **name 属性**：默认值为 `'default'`
2. **components 配置**：使用对象形式配置多个组件
3. **规范化**：`component` 自动转为 `components.default`
4. **独立 props**：每个命名视图可有独立的 props 配置
5. **独立过渡**：每个视图可配置不同的过渡效果

命名视图适用于需要同时渲染多个组件的复杂布局场景。
