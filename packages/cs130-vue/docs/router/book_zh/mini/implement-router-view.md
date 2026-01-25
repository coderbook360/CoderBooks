# 实现 RouterView

RouterView 是路由系统的渲染出口，它根据当前路由显示对应的组件。

## 基础结构

RouterView 的核心职责是从当前路由的 matched 数组中找到对应深度的组件并渲染：

```typescript
// components/RouterView.ts
import { 
  defineComponent, 
  h, 
  inject, 
  provide, 
  ref, 
  computed,
  Ref
} from 'vue'
import { routeKey, routerViewDepthKey, matchedRouteKey } from '../router'
import type { RouteLocation, RouteRecord } from '../types'

export const RouterView = defineComponent({
  name: 'RouterView',
  
  props: {
    name: {
      type: String,
      default: 'default'
    }
  },
  
  setup(props, { slots }) {
    // 获取当前路由
    const currentRoute = inject(routeKey)!
    
    // 获取当前深度
    const depth = inject(routerViewDepthKey, ref(0))
    
    // 计算当前层级的路由记录
    const matchedRoute = computed(() => {
      return currentRoute.value.matched[depth.value]
    })
    
    // 为子 RouterView 提供递增的深度
    provide(routerViewDepthKey, computed(() => depth.value + 1))
    
    // 提供当前匹配的路由记录
    provide(matchedRouteKey, matchedRoute)
    
    return () => {
      const route = matchedRoute.value
      
      // 没有匹配的路由
      if (!route) {
        return slots.default?.()
      }
      
      // 获取对应名称的组件
      const component = route.components[props.name]
      
      if (!component) {
        return slots.default?.()
      }
      
      // 渲染组件
      return h(component)
    }
  }
})
```

深度管理是嵌套路由的关键。每个 RouterView 注入当前深度，然后为子组件提供递增后的深度。这样嵌套的 RouterView 就能正确找到对应层级的组件。

## Props 传递

路由可以配置把参数作为 props 传递给组件：

```typescript
export const RouterView = defineComponent({
  name: 'RouterView',
  
  props: {
    name: {
      type: String,
      default: 'default'
    }
  },
  
  setup(props, { slots }) {
    const currentRoute = inject(routeKey)!
    const depth = inject(routerViewDepthKey, ref(0))
    
    const matchedRoute = computed(() => {
      return currentRoute.value.matched[depth.value]
    })
    
    provide(routerViewDepthKey, computed(() => depth.value + 1))
    provide(matchedRouteKey, matchedRoute)
    
    return () => {
      const route = matchedRoute.value
      if (!route) return slots.default?.()
      
      const component = route.components[props.name]
      if (!component) return slots.default?.()
      
      // 处理 props
      const propsData = resolveProps(route, props.name, currentRoute.value)
      
      return h(component, propsData)
    }
  }
})

function resolveProps(
  route: RouteRecord,
  name: string,
  currentRoute: RouteLocation
): Record<string, unknown> | undefined {
  const config = route.props[name]
  
  if (!config) {
    return undefined
  }
  
  // props: true - 把路由参数作为 props
  if (config === true) {
    return currentRoute.params
  }
  
  // props: { ... } - 静态 props
  if (typeof config === 'object') {
    return config
  }
  
  // props: (route) => ({ ... }) - 函数形式
  if (typeof config === 'function') {
    return config(currentRoute)
  }
  
  return undefined
}
```

## 作用域插槽支持

RouterView 可以通过作用域插槽自定义渲染：

```typescript
export const RouterView = defineComponent({
  name: 'RouterView',
  
  props: {
    name: {
      type: String,
      default: 'default'
    }
  },
  
  setup(props, { slots }) {
    const currentRoute = inject(routeKey)!
    const depth = inject(routerViewDepthKey, ref(0))
    
    const matchedRoute = computed(() => {
      return currentRoute.value.matched[depth.value]
    })
    
    provide(routerViewDepthKey, computed(() => depth.value + 1))
    provide(matchedRouteKey, matchedRoute)
    
    return () => {
      const route = matchedRoute.value
      const component = route?.components[props.name]
      
      // 作用域插槽数据
      const slotProps = {
        Component: component ? h(component, resolveProps(route!, props.name, currentRoute.value)) : null,
        route: currentRoute.value
      }
      
      // 优先使用默认插槽
      if (slots.default) {
        return slots.default(slotProps)
      }
      
      // 没有插槽，直接渲染组件
      return slotProps.Component
    }
  }
})
```

作用域插槽让 RouterView 可以与 Transition 和 KeepAlive 配合：

```vue
<template>
  <RouterView v-slot="{ Component, route }">
    <Transition :name="route.meta.transition || 'fade'">
      <KeepAlive :include="cachedViews">
        <component :is="Component" :key="route.path" />
      </KeepAlive>
    </Transition>
  </RouterView>
</template>
```

