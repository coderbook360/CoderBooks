# 实现 get 和 set 拦截

上一章我们创建了基础的 Proxy，但 track 和 trigger 还是空函数。这一章我们完善拦截器的实现，并建立依赖追踪机制。

## 依赖追踪的核心数据结构

首先，我们需要一个地方存储依赖关系：

```typescript
// effect.ts

// 当前活跃的 effect
let activeEffect: ReactiveEffect | undefined

// 依赖存储：target -> key -> effects
type TargetMap = WeakMap<object, Map<PropertyKey, Set<ReactiveEffect>>>
const targetMap: TargetMap = new WeakMap()
```

这个三层结构的设计意图：

```
targetMap (WeakMap)
└── target (对象)
    └── depsMap (Map)
        ├── 'name'  → Set<effect1, effect2>
        ├── 'count' → Set<effect1>
        └── 'items' → Set<effect3>
```

## 实现 track 函数

track 在属性被访问时调用，负责收集当前 effect 作为依赖：

```typescript
// effect.ts

export function track(target: object, key: PropertyKey) {
  // 没有活跃的 effect，不需要收集
  if (!activeEffect) {
    return
  }

  // 获取或创建 target 的依赖 Map
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()))
  }

  // 获取或创建 key 的依赖 Set
  let dep = depsMap.get(key)
  if (!dep) {
    depsMap.set(key, (dep = new Set()))
  }

  // 将当前 effect 添加到依赖集合
  if (!dep.has(activeEffect)) {
    dep.add(activeEffect)
    // 双向链接：effect 也记录自己被哪些 dep 依赖
    activeEffect.deps.push(dep)
  }
}
```

## 实现 trigger 函数

trigger 在属性被修改时调用，负责触发所有依赖该属性的 effect：

```typescript
// effect.ts

export function trigger(target: object, key: PropertyKey) {
  const depsMap = targetMap.get(target)
  if (!depsMap) {
    return
  }

  const dep = depsMap.get(key)
  if (!dep) {
    return
  }

  // 创建一个副本来遍历，避免在遍历时修改集合
  const effectsToRun = new Set<ReactiveEffect>()
  
  dep.forEach(effect => {
    // 避免无限递归：不触发当前正在执行的 effect
    if (effect !== activeEffect) {
      effectsToRun.add(effect)
    }
  })

  effectsToRun.forEach(effect => {
    // 如果有调度器，使用调度器执行
    if (effect.options.scheduler) {
      effect.options.scheduler(effect)
    } else {
      effect()
    }
  })
}
```

## 完善 get 拦截器

现在我们有了 track，来完善 get 拦截器：

```typescript
// baseHandlers.ts

function createGetter(isReadonly = false, isShallow = false) {
  return function get(target: object, key: PropertyKey, receiver: object) {
    // 处理特殊 key
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly
    }
    if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly
    }
    if (key === ReactiveFlags.IS_SHALLOW) {
      return isShallow
    }
    if (key === ReactiveFlags.RAW) {
      return target
    }

    const result = Reflect.get(target, key, receiver)

    // readonly 不需要收集依赖（不会被修改）
    if (!isReadonly) {
      track(target, key)
    }

    // shallow 不递归转换
    if (isShallow) {
      return result
    }

    // 对象类型惰性转换
    if (isObject(result)) {
      return isReadonly ? readonly(result) : reactive(result)
    }

    return result
  }
}

export const mutableHandlers: ProxyHandler<object> = {
  get: createGetter(),
  set: createSetter(),
  has: hasHandler,
  deleteProperty: deletePropertyHandler,
  ownKeys: ownKeysHandler
}
```

## 完善 set 拦截器

```typescript
// baseHandlers.ts

function createSetter() {
  return function set(
    target: object,
    key: PropertyKey,
    value: unknown,
    receiver: object
  ): boolean {
    const oldValue = (target as any)[key]
    
    // 判断是新增还是修改
    const hadKey = isArray(target) && isIntegerKey(key)
      ? Number(key) < target.length
      : hasOwn(target, key)

    const result = Reflect.set(target, key, value, receiver)

    // 只有 target 是 receiver 的原始对象时才触发更新
    // 这是为了避免原型链上的 set 触发多次更新
    if (target === toRaw(receiver)) {
      if (!hadKey) {
        // 新增
        trigger(target, key, TriggerOpTypes.ADD, value)
      } else if (hasChanged(value, oldValue)) {
        // 修改
        trigger(target, key, TriggerOpTypes.SET, value, oldValue)
      }
    }

    return result
  }
}
```

## 处理数组

数组需要特殊处理，因为有些操作需要触发额外的更新：

