# computed 的惰性求值设计

`computed` 是 Vue3 响应式系统中最精巧的 API 之一。它实现了两个看似矛盾的目标：既能自动追踪依赖并在依赖变化时更新，又能延迟计算直到真正需要结果时才执行。这种"惰性求值"的设计既优化了性能，又保持了响应式的便利性。

## 为什么需要 computed

假设我们有一个用户列表，需要根据过滤条件显示不同的结果：

```javascript
const users = reactive([
  { name: 'Alice', age: 25, active: true },
  { name: 'Bob', age: 30, active: false },
  { name: 'Charlie', age: 35, active: true }
])

const filterAge = ref(20)

// 方案一：每次访问都重新计算
function getFilteredUsers() {
  return users.filter(u => u.active && u.age >= filterAge.value)
}

// 每次调用都会执行过滤逻辑
console.log(getFilteredUsers())
console.log(getFilteredUsers()) // 又计算了一次
```

这种方式的问题是：即使 `users` 和 `filterAge` 没有变化，每次访问都要重新计算。在数据量大或计算逻辑复杂时，这是明显的性能浪费。

`computed` 解决了这个问题。它会缓存计算结果，只有当依赖变化时才重新计算：

```javascript
const filteredUsers = computed(() => {
  console.log('Computing filtered users')
  return users.filter(u => u.active && u.age >= filterAge.value)
})

console.log(filteredUsers.value) // 输出: Computing filtered users, [...]
console.log(filteredUsers.value) // 不输出 Computing（使用缓存）
console.log(filteredUsers.value) // 不输出 Computing（使用缓存）

filterAge.value = 30 // 依赖变化
console.log(filteredUsers.value) // 输出: Computing filtered users, [...]
```

## 惰性求值的核心思想

惰性求值（lazy evaluation）是函数式编程中的重要概念。它的核心思想是：延迟表达式的求值，直到真正需要结果时才计算。

在 `computed` 的场景中，惰性求值体现在两个方面：

第一，computed 不会在创建时立即计算。只有当它的值第一次被访问时，才会执行计算函数。

```javascript
const state = reactive({ count: 0 })

const doubled = computed(() => {
  console.log('Computing')
  return state.count * 2
})
// 这里不会输出 "Computing"

// 只有访问 value 时才计算
console.log(doubled.value) // 输出: Computing, 0
```

第二，当依赖变化时，computed 不会立即重新计算，而是标记为"脏"（需要重新计算）。只有下次访问时才真正计算。

```javascript
state.count = 5
// 这里不会输出 "Computing"，只是标记 doubled 为"脏"

console.log(doubled.value) // 输出: Computing, 10
```

这种设计意味着：如果一个 computed 的值在依赖变化后从未被访问，就完全不会浪费计算资源。

## computed 的内部结构

Vue3 的 `computed` 返回一个 `ComputedRefImpl` 实例。这个类的核心结构如下：

```javascript
class ComputedRefImpl {
  // 缓存的值
  _value
  
  // 是否"脏"（需要重新计算）
  _dirty = true
  
  // 内部的 ReactiveEffect
  effect
  
  constructor(getter, setter) {
    this.effect = new ReactiveEffect(getter, () => {
      // scheduler：当依赖变化时，标记为脏
      if (!this._dirty) {
        this._dirty = true
        // 触发依赖 computed 的 effect
        triggerRefValue(this)
      }
    })
  }
  
  get value() {
    // 收集对 computed 的依赖
    trackRefValue(this)
    
    // 如果是脏的，重新计算
    if (this._dirty) {
      this._dirty = false
      this._value = this.effect.run()
    }
    
    return this._value
  }
  
  set value(newValue) {
    // 调用 setter（如果有的话）
  }
}
```

这个设计有几个关键点。内部使用 ReactiveEffect 来追踪 getter 函数的依赖。通过 scheduler 而不是直接重新计算，实现了惰性。`_dirty` 标志控制是否需要重新计算。访问 `value` 时既会收集依赖（让其他 effect 可以依赖这个 computed），又会在必要时触发计算。

## 缓存机制的工作流程

让我们详细追踪一次 computed 的工作流程：

```javascript
const count = ref(0)
const doubled = computed(() => count.value * 2)

// 1. 创建 computed
// - 创建 ComputedRefImpl 实例
// - 创建内部的 ReactiveEffect（但不执行 getter）
// - _dirty = true

// 2. 第一次访问 doubled.value
// - 检查 _dirty，为 true
// - 执行 effect.run()，也就是 getter
// - getter 访问 count.value，建立依赖关系
// - 返回计算结果 0，存入 _value
// - 设置 _dirty = false

// 3. 再次访问 doubled.value
// - 检查 _dirty，为 false
// - 直接返回 _value（使用缓存）

// 4. 修改 count.value = 5
// - count 的 trigger 找到 doubled 的 effect
// - 调用 scheduler
// - scheduler 设置 _dirty = true
// - 如果有 effect 依赖 doubled，触发它们

// 5. 再次访问 doubled.value
// - 检查 _dirty，为 true
// - 重新执行 getter，得到 10
// - 更新 _value，设置 _dirty = false
```

这个流程清楚地展示了"惰性"的含义：第 4 步修改 count 时，doubled 并没有重新计算，只是被标记为脏。只有在第 5 步真正访问时才计算。

## computed 作为依赖源

