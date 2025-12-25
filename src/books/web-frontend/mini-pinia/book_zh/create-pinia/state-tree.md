---
sidebar_position: 9
title: 全局状态树管理
---

# 全局状态树管理

Pinia 的全局状态树是状态管理的核心。本章将探讨状态树的设计理念、管理机制，以及它如何与各个 Store 协同工作。

## 状态树的作用

回顾一下，Pinia 实例中的 `state` 属性：

```typescript
state: Ref<Record<string, StateTree>>
```

这是一个响应式的对象，结构如下：

```typescript
{
  'storeId1': { /* store1 的状态 */ },
  'storeId2': { /* store2 的状态 */ },
  'storeId3': { /* store3 的状态 */ }
}
```

状态树承担着几个重要职责：

1. **集中存储**：所有 Store 的状态都在这里
2. **状态持久化**：可以序列化整棵树进行持久化或 SSR 水合
3. **DevTools 支持**：提供统一的状态视图
4. **状态快照**：支持状态的导出和恢复

## 状态注册机制

当一个 Store 首次被使用时，它的状态会被注册到状态树：

```typescript
function createSetupStore(id, setup, pinia) {
  // 检查状态树中是否已有该 Store 的状态
  const initialState = pinia.state.value[id]
  
  // 如果没有，创建一个空对象
  if (!initialState) {
    pinia.state.value[id] = {}
  }
  
  // 获取对该状态的引用
  const $state = pinia.state.value[id]
  
  // ... 后续处理
}
```

关键点：**状态是直接挂载到状态树上的**，Store 实例的 `$state` 属性只是一个引用。

让我们验证这一点：

```typescript
const pinia = createPinia()
const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0 })
})

// 使用 Store
const counter = useCounterStore()

// 验证引用关系
console.log(counter.$state === pinia.state.value.counter) // true

// 修改状态
counter.$state.count = 5
console.log(pinia.state.value.counter.count) // 5

// 反向修改
pinia.state.value.counter.count = 10
console.log(counter.$state.count) // 10
```

## 状态树与 reactive

状态树中的每个 Store 状态都是响应式的。让我们看看这是如何实现的：

```typescript
function createSetupStore(id, setup, pinia) {
  // pinia.state.value 是一个普通对象
  // 但每个 Store 的状态需要是响应式的
  
  if (!pinia.state.value[id]) {
    // 创建响应式状态
    pinia.state.value[id] = reactive({})
  }
  
  const $state = pinia.state.value[id]
  
  // 在 setup store 中，将 ref 和 reactive 的值同步到 $state
  const setupStore = scope.run(() => setup())
  
  for (const key in setupStore) {
    const prop = setupStore[key]
    
    if (isRef(prop) || isReactive(prop)) {
      // 将响应式数据同步到状态树
      $state[key] = prop
    }
  }
}
```

这里有一个细节：我们使用 `reactive` 来确保状态是响应式的。但问题是，`pinia.state.value` 本身是一个 `ref`，它的 `.value` 是一个普通对象，不是响应式的。

让我们看看 Pinia 源码中的处理方式：

```typescript
// Pinia 源码中的方法
export function createPinia(): Pinia {
  const state = ref<Record<string, StateTree>>({})
  
  // state.value 会在首次访问时被转换
  // 当我们设置 state.value[id] = reactive({}) 时
  // 这个 reactive 对象会被保留其响应性
}
```

## 状态初始化策略

### Options Store 的状态初始化

```typescript
function createOptionsStore(id, options, pinia) {
  const { state: stateFn, getters, actions } = options
  
  // 获取初始状态
  const initialState = stateFn ? stateFn() : {}
  
  // 注册到状态树
  if (!pinia.state.value[id]) {
    pinia.state.value[id] = initialState
  }
  
  // 获取状态引用
  const $state = toRefs(pinia.state.value[id])
  
  // ... 处理 getters 和 actions
}
```

Options Store 直接使用 `state()` 函数的返回值作为初始状态。

### Setup Store 的状态识别

Setup Store 更复杂，需要从返回值中识别状态：

```typescript
function createSetupStore(id, setup, pinia) {
  // 执行 setup 函数
  const setupStore = scope.run(() => setup())
  
  // 遍历返回值，识别不同类型
  for (const key in setupStore) {
    const prop = setupStore[key]
    
    if (isRef(prop) && !isComputed(prop)) {
      // ref（非 computed）→ state
      pinia.state.value[id][key] = prop.value
    } else if (isReactive(prop)) {
      // reactive → state
      pinia.state.value[id][key] = prop
    }
    // computed → getter（不加入 state）
    // function → action（不加入 state）
  }
}
```

