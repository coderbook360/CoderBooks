# stop 与 runner：effect 的生命周期控制

effect 创建后会持续响应依赖变化，但有时我们需要手动控制它的生命周期。比如组件卸载时需要停止相关的 effect，或者某些场景下需要手动触发 effect 执行。Vue 通过 stop 方法和 runner 函数提供了这些能力。

## runner 函数的本质

当我们调用 effect 函数时，返回值是一个 runner 函数：

```typescript
const runner = effect(() => {
  console.log(state.count)
})

// runner 可以手动调用
runner()
```

runner 的创建过程在 effect 函数中：

```typescript
const runner = _effect.run.bind(_effect) as ReactiveEffectRunner<T>
runner.effect = _effect
return runner
```

runner 本质上是 ReactiveEffect 实例的 run 方法，通过 bind 绑定了正确的 this 指向。调用 runner() 就等于调用 `_effect.run()`，会重新执行用户函数并更新依赖。

runner 上还挂载了 `effect` 属性，指向底层的 ReactiveEffect 实例。这让用户可以访问底层 API，比如 `runner.effect.stop()` 来停止 effect。

## ReactiveEffectRunner 类型

runner 的类型定义揭示了它的双重身份：

```typescript
export interface ReactiveEffectRunner<T = any> {
  (): T
  effect: ReactiveEffect
}
```

它既是一个函数（可调用，返回泛型 T），又是一个对象（有 effect 属性）。这种设计在 JavaScript 中很常见，利用了函数也是对象的特性。

使用 runner 的典型场景：

```typescript
const runner = effect(() => state.count * 2)

// 获取当前计算结果
const result = runner()

// 访问底层 effect
console.log(runner.effect.deps.length)

// 停止 effect
runner.effect.stop()
```

## stop 方法的实现

stop 方法用于停止一个 effect，使其不再响应数据变化：

```typescript
stop(): void {
  if (this.active) {
    preCleanupEffect(this)
    postCleanupEffect(this)
    this.onStop?.()
    this.active = false
  }
}
```

方法首先检查 `active` 标志，避免重复停止。然后调用 preCleanupEffect 和 postCleanupEffect 进行依赖清理——因为 preCleanup 增加 trackId 但 postCleanup 时 _depsLength 仍为 0，所有依赖都会被清理。

如果配置了 onStop 回调，此时调用它。这给用户提供了清理资源的机会。最后将 active 设为 false。

## 停止后的行为

停止后的 effect 有特殊的行为：

```typescript
run(): T {
  this._dirtyLevel = DirtyLevels.NotDirty
  if (!this.active) {
    return this.fn()  // 直接执行，不追踪
  }
  // 正常的追踪执行...
}
```

当 active 为 false 时，run 方法仍然可以被调用（通过 runner），但只是单纯执行用户函数，不会进行依赖追踪。这意味着：

1. 函数会执行，有返回值
2. 不会设置 activeEffect，访问响应式数据不会建立依赖
3. 数据变化不会触发这个 effect，因为它已经从所有 dep 中移除

这种设计允许 runner 在停止后仍然可用，只是变成了一个普通的函数调用。

## stop 的全局函数

除了实例方法，Vue 还导出了一个全局的 stop 函数：

```typescript
export function stop(runner: ReactiveEffectRunner): void {
  runner.effect.stop()
}
```

这是一个便利函数，等价于 `runner.effect.stop()`。使用方式：

```typescript
import { effect, stop } from '@vue/reactivity'

const runner = effect(() => {
  console.log(state.count)
})

// 两种停止方式等价
stop(runner)
// 或
runner.effect.stop()
```

## onStop 回调

effect 可以配置 onStop 回调，在停止时执行清理逻辑：

```typescript
const runner = effect(() => {
  const handler = () => console.log(state.count)
  window.addEventListener('resize', handler)
  
  return handler  // 返回用于清理
}, {
  onStop: () => {
    // 清理事件监听器
    window.removeEventListener('resize', handler)
  }
})
```

onStop 的调用时机是在依赖清理完成后、active 设为 false 之前。这意味着在 onStop 回调中，effect 仍然标记为 active，但实际上已经不响应数据变化了。

实际使用中，onStop 常用于：

