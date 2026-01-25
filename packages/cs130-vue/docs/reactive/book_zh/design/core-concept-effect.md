# 核心概念：副作用函数

副作用函数（effect）是 Vue3 响应式系统的另一个核心概念。如果说响应式对象是"被观察者"，那么副作用函数就是"观察者"。它们之间的关系通过依赖收集和触发更新来建立和维护。

## 什么是副作用函数

在函数式编程的语境中，"副作用"指的是函数执行过程中对外部世界产生的影响——比如修改全局变量、操作 DOM、发起网络请求等。这个词通常带有负面含义，因为副作用让函数的行为变得难以预测。

但在响应式系统中，"副作用函数"的含义略有不同。它指的是依赖响应式数据并在数据变化时需要重新执行的函数。这类函数的共同特征是：它们的执行结果取决于外部状态，当这些状态变化时，函数需要重新执行来保持结果的正确性。

组件的渲染函数是最典型的副作用函数。它读取组件的响应式状态，生成虚拟 DOM。当状态变化时，渲染函数需要重新执行来生成新的虚拟 DOM，进而更新真实 DOM。

```javascript
// 这就是一个副作用函数
function render() {
  return h('div', state.count) // 读取响应式数据 state.count
}

// 当 state.count 变化时，render 需要重新执行
```

除了渲染函数，computed、watch、watchEffect 等 API 背后也都是副作用函数。理解 effect 的工作原理，是理解这些 API 的基础。

## effect 函数的基本用法

Vue3 的 `effect` 函数是响应式系统中最底层的 API。虽然在应用开发中我们通常使用 `computed` 或 `watch`，但它们内部都是基于 `effect` 实现的。

```javascript
import { reactive, effect } from '@vue/reactivity'

const state = reactive({ count: 0 })

// 创建一个副作用函数
effect(() => {
  console.log('Count is:', state.count)
})
// 立即执行一次，输出: Count is: 0

state.count++ // 输出: Count is: 1
state.count++ // 输出: Count is: 2
```

`effect` 函数接收一个函数作为参数，这个函数就是"副作用函数"本身。`effect` 会立即执行这个函数一次，同时建立它与所访问的响应式数据之间的依赖关系。之后每当依赖的数据变化，副作用函数就会被重新执行。

## effect 的工作流程

让我们仔细分析 `effect` 的工作流程。当我们调用 `effect(fn)` 时，Vue3 内部会创建一个 `ReactiveEffect` 实例来包装这个函数。这个实例会被设置为"当前活跃的 effect"，然后执行 `fn`。

在 `fn` 执行期间，每当访问响应式对象的属性，Proxy 的 get 拦截器就会被触发。拦截器会检查是否存在"当前活跃的 effect"，如果存在，就建立依赖关系：这个属性被这个 effect 依赖。

当 `fn` 执行完毕后，"当前活跃的 effect"会被清除，依赖收集阶段结束。此时响应式系统已经知道了这个 effect 依赖哪些属性。

后续当这些属性被修改时，Proxy 的 set 拦截器会被触发。拦截器会查找所有依赖这个属性的 effect，然后重新执行它们。

用简化的代码表示这个流程：

```javascript
// 当前活跃的 effect
let activeEffect = null

function effect(fn) {
  // 创建一个包装函数
  const effectFn = () => {
    // 设置当前活跃的 effect
    activeEffect = effectFn
    // 执行原始函数
    fn()
    // 清除当前活跃的 effect
    activeEffect = null
  }
  
  // 立即执行一次
  effectFn()
  
  return effectFn
}

// 在 get 拦截器中
function get(target, key, receiver) {
  const result = Reflect.get(target, key, receiver)
  
  // 如果有活跃的 effect，建立依赖关系
  if (activeEffect) {
    track(target, key) // 记录：target[key] 被 activeEffect 依赖
  }
  
  return result
}

// 在 set 拦截器中
function set(target, key, value, receiver) {
  const result = Reflect.set(target, key, value, receiver)
  
  // 触发所有依赖这个属性的 effect
  trigger(target, key)
  
  return result
}
```

这个简化的模型揭示了 Vue3 响应式系统的核心机制：通过 `activeEffect` 这个全局变量在 effect 执行期间"标记"自己，get 拦截器在被调用时检查这个标记并收集依赖，set 拦截器在被调用时触发已收集的依赖。

## ReactiveEffect 类

在实际的 Vue3 源码中，effect 的实现比上面的简化版本复杂得多。核心是 `ReactiveEffect` 类，它封装了一个副作用函数，并维护与之相关的各种状态。

