# 响应式系统的设计权衡

任何技术设计都涉及权衡。Vue3 响应式系统的设计者在多个维度上做出了选择，每个选择都有代价和收益。理解这些权衡，可以帮助我们在合适的场景做出合适的决策。

## 自动追踪 vs 显式声明

Vue3 选择了自动依赖追踪。当 effect 执行时，系统自动记录它访问了哪些响应式属性。开发者不需要手动声明"这个 effect 依赖 A 和 B"。

这个设计带来的好处是明显的：代码更简洁，不容易遗漏依赖，重构时依赖关系自动更新。想象一下如果像 React 那样需要手动维护依赖数组，每次修改逻辑都要检查依赖是否完整，那会多么繁琐。

```javascript
// Vue3：依赖自动追踪
const doubled = computed(() => state.count * 2)
// 修改逻辑时，依赖自动更新
const tripled = computed(() => state.count * 3 + state.offset)

// React：依赖手动声明
const doubled = useMemo(() => state.count * 2, [state.count])
// 修改逻辑后，必须记得更新依赖数组
const tripled = useMemo(() => state.count * 3 + state.offset, [state.count, state.offset])
```

但自动追踪也有代价。首先是运行时开销——每次属性访问都要经过 Proxy 拦截，检查是否有活跃的 effect，如果有就记录依赖。这个开销虽然已经被优化得很小，但它确实存在。

其次是调试困难。当一个 effect 意外触发或没有触发时，可能不容易理解原因。依赖是隐式的，你需要在脑中模拟"这段代码执行时访问了哪些属性"。Vue DevTools 提供了一些辅助工具，但仍然没有显式声明那么直观。

第三是条件依赖的问题。如果 effect 中有条件分支，不同条件下访问的属性不同，依赖关系就变得动态：

```javascript
effect(() => {
  if (state.showDetails) {
    console.log(state.details)
  } else {
    console.log(state.summary)
  }
})
```

当 `showDetails` 从 false 变成 true 时，effect 重新执行，开始追踪 `details`。这是正确的行为，但有时候会让人困惑——"为什么改 details 没有触发更新？"（因为当时 showDetails 是 false，details 没有被访问过）。

Vue3 的设计者认为，自动追踪带来的便利性超过了它的缺点。这个判断对于大多数应用是正确的，但在某些对性能极其敏感或需要精确控制的场景，可能需要用 shallowRef 或 markRaw 来手动管理。

## 细粒度 vs 粗粒度

Vue3 采用了细粒度的依赖追踪。每个属性都有自己的依赖集合，修改一个属性只会触发依赖这个属性的 effect。

```javascript
const state = reactive({ a: 1, b: 2 })

effect(() => console.log('A:', state.a))
effect(() => console.log('B:', state.b))

state.a = 10 // 只触发第一个 effect
state.b = 20 // 只触发第二个 effect
```

这比粗粒度追踪（比如"整个对象变了，重新执行所有相关 effect"）更高效。在大型应用中，这个差异可能很显著——修改一个不相关的属性不会导致大量不必要的重新计算。

但细粒度追踪也有代价。它需要更复杂的数据结构来存储依赖关系（WeakMap → Map → Set），需要在每次属性访问和修改时维护这些结构。对于简单的场景，这可能是过度设计。

另一个考虑是内存占用。每个响应式属性都有自己的依赖集合，如果有很多属性但大部分没有被追踪，这些集合就浪费了。Vue3 通过惰性创建（只有被访问的属性才创建 Proxy）来缓解这个问题，但在极端情况下仍然需要注意。

## 可变状态 vs 不可变状态

Vue3 拥抱可变状态。你可以直接修改响应式对象的属性，系统会检测到变化并触发更新：

```javascript
state.count++
state.user.name = 'Alice'
state.items.push({ id: 1 })
```

这符合大多数 JavaScript 开发者的直觉。对象是可变的，修改对象就是修改它的属性，不需要创建新对象。

对比不可变风格：

```javascript
setState(prev => ({ ...prev, count: prev.count + 1 }))
setState(prev => ({
  ...prev,
  user: { ...prev.user, name: 'Alice' }
}))
setState(prev => ({
  ...prev,
  items: [...prev.items, { id: 1 }]
}))
```

不可变风格更啰嗦，但它有自己的优点。每次状态变化都产生一个新的状态快照，这让时间旅行调试（如 Redux DevTools）变得简单。状态的变化是显式的——看到 setState 调用就知道状态变了。不可变状态还便于实现乐观更新和回滚。

Vue3 选择可变状态主要是为了开发体验。直接修改更直觉，代码更简洁，对新手更友好。但这也意味着放弃了不可变状态带来的一些好处。如果需要时间旅行调试或状态快照，需要用 Pinia 等状态管理库配合 devtools 实现。

## 惰性计算 vs 立即计算

Vue3 的 computed 采用惰性计算。计算属性的值只在被读取时才计算，如果没人读取，就不会执行任何计算：

```javascript
const expensive = computed(() => {
  console.log('Computing...')
  return heavyCalculation(state.data)
})

// 此时 'Computing...' 还没有打印
// 只有当访问 expensive.value 时才会计算
```

惰性计算的好处是避免不必要的计算。如果一个计算属性定义了但暂时没有被用到，它不会浪费资源。这对于条件渲染的场景特别有用——某些计算属性只在特定条件下才需要。

但惰性计算也有缺点。它让 computed 的执行时机变得不可预测。在调试时，你可能需要知道"这个 computed 什么时候执行的"，但因为它是惰性的，取决于谁在什么时候读取了它。

