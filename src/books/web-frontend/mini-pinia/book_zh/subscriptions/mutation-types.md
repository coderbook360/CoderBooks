---
sidebar_position: 43
title: MutationType 类型定义
---

# MutationType 类型定义

MutationType 是 Pinia 订阅系统中用于标识状态变更方式的枚举类型。本章详细定义和使用这个类型。

## MutationType 枚举

```typescript
enum MutationType {
  direct = 'direct',
  patchObject = 'patch object',
  patchFunction = 'patch function'
}
```

三种类型对应三种状态修改方式：

| 类型 | 触发方式 | 示例 |
|------|---------|------|
| `direct` | 直接赋值 | `store.count = 10` |
| `patch object` | $patch 对象模式 | `store.$patch({ count: 10 })` |
| `patch function` | $patch 函数模式 | `store.$patch(s => s.count++)` |

## JavaScript 实现

JavaScript 中没有枚举，使用常量对象：

```javascript
const MutationType = {
  direct: 'direct',
  patchObject: 'patch object',
  patchFunction: 'patch function'
}

// 冻结防止修改
Object.freeze(MutationType)
```

使用：

```javascript
store.$subscribe((mutation, state) => {
  switch (mutation.type) {
    case MutationType.direct:
      console.log('Direct mutation')
      break
    case MutationType.patchObject:
      console.log('Patch object:', mutation.payload)
      break
    case MutationType.patchFunction:
      console.log('Patch function')
      break
  }
})
```

## SubscriptionCallback 类型

完整的订阅回调类型定义：

```typescript
interface MutationPayload {
  type: MutationType
  storeId: string
  events?: DebuggerEvent | DebuggerEvent[]
  payload?: Record<string, unknown>  // 仅 patchObject 有
}

type SubscriptionCallback<S = unknown> = (
  mutation: MutationPayload,
  state: S
) => void

interface SubscriptionOptions {
  detached?: boolean
  flush?: 'pre' | 'post' | 'sync'
}
```

## 各类型的详细说明

### direct - 直接修改

```javascript
store.count = 10
store.$state.name = 'Test'
```

特点：
- 最常用的修改方式
- 每次赋值都触发一次订阅
- 通过 Vue 响应式系统检测

触发订阅：

```javascript
{
  type: 'direct',
  storeId: 'counter',
  events: DebuggerEvent  // Vue 响应式调试事件
}
```

### patchObject - 对象模式

```javascript
store.$patch({ count: 10, name: 'Test' })
```

特点：
- 批量更新，只触发一次订阅
- 携带 payload 信息
- 适合简单的状态合并

触发订阅：

```javascript
{
  type: 'patch object',
  storeId: 'counter',
  payload: { count: 10, name: 'Test' }
}
```

### patchFunction - 函数模式

```javascript
store.$patch(state => {
  state.count++
  state.items.push('item')
})
```

特点：
- 灵活的更新逻辑
- 只触发一次订阅
- 没有 payload（操作难以序列化）

触发订阅：

```javascript
{
  type: 'patch function',
  storeId: 'counter'
  // 没有 payload
}
```

## DebuggerEvent

`events` 字段在开发环境下包含 Vue 响应式调试信息：

```typescript
interface DebuggerEvent {
  effect: ReactiveEffect
  target: object
  type: TriggerOpTypes  // 'set' | 'add' | 'delete' | 'clear'
  key: string | symbol
  newValue?: unknown
  oldValue?: unknown
}
```

使用示例：

```javascript
store.$subscribe((mutation, state) => {
  if (mutation.events) {
    // 可能是单个事件或事件数组
    const events = Array.isArray(mutation.events) 
      ? mutation.events 
      : [mutation.events]
    
    events.forEach(event => {
      console.log(`Key "${event.key}" changed:`, {
        type: event.type,
        oldValue: event.oldValue,
        newValue: event.newValue
      })
    })
  }
})
```

## 实现中的使用

### 在 $patch 中设置类型

