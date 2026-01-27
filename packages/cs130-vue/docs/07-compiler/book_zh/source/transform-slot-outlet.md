# transformSlotOutlet 插槽出口转换

`transformSlotOutlet` 处理 `<slot>` 元素，将其转换为 `renderSlot` 调用。

## 函数结构

```typescript
export const transformSlotOutlet: NodeTransform = (node, context) => {
  if (isSlotOutlet(node)) {
    const { children, loc } = node
    const { slotName, slotProps } = processSlotOutlet(node, context)

    const slotArgs: CallExpression['arguments'] = [
      context.helper(RENDER_SLOT),
      '$slots',
      slotName,
      slotProps,
      children.length ? createFunctionExpression([], children, false, false, loc) : undefined,
    ]

    if (children.length) {
      slotArgs.push(
        createSimpleExpression(
          `_${context.helperString(FRAGMENT)}`,
          false,
          loc
        )
      )
    }

    node.codegenNode = createCallExpression(
      context.helper(RENDER_SLOT),
      slotArgs,
      loc
    )
  }
}
```

## isSlotOutlet 判断

```typescript
function isSlotOutlet(node: TemplateChildNode): node is SlotOutletNode {
  return node.type === NodeTypes.ELEMENT && node.tagType === ElementTypes.SLOT
}
```

只处理 `<slot>` 标签。

## processSlotOutlet

```typescript
function processSlotOutlet(
  node: SlotOutletNode,
  context: TransformContext
): { slotName: string | ExpressionNode; slotProps: PropsExpression | undefined } {
  let slotName: string | ExpressionNode = `"default"`
  let slotProps: PropsExpression | undefined = undefined

  const nonNameProps = []
  for (let i = 0; i < node.props.length; i++) {
    const p = node.props[i]
    if (p.type === NodeTypes.ATTRIBUTE) {
      if (p.value) {
        if (p.name === 'name') {
          slotName = JSON.stringify(p.value.content)
        } else {
          // 其他静态属性
          nonNameProps.push(p)
        }
      }
    } else {
      if (p.name === 'bind' && isStaticArgOf(p.arg, 'name')) {
        // :name="dynamicName"
        if (p.exp) slotName = p.exp
      } else {
        // 其他动态属性
        nonNameProps.push(p)
      }
    }
  }

  if (nonNameProps.length > 0) {
    const { props, directives } = buildProps(node, context, nonNameProps)
    slotProps = props

    if (directives.length) {
      context.onError(
        createCompilerError(
          ErrorCodes.X_V_SLOT_UNEXPECTED_DIRECTIVE_ON_SLOT_OUTLET,
          directives[0].loc
        )
      )
    }
  }

  return { slotName, slotProps }
}
```

## 插槽名称

```html
<!-- 默认插槽 -->
<slot></slot>
<!-- slotName = '"default"' -->

<!-- 具名插槽 -->
<slot name="header"></slot>
<!-- slotName = '"header"' -->

<!-- 动态名称 -->
<slot :name="dynamicName"></slot>
<!-- slotName = dynamicName 表达式 -->
```

## 插槽属性（作用域插槽）

```html
<slot :item="currentItem" :index="i"></slot>
```

处理后：

```typescript
slotProps = {
  type: NodeTypes.JS_OBJECT_EXPRESSION,
  properties: [
    { key: 'item', value: { content: 'currentItem' } },
    { key: 'index', value: { content: 'i' } }
  ]
}
```

## 后备内容

```html
<slot>
  <p>Default content</p>
</slot>
```

后备内容作为函数传递：

```typescript
renderSlot($slots, "default", {}, () => [
  createElementVNode("p", null, "Default content")
])
```

## 生成的代码

```typescript
// 简单插槽
<slot></slot>
→ renderSlot($slots, "default")

// 具名插槽
<slot name="header"></slot>
→ renderSlot($slots, "header")

// 作用域插槽
<slot :item="data" :index="i"></slot>
→ renderSlot($slots, "default", { item: data, index: i })

// 带后备内容
<slot>Fallback</slot>
→ renderSlot($slots, "default", {}, () => ["Fallback"])

// 动态名称
<slot :name="slotName"></slot>
→ renderSlot($slots, slotName)
```

## renderSlot 运行时

```typescript
export function renderSlot(
  slots: Slots,
  name: string,
  props: Data = {},
  fallback?: () => VNodeArrayChildren,
  noSlotted?: boolean
): VNode {
  let slot = slots[name]
  
  if (slot) {
    // 作用域插槽是函数
    if (isFunction(slot)) {
      return createBlock(
        Fragment,
        { key: props.key },
        slot(props),
        ...
      )
    } else {
      // 普通插槽是 VNode 数组
      return createBlock(Fragment, { key: props.key }, slot, ...)
    }
  } else if (fallback) {
    // 使用后备内容
    return createBlock(Fragment, { key: props.key }, fallback(), ...)
  }
  
  return createVNode(Comment)
}
```

## 禁止在 slot 上使用指令

```typescript
if (directives.length) {
  context.onError(
    createCompilerError(
      ErrorCodes.X_V_SLOT_UNEXPECTED_DIRECTIVE_ON_SLOT_OUTLET,
      directives[0].loc
    )
  )
}
```

`<slot>` 不能使用 v-if、v-for 等指令。需要时应该包装在 template 中：

```html
<!-- 错误 -->
<slot v-if="show" name="header"></slot>

<!-- 正确 -->
<template v-if="show">
  <slot name="header"></slot>
</template>
```

## 多个默认插槽出口

```html
<slot></slot>
<slot></slot>
```

这是允许的，两个都会渲染相同的默认插槽内容。

## 插槽与 key

```html
<slot :key="item.id" v-for="item in items"></slot>
```

这不被允许。应该使用：

```html
<template v-for="item in items">
  <slot :item="item" :key="item.id"></slot>
</template>
```

## 示例

```html
<!-- 组件定义 -->
<template>
  <div>
    <slot name="header" :title="title">
      <h1>Default Header</h1>
    </slot>
    <slot :items="list"></slot>
    <slot name="footer"></slot>
  </div>
</template>
```

转换后的代码：

```typescript
createElementVNode("div", null, [
  renderSlot($slots, "header", { title: title }, () => [
    createElementVNode("h1", null, "Default Header")
  ]),
  renderSlot($slots, "default", { items: list }),
  renderSlot($slots, "footer")
])
```

## 小结

transformSlotOutlet 将 `<slot>` 转换为 `renderSlot` 调用。它解析插槽名称（默认或具名，静态或动态）、收集属性（用于作用域插槽）、处理后备内容。指令不能直接用在 slot 上。生成的代码在运行时查找对应的插槽内容并渲染。
