# buildStoreToUse 组装

在 createSetupStore 完成 Store 的核心创建后，还需要一个最终的组装步骤，将所有部分合并成用户实际使用的 Store 对象。这一章分析这个组装过程。

## Store 的最终形态

一个完整的 Store 对象包含以下部分：

```typescript
interface Store<Id, S, G, A> {
  // 标识
  $id: Id
  
  // 内部引用
  _p: Pinia
  
  // 状态（来自 setup 返回的 ref/reactive）
  // ... state properties
  
  // Getters（来自 setup 返回的 computed）
  // ... getter properties
  
  // Actions（来自 setup 返回的函数，经过包装）
  // ... action methods
  
  // 内置方法
  $patch: (partial | mutator) => void
  $reset: () => void
  $subscribe: (callback, options?) => () => void
  $onAction: (callback, detached?) => () => void
  $dispose: () => void
  
  // 状态快照（访问器属性）
  $state: UnwrapRef<S>
}
```

## 状态的组装

setup 函数返回的 ref 和 reactive 需要同时存在于两个位置：Store 对象本身和 `pinia.state.value[$id]`。

```typescript
// createSetupStore 内部
for (const key in setupStore) {
  const prop = setupStore[key]

  if ((isRef(prop) && !isComputed(prop)) || isReactive(prop)) {
    if (!isOptionsStore) {
      // 同步到 pinia.state.value
      pinia.state.value[$id][key] = prop
    }
  }
}

// 合并到 store 对象
assign(store, setupStore)
```

这种双重存储的设计有几个目的：

Store 对象上的属性供用户直接使用：

```typescript
const store = useUserStore()
store.name  // 直接访问
store.age   // 直接访问
```

`pinia.state.value[$id]` 则是规范化的状态树，供 DevTools、插件、SSR 等功能使用：

```typescript
// DevTools 可以这样遍历所有 Store 的状态
Object.keys(pinia.state.value).forEach(storeId => {
  console.log(storeId, pinia.state.value[storeId])
})
```

## $state 访问器

除了单独访问每个属性，Store 还提供了 $state 来整体访问状态：

```typescript
Object.defineProperty(store, '$state', {
  get: () => (__DEV__ && hot ? hotState.value : pinia.state.value[$id]),
  set: (state) => {
    if (__DEV__ && hot) {
      throw new Error('cannot set hotState')
    }
    $patch(($state) => {
      assign($state, state)
    })
  },
})
```

$state 是一个访问器属性，get 返回状态对象的引用，set 通过 $patch 来更新整个状态。

这允许用户整体替换状态：

```typescript
store.$state = { name: 'Bob', age: 25 }
// 等价于
store.$patch({ name: 'Bob', age: 25 })
```

## Getters 的组装

setup 返回的 computed 直接合并到 Store，不需要特殊处理：

```typescript
for (const key in setupStore) {
  const prop = setupStore[key]
  
  if (isComputed(prop)) {
    // computed 直接使用，不做特殊处理
  }
}

// 合并时 computed 也一起合并
assign(store, setupStore)
```

用户访问 getter 时，实际上是访问 computed 的 value：

```typescript
const store = useCounterStore()
console.log(store.double)  // 自动解包，等价于 computedDouble.value
```

这个自动解包是 Vue reactive 系统的特性——reactive 对象内的 ref 会自动解包。

## Actions 的组装

Actions 经过 wrapAction 包装后合并到 Store：

```typescript
for (const key in setupStore) {
  const prop = setupStore[key]
  
  if (typeof prop === 'function') {
    const actionValue = wrapAction(key, prop)
    setupStore[key] = actionValue
    
    // 同时记录到 optionsForPlugin，供插件使用
    optionsForPlugin.actions[key] = prop
  }
}

assign(store, setupStore)
```

包装后的 action 保持了原有的调用方式，但增加了 $onAction 支持和正确的 this 绑定。

## 内置方法的挂载

内置方法在创建 partialStore 时就已定义：

```typescript
const partialStore = {
  _p: pinia,
  $id,
  $onAction,
  $patch,
  $reset: noop,
  $subscribe,
  $dispose,
}

const store = reactive(partialStore)
```

这些方法成为 Store 对象的属性，用户可以直接调用。

## 插件扩展的合并

插件可以返回要添加到 Store 的属性：

```typescript
pinia._p.forEach((extender) => {
  const extensions = scope.run(() =>
    extender({ store, app: pinia._a, pinia, options: optionsForPlugin })
  )
  
  if (extensions) {
    assign(store, extensions)
    
    // 开发环境记录自定义属性
    if (__DEV__) {
      Object.keys(extensions).forEach((key) =>
        store._customProperties.add(key)
      )
    }
  }
})
```

插件返回的属性直接合并到 Store。_customProperties 记录了哪些属性是插件添加的，方便 DevTools 区分显示。

## reactive 包装的意义

最终的 Store 被 reactive 包装：

```typescript
const store = reactive(partialStore)
```

这个包装带来几个效果：

首先，Store 内的 ref 会自动解包。用户访问 `store.count` 而不是 `store.count.value`。

其次，整个 Store 成为响应式的。如果插件动态添加属性，这些属性也能触发更新。

最后，Store 可以被正确地追踪和调试。

## toRaw 的处理

合并时同时操作 store 和 toRaw(store)：

```typescript
assign(store, setupStore)
assign(toRaw(store), setupStore)
```

这确保了属性同时存在于代理对象和原始对象上。某些场景下（如解构、序列化）会访问原始对象，这样可以保证一致性。

## 类型体操

Store 的类型定义相当复杂，需要正确推断状态、getters、actions 的类型：

```typescript
type Store<Id, S, G, A> = 
  _StoreWithState<Id, S, G, A> &
  UnwrapRef<S> &
  _StoreWithGetters<G> &
  _ActionsTree extends A ? {} : A &
  PiniaCustomProperties<Id, S, G, A> &
  PiniaCustomStateProperties<S>
```

这个交叉类型确保了用户能够获得完整的类型提示：访问状态属性、getter、action 时都有正确的类型。

PiniaCustomProperties 和 PiniaCustomStateProperties 是可扩展的接口，插件可以通过声明合并来添加类型。

## 热更新支持

开发环境下，Store 还包含热更新相关的属性：

```typescript
if (__DEV__) {
  store._hmrPayload = {
    state: Object.keys(rawState),
    hotState,
    actions: {},
    getters: {},
  }
}
```

_hmrPayload 记录了 Store 的结构信息，热更新时据此判断哪些部分需要更新。

最终组装完成的 Store 对象是一个功能完整、类型安全、支持各种扩展的状态容器。下一章我们将分析 Store 代理包装的细节。
