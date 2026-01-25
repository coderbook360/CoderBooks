# effect 实现：响应式的核心

effect 是响应式系统的心脏。它做的事情看似简单——执行一个函数，当函数中访问的响应式数据变化时重新执行——但要正确实现它，需要解决一系列微妙的问题：如何知道函数访问了哪些数据？如何在数据变化时找到需要通知的函数？如何处理依赖的动态变化？如何避免无限循环？如何处理嵌套的 effect？

本章我们将从最简单的版本开始，逐步解决这些问题，最终得到一个健壮的 effect 实现。

## 核心思想：全局标记与依赖映射

effect 的核心思想可以用两句话概括：执行函数时用全局变量标记"当前正在执行的 effect"；当响应式数据被读取时，把当前 effect 记录为这个数据的依赖。

这就是"依赖收集"的本质。数据不需要知道谁会用到它，effect 也不需要显式声明依赖什么数据。两者通过"读取"这个动作自动关联：只要你在 effect 中读取了某个响应式属性，这个属性就知道"有人依赖我"，以后变化时就会通知你。

让我们从最简单的实现开始，逐步完善。

## 最简版本：建立基本结构

首先实现一个能运行的最小版本。这个版本没有处理任何边界情况，但它确立了核心结构：

```typescript
// 当前正在执行的 effect
let activeEffect: Function | null = null

// 依赖关系存储：target -> key -> effects
const targetMap = new WeakMap<object, Map<unknown, Set<Function>>>()

export function effect(fn: Function) {
  activeEffect = fn
  fn()
  activeEffect = null
}

export function track(target: object, key: unknown) {
  if (!activeEffect) return
  
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()))
  }
  
  let dep = depsMap.get(key)
  if (!dep) {
    depsMap.set(key, (dep = new Set()))
  }
  
  dep.add(activeEffect)
}

export function trigger(target: object, key: unknown) {
  const depsMap = targetMap.get(target)
  if (!depsMap) return
  
  const dep = depsMap.get(key)
  if (!dep) return
  
  dep.forEach(effect => effect())
}
```

这里有三个核心函数。effect 函数接收一个副作用函数，在执行它之前设置 activeEffect，执行完毕后清除。track 函数在响应式数据被读取时调用（由 Proxy 的 get 处理器调用），它把 activeEffect 添加到这个数据的依赖集合中。trigger 函数在响应式数据被修改时调用（由 Proxy 的 set 处理器调用），它找出所有依赖这个数据的 effects 并执行它们。

依赖关系存储在一个三层结构中：最外层是 WeakMap，以响应式对象为键；第二层是 Map，以属性名为键；最内层是 Set，存储所有依赖这个属性的 effects。使用 WeakMap 的好处是：当响应式对象不再被引用时，它的依赖关系也会被自动垃圾回收。

## 问题一：依赖的动态变化

上面的实现有一个严重问题。考虑这个场景：

```typescript
const state = reactive({ show: true, message: 'hello' })

effect(() => {
  console.log(state.show ? state.message : 'hidden')
})
```

初始执行时，show 是 true，所以 effect 访问了 show 和 message 两个属性，建立了对这两个属性的依赖。如果我们把 show 改为 false，effect 会重新执行，这次只访问 show，不再访问 message。但问题是：之前对 message 的依赖还在！之后如果修改 message，effect 会错误地被触发。

解决方案是：每次执行 effect 之前，先清除它之前的所有依赖，然后重新收集。这需要记录"effect 被哪些 dep 收集了"，也就是反向依赖。

## 引入 ReactiveEffect 类

为了管理 effect 的状态，我们引入一个类：

```typescript
class ReactiveEffect {
  // 记录这个 effect 被哪些 dep 收集了（反向依赖）
  deps: Set<ReactiveEffect>[] = []
  
  constructor(public fn: Function) {}
  
  run() {
    // 执行前清理旧依赖
    cleanup(this)
    
    // 设置当前 effect
    activeEffect = this
    
    // 执行函数（会触发依赖收集）
    const result = this.fn()
    
    // 清除当前 effect
    activeEffect = null
    
    return result
  }
}

function cleanup(effect: ReactiveEffect) {
  // 从所有收集了这个 effect 的 dep 中移除它
  for (const dep of effect.deps) {
    dep.delete(effect)
  }
  // 清空反向依赖数组
  effect.deps.length = 0
}
```

现在 effect 不再是一个普通函数，而是 ReactiveEffect 的实例。run 方法在执行用户函数之前先调用 cleanup，移除所有旧的依赖关系。执行过程中会重新收集当前需要的依赖。

track 函数也需要修改，在收集依赖时建立反向引用：

```typescript
export function track(target: object, key: unknown) {
  if (!activeEffect) return
  
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()))
  }
  
  let dep = depsMap.get(key)
  if (!dep) {
    depsMap.set(key, (dep = new Set()))
  }
  
  // 避免重复添加
  if (!dep.has(activeEffect)) {
    dep.add(activeEffect)
    // 建立反向依赖
    activeEffect.deps.push(dep)
  }
}
```

每次把 effect 添加到 dep 时，也把 dep 添加到 effect.deps 中。这样 cleanup 就能找到所有需要清理的地方。

## 问题二：避免无限循环

考虑这个看似合理但会出问题的场景：

```typescript
const state = reactive({ count: 0 })

effect(() => {
  state.count++
})
```

