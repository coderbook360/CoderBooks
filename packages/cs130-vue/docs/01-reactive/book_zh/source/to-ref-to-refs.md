# toRef 与 toRefs：响应式属性引用

当我们从 reactive 对象中解构属性时，解构出来的值会失去响应式。toRef 和 toRefs 函数解决了这个问题，它们创建指向源对象属性的 ref，保持与源对象的响应式连接。

## 解构的响应式问题

考虑这个场景：

```typescript
const state = reactive({ count: 0, name: 'Vue' })

// 解构后失去响应式
let { count, name } = state

effect(() => {
  console.log(count)  // 不会响应 state.count 的变化
})

state.count++  // effect 不会重新执行
```

解构创建了新变量，它们保存的是当时的值副本，与原对象失去了联系。toRef 和 toRefs 就是为解决这个问题设计的。

## toRef 基本用法

toRef 为响应式对象的某个属性创建一个 ref：

```typescript
const state = reactive({ count: 0, name: 'Vue' })

const countRef = toRef(state, 'count')

effect(() => {
  console.log(countRef.value)  // 会响应变化
})

state.count++  // effect 重新执行
countRef.value++  // 同样会触发，并修改 state.count
```

toRef 创建的 ref 与源对象属性双向绑定：修改 ref.value 会修改源属性，修改源属性也会反映到 ref 上。

## toRef 的多种重载

toRef 有多种调用方式：

```typescript
// 1. 从对象属性创建 ref
const countRef = toRef(state, 'count')

// 2. 直接传入 ref，返回原 ref
const existingRef = ref(1)
const sameRef = toRef(existingRef)  // sameRef === existingRef

// 3. 传入普通值，创建普通 ref（Vue 3.3+）
const normalRef = toRef(42)  // 相当于 ref(42)

// 4. 传入 getter 函数，创建只读 ref（Vue 3.3+）
const computedLikeRef = toRef(() => state.count * 2)
```

## toRef 实现源码

让我们看看 toRef 的实现：

```typescript
export function toRef<T>(
  value: T,
): T extends () => infer R
  ? Readonly<Ref<R>>
  : T extends Ref
    ? T
    : Ref<UnwrapRef<T>>
export function toRef<T extends object, K extends keyof T>(
  object: T,
  key: K,
): ToRef<T[K]>
export function toRef<T extends object, K extends keyof T>(
  object: T,
  key: K,
  defaultValue: T[K],
): ToRef<Exclude<T[K], undefined>>
export function toRef(
  source: Record<string, any> | MaybeRef,
  key?: string,
  defaultValue?: unknown,
): Ref {
  if (isRef(source)) {
    return source
  } else if (isFunction(source)) {
    return new GetterRefImpl(source) as any
  } else if (isObject(source) && arguments.length > 1) {
    return propertyToRef(source, key!, defaultValue)
  } else {
    return ref(source)
  }
}
```

函数根据参数类型做不同处理：

1. 如果已经是 ref，直接返回
2. 如果是函数，创建 GetterRefImpl（只读的计算式 ref）
3. 如果是对象且有 key 参数，创建属性 ref
4. 其他情况，创建普通 ref

## propertyToRef 函数

从对象属性创建 ref 的核心逻辑：

```typescript
function propertyToRef(
  source: Record<string, any>,
  key: string,
  defaultValue?: unknown,
) {
  const val = source[key]
  return isRef(val)
    ? val
    : (new ObjectRefImpl(source, key, defaultValue) as any)
}
```

如果属性本身就是 ref，直接返回。否则创建 ObjectRefImpl。

## ObjectRefImpl 类

这是连接对象属性和 ref 的关键类：

```typescript
class ObjectRefImpl<T extends object, K extends keyof T> {
  public readonly __v_isRef = true

  constructor(
    private readonly _object: T,
    private readonly _key: K,
    private readonly _defaultValue?: T[K],
  ) {}

  get value() {
    const val = this._object[this._key]
    return val === undefined ? this._defaultValue! : val
  }

  set value(newVal) {
    this._object[this._key] = newVal
  }
}
```

ObjectRefImpl 不存储值，而是持有对象和键的引用。getter 直接读取源对象的属性，setter 直接写入源对象的属性。这样就实现了与源对象的双向绑定。

如果属性值是 undefined 且提供了默认值，getter 会返回默认值。

