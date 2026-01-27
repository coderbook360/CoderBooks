# 实现 $patch

`$patch` 是批量更新 State 的方法。这一章实现 `$patch` 机制。

## $patch 特性

- 批量更新多个 state 属性
- 支持对象模式和函数模式
- 触发一次订阅通知

## 两种调用方式

```typescript
// 对象模式
store.$patch({
  count: 10,
  name: 'new name'
})

// 函数模式（推荐用于复杂更新）
store.$patch((state) => {
  state.items.push({ id: 1 })
  state.count++
})
```

## 实现对象模式

合并对象到 state：

```typescript
function $patch(partialStateOrMutator: object | Function) {
  if (typeof partialStateOrMutator === 'object') {
    // 对象模式：合并到 state
    mergeReactiveObjects(pinia.state.value[$id], partialStateOrMutator)
  }
}
```

## 深度合并

需要递归合并嵌套对象：

```typescript
function mergeReactiveObjects(
  target: Record<string, any>,
  patchToApply: Record<string, any>
): Record<string, any> {
  for (const key in patchToApply) {
    const subPatch = patchToApply[key]
    const targetValue = target[key]
    
    // 如果两者都是普通对象，递归合并
    if (
      isPlainObject(targetValue) &&
      isPlainObject(subPatch) &&
      !isRef(subPatch) &&
      !isReactive(subPatch)
    ) {
      target[key] = mergeReactiveObjects(targetValue, subPatch)
    } else {
      // 否则直接赋值
      target[key] = subPatch
    }
  }
  
  return target
}

function isPlainObject(o: any): o is Record<string, any> {
  return (
    o !== null &&
    typeof o === 'object' &&
    Object.prototype.toString.call(o) === '[object Object]' &&
    typeof o.toJSON !== 'function'
  )
}
```

## 实现函数模式

直接调用函数，传入 state：

```typescript
function $patch(partialStateOrMutator: object | Function) {
  if (typeof partialStateOrMutator === 'function') {
    // 函数模式：调用函数
    partialStateOrMutator(pinia.state.value[$id])
  } else {
    // 对象模式
    mergeReactiveObjects(pinia.state.value[$id], partialStateOrMutator)
  }
}
```

## 完整实现

```typescript
// src/patch.ts
import { isRef, isReactive } from 'vue'
import type { StateTree } from './types'

/**
 * 判断是否为普通对象
 */
export function isPlainObject(o: any): o is Record<string, any> {
  return (
    o !== null &&
    typeof o === 'object' &&
    Object.prototype.toString.call(o) === '[object Object]' &&
    typeof o.toJSON !== 'function'
  )
}

/**
 * 深度合并响应式对象
 */
export function mergeReactiveObjects(
  target: StateTree,
  patchToApply: Record<string, any>
): StateTree {
  for (const key in patchToApply) {
    // 跳过原型链上的属性
    if (!patchToApply.hasOwnProperty(key)) continue
    
    const subPatch = patchToApply[key]
    const targetValue = target[key]
    
    // 深度合并条件：
    // 1. 目标值是普通对象
    // 2. 补丁值是普通对象
    // 3. 补丁值不是 ref 或 reactive
    if (
      isPlainObject(targetValue) &&
      isPlainObject(subPatch) &&
      target.hasOwnProperty(key) &&
      !isRef(subPatch) &&
      !isReactive(subPatch)
    ) {
      // 递归合并
      target[key] = mergeReactiveObjects(targetValue, subPatch)
    } else {
      // 直接赋值
      target[key] = subPatch
    }
  }
  
  return target
}

/**
 * 创建 $patch 方法
 */
export function createPatch(
  $id: string,
  getState: () => StateTree
) {
  return function $patch(
    partialStateOrMutator:
      | Partial<StateTree>
      | ((state: StateTree) => void)
  ): void {
    const state = getState()
    
    if (typeof partialStateOrMutator === 'function') {
      // 函数模式
      partialStateOrMutator(state)
    } else {
      // 对象模式
      mergeReactiveObjects(state, partialStateOrMutator)
    }
  }
}
```