```javascript
function $patch(partialStateOrMutator) {
  let mutation
  
  if (typeof partialStateOrMutator === 'function') {
    partialStateOrMutator(pinia.state.value[id])
    mutation = {
      type: MutationType.patchFunction,
      storeId: id
    }
  } else {
    mergeReactiveObjects(pinia.state.value[id], partialStateOrMutator)
    mutation = {
      type: MutationType.patchObject,
      storeId: id,
      payload: partialStateOrMutator
    }
  }
  
  triggerSubscriptions(mutation, pinia.state.value[id])
}
```

### 检测直接修改

直接修改通过 Vue 的 `watch` 检测：

```javascript
function setupDirectMutationDetection(store, pinia, id) {
  const scope = effectScope()
  
  scope.run(() => {
    watch(
      () => pinia.state.value[id],
      (state, oldState) => {
        // 直接修改触发
        triggerSubscriptions(
          {
            type: MutationType.direct,
            storeId: id
          },
          state
        )
      },
      {
        deep: true,
        flush: 'sync'
      }
    )
  })
}
```

## 订阅中的类型判断

常见的订阅处理模式：

```javascript
store.$subscribe((mutation, state) => {
  const { type, storeId, payload } = mutation
  
  // 日志记录
  const logEntry = {
    timestamp: Date.now(),
    store: storeId,
    type
  }
  
  if (type === MutationType.patchObject) {
    logEntry.changes = payload
  }
  
  console.log('State mutation:', logEntry)
  
  // 持久化逻辑可能根据类型不同处理
  if (type !== MutationType.direct) {
    // $patch 可以批量处理
    debouncedSave(storeId, state)
  } else {
    // 直接修改可能需要立即保存
    immediateSave(storeId, state)
  }
})
```

## 与 DevTools 的集成

DevTools 使用 MutationType 显示操作历史：

```javascript
function sendToDevtools(mutation, state) {
  if (!devtools) return
  
  const label = {
    [MutationType.direct]: '📝 Direct',
    [MutationType.patchObject]: '📦 Patch',
    [MutationType.patchFunction]: '⚡ Patch (fn)'
  }[mutation.type]
  
  devtools.emit('mutation', {
    label,
    type: mutation.type,
    storeId: mutation.storeId,
    state: JSON.parse(JSON.stringify(state)),
    payload: mutation.payload
  })
}
```

## 类型导出

在 Pinia 中导出类型供外部使用：

```javascript
// index.js
export { MutationType }

// 使用
import { MutationType } from 'pinia'

store.$subscribe((mutation) => {
  if (mutation.type === MutationType.patchObject) {
    // ...
  }
})
```

## 测试用例

```javascript
describe('MutationType', () => {
  test('direct mutation type', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 0 })
    })
    
    const store = useStore()
    const callback = vi.fn()
    
    store.$subscribe(callback)
    store.count = 10
    
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ type: MutationType.direct }),
      expect.anything()
    )
  })
  
  test('patchObject mutation type', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 0 })
    })
    
    const store = useStore()
    const callback = vi.fn()
    
    store.$subscribe(callback)
    store.$patch({ count: 10 })
    
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        type: MutationType.patchObject,
        payload: { count: 10 }
      }),
      expect.anything()
    )
  })
  
  test('patchFunction mutation type', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 0 })
    })
    
    const store = useStore()
    const callback = vi.fn()
    
    store.$subscribe(callback)
    store.$patch(s => { s.count++ })
    
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ type: MutationType.patchFunction }),
      expect.anything()
    )
    // patchFunction 没有 payload
    expect(callback.mock.calls[0][0].payload).toBeUndefined()
  })
})
```

## 本章小结

本章定义了 MutationType：

- **三种类型**：direct、patchObject、patchFunction
- **用途**：标识状态变更的来源
- **payload**：仅 patchObject 携带
- **events**：开发环境下的调试信息
- **应用场景**：日志、持久化、DevTools

下一章实现 $subscribe 订阅功能。
