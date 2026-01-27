# toValue 与 MaybeRefOrGetter：Vue 3.3 的类型增强

Vue 3.3 引入了 `toValue` 函数和 `MaybeRefOrGetter` 类型，进一步增强了 Composable 函数的类型安全性和灵活性。

## 为什么需要 toValue

在 Vue 3.3 之前，处理可能是 ref 或 getter 的参数很麻烦：

```typescript
// 旧写法：需要手动判断
function useFeature(value: Ref<number> | (() => number)) {
  const resolved = computed(() => {
    return isRef(value) ? value.value : value()
  })
}
```

`toValue` 统一了这种处理方式。

## toValue 源码解析

```typescript
export function toValue<T>(source: MaybeRefOrGetter<T>): T {
  return isFunction(source) ? source() : unref(source)
}
```

实现非常简洁：如果是函数就调用它，否则使用 `unref` 解包。

## MaybeRefOrGetter 类型

```typescript
export type MaybeRef<T> = T | Ref<T>
export type MaybeRefOrGetter<T> = MaybeRef<T> | (() => T)
```

这个类型表示：
- 可以是普通值 `T`
- 可以是 `Ref<T>`
- 可以是返回 `T` 的 getter 函数

## 实际使用场景

### Composable 函数参数

```typescript
import { toValue, MaybeRefOrGetter, computed } from 'vue'

// 接受多种形式的参数
function useFetch(url: MaybeRefOrGetter<string>) {
  return computed(() => {
    const resolvedUrl = toValue(url)
    return fetch(resolvedUrl)
  })
}

// 三种调用方式都可以
useFetch('https://api.example.com')     // 普通字符串
useFetch(urlRef)                          // ref
useFetch(() => `${baseUrl}/users`)       // getter
```

### 条件性响应式

```typescript
function useTitle(title: MaybeRefOrGetter<string>) {
  watchEffect(() => {
    document.title = toValue(title)
  })
}

// 静态标题
useTitle('My App')

// 动态标题
useTitle(() => `${route.name} - My App`)

// ref 标题
const title = ref('Loading...')
useTitle(title)
```

## 与 unref 的区别

`unref` 只处理 ref：

```typescript
unref(ref(1))     // 1
unref(1)          // 1
unref(() => 1)    // () => 1  ❌ 不会调用函数
```

`toValue` 同时处理 ref 和 getter：

```typescript
toValue(ref(1))   // 1
toValue(1)        // 1
toValue(() => 1)  // 1  ✓ 调用函数
```

## 源码中的应用

Vue 内部的 `watch` 已经在使用类似逻辑：

```typescript
// watch 的 source 处理
function doWatch(source: WatchSource, cb: WatchCallback) {
  let getter: () => unknown
  
  if (isRef(source)) {
    getter = () => source.value
  } else if (isReactive(source)) {
    getter = () => source
  } else if (isFunction(source)) {
    getter = source
  } else {
    getter = () => source
  }
  
  // ...
}
```

使用 `toValue` 可以简化：

```typescript
function doWatch(source: MaybeRefOrGetter<unknown>, cb: WatchCallback) {
  const getter = () => toValue(source)
  // ...
}
```

## 类型推导

TypeScript 能够正确推导出 `toValue` 的返回类型：

```typescript
const strRef = ref('hello')
const strGetter = () => 'world'
const strValue = 'static'

toValue(strRef)     // string
toValue(strGetter)  // string
toValue(strValue)   // string
```

## 完整示例

```typescript
import { ref, computed, watchEffect, toValue, MaybeRefOrGetter } from 'vue'

// 通用的防抖函数
function useDebouncedValue<T>(
  source: MaybeRefOrGetter<T>,
  delay: MaybeRefOrGetter<number> = 200
) {
  const debounced = ref<T>()
  let timeout: ReturnType<typeof setTimeout>
  
  watchEffect(() => {
    clearTimeout(timeout)
    const value = toValue(source)
    const ms = toValue(delay)
    
    timeout = setTimeout(() => {
      debounced.value = value
    }, ms)
  })
  
  return debounced
}

// 多种使用方式
const searchQuery = ref('')
const debouncedQuery = useDebouncedValue(searchQuery, 300)

// getter 形式
const debouncedFullName = useDebouncedValue(
  () => `${firstName.value} ${lastName.value}`,
  () => slowConnection.value ? 500 : 200
)
```

## 本章小结

`toValue` 和 `MaybeRefOrGetter`：

1. 统一处理普通值、ref 和 getter
2. 简化 Composable 函数的参数类型
3. 提升类型安全性和开发体验
4. Vue 3.3+ 的推荐实践

这个 API 虽然简单，但极大地改善了组合式函数的灵活性。
