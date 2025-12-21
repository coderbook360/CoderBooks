# Slots 插槽的实现与作用域插槽

Props 传递数据，Emit 传递事件，**那如何让父组件传递整块渲染内容给子组件？** 这就是 Slots（插槽）要解决的问题。

**插槽是 Vue 组件化的核心能力之一。** 理解插槽的实现原理，能帮你更好地设计可复用组件。本章将深入分析 Slots 的实现原理，包括默认插槽、具名插槽和作用域插槽。

## 插槽的本质

首先要问一个问题：插槽是什么？

答案：**插槽是传递给子组件的渲染函数**。

```vue
<!-- 父组件使用插槽 -->
<MyComponent>
  <template #header>Header Content</template>
  <template #default>Default Content</template>
</MyComponent>
```

编译后的组件 VNode：

```javascript
h(MyComponent, null, {
  header: () => [h('span', 'Header Content')],
  default: () => [h('span', 'Default Content')]
})
```

看到了吗？插槽内容被编译为一个对象，key 是插槽名，value 是返回 VNode 数组的函数。

## initSlots 实现

组件初始化时处理插槽：

```javascript
function initSlots(instance, children) {
  if (instance.vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN) {
    // children 是插槽对象
    const slots = {}
    
    for (const key in children) {
      const value = children[key]
      // 规范化：确保每个插槽都是函数
      slots[key] = normalizeSlot(value)
    }
    
    instance.slots = slots
  } else if (children) {
    // 仅有默认内容（非对象形式）
    instance.slots = {
      default: normalizeSlot(children)
    }
  } else {
    instance.slots = {}
  }
}

function normalizeSlot(rawSlot) {
  if (isFunction(rawSlot)) {
    return rawSlot
  }
  // 非函数，包装为返回数组的函数
  return () => normalizeSlotValue(rawSlot)
}

function normalizeSlotValue(value) {
  return isArray(value) 
    ? value.map(normalizeVNode)
    : [normalizeVNode(value)]
}
```

核心逻辑：
1. 判断 children 是否是插槽对象（通过 shapeFlag）
2. 遍历所有插槽，规范化为函数形式
3. 存储到 `instance.slots`

## 子组件渲染插槽

子组件在 render 函数中使用 `renderSlot` 渲染插槽：

```javascript
// 子组件
render() {
  return h('div', [
    h('header', renderSlot(this.$slots, 'header')),
    h('main', renderSlot(this.$slots, 'default')),
    h('footer', renderSlot(this.$slots, 'footer'))
  ])
}
```

`renderSlot` 实现：

```javascript
function renderSlot(slots, name, props, fallback) {
  const slot = slots[name]
  
  if (slot) {
    // 执行插槽函数获取 VNode
    const slotContent = slot(props)
    return createVNode(
      Fragment,
      { key: props ? props.key : `_${name}` },
      slotContent
    )
  }
  
  // 没有对应插槽，使用 fallback
  return fallback ? fallback() : null
}
```

关键点：
- 插槽是函数，需要调用才能获取内容
- 返回 Fragment 包装的 VNode 数组
- 支持 fallback（默认内容）

## 默认插槽

最简单的插槽形式：

```vue
<!-- 父组件 -->
<MyButton>Click me</MyButton>

<!-- 子组件 MyButton.vue -->
<template>
  <button>
    <slot>Default Text</slot>
  </button>
</template>
```

编译后：

```javascript
// 父组件
h(MyButton, null, {
  default: () => ['Click me']
})

// 子组件 render
h('button', null, [
  renderSlot(_ctx.$slots, 'default', {}, () => ['Default Text'])
])
```

## 具名插槽

多个插槽通过名称区分：

```vue
<!-- 父组件 -->
<Layout>
  <template #header>
    <h1>Title</h1>
  </template>
  
  <template #sidebar>
    <nav>...</nav>
  </template>
  
  <template #default>
    <main>Content</main>
  </template>
</Layout>
```

编译后：

