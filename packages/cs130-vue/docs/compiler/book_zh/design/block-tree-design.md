# Block Tree 设计

Block Tree 是 Vue 3 编译优化的核心架构。它改变了传统虚拟 DOM 的递归比对模式，让更新时可以跳过整个静态子树，直接定位到动态节点。配合 Patch Flags，Block Tree 将 diff 复杂度从 O(n) 降低到 O(动态节点数)。

## 传统虚拟 DOM 的问题

传统 diff 需要递归遍历整棵虚拟 DOM 树：

```javascript
function patch(n1, n2) {
  // 检查当前节点
  patchElement(n1, n2)
  
  // 递归检查所有子节点
  const oldChildren = n1.children
  const newChildren = n2.children
  for (let i = 0; i < newChildren.length; i++) {
    patch(oldChildren[i], newChildren[i])
  }
}
```

问题在于大多数节点是静态的，却仍然被遍历和比较。如果一个模板有 1000 个节点，只有 10 个动态节点，传统 diff 仍要访问所有 1000 个节点。

## Block 的概念

Block 是一个特殊的 VNode，它收集其子树中所有动态后代节点，形成扁平的数组。更新时直接遍历这个数组，跳过静态节点。

```javascript
// 传统结构（树形）
{
  type: 'div',
  children: [
    { type: 'h1', children: 'Static Title' },
    { type: 'p', children: [
      { type: 'text', children: ctx.message }  // 动态
    ]}
  ]
}

// Block 结构（扁平）
{
  type: 'div',
  children: [...],  // 保留原始结构用于挂载
  dynamicChildren: [
    { type: 'text', children: ctx.message }  // 只收集动态节点
  ]
}
```

更新时，直接遍历 dynamicChildren，不需要递归整棵树。

## Block 的创建

编译器使用 openBlock 和 createBlock 创建 Block：

```javascript
import { openBlock, createBlock, createVNode } from 'vue'

function render(_ctx) {
  return (openBlock(), createBlock('div', null, [
    createVNode('h1', null, 'Static Title'),
    createVNode('p', null, toDisplayString(_ctx.message), 1 /* TEXT */)
  ]))
}
```

openBlock() 初始化当前 Block 的收集栈。createVNode 时如果有 patchFlag > 0，节点会被收集到当前 Block 的 dynamicChildren 中。createBlock 结束收集，生成最终的 Block VNode。

## 动态节点的收集

createVNode 内部检查是否需要收集：

```typescript
function createVNode(type, props, children, patchFlag) {
  const vnode = {
    type,
    props,
    children,
    patchFlag,
    // ...
  }
  
  // 有 patchFlag 且大于 0，需要被追踪
  if (patchFlag > 0 && currentBlock) {
    currentBlock.push(vnode)
  }
  
  return vnode
}
```

只有动态节点（patchFlag > 0）会被收集。静态节点虽然存在于 children 中用于首次挂载，但不会出现在 dynamicChildren 中。

## Block 的更新

Block 更新时直接 patch dynamicChildren：

```typescript
function patchBlock(n1, n2) {
  const oldDynamicChildren = n1.dynamicChildren
  const newDynamicChildren = n2.dynamicChildren
  
  for (let i = 0; i < newDynamicChildren.length; i++) {
    patch(oldDynamicChildren[i], newDynamicChildren[i])
  }
}
```

这个循环的长度是动态节点数，而非总节点数。对于大型静态模板，性能提升非常显著。

## Block 的边界

Block 需要在特定位置设置边界。并非整个组件是一个 Block，而是在结构可能变化的地方创建新 Block。

v-if 创建 Block 边界：

```vue
<div>
  <p>Static</p>
  <div v-if="show">
    <span>{{ a }}</span>
  </div>
  <div v-else>
    <span>{{ b }}</span>
  </div>
</div>
```

v-if/v-else 的两个分支各自是 Block。因为它们的结构不同，dynamicChildren 不能简单复用。

v-for 也创建 Block 边界：

```vue
<ul>
  <li v-for="item in items">{{ item.name }}</li>
</ul>
```

每个 li 可以是 Block。整个列表是 Fragment Block，包含动态数量的子 Block。

## 嵌套 Block

Block 可以嵌套。父 Block 的 dynamicChildren 可能包含子 Block：

```javascript
// 父 Block
{
  type: 'div',
  dynamicChildren: [
    // 子 Block（v-if 分支）
    {
      type: Fragment,
      dynamicChildren: [...]
    }
  ]
}
```

更新时先 patch 子 Block，子 Block 内部再按自己的 dynamicChildren 更新。

## Stable Fragment

如果 Fragment 的子节点顺序稳定（如静态列表），可以标记为 STABLE_FRAGMENT：

```javascript
createBlock(Fragment, null, [
  createVNode('span', null, 'A'),
  createVNode('span', null, _ctx.b, 1 /* TEXT */),
  createVNode('span', null, 'C')
], 64 /* STABLE_FRAGMENT */)
```

稳定 Fragment 可以直接通过索引对应 patch，不需要 key 匹配或 diff 算法。

## dynamicChildren 的顺序稳定性

Block 优化依赖一个假设：dynamicChildren 的顺序在更新前后保持一致。对于同一个 Block，动态节点的相对位置不变。

这就是为什么 v-if 需要是 Block 边界。条件切换时动态节点集合可能完全不同，必须在边界处隔离。

## 与 Patch Flags 的配合

Block Tree 解决"定位哪些节点需要更新"，Patch Flags 解决"节点的哪些部分需要更新"。两者配合：

```javascript
function patchBlock(n1, n2) {
  for (let i = 0; i < n2.dynamicChildren.length; i++) {
    const oldVNode = n1.dynamicChildren[i]
    const newVNode = n2.dynamicChildren[i]
    
    // 根据 patchFlag 决定更新什么
    if (newVNode.patchFlag & PatchFlags.CLASS) {
      patchClass(oldVNode.el, newVNode.props.class)
    }
    if (newVNode.patchFlag & PatchFlags.TEXT) {
      setElementText(oldVNode.el, newVNode.children)
    }
    // ...
  }
}
```

Block 确保只访问动态节点，Patch Flags 确保每个节点只更新变化的部分。

## 挂载与更新的路径差异

首次挂载时，需要创建所有 DOM 节点，包括静态的：

```javascript
function mountBlock(vnode, container) {
  // 挂载需要处理所有 children
  for (const child of vnode.children) {
    mount(child, container)
  }
  
  // dynamicChildren 只用于后续更新
}
```

更新时，只遍历 dynamicChildren：

```javascript
function updateBlock(n1, n2) {
  // 跳过静态 children，只处理动态的
  patchBlockChildren(n1.dynamicChildren, n2.dynamicChildren)
}
```

这种分离让挂载保持完整性，更新保持高效性。

## 小结

Block Tree 通过收集动态节点形成扁平数组，将 diff 的遍历范围从整棵树缩小到动态节点集合。编译器在结构可能变化的位置（v-if、v-for）设置 Block 边界，保证 dynamicChildren 的顺序稳定性。配合 Patch Flags，Block Tree 实现了接近最优的更新性能——只访问需要更新的节点，只更新需要改变的部分。这是 Vue 3 性能大幅领先 Vue 2 的核心原因。
