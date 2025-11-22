# Day 6: 处理嵌套 effect

你好，我是你的技术导师。

昨天，我们成功实现了 `effect`，让响应式系统有了"大脑"。但这个大脑目前还比较简单，只能处理单线程的线性任务。

一旦遇到"多重梦境"——也就是嵌套的 `effect`，它就会迷失方向。

你可能会问："为什么会有嵌套 effect？我平时写代码好像没怎么用过啊？"

其实，嵌套 effect 无处不在。最典型的场景就是**组件渲染**。

Vue 的组件渲染本质上就是一个 `effect`。当父组件渲染时（父 effect 执行），它会渲染子组件（子 effect 执行）。这就是一个天然的嵌套结构。

如果我们的响应式系统处理不好嵌套，那么在父组件更新时，可能会错误地收集到子组件的依赖，或者在子组件更新后，父组件的依赖收集逻辑彻底乱套。

今天，我们就来修复这个严重的 Bug，让我们的系统能够从容应对任意深度的嵌套。

## 1. 案发现场：activeEffect 的迷失

让我们先还原一下案发现场。

```javascript
const state = reactive({ foo: 1, bar: 2 })

effect(() => { // effect1 (父)
  console.log('父 effect 开始')
  
  effect(() => { // effect2 (子)
    console.log('子 effect 执行')
    state.bar // 访问 bar
  })
  
  state.foo // 访问 foo
  console.log('父 effect 结束')
})
```

按照我们昨天的实现，`activeEffect` 是一个全局变量。

1.  `effect1` 开始执行，`activeEffect` 指向 `effect1`。
2.  `effect2` 开始执行，`activeEffect` 被修改为 `effect2`。
3.  `effect2` 执行完毕，`activeEffect` 被重置为 `undefined`。
4.  回到 `effect1` 继续执行，访问 `state.foo`。
5.  **出事了！** 此时 `activeEffect` 是 `undefined`！
6.  `track` 函数发现没有 `activeEffect`，直接返回。
7.  结果：`state.foo` 的依赖没有被收集！以后修改 `foo`，`effect1` 不会重新执行。

这就是问题的根源：**我们丢失了"回到过去"的能力。** 当子 effect 执行完，我们忘记了父 effect 是谁。

## 2. 拯救方案 A：函数调用栈

学过数据结构的同学第一反应肯定是：**栈（Stack）**。

既然是嵌套调用，那我们就用一个栈来保存 `activeEffect`。

- `effect1` 执行 -> 入栈 `[effect1]` -> `activeEffect` 是栈顶 (`effect1`)
- `effect2` 执行 -> 入栈 `[effect1, effect2]` -> `activeEffect` 是栈顶 (`effect2`)
- `effect2` 结束 -> 出栈 `[effect1]` -> `activeEffect` 恢复为栈顶 (`effect1`)
- `effect1` 继续 -> 正确收集依赖！

这确实是一个可行的方案，Vue 2 就是这么干的。

但是，Vue 3 追求极致的性能。数组的 `push` 和 `pop` 虽然很快，但在高频触发的响应式系统中，依然是一笔开销。

有没有更轻量、更优雅的方案？

## 3. 拯救方案 B：Parent 指针

Vue 3 采用了一种链表式的思路：**Parent 指针**。

我们不需要一个全局的数组栈。我们只需要在每个 `effect` 实例上记录它的"父亲"是谁。

当一个 `effect` 运行时：
1.  先把当前的 `activeEffect` 存到自己的 `parent` 属性上（认祖归宗）。
2.  把自己设置为 `activeEffect`（当家作主）。
3.  执行完后，把 `activeEffect` 恢复为 `parent`（交还权力）。

```typescript
class ReactiveEffect {
  parent = undefined
  
  run() {
    try {
      // 1. 记住当前的 activeEffect (它是我的父亲)
      this.parent = activeEffect
      
      // 2. 我成为当前的 activeEffect
      activeEffect = this
      
      return this.fn()
    } finally {
      // 3. 执行完，把控制权还给父亲
      activeEffect = this.parent
      this.parent = undefined
    }
  }
}
```

这个方案不需要额外的数组内存，不需要 `push/pop` 操作，仅仅是属性赋值，性能做到了极致。

## 4. 完整的执行流程演示

让我们用 Parent 指针方案再跑一遍刚才的案例：

1.  **初始状态**：`activeEffect = undefined`。
2.  **effect1 执行**：
    - `effect1.parent = undefined`
    - `activeEffect = effect1`
3.  **effect2 执行**：
    - `effect2.parent = effect1` (记住了！)
    - `activeEffect = effect2`
    - 访问 `state.bar` -> 收集 `effect2` (正确)
4.  **effect2 结束**：
    - `activeEffect` 恢复为 `effect2.parent` (也就是 `effect1`)
5.  **effect1 继续**：
    - 访问 `state.foo` -> 此时 `activeEffect` 是 `effect1` -> 收集 `effect1` (正确！)
6.  **effect1 结束**：
    - `activeEffect` 恢复为 `effect1.parent` (也就是 `undefined`)

完美！所有依赖都归位了。

## 5. 另一个细节：shouldTrack

在修复嵌套问题的同时，我们还需要关注另一个控制开关：`shouldTrack`。

有时候，我们虽然在 `effect` 内部，但并不想收集依赖。比如在 `cleanup` 清理依赖的时候，或者在某些特殊的生命周期钩子中。

我们需要一个全局开关 `shouldTrack` 来控制是否进行依赖收集。

但是，`shouldTrack` 也面临同样的嵌套问题！

如果父 effect 暂停了依赖收集，子 effect 开启了依赖收集，子 effect 结束后，父 effect 应该恢复"暂停"状态，而不是默认的"开启"状态。

所以，`shouldTrack` 的恢复逻辑也需要精细设计：

```typescript
// 在 finally 块中
// 恢复 activeEffect
activeEffect = this.parent

// 恢复 shouldTrack
// 只有当恢复后的 activeEffect 存在时，才应该继续收集
// 或者我们可以用同样的 parent 指针思路来保存上一级的 shouldTrack 状态
// 但 Vue 3 简化了逻辑：只要有 activeEffect，通常就意味着应该收集（除非显式暂停）
```

在我们的实现中，我们可以简单地根据 `this.parent` 是否存在来判断是否还在嵌套中，从而决定 `shouldTrack` 的值。

## 6. 总结与预告

今天，我们通过引入 **Parent 指针**，优雅地解决了嵌套 `effect` 带来的依赖丢失问题。

我们学到了：
1.  **嵌套 Effect** 是组件树渲染的必然产物。
2.  **全局变量的局限性**：单变量无法记录历史状态。
3.  **Parent 指针**：一种比栈更高效的"历史记录"方式。

至此，我们的响应式系统已经具备了处理复杂嵌套逻辑的能力。

但是，现在的 `effect` 还是太"老实"了。一旦数据变化，它就立即执行，没有任何商量的余地。

在实际开发中，我们往往需要更多的控制权：
- 我想延迟执行（computed）。
- 我想控制执行的时机（nextTick）。
- 我想在执行前做点清理工作（onStop）。

明天，我们将为 `effect` 装上**调度器（Scheduler）**，让它变得更加灵活强大。我们将亲手实现 Vue 3 中 `computed` 和 `watch` 的基石。

准备好掌控时间了吗？我们明天见！
