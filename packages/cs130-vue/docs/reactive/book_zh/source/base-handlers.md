# baseHandlers：基础拦截器

baseHandlers.ts 文件定义了普通对象和数组的 Proxy 拦截器。这是响应式系统中最核心的代码之一，理解它就理解了 reactive 对象如何拦截各种操作。

## 四套拦截器

文件导出了四套拦截器配置，对应四种响应式模式：

```typescript
export const mutableHandlers: ProxyHandler<object> = {
  get,
  set,
  deleteProperty,
  has,
  ownKeys
}

export const readonlyHandlers: ProxyHandler<object> = {
  get: readonlyGet,
  set(target, key) {
    if (__DEV__) {
      warn(`Set operation on key "${String(key)}" failed: target is readonly.`)
    }
    return true
  },
  deleteProperty(target, key) {
    if (__DEV__) {
      warn(`Delete operation on key "${String(key)}" failed: target is readonly.`)
    }
    return true
  }
}

export const shallowReactiveHandlers: ProxyHandler<object> = {
  ...mutableHandlers,
  get: shallowGet,
  set: shallowSet
}

export const shallowReadonlyHandlers: ProxyHandler<object> = {
  ...readonlyHandlers,
  get: shallowReadonlyGet
}
```

mutableHandlers 是最完整的配置，包含所有五种拦截器。其他三套都是它的变体，通过替换特定拦截器来改变行为。

readonlyHandlers 用只读版的 get 替换了 get，并把 set 和 deleteProperty 改成了警告并返回 true（Proxy 规范要求返回 boolean）。

shallowReactiveHandlers 继承了 mutableHandlers，但用浅层版的 get 和 set 替换。

shallowReadonlyHandlers 继承了 readonlyHandlers，只替换了 get。

## 拦截器生成工厂

实际上，这些拦截器函数是通过工厂函数生成的：

```typescript
const get = createGetter()
const shallowGet = createGetter(false, true)
const readonlyGet = createGetter(true)
const shallowReadonlyGet = createGetter(true, true)

const set = createSetter()
const shallowSet = createSetter(true)
```

createGetter 和 createSetter 接受配置参数，返回配置好的拦截器函数。这种设计避免了大量重复代码——不同模式的拦截器逻辑大体相同，只是在细节上有差异。

## createGetter 工厂

createGetter 是文件中最复杂的函数，它接受两个参数：

```typescript
function createGetter(isReadonly = false, shallow = false) {
  return function get(target: Target, key: string | symbol, receiver: object) {
    // ... 拦截逻辑
  }
}
```

`isReadonly` 表示是否为只读模式，readonly 和 shallowReadonly 传 true。

`shallow` 表示是否为浅层模式，shallowReactive 和 shallowReadonly 传 true。

这两个参数的组合决定了 get 拦截器的行为：是否触发依赖收集、是否深层代理嵌套对象。

## 特殊属性检测

get 拦截器首先处理几个特殊的内部属性：

```typescript
if (key === ReactiveFlags.IS_REACTIVE) {
  return !isReadonly
}
if (key === ReactiveFlags.IS_READONLY) {
  return isReadonly
}
if (key === ReactiveFlags.IS_SHALLOW) {
  return shallow
}
if (key === ReactiveFlags.RAW) {
  if (
    receiver === (isReadonly
      ? shallow ? shallowReadonlyMap : readonlyMap
      : shallow ? shallowReactiveMap : reactiveMap
    ).get(target) ||
    Object.getPrototypeOf(target) === Object.getPrototypeOf(receiver)
  ) {
    return target
  }
  return
}
```

这些属性在原始对象上并不存在，而是通过 get 拦截器"虚拟"返回的。这就是 isReactive、isReadonly、toRaw 等工具函数的工作原理——它们访问这些特殊属性，get 拦截器返回相应的值。

`ReactiveFlags.IS_REACTIVE`（`__v_isReactive`）：非只读代理返回 true。

`ReactiveFlags.IS_READONLY`（`__v_isReadonly`）：只读代理返回 true。

`ReactiveFlags.IS_SHALLOW`（`__v_isShallow`）：浅层代理返回 true。

`ReactiveFlags.RAW`（`__v_raw`）：返回被代理的原始对象。

RAW 的处理稍微复杂一些，它会验证请求者是否是"合法"的代理接收者，防止恶意访问。

## 数组方法特殊处理

对于数组，某些方法需要特殊处理：

```typescript
const targetIsArray = isArray(target)
if (!isReadonly) {
  if (targetIsArray && hasOwn(arrayInstrumentations, key)) {
    return Reflect.get(arrayInstrumentations, key, receiver)
  }
  if (key === 'hasOwnProperty') {
    return hasOwnProperty
  }
}
```

arrayInstrumentations 是一个包装对象，重新实现了部分数组方法。需要特殊处理的方法包括：

`includes`、`indexOf`、`lastIndexOf`：这些方法在响应式数组中可能有问题，因为它们比较的是原始值还是代理值。arrayInstrumentations 确保它们能正确工作。

`push`、`pop`、`shift`、`unshift`、`splice`：这些方法会同时读写数组，如果不特殊处理，可能导致无限循环。

## 依赖收集

处理完特殊情况后，执行真正的属性访问和依赖收集：

