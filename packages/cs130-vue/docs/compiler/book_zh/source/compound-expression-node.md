# CompoundExpressionNode 复合表达式

复合表达式节点用于表示由多个部分组成的表达式，最常见的场景是相邻的文本和插值节点合并。

## 节点结构

```typescript
export interface CompoundExpressionNode extends Node {
  type: NodeTypes.COMPOUND_EXPRESSION
  children: (
    | SimpleExpressionNode
    | CompoundExpressionNode
    | InterpolationNode
    | TextNode
    | string
    | symbol
  )[]
}
```

复合表达式的 children 数组可以包含多种类型的子元素，包括表达式节点、插值节点、文本节点，以及字符串字面量和符号。

## 创建场景

```html
<div>Hello {{ name }}, you have {{ count }} messages.</div>
```

解析阶段生成三个独立节点：
```typescript
[
  { type: NodeTypes.TEXT, content: 'Hello ' },
  { type: NodeTypes.INTERPOLATION, content: { content: 'name' } },
  { type: NodeTypes.TEXT, content: ', you have ' },
  { type: NodeTypes.INTERPOLATION, content: { content: 'count' } },
  { type: NodeTypes.TEXT, content: ' messages.' }
]
```

转换阶段合并为复合表达式：
```typescript
{
  type: NodeTypes.COMPOUND_EXPRESSION,
  children: [
    '"Hello "',
    '+',
    { type: SIMPLE_EXPRESSION, content: '_toDisplayString(name)' },
    '+',
    '", you have "',
    '+',
    { type: SIMPLE_EXPRESSION, content: '_toDisplayString(count)' },
    '+',
    '" messages."'
  ]
}
```

## 转换逻辑

```typescript
export const transformText: NodeTransform = (node, context) => {
  if (
    node.type === NodeTypes.ROOT ||
    node.type === NodeTypes.ELEMENT ||
    node.type === NodeTypes.FOR ||
    node.type === NodeTypes.IF_BRANCH
  ) {
    return () => {
      const children = node.children
      let currentContainer: CompoundExpressionNode | undefined
      let hasText = false

      for (let i = 0; i < children.length; i++) {
        const child = children[i]
        if (isText(child)) {
          hasText = true
          for (let j = i + 1; j < children.length; j++) {
            const next = children[j]
            if (isText(next)) {
              // 合并相邻文本节点
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
      
      // 后续处理...
    }
  }
}
```

transformText 遍历子节点，将相邻的文本和插值节点合并为复合表达式。

## 代码生成

```typescript
function genCompoundExpression(
  node: CompoundExpressionNode,
  context: CodegenContext
) {
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i]
    if (isString(child)) {
      context.push(child)
    } else if (isSymbol(child)) {
      context.push(context.helper(child))
    } else {
      genNode(child, context)
    }
  }
}

// 生成结果
"Hello " + _toDisplayString(name) + ", you have " + _toDisplayString(count) + " messages."
```

代码生成时遍历 children，字符串直接输出，表达式节点递归生成。

## 优化效果

```typescript
// 未合并时 - 多个 createTextVNode 调用
_createTextVNode("Hello ")
_createTextVNode(_toDisplayString(name))
_createTextVNode(", you have ")
_createTextVNode(_toDisplayString(count))
_createTextVNode(" messages.")

// 合并后 - 单个调用
_createTextVNode(
  "Hello " + _toDisplayString(name) + ", you have " + _toDisplayString(count) + " messages."
)
```

合并减少了 VNode 创建的数量，提升了运行时性能。

## 特殊符号

```typescript
// children 中可能包含的符号
export const CREATE_TEXT = Symbol('createTextVNode')
export const TO_DISPLAY_STRING = Symbol('toDisplayString')

// 在复合表达式中
{
  children: [
    TO_DISPLAY_STRING,
    '(',
    { content: 'message' },
    ')'
  ]
}
```

符号用于表示运行时帮助函数，在代码生成时会被转换为实际的函数名。

## 与 TextCallNode

```typescript
export interface TextCallNode extends Node {
  type: NodeTypes.TEXT_CALL
  content: TextNode | InterpolationNode | CompoundExpressionNode
  codegenNode: CallExpression | SimpleExpressionNode
}
```

TextCallNode 是 CompoundExpressionNode 的包装，用于生成 `createTextVNode` 调用：

```typescript
{
  type: NodeTypes.TEXT_CALL,
  content: compoundExpression,
  codegenNode: {
    type: NodeTypes.JS_CALL_EXPRESSION,
    callee: CREATE_TEXT,
    arguments: [compoundExpression]
  }
}
```

## 嵌套处理

```html
<div>{{ a }}{{ b + c }}{{ d }}</div>
```

多个连续插值也会合并：
```typescript
{
  type: NodeTypes.COMPOUND_EXPRESSION,
  children: [
    { content: '_toDisplayString(a)' },
    ' + ',
    { content: '_toDisplayString(b + c)' },
    ' + ',
    { content: '_toDisplayString(d)' }
  ]
}
```

## 单一子节点优化

```html
<div>{{ message }}</div>
```

只有单个插值时不需要创建复合表达式：
```typescript
// 直接使用 InterpolationNode
// 生成代码
_toDisplayString(message)
```

这种优化减少了不必要的包装。

## 空白处理

```typescript
// 空白压缩后
<div>{{ a }} {{ b }}</div>
// 中间空格保留

// 转换结果
{
  children: [
    '_toDisplayString(a)',
    ' + ',
    '" "',  // 空格字符串
    ' + ',
    '_toDisplayString(b)'
  ]
}
```

空白处理在合并前完成，保留有意义的空格。

## 常量折叠

```html
<div>{{ 'hello' + ' world' }}</div>
```

常量表达式可以在编译时求值：
```typescript
// 如果启用了常量折叠
{
  type: NodeTypes.TEXT,
  content: 'hello world'
}
```

编译时计算减少了运行时开销。

## 小结

CompoundExpressionNode 的作用：

1. **节点合并**：相邻文本和插值合并
2. **代码优化**：减少 VNode 创建数量
3. **灵活结构**：支持多种子元素类型
4. **字符串拼接**：生成高效的拼接表达式

下一章将分析 IfNode 与 ForNode 条件和循环节点。
