# 静态节点与注释节点

除了常规的元素和组件，Vue 还处理两种特殊节点：静态节点和注释节点。它们的处理方式相对简单，但对性能优化和开发体验都很重要。

## Static 静态节点

静态节点是内容完全不变的节点，可以跳过后续的 diff。

### 静态提升

编译器会提升静态内容：

```vue
<template>
  <div>
    <span>Static Text</span>
    <span>{{ dynamic }}</span>
  </div>
</template>
```

编译后：

```javascript
// 静态节点被提升到模块作用域
const _hoisted_1 = /*#__PURE__*/_createElementVNode("span", null, "Static Text", -1 /* HOISTED */)

export function render(_ctx) {
  return (_openBlock(), _createElementBlock("div", null, [
    _hoisted_1,
    _createElementVNode("span", null, _toDisplayString(_ctx.dynamic), 1 /* TEXT */)
  ]))
}
```

### Static 类型定义

```typescript
export const Static = Symbol(__DEV__ ? 'Static' : undefined) as any as {
  __isStatic: true
  new (): {
    $props: VNodeProps
  }
}
```

### 静态节点处理

```typescript
const patch = (n1, n2, container, anchor, ...) => {
  const { type } = n2
  
  switch (type) {
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

### mountStaticNode

```typescript
const mountStaticNode = (
  n2: VNode,
  container: RendererElement,
  anchor: RendererNode | null,
  isSVG: boolean
) => {
  // 静态节点直接使用 innerHTML
  ;[n2.el, n2.anchor] = hostInsertStaticContent!(
    n2.children as string,
    container,
    anchor,
    isSVG,
    n2.el,
    n2.anchor
  )
}
```

### insertStaticContent 实现

```typescript
insertStaticContent(content, parent, anchor, isSVG, start, end) {
  const before = anchor ? anchor.previousSibling : parent.lastChild
  
  if (start && (start === end || start.nextSibling)) {
    // 已有节点，直接复用
    while (true) {
      parent.insertBefore(start!.cloneNode(true), anchor)
      if (start === end || !(start = start!.nextSibling)) break
    }
  } else {
    // 使用 template 解析 HTML
    templateContainer.innerHTML = isSVG ? `<svg>${content}</svg>` : content
    const template = templateContainer.content
    
    if (isSVG) {
      const wrapper = template.firstChild!
      while (wrapper.firstChild) {
        template.appendChild(wrapper.firstChild)
      }
      template.removeChild(wrapper)
    }
    
    parent.insertBefore(template, anchor)
  }
  
  return [
    before ? before.nextSibling : parent.firstChild,
    anchor ? anchor.previousSibling : parent.lastChild
  ]
}
```

### 开发环境的热更新

```typescript
if (__DEV__) {
  patchStaticNode(n1, n2, container, isSVG)
}

const patchStaticNode = (n1, n2, container, isSVG) => {
  // 只在开发环境支持静态节点热更新
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

## Comment 注释节点

注释节点用于占位和调试。

### Comment 定义

```typescript
export const Comment = Symbol(__DEV__ ? 'Comment' : undefined) as any as {
  __isComment: true
  new (): {
    $props: VNodeProps
  }
}
```

### 创建注释 VNode

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

### 注释节点处理

```typescript
const patch = (n1, n2, container, anchor, ...) => {
  switch (type) {
    case Comment:
      processCommentNode(n1, n2, container, anchor)
      break
    // ...
  }
}

const processCommentNode = (
  n1: VNode | null,
  n2: VNode,
  container: RendererElement,
  anchor: RendererNode | null
) => {
  if (n1 == null) {
    // 创建注释节点
    hostInsert(
      (n2.el = hostCreateComment((n2.children as string) || '')),
      container,
      anchor
    )
  } else {
    // 复用，注释内容不更新
    n2.el = n1.el
  }
}
```

### v-if 的注释占位

```vue
<template>
  <div v-if="show">Content</div>
</template>
```

当 show 为 false 时：

```javascript
export function render(_ctx) {
  return (_ctx.show)
    ? (_openBlock(), _createElementBlock("div", { key: 0 }, "Content"))
    : _createCommentVNode("v-if", true)
}
```

生成的 DOM：

```html
<!--v-if-->
```

### v-show 与 v-if 的区别

```vue
<!-- v-if: 使用注释节点占位 -->
<!--v-if-->

<!-- v-show: 元素始终存在，只是 display: none -->
<div style="display: none;">Content</div>
```

## Text 文本节点

纯文本节点的处理：

```typescript
export const Text = Symbol(__DEV__ ? 'Text' : undefined) as any as {
  __isText: true
  new (): {
    $props: VNodeProps
  }
}

const processText = (
  n1: VNode | null,
  n2: VNode,
  container: RendererElement,
  anchor: RendererNode | null
) => {
  if (n1 == null) {
    hostInsert(
      (n2.el = hostCreateText(n2.children as string)),
      container,
      anchor
    )
  } else {
    const el = (n2.el = n1.el!)
    if (n2.children !== n1.children) {
      hostSetText(el, n2.children as string)
    }
  }
}
```

### createTextVNode

```typescript
export function createTextVNode(text: string = ' ', flag: number = 0): VNode {
  return createVNode(Text, null, text, flag)
}
```

## 节点类型对比

```typescript
// 类型检查顺序
switch (type) {
  case Text:
    processText(n1, n2, container, anchor)
    break
  case Comment:
    processCommentNode(n1, n2, container, anchor)
    break
  case Static:
    if (n1 == null) {
      mountStaticNode(n2, container, anchor, isSVG)
    }
    break
  case Fragment:
    processFragment(...)
    break
  default:
    if (shapeFlag & ShapeFlags.ELEMENT) {
      processElement(...)
    } else if (shapeFlag & ShapeFlags.COMPONENT) {
      processComponent(...)
    } else if (shapeFlag & ShapeFlags.TELEPORT) {
      ;(type as typeof TeleportImpl).process(...)
    } else if (__FEATURE_SUSPENSE__ && shapeFlag & ShapeFlags.SUSPENSE) {
      ;(type as typeof SuspenseImpl).process(...)
    }
}
```

## 特殊节点的卸载

```typescript
const unmount = (vnode, parentComponent, parentSuspense, doRemove, optimized) => {
  const { type, el, anchor } = vnode

  if (type === Static) {
    if (doRemove) {
      removeStaticNode(vnode)
    }
    return
  }
  
  // 其他类型...
  
  if (doRemove) {
    hostRemove(el!)
  }
}

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

## 性能优势

静态节点的性能优势：

1. **内存优化**：静态 VNode 只创建一次
2. **跳过 diff**：patchFlag 为 -1 时完全跳过
3. **批量插入**：使用 innerHTML 一次性插入

```javascript
// 静态内容，patchFlag = -1 (HOISTED)
const _hoisted_1 = /*#__PURE__*/_createElementVNode("div", null, [
  _createElementVNode("span", null, "Static"),
  _createElementVNode("span", null, "Content")
], -1)
```

## 小结

特殊节点处理的要点：

1. **Static**：静态提升，跳过 diff，innerHTML 批量插入
2. **Comment**：v-if 占位，开发调试信息
3. **Text**：纯文本节点，简单创建和更新
4. **Fragment**：多根节点容器，使用锚点定位

这些特殊节点类型是 Vue 3 高效渲染的基础。

下一章将分析异步组件的实现。
