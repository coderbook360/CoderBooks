# 异步组件与 Suspense

大型应用中，不是所有组件都需要立即加载。路由页面、弹窗、图表等组件可以按需加载，减少首屏体积。

**本章内容对应用性能优化非常重要。** 我们将分析异步组件的实现原理，以及 Suspense 如何协调异步依赖。

## 异步组件的使用场景

```javascript
// 场景 1：路由懒加载
const routes = [
  {
    path: '/dashboard',
    component: defineAsyncComponent(() => import('./Dashboard.vue'))
  }
]

// 场景 2：条件渲染的大型组件
const HeavyChart = defineAsyncComponent(() => import('./HeavyChart.vue'))

// 场景 3：带完整配置
const AsyncModal = defineAsyncComponent({
  loader: () => import('./Modal.vue'),
  loadingComponent: LoadingSpinner,
  errorComponent: ErrorDisplay,
  delay: 200,      // 200ms 后才显示 loading
  timeout: 3000    // 3 秒超时
})
```

## defineAsyncComponent 实现

```javascript
function defineAsyncComponent(source) {
  // 支持简写形式
  if (isFunction(source)) {
    source = { loader: source }
  }
  
  const {
    loader,
    loadingComponent,
    errorComponent,
    delay = 200,
    timeout,
    suspensible = true,
    onError
  } = source
  
  // 共享状态
  let pendingRequest = null
  let resolvedComp = null
  let retries = 0
  
  // 重试函数
  const retry = () => {
    retries++
    pendingRequest = null
    return load()
  }
  
  // 加载函数
  const load = () => {
    if (pendingRequest) {
      return pendingRequest
    }
    
    return pendingRequest = loader()
      .catch(err => {
        if (onError) {
          return new Promise((resolve, reject) => {
            const userRetry = () => resolve(retry())
            const userFail = () => reject(err)
            onError(err, userRetry, userFail, retries + 1)
          })
        }
        throw err
      })
      .then(comp => {
        // 处理 ES Module
        if (comp && (comp.__esModule || comp[Symbol.toStringTag] === 'Module')) {
          comp = comp.default
        }
        resolvedComp = comp
        return comp
      })
  }
  
  // 返回包装组件
  return defineComponent({
    name: 'AsyncComponentWrapper',
    
    setup() {
      const instance = getCurrentInstance()
      
      // 已加载，直接返回
      if (resolvedComp) {
        return () => createInnerComp(resolvedComp, instance)
      }
      
      // 状态
      const loaded = ref(false)
      const error = ref(null)
      const delayed = ref(!!delay)
      
      // delay 定时器
      if (delay) {
        setTimeout(() => {
          delayed.value = false
        }, delay)
      }
      
      // timeout 定时器
      if (timeout) {
        setTimeout(() => {
          if (!loaded.value && !error.value) {
            error.value = new Error(`Async component timed out after ${timeout}ms.`)
          }
        }, timeout)
      }
      
      // 开始加载
      load()
        .then(() => {
          loaded.value = true
        })
        .catch(err => {
          error.value = err
        })
      
      return () => {
        if (loaded.value && resolvedComp) {
          return createInnerComp(resolvedComp, instance)
        } else if (error.value && errorComponent) {
          return h(errorComponent, { error: error.value })
        } else if (loadingComponent && !delayed.value) {
          return h(loadingComponent)
        }
        return null
      }
    }
  })
}
```

关键设计：
1. **缓存加载**：`pendingRequest` 确保只加载一次
2. **缓存结果**：`resolvedComp` 缓存加载完成的组件
3. **延迟显示 loading**：避免快速加载时闪烁
4. **超时处理**：加载过久时显示错误
5. **重试机制**：通过 `onError` 提供重试能力

## 加载状态管理

```javascript
const AsyncComp = defineAsyncComponent({
  loader: () => import('./Heavy.vue'),
  
  // 加载中显示
  loadingComponent: {
    template: '<div class="loading">Loading...</div>'
  },
  
  // 加载失败显示
  errorComponent: {
    props: ['error'],
    template: '<div class="error">{{ error.message }}</div>'
  },
  
  // 延迟显示 loading（避免闪烁）
  delay: 200,
  
  // 超时时间
  timeout: 10000
})
```

状态转换：

```
开始加载
    ↓
[0-200ms] 不显示任何内容（delay）
    ↓
[200ms+] 显示 loadingComponent
    ↓
加载成功 → 显示实际组件
加载失败/超时 → 显示 errorComponent
```

## 错误重试