1. 清理事件监听器
2. 取消订阅
3. 清除定时器
4. 释放外部资源

## 与 watchEffect 的 onCleanup 对比

watchEffect 提供了另一种清理机制：

```typescript
watchEffect((onCleanup) => {
  const handler = () => console.log(state.count)
  window.addEventListener('resize', handler)
  
  onCleanup(() => {
    window.removeEventListener('resize', handler)
  })
})
```

onCleanup 和 onStop 的区别在于触发时机：

onCleanup 在每次重新执行前调用，也在停止时调用。这适合需要在每次更新时都清理的场景，比如取消之前的异步请求。

onStop 只在停止时调用一次。这适合只需要最终清理的场景。

effect 函数本身没有 onCleanup 机制，只有 onStop。如果需要每次执行前清理，应该使用 watchEffect 或自己实现类似逻辑。

## 停止时机的考虑

合理的停止时机很重要。常见的场景：

组件卸载时停止。Vue 的组件系统会在卸载时自动停止与组件关联的 effect。使用 Composition API 时，在 setup 中创建的 effect 会自动关联到组件的 scope。

条件性停止。某些业务逻辑可能需要在特定条件下停止 effect：

```typescript
const runner = effect(() => {
  if (shouldStop.value) {
    stop(runner)
    return
  }
  // 正常逻辑...
})
```

但要注意，在 effect 内部停止自己是有效的——stop 会清理依赖，当前执行完成后不会再被触发。

## 重新启动 effect

已停止的 effect 不能直接"重新启动"。stop 后 active 变为 false，没有提供 start 方法将其恢复。

如果需要这种能力，应该创建新的 effect：

```typescript
let runner: ReactiveEffectRunner | null = null

function start() {
  if (!runner) {
    runner = effect(() => {
      console.log(state.count)
    })
  }
}

function stopEffect() {
  if (runner) {
    stop(runner)
    runner = null
  }
}
```

或者使用 pauseTracking/resetTracking 来临时禁用追踪，而不是完全停止：

```typescript
import { pauseTracking, resetTracking } from '@vue/reactivity'

effect(() => {
  if (paused.value) {
    pauseTracking()
  }
  // 访问数据...
  if (paused.value) {
    resetTracking()
  }
})
```

## runner 的高级用法

runner 不只是用于手动触发执行，还有一些高级用法。

获取最新的计算结果：

```typescript
const runner = effect(() => state.a + state.b)
const sum = runner()  // 获取当前和
```

组合多个 effect：

```typescript
const runner1 = effect(() => validate(state.form), { lazy: true })
const runner2 = effect(() => submit(state.form), { lazy: true })

function handleSubmit() {
  if (runner1()) {  // 先验证
    runner2()       // 验证通过再提交
  }
}
```

实现手动依赖追踪：

```typescript
const runner = effect(() => {
  // 收集依赖
  return computeValue()
}, { lazy: true })

// 手动控制何时追踪
onMounted(() => runner())
```

## 与 EffectScope 的配合

EffectScope 提供了批量管理 effect 的能力：

```typescript
const scope = effectScope()

scope.run(() => {
  effect(() => console.log(state.a))
  effect(() => console.log(state.b))
})

// 一次性停止所有 effect
scope.stop()
```

scope.stop() 会调用所有注册 effect 的 stop 方法。这比手动管理多个 runner 更方便，也更不容易遗漏。

在组件中，Vue 自动创建与组件关联的 scope，组件卸载时自动停止。在 Composition API 中：

```typescript
// 这些 effect 会自动关联到组件 scope
onMounted(() => {
  effect(() => {
    // 组件卸载时自动停止
  })
})
```

## 本章小结

stop 和 runner 提供了对 effect 生命周期的控制。runner 允许手动触发执行和访问底层 ReactiveEffect。stop 清理所有依赖并标记 effect 为非活跃状态。

这些机制在资源管理和控制流方面很重要。正确使用它们可以避免内存泄漏和不必要的更新。结合 EffectScope 使用，可以更优雅地管理多个 effect 的生命周期。

理解 stop 和 runner 的工作原理，有助于在复杂场景下正确使用响应式系统，也有助于理解 Vue 组件是如何管理其内部 effect 的。
