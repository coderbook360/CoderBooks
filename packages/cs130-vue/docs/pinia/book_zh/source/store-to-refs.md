# storeToRefs 实现

storeToRefs 用于解构 Store 的响应式属性。这一章分析其实现。

## 问题场景

直接解构 Store 会丢失响应性：

```typescript
const store = useCounterStore()

// ❌ 响应性丢失
const { count, double } = store

// count 和 double 是普通值，不会响应更新
store.count = 10
console.log(count)  // 仍然是旧值
```

## 基本用法

```typescript
import { storeToRefs } from 'pinia'

const store = useCounterStore()

// ✅ 保持响应性
const { count, double } = storeToRefs(store)

// count 和 double 是 ref，会响应更新
store.count = 10
console.log(count.value)  // 10
```

## 实现分析

```typescript
export function storeToRefs<SS extends StoreGeneric>(
  store: SS
): StoreToRefs<SS> {
  // 兼容 Vue 2
  if (isVue2) {
    return toRefs(store)
  }

  // 获取原始对象
  store = toRaw(store)

  const refs = {} as StoreToRefs<SS>
  
  for (const key in store) {
    const value = store[key]
    
    // 只处理 ref 和 reactive（不处理函数）
    if (isRef(value) || isReactive(value)) {
      refs[key] = toRef(store, key) as any
    }
  }

  return refs
}
```

核心逻辑是遍历 Store 属性，为响应式属性创建 ref 引用。

## toRaw 的作用

```typescript
store = toRaw(store)
```

获取 Store 的原始对象，避免代理层干扰。Store 被 reactive 包装，直接访问会触发代理陷阱。

## 属性过滤

```typescript
if (isRef(value) || isReactive(value)) {
  refs[key] = toRef(store, key)
}
```

只处理 ref 和 reactive 值，跳过：

- 函数（actions）
- 原始值
- 内置属性（$id, $patch 等）

## toRef 的作用

```typescript
refs[key] = toRef(store, key)
```

toRef 创建一个与源属性同步的 ref：

```typescript
const store = reactive({ count: 0 })
const countRef = toRef(store, 'count')

// 双向同步
countRef.value = 5
console.log(store.count)  // 5

store.count = 10
console.log(countRef.value)  // 10
```

## 返回类型

```typescript
type StoreToRefs<SS> = {
  [K in keyof SS]: SS[K] extends Ref
    ? SS[K]
    : SS[K] extends ComputedRef<infer T>
    ? ComputedRef<T>
    : SS[K] extends (...args: any[]) => any
    ? never
    : Ref<SS[K]>
}
```

类型转换规则：

- Ref 保持 Ref
- ComputedRef 保持 ComputedRef  
- 函数类型变为 never（被过滤）
- 其他变为 Ref

## 使用示例

状态解构：

```typescript
const store = useUserStore()
const { name, age, profile } = storeToRefs(store)

// 在模板中使用
// <div>{{ name }} - {{ age }}</div>

// 修改
name.value = 'Alice'  // 同步更新 store.name
```

getter 解构：

```typescript
const store = useCounterStore()
const { double, triple } = storeToRefs(store)

// double 和 triple 是 ComputedRef
console.log(double.value)
```

## action 不包含

storeToRefs 不返回 actions：

```typescript
const store = useStore()
const refs = storeToRefs(store)

// refs 中没有 actions
console.log(refs.increment)  // undefined
```

actions 应该直接从 store 解构：

```typescript
const { increment, fetchData } = store
// 或者直接使用 store.increment()
```

## 与 toRefs 的区别

Vue 的 toRefs 会处理所有属性：

```typescript
const store = useStore()

// toRefs 包括所有属性
const allRefs = toRefs(store)
allRefs.$patch  // 存在，但不应该这样用

// storeToRefs 只包括状态和 getters
const stateRefs = storeToRefs(store)
stateRefs.$patch  // undefined
```

storeToRefs 更精确，只返回用户定义的响应式属性。

## 性能考量

storeToRefs 遍历 Store 所有属性：

```typescript
for (const key in store) {
  // 每个属性都检查
}
```

对于属性很多的 Store，可能有些开销。但通常可以忽略。

如果只需要特定属性，可以直接用 toRef：

```typescript
// 只需要 count
const count = toRef(store, 'count')

// 而不是
const { count } = storeToRefs(store)  // 遍历了所有属性
```

## 响应式保证

返回的 ref 与 Store 完全同步：

```typescript
const store = useStore()
const { count } = storeToRefs(store)

// 从 Store 修改
store.count = 10
console.log(count.value)  // 10

// 从 ref 修改
count.value = 20
console.log(store.count)  // 20

// watch 正常工作
watch(count, (newVal) => {
  console.log('count changed:', newVal)
})
```

## 组合式 API 中的用法

```typescript
export default {
  setup() {
    const store = useCounterStore()
    const { count, double } = storeToRefs(store)
    const { increment } = store
    
    return {
      count,
      double,
      increment
    }
  }
}
```

## 注意事项

storeToRefs 是浅层的：

```typescript
const store = useStore()
const { user } = storeToRefs(store)

// user 是 ref，user.value 是响应式对象
user.value.profile.name = 'Alice'  // ✅ 触发更新

// 但 user.value.profile 本身不是 ref
const { profile } = user.value  // 不是 ref
```

## 常见模式

解构状态和 actions 分开：

```typescript
const store = useStore()

// 状态（ref）
const { count, name } = storeToRefs(store)

// actions（直接解构）
const { increment, fetchData } = store
```

在 composable 中使用：

```typescript
function useCounter() {
  const store = useCounterStore()
  const { count, double } = storeToRefs(store)
  
  return {
    count,
    double,
    increment: store.increment
  }
}
```

下一章我们将分析 mapStores 辅助函数。
