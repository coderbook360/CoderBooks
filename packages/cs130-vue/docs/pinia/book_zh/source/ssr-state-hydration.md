# SSR 状态水合

水合（Hydration）是客户端接管服务端渲染内容的过程。这一章分析状态水合的实现。

## 水合概念

```
服务端 HTML + 状态 → 客户端 Vue 接管 → 状态恢复 → 交互可用
```

Pinia 的状态水合是这个过程的一部分。

## 水合流程

```typescript
// 1. 服务端序列化状态到 HTML
<script>window.__PINIA_STATE__ = {...}</script>

// 2. 客户端读取状态
const initialState = window.__PINIA_STATE__

// 3. 恢复到 Pinia
pinia.state.value = initialState

// 4. Store 使用恢复的状态
const store = useUserStore()
// store.$state 已经是服务端的值
```

## Pinia 的水合机制

createPinia 时自动处理：

```typescript
function createPinia(): Pinia {
  const state = ref({})
  
  const pinia: Pinia = {
    state,
    install(app) {
      // 水合处理
      if (typeof window !== 'undefined') {
        const serverState = (window as any).__PINIA_STATE__
        if (serverState) {
          // 合并服务端状态
          this.state.value = serverState
          // 清理
          delete (window as any).__PINIA_STATE__
        }
      }
    }
  }
  
  return pinia
}
```

## Store 水合

Store 创建时检查是否有预设状态：

```typescript
function createSetupStore(id, setup, options, pinia) {
  // 检查是否有服务端状态
  const initialState = pinia.state.value[id]
  
  // 执行 setup 获取默认状态
  const setupStore = setup()
  
  // 合并服务端状态
  if (initialState) {
    store.$patch(initialState)
  }
  
  return store
}
```

## 状态合并策略

服务端状态优先：

```typescript
function hydrateStore(store: Store, serverState: any) {
  // 服务端状态覆盖本地默认值
  for (const key in serverState) {
    if (key in store.$state) {
      store.$state[key] = serverState[key]
    }
  }
}
```

## 深度合并

嵌套对象的处理：

```typescript
function deepMerge(target: any, source: any) {
  for (const key in source) {
    const targetValue = target[key]
    const sourceValue = source[key]
    
    if (
      targetValue !== null &&
      typeof targetValue === 'object' &&
      sourceValue !== null &&
      typeof sourceValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
      // 递归合并对象
      deepMerge(targetValue, sourceValue)
    } else {
      // 直接覆盖
      target[key] = sourceValue
    }
  }
  return target
}
```

## 响应式水合

确保水合后状态保持响应式：

```typescript
function hydrateState(pinia: Pinia, serverState: any) {
  // pinia.state 已经是 ref，内部是响应式的
  // 直接赋值保持响应性
  for (const storeId in serverState) {
    if (pinia.state.value[storeId]) {
      // 已存在的 Store 使用 $patch
      const store = pinia._s.get(storeId)
      if (store) {
        store.$patch(serverState[storeId])
      }
    } else {
      // 新 Store 直接设置
      pinia.state.value[storeId] = serverState[storeId]
    }
  }
}
```

## 水合时机

水合应该在 Store 使用前完成：

```typescript
// entry-client.ts
import { createApp } from './app'

const { app, pinia } = createApp()

// 先水合
if (window.__PINIA_STATE__) {
  pinia.state.value = window.__PINIA_STATE__
  delete window.__PINIA_STATE__
}

// 再挂载
app.mount('#app')
```

## 延迟水合

某些情况需要延迟水合：

```typescript
// 标记需要延迟水合的 Store
const DELAYED_STORES = ['heavyData', 'analytics']

function hydrateWithDelay(pinia: Pinia, serverState: any) {
  const immediate: any = {}
  const delayed: any = {}
  
  for (const id in serverState) {
    if (DELAYED_STORES.includes(id)) {
      delayed[id] = serverState[id]
    } else {
      immediate[id] = serverState[id]
    }
  }
  
  // 立即水合
  pinia.state.value = immediate
  
  // 延迟水合
  requestIdleCallback(() => {
    for (const id in delayed) {
      pinia.state.value[id] = delayed[id]
    }
  })
}
```

## 增量水合

只水合变化的部分：

```typescript
function incrementalHydrate(store: Store, serverState: any) {
  const currentState = store.$state
  const patches: any = {}
  
  for (const key in serverState) {
    // 只更新不同的值
    if (JSON.stringify(currentState[key]) !== JSON.stringify(serverState[key])) {
      patches[key] = serverState[key]
    }
  }
  
  if (Object.keys(patches).length > 0) {
    store.$patch(patches)
  }
}
```

