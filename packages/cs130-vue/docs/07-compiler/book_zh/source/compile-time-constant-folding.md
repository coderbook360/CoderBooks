# 编译时常量折叠

常量折叠（Constant Folding）在编译时计算静态表达式，减少运行时开销。

## 常量类型判断

```typescript
export const enum ConstantTypes {
  NOT_CONSTANT = 0,     // 非常量
  CAN_SKIP_PATCH = 1,   // 可跳过 patch
  CAN_HOIST = 2,        // 可提升
  CAN_STRINGIFY = 3     // 可字符串化
}

function getConstantType(
  node: TemplateChildNode | SimpleExpressionNode,
  context: TransformContext
): ConstantTypes {
  switch (node.type) {
    case NodeTypes.TEXT:
      return ConstantTypes.CAN_STRINGIFY

    case NodeTypes.SIMPLE_EXPRESSION:
      return node.constType

    case NodeTypes.INTERPOLATION:
      return getConstantType(node.content, context)

    case NodeTypes.COMPOUND_EXPRESSION:
      let returnType = ConstantTypes.CAN_STRINGIFY
      for (const child of node.children) {
        if (isString(child) || isSymbol(child)) continue
        const childType = getConstantType(child, context)
        if (childType === ConstantTypes.NOT_CONSTANT) {
          return ConstantTypes.NOT_CONSTANT
        }
        if (childType < returnType) {
          returnType = childType
        }
      }
      return returnType
  }
  return ConstantTypes.NOT_CONSTANT
}
```

## 静态表达式标记

```typescript
function parseExpressionNode(
  node: DirectiveNode,
  context: TransformContext
): ExpressionNode {
  const { exp } = node
  
  // 判断是否为常量
  if (isStaticExp(exp)) {
    return createSimpleExpression(
      exp.content,
      true,  // isStatic
      exp.loc,
      ConstantTypes.CAN_STRINGIFY
    )
  }

  // 尝试分析常量性
  if (isLiteralExpression(exp.content)) {
    return createSimpleExpression(
      exp.content,
      false,
      exp.loc,
      ConstantTypes.CAN_HOIST
    )
  }

  return exp
}
```

## 文字常量

```typescript
function isLiteralExpression(content: string): boolean {
  // 数字字面量
  if (/^\d/.test(content)) return true
  
  // 字符串字面量
  if (/^['"]/.test(content)) return true
  
  // 布尔字面量
  if (content === 'true' || content === 'false') return true
  
  // null/undefined
  if (content === 'null' || content === 'undefined') return true
  
  return false
}
```

## Props 常量折叠

```html
<div :data-value="123" :data-name="'static'"></div>
```

```typescript
// 编译结果：直接使用字面量
_createElementVNode("div", {
  "data-value": 123,
  "data-name": "static"
})
```

## 静态 Class 合并

```html
<div class="static" :class="{ active: isActive }"></div>
```

```typescript
// 编译时：静态部分预处理
_createElementVNode("div", {
  class: _normalizeClass(["static", { active: _ctx.isActive }])
}, null, 2 /* CLASS */)
```

## 静态 Style 合并

```html
<div style="color: red" :style="{ fontSize: size + 'px' }"></div>
```

```typescript
_createElementVNode("div", {
  style: _normalizeStyle([
    { color: "red" },
    { fontSize: _ctx.size + 'px' }
  ])
}, null, 4 /* STYLE */)
```

## 字符串化优化

```typescript
function stringifyNode(
  node: ElementNode | string,
  context: TransformContext
): string {
  if (isString(node)) return node

  const { tag, props, children } = node
  let result = `<${tag}`

  // 序列化属性
  if (props) {
    for (const prop of props) {
      if (prop.type === NodeTypes.ATTRIBUTE) {
        result += ` ${prop.name}="${prop.value?.content || ''}"`
      }
    }
  }

  result += '>'

  // 序列化子节点
  if (children) {
    for (const child of children) {
      result += stringifyNode(child, context)
    }
  }

  result += `</${tag}>`
  return result
}
```

## innerHTML 优化

```html
<!-- 大量静态内容 -->
<div>
  <p>Paragraph 1</p>
  <p>Paragraph 2</p>
  <!-- ...更多静态内容 -->
</div>
```

```typescript
// 编译为 innerHTML
const _hoisted_1 = /*#__PURE__*/_createStaticVNode(
  '<p>Paragraph 1</p><p>Paragraph 2</p>',
  2  // 子节点数量
)

function render(_ctx) {
  return (_openBlock(), _createElementBlock("div", null, [
    _hoisted_1
  ]))
}
```

## createStaticVNode

```typescript
export function createStaticVNode(
  content: string,
  numberOfNodes: number
): VNode {
  const vnode = createVNode(Static, null, content)
  vnode.staticCount = numberOfNodes
  return vnode
}
```

## 启用条件

```typescript
// 静态节点数量阈值
const stringifyThreshold = 20

function shouldStringify(node: ElementNode): boolean {
  // 统计静态节点数量
  let count = 0
  walk(node, () => count++)
  return count >= stringifyThreshold
}
```

## 小结

常量折叠的关键点：

1. **常量类型分析**：判断表达式是否可在编译时计算
2. **字面量处理**：数字、字符串、布尔值
3. **静态合并**：class 和 style 预处理
4. **字符串化**：大量静态内容转为 innerHTML

下一章将进入 SFC 编译部分。
