# reactive 函数入口

reactive 是 Vue3 响应式系统中最常用的 API 之一，它将一个普通对象转换为响应式代理。这一章我们深入分析 reactive 函数的源码实现。

## 函数签名

在 reactive.ts 文件中，reactive 函数的定义很简洁：

```typescript
export function reactive<T extends object>(target: T): Reactive<T> {
  // 如果尝试观察一个 readonly 代理，直接返回它
  if (isReadonly(target)) {
    return target
  }
  return createReactiveObject(
    target,
    false,
    mutableHandlers,
    mutableCollectionHandlers,
    reactiveMap
  )
}
```

函数接受一个泛型参数 T，约束为 object 类型。这意味着只有对象类型（包括数组、Map、Set 等）可以被 reactive 处理，原始类型（number、string 等）不能直接使用 reactive。

返回类型是 `Reactive<T>`，这是一个类型别名，表示 T 的深层响应式版本。在运行时，返回的是一个 Proxy 对象。

## readonly 检查

函数体第一行检查传入的对象是否已经是 readonly 代理。如果是，直接返回它本身，不做任何处理。

```typescript
if (isReadonly(target)) {
  return target
}
```

为什么要这样做？考虑这样的代码：

```javascript
const original = { count: 0 }
const readonlyProxy = readonly(original)
const reactiveProxy = reactive(readonlyProxy) // 会发生什么？
```

如果对 readonly 代理再包一层 reactive，结果是什么？readonly 的设计意图是"不可修改"，如果允许在外面套一层 reactive，就可能绕过 readonly 的限制。所以 Vue3 选择直接返回原来的 readonly 代理，保持语义一致性。

isReadonly 函数通过检查对象上的 `__v_isReadonly` 标记来判断：

```typescript
export function isReadonly(value: unknown): boolean {
  return !!(value && (value as Target).__v_isReadonly)
}
```

这个标记是在创建 readonly 代理时通过 Proxy 的 get 拦截器"虚拟"添加的——对象上并不真正存在这个属性，但访问它时会返回 true。

## createReactiveObject 调用

核心逻辑在 createReactiveObject 函数中。reactive 只是调用它，传入适当的参数：

```typescript
return createReactiveObject(
  target,           // 目标对象
  false,            // 是否 readonly（否）
  mutableHandlers,  // 普通对象的拦截器
  mutableCollectionHandlers,  // 集合的拦截器
  reactiveMap       // 代理缓存 Map
)
```

五个参数各有用途：

`target` 是要被代理的原始对象。

`false` 表示这不是 readonly 模式。readonly 函数调用 createReactiveObject 时会传 true。

`mutableHandlers` 是普通对象（包括数组）使用的 Proxy 拦截器配置。它定义了 get、set、has、deleteProperty、ownKeys 等拦截器。

`mutableCollectionHandlers` 是集合类型（Map、Set、WeakMap、WeakSet）使用的拦截器配置。集合的响应式处理方式和普通对象不同，需要专门的拦截器。

`reactiveMap` 是一个 WeakMap，用于缓存已创建的代理。同一个对象多次调用 reactive 应该返回同一个代理。

## reactiveMap 缓存

reactiveMap 定义在文件顶部：

```typescript
export const reactiveMap: WeakMap<Target, any> = new WeakMap()
```

使用 WeakMap 有两个原因。第一，它可以用对象作为键，这正是我们需要的——用原始对象查找对应的代理。第二，WeakMap 是弱引用的，当原始对象不再被引用时，它和对应的代理都可以被垃圾回收，不会造成内存泄漏。

类似地，还有其他几个缓存 Map：

```typescript
export const shallowReactiveMap: WeakMap<Target, any> = new WeakMap()
export const readonlyMap: WeakMap<Target, any> = new WeakMap()
export const shallowReadonlyMap: WeakMap<Target, any> = new WeakMap()
```

