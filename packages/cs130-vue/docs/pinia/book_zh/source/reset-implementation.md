# $reset 实现

$reset 将 Store 状态重置为初始值。这一章分析其实现原理和使用限制。

## 基本用法

```typescript
const store = useCounterStore()

store.count = 100
store.name = 'modified'

store.$reset()
// 状态恢复为初始值
```

## Options Store 的 $reset

$reset 只在 Options Store 中自动可用：

```typescript
// createSetupStore 内部
if (isOptionsStore) {
  const $reset = function $reset(this: _StoreWithState<Id, S, G, A>) {
    const newState = state ? state() : {}
    this.$patch(($state) => {
      assign($state, newState)
    })
  }
  
  Object.assign(store, { $reset })
}
```

实现非常简洁：调用 state 函数获取新的初始值，然后用 $patch 应用。

## state 函数的重要性

$reset 能工作的前提是 state 是一个函数：

```typescript
const useCounterStore = defineStore('counter', {
  state: () => ({
    count: 0,
    name: 'initial'
  })
})
```

每次调用 `state()` 都返回新的初始状态对象。如果 state 是一个对象字面量，所有调用会返回同一个引用，$reset 就会失效。

## Setup Store 为什么没有 $reset

Setup Store 不自动提供 $reset，因为 Pinia 无法知道什么是"初始状态"：

```typescript
const useStore = defineStore('demo', () => {
  // Pinia 不知道这些是"初始值"
  const count = ref(localStorage.getItem('count') || 0)
  const data = ref(await fetchInitialData())
  
  return { count, data }
})
```

Setup 函数可能包含任意逻辑：从外部读取、异步获取、条件初始化等。Pinia 无法自动确定哪些值应该被"重置"。

## 手动实现 $reset

Setup Store 可以手动实现 $reset：

```typescript
const useCounterStore = defineStore('counter', () => {
  const initialState = {
    count: 0,
    name: ''
  }

  const count = ref(initialState.count)
  const name = ref(initialState.name)

  function $reset() {
    count.value = initialState.count
    name.value = initialState.name
  }

  return { count, name, $reset }
})
```

更优雅的方式：

```typescript
const useCounterStore = defineStore('counter', () => {
  function getInitialState() {
    return {
      count: 0,
      name: ''
    }
  }

  const state = reactive(getInitialState())

  function $reset() {
    Object.assign(state, getInitialState())
  }

  return { ...toRefs(state), $reset }
})
```

## $patch 内部调用

$reset 内部使用 $patch：

```typescript
this.$patch(($state) => {
  assign($state, newState)
})
```

这意味着：

1. 重置操作有订阅通知
2. mutation 类型是 patchFunction
3. DevTools 能追踪到这次变化

## 深层状态的重置

$reset 使用 assign 进行浅合并：

```typescript
const useStore = defineStore('demo', {
  state: () => ({
    user: {
      name: 'Alice',
      profile: {
        age: 25,
        city: 'NYC'
      }
    }
  })
})

store.user.profile.age = 30
store.user.profile.city = 'LA'

store.$reset()
// user.profile 被整体替换为新对象
```

assign 是浅拷贝，嵌套对象被整体替换。这通常是预期行为，因为初始 state 是全新的对象树。

## 与 $state 重置的区别

也可以通过 $state 重置：

```typescript
// 使用 $state
store.$state = { count: 0, name: '' }

// 使用 $reset
store.$reset()
```

区别在于：

1. $state 赋值需要知道初始值是什么
2. $reset 自动从 state 函数获取初始值
3. $state 可以设置任意值，$reset 只能恢复初始值

## 部分重置

$reset 重置所有状态。如果只想重置部分：

```typescript
// 使用 $patch
store.$patch({
  count: 0
  // name 保持不变
})

// 或者自定义方法
function resetCount() {
  store.count = 0
}
```

## 响应式引用的保持

$reset 后，状态的响应式引用不变：

```typescript
const store = useCounterStore()
const countRef = toRef(store, 'count')

watch(countRef, (val) => console.log('count changed:', val))

store.count = 100
// 输出：count changed: 100

store.$reset()
// 输出：count changed: 0

// countRef 仍然有效
console.log(countRef.value)  // 0
```

这是因为 $reset 使用 $patch 修改现有的响应式对象，而不是替换它。

## 开发环境下的 $reset

开发环境下的热更新可能影响 $reset：

```typescript
// createOptionsStore 中
const localState =
  __DEV__ && hot
    ? toRefs(ref(state ? state() : {}).value)
    : toRefs(pinia.state.value[id])
```

热更新时使用独立的状态，确保热更新不会影响正常的状态管理。

## 类型定义

$reset 的类型：

```typescript
interface _StoreWithState<Id, S, G, A> {
  $reset: () => void
}
```

对于 Setup Store，如果自己实现 $reset，需要确保返回类型兼容：

```typescript
const useStore = defineStore('demo', () => {
  // ...
  
  function $reset(): void {
    // 实现
  }
  
  return { $reset }  // 类型正确
})
```

## 常见使用场景

表单重置：

```typescript
const formStore = useFormStore()

function handleCancel() {
  formStore.$reset()
  router.back()
}
```

登出清理：

```typescript
function logout() {
  userStore.$reset()
  cartStore.$reset()
  preferencesStore.$reset()
  router.push('/login')
}
```

测试清理：

```typescript
beforeEach(() => {
  const store = useStore()
  store.$reset()
})
```

## 避免的反模式

不要在 computed 或 watch 中调用 $reset：

```typescript
// ❌ 错误：可能导致无限循环
watch(
  () => store.count,
  (val) => {
    if (val > 100) {
      store.$reset()  // 触发 count 变化，再次触发 watch
    }
  }
)
```

不要期望 $reset 清理衍生状态：

```typescript
const useStore = defineStore('demo', {
  state: () => ({
    items: []
  }),
  getters: {
    itemCount: (state) => state.items.length
  }
})

store.$reset()
// items 被重置为 []
// itemCount 自动重新计算为 0
```

getters 是计算属性，会自动重新计算，不需要手动处理。

下一章我们将分析 getters 的实现机制。
