# computed 的 getter 与 setter

computed 支持两种模式：只读模式（只有 getter）和可写模式（有 getter 和 setter）。理解这两种模式的实现和使用场景，有助于充分发挥 computed 的能力。

## 只读 computed

最常见的 computed 用法是只读的，只传入 getter 函数：

```typescript
const count = ref(0)
const doubled = computed(() => count.value * 2)

console.log(doubled.value)  // 0
count.value = 5
console.log(doubled.value)  // 10

doubled.value = 100  // 警告：computed value is readonly
```

只读 computed 的值完全由 getter 决定，尝试直接修改会触发警告（开发模式）或静默失败（生产模式）。

## 可写 computed

通过传入包含 get 和 set 的对象，可以创建可写 computed：

```typescript
const firstName = ref('John')
const lastName = ref('Doe')

const fullName = computed({
  get: () => `${firstName.value} ${lastName.value}`,
  set: (value) => {
    const parts = value.split(' ')
    firstName.value = parts[0]
    lastName.value = parts[1] || ''
  }
})

console.log(fullName.value)  // 'John Doe'
fullName.value = 'Jane Smith'
console.log(firstName.value)  // 'Jane'
console.log(lastName.value)   // 'Smith'
```

setter 让你可以"反向"更新源数据。这在表单双向绑定场景特别有用。

## 实现细节

在 computed 函数中：

```typescript
export function computed<T>(
  getterOrOptions: ComputedGetter<T> | WritableComputedOptions<T>,
  // ...
) {
  let getter: ComputedGetter<T>
  let setter: ComputedSetter<T>

  const onlyGetter = isFunction(getterOrOptions)
  if (onlyGetter) {
    getter = getterOrOptions
    setter = __DEV__
      ? () => {
          console.warn('Write operation failed: computed value is readonly')
        }
      : NOOP
  } else {
    getter = getterOrOptions.get
    setter = getterOrOptions.set
  }

  const cRef = new ComputedRefImpl(getter, setter, onlyGetter || !setter, isSSR)
  // ...
}
```

根据参数类型提取 getter 和 setter。如果只传了函数，setter 被设为警告函数（开发模式）或空函数（生产模式）。

第三个参数 `onlyGetter || !setter` 决定是否只读。这个值被存储在 `cRef[ReactiveFlags.IS_READONLY]`。

## ComputedRefImpl 中的处理

setter 的使用很直接：

```typescript
class ComputedRefImpl<T> {
  // ...
  set value(newValue: T) {
    this._setter(newValue)
  }
}
```

setter 只是调用用户提供的 setter 函数。没有任何响应式逻辑——setter 应该修改源数据，源数据的变化会通过正常的响应式流程触发更新。

## getter 的执行时机

getter 在以下时机执行：

首次访问 .value 时：

```typescript
const doubled = computed(() => {
  console.log('computing')
  return count.value * 2
})
// 还没有执行

doubled.value  // 'computing'，首次执行
```

缓存失效后再次访问：

```typescript
count.value = 10  // 缓存失效
doubled.value     // 'computing'，重新执行
```

依赖的 computed 需要验证时（脏检查流程中）。

## setter 的责任

setter 的责任是修改源数据使得 getter 返回期望的值。这需要 getter 和 setter 逻辑一致：

```typescript
// 好的设计：setter 与 getter 逻辑对称
const celsius = ref(0)
const fahrenheit = computed({
  get: () => celsius.value * 9/5 + 32,
  set: (f) => { celsius.value = (f - 32) * 5/9 }
})

fahrenheit.value = 32
console.log(celsius.value)  // 0
console.log(fahrenheit.value)  // 32，getter 和 setter 一致

// 不好的设计：setter 与 getter 不一致
const broken = computed({
  get: () => celsius.value * 9/5 + 32,
  set: (f) => { celsius.value = f }  // 没有正确转换
})
```

setter 设置的值不需要与传入的值相同，但 getter 应该能反映出这个设置的效果。

## 可写 computed 的响应式流程

当通过 setter 修改时：

```typescript
fullName.value = 'Jane Smith'
```

1. ComputedRefImpl 的 set value 被调用
2. 用户的 setter 执行，修改 firstName 和 lastName
3. firstName 和 lastName 是 ref，它们的变化触发各自的依赖
4. fullName 的 effect 是这些 ref 的依赖之一
5. fullName.effect 被标记为脏
6. 下次访问 fullName.value 时会重新计算

注意 setter 本身不触发 fullName 的更新。更新是通过 setter 修改源数据，源数据触发正常响应式流程实现的。

## 与 v-model 配合

可写 computed 在 v-model 场景非常有用：

```html
<template>
  <input v-model="formattedPrice" />
</template>

<script setup>
const price = ref(1000)

const formattedPrice = computed({
  get: () => `$${price.value.toFixed(2)}`,
  set: (value) => {
    const num = parseFloat(value.replace('$', ''))
    if (!isNaN(num)) {
      price.value = num
    }
  }
})
</script>
```

用户输入带格式的字符串，setter 解析并存储数值。getter 返回格式化的显示值。

## 验证和转换

setter 可以包含验证和转换逻辑：

```typescript
const age = ref(25)

const validatedAge = computed({
  get: () => age.value,
  set: (value) => {
    const num = parseInt(value, 10)
    if (!isNaN(num) && num >= 0 && num <= 150) {
      age.value = num
    }
    // 无效值被忽略
  }
})

validatedAge.value = 30   // 有效，age = 30
validatedAge.value = -5   // 无效，age 仍是 30
validatedAge.value = 200  // 无效，age 仍是 30
```

## 只读标志

ComputedRefImpl 存储只读状态：

```typescript
this[ReactiveFlags.IS_READONLY] = isReadonly
```

这个标志被 isReadonly 函数使用：

```typescript
const readonly = computed(() => someValue.value)
const writable = computed({
  get: () => someValue.value,
  set: (v) => { someValue.value = v }
})

isReadonly(readonly)   // true
isReadonly(writable)   // false
```

## getter 参数

getter 可以接收当前值作为参数：

```typescript
const accumulated = computed((prev) => {
  if (prev === undefined) return source.value
  return prev + source.value
})
```

这个特性在某些累积计算场景有用，但要小心使用——如果依赖变化，整个计算会重新开始，prev 会是上一次计算的结果，不是初始值。

## 本章小结

computed 支持只读和可写两种模式。只读模式更常见，值完全由 getter 决定。可写模式通过 setter 允许"反向"更新源数据。

setter 的实现很简单，只是调用用户提供的函数。响应式更新是通过 setter 修改源数据触发的，不是 setter 直接触发。

可写 computed 在表单处理、数据转换等场景很有用。关键是保持 getter 和 setter 逻辑的一致性，确保设置的值能正确反映在后续的 getter 调用中。
