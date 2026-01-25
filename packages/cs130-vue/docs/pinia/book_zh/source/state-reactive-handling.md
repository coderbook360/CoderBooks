# state 响应式处理

状态是 Store 的核心，它的响应式处理决定了整个状态管理的行为。这一章深入分析 Pinia 如何处理状态的响应式。

## 状态的存储位置

Pinia 的状态存储在两个地方：

```typescript
// 1. Store 对象本身
const store = useCounterStore()
store.count  // 直接访问

// 2. 全局状态树
pinia.state.value['counter'].count
```

这种双重存储的设计让 Store 既方便使用，又便于统一管理。

## 初始化流程

Options Store 的状态初始化：

```typescript
// createOptionsStore 内部
if (!initialState && (!__DEV__ || !hot)) {
  pinia.state.value[id] = state ? state() : {}
}
```

Setup Store 的状态初始化：

```typescript
// createSetupStore 内部
if (!isOptionsStore && !initialState) {
  pinia.state.value[$id] = {}
}

// 运行 setup 后同步
for (const key in setupStore) {
  const prop = setupStore[key]
  if (isRef(prop) || isReactive(prop)) {
    pinia.state.value[$id][key] = prop
  }
}
```

两种方式都确保状态最终存入 `pinia.state.value`。

## ref vs reactive

Setup Store 中可以使用 ref 或 reactive 定义状态：

```typescript
const useStore = defineStore('demo', () => {
  // 使用 ref
  const count = ref(0)
  const name = ref('Alice')
  
  // 使用 reactive
  const user = reactive({
    profile: { name: 'Alice' },
    settings: { theme: 'dark' }
  })
  
  return { count, name, user }
})
```

两者在 Store 中的表现：

```typescript
const store = useStore()

// ref 自动解包
store.count = 5      // 设置 ref.value
console.log(store.count)  // 获取 ref.value

// reactive 直接访问
store.user.profile.name = 'Bob'  // 直接修改
```

通常，简单值用 ref，复杂对象用 reactive。但这不是强制的，选择取决于使用偏好。

## 状态同步机制

Setup Store 的状态需要同步到 `pinia.state.value`：

```typescript
for (const key in setupStore) {
  const prop = setupStore[key]
  
  if ((isRef(prop) && !isComputed(prop)) || isReactive(prop)) {
    pinia.state.value[$id][key] = prop
  }
}
```

注意这里存储的是 ref/reactive 本身，而不是它们的值。这意味着它们共享同一个响应式引用：

```typescript
const count = ref(0)
pinia.state.value['counter'].count = count

// 修改任一处，另一处也变化
count.value = 5
console.log(pinia.state.value['counter'].count)  // 5（同一个 ref）
```

## SSR Hydration

服务端渲染时，状态会被序列化并发送到客户端。客户端需要用这些状态"注水"：

```typescript
// 服务端
const html = await renderToString(app)
const state = JSON.stringify(pinia.state.value)
// 将 state 嵌入 HTML

// 客户端
pinia.state.value = JSON.parse(window.__PINIA_STATE__)
```

Store 创建时检测是否有预存状态：

```typescript
const initialState = pinia.state.value[$id]

if (initialState && shouldHydrate(prop)) {
  if (isRef(prop)) {
    prop.value = initialState[key]
  } else {
    mergeReactiveObjects(prop, initialState[key])
  }
}
```

如果有 initialState，用它来初始化 ref 或合并到 reactive 对象。

## shouldHydrate 判断

```typescript
function shouldHydrate(obj: any) {
  return (
    isPlainObject(obj) &&
    !isRef(obj) &&
    !isReactive(obj) &&
    !isComputed(obj) &&
    !isProxy(obj)
  )
}
```

只有纯对象才需要 hydration。已经是响应式的对象不需要重复处理。

## mergeReactiveObjects

对于 reactive 对象，使用深度合并：

```typescript
function mergeReactiveObjects(target: StateTree, state: StateTree) {
  for (const key in state) {
    const targetValue = target[key]
    const stateValue = state[key]
    
    if (
      isPlainObject(targetValue) &&
      isPlainObject(stateValue) &&
      target.hasOwnProperty(key) &&
      !isRef(stateValue) &&
      !isReactive(stateValue)
    ) {
      // 递归合并
      target[key] = mergeReactiveObjects(targetValue, stateValue)
    } else {
      // 直接覆盖
      target[key] = stateValue
    }
  }
  
  return target
}
```

这个合并保持了 target 的响应式引用，同时用 state 的值更新内容。

## 状态的深层响应性

无论使用 ref 还是 reactive，嵌套对象都具有响应性：

```typescript
const store = useStore()

// 深层修改也触发响应
store.user.profile.address.city = 'New York'
```

这是因为：

ref 对复杂对象的处理是用 reactive 包装 .value：

```typescript
const user = ref({ name: 'Alice' })
// user.value 是一个 reactive 对象
```

reactive 对嵌套对象递归代理：

```typescript
const state = reactive({
  user: { profile: { name: 'Alice' } }
})
// state.user 和 state.user.profile 都是代理
```

## 非响应式数据

有时我们需要存储非响应式数据：

```typescript
import { markRaw } from 'vue'

const useStore = defineStore('demo', () => {
  // 大型只读数据，不需要响应性
  const cities = markRaw(hugeCitiesList)
  
  // 第三方库实例
  const chart = shallowRef(null)
  
  return { cities, chart }
})
```

markRaw 阻止对象被转换为响应式。shallowRef 只有 .value 本身是响应式的，值的内部不是。

## 状态类型安全

TypeScript 能从状态定义推断类型：

```typescript
// Options Store
const useStore = defineStore('user', {
  state: () => ({
    name: '',      // string
    age: 0,        // number
    isAdmin: false // boolean
  })
})

// Setup Store
const useStore = defineStore('user', () => {
  const name = ref('')      // Ref<string>
  const age = ref(0)        // Ref<number>
  const isAdmin = ref(false) // Ref<boolean>
  
  return { name, age, isAdmin }
})
```

使用时类型自动正确：

```typescript
const store = useStore()
store.name  // string，不是 Ref<string>
store.age   // number
```

## 重置状态

Options Store 可以使用 $reset：

```typescript
store.$reset()  // 重置为初始状态
```

实现原理：

```typescript
const $reset = function() {
  const newState = state()  // 重新调用 state 函数
  this.$patch(($state) => {
    assign($state, newState)
  })
}
```

Setup Store 需要手动实现：

```typescript
const useCounterStore = defineStore('counter', () => {
  const initialState = { count: 0, name: '' }
  
  const count = ref(initialState.count)
  const name = ref(initialState.name)
  
  function $reset() {
    count.value = initialState.count
    name.value = initialState.name
  }
  
  return { count, name, $reset }
})
```

理解状态的响应式处理是使用和调试 Pinia 的基础。下一章我们将分析状态初始化的完整流程。
