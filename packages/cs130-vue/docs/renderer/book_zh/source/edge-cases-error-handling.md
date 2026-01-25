# 边界情况与错误处理

渲染器需要处理各种边界情况和运行时错误。健壮的错误处理机制不仅帮助开发者快速定位问题，也确保应用在异常情况下不会完全崩溃。

## 错误处理架构

Vue 建立了统一的错误处理机制：

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
  
  // 处理函数数组
  const values = []
  for (let i = 0; i < fn.length; i++) {
    values.push(callWithAsyncErrorHandling(fn[i], instance, type, args))
  }
  return values
}
```

所有用户代码调用都经过这层包装，确保错误被捕获。

## handleError 实现

错误处理的核心逻辑：

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
    
    // 向上遍历查找 errorCaptured 钩子
    while (cur) {
      const errorCapturedHooks = cur.ec  // errorCaptured hooks
      if (errorCapturedHooks) {
        for (let i = 0; i < errorCapturedHooks.length; i++) {
          // 返回 false 则停止传播
          if (errorCapturedHooks[i](err, exposedInstance, errorInfo) === false) {
            return
          }
        }
      }
      cur = cur.parent
    }
    
    // 全局 errorHandler
    const appErrorHandler = instance.appContext.config.errorHandler
    if (appErrorHandler) {
      callWithErrorHandling(
        appErrorHandler,
        null,
        ErrorTypes.APP_ERROR_HANDLER,
        [err, exposedInstance, errorInfo]
      )
      return
    }
  }
  
  // 最终回退：输出到控制台
  logError(err, type, contextVNode, throwInDev)
}
```

错误传播路径：组件 errorCaptured → 父组件 errorCaptured → 全局 errorHandler → 控制台。

## 错误类型定义

Vue 定义了详细的错误类型枚举：

```typescript
export const enum ErrorTypes {
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

export const ErrorTypeStrings: Record<number, string> = {
  [ErrorTypes.SETUP_FUNCTION]: 'setup function',
  [ErrorTypes.RENDER_FUNCTION]: 'render function',
  [ErrorTypes.WATCH_GETTER]: 'watcher getter',
  [ErrorTypes.WATCH_CALLBACK]: 'watcher callback',
  // ...
}
```

这些类型帮助开发者理解错误发生的上下文。

## 渲染函数错误

render 函数抛出错误时的处理：

```typescript
const setupRenderEffect: SetupRenderEffectFn = (
  instance,
  initialVNode,
  container,
  anchor,
  parentSuspense,
  isSVG,
  optimized
) => {
  const componentUpdateFn = () => {
    // 包装 render 调用
    let vnodeTree
    try {
      vnodeTree = renderComponentRoot(instance)
    } catch (err) {
      handleError(err, instance, ErrorTypes.RENDER_FUNCTION)
      // 渲染失败，使用空 VNode
      vnodeTree = createVNode(Comment)
    }
    
    // 继续 patch
    patch(...)
  }
  
  // ...
}
```

渲染出错时，Vue 会用注释节点替代，避免整个应用崩溃。

## 生命周期钩子错误

钩子调用使用错误包装：

```typescript
export function invokeArrayFns(fns: Function[], arg?: any) {
  for (let i = 0; i < fns.length; i++) {
    fns[i](arg)
  }
}

// 在调用点包装
callWithAsyncErrorHandling(
  instance.m,  // mounted hooks
  instance,
  ErrorTypes.MOUNTED
)
```

单个钩子出错不会影响其他钩子的执行。

## 事件处理器错误

用户事件处理器的错误处理：

```typescript
const invoker = (e: Event) => {
  // 时间戳检查
  if (e.timeStamp >= invoker.attached - 1) {
    callWithAsyncErrorHandling(
      patchStopImmediatePropagation(e, invoker.value),
      instance,
      ErrorTypes.NATIVE_EVENT_HANDLER,
      [e]
    )
  }
}
```

事件处理器可以是异步的，Promise rejection 同样被捕获。

## 异步组件加载错误

异步组件有专门的错误处理：

```typescript
const load = () => {
  return loader()
    .catch(err => {
      if (errorComponent) {
        loaded.value = false
        error.value = err
      } else {
        handleError(err, null, ErrorTypes.ASYNC_COMPONENT_LOADER)
      }
      throw err
    })
}
```

可以配置 errorComponent 显示加载失败状态。

## Suspense 错误边界

Suspense 可以捕获异步子组件的错误：

