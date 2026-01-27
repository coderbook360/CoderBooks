# shallowReactive 浅层响应式：性能与控制的平衡

在前面的章节中，我们实现的 reactive 会递归地将所有嵌套对象都转换为响应式代理。这种"深度响应式"的策略在大多数场景下是正确的选择——开发者不需要担心嵌套层级，任何地方的数据变化都能被追踪。但这种便利也有代价：对于深层嵌套或包含大量元素的数据结构，递归代理会带来显著的内存开销和初始化延迟。

shallowReactive 提供了一个折中方案：只对对象的第一层属性进行响应式处理，嵌套对象保持原样。这给了开发者更细粒度的控制权，让他们能够在性能和便利性之间做出权衡。

## 深度响应式的隐性成本

要理解为什么需要 shallowReactive，我们先来看看深度响应式的工作方式。当你创建一个 reactive 对象时：

```typescript
const state = reactive({
  user: {
    profile: {
      settings: {
        theme: 'dark',
        notifications: true
      }
    }
  }
})
```

每当你访问一个嵌套对象时，getter 会检查返回值是否是对象，如果是，就对它调用 reactive。这意味着 `state.user`、`state.user.profile`、`state.user.profile.settings` 都会被转换为响应式代理。

这种惰性转换策略已经是一种优化——只有被访问到的嵌套对象才会被代理。但在某些场景下，即使是惰性转换也可能带来问题。

考虑这样一个场景：你从服务端获取了一个包含数千条记录的数组，每条记录都是一个包含多个字段的对象。你把这个数组放入 reactive：

```typescript
const data = reactive({
  records: serverData  // 假设有 5000 条记录
})
```

现在，如果你遍历这个数组并渲染每条记录，每一条记录都会被转换为响应式代理。这意味着创建 5000 个 Proxy 对象，以及相应的 WeakMap 缓存条目。如果这些记录只是用于展示，永远不会被修改，这些代理就完全是浪费。

更麻烦的是某些第三方库的对象。有些库（比如地图库、图表库）创建的对象有复杂的内部状态，使用 Proxy 包装后可能会破坏它们的正常工作。对这类对象，我们需要一种方式来明确地说"不要代理这个"。

## shallowReactive 的核心实现

shallowReactive 的实现非常简单：在 getter 中，当遇到对象类型的返回值时，不递归调用 reactive，而是直接返回原始值。这只需要在我们已有的 createGetter 工厂函数中添加一个参数：

```typescript
function createGetter(isReadonly = false, isShallow = false) {
  return function get(target: object, key: string | symbol, receiver: object) {
    // 处理标识符查询
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
    
    // 只读代理不收集依赖
    if (!isReadonly) {
      track(target, key)
    }
    
    // 关键差异：浅层响应式直接返回，不递归
    if (isShallow) {
      return result
    }
    
    // 深层响应式：递归处理嵌套对象
    if (typeof result === 'object' && result !== null) {
      return isReadonly ? readonly(result) : reactive(result)
    }
    
    return result
  }
}
```

`isShallow` 参数控制着核心行为：当它为 true 时，getter 在获取到嵌套对象后直接返回，不进行任何转换。这意味着嵌套对象保持原样——如果它原来是普通对象，它就还是普通对象；如果它原来是 reactive 对象，它也不会被重复包装。

注意我们还添加了 `IS_SHALLOW` 标识符的处理，这样就可以通过 `isShallow()` 函数来检查一个代理是深层还是浅层的。

## 四种代理类型的组合

现在我们有两个维度的选择：是否只读（readonly vs mutable）和是否浅层（shallow vs deep）。这两个维度的组合产生四种代理类型：

```typescript
// reactive: 深层可变
const reactiveHandlers = {
  get: createGetter(false, false),
  set: createSetter(false),
  deleteProperty: createDeleteProperty(false)
}

// shallowReactive: 浅层可变
const shallowReactiveHandlers = {
  get: createGetter(false, true),
  set: createSetter(false),
  deleteProperty: createDeleteProperty(false)
}

// readonly: 深层只读
const readonlyHandlers = {
  get: createGetter(true, false),
  set: createSetter(true),
  deleteProperty: createDeleteProperty(true)
}

// shallowReadonly: 浅层只读
const shallowReadonlyHandlers = {
  get: createGetter(true, true),
  set: createSetter(true),
  deleteProperty: createDeleteProperty(true)
}
```

这种通过参数组合生成处理器的方式，让我们用最少的代码支持了四种不同的代理行为。每种处理器只在模块加载时创建一次，之后被所有同类型的代理共享。

每种代理类型需要自己的缓存 Map：

```typescript
const reactiveMap = new WeakMap<object, any>()
const shallowReactiveMap = new WeakMap<object, any>()
const readonlyMap = new WeakMap<object, any>()
const shallowReadonlyMap = new WeakMap<object, any>()
```

为什么需要四个独立的缓存？因为同一个原始对象可能同时被用于多种代理类型。比如，一个配置对象可能既有 reactive 版本（用于内部修改）也有 readonly 版本（暴露给外部）。分开存储确保每种代理类型都能正确缓存和复用。

## 统一的代理创建函数

有了处理器和缓存，我们可以编写一个统一的创建函数，接收这些配置作为参数：

