# actions 实现机制

Actions 是 Store 中可以执行副作用和异步操作的函数。这一章分析 actions 的内部实现。

## Actions 的定义

Options Store 中定义 actions：

```typescript
const useCounterStore = defineStore('counter', {
  state: () => ({
    count: 0
  }),
  actions: {
    increment() {
      this.count++
    },
    async fetchAndSet(id: number) {
      const data = await api.fetch(id)
      this.count = data.count
    }
  }
})
```

Setup Store 中直接定义函数：

```typescript
const useCounterStore = defineStore('counter', () => {
  const count = ref(0)
  
  function increment() {
    count.value++
  }
  
  async function fetchAndSet(id: number) {
    const data = await api.fetch(id)
    count.value = data.count
  }
  
  return { count, increment, fetchAndSet }
})
```

## Action 的包装

所有 action 都经过 wrapAction 函数包装：

```typescript
function wrapAction(name: string, action: _Method) {
  return function (this: Store, ...args: any[]) {
    setActivePinia(pinia)
    
    const afterCallbackList: Array<(resolvedReturn: any) => any> = []
    const onErrorCallbackList: Array<(error: unknown) => unknown> = []
    
    function after(callback: typeof afterCallbackList[number]) {
      afterCallbackList.push(callback)
    }
    function onError(callback: typeof onErrorCallbackList[number]) {
      onErrorCallbackList.push(callback)
    }

    // 触发 $onAction 订阅
    triggerSubscriptions(actionSubscriptions, {
      args,
      name,
      store,
      after,
      onError,
    })

    let ret: unknown
    try {
      ret = action.apply(this && this.$id === $id ? this : store, args)
    } catch (error) {
      triggerSubscriptions(onErrorCallbackList, error)
      throw error
    }

    // 处理返回值
    if (ret instanceof Promise) {
      return ret
        .then((value) => {
          triggerSubscriptions(afterCallbackList, value)
          return value
        })
        .catch((error) => {
          triggerSubscriptions(onErrorCallbackList, error)
          return Promise.reject(error)
        })
    }

    triggerSubscriptions(afterCallbackList, ret)
    return ret
  }
}
```

这个包装器实现了 $onAction 订阅机制。

## setActivePinia 调用

action 执行前设置 activePinia：

```typescript
setActivePinia(pinia)
```

这确保了 action 内部调用其他 useXxxStore 时能正确获取 pinia 实例。

## this 绑定

action 的 this 绑定逻辑：

```typescript
ret = action.apply(this && this.$id === $id ? this : store, args)
```

如果调用时的 this 是正确的 Store（通过 $id 判断），使用它。否则使用创建时的 store 引用。

这处理了解构调用的情况：

```typescript
const { increment } = store

// 解构后直接调用，this 是 undefined
increment()  // 但仍能正确工作，因为会回退到 store
```

## $onAction 订阅触发

action 执行前触发订阅：

```typescript
triggerSubscriptions(actionSubscriptions, {
  args,      // 调用参数
  name,      // action 名称
  store,     // Store 实例
  after,     // 注册 after 回调
  onError,   // 注册 onError 回调
})
```

订阅者可以在这里做日志、验证等操作。

## 同步和异步处理

action 返回值的处理区分同步和异步：

```typescript
if (ret instanceof Promise) {
  return ret
    .then((value) => {
      triggerSubscriptions(afterCallbackList, value)
      return value
    })
    .catch((error) => {
      triggerSubscriptions(onErrorCallbackList, error)
      return Promise.reject(error)
    })
}

triggerSubscriptions(afterCallbackList, ret)
return ret
```

异步 action 的 after 回调在 Promise resolve 后触发，onError 在 reject 后触发。

## 错误处理

同步错误直接捕获并触发 onError：

```typescript
try {
  ret = action.apply(...)
} catch (error) {
  triggerSubscriptions(onErrorCallbackList, error)
  throw error  // 重新抛出
}
```

异步错误通过 Promise catch 处理。两种情况都会重新抛出错误，不会吞掉异常。

## 注册到 optionsForPlugin

action 被记录到插件配置：

```typescript
if (typeof prop === 'function') {
  const actionValue = wrapAction(key, prop)
  setupStore[key] = actionValue
  
  // 记录原始 action，供插件使用
  optionsForPlugin.actions[key] = prop
}
```

插件可以访问原始的 action 函数进行分析或增强。

## Action 与 Getter 的区别

从实现角度：

```typescript
// Getter：包装为 computed
computedGetters[name] = markRaw(computed(() => getters![name].call(store, store)))

// Action：包装为带订阅的函数
setupStore[key] = wrapAction(key, prop)
```

Getter 是惰性计算的 computed，Action 是主动调用的函数。

从使用角度：

- Getter：派生状态，只读，有缓存
- Action：执行操作，可修改状态，可异步

## Setup Store 的 Action

Setup Store 返回的函数被识别为 action：

```typescript
for (const key in setupStore) {
  const prop = setupStore[key]

  if (typeof prop === 'function') {
    // 函数被当作 action 处理
    setupStore[key] = wrapAction(key, prop)
  }
}
```

这意味着 Setup Store 中的所有函数都会被包装，获得 $onAction 支持。

## 类型安全

TypeScript 保留 action 的类型：

```typescript
actions: {
  increment() {
    this.count++
  },
  add(amount: number) {
    this.count += amount
  },
  async fetch(id: string): Promise<Data> {
    return await api.fetch(id)
  }
}

const store = useStore()
store.increment()           // () => void
store.add(5)                // (amount: number) => void
store.fetch('1')            // (id: string) => Promise<Data>
```

Options Store 的 this 类型也被正确推断，可以访问 state 和其他 actions。

## 性能考量

action 包装增加了一些开销：

1. setActivePinia 调用
2. triggerSubscriptions 调用
3. 错误处理包装
4. 返回值处理

对于大多数应用，这些开销可以忽略。但在极端高频场景（如动画帧更新），可以考虑直接操作状态：

```typescript
// 高频更新时直接操作
function tick() {
  store.position = calculateNewPosition()  // 直接赋值
  requestAnimationFrame(tick)
}

// 而不是通过 action
function tick() {
  store.updatePosition()  // 每帧都有额外开销
  requestAnimationFrame(tick)
}
```

下一章我们将深入分析 actions 的异步处理。
