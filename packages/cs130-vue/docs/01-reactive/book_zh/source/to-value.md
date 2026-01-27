# toValue：统一的值获取方式

Vue 3.3 引入了 toValue 函数，它是 unref 的增强版本，能够统一处理多种值源类型。toValue 简化了 composable 的编写，让 API 设计更加灵活。

## 为什么需要 toValue

在编写 composable 时，我们常常希望参数既可以是普通值、也可以是 ref、还可以是 getter 函数。这给调用者最大的灵活性：

```typescript
// 用户可能这样调用
useFeature(100)              // 普通值
useFeature(ref(100))         // ref
useFeature(() => state.count) // getter
```

在 toValue 出现之前，需要手动处理这些情况：

```typescript
function getValue<T>(source: MaybeRefOrGetter<T>): T {
  if (isRef(source)) {
    return source.value
  }
  if (typeof source === 'function') {
    return source()
  }
  return source
}
```

toValue 将这个模式标准化了。

## toValue 的实现

```typescript
export function toValue<T>(source: MaybeRefOrGetter<T> | ComputedRef<T>): T {
  return isFunction(source) ? source() : unref(source)
}
```

实现非常简洁：如果是函数，调用它；否则用 unref 处理（unref 会处理 ref 和普通值）。

这里有个微妙之处：isFunction 检查在前，意味着如果传入的是函数类型的 ref（虽然罕见），会被当作 getter 调用而不是解包。

## MaybeRefOrGetter 类型

toValue 使用的类型定义：

```typescript
export type MaybeRefOrGetter<T = any> = MaybeRef<T> | (() => T)
```

这个类型表示值可能是：
- T 本身（普通值）
- Ref\<T\>（ref）
- () => T（getter 函数）

ComputedRef 也包含在内，因为它也是 Ref 的子类型。

## 使用场景

编写灵活的 composable：

```typescript
export function useInterval(
  callback: () => void,
  delay: MaybeRefOrGetter<number>
) {
  const intervalId = ref<number | null>(null)

  function start() {
    stop()
    intervalId.value = setInterval(callback, toValue(delay))
  }

  function stop() {
    if (intervalId.value !== null) {
      clearInterval(intervalId.value)
      intervalId.value = null
    }
  }

  // 如果 delay 是响应式的，监听变化
  watchEffect(() => {
    if (toValue(delay) > 0) {
      start()
    } else {
      stop()
    }
  })

  return { start, stop }
}

// 多种调用方式
useInterval(fn, 1000)              // 固定间隔
useInterval(fn, ref(1000))         // 可变间隔
useInterval(fn, () => config.delay) // 动态计算
```

在 computed 或 watch 中获取动态值：

```typescript
const config = reactive({ multiplier: 2 })

// 可以传入各种类型
function useMultiplied(
  base: MaybeRefOrGetter<number>,
  multiplier: MaybeRefOrGetter<number>
) {
  return computed(() => toValue(base) * toValue(multiplier))
}

const result = useMultiplied(
  () => someCalculation(),
  () => config.multiplier
)
```

## 与 unref 的对比

unref 只处理 ref：

```typescript
const r = ref(1)
const fn = () => 2
const v = 3

unref(r)   // 1
unref(fn)  // () => 2，返回函数本身
unref(v)   // 3
```

toValue 额外处理 getter：

```typescript
toValue(r)   // 1
toValue(fn)  // 2，调用函数
toValue(v)   // 3
```

选择哪个取决于你是否想支持 getter。在新代码中，toValue 通常是更好的选择，因为它提供了更大的灵活性。

## 响应式的保持

一个常见问题是：使用 toValue 是否会失去响应式？

答案是：toValue 本身是一个取值操作，它返回当前的值。响应式的保持取决于调用的上下文。

```typescript
// 在 computed 或 watchEffect 中使用，会自动追踪
const doubled = computed(() => toValue(source) * 2)
// 如果 source 是 ref 或响应式 getter，变化会触发重算

// 在普通代码中使用，只是一次性取值
const value = toValue(source)  // 快照，后续变化不会反映
```

关键是在响应式上下文中调用 toValue，这样访问 ref.value 或执行 getter 时会被追踪。

## 函数检测的考虑

toValue 使用 isFunction 检测函数。这意味着可调用对象（有 call 方法的对象）不会被特殊处理：

```typescript
const callable = {
  value: 42,
  call() { return this.value }
}

// callable 不是函数，会被 unref
toValue(callable)  // { value: 42, call: [Function] }
```

如果需要更复杂的检测，可以创建自定义版本的 toValue。

## 在 VueUse 中的广泛应用

VueUse 库大量使用了这个模式（在 Vue 3.3 之前是自定义实现）。几乎所有的 composable 都接受 MaybeRefOrGetter 参数：

```typescript
// VueUse 的很多函数都这样设计
useDebouncedRef(source: MaybeRefOrGetter<T>, delay: MaybeRefOrGetter<number>)
useThrottledRef(source: MaybeRefOrGetter<T>, delay: MaybeRefOrGetter<number>)
// ...
```

这种设计让 composable 更加通用，调用者可以根据需要选择最适合的传参方式。

## 类型推断

toValue 的类型定义确保正确的类型推断：

```typescript
const n = toValue(ref(1))         // n: number
const s = toValue(() => 'hello')  // s: string
const x = toValue(42)             // x: number
```

泛型会正确推断出解包后的类型。

## 与 toRef 的关系

toRef 和 toValue 方向相反：

- toRef：将各种源转换为 ref（返回 Ref\<T\>）
- toValue：从各种源获取值（返回 T）

```typescript
const source = () => someValue

const r = toRef(source)     // Ref<T>，可以用 r.value 访问
const v = toValue(source)   // T，直接得到值
```

根据需求选择：如果需要保持响应式引用，用 toRef；如果需要获取当前值，用 toValue。

## 本章小结

toValue 是 Vue 3.3 引入的实用函数，统一处理普通值、ref 和 getter 函数。它简化了 composable 的编写，让参数可以接受多种类型的值源。

实现很简单：函数则调用，否则 unref。但这个简单的抽象大大提升了 API 的灵活性。

在编写新的 composable 时，考虑使用 MaybeRefOrGetter 作为参数类型，配合 toValue 获取值。这已经成为 Vue 生态中的最佳实践。
