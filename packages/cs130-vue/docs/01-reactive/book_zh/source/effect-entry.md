# effect 函数：副作用系统的入口

从本章开始，我们进入 Vue3 响应式系统中最核心的部分——副作用系统。如果说 `reactive` 和 `ref` 是数据的容器，那么 `effect` 就是让这些容器"活"起来的引擎。没有 effect，响应式数据只是普通的 Proxy 对象；有了 effect，数据变化才能自动触发视图更新、计算属性重算、侦听器回调执行。

## 从使用场景理解 effect

在日常开发中，我们很少直接使用 `effect` 函数，更多是通过 `computed`、`watch`、`watchEffect` 这些上层 API。但这些 API 的底层都依赖 effect。理解 effect 的工作原理，就能理解整个响应式系统的运行机制。

一个最简单的 effect 用法是这样的：我们创建一个响应式对象，然后用 effect 包裹一个函数，这个函数会在响应式数据变化时自动重新执行。当我们修改响应式对象的属性时，effect 函数会自动感知变化并重新运行。

effect 的本质是建立"数据"与"行为"之间的关联。它做的事情可以概括为：执行传入的函数，记录函数执行过程中访问了哪些响应式数据，当这些数据变化时自动重新执行函数。这个过程涉及两个关键步骤：依赖收集（track）和触发更新（trigger）。

## effect 函数的源码结构

让我们看看 `effect` 函数的实际实现。这个函数位于 `packages/reactivity/src/effect.ts` 文件中，是整个副作用系统对外暴露的主要入口。

```typescript
export function effect<T = any>(
  fn: () => T,
  options?: ReactiveEffectOptions,
): ReactiveEffectRunner<T> {
  // 如果传入的 fn 已经是一个 effect runner，取出其原始函数
  if ((fn as ReactiveEffectRunner).effect instanceof ReactiveEffect) {
    fn = (fn as ReactiveEffectRunner).effect.fn
  }

  // 创建 ReactiveEffect 实例
  const _effect = new ReactiveEffect(fn, NOOP, () => {
    if (_effect.dirty) {
      _effect.run()
    }
  })
  
  // 应用配置选项
  if (options) {
    extend(_effect, options)
    if (options.scope) recordEffectScope(_effect, options.scope)
  }
  
  // 如果没有设置 lazy，立即执行一次
  if (!options || !options.lazy) {
    _effect.run()
  }
  
  // 创建并返回 runner 函数
  const runner = _effect.run.bind(_effect) as ReactiveEffectRunner<T>
  runner.effect = _effect
  return runner
}
```

这段代码虽然不长，但每一行都有其设计考量。首先来看函数签名：它接收一个函数 `fn` 和可选的配置对象 `options`，返回一个 `ReactiveEffectRunner`。这个 runner 是一个函数，可以手动调用来重新执行 effect，同时它还挂载了 `effect` 属性，指向底层的 `ReactiveEffect` 实例。

函数开头有一个防御性检查：如果传入的 `fn` 本身就是一个 effect runner，那么取出它内部的原始函数。这样设计的目的是避免 effect 嵌套导致的问题。假设用户不小心把一个 runner 传给 effect，系统不会创建一个"effect 的 effect"，而是基于原始函数创建新的 effect。

## ReactiveEffect 的创建

effect 函数的核心工作是创建 `ReactiveEffect` 实例。这个类是整个副作用系统的核心数据结构，我们会在下一章详细分析。这里先关注创建时传入的三个参数。

第一个参数是用户传入的函数 `fn`，这是 effect 要追踪和执行的目标函数。第二个参数是 `NOOP`，一个空函数，代表 trigger 时的调度器。这里传 NOOP 是因为 effect 函数使用第三个参数来控制调度逻辑。第三个参数是一个调度函数，当依赖变化触发 effect 时，会调用这个函数而不是直接调用 `run`。

这个调度函数的实现很有意思：它检查 `_effect.dirty` 标志，只有当 effect 被标记为"脏"时才执行。这是 Vue 3.4 引入的优化机制，用于避免不必要的重复执行。在旧版本中，每次触发都会立即执行；现在通过 dirty 检查，可以跳过那些实际上不需要更新的情况。

## 配置选项的处理

创建 ReactiveEffect 后，effect 函数会处理用户传入的配置选项。`ReactiveEffectOptions` 接口定义了多个可配置项，每个都有其特定用途。

```typescript
export interface ReactiveEffectOptions {
  lazy?: boolean
  scheduler?: EffectScheduler
  scope?: EffectScope
  allowRecurse?: boolean
  onStop?: () => void
}
```

`lazy` 选项控制是否延迟首次执行。默认情况下，effect 创建后会立即执行一次传入的函数，这样可以完成首次的依赖收集。但有时候我们希望延迟执行，比如 computed 就需要这个特性——计算属性应该在首次访问时才计算，而不是创建时就计算。