```typescript
const handleSetupResult = (
  instance: ComponentInternalInstance,
  setupResult: unknown,
  isSSR: boolean
) => {
  if (isPromise(setupResult)) {
    setupResult
      .then(resolved => {
        handleSetupResult(instance, resolved, isSSR)
      })
      .catch(err => {
        handleError(err, instance, ErrorTypes.SETUP_FUNCTION)
        // 触发 Suspense 的 onError
        instance.suspense?.setError(err)
      })
  }
}
```

## 无效 VNode 检测

开发环境检测无效的 VNode：

```typescript
function normalizeVNode(child: VNode): VNode {
  if (child == null || typeof child === 'boolean') {
    return createVNode(Comment)
  }
  
  if (isArray(child)) {
    return createVNode(Fragment, null, child)
  }
  
  if (typeof child === 'object') {
    // 已经是 VNode
    return cloneIfMounted(child)
  }
  
  // 原始类型，转为文本
  return createVNode(Text, null, String(child))
}
```

无效的渲染返回值会被规范化，避免 patch 崩溃。

## 循环检测

防止无限更新循环：

```typescript
const RECURSION_LIMIT = 100
let flushIndex = 0
const seen = new Map<Job, number>()

function checkRecursiveUpdates(job: Job) {
  const count = seen.get(job) || 0
  if (count > RECURSION_LIMIT) {
    throw new Error(
      `Maximum recursive updates exceeded. ` +
      `This means you have a reactive effect that is mutating its own dependencies.`
    )
  }
  seen.set(job, count + 1)
}
```

同一个 job 执行超过 100 次会报错。

## 开发警告系统

除了错误，Vue 还有完善的警告系统：

```typescript
export function warn(msg: string, ...args: any[]) {
  // 跳过重复警告
  const instance = getCurrentInstance()
  const appWarnHandler = instance?.appContext.config.warnHandler
  
  if (appWarnHandler) {
    callWithErrorHandling(
      appWarnHandler,
      instance,
      ErrorTypes.APP_WARN_HANDLER,
      [msg, instance?.proxy, trace]
    )
  } else {
    console.warn(`[Vue warn]: ${msg}`, ...args)
  }
}
```

## 常见边界情况

渲染器处理的边界情况：

```typescript
// 1. 空子节点
if (children == null) {
  return
}

// 2. 文本子节点规范化
if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
  if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    unmountChildren(c1 as VNode[], parentComponent, parentSuspense)
  }
  if (c2 !== c1) {
    hostSetElementText(container, c2 as string)
  }
}

// 3. key 冲突检测
if (__DEV__) {
  const keys = new Set()
  for (const child of children) {
    if (child.key != null) {
      if (keys.has(child.key)) {
        warn(`Duplicate keys detected: ${child.key}`)
      }
      keys.add(child.key)
    }
  }
}
```

## ref 绑定错误

ref 回调可能抛错：

```typescript
export function setRef(
  rawRef: VNodeRef,
  oldRawRef: VNodeRef | null,
  parentSuspense: SuspenseBoundary | null,
  vnode: VNode,
  isUnmount = false
) {
  // ...
  if (isFunction(ref)) {
    callWithErrorHandling(ref, owner, ErrorTypes.FUNCTION_REF, [value, refs])
  }
}
```

## 指令钩子错误

指令钩子同样被包装：

```typescript
export function invokeDirectiveHook(
  vnode: VNode,
  prevVNode: VNode | null,
  instance: ComponentInternalInstance | null,
  name: keyof ObjectDirective
) {
  const bindings = vnode.dirs!
  const oldBindings = prevVNode?.dirs
  
  for (let i = 0; i < bindings.length; i++) {
    const binding = bindings[i]
    const hook = binding.dir[name] as DirectiveHook | undefined
    if (hook) {
      const prevBinding = oldBindings?.[i]
      callWithAsyncErrorHandling(hook, instance, ErrorTypes.DIRECTIVE_HOOK, [
        vnode.el,
        binding,
        vnode,
        prevVNode
      ])
    }
  }
}
```

## 生产环境优化

生产环境移除开发警告，但保留错误处理：

```typescript
if (__DEV__) {
  // 详细的错误信息和调用栈
  warn(
    `Invalid VNode type: ${type}`,
    `(${typeof type})`
  )
} else {
  // 生产环境只保留关键错误
  throw new Error('Invalid VNode type')
}
```

## 小结

Vue 渲染器建立了完整的错误处理体系。从底层的 callWithErrorHandling 包装，到组件级的 errorCaptured 钩子，再到全局的 errorHandler，形成多层防护网。开发环境提供详细的警告信息帮助调试，生产环境则保持精简。边界情况处理（空值、类型转换、循环检测）确保渲染器在各种输入下都能稳定运行。这套机制让 Vue 应用在遇到问题时能够优雅降级，而非直接崩溃。
