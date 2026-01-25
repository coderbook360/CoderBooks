# createOptionsStore 实现

当使用 Options API 风格定义 Store 时，defineStore 会调用 createOptionsStore 来处理创建逻辑。这一章我们深入分析这个函数的实现。

## Options Store 的转换

createOptionsStore 的核心职责是将 Options 风格转换为 Setup 风格，然后委托给 createSetupStore。这种设计保持了内部实现的统一性。

```typescript
function createOptionsStore<
  Id extends string,
  S extends StateTree,
  G extends _GettersTree<S>,
  A extends _ActionsTree
>(
  id: Id,
  options: DefineStoreOptions<Id, S, G, A>,
  pinia: Pinia,
  hot?: boolean
): Store<Id, S, G, A> {
  const { state, actions, getters } = options

  // 读取已存在的初始状态（SSR hydration 场景）
  const initialState: StateTree | undefined = pinia.state.value[id]

  let store: Store<Id, S, G, A>

  function setup() {
    // setup 函数实现
  }

  store = createSetupStore(id, setup, options, pinia, hot, true)

  return store
}
```

函数接收四个参数：Store 的 id、定义时的 options 对象、Pinia 实例，以及可选的 hot 参数（用于热更新）。

首先从 options 中解构出 state、actions 和 getters。然后检查 `pinia.state.value[id]` 是否已存在初始状态——这在 SSR hydration 时会发生，服务端渲染的状态会预先存放在这里。

## setup 函数的构建

createOptionsStore 内部构建了一个 setup 函数，这个函数模拟了 Setup Store 的行为：

```typescript
function setup() {
  // 1. 初始化状态
  if (!initialState && (!__DEV__ || !hot)) {
    if (isVue2) {
      set(pinia.state.value, id, state ? state() : {})
    } else {
      pinia.state.value[id] = state ? state() : {}
    }
  }

  // 2. 创建本地状态引用
  const localState =
    __DEV__ && hot
      ? toRefs(ref(state ? state() : {}).value)
      : toRefs(pinia.state.value[id])

  // 3. 组合返回对象
  return assign(
    localState,
    actions,
    Object.keys(getters || {}).reduce((computedGetters, name) => {
      // 处理 getters
      computedGetters[name] = markRaw(
        computed(() => {
          setActivePinia(pinia)
          const store = pinia._s.get(id)!
          return getters![name].call(store, store)
        })
      )
      return computedGetters
    }, {} as Record<string, ComputedRef>)
  )
}
```

这个 setup 函数做了三件事：初始化状态、创建状态引用、组合最终对象。

## 状态初始化

```typescript
if (!initialState && (!__DEV__ || !hot)) {
  if (isVue2) {
    set(pinia.state.value, id, state ? state() : {})
  } else {
    pinia.state.value[id] = state ? state() : {}
  }
}
```

如果没有预存的初始状态（非 SSR 场景），并且不是热更新，就调用 state 函数获取初始状态并存储到 `pinia.state.value[id]`。

Vue 2 需要使用 set 函数来确保响应性，Vue 3 直接赋值即可。

state 是一个函数而不是对象，这保证了每个 Store 实例有独立的状态副本。如果是对象，所有地方共享同一个引用，修改会互相影响。

## 本地状态引用

```typescript
const localState =
  __DEV__ && hot
    ? toRefs(ref(state ? state() : {}).value)
    : toRefs(pinia.state.value[id])
```

toRefs 将响应式对象的每个属性转换为独立的 ref。这样做的目的是让解构后的属性仍然保持响应性。

在热更新模式下，使用新的 state 函数创建状态，而不是读取已存储的状态。这确保了热更新时能反映最新的初始值定义。

## Getters 转换为 Computed

```typescript
Object.keys(getters || {}).reduce((computedGetters, name) => {
  computedGetters[name] = markRaw(
    computed(() => {
      setActivePinia(pinia)
      const store = pinia._s.get(id)!
      return getters![name].call(store, store)
    })
  )
  return computedGetters
}, {} as Record<string, ComputedRef>)
```

遍历所有 getters，将每个转换为 computed。

每个 getter 函数都被包装在 computed 中，调用时接收 store 作为第一个参数，同时 this 也指向 store。这样 getter 可以访问 state、其他 getters 和 actions：

```typescript
const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0 }),
  getters: {
    double(state) {
      return state.count * 2
    },
    quadruple() {
      // this 指向 store
      return this.double * 2
    }
  }
})
```

markRaw 标记 computed 不需要被代理，避免不必要的响应式包装。

## 处理 $reset

Options Store 有一个 Setup Store 没有的特性：$reset 方法。

```typescript
store = createSetupStore(id, setup, options, pinia, hot, true)
// 最后一个 true 参数表示这是 Options Store
```

createSetupStore 的最后一个参数 `isOptionsStore` 为 true 时，会添加 $reset 方法：

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

$reset 通过重新调用 state 函数获取初始值，然后用 $patch 更新状态。

Setup Store 没有 $reset 是因为 Pinia 无法知道 setup 函数中哪些是"初始状态"——setup 函数可能包含任何逻辑，state 可能来自各种来源。

## 类型推导

createOptionsStore 的泛型设计确保了类型安全：

```typescript
function createOptionsStore<
  Id extends string,
  S extends StateTree,
  G extends _GettersTree<S>,
  A extends _ActionsTree
>(...)
```

- `Id` 推断 Store 的 ID 字面量类型
- `S` 从 state 返回值推断状态类型
- `G` 从 getters 对象推断 getter 类型，并知道它们依赖于 S
- `A` 从 actions 对象推断 action 类型

这些类型会传递给 createSetupStore，最终体现在返回的 Store 实例上。

## 与 createSetupStore 的关系

createOptionsStore 是 createSetupStore 的适配层：

```
Options Store 定义
    ↓
createOptionsStore
    ↓ (构建 setup 函数)
createSetupStore
    ↓
Store 实例
```

这种设计的优势在于：核心逻辑只需要在 createSetupStore 中实现一次，Options Store 只是换了一种定义方式，最终殊途同归。

这也是为什么官方推荐 Setup Store——它更直接，没有中间转换层，代码更简洁，类型推导更准确。

下一章我们将深入分析 createSetupStore，这是整个 Store 创建流程的核心。