```javascript
class ReactiveEffect {
  // 是否活跃（未被 stop）
  active = true
  
  // 这个 effect 依赖的所有 dep 集合
  deps = []
  
  // 父 effect（用于处理嵌套）
  parent = undefined
  
  // 调度器
  scheduler = undefined
  
  constructor(fn, scheduler) {
    this.fn = fn
    this.scheduler = scheduler
  }
  
  run() {
    if (!this.active) {
      return this.fn()
    }
    
    // 记录父 effect，处理嵌套情况
    this.parent = activeEffect
    activeEffect = this
    
    // 清理旧的依赖
    cleanupEffect(this)
    
    try {
      return this.fn()
    } finally {
      // 恢复父 effect
      activeEffect = this.parent
      this.parent = undefined
    }
  }
  
  stop() {
    if (this.active) {
      cleanupEffect(this)
      this.active = false
    }
  }
}
```

这个类有几个关键的设计点值得注意。

`deps` 数组存储了这个 effect 依赖的所有 dep 集合。这个信息看似冗余（dep 中已经记录了被依赖的 effect），但它对于依赖清理至关重要——当 effect 重新执行时，需要清除旧的依赖关系，否则会导致不必要的更新触发。

`parent` 字段用于处理嵌套 effect 的情况。当一个 effect 内部又创建了另一个 effect 时，需要正确恢复外层 effect 的上下文。这是通过将 `activeEffect` 保存到 `parent`，执行完毕后再恢复来实现的。

`scheduler` 是一个可选的调度函数。当 effect 需要重新执行时，如果提供了 scheduler，会调用 scheduler 而不是直接执行 effect。这给了上层代码控制执行时机的能力，是实现 `computed` 惰性求值和 `watch` 异步执行的基础。

## 嵌套 effect 的处理

在实际应用中，effect 可能会嵌套。比如父组件和子组件各自有自己的渲染 effect，当父组件渲染时会触发子组件渲染。

```javascript
const state = reactive({ outer: 0, inner: 0 })

// 外层 effect
effect(() => {
  console.log('outer effect:', state.outer)
  
  // 内层 effect
  effect(() => {
    console.log('inner effect:', state.inner)
  })
})
```

如果处理不当，内层 effect 执行完毕后，`activeEffect` 会被错误地清空，导致外层 effect 剩余部分的依赖无法被正确收集。

Vue3 通过 `parent` 字段解决这个问题。在进入内层 effect 之前，会把当前的 `activeEffect` 保存到内层 effect 的 `parent` 中；内层 effect 执行完毕后，会从 `parent` 恢复外层的 `activeEffect`。这样就形成了一个隐式的栈结构：

```javascript
// 进入 outer effect
activeEffect = outerEffect

// 进入 inner effect
innerEffect.parent = activeEffect // 保存 outerEffect
activeEffect = innerEffect

// inner effect 执行完毕
activeEffect = innerEffect.parent // 恢复 outerEffect

// outer effect 继续执行...
```

值得一提的是，Vue2 使用的是显式的栈（`effectStack`），而 Vue3 改用链表结构（通过 `parent` 引用）。这种改变减少了数组操作的开销。

## 依赖清理的必要性

考虑以下场景：

```javascript
const state = reactive({
  show: true,
  count: 0
})

effect(() => {
  if (state.show) {
    console.log('Count:', state.count)
  } else {
    console.log('Hidden')
  }
})
```

第一次执行时，`state.show` 为 `true`，effect 依赖 `show` 和 `count` 两个属性。但如果之后 `state.show` 变成 `false`，effect 重新执行时就不再访问 `state.count` 了。

如果不清理旧的依赖，`state.count` 的变化仍然会触发这个 effect，即使 effect 实际上已经不再关心它。这会导致不必要的重新执行，影响性能。

Vue3 的解决方案是：每次 effect 重新执行前，先清理它的所有旧依赖，然后在执行过程中重新收集。这确保了依赖关系始终是最新的。

```javascript
function cleanupEffect(effect) {
  // 遍历 effect 依赖的所有 dep
  for (const dep of effect.deps) {
    // 从 dep 中移除这个 effect
    dep.delete(effect)
  }
  // 清空 deps 数组
  effect.deps.length = 0
}
```

这种"先清理后重新收集"的策略虽然有一定开销，但保证了依赖关系的正确性。在 Vue3.4 之后，这个机制又做了进一步优化，使用位运算来标记依赖而不是完全重建，减少了内存分配的开销。

## 调度器（scheduler）

默认情况下，当响应式数据变化时，依赖它的 effect 会同步执行。但在很多场景下，我们希望控制执行的时机。调度器机制就是为此设计的。

