# Store 代理包装

Store 对象被 reactive 包装后，形成了一个代理层。这一章我们分析这个代理如何影响 Store 的访问行为。

## reactive 代理的基本行为

Store 通过 reactive 创建：

```typescript
const store = reactive(partialStore)
```

reactive 返回一个 Proxy 对象，代理了对原始对象的所有操作。这个代理的核心行为是自动解包内部的 ref：

```typescript
const partialStore = {
  count: ref(0),
  name: ref('Alice')
}

const store = reactive(partialStore)

// 访问时自动解包
console.log(store.count)  // 0，而不是 RefImpl 对象
store.count = 5           // 自动设置 ref.value
```

## ref 自动解包的实现

Vue 的 reactive 在 get 陷阱中检测值是否为 ref：

```typescript
// Vue 源码简化
function createReactiveObject(target) {
  return new Proxy(target, {
    get(target, key, receiver) {
      const res = Reflect.get(target, key, receiver)
      
      // 如果是 ref，返回 .value
      if (isRef(res)) {
        return res.value
      }
      
      return res
    },
    
    set(target, key, value, receiver) {
      const oldValue = target[key]
      
      // 如果原值是 ref，设置 .value
      if (isRef(oldValue) && !isRef(value)) {
        oldValue.value = value
        return true
      }
      
      return Reflect.set(target, key, value, receiver)
    }
  })
}
```

这个机制让用户可以像操作普通属性一样操作 ref，不需要显式访问 .value。

## Store 的代理层次

实际上，Store 可能有多层代理：

```typescript
// 状态本身可能是 reactive
const state = reactive({ items: [] })

// 放入 reactive 的 Store
const store = reactive({
  state,
  // ...
})
```

当访问嵌套的响应式对象时，代理会正确传递：

```typescript
store.state.items.push({ id: 1 })  // 触发响应式更新
```

## computed 在 Store 中的表现

computed 虽然也是 ref 类型，但它有特殊标记：

```typescript
function isComputed(value) {
  return !!(isRef(value) && value.effect)
}
```

在 Store 中，computed 也会被自动解包：

```typescript
const useStore = defineStore('counter', () => {
  const count = ref(0)
  const double = computed(() => count.value * 2)
  
  return { count, double }
})

const store = useStore()
console.log(store.double)  // 数字，不是 ComputedRef
```

## 解构的陷阱

reactive 包装带来一个常见陷阱——解构会丢失响应性：

```typescript
const store = useUserStore()

// ❌ 错误：解构后丢失响应性
const { name, age } = store
// name 和 age 是普通值，不会响应更新

// ✅ 正确：使用 storeToRefs
const { name, age } = storeToRefs(store)
// name 和 age 是 ref，保持响应性
```

这是因为解构时获取的是 ref 解包后的值，而不是 ref 本身。

## storeToRefs 的实现

storeToRefs 专门解决这个问题：

```typescript
function storeToRefs<SS extends StoreGeneric>(store: SS) {
  // 获取原始对象，避免代理干扰
  store = toRaw(store)

  const refs = {} as Record<string, Ref>
  
  for (const key in store) {
    const value = store[key]
    
    // 只处理 ref 和 reactive（状态和 getters）
    if (isRef(value) || isReactive(value)) {
      refs[key] = toRef(store, key)
    }
  }
  
  return refs
}
```

storeToRefs 遍历 Store 的所有属性，为每个响应式属性创建一个 ref 引用。toRef 创建的 ref 与原 Store 保持同步。

## toRef 的作用

toRef 创建一个与源对象属性同步的 ref：

```typescript
const refs = {}
refs.name = toRef(store, 'name')

// 修改 ref 会影响 store
refs.name.value = 'Bob'
console.log(store.name)  // 'Bob'

// 修改 store 会影响 ref
store.name = 'Alice'
console.log(refs.name.value)  // 'Alice'
```

这种双向同步确保了解构后的 ref 与 Store 保持一致。

## 函数属性的处理

storeToRefs 只返回状态和 getters，不包括 actions：

```typescript
const { name, double } = storeToRefs(store)  // ✅ 状态和 getters
const { login } = store                       // ✅ actions 直接解构
```

Actions 不需要保持响应性，直接解构即可使用。

## 为什么不直接解构 actions

实际上直接解构 action 有一个潜在问题——this 绑定：

```typescript
const { increment } = store

// 如果 action 内部使用了 this
function increment() {
  this.count++  // ❌ this 是 undefined
}
```

不过 Pinia 的 action 包装器处理了这个问题：

```typescript
function wrapAction(name, action) {
  return function(this, ...args) {
    // 确保 this 指向 store
    return action.apply(this && this.$id === $id ? this : store, args)
  }
}
```

即使 this 不正确，也会回退到使用 store。

## markRaw 的使用

某些值不应该被响应式代理，Pinia 使用 markRaw 来标记：

```typescript
// computed 被 markRaw 标记
computedGetters[name] = markRaw(
  computed(() => getters[name].call(store, store))
)
```

markRaw 告诉 Vue 不要为这个值创建代理。这避免了不必要的代理层和可能的性能问题。

## 嵌套 Store 的代理

当一个 Store 访问另一个 Store 时：

```typescript
const useOrderStore = defineStore('order', () => {
  const userStore = useUserStore()
  
  // userStore 也是一个代理对象
  return { userStore }
})
```

此时 userStore 虽然已经是代理，但被放入另一个 reactive 对象不会造成双重代理——Vue 会检测并复用已有的代理。

## $state 的代理特殊性

$state 是一个 getter，返回的是 `pinia.state.value[$id]`：

```typescript
Object.defineProperty(store, '$state', {
  get: () => pinia.state.value[$id]
})
```

这意味着 `store.$state` 返回的是 pinia.state 中的原始响应式对象，而不是 Store 代理上的解包值。

```typescript
// store.count 是解包后的数字
console.log(store.count)  // 0

// store.$state.count 也是数字（因为 pinia.state.value 本身也是 reactive）
console.log(store.$state.count)  // 0

// 但如果直接访问 pinia.state.value[$id]
const rawState = toRaw(pinia.state.value[$id])
// rawState.count 可能是 RefImpl 对象
```

理解这些代理层次对于调试和高级使用场景非常重要。下一章我们将深入分析状态的响应式处理机制。
