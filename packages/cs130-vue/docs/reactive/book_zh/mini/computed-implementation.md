# computed 实现：惰性求值与缓存

computed 是响应式系统中最优雅的抽象之一。它表达的是"派生状态"的概念：有些数据不是独立存在的，而是由其他数据计算得出的。computed 让我们可以声明这种派生关系，系统会自动维护它们的一致性。

与直接使用 effect 相比，computed 有两个关键特性：惰性求值（只在访问时才计算）和缓存（依赖未变化时直接返回上次的结果）。这两个特性结合起来，让 computed 成为处理派生状态的首选方案——你可以放心地使用它，不用担心不必要的重复计算。

## 从问题出发理解 computed

假设我们有一个用户列表，需要在多个地方显示过滤后的结果：

```typescript
const users = ref([...])  // 大量用户数据
const searchTerm = ref('')

// 过滤逻辑可能很复杂
const filteredUsers = computed(() => {
  return users.value.filter(user => 
    user.name.includes(searchTerm.value) ||
    user.email.includes(searchTerm.value)
  )
})
```

如果没有 computed，每次访问过滤结果都要重新执行过滤逻辑。有了 computed：只有当 users 或 searchTerm 变化时才重新计算；同一渲染周期内多次访问 filteredUsers.value 只计算一次；如果没有人访问 filteredUsers，即使依赖变化也不会浪费计算资源。

这就是"惰性"加"缓存"的价值。

## 最简版本：先让它工作

让我们从最简单的版本开始。这个版本没有缓存，每次访问都重新计算，但它能帮助我们理解核心结构：

```typescript
export function computed<T>(getter: () => T) {
  let value: T
  
  // 使用 effect 来追踪 getter 中访问的响应式数据
  effect(() => {
    value = getter()
  })
  
  // 返回一个类似 ref 的对象
  return {
    get value() {
      return value
    }
  }
}
```

这个版本有明显的问题：每次依赖变化都会立即执行 getter，即使没有人访问 value。这违反了"惰性求值"的原则。但它展示了 computed 的基本思路：用 effect 来追踪依赖。

## 添加惰性求值

要实现惰性，我们需要：依赖变化时不立即计算，而是标记"需要重算"；访问 value 时检查这个标记，如果需要就重算。

这就是 `dirty` 标志的作用：

```typescript
export function computed<T>(getter: () => T) {
  let value: T
  let dirty = true  // 初始状态是"脏"的，需要计算
  
  // 创建 effect 但不立即执行
  const _effect = effect(getter, {
    lazy: true,  // 关键：不立即执行
    scheduler() {
      // 依赖变化时，不执行 getter，只标记为脏
      dirty = true
    }
  })
  
  return {
    get value() {
      // 只有脏的时候才重新计算
      if (dirty) {
        value = _effect()  // 执行 getter 获取新值
        dirty = false      // 标记为干净
      }
      return value
    }
  }
}
```

`lazy: true` 选项让 effect 创建后不立即执行。`scheduler` 是一个自定义函数，当依赖变化触发 effect 时，不执行 getter 本身，而是执行 scheduler。我们在 scheduler 中只做一件事：把 dirty 设为 true。

这样，当依赖变化时，computed 只是被标记为脏；真正的重算推迟到下次访问 value 时。如果依赖变化了很多次但没人访问 value，getter 一次都不会执行。

## 让 computed 也可以被追踪

目前的实现还有一个问题：computed 不能被其他 effect 追踪。考虑这个场景：

```typescript
const count = ref(0)
const double = computed(() => count.value * 2)

effect(() => {
  console.log(double.value)  // 这个 effect 应该在 count 变化时重新执行
})
```

要让 computed 可被追踪，它需要在被读取时调用 track，在值变化时调用 trigger：

```typescript
export function computed<T>(getter: () => T) {
  let value: T
  let dirty = true
  
  // 创建一个对象作为追踪的目标
  const computedRef = {
    get value() {
      if (dirty) {
        value = _effect()
        dirty = false
      }
      // 关键：收集对 computedRef 的依赖
      track(computedRef, 'value')
      return value
    }
  }
  
  const _effect = effect(getter, {
    lazy: true,
    scheduler() {
      if (!dirty) {
        dirty = true
        // 关键：通知依赖 computedRef 的 effects
        trigger(computedRef, 'value')
      }
    }
  })
  
  return computedRef
}
```

现在，当某个 effect 访问 `double.value` 时，track 会建立这个 effect 与 computedRef 之间的依赖关系。当 count 变化导致 double 变脏时，scheduler 中的 trigger 会通知所有依赖 double 的 effects。

注意 scheduler 中的条件检查 `if (!dirty)`：只有从"干净"变为"脏"时才触发。如果已经是脏的，说明之前的变化还没被消费，不需要重复通知。

## 使用类来组织代码

实际实现中，我们通常用类来封装 computed 的逻辑，这样更清晰也更容易扩展：

