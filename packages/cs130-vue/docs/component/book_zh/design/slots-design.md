# Slots 插槽设计

Props 传递数据，Emits 传递事件，但有时候我们需要传递的不是数据，而是内容——一段 HTML、一个组件、甚至是一个模板片段。Slots（插槽）就是为这个需求设计的。它是 Vue 组件组合的核心机制之一，让组件变得真正灵活和可复用。

## 从固定到灵活

假设你要设计一个卡片组件。最简单的方式是把所有内容都写死：

```html
<template>
  <div class="card">
    <div class="card-header">标题</div>
    <div class="card-body">内容</div>
    <div class="card-footer">页脚</div>
  </div>
</template>
```

这个组件毫无复用价值——每次使用都要修改源码。稍微进步一点，用 props 传递内容：

```html
<script>
export default {
  props: ['title', 'content', 'footer']
}
</script>

<template>
  <div class="card">
    <div class="card-header">{{ title }}</div>
    <div class="card-body">{{ content }}</div>
    <div class="card-footer">{{ footer }}</div>
  </div>
</template>
```

这样可以传递文本了。但如果想在 body 中放一个表格、一个表单、或者一个自定义组件呢？Props 只能传递数据，无法传递模板结构。

Slots 解决了这个问题：

```html
<!-- Card.vue -->
<template>
  <div class="card">
    <div class="card-header">
      <slot name="header">默认标题</slot>
    </div>
    <div class="card-body">
      <slot>默认内容</slot>
    </div>
    <div class="card-footer">
      <slot name="footer">默认页脚</slot>
    </div>
  </div>
</template>

<!-- 使用时 -->
<Card>
  <template #header>
    <h2>自定义标题</h2>
  </template>
  
  <p>这里可以放任意内容</p>
  <MyTable :data="tableData" />
  
  <template #footer>
    <button @click="submit">提交</button>
    <button @click="cancel">取消</button>
  </template>
</Card>
```

这就是插槽的威力——父组件可以向子组件"注入"任意内容，子组件决定这些内容放在哪里。组件的结构（布局、样式）由子组件定义，具体内容由父组件填充。

## 默认插槽与具名插槽

Vue 的插槽分为默认插槽（default slot）和具名插槽（named slot）。

默认插槽没有名字，用于接收主要内容。子组件中的 `<slot>` 标签会被父组件传入的默认内容替换：

```html
<!-- Button.vue -->
<template>
  <button class="btn">
    <slot>点击</slot>  <!-- 默认插槽 -->
  </button>
</template>

<!-- 使用 -->
<Button>确认提交</Button>
<!-- 渲染结果: <button class="btn">确认提交</button> -->

<Button />
<!-- 渲染结果: <button class="btn">点击</button> -->
```

`<slot>` 标签内的内容是默认值。如果父组件没有传入内容，就显示默认值；如果传入了内容，默认值被替换。

具名插槽通过 `name` 属性区分多个插槽位置。父组件使用 `v-slot:name`（简写 `#name`）指定内容对应哪个插槽：

```html
<!-- Layout.vue -->
<template>
  <div class="layout">
    <header>
      <slot name="header"></slot>
    </header>
    <main>
      <slot></slot>  <!-- 默认插槽 -->
    </main>
    <footer>
      <slot name="footer"></slot>
    </footer>
  </div>
</template>

<!-- 使用 -->
<Layout>
  <template #header>
    <nav>导航栏</nav>
  </template>
  
  <article>主内容</article>
  
  <template #footer>
    <p>版权信息</p>
  </template>
</Layout>
```

没有包裹在 `<template #xxx>` 中的内容会进入默认插槽。`<template>` 本身不会被渲染到 DOM 中，它只是一个分组容器。

## 作用域插槽

普通插槽只能访问父组件的数据，无法访问子组件的数据。但有时候，我们希望父组件在填充插槽时，能够使用子组件提供的数据。这就是作用域插槽（Scoped Slots）的用途。

一个典型的场景是列表渲染。子组件负责获取和管理数据，但每一项的渲染方式由父组件决定：

```html
<!-- DataList.vue -->
<script setup>
import { ref, onMounted } from 'vue'

const items = ref([])
const loading = ref(true)

onMounted(async () => {
  items.value = await fetchData()
  loading.value = false
})
</script>

<template>
  <div class="data-list">
    <div v-if="loading">加载中...</div>
    <ul v-else>
      <li v-for="item in items" :key="item.id">
        <!-- 将 item 暴露给父组件 -->
        <slot :item="item" :index="$index"></slot>
      </li>
    </ul>
  </div>
</template>

<!-- 使用 -->
<DataList>
  <template #default="{ item, index }">
    <span>{{ index + 1 }}. {{ item.name }}</span>
    <button @click="remove(item.id)">删除</button>
  </template>
</DataList>
```

子组件通过 `<slot :item="item">` 将数据"暴露"给父组件。父组件通过 `#default="{ item }"` 接收这些数据。这让父组件可以访问子组件的上下文，同时保持渲染逻辑在父组件中。

作用域插槽的语法可能看起来复杂，但它的原理很简单：子组件调用父组件传入的函数，并将数据作为参数传递。

```javascript
// 作用域插槽的本质
// 子组件
props.slots.default({ item, index })

// 父组件传入的是一个函数
slots: {
  default: (slotProps) => h('span', slotProps.item.name)
}
```

理解这个本质有助于理解作用域插槽的各种用法。

## 插槽的内部实现

在运行时，插槽被表示为一个对象，其中每个属性是一个函数：

```javascript
// 组件实例上的 slots 对象
instance.slots = {
  default: (props) => [VNode, VNode, ...],
  header: (props) => [VNode],
  footer: (props) => [VNode]
}
```

