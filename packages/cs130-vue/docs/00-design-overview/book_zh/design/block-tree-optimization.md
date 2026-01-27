# Block Tree 优化设计

Block Tree 是 Vue3 编译时优化的核心机制之一，它从根本上改变了虚拟 DOM 的 Diff 策略。传统的虚拟 DOM Diff 需要递归遍历整棵树，而 Block Tree 让运行时能够直接定位到动态节点，跳过静态子树的比较。

## 传统虚拟 DOM 的效率问题

在传统的虚拟 DOM 框架中，每次更新都需要重新生成完整的虚拟 DOM 树，然后与旧树进行递归比较。即使只有一个节点发生变化，Diff 过程仍然需要遍历所有节点。

```javascript
// 一个典型的模板
<template>
  <div class="container">
    <header>
      <h1>Static Title</h1>
      <nav>
        <a href="/">Home</a>
        <a href="/about">About</a>
      </nav>
    </header>
    <main>
      <p>{{ dynamicContent }}</p>
    </main>
    <footer>
      <p>Copyright 2024</p>
    </footer>
  </div>
</template>
```

在这个模板中，绝大部分内容是静态的，只有 `dynamicContent` 是动态的。但传统 Diff 会遍历所有节点，包括那些永远不会变化的静态节点。

我们可以做一个简单的计算：假设模板有 100 个节点，其中只有 5 个是动态的。传统方案每次更新需要比较 100 个节点，而理想情况下只需要处理 5 个动态节点。Block Tree 正是为了实现这个优化而设计的。

## Block 的概念

Block 是 Vue3 引入的核心抽象。一个 Block 本质上是一个特殊的 VNode，它额外维护了一个 `dynamicChildren` 数组，收集其子树中所有的动态节点。

```javascript
// Block VNode 的结构
const block = {
  type: 'div',
  props: { class: 'container' },
  children: [...],  // 完整的子节点树
  dynamicChildren: [
    // 扁平化的动态节点列表
    { type: 'p', children: ctx.dynamicContent, patchFlag: 1 }
  ]
}
```

关键洞察在于：更新时只需要遍历 `dynamicChildren`，而不是递归遍历 `children`。这将 Diff 的复杂度从与节点总数相关，变成只与动态节点数量相关。

## Block Tree 的构建过程

Block Tree 的构建发生在编译阶段，编译器会分析模板，标记出动态节点，并生成收集动态节点的渲染函数。

```javascript
// 编译前的模板
<div>
  <span>Static</span>
  <span>{{ dynamic }}</span>
</div>

// 编译后的渲染函数
function render(ctx) {
  return (openBlock(), createBlock('div', null, [
    createVNode('span', null, 'Static'),
    createVNode('span', null, ctx.dynamic, 1 /* TEXT */)
  ]))
}
```

`openBlock()` 和 `createBlock()` 是 Block 机制的核心。`openBlock()` 初始化一个动态节点收集栈，后续创建的带有 `patchFlag` 的 VNode 会被自动收集。`createBlock()` 结束收集，生成 Block VNode。

```javascript
// Block 相关的核心实现
let currentBlock = null

function openBlock() {
  currentBlock = []
}

function createBlock(type, props, children) {
  const block = createVNode(type, props, children)
  block.dynamicChildren = currentBlock
  currentBlock = null
  return block
}

function createVNode(type, props, children, patchFlag) {
  const vnode = {
    type,
    props,
    children,
    patchFlag
  }

  // 带有 patchFlag 的节点被收集到当前 Block
  if (patchFlag && currentBlock) {
    currentBlock.push(vnode)
  }

  return vnode
}
```

## Block 的层级结构

并非所有节点都在同一个 Block 中。当遇到结构可能变化的节点时，需要创建新的 Block。这些节点被称为 Block 边界：

1. **根节点**：组件的根节点是一个 Block
2. **v-if/v-else**：条件渲染会改变结构，每个分支是独立的 Block
3. **v-for**：列表渲染的每个项是一个 Block
4. **Fragment**：多根节点的组件根是 Fragment Block

```javascript
// v-if 创建新的 Block
<div>
  <span v-if="show">{{ a }}</span>
  <span v-else>{{ b }}</span>
</div>

// 编译后
function render(ctx) {
  return (openBlock(), createBlock('div', null, [
    ctx.show
      ? (openBlock(), createBlock('span', { key: 0 }, ctx.a, 1))
      : (openBlock(), createBlock('span', { key: 1 }, ctx.b, 1))
  ]))
}
```

