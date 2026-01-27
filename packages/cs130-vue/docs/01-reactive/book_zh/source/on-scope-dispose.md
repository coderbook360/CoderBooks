# onScopeDispose：作用域清理回调

onScopeDispose 允许在 effectScope 停止时执行清理逻辑，类似于组件的 onUnmounted。本章分析它的实现和使用方式。

## 函数定义

```typescript
export function onScopeDispose(fn: () => void, failSilently = false): void {
  if (activeEffectScope) {
    activeEffectScope.cleanups.push(fn)
  } else if (__DEV__ && !failSilently) {
    warn(
      `onScopeDispose() is called when there is no active effect scope` +
        ` to be associated with.`,
    )
  }
}
```

实现非常简单：将清理函数添加到当前活跃 scope 的 cleanups 数组。

## 基本用法

```typescript
const scope = effectScope()

scope.run(() => {
  const connection = createWebSocket()
  
  onScopeDispose(() => {
    connection.close()
    console.log('connection closed')
  })
})

scope.stop()
// 输出: 'connection closed'
```

## failSilently 参数

```typescript
onScopeDispose(fn)           // 无 scope 时警告
onScopeDispose(fn, true)     // 无 scope 时静默忽略
```

某些场景下可能不确定是否在 scope 中，failSilently 避免不必要的警告。

## 清理函数的执行时机

在 EffectScope.stop() 中执行：

```typescript
stop(fromParent?: boolean): void {
  if (this._active) {
    // 先停止 effect
    for (i = 0, l = this.effects.length; i < l; i++) {
      this.effects[i].stop()
    }
    // 再执行清理函数
    for (i = 0, l = this.cleanups.length; i < l; i++) {
      this.cleanups[i]()
    }
    // ...
  }
}
```

执行顺序：先停止所有 effect，再执行清理函数。这确保清理函数执行时 effect 已停止。

## 与 watch onCleanup 的区别

两者用于不同场景：

**watch onCleanup**：每次回调执行前清理

```typescript
watch(source, (val, oldVal, onCleanup) => {
  const timer = setInterval(tick, 1000)
  onCleanup(() => clearInterval(timer))
  // 每次 source 变化，旧 timer 被清理
})
```

**onScopeDispose**：scope 停止时清理

```typescript
effectScope().run(() => {
  const timer = setInterval(tick, 1000)
  onScopeDispose(() => clearInterval(timer))
  // scope 停止时才清理
})
```

## 多个清理函数

可以注册多个清理函数：

```typescript
effectScope().run(() => {
  onScopeDispose(() => console.log('cleanup 1'))
  onScopeDispose(() => console.log('cleanup 2'))
  onScopeDispose(() => console.log('cleanup 3'))
})

// stop 时按注册顺序执行：
// cleanup 1
// cleanup 2
// cleanup 3
```

## 在组合函数中使用

```typescript
function useEventListener(target, event, handler) {
  target.addEventListener(event, handler)
  
  onScopeDispose(() => {
    target.removeEventListener(event, handler)
  })
}

const scope = effectScope()

scope.run(() => {
  useEventListener(window, 'resize', handleResize)
  useEventListener(document, 'click', handleClick)
})

// 停止时自动移除所有事件监听
scope.stop()
```

## 组件中的隐式 scope

组件内部有自己的 effectScope，onScopeDispose 也能工作：

```typescript
setup() {
  const connection = createConnection()
  
  // 组件卸载时执行
  onScopeDispose(() => {
    connection.close()
  })
  
  // 等价于
  onUnmounted(() => {
    connection.close()
  })
}
```

但在组件中通常使用 onUnmounted，语义更清晰。

## 嵌套 scope

```typescript
const parent = effectScope()

parent.run(() => {
  onScopeDispose(() => console.log('parent cleanup'))
  
  const child = effectScope()
  child.run(() => {
    onScopeDispose(() => console.log('child cleanup'))
  })
})

parent.stop()
// child cleanup
// parent cleanup
```

子 scope 先被清理，然后是父 scope。

## 错误处理

清理函数中的错误不会阻止其他清理函数执行：

```typescript
effectScope().run(() => {
  onScopeDispose(() => {
    throw new Error('cleanup error')
  })
  onScopeDispose(() => {
    console.log('this still runs')
  })
})
```

每个清理函数独立执行，错误被捕获并报告。

## 与 detached scope

detached scope 独立管理生命周期：

```typescript
const parent = effectScope()

parent.run(() => {
  const detached = effectScope(true)
  
  detached.run(() => {
    onScopeDispose(() => console.log('detached cleanup'))
  })
})

parent.stop()
// detached 的清理函数不执行
// 需要手动: detached.stop()
```

## 检查当前 scope

```typescript
import { getCurrentScope, onScopeDispose } from 'vue'

function safeCleanup(fn) {
  const scope = getCurrentScope()
  if (scope) {
    onScopeDispose(fn)
  } else {
    // 没有 scope，可能需要其他方式处理
  }
}
```

## 实用模式：资源管理

```typescript
function useResource() {
  const resource = acquireResource()
  
  onScopeDispose(() => {
    releaseResource(resource)
  })
  
  return resource
}

// 任何 scope 中使用
effectScope().run(() => {
  const res = useResource()
  // 使用资源
})  // 停止时自动释放
```

## 返回清理函数的模式

有时需要手动控制清理：

```typescript
function useInterval(fn, delay) {
  const timer = setInterval(fn, delay)
  
  const cleanup = () => clearInterval(timer)
  
  onScopeDispose(cleanup)
  
  return cleanup  // 允许手动清理
}

const scope = effectScope()

scope.run(() => {
  const stop = useInterval(tick, 1000)
  
  // 可以手动停止
  // stop()
})

// 或者等 scope 停止
scope.stop()
```

## 本章小结

onScopeDispose 提供了在 scope 生命周期结束时执行清理的机制。它将清理函数添加到当前活跃 scope 的 cleanups 数组，在 stop 时按顺序执行。

这个 API 使组合函数能够自动管理资源生命周期，是构建可复用响应式逻辑的重要工具。
