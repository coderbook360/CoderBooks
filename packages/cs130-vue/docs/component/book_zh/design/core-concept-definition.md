# 核心概念：组件定义

在 Vue 的世界中，组件定义（Component Definition）是一切的起点。它描述了组件"是什么"——接收什么输入、包含什么状态、如何渲染输出。理解组件定义的本质，是深入源码的第一步。

## 组件定义的多种形态

Vue 对组件定义非常宽容，你可以用多种方式来定义一个组件。最常见的是对象形式：

```javascript
// 对象形式的组件定义
const MyComponent = {
  props: ['title'],
  data() {
    return { count: 0 }
  },
  methods: {
    increment() { this.count++ }
  },
  template: '<button @click="increment">{{ title }}: {{ count }}</button>'
}
```

这是 Options API 风格的定义，所有选项都是组件描述的一部分。在运行时，Vue 会读取这些选项，创建组件实例时应用它们。

使用 `<script setup>` 时，组件定义看起来很不一样：

```vue
<script setup>
import { ref } from 'vue'

const props = defineProps(['title'])
const count = ref(0)
function increment() { count.value++ }
</script>

<template>
  <button @click="increment">{{ title }}: {{ count }}</button>
</template>
```

虽然写法不同，但编译后的结果仍然是一个组件定义对象。编译器会将 `<script setup>` 转换为带有 `setup` 函数的组件定义：

```javascript
// 编译后的组件定义（简化）
export default {
  props: ['title'],
  setup(props) {
    const count = ref(0)
    function increment() { count.value++ }
    return { count, increment }
  }
}
```

函数式组件是另一种形式。在 Vue 3 中，函数式组件可以直接用一个函数来定义：

```javascript
// 函数式组件
function FunctionalComponent(props) {
  return h('div', `Hello, ${props.name}`)
}
FunctionalComponent.props = ['name']
```

这个函数接收 props，返回 VNode。它没有内部状态，没有生命周期，只是一个从 props 到视图的纯映射。对于这类简单场景，函数式组件更加轻量。

## Component 类型的统一

尽管有多种定义形式，Vue 内部将它们统一处理。在类型系统中，组件定义的核心类型是 `Component`：

```typescript
// 简化的类型定义
type Component = ComponentOptions | FunctionalComponent

interface ComponentOptions {
  name?: string
  props?: PropsOptions
  emits?: EmitsOptions
  setup?: SetupFunction
  data?: DataOption
  computed?: Record<string, ComputedGetter>
  methods?: Record<string, Function>
  render?: RenderFunction
  template?: string
  // ... 更多选项
}

type FunctionalComponent<P = {}> = (
  props: P,
  ctx: { attrs: Data; slots: Slots; emit: EmitFn }
) => VNodeChild
```

这段类型定义揭示了组件定义的本质。它要么是一个包含各种选项的对象（`ComponentOptions`），要么是一个返回 VNode 的函数（`FunctionalComponent`）。渲染器在处理组件 VNode 时，会根据组件定义的形态采取不同的处理策略。

## defineComponent 的作用

你可能注意到，Vue 提供了 `defineComponent` 函数来定义组件。它的存在主要是为了 TypeScript：

```typescript
import { defineComponent, ref } from 'vue'

export default defineComponent({
  props: {
    title: { type: String, required: true }
  },
  setup(props) {
    // props.title 被正确推导为 string
    const count = ref(0)
    return { count }
  }
})
```

`defineComponent` 本身几乎不做任何事情——它只是返回传入的对象。但它的类型签名让 TypeScript 能够正确推导 `props`、`emits` 和 `setup` 的类型。如果不使用 TypeScript，你可以不用 `defineComponent`，直接导出一个普通对象。

让我们看看 `defineComponent` 的实现有多简单：

```typescript
// defineComponent 的核心实现
export function defineComponent(options) {
  return isFunction(options) ? { setup: options } : options
}
```

这段代码展示了 `defineComponent` 的极简实现。如果传入的是函数，就将其包装为带有 `setup` 选项的对象；否则直接返回原对象。真正的复杂性在类型定义中，而不在运行时逻辑中。

这是 Vue 设计哲学的一个体现：运行时保持简单，将复杂性转移到类型系统或编译时处理。

## 组件选项的规范化

当一个组件被使用时，Vue 需要将各种形式的选项规范化为统一的内部格式。这个过程发生在组件实例创建之前。

以 `props` 选项为例，开发者可以用多种方式声明：

```javascript
// 数组形式
props: ['title', 'content']

// 对象形式，简单类型
props: {
  title: String,
  count: Number
}

// 对象形式，完整配置
props: {
  title: {
    type: String,
    required: true,
    default: ''
  },
  items: {
    type: Array,
    default: () => []
  }
}
```

