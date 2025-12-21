# SchedulerJobFlags：任务状态标记

上一章我们了解了 `nextTick` 如何让用户代码等待 DOM 更新。现在来看调度器的最后一个关键设计：**如何高效地管理任务状态？**

调度器需要知道每个任务的状态：是否已入队？是否是 Pre 类型？是否允许递归？是否已销毁？

Vue 3 用**位标记（bit flags）**来管理这些状态。这是一个经典的底层优化技巧，在很多高性能库中都能看到。

## 传统方式的问题

**先思考一下，如果不用位标记，怎么实现？**

最直观的方式是用多个布尔属性：

```javascript
job.queued = true
job.isPre = true
job.allowRecurse = false
job.disposed = false
```

或者用数组检查是否入队：

```javascript
if (queue.includes(job)) {
  return  // 已经在队列中
}
```

问题：

1. **对象属性**：每个任务需要多个属性，内存开销大
2. **数组检查**：`includes()` 是 O(n) 复杂度，队列大时性能差

## 位标记方案

**这是一个经典的底层优化技巧**。Vue 3 定义了一组标记位：

```javascript
const SchedulerJobFlags = {
  QUEUED: 1,         // 0001 - 已入队
  PRE: 2,            // 0010 - Pre 类型
  ALLOW_RECURSE: 4,  // 0100 - 允许递归
  DISPOSED: 8        // 1000 - 已销毁
}
```

用一个数字就能表示所有状态：

```javascript
job.flags = SchedulerJobFlags.PRE | SchedulerJobFlags.ALLOW_RECURSE
// flags = 0010 | 0100 = 0110 = 6
```

## 位运算操作

### 添加标记

```javascript
job.flags |= SchedulerJobFlags.QUEUED
// 假设 flags = 0110，添加 QUEUED 后
// 0110 | 0001 = 0111
```

### 检查标记

```javascript
if (job.flags & SchedulerJobFlags.QUEUED) {
  // 已入队
}
// 0111 & 0001 = 0001 (truthy)
```

### 移除标记

```javascript
job.flags &= ~SchedulerJobFlags.QUEUED
// 0111 & ~0001 = 0111 & 1110 = 0110
```

### 切换标记

```javascript
job.flags ^= SchedulerJobFlags.QUEUED
// 异或：有则去掉，没有则添加
```

## 在调度器中的应用

### queueJob 入队检查

```javascript
function queueJob(job) {
  // 用位标记代替 includes() 检查
  if (!(job.flags & SchedulerJobFlags.QUEUED)) {
    if (job.id == null) {
      queue.push(job)
    } else {
      queue.splice(findInsertionIndex(job.id), 0, job)
    }
    job.flags |= SchedulerJobFlags.QUEUED  // 标记已入队
  }
  queueFlush()
}
```

### flushJobs 执行后清除

```javascript
function flushJobs(seen) {
  isFlushing = true
  
  queue.sort(comparator)
  
  try {
    for (let i = 0; i < queue.length; i++) {
      const job = queue[i]
      
      // 跳过已销毁的任务
      if (job.flags & SchedulerJobFlags.DISPOSED) {
        continue
      }
      
      job()
      job.flags &= ~SchedulerJobFlags.QUEUED  // 清除入队标记
    }
  } finally {
    queue.length = 0
    isFlushing = false
  }
}
```

### Pre 类型判断

```javascript
function flushPreFlushCbs(i) {
  for (; i < queue.length; i++) {
    const job = queue[i]
    if (job.flags & SchedulerJobFlags.PRE) {
      queue.splice(i, 1)
      i--
      job()
    }
  }
}
```

### 递归控制

```javascript
function queueJob(job) {
  // 在 flushing 期间入队同一个 job
  if (isFlushing && job.flags & SchedulerJobFlags.QUEUED) {
    // 只有 ALLOW_RECURSE 的任务允许重复入队
    if (!(job.flags & SchedulerJobFlags.ALLOW_RECURSE)) {
      return
    }
  }
  // ...
}
```

## effect 中的应用

创建 effect 时设置标记：

```javascript
function effect(fn, options) {
  const _effect = new ReactiveEffect(fn)
  
  if (options) {
    // 设置调度器
    _effect.scheduler = options.scheduler
    
    // 设置标记
    if (options.allowRecurse) {
      _effect.flags |= SchedulerJobFlags.ALLOW_RECURSE
    }
  }
  
  return _effect
}
```

