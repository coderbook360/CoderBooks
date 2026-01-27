# reactive 实现：用 Proxy 创建响应式对象

有了 effect、track、trigger 这三个核心函数，我们现在需要一个把它们串联起来的入口。这就是 reactive 函数的职责——它用 Proxy 包装普通对象，在属性被读取时调用 track，在属性被修改时调用 trigger，从而让普通对象具备响应能力。

理解 reactive 的实现，关键是理解 Proxy 如何工作，以及在什么时机调用 track 和 trigger。

## Proxy 与 Reflect：代理的基础

Proxy 是 ES6 引入的元编程机制，它允许你定义对象操作的自定义行为。当你创建一个代理对象时，对这个代理对象的所有操作都会先经过你定义的处理器函数。

```typescript
const target = { count: 0 }
const proxy = new Proxy(target, {
  get(target, key, receiver) {
    console.log(`读取 ${String(key)}`)
    return Reflect.get(target, key, receiver)
  },
  set(target, key, value, receiver) {
    console.log(`写入 ${String(key)} = ${value}`)
    return Reflect.set(target, key, value, receiver)
  }
})

proxy.count      // 读取 count
proxy.count = 1  // 写入 count = 1
```

这里有个重要的细节：我们使用 Reflect.get 和 Reflect.set 而不是直接操作 target。Reflect 是 Proxy 的"伴生对象"，它提供了与 Proxy 处理器一一对应的方法。使用 Reflect 的好处是它能正确处理 receiver 参数，这在涉及原型链和 getter/setter 时非常重要。考虑这个场景：如果对象有一个 getter，getter 内部使用 this，那么 this 应该指向 proxy 而不是 target。Reflect.get 的第三个参数 receiver 正是用来确保这一点的。

## 最简版本：建立读写拦截

有了 Proxy 的基础，reactive 的核心实现其实很简单——在读取时调用 track，在写入时调用 trigger：

```typescript
import { track, trigger } from './effect'

export function reactive<T extends object>(target: T): T {
  return new Proxy(target, {
    get(target, key, receiver) {
      track(target, key)
      return Reflect.get(target, key, receiver)
    },
    set(target, key, value, receiver) {
      const result = Reflect.set(target, key, value, receiver)
      trigger(target, key)
      return result
    }
  })
}
```

这几行代码已经能让响应式工作起来了。当 effect 执行时访问 `proxy.count`，get 处理器被触发，track 把当前 effect 记录为 count 的依赖。之后修改 `proxy.count = 1`，set 处理器被触发，trigger 通知所有依赖 count 的 effects 重新执行。

但这个最简版本有很多问题需要解决。

## 问题一：同一对象被重复代理

考虑这个场景：

```typescript
const obj = { count: 0 }
const proxy1 = reactive(obj)
const proxy2 = reactive(obj)

console.log(proxy1 === proxy2)  // false，但语义上应该相同
```

同一个原始对象被 reactive 调用两次，创建了两个不同的代理。这不仅浪费内存，更严重的是可能导致依赖追踪混乱——修改 proxy1.count 不会触发依赖 proxy2.count 的 effects。

解决方案是用 WeakMap 缓存已创建的代理：

```typescript
const reactiveMap = new WeakMap<object, any>()

export function reactive<T extends object>(target: T): T {
  // 已经代理过了，返回缓存
  if (reactiveMap.has(target)) {
    return reactiveMap.get(target)
  }
  
  const proxy = new Proxy(target, handlers)
  
  // 缓存代理
  reactiveMap.set(target, proxy)
  return proxy
}
```

使用 WeakMap 而不是 Map 是有意为之的。WeakMap 的键是弱引用，当原始对象不再被其他地方引用时，它会被垃圾回收，对应的代理也会一起被回收。这避免了内存泄漏。

## 问题二：代理被再次代理

另一个相关问题是：如果把一个代理对象传给 reactive 会怎样？

```typescript
const proxy1 = reactive({ count: 0 })
const proxy2 = reactive(proxy1)  // 代理了代理
```

这时 proxy2 是 proxy1 的代理，读取 `proxy2.count` 会触发两层 get 处理器。这不仅低效，还可能导致依赖被收集两次。

我们需要一种方式来检测一个对象是否已经是代理。做法是在 get 处理器中拦截一个特殊的 Symbol 键：

