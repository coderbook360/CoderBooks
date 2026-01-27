# 函数式组件设计

在 Vue 的组件体系中，大多数组件都有自己的状态和生命周期。但有一类组件比较特殊：它们没有状态，不需要生命周期钩子，只是纯粹地根据输入的 props 渲染输出。这就是函数式组件。

## 什么是函数式组件

函数式组件是无状态、无实例的组件。它只接收 props，返回 VNode，没有响应式数据，没有生命周期，没有 this 上下文。

在 Vue 3 中，函数式组件就是一个普通函数：

```javascript
function Heading(props) {
  return h('h' + props.level, props.title)
}
```

这个组件根据 `level` prop 渲染不同级别的标题。没有 setup，没有 template，就是一个接收 props 返回 VNode 的函数。

## 与有状态组件的对比

有状态组件有完整的组件实例：

```javascript
// 有状态组件
const Counter = {
  setup() {
    const count = ref(0)
    const increment = () => count.value++
    return { count, increment }
  },
  template: `<button @click="increment">{{ count }}</button>`
}
```

每个 Counter 实例有自己的 `count` 状态，有自己的生命周期。Vue 需要创建组件实例，设置响应式，跟踪依赖。

函数式组件没有这些：

```javascript
// 函数式组件
function DisplayValue(props) {
  return h('span', props.value)
}
```

DisplayValue 没有实例，没有状态。每次渲染时，Vue 只是调用这个函数，传入 props，拿到 VNode。

## 为什么选择函数式组件

**性能优势**。没有组件实例意味着更少的内存开销，更快的创建速度。在渲染大量相似元素时（如列表项），函数式组件可以减少不必要的开销。

**概念简单**。函数式组件是纯函数——相同的输入产生相同的输出。没有副作用，没有隐藏的状态，容易理解和测试。

**适合简单场景**。很多组件本质上就是"数据 → UI"的映射。如果不需要状态和生命周期，函数式组件是更直接的选择。

但也有限制。函数式组件没有 refs，没有生命周期钩子，没有 this。如果需要这些特性，就得使用有状态组件。

## Vue 3 中的变化

在 Vue 2 中，函数式组件需要显式声明：

```javascript
// Vue 2 函数式组件
export default {
  functional: true,
  props: ['level', 'title'],
  render(h, context) {
    return h('h' + context.props.level, context.props.title)
  }
}
```

Vue 3 简化了这一点。任何接收 props 参数并返回 VNode 的函数都是函数式组件：

```javascript
// Vue 3 函数式组件
function Heading(props) {
  return h('h' + props.level, props.title)
}

// 可选：声明 props 类型
Heading.props = ['level', 'title']
```

这种简化让函数式组件更加自然，和普通函数没有本质区别。

## 性能考量的变化

在 Vue 2 中，函数式组件的性能优势很显著。有状态组件的初始化开销较大，函数式组件绕过了这些。

Vue 3 对有状态组件做了大量优化，两者的性能差距缩小了。有状态组件的初始化变得非常快，函数式组件的性能优势不再那么明显。

这意味着选择函数式组件应该基于语义——这个组件是否真的不需要状态——而不仅仅是为了性能。

## 典型使用场景

**简单展示组件**。只是格式化和显示数据：

```javascript
function FormatDate(props) {
  const formatted = new Date(props.date).toLocaleDateString()
  return h('time', { datetime: props.date }, formatted)
}
```

**包装组件**。添加样式或结构，但不需要状态：

```javascript
function Card(props, { slots }) {
  return h('div', { class: 'card' }, [
    slots.default?.()
  ])
}
```

**高阶组件的简化形式**。返回另一个组件的变体：

```javascript
function withLoading(WrappedComponent) {
  return function LoadingWrapper(props) {
    if (props.loading) {
      return h('div', { class: 'loading' }, 'Loading...')
    }
    return h(WrappedComponent, props)
  }
}
```