每个插槽是一个函数，接收作用域数据（如果有的话），返回 VNode 数组。子组件通过调用这些函数来渲染插槽内容。

模板编译器会将插槽内容编译成这种函数形式。当你写：

```html
<MyComponent>
  <template #header="{ title }">
    <h1>{{ title }}</h1>
  </template>
</MyComponent>
```

编译后会变成类似：

```javascript
h(MyComponent, null, {
  header: (slotProps) => h('h1', null, slotProps.title)
})
```

子组件在渲染时，遇到 `<slot name="header" :title="title">`，会调用 `slots.header({ title })`，得到 VNode 并渲染。

## 动态插槽名

Vue 支持动态插槽名，这在构建高度动态的组件时很有用：

```html
<template>
  <MyComponent>
    <template #[dynamicSlotName]>
      动态插槽内容
    </template>
  </MyComponent>
</template>

<script setup>
import { ref } from 'vue'
const dynamicSlotName = ref('header')
// 可以动态改变 dynamicSlotName 来改变内容插入的位置
</script>
```

`#[dynamicSlotName]` 中的方括号表示这是一个动态表达式。这在需要根据运行时条件决定插槽位置的场景中很有用。

## 插槽的检测与条件渲染

子组件可以检测父组件是否传入了某个插槽，据此决定是否渲染某些结构：

```html
<script setup>
import { useSlots } from 'vue'
const slots = useSlots()
</script>

<template>
  <div class="card">
    <!-- 只有传入了 header 插槽才渲染头部 -->
    <div v-if="slots.header" class="card-header">
      <slot name="header"></slot>
    </div>
    
    <div class="card-body">
      <slot></slot>
    </div>
    
    <div v-if="slots.footer" class="card-footer">
      <slot name="footer"></slot>
    </div>
  </div>
</template>
```

`useSlots()` 返回插槽对象，可以用来检查某个插槽是否存在。在模板中也可以用 `$slots.header` 进行检查。这让组件可以根据是否有插槽内容来调整自己的渲染结构。

## 插槽与组件复用

插槽是实现"无渲染组件"（Renderless Components）模式的基础。无渲染组件只提供逻辑和状态，不包含任何视觉表现，完全由父组件通过插槽来决定渲染什么：

```html
<!-- MouseTracker.vue - 无渲染组件 -->
<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const x = ref(0)
const y = ref(0)

function updatePosition(e) {
  x.value = e.clientX
  y.value = e.clientY
}

onMounted(() => window.addEventListener('mousemove', updatePosition))
onUnmounted(() => window.removeEventListener('mousemove', updatePosition))
</script>

<template>
  <slot :x="x" :y="y"></slot>
</template>

<!-- 使用 -->
<MouseTracker v-slot="{ x, y }">
  <p>鼠标位置: {{ x }}, {{ y }}</p>
</MouseTracker>

<!-- 或者用不同的视觉表现 -->
<MouseTracker v-slot="{ x, y }">
  <div 
    class="cursor-follower" 
    :style="{ left: x + 'px', top: y + 'px' }"
  ></div>
</MouseTracker>
```

同一个逻辑组件，可以有完全不同的视觉表现。这种模式在 Vue 2 时代很流行，在 Vue 3 中，组合式函数（Composables）通常是更好的选择，因为它们更轻量。但无渲染组件仍然有其适用场景，特别是需要提供插槽上下文的复杂场景。

## 插槽的性能考量

插槽内容在父组件中定义，但在子组件中渲染。这意味着插槽内容的更新可能会触发子组件的重新渲染。

Vue 的编译器会对插槽进行优化。如果插槽内容是静态的（不依赖于父组件的响应式状态），编译器会将其标记为稳定，避免不必要的重新渲染。

```html
<!-- 静态插槽内容，可以被优化 -->
<MyComponent>
  <template #header>
    <h1>固定标题</h1>
  </template>
</MyComponent>

<!-- 动态插槽内容，每次父组件更新都会重新创建 -->
<MyComponent>
  <template #header>
    <h1>{{ dynamicTitle }}</h1>
  </template>
</MyComponent>
```

对于作用域插槽，由于它们是函数，每次渲染都会被调用。如果插槽函数内部有复杂的计算，可能会影响性能。在这种情况下，考虑使用 computed 或 memo 优化。

## 设计指南

使用插槽时，有一些设计原则值得遵循。

**明确插槽的用途**。每个具名插槽应该有明确的职责。`header`、`footer`、`sidebar` 这样的名字比 `slot1`、`slot2` 好得多。在组件文档中说明每个插槽的用途和预期内容。

**提供合理的默认内容**。当插槽可以有默认行为时，在 `<slot>` 标签内提供默认内容。这让组件在最简使用时就能正常工作。

**谨慎使用作用域插槽**。作用域插槽功能强大但增加了复杂性。如果只是传递简单数据，考虑用 props；如果是共享逻辑，考虑用组合式函数。

**保持插槽数量适中**。如果一个组件有超过 5 个插槽，可能意味着它承担了太多职责，考虑拆分成更小的组件。

## 小结

插槽是 Vue 组件组合的核心机制，让父组件可以向子组件注入内容。默认插槽处理主要内容，具名插槽支持多个插入点，作用域插槽允许父组件访问子组件的数据。

理解插槽的内部实现——本质上是父组件传递给子组件的渲染函数——有助于理解其工作原理和性能特征。插槽使得组件的结构与内容分离，大大增强了组件的灵活性和复用性。

在下一章中，我们将探讨 v-model 的设计思想——它基于 props 和 emits 实现，是 Vue 中最常用的双向绑定机制。
