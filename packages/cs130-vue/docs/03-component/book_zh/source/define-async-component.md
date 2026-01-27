# defineAsyncComponent 异步组件

defineAsyncComponent 是 Vue 3 提供的异步组件定义函数，支持懒加载、加载状态、错误处理和超时控制。

## 函数签名

```typescript
// packages/runtime-core/src/apiAsyncComponent.ts
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

  // 返回包装组件
  return defineComponent({
    name: 'AsyncComponentWrapper',
    __asyncLoader: loader,
    get __asyncResolved() {
      return resolvedComp
    },
    setup() {
      // 异步加载逻辑
    }
  }) as T
}
```

## 类型定义

```typescript
export type AsyncComponentLoader<T = any> = () => Promise<
  AsyncComponentResolveResult<T>
>

export interface AsyncComponentOptions<T = any> {
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

type AsyncComponentResolveResult<T = Component> =
  | T
  | { default: T }
```

## setup 实现

```typescript
setup() {
  const instance = currentInstance!

  // 已解析过则直接使用
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

  // ⭐ Suspense 模式
  if (
    (__FEATURE_SUSPENSE__ && suspensible && instance.suspense) ||
    (__SSR__ && isInSSRComponentSetup)
  ) {
    return loader()
      .then((comp: any) => {
        return () => createInnerComp(comp, instance)
      })
      .catch(err => {
        onError(err)
        return () =>
          errorComponent
            ? createVNode(errorComponent as ConcreteComponent, {
                error: err
              })
            : null
      })
  }

  // ⭐ 非 Suspense 模式
  const loaded = ref(false)
  const error = ref()
  const delayed = ref(!!delay)

  // delay 定时器
  if (delay) {
    setTimeout(() => {
      delayed.value = false
    }, delay)
  }

  // timeout 定时器
  if (timeout != null) {
    setTimeout(() => {
      if (!loaded.value && !error.value) {
        const err = new Error(
          `Async component timed out after ${timeout}ms.`
        )
        onError(err)
        error.value = err
      }
    }, timeout)
  }

  // 执行加载
  load()
    .then(() => {
      loaded.value = true
      // 更新父组件
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
```

## load 加载函数

```typescript
let pendingRequest: Promise<ConcreteComponent> | null = null
let resolvedComp: ConcreteComponent | undefined

const load = (): Promise<ConcreteComponent> => {
  let thisRequest: Promise<ConcreteComponent>
  
  return (
    pendingRequest ||
    (thisRequest = pendingRequest =
      loader()
        .catch(err => {
          err = err instanceof Error ? err : new Error(String(err))
          
          // 用户错误处理
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
          
          // 处理 ES module default export
          if (
            comp &&
            (comp.__esModule || comp[Symbol.toStringTag] === 'Module')
          ) {
            comp = comp.default
          }
          
          resolvedComp = comp
          return comp
        }))
  )
}
```

## retry 重试机制

```typescript
let retries = 0

const retry = () => {
  retries++
  pendingRequest = null
  return load()
}
```

## createInnerComp 创建内部组件

```typescript
function createInnerComp(
  comp: ConcreteComponent,
  parent: ComponentInternalInstance
) {
  const { ref, props, children, ce } = parent.vnode
  const vnode = createVNode(comp, props, children)
  
  // 传递 ref
  vnode.ref = ref
  // 传递 custom element 回调
  vnode.ce = ce
  // 删除外层的异步包装
  delete parent.vnode.ce
  
  return vnode
}
```

## 使用示例

### 基础用法

```typescript
import { defineAsyncComponent } from 'vue'

const AsyncComp = defineAsyncComponent(() =>
  import('./components/MyComponent.vue')
)
```

### 完整配置

```typescript
const AsyncComp = defineAsyncComponent({
  loader: () => import('./MyComponent.vue'),
  loadingComponent: LoadingSpinner,
  errorComponent: ErrorDisplay,
  delay: 200,
  timeout: 3000,
  onError(error, retry, fail, attempts) {
    if (attempts <= 3) {
      retry()
    } else {
      fail()
    }
  }
})
```

### 配合 Suspense

```html
<template>
  <Suspense>
    <template #default>
      <AsyncComp />
    </template>
    <template #fallback>
      <Loading />
    </template>
  </Suspense>
</template>

<script setup>
const AsyncComp = defineAsyncComponent(() =>
  import('./MyComponent.vue')
)
</script>
```

## delay 延迟显示

```typescript
const delayed = ref(!!delay)

if (delay) {
  setTimeout(() => {
    delayed.value = false
  }, delay)
}

// 渲染时
if (loadingComponent && !delayed.value) {
  return createVNode(loadingComponent)
}
```

delay 的作用是避免快速加载时 loading 闪烁。

## timeout 超时处理

```typescript
if (timeout != null) {
  setTimeout(() => {
    if (!loaded.value && !error.value) {
      const err = new Error(
        `Async component timed out after ${timeout}ms.`
      )
      onError(err)
      error.value = err
    }
  }, timeout)
}
```

## suspensible 选项

```typescript
if (
  (__FEATURE_SUSPENSE__ && suspensible && instance.suspense) ||
  (__SSR__ && isInSSRComponentSetup)
) {
  // 使用 Suspense 模式
  return loader().then(comp => {
    return () => createInnerComp(comp, instance)
  })
}
```

当 suspensible 为 true 且在 Suspense 内时，使用 Suspense 的 fallback。

## KeepAlive 兼容

```typescript
load()
  .then(() => {
    loaded.value = true
    // ⭐ 如果父级是 KeepAlive，触发更新
    if (instance.parent && isKeepAlive(instance.parent.vnode)) {
      queueJob(instance.parent.update)
    }
  })
```

## 小结

defineAsyncComponent 的核心要点：

1. **包装组件**：返回一个 setup 组件包装器
2. **加载状态**：loaded、error、delayed 响应式状态
3. **delay/timeout**：控制 loading 显示和超时
4. **retry 机制**：onError 回调支持重试
5. **Suspense 集成**：suspensible 选项控制

下一章将分析 KeepAlive 组件源码。
