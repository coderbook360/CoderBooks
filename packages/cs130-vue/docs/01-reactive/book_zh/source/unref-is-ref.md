# unref 与 isRef：ref 类型检测与解包

在使用 Composition API 时，我们经常需要判断一个值是否是 ref，或者需要获取可能是 ref 也可能不是 ref 的值。unref 和 isRef 这两个工具函数就是为这些场景设计的。

## isRef：类型检测

isRef 函数用于检测一个值是否是 ref：

```typescript
export function isRef<T>(r: Ref<T> | unknown): r is Ref<T>
export function isRef(r: any): r is Ref {
  return !!(r && r.__v_isRef === true)
}
```

实现非常简单：检查值是否存在且具有 `__v_isRef` 属性为 true。这个属性在 RefImpl 类中定义为 `public readonly __v_isRef = true`。

使用示例：

```typescript
const r = ref(1)
const n = 1

console.log(isRef(r))  // true
console.log(isRef(n))  // false
```

isRef 是类型守卫函数（返回类型是 `r is Ref<T>`），这意味着在 if 块中，TypeScript 会正确推断类型：

```typescript
function process(value: number | Ref<number>) {
  if (isRef(value)) {
    // 这里 value 被推断为 Ref<number>
    console.log(value.value)
  } else {
    // 这里 value 被推断为 number
    console.log(value)
  }
}
```

## __v_isRef 标记的设计

为什么使用属性标记而不是 instanceof？

```typescript
// 这种方式有问题
function isRef(r) {
  return r instanceof RefImpl
}
```

instanceof 在某些场景下会失效：

1. 跨 iframe 或跨窗口时，不同窗口有不同的 RefImpl 构造函数
2. 多个 Vue 版本共存时，可能有多个 RefImpl
3. 某些构建工具可能重命名或替换类

属性标记是更可靠的方式，只要对象有正确的标记就被认为是 ref，不依赖具体的构造函数。

## unref：安全解包

unref 函数用于获取可能是 ref 的值：

```typescript
export function unref<T>(ref: MaybeRef<T>): T {
  return isRef(ref) ? ref.value : ref
}
```

如果参数是 ref，返回 .value；如果不是，直接返回参数。

```typescript
const r = ref(1)
const n = 2

console.log(unref(r))  // 1
console.log(unref(n))  // 2
```

这在编写通用函数时特别有用：

```typescript
// 函数可以接受 ref 或普通值
function double(n: MaybeRef<number>): number {
  return unref(n) * 2
}

const count = ref(5)
console.log(double(count))  // 10
console.log(double(10))     // 20
```

## MaybeRef 类型

MaybeRef 是一个常用的类型别名：

```typescript
export type MaybeRef<T = any> = T | Ref<T>
```

它表示"可能是 T，也可能是 Ref\<T\>"。还有几个相关类型：

```typescript
export type MaybeRefOrGetter<T = any> = MaybeRef<T> | (() => T)
```

MaybeRefOrGetter 增加了 getter 函数的可能性，用于更灵活的 API 设计。

## 在 Composables 中的应用

unref 和 isRef 在组合式函数中广泛使用：

```typescript
export function useMouseDistance(
  x: MaybeRef<number>,
  y: MaybeRef<number>
) {
  const distance = computed(() => {
    const xVal = unref(x)
    const yVal = unref(y)
    return Math.sqrt(xVal * xVal + yVal * yVal)
  })
  
  return { distance }
}

// 可以传入 ref
const x = ref(3)
const y = ref(4)
const { distance } = useMouseDistance(x, y)

// 也可以传入普通值
const { distance: d2 } = useMouseDistance(3, 4)
```

这种设计让 composable 更加灵活，调用者可以根据需要传入响应式或非响应式的值。

## 与模板自动解包的关系

在 Vue 模板中，顶层 ref 会自动解包：

```html
<template>
  <div>{{ count }}</div>  <!-- 自动解包，不需要 .value -->
</template>

<script setup>
const count = ref(0)
</script>
```

这个自动解包是模板编译器处理的，与 unref 函数无关。unref 用于 JavaScript 代码中的手动解包。

在 reactive 对象中，ref 也会自动解包：

```typescript
const state = reactive({
  count: ref(0)
})

console.log(state.count)  // 0，自动解包
```

这个解包是在 reactive 的 Proxy getter 中处理的。

## 递归解包

unref 只解包一层。如果需要递归解包，可以配合其他工具或自定义函数：

```typescript
const nested = ref(ref(ref(1)))

console.log(unref(nested))          // ref(ref(1))
console.log(unref(unref(nested)))   // ref(1)
```

但实际上，createRef 会阻止重复包装，所以嵌套 ref 在正常使用中不会出现：

```typescript
const r = ref(1)
const r2 = ref(r)  // r2 === r，不会创建新 ref
```

## isRef 的泛型

isRef 的类型签名使用了泛型：

```typescript
export function isRef<T>(r: Ref<T> | unknown): r is Ref<T>
```

这让类型推断更精确：

```typescript
function example<T>(value: T | Ref<T>): T {
  if (isRef(value)) {
    // value 被推断为 Ref<T>
    return value.value  // 返回类型是 T
  }
  // value 被推断为 T
  return value
}
```

## 常见使用模式

规范化输入：

```typescript
function useFeature(input: MaybeRef<Config>) {
  const config = computed(() => unref(input))
  // 后续使用 config.value，总是能得到最新的配置
}
```

条件处理：

```typescript
function getValue<T>(source: MaybeRef<T> | (() => T)): T {
  if (isRef(source)) {
    return source.value
  }
  if (typeof source === 'function') {
    return (source as () => T)()
  }
  return source
}
```

创建响应式包装：

```typescript
function ensureRef<T>(value: MaybeRef<T>): Ref<T> {
  return isRef(value) ? value : ref(value)
}
```

## 与 toValue 的对比

Vue 3.3 引入了 toValue 函数，它是 unref 的增强版：

```typescript
export function toValue<T>(source: MaybeRefOrGetter<T>): T {
  return isFunction(source) ? source() : unref(source)
}
```

toValue 除了处理 ref，还处理 getter 函数。我们会在后续章节详细讨论 toValue。

## 本章小结

isRef 和 unref 是处理 ref 的基础工具函数。isRef 通过检测 __v_isRef 属性判断是否是 ref，unref 通过 isRef 检测后决定返回 .value 还是原值。

这两个函数在编写灵活的组合式函数时特别重要。它们让函数可以接受 MaybeRef 类型的参数，对调用者更友好。结合 TypeScript 的类型守卫，还能提供精确的类型推断。

理解这些工具函数的实现和用法，有助于编写更通用、更灵活的 Vue 代码。
