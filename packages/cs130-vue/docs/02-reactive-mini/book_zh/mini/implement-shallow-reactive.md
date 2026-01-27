# 实现 shallowReactive

shallowReactive 只对对象的第一层属性进行响应式处理，嵌套的对象保持原样。这在某些性能敏感的场景很有用。

## 基本实现

```typescript
// reactive.ts

const shallowReactiveMap = new WeakMap<object, any>()

export function shallowReactive<T extends object>(target: T): T {
  return createReactiveObject(
    target,
    false,   // isReadonly
    true,    // isShallow
    shallowReactiveHandlers,
    shallowReactiveMap
  )
}
```

## shallow handlers

关键在于 get 拦截器不递归转换嵌套对象：

```typescript
// baseHandlers.ts

const shallowGet = createGetter(false, true)
const shallowSet = createSetter(true)

export const shallowReactiveHandlers: ProxyHandler<object> = {
  get: shallowGet,
  set: shallowSet,
  deleteProperty,
  has,
  ownKeys
}

function createGetter(isReadonly = false, isShallow = false) {
  return function get(target: object, key: PropertyKey, receiver: object) {
    // ... 特殊 key 处理

    const result = Reflect.get(target, key, receiver)

    if (!isReadonly) {
      track(target, key)
    }

    // 关键：shallow 模式不递归转换
    if (isShallow) {
      return result
    }

    if (isObject(result)) {
      return isReadonly ? readonly(result) : reactive(result)
    }

    return result
  }
}
```

## shallowReactive vs reactive

```typescript
const state = reactive({
  nested: { count: 0 }
})

// state.nested 也是响应式的
isReactive(state.nested)  // true

const shallowState = shallowReactive({
  nested: { count: 0 }
})

// shallowState.nested 不是响应式的
isReactive(shallowState.nested)  // false
```

## 使用场景

1. **大型对象**：只需要监听顶层属性变化

```typescript
const config = shallowReactive({
  theme: 'dark',
  settings: {
    // 这个对象很大，不需要深层响应式
    ...largeSettings
  }
})

// 只有顶层赋值会触发更新
config.theme = 'light'  // 触发更新
config.settings.someDeep.value = 1  // 不触发更新
```

2. **外部状态整合**：整合非响应式的外部状态

```typescript
const externalData = shallowReactive({
  user: externalUserObject,  // 保持原样
  timestamp: Date.now()      // 顶层响应式
})
```

## isShallow 辅助函数

```typescript
export function isShallow(value: unknown): boolean {
  return !!(value && (value as any)[ReactiveFlags.IS_SHALLOW])
}
```

## 测试

```typescript
import { describe, it, expect, vi } from 'vitest'
import { shallowReactive, isReactive, isShallow } from '../reactive'
import { effect } from '../effect'

describe('shallowReactive', () => {
  it('should only make first level reactive', () => {
    const state = shallowReactive({
      foo: 1,
      nested: { bar: 2 }
    })

    expect(isReactive(state)).toBe(true)
    expect(isShallow(state)).toBe(true)
    expect(isReactive(state.nested)).toBe(false)
  })

  it('should track first level properties', () => {
    const fn = vi.fn()
    const state = shallowReactive({ foo: 1 })
    
    effect(() => {
      fn(state.foo)
    })

    state.foo = 2
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('should not track nested properties', () => {
    const fn = vi.fn()
    const state = shallowReactive({
      nested: { bar: 1 }
    })
    
    effect(() => {
      fn(state.nested.bar)
    })

    // 不会触发更新
    state.nested.bar = 2
    expect(fn).toHaveBeenCalledTimes(1)

    // 替换整个嵌套对象会触发
    state.nested = { bar: 3 }
    expect(fn).toHaveBeenCalledTimes(2)
  })
})
```

## 小结

shallowReactive 通过在 get 中不递归转换嵌套对象来实现浅层响应式。这种设计在性能敏感场景或整合外部状态时很有用。
