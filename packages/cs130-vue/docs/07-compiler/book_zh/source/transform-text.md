# transformText 文本转换

`transformText` 处理相邻的文本和插值节点，将它们合并并优化。

## 函数结构

```typescript
export const transformText: NodeTransform = (node, context) => {
  if (
    node.type === NodeTypes.ROOT ||
    node.type === NodeTypes.ELEMENT ||
    node.type === NodeTypes.FOR ||
    node.type === NodeTypes.IF_BRANCH
  ) {
    // 在退出阶段处理
    return () => {
      const children = node.children
      let currentContainer: CompoundExpressionNode | undefined = undefined
      let hasText = false

      for (let i = 0; i < children.length; i++) {
        const child = children[i]
        if (isText(child)) {
          hasText = true
          for (let j = i + 1; j < children.length; j++) {
            const next = children[j]
            if (isText(next)) {
              if (!currentContainer) {
                currentContainer = children[i] = createCompoundExpression(
                  [child],
                  child.loc
                )
              }
              currentContainer.children.push(` + `, next)
              children.splice(j, 1)
              j--
            } else {
              currentContainer = undefined
              break
            }
          }
        }
      }

      if (
        !hasText ||
        (children.length === 1 &&
          (node.type === NodeTypes.ROOT ||
            (node.type === NodeTypes.ELEMENT &&
              node.tagType === ElementTypes.ELEMENT &&
              !node.props.find(
                p =>
                  p.type === NodeTypes.DIRECTIVE &&
                  !context.directiveTransforms[p.name]
              ) &&
              !isVoidTag(node.tag))))
      ) {
        return
      }

      // 为每个文本生成 createTextVNode 调用
      for (let i = 0; i < children.length; i++) {
        const child = children[i]
        if (isText(child) || child.type === NodeTypes.COMPOUND_EXPRESSION) {
          const callArgs: CallExpression['arguments'] = []
          if (child.type !== NodeTypes.TEXT || child.content !== ' ') {
            callArgs.push(child)
          }
          if (!context.ssr && getConstantType(child, context) === ConstantTypes.NOT_CONSTANT) {
            callArgs.push(
              PatchFlags.TEXT + (__DEV__ ? ` /* ${PatchFlagNames[PatchFlags.TEXT]} */` : ``)
            )
          }
          children[i] = {
            type: NodeTypes.TEXT_CALL,
            content: child,
            loc: child.loc,
            codegenNode: createCallExpression(
              context.helper(CREATE_TEXT),
              callArgs
            )
          }
        }
      }
    }
  }
}
```

## isText 判断

```typescript
function isText(node: TemplateChildNode): node is TextNode | InterpolationNode {
  return node.type === NodeTypes.INTERPOLATION || node.type === NodeTypes.TEXT
}
```

文本节点和插值节点都被视为"文本"。

## 合并相邻文本

```html
Hello {{ name }}!
```

解析产生三个节点：

```typescript
[
  { type: TEXT, content: 'Hello ' },
  { type: INTERPOLATION, content: { content: 'name' } },
  { type: TEXT, content: '!' }
]
```

转换后合并为一个复合表达式：

```typescript
{
  type: COMPOUND_EXPRESSION,
  children: [
    { type: TEXT, content: 'Hello ' },
    ' + ',
    { type: INTERPOLATION, ... },
    ' + ',
    { type: TEXT, content: '!' }
  ]
}
```

## 创建复合表达式

```typescript
function createCompoundExpression(
  children: CompoundExpressionNode['children'],
  loc: SourceLocation
): CompoundExpressionNode {
  return {
    type: NodeTypes.COMPOUND_EXPRESSION,
    loc,
    children
  }
}
```

复合表达式的 children 包含字符串连接运算符 ` + `。

## 跳过优化的情况

```typescript
if (
  !hasText ||
  (children.length === 1 &&
    (node.type === NodeTypes.ROOT ||
      (node.type === NodeTypes.ELEMENT &&
        node.tagType === ElementTypes.ELEMENT &&
        !node.props.find(/* 有运行时指令 */) &&
        !isVoidTag(node.tag))))
) {
  return
}
```

- 没有文本节点
- 只有一个子节点且是简单元素
- 这些情况不需要额外的 createTextVNode 包装

## 生成 TEXT_CALL

```typescript
children[i] = {
  type: NodeTypes.TEXT_CALL,
  content: child,
  loc: child.loc,
  codegenNode: createCallExpression(
    context.helper(CREATE_TEXT),
    callArgs
  )
}
```

TEXT_CALL 节点包装文本内容，生成 `createTextVNode` 调用。

## PatchFlag

```typescript
if (getConstantType(child, context) === ConstantTypes.NOT_CONSTANT) {
  callArgs.push(PatchFlags.TEXT + ...)
}
```

非常量文本添加 TEXT 标志，告诉运行时需要比较文本内容。

## 代码生成示例

```html
<div>Hello {{ name }}!</div>
```

生成：

```typescript
createElementVNode("div", null, 
  "Hello " + toDisplayString(name) + "!", 
  1 /* TEXT */
)
```

多个子节点时：

```html
<div>
  <span>A</span>
  Hello {{ name }}!
  <span>B</span>
</div>
```

生成：

```typescript
createElementVNode("div", null, [
  createElementVNode("span", null, "A"),
  createTextVNode("Hello " + toDisplayString(name) + "!", 1),
  createElementVNode("span", null, "B")
])
```

## 空白处理

```typescript
if (child.type !== NodeTypes.TEXT || child.content !== ' ') {
  callArgs.push(child)
}
```

单个空格不传递内容参数（使用默认空字符串）。

## 静态文本提升

静态文本会被提升：

```typescript
// 模板
<div>Static Text</div>

// 提升
const _hoisted_1 = createTextVNode("Static Text")

// 渲染
createElementVNode("div", null, _hoisted_1)
```

这在 hoistStatic 阶段处理。

## SSR 处理

```typescript
if (!context.ssr && ...) {
  callArgs.push(PatchFlags.TEXT + ...)
}
```

SSR 不需要 PatchFlag，因为没有 diff。

## 与 toDisplayString 的配合

插值需要 toDisplayString 转换：

```typescript
{{ value }}
→ toDisplayString(value)
```

这在代码生成阶段处理，transformText 不负责。

## 示例对比

```html
<!-- 单文本 -->
<div>Hello</div>
<!-- 不包装，直接作为 children -->

<!-- 文本 + 元素 -->
<div>Hello<span>World</span></div>
<!-- 需要包装 -->
→ [createTextVNode("Hello"), createElement("span", ...)]

<!-- 文本 + 插值 -->
<div>Hello {{ name }}</div>
<!-- 合并为复合表达式 -->
→ "Hello " + toDisplayString(name)

<!-- 多段文本 -->
<div>
  Hello
  {{ name }}
  World
</div>
<!-- 合并为一个复合表达式 -->
→ "Hello " + toDisplayString(name) + " World"
```

## 小结

transformText 合并相邻的文本和插值节点为复合表达式。当文本与其他类型节点混合时，生成 createTextVNode 调用。单个简单子节点的情况不需要包装。动态文本添加 TEXT PatchFlag。这些优化减少了运行时的节点数量和 diff 工作量。