## GetterRefImpl 类

当传入函数时使用的类：

```typescript
class GetterRefImpl<T> {
  public readonly __v_isRef = true
  public readonly __v_isReadonly = true

  constructor(private readonly _getter: () => T) {}

  get value() {
    return this._getter()
  }
}
```

GetterRefImpl 是只读的，只有 getter 没有 setter。每次访问 .value 都会执行 getter 函数。这类似于一个简化版的 computed，但没有缓存。

## toRefs 函数

toRefs 将 reactive 对象的所有属性转换为 ref：

```typescript
export function toRefs<T extends object>(object: T): ToRefs<T> {
  if (__DEV__ && !isProxy(object)) {
    console.warn(`toRefs() expects a reactive object but received a plain one.`)
  }
  const ret: any = isArray(object) ? new Array(object.length) : {}
  for (const key in object) {
    ret[key] = propertyToRef(object, key)
  }
  return ret
}
```

函数遍历对象的所有属性，对每个属性调用 propertyToRef。返回一个新对象，每个属性都是对应源属性的 ref。

```typescript
const state = reactive({ count: 0, name: 'Vue' })

const refs = toRefs(state)
// refs = { count: Ref<number>, name: Ref<string> }

// 现在可以安全解构
const { count, name } = refs

effect(() => {
  console.log(count.value)  // 会响应变化
})
```

## 使用场景

从 composable 返回响应式属性：

```typescript
function useCounter() {
  const state = reactive({ count: 0, step: 1 })
  
  function increment() {
    state.count += state.step
  }
  
  return {
    ...toRefs(state),  // 允许解构使用
    increment
  }
}

// 使用时可以解构
const { count, step } = useCounter()
```

保持 props 的响应式：

```typescript
export default {
  props: ['user'],
  setup(props) {
    // props 不能直接解构
    const { user } = toRefs(props)
    
    // user 是 ref，保持响应式
    watch(user, (newUser) => {
      console.log('user changed:', newUser)
    })
  }
}
```

## 响应式追踪的原理

为什么 ObjectRefImpl 能保持响应式？关键在于它直接访问源对象的属性。

当在 effect 中访问 `countRef.value` 时：

1. 触发 ObjectRefImpl 的 getter
2. getter 访问 `this._object[this._key]`
3. 如果 `_object` 是 reactive 对象，这次访问会触发 Proxy 的 get 拦截
4. track 被调用，当前 effect 被添加到属性的依赖中

当源属性变化时：

1. Proxy 的 set 拦截触发
2. trigger 被调用
3. 依赖的 effect 被通知更新

ObjectRefImpl 本身没有 dep，它只是一个"指针"，真正的依赖追踪发生在源 reactive 对象上。

## 注意事项

toRef 创建的 ref 与源对象保持连接。如果源对象被替换，连接会断开：

```typescript
let state = reactive({ count: 0 })
const countRef = toRef(state, 'count')

state = reactive({ count: 100 })  // 新对象
console.log(countRef.value)  // 仍然是 0，因为 countRef 指向旧对象
```

对于可能不存在的属性，可以使用默认值：

```typescript
const state = reactive<{ count?: number }>({})
const countRef = toRef(state, 'count', 0)
console.log(countRef.value)  // 0（默认值）
```

## ToRef 和 ToRefs 类型

```typescript
export type ToRef<T> = IfAny<T, Ref<T>, [T] extends [Ref] ? T : Ref<T>>

export type ToRefs<T = any> = {
  [K in keyof T]: ToRef<T[K]>
}
```

ToRef 处理各种边界情况：如果 T 已经是 Ref 则返回 T，否则返回 Ref\<T\>。ToRefs 是对象的每个属性都应用 ToRef。

## 本章小结

toRef 和 toRefs 解决了响应式对象解构时失去响应式的问题。toRef 通过 ObjectRefImpl 创建指向源属性的 ref，getter/setter 直接操作源对象，保持了响应式连接。toRefs 是批量版本，将对象的所有属性转换为 ref。

这些函数在 Composition API 中很重要，特别是在编写和使用 composables 时。它们让我们可以既享受解构的便利，又不失去响应式能力。

理解它们的实现原理（特别是 ObjectRefImpl 如何作为"指针"工作），有助于在遇到边界情况时正确处理。
