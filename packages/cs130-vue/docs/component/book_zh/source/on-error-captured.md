# onErrorCaptured 错误捕获

onErrorCaptured 钩子用于捕获来自子组件的错误。它是 Vue 错误边界机制的核心。

## 定义

```typescript
export const onErrorCaptured = createHook<ErrorCapturedHook>(LifecycleHooks.ERROR_CAPTURED)

type ErrorCapturedHook = (
  err: unknown,
  instance: ComponentPublicInstance | null,
  info: string
) => boolean | void
```

## 基本用法

```typescript
import { onErrorCaptured, ref } from 'vue'

export default {
  setup() {
    const error = ref<Error | null>(null)
    
    onErrorCaptured((err, instance, info) => {
      error.value = err as Error
      console.error('Captured error:', err)
      console.log('Error info:', info)
      
      // 返回 false 阻止错误继续传播
      return false
    })
    
    return { error }
  }
}
```

## handleError 实现

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
    // 获取暴露的实例
    const exposedInstance = instance.proxy
    // 错误信息
    const errorInfo = __DEV__ ? ErrorTypeStrings[type] : type
    
    // 向上遍历父组件链
    while (cur) {
      const errorCapturedHooks = cur.ec  // errorCaptured 钩子数组
      
      if (errorCapturedHooks) {
        for (let i = 0; i < errorCapturedHooks.length; i++) {
          // 调用钩子，如果返回 false 则停止传播
          if (
            errorCapturedHooks[i](err, exposedInstance, errorInfo) === false
          ) {
            return
          }
        }
      }
      
      cur = cur.parent
    }
  }
  
  // 没有被捕获，使用全局错误处理
  logError(err, type, contextVNode, throwInDev)
}
```

## 错误传播机制

```
Child 组件发生错误
     ↓
Parent 的 errorCaptured 钩子
     ↓ (如果不返回 false)
Grandparent 的 errorCaptured 钩子
     ↓ (如果不返回 false)
...继续向上
     ↓
全局 app.config.errorHandler
     ↓ (如果没有)
console.error
```

## 返回值的作用

```typescript
onErrorCaptured((err, instance, info) => {
  // 不返回或返回 undefined：错误继续传播
})

onErrorCaptured((err, instance, info) => {
  // 返回 false：阻止错误继续传播
  return false
})
```

## ErrorTypes 枚举

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

export const ErrorTypeStrings: Record<number, string> = {
  [ErrorCodes.SETUP_FUNCTION]: 'setup function',
  [ErrorCodes.RENDER_FUNCTION]: 'render function',
  [ErrorCodes.WATCH_GETTER]: 'watcher getter',
  [ErrorCodes.WATCH_CALLBACK]: 'watcher callback',
  // ...
}
```

## 错误边界组件

```typescript
import { defineComponent, onErrorCaptured, ref, h } from 'vue'

const ErrorBoundary = defineComponent({
  name: 'ErrorBoundary',
  
  setup(props, { slots }) {
    const error = ref<Error | null>(null)
    const errorInfo = ref<string>('')
    
    onErrorCaptured((err, instance, info) => {
      error.value = err as Error
      errorInfo.value = info
      return false  // 阻止继续传播
    })
    
    return () => {
      if (error.value) {
        return h('div', { class: 'error-boundary' }, [
          h('h2', 'Something went wrong'),
          h('p', error.value.message),
          h('button', {
            onClick: () => {
              error.value = null
              errorInfo.value = ''
            }
          }, 'Try Again')
        ])
      }
      
      return slots.default?.()
    }
  }
})
```

## 捕获的错误类型

```typescript
// 1. setup 函数中的错误
setup() {
  throw new Error('Setup error')
}

// 2. 渲染函数中的错误
render() {
  throw new Error('Render error')
}

// 3. 生命周期钩子中的错误
onMounted(() => {
  throw new Error('Mounted error')
})

// 4. 事件处理器中的错误
<button @click="handleClick">  // handleClick 抛出错误

// 5. watch 回调中的错误
watch(source, () => {
  throw new Error('Watch error')
})

// 6. 自定义指令钩子中的错误
directives: {
  myDirective: {
    mounted() {
      throw new Error('Directive error')
    }
  }
}
```

## 异步错误

```typescript
// 异步错误也会被捕获
setup() {
  onMounted(async () => {
    await fetchData()
    throw new Error('Async error')  // 会被捕获
  })
}
```

通过 callWithAsyncErrorHandling 处理：

```typescript
export function callWithAsyncErrorHandling(
  fn: Function | Function[],
  instance: ComponentInternalInstance | null,
  type: ErrorTypes,
  args?: unknown[]
): any[] {
  // ...
  if (isPromise(res)) {
    res.catch(e => {
      handleError(e, instance, type)
    })
  }
  // ...
}
```

## 与全局错误处理器配合

```typescript
const app = createApp(App)

app.config.errorHandler = (err, instance, info) => {
  // 全局错误处理
  console.error('Global error:', err)
  reportToServer(err)
}
```

## 多级捕获

```typescript
// Grandparent
onErrorCaptured((err, instance, info) => {
  console.log('Grandparent caught:', err)
  // 不返回 false，继续传播
})

// Parent
onErrorCaptured((err, instance, info) => {
  console.log('Parent caught:', err)
  return false  // 阻止传播
})

// 错误在 Parent 被阻止，Grandparent 不会收到
```

## 使用场景

```typescript
// 1. 错误日志
onErrorCaptured((err, instance, info) => {
  logToSentry(err, {
    component: instance?.$options.name,
    info
  })
})

// 2. 用户友好的错误显示
onErrorCaptured((err) => {
  showToast('操作失败，请稍后重试')
  return false
})

// 3. 错误恢复
onErrorCaptured((err) => {
  resetState()
  return false
})
```

## 小结

onErrorCaptured 的核心要点：

1. **捕获子组件错误**：包括渲染、生命周期、事件等
2. **错误传播**：沿组件链向上传播
3. **返回 false 阻止**：阻止错误继续传播
4. **异步支持**：通过 callWithAsyncErrorHandling 处理
5. **错误边界**：可以实现 React 风格的错误边界

这是 Vue 错误处理系统的核心机制。

下一章将分析 onRenderTracked 调试钩子。
