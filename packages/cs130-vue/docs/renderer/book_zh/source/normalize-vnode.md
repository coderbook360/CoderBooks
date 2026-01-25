# normalizeVNode 规范化

`normalizeVNode` 将各种类型的 children 规范化为标准 VNode。它处理文本、数字、布尔值等非 VNode 类型。

## 函数签名

```typescript
function normalizeVNode(child: VNodeChild): VNode
```

`VNodeChild` 可以是多种类型：

```typescript
type VNodeChild =
  | VNode
  | string
  | number
  | boolean
  | null
  | undefined
  | VNodeArrayChildren
```

## 实现

```typescript
function normalizeVNode(child: VNodeChild): VNode {
  if (child == null || typeof child === 'boolean') {
    // null、undefined、布尔值 -> 注释节点
    return createVNode(Comment)
  } else if (isArray(child)) {
    // 数组 -> Fragment
    return createVNode(Fragment, null, child.slice())
  } else if (typeof child === 'object') {
    // 已经是 VNode
    return cloneIfMounted(child)
  } else {
    // 字符串或数字 -> 文本节点
    return createVNode(Text, null, String(child))
  }
}
```

## 各情况处理

### null / undefined / boolean

```typescript
normalizeVNode(null)      // -> Comment VNode
normalizeVNode(undefined) // -> Comment VNode
normalizeVNode(false)     // -> Comment VNode
normalizeVNode(true)      // -> Comment VNode
```

这些值渲染为注释节点，在 DOM 中表现为 `<!---->`。这保留了位置信息，对 v-if 的条件切换很重要。

### 字符串和数字

```typescript
normalizeVNode('hello')  // -> Text VNode
normalizeVNode(42)       // -> Text VNode with '42'
```

转换为 Text VNode：

```typescript
createVNode(Text, null, 'hello')
```

### 数组

```typescript
normalizeVNode([vnode1, vnode2])
// -> Fragment VNode with children
```

使用 `child.slice()` 创建副本，避免修改原数组。

### VNode

```typescript
normalizeVNode(existingVNode)
// -> 返回原 VNode 或克隆
```

如果 VNode 已挂载（有 `el`），需要克隆以避免状态污染：

```typescript
function cloneIfMounted(child: VNode): VNode {
  return child.el === null ? child : cloneVNode(child)
}
```

## 使用场景

### mountChildren

挂载子节点时规范化每个 child：

```typescript
function mountChildren(
  children: VNodeArrayChildren,
  container: RendererElement,
  anchor: RendererNode | null,
  parentComponent: ComponentInternalInstance | null
) {
  for (let i = 0; i < children.length; i++) {
    // 规范化
    const child = (children[i] = normalizeVNode(children[i]))
    // 挂载
    patch(null, child, container, anchor, parentComponent)
  }
}
```

### patchChildren

更新子节点时同样需要规范化：

```typescript
function patchKeyedChildren(
  c1: VNode[],
  c2: VNodeArrayChildren,
  container: RendererElement
) {
  // ...
  for (let i = 0; i < c2.length; i++) {
    const next = (c2[i] = normalizeVNode(c2[i]))
    // ...
  }
}
```

### 渲染插槽

组件渲染插槽内容时：

```typescript
function renderSlot(
  slots: Slots,
  name: string,
  props: Data = {}
): VNode {
  const slot = slots[name]
  if (slot) {
    const slotContent = slot(props)
    // 规范化插槽返回值
    return normalizeVNode(slotContent)
  }
  return createVNode(Comment)
}
```

## 与 normalizeChildren 的区别

`normalizeVNode` 处理单个 child，`normalizeChildren` 处理整个 children 并更新 shapeFlag：

```typescript
function normalizeChildren(vnode: VNode, children: unknown) {
  let type = 0
  
  if (children == null) {
    children = null
  } else if (isArray(children)) {
    type = ShapeFlags.ARRAY_CHILDREN
  } else if (typeof children === 'object') {
    type = ShapeFlags.SLOTS_CHILDREN
  } else if (isFunction(children)) {
    children = { default: children }
    type = ShapeFlags.SLOTS_CHILDREN
  } else {
    children = String(children)
    type = ShapeFlags.TEXT_CHILDREN
  }
  
  vnode.children = children
  vnode.shapeFlag |= type
}
```

## 性能考虑

规范化有开销，所以：

1. **延迟规范化**：在实际需要时才调用，而非 createVNode 时
2. **避免重复**：已是 VNode 的直接返回（或克隆）
3. **批量处理**：mountChildren 中就地修改数组

```typescript
// 就地修改，避免创建新数组
for (let i = 0; i < children.length; i++) {
  children[i] = normalizeVNode(children[i])
}
```

## 边界情况

### Symbol 类型

Symbol 需要转为字符串：

```typescript
normalizeVNode(Symbol('test'))
// -> Text VNode with 'Symbol(test)'
```

### 大数字

BigInt 类型：

```typescript
normalizeVNode(BigInt(9007199254740991))
// -> Text VNode with '9007199254740991'
```

## 开发模式检查

```typescript
if (__DEV__) {
  if (child != null && !isVNode(child) && !isString(child) && 
      !isNumber(child) && !isBoolean(child) && child !== null) {
    warn(`Invalid VNode child: ${child}`)
  }
}
```

## 小结

`normalizeVNode` 是渲染流程中的关键函数，将各种类型的值转换为统一的 VNode 格式。它让开发者可以灵活地使用字符串、数字、数组等作为 children，渲染器统一处理。
