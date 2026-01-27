# createReactiveObject 实现

createReactiveObject 是响应式系统的核心工厂函数。reactive、readonly、shallowReactive、shallowReadonly 最终都调用这个函数，只是参数不同。理解它的实现，就理解了响应式对象创建的全部逻辑。

## 函数签名

让我们先看函数签名和参数：

```typescript
function createReactiveObject(
  target: Target,
  isReadonly: boolean,
  baseHandlers: ProxyHandler<any>,
  collectionHandlers: ProxyHandler<any>,
  proxyMap: WeakMap<Target, any>
) {
  // ...
}
```

五个参数分工明确：

`target` 是要代理的原始对象。

`isReadonly` 表示创建的是否是只读代理。这会影响后续的一些判断逻辑。

`baseHandlers` 是普通对象（Object 和 Array）使用的 Proxy 拦截器。

`collectionHandlers` 是集合类型（Map、Set、WeakMap、WeakSet）使用的拦截器。

`proxyMap` 是存储代理缓存的 WeakMap，防止重复创建。

## 第一道防线：非对象类型

函数开始就检查 target 是否是对象：

```typescript
if (!isObject(target)) {
  if (__DEV__) {
    warn(
      `value cannot be made ${isReadonly ? 'readonly' : 'reactive'}: ${String(target)}`
    )
  }
  return target
}
```

isObject 的实现很简单：

```typescript
const isObject = (val: unknown): val is Record<any, any> =>
  val !== null && typeof val === 'object'
```

如果传入的是原始类型（number、string、boolean 等），开发模式下会发出警告，然后直接返回原值。这就是为什么 `reactive(1)` 返回的还是 1，而不是一个代理。

这个设计选择是有意为之的。Proxy 在 JavaScript 中只能代理对象，无法代理原始类型。与其抛出错误让应用崩溃，不如静默返回原值并给出警告，让开发者在开发阶段发现问题。

## 第二道防线：已是代理

接下来检查 target 是否已经是一个代理：

```typescript
if (
  target[ReactiveFlags.RAW] &&
  !(isReadonly && target[ReactiveFlags.IS_REACTIVE])
) {
  return target
}
```

这段逻辑稍微复杂一些。`target[ReactiveFlags.RAW]` 检查对象是否有 `__v_raw` 属性，有这个属性说明它是一个代理（通过 get 拦截器返回原始对象）。

但有一个例外：如果当前要创建 readonly 代理，而 target 是一个 reactive 代理，那么不直接返回，而是继续创建一个新的 readonly 代理包在外面。这支持了 `readonly(reactive(obj))` 的用法。

```javascript
const original = { count: 0 }
const reactiveProxy = reactive(original)
const readonlyReactiveProxy = readonly(reactiveProxy) // 合法，创建新代理
```

为什么支持这种嵌套？因为 reactive 代理是可变的，readonly 代理是不可变的，它们的语义不同。用 readonly 包装 reactive 可以在某些场景下暴露只读接口。

## 第三道防线：缓存检查

检查是否已经为这个对象创建过代理：

```typescript
const existingProxy = proxyMap.get(target)
if (existingProxy) {
  return existingProxy
}
```

如果同一个对象多次调用 reactive，应该返回同一个代理。这不仅是性能优化，也是正确性保证——如果每次都创建新代理，不同代理之间的依赖关系就乱了。

```javascript
const obj = { count: 0 }
const proxy1 = reactive(obj)
const proxy2 = reactive(obj)
console.log(proxy1 === proxy2) // true
```

## 第四道防线：可代理性检查

不是所有对象都应该被代理：

```typescript
const targetType = getTargetType(target)
if (targetType === TargetType.INVALID) {
  return target
}
```

getTargetType 函数判断对象的类型：

```typescript
function getTargetType(value: Target) {
  return value[ReactiveFlags.SKIP] || !Object.isExtensible(value)
    ? TargetType.INVALID
    : targetTypeMap(toRawType(value))
}
```

两种情况会被标记为 INVALID：

第一种是对象有 `__v_skip` 标记，这是 markRaw 设置的，表示该对象应该跳过响应式转换。

第二种是对象不可扩展（被 Object.freeze、Object.seal 或 Object.preventExtensions 处理过）。不可扩展的对象不能被代理，因为代理需要在对象上添加一些内部标记。

