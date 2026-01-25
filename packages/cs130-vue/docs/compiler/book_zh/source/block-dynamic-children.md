# Block 与 dynamicChildren 实现

Block Tree 是 Vue 3 的核心优化策略，通过收集动态节点跳过静态子树的 diff。

## Block 概念

```typescript
// 传统 diff：遍历整棵树
div
├── header (静态)
├── main
│   ├── p (静态)
│   └── span (动态 {{ text }})
└── footer (静态)

// Block Tree：只比较动态节点
Block(div)
└── dynamicChildren: [span]
```

## openBlock 与 createElementBlock

```typescript
// 当前 Block 栈
const blockStack: (VNode[] | null)[] = []
let currentBlock: VNode[] | null = null

export function openBlock(disableTracking = false) {
  blockStack.push(
    (currentBlock = disableTracking ? null : [])
  )
}

export function closeBlock() {
  blockStack.pop()
  currentBlock = blockStack[blockStack.length - 1] || null
}

export function createElementBlock(
  type: VNodeTypes,
  props?: Record<string, any>,
  children?: any,
  patchFlag?: number,
  dynamicProps?: string[]
) {
  return setupBlock(
    createBaseVNode(
      type,
      props,
      children,
      patchFlag,
      dynamicProps,
      ShapeFlags.ELEMENT,
      true /* isBlock */
    )
  )
}

function setupBlock(vnode: VNode) {
  vnode.dynamicChildren = currentBlock
  closeBlock()

  // 将自身添加到父 Block
  if (currentBlock) {
    currentBlock.push(vnode)
  }

  return vnode
}
```

## 动态节点收集

```typescript
export function createElementVNode(
  type: VNodeTypes,
  props?: Record<string, any>,
  children?: any,
  patchFlag?: number,
  dynamicProps?: string[]
) {
  const vnode = createBaseVNode(
    type,
    props,
    children,
    patchFlag,
    dynamicProps,
    ShapeFlags.ELEMENT
  )

  // 有 patchFlag 的节点是动态的
  if (patchFlag > 0 && currentBlock) {
    currentBlock.push(vnode)
  }

  return vnode
}
```

## 编译生成

```html
<div>
  <header>Static Header</header>
  <main>
    <p>Static paragraph</p>
    <span>{{ dynamicText }}</span>
  </main>
  <footer>Static Footer</footer>
</div>
```

```typescript
(_openBlock(), _createElementBlock("div", null, [
  _createElementVNode("header", null, "Static Header"),
  _createElementVNode("main", null, [
    _createElementVNode("p", null, "Static paragraph"),
    _createElementVNode("span", null, _toDisplayString(_ctx.dynamicText), 1 /* TEXT */)
  ]),
  _createElementVNode("footer", null, "Static Footer")
]))
```

## 运行时 patch

```typescript
function patchBlockChildren(
  oldChildren: VNode[],
  newChildren: VNode[],
  fallbackContainer: RendererElement
) {
  // 直接遍历 dynamicChildren
  for (let i = 0; i < newChildren.length; i++) {
    const oldVNode = oldChildren[i]
    const newVNode = newChildren[i]
    
    patch(
      oldVNode,
      newVNode,
      // 查找容器
      oldVNode.el!.parentNode as RendererElement
    )
  }
}

function patchElement(n1: VNode, n2: VNode) {
  const el = (n2.el = n1.el!)

  if (n2.dynamicChildren) {
    // Block 模式：只 patch 动态子节点
    patchBlockChildren(
      n1.dynamicChildren!,
      n2.dynamicChildren,
      el
    )
  } else {
    // 完整模式：遍历所有子节点
    patchChildren(n1, n2, el)
  }
}
```

## Block 边界

```html
<!-- 条件分支创建新 Block -->
<div v-if="show">
  <span>{{ a }}</span>
</div>
<div v-else>
  <span>{{ b }}</span>
</div>
```

```typescript
_ctx.show
  ? (_openBlock(), _createElementBlock("div", { key: 0 }, [
      _createElementVNode("span", null, _toDisplayString(_ctx.a), 1)
    ]))
  : (_openBlock(), _createElementBlock("div", { key: 1 }, [
      _createElementVNode("span", null, _toDisplayString(_ctx.b), 1)
    ]))
```

## disableTracking

```typescript
// v-for 禁用追踪
(_openBlock(true), _createElementBlock(_Fragment, null,
  _renderList(_ctx.items, (item) => {
    return (_openBlock(), _createElementBlock("div", ...))
  }), 128))
```

传入 `true` 表示不收集子节点到父 Block。

## setBlockTracking

```typescript
let isBlockTreeEnabled = 1

export function setBlockTracking(value: number) {
  isBlockTreeEnabled += value
}

// 在 createElementVNode 中
if (patchFlag > 0 && isBlockTreeEnabled > 0 && currentBlock) {
  currentBlock.push(vnode)
}
```

用于临时禁用 Block 追踪（如缓存 VNode）。

## 嵌套 Block

```html
<div v-if="a">
  <div v-if="b">
    {{ text }}
  </div>
</div>
```

```typescript
// 外层 Block
(_openBlock(), _createElementBlock("div", null, [
  // 内层 Block
  _ctx.b
    ? (_openBlock(), _createElementBlock("div", { key: 0 }, _toDisplayString(_ctx.text), 1))
    : _createCommentVNode("v-if", true)
]))
```

内层 Block 会被收集到外层 Block 的 dynamicChildren。

## 小结

Block 优化的关键点：

1. **动态收集**：有 patchFlag 的节点进入 dynamicChildren
2. **扁平化 diff**：跳过静态节点，直接 patch 动态节点
3. **Block 边界**：v-if/v-for 创建新 Block
4. **追踪控制**：disableTracking 和 setBlockTracking

下一章将分析编译时常量折叠优化。
