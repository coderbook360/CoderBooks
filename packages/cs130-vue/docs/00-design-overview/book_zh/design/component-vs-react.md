# 与 React 组件系统对比

Vue 和 React 是当今最流行的两个前端框架，它们在组件系统的设计上既有相似之处，也有显著的差异。理解这些差异不仅有助于在两个框架之间进行技术选型，更重要的是能够让我们理解不同的设计决策背后的权衡和考量。本文将从类组件与函数组件、Hooks 与 Composition API、状态更新机制三个维度进行深入对比。

## 类组件 vs 函数组件

React 的组件形态经历了从类组件到函数组件的演变。在 Hooks 出现之前，类组件是 React 中编写有状态组件的唯一方式：

```javascript
// React 类组件
class Counter extends React.Component {
  constructor(props) {
    super(props)
    this.state = { count: 0 }
    this.increment = this.increment.bind(this)
  }
  
  increment() {
    this.setState({ count: this.state.count + 1 })
  }
  
  componentDidMount() {
    console.log('Component mounted')
  }
  
  componentDidUpdate(prevProps, prevState) {
    console.log('Component updated')
  }
  
  render() {
    return (
      <div>
        <p>{this.state.count}</p>
        <button onClick={this.increment}>+</button>
      </div>
    )
  }
}
```

Vue 从一开始就采用了不同的路径。Vue 的组件本质上是一个配置对象，而非 JavaScript 类：

```javascript
// Vue Options API 组件
export default {
  data() {
    return { count: 0 }
  },
  methods: {
    increment() {
      this.count++
    }
  },
  mounted() {
    console.log('Component mounted')
  },
  updated() {
    console.log('Component updated')
  }
}
```

这种设计差异反映了两个框架的不同理念。React 拥抱 JavaScript 的原生特性，使用类和函数作为组件的载体。Vue 则提供了一个更高层次的抽象，通过约定的配置结构来定义组件。

React Hooks 的引入改变了 React 的组件编写方式，函数组件成为推荐的形式：

```javascript
// React 函数组件 + Hooks
function Counter() {
  const [count, setCount] = useState(0)
  
  useEffect(() => {
    console.log('Component mounted or updated')
    return () => console.log('Cleanup')
  })
  
  return (
    <div>
      <p>{count}</p>
      <button onClick={() => setCount(count + 1)}>+</button>
    </div>
  )
}
```

Vue 3 的 Composition API 和 `<script setup>` 语法让 Vue 组件也呈现出类似函数的形态：

```vue
<script setup>
import { ref, onMounted, onUpdated } from 'vue'

const count = ref(0)

function increment() {
  count.value++
}

onMounted(() => console.log('Component mounted'))
onUpdated(() => console.log('Component updated'))
</script>

<template>
  <div>
    <p>{{ count }}</p>
    <button @click="increment">+</button>
  </div>
</template>
```

尽管两者在语法上趋于相似，但底层机制有本质区别。React 函数组件在每次渲染时都会完整执行，Hooks 通过调用顺序来追踪状态。Vue 的 `setup` 函数只在组件初始化时执行一次，后续的重新渲染只执行模板对应的渲染函数。

## Hooks vs Composition API

React Hooks 和 Vue Composition API 都是为了解决逻辑复用和代码组织的问题，但它们的实现机制截然不同。

React Hooks 的核心特点是依赖调用顺序。每次组件渲染时，Hooks 必须以相同的顺序被调用，React 通过这个顺序来关联每个 Hook 与其对应的状态：

```javascript
// React: Hooks 必须在顶层调用，不能在条件语句中
function MyComponent({ showExtra }) {
  const [name, setName] = useState('')
  
  // ❌ 错误：条件调用会破坏 Hooks 的顺序
  // if (showExtra) {
  //   const [extra, setExtra] = useState('')
  // }
  
  // ✅ 正确：Hook 始终调用，条件控制使用
  const [extra, setExtra] = useState('')
  
  // ...
}
```

这个约束来源于 Hooks 的实现原理——React 使用一个链表来存储每个 Hook 的状态，依靠调用顺序来索引。这种设计简洁但也带来了一些心智负担：开发者需要时刻记住 Hooks 的调用规则。

Vue 的 Composition API 没有这个限制。因为 Vue 使用响应式对象来追踪状态，而不是调用顺序：

```javascript
// Vue: 可以在任何地方调用响应式 API
function useFeature(enabled) {
  if (enabled) {
    const extra = ref('')
    return { extra }
  }
  return { extra: null }
}

// 在 setup 中使用
const { extra } = useFeature(props.showExtra)
```

两者在副作用处理上也有显著差异。React 的 `useEffect` 统一处理挂载、更新和卸载：

```javascript
// React: 单一的 effect 处理所有副作用场景
useEffect(() => {
  // 相当于 mounted + updated
  console.log('Effect runs')
  
  return () => {
    // 相当于 beforeUnmount，也在更新前执行
    console.log('Cleanup')
  }
}, [dependency])  // 依赖数组手动声明
```

Vue 提供了更细粒度的生命周期钩子和自动依赖追踪：

