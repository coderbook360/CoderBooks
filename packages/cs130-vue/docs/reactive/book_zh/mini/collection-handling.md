# 集合类型的响应式：Map 和 Set

Map 和 Set 是 ES6 引入的两种集合数据结构，它们在现代 JavaScript 开发中被广泛使用。然而，它们与普通对象有着本质的区别：普通对象通过属性访问来读写数据（`obj.key` 或 `obj[key]`），而集合通过方法来操作（`map.get(key)` 和 `map.set(key, value)`）。这个差异意味着我们不能直接复用之前为普通对象设计的 Proxy handlers，需要采用不同的策略。

## 理解集合代理的挑战

让我们先理解为什么普通对象的 Proxy 策略不适用于集合。当我们访问 `obj.name` 时，Proxy 的 get handler 会被触发，我们可以在其中进行依赖收集；当我们设置 `obj.name = value` 时，set handler 被触发，我们可以触发更新。

但对于 Map：

```typescript
const map = new Map()
map.get('key')    // 这里触发的是对 'get' 属性的访问
map.set('key', 1) // 这里触发的是对 'set' 属性的访问
```

Proxy 拦截到的是对 `get` 和 `set` 这两个方法名的访问，而不是对 `'key'` 的读写。方法调用本身发生在 Proxy 之外，不会被拦截。

更麻烦的是，如果我们直接在代理对象上调用这些方法，会出错：

```typescript
const map = new Map()
const proxy = new Proxy(map, {})

proxy.get('key')  // TypeError: Method Map.prototype.get called on incompatible receiver
```

这是因为 Map 和 Set 的方法内部依赖于 `this` 指向真正的 Map/Set 实例，而不是代理对象。直接调用会导致 `this` 错误，方法无法正常工作。

## 核心策略：方法拦截

解决方案是：在 get handler 中拦截对方法的访问，返回我们重写过的版本。这些重写的方法会：正确地将操作委托给原始集合、在适当的时机进行依赖收集和触发更新。

首先，我们需要一个专门用于集合的 handlers：

```typescript
const collectionHandlers: ProxyHandler<Map<any, any> | Set<any>> = {
  get(target, key, receiver) {
    // 处理标识符
    if (key === ReactiveFlags.RAW) {
      return target
    }
    if (key === ReactiveFlags.IS_REACTIVE) {
      return true
    }
    
    // size 是一个 getter 属性，需要特殊处理
    if (key === 'size') {
      track(target, 'size')
      // 必须在原始对象上调用，否则会报错
      return Reflect.get(target, key, target)
    }
    
    // 对于方法，返回我们重写的版本
    const instrumentations = target instanceof Map 
      ? mapInstrumentations 
      : setInstrumentations
    
    if (key in instrumentations) {
      return Reflect.get(instrumentations, key, receiver)
    }
    
    // 其他属性正常返回
    return Reflect.get(target, key, receiver)
  }
}
```

注意 size 的处理：`Reflect.get(target, key, target)` 第三个参数用的是 `target` 而不是 `receiver`。这是因为 size 是 Map/Set 原型上的 getter 属性，它内部会访问实例的内部槽（internal slot），必须在原始对象上调用才能正常工作。

## Map 方法的重写

接下来，我们为 Map 的每个方法编写重写版本。先看最核心的 get 和 set 方法：

```typescript
const mapInstrumentations = {
  get(this: Map<unknown, unknown>, key: unknown) {
    // 获取原始 Map（this 是代理对象）
    const target = (this as any)[ReactiveFlags.RAW]
    // 如果 key 是响应式的，需要转为原始值
    const rawKey = toRaw(key)
    
    // 收集依赖：有人读取了这个 key
    track(target, rawKey)
    
    // 从原始 Map 获取值
    const result = target.get(rawKey)
    
    // 如果值是对象，递归转为响应式
    if (typeof result === 'object' && result !== null) {
      return reactive(result)
    }
    
    return result
  },
  
  set(this: Map<unknown, unknown>, key: unknown, value: unknown) {
    const target = (this as any)[ReactiveFlags.RAW]
    const rawKey = toRaw(key)
    const rawValue = toRaw(value)
    
    // 检查是新增还是修改
    const hadKey = target.has(rawKey)
    const oldValue = target.get(rawKey)
    
    // 执行实际操作
    target.set(rawKey, rawValue)
    
    // 触发更新
    if (!hadKey) {
      trigger(target, rawKey, TriggerType.ADD)
    } else if (oldValue !== rawValue) {
      trigger(target, rawKey, TriggerType.SET)
    }
    
    // 返回 this 以支持链式调用
    return this
  }
}
```

几个关键点值得注意。首先是 `toRaw` 的使用：用户可能用响应式对象作为 key 或 value，但我们存储时应该使用原始值，否则会导致"数据污染"——原始 Map 中存的是代理对象，这既浪费内存，又可能导致查找失败。