另外，惰性计算和缓存结合时有一些微妙的问题。computed 会缓存结果，只有依赖变化时才重新计算。但如果 computed 内部有副作用（虽然不推荐），这些副作用的执行时机会变得难以预测。

Vue3 还提供了 watch 和 watchEffect，它们是"立即执行"的（或可以配置为立即执行）。这给开发者提供了选择：用 computed 进行惰性派生，用 watch 进行立即响应。

## 同步追踪 vs 异步追踪

Vue3 的依赖追踪是同步的。effect 在同步执行过程中访问的响应式属性会被追踪，异步代码中的访问不会：

```javascript
effect(async () => {
  console.log(state.a) // 被追踪
  await someAsync()
  console.log(state.b) // 不被追踪
})
```

这是一个实现上的限制，也是一个设计选择。如果要追踪异步代码中的访问，需要某种方式维持"活跃 effect"的上下文跨越异步边界。这在 JavaScript 中是困难的——每次 await 都是一个新的微任务，之间没有内置的上下文传递机制。

这个限制在实践中影响不大，因为大多数情况下，你需要追踪的数据访问都在同步部分。异步操作通常是用来获取数据，获取到的数据赋值给响应式属性时，那个赋值操作会触发更新。

```javascript
watchEffect(async () => {
  const id = state.userId // 同步访问，被追踪
  const data = await fetchUser(id) // 异步操作
  state.userData = data // 这个赋值会触发其他依赖 userData 的 effect
})
```

但这确实是一个需要理解的点。如果不了解这个限制，可能会困惑于"为什么修改了 state.b 但 effect 没有重新执行"。

## 批量更新 vs 立即更新

Vue3 默认采用批量更新。多个同步的状态修改会被合并，只触发一次 DOM 更新：

```javascript
state.a = 1
state.b = 2
state.c = 3
// 只会触发一次 DOM 更新
```

这是一个性能优化。如果每次状态变化都立即更新 DOM，上面的代码会导致三次 DOM 更新，大部分是浪费的。

批量更新通过调度器实现。状态变化时，相关的 effect 不会立即执行，而是被放入队列，等到当前同步代码执行完毕后统一执行。

这带来了一个"异步更新"的问题：修改状态后，DOM 不会立即反映变化。如果你需要在状态更新后立即操作 DOM，需要用 nextTick 等待：

```javascript
state.message = 'Hello'
// 此时 DOM 还没有更新
await nextTick()
// 现在 DOM 更新了
console.log(element.textContent) // 'Hello'
```

这对于有 Vue2 经验的开发者来说是熟悉的，但对于新手可能会困惑。为什么我明明修改了数据，但读取 DOM 却还是旧的值？

Vue3 保留了这个设计，因为性能收益是显著的。在复杂的交互中，一次用户操作可能触发多个状态变化，批量更新可以大幅减少不必要的 DOM 操作。

## 隐式转换 vs 显式转换

Vue3 的 reactive 会递归地将嵌套对象转换为响应式：

```javascript
const state = reactive({
  user: {
    profile: {
      name: 'Alice'
    }
  }
})
// state.user 和 state.user.profile 都是响应式的
```

这是"隐式"的——你没有对嵌套对象调用 reactive，但它们自动变成了响应式的。

隐式转换的好处是使用方便，你不需要关心嵌套层级。但它也有代价：可能会对你不需要响应式的对象进行不必要的转换。

```javascript
const state = reactive({
  // 假设 config 是一个大型配置对象，不需要响应式
  config: loadLargeConfig(),
  // 只有这个需要响应式
  currentItem: null
})
```

在这种情况下，loadLargeConfig 返回的整个对象树都会被转换成响应式的，这是浪费的。

解决方案是使用 markRaw 或 shallowReactive：

```javascript
const state = reactive({
  config: markRaw(loadLargeConfig()),
  currentItem: null
})
// 或者
const state = shallowReactive({
  config: loadLargeConfig(),
  currentItem: null
})
```

Vue3 提供了这些工具来处理特殊情况，但默认行为是"全部转换"，因为这符合大多数场景的需求。

## 权衡的启示

从这些权衡中，我们可以学到一些东西。

首先，没有完美的设计，只有合适的设计。Vue3 的响应式系统针对的是"典型的 Web 应用开发场景"，在这个场景下，它的选择是合理的。但在其他场景（如高性能游戏、大数据可视化），可能需要不同的权衡。

其次，理解默认行为的代价可以帮助我们优化。知道 reactive 是深度转换的，我们就可以在需要时用 shallowReactive。知道依赖追踪是同步的，我们就不会在异步代码中期待自动追踪。

最后，权衡意识可以指导架构设计。在设计状态结构时，考虑哪些数据需要响应式、哪些不需要；在设计更新流程时，考虑是否需要立即执行还是可以批量处理。

## 小结

Vue3 响应式系统在多个维度上做出了权衡：自动追踪 vs 显式声明、细粒度 vs 粗粒度、可变 vs 不可变、惰性 vs 立即、同步 vs 异步、批量 vs 立即、隐式 vs 显式。每个选择都有其理由和代价。

作为使用者，我们不需要认同所有的选择，但需要理解它们。这样才能在遇到问题时快速定位原因，在需要时选择合适的替代方案。

在下一章中，我们将从宏观角度审视整个响应式系统的架构，把之前章节讨论的各个概念串联起来，形成一个完整的知识图谱。

