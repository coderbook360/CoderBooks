# 异步组件实现

异步组件允许按需加载组件代码，是代码分割和懒加载的基础。Vue 3 通过 defineAsyncComponent 提供了功能完善的异步组件支持。

## 基本用法

```javascript
import { defineAsyncComponent } from 'vue'

const AsyncComp = defineAsyncComponent(() =>
  import('./components/MyComponent.vue')
)
```

## defineAsyncComponent 实现

```typescript
export function defineAsyncComponent<
  T extends Component = { new (): ComponentPublicInstance }
>(source: AsyncComponentLoader<T> | AsyncComponentOptions<T>): T {
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
    onError: userOnError
  } = source

  let pendingRequest: Promise<ConcreteComponent> | null = null
  let resolvedComp: ConcreteComponent | undefined

  let retries = 0
  const retry = () => {
    retries++
    pendingRequest = null
    return load()
  }

  const load = (): Promise<ConcreteComponent> => {
    let thisRequest: Promise<ConcreteComponent>
    return (
      pendingRequest ||
      (thisRequest = pendingRequest = loader()
        .catch(err => {
          err = err instanceof Error ? err : new Error(String(err))
          if (userOnError) {
            return new Promise((resolve, reject) => {
              const userRetry = () => resolve(retry())
              const userFail = () => reject(err)
              userOnError(err, userRetry, userFail, retries + 1)
            })
          } else {
            throw err
          }
        })
        .then((comp: any) => {
          if (thisRequest !== pendingRequest && pendingRequest) {
            return pendingRequest
          }
          if (__DEV__ && !comp) {
            warn(`Async component loader resolved to undefined.`)
          }
          // 处理 ES module default export
          if (comp && (comp.__esModule || comp[Symbol.toStringTag] === 'Module')) {
            comp = comp.default
          }
          if (__DEV__ && comp && !isObject(comp) && !isFunction(comp)) {
            throw new Error(`Invalid async component load result: ${comp}`)
          }
          resolvedComp = comp
          return comp
        }))
    )
  }

  return defineComponent({
    name: 'AsyncComponentWrapper',

    __asyncLoader: load,

    get __asyncResolved() {
      return resolvedComp
    },

    setup() {
      const instance = currentInstance!

      // 已经解析过，直接返回
      if (resolvedComp) {
        return () => createInnerComp(resolvedComp!, instance)
      }

      const onError = (err: Error) => {
        pendingRequest = null
        handleError(
          err,
          instance,
          ErrorCodes.ASYNC_COMPONENT_LOADER,
          !errorComponent
        )
      }

      // Suspense 处理
      if (
        (__FEATURE_SUSPENSE__ && suspensible && instance.suspense) ||
        (__SSR__ && isInSSRComponentSetup)
      ) {
        return load()
          .then(comp => {
            return () => createInnerComp(comp, instance)
          })
          .catch(err => {
            onError(err)
            return () =>
              errorComponent
                ? createVNode(errorComponent as ConcreteComponent, { error: err })
                : null
          })
      }

      const loaded = ref(false)
      const error = ref()
      const delayed = ref(!!delay)

      if (delay) {
        setTimeout(() => {
          delayed.value = false
        }, delay)
      }

      if (timeout != null) {
        setTimeout(() => {
          if (!loaded.value && !error.value) {
            const err = new Error(`Async component timed out after ${timeout}ms.`)
            onError(err)
            error.value = err
          }
        }, timeout)
      }

      load()
        .then(() => {
          loaded.value = true
          // 父级是 KeepAlive 时的处理
          if (instance.parent && isKeepAlive(instance.parent.vnode)) {
            queueJob(instance.parent.update)
          }
        })
        .catch(err => {
          onError(err)
          error.value = err
        })

      return () => {
        if (loaded.value && resolvedComp) {
          return createInnerComp(resolvedComp, instance)
        } else if (error.value && errorComponent) {
          return createVNode(errorComponent as ConcreteComponent, {
            error: error.value
          })
        } else if (loadingComponent && !delayed.value) {
          return createVNode(loadingComponent as ConcreteComponent)
        }
      }
    }
  }) as T
}
```

## createInnerComp

创建内部组件 VNode：

```typescript
function createInnerComp(
  comp: ConcreteComponent,
  parent: ComponentInternalInstance
) {
  const { ref, props, children, ce } = parent.vnode
  const vnode = createVNode(comp, props, children)
  // 传递 ref
  vnode.ref = ref
  // 传递自定义元素回调
  vnode.ce = ce
  // 清除父级 vnode 上的引用
  delete parent.vnode.ce
  return vnode
}
```

