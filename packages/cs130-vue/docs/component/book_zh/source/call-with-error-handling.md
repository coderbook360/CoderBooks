# callWithErrorHandling 错误处理

Vue 组件内的错误需要统一处理——捕获、上报、传递给错误处理器。`callWithErrorHandling` 提供了这个统一的错误处理机制。

## 为什么需要统一错误处理

组件中有很多地方可能抛出错误：
- `setup` 函数
- 生命周期钩子
- 事件处理器
- watcher 回调
- 渲染函数

如果每处都单独处理，代码会非常冗余。统一的错误处理让这些错误都能被正确捕获和处理。

## callWithErrorHandling

同步函数的错误处理：

```typescript
export function callWithErrorHandling(
  fn: Function,
  instance: ComponentInternalInstance | null,
  type: ErrorTypes,
  args?: unknown[]
) {
  let res
  try {
    res = args ? fn(...args) : fn()
  } catch (err) {
    handleError(err, instance, type)
  }
  return res
}
```

简单的 try-catch 包装，捕获同步错误。

## callWithAsyncErrorHandling

异步函数的错误处理：

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
  
  // 处理函数数组（多个钩子）
  const values = []
  for (let i = 0; i < fn.length; i++) {
    values.push(callWithAsyncErrorHandling(fn[i], instance, type, args))
  }
  return values
}
```

既处理同步错误，也处理 Promise 拒绝。

## handleError

核心错误处理函数：

```typescript
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
    
    // 向上查找错误处理器
    while (cur) {
      const errorCapturedHooks = cur.ec
      if (errorCapturedHooks) {
        for (let i = 0; i < errorCapturedHooks.length; i++) {
          // 调用 errorCaptured 钩子
          if (errorCapturedHooks[i](err, exposedInstance, errorInfo) === false) {
            return  // 返回 false 停止传播
          }
        }
      }
      cur = cur.parent
    }
    
    // 全局错误处理器
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
  
  // 最终：打印到控制台
  logError(err, type, contextVNode, throwInDev)
}
```

## 错误处理链

错误按以下顺序处理：

```
组件错误 → 父组件 errorCaptured → ... → 根组件 errorCaptured → app.config.errorHandler → console
```

任何一层都可以通过返回 `false` 阻止继续传播。

## ErrorTypes

错误类型枚举：

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
```

每种类型有对应的描述：

```typescript
export const ErrorTypeStrings: Record<number | string, string> = {
  [ErrorCodes.SETUP_FUNCTION]: 'setup function',
  [ErrorCodes.RENDER_FUNCTION]: 'render function',
  [ErrorCodes.WATCH_GETTER]: 'watcher getter',
  [ErrorCodes.WATCH_CALLBACK]: 'watcher callback',
  // ...
}
```

## errorCaptured 钩子

组件可以捕获子组件的错误：

```javascript
export default {
  errorCaptured(err, instance, info) {
    console.log('Caught error:', err)
    console.log('From component:', instance)
    console.log('Error info:', info)
    
    // 返回 false 阻止向上传播
    return false
  }
}
```

Composition API 中使用 `onErrorCaptured`：

```javascript
setup() {
  onErrorCaptured((err, instance, info) => {
    // 处理错误
    return false
  })
}
```

## app.config.errorHandler

全局错误处理器：

```javascript
const app = createApp(App)

app.config.errorHandler = (err, instance, info) => {
  // 发送到错误监控服务
  reportError(err, {
    component: instance?.$options.name,
    info
  })
}
```

推荐用于生产环境的错误监控。

## 使用场景

### setup 中的错误

```typescript
const setupResult = callWithErrorHandling(
  setup,
  instance,
  ErrorCodes.SETUP_FUNCTION,
  [props, setupContext]
)
```

### 生命周期钩子

```typescript
// 多个钩子可能注册到同一个生命周期
callWithAsyncErrorHandling(hooks, instance, type)
```

### watcher 回调

```typescript
callWithAsyncErrorHandling(
  cb,
  instance,
  ErrorCodes.WATCH_CALLBACK,
  [newValue, oldValue, onCleanup]
)
```

### 事件处理器

```typescript
callWithAsyncErrorHandling(
  handler,
  instance,
  ErrorCodes.COMPONENT_EVENT_HANDLER,
  args
)
```

## logError

最终的错误输出：

```typescript
function logError(
  err: unknown,
  type: ErrorTypes,
  contextVNode: VNode | null,
  throwInDev = true
) {
  const info = ErrorTypeStrings[type]
  
  if (__DEV__) {
    warn(`Unhandled error during execution of ${info}`)
  }
  
  // 开发环境抛出，生产环境只打印
  if (__DEV__ && throwInDev) {
    throw err
  } else {
    console.error(err)
  }
}
```

开发环境会抛出错误，便于调试；生产环境只打印到控制台。

## 错误边界

利用 `errorCaptured` 实现错误边界：

```vue
<template>
  <div v-if="error" class="error">
    <p>出错了：{{ error.message }}</p>
    <button @click="retry">重试</button>
  </div>
  <slot v-else></slot>
</template>

<script setup>
import { ref, onErrorCaptured } from 'vue'

const error = ref(null)

onErrorCaptured((err) => {
  error.value = err
  return false  // 阻止继续传播
})

function retry() {
  error.value = null
}
</script>
```

使用：

```vue
<ErrorBoundary>
  <SuspiciousComponent />
</ErrorBoundary>
```

## 异步错误

`callWithAsyncErrorHandling` 处理异步错误：

```javascript
async function handler() {
  throw new Error('Async error')
}

// 能正确捕获
callWithAsyncErrorHandling(handler, instance, type)
```

内部会处理 Promise 的 catch：

```typescript
if (res && isPromise(res)) {
  res.catch(err => {
    handleError(err, instance, type)
  })
}
```

## 多个回调

生命周期可能有多个回调：

```javascript
onMounted(fn1)
onMounted(fn2)
onMounted(fn3)
```

`callWithAsyncErrorHandling` 支持数组：

```typescript
if (isFunction(fn)) {
  // 单个函数
} else {
  // 函数数组
  const values = []
  for (let i = 0; i < fn.length; i++) {
    values.push(callWithAsyncErrorHandling(fn[i], instance, type, args))
  }
  return values
}
```

每个回调独立处理，一个失败不影响其他。

## 最佳实践

### 使用全局处理器

```javascript
app.config.errorHandler = (err, instance, info) => {
  // 1. 记录错误
  console.error(`Error in ${info}:`, err)
  
  // 2. 上报到监控服务
  Sentry.captureException(err, {
    extra: { info, component: instance?.$options.name }
  })
}
```

### 局部错误恢复

```javascript
onErrorCaptured((err, instance, info) => {
  if (canRecover(err)) {
    recover()
    return false  // 已处理，停止传播
  }
  // 无法恢复，继续传播
})
```

### 错误边界组件

```javascript
// ErrorBoundary.vue
export default {
  data: () => ({ error: null }),
  errorCaptured(err) {
    this.error = err
    return false
  },
  render() {
    return this.error 
      ? h('div', 'Something went wrong') 
      : this.$slots.default?.()
  }
}
```

## 小结

Vue 的错误处理机制：

1. **统一捕获**：`callWithErrorHandling` 包装所有可能出错的调用
2. **向上传播**：错误从子组件向父组件传播
3. **多层处理**：`errorCaptured` 钩子可在任意层拦截
4. **全局兜底**：`app.config.errorHandler` 最终处理

这个机制让错误处理变得简单统一，同时保持了灵活性。

下一章将分析 `createSetupContext`——setup 第二个参数的创建过程。
