# effectScope 入口：作用域管理的起点

effectScope 是 Vue 3.2 引入的 API，用于管理一组响应式副作用的生命周期。本章分析 effectScope 函数的入口实现。

## 为什么需要 effectScope

在组件外使用响应式 API 时，副作用需要手动管理：

```typescript
// 没有 effectScope
const stop1 = watchEffect(() => { /* ... */ })
const stop2 = watch(source, callback)
const stop3 = watchEffect(() => { /* ... */ })

// 清理时需要逐个调用
stop1()
stop2()
stop3()
```

effectScope 提供统一的管理：

```typescript
const scope = effectScope()

scope.run(() => {
  watchEffect(() => { /* ... */ })
  watch(source, callback)
  watchEffect(() => { /* ... */ })
})

// 一次性清理所有
scope.stop()
```

## 函数定义

```typescript
export function effectScope(detached?: boolean): EffectScope {
  return new EffectScope(detached)
}
```

effectScope 函数很简单，只是创建并返回一个 EffectScope 实例。

## detached 参数

```typescript
effectScope()           // 普通 scope
effectScope(true)       // detached scope
```

detached 控制 scope 是否与父 scope 分离：

- false（默认）：被父 scope 收集，父 scope 停止时一起停止
- true：独立存在，不受父 scope 影响

```typescript
const parent = effectScope()

parent.run(() => {
  const child = effectScope()      // 会被 parent 收集
  const detached = effectScope(true)  // 不会被收集
})

parent.stop()
// child 也被停止
// detached 仍在运行
```

## EffectScope 接口

```typescript
export interface EffectScope {
  run<T>(fn: () => T): T | undefined
  stop(): void
}
```

EffectScope 实例有两个主要方法：

- run：在作用域内执行函数
- stop：停止作用域内的所有副作用

## 使用示例

**基础用法**：

```typescript
const scope = effectScope()

scope.run(() => {
  const count = ref(0)
  
  watchEffect(() => {
    console.log(count.value)
  })
  
  watch(count, (val) => {
    console.log('count:', val)
  })
})

// 清理所有副作用
scope.stop()
```

**组合函数中使用**：

```typescript
function useMouse() {
  const x = ref(0)
  const y = ref(0)
  
  watchEffect(() => {
    const handler = (e: MouseEvent) => {
      x.value = e.clientX
      y.value = e.clientY
    }
    window.addEventListener('mousemove', handler)
    // 会随 scope 停止而清理
  })
  
  return { x, y }
}

const scope = effectScope()
const mouse = scope.run(() => useMouse())

// 停止追踪
scope.stop()
```

## 与组件的关系

组件内部有自己的 scope：

```typescript
setup() {
  // 这些 effect 会被组件 scope 收集
  watchEffect(() => { /* ... */ })
  watch(source, callback)
  
  // 组件卸载时自动清理
}
```

组件的 scope 在 setup 执行时激活，卸载时调用 stop。这就是为什么组件内的 watch 不需要手动清理。

## 获取当前 scope

```typescript
export function getCurrentScope(): EffectScope | undefined {
  return activeEffectScope
}
```

getCurrentScope 返回当前激活的 scope：

```typescript
effectScope().run(() => {
  const scope = getCurrentScope()
  console.log(scope)  // EffectScope 实例
})

console.log(getCurrentScope())  // undefined
```

## onScopeDispose

```typescript
export function onScopeDispose(fn: () => void, failSilently = false): void {
  if (activeEffectScope) {
    activeEffectScope.cleanups.push(fn)
  } else if (__DEV__ && !failSilently) {
    warn(`onScopeDispose() is called when there is no active effect scope`)
  }
}
```

在 scope 内注册清理回调：

```typescript
effectScope().run(() => {
  const connection = createConnection()
  
  onScopeDispose(() => {
    connection.close()
  })
})
```

这类似于组件的 onUnmounted，但用于 scope。

## 嵌套 scope

```typescript
const parent = effectScope()

parent.run(() => {
  const child = effectScope()
  
  child.run(() => {
    watchEffect(() => { /* ... */ })
  })
})

parent.stop()  // parent 和 child 都停止
```

非 detached 的子 scope 会被父 scope 收集和管理。

## 返回值

run 方法返回回调函数的返回值：

```typescript
const scope = effectScope()

const result = scope.run(() => {
  const count = ref(0)
  return count
})

console.log(result)  // Ref<0>
```

scope 已停止时 run 返回 undefined：

```typescript
scope.stop()
const result = scope.run(() => 'test')
console.log(result)  // undefined
```

## 本章小结

effectScope 提供了响应式副作用的统一生命周期管理。通过创建 EffectScope 实例，在 run 回调中创建的所有 effect 都被收集，可以通过 stop 一次性清理。

detached 参数控制 scope 是否独立于父 scope，适用于需要独立控制生命周期的场景。下一章我们深入分析 EffectScope 类的实现细节。
