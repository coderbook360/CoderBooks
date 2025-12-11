# 依赖清理与嵌套 effect 的处理

上一章的实现有两个严重问题：

1. 分支切换时，旧依赖没有被清理
2. 嵌套 effect 会导致 `activeEffect` 被覆盖

**这两个问题如果不解决，会导致很多奇怪的 bug**。这一章来彻底解决它们。

## 首先要问的问题

**先思考一下**：为什么依赖需要被清理？不是收集一次就够了吗？

让我们看一个具体场景：

```javascript
const state = reactive({ ok: true, text: 'hello' })

effect(() => {
  const message = state.ok ? state.text : 'not'
  console.log(message)
})
```

初始时 `ok = true`，effect 执行后依赖了 `ok` 和 `text`。到这里没问题。

现在把 `ok` 改为 `false`：

```javascript
state.ok = false
```

effect 重新执行，**这次只读取了 `ok`，没有读取 `text`**（因为三元表达式走了 else 分支）。

按理说，后续修改 `text` 不应该触发更新——我们已经不关心 `text` 了！

**但用我们之前的实现**：

```javascript
state.text = 'world'  // 仍然触发了 effect！为什么？
```

这是因为第一次执行时，effect 被添加到了 `text` 的 deps 中，**之后一直没有被移除**。

这就是**依赖遗留问题**：分支切换后，旧的依赖关系还在，导致不必要的更新。

## 依赖清理

**理解了问题，解决方案就很自然了**：每次 effect 执行前，先把它从所有依赖集合中移除，然后重新收集。

**这就是为什么我们要在 effect 中记录 `deps`**——上一章埋下的伏笔现在派上用场了：

```javascript
class ReactiveEffect {
  constructor(fn) {
    this.fn = fn
    this.deps = []  // 记录被哪些 deps 收集了（反向引用）
  }
}
```

清理函数：

```javascript
function cleanup(effect) {
  // 遍历 effect 的所有 deps
  for (const deps of effect.deps) {
    // 从每个 deps 中移除当前 effect
    deps.delete(effect)
  }
  // 清空 deps 数组，准备重新收集
  effect.deps.length = 0
}
```

在 `run` 中调用：

```javascript
class ReactiveEffect {
  run() {
    // 新增：执行前清理所有旧依赖
    cleanup(this)
    
    activeEffect = this
    const result = this.fn()  // 执行函数，重新收集依赖
    activeEffect = null
    return result
  }
}
```

现在每次执行 effect 时：

1. 先清除所有旧依赖（"退订"所有之前订阅的属性）
2. 执行函数，重新收集当前依赖（重新"订阅"实际用到的属性）

**这样，分支切换后不再使用的数据就不会触发更新了！**

## 新问题：无限循环

**但是，加入 cleanup 后出现了新问题**。让我们仔细分析：

```javascript
function trigger(target, key) {
  const deps = depsMap.get(key)
  deps.forEach(effect => effect.run())
}
```

`effect.run()` 会：
1. 先 `cleanup`——从 deps 中删除 effect
2. 执行函数——访问响应式数据，又把 effect 添加回 deps

**问题在于**：我们正在用 `forEach` 遍历 `deps`，同时又在删除和添加元素！

用一个简单的例子说明这个问题：

```javascript
const set = new Set([1])

set.forEach(item => {
  set.delete(item)
  set.add(item)
  console.log('loop')
})
// 这会无限循环！
```

**为什么会无限循环？** 因为删除后又添加，forEach 会认为还有元素要处理。这是 Set 的 forEach 行为特性——它会持续迭代直到没有"未访问过的元素"，而我们每次删除再添加，就创造了新的"未访问过的元素"。

**解决方案是创建一个新 Set 来遍历**——这是一个非常经典的技巧：

```javascript
function trigger(target, key) {
  const deps = depsMap.get(key)
  if (!deps) return
  
  // 新增：创建新的 Set，复制要执行的 effect
  const effectsToRun = new Set()
  
  deps.forEach(effect => {
    if (effect !== activeEffect) {
      effectsToRun.add(effect)
    }
  })
  
  // 遍历新 Set，原始 deps 的修改不会影响遍历
  effectsToRun.forEach(effect => effect.run())
}
```

**现在遍历的是 `effectsToRun`（一个静态的快照），对原始 `deps` 的修改不会影响遍历。**

## 嵌套 effect 问题

**解决了第一个问题，现在来看第二个问题**：嵌套 effect。

这在 Vue 中很常见——组件嵌套时就会出现嵌套 effect：

```javascript
// 外层组件的渲染 effect
effect(() => {
  console.log('outer')
  
  // 内层组件的渲染 effect
  effect(() => {
    console.log('inner')
  })
  
  // 外层继续执行
  console.log(state.foo)  // 这里的依赖会丢失！
})
```

**思考一下**：执行过程中 `activeEffect` 会如何变化？

1. 外层 effect 开始，`activeEffect = outerEffect`
2. 执行内层 effect，`activeEffect = innerEffect`
3. 内层 effect 执行完，`activeEffect = null` ← **问题在这里！**
4. 继续执行外层，访问 `state.foo`
5. 此时 `activeEffect = null`，**依赖收集失败！**

问题在于：`activeEffect` 是单一变量，内层 effect 执行完后直接置空，外层的引用丢失了。

**这就像函数调用一样——调用嵌套函数后应该返回到外层函数，而不是直接结束。** 想想 JavaScript 的调用栈，它就是用来解决这个问题的。

## effectStack 解决方案

**函数调用用调用栈来保存上下文，我们也用栈来保存 effect 的执行顺序**。这是一个非常经典的设计模式：