`scheduler` 选项允许自定义调度逻辑。当依赖变化时，不直接执行 effect，而是调用这个调度器。这个机制被广泛用于实现批量更新、异步更新等高级功能。组件的更新就是通过 scheduler 来实现异步批处理的。

`scope` 选项用于关联 EffectScope。EffectScope 是 Vue 3.2 引入的概念，用于管理一组 effect 的生命周期。当传入 scope 时，effect 会被记录到这个 scope 中，scope 销毁时会自动停止所有关联的 effect。

`allowRecurse` 选项控制是否允许递归触发。默认情况下，一个 effect 在执行过程中修改了自己依赖的数据，不会立即触发自己重新执行，这样可以避免无限循环。但某些场景确实需要递归，比如某些 watch 回调，这时可以设置这个选项为 true。

`onStop` 是一个回调函数，当 effect 被停止时调用。这给用户提供了清理资源的机会。

## 立即执行与延迟执行

配置处理完成后，effect 函数会根据 `lazy` 选项决定是否立即执行。这里的逻辑很直观：如果没有传 options 或者 `options.lazy` 为假值，就调用 `_effect.run()` 立即执行一次。

立即执行是 effect 的默认行为，这保证了首次依赖收集的完成。当 `run` 方法执行时，它会设置当前活跃的 effect，然后执行用户函数。在函数执行过程中，如果访问了响应式数据，Proxy 的 get 拦截器会触发 track，将当前 effect 记录为这个数据的依赖。

延迟执行主要用于两种场景。一种是 computed，计算属性的 getter 只应该在被访问时执行，创建时不需要执行。另一种是某些高级用法，用户可能需要在特定时机才启动 effect，这时可以设置 lazy 为 true，然后在需要时手动调用返回的 runner。

## runner 函数的设计

effect 函数最后创建并返回一个 runner 函数。这个 runner 是 `_effect.run` 方法的绑定版本，调用 runner 就等于调用 `_effect.run()`。

```typescript
const runner = _effect.run.bind(_effect) as ReactiveEffectRunner<T>
runner.effect = _effect
return runner
```

为什么要用 `bind` 而不是直接返回 `run` 方法？因为 JavaScript 中方法的 this 指向取决于调用方式。如果直接返回 `run` 方法，用户单独调用时 this 会丢失。通过 bind 创建绑定函数，确保无论如何调用，this 始终指向正确的 ReactiveEffect 实例。

runner 上还挂载了 `effect` 属性，指向底层的 ReactiveEffect 实例。这个设计让用户可以在需要时访问底层对象，进行更细粒度的控制。比如调用 `runner.effect.stop()` 来停止 effect，或者访问 `runner.effect.deps` 来查看当前的依赖关系。

## ReactiveEffectRunner 类型

为了更好地理解 runner，我们看看它的类型定义：

```typescript
export interface ReactiveEffectRunner<T = any> {
  (): T
  effect: ReactiveEffect
}
```

这是一个函数类型，调用后返回泛型 T（即 effect 函数的返回值），同时具有 `effect` 属性。这种"函数对象"的设计在 JavaScript 中很常见，既保持了函数的调用便利性，又能承载额外的元数据。

在实际使用中，runner 的函数特性让它可以像普通函数一样调用，手动触发 effect 执行。而 effect 属性则提供了对底层机制的访问，用于高级场景如手动停止 effect、检查依赖等。

## effect 与 ReactiveEffect 的关系

理解 effect 函数，关键是理解它与 ReactiveEffect 类的关系。effect 函数是面向用户的 API，它封装了 ReactiveEffect 的创建和配置过程，提供了简洁的使用方式。ReactiveEffect 类则是底层的核心数据结构，负责具体的依赖追踪和更新触发。

这种分层设计的好处是职责清晰。effect 函数处理用户输入的规范化、配置选项的应用、runner 的创建等"入口"工作。ReactiveEffect 类专注于核心的响应式逻辑：维护依赖关系、执行用户函数、处理脏检查等。

在源码中，不只是 effect 函数使用 ReactiveEffect。computed 内部创建的是一个配置了特殊调度器的 ReactiveEffect，watch 和 watchEffect 也是如此。它们都是 ReactiveEffect 的不同"口味"，通过不同的配置选项实现各自的特性。

## 本章小结

effect 函数是 Vue3 响应式系统副作用部分的入口。它的核心工作是创建 ReactiveEffect 实例，应用配置选项，并返回一个 runner 函数供用户使用。

从设计角度看，effect 函数体现了 Vue 对 API 易用性的追求。用户只需要传入一个函数，就能建立响应式的依赖关系；如果需要更多控制，可以通过 options 进行配置。返回的 runner 既是函数也是对象，兼顾了简洁性和扩展性。

在接下来的章节中，我们会深入 ReactiveEffect 类的实现，看看它是如何追踪依赖、触发更新、处理各种边界情况的。理解了 ReactiveEffect，就理解了整个副作用系统的核心。
