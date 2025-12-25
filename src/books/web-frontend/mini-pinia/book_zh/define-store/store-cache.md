---
sidebar_position: 17
title: Store 缓存与复用机制
---

# Store 缓存与复用机制

Pinia 的一个核心特性是 Store 的单例性：同一个 Store 在整个应用中只有一个实例。本章将深入分析这个缓存与复用机制。

## 单例模式的实现

Store 的单例性通过注册表实现：

```typescript
function useStore(pinia: Pinia): Store {
  const id = useStore.$id
  
  // 检查是否已存在
  if (!pinia._s.has(id)) {
    // 首次创建
    const store = createStore(id, options, pinia)
    pinia._s.set(id, store)
  }
  
  // 返回缓存的实例
  return pinia._s.get(id)!
}
```

这个模式的效果：

```typescript
// 在组件 A 中
const counterA = useCounterStore()
counterA.count = 5

// 在组件 B 中
const counterB = useCounterStore()
console.log(counterB.count) // 5，同一个实例

// 验证同一性
console.log(counterA === counterB) // true
```

## 为什么需要单例？

思考一下，如果每次调用 `useStore` 都创建新实例会怎样？

```typescript
// 假设每次都创建新实例
const counter1 = useCounterStore()  // 实例 A
counter1.count = 5

const counter2 = useCounterStore()  // 实例 B（新的）
console.log(counter2.count) // 0，不是 5！

// 两个组件看到不同的状态
// 这就不是"共享状态"了
```

单例确保了：
1. **状态共享**：所有组件看到相同的状态
2. **状态同步**：一处修改，处处更新
3. **内存效率**：只有一个实例

## 缓存的生命周期

Store 实例的生命周期与 Pinia 实例绑定：

```typescript
// 创建 Pinia
const pinia = createPinia()

// 首次使用 Store（创建）
const counter = useCounterStore(pinia)

// 后续使用（复用）
const counter2 = useCounterStore(pinia)

// 手动销毁
counter.$dispose()
// 现在 pinia._s.has('counter') === false

// 再次使用（重新创建）
const counter3 = useCounterStore(pinia)
// 新的实例，状态重置
```

## $dispose 与缓存清理

`$dispose` 方法不仅停止副作用，还清理缓存：

```typescript
function createStore(id: string, options: any, pinia: Pinia) {
  const scope = effectScope(true)
  
  // ... 创建 store
  
  const store = {
    $id: id,
    // ...
    
    $dispose() {
      // 1. 停止 effect scope
      scope.stop()
      
      // 2. 清理订阅
      subscriptions.length = 0
      actionSubscriptions.length = 0
      
      // 3. 从注册表中删除（关键！）
      pinia._s.delete(id)
      
      // 4. 从状态树中删除
      delete pinia.state.value[id]
    }
  }
  
  return store
}
```

调用 `$dispose` 后：

```typescript
const counter = useCounterStore()
counter.count = 5

counter.$dispose()

// 再次获取 Store
const counter2 = useCounterStore()
console.log(counter2.count) // 0，新实例，状态已重置

console.log(counter === counter2) // false，不同实例
```

## 多 Pinia 实例

不同的 Pinia 实例有独立的缓存：

```typescript
const pinia1 = createPinia()
const pinia2 = createPinia()

const counter1 = useCounterStore(pinia1)
counter1.count = 5

const counter2 = useCounterStore(pinia2)
counter2.count = 10

console.log(counter1.count) // 5
console.log(counter2.count) // 10
console.log(counter1 === counter2) // false，不同实例
```

这在以下场景很有用：

1. **微前端**：每个子应用有独立的 Pinia
2. **测试隔离**：每个测试用例有独立的 Pinia
3. **SSR**：每个请求有独立的 Pinia

```typescript
// 测试中
describe('counter store', () => {
  beforeEach(() => {
    // 每个测试有干净的 Pinia
    setActivePinia(createPinia())
  })
  
  it('test 1', () => {
    const counter = useCounterStore()
    counter.count = 5
    // ...
  })
  
  it('test 2', () => {
    const counter = useCounterStore()
    // counter.count === 0，因为是新的 Pinia 实例
  })
})
```

## 热更新（HMR）支持

热更新时需要特殊处理缓存：

