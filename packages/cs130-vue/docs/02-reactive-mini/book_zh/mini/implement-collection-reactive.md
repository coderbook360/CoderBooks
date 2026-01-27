# 实现 Map/Set 响应式

Map 和 Set 是 ES6 引入的集合类型，它们的操作方式与普通对象不同，需要特殊的 Proxy handlers。

## 为什么需要特殊处理

Map 和 Set 的方法（如 `get`、`set`、`has`、`delete`）是在原型上定义的，直接代理会丢失正确的 this 绑定：

```typescript
const map = new Map()
const proxy = new Proxy(map, {
  get(target, key, receiver) {
    return Reflect.get(target, key, receiver)
  }
})

// 报错：Method get called on incompatible receiver
proxy.get('key')
```

问题在于：`map.get` 方法期望 `this` 是一个真正的 Map 实例。

## 解决方案

我们不直接拦截方法调用，而是返回一个绑定了正确 this 的包装函数：

```typescript
// collectionHandlers.ts

const mutableCollectionHandlers: ProxyHandler<any> = {
  get(target, key, receiver) {
    if (key === ReactiveFlags.IS_REACTIVE) return true
    if (key === ReactiveFlags.RAW) return target

    // 返回包装后的方法
    return Reflect.get(
      hasOwn(instrumentations, key) && key in target
        ? instrumentations
        : target,
      key,
      receiver
    )
  }
}

// 方法包装
const instrumentations: Record<string, Function> = {
  get(this: Map<any, any>, key: unknown) {
    const target = toRaw(this)
    track(target, key)
    return wrap(target.get(key))
  },

  set(this: Map<any, any>, key: unknown, value: unknown) {
    const target = toRaw(this)
    const hadKey = target.has(key)
    const oldValue = target.get(key)
    
    target.set(key, toRaw(value))
    
    if (!hadKey) {
      trigger(target, key, TriggerOpTypes.ADD, value)
    } else if (hasChanged(value, oldValue)) {
      trigger(target, key, TriggerOpTypes.SET, value)
    }
    return this
  },

  has(this: Map<any, any>, key: unknown) {
    const target = toRaw(this)
    track(target, key)
    return target.has(key)
  },

  delete(this: Map<any, any>, key: unknown) {
    const target = toRaw(this)
    const hadKey = target.has(key)
    const result = target.delete(key)
    
    if (hadKey) {
      trigger(target, key, TriggerOpTypes.DELETE)
    }
    return result
  }
}
```

## 完整的集合方法包装

```typescript
// collectionHandlers.ts

function createInstrumentations() {
  const instrumentations: Record<string, Function> = {}

  // Map/Set 共有方法
  ;['has', 'delete'].forEach(method => {
    instrumentations[method] = function(this: any, key: unknown) {
      const target = toRaw(this)
      track(target, key)
      return target[method](key)
    }
  })

  // Map 特有方法
  instrumentations.get = function(this: Map<any, any>, key: unknown) {
    const target = toRaw(this)
    track(target, key)
    const result = target.get(key)
    return isObject(result) ? reactive(result) : result
  }

  instrumentations.set = function(this: Map<any, any>, key: unknown, value: unknown) {
    const target = toRaw(this)
    const hadKey = target.has(key)
    const oldValue = target.get(key)
    
    // 存储原始值，避免污染
    target.set(key, toRaw(value))
    
    if (!hadKey) {
      trigger(target, key, TriggerOpTypes.ADD, value)
    } else if (hasChanged(value, oldValue)) {
      trigger(target, key, TriggerOpTypes.SET, value)
    }
    return this
  }

  // Set 特有方法
  instrumentations.add = function(this: Set<any>, value: unknown) {
    const target = toRaw(this)
    const hadValue = target.has(value)
    
    target.add(toRaw(value))
    
    if (!hadValue) {
      trigger(target, value, TriggerOpTypes.ADD, value)
    }
    return this
  }

  // 共有的清空方法
  instrumentations.clear = function(this: Map<any, any> | Set<any>) {
    const target = toRaw(this)
    const hadItems = target.size !== 0
    
    target.clear()
    
    if (hadItems) {
      trigger(target, ITERATE_KEY, TriggerOpTypes.CLEAR)
    }
  }

  // 迭代方法
  ;['forEach', 'keys', 'values', 'entries', Symbol.iterator].forEach(method => {
    instrumentations[method] = createIterableMethod(method)
  })

  // 属性访问
  instrumentations.size = function(this: Map<any, any> | Set<any>) {
    const target = toRaw(this)
    track(target, ITERATE_KEY)
    return Reflect.get(target, 'size', target)
  }

  return instrumentations
}

function createIterableMethod(method: string | symbol) {
  return function(this: any, ...args: any[]) {
    const target = toRaw(this)
    track(target, ITERATE_KEY)

    const iterator = target[method](...args)
    const wrap = (value: any) => isObject(value) ? reactive(value) : value

    return {
      next() {
        const { value, done } = iterator.next()
        return done
          ? { value, done }
          : { value: method === 'entries' ? [wrap(value[0]), wrap(value[1])] : wrap(value), done }
      },
      [Symbol.iterator]() {
        return this
      }
    }
  }
}
```

