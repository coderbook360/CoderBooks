# Day 18: watchEffect 和高级选项

你好，我是你的技术导师。

昨天我们实现了 `watch`，它需要你明确指定监听谁。
但有时候，我们希望更"智能"一点：**谁被用到了，就监听谁。**

这就是 `watchEffect`。

它就像一个自动驾驶的 `watch`，你只需要写业务逻辑，它会自动分析依赖，自动执行。

## 1. 自动追踪：watchEffect

`watchEffect` 的实现其实比 `watch` 更简单。
因为它不需要区分 `source` 和 `callback`，它只有一个函数。

这个函数既是依赖收集者（getter），也是副作用执行者（scheduler job）。

```typescript
function watchEffect(effect) {
  // 1. 封装 job
  const job = () => {
    // 执行 effect，自动收集依赖
    effectFn.run()
  }

  // 2. 创建 ReactiveEffect
  const effectFn = new ReactiveEffect(effect, job)

  // 3. 立即执行一次
  effectFn.run()

  // 4. 返回停止函数
  return () => {
    effectFn.stop()
  }
}
```

看，是不是比 `watch` 简单多了？
当你调用 `watchEffect(() => console.log(count.value))` 时：
1.  立即执行一次，打印 `count`。
2.  因为读取了 `count.value`，`effect` 被收集。
3.  `count` 变化 -> 触发 `job` -> 再次执行 `effect` -> 再次打印。

## 2. 副作用清理：onCleanup

在副作用函数中，我们经常会做一些需要清理的事情，比如：
-   开启定时器。
-   发起网络请求（需要取消上一次的）。
-   添加 DOM 事件监听。

如果副作用频繁执行，这些资源就会堆积。
我们需要一个机制，在**下一次副作用执行前**，清理掉上一次的残留。

Vue 提供了一个 `onCleanup` 函数作为参数传给副作用。

```javascript
watchEffect((onCleanup) => {
  const timer = setInterval(() => console.log('tick'), 1000)

  // 注册清理函数
  onCleanup(() => {
    clearInterval(timer)
  })
})
```

### 2.1 实现原理

我们需要在 `watch` 内部维护一个 `cleanup` 变量。

```typescript
function watchEffect(effect) {
  let cleanup

  // 这是一个钩子，用户调用它来注册清理逻辑
  const onCleanup = (fn) => {
    cleanup = fn
  }

  const getter = () => {
    // 关键点：在执行用户逻辑前，先清理上一次的
    if (cleanup) {
      cleanup()
    }
    // 执行用户逻辑，把 onCleanup 传进去
    effect(onCleanup)
  }

  const effectFn = new ReactiveEffect(getter, job)
  effectFn.run()
}
```

注意：清理函数的执行时机有两个：
1.  **副作用重新执行前**。
2.  **侦听器被停止时**（`stop` 被调用）。

## 3. 深度监听：Deep Watch

在 `watch` 中，如果你监听一个对象，默认只监听引用的变化。
如果你想监听对象内部属性的变化，需要开启 `deep: true`。

```javascript
watch(state, cb, { deep: true })
```

实现原理非常暴力：**递归读取**。
只要你读取了属性，就会触发 `track`。如果你读取了所有属性，你就监听了整个对象。

```typescript
function watch(source, cb, { deep } = {}) {
  let getter
  if (isReactive(source)) {
    // 如果是 reactive，默认开启深度监听（Vue 3 行为）
    getter = () => traverse(source)
  } else if (deep) {
    // 如果显式开启 deep，包装一下 getter
    const baseGetter = getter
    getter = () => traverse(baseGetter())
  }
  // ...
}
```

`traverse` 函数我们在昨天已经见过了，它会递归访问对象的每一个属性，从而建立起密不透风的依赖网络。

## 4. 统一架构：doWatch

为了代码复用，Vue 3 源码中把 `watch` 和 `watchEffect` 的逻辑合并到了一个 `doWatch` 函数中。

-   `watch` 是 `doWatch` 的一种特殊情况（有明确 source，有 cb）。
-   `watchEffect` 是另一种特殊情况（source 就是 cb，没有独立的 cb）。

通过 `doWatch`，我们统一了：
-   依赖收集逻辑。
-   调度器逻辑（Scheduler）。
-   清理逻辑（Cleanup）。
-   停止逻辑（Stop）。

## 5. 总结

今天我们补全了侦听器家族的最后两块拼图：
1.  **watchEffect**：自动追踪依赖的副作用函数。
2.  **onCleanup**：副作用的清理机制，防止资源泄漏。

至此，我们的响应式系统（Reactivity）已经**完全毕业**了！

我们拥有了：
-   `reactive/ref`：数据响应式。
-   `computed`：计算属性。
-   `watch/watchEffect`：侦听器。
-   `effect`：底层的副作用管理。

这套系统不仅功能完备，而且通过了各种边界情况的考验。
它是 Vue 3 的心脏，源源不断地为上层应用提供动力。

明天，我们将正式告别 `reactivity` 目录，新建 `runtime-core` 目录。
我们将开始构建 Vue 3 的**组件系统**。
第一个任务：实现 `h` 函数和 `vnode`（虚拟节点）。

准备好进入虚拟 DOM 的世界了吗？