这三种写法在开发者看来差异很大，但 Vue 内部会将它们全部规范化为统一的格式：

```javascript
// 规范化后的内部格式
normalizedProps = {
  title: {
    type: String,
    required: true,
    default: ''
  },
  items: {
    type: Array,
    required: false,
    default: () => []
  }
}
```

这种规范化让后续的处理逻辑变得简单——不需要考虑各种边缘情况，只需要处理统一的格式。`normalizePropsOptions` 函数负责这个工作，我们会在源码解析部分详细分析。

## 组件的注册与解析

组件定义需要注册后才能在模板中使用。Vue 提供了两种注册方式：全局注册和局部注册。

全局注册通过 `app.component` 方法完成，注册后的组件可以在应用的任何地方使用：

```javascript
const app = createApp(App)
app.component('MyButton', {
  template: '<button class="my-button"><slot /></button>'
})
app.mount('#app')
```

全局注册的组件存储在应用上下文（AppContext）中。当模板编译器遇到一个组件标签时，它会生成一个 `resolveComponent` 调用，在运行时从上下文中查找对应的组件定义。

局部注册则是在组件定义中声明依赖的其他组件：

```javascript
import ChildComponent from './ChildComponent.vue'

export default {
  components: {
    ChildComponent
  },
  template: '<ChildComponent />'
}
```

局部注册的组件只在当前组件的模板中可用。这种方式的好处是依赖关系明确，有利于 tree-shaking——未使用的组件不会被打包。

在 `<script setup>` 中，导入的组件会自动注册，无需显式声明：

```vue
<script setup>
import ChildComponent from './ChildComponent.vue'
// 自动注册，可以直接在模板中使用
</script>

<template>
  <ChildComponent />
</template>
```

编译器会分析导入的变量，识别出哪些是组件，自动生成注册代码。这让代码更加简洁。

## 异步组件定义

对于大型应用，将所有组件打包在一起会导致初始加载过大。Vue 支持异步组件，让组件定义可以延迟加载：

```javascript
import { defineAsyncComponent } from 'vue'

const AsyncComponent = defineAsyncComponent(() =>
  import('./HeavyComponent.vue')
)
```

`defineAsyncComponent` 接收一个返回 Promise 的工厂函数。当组件首次被渲染时，才会调用工厂函数加载真正的组件定义。在加载期间，可以显示一个占位内容。

这种机制的实现涉及几个关键点。首先，`defineAsyncComponent` 返回的是一个包装组件，它内部管理加载状态。其次，当异步组件加载完成后，需要重新渲染以显示真正的组件。最后，需要处理加载失败、超时等边缘情况。

```javascript
const AsyncComponent = defineAsyncComponent({
  loader: () => import('./HeavyComponent.vue'),
  loadingComponent: LoadingSpinner,
  errorComponent: ErrorDisplay,
  delay: 200,      // 延迟 200ms 后才显示 loading
  timeout: 3000    // 3s 后超时
})
```

这个完整配置展示了异步组件的各种选项。`delay` 避免了快速加载时的闪烁，`timeout` 防止无限等待，`loadingComponent` 和 `errorComponent` 提供了优雅的用户体验。

## 组件定义与 VNode 的关系

组件定义本身只是一个描述，它需要被"实例化"才能工作。这个过程始于创建组件 VNode。

当你在模板中使用 `<MyComponent :title="hello" />`，编译后会生成类似这样的渲染代码：

```javascript
// 模板编译结果（简化）
function render() {
  return h(MyComponent, { title: 'hello' })
}
```

`h` 函数（或 `createVNode`）创建一个 VNode 对象，其中 `type` 字段指向组件定义：

```javascript
const vnode = {
  type: MyComponent,  // 组件定义对象
  props: { title: 'hello' },
  // ... 其他 VNode 属性
}
```

渲染器在处理这个 VNode 时，会识别出它是一个组件（通过检查 `type` 的类型），然后执行组件挂载流程：创建组件实例、初始化 props/slots、执行 setup、渲染子树。

组件定义（`Component`）、组件 VNode（`VNode`）、组件实例（`ComponentInstance`）是三个不同但密切相关的概念。组件定义是蓝图，VNode 是使用蓝图的请求，实例是根据蓝图创建的实体。在后续章节中，我们会详细探讨组件实例的结构。

## 小结

组件定义是 Vue 组件系统的基础概念。它可以是对象形式（包含各种选项）或函数形式（函数式组件），Vue 会将它们统一处理。`defineComponent` 主要服务于 TypeScript 类型推导，运行时几乎无开销。组件选项在使用前会被规范化为统一格式，方便后续处理。通过注册机制，组件定义可以在模板中被解析和使用。

在下一章中，我们将深入组件实例，理解当组件定义被实例化后，会产生什么样的运行时结构。
