# readonly 只读代理：保护响应式数据

在实际应用中，并非所有响应式数据都应该被随意修改。配置信息、组件接收的 props、从服务端获取的只读数据——这些场景都需要一种机制来防止意外的修改操作。readonly 就是为此设计的：它创建一个只读的响应式代理，允许读取和依赖追踪，但拒绝任何修改。

readonly 的实现复用了 reactive 的大部分逻辑，但在关键的地方做出调整：get 时不收集依赖（因为只读数据不会变化，收集依赖没有意义），set 时拒绝修改并发出警告。这种复用策略让我们可以用最小的代码增量实现新功能，同时保持系统的一致性。

## readonly 与 reactive 的核心差异

从行为上看，readonly 和 reactive 有两个本质区别。首先是响应性方面：reactive 的数据可以被修改，修改时会触发依赖更新；readonly 的数据不能被修改，任何修改尝试都会被拦截。其次是依赖收集方面：reactive 在读取时会收集依赖，以便数据变化时通知相关 effects；readonly 虽然也允许被读取，但既然数据不会变化，收集依赖就是浪费，所以 readonly 在读取时不进行依赖收集。

从实现角度来看，这两个差异集中体现在 Proxy 的 get 和 set 处理器中：

```typescript
// reactive 的 get：收集依赖
get(target, key) {
  track(target, key)  // 收集依赖
  return Reflect.get(target, key)
}

// readonly 的 get：不收集依赖
get(target, key) {
  // 不调用 track
  return Reflect.get(target, key)
}

// reactive 的 set：允许修改，触发更新
set(target, key, value) {
  Reflect.set(target, key, value)
  trigger(target, key)  // 触发更新
  return true
}

// readonly 的 set：拒绝修改
set(target, key, value) {
  console.warn('target is readonly')
  return true  // 返回 true 避免抛出错误
}
```

理解了这个核心差异，实现就变得清晰了。

## 重构代理创建逻辑

为了同时支持 reactive 和 readonly，我们需要重构之前的代码。核心思想是：将创建 Proxy 的逻辑抽取成通用函数，通过参数控制是否只读。

首先，我们定义一组标识符常量，用于在运行时判断代理对象的类型。这些标识符会作为特殊的属性键，在 get 处理器中被拦截并返回相应的布尔值：

```typescript
const ReactiveFlags = {
  IS_REACTIVE: '__v_isReactive',
  IS_READONLY: '__v_isReadonly',
  RAW: '__v_raw'
}
```

`IS_REACTIVE` 和 `IS_READONLY` 用于类型判断；`RAW` 用于获取代理背后的原始对象。这些"虚拟属性"实际上并不存在于对象上，而是由 get 处理器动态返回的。这种设计避免了污染原始对象，同时提供了清晰的类型检查接口。

接下来创建两个 WeakMap 来缓存代理对象。为什么要分开存储？因为同一个原始对象可能同时有 reactive 和 readonly 两种代理：

```typescript
const reactiveMap = new WeakMap<object, any>()
const readonlyMap = new WeakMap<object, any>()
```

使用 WeakMap 的好处我们之前已经讨论过：当原始对象被垃圾回收时，对应的代理也会自动被回收，不会造成内存泄漏。

## 处理器工厂函数

为了避免代码重复，我们使用工厂函数来创建 get 和 set 处理器。这些工厂函数接收配置参数，返回定制化的处理器函数：

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
    if (key === ReactiveFlags.RAW) {
      return target
    }
    
    const result = Reflect.get(target, key, receiver)
    
    // 只读代理不收集依赖
    if (!isReadonly) {
      track(target, key)
    }
    
    // 浅层代理不递归处理嵌套对象
    if (isShallow) {
      return result
    }
    
    // 深层代理：嵌套对象也要包装
    if (typeof result === 'object' && result !== null) {
      return isReadonly ? readonly(result) : reactive(result)
    }
    
    return result
  }
}
```

这个工厂函数通过两个布尔参数控制行为：`isReadonly` 决定是否收集依赖，`isShallow` 决定是否递归处理嵌套对象。这种设计允许我们组合出四种不同的代理类型：reactive、readonly、shallowReactive、shallowReadonly。

注意标识符查询的处理：当访问 `__v_isReactive` 时，我们返回 `!isReadonly`。这意味着 reactive 代理会返回 true，而 readonly 代理会返回 false。这个设计反映了 Vue 的语义：readonly 虽然也是响应式的（会触发更新通知），但从"数据可变"的角度看，它不是 reactive 的。

setter 工厂函数的逻辑更简单：

```typescript
function createSetter(isReadonly = false) {
  return function set(
    target: object, 
    key: string | symbol, 
    value: unknown, 
    receiver: object
  ) {
    // 只读代理拒绝所有修改
    if (isReadonly) {
      console.warn(
        `Set operation on key "${String(key)}" failed: target is readonly.`
      )
      return true  // 返回 true 避免在严格模式下抛出 TypeError
    }
    
    const oldValue = (target as any)[key]
    const result = Reflect.set(target, key, value, receiver)
    
    // 只在值真正变化时触发更新
    if (oldValue !== value) {
      trigger(target, key)
    }
    
    return result
  }
}
```

readonly 的 setter 返回 true 而不是 false 或抛出错误，这是一个重要的设计决策。在 JavaScript 的严格模式下，如果 Proxy 的 set 处理器返回 false，会抛出 TypeError。Vue 选择返回 true 并仅输出警告，是为了在开发时提供友好的提示，同时不破坏应用的正常运行。

## 预创建处理器对象

处理器工厂函数在每次调用时都会创建新的函数实例。为了避免这种开销，我们在模块加载时就预先创建好所有需要的处理器对象：

```typescript
const reactiveHandlers = {
  get: createGetter(false, false),
  set: createSetter(false),
  deleteProperty: createDeleteProperty(false)
}

