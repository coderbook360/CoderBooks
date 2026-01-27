# 实现 readonly

readonly 创建一个只读的响应式代理，任何修改操作都会被阻止并给出警告。它的实现与 reactive 类似，但 set 拦截器会拒绝修改。

## 基本实现

```typescript
// reactive.ts

const readonlyMap = new WeakMap<object, any>()

export function readonly<T extends object>(target: T): Readonly<T> {
  return createReactiveObject(
    target,
    true,    // isReadonly
    false,   // isShallow
    readonlyHandlers,
    readonlyMap
  )
}
```

## readonly handlers

```typescript
// baseHandlers.ts

function createGetter(isReadonly = false, isShallow = false) {
  return function get(target: object, key: PropertyKey, receiver: object) {
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly
    }
    if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly
    }
    if (key === ReactiveFlags.RAW) {
      return target
    }

    const result = Reflect.get(target, key, receiver)

    // readonly 不收集依赖，因为它不会变化
    if (!isReadonly) {
      track(target, key)
    }

    if (isShallow) {
      return result
    }

    if (isObject(result)) {
      // 嵌套对象也是 readonly
      return isReadonly ? readonly(result) : reactive(result)
    }

    return result
  }
}

const readonlyGet = createGetter(true)

export const readonlyHandlers: ProxyHandler<object> = {
  get: readonlyGet,
  
  set(target, key) {
    if (__DEV__) {
      console.warn(
        `Set operation on key "${String(key)}" failed: target is readonly.`,
        target
      )
    }
    return true
  },

  deleteProperty(target, key) {
    if (__DEV__) {
      console.warn(
        `Delete operation on key "${String(key)}" failed: target is readonly.`,
        target
      )
    }
    return true
  }
}
```

## 为什么 readonly 不收集依赖

readonly 对象永远不会被修改，因此收集依赖没有意义。不收集依赖可以：

1. 减少内存占用
2. 避免不必要的追踪开销
3. 语义更清晰

```typescript
const original = { count: 0 }
const observed = readonly(original)

effect(() => {
  console.log(observed.count)  // 不会被追踪
})

// 这会失败，不会触发更新
observed.count = 1  // Warning: Set operation failed
```

## isReadonly 辅助函数

```typescript
export function isReadonly(value: unknown): boolean {
  return !!(value && (value as any)[ReactiveFlags.IS_READONLY])
}
```

## shallowReadonly

有时我们只需要浅层只读，嵌套对象保持可变：

```typescript
export function shallowReadonly<T extends object>(target: T): Readonly<T> {
  return createReactiveObject(
    target,
    true,    // isReadonly
    true,    // isShallow
    shallowReadonlyHandlers,
    shallowReadonlyMap
  )
}

const shallowReadonlyGet = createGetter(true, true)

export const shallowReadonlyHandlers: ProxyHandler<object> = {
  get: shallowReadonlyGet,
  set: readonlyHandlers.set,
  deleteProperty: readonlyHandlers.deleteProperty
}
```

## 使用场景

readonly 常用于：

1. **Props**：组件接收的 props 应该是只读的
2. **全局状态**：暴露给组件的状态可能需要是只读的
3. **常量对象**：确保某些配置对象不被修改

```typescript
// props 应该是只读的
const props = readonly(rawProps)

// 暴露只读状态
const state = reactive({ count: 0 })
const readonlyState = readonly(state)

// 外部只能读取，不能修改
export { readonlyState }
```

## 测试

```typescript
import { describe, it, expect, vi } from 'vitest'
import { readonly, isReadonly, reactive } from '../reactive'
import { effect } from '../effect'

describe('readonly', () => {
  it('should make values readonly', () => {
    const original = { foo: 1, bar: { baz: 2 } }
    const observed = readonly(original)

    expect(isReadonly(observed)).toBe(true)
    expect(isReadonly(observed.bar)).toBe(true)
  })

  it('should warn when set', () => {
    console.warn = vi.fn()
    const observed = readonly({ foo: 1 })

    observed.foo = 2
    expect(console.warn).toHaveBeenCalled()
    expect(observed.foo).toBe(1)
  })

  it('should not track', () => {
    const fn = vi.fn()
    const observed = readonly({ foo: 1 })

    effect(() => {
      fn(observed.foo)
    })

    expect(fn).toHaveBeenCalledTimes(1)

    // 即使原始对象改变，也不会触发 effect
    // （当然正常使用不应该直接改原始对象）
  })
})
```

## 小结

readonly 的实现要点：

- 使用相同的 Proxy 机制
- set 和 deleteProperty 返回 true 但不执行操作
- 嵌套对象也被转换为 readonly
- 不收集依赖，因为不会被修改