## 识别集合类型

```typescript
// reactive.ts

function getTargetType(value: object) {
  if ((value as any)[ReactiveFlags.SKIP]) {
    return TargetType.INVALID
  }
  
  const rawType = Object.prototype.toString.call(value).slice(8, -1)
  
  switch (rawType) {
    case 'Object':
    case 'Array':
      return TargetType.COMMON
    case 'Map':
    case 'Set':
    case 'WeakMap':
    case 'WeakSet':
      return TargetType.COLLECTION
    default:
      return TargetType.INVALID
  }
}

export function reactive<T extends object>(target: T): T {
  const targetType = getTargetType(target)
  
  if (targetType === TargetType.INVALID) {
    return target
  }

  const handlers = targetType === TargetType.COLLECTION
    ? mutableCollectionHandlers
    : mutableHandlers

  return createReactiveObject(target, false, false, handlers, reactiveMap)
}
```

## 测试

```typescript
import { describe, it, expect, vi } from 'vitest'
import { reactive } from '../reactive'
import { effect } from '../effect'

describe('reactive Map', () => {
  it('should track get/set', () => {
    const fn = vi.fn()
    const map = reactive(new Map())
    
    effect(() => {
      fn(map.get('key'))
    })

    expect(fn).toHaveBeenCalledWith(undefined)

    map.set('key', 'value')
    expect(fn).toHaveBeenCalledWith('value')
  })

  it('should track size', () => {
    const fn = vi.fn()
    const map = reactive(new Map())
    
    effect(() => {
      fn(map.size)
    })

    expect(fn).toHaveBeenCalledWith(0)

    map.set('key', 'value')
    expect(fn).toHaveBeenCalledWith(1)
  })

  it('should track iteration', () => {
    const fn = vi.fn()
    const map = reactive(new Map([['a', 1]]))
    
    effect(() => {
      fn([...map.values()])
    })

    expect(fn).toHaveBeenCalledWith([1])

    map.set('b', 2)
    expect(fn).toHaveBeenCalledWith([1, 2])
  })
})

describe('reactive Set', () => {
  it('should track has/add/delete', () => {
    const fn = vi.fn()
    const set = reactive(new Set<number>())
    
    effect(() => {
      fn(set.has(1))
    })

    expect(fn).toHaveBeenCalledWith(false)

    set.add(1)
    expect(fn).toHaveBeenCalledWith(true)

    set.delete(1)
    expect(fn).toHaveBeenCalledWith(false)
  })
})
```

## 小结

Map/Set 的响应式实现要点：

- 使用方法包装而非直接代理
- 正确绑定 this 到原始集合
- 存储原始值避免响应式对象污染
- 迭代方法需要包装返回值
