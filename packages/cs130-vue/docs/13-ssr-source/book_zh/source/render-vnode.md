# renderVNode 虚拟节点渲染

`renderVNode` 是 SSR 渲染的核心调度函数。它接收一个虚拟节点，根据节点类型分发到不同的渲染函数。

## 虚拟节点的类型

在 Vue 中，虚拟节点有多种类型：

```typescript
const enum ShapeFlags {
  ELEMENT = 1,                    // 普通元素
  FUNCTIONAL_COMPONENT = 1 << 1,  // 函数式组件
  STATEFUL_COMPONENT = 1 << 2,    // 有状态组件
  TEXT_CHILDREN = 1 << 3,         // 文本子节点
  ARRAY_CHILDREN = 1 << 4,        // 数组子节点
  SLOTS_CHILDREN = 1 << 5,        // 插槽子节点
  TELEPORT = 1 << 6,              // Teleport
  SUSPENSE = 1 << 7,              // Suspense
  COMPONENT_SHOULD_KEEP_ALIVE = 1 << 8,
  COMPONENT_KEPT_ALIVE = 1 << 9,
  COMPONENT = ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.FUNCTIONAL_COMPONENT
}
```

每个 VNode 都有一个 `shapeFlag` 属性，用位运算表示节点的类型和特征。

## 函数签名

```typescript
function renderVNode(
  push: PushFn,
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null,
  slotScopeId?: string
): void
```

函数接收 push 函数、虚拟节点、父组件实例和 slot scope ID。

## 类型分发

`renderVNode` 的核心逻辑是根据类型分发：

```typescript
function renderVNode(
  push: PushFn,
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null,
  slotScopeId?: string
) {
  const { type, shapeFlag, children } = vnode
  
  switch (type) {
    case Text:
      // 文本节点
      push(escapeHtml(children as string))
      break
    case Comment:
      // 注释节点
      push(children ? `<!--${children}-->` : `<!---->`)
      break
    case Static:
      // 静态节点
      push(children as string)
      break
    case Fragment:
      // Fragment
      renderVNodeChildren(push, children, parentComponent, slotScopeId)
      break
    default:
      if (shapeFlag & ShapeFlags.ELEMENT) {
        renderElementVNode(push, vnode, parentComponent, slotScopeId)
      } else if (shapeFlag & ShapeFlags.COMPONENT) {
        push(renderComponentVNode(vnode, parentComponent, slotScopeId))
      } else if (shapeFlag & ShapeFlags.TELEPORT) {
        renderTeleportVNode(push, vnode, parentComponent, slotScopeId)
      } else if (shapeFlag & ShapeFlags.SUSPENSE) {
        renderSuspenseVNode(push, vnode, parentComponent, slotScopeId)
      }
  }
}
```

## 特殊类型节点

Text、Comment、Static、Fragment 是特殊的节点类型，它们不是通过 `shapeFlag` 判断的。

**文本节点**的处理很简单，转义后直接输出：

```typescript
case Text:
  push(escapeHtml(children as string))
  break
```

转义是必要的，防止用户输入中的特殊字符破坏 HTML 结构：

```javascript
// 用户输入
const userInput = '<script>alert("xss")</script>'

// 渲染为文本节点
push(escapeHtml(userInput))
// 输出: &lt;script&gt;alert("xss")&lt;/script&gt;
```

**注释节点**生成 HTML 注释：

```typescript
case Comment:
  push(children ? `<!--${children}-->` : `<!---->`)
  break
```

注释节点在 SSR 中有特殊用途。Vue 用空注释作为占位符，标记动态内容的位置：

```html
<!-- 条件渲染时，v-if 为 false 会渲染空注释 -->
<div>
  <!---->
  <span>visible content</span>
</div>
```

**静态节点**直接输出内容：

```typescript
case Static:
  push(children as string)
  break
```

静态节点的内容是编译时生成的 HTML 字符串，不需要运行时处理：

```javascript
// 编译器生成
const _hoisted_1 = /*#__PURE__*/ createStaticVNode('<div class="static">...</div>')
```

**Fragment**渲染其子节点：

```typescript
case Fragment:
  renderVNodeChildren(push, children, parentComponent, slotScopeId)
  break
```

Fragment 本身不生成任何 HTML，只是一个容器。

## 元素节点

元素节点通过 `shapeFlag` 判断：

```typescript
if (shapeFlag & ShapeFlags.ELEMENT) {
  renderElementVNode(push, vnode, parentComponent, slotScopeId)
}
```

位运算 `&` 用于检查标志位。如果 `shapeFlag` 包含 `ELEMENT` 标志，条件为真。

## 组件节点

组件节点的处理稍复杂：

```typescript
if (shapeFlag & ShapeFlags.COMPONENT) {
  push(renderComponentVNode(vnode, parentComponent, slotScopeId))
}
```