```typescript
const IS_REACTIVE = Symbol('isReactive')

const handlers: ProxyHandler<object> = {
  get(target, key, receiver) {
    // 用于检测是否是代理
    if (key === IS_REACTIVE) {
      return true
    }
    
    track(target, key)
    return Reflect.get(target, key, receiver)
  },
  // ...其他处理器
}

export function reactive<T extends object>(target: T): T {
  // 已经是代理，直接返回
  if ((target as any)[IS_REACTIVE]) {
    return target
  }
  
  // ...缓存检查和创建代理的逻辑
}
```

当访问 `proxy[IS_REACTIVE]` 时，get 处理器返回 true，这表明这个对象是一个代理。在 reactive 函数开头检查这个标记，如果传入的已经是代理，就直接返回它本身。

## 问题三：嵌套对象不是响应式的

考虑这个场景：

```typescript
const state = reactive({
  user: {
    name: 'Vue'
  }
})

effect(() => {
  console.log(state.user.name)
})

state.user.name = 'React'  // 不触发更新！
```

外层对象 state 是代理，但 state.user 返回的是原始对象。修改 `state.user.name` 绕过了代理，没有触发任何处理器。

解决方案是在 get 处理器中，如果返回值是对象，就递归调用 reactive：

```typescript
get(target, key, receiver) {
  if (key === IS_REACTIVE) {
    return true
  }
  
  track(target, key)
  
  const result = Reflect.get(target, key, receiver)
  
  // 如果值是对象，递归代理
  if (typeof result === 'object' && result !== null) {
    return reactive(result)
  }
  
  return result
}
```

这种方式被称为"惰性深度代理"。不是在创建时递归处理所有嵌套对象，而是在访问时按需创建代理。这有两个好处：一是性能——只有实际访问到的嵌套对象才会被代理；二是避免循环引用——如果对象 A 引用 B，B 又引用 A，急切的递归代理会陷入无限循环，但惰性代理不会。

你可能会担心每次访问 `state.user` 都创建新的代理。别担心，reactiveMap 的缓存机制确保了同一个原始对象只会有一个代理。第二次访问 `state.user` 时，reactive 直接从缓存返回之前创建的代理。

## 问题四：无效的触发

目前的实现在每次 set 时都调用 trigger，即使值没有变化：

```typescript
const state = reactive({ count: 0 })

effect(() => {
  console.log('effect run')
})

state.count = 0  // 值没变，但 effect 仍被触发
```

这是不必要的性能浪费。解决方案是在 set 时比较新旧值：

```typescript
set(target, key, value, receiver) {
  const oldValue = (target as any)[key]
  const result = Reflect.set(target, key, value, receiver)
  
  // 只有值变化时才触发
  if (!Object.is(value, oldValue)) {
    trigger(target, key)
  }
  
  return result
}
```

使用 Object.is 而不是 `===` 是为了正确处理两个边界情况：NaN（NaN === NaN 是 false，但它们应该被视为相等）和 +0/-0（+0 === -0 是 true，但 Object.is 能区分它们，虽然实际中这很少重要）。

## 问题五：新增属性的检测

还有一个问题需要考虑：

```typescript
const state = reactive({} as Record<string, any>)

effect(() => {
  console.log(Object.keys(state))
})

state.newKey = 'value'  // 应该触发，因为 keys 变了
```

当 effect 中使用 Object.keys 遍历对象时，新增属性应该触发更新。要实现这一点，需要区分"新增"和"修改"操作：

```typescript
set(target, key, value, receiver) {
  const hadKey = Object.prototype.hasOwnProperty.call(target, key)
  const oldValue = (target as any)[key]
  const result = Reflect.set(target, key, value, receiver)
  
  if (!hadKey) {
    // 新增属性
    trigger(target, key, 'add')
  } else if (!Object.is(value, oldValue)) {
    // 修改属性
    trigger(target, key, 'set')
  }
  
  return result
}
```

这里的 'add' 和 'set' 是操作类型，trigger 可以根据不同类型决定通知哪些 effects。比如依赖 Object.keys 的 effect 只关心 'add' 和 'delete'，不关心 'set'。

## 处理更多操作

除了 get 和 set，还有其他需要拦截的操作：

```typescript
const handlers: ProxyHandler<object> = {
  // ...get 和 set
  
  // 拦截 delete 操作
  deleteProperty(target, key) {
    const hadKey = Object.prototype.hasOwnProperty.call(target, key)
    const result = Reflect.deleteProperty(target, key)
    
    if (hadKey && result) {
      trigger(target, key, 'delete')
    }
    
    return result
  },
  
  // 拦截 in 操作符
  has(target, key) {
    track(target, key)
    return Reflect.has(target, key)
  },
  
  // 拦截 for...in、Object.keys 等
  ownKeys(target) {
    track(target, Symbol('iterate'))
    return Reflect.ownKeys(target)
  }
}
```

