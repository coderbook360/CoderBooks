# useSSRContext 钩子

本章分析 Vue SSR 中 `useSSRContext` 钩子的实现和使用。

## 基本概念

`useSSRContext` 允许组件访问 SSR 渲染上下文，用于传递服务端特定的数据。

```typescript
// packages/runtime-core/src/helpers/useSsrContext.ts

/**
 * SSR 上下文类型
 */
export interface SSRContext {
  /**
   * 用于收集 Teleport 内容
   */
  teleports?: Record<string, string>
  
  /**
   * 组件模块 ID（用于 CSS 收集）
   */
  modules?: Set<string>
  
  /**
   * 预加载链接
   */
  _preloadLinks?: string[]
  
  /**
   * 自定义数据
   */
  [key: string]: any
}

/**
 * useSSRContext 实现
 */
export function useSSRContext<T extends SSRContext = SSRContext>(): T | undefined {
  if (!__SSR__) {
    // 客户端环境
    if (__DEV__) {
      warn(`useSSRContext is only available during SSR.`)
    }
    return undefined
  }
  
  const instance = getCurrentInstance()
  
  if (!instance) {
    if (__DEV__) {
      warn(`useSSRContext must be called inside setup()`)
    }
    return undefined
  }
  
  // 从应用上下文获取 SSR 上下文
  return instance.appContext.config.globalProperties.$ssrContext as T
}
```

## 服务端设置

在服务端渲染时需要正确设置 SSR 上下文。

```typescript
// 服务端入口
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
import App from './App.vue'

export async function render(url: string) {
  const app = createSSRApp(App)
  
  // 创建 SSR 上下文
  const ssrContext: SSRContext = {
    url,
    teleports: {},
    modules: new Set(),
    // 自定义数据
    user: null,
    meta: {}
  }
  
  // 注入到全局属性
  app.config.globalProperties.$ssrContext = ssrContext
  
  // 渲染
  const html = await renderToString(app, ssrContext)
  
  return {
    html,
    teleports: ssrContext.teleports,
    modules: ssrContext.modules
  }
}
```

## 常见使用场景

### 收集页面元数据

```typescript
// composables/useMeta.ts
import { useSSRContext } from 'vue'

export function useMeta(meta: {
  title?: string
  description?: string
  keywords?: string[]
}) {
  const ssrContext = useSSRContext()
  
  if (ssrContext) {
    // 服务端：存储到上下文
    ssrContext.meta = ssrContext.meta || {}
    Object.assign(ssrContext.meta, meta)
  } else {
    // 客户端：直接更新 DOM
    if (meta.title) {
      document.title = meta.title
    }
    if (meta.description) {
      updateMetaTag('description', meta.description)
    }
  }
}

// 在组件中使用
setup() {
  useMeta({
    title: '页面标题',
    description: '页面描述'
  })
}
```

### 收集 CSS 模块

```typescript
// 用于 CSS 收集的 composable
export function useModuleStyles(moduleId: string) {
  const ssrContext = useSSRContext()
  
  if (ssrContext) {
    ssrContext.modules = ssrContext.modules || new Set()
    ssrContext.modules.add(moduleId)
  }
}

// 在服务端渲染后生成样式链接
function renderStyles(modules: Set<string>, manifest: Record<string, string[]>) {
  let styles = ''
  
  for (const moduleId of modules) {
    const files = manifest[moduleId]
    
    if (files) {
      for (const file of files) {
        if (file.endsWith('.css')) {
          styles += `<link rel="stylesheet" href="${file}">`
        }
      }
    }
  }
  
  return styles
}
```

### 传递用户信息

```typescript
// composables/useUser.ts
import { ref, computed } from 'vue'
import { useSSRContext } from 'vue'

export function useUser() {
  const ssrContext = useSSRContext()
  
  // 服务端：从请求中获取用户
  if (ssrContext) {
    return {
      user: computed(() => ssrContext.user),
      isAuthenticated: computed(() => !!ssrContext.user)
    }
  }
  
  // 客户端：从全局状态恢复
  const user = ref((window as any).__SSR_USER__ || null)
  
  return {
    user,
    isAuthenticated: computed(() => !!user.value)
  }
}
```

### 收集预加载链接

```typescript
// composables/usePreload.ts
export function usePreload(asset: string, as: 'script' | 'style' | 'image') {
  const ssrContext = useSSRContext()
  
  if (ssrContext) {
    ssrContext._preloadLinks = ssrContext._preloadLinks || []
    ssrContext._preloadLinks.push(`<link rel="preload" href="${asset}" as="${as}">`)
  }
}

// 渲染预加载标签
function renderPreloadLinks(context: SSRContext): string {
  if (!context._preloadLinks) return ''
  return context._preloadLinks.join('\n')
}
```

## 类型安全

为自定义的 SSR 上下文提供类型。

```typescript
// types/ssr.ts
import { SSRContext as VueSSRContext } from 'vue'

export interface AppSSRContext extends VueSSRContext {
  user: User | null
  meta: {
    title?: string
    description?: string
    keywords?: string[]
  }
  requestId: string
  locale: string
}

// 类型化的 useSSRContext
export function useAppSSRContext() {
  return useSSRContext<AppSSRContext>()
}
```

## 注意事项

```typescript
// 1. 只在 setup 中调用
setup() {
  const context = useSSRContext() // ✓ 正确
}

// 2. 检查返回值
const context = useSSRContext()
if (context) {
  // 服务端逻辑
} else {
  // 客户端逻辑
}

// 3. 不要在客户端依赖 SSR 上下文
onMounted(() => {
  // 这里 useSSRContext() 返回 undefined
  // 需要使用其他方式获取数据
})
```

## 小结

本章分析了 `useSSRContext` 钩子：

1. **基本实现**：访问 SSR 渲染上下文
2. **服务端设置**：正确初始化上下文
3. **元数据收集**：页面标题、描述等
4. **CSS 收集**：按需收集样式
5. **用户信息**：传递认证状态
6. **类型安全**：自定义上下文类型

`useSSRContext` 是 SSR 应用中服务端到客户端数据传递的关键桥梁。
