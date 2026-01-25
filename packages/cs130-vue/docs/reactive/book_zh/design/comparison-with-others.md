# 与其他响应式方案的对比

响应式编程在前端领域有多种实现方案。Vue3 的响应式系统只是其中之一。把它放在更大的背景下对比，可以帮助我们理解它的设计取舍，也可以借鉴其他方案的优点。

## MobX：可观察状态管理

MobX 是 React 生态中最流行的响应式状态管理库之一。它和 Vue3 响应式系统有很多相似之处，但也有关键区别。

MobX 的核心 API 包括 `observable`（类似 reactive）、`action`（修改状态的函数）、`computed`（派生状态）和 `autorun`（类似 effect）。一个典型的 MobX 用法：

```javascript
import { makeObservable, observable, action, computed } from 'mobx'

class TodoStore {
  todos = []
  
  constructor() {
    makeObservable(this, {
      todos: observable,
      addTodo: action,
      completedCount: computed
    })
  }
  
  addTodo(text) {
    this.todos.push({ text, completed: false })
  }
  
  get completedCount() {
    return this.todos.filter(t => t.completed).length
  }
}
```

MobX 采用装饰器或 `makeObservable` 显式声明哪些属性是可观察的，哪些方法是 action，哪些是计算属性。这种方式需要更多的样板代码，但也更加明确——看一眼类定义就知道什么是响应式的。

Vue3 的方式更加"隐式"。用 `reactive` 包装后，对象的所有属性自动变成响应式的，不需要逐个声明。这降低了入门门槛，但有时候也让人不太确定哪些操作会触发更新。

MobX 有一个重要的设计决策：状态修改必须在 action 中进行。在严格模式下，直接修改可观察状态会报错。这是一种约束，可以让状态变化更可预测、更易追踪。Vue3 没有这个限制，你可以在任何地方修改响应式状态。

在依赖追踪的粒度上，两者都采用细粒度追踪。但 MobX 提供了更多控制选项，比如可以用 `observable.shallow` 只追踪浅层变化，用 `observable.ref` 只追踪引用变化。Vue3 也有类似的 `shallowReactive` 和 `shallowRef`，但 MobX 的选项更丰富一些。

MobX 还有一个"事务"概念。多个修改可以被包装在一个事务中，只在事务结束时触发一次更新。Vue3 通过调度器和 nextTick 达到类似效果，但机制不太一样。

## Solid.js：编译时细粒度响应式

Solid.js 是一个新兴的框架，它的响应式系统和 Vue3 有一些相似的 API，但实现哲学完全不同。

Solid 的核心是 `createSignal`：

```javascript
import { createSignal, createEffect } from 'solid-js'

const [count, setCount] = createSignal(0)

createEffect(() => {
  console.log('Count is:', count())
})

setCount(1) // 输出：Count is: 1
```

看起来和 Vue3 的 ref 很像，但有一个关键区别：Solid 的 signal 必须用函数调用（`count()`）来读取值，而 Vue3 的 ref 用 `.value` 属性访问。

这个差异反映了两种不同的追踪策略。Vue3 在运行时通过 Proxy 拦截属性访问来追踪依赖；Solid 在编译时分析代码，找出 signal 的使用位置。Solid 的方式理论上可以消除运行时开销，因为依赖关系在编译时就确定了。

Solid 的另一个特点是它的组件只执行一次。在 React 中，组件函数每次更新都会重新执行；在 Vue 中，setup 函数只执行一次，但模板会重新渲染；在 Solid 中，组件函数只执行一次，更新时只有真正变化的部分会被重新执行。

这意味着 Solid 不需要 useMemo 或 computed 来缓存值——因为计算逻辑本来就不会重复执行。但这也带来了一些心智负担：你必须理解"为什么这段代码只执行一次"。

Solid 的 `createMemo` 类似 Vue3 的 computed：

```javascript
const doubleCount = createMemo(() => count() * 2)
```

但因为 Solid 没有运行时的依赖追踪系统，它的 memo 和 effect 必须显式声明。这在某些复杂场景下可能更清晰，但也更啰嗦。

Solid 的哲学是"用编译换运行时"，通过编译时分析来消除运行时开销。Vue3 的哲学是"用运行时换灵活性"，在运行时进行依赖追踪以获得更灵活的动态特性。

## Svelte：编译器魔法

Svelte 更加激进——它几乎把响应式完全放在了编译器里。

在 Svelte 中，只要用 `$:` 前缀声明一个语句，它就变成响应式的：

```svelte
<script>
  let count = 0
  $: doubled = count * 2
  $: console.log('Count changed:', count)
</script>

<button on:click={() => count++}>
  Clicks: {count}, Doubled: {doubled}
</button>
```

没有 `reactive`、没有 `ref`、没有 `.value`，就是普通的 JavaScript 赋值。Svelte 的编译器分析代码，在赋值语句后插入更新 DOM 的代码。

这种方式的优点是代码极其简洁。缺点是它不是真正的 JavaScript——你写的代码会被编译器重写，这可能让调试变得困难，也不利于在框架之外复用逻辑。

Vue3 的响应式系统是一个独立的运行时库，可以在任何 JavaScript 环境中使用。Svelte 的响应式是框架特定的，离开了 Svelte 编译器就无法工作。

Svelte 5 引入了 Runes，试图解决一些现有设计的问题。它用 `$state` 和 `$derived` 替代 `let` 和 `$:`，使响应式声明更明确：

```svelte
<script>
  let count = $state(0)
  let doubled = $derived(count * 2)
</script>
```

