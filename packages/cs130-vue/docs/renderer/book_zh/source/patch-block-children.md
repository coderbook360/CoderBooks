# patchBlockChildren Block 子节点更新

`patchBlockChildren` 是 Vue 3 的核心优化，只更新 dynamicChildren 中的动态节点，跳过静态内容。

## 函数签名

```typescript
const patchBlockChildren: PatchBlockChildrenFn = (
  oldChildren: VNode[],
  newChildren: VNode[],
  fallbackContainer: RendererElement,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: SuspenseBoundary | null,
  isSVG: boolean,
  slotScopeIds: string[] | null
) => { ... }
```

## 实现

```typescript
const patchBlockChildren: PatchBlockChildrenFn = (
  oldChildren,
  newChildren,
  fallbackContainer,
  parentComponent,
  parentSuspense,
  isSVG,
  slotScopeIds
) => {
  for (let i = 0; i < newChildren.length; i++) {
    const oldVNode = oldChildren[i]
    const newVNode = newChildren[i]
    
    // 确定容器
    const container =
      // Fragment 的子节点需要正确的父容器
      oldVNode.el &&
      (oldVNode.type === Fragment ||
        // 类型不同需要移动
        !isSameVNodeType(oldVNode, newVNode) ||
        // 组件或 Teleport 可能移动子节点
        oldVNode.shapeFlag & (ShapeFlags.COMPONENT | ShapeFlags.TELEPORT))
        ? hostParentNode(oldVNode.el!)!
        : fallbackContainer
    
    patch(
      oldVNode,
      newVNode,
      container,
      null,
      parentComponent,
      parentSuspense,
      isSVG,
      slotScopeIds,
      true  // 保持 optimized 模式
    )
  }
}
```

## 核心思想

传统 diff 需要遍历所有子节点：

```typescript
// 传统方式
for (let i = 0; i < children.length; i++) {
  patch(oldChildren[i], newChildren[i], ...)
}
```

Block 优化只遍历动态节点：

```typescript
// dynamicChildren 只包含动态节点
for (let i = 0; i < dynamicChildren.length; i++) {
  patch(oldDynamic[i], newDynamic[i], ...)
}
```

## 示例对比

```html
<div>
  <span>Static</span>
  <span>{{ message }}</span>
  <span>Static</span>
</div>
```

### 传统 diff

需要比较 3 个子节点。

### Block 优化

dynamicChildren 只有 1 个：

```typescript
dynamicChildren = [
  { type: 'span', children: message, patchFlag: TEXT }
]
```

只 patch 这一个节点。

## 为什么有效

编译器在编译时标记动态节点：

```typescript
const _hoisted_1 = createVNode('span', null, 'Static')
const _hoisted_2 = createVNode('span', null, 'Static')

function render() {
  return (openBlock(), createBlock('div', null, [
    _hoisted_1,
    createVNode('span', null, ctx.message, PatchFlags.TEXT),
    _hoisted_2
  ]))
}
```

Block 收集动态子节点：

```typescript
function createBlock(type, props, children) {
  const vnode = createVNode(type, props, children)
  // 从 currentBlock 获取收集的动态节点
  vnode.dynamicChildren = currentBlock
  return vnode
}
```

## 容器确定

```typescript
const container =
  oldVNode.el &&
  (oldVNode.type === Fragment ||
    !isSameVNodeType(oldVNode, newVNode) ||
    oldVNode.shapeFlag & (ShapeFlags.COMPONENT | ShapeFlags.TELEPORT))
    ? hostParentNode(oldVNode.el!)!
    : fallbackContainer
```

需要动态确定容器，因为：
- Fragment 子节点的父容器是 Fragment 的父元素
- 类型变化时需要找到实际父元素
- 组件/Teleport 可能改变 DOM 位置

## 与 patchChildren 对比

| 特性 | patchBlockChildren | patchChildren |
|------|-------------------|---------------|
| 遍历范围 | dynamicChildren | 全部 children |
| 算法 | 简单线性 | keyed/unkeyed diff |
| 使用场景 | 结构稳定的 Block | 动态结构 |
| 复杂度 | O(d) | O(n) 或 O(n log n) |

## 适用条件

patchBlockChildren 需要：
1. 有 dynamicChildren（是 Block 节点）
2. optimized 为 true
3. 结构稳定（STABLE_FRAGMENT）

```typescript
if (dynamicChildren && n1.dynamicChildren) {
  patchBlockChildren(n1.dynamicChildren, dynamicChildren, ...)
} else {
  patchChildren(n1, n2, ...)
}
```

## 嵌套 Block

Block 可以嵌套：

```html
<div>               <!-- Block 1 -->
  <span>Static</span>
  <div v-if="show"> <!-- Block 2（嵌套） -->
    {{ message }}
  </div>
</div>
```

每个 Block 有自己的 dynamicChildren：

```typescript
// Block 1 的 dynamicChildren
[innerBlockVNode]

// Block 2 的 dynamicChildren
[textVNode]
```

## 限制

### 不稳定结构

v-if 可能改变结构：

```html
<div>
  <span v-if="a">A</span>
  <span v-if="b">B</span>
</div>
```

这种情况降级为完整 diff。

### v-for 无 key

```html
<div v-for="item in list">{{ item }}</div>
```

无 key 的 v-for 是 UNKEYED_FRAGMENT，使用 patchUnkeyedChildren。

## 性能提升

假设有 100 个子节点，5 个是动态的：

```
传统 diff: O(100) 次比较
Block 优化: O(5) 次比较
```

性能提升 20 倍。

## 开发模式

开发模式下处理 HMR：

```typescript
if (__DEV__ && parentComponent && parentComponent.type.__hmrId) {
  // HMR 时需要遍历静态子节点
  traverseStaticChildren(n1, n2)
}
```

## 小结

`patchBlockChildren` 是 Block Tree 优化的核心。它只更新 dynamicChildren 中的节点，跳过静态内容。配合编译器的静态分析，实现了显著的性能提升。这是 Vue 3 相比 Vue 2 的关键优化之一。
