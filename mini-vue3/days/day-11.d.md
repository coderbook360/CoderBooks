# Day 11: stop 功能完善与生命周期

你好，我是你的技术导师。

昨天，我们初步实现了 `stop` 方法，让 `effect` 可以"退休"。
今天，我们要让这个退休过程更加体面，更加完善。

我们要解决两个核心问题：
1.  **善后工作**：`effect` 退休了，它创建的定时器、事件监听器怎么办？
2.  **退休返聘**：`effect` 退休后，还能不能手动让它干活？

## 1. 善后工作：onStop 回调

想象一下，你在 `effect` 里启动了一个定时器：

```javascript
effect(() => {
  const timer = setInterval(() => {
    console.log('tick')
  }, 1000)
})
```

当你调用 `stop()` 停止这个 `effect` 时，虽然响应式系统不再追踪它了，但 `setInterval` 依然在后台跑着，每秒打印一次 'tick'。这显然不是我们想要的。

我们需要一个机制，在 `effect` 停止时，通知用户去清理这些副作用。

这就是 `onStop` 回调的作用。

```typescript
const runner = effect(
  () => {
    const timer = setInterval(() => console.log('tick'), 1000)
  },
  {
    onStop: () => {
      clearInterval(timer) // 清理定时器
      console.log('timer cleared')
    }
  }
)

runner.effect.stop() // 输出: timer cleared
```

实现起来非常简单，只需要在 `ReactiveEffect` 类中增加一个钩子：

```typescript
export class ReactiveEffect {
  onStop?: () => void // 用户传入的回调

  stop() {
    if (this.active) {
      cleanupEffect(this)
      
      // 关键点：调用回调
      if (this.onStop) {
        this.onStop()
      }
      
      this.active = false
    }
  }
}
```

现在，用户可以在 `onStop` 里做任何清理工作：取消网络请求、移除 DOM 元素、解绑事件监听等等。

## 2. 退休返聘：stop 后的行为

当一个 `effect` 被 `stop` 后，它就不应该再自动响应数据的变化了。

```javascript
const state = reactive({ count: 1 })
const runner = effect(() => console.log(state.count))

runner.effect.stop()
state.count++ // 不应该打印
```

但是，如果我们**手动调用** `runner()` 呢？

```javascript
runner() // 应该打印吗？
```

答案是：**应该**。
虽然它退休了（不再自动响应），但如果你特意请它出山（手动调用），它还是应该干活的。

只不过，这次干活是"一次性"的。它执行完就完了，**不应该再重新收集依赖**。

我们需要修改 `run` 方法来支持这种行为：

```typescript
run() {
  // 如果已经 stop 了 (active === false)
  if (!this.active) {
    // 直接执行函数，不进行依赖收集（不设置 activeEffect）
    return this.fn()
  }

  // 正常的依赖收集流程
  try {
    this.parent = activeEffect
    activeEffect = this
    shouldTrack = true
    cleanupEffect(this)
    return this.fn()
  } finally {
    // ...
  }
}
```

这样，`stop` 后的 `effect` 就变成了一个普通的函数。你可以手动执行它，但它不会再与响应式系统发生任何瓜葛。

## 3. 健壮性：防止重复 stop

如果用户连续调用多次 `stop` 怎么办？

```javascript
runner.effect.stop()
runner.effect.stop()
runner.effect.stop()
```

我们的 `stop` 方法应该设计成**幂等**的（Idempotent），即调用一次和调用多次效果一样。

我们在 `stop` 方法开头加了一个判断：

```typescript
stop() {
  if (this.active) { // 只有在激活状态下才执行停止逻辑
    // ...
    this.active = false
  }
}
```

当第一次调用 `stop` 后，`active` 变为 `false`。后续的调用会直接跳过，不会重复清理，也不会重复触发 `onStop`。

## 4. 总结

今天我们完善了 `effect` 的生命周期管理：

1.  **onStop**：提供了清理副作用的钩子，防止内存泄漏。
2.  **手动执行**：明确了 `stop` 后的行为 —— 可以手动执行，但不收集依赖。
3.  **幂等性**：保证了 `stop` 方法的安全性和稳定性。

至此，我们的 `ReactiveEffect` 类已经完全成熟了。它不仅功能强大，而且行为规范，能够应对各种复杂的业务场景。

有了这个坚实的基础，明天，我们终于可以去实现那个万众瞩目的功能 —— **computed**。

这一次，是真的要来了。