组件更新任务：

```javascript
const update = () => {
  if (instance.isMounted) {
    // 更新逻辑
  } else {
    // 挂载逻辑
  }
}

// 设置为 Pre 类型
update.flags = SchedulerJobFlags.PRE | SchedulerJobFlags.ALLOW_RECURSE

// 设置 id（组件 uid）
update.id = instance.uid
```

## 为什么用位运算

**这不是炖的，有实实在在的收益！**

### 性能对比

```javascript
// includes() - O(n)
if (queue.includes(job)) { ... }

// 位运算 - O(1)
if (job.flags & SchedulerJobFlags.QUEUED) { ... }
```

队列有 1000 个任务时，`includes()` 最坏需要检查 1000 次，位运算只需要一次位与操作。

### 内存对比

```javascript
// 多个属性
job.queued = true
job.isPre = true
job.allowRecurse = false
job.disposed = false
// 每个布尔值占用内存

// 位标记
job.flags = 6  // 一个数字存储所有状态
```

### 组合灵活

```javascript
// 一次性设置多个标记
job.flags = SchedulerJobFlags.PRE | SchedulerJobFlags.ALLOW_RECURSE

// 一次性检查多个标记
const isPreAndRecursable = 
  (job.flags & (SchedulerJobFlags.PRE | SchedulerJobFlags.ALLOW_RECURSE)) ===
  (SchedulerJobFlags.PRE | SchedulerJobFlags.ALLOW_RECURSE)
```

## DISPOSED 的作用

任务可能在执行前被取消：

```javascript
function createWatchEffect() {
  const job = () => {
    // 执行 watch 回调
  }
  
  // 停止函数
  const stop = () => {
    job.flags |= SchedulerJobFlags.DISPOSED
  }
  
  return { job, stop }
}

// 组件卸载时停止所有 effect
onUnmounted(() => {
  watchEffect1.stop()
  watchEffect2.stop()
})
```

在 `flushJobs` 中检查：

```javascript
if (job.flags & SchedulerJobFlags.DISPOSED) {
  continue  // 跳过已销毁的任务
}
```

## 完整的标记定义

```javascript
const SchedulerJobFlags = {
  /**
   * 任务已入队。
   * 用于避免重复入队同一个任务。
   */
  QUEUED: 1 << 0,  // 1

  /**
   * Pre 类型任务。
   * 在组件更新前执行。
   */
  PRE: 1 << 1,  // 2

  /**
   * 允许递归。
   * 任务在执行过程中可以再次入队自己。
   */
  ALLOW_RECURSE: 1 << 2,  // 4

  /**
   * 任务已销毁。
   * 跳过执行。
   */
  DISPOSED: 1 << 3  // 8
}
```

用 `1 << n` 写法更清晰：

- `1 << 0` = 1 = 0001
- `1 << 1` = 2 = 0010
- `1 << 2` = 4 = 0100
- `1 << 3` = 8 = 1000

## 本章小结

`SchedulerJobFlags` 用位标记管理任务状态：

- **QUEUED**：防止重复入队，O(1) 替代 O(n) 的 includes
- **PRE**：标识 Pre 类型任务
- **ALLOW_RECURSE**：控制是否允许递归调度
- **DISPOSED**：标记已销毁任务

位运算的优势：

- **性能高**：O(1) 复杂度的状态检查
- **内存省**：一个数字存储多个状态
- **组合灵活**：可以一次操作多个标记

**调度器系统到这里就完成了！** 回顾一下我们学了什么：

1. **overview**：为什么需要异步更新，三个队列的作用
2. **queueJob**：任务去重、排序、递归保护
3. **flush-cbs**：Pre/Post 队列的实现细节
4. **nextTick**：用户代码如何等待更新
5. **job-flags**：位标记优化状态管理

> **注意**：Vue 持续演进中，后续版本可能会增加新的标记位。例如 Vue 3.5 为支持 Suspense 异步边界引入了新的内部状态。建议参考当前 Vue 版本的源码确认最新的标记定义。

下一部分我们进入响应式系统的进阶内容。

---

## 实际应用场景

**场景 1：组件卸载后阻止更新**

组件卸载后，异步数据返回可能仍会触发更新。Vue 用 DISPOSED 标记优雅解决：

