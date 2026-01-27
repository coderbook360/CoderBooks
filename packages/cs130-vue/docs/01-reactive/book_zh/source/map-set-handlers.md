# Map/Set 的响应式处理

上一章我们概览了 collectionHandlers 的整体架构。这一章深入分析 Map 和 Set 的具体响应式处理，包括一些微妙的边缘情况。

## Map 的键可以是对象

Map 允许任意类型作为键，包括对象。当对象作为键时，如果这个对象是响应式的，就需要特殊处理。

```javascript
const key = reactive({ id: 1 })
const map = reactive(new Map())

map.set(key, 'value')
console.log(map.get(key)) // 'value'
```

这看起来正常，但实际上有个问题：key 是代理对象，存入 Map 的也是代理对象。如果用原始对象去取，能取到吗？

```javascript
const rawKey = toRaw(key)
console.log(map.get(rawKey)) // 应该返回什么？
```

Vue3 的解决方案是：在 get 方法中同时尝试用原始键和代理键查找。

```typescript
function get(target: MapTypes, key: unknown, isReadonly: boolean, isShallow: boolean) {
  target = (target as any)[ReactiveFlags.RAW]
  const rawTarget = toRaw(target)
  const rawKey = toRaw(key)
  
  // 追踪两种键
  if (!isReadonly) {
    if (hasChanged(key, rawKey)) {
      track(rawTarget, TrackOpTypes.GET, key)
    }
    track(rawTarget, TrackOpTypes.GET, rawKey)
  }
  
  const { has } = getProto(rawTarget)
  const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive
  
  // 先尝试代理键，再尝试原始键
  if (has.call(rawTarget, key)) {
    return wrap(target.get(key))
  } else if (has.call(rawTarget, rawKey)) {
    return wrap(target.get(rawKey))
  } else if (target !== rawTarget) {
    target.get(key) // 触发可能存在的 getter
  }
}
```

这样无论用代理键还是原始键去取，都能正确找到值。

## has 方法的处理

has 方法检查键是否存在：

```typescript
function has(this: CollectionTypes, key: unknown, isReadonly = false): boolean {
  const target = (this as any)[ReactiveFlags.RAW]
  const rawTarget = toRaw(target)
  const rawKey = toRaw(key)
  
  if (!isReadonly) {
    if (hasChanged(key, rawKey)) {
      track(rawTarget, TrackOpTypes.HAS, key)
    }
    track(rawTarget, TrackOpTypes.HAS, rawKey)
  }
  
  return key === rawKey
    ? target.has(key)
    : target.has(key) || target.has(rawKey)
}
```

和 get 类似，has 也同时检查代理键和原始键。依赖收集使用 HAS 类型，这样当键被添加或删除时，依赖于 has 检查的 effect 会被通知。

## Set 的值比较

Set 的行为和 Map 的键类似。Set 基于值的唯一性工作，需要处理代理值和原始值的关系。

```javascript
const item = reactive({ id: 1 })
const set = reactive(new Set())

set.add(item)
console.log(set.has(item))      // true
console.log(set.has(toRaw(item))) // 应该返回什么？
```

has 方法的处理：

```typescript
function has(this: CollectionTypes, key: unknown, isReadonly = false): boolean {
  // ... 同上
  return key === rawKey
    ? target.has(key)
    : target.has(key) || target.has(rawKey)
}
```

同样会检查两种形式的值。

## 迭代时的值包装

当遍历 Map 或 Set 时，需要将值包装为响应式的：

```javascript
const map = reactive(new Map([
  ['a', { count: 1 }],
  ['b', { count: 2 }]
]))

for (const [key, value] of map) {
  value.count++ // value 应该是响应式的
}
```

迭代器方法返回包装后的迭代器：

