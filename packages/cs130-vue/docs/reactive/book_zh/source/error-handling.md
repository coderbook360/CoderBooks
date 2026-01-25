# 错误处理：响应式系统的容错机制

响应式系统中的错误需要妥善处理，避免一个错误导致整个应用崩溃。本章分析 Vue 的错误处理机制。

## 错误处理函数

Vue 提供两个核心的错误处理函数：

```typescript
export function callWithErrorHandling(
  fn: Function,
  instance: ComponentInternalInstance | null | undefined,
  type: ErrorTypes,
  args?: unknown[],
): any {
  try {
    return args ? fn(...args) : fn()
  } catch (err) {
    handleError(err, instance, type)
  }
}

export function callWithAsyncErrorHandling(
  fn: Function | Function[],
  instance: ComponentInternalInstance | null | undefined,
  type: ErrorTypes,
  args?: unknown[],
): any {
  if (isFunction(fn)) {
    const res = callWithErrorHandling(fn, instance, type, args)
    if (res && isPromise(res)) {
      res.catch(err => {
        handleError(err, instance, type)
      })
    }
    return res
  }

  if (isArray(fn)) {
    const values: any[] = []
    for (let i = 0; i < fn.length; i++) {
      values.push(callWithAsyncErrorHandling(fn[i], instance, type, args))
    }
    return values
  }
}
```

## 同步错误处理

callWithErrorHandling 处理同步错误：

```typescript
// 在 watch getter 中使用
getter = () =>
  callWithErrorHandling(source, instance, ErrorCodes.WATCH_GETTER)
```

如果 getter 抛出错误，错误被捕获并通过 handleError 报告，不会中断应用。

## 异步错误处理

callWithAsyncErrorHandling 处理同步和异步错误：

```typescript
// 在 watch callback 中使用
callWithAsyncErrorHandling(cb, instance, ErrorCodes.WATCH_CALLBACK, [
  newValue,
  oldValue,
  onCleanup,
])
```

如果回调返回 Promise，其 rejection 也会被捕获。

## 错误类型

Vue 定义了多种错误类型：

```typescript
export enum ErrorCodes {
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
  SCHEDULER,
  COMPONENT_UPDATE,
  APP_UNMOUNT_CLEANUP,
}
```

每种类型对应不同的上下文，帮助开发者定位问题。

## handleError 函数

```typescript
export function handleError(
  err: unknown,
  instance: ComponentInternalInstance | null | undefined,
  type: ErrorTypes,
  throwInDev = true,
): void {
  // 获取组件链
  const contextVNode = instance ? instance.vnode : null
  
  if (instance) {
    let cur = instance.parent
    // 遍历父组件链
    const exposedInstance = instance.proxy
    // ...
    
    // 调用错误处理器
    const appErrorHandler = instance.appContext.config.errorHandler
    if (appErrorHandler) {
      pause()
      callWithErrorHandling(appErrorHandler, null, ErrorCodes.APP_ERROR_HANDLER, [
        err,
        exposedInstance,
        errorInfo,
      ])
      resume()
      return
    }
  }
  
  logError(err, type, contextVNode, throwInDev)
}
```

错误处理流程：

1. 获取组件上下文
2. 查找 app 级别的 errorHandler
3. 如果有，调用它
4. 否则输出错误日志

## 用户自定义错误处理

用户可以配置全局错误处理器：

```typescript
app.config.errorHandler = (err, instance, info) => {
  // 自定义错误处理
  console.error('Vue error:', err)
  console.log('Component:', instance)
  console.log('Error info:', info)
  
  // 发送到错误追踪服务
  errorTracker.report(err)
}
```

## watch 中的错误处理

watch 的各个阶段都有错误处理：

**getter 错误**：
```typescript
getter = () =>
  callWithErrorHandling(source, instance, ErrorCodes.WATCH_GETTER)
```

**callback 错误**：
```typescript
callWithAsyncErrorHandling(cb, instance, ErrorCodes.WATCH_CALLBACK, args)
```

**cleanup 错误**：
```typescript
cleanup = effect.onStop = () => {
  callWithErrorHandling(fn, instance, ErrorCodes.WATCH_CLEANUP)
}
```

## 调度器中的错误

调度器执行 job 时也有错误处理：

```typescript
function flushJobs(seen?: CountMap) {
  // ...
  try {
    for (flushIndex = 0; flushIndex < queue.length; flushIndex++) {
      const job = queue[flushIndex]
      if (job && job.active !== false) {
        callWithErrorHandling(job, null, ErrorCodes.SCHEDULER)
      }
    }
  } finally {
    // 确保清理工作继续
    flushIndex = 0
    queue.length = 0
    flushPostFlushCbs(seen)
    isFlushing = false
  }
}
```

单个 job 的错误不会影响其他 job。

## effect 中的错误

effect 执行时的错误处理：

```typescript
run(): T | undefined {
  if (!this.active) {
    return this.fn()
  }
  
  // 设置追踪上下文
  const prevEffect = activeEffect
  const prevShouldTrack = shouldTrack
  try {
    // ...
    return this.fn()  // 可能抛出错误
  } finally {
    // 确保上下文恢复
    activeEffect = prevEffect
    shouldTrack = prevShouldTrack
  }
}
```

使用 try/finally 确保追踪上下文正确恢复。

## 开发模式 vs 生产模式

开发模式提供更详细的错误信息：

```typescript
function logError(
  err: unknown,
  type: ErrorTypes,
  contextVNode: VNode | null,
  throwInDev = true,
): void {
  if (__DEV__) {
    // 详细的错误信息和堆栈
    const info = ErrorTypeStrings[type]
    if (contextVNode) {
      // 显示组件信息
    }
    warn(`Unhandled error during execution of ${info}.`)
    if (throwInDev) {
      throw err  // 开发模式抛出以便调试
    }
  }
  console.error(err)
}
```

## 防止错误传播

错误处理确保：

1. 单个组件的错误不会影响其他组件
2. 单个 effect 的错误不会阻止其他 effect
3. 清理函数的错误不会阻止其他清理

```typescript
// stop 中的清理
for (i = 0, l = this.cleanups.length; i < l; i++) {
  // 每个清理函数独立执行
  // 如果有错误处理，一个失败不会阻止其他
  this.cleanups[i]()
}
```

## 异步组件的错误边界

组件可以定义 onErrorCaptured：

```typescript
setup() {
  onErrorCaptured((err, instance, info) => {
    console.log('Child error:', err)
    return false  // 阻止错误继续传播
  })
}
```

这提供了组件级别的错误边界。

## 警告系统

除了错误，Vue 还有警告系统：

```typescript
export function warn(msg: string, ...args: any[]): void {
  if (__DEV__) {
    // 暂停追踪，避免警告触发 effect
    pause()
    console.warn(`[Vue warn] ${msg}`, ...args)
    resume()
  }
}
```

警告在生产模式被移除，不影响性能。

## 本章小结

Vue 的错误处理机制通过 callWithErrorHandling 和 callWithAsyncErrorHandling 捕获错误，通过 handleError 统一处理。用户可以通过 errorHandler 自定义错误处理逻辑。

这种设计确保单个错误不会导致整个应用崩溃，同时提供足够的信息帮助开发者定位和修复问题。