## 状态同步问题

这里有一个微妙的问题：Setup Store 返回的 `ref` 和状态树中的值如何保持同步？

```typescript
const useCounterStore = defineStore('counter', () => {
  const count = ref(0)  // 这是 setup 中创建的 ref
  return { count }
})

// pinia.state.value.counter.count 需要与 count ref 同步
```

Pinia 的解决方案是**不直接存储值，而是存储引用**：

```typescript
function createSetupStore(id, setup, pinia) {
  const setupStore = scope.run(() => setup())
  
  for (const key in setupStore) {
    const prop = setupStore[key]
    
    if (isRef(prop) && !isComputed(prop)) {
      // 直接存储 ref 本身，而不是 ref.value
      pinia.state.value[id][key] = prop
    }
  }
}
```

但这带来另一个问题：状态树中存储的是 `Ref` 对象，而不是原始值。这在序列化时需要特殊处理。

实际上，Pinia 源码中的处理更加精细，它使用 `toRef` 来建立连接：

```typescript
// 简化的同步机制
const localState = toRef(pinia.state.value[id], key)

// localState 与 pinia.state.value[id][key] 双向同步
// 修改 localState.value 会影响状态树
// 修改状态树会影响 localState
```

## 状态树的序列化

状态树的一个重要用途是序列化，用于：
- 持久化存储
- SSR 水合
- 时间旅行调试

### 序列化

```typescript
// 获取完整状态
const serializedState = JSON.stringify(pinia.state.value)

// 保存到 localStorage
localStorage.setItem('pinia-state', serializedState)
```

### 反序列化（水合）

```typescript
// 从存储中恢复
const savedState = localStorage.getItem('pinia-state')

if (savedState) {
  pinia.state.value = JSON.parse(savedState)
}
```

但这里有个问题：`ref` 对象无法直接 JSON 序列化。Pinia 在内部处理了这个问题，确保状态树中存储的是可序列化的值。

## 实现状态树管理工具

让我们实现一些状态树的管理工具函数：

```typescript
// src/pinia/stateTree.ts

import type { Pinia, StateTree } from './types'

/**
 * 获取完整状态树的快照
 */
export function getStateSnapshot(pinia: Pinia): Record<string, StateTree> {
  const snapshot: Record<string, StateTree> = {}
  
  for (const id in pinia.state.value) {
    snapshot[id] = JSON.parse(JSON.stringify(pinia.state.value[id]))
  }
  
  return snapshot
}

/**
 * 恢复状态树
 */
export function restoreState(
  pinia: Pinia,
  state: Record<string, StateTree>
): void {
  for (const id in state) {
    if (pinia._s.has(id)) {
      // Store 已存在，使用 $patch 更新
      pinia._s.get(id)?.$patch(state[id])
    } else {
      // Store 还未创建，直接设置状态
      pinia.state.value[id] = state[id]
    }
  }
}

/**
 * 清空所有状态
 */
export function clearState(pinia: Pinia): void {
  for (const id of pinia._s.keys()) {
    pinia._s.get(id)?.$dispose()
  }
  pinia.state.value = {}
  pinia._s.clear()
}
```

## 状态隔离

在多个 Pinia 实例并存的场景（如微前端），状态隔离很重要：

```typescript
// 主应用
const mainPinia = createPinia()
mainApp.use(mainPinia)

// 子应用1
const subPinia1 = createPinia()
subApp1.use(subPinia1)

// 子应用2
const subPinia2 = createPinia()
subApp2.use(subPinia2)

// 每个 Pinia 实例有独立的状态树
// mainPinia.state.value 与 subPinia1.state.value 完全独立
```

## 本章小结

本章我们深入探讨了全局状态树的管理：

1. **状态树结构**：以 Store ID 为键，Store 状态为值的响应式对象

2. **注册机制**：Store 创建时自动注册状态到状态树

3. **引用关系**：Store 的 `$state` 与状态树中的对应项是同一个引用

4. **序列化支持**：状态树可以序列化用于持久化和 SSR

5. **状态隔离**：每个 Pinia 实例有独立的状态树

下一章我们将实现 `install` 方法，完成 Pinia 与 Vue 的集成。

---

**下一章**：[install 方法与 Vue 集成](install-method.md)