```javascript
h(Layout, null, {
  header: () => [h('h1', 'Title')],
  sidebar: () => [h('nav', '...')],
  default: () => [h('main', 'Content')]
})
```

## 作用域插槽

作用域插槽允许子组件向父组件传递数据：

```vue
<!-- 子组件 List.vue -->
<template>
  <ul>
    <li v-for="item in items" :key="item.id">
      <slot :item="item" :index="index">
        {{ item.name }}
      </slot>
    </li>
  </ul>
</template>

<!-- 父组件 -->
<List :items="items">
  <template #default="{ item, index }">
    <span>{{ index }}. {{ item.name }}</span>
  </template>
</List>
```

关键在于：插槽函数接收参数。

编译后：

```javascript
// 父组件
h(List, { items }, {
  default: ({ item, index }) => [
    h('span', `${index}. ${item.name}`)
  ]
})

// 子组件 render
h('ul', null, 
  items.map((item, index) =>
    h('li', { key: item.id }, [
      renderSlot(_ctx.$slots, 'default', { item, index }, () => [item.name])
    ])
  )
)
```

`renderSlot` 的第三个参数 `props` 就是传递给父组件的数据。

## 插槽更新

当插槽内容依赖的数据变化时，需要更新：

```javascript
function updateSlots(instance, children) {
  const { slots } = instance
  
  if (children) {
    // 更新已有插槽
    for (const key in children) {
      slots[key] = normalizeSlot(children[key])
    }
    
    // 删除不存在的插槽
    for (const key in slots) {
      if (!(key in children)) {
        delete slots[key]
      }
    }
  } else {
    // 清空所有插槽
    for (const key in slots) {
      delete slots[key]
    }
  }
}
```

由于插槽是函数，每次渲染都会重新执行，自动获取最新的内容。

## 动态插槽名

插槽名可以是动态的：

```vue
<template #[dynamicSlotName]>
  Content
</template>
```

编译时会保留动态表达式：

```javascript
h(Component, null, {
  [_ctx.dynamicSlotName]: () => ['Content']
})
```

## $slots 类型

`$slots` 的类型定义：

```typescript
interface Slots {
  [name: string]: (props: any) => VNode[]
}

// 访问插槽
instance.slots.default  // 默认插槽函数
instance.slots.header   // header 插槽函数
```

## 编译优化

编译器会对插槽进行优化：

```vue
<!-- 静态插槽内容 -->
<template #header>
  <h1>Static Title</h1>
</template>
```

编译器检测到内容是静态的，可以进行提升：

```javascript
const _hoisted_1 = h('h1', 'Static Title')

// 插槽函数返回提升的 VNode
header: () => [_hoisted_1]
```

但是，作用域插槽通常不能提升，因为依赖动态的 props。

## 与 Vue 2 的差异

Vue 2 中有 `slot` 和 `slot-scope` 语法，Vue 3 统一使用 `v-slot`（`#`）语法：

```vue
<!-- Vue 2 -->
<template slot="header" slot-scope="{ data }">

<!-- Vue 3 -->
<template #header="{ data }">
```

底层实现也有变化：
- Vue 2：插槽在父组件编译时渲染
- Vue 3：插槽作为函数传递，在子组件渲染时调用

Vue 3 的方式更符合"延迟渲染"的思想，性能更好。

## 本章小结

本章分析了 Slots 的实现机制：

- **本质**：插槽是传递给子组件的渲染函数
- **initSlots**：规范化插槽对象，存储到 instance.slots
- **renderSlot**：执行插槽函数，获取 VNode 内容
- **默认插槽**：`default` 键
- **具名插槽**：通过名称区分多个插槽
- **作用域插槽**：插槽函数接收子组件传递的 props
- **更新机制**：插槽是函数，每次渲染重新执行

插槽是组件复用的重要机制。通过插槽，子组件提供"结构"，父组件提供"内容"，实现高度可定制的组件设计。

下一章，我们将分析组件的错误处理机制——当组件渲染或生命周期中抛出错误时会发生什么。
