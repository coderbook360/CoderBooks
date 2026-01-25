# renderElementVNode 元素渲染

在 Vue 的虚拟 DOM 中，元素节点是最常见的类型。`renderElementVNode` 函数负责将元素类型的虚拟节点转换为 HTML 字符串。

## 元素渲染的基本结构

一个 HTML 元素由几部分组成：开标签、属性、子内容、闭标签。例如：

```html
<div class="container" id="app">
  <span>Hello</span>
</div>
```

`renderElementVNode` 需要生成这些部分的对应字符串。

## 函数签名

```typescript
function renderElementVNode(
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null,
  slotScopeId: string | undefined,
  context: SSRContext,
  push: PushFn
): void
```

与组件渲染不同，元素渲染通常是同步的，所以函数返回 void 而不是 Promise。

## 核心实现

让我们看一下简化的实现：

```typescript
function renderElementVNode(
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null,
  slotScopeId: string | undefined,
  context: SSRContext,
  push: PushFn
) {
  const { type: tag, props, children } = vnode
  
  // 输出开标签
  push(`<${tag}`)
  
  // 渲染属性
  if (props) {
    push(ssrRenderAttrs(props))
  }
  
  // 添加 scope ID（用于 scoped CSS）
  if (slotScopeId) {
    push(` ${slotScopeId}`)
  }
  
  push(`>`)
  
  // 检查是否是空元素
  if (isVoidTag(tag)) {
    return
  }
  
  // 渲染子内容
  if (children) {
    renderChildren(children, parentComponent, slotScopeId, context, push)
  }
  
  // 输出闭标签
  push(`</${tag}>`)
}
```

这个流程很直观：开标签、属性、子内容、闭标签。让我们详细分析每个部分。

## 开标签

开标签的生成很简单：

```typescript
push(`<${tag}`)
```

`tag` 就是元素的标签名，如 `div`、`span`、`button` 等。

## 属性渲染

属性渲染是相对复杂的部分，由 `ssrRenderAttrs` 函数处理：

```typescript
if (props) {
  push(ssrRenderAttrs(props))
}
```

`ssrRenderAttrs` 会处理各种类型的属性：普通属性、class、style、事件处理器等。我们会在后续章节详细分析这个函数。

这里值得注意的是，在 SSR 中，事件处理器（如 `onClick`）不会被渲染到 HTML 中。它们只在客户端水合时附加到元素上。

```javascript
// 虚拟节点
{
  type: 'button',
  props: {
    onClick: handleClick,  // 不会出现在 HTML 中
    class: 'btn',          // 会渲染为 class="btn"
    disabled: true         // 会渲染为 disabled
  }
}

// 生成的 HTML
<button class="btn" disabled>
```

## Scoped CSS 处理

如果组件使用了 scoped CSS，需要在元素上添加特殊的 scope ID：

```typescript
if (slotScopeId) {
  push(` ${slotScopeId}`)
}
```

这个 ID 会作为元素的属性，让 scoped CSS 选择器能够匹配：

```html
<!-- 原始模板 -->
<div class="container">

<!-- 渲染结果（带 scope ID） -->
<div class="container" data-v-7a9f4d22>
```

## 空元素处理

HTML 中有一些空元素（void elements），它们没有闭标签：

```typescript
const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr'
])

function isVoidTag(tag: string): boolean {
  return VOID_TAGS.has(tag)
}
```

对于空元素，渲染完开标签后就直接返回：

```typescript
if (isVoidTag(tag)) {
  return
}
```

::: v-pre
```html
<!-- 正确：空元素没有闭标签 -->
<img src="photo.jpg">
<br>
<input type="text">
```
:::

## 子内容渲染

子内容通过 `renderChildren` 渲染：

```typescript
if (children) {
  renderChildren(children, parentComponent, slotScopeId, context, push)
}
```

`renderChildren` 会处理不同类型的子内容：字符串、数组、单个虚拟节点等。我们会在后续章节分析这个函数。

## 闭标签

最后输出闭标签：

```typescript
push(`</${tag}>`)
```

## 特殊元素处理

某些元素需要特殊处理。

`<textarea>` 的内容应该设置为 value 属性的值：

```typescript
if (tag === 'textarea' && props?.value) {
  push(escapeHtml(props.value))
}
```

`<script>` 和 `<style>` 的内容不应该被 HTML 转义：

```typescript
if (tag === 'script' || tag === 'style') {
  // 直接输出内容，不转义
  if (children) {
    push(children)
  }
}
```

## innerHTML 和 textContent

如果元素有 `innerHTML` 或 `textContent` 属性，它们会替代子节点：

```typescript
if (props?.innerHTML) {
  push(props.innerHTML)
} else if (props?.textContent) {
  push(escapeHtml(props.textContent))
} else if (children) {
  renderChildren(children, ...)
}
```

`innerHTML` 直接输出不转义（使用时要注意 XSS 风险），`textContent` 会被转义。

## 性能优化

元素渲染的性能对整体 SSR 性能影响很大，因为页面中大部分节点都是元素。几个优化点：

字符串拼接优化。现代 JavaScript 引擎对模板字符串有很好的优化，`push(\`<${tag}>\`)` 比分多次 push 更高效。

属性渲染的缓存。对于静态属性，编译器会在编译时计算属性字符串，运行时直接使用：

```javascript
// 编译器优化：静态属性预计算
const _hoisted_1 = ' class="static-class" id="static-id"'

function ssrRender(_ctx, _push, ...) {
  _push(`<div${_hoisted_1}>`)  // 使用预计算的字符串
}
```

跳过不必要的处理。如果确定元素没有动态属性，可以跳过很多检查。

## 完整示例

让我们看一个完整的渲染示例：

```javascript
// 虚拟节点
const vnode = {
  type: 'div',
  props: {
    class: 'container',
    id: 'main'
  },
  children: [
    { type: 'h1', children: 'Title' },
    { type: 'p', props: { class: 'content' }, children: 'Hello World' }
  ]
}

// 渲染过程
push('<div')
push(' class="container" id="main"')  // ssrRenderAttrs 的结果
push('>')
// 渲染子节点
push('<h1>')
push('Title')
push('</h1>')
push('<p')
push(' class="content"')
push('>')
push('Hello World')
push('</p>')
// 闭标签
push('</div>')

// 最终结果
<div class="container" id="main"><h1>Title</h1><p class="content">Hello World</p></div>
```

## 小结

`renderElementVNode` 将元素虚拟节点转换为 HTML 字符串：

1. 输出开标签和标签名
2. 渲染属性（通过 ssrRenderAttrs）
3. 添加 scope ID（如果有）
4. 处理空元素（直接返回）
5. 渲染子内容
6. 输出闭标签

在下一章中，我们将分析通用的 `renderVNode` 函数，它是虚拟节点渲染的统一入口。
