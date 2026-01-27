# 与 MobX/Solid 响应式对比

响应式系统是前端框架的核心差异点之一。Vue3、MobX、Solid 代表了三种不同的响应式实现思路，各有权衡取舍。理解这些差异，有助于做出更明智的技术选型。

## 响应式粒度

Vue3 的响应式追踪粒度是属性级别。当访问 `state.count` 时，系统记录的是"当前 effect 依赖 state 对象的 count 属性"。修改 `state.name` 不会触发只依赖 `count` 的 effect。

```javascript
// Vue3
const state = reactive({ count: 0, name: 'Vue' })

effect(() => {
  console.log(state.count)  // 只依赖 count
})

state.name = 'Vue3'  // 不触发上面的 effect
state.count++        // 触发
```

MobX 的粒度也是属性级别，但实现机制不同。MobX 使用装饰器或 `makeObservable` 显式声明可观察属性，然后通过 Proxy 或 getter/setter 追踪访问。

```javascript
// MobX
class Store {
  count = 0
  name = 'MobX'

  constructor() {
    makeObservable(this, {
      count: observable,
      name: observable
    })
  }
}

const store = new Store()
autorun(() => {
  console.log(store.count)  // 只依赖 count
})
```

Solid 的粒度更细，它直接追踪到信号（Signal）级别。每个 Signal 是一个独立的响应式单元，没有对象的概念。

```javascript
// Solid
const [count, setCount] = createSignal(0)
const [name, setName] = createSignal('Solid')

createEffect(() => {
  console.log(count())  // 只依赖 count 信号
})
```

这种设计让 Solid 可以实现真正的细粒度更新，直接更新 DOM 节点，跳过虚拟 DOM diff。

## 更新机制

Vue3 采用"拉取"模式。当响应式数据变化时，系统将更新任务加入队列，在下一个微任务中统一执行。这时，渲染函数重新执行，"拉取"所有依赖数据的最新值。

```javascript
const state = reactive({ a: 1, b: 2 })

// 批量更新
state.a = 10
state.b = 20
// 只执行一次渲染
```

MobX 支持两种模式。默认情况下，MobX 也是批量更新。但通过 `runInAction` 可以精确控制更新边界。

```javascript
// MobX 的事务
runInAction(() => {
  store.a = 10
  store.b = 20
  // 这个事务内的修改会批量处理
})
```

Solid 采用"推送"模式。当 Signal 变化时，更新立即推送到依赖的 DOM 节点，没有中间的虚拟 DOM 层。

```javascript
// Solid 的直接更新
setCount(10)  // 立即更新依赖 count 的 DOM 节点
```

这种差异带来不同的性能特征。Vue3 和 MobX 的批量更新减少了更新次数，但有一个微任务的延迟。Solid 的直接更新更即时，但在大量同步修改时可能触发多次 DOM 操作。

## 依赖追踪方式

Vue3 的依赖追踪是隐式的。只要在 effect 中访问响应式数据，依赖就会自动建立。

```javascript
effect(() => {
  // 自动追踪所有访问的响应式属性
  console.log(state.user.profile.name)
})
```

这种设计简化了使用，但也带来一些陷阱。比如条件分支中的访问可能建立意外的依赖，或者解构导致追踪丢失。

```javascript
effect(() => {
  if (state.showName) {
    console.log(state.name)  // 只有 showName 为 true 时才建立依赖
  }
})

const { name } = state  // 解构后 name 不再是响应式的
```

MobX 的追踪也是隐式的，但对这些边界情况有更多的处理。MobX 的 `observer` HOC 会自动处理 React 组件的响应式逻辑。

Solid 的依赖追踪是显式的。必须调用 Signal 的 getter 函数才能访问值并建立依赖。

```javascript
const [user, setUser] = createSignal({ name: 'solid' })

createEffect(() => {
  // 必须调用 user() 才能建立依赖
  console.log(user().name)
})
```

这种设计更明确，不容易出错，但代码稍显冗长。

## 计算属性

三者都支持计算属性，但实现细节不同。

Vue3 的 computed 是惰性求值。只有在访问 `.value` 时才计算，并且会缓存结果，直到依赖变化。

```javascript
const count = ref(0)
const double = computed(() => count.value * 2)

// 访问时才计算
console.log(double.value)  // 0
count.value = 5
console.log(double.value)  // 10
```

MobX 的 `computed` 装饰器行为类似，也是惰性求值和缓存。

```javascript
class Store {
  count = 0

  constructor() {
    makeObservable(this, {
      count: observable,
      double: computed
    })
  }

  get double() {
    return this.count * 2
  }
}
```

Solid 使用 `createMemo` 创建计算值。由于 Solid 的响应式是推送模式，memo 会在依赖变化时立即重新计算。

```javascript
const [count, setCount] = createSignal(0)
const double = createMemo(() => count() * 2)
```

## 与 UI 框架的耦合

Vue3 的响应式系统是独立的包 `@vue/reactivity`，可以脱离 Vue 单独使用。但在 Vue 应用中，响应式系统与组件系统深度集成。

MobX 是完全独立的状态管理库，可以与 React、Vue、Angular 等任何框架配合使用。它通过适配器（如 `mobx-react`）与 UI 框架集成。

```javascript
// MobX + React
import { observer } from 'mobx-react-lite'

const Counter = observer(() => {
  return <div>{store.count}</div>
})
```

Solid 的响应式系统与编译器深度绑定。Solid 的编译器会分析 JSX，将响应式更新直接编译为 DOM 操作。这种耦合带来了极致的性能，但也意味着响应式系统无法单独使用。

## 性能权衡

Vue3 的权衡是在易用性和性能之间取得平衡。Proxy 的使用让 API 保持简洁，虚拟 DOM 确保了更新的可控性，调度器提供了批量更新。对于大多数应用，这是一个合理的平衡点。

MobX 的权衡是在灵活性和复杂性之间。它可以与任何框架配合，提供了丰富的配置选项，但学习曲线相对陡峭。

Solid 的权衡是在性能和生态之间。它提供了当前最快的 UI 更新性能，但生态系统相对较小，编译器的深度介入也增加了复杂度。

## 选型建议

Vue 生态开发者应该优先使用 Vue3 的响应式系统。它与 Vue 组件系统无缝集成，是官方支持和推荐的方案。

如果项目需要在多个框架间共享状态逻辑，MobX 是一个合理的选择。它的框架无关性提供了更大的灵活性。

如果项目对性能有极致要求，且团队愿意接受较小的生态和较高的学习曲线，Solid 值得考虑。它代表了响应式系统的另一种可能性。

无论选择哪种方案，理解响应式系统的工作原理都是必要的。只有理解了原理，才能在遇到问题时做出正确的判断。
