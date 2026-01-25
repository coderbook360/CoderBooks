# 实现 RouterLink

RouterLink 是声明式导航组件，它渲染为可点击的链接，点击时触发路由导航。

## 基础实现

RouterLink 的核心是拦截点击事件，调用 router.push 进行导航：

```typescript
// components/RouterLink.ts
import { 
  defineComponent, 
  h, 
  inject, 
  computed, 
  PropType 
} from 'vue'
import { routerKey, routeKey } from '../router'
import type { RouteLocationRaw } from '../types'

export const RouterLink = defineComponent({
  name: 'RouterLink',
  
  props: {
    to: {
      type: [String, Object] as PropType<RouteLocationRaw>,
      required: true
    }
  },
  
  setup(props, { slots }) {
    const router = inject(routerKey)!
    
    function handleClick(e: MouseEvent) {
      // 阻止默认行为
      e.preventDefault()
      // 执行导航
      router.push(props.to)
    }
    
    return () => {
      // 解析目标路由获取 href
      const resolved = router.resolve(props.to)
      
      return h('a', {
        href: resolved.fullPath,
        onClick: handleClick
      }, slots.default?.())
    }
  }
})
```

这个基础版本已经能工作，但还缺少一些重要功能：活动状态检测、特殊点击处理、自定义渲染等。

## 活动状态检测

RouterLink 需要知道当前链接是否处于活动状态：

```typescript
export const RouterLink = defineComponent({
  name: 'RouterLink',
  
  props: {
    to: {
      type: [String, Object] as PropType<RouteLocationRaw>,
      required: true
    },
    activeClass: {
      type: String,
      default: 'router-link-active'
    },
    exactActiveClass: {
      type: String,
      default: 'router-link-exact-active'
    }
  },
  
  setup(props, { slots }) {
    const router = inject(routerKey)!
    const currentRoute = inject(routeKey)!
    
    // 解析目标路由
    const targetRoute = computed(() => router.resolve(props.to))
    
    // 检查是否活动（包含匹配）
    const isActive = computed(() => {
      const currentPath = currentRoute.value.path
      const targetPath = targetRoute.value.path
      
      // 当前路径是否以目标路径开头
      return currentPath.startsWith(targetPath) && (
        currentPath === targetPath ||
        currentPath[targetPath.length] === '/'
      )
    })
    
    // 检查是否精确活动
    const isExactActive = computed(() => {
      return currentRoute.value.path === targetRoute.value.path
    })
    
    function handleClick(e: MouseEvent) {
      e.preventDefault()
      router.push(props.to)
    }
    
    return () => {
      const classes: Record<string, boolean> = {}
      
      if (isActive.value) {
        classes[props.activeClass] = true
      }
      if (isExactActive.value) {
        classes[props.exactActiveClass] = true
      }
      
      return h('a', {
        href: targetRoute.value.fullPath,
        class: classes,
        onClick: handleClick
      }, slots.default?.())
    }
  }
})
```

isActive 表示包含匹配——当前路径以目标路径开头时为真。比如当前在 `/users/123`，链接到 `/users` 就是活动的。isExactActive 表示精确匹配——路径完全相同。

## 处理特殊点击

用户可能使用修饰键点击链接（如 Ctrl+Click 在新标签页打开）：

```typescript
function handleClick(e: MouseEvent) {
  // 不处理带修饰键的点击
  if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey) {
    return
  }
  
  // 不处理非左键点击
  if (e.button !== 0) {
    return
  }
  
  // 如果事件已被阻止，不处理
  if (e.defaultPrevented) {
    return
  }
  
  e.preventDefault()
  router.push(props.to)
}
```

## replace 模式

有时候需要替换而不是添加历史记录：

```typescript
props: {
  to: {
    type: [String, Object] as PropType<RouteLocationRaw>,
    required: true
  },
  replace: {
    type: Boolean,
    default: false
  }
  // ...其他 props
},

setup(props, { slots }) {
  // ...
  
  function handleClick(e: MouseEvent) {
    if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey) return
    if (e.button !== 0) return
    if (e.defaultPrevented) return
    
    e.preventDefault()
    
    if (props.replace) {
      router.replace(props.to)
    } else {
      router.push(props.to)
    }
  }
  
  // ...
}
```

## 自定义渲染

通过 custom prop 和作用域插槽支持完全自定义渲染：