其次是 get 方法中的嵌套响应式处理：如果从 Map 中取出的值是对象，我们将其转换为响应式再返回。这保证了 `map.get('obj').count` 这样的深层访问也能被追踪。

has 和 delete 方法的实现逻辑类似：

```typescript
const mapInstrumentations = {
  // ... get 和 set ...
  
  has(this: Map<unknown, unknown>, key: unknown) {
    const target = (this as any)[ReactiveFlags.RAW]
    const rawKey = toRaw(key)
    
    // has 也是一种读取操作，需要收集依赖
    track(target, rawKey)
    
    return target.has(rawKey)
  },
  
  delete(this: Map<unknown, unknown>, key: unknown) {
    const target = (this as any)[ReactiveFlags.RAW]
    const rawKey = toRaw(key)
    
    // 只在确实存在时才触发
    const hadKey = target.has(rawKey)
    const result = target.delete(rawKey)
    
    if (hadKey) {
      trigger(target, rawKey, TriggerType.DELETE)
    }
    
    return result
  },
  
  clear(this: Map<unknown, unknown>) {
    const target = (this as any)[ReactiveFlags.RAW]
    const hadItems = target.size > 0
    
    target.clear()
    
    // clear 影响所有元素，需要触发特殊处理
    if (hadItems) {
      trigger(target, null, TriggerType.CLEAR)
    }
  }
}
```

delete 只在 key 确实存在时才触发更新。clear 方法比较特殊：它删除所有元素，我们用 `null` 作为 key，`CLEAR` 作为类型，让 trigger 知道需要触发所有相关的依赖。

## 迭代方法的处理

forEach、keys、values、entries 以及 `Symbol.iterator` 都是迭代相关的方法。它们的特点是：依赖于整个集合的内容，而不是某个特定的 key。我们引入一个特殊的依赖 key `ITERATE_KEY` 来追踪这类依赖：

```typescript
const ITERATE_KEY = Symbol('iterate')

const mapInstrumentations = {
  // ... 其他方法 ...
  
  forEach(
    this: Map<unknown, unknown>, 
    callback: Function, 
    thisArg?: unknown
  ) {
    const target = (this as any)[ReactiveFlags.RAW]
    const proxy = this
    
    // 迭代依赖于整个集合的结构
    track(target, ITERATE_KEY)
    
    // 遍历时，值需要转为响应式
    target.forEach((value: unknown, key: unknown) => {
      callback.call(
        thisArg,
        typeof value === 'object' && value !== null ? reactive(value) : value,
        typeof key === 'object' && key !== null ? reactive(key) : key,
        proxy
      )
    })
  },
  
  keys(this: Map<unknown, unknown>) {
    const target = (this as any)[ReactiveFlags.RAW]
    track(target, ITERATE_KEY)
    
    // 包装迭代器，让值也是响应式的
    const innerIterator = target.keys()
    return createIteratorWrapper(innerIterator)
  },
  
  values(this: Map<unknown, unknown>) {
    const target = (this as any)[ReactiveFlags.RAW]
    track(target, ITERATE_KEY)
    
    const innerIterator = target.values()
    return createIteratorWrapper(innerIterator)
  },
  
  entries(this: Map<unknown, unknown>) {
    const target = (this as any)[ReactiveFlags.RAW]
    track(target, ITERATE_KEY)
    
    const innerIterator = target.entries()
    return createIteratorWrapper(innerIterator, true)
  },
  
  [Symbol.iterator](this: Map<unknown, unknown>) {
    // Map 的默认迭代器就是 entries
    return this.entries()
  }
}
```

迭代器包装函数确保迭代出的值也是响应式的：

```typescript
function createIteratorWrapper(
  iterator: Iterator<any>, 
  isEntries = false
) {
  return {
    next() {
      const { value, done } = iterator.next()
      
      if (done) {
        return { value, done }
      }
      
      // entries 返回 [key, value] 数组
      if (isEntries) {
        return {
          value: [
            wrap(value[0]),
            wrap(value[1])
          ],
          done: false
        }
      }
      
      // keys 或 values 返回单个值
      return {
        value: wrap(value),
        done: false
      }
    },
    [Symbol.iterator]() {
      return this
    }
  }
}

function wrap(value: unknown) {
  return typeof value === 'object' && value !== null
    ? reactive(value)
    : value
}
```

## 改进 trigger 以处理迭代依赖

当集合的结构发生变化时（添加、删除元素），我们需要触发那些通过迭代方法建立的依赖。这需要在 trigger 中添加相应的逻辑：

