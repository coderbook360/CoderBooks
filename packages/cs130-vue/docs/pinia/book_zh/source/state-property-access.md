# state 属性访问

状态属性的访问看似简单，背后却涉及多层代理和解包逻辑。这一章分析状态访问的完整链路。

## 访问链路概览

当访问 `store.count` 时，经历以下过程：

```
store.count
    ↓
Proxy get 陷阱
    ↓
获取原始对象上的 countRef
    ↓
检测到是 ref，返回 .value
    ↓
用户得到数字值
```

这个链路由 Vue 的 reactive 系统提供。

## reactive 的 get 陷阱

Store 被 reactive 包装，访问属性时触发 Proxy 的 get 陷阱：

```typescript
// Vue 源码简化
const reactiveHandler = {
  get(target, key, receiver) {
    // 跳过特殊 key
    if (key === ReactiveFlags.IS_REACTIVE) {
      return true
    }
    if (key === ReactiveFlags.RAW) {
      return target
    }
    
    // 获取值
    const res = Reflect.get(target, key, receiver)
    
    // 依赖追踪
    track(target, TrackOpTypes.GET, key)
    
    // ref 自动解包
    if (isRef(res)) {
      // 返回 ref.value，不是 ref 本身
      return res.value
    }
    
    // 嵌套对象递归代理
    if (isObject(res)) {
      return reactive(res)
    }
    
    return res
  }
}
```

关键行为是 `isRef(res) ? res.value : res`，这实现了自动解包。

## ref 的访问

当状态是 ref 时：

```typescript
const useStore = defineStore('demo', () => {
  const count = ref(0)
  return { count }
})

const store = useStore()

// 获取值
const value = store.count  // 0，不是 Ref<number>

// 设置值
store.count = 5  // 设置 ref.value = 5
```

设置时触发 set 陷阱：

```typescript
const reactiveHandler = {
  set(target, key, newValue, receiver) {
    const oldValue = target[key]
    
    // 如果原值是 ref 且新值不是 ref
    if (isRef(oldValue) && !isRef(newValue)) {
      oldValue.value = newValue
      return true
    }
    
    // 普通设置
    const result = Reflect.set(target, key, newValue, receiver)
    trigger(target, TriggerOpTypes.SET, key, newValue, oldValue)
    return result
  }
}
```

这让 `store.count = 5` 实际执行的是 `countRef.value = 5`。

## reactive 对象的访问

当状态是 reactive 时：

```typescript
const useStore = defineStore('demo', () => {
  const user = reactive({
    name: 'Alice',
    profile: { age: 25 }
  })
  return { user }
})

const store = useStore()

// 访问嵌套属性
store.user.name           // 'Alice'
store.user.profile.age    // 25

// 修改嵌套属性
store.user.profile.age = 26  // 触发响应式更新
```

reactive 对象已经是代理，再次放入 reactive 的 Store 中不会双重代理，Vue 会复用已有代理。

## 依赖追踪

访问状态时，Vue 自动追踪依赖：

```typescript
// 组件中
const store = useCounterStore()

// computed 中访问，建立依赖
const doubled = computed(() => store.count * 2)

// 模板中访问，也建立依赖
// <div>{{ store.count }}</div>
```

当 `store.count` 改变时，所有依赖它的 computed 和组件都会更新。

## $state 访问

$state 提供对整个状态对象的访问：

```typescript
Object.defineProperty(store, '$state', {
  get: () => pinia.state.value[$id],
  set: (state) => {
    $patch(($state) => {
      assign($state, state)
    })
  }
})
```

get 返回的是 `pinia.state.value[$id]`，这本身也是一个 reactive 对象：

```typescript
const state = store.$state

// 直接修改状态
state.count = 10  // 触发更新

// 整体替换
store.$state = { count: 20, name: 'Bob' }
```

## 数组状态的访问

数组有特殊的访问模式：

```typescript
const useStore = defineStore('demo', () => {
  const items = ref<string[]>([])
  return { items }
})

const store = useStore()

// 访问数组
store.items.length  // 0
store.items[0]      // undefined

// 修改数组
store.items.push('item1')
store.items[0] = 'updated'
```

数组方法如 push、pop 等都能触发响应式更新，因为 Vue 对数组方法做了特殊处理。

## Map 和 Set 状态

Map 和 Set 需要使用 reactive 才能保持响应性：

```typescript
const useStore = defineStore('demo', () => {
  // ✅ 使用 reactive 包装
  const userMap = reactive(new Map())
  const tagSet = reactive(new Set())
  
  // ❌ ref 对 Map/Set 的响应性支持有限
  const mapRef = ref(new Map())
  
  return { userMap, tagSet }
})

const store = useStore()

// Map 操作
store.userMap.set('u1', { name: 'Alice' })
store.userMap.get('u1')  // { name: 'Alice' }

// Set 操作
store.tagSet.add('vue')
store.tagSet.has('vue')  // true
```

## 深层访问的性能

深层嵌套的访问会经历多次代理：

```typescript
store.user.profile.settings.theme.color
```

每一层访问都触发 get 陷阱。对于频繁访问的深层属性，可以缓存引用：

```typescript
// 缓存引用，减少代理开销
const { theme } = store.user.profile.settings

// 后续访问更直接
theme.color
theme.fontSize
```

## 只读访问

有时需要暴露只读状态：

```typescript
const useStore = defineStore('demo', () => {
  const _count = ref(0)
  
  // 只读引用
  const count = readonly(_count)
  
  function increment() {
    _count.value++
  }
  
  return { count, increment }
})

const store = useStore()
store.count++  // ⚠️ 警告：试图修改只读属性
```

readonly 创建一个只读代理，修改时在开发环境会警告。

## 访问不存在的属性

访问 Store 上不存在的属性：

```typescript
const store = useStore()

// 访问不存在的属性
console.log(store.nonExistent)  // undefined

// TypeScript 会报错
// store.nonExistent  // 类型错误
```

Proxy 的 get 陷阱返回 undefined，不会抛出错误。TypeScript 提供编译时保护。

## 与 Vue DevTools 的交互

访问状态时，DevTools 也能追踪：

```typescript
// DevTools 可以看到
// - 哪些组件依赖了这个状态
// - 状态的当前值
// - 状态的变化历史
```

这是通过 Vue 的响应式系统和 Pinia DevTools 插件配合实现的。

## 性能考量

状态访问有一些性能开销：

1. Proxy 陷阱的调用开销
2. 依赖追踪的开销
3. 深层嵌套的递归代理开销

对于大多数应用，这些开销可以忽略。但在极端场景（如处理大量数据）下，可以考虑：

- 使用 shallowRef 减少深层代理
- 使用 markRaw 标记不需要响应性的数据
- 在计算密集型操作中使用原始值

```typescript
const store = useStore()

// 取出原始值进行计算
const rawItems = toRaw(store.items)
const result = heavyComputation(rawItems)
```

理解状态访问的机制有助于编写高效的代码和排查响应性问题。下一章我们将分析 $patch 的对象模式实现。
