# 实现 reactive 基础版

reactive 是 Vue 3 响应式系统的核心 API。它接收一个普通对象，返回一个响应式代理。让我们从最简单的版本开始。

## 基本实现

```typescript
// reactive.ts

// 存储原始对象到代理的映射
const reactiveMap = new WeakMap<object, any>()

export function reactive<T extends object>(target: T): T {
  // 如果已经是代理，直接返回
  if (reactiveMap.has(target)) {
    return reactiveMap.get(target)
  }

  // 创建代理
  const proxy = new Proxy(target, {
    get(target, key, receiver) {
      // 依赖收集
      track(target, key)
      const result = Reflect.get(target, key, receiver)
      // 如果获取的值是对象，递归转换为响应式
      if (typeof result === 'object' && result !== null) {
        return reactive(result)
      }
      return result
    },

    set(target, key, value, receiver) {
      const oldValue = Reflect.get(target, key, receiver)
      const result = Reflect.set(target, key, value, receiver)
      // 值变化时触发更新
      if (oldValue !== value) {
        trigger(target, key)
      }
      return result
    }
  })

  // 缓存代理
  reactiveMap.set(target, proxy)
  return proxy
}
```

## 为什么使用 Proxy

Proxy 是 ES6 引入的元编程特性，可以拦截对象的基本操作。与 Vue 2 使用的 `Object.defineProperty` 相比：

| 特性 | Object.defineProperty | Proxy |
|------|----------------------|-------|
| 新增属性 | 不能检测 | 可以检测 |
| 删除属性 | 不能检测 | 可以检测 |
| 数组索引 | 需要特殊处理 | 自动支持 |
| 性能 | 需要递归遍历 | 惰性代理 |

## 为什么使用 Reflect

你可能注意到我们使用 `Reflect.get` 和 `Reflect.set` 而不是直接访问 target。这是因为：

1. **receiver 参数**：确保正确的 this 绑定

```typescript
const obj = {
  _value: 1,
  get value() {
    return this._value
  }
}

const proxy = new Proxy(obj, {
  get(target, key, receiver) {
    // 不传 receiver：this 指向原始对象
    // 传 receiver：this 指向代理对象
    return Reflect.get(target, key, receiver)
  }
})
```

2. **返回值一致性**：Reflect 方法的返回值与 Proxy trap 期望一致

## 惰性代理

注意我们在 get 中递归调用 reactive：

```typescript
get(target, key, receiver) {
  const result = Reflect.get(target, key, receiver)
  if (typeof result === 'object' && result !== null) {
    return reactive(result)  // 访问时才转换
  }
  return result
}
```

这是**惰性代理**策略：只有在访问嵌套对象时才将其转换为响应式。相比 Vue 2 的初始化时递归遍历，这种策略：

- 初始化更快
- 未访问的深层对象不会被代理
- 内存占用更小

## 添加更多拦截器

一个完整的 reactive 需要拦截更多操作：

```typescript
const proxy = new Proxy(target, {
  get(target, key, receiver) {
    // 特殊 key 处理
    if (key === ReactiveFlags.IS_REACTIVE) {
      return true
    }
    if (key === ReactiveFlags.RAW) {
      return target
    }

    track(target, key)
    const result = Reflect.get(target, key, receiver)
    
    if (isObject(result)) {
      return reactive(result)
    }
    return result
  },

  set(target, key, value, receiver) {
    const oldValue = target[key]
    const hadKey = hasOwn(target, key)
    const result = Reflect.set(target, key, value, receiver)

    if (!hadKey) {
      // 新增属性
      trigger(target, key, TriggerOpTypes.ADD)
    } else if (hasChanged(value, oldValue)) {
      // 修改属性
      trigger(target, key, TriggerOpTypes.SET)
    }
    return result
  },

  has(target, key) {
    track(target, key)
    return Reflect.has(target, key)
  },

  deleteProperty(target, key) {
    const hadKey = hasOwn(target, key)
    const result = Reflect.deleteProperty(target, key)
    if (hadKey && result) {
      trigger(target, key, TriggerOpTypes.DELETE)
    }
    return result
  },

  ownKeys(target) {
    track(target, ITERATE_KEY)
    return Reflect.ownKeys(target)
  }
})
```

## 处理特殊键

我们需要一些特殊键来标识代理状态：

```typescript
export const enum ReactiveFlags {
  IS_REACTIVE = '__v_isReactive',
  IS_READONLY = '__v_isReadonly',
  RAW = '__v_raw'
}

export function isReactive(value: unknown): boolean {
  return !!(value && (value as any)[ReactiveFlags.IS_REACTIVE])
}

export function toRaw<T>(observed: T): T {
  const raw = observed && (observed as any)[ReactiveFlags.RAW]
  return raw ? toRaw(raw) : observed
}
```

## 避免重复代理

```typescript
export function reactive<T extends object>(target: T): T {
  // 如果已经是响应式的，直接返回
  if (isReactive(target)) {
    return target
  }

  // 如果已经有代理，返回缓存的代理
  const existingProxy = reactiveMap.get(target)
  if (existingProxy) {
    return existingProxy
  }

  // 创建新代理
  const proxy = createReactiveObject(target)
  reactiveMap.set(target, proxy)
  return proxy
}
```

## 测试基础版

```typescript
import { describe, it, expect } from 'vitest'
import { reactive, isReactive, toRaw } from '../reactive'
import { effect } from '../effect'

describe('reactive', () => {
  it('should return a reactive object', () => {
    const original = { foo: 1 }
    const observed = reactive(original)
    
    expect(observed).not.toBe(original)
    expect(isReactive(observed)).toBe(true)
    expect(isReactive(original)).toBe(false)
  })

  it('should observe basic properties', () => {
    let dummy
    const counter = reactive({ num: 0 })
    effect(() => {
      dummy = counter.num
    })

    expect(dummy).toBe(0)
    counter.num = 7
    expect(dummy).toBe(7)
  })

  it('should observe nested properties', () => {
    let dummy
    const counter = reactive({ nested: { num: 0 } })
    effect(() => {
      dummy = counter.nested.num
    })

    expect(dummy).toBe(0)
    counter.nested.num = 8
    expect(dummy).toBe(8)
  })

  it('should return the original object with toRaw', () => {
    const original = { foo: 1 }
    const observed = reactive(original)
    
    expect(toRaw(observed)).toBe(original)
  })
})
```

## 目前的限制

这个基础版本还有一些限制：

1. 不支持数组的特殊方法（push、pop 等）
2. 不支持 Map、Set 等集合类型
3. track 和 trigger 还未实现

下一章我们将实现 effect 系统，补全 track 和 trigger 函数。

## 小结

这一章我们实现了 reactive 的基础版本：

- 使用 Proxy 拦截对象操作
- 使用 Reflect 保证正确的 this 绑定
- 实现惰性代理策略
- 添加代理缓存避免重复创建

核心思想是：**拦截访问和修改操作，在访问时收集依赖，在修改时触发更新**。
