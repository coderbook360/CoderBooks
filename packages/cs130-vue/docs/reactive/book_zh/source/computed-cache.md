# computed 缓存机制深入

computed 的缓存是其最重要的特性之一。它确保了即使多次访问，只要依赖不变，getter 只执行一次。本章深入分析缓存的实现细节，以及它如何与脏检查机制配合工作。

## 缓存的基本原理

缓存机制由几个部分组成：

```typescript
class ComputedRefImpl<T> {
  private _value!: T           // 缓存的值
  public _cacheable: boolean   // 是否启用缓存
  public readonly effect: ReactiveEffect<T>  // 追踪依赖和脏状态
}
```

`_value` 存储计算结果。一旦计算过，结果被缓存在这里。

`_cacheable` 控制是否使用缓存。在 SSR 模式下为 false，每次都重新计算。

`effect` 的脏状态决定缓存是否有效。dirty 为 false 表示缓存有效。

## 缓存验证流程

当访问 computed.value 时：

```typescript
get value() {
  const self = toRaw(this)
  if (
    (!self._cacheable || self.effect.dirty) &&
    hasChanged(self._value, (self._value = self.effect.run()!))
  ) {
    triggerRefValue(self, DirtyLevels.Dirty)
  }
  trackRefValue(self)
  // ...
  return self._value
}
```

条件 `!self._cacheable || self.effect.dirty` 决定是否重新计算：

- 如果不可缓存（SSR），总是重新计算
- 如果 effect 脏了，需要重新计算
- 否则，直接返回 `_value`

这就是缓存的核心：只有脏的时候才计算，不脏就返回缓存。

## 缓存何时失效

缓存在以下情况失效（effect 变脏）：

直接依赖的响应式数据变化：

```typescript
const count = ref(0)
const doubled = computed(() => count.value * 2)

doubled.value  // 计算并缓存
doubled.value  // 返回缓存
count.value++  // 缓存失效
doubled.value  // 重新计算
```

依赖的 computed 变化：

```typescript
const a = ref(1)
const b = computed(() => a.value * 2)
const c = computed(() => b.value + 1)

c.value  // b 和 c 都计算并缓存
a.value++  // b 和 c 的缓存都失效
c.value  // b 和 c 都重新计算
```

## 缓存复用的场景

缓存在以下情况被复用：

连续多次访问，依赖不变：

```typescript
const data = ref({ items: [1, 2, 3] })
const sum = computed(() => {
  console.log('computing sum')
  return data.value.items.reduce((a, b) => a + b, 0)
})

sum.value  // 'computing sum'，计算
sum.value  // 返回缓存，不打印
sum.value  // 返回缓存，不打印
```

间接依赖变化但值不变（受益于脏检查优化）：

```typescript
const n = ref(10)
const isLarge = computed(() => n.value > 5)
const text = computed(() => isLarge.value ? 'large' : 'small')

text.value  // 'large'
n.value = 20  // isLarge 仍然是 true
text.value  // 返回缓存的 'large'，不重新计算
```

## _cacheable 标志

这个标志在构造时设置：

```typescript
constructor(getter, setter, isReadonly, isSSR) {
  // ...
  this.effect.active = this._cacheable = !isSSR
  // ...
}
```

在 SSR 模式下，`_cacheable` 为 false。这意味着 getter 中的 `!self._cacheable` 始终为 true，每次访问都重新计算：

```typescript
if ((!self._cacheable || self.effect.dirty) && ...)
//     ^^^ true in SSR, always compute
```

为什么 SSR 要禁用缓存？因为 SSR 是一次性渲染，不需要响应式更新。同时 `effect.active` 也是 false，不会进行依赖追踪。这减少了服务端的开销。

## hasChanged 的作用

getter 中使用 hasChanged 比较新旧值：

```typescript
hasChanged(self._value, (self._value = self.effect.run()!))
```

这个比较有两个作用：

1. 决定是否触发依赖更新。只有值真的变了，才调用 `triggerRefValue`。

2. 支持脏检查优化。如果值没变，依赖这个 computed 的 MaybeDirty effect 会回到 NotDirty。

hasChanged 使用 Object.is 进行比较：

```typescript
export const hasChanged = (value: any, oldValue: any): boolean =>
  !Object.is(value, oldValue)
```

这能正确处理 NaN 和 +0/-0 的情况。

## 缓存与副作用

computed 的 getter 应该是纯函数，没有副作用。但如果有副作用，缓存机制可能导致意外行为：

```typescript
let sideEffectCount = 0

const buggy = computed(() => {
  sideEffectCount++  // 副作用
  return someValue.value
})

buggy.value  // sideEffectCount = 1
buggy.value  // sideEffectCount = 1（缓存，不执行）
someValue.value++
buggy.value  // sideEffectCount = 2（重新计算）
```

副作用在缓存生效时不会执行。如果依赖副作用的执行次数，会得到错误的结果。

最佳实践是保持 getter 纯净。如果需要副作用，使用 watch 或 watchEffect。

## 缓存与引用类型

对于返回对象的 computed，缓存返回的是同一个对象引用：

```typescript
const items = ref([1, 2, 3])
const doubled = computed(() => items.value.map(x => x * 2))

const first = doubled.value
const second = doubled.value
console.log(first === second)  // true，同一个数组引用

items.value.push(4)
const third = doubled.value
console.log(first === third)  // false，新数组
```

每次重新计算都返回新对象。但在缓存有效期间，返回的是同一个对象。

## 缓存与调试

可以通过调试选项观察缓存行为：

```typescript
const comp = computed(() => {
  console.log('getter called')
  return someValue.value
}, {
  onTrack(e) {
    console.log('tracking:', e.key)
  },
  onTrigger(e) {
    console.log('triggered by:', e.key)
  }
})
```

onTrack 在 getter 执行、收集依赖时调用。onTrigger 在依赖变化、缓存失效时调用。通过这些回调可以观察缓存何时有效、何时失效。

## 缓存的内存影响

缓存会持有计算结果的引用。对于大对象，这可能影响内存：

```typescript
const largeData = ref(/* 大数据 */)
const processed = computed(() => expensiveTransform(largeData.value))

// processed._value 持有转换后的大对象
// 即使 processed 暂时不用，对象也不会被回收
```

如果担心内存问题，可以考虑：
- 使用 shallowRef 减少响应式开销
- 在不需要时停止相关 effect scope
- 重新评估是否需要缓存这么大的数据

## 缓存 vs 每次计算

什么时候用 computed（缓存），什么时候用函数（每次计算）？

```typescript
// 缓存：适合昂贵的计算，结果被多次使用
const sorted = computed(() => items.value.sort((a, b) => a - b))

// 函数：适合简单计算，或者需要不同参数
function getItem(index) {
  return items.value[index]
}
```

computed 适合：
- 昂贵的计算
- 结果被多处使用
- 不需要参数

函数适合：
- 简单计算
- 需要参数
- 每次调用需要最新值（无论依赖是否变化）

## 本章小结

computed 的缓存机制是其核心特性。通过 `_value` 存储结果、`_cacheable` 控制启用、`effect.dirty` 判断有效性，computed 实现了高效的缓存。

缓存在依赖不变时复用结果，在依赖变化时失效。hasChanged 比较确保只有值真的变了才触发依赖更新，这与脏检查机制配合实现了精确的更新控制。

理解缓存机制有助于正确使用 computed：保持 getter 纯净、理解何时会重新计算、在需要时选择合适的替代方案。