```typescript
function trigger(target: object, key: unknown, type: string) {
  const depsMap = targetMap.get(target)
  if (!depsMap) return
  
  const effectsToRun = new Set<ReactiveEffect>()
  
  // 收集直接依赖于这个 key 的 effects
  if (key !== null) {
    const deps = depsMap.get(key)
    if (deps) {
      deps.forEach(effect => {
        if (effect !== activeEffect) {
          effectsToRun.add(effect)
        }
      })
    }
  }
  
  // 结构变化时，触发迭代依赖和 size 依赖
  if (type === TriggerType.ADD || 
      type === TriggerType.DELETE || 
      type === TriggerType.CLEAR) {
    
    // 触发迭代依赖
    const iterateDeps = depsMap.get(ITERATE_KEY)
    if (iterateDeps) {
      iterateDeps.forEach(effect => {
        if (effect !== activeEffect) {
          effectsToRun.add(effect)
        }
      })
    }
    
    // 触发 size 依赖
    const sizeDeps = depsMap.get('size')
    if (sizeDeps) {
      sizeDeps.forEach(effect => {
        if (effect !== activeEffect) {
          effectsToRun.add(effect)
        }
      })
    }
  }
  
  // 执行 effects
  effectsToRun.forEach(effect => {
    if (effect.scheduler) {
      effect.scheduler(effect)
    } else {
      effect.run()
    }
  })
}
```

这样，当用户通过 forEach 遍历 Map 后，添加新元素会正确触发重新遍历。

## Set 的处理

Set 的处理与 Map 非常相似，只是方法签名略有不同。Set 用 add 而不是 set，并且没有 key-value 的区分：

```typescript
const setInstrumentations = {
  add(this: Set<unknown>, value: unknown) {
    const target = (this as any)[ReactiveFlags.RAW]
    const rawValue = toRaw(value)
    
    const hadValue = target.has(rawValue)
    target.add(rawValue)
    
    if (!hadValue) {
      trigger(target, rawValue, TriggerType.ADD)
    }
    
    return this
  },
  
  has(this: Set<unknown>, value: unknown) {
    const target = (this as any)[ReactiveFlags.RAW]
    track(target, toRaw(value))
    return target.has(toRaw(value))
  },
  
  delete(this: Set<unknown>, value: unknown) {
    const target = (this as any)[ReactiveFlags.RAW]
    const rawValue = toRaw(value)
    const hadValue = target.has(rawValue)
    const result = target.delete(rawValue)
    
    if (hadValue) {
      trigger(target, rawValue, TriggerType.DELETE)
    }
    
    return result
  },
  
  clear(this: Set<unknown>) {
    const target = (this as any)[ReactiveFlags.RAW]
    const hadItems = target.size > 0
    target.clear()
    if (hadItems) {
      trigger(target, null, TriggerType.CLEAR)
    }
  },
  
  forEach(this: Set<unknown>, callback: Function, thisArg?: unknown) {
    const target = (this as any)[ReactiveFlags.RAW]
    track(target, ITERATE_KEY)
    
    target.forEach((value: unknown) => {
      const wrappedValue = wrap(value)
      // Set 的 forEach callback 的第一和第二个参数都是 value
      callback.call(thisArg, wrappedValue, wrappedValue, this)
    })
  },
  
  values(this: Set<unknown>) {
    const target = (this as any)[ReactiveFlags.RAW]
    track(target, ITERATE_KEY)
    return createIteratorWrapper(target.values())
  },
  
  keys(this: Set<unknown>) {
    // Set 的 keys() 和 values() 行为相同
    return this.values()
  },
  
  [Symbol.iterator](this: Set<unknown>) {
    return this.values()
  }
}
```

## 整合到 reactive 函数

最后，我们需要修改 reactive 函数，让它能够识别 Map 和 Set 并使用正确的 handlers：

```typescript
export function reactive<T extends object>(target: T): T {
  // 检查是否是集合类型
  if (target instanceof Map || target instanceof Set) {
    return createCollectionProxy(target)
  }
  
  // 普通对象使用之前的逻辑
  return createReactiveObject(target, false, reactiveHandlers, reactiveMap)
}

function createCollectionProxy<T extends Map<any, any> | Set<any>>(
  target: T
): T {
  // 检查缓存
  const existingProxy = reactiveMap.get(target)
  if (existingProxy) {
    return existingProxy
  }
  
  const proxy = new Proxy(target, collectionHandlers)
  reactiveMap.set(target, proxy)
  
  return proxy as T
}
```

## 本章小结

集合类型的响应式处理展示了一个重要的设计原则：当标准机制不适用时，需要在更高层次进行拦截。对于 Map 和 Set，我们没有办法拦截方法内部的操作，但我们可以拦截对方法的访问，返回我们自己的实现。

这种"方法拦截"的策略在 JavaScript 中有广泛的应用。无论是数组的方法重写，还是集合的方法包装，核心思想都是一样的：在用户调用方法之前，替换成我们的版本，在其中添加需要的逻辑（依赖收集、触发更新），然后将实际工作委托给原始实现。

实现中还有一些容易忽略的细节：使用 `toRaw` 避免数据污染、包装迭代器返回值保证嵌套响应式、在 size getter 上使用正确的 receiver 避免报错。这些细节决定了实现的健壮性，是生产级代码必须考虑的。

在下一章中，我们将实现 effectScope，看看如何管理和组织多个相关的 effects。