## 加载状态管理

异步组件有三种状态：加载中、加载成功、加载失败。

```typescript
const loaded = ref(false)
const error = ref()
const delayed = ref(!!delay)  // 延迟显示 loading

// 延迟后显示 loading
if (delay) {
  setTimeout(() => {
    delayed.value = false
  }, delay)
}

// 超时处理
if (timeout != null) {
  setTimeout(() => {
    if (!loaded.value && !error.value) {
      const err = new Error(`Async component timed out after ${timeout}ms.`)
      error.value = err
    }
  }, timeout)
}
```

## 完整配置选项

```typescript
interface AsyncComponentOptions<T = any> {
  loader: AsyncComponentLoader<T>
  loadingComponent?: Component
  errorComponent?: Component
  delay?: number
  timeout?: number
  suspensible?: boolean
  onError?: (
    error: Error,
    retry: () => void,
    fail: () => void,
    attempts: number
  ) => any
}
```

## 使用示例

```javascript
const AsyncComp = defineAsyncComponent({
  // 加载函数
  loader: () => import('./MyComponent.vue'),
  
  // 加载中显示的组件
  loadingComponent: LoadingSpinner,
  
  // 加载失败显示的组件
  errorComponent: ErrorDisplay,
  
  // 显示加载组件前的延迟，默认 200ms
  delay: 200,
  
  // 超时时间
  timeout: 3000,
  
  // 定义组件是否可挂起，默认 true
  suspensible: true,
  
  // 错误处理
  onError(error, retry, fail, attempts) {
    if (error.message.match(/fetch/) && attempts <= 3) {
      retry()
    } else {
      fail()
    }
  }
})
```

## 与 Suspense 集成

当 suspensible 为 true 且在 Suspense 内部时：

```typescript
if (suspensible && instance.suspense) {
  return load()
    .then(comp => {
      return () => createInnerComp(comp, instance)
    })
    .catch(err => {
      onError(err)
      return () =>
        errorComponent
          ? createVNode(errorComponent, { error: err })
          : null
    })
}
```

返回 Promise，让 Suspense 处理 pending 状态。

## 重试机制

```typescript
let retries = 0
const retry = () => {
  retries++
  pendingRequest = null  // 清除缓存，强制重新加载
  return load()
}

// 在 onError 中使用
onError(err, userRetry, userFail, retries + 1)
```

## 去重加载

```typescript
const load = (): Promise<ConcreteComponent> => {
  let thisRequest: Promise<ConcreteComponent>
  return (
    pendingRequest ||  // 已有请求则复用
    (thisRequest = pendingRequest = loader()
      .then(comp => {
        // 检查是否被新请求替代
        if (thisRequest !== pendingRequest && pendingRequest) {
          return pendingRequest
        }
        // ...
      }))
  )
}
```

## ES Module 处理

```typescript
.then((comp: any) => {
  // 处理 ES module 的 default export
  if (comp && (comp.__esModule || comp[Symbol.toStringTag] === 'Module')) {
    comp = comp.default
  }
  // ...
})
```

## KeepAlive 兼容

```typescript
load()
  .then(() => {
    loaded.value = true
    // 父级是 KeepAlive 时触发更新
    if (instance.parent && isKeepAlive(instance.parent.vnode)) {
      queueJob(instance.parent.update)
    }
  })
```

## 路由懒加载

结合 Vue Router：

```javascript
const routes = [
  {
    path: '/dashboard',
    component: defineAsyncComponent({
      loader: () => import('./views/Dashboard.vue'),
      loadingComponent: PageLoading,
      delay: 0
    })
  }
]
```

## 组件预加载

```javascript
const AsyncComp = defineAsyncComponent(() => import('./Heavy.vue'))

// 预加载
const preload = () => {
  AsyncComp.__asyncLoader()
}

// 鼠标悬停时预加载
onMounted(() => {
  const link = document.querySelector('#nav-link')
  link?.addEventListener('mouseenter', preload, { once: true })
})
```

## 小结

异步组件的核心实现：

1. **懒加载**：使用动态 import() 按需加载
2. **状态管理**：loaded、error、delayed 三个响应式状态
3. **配置丰富**：loading、error 组件，delay、timeout
4. **重试机制**：onError 回调支持重试
5. **Suspense 集成**：suspensible 控制是否被 Suspense 管理
6. **去重优化**：pendingRequest 防止重复加载

异步组件是大型应用性能优化的关键工具。

下一章将分析函数式组件的实现。