computed 不仅可以依赖其他响应式数据，它本身也可以被其他 effect 依赖。这就是为什么 `ComputedRefImpl` 的 `get value()` 中有 `trackRefValue(this)` 调用。

```javascript
const count = ref(0)
const doubled = computed(() => count.value * 2)
const quadrupled = computed(() => doubled.value * 2)

effect(() => {
  console.log('Quadrupled:', quadrupled.value)
})
// 输出: Quadrupled: 0

count.value = 5
// 输出: Quadrupled: 20
```

这里形成了一个依赖链：effect → quadrupled → doubled → count。当 count 变化时，整个链条会被正确触发。

但这里有一个微妙的问题：当 count 变化时，doubled 和 quadrupled 都被标记为脏，effect 也需要重新执行。但 effect 不应该执行两次（一次因为 doubled 变脏，一次因为 quadrupled 变脏）。

Vue3 通过精心设计的触发顺序解决这个问题。当 count 变化触发 doubled 的 scheduler 时，scheduler 会触发依赖 doubled 的 effect（包括 quadrupled）。这时 quadrupled 会被标记为脏并触发依赖它的 effect。最终，effect 只会被触发一次，并且访问 quadrupled.value 时会沿着链条正确地重新计算。

## 只读 vs 可写 computed

`computed` 可以只有 getter（只读），也可以同时有 getter 和 setter（可写）：

```javascript
// 只读 computed
const doubled = computed(() => count.value * 2)
doubled.value = 10 // 警告：Write operation failed: computed value is readonly

// 可写 computed
const doubled = computed({
  get: () => count.value * 2,
  set: (val) => { count.value = val / 2 }
})
doubled.value = 10 // 正常，count 变为 5
```

可写 computed 在双向绑定场景中很有用：

```javascript
const firstName = ref('John')
const lastName = ref('Doe')

const fullName = computed({
  get: () => `${firstName.value} ${lastName.value}`,
  set: (val) => {
    const [first, last] = val.split(' ')
    firstName.value = first
    lastName.value = last
  }
})

// 可以直接修改 fullName
fullName.value = 'Jane Smith'
// firstName 变为 'Jane'，lastName 变为 'Smith'
```

## 与 watch 的区别

初学者常常困惑 `computed` 和 `watch` 的区别。它们都可以响应数据变化，但用途不同。

`computed` 用于派生状态。它表达的是"A 由 B 和 C 计算得来"这样的关系。computed 有返回值，而且会缓存。

`watch` 用于执行副作用。它表达的是"当 A 变化时，执行某些操作"。watch 不返回值，每次依赖变化都会执行回调。

```javascript
// computed：派生新状态
const fullName = computed(() => `${firstName.value} ${lastName.value}`)

// watch：执行副作用
watch(fullName, (newVal, oldVal) => {
  console.log(`Name changed from ${oldVal} to ${newVal}`)
  // 可以发送请求、更新 localStorage 等
})
```

一个判断标准：如果你需要的是一个值，用 computed；如果你需要在值变化时做某事，用 watch。

## 性能优化建议

`computed` 的缓存机制让它非常适合用于昂贵的计算：

```javascript
// 好：复杂计算只在必要时执行
const expensiveResult = computed(() => {
  return heavyComputation(data.value)
})

// 不好：每次访问都重新计算
function getExpensiveResult() {
  return heavyComputation(data.value)
}
```

但也要注意一些陷阱：

**避免在 computed 中产生副作用**。computed 的执行时机是不确定的（取决于何时被访问），在其中执行副作用会让代码难以理解和调试。

```javascript
// 不好：在 computed 中执行副作用
const result = computed(() => {
  console.log('Computing...') // 这会在不确定的时机输出
  fetch('/api/log') // 更糟糕
  return data.value * 2
})
```

**避免不必要的深层依赖**。如果只需要对象的某个属性，不要访问整个对象：

```javascript
// 不好：依赖整个 user 对象
const greeting = computed(() => {
  return `Hello, ${user.value.name}`
})

// 好：只依赖需要的属性
const userName = computed(() => user.value.name)
const greeting = computed(() => `Hello, ${userName.value}`)
```

## 与其他框架的对比

Vue3 的 computed 在设计上与其他响应式框架有相似之处，也有独特的选择。

Solid.js 的 `createMemo` 与 Vue 的 computed 非常相似，都是惰性求值、自动追踪依赖、有缓存。但 Solid 不需要 `.value`，因为它使用函数调用而不是属性访问。

MobX 的 `computed` 也是惰性的，但它使用装饰器语法（在类中）或 `makeObservable`，与 Vue 的函数式 API 风格不同。

React 没有内置的 computed 概念，通常用 `useMemo` 来实现类似效果。但 `useMemo` 需要手动声明依赖数组，而 Vue 的 computed 是自动追踪的：

```javascript
// React useMemo：手动声明依赖
const doubled = useMemo(() => count * 2, [count])

// Vue computed：自动追踪依赖
const doubled = computed(() => count.value * 2)
```

## 小结

`computed` 的惰性求值设计是 Vue3 响应式系统的精华之一。通过 `_dirty` 标志和 scheduler 机制，它实现了"延迟计算直到真正需要"的效果。缓存机制避免了重复计算，而自动依赖追踪让使用变得简单。computed 可以作为依赖源形成依赖链，整个系统能够正确处理复杂的依赖关系。

在下一章中，我们将探讨 `watch` 的设计思路，看看它是如何处理副作用执行的。

