# Day 9: 实现 trigger 触发更新函数

你好，我是你的技术导师。

昨天，我们实现了 `track`，把副作用（Effect）关进了笼子（Dep）里。
今天，我们要实现 `trigger`，在数据变化时，把笼子里的猛兽放出来。

这听起来很简单：拿到 `dep`，遍历执行 `effect.run()`。

但在真实世界中，事情往往没那么简单。
- 如果我在一个 `effect` 里修改了数据，会不会导致无限循环？
- 如果我连续修改了 100 次数据，`effect` 也要执行 100 次吗？
- 如果我新增了一个属性，`for...in` 循环能感知到吗？

今天，我们就来一一解决这些棘手的问题。

## 1. 基础实现：把猛兽放出来

首先，我们来实现一个最基础的 `trigger`。它的逻辑非常直观：
1.  通过 `target` 找到 `depsMap`。
2.  通过 `key` 找到 `dep`。
3.  遍历 `dep`，执行所有的 `effect`。

```typescript
export function trigger(target, key) {
  const depsMap = targetMap.get(target)
  if (!depsMap) return

  const dep = depsMap.get(key)
  if (dep) {
    // 这里的 effects 是一个 Set
    // 我们需要创建一个新的 Set 来遍历，防止在执行过程中 Set 被修改导致死循环
    const effectsToRun = new Set(dep)
    effectsToRun.forEach(effect => {
      effect.run()
    })
  }
}
```

这就够了吗？对于最简单的场景，够了。
但在 Vue 3 中，我们需要处理更多的情况。

## 2. 进阶挑战一：无限递归

看下面这个例子：

```javascript
const state = reactive({ count: 0 })
effect(() => {
  state.count++ // 读取 count (track) -> 设置 count (trigger)
})
```

1.  `effect` 执行，读取 `state.count`，触发 `track`。
2.  `state.count++` 修改了值，触发 `trigger`。
3.  `trigger` 再次执行这个 `effect`。
4.  回到第 1 步... **无限循环！**

为了解决这个问题，我们需要在 `trigger` 中加一个判断：
**如果触发的 effect 就是当前正在运行的 effect，那就不要执行它。**

```typescript
effectsToRun.forEach(effect => {
  if (effect !== activeEffect) { // 关键判断
    effect.run()
  }
})
```

## 3. 进阶挑战二：调度器 (Scheduler)

这是 Vue 3 性能优化的核心。

想象一下，你正在做一个高频交易系统：

```javascript
const state = reactive({ price: 100 })
effect(() => {
  console.log('Price updated:', state.price)
})

// 一秒钟内价格变动了 1000 次
for(let i=0; i<1000; i++) {
  state.price++
}
```

如果没有调度器，`console.log` 会执行 1000 次。这不仅浪费性能，还可能导致 UI 卡顿。
理想情况下，我们希望它只执行一次，打印最后的结果。

这就是 **Scheduler** 的作用。

我们在 `ReactiveEffect` 中增加一个 `scheduler` 选项：

```typescript
export class ReactiveEffect {
  constructor(public fn, public scheduler?) {} // 接收 scheduler
  // ...
}
```

在 `trigger` 中，我们优先使用 `scheduler`：

```typescript
effectsToRun.forEach(effect => {
  if (effect !== activeEffect) {
    if (effect.scheduler) {
      effect.scheduler(effect) // 交给调度器处理
    } else {
      effect.run() // 立即执行
    }
  }
})
```

现在，控制权交给了用户。用户可以定义一个 `scheduler`，把任务放到微任务队列中，实现**异步批量更新**。Vue 3 的 `nextTick` 机制就是基于此实现的。

## 4. 进阶挑战三：操作类型 (OpTypes)

并不是所有的修改都是 `SET`。

```javascript
const state = reactive({ a: 1 })
effect(() => {
  // 这个 effect 依赖了 key 的数量
  console.log(Object.keys(state)) 
})

state.b = 2 // ADD 操作
```

当我们给对象**新增**一个属性 `b` 时，虽然没有修改 `a`，但 `Object.keys(state)` 的结果变了。
所以，`ADD` 操作也需要触发那些依赖了"键集合"的 effect。

我们需要引入 `ITERATE_KEY`：

```typescript
export const ITERATE_KEY = Symbol('iterate')

// 在 track 中，如果是 Object.keys 等操作，我们收集 ITERATE_KEY
// track(target, ITERATE_KEY)

// 在 trigger 中
export function trigger(target, type, key) {
  // ... 前面的逻辑 ...

  // 如果是 ADD 或 DELETE 操作，说明 key 的数量变了
  // 需要触发依赖 ITERATE_KEY 的 effect
  if (type === 'ADD' || type === 'DELETE') {
    const iterateDep = depsMap.get(ITERATE_KEY)
    if (iterateDep) {
      iterateDep.forEach(effect => {
        if (effect !== activeEffect) effectsToRun.add(effect)
      })
    }
  }
  
  // ... 执行 effectsToRun ...
}
```

## 5. 总结

今天我们实现的 `trigger` 函数，虽然代码量不大，但逻辑非常缜密。

1.  **基础触发**：通过 `target` 和 `key` 找到对应的 `effect` 并执行。
2.  **防递归**：通过 `effect !== activeEffect` 避免无限循环。
3.  **调度器**：通过 `scheduler` 支持异步更新和批量更新，这是 Vue 高性能的秘诀。
4.  **操作类型**：区分 `SET`、`ADD`、`DELETE`，处理 `Object.keys` 等特殊依赖。

至此，我们的响应式系统核心（Reactive + Effect + Track + Trigger）已经全部完成！

这是一个里程碑。

接下来的几天，我们将基于这个强大的核心，去构建 Vue 3 中那些你耳熟能详的高级 API：`computed`、`watch`、`ref`。

你会发现，有了这个核心，实现它们是多么的自然和简单。

明天，我们先从最神奇的 `computed` 开始。准备好了吗？