```typescript
const res = Reflect.get(target, key, receiver)

if (isSymbol(key) ? builtInSymbols.has(key) : isNonTrackableKey(key)) {
  return res
}

if (!isReadonly) {
  track(target, TrackOpTypes.GET, key)
}
```

首先用 Reflect.get 获取实际的属性值。

然后检查是否应该跳过追踪。内置 Symbol（如 Symbol.iterator）和一些特殊键（如 `__proto__`、`__v_isRef`）不需要追踪。

如果不是只读模式，调用 track 函数收集依赖。只读对象不需要收集依赖，因为它们不会变化。

## 深层响应式

最后一步是处理嵌套对象的响应式：

```typescript
if (shallow) {
  return res
}

if (isRef(res)) {
  return targetIsArray && isIntegerKey(key) ? res : res.value
}

if (isObject(res)) {
  return isReadonly ? readonly(res) : reactive(res)
}

return res
```

如果是浅层模式，直接返回值，不做进一步处理。

如果返回的值是 ref，根据情况自动解包。数组的数字索引不解包（保持一致性），其他情况自动返回 `.value`。

如果返回的值是对象，递归调用 reactive 或 readonly 创建嵌套代理。这实现了"惰性深层代理"——只有真正访问到嵌套对象时才创建代理，而不是一开始就递归代理所有层级。

## createSetter 工厂

createSetter 相对简单一些：

```typescript
function createSetter(shallow = false) {
  return function set(
    target: object,
    key: string | symbol,
    value: unknown,
    receiver: object
  ): boolean {
    let oldValue = (target as any)[key]
    
    if (!shallow) {
      const isOldValueReadonly = isReadonly(oldValue)
      if (!isShallow(value) && !isReadonly(value)) {
        oldValue = toRaw(oldValue)
        value = toRaw(value)
      }
      if (!isArray(target) && isRef(oldValue) && !isRef(value)) {
        if (isOldValueReadonly) {
          return false
        } else {
          oldValue.value = value
          return true
        }
      }
    }
    
    const hadKey = isArray(target) && isIntegerKey(key)
      ? Number(key) < target.length
      : hasOwn(target, key)
      
    const result = Reflect.set(target, key, value, receiver)
    
    if (target === toRaw(receiver)) {
      if (!hadKey) {
        trigger(target, TriggerOpTypes.ADD, key, value)
      } else if (hasChanged(value, oldValue)) {
        trigger(target, TriggerOpTypes.SET, key, value, oldValue)
      }
    }
    
    return result
  }
}
```

set 拦截器的主要任务是：设置新值，然后在适当的时候触发更新。

首先获取旧值。

然后在非浅层模式下做一些预处理：如果旧值是 ref 而新值不是，直接设置 ref 的 value 而不是替换 ref。

接下来判断这是"新增"还是"修改"操作。对于数组，如果索引小于当前长度就是修改，否则是新增。对于对象，检查属性是否已存在。

使用 Reflect.set 执行实际的设置。

最后触发更新。`target === toRaw(receiver)` 这个检查确保只有直接在代理上设置才触发更新，继承链上的设置不触发。新增和修改触发不同类型的更新，这对某些场景（如数组的 length 变化）有影响。

## deleteProperty 和 has

这两个拦截器相对简单：

```typescript
function deleteProperty(target: object, key: string | symbol): boolean {
  const hadKey = hasOwn(target, key)
  const oldValue = (target as any)[key]
  const result = Reflect.deleteProperty(target, key)
  if (result && hadKey) {
    trigger(target, TriggerOpTypes.DELETE, key, undefined, oldValue)
  }
  return result
}

function has(target: object, key: string | symbol): boolean {
  const result = Reflect.has(target, key)
  if (!isSymbol(key) || !builtInSymbols.has(key)) {
    track(target, TrackOpTypes.HAS, key)
  }
  return result
}
```

deleteProperty 在删除成功后触发 DELETE 类型的更新。

has 拦截器被 `in` 操作符触发，它会收集依赖。这意味着如果 effect 中使用了 `'foo' in obj`，当 foo 属性被添加或删除时，effect 会重新执行。

## ownKeys 拦截器

ownKeys 拦截器被 `Object.keys()`、`for...in` 循环等操作触发：

```typescript
function ownKeys(target: object): (string | symbol)[] {
  track(
    target,
    TrackOpTypes.ITERATE,
    isArray(target) ? 'length' : ITERATE_KEY
  )
  return Reflect.ownKeys(target)
}
```

对于数组，使用 'length' 作为追踪键；对于对象，使用一个特殊的 ITERATE_KEY。这样当数组长度变化或对象属性增删时，依赖于遍历的 effect 会被触发。

## 设计总结

baseHandlers 的设计体现了几个重要思想：

工厂模式使得代码复用最大化。四套拦截器通过参数控制行为差异，避免了大量重复代码。

惰性代理提升了性能。嵌套对象只有在被访问时才创建代理，而不是一开始就递归所有层级。

分类触发让更新更精确。区分 GET/SET/ADD/DELETE/ITERATE 等操作类型，可以让 trigger 函数更精确地判断哪些 effect 需要重新执行。

特殊情况妥善处理。数组方法、ref 解包、只读检查等边缘情况都有专门的处理逻辑。

在接下来的章节中，我们将分别深入 get 和 set 拦截器的细节，理解它们是如何与 track 和 trigger 配合工作的。

