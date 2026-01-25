# Static Node 静态节点处理

静态节点是指在整个组件生命周期中永远不会变化的节点。Vue 编译器能够识别这类节点并进行提升优化，渲染器对它们有专门的高效处理路径。

## 什么是静态节点

静态节点满足以下条件：
- 没有动态绑定（没有 v-bind、v-on、v-if、v-for 等）
- 内容是纯静态文本
- 所有属性都是字面量
- 子节点也都是静态的

```vue
<template>
  <!-- 静态节点 -->
  <div class="header">
    <h1>Welcome</h1>
    <p>This is a static paragraph.</p>
  </div>
  
  <!-- 动态节点 -->
  <div :class="dynamicClass">{{ message }}</div>
</template>
```

## 静态提升

编译器将静态节点提升到渲染函数之外：

```typescript
// 提升到模块作用域
const _hoisted_1 = /*#__PURE__*/_createElementVNode("div", { class: "header" }, [
  /*#__PURE__*/_createElementVNode("h1", null, "Welcome"),
  /*#__PURE__*/_createElementVNode("p", null, "This is a static paragraph.")
], -1 /* HOISTED */)

export function render(_ctx, _cache) {
  return (_openBlock(), _createElementBlock(_Fragment, null, [
    _hoisted_1,  // 复用提升的节点
    _createElementVNode("div", {
      class: _normalizeClass(_ctx.dynamicClass)
    }, _toDisplayString(_ctx.message), 3 /* TEXT, CLASS */)
  ], 64))
}
```

`-1` 是 `PatchFlags.HOISTED`，告诉渲染器这是一个提升的静态节点。

## 静态 VNode 的结构

静态节点使用 STATIC 类型：

```typescript
const staticVNode: VNode = {
  type: Static,
  children: '<div class="header">...</div>',  // HTML 字符串
  shapeFlag: ShapeFlags.ELEMENT,
  patchFlag: PatchFlags.HOISTED,
  // ...
}
```

对于大块静态内容，children 存储的是原始 HTML 字符串而非 VNode 树，使用 innerHTML 一次性插入。

## 渲染处理

patch 函数对静态节点有特殊处理：

```typescript
const patch: PatchFn = (
  n1,
  n2,
  container,
  anchor,
  // ...
) => {
  // ...
  
  const { type, shapeFlag } = n2
  
  switch (type) {
    // ...
    case Static:
      if (n1 == null) {
        mountStaticNode(n2, container, anchor, isSVG)
      } else if (__DEV__) {
        patchStaticNode(n1, n2, container, isSVG)
      }
      break
    // ...
  }
}
```

静态节点在生产环境中只有挂载，没有更新——因为它永远不变。开发环境的 patchStaticNode 用于 HMR 热更新。

## mountStaticNode

静态节点的挂载使用 insertStaticContent：

```typescript
const mountStaticNode = (
  n2: VNode,
  container: RendererElement,
  anchor: RendererNode | null,
  isSVG: boolean
) => {
  // children 是 HTML 字符串
  ;[n2.el, n2.anchor] = hostInsertStaticContent!(
    n2.children as string,
    container,
    anchor,
    isSVG,
    n2.el,  // 可能有缓存的节点
    n2.anchor
  )
}
```

insertStaticContent 使用 insertAdjacentHTML 高效插入：

```typescript
insertStaticContent(content, parent, anchor, isSVG, start, end) {
  const before = anchor ? anchor.previousSibling : parent.lastChild
  
  if (start && (start === end || start.nextSibling)) {
    // 有缓存，克隆节点
    while (true) {
      parent.insertBefore(start!.cloneNode(true), anchor)
      if (start === end || !(start = start!.nextSibling)) break
    }
  } else {
    // 首次渲染，解析 HTML
    parent.insertAdjacentHTML(
      'beforeend',
      isSVG ? `<svg>${content}</svg>` : content
    )
  }
  
  return [
    before ? before.nextSibling : parent.firstChild,
    anchor ? anchor.previousSibling : parent.lastChild
  ]
}
```

