# once 选项：一次性侦听器

once 选项是 Vue 3.4 引入的新特性，让 watch 只触发一次回调后自动停止。本章分析 once 的实现和应用场景。

## 基本用法

```typescript
const count = ref(0)

watch(count, (val) => {
  console.log(val)
}, { once: true })

count.value = 1  // 输出: 1
count.value = 2  // 不输出
count.value = 3  // 不输出
```

once 为 true 时，回调只执行一次，之后 watcher 自动停止。

## 实现原理

once 的实现非常简洁：

```typescript
if (once) {
  const _cb = cb
  cb = (...args) => {
    _cb(...args)
    unwatch()
  }
}
```

将原回调包装一层，执行后调用 unwatch() 停止监听。

## 与 immediate 的组合

```typescript
watch(count, (val) => {
  console.log(val)
}, { once: true, immediate: true })

// 立即输出: 0
// 之后的变化不再触发
```

immediate + once 实现"只执行一次，立即执行"的模式。

## 应用场景

**场景一：等待条件满足**

```typescript
const isReady = ref(false)

watch(isReady, (ready) => {
  if (ready) {
    initializeApp()
  }
}, { once: true })

// 某处设置
isReady.value = true  // 触发一次，之后不再监听
```

**场景二：一次性数据加载**

```typescript
const userId = ref(null)

watch(userId, async (id) => {
  if (id) {
    const user = await fetchUser(id)
    initializeUser(user)
  }
}, { once: true })

// userId 首次设置时加载用户
userId.value = 1
```

**场景三：首次变化检测**

```typescript
const form = reactive({ name: '', email: '' })
let hasChanged = false

watch(
  () => ({ ...form }),
  () => {
    hasChanged = true
  },
  { once: true }
)

// 检测表单是否被修改过
```

## 与手动停止的对比

once 之前需要手动实现：

```typescript
// 手动方式
const stop = watch(count, (val) => {
  console.log(val)
  stop()  // 手动停止
})

// once 方式
watch(count, (val) => {
  console.log(val)
}, { once: true })
```

once 更简洁，也更容易阅读。

## 在 watchEffect 中使用

watchEffect 没有 once 选项，但可以实现类似效果：

```typescript
// 这样不行
watchEffect(() => {
  console.log(count.value)
}, { once: true })  // once 不支持

// 可以这样
const stop = watchEffect(() => {
  console.log(count.value)
  stop()  // 立即停止
})
// 只执行一次
```

## 类型定义

```typescript
export interface WatchOptions<Immediate = boolean> extends WatchOptionsBase {
  immediate?: Immediate
  deep?: boolean
  once?: boolean  // Vue 3.4+
}
```

once 是可选的布尔值。

## 内部实现流程

```typescript
// 1. 原始 cb
const originalCb = (val) => console.log(val)

// 2. once 包装后
const wrappedCb = (...args) => {
  originalCb(...args)  // 执行原回调
  unwatch()            // 停止监听
}

// 3. 触发时
// - 执行 wrappedCb
// - 调用 unwatch，effect.stop()
// - 移除依赖追踪
```

## 多源的 once

```typescript
const a = ref(1)
const b = ref(2)

watch([a, b], ([newA, newB]) => {
  console.log(newA, newB)
}, { once: true })

a.value = 10  // 输出: 10, 2
b.value = 20  // 不输出，已停止
```

任一源变化触发后就停止，后续任何源的变化都不再触发。

## 异步回调中的 once

```typescript
watch(trigger, async () => {
  await someAsyncOperation()
  console.log('done')
}, { once: true })
```

异步回调也只执行一次。unwatch 在回调开始时就调用，不等待异步完成。

## 与清理函数的关系

```typescript
watch(source, (val, oldVal, onCleanup) => {
  const timer = setInterval(() => {}, 1000)
  
  onCleanup(() => {
    clearInterval(timer)  // 会在 unwatch 时调用
  })
}, { once: true })
```

停止时会执行清理函数，确保资源释放。

## 错误处理

```typescript
watch(count, () => {
  throw new Error('test')
}, { once: true })

count.value++
// 错误抛出，但 unwatch 仍然执行
// watcher 已停止
```

即使回调抛出错误，停止逻辑仍会执行。

## 兼容性

once 是 Vue 3.4+ 的特性。在旧版本中需要手动实现：

```typescript
// Vue 3.3 及更早版本
function watchOnce(source, cb, options) {
  const stop = watch(source, (...args) => {
    cb(...args)
    stop()
  }, options)
  return stop
}
```

## 本章小结

once 选项简化了一次性监听的实现，通过包装回调函数在执行后自动调用 unwatch。这对于等待条件、一次性初始化等场景非常有用。

once 与 immediate 组合可以实现"立即执行一次后停止"的模式，是常见的使用场景。
