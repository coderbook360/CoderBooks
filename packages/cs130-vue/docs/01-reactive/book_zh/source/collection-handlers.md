# collectionHandlers：集合拦截器

Map、Set、WeakMap、WeakSet 这四种集合类型有特殊的内部结构，不能像普通对象那样使用标准的 get/set 拦截器。Vue3 为它们设计了专门的 collectionHandlers。

## 集合类型的特殊性

普通对象的属性通过 `[[Get]]` 和 `[[Set]]` 内部方法访问，可以被 Proxy 的 get 和 set 拦截。但集合类型的方法（如 Map.get、Set.add）使用内部槽位（internal slots），不经过这些内部方法。

```javascript
const map = new Map()
const proxy = new Proxy(map, {
  get(target, key, receiver) {
    console.log('get:', key)
    return Reflect.get(target, key, receiver)
  }
})

proxy.set('foo', 'bar') // 触发 get: 'set'，但实际的 set 操作不被拦截
proxy.get('foo')        // 触发 get: 'get'，但实际的 get 操作不被拦截
```

Proxy 能拦截到对 `set` 方法的访问，但无法拦截 `set` 方法内部的操作。Map 的 `[[MapData]]` 槽位直接被方法访问，绕过了 Proxy。

更糟的是，如果直接调用原始方法，会报错：

```javascript
proxy.get('foo')
// TypeError: Method Map.prototype.get called on incompatible receiver
```

这是因为 `get` 方法的 this 是 proxy 而不是原始 Map，但 Map 方法需要操作真正的 Map 内部槽位。

## 解决方案：方法拦截

Vue3 的解决方案是：拦截方法的访问，返回包装后的方法。

```typescript
const mutableCollectionHandlers: ProxyHandler<CollectionTypes> = {
  get: createInstrumentationGetter(false, false)
}
```

只有一个 get 拦截器，它返回包装后的集合方法。

```typescript
function createInstrumentationGetter(isReadonly: boolean, shallow: boolean) {
  const instrumentations = shallow
    ? isReadonly
      ? shallowReadonlyInstrumentations
      : shallowInstrumentations
    : isReadonly
      ? readonlyInstrumentations
      : mutableInstrumentations

  return (target: CollectionTypes, key: string | symbol, receiver: CollectionTypes) => {
    // 处理响应式标记
    if (key === ReactiveFlags.IS_REACTIVE) return !isReadonly
    if (key === ReactiveFlags.IS_READONLY) return isReadonly
    if (key === ReactiveFlags.RAW) return target

    return Reflect.get(
      hasOwn(instrumentations, key) && key in target
        ? instrumentations
        : target,
      key,
      receiver
    )
  }
}
```

当访问 `proxy.get` 时，如果 `instrumentations` 对象中有 `get` 方法，就返回 `instrumentations.get`；否则返回原始方法。

## instrumentations 对象

mutableInstrumentations 包含了所有需要重写的方法：

```typescript
const mutableInstrumentations: Record<string, Function | number> = {
  get(this: MapTypes, key: unknown) {
    return get(this, key)
  },
  get size() {
    return size(this as unknown as IterableCollections)
  },
  has,
  add,
  set,
  delete: deleteEntry,
  clear,
  forEach: createForEach(false, false)
}
```

每个方法都被重写为包装版本，在调用原始方法的同时进行依赖收集或触发更新。

## get 方法实现

让我们看看 Map 的 get 方法是如何被包装的：

```typescript
function get(
  target: MapTypes,
  key: unknown,
  isReadonly = false,
  isShallow = false
) {
  target = (target as any)[ReactiveFlags.RAW]
  const rawTarget = toRaw(target)
  const rawKey = toRaw(key)
  
  if (!isReadonly) {
    if (hasChanged(key, rawKey)) {
      track(rawTarget, TrackOpTypes.GET, key)
    }
    track(rawTarget, TrackOpTypes.GET, rawKey)
  }
  
  const { has } = getProto(rawTarget)
  const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive
  
  if (has.call(rawTarget, key)) {
    return wrap(target.get(key))
  } else if (has.call(rawTarget, rawKey)) {
    return wrap(target.get(rawKey))
  } else if (target !== rawTarget) {
    target.get(key)
  }
}
```

这个实现有几个关键点：

首先，获取原始 target 和 key。因为 key 本身也可能是响应式的。

然后，收集依赖。对 key 和 rawKey 都进行追踪（如果它们不同的话）。

最后，获取值并包装。如果值是对象，用 toReactive 包装使其响应式。

## set 方法实现

Map 的 set 方法：

```typescript
function set(this: MapTypes, key: unknown, value: unknown) {
  value = toRaw(value)
  const target = toRaw(this)
  const { has, get } = getProto(target)
  
  let hadKey = has.call(target, key)
  if (!hadKey) {
    key = toRaw(key)
    hadKey = has.call(target, key)
  }
  
  const oldValue = get.call(target, key)
  target.set(key, value)
  
  if (!hadKey) {
    trigger(target, TriggerOpTypes.ADD, key, value)
  } else if (hasChanged(value, oldValue)) {
    trigger(target, TriggerOpTypes.SET, key, value, oldValue)
  }
  
  return this
}
```

首先将 value 转为原始值。存储在 Map 中的应该是原始对象，不是代理。

然后检查 key 是否已存在。这决定了是 ADD 还是 SET 类型的更新。

执行实际的 set 操作。

最后触发更新。和普通对象的 set 类似，新增触发 ADD，修改触发 SET。

## add 方法（Set 专用）

Set 的 add 方法：

