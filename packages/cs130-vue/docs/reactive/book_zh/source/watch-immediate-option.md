# immediate 选项：立即执行回调

immediate 选项控制 watch 是否在创建时立即执行回调。本章分析 immediate 的实现和使用场景。

## 基本用法

```typescript
const count = ref(0)

// 默认：惰性执行
watch(count, (val) => {
  console.log(val)
})
// 不输出

// immediate: true
watch(count, (val, oldVal) => {
  console.log(val, oldVal)
}, { immediate: true })
// 输出: 0 undefined
```

immediate 为 true 时，watch 创建后立即执行一次回调。

## 实现代码

```typescript
if (cb) {
  if (immediate) {
    job(true)  // 立即执行 job
  } else {
    oldValue = effect.run()  // 只获取初始值
  }
}
```

immediate 为 true 时调用 job(true)，否则只运行 effect 获取初始值存入 oldValue。

## job 的首次执行

```typescript
const job: SchedulerJob = (immediateFirstRun?: boolean) => {
  if (!effect.active || (!effect.dirty && !immediateFirstRun)) {
    return
  }
  // ...
}
```

immediateFirstRun 参数确保首次执行不被 dirty 检查阻断。正常情况下 dirty 可能为 false（effect 刚创建），但 immediate 首次执行需要强制通过。

## oldValue 的处理

```typescript
callWithAsyncErrorHandling(cb, instance, ErrorCodes.WATCH_CALLBACK, [
  newValue,
  oldValue === INITIAL_WATCHER_VALUE
    ? undefined
    : isMultiSource && oldValue[0] === INITIAL_WATCHER_VALUE
      ? []
      : oldValue,
  onCleanup,
])
```

首次执行时 oldValue 是 INITIAL_WATCHER_VALUE 标记，回调接收 undefined 作为旧值：

```typescript
watch(count, (newVal, oldVal) => {
  console.log(oldVal)  // 首次执行: undefined
}, { immediate: true })
```

多源时首次的旧值是空数组。

## INITIAL_WATCHER_VALUE

```typescript
const INITIAL_WATCHER_VALUE = {}
```

这是一个特殊标记对象，表示尚未获取过值。它与 undefined 不同——用户的数据可能本身就是 undefined，需要区分。

```typescript
let oldValue: any = isMultiSource
  ? new Array((source as []).length).fill(INITIAL_WATCHER_VALUE)
  : INITIAL_WATCHER_VALUE
```

初始化时 oldValue 设为这个标记，首次执行后才是实际的旧值。

## 多源的 immediate

```typescript
const a = ref(1)
const b = ref(2)

watch([a, b], ([newA, newB], [oldA, oldB]) => {
  console.log([oldA, oldB])
}, { immediate: true })
// 输出: []  (空数组)
```

多源时首次的旧值是空数组而非 [undefined, undefined]，这样更符合直觉。

## 与 watchEffect 的对比

watchEffect 总是立即执行，相当于内置了 immediate: true：

```typescript
// 这两种写法行为相似
watchEffect(() => {
  console.log(count.value)
})

watch(count, (val) => {
  console.log(val)
}, { immediate: true })
```

区别是 watchEffect 没有旧值，且依赖自动追踪。

## 使用场景

**场景一：初始化数据**

```typescript
const userId = ref(1)
const user = ref(null)

watch(userId, async (id) => {
  user.value = await fetchUser(id)
}, { immediate: true })
// 立即获取 userId 为 1 的用户数据
```

**场景二：同步初始状态**

```typescript
const theme = ref('light')

watch(theme, (val) => {
  document.body.className = val
}, { immediate: true })
// 立即应用初始主题
```

**场景三：初始化校验**

```typescript
const form = reactive({ name: '', email: '' })

watch(() => form.name, (val) => {
  validateName(val)
}, { immediate: true })
// 立即校验初始值
```

## 与 once 的组合

```typescript
watch(source, callback, {
  immediate: true,
  once: true
})
```

这种组合只执行一次回调——立即执行后就停止监听。

## TypeScript 类型

immediate 影响回调的类型推断：

```typescript
// immediate: false（默认）
// oldVal 的类型与 newVal 相同
watch(count, (newVal, oldVal) => {
  // newVal: number
  // oldVal: number
})

// immediate: true
// oldVal 可能是 undefined
watch(count, (newVal, oldVal) => {
  // newVal: number
  // oldVal: number | undefined
}, { immediate: true })
```

类型定义通过泛型参数处理这个差异：

```typescript
export interface WatchOptions<Immediate = boolean> extends WatchOptionsBase {
  immediate?: Immediate
  // ...
}
```

## SSR 中的行为

服务端渲染时，immediate 决定是否在服务端执行回调：

```typescript
if (__SSR__ && isInSSRComponentSetup) {
  // ...
  if (immediate) {
    callWithAsyncErrorHandling(cb, instance, ErrorCodes.WATCH_CALLBACK, [
      getter(),
      isMultiSource ? [] : undefined,
      onCleanup,
    ])
  }
  // ...
}
```

设置 immediate 时回调在服务端执行一次，否则只在客户端执行。

## 性能考虑

immediate 会增加初始化时的执行：

```typescript
// 多个 immediate watch
watch(a, handler1, { immediate: true })
watch(b, handler2, { immediate: true })
watch(c, handler3, { immediate: true })
// 初始化时执行 3 次回调
```

如果回调较重，可能影响初始渲染性能。考虑是否真的需要 immediate，或者能否合并多个 watch。

## 与 scheduler 的交互

immediate 执行时绕过了 scheduler：

```typescript
if (immediate) {
  job(true)  // 直接调用，不经过 scheduler
} else {
  oldValue = effect.run()
}
```

这意味着 flush 选项不影响 immediate 的执行时机——它总是同步立即执行。

```typescript
watch(count, callback, {
  immediate: true,
  flush: 'post'  // 不影响首次执行
})
// 首次同步执行，后续变化才按 post 调度
```

## 本章小结

immediate 选项让 watch 在创建时立即执行回调，首次执行时旧值为 undefined（单源）或空数组（多源）。这对于需要初始化逻辑的场景很有用。

理解 immediate 与 INITIAL_WATCHER_VALUE 的关系，以及与其他选项（once、flush）的交互，有助于正确使用这个功能。
