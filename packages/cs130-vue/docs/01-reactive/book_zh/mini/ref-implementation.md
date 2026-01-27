# ref 实现：让原始值也能响应

reactive 基于 Proxy，而 Proxy 只能代理对象。这意味着原始值——数字、字符串、布尔值——无法直接使用 reactive。但在实际开发中，我们经常需要响应式的计数器、开关、文本。ref 就是为此而生的。

## 为什么原始值需要特殊处理

先理解问题的本质。响应式系统的核心是"拦截访问"——在读取数据时收集依赖，在修改数据时触发更新。对于对象，Proxy 可以拦截属性访问。但原始值不是对象，没有属性可以拦截：

```typescript
let count = 0

effect(() => {
  console.log(count)  // 这只是读取一个变量，无法拦截
})

count = 1  // 这只是赋值，无法拦截
```

JavaScript 没有提供拦截变量读写的机制。变量的读写发生在引擎内部，用户代码无法介入。

## 包装的思路

既然不能拦截变量，那就把原始值包装成对象。对象有属性，属性访问可以拦截：

```typescript
const count = { value: 0 }

effect(() => {
  console.log(count.value)  // 读取属性，可以拦截
})

count.value = 1  // 写入属性，可以拦截
```

这就是 ref 的核心思路——用一个带有 .value 属性的对象来包装原始值。访问 ref.value 时收集依赖，修改 ref.value 时触发更新。

## 基本实现

最直接的实现是使用 getter 和 setter：

```typescript
import { track, trigger } from './effect'

export function ref(value: any) {
  return {
    get value() {
      track(this, 'value')
      return value
    },
    set value(newValue) {
      if (!Object.is(newValue, value)) {
        value = newValue
        trigger(this, 'value')
      }
    }
  }
}
```

getter 在读取 .value 时调用 track，建立依赖关系。setter 在写入时先比较新旧值，只有值真正变化才调用 trigger。value 变量通过闭包被保持，这是一个简洁的实现技巧。

这个版本可以工作，但有几个问题需要解决。

## 使用类来组织代码

实际项目中，ref 的实现使用类来更好地组织代码和类型：

```typescript
const IS_REF = Symbol('isRef')

class RefImpl<T> {
  private _value: T
  
  // 标记这是一个 ref
  [IS_REF] = true
  
  constructor(value: T) {
    this._value = value
  }
  
  get value(): T {
    track(this, 'value')
    return this._value
  }
  
  set value(newValue: T) {
    if (!Object.is(newValue, this._value)) {
      this._value = newValue
      trigger(this, 'value')
    }
  }
}

export function ref<T>(value: T): Ref<T> {
  return new RefImpl(value)
}
```

类的形式让代码结构更清晰，也让 TypeScript 的类型推导工作得更好。IS_REF 是一个 Symbol，用于标记 ref 对象，后面会用它来实现 isRef 函数。

## 处理对象值

ref 不仅可以包装原始值，也可以包装对象：

```typescript
const state = ref({ count: 0 })

effect(() => {
  console.log(state.value.count)
})

state.value.count = 1  // 应该触发更新
```

但上面的实现有问题。state.value 返回的是原始对象，修改 state.value.count 不会触发任何更新，因为原始对象没有被代理。

解决方案是：如果 ref 包装的是对象，就用 reactive 代理它：

```typescript
import { reactive, isObject } from './reactive'

class RefImpl<T> {
  private _value: T
  private _rawValue: T  // 保存原始值用于比较
  
  [IS_REF] = true
  
  constructor(value: T) {
    this._rawValue = value
    // 如果是对象，用 reactive 包装
    this._value = isObject(value) ? reactive(value) : value
  }
  
  get value(): T {
    track(this, 'value')
    return this._value
  }
  
  set value(newValue: T) {
    // 用原始值比较，避免 reactive 代理干扰
    if (!Object.is(newValue, this._rawValue)) {
      this._rawValue = newValue
      this._value = isObject(newValue) ? reactive(newValue) : newValue
      trigger(this, 'value')
    }
  }
}
```