```typescript
export const RouterLink = defineComponent({
  name: 'RouterLink',
  
  props: {
    to: {
      type: [String, Object] as PropType<RouteLocationRaw>,
      required: true
    },
    custom: {
      type: Boolean,
      default: false
    },
    replace: {
      type: Boolean,
      default: false
    },
    activeClass: {
      type: String,
      default: 'router-link-active'
    },
    exactActiveClass: {
      type: String,
      default: 'router-link-exact-active'
    }
  },
  
  setup(props, { slots }) {
    const router = inject(routerKey)!
    const currentRoute = inject(routeKey)!
    
    const targetRoute = computed(() => router.resolve(props.to))
    
    const isActive = computed(() => {
      const current = currentRoute.value.path
      const target = targetRoute.value.path
      return current.startsWith(target) && (
        current === target || current[target.length] === '/'
      )
    })
    
    const isExactActive = computed(() => {
      return currentRoute.value.path === targetRoute.value.path
    })
    
    function navigate(e?: MouseEvent) {
      if (e) {
        if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey) return
        if (e.button !== undefined && e.button !== 0) return
        if (e.defaultPrevented) return
        e.preventDefault()
      }
      
      const method = props.replace ? router.replace : router.push
      method(props.to)
    }
    
    return () => {
      const route = targetRoute.value
      
      // 作用域插槽数据
      const slotData = {
        route,
        href: route.fullPath,
        isActive: isActive.value,
        isExactActive: isExactActive.value,
        navigate
      }
      
      // 自定义模式：只调用插槽
      if (props.custom) {
        return slots.default?.(slotData)
      }
      
      // 默认模式：渲染 a 标签
      const classes: Record<string, boolean> = {}
      if (isActive.value) classes[props.activeClass] = true
      if (isExactActive.value) classes[props.exactActiveClass] = true
      
      return h('a', {
        href: route.fullPath,
        class: classes,
        onClick: navigate
      }, slots.default?.(slotData))
    }
  }
})
```

## aria 属性支持

为了可访问性，添加 aria 属性：

```typescript
return () => {
  const route = targetRoute.value
  
  const slotData = {
    route,
    href: route.fullPath,
    isActive: isActive.value,
    isExactActive: isExactActive.value,
    navigate
  }
  
  if (props.custom) {
    return slots.default?.(slotData)
  }
  
  const classes: Record<string, boolean> = {}
  if (isActive.value) classes[props.activeClass] = true
  if (isExactActive.value) classes[props.exactActiveClass] = true
  
  return h('a', {
    href: route.fullPath,
    class: classes,
    onClick: navigate,
    'aria-current': isExactActive.value ? 'page' : undefined
  }, slots.default?.(slotData))
}
```

## 完整实现

```typescript
// components/RouterLink.ts
import { 
  defineComponent, 
  h, 
  inject, 
  computed, 
  PropType 
} from 'vue'
import { routerKey, routeKey } from '../router'
import type { RouteLocationRaw, RouteLocation } from '../types'

export const RouterLink = defineComponent({
  name: 'RouterLink',
  
  props: {
    to: {
      type: [String, Object] as PropType<RouteLocationRaw>,
      required: true
    },
    custom: {
      type: Boolean,
      default: false
    },
    replace: {
      type: Boolean,
      default: false
    },
    activeClass: {
      type: String,
      default: 'router-link-active'
    },
    exactActiveClass: {
      type: String,
      default: 'router-link-exact-active'
    }
  },
  
  setup(props, { slots }) {
    const router = inject(routerKey)!
    const currentRoute = inject(routeKey)!
    
    const targetRoute = computed(() => router.resolve(props.to))
    
    const isActive = computed(() => {
      const current = currentRoute.value.path
      const target = targetRoute.value.path
      return current.startsWith(target) && (
        current === target || current[target.length] === '/'
      )
    })
    
    const isExactActive = computed(() => {
      return currentRoute.value.path === targetRoute.value.path
    })
    
    function navigate(e?: MouseEvent) {
      if (e) {
        if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey) return
        if (e.button !== undefined && e.button !== 0) return
        if (e.defaultPrevented) return
        e.preventDefault()
      }
      
      const method = props.replace ? router.replace : router.push
      method(props.to)
    }
    
    return () => {
      const route = targetRoute.value
      
      const slotData = {
        route,
        href: route.fullPath,
        isActive: isActive.value,
        isExactActive: isExactActive.value,
        navigate
      }
      
      if (props.custom) {
        return slots.default?.(slotData)
      }
      
      const classes: Record<string, boolean> = {}
      if (isActive.value) classes[props.activeClass] = true
      if (isExactActive.value) classes[props.exactActiveClass] = true
      
      return h('a', {
        href: route.fullPath,
        class: classes,
        onClick: navigate,
        'aria-current': isExactActive.value ? 'page' : undefined
      }, slots.default?.(slotData))
    }
  }
})
```

## 使用示例

基本用法：

```html
<template>
  <RouterLink to="/about">About</RouterLink>
</template>
```

对象形式：

```html
<template>
  <RouterLink :to="{ name: 'user', params: { id: userId } }">
    User Profile
  </RouterLink>
</template>
```

自定义渲染：

```html
<template>
  <RouterLink to="/about" custom v-slot="{ navigate, isActive }">
    <button @click="navigate" :class="{ active: isActive }">
      About
    </button>
  </RouterLink>
</template>
```

替换模式：

```html
<template>
  <RouterLink to="/login" replace>Login</RouterLink>
</template>
```

## 本章小结

RouterLink 的实现要点：

1. **点击拦截**：阻止默认行为，调用 router.push
2. **活动状态**：isActive（包含匹配）和 isExactActive（精确匹配）
3. **修饰键处理**：允许 Ctrl+Click 等在新标签页打开
4. **replace 模式**：支持替换而非添加历史记录
5. **自定义渲染**：通过 custom prop 和作用域插槽
6. **可访问性**：添加适当的 aria 属性

RouterLink 把命令式的 router.push 封装成了声明式的组件。