当创建 effect 时，可以传入一个 `scheduler` 函数：

```javascript
const state = reactive({ count: 0 })

const runner = effect(
  () => {
    console.log('Effect executed:', state.count)
  },
  {
    scheduler(effect) {
      // 当需要执行 effect 时，这个函数会被调用
      // 我们可以选择如何执行
      console.log('Scheduler called')
      // 可以立即执行
      effect.run()
      // 也可以推迟执行
      // queueMicrotask(() => effect.run())
    }
  }
)

state.count++ 
// 输出: Scheduler called
// 输出: Effect executed: 1
```

`scheduler` 的存在让上层 API 可以实现各种执行策略。`computed` 使用 scheduler 来实现惰性求值——当依赖变化时只是标记"需要重新计算"，而不是立即计算。`watch` 使用 scheduler 来实现批量更新——多次数据变化只触发一次回调。组件渲染使用 scheduler 来实现异步更新——将更新推入队列，在下一个微任务中统一执行。

## stop 和 runner

`effect` 函数会返回一个 runner 函数，调用它可以手动重新执行 effect：

```javascript
const state = reactive({ count: 0 })

const runner = effect(() => {
  console.log('Count:', state.count)
})
// 输出: Count: 0

runner() // 手动执行
// 输出: Count: 0

state.count++ // 自动触发
// 输出: Count: 1
```

更重要的是，runner 上有一个 `effect` 属性指向内部的 `ReactiveEffect` 实例。通过调用 `effect.stop()` 可以停止这个 effect，使它不再响应数据变化：

```javascript
const state = reactive({ count: 0 })

const runner = effect(() => {
  console.log('Count:', state.count)
})
// 输出: Count: 0

// 停止 effect
runner.effect.stop()

state.count++ // 不再触发
// 无输出

// 但手动执行仍然可以
runner() 
// 输出: Count: 1
```

`stop` 机制对于清理工作非常重要。当组件卸载时，需要停止该组件关联的所有 effect，否则会导致内存泄漏和不必要的更新。

## onTrack 和 onTrigger 调试钩子

为了方便调试，`effect` 支持两个可选的回调函数：

```javascript
const state = reactive({ count: 0 })

effect(
  () => {
    console.log('Count:', state.count)
  },
  {
    onTrack(e) {
      // 当依赖被收集时调用
      console.log('Tracked:', e.target, e.key)
      // e.effect 指向当前 effect
      // e.target 是响应式对象的原始对象
      // e.key 是被访问的属性名
    },
    onTrigger(e) {
      // 当 effect 被触发时调用
      console.log('Triggered:', e.target, e.key, e.oldValue, '→', e.newValue)
      // 可以在这里打断点，查看是谁修改了数据
      debugger
    }
  }
)
```

这两个钩子只在开发环境下可用，生产环境中会被忽略。它们对于调试复杂的响应式问题非常有帮助——你可以精确知道 effect 依赖了哪些数据，以及是什么操作触发了 effect 的重新执行。

## effect 与 Vue 组件的关系

在 Vue 组件系统中，每个组件实例都有一个与之关联的渲染 effect。当组件的响应式状态变化时，这个 effect 会被触发，导致组件重新渲染。

```javascript
// 简化的组件渲染流程
function mountComponent(component) {
  const instance = createComponentInstance(component)
  
  // 创建渲染 effect
  instance.effect = new ReactiveEffect(
    () => {
      // 这是渲染函数，它会访问组件的响应式状态
      const vnode = component.render.call(instance.proxy)
      patch(instance.vnode, vnode, container)
      instance.vnode = vnode
    },
    () => {
      // scheduler：将更新加入队列，而不是立即执行
      queueJob(instance.update)
    }
  )
  
  // 首次渲染
  instance.update = instance.effect.run.bind(instance.effect)
  instance.update()
}
```

这段简化的代码展示了 effect 如何驱动组件更新：渲染函数被包装成 effect，当其依赖的状态变化时，scheduler 会将更新任务加入队列，等待下一个微任务统一执行。

## 小结

副作用函数是连接响应式数据和更新逻辑的桥梁。通过 `activeEffect` 机制，Vue3 实现了自动的依赖追踪，让开发者无需手动声明依赖关系。`ReactiveEffect` 类封装了 effect 的完整生命周期，包括执行、依赖收集、依赖清理、停止等。scheduler 机制为上层 API 提供了灵活的执行控制能力。

在下一章中，我们将深入探讨依赖收集（track）的具体实现，了解 Vue3 是如何存储和管理这些依赖关系的。