## 组件实例管理

Vue Router 需要保存组件实例以便执行组件守卫：

```typescript
export const RouterView = defineComponent({
  name: 'RouterView',
  
  props: {
    name: {
      type: String,
      default: 'default'
    }
  },
  
  setup(props, { slots }) {
    const currentRoute = inject(routeKey)!
    const depth = inject(routerViewDepthKey, ref(0))
    
    const matchedRoute = computed(() => {
      return currentRoute.value.matched[depth.value]
    })
    
    provide(routerViewDepthKey, computed(() => depth.value + 1))
    provide(matchedRouteKey, matchedRoute)
    
    // 组件引用
    const viewRef = ref()
    
    return () => {
      const route = matchedRoute.value
      const component = route?.components[props.name]
      
      if (!component) {
        return slots.default?.({ Component: null, route: currentRoute.value })
      }
      
      const propsData = resolveProps(route!, props.name, currentRoute.value)
      
      // 创建 VNode
      const vnode = h(component, {
        ...propsData,
        ref: viewRef
      })
      
      // 保存组件实例到路由记录
      // 这样守卫执行时可以访问到实例
      if (route) {
        if (!route.instances) {
          route.instances = {}
        }
        route.instances[props.name] = viewRef
      }
      
      if (slots.default) {
        return slots.default({
          Component: vnode,
          route: currentRoute.value
        })
      }
      
      return vnode
    }
  }
})
```

## 完整实现

```typescript
// components/RouterView.ts
import { 
  defineComponent, 
  h, 
  inject, 
  provide, 
  ref, 
  computed,
  Ref
} from 'vue'
import { routeKey, routerViewDepthKey, matchedRouteKey } from '../router'
import type { RouteLocation, RouteRecord } from '../types'

function resolveProps(
  route: RouteRecord,
  name: string,
  currentRoute: RouteLocation
): Record<string, unknown> | undefined {
  const config = route.props[name]
  
  if (!config) return undefined
  if (config === true) return currentRoute.params
  if (typeof config === 'object') return config
  if (typeof config === 'function') return config(currentRoute)
  
  return undefined
}

export const RouterView = defineComponent({
  name: 'RouterView',
  
  props: {
    name: {
      type: String,
      default: 'default'
    }
  },
  
  setup(props, { slots }) {
    const currentRoute = inject(routeKey)!
    const depth = inject(routerViewDepthKey, ref(0))
    
    const matchedRoute = computed(() => {
      return currentRoute.value.matched[depth.value]
    })
    
    provide(routerViewDepthKey, computed(() => depth.value + 1))
    provide(matchedRouteKey, matchedRoute)
    
    const viewRef = ref()
    
    return () => {
      const route = matchedRoute.value
      const component = route?.components[props.name]
      
      const slotProps = {
        Component: null as any,
        route: currentRoute.value
      }
      
      if (component) {
        const propsData = resolveProps(route!, props.name, currentRoute.value)
        
        slotProps.Component = h(component, {
          ...propsData,
          ref: viewRef
        })
        
        // 保存实例引用
        if (route) {
          if (!route.instances) route.instances = {}
          route.instances[props.name] = viewRef
        }
      }
      
      if (slots.default) {
        return slots.default(slotProps)
      }
      
      return slotProps.Component
    }
  }
})
```

## 使用示例

基本使用：

```vue
<template>
  <nav>
    <RouterLink to="/">Home</RouterLink>
    <RouterLink to="/about">About</RouterLink>
  </nav>
  <RouterView />
</template>
```

命名视图：

```vue
<template>
  <RouterView name="header" />
  <RouterView />
  <RouterView name="footer" />
</template>
```

过渡动画：

```vue
<template>
  <RouterView v-slot="{ Component }">
    <Transition name="slide">
      <component :is="Component" />
    </Transition>
  </RouterView>
</template>
```

嵌套路由：

```vue
<!-- 父组件 -->
<template>
  <div class="layout">
    <aside>Sidebar</aside>
    <main>
      <!-- 子路由在这里渲染 -->
      <RouterView />
    </main>
  </div>
</template>
```

## 本章小结

RouterView 的核心机制：

1. **深度管理**：通过依赖注入传递和递增深度
2. **组件查找**：从 matched 数组中按深度获取路由记录
3. **命名视图**：支持多个出口，通过 name 属性区分
4. **Props 传递**：支持多种 props 配置方式
5. **作用域插槽**：暴露 Component 和 route 供自定义渲染
6. **实例管理**：保存组件实例供守卫使用

RouterView 是连接路由状态和视图渲染的桥梁。