```typescript
function add(this: SetTypes, value: unknown) {
  value = toRaw(value)
  const target = toRaw(this)
  const proto = getProto(target)
  const hadKey = proto.has.call(target, value)
  
  if (!hadKey) {
    target.add(value)
    trigger(target, TriggerOpTypes.ADD, value, value)
  }
  
  return this
}
```

Set 的 add 只在值不存在时才触发更新。如果值已存在，add 实际上是空操作，不需要触发更新。

## delete 方法

delete 方法（Map 和 Set 共用）：

```typescript
function deleteEntry(this: CollectionTypes, key: unknown) {
  const target = toRaw(this)
  const { has, get } = getProto(target)
  
  let hadKey = has.call(target, key)
  if (!hadKey) {
    key = toRaw(key)
    hadKey = has.call(target, key)
  }
  
  const oldValue = get ? get.call(target, key) : undefined
  const result = target.delete(key)
  
  if (hadKey) {
    trigger(target, TriggerOpTypes.DELETE, key, undefined, oldValue)
  }
  
  return result
}
```

只有当 key 确实存在并被删除时，才触发更新。

## clear 方法

clear 方法清空整个集合：

```typescript
function clear(this: IterableCollections) {
  const target = toRaw(this)
  const hadItems = target.size !== 0
  const oldTarget = __DEV__
    ? isMap(target)
      ? new Map(target)
      : new Set(target)
    : undefined
    
  const result = target.clear()
  
  if (hadItems) {
    trigger(target, TriggerOpTypes.CLEAR, undefined, undefined, oldTarget)
  }
  
  return result
}
```

clear 触发 CLEAR 类型的更新。在开发模式下，会保存旧的集合副本用于调试。

## size 属性

size 不是方法，是一个 getter：

```typescript
function size(target: IterableCollections, isReadonly = false) {
  target = (target as any)[ReactiveFlags.RAW]
  !isReadonly && track(toRaw(target), TrackOpTypes.ITERATE, ITERATE_KEY)
  return Reflect.get(target, 'size', target)
}
```

size 的变化通常意味着集合内容变化，所以用 ITERATE_KEY 追踪。这样 ADD、DELETE、CLEAR 操作都会触发依赖 size 的 effect。

## forEach 方法

forEach 需要特殊处理，因为它会遍历所有元素：

```typescript
function createForEach(isReadonly: boolean, isShallow: boolean) {
  return function forEach(
    this: IterableCollections,
    callback: Function,
    thisArg?: unknown
  ) {
    const observed = this as any
    const target = observed[ReactiveFlags.RAW]
    const rawTarget = toRaw(target)
    const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive
    
    !isReadonly && track(rawTarget, TrackOpTypes.ITERATE, ITERATE_KEY)
    
    return target.forEach((value: unknown, key: unknown) => {
      return callback.call(thisArg, wrap(value), wrap(key), observed)
    })
  }
}
```

forEach 遍历时，传给回调的 value 和 key 都被包装为响应式的。这样在回调中访问它们时也能触发依赖收集。

## 迭代器方法

keys、values、entries 和 Symbol.iterator 都返回迭代器：

```typescript
function createIterableMethod(
  method: string | symbol,
  isReadonly: boolean,
  isShallow: boolean
) {
  return function(this: IterableCollections, ...args: unknown[]) {
    const target = (this as any)[ReactiveFlags.RAW]
    const rawTarget = toRaw(target)
    const targetIsMap = isMap(rawTarget)
    const isPair = method === 'entries' || (method === Symbol.iterator && targetIsMap)
    const isKeyOnly = method === 'keys' && targetIsMap
    const innerIterator = target[method](...args)
    const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive
    
    !isReadonly && track(
      rawTarget,
      TrackOpTypes.ITERATE,
      isKeyOnly ? MAP_KEY_ITERATE_KEY : ITERATE_KEY
    )
    
    return {
      next() {
        const { value, done } = innerIterator.next()
        return done
          ? { value, done }
          : {
              value: isPair ? [wrap(value[0]), wrap(value[1])] : wrap(value),
              done
            }
      },
      [Symbol.iterator]() {
        return this
      }
    }
  }
}
```

返回一个包装后的迭代器，每次 next() 调用时将值包装为响应式。

注意 Map.keys() 使用 MAP_KEY_ITERATE_KEY 追踪，这和值变化触发的更新区分开。修改 Map 的值不应该触发 keys() 的依赖。

## 只读集合

只读版本的 instrumentations 阻止修改操作：

```typescript
const readonlyInstrumentations: Record<string, Function | number> = {
  get(this: MapTypes, key: unknown) {
    return get(this, key, true)
  },
  get size() {
    return size(this as unknown as IterableCollections, true)
  },
  has(this: MapTypes, key: unknown) {
    return has.call(this, key, true)
  },
  add: createReadonlyMethod(TriggerOpTypes.ADD),
  set: createReadonlyMethod(TriggerOpTypes.SET),
  delete: createReadonlyMethod(TriggerOpTypes.DELETE),
  clear: createReadonlyMethod(TriggerOpTypes.CLEAR),
  forEach: createForEach(true, false)
}

function createReadonlyMethod(type: TriggerOpTypes): Function {
  return function(this: CollectionTypes, ...args: unknown[]) {
    if (__DEV__) {
      warn(`${type} operation failed: target is readonly.`)
    }
    return type === TriggerOpTypes.DELETE ? false : this
  }
}
```

修改方法被替换为警告函数，读取方法传入 `isReadonly = true` 跳过依赖收集。

## 小结

集合类型的响应式处理比普通对象复杂得多。Vue3 通过重写集合方法实现了响应式能力，每个方法在执行原始操作的同时进行依赖收集或触发更新。这种设计虽然代码量较大，但保持了 API 的自然使用方式——`map.get()`、`set.add()` 等用法不变，只是背后增加了响应式能力。