## 水合验证

确保水合数据有效：

```typescript
function validateAndHydrate(pinia: Pinia, serverState: any) {
  // 类型检查
  if (typeof serverState !== 'object' || serverState === null) {
    console.warn('Invalid SSR state, skipping hydration')
    return
  }
  
  // 逐个 Store 验证
  for (const storeId in serverState) {
    const storeState = serverState[storeId]
    
    // 检查是否是预期的 Store
    if (!isExpectedStore(storeId)) {
      console.warn(`Unknown store "${storeId}" in SSR state`)
      continue
    }
    
    // 应用状态
    pinia.state.value[storeId] = storeState
  }
}
```

## 水合错误处理

```typescript
function safeHydrate(pinia: Pinia) {
  try {
    const serverState = window.__PINIA_STATE__
    
    if (!serverState) return
    
    pinia.state.value = serverState
    delete window.__PINIA_STATE__
    
  } catch (error) {
    console.error('Pinia hydration failed:', error)
    // 继续使用默认状态
  }
}
```

## Mismatch 处理

服务端和客户端状态不匹配：

```typescript
// 开发环境检测不匹配
if (__DEV__) {
  const store = useUserStore()
  
  onMounted(() => {
    const clientState = JSON.stringify(store.$state)
    const serverState = window.__DEBUG_SERVER_STATE__?.[store.$id]
    
    if (serverState && clientState !== serverState) {
      console.warn(
        `Hydration mismatch in store "${store.$id}"`,
        '\nServer:', JSON.parse(serverState),
        '\nClient:', store.$state
      )
    }
  })
}
```

## 与 Vue 水合协调

确保 Pinia 水合和 Vue 水合同步：

```typescript
// entry-client.ts
async function bootstrap() {
  const { app, pinia, router } = createApp()
  
  // 1. 水合 Pinia
  if (window.__PINIA_STATE__) {
    pinia.state.value = window.__PINIA_STATE__
  }
  
  // 2. 等待路由就绪
  await router.isReady()
  
  // 3. 挂载应用（触发 Vue 水合）
  app.mount('#app')
}

bootstrap()
```

## Nuxt 中的水合

Nuxt 自动处理水合：

```typescript
// 在 Nuxt 插件中
export default defineNuxtPlugin((nuxtApp) => {
  // Nuxt 自动处理 Pinia 状态水合
  // 通过 useState 和 payload 机制
  
  // 可以监听水合事件
  nuxtApp.hook('app:suspense:resolve', () => {
    console.log('Hydration complete')
  })
})
```

## 水合后的初始化

某些逻辑需要在水合后执行：

```typescript
const useUserStore = defineStore('user', {
  state: () => ({
    token: '',
    user: null
  }),
  actions: {
    async init() {
      // 检查 token 是否有效
      if (this.token) {
        try {
          await this.validateToken()
        } catch {
          this.token = ''
          this.user = null
        }
      }
    }
  }
})

// 客户端水合后初始化
if (typeof window !== 'undefined') {
  const store = useUserStore()
  store.init()
}
```

## 调试水合

```typescript
// 开发环境调试
if (__DEV__) {
  const originalState = window.__PINIA_STATE__
  
  if (originalState) {
    console.group('Pinia SSR Hydration')
    console.log('Server state:', originalState)
    console.log('Stores:', Object.keys(originalState))
    console.groupEnd()
  }
}
```

## 性能监控

```typescript
function monitorHydration(pinia: Pinia) {
  const start = performance.now()
  
  // 水合
  if (window.__PINIA_STATE__) {
    pinia.state.value = window.__PINIA_STATE__
    delete window.__PINIA_STATE__
  }
  
  const duration = performance.now() - start
  
  if (__DEV__) {
    console.log(`Pinia hydration took ${duration.toFixed(2)}ms`)
  }
  
  // 上报性能数据
  if (duration > 100) {
    reportSlowHydration(duration)
  }
}
```

## 总结

状态水合是 SSR 的关键步骤。Pinia 通过简单的状态合并机制实现水合，同时保持响应式特性。理解水合流程有助于排查 SSR 相关问题。

至此，Pinia 源码分析部分完成。接下来我们将进入 Mini Pinia 实现部分，通过手写简化版本加深理解。