```javascript
let activeEffect = null
const effectStack = []  // 新增：effect 执行栈

class ReactiveEffect {
  run() {
    cleanup(this)
    
    // 新增：入栈
    effectStack.push(this)
    activeEffect = this
    
    const result = this.fn()
    
    // 新增：出栈，恢复上一个 effect
    effectStack.pop()
    activeEffect = effectStack[effectStack.length - 1]
    
    return result
  }
}
```

**现在执行过程变成**：

1. 外层 effect 开始，`effectStack = [outer]`，`activeEffect = outer`
2. 内层 effect 开始，`effectStack = [outer, inner]`，`activeEffect = inner`
3. 内层 effect 执行完，出栈，`effectStack = [outer]`，`activeEffect = outer`
4. 继续执行外层，访问 `state.foo`，`activeEffect = outer`，**正确收集！**

**有没有发现这和函数调用栈的原理一模一样？** 这就是用栈来保存"执行上下文"的经典模式。

## 完整实现

让我们把所有改进整合起来：

```javascript
let activeEffect = null
const effectStack = []

function cleanup(effect) {
  for (const deps of effect.deps) {
    deps.delete(effect)
  }
  effect.deps.length = 0
}

class ReactiveEffect {
  constructor(fn) {
    this.fn = fn
    this.deps = []
  }
  
  run() {
    // 1. 清理旧依赖
    cleanup(this)
    
    // 2. 入栈
    effectStack.push(this)
    activeEffect = this
    
    let result
    try {
      result = this.fn()
    } finally {
      // 3. 出栈，恢复上一个 effect
      // 用 try...finally 确保即使 fn 抛出异常，栈也能正确恢复
      effectStack.pop()
      activeEffect = effectStack[effectStack.length - 1]
    }
    
    return result
  }
}

function effect(fn) {
  const _effect = new ReactiveEffect(fn)
  _effect.run()
  return _effect
}
```

**注意 `try...finally` 的使用**——这确保即使 fn 抛出异常，栈也能正确恢复。这是一个很重要的细节！

## 触发时的完整处理

trigger 也需要更完善的处理：

```javascript
function trigger(target, key, type) {
  const depsMap = targetMap.get(target)
  if (!depsMap) return
  
  const deps = depsMap.get(key)
  
  const effectsToRun = new Set()
  
  // 辅助函数：收集要执行的 effect
  const addEffects = (effects) => {
    if (!effects) return
    effects.forEach(effect => {
      // 避免自己触发自己
      if (effect !== activeEffect) {
        effectsToRun.add(effect)
      }
    })
  }
  
  addEffects(deps)
  
  // 新增：如果是数组的 ADD 操作，需要额外触发 length 的依赖
  if (type === 'add' && Array.isArray(target)) {
    const lengthDeps = depsMap.get('length')
    addEffects(lengthDeps)
  }
  
  // 执行所有 effect
  effectsToRun.forEach(effect => {
    effect.run()
  })
}
```

**为什么数组新增元素要额外触发 `length` 的依赖？** 因为很多代码会这样写：

```javascript
effect(() => {
  console.log(state.list.length)  // 依赖 length
})

state.list.push(1)  // 新增元素，length 变了，应该触发更新
```

## 调度器预留

**这里先埋一个伏笔**：在 Vue 3 中，effect 不一定立即执行，可以通过调度器（scheduler）控制：

```javascript
function effect(fn, options = {}) {
  const _effect = new ReactiveEffect(fn)
  
  // 新增：保存调度器
  if (options.scheduler) {
    _effect.scheduler = options.scheduler
  }
  
  _effect.run()
  return _effect
}
```

trigger 时检查是否有调度器：

```javascript
effectsToRun.forEach(effect => {
  if (effect.scheduler) {
    // 有调度器，让调度器决定何时执行
    effect.scheduler(effect.run.bind(effect))
  } else {
    // 没有调度器，立即执行
    effect.run()
  }
})
```

**为什么需要调度器？** 想象一下：如果一个组件在一次事件处理中修改了 10 个响应式属性，你希望组件渲染 10 次还是 1 次？

调度器让我们可以"延迟执行"、"合并执行"，这在实现 `computed` 和组件更新调度时非常重要。后续章节会详细讲解。

## 本章小结

这一章解决了两个关键问题：

**问题一：依赖遗留**
- 症状：分支切换后，旧依赖仍然触发更新
- 原因：effect 没有"退订"不再使用的属性
- 解决：每次执行前 cleanup，清除所有旧依赖，重新收集

**问题二：嵌套 effect**
- 症状：嵌套 effect 导致外层依赖收集失败
- 原因：`activeEffect` 被内层覆盖后没有恢复
- 解决：使用 effectStack 保存执行顺序，像函数调用栈一样管理

**现在我们的响应式系统已经相当完善了**。下一章我们将实现 `ref`，解决原始值无法被 Proxy 代理的问题。

---

## 练习与思考

1. 验证依赖清理是否生效：

```javascript
const state = reactive({ ok: true, text: 'hello' })
let runs = 0

effect(() => {
  runs++
  state.ok ? state.text : 'not'
})

state.ok = false
state.text = 'world'

console.log(runs)  // 应该是 2，不是 3。为什么？
```

2. 实现一个支持 `stop` 的 effect：

```javascript
const runner = effect(() => {
  console.log(state.count)
})

runner.stop()  // 停止追踪

state.count = 1  // 不应该触发更新
```

提示：需要添加一个 `active` 标记，stop 时设为 false，run 时检查。

3. **思考这个问题**：如果一个 effect 在执行时抛出异常，会发生什么？当前实现能正确处理吗？（提示：看看 `try...finally`）