deleteProperty 处理 `delete obj.key` 操作，只有在属性确实存在并且删除成功时才触发更新。has 处理 `key in obj` 操作，需要追踪依赖，因为 in 操作的结果可能因为属性增删而变化。ownKeys 处理 `Object.keys(obj)` 和 `for...in` 循环，这里使用一个特殊的 Symbol 作为键，因为这个操作依赖的不是某个具体属性，而是"对象有哪些属性"这个信息。

## 获取原始对象

有时候我们需要获取代理背后的原始对象，比如在进行深度比较或者传给不支持代理的第三方库时：

```typescript
const RAW = Symbol('raw')

const handlers: ProxyHandler<object> = {
  get(target, key, receiver) {
    if (key === IS_REACTIVE) return true
    
    // 返回原始对象
    if (key === RAW) return target
    
    // ...其他逻辑
  }
}

export function toRaw<T>(observed: T): T {
  const raw = observed && (observed as any)[RAW]
  return raw ? toRaw(raw) : observed
}
```

toRaw 函数递归调用自己，处理多层代理的情况（虽然正常使用中不应该出现）。

## 完整实现

综合以上所有改进，这是完整的 reactive 实现：

```typescript
import { track, trigger } from './effect'

const IS_REACTIVE = Symbol('isReactive')
const RAW = Symbol('raw')

const reactiveMap = new WeakMap<object, any>()

const handlers: ProxyHandler<object> = {
  get(target, key, receiver) {
    if (key === IS_REACTIVE) return true
    if (key === RAW) return target
    
    track(target, key)
    
    const result = Reflect.get(target, key, receiver)
    if (typeof result === 'object' && result !== null) {
      return reactive(result)
    }
    return result
  },
  
  set(target, key, value, receiver) {
    const hadKey = Object.prototype.hasOwnProperty.call(target, key)
    const oldValue = (target as any)[key]
    const result = Reflect.set(target, key, value, receiver)
    
    if (!hadKey) {
      trigger(target, key, 'add')
    } else if (!Object.is(value, oldValue)) {
      trigger(target, key, 'set')
    }
    
    return result
  },
  
  deleteProperty(target, key) {
    const hadKey = Object.prototype.hasOwnProperty.call(target, key)
    const result = Reflect.deleteProperty(target, key)
    if (hadKey && result) {
      trigger(target, key, 'delete')
    }
    return result
  },
  
  has(target, key) {
    track(target, key)
    return Reflect.has(target, key)
  },
  
  ownKeys(target) {
    track(target, Symbol('iterate'))
    return Reflect.ownKeys(target)
  }
}

export function reactive<T extends object>(target: T): T {
  if ((target as any)[IS_REACTIVE]) {
    return target
  }
  
  if (reactiveMap.has(target)) {
    return reactiveMap.get(target)
  }
  
  const proxy = new Proxy(target, handlers)
  reactiveMap.set(target, proxy)
  return proxy
}

export function isReactive(value: unknown): boolean {
  return !!(value && (value as any)[IS_REACTIVE])
}

export function toRaw<T>(observed: T): T {
  const raw = observed && (observed as any)[RAW]
  return raw ? toRaw(raw) : observed
}
```

## 本章小结

reactive 的实现看似是简单的 Proxy 包装，但要正确处理各种边界情况需要很多细节考虑。WeakMap 缓存确保同一对象只有一个代理，避免了重复代理和内存泄漏。Symbol 标记让我们能够检测代理、获取原始对象。惰性深度代理在访问时按需创建嵌套代理，既保证了正确性又优化了性能。值比较避免了无效触发。操作类型区分让 trigger 能够精准通知。

reactive 是响应式系统面向用户的主要 API。用户只需要调用 `reactive(obj)`，就能得到一个"魔法对象"——读写它和普通对象一样，但背后的依赖追踪和更新通知都自动发生。这种透明性是 Vue 响应式系统易用性的关键。

但 reactive 有一个根本限制：它只能代理对象，不能代理原始值（数字、字符串、布尔值）。下一章我们将实现 ref，用另一种方式解决原始值的响应式问题。
