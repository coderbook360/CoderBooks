# triggerRef：手动触发 ref 更新

在使用 shallowRef 时，修改内部对象的属性不会自动触发更新。triggerRef 函数提供了一种方式来手动触发 ref 的依赖更新，这在特定场景下非常有用。

## 为什么需要 triggerRef

shallowRef 的设计目的是避免深层响应式转换，但这也意味着内部变化不会被自动检测：

```typescript
const state = shallowRef({ count: 0 })

effect(() => {
  console.log(state.value.count)
})

// 这不会触发 effect
state.value.count++
```

在某些场景下，我们既想避免深层转换（出于性能或功能考虑），又需要在适当时机触发更新。triggerRef 就是为此设计的。

## triggerRef 的实现

triggerRef 的实现非常简洁：

```typescript
export function triggerRef(ref: Ref): void {
  triggerRefValue(ref, DirtyLevels.Dirty, __DEV__ ? ref.value : void 0)
}
```

它直接调用 triggerRefValue，传入 DirtyLevels.Dirty 表示这是一个确定的更新。在开发模式下还会传入当前值用于调试。

与正常 setter 的区别在于：setter 会检查新旧值是否不同才触发，而 triggerRef 无条件触发。

## 使用模式

triggerRef 的典型使用模式是：修改内部状态后手动触发：

```typescript
const data = shallowRef({ items: [] })

function addItem(item) {
  data.value.items.push(item)
  triggerRef(data)
}
```

这种模式让你完全控制更新的时机。你可以进行多次修改，最后只触发一次更新：

```typescript
const state = shallowRef({ a: 1, b: 2, c: 3 })

function updateAll(newA, newB, newC) {
  state.value.a = newA
  state.value.b = newB
  state.value.c = newC
  triggerRef(state)  // 一次性触发
}
```

## 与普通 ref 的对比

对于普通 ref，内部修改自动触发更新，不需要 triggerRef：

```typescript
const refState = ref({ count: 0 })

effect(() => {
  console.log(refState.value.count)
})

refState.value.count++  // 自动触发 effect
```

实际上，对普通 ref 调用 triggerRef 也是有效的，它会强制触发一次更新。但这通常是不必要的，因为普通 ref 已经自动处理了。

```typescript
const r = ref({ value: 1 })
r.value.value = 2  // 已经触发了
triggerRef(r)       // 再次触发，通常没必要
```

## triggerRefValue 详解

triggerRef 内部调用的 triggerRefValue 我们之前见过，这里再深入看一下：

```typescript
export function triggerRefValue(
  ref: RefBase<any>,
  dirtyLevel: DirtyLevels = DirtyLevels.Dirty,
  newVal?: unknown,
) {
  ref = toRaw(ref)
  const dep = ref.dep
  if (dep) {
    triggerEffects(
      dep,
      dirtyLevel,
      __DEV__
        ? {
            target: ref,
            type: TriggerOpTypes.SET,
            key: 'value',
            newValue: newVal,
          }
        : void 0,
    )
  }
}
```

首先用 toRaw 确保获取原始的 ref（以防传入的是响应式包装的 ref）。然后检查 dep 是否存在——如果这个 ref 从未被追踪过，dep 会是 undefined，无需触发。

如果有依赖，调用 triggerEffects 触发所有关联的 effect。开发模式下传入调试信息，生产模式下省略。

## 对普通 ref 使用 triggerRef 的场景

虽然普通 ref 通常自动触发更新，但有时你可能需要强制触发。比如当使用 markRaw 阻止了某个嵌套对象的响应式转换时：

```typescript
const state = ref({
  normalData: { value: 1 },
  rawData: markRaw({ value: 2 })
})

// rawData 内部的变化不会触发更新
state.value.rawData.value = 3

// 如果确实需要触发，可以使用 triggerRef
triggerRef(state)
```

这是一个边界场景，但展示了 triggerRef 的灵活性。

## 与 watch 的交互

triggerRef 会触发依赖这个 ref 的所有 effect，包括 watch：

```typescript
const data = shallowRef({ count: 0 })

watch(data, (newVal) => {
  console.log('changed:', newVal.count)
})

data.value.count++
triggerRef(data)  // 触发 watch 回调
```

但要注意，watch 默认比较引用。如果对象引用没变，watch 的 newValue 和 oldValue 会是同一个对象：

```typescript
watch(data, (newVal, oldVal) => {
  console.log(newVal === oldVal)  // true，是同一个对象
})

data.value.count++
triggerRef(data)
```

如果需要正确比较变化，可能需要在修改前保存快照，或使用 deep watch。

## 批量更新的优化

triggerRef 可以用于实现批量更新优化：

```typescript
const items = shallowRef<Item[]>([])

// 不好：每次添加都触发
function addItems(newItems: Item[]) {
  for (const item of newItems) {
    items.value.push(item)
    triggerRef(items)  // 多次触发
  }
}

// 好：一次性触发
function addItemsBatched(newItems: Item[]) {
  for (const item of newItems) {
    items.value.push(item)
  }
  triggerRef(items)  // 只触发一次
}
```

这种控制在处理大批量数据更新时特别有用。

## 与 reactive 的对比

reactive 对象没有类似的 triggerRef。如果需要强制触发 reactive 对象的更新，通常需要使用其他方法：

```typescript
const state = reactive({ count: 0 })

// 无法直接 triggerRef
// 替代方案：触发一个无实质变化的更新
state.count = state.count  // setter 会检测到"变化"...实际上不会
```

实际上对于 reactive，由于它自动追踪所有属性，很少需要手动触发。如果使用了 markRaw 等特殊情况，可能需要重新设计数据结构。

## 调试技巧

triggerRef 在调试时也很有用。当你不确定某个 ref 是否有依赖时，可以手动触发看看效果：

```typescript
const myRef = shallowRef({ ... })

// 手动触发，观察是否有 effect 被执行
console.log('triggering...')
triggerRef(myRef)
console.log('triggered')
```

结合 Vue Devtools 或自定义的 onTrigger 回调，可以观察依赖更新的情况。

## 本章小结

triggerRef 是一个简单但实用的工具函数，用于手动触发 ref 的依赖更新。它的主要使用场景是配合 shallowRef——在修改内部状态后通知系统更新。

它的实现直接调用 triggerRefValue，跳过了正常 setter 中的值比较检查。这使得它可以在任何需要的时候强制触发更新，给了开发者完全的控制权。

理解 triggerRef 的工作原理，有助于在使用 shallowRef 进行性能优化时保持正确的响应式行为。它是 Vue 响应式 API 中"精细控制"能力的一部分。
