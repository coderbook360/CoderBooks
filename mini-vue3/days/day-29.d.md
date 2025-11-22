# Day 29: 浅尝辄止 - shallowReactive 的实现

你好，我是你的技术导师。

在 Day 4 中，我们实现了 `reactive`，并且特别强调了它是"深度响应式"的（Lazy Deep Reactive）。
也就是说，当你访问 `state.nested.count` 时，Vue 会自动帮你把 `nested` 也变成响应式对象。

这通常是我们想要的。但在某些场景下，这种"过度热情"反而是一种负担。
比如，你有一个巨大的不可变数据列表，或者你只想监听最外层引用的变化。

这时，我们需要一个"冷漠"一点的 API —— `shallowReactive`（浅层响应式）。

## 1. 什么是浅层响应式？

顾名思义，它只代理对象的第一层属性。
如果属性的值是对象，它**不会**递归地将其转换为响应式代理，而是直接返回原始对象。

```javascript
const state = shallowReactive({
  foo: 1,
  nested: {
    bar: 2
  }
})

// ✅ 响应式
state.foo++

// ❌ 非响应式
state.nested.bar++ 

// ✅ 响应式（因为是修改第一层属性）
state.nested = { bar: 3 }
```

## 2. 重构 baseHandlers

为了实现 `shallowReactive`，我们不需要重写一套逻辑，只需要复用现有的 `baseHandlers`，并增加一个开关。

我们需要重构 `src/reactivity/baseHandlers.ts`。

### 2.1 修改 createGetter

```typescript
function createGetter(isReadonly = false, shallow = false) {
  return function get(target, key, receiver) {
    // ... isReactive / isReadonly / toRaw 的判断逻辑 ...

    const res = Reflect.get(target, key, receiver)

    // 1. 如果是 shallow，直接返回结果，不再递归
    if (shallow) {
      return res
    }

    // 2. 如果是对象，递归代理 (reactive 的逻辑)
    if (isObject(res)) {
      return isReadonly ? readonly(res) : reactive(res)
    }

    return res
  }
}
```

### 2.2 导出 handlers

```typescript
export const mutableHandlers = {
  get: createGetter(),
  set: createSetter()
}

export const shallowHandlers = {
  get: createGetter(false, true), // isReadonly=false, shallow=true
  set: createSetter()
}
```

注意：`shallowReactive` 的 `set` 逻辑和 `reactive` 是一样的，因为 `set` 本身就是拦截对属性的赋值，它不关心值的深浅。

## 3. 实现 shallowReactive

在 `src/reactivity/reactive.ts` 中：

```typescript
import { mutableHandlers, shallowHandlers } from './baseHandlers'

export function shallowReactive(target) {
  return createReactiveObject(target, mutableHandlers, shallowHandlers)
}

// 稍微改造一下 createReactiveObject 以支持传入不同的 handlers
// 或者直接：
export function shallowReactive(target) {
  return new Proxy(target, shallowHandlers)
}
```

为了代码复用，通常我们会把 `new Proxy` 的逻辑封装在 `createReactiveObject` 中。

```typescript
function createReactiveObject(target, baseHandlers) {
  if (!isObject(target)) {
    console.warn(`value cannot be made reactive: ${String(target)}`)
    return target
  }
  return new Proxy(target, baseHandlers)
}

export function reactive(target) {
  return createReactiveObject(target, mutableHandlers)
}

export function shallowReactive(target) {
  return createReactiveObject(target, shallowHandlers)
}
```

## 4. 测试驱动

创建 `test/reactivity/shallowReactive.spec.ts`。

```typescript
import { shallowReactive, isReactive } from '../../src/reactivity/reactive'
import { effect } from '../../src/reactivity/effect'

describe('shallowReactive', () => {
  it('should not make non-reactive properties reactive', () => {
    const props = shallowReactive({ n: { foo: 1 } })
    
    expect(isReactive(props.n)).toBe(false)
  })

  it('should keep reactive properties reactive', () => {
    const props = shallowReactive({ n: { foo: 1 } })
    props.n = { foo: 2 }
    expect(isReactive(props)).toBe(true)
  })
  
  it('should trigger effect only on root level change', () => {
    const state = shallowReactive({
      count: 1,
      nested: { count: 1 }
    })
    
    let dummy
    effect(() => {
      dummy = state.nested.count
    })
    
    expect(dummy).toBe(1)
    
    // 修改深层属性，不应该触发 effect
    state.nested.count++
    expect(dummy).toBe(1) // 依然是 1
    
    // 修改顶层属性（替换整个 nested 对象），应该触发
    state.nested = { count: 2 }
    expect(dummy).toBe(2)
  })
})
```

## 5. 总结

`shallowReactive` 是一个性能优化的利器。
在 Vue 3 的生态中，很多库（比如状态管理库 Pinia 的某些部分，或者处理大型图表数据时）都会用到它。

它告诉我们：**响应式不是越深越好，合适才是最好。**

明天，我们将实现另一个重要的变体：`readonly`（只读代理），它是保证数据单向流动的关键。
