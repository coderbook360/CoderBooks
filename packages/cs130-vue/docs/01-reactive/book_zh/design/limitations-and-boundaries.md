# 响应式系统的边界与限制

尽管 Vue3 的响应式系统非常强大，但它并不是万能的。理解它的边界和限制，可以帮助我们在合适的场景使用合适的工具，避免踩坑和误用。

## 原始值无法直接被代理

这是 JavaScript 语言本身的限制。Proxy 只能代理对象，无法代理原始值（number、string、boolean、null、undefined、symbol、bigint）。

```javascript
const count = reactive(0) // 不会工作，返回 0 本身
const name = reactive('Alice') // 不会工作，返回 'Alice' 本身
```

这就是为什么 Vue3 提供了 `ref` API。ref 用一个对象包装原始值，使其可以被追踪：

```javascript
const count = ref(0)
count.value++ // 通过 .value 访问和修改
```

但这也引入了一个小小的不便：使用 ref 时需要通过 `.value` 访问。Vue3 在模板中自动解包 ref，在 reactive 对象中也会自动解包，但在普通的 JavaScript 代码中仍需手动处理。

## 解构会丢失响应式

当解构一个 reactive 对象时，得到的是普通值，不再是响应式的：

```javascript
const state = reactive({
  count: 0,
  name: 'Alice'
})

// 解构后失去响应式
let { count, name } = state

count++ // 不会触发任何更新
// state.count 仍然是 0
```

这是因为解构操作本质上是赋值——`count` 被赋值为 `state.count` 的当前值（一个数字），之后 `count` 和 `state.count` 之间就没有任何关联了。

解决方案有几种。使用 `toRefs` 保持响应式：

```javascript
const { count, name } = toRefs(state)
count.value++ // 这会修改 state.count
```

或者使用 `toRef` 创建单个属性的 ref：

```javascript
const count = toRef(state, 'count')
```

或者避免解构，直接使用完整路径：

```javascript
state.count++
```

## 替换整个 reactive 对象

替换 reactive 对象的引用会导致响应式连接断开：

```javascript
let state = reactive({ count: 0 })

effect(() => {
  console.log(state.count)
})

// 替换整个对象会断开响应式
state = reactive({ count: 10 })
// effect 不会重新执行，因为它依赖的是旧的 state 对象
```

替换后，effect 依赖的仍然是旧的 proxy 对象，而新创建的 proxy 与它没有依赖关系。

解决方案是使用 ref 包装对象：

```javascript
const state = ref({ count: 0 })

effect(() => {
  console.log(state.value.count)
})

// 替换内部对象会触发更新
state.value = { count: 10 } // effect 重新执行
```

或者只修改对象的属性而不是替换整个对象：

```javascript
Object.assign(state, newData)
```

## 集合类型的特殊处理

`Map`、`Set`、`WeakMap`、`WeakSet` 这些集合类型有自己的内部方法，不能像普通对象那样被 Proxy 的 get/set 拦截。Vue3 为它们提供了专门的处理：

```javascript
const map = reactive(new Map())

map.set('key', 'value') // 触发依赖
console.log(map.get('key')) // 收集依赖
```

Vue3 重新实现了这些集合的方法（get、set、has、delete 等），在调用原生方法的同时进行依赖收集和触发更新。

但这意味着集合的响应式依赖于使用 Vue3 包装后的方法。如果通过某种方式获取到原始集合并直接操作它，就绕过了响应式：

```javascript
const map = reactive(new Map())
const rawMap = toRaw(map)

rawMap.set('key', 'value') // 不会触发响应式更新
```

## 某些内置对象不支持

一些内置对象有内部槽位（internal slots），这些槽位无法被 Proxy 拦截。典型的例子是 `Date`：

```javascript
const date = reactive(new Date())

// 这会报错或产生意外行为
// date.setFullYear(2025)
```

Date 对象的方法（如 `getTime`、`setFullYear`）会检查 `this` 的内部槽位 `[[DateValue]]`，而 Proxy 对象没有这个槽位。

对于这类对象，建议使用 ref 包装：

```javascript
const date = ref(new Date())

// 替换整个 Date 对象来触发更新
function setYear(year) {
  const newDate = new Date(date.value)
  newDate.setFullYear(year)
  date.value = newDate
}
```

类似的问题也存在于 `RegExp`、`Error` 等内置类型。

## 异步问题

响应式系统的依赖收集是同步的。如果在 effect 中有异步操作，异步代码中访问的响应式数据不会被收集：

```javascript
const state = reactive({ id: 1, data: null })

effect(async () => {
  // 这里的访问会被收集
  const id = state.id
  
  const result = await fetchData(id)
  
  // 这里的访问不会被收集，因为 effect 的同步部分已经执行完了
  state.data = result
})
```

更准确地说，当 `await` 暂停执行时，effect 的"收集阶段"就结束了。之后的代码不在 effect 的执行上下文中。