## 集成到 Store

```typescript
function createOptionsStore(id, options, pinia) {
  // ... 前面的代码
  
  // 创建 $patch
  const $patch = createPatch(id, () => pinia.state.value[id])
  
  // 添加到 store
  store.$patch = $patch
  
  // ...
}
```

## 对象模式 vs 函数模式

**对象模式**适合简单更新：

```typescript
store.$patch({
  name: 'new name',
  count: 10
})
```

**函数模式**适合复杂操作：

```typescript
// 数组操作
store.$patch((state) => {
  state.items.push(newItem)
  state.items = state.items.filter(i => i.active)
})

// 条件更新
store.$patch((state) => {
  if (state.count > 10) {
    state.count = 10
  }
})
```

## 为什么需要 $patch

比较直接修改和 $patch：

```typescript
// 直接修改：多次触发订阅
store.count++
store.name = 'new'
store.active = true

// $patch：一次触发
store.$patch({
  count: store.count + 1,
  name: 'new',
  active: true
})
```

配合订阅系统，$patch 可以减少不必要的更新通知。

## 测试

```typescript
// tests/patch.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from '../src/createPinia'
import { defineStore } from '../src/defineStore'

describe('$patch', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  
  describe('object mode', () => {
    it('should patch state with object', () => {
      const useStore = defineStore('test', {
        state: () => ({
          count: 0,
          name: 'old'
        })
      })
      
      const store = useStore()
      store.$patch({
        count: 10,
        name: 'new'
      })
      
      expect(store.count).toBe(10)
      expect(store.name).toBe('new')
    })
    
    it('should deep merge objects', () => {
      const useStore = defineStore('test', {
        state: () => ({
          user: {
            name: 'John',
            settings: {
              theme: 'dark',
              language: 'en'
            }
          }
        })
      })
      
      const store = useStore()
      store.$patch({
        user: {
          settings: {
            theme: 'light'
          }
        }
      })
      
      expect(store.user.name).toBe('John')
      expect(store.user.settings.theme).toBe('light')
      expect(store.user.settings.language).toBe('en')
    })
    
    it('should replace arrays', () => {
      const useStore = defineStore('test', {
        state: () => ({
          items: [1, 2, 3]
        })
      })
      
      const store = useStore()
      store.$patch({
        items: [4, 5]
      })
      
      expect(store.items).toEqual([4, 5])
    })
  })
  
  describe('function mode', () => {
    it('should patch state with function', () => {
      const useStore = defineStore('test', {
        state: () => ({
          count: 0
        })
      })
      
      const store = useStore()
      store.$patch((state) => {
        state.count = 10
      })
      
      expect(store.count).toBe(10)
    })
    
    it('should allow array mutations', () => {
      const useStore = defineStore('test', {
        state: () => ({
          items: [1, 2, 3]
        })
      })
      
      const store = useStore()
      store.$patch((state) => {
        state.items.push(4)
        state.items.shift()
      })
      
      expect(store.items).toEqual([2, 3, 4])
    })
    
    it('should allow conditional updates', () => {
      const useStore = defineStore('test', {
        state: () => ({
          count: 15
        })
      })
      
      const store = useStore()
      store.$patch((state) => {
        if (state.count > 10) {
          state.count = 10
        }
      })
      
      expect(store.count).toBe(10)
    })
  })
})
```

## 与订阅系统集成

完整的 $patch 需要触发订阅通知。我们在实现 $subscribe 后会完善这部分。

```typescript
function $patch(partialStateOrMutator) {
  // ... 更新逻辑
  
  // 触发订阅
  triggerSubscriptions(subscriptions, {
    storeId: $id,
    type: 'patch',
    payload: partialStateOrMutator
  })
}
```

下一章我们实现 `$reset` 方法。