每种类型的代理都有自己的缓存。这是必要的，因为同一个对象可以同时有 reactive 代理和 readonly 代理，它们需要分别存储。

## 类型定义

让我们看看相关的类型定义，理解 Vue3 如何在类型层面描述响应式：

```typescript
export interface Target {
  __v_skip?: boolean
  __v_isReactive?: boolean
  __v_isReadonly?: boolean
  __v_isShallow?: boolean
  __v_raw?: any
}
```

Target 接口描述了响应式对象上的特殊标记：

`__v_skip` 表示跳过响应式转换，markRaw 函数会设置这个标记。

`__v_isReactive` 表示对象是 reactive 代理。

`__v_isReadonly` 表示对象是 readonly 代理。

`__v_isShallow` 表示对象是浅层代理（shallowReactive 或 shallowReadonly）。

`__v_raw` 指向原始对象，toRaw 函数会访问这个属性。

这些属性在实际对象上并不存在，而是通过 Proxy 的 get 拦截器动态返回的。这是一个巧妙的设计——不污染原始对象，又能方便地检查代理状态。

## Reactive 类型

返回类型 `Reactive<T>` 的定义比较复杂：

```typescript
export type Reactive<T> = UnwrapNestedRefs<T> & {
  [ReactiveFlags.IS_REACTIVE]: true
}
```

UnwrapNestedRefs 会解包嵌套的 ref。如果 T 的某个属性是 RefImpl 类型，在 Reactive 版本中它会被解包为普通值。这对应了 reactive 对象中 ref 自动解包的行为。

```javascript
const state = reactive({
  count: ref(0)
})
// state.count 是 number，不是 Ref<number>
console.log(state.count) // 0，不需要 .value
```

## 一个完整的例子

结合以上分析，让我们追踪一个完整的调用过程：

```javascript
const original = { count: 0, nested: { value: 1 } }
const proxy = reactive(original)
```

调用 reactive(original) 时：

第一步，检查 original 是否是 readonly 代理。它不是，继续执行。

第二步，调用 createReactiveObject，传入 original、false、mutableHandlers、mutableCollectionHandlers、reactiveMap。

第三步（在 createReactiveObject 中），检查 reactiveMap 是否已有 original 的代理。这是第一次调用，没有。

第四步，判断 original 的类型。它是普通对象，使用 mutableHandlers。

第五步，创建 Proxy：`new Proxy(original, mutableHandlers)`。

第六步，将 original → proxy 的映射存入 reactiveMap。

第七步，返回 proxy。

之后如果再次调用 `reactive(original)`，第三步会在 reactiveMap 中找到已有的代理，直接返回，不会创建新的 Proxy。

如果访问 `proxy.nested`，mutableHandlers 的 get 拦截器会检测到 nested 是一个对象，对它也调用 reactive，返回一个嵌套的代理。这实现了深层响应式。

## 边界情况处理

reactive 函数看起来简单，但 createReactiveObject 内部处理了很多边界情况：

如果传入的对象已经是一个代理（reactive 或 readonly），处理方式取决于具体情况。对一个 reactive 代理再调用 reactive，返回它本身；对一个 reactive 代理调用 readonly，返回一个新的 readonly 代理。

如果传入的对象被 markRaw 标记过（有 `__v_skip` 属性），直接返回原对象，不进行代理。

如果传入的是原始类型或不可扩展的对象，开发模式下会警告，返回原对象。

这些边界情况我们会在 createReactiveObject 的专门章节详细分析。

## 小结

reactive 函数本身的代码非常简短，它主要做两件事：检查是否为 readonly 代理，然后调用 createReactiveObject。真正的工作在 createReactiveObject 和 mutableHandlers 中完成。

这种设计体现了关注点分离：reactive 只负责提供正确的参数，createReactiveObject 负责创建和缓存代理，handlers 负责定义拦截行为。每个部分职责单一，易于理解和维护。

在下一章中，我们将深入 createReactiveObject，看看它如何处理各种类型的对象和边界情况。