## 处理插槽

函数式组件的第二个参数提供了 context，包括 slots：

```javascript
function Container(props, { slots, attrs, emit }) {
  return h('div', { class: 'container', ...attrs }, [
    slots.header?.(),
    slots.default?.(),
    slots.footer?.()
  ])
}
```

`slots` 对象包含所有传入的插槽。通过 `slots.slotName?.()` 调用来渲染插槽内容。

## 事件处理

函数式组件也可以触发事件，通过 context 中的 emit：

```javascript
function Button(props, { emit }) {
  return h('button', {
    onClick: () => emit('click', props.value)
  }, props.label)
}
```

虽然函数式组件没有实例，但仍然可以通过 emit 与父组件通信。

## TypeScript 支持

函数式组件可以使用 TypeScript 获得类型检查：

```typescript
import { FunctionalComponent, h } from 'vue'

interface HeadingProps {
  level: 1 | 2 | 3 | 4 | 5 | 6
  title: string
}

const Heading: FunctionalComponent<HeadingProps> = (props) => {
  return h(`h${props.level}`, props.title)
}

Heading.props = ['level', 'title']
```

`FunctionalComponent` 类型确保 props 的类型正确，并提供正确的函数签名。

## 与 Composition API 的关系

Composition API 让有状态组件的逻辑更加灵活，似乎削弱了函数式组件的吸引力。但两者解决的是不同问题。

Composition API 解决的是**逻辑组织**问题——如何把相关的逻辑放在一起，如何复用逻辑。它处理的是有状态的场景。

函数式组件解决的是**简单性**问题——当组件真的不需要状态时，为什么要引入状态的复杂性？

它们可以配合使用。函数式组件可以调用 composables 来获取数据（虽然这时候可能应该考虑是否真的需要函数式组件）：

```javascript
import { useUser } from './composables'

// 这其实不太合适，因为 useUser 可能有响应式状态
// 如果需要响应式，应该用有状态组件
function UserName(props) {
  const { user } = useUser(props.id)
  return h('span', user.value?.name)
}
```

如果需要响应式数据，有状态组件是更好的选择。函数式组件应该保持纯粹——只基于 props 渲染。

## 何时不该使用函数式组件

**需要状态时**。如果组件需要维护内部状态，有状态组件是唯一选择。

**需要生命周期钩子时**。需要在挂载时请求数据、卸载时清理资源？需要有状态组件。

**需要 ref 时**。需要直接访问 DOM 或子组件？函数式组件做不到。

**性能差异可忽略时**。如果不是渲染大量元素，性能差异几乎察觉不到。此时选择更熟悉、更一致的有状态组件可能更好。

## 实现原理

在 Vue 内部，渲染函数式组件比有状态组件简单得多：

```javascript
function renderFunctionalComponent(vnode) {
  const { type: Component, props, children } = vnode
  const slots = children ? { default: () => children } : {}
  const context = { slots, attrs: props, emit: vnode.emit }
  
  // 直接调用函数，获取 VNode
  return Component(props, context)
}
```

不需要创建实例、不需要设置响应式、不需要调用生命周期钩子。就是一个函数调用。

这种简单性正是函数式组件的本质——它把组件还原为最本质的形式：一个把 props 转换为 UI 的函数。

## 小结

函数式组件是 Vue 组件体系中的轻量级选项。它没有状态、没有实例，只是 props 到 VNode 的纯映射。

Vue 3 简化了函数式组件的定义，让它们更加自然。同时，有状态组件的性能优化让性能不再是选择函数式组件的主要理由。选择应该基于语义——这个组件是否真的不需要状态。

函数式组件适合简单展示、包装组件等场景。当需要状态、生命周期或 refs 时，有状态组件是更好的选择。

在下一章中，我们将探讨组件与渲染器的关系——组件如何被渲染到页面上，渲染器如何处理组件的更新。
