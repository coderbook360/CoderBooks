# getCurrentScope：获取当前作用域

getCurrentScope 返回当前激活的 effectScope，用于在函数内部获取上下文。本章分析它的实现和应用。

## 函数定义

```typescript
export function getCurrentScope(): EffectScope | undefined {
  return activeEffectScope
}
```

实现极其简单，直接返回模块级变量 activeEffectScope。

## 基本用法

```typescript
import { effectScope, getCurrentScope } from 'vue'

const scope = effectScope()

console.log(getCurrentScope())  // undefined

scope.run(() => {
  console.log(getCurrentScope())  // EffectScope 实例
  console.log(getCurrentScope() === scope)  // true
})

console.log(getCurrentScope())  // undefined
```

## activeEffectScope 的生命周期

```typescript
export let activeEffectScope: EffectScope | undefined
```

这个变量在 run 方法中被设置：

```typescript
run<T>(fn: () => T): T | undefined {
  if (this._active) {
    const currentEffectScope = activeEffectScope
    try {
      activeEffectScope = this  // 设置
      return fn()
    } finally {
      activeEffectScope = currentEffectScope  // 恢复
    }
  }
}
```

run 执行期间 activeEffectScope 指向当前 scope，执行完毕后恢复。

## 嵌套 scope 中的行为

```typescript
const outer = effectScope()
const inner = effectScope()

outer.run(() => {
  console.log(getCurrentScope() === outer)  // true
  
  inner.run(() => {
    console.log(getCurrentScope() === inner)  // true
  })
  
  console.log(getCurrentScope() === outer)  // true
})
```

进入内层 scope 时 activeEffectScope 更新，退出时恢复。这与函数调用栈的行为一致。

## 条件性注册清理

```typescript
function useResource() {
  const resource = createResource()
  
  if (getCurrentScope()) {
    onScopeDispose(() => {
      resource.dispose()
    })
  }
  
  return resource
}
```

检查是否在 scope 中，避免无 scope 时的警告。

## 与 onScopeDispose 配合

```typescript
function registerCleanup(fn: () => void): boolean {
  const scope = getCurrentScope()
  if (scope) {
    onScopeDispose(fn)
    return true
  }
  return false
}

// 使用
const registered = registerCleanup(() => {
  console.log('cleanup')
})

if (!registered) {
  // 手动管理
}
```

## 组件中的 scope

组件 setup 执行时有活跃的 scope：

```typescript
setup() {
  const scope = getCurrentScope()
  console.log(scope)  // 组件的 EffectScope
  
  // 这就是为什么组件内的 watch 不需要手动清理
}
```

## 类型定义

```typescript
export interface EffectScope {
  run<T>(fn: () => T): T | undefined
  stop(): void
}

export function getCurrentScope(): EffectScope | undefined
```

返回类型是 EffectScope | undefined，需要检查是否存在。

## 实用模式

**模式一：可选的生命周期绑定**

```typescript
function useTimer(delay: number) {
  const elapsed = ref(0)
  let timer: number
  
  const start = () => {
    timer = setInterval(() => {
      elapsed.value++
    }, delay)
  }
  
  const stop = () => {
    clearInterval(timer)
  }
  
  // 如果在 scope 中，自动绑定清理
  if (getCurrentScope()) {
    onScopeDispose(stop)
  }
  
  return { elapsed, start, stop }
}
```

**模式二：创建子 scope**

```typescript
function createManagedScope() {
  const parent = getCurrentScope()
  
  // 创建非 detached scope 会自动关联到 parent
  const child = effectScope()
  
  return child
}
```

**模式三：调试日志**

```typescript
function debugEffect(fn: () => void) {
  const scope = getCurrentScope()
  console.log('Creating effect in scope:', scope)
  
  return watchEffect(fn)
}
```

## 与 effect 的关系

ReactiveEffect 创建时会使用 activeEffectScope：

```typescript
class ReactiveEffect<T = any> {
  constructor(
    public fn: () => T,
    public trigger: () => void,
    public scheduler?: EffectScheduler,
    scope?: EffectScope,
  ) {
    this.recordEffectScope(scope || activeEffectScope)
  }
}
```

如果没有显式传入 scope，使用 activeEffectScope。这就是 run 回调中创建的 effect 能被自动收集的原因。

## 异步代码中的行为

```typescript
effectScope().run(async () => {
  console.log(getCurrentScope())  // EffectScope
  
  await somePromise
  
  console.log(getCurrentScope())  // undefined！
})
```

await 之后 getCurrentScope() 返回 undefined，因为 run 的同步部分已经完成，activeEffectScope 已恢复。

解决方案：

```typescript
effectScope().run(async () => {
  const scope = getCurrentScope()  // 保存引用
  
  await somePromise
  
  scope.run(() => {
    // 在这里创建 effect 会被收集
  })
})
```

## 同步代码的可靠性

同步代码中 getCurrentScope 总是返回正确的值：

```typescript
effectScope().run(() => {
  function helper() {
    // 同步调用，scope 仍然正确
    return getCurrentScope()
  }
  
  console.log(helper() === getCurrentScope())  // true
})
```

## 本章小结

getCurrentScope 通过返回 activeEffectScope 提供对当前 scope 的访问。这在组合函数中很有用，可以条件性地注册清理回调或检查执行上下文。

需要注意异步代码中 scope 会在 await 后丢失，必要时需要保存引用并手动使用 run 重新进入 scope。