```typescript
class ComputedRefImpl<T> {
  private _value!: T
  private _dirty = true
  private _effect: ReactiveEffect
  
  // 标识这是一个 ref 类型（computed 也是一种 ref）
  public readonly __v_isRef = true
  
  constructor(getter: () => T) {
    // 创建内部的 effect
    this._effect = new ReactiveEffect(getter, () => {
      // scheduler：依赖变化时标记为脏并通知
      if (!this._dirty) {
        this._dirty = true
        trigger(this, 'value')
      }
    })
  }
  
  get value(): T {
    // 惰性求值：只在脏时重算
    if (this._dirty) {
      this._value = this._effect.run()!
      this._dirty = false
    }
    // 依赖收集
    track(this, 'value')
    return this._value
  }
}

export function computed<T>(getter: () => T): ComputedRef<T> {
  return new ComputedRefImpl(getter)
}
```

使用类的好处是：状态（_value, _dirty）和行为（getter）被清晰地封装在一起；可以方便地添加标识属性（__v_isRef）；代码更易于理解和维护。

## 理解执行流程

让我们通过一个具体例子来理解完整的执行流程：

```typescript
const count = ref(0)
const double = computed(() => count.value * 2)

effect(() => {
  console.log(double.value)
})

count.value = 1
```

初始化阶段：创建 count ref，值为 0。创建 double computed，_dirty 为 true，getter 还未执行。创建外层 effect，它立即执行。执行过程中访问 double.value。

首次访问 double.value：_dirty 为 true，执行 getter。getter 访问 count.value，track 建立 count 与 double 内部 effect 的依赖。getter 返回 0 * 2 = 0，存入 _value，_dirty 设为 false。track 建立外层 effect 与 double 的依赖。返回 0，控制台输出 0。

修改 count.value：trigger 找到依赖 count 的 effects，包括 double 的内部 effect。调用 double 内部 effect 的 scheduler（不是直接执行 getter）。scheduler 发现 _dirty 为 false，设为 true，然后 trigger(double, 'value')。trigger 找到依赖 double 的外层 effect，执行它。外层 effect 再次访问 double.value。

再次访问 double.value：_dirty 为 true，重新执行 getter。getter 返回 1 * 2 = 2，控制台输出 2。

这个流程展示了 scheduler 的关键作用：它把"立即执行"变成了"标记脏并通知"，让计算推迟到真正需要时。

## 可写 computed

有时候我们需要 computed 不仅能读，还能写。写操作通常是反向更新源数据：

```typescript
const firstName = ref('John')
const lastName = ref('Doe')

const fullName = computed({
  get: () => `${firstName.value} ${lastName.value}`,
  set: (value: string) => {
    const [first, last] = value.split(' ')
    firstName.value = first
    lastName.value = last
  }
})

fullName.value = 'Jane Smith'  // 会更新 firstName 和 lastName
```

实现可写 computed 需要同时支持函数形式（只读）和对象形式（可读写）的参数：

```typescript
class WritableComputedRefImpl<T> {
  private _value!: T
  private _dirty = true
  private _effect: ReactiveEffect
  private _setter: (value: T) => void
  
  constructor(getter: () => T, setter: (value: T) => void) {
    this._setter = setter
    this._effect = new ReactiveEffect(getter, () => {
      if (!this._dirty) {
        this._dirty = true
        trigger(this, 'value')
      }
    })
  }
  
  get value(): T {
    if (this._dirty) {
      this._value = this._effect.run()!
      this._dirty = false
    }
    track(this, 'value')
    return this._value
  }
  
  set value(newValue: T) {
    // 调用用户提供的 setter
    this._setter(newValue)
  }
}

export function computed<T>(
  getterOrOptions: (() => T) | { get: () => T; set: (v: T) => void }
): ComputedRef<T> {
  if (typeof getterOrOptions === 'function') {
    return new ComputedRefImpl(getterOrOptions)
  } else {
    return new WritableComputedRefImpl(
      getterOrOptions.get, 
      getterOrOptions.set
    )
  }
}
```

可写 computed 的 setter 不直接修改 _value，而是调用用户提供的 setter 函数。这个函数通常会修改源数据，进而触发响应式更新，最终导致 computed 重新计算。

## computed 链

computed 可以依赖其他 computed，形成派生链：

```typescript
const count = ref(1)
const double = computed(() => count.value * 2)
const quadruple = computed(() => double.value * 2)

effect(() => {
  console.log(quadruple.value)  // 初始输出 4
})

count.value = 2  // 输出 8
```

当 count 变化时，更新会沿着链条传播：count 触发 double 的 scheduler，double 变脏并触发 quadruple 的 scheduler，quadruple 变脏并触发外层 effect，effect 访问 quadruple.value，quadruple 重算需要 double.value，double 重算需要 count.value，最终得到正确的结果。

这个链式传播是自动的，不需要任何额外的配置。每个 computed 只关心自己的直接依赖，系统自动处理依赖的依赖。

## 本章小结

computed 通过两个关键机制实现了高效的派生状态管理：dirty 标志记录是否需要重算，scheduler 在依赖变化时只标记脏而不立即计算。

从设计角度看，computed 是 effect 的一种特化：它是一个"有返回值的、惰性的、可缓存的" effect。scheduler 是实现这种特化的关键——它让我们可以自定义 effect 被触发时的行为，而不是总是立即执行。

在下一章中，我们将实现 watch，看看如何在 effect 的基础上构建另一种常用的响应式模式。