现在有两个内部变量：_rawValue 保存未经处理的原始值，用于比较；_value 是实际返回的值，如果是对象就是 reactive 代理。这样 `state.value.count = 1` 就能正确触发更新了，因为 state.value 返回的是一个 reactive 对象。

## 识别 ref：isRef

有时候我们需要判断一个值是不是 ref。比如在模板编译时，需要自动解包 ref：

```typescript
export function isRef(r: any): r is Ref {
  return r && r[IS_REF] === true
}
```

这里用到了前面定义的 IS_REF 标记。一个普通的 `{ value: 0 }` 对象不会有这个标记，所以 isRef 能正确区分 ref 和普通对象。

## 自动解包：unref

在某些场景下，一个值可能是 ref 也可能是普通值，我们想要统一地获取"真正的值"：

```typescript
export function unref<T>(ref: T | Ref<T>): T {
  return isRef(ref) ? ref.value : ref
}
```

这在组合函数中特别有用：

```typescript
function useDouble(value: number | Ref<number>) {
  const unwrapped = unref(value)
  // 现在 unwrapped 一定是数字
}
```

## 浅层 ref：shallowRef

有时候我们不希望对象值被 reactive 包装。比如当对象很大或者包含不可代理的内容时：

```typescript
class ShallowRefImpl<T> {
  private _value: T
  
  [IS_REF] = true
  
  constructor(value: T) {
    this._value = value
  }
  
  get value(): T {
    track(this, 'value')
    return this._value
  }
  
  set value(newValue: T) {
    if (!Object.is(newValue, this._value)) {
      this._value = newValue
      trigger(this, 'value')
    }
  }
}

export function shallowRef<T>(value: T): Ref<T> {
  return new ShallowRefImpl(value)
}
```

shallowRef 不会对对象值使用 reactive，只追踪 .value 本身的变化：

```typescript
const state = shallowRef({ count: 0 })

effect(() => {
  console.log(state.value.count)
})

state.value.count = 1  // 不触发！内部变化不被追踪

state.value = { count: 1 }  // 触发！整体替换被追踪
```

shallowRef 适合包装大型对象或者需要手动控制更新时机的场景。

## 手动触发：triggerRef

配合 shallowRef 使用，有时候我们想手动触发更新：

```typescript
export function triggerRef(ref: Ref): void {
  trigger(ref, 'value')
}
```

使用场景：

```typescript
const state = shallowRef({ count: 0 })

state.value.count = 1  // 修改了，但没触发更新
triggerRef(state)      // 手动触发
```

这提供了更细粒度的控制，当你知道对象内部变化了、需要更新视图时，可以手动触发。

## 从 reactive 创建 ref：toRef

有时候我们想把 reactive 对象的某个属性"提取"为 ref。这在组合函数返回值时特别有用：

```typescript
class ObjectRefImpl<T extends object, K extends keyof T> {
  [IS_REF] = true
  
  constructor(
    private _object: T,
    private _key: K
  ) {}
  
  get value(): T[K] {
    return this._object[this._key]
  }
  
  set value(newValue: T[K]) {
    this._object[this._key] = newValue
  }
}

export function toRef<T extends object, K extends keyof T>(
  object: T,
  key: K
): Ref<T[K]> {
  return new ObjectRefImpl(object, key)
}
```

注意 ObjectRefImpl 没有自己的 track 和 trigger——它直接读写原始的 reactive 对象，依赖追踪由 reactive 完成。这意味着 toRef 创建的 ref 和原始属性保持同步：

```typescript
const state = reactive({ count: 0 })
const countRef = toRef(state, 'count')

effect(() => {
  console.log(countRef.value)
})

state.count = 1     // 触发！修改原属性
countRef.value = 2  // 触发！修改 ref 等于修改原属性
```

