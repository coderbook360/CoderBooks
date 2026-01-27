# Comment Node 注释节点

注释节点在 Vue 渲染系统中扮演着重要的辅助角色。它们不仅用于开发时的调试标记，更是 v-if 等条件渲染指令实现占位符机制的基础。

## 注释 VNode 类型

Vue 定义了 Comment 作为特殊的 VNode 类型：

```typescript
export const Comment = Symbol(__DEV__ ? 'Comment' : undefined)

const commentVNode: VNode = {
  type: Comment,
  children: 'v-if',  // 可选的注释内容
  shapeFlag: 0,
  // ...
}
```

Comment 是一个 Symbol，渲染器通过类型判断来识别注释节点。

## 渲染处理

patch 函数中对注释节点的处理：

```typescript
const patch: PatchFn = (n1, n2, container, anchor, /* ... */) => {
  const { type, shapeFlag } = n2
  
  switch (type) {
    case Text:
      processText(n1, n2, container, anchor)
      break
    case Comment:
      processCommentNode(n1, n2, container, anchor)
      break
    // ...
  }
}
```

processCommentNode 的实现：

```typescript
const processCommentNode: ProcessTextOrCommentFn = (n1, n2, container, anchor) => {
  if (n1 == null) {
    // 挂载
    hostInsert(
      (n2.el = hostCreateComment((n2.children as string) || '')),
      container,
      anchor
    )
  } else {
    // 更新：注释节点不更新内容，只复用 el
    n2.el = n1.el
  }
}
```

注释节点的处理非常简单：挂载时创建 DOM 注释节点，更新时直接复用（注释内容不会变化）。

## v-if 的占位符

v-if 为 false 时，编译器生成注释节点作为占位符：

```html
<template>
  <div v-if="show">Content</div>
</template>
```

编译为：

```typescript
function render(_ctx) {
  return _ctx.show
    ? createVNode('div', null, 'Content')
    : createCommentVNode('v-if')  // 占位符
}
```

这个注释节点的作用：
1. 保持 DOM 位置，便于条件切换时知道在哪里插入
2. 开发时在 DOM 中可见（`<!-- v-if -->`），帮助调试
3. 为后续渲染提供锚点

## createCommentVNode

创建注释 VNode 的工厂函数：

```typescript
export function createCommentVNode(
  text: string = '',
  asBlock: boolean = false
): VNode {
  return asBlock
    ? (openBlock(), createBlock(Comment, null, text))
    : createVNode(Comment, null, text)
}
```

asBlock 参数决定是否创建为 Block。作为 Block 时会被收集到 dynamicChildren 中（虽然注释本身是静态的，但它可能替换动态内容）。

## 开发环境 vs 生产环境

注释内容在生产环境中可能被优化掉：

```typescript
hostInsert(
  (n2.el = hostCreateComment((n2.children as string) || '')),
  container,
  anchor
)
```

生产环境可能使用空字符串减小输出：

```typescript
// 开发环境
<!-- v-if -->

// 生产环境
<!---->
```

## v-else-if 和 v-else 的处理

整个条件链编译为单个表达式：

```html
<template>
  <div v-if="a">A</div>
  <div v-else-if="b">B</div>
  <div v-else>C</div>
</template>
```

编译为：

```typescript
function render(_ctx) {
  return _ctx.a
    ? createVNode('div', null, 'A')
    : _ctx.b
      ? createVNode('div', null, 'B')
      : createVNode('div', null, 'C')
}
```

这里没有注释节点——因为总有一个分支会渲染。只有当所有条件都可能为 false 时才需要注释占位符：

```html
<template>
  <div v-if="a">A</div>
  <div v-else-if="b">B</div>
  <!-- 没有 v-else，需要占位符 -->
</template>
```

编译为：

```typescript
function render(_ctx) {
  return _ctx.a
    ? createVNode('div', null, 'A')
    : _ctx.b
      ? createVNode('div', null, 'B')
      : createCommentVNode('v-if', true)
}
```

## Fragment 与注释

Fragment 使用注释作为边界标记（开发环境）：

```typescript
const mountChildren: MountChildrenFn = (children, container, anchor, /* ... */) => {
  if (__DEV__) {
    // 开发环境插入 Fragment 边界注释
  }
  
  for (let i = 0; i < children.length; i++) {
    // 挂载子节点
  }
}
```

这帮助开发者在 DevTools 中识别 Fragment 的范围。

## Teleport 和 Suspense 的标记

这些组件也使用注释节点作为占位符：

```typescript
// Teleport
const placeholder = (__DEV__
  ? hostCreateComment('teleport start')
  : hostCreateText(''))
const mainAnchor = (__DEV__
  ? hostCreateComment('teleport end')
  : hostCreateText(''))
```

开发环境使用描述性注释，生产环境使用空文本节点（更小）。

## 注释节点的移动

当父元素重新排序时，注释节点需要跟随移动：

```typescript
const move: MoveFn = (vnode, container, anchor, moveType, /* ... */) => {
  if (vnode.type === Comment) {
    hostInsert(vnode.el!, container, anchor)
    return
  }
  // ...
}
```

注释节点的移动很简单——直接 insertBefore 到新位置。

## 注释节点的卸载

卸载也很直接：

```typescript
const unmount: UnmountFn = (vnode, parentComponent, parentSuspense, doRemove, /* ... */) => {
  const { type, el, anchor } = vnode
  
  if (doRemove) {
    hostRemove(el!)
  }
  // ...
}
```

直接从 DOM 中移除即可。

## 手动创建注释

在渲染函数中可以手动创建注释节点：

```typescript
import { createCommentVNode, h } from 'vue'

export default {
  render() {
    return h('div', [
      createCommentVNode('这是一个注释'),
      this.content
    ])
  }
}
```

这在某些需要 DOM 标记的场景下有用。

## SSR 中的注释

服务端渲染时，注释节点被序列化为 HTML 注释：

```typescript
function ssrRenderComment(push: PushFn, content: string) {
  push(`<!--${escapeHtml(content)}-->`)
}
```

客户端水合时，会找到对应的注释节点进行匹配。

## 小结

注释节点在 Vue 中承担多重职责：作为 v-if 的占位符保持 DOM 位置、作为 Fragment/Teleport 的边界标记、以及开发时的调试辅助。它的处理逻辑简单直接——创建后几乎不需要更新。在生产环境中，Vue 会尽量简化注释内容以减小体积。这个看似不起眼的节点类型是条件渲染和组件边界管理的重要基础设施。
