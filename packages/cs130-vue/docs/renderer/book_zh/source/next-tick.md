# nextTick 实现

nextTick 是 Vue 提供的工具函数，用于在下一次 DOM 更新后执行回调。它与调度系统紧密集成，利用同一个微任务机制，确保回调在正确的时机执行。

## API 使用

nextTick 有两种使用方式：

```typescript
import { nextTick } from 'vue'

// 方式一：传入回调
nextTick(() => {
  // 在 DOM 更新后执行
  console.log(element.textContent)
})

// 方式二：await Promise
await nextTick()
// DOM 已更新
console.log(element.textContent)
```

两种方式效果相同，第二种更适合 async/await 风格的代码。

## 实现原理

nextTick 的实现非常简洁：

```typescript
const resolvedPromise = Promise.resolve() as Promise<any>
let currentFlushPromise: Promise<void> | null = null

export function nextTick<T = void>(
  this: T,
  fn?: (this: T) => void
): Promise<void> {
  const p = currentFlushPromise || resolvedPromise
  return fn ? p.then(this ? fn.bind(this) : fn) : p
}
```

核心逻辑是利用 currentFlushPromise——如果当前正在刷新或已调度刷新，返回刷新完成后 resolve 的 Promise；否则使用 resolvedPromise 立即进入微任务队列。

## currentFlushPromise 的来源

currentFlushPromise 在 queueFlush 中设置：

```typescript
function queueFlush() {
  if (!isFlushing && !isFlushPending) {
    isFlushPending = true
    currentFlushPromise = resolvedPromise.then(flushJobs)
  }
}
```

当有任务入队时，如果还没有调度刷新，会创建一个新的 Promise 链。这个 Promise 在 flushJobs 执行完成后 resolve。

在 flushJobs 完成后清理：

```typescript
function flushJobs(seen?) {
  // ...
  finally {
    // ...
    isFlushing = false
    currentFlushPromise = null
    // ...
  }
}
```

## 执行时机

nextTick 的回调何时执行取决于调用时机：

```typescript
// 场景一：有待执行的更新
count.value++  // 入队更新任务
nextTick(() => {
  // 在 flushJobs 完成后执行
})

// 场景二：无待执行的更新
nextTick(() => {
  // 在下一个微任务中执行（几乎立即）
})
```

场景一中，nextTick 返回的 Promise 就是 currentFlushPromise，它在所有更新完成后 resolve。场景二中，currentFlushPromise 为 null，使用 resolvedPromise，回调会在下一个微任务中执行。

## 为什么有效

这个设计之所以有效，是因为 Vue 的更新机制本身就基于微任务：

```typescript
// 简化的流程
state.value = newValue
// → 触发响应式
// → queueJob(updateJob)
// → queueFlush()
// → currentFlushPromise = resolvedPromise.then(flushJobs)

nextTick(() => { /* callback */ })
// → 返回 currentFlushPromise.then(callback)
// → callback 在 flushJobs 完成后执行
```

由于 Promise 的链式调用特性，then 注册的回调会在前一个 Promise resolve 后执行。flushJobs 作为 resolvedPromise.then() 的回调先执行，nextTick 的回调在其后。

## this 绑定

nextTick 支持 this 绑定：

```typescript
export function nextTick<T = void>(
  this: T,
  fn?: (this: T) => void
): Promise<void> {
  const p = currentFlushPromise || resolvedPromise
  return fn ? p.then(this ? fn.bind(this) : fn) : p
}
```

在选项式 API 中，通过 `this.$nextTick` 调用时，this 会被保留：

```typescript
export default {
  methods: {
    update() {
      this.count++
      this.$nextTick(function() {
        // this 仍然指向组件实例
        console.log(this.count)
      })
    }
  }
}
```

注意使用箭头函数时 this 绑定不生效，这是 JavaScript 的语言特性。

## 返回值处理

nextTick 返回 Promise：

```typescript
return fn ? p.then(this ? fn.bind(this) : fn) : p
```

如果传入了回调，返回的 Promise 会在回调执行完后 resolve（如果回调返回 Promise，会等待它）。如果没传回调，直接返回 p，用于 await 场景。

## 多次调用

多次调用 nextTick 会创建多个 then 回调，它们按顺序执行：

```typescript
nextTick(() => console.log('first'))
nextTick(() => console.log('second'))
nextTick(() => console.log('third'))
// 输出顺序：first, second, third
```

每次调用都是 `p.then(callback)`，Promise 规范保证 then 回调按注册顺序执行。

## 与 setTimeout 的区别

nextTick 使用微任务，setTimeout 使用宏任务：

```typescript
state.value = newValue
setTimeout(() => {
  // 下一个宏任务，DOM 已更新
}, 0)
nextTick(() => {
  // 当前宏任务的微任务阶段，DOM 已更新
})
```

两者都能访问更新后的 DOM，但 nextTick 更快（同一事件循环内），且与 Vue 的更新机制对齐。使用 setTimeout 可能在回调之前又发生了其他更新。

## 实际应用场景

nextTick 常用于以下场景：

```typescript
// 1. 获取更新后的 DOM 尺寸
const resize = () => {
  width.value = 800
  nextTick(() => {
    console.log(el.value.offsetWidth) // 800
  })
}

// 2. 在更新后聚焦元素
const add = () => {
  list.value.push(newItem)
  nextTick(() => {
    lastInput.value.focus()
  })
}

// 3. 与第三方库同步
const update = async () => {
  data.value = newData
  await nextTick()
  chart.update() // 第三方图表库
}

// 4. 测试中等待 DOM 更新
test('updates DOM', async () => {
  wrapper.setData({ count: 1 })
  await nextTick()
  expect(wrapper.text()).toBe('1')
})
```

## 边界情况

当 flushJobs 正在执行时调用 nextTick：

```typescript
function flushJobs() {
  isFlushing = true
  // 假设这里触发了某个回调中的 nextTick
  // currentFlushPromise 仍然存在
  // nextTick 会等待当前刷新完成
}
```

由于 currentFlushPromise 在 finally 中才清理，执行期间调用的 nextTick 仍然能正确等待当前刷新周期完成。

## 无更新时的行为

如果没有待处理的更新：

```typescript
// 假设没有响应式变化
nextTick(() => {
  // currentFlushPromise 为 null
  // 使用 resolvedPromise
  // 回调在下一个微任务中执行
})
```

这时 nextTick 的行为类似于 `Promise.resolve().then(callback)`，回调几乎立即执行（在同步代码之后）。

## 小结

nextTick 利用 currentFlushPromise 与 Vue 的调度系统集成。当有更新任务时，它等待更新完成；没有更新时，在下一个微任务中执行。这个简洁的实现让开发者能够可靠地在 DOM 更新后执行逻辑，无论是通过回调还是 await 的方式。