```typescript
function createReactiveObject(
  target: object,
  isReadonly: boolean,
  handlers: ProxyHandler<object>,
  proxyMap: WeakMap<object, any>
) {
  // 如果目标已经是一个代理，做特殊处理
  // 对 readonly(reactive(obj)) 的情况，返回一个新的 readonly 代理
  // 对 reactive(reactive(obj)) 的情况，直接返回原代理
  const raw = (target as any)[ReactiveFlags.RAW]
  if (raw && !(isReadonly && (target as any)[ReactiveFlags.IS_REACTIVE])) {
    return target
  }
  
  // 检查缓存
  const existingProxy = proxyMap.get(target)
  if (existingProxy) {
    return existingProxy
  }
  
  // 创建新代理并缓存
  const proxy = new Proxy(target, handlers)
  proxyMap.set(target, proxy)
  
  return proxy
}
```

这里有一个细节值得注意：如果传入的 target 已经是一个代理（通过检查 `__v_raw` 是否存在），我们需要判断应该直接返回还是创建新代理。规则是：reactive 包装 reactive 返回原代理（幂等性）；readonly 包装 reactive 创建新的 readonly 代理（增加只读限制是有意义的）。

现在导出函数就非常简洁了：

```typescript
export function reactive<T extends object>(target: T): T {
  return createReactiveObject(target, false, reactiveHandlers, reactiveMap)
}

export function shallowReactive<T extends object>(target: T): T {
  return createReactiveObject(
    target, 
    false, 
    shallowReactiveHandlers, 
    shallowReactiveMap
  )
}

export function readonly<T extends object>(target: T): Readonly<T> {
  return createReactiveObject(target, true, readonlyHandlers, readonlyMap)
}

export function shallowReadonly<T extends object>(target: T): Readonly<T> {
  return createReactiveObject(
    target, 
    true, 
    shallowReadonlyHandlers, 
    shallowReadonlyMap
  )
}
```

每个函数只是调用 createReactiveObject 并传入正确的参数，核心逻辑完全复用。

## shallowRef 与 triggerRef

与 shallowReactive 对应，shallowRef 是 ref 的浅层版本。普通 ref 在接收对象类型的值时会自动用 reactive 包装，而 shallowRef 不会：

```typescript
class ShallowRefImpl<T> {
  private _value: T
  public dep = new Set<ReactiveEffect>()
  public readonly __v_isRef = true
  public readonly __v_isShallow = true
  
  constructor(value: T) {
    // 关键差异：不调用 toReactive，直接存储原始值
    this._value = value
  }
  
  get value() {
    trackRefValue(this)
    return this._value
  }
  
  set value(newValue) {
    if (this._value !== newValue) {
      this._value = newValue
      triggerRefValue(this)
    }
  }
}

export function shallowRef<T>(value: T): ShallowRef<T> {
  return new ShallowRefImpl(value)
}
```

使用 shallowRef 时需要注意一个重要特点：只有当你替换整个 `.value` 时才会触发更新，修改 value 内部的属性不会触发：

```typescript
const state = shallowRef({ count: 0 })

// 这不会触发更新——修改内部属性
state.value.count = 1

// 这会触发更新——替换整个 value
state.value = { count: 1 }
```

如果你确实修改了内部属性并希望触发更新，可以使用 triggerRef：

```typescript
export function triggerRef(ref: ShallowRef<any>) {
  triggerRefValue(ref)
}

// 使用
state.value.count = 1  // 修改但不触发
triggerRef(state)      // 手动触发更新
```

这种设计给了开发者完全的控制权：你决定何时触发更新，而不是让系统自动决定。

## 适用场景与最佳实践

shallowReactive 和 shallowRef 在以下场景特别有用：

当处理大型静态数据时，如果嵌套数据只用于展示而不需要响应式追踪，使用 shallowReactive 可以避免创建大量不必要的代理：

```typescript
const tableData = shallowReactive({
  // 只有 rows 这个引用是响应式的
  rows: fetchedData,  // 数组内部的对象不会被代理
  loading: false,
  error: null
})

// 替换整个数组会触发更新
tableData.rows = newData

// 修改数组内部不会触发（需要用 triggerRef 或替换数组）
tableData.rows[0].name = 'updated'
```

当集成第三方库时，某些库的对象不应该被代理包装。使用 shallowReactive 可以安全地将这些对象作为响应式状态的一部分，同时保持它们的原始行为：

```typescript
const mapState = shallowReactive({
  // 地图实例保持原样，不会被代理
  map: new ThirdPartyMap(container),
  markers: [],
  center: { lat: 0, lng: 0 }
})
```

当需要优化性能时，如果你确定只需要追踪顶层属性的变化，使用 shallowReactive 可以减少内存占用和初始化开销。但要注意，这是一种权衡——你获得了性能，但失去了深层追踪的便利性。

## 本章小结

shallowReactive 通过在 getter 中跳过递归转换，实现了浅层响应式。这是一个典型的"选择退出"设计：默认行为是深度响应式，当你明确知道不需要深层追踪时，可以选择浅层版本。

从实现角度看，shallow 系列 API 的添加几乎不增加代码复杂度——只是在工厂函数中多了一个参数判断。这得益于我们之前良好的抽象设计：将可变的行为（是否只读、是否浅层）参数化，让核心逻辑保持统一。

在实际使用中，应该把 shallowReactive 和 shallowRef 视为优化工具，而不是默认选择。只有当你遇到性能问题，或者需要保护某些对象不被代理时，才考虑使用它们。过早优化往往会增加代码的复杂性，而带来的性能收益可能微乎其微。

在下一章中，我们将处理一个更复杂的话题：数组的响应式。JavaScript 数组有很多特殊的操作方法，我们需要仔细处理它们才能让响应式系统正确工作。