```typescript
// 当 Store 定义变化时
// 1. 保留旧 Store 的状态
// 2. 替换 Store 的行为（getters、actions）

function handleHotUpdate(pinia: Pinia, id: string, newStore: any) {
  const oldStore = pinia._s.get(id)
  
  if (!oldStore) {
    // 没有旧 Store，直接使用新的
    return
  }
  
  // 保留状态
  const oldState = oldStore.$state
  
  // 替换为新 Store
  pinia._s.set(id, {
    ...newStore,
    $state: oldState  // 保留旧状态
  })
}
```

Pinia 官方通过 `_hotUpdate` 属性支持 HMR：

```typescript
const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0 }),
  actions: {
    increment() { this.count++ }
  }
})

// HMR 代码（由 Vite 插件自动添加）
if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useCounterStore, import.meta.hot))
}
```

## 缓存失效场景

### 场景一：显式 $dispose

```typescript
const counter = useCounterStore()
counter.$dispose()
// 缓存失效，下次调用会创建新实例
```

### 场景二：Pinia 实例被替换

```typescript
const pinia1 = createPinia()
app.use(pinia1)

// 后来换了一个 Pinia（不常见）
const pinia2 = createPinia()
setActivePinia(pinia2)

// 使用的是 pinia2，pinia1 的缓存不可访问
```

### 场景三：SSR 请求结束

```typescript
// 服务端渲染
export async function render() {
  const pinia = createPinia()
  const app = createSSRApp(App)
  app.use(pinia)
  
  // 渲染
  await renderToString(app)
  
  // 请求结束，pinia 被垃圾回收
  // 缓存自然失效
}
```

## 性能考虑

### 缓存的好处

1. **避免重复创建**：创建 Store 有成本（setup 执行、响应式转换）
2. **共享计算结果**：computed getters 只计算一次
3. **订阅效率**：订阅者共享，不需要重复设置

### 潜在的内存问题

如果动态创建大量 Store：

```typescript
// 为每个实体创建 Store
function getEntityStore(id: string) {
  return defineStore(`entity-${id}`, {
    state: () => ({ data: null })
  })
}

// 如果有很多实体...
for (let i = 0; i < 10000; i++) {
  const useStore = getEntityStore(`entity-${i}`)
  const store = useStore()  // 10000 个 Store 实例！
}
```

解决方案：

```typescript
// 方案一：使用单一 Store 管理所有实体
const useEntitiesStore = defineStore('entities', {
  state: () => ({
    entities: {} as Record<string, Entity>
  }),
  actions: {
    setEntity(id: string, data: Entity) {
      this.entities[id] = data
    }
  }
})

// 方案二：及时清理不需要的 Store
function useTemporaryStore(id: string) {
  const store = useEntityStore(id)
  
  onUnmounted(() => {
    store.$dispose()  // 组件卸载时清理
  })
  
  return store
}
```

## 实现 Store 状态重置

利用缓存机制实现"软重置"：

```typescript
// 不使用 $dispose，只重置状态
function resetStoreState(store: Store) {
  // 获取初始状态
  const initialState = store.$options.state?.() ?? {}
  
  // 重置为初始状态
  store.$patch(initialState)
}

// 使用
const counter = useCounterStore()
counter.count = 100
resetStoreState(counter)
console.log(counter.count) // 0（或初始值）
```

这与 `$dispose` + 重新获取不同：

```typescript
// 软重置：保持同一实例，重置状态
const counter1 = useCounterStore()
counter1.count = 100
resetStoreState(counter1)
const counter2 = useCounterStore()
console.log(counter1 === counter2) // true，同一实例

// 硬重置：新实例，新状态
const counter3 = useCounterStore()
counter3.count = 100
counter3.$dispose()
const counter4 = useCounterStore()
console.log(counter3 === counter4) // false，不同实例
```

## 本章小结

本章我们深入分析了 Store 的缓存与复用机制：

1. **单例实现**：通过注册表 Map 确保每个 ID 只有一个实例

2. **生命周期**：与 Pinia 实例绑定，$dispose 可清理缓存

3. **多实例隔离**：不同 Pinia 实例有独立缓存

4. **HMR 支持**：热更新时保留状态，更新行为

5. **性能考虑**：缓存提升性能，但要注意内存管理

下一章我们将实现热更新支持。

---

**下一章**：[热更新支持](hot-update.md)
