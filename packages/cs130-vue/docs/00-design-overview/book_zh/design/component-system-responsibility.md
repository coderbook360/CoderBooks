# 组件系统的核心职责

组件是 Vue 应用的基本构建单元。组件系统负责组件的创建、更新和销毁，管理组件树的生命周期。

## 组件抽象的本质

从最本质的层面看，组件是一个函数：输入 props，输出 VNode。

```javascript
function MyComponent(props) {
  return h('div', null, props.message)
}
```

但实际的组件比纯函数复杂得多。它需要管理自己的状态、处理生命周期、响应用户交互。Vue 的组件系统就是处理这些复杂性的基础设施。

## 组件实例

每个挂载的组件都有一个实例对象，存储组件运行时需要的所有信息：

```javascript
interface ComponentInstance {
  // 组件类型
  type: Component

  // 父组件实例
  parent: ComponentInstance | null

  // props 和 attrs
  props: object
  attrs: object

  // 状态
  setupState: object
  data: object

  // 插槽
  slots: object

  // 渲染相关
  render: Function
  subTree: VNode
  next: VNode | null

  // 生命周期钩子
  mounted: Function[]
  updated: Function[]
  unmounted: Function[]

  // 其他
  refs: object
  emit: Function
  exposed: object
}
```

实例是组件的"记忆"。它记录了组件的当前状态、依赖关系、生命周期钩子等。组件更新时，Vue 比较新旧状态来决定如何最小化更新。

## 组件生命周期

组件从创建到销毁，经历一系列阶段：

创建阶段：实例化、初始化 props、调用 setup、建立响应式关联。

挂载阶段：执行 render 生成 VNode、创建 DOM 元素、插入文档、调用 mounted 钩子。

更新阶段：响应式数据变化、重新执行 render、diff 新旧 VNode、更新 DOM、调用 updated 钩子。

卸载阶段：从 DOM 移除、清理副作用、调用 unmounted 钩子。

每个阶段都有对应的钩子，让开发者可以在适当时机执行代码。

```javascript
import { onMounted, onUpdated, onUnmounted } from 'vue'

export default {
  setup() {
    onMounted(() => {
      console.log('组件已挂载')
    })

    onUpdated(() => {
      console.log('组件已更新')
    })

    onUnmounted(() => {
      console.log('组件已卸载')
    })
  }
}
```

## Props 处理

Props 是父组件向子组件传递数据的机制。组件系统负责：

声明验证：检查传入的 props 是否符合声明的类型和约束。

响应式处理：将 props 变成只读的响应式对象，子组件可以追踪依赖。

更新传递：父组件更新时，新的 props 值传递给子组件。

```javascript
const props = defineProps({
  title: {
    type: String,
    required: true
  },
  count: {
    type: Number,
    default: 0,
    validator: (value) => value >= 0
  }
})

// props 是只读的响应式对象
console.log(props.title)  // 可以追踪依赖
props.title = 'new'       // 警告：props 是只读的
```

## 插槽机制

插槽让父组件可以向子组件传递内容，实现组件的灵活组合。

```vue
<!-- 父组件 -->
<MyLayout>
  <template #header>
    <h1>页面标题</h1>
  </template>
  <template #default>
    <p>主要内容</p>
  </template>
</MyLayout>

<!-- 子组件 MyLayout -->
<template>
  <header><slot name="header" /></header>
  <main><slot /></main>
</template>
```

作用域插槽允许子组件向插槽内容传递数据：

```vue
<!-- 子组件 -->
<slot :item="item" :index="index" />

<!-- 父组件 -->
<MyList>
  <template #default="{ item, index }">
    {{ index }}: {{ item.name }}
  </template>
</MyList>
```

## 组件通信

组件系统支持多种通信方式：

Props/Emit：父子组件间的标准通信方式。

Provide/Inject：跨层级传递数据，避免逐层传递 props。

事件总线：通过共享的事件中心通信（Vue3 推荐使用外部库）。

状态管理：使用 Pinia 等状态管理库共享状态。

每种方式适用于不同场景。Props/Emit 最直接明确，适合父子通信；Provide/Inject 适合跨层级的配置传递；状态管理适合需要多个组件共享的业务状态。

组件系统通过这些机制，让开发者可以将应用拆分为独立、可复用的模块，同时保持模块间的有序协作。
