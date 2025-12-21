# nextTick：等待 DOM 更新完成

上一章我们了解了 Pre/主/Post 三个队列的执行顺序。**现在有个问题：用户代码如何等待这些队列执行完毕？**

这就是 `nextTick` 的作用。先来看一个**非常常见的困惑**：修改数据后立即读取 DOM，为什么拿到的是旧值？

```javascript
count.value = 1
console.log(el.value.textContent)  // 还是 0！为什么？
```

这是因为 Vue 是**异步更新 DOM** 的。`count.value = 1` 只是把更新任务加入队列，实际的 DOM 更新在微任务中执行。

`nextTick` 就是用来等待 DOM 更新完成的。

## 基本用法

```javascript
import { nextTick } from 'vue'

async function onClick() {
  count.value = 1
  
  // 方式1：回调形式
  nextTick(() => {
    console.log(el.value.textContent)  // 1
  })
  
  // 方式2：await 形式
  await nextTick()
  console.log(el.value.textContent)  // 1
}
```

## 实现原理

Vue 3 的 `nextTick` 实现非常简洁：

```javascript
const resolvedPromise = Promise.resolve()
let currentFlushPromise = null

function nextTick(fn) {
  const p = currentFlushPromise || resolvedPromise
  return fn ? p.then(fn) : p
}
```

关键是 `currentFlushPromise`。它在 `queueFlush` 中设置：

```javascript
function queueFlush() {
  if (!isFlushing && !isFlushPending) {
    isFlushPending = true
    currentFlushPromise = resolvedPromise.then(flushJobs)
  }
}
```

当你修改响应式数据时：

1. 触发 `trigger`
2. 执行 `scheduler`（通常是 `queueJob`）
3. `queueJob` 调用 `queueFlush`
4. `queueFlush` 创建 `currentFlushPromise = Promise.resolve().then(flushJobs)`

此时如果调用 `nextTick(fn)`：

```javascript
const p = currentFlushPromise  // 就是 flushJobs 的 Promise
return p.then(fn)              // fn 在 flushJobs 之后执行
```

## 执行顺序分析

```javascript
count.value = 1           // 创建 currentFlushPromise

nextTick(() => {          // 注册在 currentFlushPromise.then
  console.log('A')
})

nextTick(() => {          // 继续注册在 currentFlushPromise.then
  console.log('B')
})

// 同步代码执行完毕
// 微任务开始执行：
// 1. flushJobs()  - 更新 DOM
// 2. nextTick 回调 A
// 3. nextTick 回调 B
```

## 为什么不直接用 Promise.resolve().then？

**这是一个很多人会犯的错误**：

```javascript
count.value = 1

// 这样可能有问题！
Promise.resolve().then(() => {
  console.log(el.value.textContent)
})
```

问题在于微任务的执行顺序取决于添加顺序。假设：

1. 你的代码先执行 `Promise.resolve().then(yourCallback)`
2. 然后 Vue 执行 `Promise.resolve().then(flushJobs)`

那么 `yourCallback` 会在 `flushJobs` 之前执行，此时 DOM 还没更新！

`nextTick` 确保回调在 `currentFlushPromise`（也就是 `flushJobs`）之后执行。

## 完整实现

```javascript
const resolvedPromise = Promise.resolve()
let currentFlushPromise = null

function nextTick(fn) {
  const p = currentFlushPromise || resolvedPromise
  return fn
    ? p.then(fn).catch(err => {
        // 错误处理
        console.error(err)
      })
    : p
}

// 在 queueFlush 中
function queueFlush() {
  if (!isFlushing && !isFlushPending) {
    isFlushPending = true
    currentFlushPromise = resolvedPromise.then(flushJobs)
  }
}

// 在 flushJobs 结束时
function flushJobs(seen) {
  // ... 执行队列
  
  isFlushing = false
  currentFlushPromise = null  // 清空
  
  // 如果还有任务，继续刷新
  if (queue.length || pendingPreFlushCbs.length || pendingPostFlushCbs.length) {
    flushJobs(seen)
  }
}
```

## 多次调用 nextTick

```javascript
count.value = 1

await nextTick()
console.log('first')  // DOM 已更新

count.value = 2       // 新的更新

await nextTick()
console.log('second') // 新的 DOM 已更新
```

第一次 `await nextTick()` 后，`currentFlushPromise` 被清空。第二次修改数据会创建新的 `currentFlushPromise`，第二次 `nextTick` 等待这个新的 Promise。

## 常见使用场景

### 访问更新后的 DOM

