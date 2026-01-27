# renderChildren 子节点渲染

子节点渲染是 SSR 中的高频操作。每个元素或组件都可能包含子节点，`renderChildren` 函数负责处理各种类型的子内容。

## 子节点的多种形态

在 Vue 中，子节点可以有多种形态：

```javascript
// 字符串
<div>Hello World</div>

// 单个子节点
<div><span>child</span></div>

// 多个子节点
<div>
  <span>first</span>
  <span>second</span>
</div>

// 混合内容
<div>
  Text before
  <span>element</span>
  Text after
</div>

// 动态列表
<div>
  <span v-for="item in items">{{ item }}</span>
</div>
```

这些不同的形态在虚拟 DOM 中有不同的表示方式。

## 函数签名

```typescript
function renderChildren(
  children: VNodeNormalizedChildren,
  parentComponent: ComponentInternalInstance | null,
  slotScopeId: string | undefined,
  context: SSRContext,
  push: PushFn
): void
```

函数不返回值，而是通过 `push` 直接输出 HTML。

## 子节点类型判断

`shapeFlag` 不仅标识节点本身的类型，也标识子节点的类型：

```typescript
const enum ShapeFlags {
  // ... 节点类型 ...
  TEXT_CHILDREN = 1 << 3,    // 子节点是文本
  ARRAY_CHILDREN = 1 << 4,   // 子节点是数组
  SLOTS_CHILDREN = 1 << 5,   // 子节点是插槽
}
```

一个元素节点的 `shapeFlag` 可能是 `ELEMENT | TEXT_CHILDREN`，表示这是一个包含文本子节点的元素。

## 核心实现

```typescript
function renderChildren(
  children: VNodeNormalizedChildren,
  parentComponent: ComponentInternalInstance | null,
  slotScopeId: string | undefined,
  context: SSRContext,
  push: PushFn
) {
  if (typeof children === 'string') {
    // 文本子节点
    push(escapeHtml(children))
  } else if (Array.isArray(children)) {
    // 数组子节点
    for (let i = 0; i < children.length; i++) {
      renderVNode(
        normalizeVNode(children[i]),
        parentComponent,
        slotScopeId,
        context,
        push
      )
    }
  }
}
```

逻辑很清晰：文本直接输出，数组则遍历渲染每个子节点。

## 文本子节点

文本子节点是最简单的情况：

```typescript
if (typeof children === 'string') {
  push(escapeHtml(children))
}
```

`escapeHtml` 转义特殊字符，防止 XSS：

```typescript
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
```

转义是必须的：

```javascript
// 用户输入
const userInput = '<script>alert("xss")</script>'

// 不转义会产生安全问题
<div><script>alert("xss")</script></div>

// 转义后安全
<div>&lt;script&gt;alert("xss")&lt;/script&gt;</div>
```

## 数组子节点

数组子节点需要遍历处理：

```typescript
if (Array.isArray(children)) {
  for (let i = 0; i < children.length; i++) {
    renderVNode(
      normalizeVNode(children[i]),
      parentComponent,
      slotScopeId,
      context,
      push
    )
  }
}
```

每个子项调用 `normalizeVNode` 规范化后，再调用 `renderVNode` 渲染。

`normalizeVNode` 处理各种边界情况：

```typescript
function normalizeVNode(child: VNodeChild): VNode {
  if (child == null || typeof child === 'boolean') {
    // null/undefined/boolean 变成空注释
    return createCommentVNode('')
  }
  if (typeof child === 'string' || typeof child === 'number') {
    // 原始值变成文本节点
    return createTextVNode(String(child))
  }
  if (Array.isArray(child)) {
    // 数组包装成 Fragment
    return createVNode(Fragment, null, child.slice())
  }
  // 已经是 VNode，克隆一份
  return child.el ? cloneVNode(child) : child
}
```

## 插槽子节点

组件的子节点通常是插槽。插槽的处理方式不同：

```typescript
if (shapeFlag & ShapeFlags.SLOTS_CHILDREN) {
  // 插槽是函数，需要调用才能获取内容
  const slots = children as Slots
  const defaultSlot = slots.default
  if (defaultSlot) {
    const slotContent = defaultSlot(slotProps)
    renderChildren(slotContent, parentComponent, slotScopeId, context, push)
  }
}
```

插槽是函数，调用时传入 props，返回虚拟节点数组：

```javascript
// 父组件
<MyComponent>
  <template #default="{ data }">
    <span>{{ data.name }}</span>
  </template>
</MyComponent>

// 插槽编译为函数
slots: {
  default: (props) => [h('span', props.data.name)]
}
```

## 性能优化：静态提升

编译器会将静态子节点提升到渲染函数外部：

```javascript
// 模板
<div>
  <span>Static Text</span>
  <span>{{ dynamic }}</span>
</div>

// 编译后
const _hoisted_1 = createVNode('span', null, 'Static Text')

function render() {
  return createVNode('div', null, [
    _hoisted_1,  // 复用静态节点
    createVNode('span', null, ctx.dynamic)
  ])
}
```