```typescript
// baseHandlers.ts

// 数组长度变化的 key
const ARRAY_LENGTH_KEY = 'length'

function createSetter() {
  return function set(
    target: object,
    key: PropertyKey,
    value: unknown,
    receiver: object
  ): boolean {
    const oldValue = (target as any)[key]
    const hadKey = isArray(target) && isIntegerKey(key)
      ? Number(key) < target.length
      : hasOwn(target, key)

    const result = Reflect.set(target, key, value, receiver)

    if (target === toRaw(receiver)) {
      if (!hadKey) {
        trigger(target, key, TriggerOpTypes.ADD, value)
      } else if (hasChanged(value, oldValue)) {
        trigger(target, key, TriggerOpTypes.SET, value, oldValue)
      }
    }

    return result
  }
}

// 扩展 trigger 处理数组长度
export function trigger(
  target: object,
  key: PropertyKey,
  type: TriggerOpTypes,
  newValue?: unknown
) {
  const depsMap = targetMap.get(target)
  if (!depsMap) return

  const effectsToRun = new Set<ReactiveEffect>()

  const add = (effects: Set<ReactiveEffect> | undefined) => {
    if (effects) {
      effects.forEach(effect => {
        if (effect !== activeEffect) {
          effectsToRun.add(effect)
        }
      })
    }
  }

  // 修改数组 length 属性
  if (key === 'length' && isArray(target)) {
    depsMap.forEach((dep, key) => {
      // 触发所有索引 >= 新长度的依赖
      if (key === 'length' || key >= (newValue as number)) {
        add(dep)
      }
    })
  } else {
    // 常规属性
    if (key !== undefined) {
      add(depsMap.get(key))
    }

    // 处理新增属性的情况
    if (type === TriggerOpTypes.ADD) {
      if (isArray(target) && isIntegerKey(key)) {
        // 数组新增元素，触发 length 依赖
        add(depsMap.get('length'))
      } else {
        // 对象新增属性，触发迭代器依赖
        add(depsMap.get(ITERATE_KEY))
      }
    }
  }

  effectsToRun.forEach(effect => {
    if (effect.options.scheduler) {
      effect.options.scheduler(effect)
    } else {
      effect()
    }
  })
}
```

## 处理 has 和 deleteProperty

```typescript
// baseHandlers.ts

function has(target: object, key: PropertyKey): boolean {
  const result = Reflect.has(target, key)
  track(target, key)
  return result
}

function deleteProperty(target: object, key: PropertyKey): boolean {
  const hadKey = hasOwn(target, key)
  const result = Reflect.deleteProperty(target, key)
  
  if (result && hadKey) {
    trigger(target, key, TriggerOpTypes.DELETE)
  }
  return result
}
```

## 处理 ownKeys

ownKeys 用于拦截 `for...in`、`Object.keys()` 等操作：

```typescript
// baseHandlers.ts

export const ITERATE_KEY = Symbol('iterate')

function ownKeys(target: object): (string | symbol)[] {
  // 使用特殊 key 追踪迭代操作
  track(target, isArray(target) ? 'length' : ITERATE_KEY)
  return Reflect.ownKeys(target)
}
```

## 测试拦截器

```typescript
import { describe, it, expect, vi } from 'vitest'
import { reactive } from '../reactive'
import { effect } from '../effect'

describe('get/set handlers', () => {
  it('should track and trigger on get and set', () => {
    const fn = vi.fn()
    const obj = reactive({ foo: 1 })
    
    effect(() => {
      fn(obj.foo)
    })

    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith(1)

    obj.foo = 2
    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenCalledWith(2)
  })

  it('should handle array push', () => {
    const fn = vi.fn()
    const arr = reactive<number[]>([])
    
    effect(() => {
      fn(arr.length)
    })

    expect(fn).toHaveBeenCalledWith(0)

    arr.push(1)
    expect(fn).toHaveBeenCalledWith(1)
  })

  it('should trigger on delete', () => {
    const fn = vi.fn()
    const obj = reactive<{ foo?: number }>({ foo: 1 })
    
    effect(() => {
      fn('foo' in obj)
    })

    expect(fn).toHaveBeenCalledWith(true)

    delete obj.foo
    expect(fn).toHaveBeenCalledWith(false)
  })
})
```

## 小结

这一章我们实现了完整的 get/set 拦截：

- **track**：在属性访问时收集依赖
- **trigger**：在属性修改时触发更新
- **数组处理**：正确处理数组长度变化
- **迭代追踪**：处理 for...in 和 Object.keys

关键洞察：**依赖收集的本质是建立「属性」与「副作用函数」之间的映射关系**。
