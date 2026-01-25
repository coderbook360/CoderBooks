# actions 上下文绑定

Actions 的 this 绑定确保它们能正确访问 Store 的状态和其他方法。这一章分析上下文绑定的实现细节。

## this 绑定机制

wrapAction 中的绑定逻辑：

```typescript
function wrapAction(name: string, action: _Method) {
  return function (this: Store, ...args: any[]) {
    // ...
    let ret: unknown
    try {
      ret = action.apply(this && this.$id === $id ? this : store, args)
    } catch (error) {
      // ...
    }
    // ...
  }
}
```

判断条件 `this && this.$id === $id` 检查：

1. this 存在
2. this 是正确的 Store（通过 $id 匹配）

如果条件满足，使用调用时的 this；否则使用闭包中捕获的 store。

## 正常调用

通过 Store 对象调用时：

```typescript
const store = useCounterStore()
store.increment()

// 此时 this === store
// this.$id === 'counter' === $id
// 使用 store 作为 this
```

## 解构调用

解构后调用：

```typescript
const { increment } = store
increment()

// 此时 this === undefined（严格模式）
// 条件不满足，使用闭包中的 store
```

这确保了解构后 action 仍能正常工作。

## 作为回调传递

将 action 作为回调传递：

```typescript
const store = useCounterStore()

// 作为事件处理器
button.addEventListener('click', store.increment)

// 此时 this === button
// this.$id 不存在或不匹配
// 使用闭包中的 store
```

## 箭头函数与普通函数

Options Store 中使用箭头函数：

```typescript
// ❌ 错误：箭头函数没有自己的 this
actions: {
  increment: () => {
    this.count++  // this 是外层作用域，不是 store
  }
}

// ✅ 正确：使用普通函数
actions: {
  increment() {
    this.count++  // this 是 store
  }
}
```

箭头函数在定义时绑定 this，而 Options 对象中没有合适的 this。

## Setup Store 中的 this

Setup Store 不使用 this：

```typescript
const useCounterStore = defineStore('counter', () => {
  const count = ref(0)
  
  // 直接访问 ref，不需要 this
  function increment() {
    count.value++
  }
  
  // 箭头函数也可以
  const decrement = () => {
    count.value--
  }
  
  return { count, increment, decrement }
})
```

Setup Store 中函数通过闭包访问响应式变量，不依赖 this。

## 访问其他 actions

Options Store 中通过 this 访问其他 actions：

```typescript
actions: {
  increment() {
    this.count++
  },
  incrementTwice() {
    this.increment()
    this.increment()
  }
}
```

Setup Store 直接调用：

```typescript
const useStore = defineStore('demo', () => {
  const count = ref(0)
  
  function increment() {
    count.value++
  }
  
  function incrementTwice() {
    increment()  // 直接调用
    increment()
  }
  
  return { count, increment, incrementTwice }
})
```

## 访问 getters

Options Store 中通过 this 访问 getters：

```typescript
getters: {
  double: (state) => state.count * 2
},
actions: {
  logDouble() {
    console.log(this.double)  // 通过 this 访问 getter
  }
}
```

Setup Store 直接使用 computed：

```typescript
const double = computed(() => count.value * 2)

function logDouble() {
  console.log(double.value)
}
```

## 访问 $patch 等内置方法

Options Store action 可以访问内置方法：

```typescript
actions: {
  batchUpdate(data: Partial<State>) {
    this.$patch(data)
  },
  reset() {
    this.$reset()
  }
}
```

Setup Store 需要通过返回的 Store 实例：

```typescript
const useStore = defineStore('demo', () => {
  const count = ref(0)
  
  function reset() {
    count.value = 0
  }
  
  return { count, reset }
})

// 组件中
const store = useStore()
store.$patch({ count: 10 })  // 使用内置方法
store.reset()                // 自定义 reset
```

## 类型中的 this

TypeScript 正确推断 this 类型：

```typescript
actions: {
  example() {
    // this 类型包含：
    // - 所有 state 属性
    // - 所有 getters
    // - 所有 actions
    // - 内置方法 ($patch, $reset, $subscribe 等)
    
    this.count         // number
    this.double        // number (getter)
    this.increment     // () => void (action)
    this.$patch        // (partial) => void
  }
}
```

这是通过 TypeScript 的 ThisType 工具类型实现的。

## 绑定丢失的场景

某些场景可能导致绑定问题：

```typescript
const store = useStore()

// 问题场景 1：setTimeout 中直接调用
setTimeout(store.increment, 1000)  // ✅ 正常工作（wrapAction 处理了）

// 问题场景 2：数组方法中
[1, 2, 3].forEach(store.increment)  // ⚠️ 每次调用 this 是数组

// 问题场景 3：Promise 回调
promise.then(store.handleResult)  // ✅ 正常工作
```

由于 wrapAction 的保护，大多数场景都能正常工作。

## 显式绑定

如果需要显式绑定：

```typescript
const store = useStore()

// 使用 bind
const boundIncrement = store.increment.bind(store)

// 使用箭头函数
const wrappedIncrement = () => store.increment()
```

但通常不需要，wrapAction 已经处理了。

## 测试中的 this

测试 action 时 this 正确绑定：

```typescript
test('action can access state', () => {
  const store = useStore()
  
  store.count = 5
  store.increment()
  
  expect(store.count).toBe(6)
})

test('action can call other actions', () => {
  const store = useStore()
  
  store.incrementTwice()
  
  expect(store.count).toBe(2)
})
```

## 插件中的 action

插件可以添加或修改 actions：

```typescript
pinia.use(({ store }) => {
  // 添加新 action
  store.customAction = function() {
    // this 是 store
    this.$patch({ custom: true })
  }
  
  // 包装现有 action
  const originalIncrement = store.increment
  store.increment = function(...args) {
    console.log('before increment')
    const result = originalIncrement.apply(this, args)
    console.log('after increment')
    return result
  }
})
```

注意使用 function 而不是箭头函数，以保持 this 绑定。

## 最佳实践

Options Store 中始终使用普通函数：

```typescript
actions: {
  doSomething() {  // 普通函数，this 正确
    // ...
  }
}
```

Setup Store 中利用闭包，无需关心 this：

```typescript
const useStore = defineStore('demo', () => {
  const state = reactive({ count: 0 })
  
  function doSomething() {
    // 直接访问 state
    state.count++
  }
  
  return { ...toRefs(state), doSomething }
})
```

下一章我们将分析跨 Store 的 actions。