这和 Vue3 的 API 更接近了，但仍然依赖编译器来消除运行时开销。

## React Hooks：函数式响应式

React 的 Hooks 是另一种响应式方案，虽然 React 社区不常用"响应式"这个词。

```javascript
function Counter() {
  const [count, setCount] = useState(0)
  
  useEffect(() => {
    console.log('Count changed:', count)
  }, [count])
  
  const doubled = useMemo(() => count * 2, [count])
  
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>
}
```

React Hooks 需要手动声明依赖数组，这是和 Vue3/MobX/Solid 最大的区别。Vue3 通过 Proxy 自动追踪依赖；React 需要开发者显式告诉 useEffect 和 useMemo 它们依赖什么。

这种设计有好有坏。好处是依赖关系非常明确，不存在"魔法"；坏处是容易遗漏依赖，导致过期闭包问题。React 团队引入了 ESLint 规则来检查依赖数组，但这仍然是一个常见的错误来源。

React 的组件模型也不同。每次状态变化，组件函数会重新执行。这意味着即使某个值没有变化，计算它的代码也会重新执行（除非用 useMemo 缓存）。Vue3 的 computed 只在依赖变化时重新计算，不需要开发者担心"是否应该 memo"。

React 18 引入了 Concurrent Mode 和 Suspense，这些特性和传统的响应式模型有些不同——它们更关注的是渲染的调度和中断，而不是状态的细粒度追踪。

## RxJS：流式响应式

RxJS 代表了另一种响应式风格——基于流（Stream）的响应式编程。

```javascript
import { BehaviorSubject, map, distinctUntilChanged } from 'rxjs'

const count$ = new BehaviorSubject(0)
const doubled$ = count$.pipe(map(x => x * 2))

doubled$.subscribe(value => console.log('Doubled:', value))

count$.next(1)
count$.next(2)
```

RxJS 的响应式是基于"推送"模型的。值被推送进流，订阅者接收更新。Vue3 的响应式更像是"拉取"模型——effect 在执行时读取值，系统记录依赖关系。

RxJS 提供了丰富的操作符来处理异步流：debounce、throttle、switchMap、combineLatest 等等。这在处理复杂的异步逻辑时非常强大。Vue3 的 watch 和 computed 可以处理简单的派生逻辑，但对于复杂的异步组合，RxJS 更加得心应手。

但 RxJS 的学习曲线也更陡峭。理解背压、热/冷 Observable、多播等概念需要时间。Vue3 的响应式更加直觉化——大多数开发者可以很快上手。

在 Angular 生态中，RxJS 是一等公民。Angular 的 HttpClient、Forms、Router 都返回 Observable。Vue 生态更倾向于使用 async/await 和 Promise，但也可以集成 RxJS。

## 设计空间对比

把这些方案放在一起，可以看到几个关键的设计维度：

关于显式 vs 隐式依赖追踪：Vue3 和 MobX 采用自动追踪（通过 Proxy 或 getter/setter），Solid 采用编译时分析，React 需要手动声明依赖数组。自动追踪更方便，手动声明更明确。

关于运行时 vs 编译时：Vue3 和 MobX 主要在运行时工作，Solid 和 Svelte 大量依赖编译器。运行时方案更灵活，编译时方案性能更好。

关于可变 vs 不可变：Vue3 和 MobX 拥抱可变状态，React 更倾向于不可变更新（尽管不强制）。可变状态更直觉，不可变状态更可预测。

关于框架耦合 vs 独立库：Vue3 的 `@vue/reactivity` 可以独立使用，MobX 也是独立库，Svelte 的响应式深度绑定框架。独立库可以在不同场景复用，绑定框架的可以做更激进的优化。

## Vue3 的定位

Vue3 的响应式系统在这个设计空间中找到了一个平衡点。

它采用自动依赖追踪，降低了入门门槛和出错可能。它是运行时的，保持了灵活性，但也通过编译器优化（如静态提升、补丁标记）来提升性能。它拥抱可变状态，符合大多数开发者的直觉，同时通过调度器保证更新的一致性。它是一个独立库，可以在 Vue 组件之外使用，但也和 Vue 的模板编译器深度集成。

没有完美的方案，只有适合特定场景的方案。Vue3 的设计优先考虑了"渐进式采用"和"开发体验"，这和 Vue 一贯的理念一致。

## 可以借鉴的思想

从其他方案中，我们可以学到一些有用的思想。

MobX 的 action 约束可以让状态变化更可追踪。虽然 Vue3 不强制，但在大型项目中，主动采用类似的约定（如只在 Pinia 的 action 中修改状态）可以提高可维护性。

Solid 的细粒度更新提醒我们关注性能边界。在对性能敏感的场景，可以考虑使用 shallowRef、shallowReactive 来减少响应式开销。

Svelte 的简洁语法说明编译器可以大幅简化开发体验。Vue3 的 `<script setup>` 和 Reactivity Transform 就是朝这个方向的探索。

RxJS 的操作符展示了流式处理的强大。在复杂的异步场景，可以考虑结合 RxJS 使用，而不是仅靠 watch 硬撑。

## 小结

响应式编程有多种流派和实现。Vue3 的响应式系统在自动追踪、运行时灵活性、可变状态、独立可用这几个维度上做出了自己的选择。理解这些选择背后的权衡，可以帮助我们更好地使用 Vue3，也可以在必要时借鉴其他方案的优点。

在下一章中，我们将聚焦 Vue3 响应式系统自身的设计权衡，深入探讨那些"为什么这样设计"的问题。