targetTypeMap 根据对象的原始类型返回类型枚举：

```typescript
function targetTypeMap(rawType: string) {
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
```

只有普通对象、数组和四种集合类型可以被代理。其他类型（如 Date、RegExp、Error、DOM 节点等）被视为 INVALID，直接返回原对象。

这是一个权衡。这些特殊对象有内部槽位，Proxy 无法完全代理它们的行为。与其产生不可预测的结果，不如直接放弃代理。

## 创建代理

通过所有检查后，终于可以创建代理了：

```typescript
const proxy = new Proxy(
  target,
  targetType === TargetType.COLLECTION ? collectionHandlers : baseHandlers
)
proxyMap.set(target, proxy)
return proxy
```

根据对象类型选择不同的 handlers。普通对象和数组使用 baseHandlers，集合类型使用 collectionHandlers。

创建代理后，将 target → proxy 的映射存入 proxyMap，然后返回代理。

## 完整代码

把所有部分组合起来，完整的函数如下：

```typescript
function createReactiveObject(
  target: Target,
  isReadonly: boolean,
  baseHandlers: ProxyHandler<any>,
  collectionHandlers: ProxyHandler<any>,
  proxyMap: WeakMap<Target, any>
) {
  // 非对象直接返回
  if (!isObject(target)) {
    if (__DEV__) {
      warn(`value cannot be made ${isReadonly ? 'readonly' : 'reactive'}: ${String(target)}`)
    }
    return target
  }
  
  // 已是代理（除非是对 reactive 创建 readonly）
  if (
    target[ReactiveFlags.RAW] &&
    !(isReadonly && target[ReactiveFlags.IS_REACTIVE])
  ) {
    return target
  }
  
  // 已有缓存
  const existingProxy = proxyMap.get(target)
  if (existingProxy) {
    return existingProxy
  }
  
  // 不可代理类型
  const targetType = getTargetType(target)
  if (targetType === TargetType.INVALID) {
    return target
  }
  
  // 创建代理
  const proxy = new Proxy(
    target,
    targetType === TargetType.COLLECTION ? collectionHandlers : baseHandlers
  )
  proxyMap.set(target, proxy)
  return proxy
}
```

## 不同 API 的调用方式

理解了 createReactiveObject，我们可以看看不同 API 如何调用它：

```typescript
// reactive：深层响应式，可变
export function reactive(target) {
  if (isReadonly(target)) return target
  return createReactiveObject(
    target, false, mutableHandlers, mutableCollectionHandlers, reactiveMap
  )
}

// readonly：深层只读
export function readonly(target) {
  return createReactiveObject(
    target, true, readonlyHandlers, readonlyCollectionHandlers, readonlyMap
  )
}

// shallowReactive：浅层响应式，可变
export function shallowReactive(target) {
  return createReactiveObject(
    target, false, shallowReactiveHandlers, shallowCollectionHandlers, shallowReactiveMap
  )
}

// shallowReadonly：浅层只读
export function shallowReadonly(target) {
  return createReactiveObject(
    target, true, shallowReadonlyHandlers, shallowReadonlyCollectionHandlers, shallowReadonlyMap
  )
}
```

每个 API 传入不同的 handlers 和 proxyMap。handlers 决定了拦截行为（是否深层代理、是否允许修改），proxyMap 确保每种类型的代理分别缓存。

## 设计亮点

这个函数的设计有几个值得学习的地方。

首先是防御性编程。多层检查确保函数在各种输入下都能正常工作，不会因为边缘情况而崩溃。

其次是单一职责。函数只负责"创建代理"这一件事，具体的拦截行为由 handlers 定义，缓存策略由 proxyMap 决定。这使得代码易于测试和扩展。

第三是优雅降级。对于不能代理的类型，静默返回原对象而不是抛出错误。这在开发中产生警告，在生产环境中不影响应用运行。

第四是缓存优先。在创建新代理前先检查缓存，避免不必要的开销和潜在的一致性问题。

## 小结

createReactiveObject 是响应式对象创建的核心。它通过多层检查确保只对合适的对象创建代理，使用缓存避免重复创建，根据对象类型选择合适的 handlers。理解这个函数，就掌握了响应式对象创建的全貌。

下一章我们将深入 baseHandlers，看看普通对象的 Proxy 拦截器是如何定义的。