```typescript
function createIterableMethod(method: string | symbol, isReadonly: boolean, isShallow: boolean) {
  return function(this: IterableCollections, ...args: unknown[]) {
    // ... 省略前面的代码
    
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

对于 Map 的 entries() 和默认迭代器，返回的是 `[key, value]` 对，两者都被包装。对于 values() 和 Set 的迭代，只有值被包装。

## WeakMap 和 WeakSet

WeakMap 和 WeakSet 是 Map 和 Set 的弱引用版本。它们不可迭代，也没有 size 属性。

```typescript
const weakInstrumentations: Record<string, Function> = {
  get(this: MapTypes, key: unknown) {
    return get(this, key, false, false)
  },
  has,
  add,
  set,
  delete: deleteEntry
}
```

WeakMap 和 WeakSet 支持的方法更少，但处理方式和 Map/Set 相同。

一个重要的区别是 WeakMap 和 WeakSet 不追踪 ITERATE，因为它们不可迭代。也没有 size 追踪，因为没有 size 属性。

## 触发更新的时机

让我们整理一下各种操作触发的更新类型：

Map.set 新增键：触发 ADD，影响 size、has(key)、forEach、迭代。

Map.set 修改已有键：触发 SET，影响 get(key)、forEach、迭代。

Map.delete：触发 DELETE，影响 size、has(key)、get(key)、forEach、迭代。

Map.clear：触发 CLEAR，影响所有依赖。

Set.add 新值：触发 ADD，影响 size、has(value)、forEach、迭代。

Set.add 已存在的值：不触发任何更新。

Set.delete：触发 DELETE，影响 size、has(value)、forEach、迭代。

Set.clear：触发 CLEAR，影响所有依赖。

## ITERATE_KEY vs MAP_KEY_ITERATE_KEY

Map 有两种迭代键：

ITERATE_KEY：用于 forEach、entries、values 和默认迭代器。

MAP_KEY_ITERATE_KEY：用于 keys。

```typescript
!isReadonly && track(
  rawTarget,
  TrackOpTypes.ITERATE,
  isKeyOnly ? MAP_KEY_ITERATE_KEY : ITERATE_KEY
)
```

为什么要区分？考虑这个场景：

```javascript
const map = reactive(new Map([['a', 1]]))

effect(() => {
  for (const key of map.keys()) {
    console.log(key)
  }
})

map.set('a', 2) // 修改值，不应该触发 keys() 的依赖
map.set('b', 3) // 新增键，应该触发 keys() 的依赖
```

使用 MAP_KEY_ITERATE_KEY 可以精确控制：只有键的增删会触发，值的修改不会。

trigger 函数中的处理：

```typescript
if (type === TriggerOpTypes.ADD) {
  if (isMap(target)) {
    deps.push(depsMap.get(MAP_KEY_ITERATE_KEY))
  }
} else if (type === TriggerOpTypes.DELETE) {
  if (isMap(target)) {
    deps.push(depsMap.get(MAP_KEY_ITERATE_KEY))
  }
}
```

只有 ADD 和 DELETE 会触发 MAP_KEY_ITERATE_KEY 的依赖。

## 原始对象存储

一个重要的设计决策是：Map 和 Set 内部存储的是原始对象，不是代理。

```typescript
function set(this: MapTypes, key: unknown, value: unknown) {
  value = toRaw(value) // 存储原始值
  const target = toRaw(this)
  // ...
  target.set(key, value)
}

function add(this: SetTypes, value: unknown) {
  value = toRaw(value) // 存储原始值
  const target = toRaw(this)
  // ...
  target.add(value)
}
```

这样做的原因是：如果存储代理，可能导致同一个原始对象以多种形式存在于集合中（原始形式和各种代理形式）。转为原始值确保了唯一性。

取出时再包装为响应式：

```typescript
const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive
return wrap(target.get(key))
```

这种"存原始，取包装"的策略保持了行为的一致性。

## 性能考量

集合的响应式处理比普通对象开销更大，因为每个方法调用都需要：

获取原始对象和原始键。

可能的双重键检查（代理键和原始键）。

包装返回值。

在高频操作场景下，可以考虑使用 shallowReactive：

```javascript
const map = shallowReactive(new Map())
// 值不会被自动包装为响应式
```

或者在性能关键代码中使用原始 Map：

```javascript
const rawMap = toRaw(map)
// 直接操作，不触发响应式
rawMap.set('key', 'value')
```

## 小结

Map 和 Set 的响应式处理涉及多个细节：代理键和原始键的双重处理、迭代时的值包装、不同迭代类型的精确追踪、原始值存储等。这些设计确保了集合在响应式环境下的正确行为，同时尽量减少不必要的更新。

理解这些细节可以帮助我们在使用响应式集合时避免陷阱，并在需要时进行性能优化。