const readonlyHandlers = {
  get: createGetter(true, false),
  set: createSetter(true),
  deleteProperty: createDeleteProperty(true)
}

const shallowReactiveHandlers = {
  get: createGetter(false, true),
  set: createSetter(false),
  deleteProperty: createDeleteProperty(false)
}

const shallowReadonlyHandlers = {
  get: createGetter(true, true),
  set: createSetter(true),
  deleteProperty: createDeleteProperty(true)
}
```

这里我们还添加了 `deleteProperty` 处理器，用于拦截 `delete` 操作。它的实现与 setter 类似：

```typescript
function createDeleteProperty(isReadonly = false) {
  return function deleteProperty(target: object, key: string | symbol) {
    if (isReadonly) {
      console.warn(
        `Delete operation on key "${String(key)}" failed: target is readonly.`
      )
      return true
    }
    
    const hadKey = Object.prototype.hasOwnProperty.call(target, key)
    const result = Reflect.deleteProperty(target, key)
    
    // 只在属性确实存在且删除成功时触发更新
    if (hadKey && result) {
      trigger(target, key)
    }
    
    return result
  }
}
```

## 统一的代理创建函数

现在我们可以编写一个统一的代理创建函数，它根据参数选择正确的处理器和缓存：

```typescript
function createReactiveObject(
  target: object,
  isReadonly: boolean,
  handlers: ProxyHandler<object>
) {
  // 非对象类型直接返回
  if (typeof target !== 'object' || target === null) {
    console.warn(`value cannot be made reactive: ${String(target)}`)
    return target
  }
  
  // 选择对应的缓存
  const proxyMap = isReadonly ? readonlyMap : reactiveMap
  
  // 检查是否已有缓存的代理
  const existingProxy = proxyMap.get(target)
  if (existingProxy) {
    return existingProxy
  }
  
  // 创建新代理
  const proxy = new Proxy(target, handlers)
  
  // 存入缓存
  proxyMap.set(target, proxy)
  
  return proxy
}
```

有了这个通用函数，reactive 和 readonly 的实现就非常简洁了：

```typescript
export function reactive<T extends object>(target: T): T {
  return createReactiveObject(target, false, reactiveHandlers)
}

export function readonly<T extends object>(target: T): Readonly<T> {
  return createReactiveObject(target, true, readonlyHandlers)
}

export function shallowReactive<T extends object>(target: T): T {
  return createReactiveObject(target, false, shallowReactiveHandlers)
}

export function shallowReadonly<T extends object>(target: T): Readonly<T> {
  return createReactiveObject(target, true, shallowReadonlyHandlers)
}
```

每个函数只需要传入正确的参数，核心逻辑完全复用。

## 类型检查和原始值获取

最后，我们提供几个实用的工具函数：

```typescript
export function isReactive(value: unknown): boolean {
  return !!(value && (value as any)[ReactiveFlags.IS_REACTIVE])
}

export function isReadonly(value: unknown): boolean {
  return !!(value && (value as any)[ReactiveFlags.IS_READONLY])
}

export function isProxy(value: unknown): boolean {
  return isReactive(value) || isReadonly(value)
}
```

这些函数通过访问我们定义的标识符属性来判断值的类型。双重否定 `!!` 确保返回的是布尔值而不是 undefined。

`toRaw` 函数用于获取代理背后的原始对象，这在某些场景下很有用，比如需要将数据传递给不理解响应式代理的第三方库：

```typescript
export function toRaw<T>(observed: T): T {
  const raw = observed && (observed as any)[ReactiveFlags.RAW]
  return raw ? toRaw(raw) : observed
}
```

这里使用递归是为了处理嵌套代理的情况：如果一个 reactive 对象又被 readonly 包装，调用 toRaw 需要穿透两层代理才能得到真正的原始对象。

## readonly 的典型应用场景

readonly 在实际开发中有几个典型的使用场景。

应用配置通常不应该被运行时代码修改。使用 readonly 包装配置对象，可以在开发时及早发现意外的修改操作：

```typescript
const config = reactive({
  apiBaseUrl: 'https://api.example.com',
  maxRetries: 3,
  timeout: 5000
})

// 导出只读版本，防止其他模块意外修改
export const appConfig = readonly(config)

// 如果需要修改配置，通过受控的方法
export function updateConfig(newConfig: Partial<typeof config>) {
  Object.assign(config, newConfig)
}
```

Vue 组件的 props 在概念上是只读的——子组件不应该直接修改从父组件接收的数据。Vue 内部使用 shallowReadonly 来包装 props，确保这一约束在运行时得到执行。

对于从服务端获取的数据，如果业务逻辑上不应该被本地修改（比如只用于展示的历史记录），使用 readonly 可以清晰地表达这个意图，同时在代码意外修改时及时发出警告。

## 本章小结

readonly 通过复用 reactive 的核心机制，以最小的代码增量实现了只读保护功能。它的设计体现了几个重要的工程原则：

通过工厂函数和参数化处理器，我们避免了代码重复，同时保持了灵活性。预创建的处理器对象避免了运行时的对象分配开销。分离的缓存确保了同一个对象可以同时拥有 reactive 和 readonly 两种代理。

从更高的层面看，readonly 是响应式系统"渐进增强"设计的体现：核心的代理机制是通用的，不同的行为通过处理器的差异来实现。这种设计让系统既保持了简洁，又具备了良好的扩展性。

在下一章中，我们将实现 shallowReactive，探讨浅层响应式的应用场景和实现细节。