## 批量转换：toRefs

toRefs 把 reactive 对象的所有属性转换为 refs：

```typescript
export function toRefs<T extends object>(object: T): { [K in keyof T]: Ref<T[K]> } {
  const result: any = {}
  for (const key in object) {
    result[key] = toRef(object, key)
  }
  return result
}
```

这在组合函数返回解构值时特别有用：

```typescript
function useCounter() {
  const state = reactive({ count: 0, double: 0 })
  
  function increment() {
    state.count++
    state.double = state.count * 2
  }
  
  // 返回 refs，可以解构而不失去响应性
  return {
    ...toRefs(state),
    increment
  }
}

// 使用时可以解构
const { count, double, increment } = useCounter()
```

如果直接解构 reactive 对象，解构出来的值会失去响应性（因为它们只是普通值的拷贝）。toRefs 让每个属性变成 ref，解构后仍然保持与原对象的连接。

## 完整实现

```typescript
import { track, trigger } from './effect'
import { reactive, isObject } from './reactive'

const IS_REF = Symbol('isRef')

export interface Ref<T = any> {
  value: T
}

class RefImpl<T> {
  private _value: T
  private _rawValue: T
  
  [IS_REF] = true
  
  constructor(value: T) {
    this._rawValue = value
    this._value = isObject(value) ? reactive(value as object) as T : value
  }
  
  get value(): T {
    track(this, 'value')
    return this._value
  }
  
  set value(newValue: T) {
    if (!Object.is(newValue, this._rawValue)) {
      this._rawValue = newValue
      this._value = isObject(newValue) ? reactive(newValue as object) as T : newValue
      trigger(this, 'value')
    }
  }
}

class ShallowRefImpl<T> {
  private _value: T
  [IS_REF] = true
  
  constructor(value: T) {
    this._value = value
  }
  
  get value(): T {
    track(this, 'value')
    return this._value
  }
  
  set value(newValue: T) {
    if (!Object.is(newValue, this._value)) {
      this._value = newValue
      trigger(this, 'value')
    }
  }
}

class ObjectRefImpl<T extends object, K extends keyof T> {
  [IS_REF] = true
  
  constructor(private _object: T, private _key: K) {}
  
  get value(): T[K] {
    return this._object[this._key]
  }
  
  set value(newValue: T[K]) {
    this._object[this._key] = newValue
  }
}

export function ref<T>(value: T): Ref<T> {
  return new RefImpl(value)
}

export function shallowRef<T>(value: T): Ref<T> {
  return new ShallowRefImpl(value)
}

export function isRef(r: any): r is Ref {
  return r && r[IS_REF] === true
}

export function unref<T>(ref: T | Ref<T>): T {
  return isRef(ref) ? ref.value : ref
}

export function toRef<T extends object, K extends keyof T>(
  object: T,
  key: K
): Ref<T[K]> {
  return new ObjectRefImpl(object, key)
}

export function toRefs<T extends object>(object: T): { [K in keyof T]: Ref<T[K]> } {
  const result: any = {}
  for (const key in object) {
    result[key] = toRef(object, key)
  }
  return result
}

export function triggerRef(ref: Ref): void {
  trigger(ref, 'value')
}
```

## 本章小结

ref 用包装对象的方式解决了原始值无法被代理的问题。核心思路很简单——把值放在对象的 .value 属性里，用 getter/setter 拦截访问。但围绕这个核心，我们构建了一套完整的工具：isRef 用于类型判断，unref 用于自动解包，shallowRef 用于浅层响应，toRef 和 toRefs 用于与 reactive 的互操作。

ref 和 reactive 是互补的：reactive 适合复杂的状态对象，ref 适合单个值或者需要整体替换的场景。理解它们的区别和配合使用，是掌握 Vue 响应式系统的关键。

在下一章中，我们将实现 computed，看看如何基于 effect 构建计算属性。