解决方案是确保所有需要追踪的访问都在同步部分：

```javascript
watchEffect(async () => {
  const id = state.id // 同步访问，会被收集
  const settings = state.settings // 同步访问，会被收集
  
  const result = await fetchData(id, settings)
  state.data = result
})
```

## 大型数据集的性能

响应式转换有成本。对于非常大的数据集，这个成本可能变得显著：

```javascript
// 假设有 10000 条记录
const largeData = reactive(fetchLargeDataset())
// 递归地为所有嵌套对象创建 Proxy
```

虽然 Vue3 的惰性代理策略减轻了这个问题（只有访问的属性才会被代理），但在某些场景下仍然需要考虑。

优化策略包括：

使用 `shallowReactive` 只代理顶层：

```javascript
const largeData = shallowReactive(fetchLargeDataset())
// 嵌套对象不会被代理
```

使用 `markRaw` 标记不需要响应式的数据：

```javascript
const state = reactive({
  // 静态配置不需要响应式
  config: markRaw(loadConfig()),
  // 只有这些需要响应式
  currentPage: 1,
  selectedIds: []
})
```

将大数据集保存在普通变量中，只用响应式管理"指针"：

```javascript
// 原始数据不需要响应式
const allItems = fetchLargeDataset()

// 只追踪索引或 ID
const state = reactive({
  currentIndex: 0,
  selectedIds: new Set()
})

// 通过计算属性获取当前数据
const currentItem = computed(() => allItems[state.currentIndex])
```

## 循环引用

Vue3 可以处理循环引用，但需要注意深度观察可能带来的问题：

```javascript
const a = reactive({ name: 'A' })
const b = reactive({ name: 'B' })

a.ref = b
b.ref = a // 循环引用

// 这可能导致无限递归
watch(a, handler, { deep: true })
```

Vue3 的 `traverse` 函数（用于深度观察）会追踪已访问的对象来避免无限循环，但在某些复杂场景下仍可能出问题。建议避免不必要的深度观察，或明确指定要观察的属性。

## 外部状态的同步

响应式系统只能追踪通过 Vue 的响应式 API 进行的修改。来自外部的状态变化（如直接操作 DOM、WebSocket 消息、定时器等）不会被自动感知：

```javascript
const state = reactive({ count: 0 })

// 外部修改
setTimeout(() => {
  // 这会被追踪，因为通过 state 修改
  state.count = 10
}, 1000)

// 但如果绕过了响应式...
const raw = toRaw(state)
setTimeout(() => {
  raw.count = 20 // 不会触发响应式更新
}, 2000)
```

对于外部状态（如 localStorage、WebSocket），需要显式地将变化同步到响应式系统：

```javascript
socket.onmessage = (event) => {
  const data = JSON.parse(event.data)
  // 显式更新响应式状态
  state.messages.push(data)
}
```

## this 指向问题

在响应式对象的方法中使用 `this` 时需要小心：

```javascript
const state = reactive({
  count: 0,
  increment() {
    this.count++
  }
})

// 正常调用没问题
state.increment()

// 但如果把方法取出来...
const { increment } = state
increment() // this 指向 undefined 或 window，不是 state
```

解决方案是使用箭头函数或显式绑定：

```javascript
const state = reactive({
  count: 0,
  increment: () => {
    state.count++ // 直接引用 state
  }
})

// 或者
const increment = state.increment.bind(state)
```

## 类实例的响应式

对类实例使用 `reactive` 需要注意：

```javascript
class Counter {
  count = 0
  
  increment() {
    this.count++
  }
}

const counter = reactive(new Counter())
counter.increment() // 工作正常

// 但是...
const { increment } = counter
increment() // 可能有 this 指向问题
```

更安全的做法是在类中使用箭头函数定义方法，或者使用组合式函数替代类。

## 调试困难

响应式系统的"魔法"有时让调试变得困难。当 effect 意外触发或不触发时，可能不容易找到原因。

Vue3 提供了调试工具：

```javascript
watchEffect(
  () => { /* ... */ },
  {
    onTrack(e) {
      console.log('Tracked:', e.target, e.key)
    },
    onTrigger(e) {
      console.log('Triggered:', e.target, e.key)
      debugger // 在这里断点
    }
  }
)
```

Vue DevTools 也提供了响应式状态的可视化查看。

## 小结

了解响应式系统的边界和限制是高效使用它的前提。原始值需要用 ref 包装、解构会丢失响应式、某些内置对象需要特殊处理、异步代码中的访问不会被收集、大型数据集需要优化策略——这些都是在实际开发中可能遇到的问题。

掌握这些边界情况，可以帮助我们在遇到问题时快速定位原因，也可以让我们在设计时做出更好的选择。在下一章中，我们将把 Vue3 的响应式系统与其他方案（MobX、Solid 等）进行对比，更全面地理解它的特点。