```javascript
const AsyncComp = defineAsyncComponent({
  loader: () => import('./Component.vue'),
  
  onError(error, retry, fail, attempts) {
    if (error.message.includes('fetch') && attempts <= 3) {
      // 网络错误，重试 3 次
      retry()
    } else {
      // 其他错误或重试过多，放弃
      fail()
    }
  }
})
```

`onError` 参数：
- `error`：错误对象
- `retry`：重试函数
- `fail`：放弃函数
- `attempts`：已尝试次数

## Suspense 组件

Suspense 提供了声明式的异步依赖处理：

```vue-html
<Suspense>
  <template #default>
    <AsyncComponent />
  </template>
  
  <template #fallback>
    <LoadingSpinner />
  </template>
</Suspense>
```

工作原理：
1. 尝试渲染 default 插槽
2. 如果遇到异步依赖，显示 fallback
3. 异步依赖完成后，切换回 default

## Suspense 实现原理

```javascript
const Suspense = {
  name: 'Suspense',
  
  setup(props, { slots }) {
    const instance = getCurrentInstance()
    
    // 异步依赖计数
    let pendingCount = 0
    const resolved = ref(false)
    
    // 注册异步依赖
    const registerDep = (promise) => {
      pendingCount++
      
      promise.then(() => {
        pendingCount--
        if (pendingCount === 0) {
          resolved.value = true
        }
      })
    }
    
    // 提供给子组件
    provide('suspense', { registerDep })
    
    return () => {
      if (resolved.value) {
        return slots.default?.()
      } else {
        return slots.fallback?.()
      }
    }
  }
}
```

关键机制：
1. 维护 `pendingCount` 计数
2. 通过 provide 暴露 `registerDep`
3. 子组件的异步依赖会调用 `registerDep`
4. 所有依赖完成后，`resolved` 变为 true

## 异步 setup 与 Suspense

```javascript
const AsyncSetup = {
  async setup() {
    const data = await fetch('/api/data').then(r => r.json())
    return { data }
  },
  template: '<div>{{ data }}</div>'
}
```

异步 setup 返回 Promise，Suspense 会等待其完成：

```javascript
function setupStatefulComponent(instance) {
  const setupResult = setup(props, context)
  
  if (isPromise(setupResult)) {
    // 检查是否在 Suspense 内
    const suspense = inject('suspense', null)
    
    if (suspense) {
      // 注册为异步依赖
      suspense.registerDep(setupResult.then(result => {
        handleSetupResult(instance, result)
      }))
    } else {
      // 无 Suspense，直接等待
      setupResult.then(result => {
        handleSetupResult(instance, result)
      })
    }
  }
}
```

## 嵌套 Suspense

```vue-html
<Suspense>
  <template #default>
    <RouterView />
  </template>
  
  <template #fallback>
    <PageLoading />
  </template>
</Suspense>

<!-- 路由页面内部 -->
<Suspense>
  <template #default>
    <AsyncChart />
  </template>
  
  <template #fallback>
    <ChartLoading />
  </template>
</Suspense>
```

嵌套时，每个 Suspense 独立管理自己的异步依赖。

## Suspense 事件

```vue-html
<Suspense
  @resolve="onResolve"
  @pending="onPending"
  @fallback="onFallback"
>
  ...
</Suspense>
```

事件触发时机：
- `pending`：开始等待异步依赖
- `fallback`：切换到 fallback 内容
- `resolve`：所有依赖完成，显示 default

## 与路由集成

Vue Router 支持异步组件和 Suspense：

```javascript
const routes = [
  {
    path: '/dashboard',
    component: defineAsyncComponent(() => import('./Dashboard.vue'))
  }
]
```

```vue-html
<RouterView v-slot="{ Component }">
  <Suspense>
    <template #default>
      <component :is="Component" />
    </template>
    
    <template #fallback>
      <PageLoading />
    </template>
  </Suspense>
</RouterView>
```

## 本章小结

本章分析了异步组件和 Suspense：

**defineAsyncComponent**：
- 接受 loader 函数或完整配置
- 支持 loading、error 组件
- 支持 delay（延迟显示 loading）和 timeout
- 支持错误重试

**Suspense**：
- 声明式处理异步依赖
- default 插槽放异步内容
- fallback 插槽放加载状态
- 通过 provide 协调子组件的异步依赖

**异步 setup**：
- setup 可以返回 Promise
- 需要配合 Suspense 使用
- Suspense 会等待其完成

异步组件是大型应用优化的重要手段。结合路由和 Suspense，可以实现优雅的按需加载和加载状态管理。

下一章，我们将分析函数式组件的实现。