```javascript
// 组件卸载时，Vue 内部会这样处理：
function unmountComponent(instance) {
  // 标记任务已销毁
  instance.update.flags |= SchedulerJobFlags.DISPOSED
  
  // 即使异步操作稍后触发更新，也会被跳过
  // flushJobs 中：
  // if (job.flags & DISPOSED) continue
}

// 实际场景：组件内的异步请求
onMounted(async () => {
  const data = await fetchData()  // 请求耗时 2 秒
  // 如果用户在 1 秒时离开页面，组件已卸载
  // DISPOSED 标记确保 2 秒后数据返回时不会触发更新
  list.value = data
})
```

**场景 2：watch vs watchEffect 的递归行为差异**

```javascript
const count = ref(0)

// watch：默认不允许递归，因为可能导致无限循环
watch(count, (val) => {
  if (val < 10) count.value++  // 只会执行一次，不会递归
})
// 底层：job.flags 没有 ALLOW_RECURSE

// watchEffect：默认允许递归
watchEffect(() => {
  console.log(count.value)
  // 如果这里修改了其他响应式数据，会正常触发重新执行
})
// 底层：job.flags |= ALLOW_RECURSE

// 实际验证
count.value = 1
// watch 回调执行一次：count 变成 2
// 下一轮微任务：watch 再次执行（因为 count 变了）
// 但不会立即递归，而是等当前队列执行完毕后重新调度
```

**场景 3：PRE 标记决定执行时机**

```javascript
// flush: 'pre' 的 watch（默认）
watch(count, () => {
  // 在 DOM 更新前执行
  // 可以在这里修改其他数据，改动会合并到本次渲染
  derived.value = count.value * 2
})
// 底层：job.flags |= PRE

// flush: 'post' 的 watch
watch(count, () => {
  // 在 DOM 更新后执行
  console.log(el.value.textContent)  // 能读到最新 DOM
}, { flush: 'post' })
// 底层：job.flags 没有 PRE 标记
```

**场景 3：性能对比**

```javascript
// 假设有 10000 个任务需要去重检查

// 方式 1：数组 includes
if (!queue.includes(job)) {  // O(10000) 每次
  queue.push(job)
}
// 总时间复杂度：O(n²)

// 方式 2：位标记
if (!(job.flags & QUEUED)) {  // O(1) 每次
  job.flags |= QUEUED
  queue.push(job)
}
// 总时间复杂度：O(n)
```

---

## 踩坑经验

**1. 忘记清除标记导致任务不再执行**

```javascript
// ❌ 错误：任务执行后没清除 QUEUED
function flushJobs() {
  for (const job of queue) {
    job()  // QUEUED 标记还在！
  }
}
// 结果：下次 queueJob 会认为已入队，跳过添加

// ✅ 正确：执行后清除标记
function flushJobs() {
  for (const job of queue) {
    job()
    job.flags &= ~SchedulerJobFlags.QUEUED  // 清除
  }
}
```

**2. 位运算优先级陷阱**

```javascript
// ❌ 错误：& 优先级低于 ===
if (job.flags & QUEUED === QUEUED) {  // 总是 true！
  // ...
}

// ✅ 正确：加括号
if ((job.flags & QUEUED) === QUEUED) {
  // ...
}

// 或者直接利用 truthy
if (job.flags & QUEUED) {
  // ...
}
```

---

## 源码参考

本章涉及的 Vue 3 源码位置：

| 概念 | 源码位置 |
|------|----------|
| SchedulerJobFlags | `packages/runtime-core/src/scheduler.ts` L10 |
| 位标记使用 | `packages/runtime-core/src/scheduler.ts` L68 (queueJob) |
| DISPOSED 检查 | `packages/runtime-core/src/scheduler.ts` L252 (flushJobs) |

---

## 练习与思考

1. **代码练习**：写一个函数，检查任务是否同时具有 PRE 和 ALLOW_RECURSE 标记。

   ```javascript
   function isPreAndRecursable(job) {
     // 你的实现
   }
   ```

2. **实践题**：如何用位运算实现"保留 QUEUED 和 DISPOSED，清除其他所有标记"？

   提示：`job.flags &= (QUEUED | DISPOSED)`

3. **设计思考**：如果需要添加新的标记 `SYNC`（同步执行），应该定义为什么值？为什么？

   提示：必须是 2 的幂次，且不能与现有标记冲突。
