# 错误处理与边界

Vue 提供了完善的错误处理机制，本章分析错误捕获、传播和处理的源码实现。

## handleError 核心函数

```typescript
// packages/runtime-core/src/errorHandling.ts
export function handleError(
  err: unknown,
  instance: ComponentInternalInstance | null,
  type: ErrorTypes,
  throwInDev = true
) {
  const contextVNode = instance ? instance.vnode : null
  
  if (instance) {
    let cur = instance.parent
    const exposedInstance = instance.proxy
    const errorInfo = __DEV__ ? ErrorTypeStrings[type] : type

    // ⭐ 向上查找 errorCaptured 钩子
    while (cur) {
      const errorCapturedHooks = cur.ec
      if (errorCapturedHooks) {
        for (let i = 0; i < errorCapturedHooks.length; i++) {
          // 调用钩子，返回 false 停止传播
          if (
            errorCapturedHooks[i](err, exposedInstance, errorInfo) === false
          ) {
            return
          }
        }
      }
      cur = cur.parent
    }

    // ⭐ 全局错误处理器
    const appErrorHandler = instance.appContext.config.errorHandler
    if (appErrorHandler) {
      callWithErrorHandling(
        appErrorHandler,
        null,
        ErrorCodes.APP_ERROR_HANDLER,
        [err, exposedInstance, errorInfo]
      )
      return
    }
  }

  // 输出错误
  logError(err, type, contextVNode, throwInDev)
}
```

## ErrorCodes 错误类型

```typescript
export const enum ErrorCodes {
  SETUP_FUNCTION,
  RENDER_FUNCTION,
  WATCH_GETTER,
  WATCH_CALLBACK,
  WATCH_CLEANUP,
  NATIVE_EVENT_HANDLER,
  COMPONENT_EVENT_HANDLER,
  VNODE_HOOK,
  DIRECTIVE_HOOK,
  TRANSITION_HOOK,
  APP_ERROR_HANDLER,
  APP_WARN_HANDLER,
  FUNCTION_REF,
  ASYNC_COMPONENT_LOADER,
  SCHEDULER
}

export const ErrorTypeStrings: Record<number | string, string> = {
  [ErrorCodes.SETUP_FUNCTION]: 'setup function',
  [ErrorCodes.RENDER_FUNCTION]: 'render function',
  [ErrorCodes.WATCH_GETTER]: 'watcher getter',
  [ErrorCodes.WATCH_CALLBACK]: 'watcher callback',
  // ...
}
```

## callWithErrorHandling

```typescript
export function callWithErrorHandling(
  fn: Function,
  instance: ComponentInternalInstance | null,
  type: ErrorTypes,
  args?: unknown[]
): any {
  let res
  try {
    res = args ? fn(...args) : fn()
  } catch (err) {
    handleError(err, instance, type)
  }
  return res
}
```

## callWithAsyncErrorHandling

```typescript
export function callWithAsyncErrorHandling(
  fn: Function | Function[],
  instance: ComponentInternalInstance | null,
  type: ErrorTypes,
  args?: unknown[]
): any[] {
  if (isFunction(fn)) {
    const res = callWithErrorHandling(fn, instance, type, args)
    if (res && isPromise(res)) {
      res.catch(err => {
        handleError(err, instance, type)
      })
    }
    return res
  }

  const values = []
  for (let i = 0; i < fn.length; i++) {
    values.push(callWithAsyncErrorHandling(fn[i], instance, type, args))
  }
  return values
}
```

## errorCaptured 钩子

```typescript
// 注册
export const onErrorCaptured = (
  hook: ErrorCapturedHook,
  target: ComponentInternalInstance | null = currentInstance
) => {
  injectHook(LifecycleHooks.ERROR_CAPTURED, hook, target)
}

// 使用
onErrorCaptured((err, instance, info) => {
  console.error('Captured:', err)
  console.log('Instance:', instance)
  console.log('Info:', info)
  return false  // 返回 false 阻止传播
})
```

## 全局错误处理

```typescript
const app = createApp(App)

app.config.errorHandler = (err, instance, info) => {
  // 处理所有未被捕获的错误
  console.error('Global error:', err)
  console.log('Component:', instance)
  console.log('Error info:', info)
  
  // 发送到错误监控服务
  errorReportingService.report(err)
}
```

## 全局警告处理

```typescript
app.config.warnHandler = (msg, instance, trace) => {
  // 处理所有警告
  console.warn('Vue warning:', msg)
  console.log('Trace:', trace)
}
```

## 渲染错误处理

```typescript
const componentUpdateFn = () => {
  // 渲染函数在 try-catch 中执行
  try {
    nextTree = renderComponentRoot(instance)
  } catch (err) {
    handleError(err, instance, ErrorCodes.RENDER_FUNCTION)
    nextTree = instance.subTree
  }
}
```

## setup 错误处理

```typescript
const setupResult = callWithErrorHandling(
  setup,
  instance,
  ErrorCodes.SETUP_FUNCTION,
  [props, setupContext]
)
```

## 事件错误处理

```typescript
// 组件事件
export function emit(
  instance: ComponentInternalInstance,
  event: string,
  ...rawArgs: any[]
) {
  // ...
  if (handler) {
    callWithAsyncErrorHandling(
      handler,
      instance,
      ErrorCodes.COMPONENT_EVENT_HANDLER,
      args
    )
  }
}
```

## 生命周期钩子错误

```typescript
// invokeArrayFns 包装
const wrappedHook = function (this: unknown, ...args: unknown[]) {
  if (target.isUnmounted) {
    return
  }
  pauseTracking()
  setCurrentInstance(target)
  const res = callWithAsyncErrorHandling(hook, target, type, args)
  unsetCurrentInstance()
  resetTracking()
  return res
}
```

## logError 输出错误

```typescript
function logError(
  err: unknown,
  type: ErrorTypes,
  contextVNode: VNode | null,
  throwInDev = true
) {
  if (__DEV__) {
    const info = ErrorTypeStrings[type]
    if (contextVNode) {
      pushWarningContext(contextVNode)
    }
    warn(`Unhandled error${info ? ` during execution of ${info}` : ``}`)
    if (contextVNode) {
      popWarningContext()
    }
    if (throwInDev) {
      throw err
    } else if (!__TEST__) {
      console.error(err)
    }
  } else {
    console.error(err)
  }
}
```

## 错误边界组件

```html
<!-- ErrorBoundary.vue -->
<template>
  <slot v-if="!error" />
  <div v-else class="error-fallback">
    <h2>Something went wrong</h2>
    <p>{{ error.message }}</p>
    <button @click="reset">Try again</button>
  </div>
</template>

<script setup>
import { ref, onErrorCaptured } from 'vue'

const error = ref(null)

onErrorCaptured((err, instance, info) => {
  error.value = err
  return false
})

const reset = () => {
  error.value = null
}
</script>
```

## 使用错误边界

```html
<template>
  <ErrorBoundary>
    <DangerousComponent />
  </ErrorBoundary>
</template>
```

## 异步组件错误

```typescript
const AsyncComp = defineAsyncComponent({
  loader: () => import('./Comp.vue'),
  errorComponent: ErrorDisplay,
  onError(error, retry, fail, attempts) {
    if (attempts <= 3) {
      retry()
    } else {
      fail()
    }
  }
})
```

## 小结

错误处理与边界的核心要点：

1. **handleError**：统一错误处理入口
2. **errorCaptured**：组件级错误捕获
3. **app.config.errorHandler**：全局错误处理
4. **callWithErrorHandling**：安全调用函数
5. **错误传播**：从子到父，可阻止

下一章将分析 defineSlots 类型推导。