```javascript
const height = ref(0)

async function updateHeight() {
  showContent.value = true
  
  await nextTick()
  
  // DOM 已更新，可以读取正确的高度
  height.value = contentEl.value.offsetHeight
}
```

### 操作第三方库

```javascript
onMounted(async () => {
  // mounted 时 DOM 已存在
  // 但如果有异步渲染的子组件，可能需要等待
  await nextTick()
  
  // 初始化第三方库
  initChart(chartEl.value)
})
```

### 聚焦输入框

```javascript
async function showModal() {
  isVisible.value = true
  
  await nextTick()
  
  // 弹窗已渲染，可以聚焦
  inputEl.value.focus()
}
```

## 本章小结

`nextTick` 的作用是等待 DOM 更新完成：

- **原理**：利用 `currentFlushPromise`，确保回调在 `flushJobs` 之后执行
- **实现**：非常简洁，核心就是 `Promise.then`
- **使用**：支持回调形式和 `await` 形式

下一章我们看看任务状态标记的实现。

---

## 拓展阅读：Vue 2 的 nextTick 实现

Vue 2 的 `nextTick` 实现更复杂，因为需要兼容老浏览器。它采用**降级策略**：

```javascript
// 优先级从高到低：
// 1. Promise（微任务）
// 2. MutationObserver（微任务）
// 3. setImmediate（IE/Node.js 宏任务）
// 4. setTimeout（宏任务）

if (typeof Promise !== 'undefined') {
  timerFunc = () => Promise.resolve().then(flushCallbacks)
} else if (typeof MutationObserver !== 'undefined') {
  // 利用 MutationObserver 触发微任务
  const observer = new MutationObserver(flushCallbacks)
  const textNode = document.createTextNode('1')
  observer.observe(textNode, { characterData: true })
  timerFunc = () => { textNode.data = String(++counter % 2) }
} else if (typeof setImmediate !== 'undefined') {
  timerFunc = () => setImmediate(flushCallbacks)
} else {
  timerFunc = () => setTimeout(flushCallbacks, 0)
}
```

Vue 3 放弃了对老旧浏览器的支持，直接使用 Promise，代码简洁了很多。

---

## 源码参考

本章涉及的 Vue 3 源码位置：

- `nextTick`：`packages/runtime-core/src/scheduler.ts`
- `currentFlushPromise`：`packages/runtime-core/src/scheduler.ts`
- `queueFlush`：`packages/runtime-core/src/scheduler.ts`

---

## 练习与思考

1. 如果没有修改任何响应式数据，直接调用 `nextTick(fn)`，fn 会在什么时候执行？

   > 提示：此时 `currentFlushPromise` 是 `null`，`nextTick` 会使用 `resolvedPromise`。

2. 以下代码的输出顺序是什么？

```javascript
console.log('1')

Promise.resolve().then(() => console.log('2'))

count.value++
nextTick(() => console.log('3'))

Promise.resolve().then(() => console.log('4'))

console.log('5')
```

   > **答案**：`1 → 5 → 2 → flushJobs(DOM更新) → 4 → 3`
   >
   > **解析**：
   > - `'1'` 和 `'5'` 是同步代码，最先输出
   > - `Promise.resolve().then(() => '2')` 创建微任务 A
   > - `count.value++` 触发 `queueFlush()`，创建 `currentFlushPromise = Promise.resolve().then(flushJobs)`（微任务 B）
   > - `nextTick()` 返回 `currentFlushPromise.then(() => '3')`——注意这是**链式调用**，需要等 B 执行完才会将 `'3'` 的回调加入微任务队列
   > - `Promise.resolve().then(() => '4')` 创建微任务 D
   > 
   > **微任务执行顺序**：
   > 1. 执行微任务 A → 输出 `2`
   > 2. 执行微任务 B → `flushJobs` 执行，DOM 更新，**同时将 `'3'` 的回调加入队列末尾**
   > 3. 执行微任务 D → 输出 `4`（D 先于 C 被添加到队列）
   > 4. 执行 C（B.then 产生的回调）→ 输出 `3`
   >
   > **关键点**：`.then()` 产生的微任务在上一个 Promise resolve 后才会入队，而不是在 `.then()` 调用时入队。

3. 思考：`nextTick` 和 `requestAnimationFrame` 有什么区别？什么时候应该用 `requestAnimationFrame`？

   > 提示：`nextTick` 在微任务中执行（渲染前），`requestAnimationFrame` 在浏览器下一次重绘前执行。动画相关的 DOM 操作通常用 `requestAnimationFrame`。