在 SSR 中，静态节点还可以进一步优化为静态字符串：

```javascript
const _hoisted_1 = '<span>Static Text</span>'

function ssrRender(_ctx, _push) {
  _push('<div>')
  _push(_hoisted_1)  // 直接输出字符串
  _push(`<span>${escapeHtml(_ctx.dynamic)}</span>`)
  _push('</div>')
}
```

## 空白处理

模板中的空白在 SSR 中需要正确处理：

```html
<div>
  <span>A</span>
  <span>B</span>
</div>
```

编译器会根据配置决定是否保留空白：

```javascript
// preserveWhitespace: false（默认）
children: [spanA, spanB]

// preserveWhitespace: true
children: [spanA, '\n  ', spanB, '\n']
```

SSR 通常使用默认配置，移除不必要的空白以减小 HTML 体积。

## 条件渲染

`v-if` 会产生条件子节点：

```html
<div>
  <span v-if="show">visible</span>
</div>
```

编译为：

```javascript
children: [
  show ? createVNode('span', null, 'visible') : createCommentVNode('')
]
```

当条件为假时，渲染空注释作为占位符。这对水合很重要，因为客户端需要知道这里有一个动态节点。

## v-for 列表渲染

`v-for` 生成数组子节点：

```html
<ul>
  <li v-for="item in items" :key="item.id">{{ item.name }}</li>
</ul>
```

编译为：

```javascript
children: items.map(item => 
  createVNode('li', { key: item.id }, item.name)
)
```

在 SSR 中，key 不会渲染到 HTML 中，它只用于客户端的 diff 算法。

## 递归深度

子节点可能嵌套很深：

```
div
└── ul
    └── li
        └── span
            └── a
                └── text
```

每一层都调用 `renderChildren`，形成递归。JavaScript 有调用栈限制（通常几万层），但正常的组件树很少达到这个深度。

如果确实遇到栈溢出，可以考虑将递归转为迭代，使用显式的栈结构：

```typescript
function renderChildrenIterative(rootChildren, ...) {
  const stack = [{ children: rootChildren, index: 0 }]
  
  while (stack.length > 0) {
    const frame = stack[stack.length - 1]
    
    if (frame.index >= frame.children.length) {
      stack.pop()
      continue
    }
    
    const child = frame.children[frame.index++]
    
    if (Array.isArray(child.children)) {
      // 开标签
      pushOpenTag(child)
      // 压栈子节点
      stack.push({ children: child.children, index: 0, node: child })
    } else {
      // 叶子节点直接渲染
      renderLeaf(child)
    }
    
    // 出栈时输出闭标签
    if (frame.node && frame.index >= frame.children.length) {
      pushCloseTag(frame.node)
    }
  }
}
```

Vue 源码中没有使用这种方式，因为实际场景中递归深度很少成为问题。

## 异步子节点

当子节点包含异步组件时，`renderChildren` 需要等待：

```typescript
async function renderChildrenAsync(children, ...) {
  if (Array.isArray(children)) {
    for (const child of children) {
      await renderVNodeAsync(normalizeVNode(child), ...)
    }
  }
}
```

这会导致子节点串行渲染。流式渲染通过 Buffer 机制可以优化这个过程。

## 示例：完整的子节点渲染过程

```javascript
// 虚拟节点
const vnode = {
  type: 'ul',
  children: [
    { type: 'li', children: 'First' },
    { type: 'li', children: [
      { type: 'span', children: 'Nested' }
    ]},
    'Text node'
  ]
}

// 渲染过程
renderElementVNode(vnode)
  push('<ul>')
  renderChildren(vnode.children)
    // 第一个子节点
    renderVNode({ type: 'li', children: 'First' })
      push('<li>')
      renderChildren('First')
        push('First')  // 转义后的文本
      push('</li>')
    // 第二个子节点
    renderVNode({ type: 'li', children: [...] })
      push('<li>')
      renderChildren([{ type: 'span', ... }])
        renderVNode({ type: 'span', children: 'Nested' })
          push('<span>')
          push('Nested')
          push('</span>')
      push('</li>')
    // 第三个子节点
    renderVNode({ type: Text, children: 'Text node' })
      push('Text node')
  push('</ul>')

// 最终输出
<ul><li>First</li><li><span>Nested</span></li>Text node</ul>
```

## 小结

`renderChildren` 处理元素和组件的子内容：

1. 字符串子节点直接转义输出
2. 数组子节点遍历渲染每个元素
3. 插槽子节点调用插槽函数获取内容
4. 每个子节点通过 `normalizeVNode` 规范化
5. 递归调用 `renderVNode` 完成渲染

理解了子节点渲染，SSR 的核心渲染流程就基本完整了。接下来我们将深入属性渲染，看看 `ssrRenderAttrs` 如何处理各种属性。
