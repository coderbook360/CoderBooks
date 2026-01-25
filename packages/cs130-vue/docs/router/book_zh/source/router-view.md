# RouterView 组件实现

RouterView 是 Vue Router 的核心渲染组件，它根据当前路由渲染匹配的组件。

## 基本用法

```vue
<template>
  <RouterView />
  
  <!-- 命名视图 -->
  <RouterView name="sidebar" />
  
  <!-- 作用域插槽 -->
  <RouterView v-slot="{ Component, route }">
    <transition name="fade">
      <component :is="Component" :key="route.path" />
    </transition>
  </RouterView>
</template>
```

## 组件定义

```typescript
export const RouterViewImpl = defineComponent({
  name: 'RouterView',
  
  inheritAttrs: false,
  
  props: {
    name: {
      type: String as PropType<string>,
      default: 'default'
    },
    route: Object as PropType<RouteLocationNormalizedLoaded>
  },

  setup(props, { attrs, slots }) {
    // 注入路由实例
    const injectedRoute = inject(routerViewLocationKey)!
    
    // 使用 props.route 或注入的路由
    const routeToDisplay = computed(
      () => props.route || injectedRoute.value
    )

    // 当前深度
    const depth = inject(viewDepthKey, 0)
    
    // 匹配的路由记录
    const matchedRouteRef = computed(
      () => routeToDisplay.value.matched[depth]
    )

    // 为嵌套 RouterView 提供深度
    provide(viewDepthKey, depth + 1)
    
    // 提供匹配的路由记录
    provide(matchedRouteKey, matchedRouteRef)

    // 保存组件实例
    const viewRef = ref<ComponentPublicInstance>()

    return () => {
      const route = routeToDisplay.value
      const matchedRoute = matchedRouteRef.value
      
      // 获取组件
      const ViewComponent = matchedRoute?.components?.[props.name]
      
      // 没有匹配的组件
      if (!ViewComponent) {
        return slots.default?.({ Component: null, route })
      }

      // 组件 props
      const routeProps = matchedRoute.props[props.name]
      const componentProps = routeProps
        ? routeProps === true
          ? route.params
          : typeof routeProps === 'function'
            ? routeProps(route)
            : routeProps
        : null

      // 组件挂载回调
      const onVnodeMounted = () => {
        viewRef.value = (vnode.component as any).proxy
        
        // 执行 beforeRouteEnter 的 next 回调
        if (matchedRoute.enterCallbacks[props.name]) {
          matchedRoute.enterCallbacks[props.name].forEach(
            callback => callback(viewRef.value!)
          )
        }
      }

      // 组件卸载回调
      const onVnodeUnmounted = () => {
        viewRef.value = null
      }

      // 创建 VNode
      const vnode = h(
        ViewComponent,
        Object.assign({}, componentProps, attrs, {
          onVnodeMounted,
          onVnodeUnmounted,
          ref: viewRef
        })
      )

      // 作用域插槽
      return slots.default
        ? slots.default({ Component: vnode, route })
        : vnode
    }
  }
})
```

## 核心机制

**深度追踪**：

```typescript
// 每层 RouterView 增加深度
const depth = inject(viewDepthKey, 0)
provide(viewDepthKey, depth + 1)

// 根据深度获取匹配记录
const matchedRoute = routeToDisplay.value.matched[depth]
```

嵌套路由示例：

```typescript
// matched = [AdminLayout, AdminUsers]

// 外层 RouterView (depth=0)
matchedRoute = matched[0]  // AdminLayout

// 内层 RouterView (depth=1)
matchedRoute = matched[1]  // AdminUsers
```

**命名视图**：

```typescript
const ViewComponent = matchedRoute?.components?.[props.name]
```

路由配置：

```typescript
{
  path: '/admin',
  components: {
    default: AdminMain,
    sidebar: AdminSidebar
  }
}
```

模板：

```vue
<RouterView />                  <!-- AdminMain -->
<RouterView name="sidebar" />   <!-- AdminSidebar -->
```

## props 传递

```typescript
const routeProps = matchedRoute.props[props.name]

const componentProps = routeProps
  ? routeProps === true
    ? route.params                    // 布尔模式
    : typeof routeProps === 'function'
      ? routeProps(route)             // 函数模式
      : routeProps                    // 对象模式
  : null
```

三种 props 模式：

```typescript
// 布尔模式：params 作为 props
{ path: '/user/:id', component: User, props: true }

// 对象模式：静态 props
{ path: '/user', component: User, props: { id: '123' } }

// 函数模式：动态 props
{ path: '/user', component: User, props: route => ({ id: route.query.id }) }
```

## enterCallbacks 执行

```typescript
const onVnodeMounted = () => {
  // 获取组件实例
  viewRef.value = (vnode.component as any).proxy
  
  // 执行 beforeRouteEnter 的 next 回调
  const callbacks = matchedRoute.enterCallbacks[props.name]
  if (callbacks) {
    callbacks.forEach(callback => callback(viewRef.value!))
  }
}
```

这实现了 `beforeRouteEnter` 中访问组件实例：

```typescript
beforeRouteEnter(to, from, next) {
  next(vm => {
    // vm 就是这里传入的实例
    vm.doSomething()
  })
}
```

## 作用域插槽

```vue
<RouterView v-slot="{ Component, route }">
  <keep-alive>
    <component :is="Component" :key="route.path" />
  </keep-alive>
</RouterView>
```

实现：

```typescript
return slots.default
  ? slots.default({ Component: vnode, route })
  : vnode
```

## 与 Transition 配合

```vue
<RouterView v-slot="{ Component, route }">
  <transition :name="route.meta.transition || 'fade'">
    <component :is="Component" :key="route.path" />
  </transition>
</RouterView>
```

## 与 KeepAlive 配合

```vue
<RouterView v-slot="{ Component }">
  <keep-alive :include="['UserList', 'UserDetail']">
    <component :is="Component" />
  </keep-alive>
</RouterView>
```

## 本章小结

RouterView 是路由渲染的核心：

1. **深度追踪**：通过 `viewDepthKey` 确定渲染层级
2. **命名视图**：支持多个命名的 RouterView
3. **props 传递**：支持布尔、对象、函数三种模式
4. **enterCallbacks**：执行 `beforeRouteEnter` 的 next 回调
5. **作用域插槽**：暴露 Component 和 route 用于自定义渲染

理解 RouterView 的实现，有助于正确使用嵌套路由和组件过渡。
