# Day 10: cleanup 机制与边界处理

你好，我是你的技术导师。

在之前的课程中，我们已经构建了一个能跑的响应式系统。
但是，它还有一个致命的缺陷：**它只管收集，不管清理。**

这就像一个只进不出的仓库，随着时间的推移，里面堆满了过期的垃圾，最终会导致内存泄漏，甚至逻辑错误。

今天，我们就来解决这个问题，给我们的系统装上一个自动垃圾回收机制 —— **Cleanup**。

## 1. 为什么要清理？（分支切换问题）

让我们看一个经典的场景：

```javascript
const state = reactive({ 
  ok: true, 
  text: 'hello' 
})

effect(() => {
  console.log('render:', state.ok ? state.text : 'nothing')
})
```

1.  **初始状态**：`ok` 为 `true`。`effect` 读取了 `ok` 和 `text`。
    - `ok` 的 dep: `[effect]`
    - `text` 的 dep: `[effect]`

2.  **修改状态**：把 `ok` 改为 `false`。
    - `effect` 重新执行。
    - 这次只读取了 `ok`。因为 `ok` 是 `false`，三元表达式直接返回 `'nothing'`，**没有读取 `text`**。

3.  **问题出现**：
    - 此时，`effect` 理论上只依赖 `ok`。
    - 但是，`text` 的 dep 里**依然保留着**这个 `effect`！

4.  **后果**：
    - 如果我修改 `state.text`，`effect` 依然会被触发！
    - 哪怕 `effect` 的执行结果跟 `text` 毫无关系了，它依然会被无意义地执行。

这就是**分支切换（Branch Switching）**导致的问题。如果不清理旧的依赖，系统会越来越慢，Bug 越来越多。

## 2. 怎么清理？（每次执行前清空）

解决思路非常简单粗暴：
**每次 `effect` 重新执行之前，把自己从所有依赖列表中删除。**

就像你搬家了，要把旧地址的快递单全部撕掉，到了新家再重新填新的地址。

这就用到了我们在 Day 8 埋下的伏笔：**双向记录**。

```typescript
class ReactiveEffect {
  deps = [] // 记录自己被哪些 dep 收集了
  
  run() {
    // 1. 清理旧依赖
    cleanupEffect(this)
    
    // 2. 开启收集模式
    activeEffect = this
    
    // 3. 执行函数（重新收集新依赖）
    return this.fn()
  }
}
```

`cleanupEffect` 的实现也很简单：

```typescript
function cleanupEffect(effect) {
  const { deps } = effect
  if (deps.length) {
    for (let i = 0; i < deps.length; i++) {
      // 从 dep (Set) 中删除自己
      deps[i].delete(effect)
    }
    // 清空自己的记录
    deps.length = 0
  }
}
```

这样，每次 `effect` 执行，都是一次全新的开始。它只收集当前真正需要的依赖，绝不多拿一个。

## 3. 停止监听：stop 与 onStop

除了自动清理，有时候我们也需要手动停止一个 `effect`。
比如在 Vue 组件卸载时，我们需要停止组件内部的所有 `effect`。

我们实现一个 `stop` 方法：

```typescript
class ReactiveEffect {
  active = true // 标记是否激活
  onStop?: () => void // 停止时的回调

  stop() {
    if (this.active) {
      // 1. 清理依赖
      cleanupEffect(this)
      
      // 2. 触发回调
      if (this.onStop) {
        this.onStop()
      }
      
      // 3. 标记为非激活
      this.active = false
    }
  }
}
```

为了方便用户使用，我们导出一个 `stop` 函数：

```typescript
export function stop(runner) {
  runner.effect.stop()
}
```

## 4. 边界陷阱：Set 的死循环

引入 `cleanup` 后，我们在 `trigger` 中会遇到一个棘手的问题。

```typescript
// trigger 的逻辑
const dep = depsMap.get(key)
dep.forEach(effect => {
  effect.run()
})
```

`effect.run()` 会做什么？
1.  调用 `cleanup` -> 从 `dep` 中删除自己。
2.  执行 `fn` -> 读取属性 -> 再次把这里添加到 `dep` 中。

这就好比你在遍历一个 Set，遍历过程中你删除了一个元素，然后又加回去了。
在 JavaScript 中，这会导致**无限循环**！

```javascript
const set = new Set([1])
set.forEach(item => {
  set.delete(1)
  set.add(1)
  console.log('loop') // 会一直打印！
})
```

**解决方案**：
在遍历之前，创建一个**副本**。

```typescript
// trigger
const dep = depsMap.get(key)
const effectsToRun = new Set(dep) // 创建副本！

effectsToRun.forEach(effect => {
  // ...
})
```

这样，我们在 `dep` 上做删除和添加，不会影响正在遍历的 `effectsToRun`。

## 5. 总结

今天，我们给响应式系统加上了至关重要的**清理机制**。

1.  **分支切换**：通过 `cleanupEffect`，解决了条件渲染导致的依赖残留问题。
2.  **手动停止**：通过 `stop` 和 `onStop`，让用户可以手动控制 `effect` 的生命周期。
3.  **Set 陷阱**：通过创建副本遍历，避免了 Set 边删边加导致的死循环。

至此，我们的 `ReactiveEffect` 已经非常健壮了。它不仅能自动收集、自动触发，还能自动清理、手动停止。

这为我们实现 Vue 3 的核心功能 —— **组件更新**，打下了坚实的基础。

明天，我们将利用这个强大的 `ReactiveEffect`，去实现那个让无数面试者头疼的 API —— **computed**。

相信我，有了现在的铺垫，实现 `computed` 只需要不到 30 行代码。

明天见！
