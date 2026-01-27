# processText 文本处理

`processText` 处理文本类型 VNode 的挂载和更新。文本节点是最简单的 VNode 类型。

## 函数签名

```typescript
const processText: ProcessTextOrCommentFn = (
  n1: VNode | null,
  n2: VNode,
  container: RendererElement,
  anchor: RendererNode | null
) => { ... }
```

## 实现

```typescript
const processText: ProcessTextOrCommentFn = (n1, n2, container, anchor) => {
  if (n1 == null) {
    // 挂载：创建文本节点并插入
    hostInsert(
      (n2.el = hostCreateText(n2.children as string)),
      container,
      anchor
    )
  } else {
    // 更新：复用节点，只更新文本
    const el = (n2.el = n1.el!)
    if (n2.children !== n1.children) {
      hostSetText(el, n2.children as string)
    }
  }
}
```

## 执行流程

### 挂载流程

```typescript
// 1. 创建文本节点
const textNode = hostCreateText('Hello')

// 2. 保存到 VNode
n2.el = textNode

// 3. 插入 DOM
hostInsert(textNode, container, anchor)
```

### 更新流程

```typescript
// 1. 复用 DOM 节点
n2.el = n1.el

// 2. 比较文本内容
if (n2.children !== n1.children) {
  // 3. 更新文本
  hostSetText(n2.el, n2.children)
}
```

## 平台操作

### hostCreateText

```typescript
// DOM 平台实现
function createText(text: string): Text {
  return document.createTextNode(text)
}
```

### hostSetText

```typescript
function setText(node: Text, text: string): void {
  node.nodeValue = text
}
```

### hostInsert

```typescript
function insert(
  child: Node,
  parent: Element,
  anchor: Node | null
): void {
  parent.insertBefore(child, anchor)
}
```

## Text VNode 结构

```typescript
const textVNode: VNode = {
  __v_isVNode: true,
  type: Text,           // Symbol('Text')
  props: null,
  key: null,
  ref: null,
  children: 'Hello',    // 文本内容
  shapeFlag: 0,
  patchFlag: 0,
  el: null,             // 挂载后指向 DOM 节点
  // ...
}
```

## 创建 Text VNode

### 使用 createTextVNode

```typescript
import { createTextVNode } from 'vue'

const vnode = createTextVNode('Hello World')
```

### 内部实现

```typescript
function createTextVNode(text: string = ' ', flag: number = 0): VNode {
  return createVNode(Text, null, text, flag)
}
```

### 编译器生成

模板中的文本会被编译为 `createTextVNode`：

```html
<div>Hello {{ name }}</div>
```

编译为：

```typescript
import { createTextVNode as _createTextVNode } from 'vue'

function render() {
  return _createVNode('div', null, [
    _createTextVNode('Hello '),
    _createTextVNode(_ctx.name, 1 /* TEXT */)
  ])
}
```

## 性能优化

### 文本比较

使用 `!==` 直接比较，不做深度检查：

```typescript
if (n2.children !== n1.children) {
  hostSetText(el, n2.children as string)
}
```

这是 O(1) 操作（字符串引用比较可能短路）。

### 节点复用

更新时直接复用 DOM 节点，不重新创建：

```typescript
const el = (n2.el = n1.el!)
```

## 与其他类型的对比

| 类型 | children | 处理方式 |
|------|----------|----------|
| Text | string | 直接设置文本 |
| Comment | string | 注释内容 |
| Element | VNode[] / string | 递归处理 |

## 边界情况

### 空字符串

```typescript
const vnode = createTextVNode('')
// 创建空文本节点，在 DOM 中存在但不可见
```

### 特殊字符

```typescript
const vnode = createTextVNode('<script>alert(1)</script>')
// 安全：作为文本内容，不会被解析为 HTML
```

### 数字转换

```typescript
// 数字会被转为字符串
const vnode = createTextVNode(String(42))
```

## 在 patch 中的位置

```typescript
switch (type) {
  case Text:
    processText(n1, n2, container, anchor)
    break
  case Comment:
    processCommentNode(n1, n2, container, anchor)
    break
  // ...
}
```

Text 是 Symbol，不会与用户定义的组件类型冲突。

## 与 Element textContent 的区别

```typescript
// Text VNode - 创建独立的文本节点
createVNode(Text, null, 'Hello')

// Element 的文本子节点 - 使用 textContent
createVNode('div', null, 'Hello')
// mountElement 中：hostSetElementText(el, 'Hello')
```

Element 的文本子节点走 `hostSetElementText`：

```typescript
function setElementText(el: Element, text: string): void {
  el.textContent = text
}
```

## 小结

`processText` 是最简单的处理函数。挂载时创建文本节点并插入，更新时直接修改 nodeValue。它体现了 Vue 渲染器的设计：简单情况简单处理，复杂情况（Element、Component）才引入更多逻辑。
