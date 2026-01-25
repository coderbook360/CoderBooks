# get 拦截器详解

get 拦截器是响应式系统中最复杂的部分之一。每次读取响应式对象的属性，都会经过这个拦截器。它负责依赖收集、嵌套代理、ref 解包等多项工作。

## createGetter 完整分析

让我们逐段分析 createGetter 函数：

```typescript
function createGetter(isReadonly = false, shallow = false) {
  return function get(target: Target, key: string | symbol, receiver: object) {
    // ... 完整实现
  }
}
```

工厂函数接收两个布尔参数，返回一个闭包。闭包记住了这两个参数，在每次属性访问时使用它们决定行为。

## 内部标记处理

get 函数的第一部分处理 Vue3 响应式系统的内部标记：

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
```

这些标记用于运行时检测对象的响应式状态。它们是"虚拟属性"——原始对象上并没有这些属性，但通过 get 拦截器可以返回相应的值。

`isReactive()` 函数的实现就是读取 `__v_isReactive` 属性：

```typescript
export function isReactive(value: unknown): boolean {
  if (isReadonly(value)) {
    return isReactive((value as Target)[ReactiveFlags.RAW])
  }
  return !!(value && (value as Target)[ReactiveFlags.IS_REACTIVE])
}
```

注意一个微妙的点：readonly 代理的 `__v_isReactive` 返回 false（因为 `!isReadonly` 是 false），但如果原始对象是 reactive 的，isReactive 函数会穿透 readonly 外层检查原始对象。

## RAW 属性的访问控制

RAW 属性（`__v_raw`）返回原始对象，需要特别小心处理：

```typescript
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

这段代码确保只有"合法"的访问才能获取原始对象。receiver 必须是对应 proxyMap 中存储的那个代理，或者原型链匹配。这防止了通过继承或其他方式恶意获取原始对象。

在正常使用中，`toRaw()` 函数通过这个机制获取原始对象：

```typescript
export function toRaw<T>(observed: T): T {
  const raw = observed && (observed as Target)[ReactiveFlags.RAW]
  return raw ? toRaw(raw) : observed
}
```

toRaw 递归调用自己，因为可能存在多层代理（如 `readonly(reactive(obj))`）。

## 数组方法重写

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

arrayInstrumentations 对象定义了这些重写的方法。让我们看看它是如何实现的：

```typescript
const arrayInstrumentations = createArrayInstrumentations()

function createArrayInstrumentations() {
  const instrumentations: Record<string, Function> = {}
  
  // 查找方法
  ;(['includes', 'indexOf', 'lastIndexOf'] as const).forEach(key => {
    instrumentations[key] = function(this: unknown[], ...args: unknown[]) {
      const arr = toRaw(this) as any
      for (let i = 0, l = this.length; i < l; i++) {
        track(arr, TrackOpTypes.GET, i + '')
      }
      const res = arr[key](...args)
      if (res === -1 || res === false) {
        return arr[key](...args.map(toRaw))
      }
      return res
    }
  })
  
  // 修改方法
  ;(['push', 'pop', 'shift', 'unshift', 'splice'] as const).forEach(key => {
    instrumentations[key] = function(this: unknown[], ...args: unknown[]) {
      pauseTracking()
      pauseScheduling()
      const res = (toRaw(this) as any)[key].apply(this, args)
      resetScheduling()
      resetTracking()
      return res
    }
  })
  
  return instrumentations
}
```

查找方法（includes、indexOf、lastIndexOf）的问题在于：用户可能用原始对象去查找，而数组中存储的是代理对象，或者反过来。重写后的方法先用原始参数尝试，如果找不到再用 toRaw 后的参数尝试。

修改方法（push、pop 等）的问题在于：它们既读取 length 又修改 length，可能导致无限循环。pauseTracking 和 pauseScheduling 暂时禁用依赖收集和调度，避免在方法执行过程中触发不必要的更新。

## 获取属性值

处理完特殊情况后，使用 Reflect.get 获取实际的属性值：

```typescript
const res = Reflect.get(target, key, receiver)
```