这个 effect 读取 count（触发 track），然后写入 count（触发 trigger）。trigger 会执行所有依赖 count 的 effects，包括当前这个 effect 本身。于是 effect 再次执行，再次 trigger，陷入无限循环。

解决方案很简单：trigger 时排除当前正在执行的 effect：

```typescript
export function trigger(target: object, key: unknown) {
  const depsMap = targetMap.get(target)
  if (!depsMap) return
  
  const dep = depsMap.get(key)
  if (!dep) return
  
  // 创建一个新 Set 来收集需要执行的 effects
  const effectsToRun = new Set<ReactiveEffect>()
  
  dep.forEach(effect => {
    // 排除当前正在执行的 effect
    if (effect !== activeEffect) {
      effectsToRun.add(effect)
    }
  })
  
  effectsToRun.forEach(effect => effect.run())
}
```

这个检查很简单但很有效：如果某个 effect 正在执行，它自己触发的数据变化不会导致它立即重新执行。这避免了无限循环，也符合直觉——你期望 `state.count++` 是一个原子操作，而不是触发递归。

## 问题三：嵌套 effect

effect 可以嵌套：

```typescript
effect(() => {
  console.log('outer', state.a)
  
  effect(() => {
    console.log('inner', state.b)
  })
  
  console.log('outer again', state.c)
})
```

外层 effect 执行时，会创建并执行内层 effect。问题是：当内层 effect 执行完毕，activeEffect 被设为 null。这时外层 effect 继续执行，访问 state.c，但 activeEffect 已经是 null，这个依赖就丢失了！

解决方案是使用栈来管理 effect：

```typescript
const effectStack: ReactiveEffect[] = []

class ReactiveEffect {
  deps: Set<ReactiveEffect>[] = []
  
  constructor(public fn: Function) {}
  
  run() {
    cleanup(this)
    
    // 将自己压入栈
    effectStack.push(this)
    activeEffect = this
    
    const result = this.fn()
    
    // 执行完毕，弹出栈
    effectStack.pop()
    // 恢复到外层 effect（如果有的话）
    activeEffect = effectStack[effectStack.length - 1] || null
    
    return result
  }
}
```

现在嵌套 effect 可以正确工作了：外层 effect 开始时入栈；内层 effect 开始时也入栈；内层 effect 结束时出栈，activeEffect 恢复为外层 effect；外层 effect 继续执行，正确收集 state.c 的依赖。

## 完整实现

综合以上改进，这是完整的 effect 实现：

```typescript
type Dep = Set<ReactiveEffect>
type KeyToDepMap = Map<unknown, Dep>
const targetMap = new WeakMap<object, KeyToDepMap>()

let activeEffect: ReactiveEffect | null = null
const effectStack: ReactiveEffect[] = []

class ReactiveEffect {
  deps: Dep[] = []
  
  constructor(public fn: Function) {}
  
  run() {
    // 清理旧依赖
    cleanup(this)
    
    // 入栈并设为当前
    effectStack.push(this)
    activeEffect = this
    
    // 执行用户函数
    const result = this.fn()
    
    // 出栈并恢复
    effectStack.pop()
    activeEffect = effectStack[effectStack.length - 1] || null
    
    return result
  }
}

function cleanup(effect: ReactiveEffect) {
  for (const dep of effect.deps) {
    dep.delete(effect)
  }
  effect.deps.length = 0
}

export function effect(fn: Function) {
  const _effect = new ReactiveEffect(fn)
  _effect.run()
  return _effect.run.bind(_effect)
}

export function track(target: object, key: unknown) {
  if (!activeEffect) return
  
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()))
  }
  
  let dep = depsMap.get(key)
  if (!dep) {
    depsMap.set(key, (dep = new Set()))
  }
  
  if (!dep.has(activeEffect)) {
    dep.add(activeEffect)
    activeEffect.deps.push(dep)
  }
}

export function trigger(target: object, key: unknown) {
  const depsMap = targetMap.get(target)
  if (!depsMap) return
  
  const dep = depsMap.get(key)
  if (!dep) return
  
  const effectsToRun = new Set<ReactiveEffect>()
  dep.forEach(effect => {
    if (effect !== activeEffect) {
      effectsToRun.add(effect)
    }
  })
  
  effectsToRun.forEach(effect => effect.run())
}

export { ReactiveEffect }
```

注意 effect 函数的返回值：它返回一个绑定了 this 的 run 方法，这样用户可以手动触发 effect 重新执行。

## 本章小结

effect 实现的核心挑战不是"执行函数"这个简单动作，而是处理各种边界情况：动态依赖需要每次清理再重新收集；自我触发需要在 trigger 时排除当前 effect；嵌套执行需要用栈来维护正确的上下文。

这些问题的解决方案展示了响应式系统设计中的一些重要原则：用全局状态（activeEffect、effectStack）来传递上下文；用双向引用（effect.deps 和 dep 中的 effect）来支持高效的增删操作；用防御性检查（排除 activeEffect）来避免边界情况。

effect 是整个响应式系统的基石。理解了它的实现，后续的 reactive、computed、watch 都会变得容易理解——它们都是在 effect 的基础上构建的。

在下一章中，我们将实现 track 和 trigger 的更多细节，看看如何处理不同类型的操作和更复杂的触发场景。
