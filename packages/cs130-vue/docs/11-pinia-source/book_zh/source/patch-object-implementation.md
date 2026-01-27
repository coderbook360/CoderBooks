# $patch 对象模式

$patch 是 Pinia 更新状态的推荐方式之一。这一章分析对象模式的 $patch 实现。

## 基本用法

对象模式的 $patch 接受一个部分状态对象：

```typescript
const store = useUserStore()

// 更新多个属性
store.$patch({
  name: 'Alice',
  age: 25,
  profile: {
    avatar: 'new-avatar.png'
  }
})
```

## 函数签名

$patch 是一个重载函数：

```typescript
function $patch(partialState: _DeepPartial<UnwrapRef<S>>): void
function $patch(stateMutation: (state: UnwrapRef<S>) => void): void
function $patch(
  partialStateOrMutator:
    | _DeepPartial<UnwrapRef<S>>
    | ((state: UnwrapRef<S>) => void)
): void
```

根据参数类型判断是对象模式还是函数模式。

## 对象模式实现

```typescript
function $patch(partialStateOrMutator) {
  let subscriptionMutation: SubscriptionCallbackMutation<S>
  
  // 暂停订阅监听
  isListening = isSyncListening = false
  
  if (typeof partialStateOrMutator === 'function') {
    // 函数模式，下一章分析
  } else {
    // 对象模式
    mergeReactiveObjects(pinia.state.value[$id], partialStateOrMutator)
    
    subscriptionMutation = {
      type: MutationType.patchObject,
      storeId: $id,
      payload: partialStateOrMutator,
      events: debuggerEvents as DebuggerEvent[]
    }
  }
  
  // 恢复订阅监听
  const myListenerId = (activeListener = Symbol())
  nextTick().then(() => {
    if (activeListener === myListenerId) {
      isListening = true
    }
  })
  isSyncListening = true
  
  // 触发订阅回调
  triggerSubscriptions(
    subscriptions,
    subscriptionMutation,
    pinia.state.value[$id] as UnwrapRef<S>
  )
}
```

核心逻辑是调用 mergeReactiveObjects 进行深度合并，然后触发订阅。

## mergeReactiveObjects 深度合并

```typescript
function mergeReactiveObjects<T extends StateTree>(
  target: T,
  patchToApply: _DeepPartial<T>
): T {
  // 处理 Map
  if (target instanceof Map && patchToApply instanceof Map) {
    patchToApply.forEach((value, key) => target.set(key, value))
  }
  
  // 处理 Set
  if (target instanceof Set && patchToApply instanceof Set) {
    patchToApply.forEach(target.add, target)
  }

  // 处理普通对象
  for (const key in patchToApply) {
    if (!patchToApply.hasOwnProperty(key)) continue

    const subPatch = patchToApply[key]
    const targetValue = target[key]

    if (
      isPlainObject(targetValue) &&
      isPlainObject(subPatch) &&
      target.hasOwnProperty(key) &&
      !isRef(subPatch) &&
      !isReactive(subPatch)
    ) {
      // 递归合并嵌套对象
      target[key] = mergeReactiveObjects(targetValue, subPatch)
    } else {
      // 直接覆盖
      target[key] = subPatch
    }
  }

  return target
}
```

这个函数的关键行为是：对于嵌套的普通对象，递归合并而不是整体替换。

## 合并 vs 替换

理解合并和替换的区别很重要：

```typescript
const store = useStore()
// 假设初始状态
// { user: { name: 'Alice', profile: { age: 25, city: 'NYC' } } }

// 使用 $patch
store.$patch({
  user: {
    profile: {
      age: 26
    }
  }
})

// 结果：合并，保留了其他属性
// { user: { name: 'Alice', profile: { age: 26, city: 'NYC' } } }
```

如果直接赋值：

```typescript
store.user.profile = { age: 26 }

// 结果：替换，丢失了其他属性
// { user: { name: 'Alice', profile: { age: 26 } } }
```

$patch 的合并行为更安全，不会意外丢失数据。

## ref 值的处理

当 target 中的值是 ref 时，会被直接覆盖值：

```typescript
// 检查条件
if (!isRef(subPatch) && !isReactive(subPatch)) {
  // 如果 patch 值不是 ref，直接覆盖
  target[key] = subPatch
}
```

由于 target 是 pinia.state.value 中的 reactive 对象，ref 会自动解包，所以赋值实际上是设置 ref.value。

## 数组的处理

数组会被直接替换，而不是合并：

```typescript
store.$patch({
  items: ['new', 'array']
})

// items 被完全替换，不是追加
```

这是因为 Array 不是 `isPlainObject`，走的是直接覆盖分支。

如果需要追加，使用函数模式：

```typescript
store.$patch(state => {
  state.items.push('new item')
})
```

## Map 和 Set 的处理

Map 和 Set 有专门的处理逻辑：

```typescript
if (target instanceof Map && patchToApply instanceof Map) {
  patchToApply.forEach((value, key) => target.set(key, value))
}

if (target instanceof Set && patchToApply instanceof Set) {
  patchToApply.forEach(target.add, target)
}
```

Map 是合并键值对，Set 是添加元素。

```typescript
const store = useStore()
// store.userMap = Map { 'a' => 1, 'b' => 2 }

store.$patch({
  userMap: new Map([['c', 3]])
})

// 结果：Map { 'a' => 1, 'b' => 2, 'c' => 3 }
// 合并，不是替换
```

## 订阅的暂停与恢复

$patch 过程中暂停订阅，完成后才触发：

```typescript
// 暂停
isListening = isSyncListening = false

// 执行合并
mergeReactiveObjects(...)

// 恢复同步监听
isSyncListening = true

// 异步恢复普通监听
nextTick().then(() => {
  isListening = true
})

// 触发订阅
triggerSubscriptions(subscriptions, mutation, state)
```

这确保了：

1. 合并过程中不会触发多次订阅
2. 整个 $patch 操作只触发一次订阅回调
3. 订阅回调能看到完整的最终状态

## 类型安全

$patch 的类型是 `_DeepPartial<UnwrapRef<S>>`：

```typescript
type _DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object
    ? _DeepPartial<T[K]>
    : T[K]
}
```

这允许传入部分状态，不需要提供所有属性：

```typescript
interface State {
  name: string
  age: number
  profile: {
    avatar: string
    bio: string
  }
}

// 只更新部分属性
store.$patch({
  name: 'Bob'
  // 不需要提供 age 和 profile
})
```

## 返回值

$patch 没有返回值（void）：

```typescript
store.$patch({ count: 10 })  // undefined
```

这是有意的设计。$patch 是同步操作，执行完状态就已更新，不需要返回任何内容。

## 与直接修改的对比

对象模式 $patch 相比直接修改的优势：

1. 批量更新：一次性更新多个属性
2. 原子性：订阅只触发一次
3. 深度合并：不会丢失未指定的嵌套属性
4. 语义明确：明确表示这是一次 patch 操作

```typescript
// 直接修改，每次都触发订阅
store.name = 'Alice'
store.age = 25
store.city = 'NYC'

// $patch，只触发一次订阅
store.$patch({
  name: 'Alice',
  age: 25,
  city: 'NYC'
})
```

## 常见用法

更新表单数据：

```typescript
store.$patch({
  form: {
    username: formData.username,
    email: formData.email
  }
})
```

重置部分状态：

```typescript
store.$patch({
  searchQuery: '',
  currentPage: 1,
  filters: {}
})
```

合并 API 响应：

```typescript
const user = await fetchUser(id)
store.$patch({ user })
```

下一章我们将分析函数模式的 $patch 实现，它提供了更大的灵活性。