Block 的嵌套形成了 Block Tree。每个 Block 只负责追踪自己直接拥有的动态节点，不会跨越 Block 边界。这种设计确保了结构变化时的正确性。

## Diff 过程的优化

有了 Block Tree，Diff 过程可以显著简化：

```javascript
function patchBlock(n1, n2) {
  // 获取动态子节点数组
  const oldDynamicChildren = n1.dynamicChildren
  const newDynamicChildren = n2.dynamicChildren

  // 只遍历动态子节点
  for (let i = 0; i < newDynamicChildren.length; i++) {
    const oldVNode = oldDynamicChildren[i]
    const newVNode = newDynamicChildren[i]

    // 利用 patchFlag 进行靶向更新
    patchElement(oldVNode, newVNode)
  }
}

function patchElement(n1, n2) {
  const el = n2.el = n1.el
  const patchFlag = n2.patchFlag

  // 根据 patchFlag 只更新变化的部分
  if (patchFlag & PatchFlags.CLASS) {
    if (n1.props.class !== n2.props.class) {
      hostPatchProp(el, 'class', n2.props.class)
    }
  }
  if (patchFlag & PatchFlags.TEXT) {
    if (n1.children !== n2.children) {
      hostSetElementText(el, n2.children)
    }
  }
  // ... 其他类型
}
```

注意这里的关键优化：动态子节点数组是扁平的，不需要递归；每个节点的 `patchFlag` 告诉我们只需要检查什么。

## Fragment 和多根节点

Vue3 支持组件返回多个根节点，这通过 Fragment 实现。Fragment 也是一个 Block，但它没有实际的 DOM 元素。

```javascript
// 多根节点组件
<template>
  <header>Header</header>
  <main>{{ content }}</main>
  <footer>Footer</footer>
</template>

// 编译后使用 Fragment
function render(ctx) {
  return (openBlock(), createBlock(Fragment, null, [
    createVNode('header', null, 'Header'),
    createVNode('main', null, ctx.content, 1),
    createVNode('footer', null, 'Footer')
  ]))
}
```

Fragment Block 的 `dynamicChildren` 只包含动态的 `<main>` 节点，静态的 `<header>` 和 `<footer>` 被跳过。

## Stable Fragment 优化

对于 v-for 生成的列表，Vue3 引入了 Stable Fragment 的概念。当列表项的键稳定时，可以使用更高效的 Diff 策略。

```javascript
// 稳定的 v-for
<div v-for="item in items" :key="item.id">
  {{ item.name }}
</div>

// 编译时标记为 STABLE_FRAGMENT
createVNode(Fragment, null, renderList(items, item => {
  return (openBlock(), createBlock('div', { key: item.id }, item.name, 1))
}), 64 /* STABLE_FRAGMENT */)
```

Stable Fragment 告诉运行时可以跳过 Fragment 子节点的 Diff，因为每个子 Block 会处理自己的更新。

## 设计权衡与思考

Block Tree 的设计体现了编译时与运行时协作的思想。它的核心权衡包括：

**编译复杂度换取运行时性能**：编译器需要进行更复杂的分析和代码生成，但换来的是运行时近乎最优的更新性能。

**内存开销与 Diff 效率**：每个 Block 额外存储了 `dynamicChildren` 数组，增加了内存占用，但减少了 Diff 时的遍历开销。

**Block 边界的处理**：v-if、v-for 等结构需要创建新的 Block，增加了嵌套层级，但保证了结构变化时的正确性。

Block Tree 最巧妙的地方在于它利用了模板的静态可分析性。运行时无法知道哪些节点会变化，但编译器可以通过分析模板结构预先知道。这种「编译时知识转化为运行时优化」的策略，是 Vue3 性能优化的核心思想。

与 React 的纯运行时方案相比，Block Tree 牺牲了一定的灵活性（需要编译），但换来了更好的默认性能。与 Svelte 的完全编译方案相比，Block Tree 保留了虚拟 DOM 的抽象能力，同时获得了接近的性能。这是 Vue3 在性能与灵活性之间找到的平衡点。