为什么用 Reflect.get 而不是直接 `target[key]`？因为 Reflect.get 正确处理了 receiver 参数。当访问的属性是 getter 时，receiver 决定了 getter 中 this 的值。使用 receiver（即代理对象）确保 getter 中的 this 指向代理而不是原始对象，这样 getter 中的属性访问也能被追踪。

## 跳过追踪的情况

某些属性不应该被追踪：

```typescript
if (isSymbol(key) ? builtInSymbols.has(key) : isNonTrackableKey(key)) {
  return res
}
```

builtInSymbols 包含 JavaScript 内置的 Symbol：

```typescript
const builtInSymbols = new Set(
  Object.getOwnPropertyNames(Symbol)
    .filter(key => key !== 'arguments' && key !== 'caller')
    .map(key => (Symbol as any)[key])
    .filter(isSymbol)
)
```

这包括 Symbol.iterator、Symbol.toStringTag 等。追踪这些内部符号没有意义，只会增加开销。

isNonTrackableKey 检查一些特殊的字符串键：

```typescript
const isNonTrackableKey = (key: unknown) =>
  key === '__proto__' ||
  key === '__v_isRef' ||
  key === '__isVue'
```

这些是 JavaScript 原型链相关的属性或 Vue 内部标记，不需要追踪。

## 依赖收集

如果不是只读模式，调用 track 收集依赖：

```typescript
if (!isReadonly) {
  track(target, TrackOpTypes.GET, key)
}
```

只读对象不需要收集依赖，因为它们的值永远不会变化。这是一个优化——减少不必要的依赖存储和更新检查。

track 函数我们会在后面的章节详细分析。这里只需要知道它将当前活跃的 effect 与 (target, key) 关联起来。

## Ref 自动解包

如果属性值是 ref，可能需要自动解包：

```typescript
if (isRef(res)) {
  return targetIsArray && isIntegerKey(key) ? res : res.value
}
```

数组的数字索引不自动解包，这是有意为之的设计。考虑这种情况：

```javascript
const arr = reactive([ref(1), ref(2), ref(3)])
console.log(arr[0]) // 应该返回 ref，还是 1？
```

如果自动解包，`arr[0] = 5` 会变成 `arr[0].value = 5`（修改 ref 的值），还是 `arr[0] = 5`（替换 ref）？为了避免歧义，数组中的 ref 保持不解包。

但对于普通对象的属性，ref 会自动解包：

```javascript
const obj = reactive({ count: ref(0) })
console.log(obj.count) // 0，不是 Ref 对象
obj.count++ // 相当于 obj.count.value++
```

这种设计让 reactive 对象中的 ref 使用起来更自然。

## 深层代理

如果属性值是对象，递归创建代理：

```typescript
if (isObject(res)) {
  return isReadonly ? readonly(res) : reactive(res)
}
```

这实现了"惰性深层代理"。只有当属性被访问时，才为它创建代理。如果一个对象有很多嵌套属性但只访问了一部分，那些未访问的部分不会被代理，节省了资源。

注意这里调用的是 reactive 或 readonly，它们会检查缓存。所以同一个嵌套对象多次访问，返回的是同一个代理。

## 浅层模式

在浅层模式下，上面的 ref 解包和深层代理都被跳过：

```typescript
if (shallow) {
  return res
}
```

浅层模式只代理顶层属性，嵌套对象保持原样。这在以下场景有用：

大型不需要深层响应式的数据结构（如只读配置）。

需要精确控制响应式范围的场景。

与不兼容 Proxy 的第三方库集成时。

## 性能考量

get 拦截器是响应式系统中调用最频繁的函数之一。每次属性访问都会经过它，所以它的性能至关重要。

Vue3 通过几种方式优化性能：

首先是快速路径。最常见的情况（普通属性访问）处理路径最短。特殊情况的检查使用了短路求值，避免不必要的计算。

其次是缓存。proxyMap 缓存已创建的代理，避免重复创建。嵌套对象的代理也会被缓存。

第三是惰性。深层代理只在访问时创建。如果嵌套对象从未被访问，就不会产生任何开销。

在下一章中，我们将分析 set 拦截器，看看它是如何与 get 配合工作的。