注意这里用的是 `ShapeFlags.COMPONENT`，它同时匹配有状态组件和函数式组件：

```typescript
COMPONENT = STATEFUL_COMPONENT | FUNCTIONAL_COMPONENT
```

`renderComponentVNode` 返回的是 Promise 或字符串，push 函数需要处理这两种情况。

## 内置组件

Teleport 和 Suspense 是 Vue 的内置组件，它们有特殊的渲染逻辑：

```typescript
if (shapeFlag & ShapeFlags.TELEPORT) {
  renderTeleportVNode(push, vnode, parentComponent, slotScopeId)
} else if (shapeFlag & ShapeFlags.SUSPENSE) {
  renderSuspenseVNode(push, vnode, parentComponent, slotScopeId)
}
```

这些我们会在后续章节详细分析。

## 子节点渲染

`renderVNodeChildren` 处理子节点数组：

```typescript
function renderVNodeChildren(
  push: PushFn,
  children: VNode['children'],
  parentComponent: ComponentInternalInstance | null,
  slotScopeId?: string
) {
  if (typeof children === 'string') {
    push(escapeHtml(children))
  } else if (Array.isArray(children)) {
    for (let i = 0; i < children.length; i++) {
      renderVNode(push, normalizeVNode(children[i]), parentComponent, slotScopeId)
    }
  }
}
```

子节点可能是字符串或数组。如果是字符串，转义后输出；如果是数组，遍历渲染每个子节点。

## 节点规范化

`normalizeVNode` 确保子节点是标准的 VNode 格式：

```typescript
function normalizeVNode(child: VNode | string | number | boolean | null) {
  if (child == null || typeof child === 'boolean') {
    // null、undefined、boolean 渲染为注释
    return createVNode(Comment)
  } else if (typeof child === 'string' || typeof child === 'number') {
    // 字符串和数字转换为文本节点
    return createVNode(Text, null, String(child))
  } else if (Array.isArray(child)) {
    // 数组包装为 Fragment
    return createVNode(Fragment, null, child)
  } else {
    // 已经是 VNode
    return child
  }
}
```

这个函数处理各种边界情况，确保后续渲染逻辑的一致性。

## 异步处理

当遇到异步组件时，`renderVNode` 需要等待：

```typescript
async function renderVNodeAsync(
  push: PushFn,
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null,
  slotScopeId?: string
) {
  // ... 同步类型的处理 ...
  
  if (shapeFlag & ShapeFlags.COMPONENT) {
    const result = renderComponentVNode(vnode, parentComponent, slotScopeId)
    if (isPromise(result)) {
      push(await result)
    } else {
      push(result)
    }
  }
}
```

这就是为什么 `renderToString` 返回 Promise 的原因之一。

## 递归渲染

虚拟 DOM 是树形结构，渲染过程是递归的：

```
renderVNode(div)
  └─ renderElementVNode(div)
       └─ renderVNodeChildren([h1, p])
            ├─ renderVNode(h1)
            │    └─ renderElementVNode(h1)
            │         └─ renderVNodeChildren('Title')
            └─ renderVNode(p)
                 └─ renderElementVNode(p)
                      └─ renderVNodeChildren('Content')
```

每个节点的渲染可能触发子节点的渲染，形成深度优先的遍历。

## 性能考量

递归渲染有栈深度限制。对于非常深的组件树，可能遇到栈溢出。Vue 通过以下方式缓解：

尾调用优化。某些情况下，编译器生成的代码可以利用尾调用优化。

扁平化处理。Fragment 和多个相邻元素会被扁平化处理，减少递归深度。

异步分片。流式渲染时，可以在适当的位置"暂停"，避免长时间占用调用栈。

## 调试支持

开发模式下，`renderVNode` 会添加调试信息：

```typescript
if (__DEV__) {
  // 添加组件边界注释，方便调试
  if (shapeFlag & ShapeFlags.COMPONENT) {
    push(`<!--[${vnode.type.__name || 'Anonymous'}]-->`)
    // ... 渲染组件 ...
    push(`<!--[/${vnode.type.__name || 'Anonymous'}]-->`)
  }
}
```

这些注释帮助开发者在查看 HTML 时识别组件边界。

## 小结

`renderVNode` 是 SSR 渲染的调度中心：

1. 接收虚拟节点，根据类型分发
2. Text/Comment/Static/Fragment 直接处理
3. 元素节点委托给 `renderElementVNode`
4. 组件节点委托给 `renderComponentVNode`
5. 内置组件有专门的处理函数
6. 递归处理形成深度优先遍历

理解了 `renderVNode`，就理解了 SSR 渲染的核心调度逻辑。在下一章中，我们将分析 `renderChildren`，深入了解子节点的渲染处理。