```javascript
// Vue: 分离的生命周期钩子
onMounted(() => console.log('Mounted'))
onUpdated(() => console.log('Updated'))
onUnmounted(() => console.log('Unmounted'))

// 自动追踪依赖的 watch
watch(dependency, (newVal, oldVal) => {
  console.log('Dependency changed')
})

// 或使用 watchEffect 自动追踪所有依赖
watchEffect(() => {
  console.log(dependency.value)  // 自动追踪 dependency
})
```

React 需要手动声明依赖数组，遗漏依赖是常见的错误来源。Vue 的响应式系统自动追踪依赖，减少了出错的可能，但也意味着开发者需要理解响应式的工作原理。

在 TypeScript 支持方面，两者都有良好的类型推断。React Hooks 的类型推断直接利用 TypeScript 的函数类型系统：

```typescript
// React: 类型推断自然
const [count, setCount] = useState<number>(0)  // count: number
const [user, setUser] = useState<User | null>(null)  // user: User | null
```

Vue 的响应式 API 也提供了完善的类型支持：

```typescript
// Vue: 泛型参数指定类型
const count = ref<number>(0)  // Ref<number>
const user = ref<User | null>(null)  // Ref<User | null>
```

## 状态更新机制

状态更新机制是两个框架最本质的差异所在。React 采用不可变数据 + 显式触发的模式，Vue 采用可变数据 + 自动追踪的模式。

在 React 中，状态更新必须通过 setter 函数，并且需要返回新的引用：

```javascript
// React: 不可变更新
const [items, setItems] = useState([])

// 添加项目
setItems([...items, newItem])

// 更新项目
setItems(items.map(item => 
  item.id === targetId 
    ? { ...item, name: 'New Name' } 
    : item
))

// 删除项目
setItems(items.filter(item => item.id !== targetId))
```

这种模式的优点是状态变化是显式的、可预测的，便于实现时间旅行调试等特性。缺点是需要手动创建新对象，对于深层嵌套的数据结构尤其繁琐。

Vue 允许直接修改响应式数据，变化会被自动追踪：

```javascript
// Vue: 可变更新
const items = reactive([])

// 添加项目
items.push(newItem)

// 更新项目
const target = items.find(item => item.id === targetId)
if (target) {
  target.name = 'New Name'
}

// 删除项目
const index = items.findIndex(item => item.id === targetId)
if (index > -1) {
  items.splice(index, 1)
}
```

这种模式更符合 JavaScript 开发者的直觉，代码也更简洁。但它要求开发者理解响应式系统的工作原理，例如直接给数组赋值新索引在 Vue 2 中不会触发更新。

状态更新的批处理机制也不同。React 18 引入了自动批处理，在事件处理函数中的多次 setState 会被合并：

```javascript
// React: 自动批处理
function handleClick() {
  setCount(c => c + 1)
  setName('New Name')
  // 只触发一次重渲染
}

// 异步回调中也会批处理（React 18+）
setTimeout(() => {
  setCount(c => c + 1)
  setName('New Name')
  // React 18+ 只触发一次重渲染
}, 100)
```

Vue 通过调度系统实现类似的效果，所有同步的状态修改都会被收集，在下一个微任务中统一更新：

```javascript
// Vue: 自动批处理
function handleClick() {
  count.value++
  name.value = 'New Name'
  // 只触发一次重渲染
}

// 可以使用 nextTick 等待更新完成
async function handleClick() {
  count.value++
  await nextTick()
  console.log('DOM 已更新')
}
```

两种状态更新机制也影响了性能优化的方式。React 使用「协调」（Reconciliation）算法比较新旧虚拟 DOM 树，通过 `React.memo`、`useMemo`、`useCallback` 等手段避免不必要的渲染。Vue 的响应式系统能够精确追踪依赖，组件只有在其依赖的状态变化时才会重新渲染，通常不需要手动优化。

```javascript
// React: 手动优化
const MemoizedChild = React.memo(function Child({ data }) {
  return <div>{data.name}</div>
})

function Parent() {
  const [count, setCount] = useState(0)
  const data = useMemo(() => ({ name: 'Alice' }), [])  // 需要手动 memo
  
  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>{count}</button>
      <MemoizedChild data={data} />
    </div>
  )
}
```

```vue
<!-- Vue: 通常自动优化 -->
<script setup>
import { ref, reactive } from 'vue'

const count = ref(0)
const data = reactive({ name: 'Alice' })
</script>

<template>
  <div>
    <button @click="count++">{{ count }}</button>
    <!-- Child 只在 data 变化时更新 -->
    <Child :data="data" />
  </div>
</template>
```

总的来说，React 和 Vue 的组件系统代表了两种不同的设计哲学：React 更接近函数式编程，强调不可变性和显式控制；Vue 更接近面向对象编程，强调响应式和自动追踪。两者各有优劣，选择哪个取决于团队的技术背景、项目需求和个人偏好。理解它们的差异，有助于我们更好地利用各自的优势，也能够在需要时更顺畅地在两个生态系统之间切换。