返回的首尾节点存储在 VNode 的 el 和 anchor 属性上，用于后续的克隆和移除。

## 节点缓存与复用

静态节点首次渲染后，DOM 节点被缓存：

```typescript
// VNode 上存储了创建的 DOM 节点
n2.el = firstNode
n2.anchor = lastNode
```

同一个静态 VNode 再次渲染时，直接克隆缓存的节点：

```typescript
if (start && (start === end || start.nextSibling)) {
  // 有缓存，克隆
  while (true) {
    parent.insertBefore(start!.cloneNode(true), anchor)
    // ...
  }
}
```

cloneNode(true) 进行深克隆，比重新解析 HTML 更快。

## 静态节点的移除

移除静态节点时需要移除从 el 到 anchor 之间的所有节点：

```typescript
const removeStaticNode = ({ el, anchor }: VNode) => {
  let next
  while (el && el !== anchor) {
    next = hostNextSibling(el)
    hostRemove(el)
    el = next
  }
  hostRemove(anchor!)
}
```

因为静态内容可能包含多个顶级节点，需要用 anchor 标记结束位置。

## 与 Block 的交互

静态节点不会出现在 Block 的 dynamicChildren 中：

```typescript
const block = {
  type: 'div',
  dynamicChildren: [
    // 只有动态节点
    dynamicChildVNode
  ],
  children: [
    staticVNode,      // 静态节点在 children 中
    dynamicChildVNode // 也在 children 中
  ]
}
```

patchBlockChildren 只处理 dynamicChildren，静态节点被完全跳过。

## stringifyStatic

对于大块连续的静态内容，编译器使用 stringifyStatic 优化：

```typescript
// 编译器输出
const _hoisted_1 = /*#__PURE__*/_createStaticVNode("<div class=\"container\"><header>...</header><main>...</main></div>", 1)
```

_createStaticVNode 创建 Static 类型的 VNode：

```typescript
export function createStaticVNode(
  content: string,
  numberOfNodes: number
): VNode {
  const vnode = createVNode(Static, null, content)
  vnode.staticCount = numberOfNodes
  return vnode
}
```

numberOfNodes 记录了顶级节点数量，用于移除时的边界计算。

## 何时触发字符串化

编译器根据阈值决定是否字符串化：

```typescript
// 简化的逻辑
const StringifyThreshold = {
  Element: 5,    // 超过 5 个连续静态元素
  Node: 20       // 或超过 20 个节点
}
```

小块静态内容仍使用常规 VNode（可以被 cloneNode 复用），大块内容字符串化后用 innerHTML 插入更高效。

## 开发环境的 HMR 支持

开发环境保留了静态节点的更新能力：

```typescript
if (__DEV__) {
  patchStaticNode(n1, n2, container, isSVG)
}
```

当模板修改时，HMR 可能需要更新静态内容，此时 patchStaticNode 会重新插入新的静态内容：

```typescript
const patchStaticNode = (n1: VNode, n2: VNode, container: RendererElement, isSVG: boolean) => {
  if (n2.children !== n1.children) {
    const anchor = hostNextSibling(n1.anchor!)
    removeStaticNode(n1)
    ;[n2.el, n2.anchor] = hostInsertStaticContent!(
      n2.children as string,
      container,
      anchor,
      isSVG
    )
  } else {
    n2.el = n1.el
    n2.anchor = n1.anchor
  }
}
```

## 小结

静态节点优化是 Vue 编译时策略的重要部分。编译器识别不变的内容，将其提升并标记为 HOISTED。渲染器使用 insertAdjacentHTML 高效插入，通过 cloneNode 复用已创建的 DOM。静态节点不进入 dynamicChildren，在 patch 时被完全跳过。这套机制显著减少了渲染开销，对于包含大量静态内容的页面效果尤为明显。
