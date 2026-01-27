# genSlotOutlet 插槽出口生成

插槽出口生成处理 `<slot>` 元素，生成 renderSlot 调用。

## SlotOutletNode 结构

```typescript
interface SlotOutletNode extends BaseElementNode {
  tagType: ElementTypes.SLOT
  codegenNode: RenderSlotCall
}

interface RenderSlotCall extends CallExpression {
  callee: typeof RENDER_SLOT
  arguments: [
    string,                    // $slots
    string | ExpressionNode,   // slot name
    PropsExpression?,          // slot props
    TemplateChildNode[]?       // fallback
  ]
}
```

## 生成过程

```typescript
// SlotOutletNode 的 codegenNode 是 CallExpression
// 通过 genCallExpression 生成
case NodeTypes.JS_CALL_EXPRESSION:
  genCallExpression(node, context)
  break
```

## 默认插槽

```html
<!-- 子组件 -->
<slot></slot>
```

```typescript
_renderSlot(_ctx.$slots, "default")
```

## 具名插槽

```html
<slot name="header"></slot>
```

```typescript
_renderSlot(_ctx.$slots, "header")
```

## 动态插槽名

```html
<slot :name="slotName"></slot>
```

```typescript
_renderSlot(_ctx.$slots, _ctx.slotName)
```

## 作用域插槽

```html
<slot :user="user" :count="count"></slot>
```

```typescript
_renderSlot(_ctx.$slots, "default", {
  user: _ctx.user,
  count: _ctx.count
})
```

## 后备内容

```html
<slot>
  <p>Default content</p>
</slot>
```

```typescript
_renderSlot(_ctx.$slots, "default", {}, () => [
  _createElementVNode("p", null, "Default content")
])
```

## renderSlot 实现

```typescript
export function renderSlot(
  slots: Slots,
  name: string,
  props: Record<string, unknown> = {},
  fallback?: () => VNode[],
  noSlotted?: boolean
): VNode {
  let slot = slots[name]

  // 调用插槽函数或后备函数
  const validSlotContent = slot && slot(props)
  const rendered = validSlotContent || (fallback ? fallback() : [])

  // 包装为 Fragment
  return createVNode(
    Fragment,
    { key: props.key || `_${name}` },
    rendered,
    rendered.length ? PatchFlags.STABLE_FRAGMENT : PatchFlags.BAIL
  )
}
```

## 完整示例

```html
<!-- 子组件定义 -->
<template>
  <div class="card">
    <header>
      <slot name="header" :title="title">
        <h3>{{ title }}</h3>
      </slot>
    </header>
    <main>
      <slot :data="data"></slot>
    </main>
  </div>
</template>
```

```typescript
_createElementVNode("div", { class: "card" }, [
  _createElementVNode("header", null, [
    _renderSlot(_ctx.$slots, "header", { title: _ctx.title }, () => [
      _createElementVNode("h3", null, _toDisplayString(_ctx.title), 1)
    ])
  ]),
  _createElementVNode("main", null, [
    _renderSlot(_ctx.$slots, "default", { data: _ctx.data })
  ])
])
```

## Props 合并

```html
<slot v-bind="slotProps" :extra="extra"></slot>
```

```typescript
_renderSlot(_ctx.$slots, "default",
  _mergeProps(_ctx.slotProps, { extra: _ctx.extra }))
```

## $slots 访问

```typescript
// setup 中
const slots = useSlots()

// 模板编译后通过 _ctx.$slots 访问
_ctx.$slots
```

## 条件插槽

```html
<slot v-if="showSlot" name="optional"></slot>
```

```typescript
_ctx.showSlot
  ? _renderSlot(_ctx.$slots, "optional")
  : _createCommentVNode("v-if", true)
```

## 小结

插槽出口生成的关键点：

1. **renderSlot**：运行时插槽渲染
2. **$slots 对象**：插槽函数集合
3. **作用域传递**：props 参数传递数据
4. **后备函数**：提供默认内容

下一章将进入编译优化部分。
