# Day 5: 实现完整的 effect 函数

你好，我是你的技术导师。

昨天，我们亲手打造了 `reactive`，让数据变成了"活"的。但现在的它，就像一个孤独的舞者，虽然舞姿优美（能拦截操作），却无人欣赏（没有触发更新）。

今天，我们要为它寻找舞伴。

这个舞伴就是 `effect`（副作用函数）。它是响应式系统的"大脑"，负责指挥数据的流动。

你可能在 Vue 3 中用过 `watchEffect`，或者在 React 中用过 `useEffect`。它们背后的核心思想都是一样的：**当依赖的数据变化时，自动重新执行函数。**

但你有没有想过，这个"自动"究竟是如何实现的？

- `track` 函数怎么知道当前是哪个函数在读取数据？
- 为什么 `effect` 需要返回一个 `runner`？
- 为什么我们需要一个 `ReactiveEffect` 类来封装它？

让我们一起潜入源码的深处，寻找答案。

## 1. 寻找"当前执行者"：activeEffect 的诞生

### 1.1 一个棘手的问题

让我们回顾一下 `track` 函数的伪代码：

```javascript
function track(target, key) {
  // 问题：我怎么知道是谁在读取 target[key]？
  // 我需要把"谁"存到依赖列表里
  dep.add(???) 
}
```

当我们写下 `effect(() => console.log(state.count))` 时，执行流程是这样的：
1.  `effect` 函数执行。
2.  传入的匿名函数执行。
3.  `state.count` 被读取。
4.  触发 `get` 拦截器。
5.  调用 `track`。

在第 5 步时，JavaScript 引擎并没有告诉 `track` 函数："嘿，是那个匿名函数在调用你。"

我们需要一种机制，让 `track` 能够"看见"当前正在执行的副作用函数。

### 1.2 全局变量的妙用

既然函数参数传不过来，我们就用全局变量！

我们可以定义一个全局变量 `activeEffect`。

```javascript
let activeEffect

function effect(fn) {
  // 1. 在执行 fn 之前，把自己挂到全局变量上
  activeEffect = fn
  
  // 2. 执行 fn
  fn()
  
  // 3. 执行完后，重置全局变量
  activeEffect = undefined
}

function track(target, key) {
  // 4. 现在我知道是谁了！
  if (activeEffect) {
    dep.add(activeEffect)
  }
}
```

这就是 Vue 3 响应式系统的核心魔法。它利用了 JavaScript 的单线程特性，确保在同一时刻，`activeEffect` 指向的一定是当前正在执行的那个副作用函数。

## 2. 封装的艺术：ReactiveEffect 类

虽然用函数也能实现，但随着需求的增加，单纯的函数开始捉襟见肘：
- 我们需要停止（stop）一个 effect。
- 我们需要手动触发（runner）一个 effect。
- 我们需要支持调度器（scheduler）。
- 我们需要记录这个 effect 依赖了哪些属性（反向记录），以便清理。

为了管理这些复杂的状态，Vue 3 引入了 `ReactiveEffect` 类。

```typescript
export class ReactiveEffect<T = any> {
  active = true
  deps: Dep[] = []
  
  constructor(
    public fn: () => T,
    public scheduler: EffectScheduler | null = null
  ) {}
  
  run() {
    if (!this.active) {
      return this.fn()
    }
    
    try {
      // 核心逻辑：设置 activeEffect
      activeEffect = this
      return this.fn()
    } finally {
      // 核心逻辑：重置 activeEffect
      activeEffect = undefined
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

这个类就像一个容器，把副作用函数包裹起来，赋予了它"生命周期"（run, stop）和"状态"（active, deps）。

## 3. 面向用户的 API：effect 函数

用户不需要直接操作 `ReactiveEffect` 类，他们只需要一个简单的 `effect` 函数。

```typescript
export function effect<T = any>(fn: () => T) {
  // 1. 创建实例
  const _effect = new ReactiveEffect(fn)
  
  // 2. 默认立即执行一次
  _effect.run()
  
  // 3. 返回 runner
  const runner = _effect.run.bind(_effect)
  runner.effect = _effect // 挂载实例，方便后续操作（如 stop）
  
  return runner
}
```

为什么要返回 `runner`？

因为有时候我们需要手动控制 effect 的执行，或者在外部停止它。

```javascript
const runner = effect(() => {
  console.log(state.count)
})

// 手动再次执行
runner()

// 停止它
runner.effect.stop()
```

## 4. 动手时刻：让系统运转起来

现在，我们有了 `ReactiveEffect` 类，有了 `activeEffect` 全局变量，也有了 `track` 和 `trigger` 的逻辑。是时候把它们连通了。

### 4.1 完善 track

```typescript
// src/reactivity/effect.ts

export function track(target: object, key: unknown) {
  // 如果没有 activeEffect，说明不是在 effect 中访问的，直接忽略
  if (!activeEffect) return
  
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    depsMap = new Map()
    targetMap.set(target, depsMap)
  }
  
  let dep = depsMap.get(key)
  if (!dep) {
    dep = new Set()
    depsMap.set(key, dep)
  }
  
  // 收集依赖
  trackEffects(dep)
}

export function trackEffects(dep: Dep) {
  // 双向收集：
  // 1. dep 收集 effect
  dep.add(activeEffect!)
  // 2. effect 收集 dep（用于 stop 时清理）
  activeEffect!.deps.push(dep)
}
```

### 4.2 完善 trigger

```typescript
// src/reactivity/effect.ts

export function trigger(target: object, key: unknown) {
  const depsMap = targetMap.get(target)
  if (!depsMap) return
  
  const dep = depsMap.get(key)
  if (dep) {
    triggerEffects(dep)
  }
}

export function triggerEffects(dep: Dep) {
  // 遍历执行所有 effect
  for (const effect of dep) {
    if (effect.scheduler) {
      // 如果有调度器，交给调度器处理
      effect.scheduler(effect)
    } else {
      // 否则直接执行
      effect.run()
    }
  }
}
```

## 5. 见证奇迹的时刻

创建一个测试文件，让我们看看这一切是否真的工作了。

```typescript
const state = reactive({ count: 1 })

effect(() => {
  console.log('当前 count:', state.count)
})
// 输出: 当前 count: 1

state.count++
// 输出: 当前 count: 2
```

当你看到控制台打印出 "当前 count: 2" 时，恭喜你！你已经亲手构建了一个最小可用的响应式系统。

## 6. 总结与预告

今天，我们实现了响应式系统的核心驱动力 —— `effect`。

我们学到了：
1.  **activeEffect**：利用全局变量解决依赖收集时的上下文问题。
2.  **ReactiveEffect**：封装副作用函数，提供状态管理和生命周期。
3.  **Runner**：提供手动控制 effect 的能力。

但是，我们的系统还很脆弱。

试想一下，如果 `effect` 里面嵌套了另一个 `effect` 会怎样？

```javascript
effect(() => { // effect1
  effect(() => { // effect2
    console.log(state.foo)
  })
  console.log(state.bar)
})
```

当前的 `activeEffect` 机制能处理这种情况吗？当内部 `effect2` 执行完，`activeEffect` 被重置为 `undefined`，外部 `effect1` 后面的代码还能正确收集依赖吗？

这是一个经典的**嵌套 Effect** 问题。

明天，我们将引入**Effect 栈**（或者更优雅的父指针方案）来解决这个问题，让我们的响应式系统坚如磐石。

准备好迎接更复杂的挑战了吗？我们明天见！
