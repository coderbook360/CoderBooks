# SlotOutletNode 与 TemplateNode

插槽出口节点和模板节点是 Vue 组件插槽系统的 AST 表示，用于处理 `<slot>` 和带指令的 `<template>`。

## SlotOutletNode 结构

```typescript
export interface SlotOutletNode extends BaseElementNode {
  tagType: ElementTypes.SLOT
  codegenNode: SlotOutletCodegenNode | undefined
}

// slot 标签在解析时被识别
if (tag === 'slot') {
  return ElementTypes.SLOT
}
```

SlotOutletNode 实际上是 ElementNode 的一种特殊形式，通过 tagType 区分。

## slot 标签示例

```html
<!-- 默认插槽 -->
<slot></slot>

<!-- 具名插槽 -->
<slot name="header"></slot>

<!-- 作用域插槽 -->
<slot :item="item" :index="index"></slot>

<!-- 完整形式 -->
<slot name="content" :data="data">
  <p>默认内容</p>
</slot>
```

解析结果：
```typescript
{
  type: NodeTypes.ELEMENT,
  tag: 'slot',
  tagType: ElementTypes.SLOT,
  props: [
    { type: ATTRIBUTE, name: 'name', value: { content: 'header' } },
    { type: DIRECTIVE, name: 'bind', arg: { content: 'item' }, exp: { content: 'item' } }
  ],
  children: [...]
}
```

## TemplateNode 结构

```typescript
// template 标签带特定指令时被识别为 TEMPLATE 类型
if (
  tag === 'template' &&
  props.some(p => 
    p.type === NodeTypes.DIRECTIVE &&
    isSpecialTemplateDirective(p.name)
  )
) {
  return ElementTypes.TEMPLATE
}

function isSpecialTemplateDirective(name: string): boolean {
  return name === 'if' || name === 'else' || name === 'else-if' ||
         name === 'for' || name === 'slot'
}
```

只有带有 v-if、v-for 或 v-slot 的 template 才被视为 TEMPLATE 类型。

## v-slot 指令

```html
<!-- 组件使用 -->
<MyComponent>
  <template v-slot:header="{ title }">
    {{ title }}
  </template>
</MyComponent>

<!-- 缩写形式 -->
<MyComponent>
  <template #header="{ title }">
    {{ title }}
  </template>
</MyComponent>
```

v-slot 指令解析：
```typescript
{
  type: NodeTypes.DIRECTIVE,
  name: 'slot',
  arg: { content: 'header', isStatic: true },
  exp: { content: '{ title }' },
  modifiers: []
}
```

## 插槽转换

```typescript
export const transformSlotOutlet: NodeTransform = (node, context) => {
  if (isSlotOutlet(node)) {
    const { children, props } = node
    const { slotName, slotProps } = processSlotOutlet(node, context)

    node.codegenNode = {
      type: NodeTypes.JS_CALL_EXPRESSION,
      callee: context.helper(RENDER_SLOT),
      arguments: [
        context.helper(CONTEXT_SLOTS),
        slotName,
        slotProps || '{}',
        children.length ? createFunctionExpression(children) : undefined
      ].filter(Boolean)
    }
  }
}
```

## 代码生成

### slot 出口生成

```typescript
// <slot name="header" :item="item"></slot>
_renderSlot(_ctx.$slots, "header", { item: item })

// <slot>默认内容</slot>
_renderSlot(_ctx.$slots, "default", {}, () => [
  _createTextVNode("默认内容")
])
```

### v-slot 使用生成

```typescript
// <MyComponent>
//   <template #header="{ title }">{{ title }}</template>
// </MyComponent>

_createVNode(MyComponent, null, {
  header: _withCtx(({ title }) => [
    _toDisplayString(title)
  ]),
  _: 1 /* STABLE */
})
```

## 插槽稳定性标记

```typescript
export const enum SlotFlags {
  STABLE = 1,      // 静态插槽
  DYNAMIC = 2,     // 动态插槽
  FORWARDED = 3    // 转发插槽
}

// 静态 - 插槽内容不依赖作用域
{ _: SlotFlags.STABLE }

// 动态 - 插槽内容依赖父组件状态
{ _: SlotFlags.DYNAMIC }

// 转发 - 从父级转发的插槽
{ _: SlotFlags.FORWARDED }
```

稳定性标记影响组件更新时的插槽处理。

## 作用域插槽

```html
<!-- 父组件 -->
<List :items="items">
  <template #item="{ data, index }">
    <div>{{ index }}: {{ data.name }}</div>
  </template>
</List>

<!-- List 组件 -->
<template>
  <div v-for="(item, i) in items">
    <slot name="item" :data="item" :index="i"></slot>
  </div>
</template>
```

作用域插槽通过函数参数传递数据：
```typescript
// 编译后的插槽
{
  item: _withCtx(({ data, index }) => [
    _createVNode("div", null, index + ": " + data.name)
  ])
}
```

## 动态插槽名

```html
<template v-slot:[dynamicName]="scope">
  {{ scope }}
</template>
```

```typescript
// 动态插槽名
{
  type: DIRECTIVE,
  name: 'slot',
  arg: {
    content: 'dynamicName',
    isStatic: false  // 动态
  }
}

// 生成代码使用计算属性名
{
  [dynamicName]: _withCtx((scope) => [...])
}
```

## 多插槽处理

```html
<Layout>
  <template #header>Header</template>
  <template #default>Content</template>
  <template #footer>Footer</template>
</Layout>
```

```typescript
_createVNode(Layout, null, {
  header: _withCtx(() => [_createTextVNode("Header")]),
  default: _withCtx(() => [_createTextVNode("Content")]),
  footer: _withCtx(() => [_createTextVNode("Footer")]),
  _: 1
})
```

## withCtx 包装

```typescript
// withCtx 维护正确的渲染上下文
export function withCtx(
  fn: Slot,
  ctx: ComponentInternalInstance | null = currentRenderingInstance
): Slot {
  if (!ctx) return fn
  
  const renderFnWithContext: Slot = (...args) => {
    // 在插槽所有者的上下文中执行
    return fn(...args)
  }
  
  renderFnWithContext._c = ctx
  return renderFnWithContext
}
```

这确保插槽内容在正确的组件上下文中渲染。

## 小结

SlotOutletNode 与 TemplateNode 的设计：

1. **类型区分**：SLOT 和 TEMPLATE 是特殊的元素类型
2. **转换处理**：生成 renderSlot 或插槽对象
3. **作用域传递**：通过函数参数传递数据
4. **稳定性标记**：优化组件更新性能
5. **上下文维护**：withCtx 确保正确的渲染上下文

下一章将分析 transform 转换入口的实现。
