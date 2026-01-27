# processCommentNode 注释处理

`processCommentNode` 处理注释类型 VNode。注释节点在 Vue 中用作占位符，如 v-if 为 false 时的占位。

## 函数签名

```typescript
const processCommentNode: ProcessTextOrCommentFn = (
  n1: VNode | null,
  n2: VNode,
  container: RendererElement,
  anchor: RendererNode | null
) => { ... }
```

## 实现

```typescript
const processCommentNode: ProcessTextOrCommentFn = (
  n1,
  n2,
  container,
  anchor
) => {
  if (n1 == null) {
    // 挂载
    hostInsert(
      (n2.el = hostCreateComment((n2.children as string) || '')),
      container,
      anchor
    )
  } else {
    // 更新：注释节点不更新内容，只复用
    n2.el = n1.el
  }
}
```

## 执行流程

### 挂载

```typescript
// 1. 创建注释节点
const comment = hostCreateComment(n2.children || '')

// 2. 保存引用
n2.el = comment

// 3. 插入 DOM
hostInsert(comment, container, anchor)
```

### 更新

注释节点内容不更新，只复用 DOM 节点：

```typescript
n2.el = n1.el
```

## 平台操作

```typescript
// DOM 平台实现
function createComment(text: string): Comment {
  return document.createComment(text)
}
```

## 使用场景

### v-if 占位

```html
<div v-if="show">Content</div>
```

当 show 为 false 时：

```typescript
// 渲染注释节点作为占位
createVNode(Comment)
```

DOM 结果：

```html
<!---->
```

### normalizeVNode

null、undefined、boolean 被规范化为注释节点：

```typescript
function normalizeVNode(child: VNodeChild): VNode {
  if (child == null || typeof child === 'boolean') {
    return createVNode(Comment)
  }
  // ...
}
```

### v-show vs v-if

```html
<!-- v-show：元素始终存在，用 display 控制 -->
<div v-show="visible">Show</div>

<!-- v-if：条件为假时用注释占位 -->
<div v-if="visible">If</div>
```

v-if 为 false 时的编译结果：

```typescript
visible ? createVNode('div', null, 'If') : createVNode(Comment)
```

## Comment VNode 结构

```typescript
const commentVNode: VNode = {
  __v_isVNode: true,
  type: Comment,        // Symbol('Comment')
  props: null,
  key: null,
  ref: null,
  children: '',         // 注释内容（通常为空）
  shapeFlag: 0,
  patchFlag: 0,
  el: null,
  // ...
}
```

## 为什么不更新内容

注释节点主要作为占位符，内容不重要：

```typescript
// 更新时直接复用
n2.el = n1.el

// 不需要：
// hostSetComment(n2.el, n2.children)
```

这是合理的设计简化。

## 开发模式

开发模式下可以添加标识：

```typescript
if (__DEV__) {
  hostInsert(
    (n2.el = hostCreateComment(`v-if`)),
    container,
    anchor
  )
}
```

DOM 结果：

```html
<!--v-if-->
```

便于调试。

## 与 Static 节点的区别

| 类型 | 用途 | 内容 |
|------|------|------|
| Comment | 占位符 | 通常为空 |
| Static | 静态 HTML | 完整 HTML 字符串 |

Static 节点用于静态提升优化：

```typescript
// 静态内容
const _hoisted = createStaticVNode('<div>Static</div>')
```

## 条件渲染流程

v-if 切换时的流程：

```typescript
// false -> true
patch(commentVNode, elementVNode, container)
// 1. isSameVNodeType: false (Comment vs Element)
// 2. unmount(commentVNode)
// 3. mount(elementVNode)

// true -> false
patch(elementVNode, commentVNode, container)
// 1. isSameVNodeType: false
// 2. unmount(elementVNode)
// 3. mount(commentVNode)
```

## 锚点作用

注释节点保持位置信息：

```html
<div>Before</div>
<!-- v-if placeholder -->
<div>After</div>
```

当条件变为 true 时，新元素插入到正确位置。

## 性能考虑

注释节点是最轻量的 DOM 节点：

1. 不触发样式计算
2. 不参与布局
3. 创建和删除开销极小

因此作为占位符是合适的选择。

## 小结

`processCommentNode` 处理注释 VNode，主要用作条件渲染的占位符。挂载时创建注释节点，更新时直接复用。这是 Vue 条件渲染实现的基础，确保了 DOM 结构的位置稳定性。
