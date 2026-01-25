# TextNode 与 InterpolationNode

文本节点和插值节点是模板中最常见的内容类型，分别表示静态文本和动态表达式。

## TextNode 结构

```typescript
export interface TextNode extends Node {
  type: NodeTypes.TEXT
  content: string
}
```

文本节点结构非常简单，只包含类型标识和文本内容。

```html
<div>Hello World</div>
```

解析结果：
```typescript
{
  type: NodeTypes.TEXT,
  content: 'Hello World',
  loc: {
    start: { line: 1, column: 6, offset: 5 },
    end: { line: 1, column: 17, offset: 16 },
    source: 'Hello World'
  }
}
```

## InterpolationNode 结构

```typescript
export interface InterpolationNode extends Node {
  type: NodeTypes.INTERPOLATION
  content: ExpressionNode
}
```

插值节点包含一个表达式节点，表达式节点存储了插值中的 JavaScript 表达式。

```html
<div>{{ message }}</div>
```

解析结果：
```typescript
{
  type: NodeTypes.INTERPOLATION,
  content: {
    type: NodeTypes.SIMPLE_EXPRESSION,
    content: ' message ',
    isStatic: false,
    loc: { ... }
  },
  loc: {
    source: '{{ message }}'
  }
}
```

## 表达式节点

```typescript
export interface SimpleExpressionNode extends Node {
  type: NodeTypes.SIMPLE_EXPRESSION
  content: string
  isStatic: boolean
  constType: ConstantTypes
  // 可选字段
  identifiers?: string[]
  hoisted?: JSChildNode
}
```

表达式节点的 `isStatic` 标记非常重要，静态表达式在编译时可以直接求值，而动态表达式需要保留到运行时。

## 静态与动态判断

```typescript
// 静态表达式
{{ 'hello' }}        // 字符串字面量
{{ 123 }}            // 数字字面量
{{ true }}           // 布尔字面量

// 动态表达式
{{ message }}        // 变量引用
{{ count + 1 }}      // 运算表达式
{{ items.length }}   // 属性访问
{{ format(date) }}   // 函数调用
```

在转换阶段，静态表达式会被标记为可优化：

```typescript
if (isStaticExp(exp)) {
  exp.constType = ConstantTypes.CAN_STRINGIFY
}
```

## 文本解析

```typescript
function parseText(context: ParserContext, mode: TextModes): TextNode {
  const endTokens = mode === TextModes.CDATA
    ? [']]>']
    : ['<', context.options.delimiters[0]]

  let endIndex = context.source.length
  
  for (let i = 0; i < endTokens.length; i++) {
    const index = context.source.indexOf(endTokens[i], 1)
    if (index !== -1 && endIndex > index) {
      endIndex = index
    }
  }

  const start = getCursor(context)
  const content = parseTextData(context, endIndex, mode)

  return {
    type: NodeTypes.TEXT,
    content,
    loc: getSelection(context, start)
  }
}
```

文本解析需要找到结束位置，可能是遇到标签开始 `<` 或插值开始 `{{`。解析出的文本内容会进行必要的 HTML 实体解码。

## 插值解析

```typescript
function parseInterpolation(
  context: ParserContext,
  mode: TextModes
): InterpolationNode | undefined {
  const [open, close] = context.options.delimiters
  
  const closeIndex = context.source.indexOf(close, open.length)
  if (closeIndex === -1) {
    emitError(context, ErrorCodes.X_MISSING_INTERPOLATION_END)
    return undefined
  }

  const start = getCursor(context)
  advanceBy(context, open.length)
  
  const innerStart = getCursor(context)
  const innerEnd = getCursor(context)
  const rawContentLength = closeIndex - open.length
  const rawContent = context.source.slice(0, rawContentLength)
  
  const preTrimContent = parseTextData(context, rawContentLength, mode)
  const content = preTrimContent.trim()
  
  const startOffset = preTrimContent.indexOf(content)
  if (startOffset > 0) {
    advancePositionWithMutation(innerStart, rawContent, startOffset)
  }
  const endOffset = rawContentLength - (preTrimContent.length - content.length - startOffset)
  advancePositionWithMutation(innerEnd, rawContent, endOffset)
  
  advanceBy(context, close.length)

  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      isStatic: false,
      constType: ConstantTypes.NOT_CONSTANT,
      content,
      loc: getSelection(context, innerStart, innerEnd)
    },
    loc: getSelection(context, start)
  }
}
```

插值解析需要找到闭合定界符，提取中间的表达式内容并去除空白。表达式的位置信息需要精确计算，考虑到前后空白的影响。

## 文本合并

相邻的文本和插值节点在转换阶段会被合并为复合表达式：

```html
<div>Hello {{ name }}, welcome!</div>
```

转换前有三个节点：TextNode、InterpolationNode、TextNode。

转换后合并为一个 CompoundExpressionNode：
```typescript
{
  type: NodeTypes.COMPOUND_EXPRESSION,
  children: [
    'Hello ',
    { type: INTERPOLATION, content: { content: 'name' } },
    ', welcome!'
  ]
}
```

## 代码生成

```typescript
// 纯文本
// _createTextVNode("Hello World")

// 插值
// _toDisplayString(message)

// 复合文本
// _createTextVNode("Hello " + _toDisplayString(name) + ", welcome!")
```

不同类型的文本节点生成不同的运行时代码。`_toDisplayString` 负责将值转换为字符串显示。

## 常量类型

```typescript
export const enum ConstantTypes {
  NOT_CONSTANT = 0,   // 运行时计算
  CAN_SKIP_PATCH,     // 可跳过补丁
  CAN_HOIST,          // 可静态提升
  CAN_STRINGIFY       // 可字符串化
}
```

表达式的常量类型决定了优化策略：

```typescript
// CAN_STRINGIFY - 可以预先转为字符串
{{ 'hello' }}  

// CAN_HOIST - 可以提升到 render 外
{{ staticValue }}  // 假设 staticValue 是常量

// NOT_CONSTANT - 每次渲染都需要求值
{{ dynamicValue }}
```

## 空白处理

```typescript
// 默认会压缩空白
<div>  Hello   World  </div>
// 结果: "Hello World"

// preserveWhitespace 选项
{
  whitespace: 'preserve'
}
// 结果: "  Hello   World  "

// 条件保留（默认）
{
  whitespace: 'condense'
}
// 压缩多个空白为一个，保留换行符
```

空白处理在 transform 阶段进行，影响最终渲染的文本内容。

## 小结

文本与插值节点的设计要点：

1. **结构简洁**：TextNode 只包含内容，InterpolationNode 包装表达式
2. **表达式标记**：isStatic 和 constType 用于优化决策
3. **位置精确**：支持源码映射和错误报告
4. **合并优化**：相邻节点合并减少运行时开销

下一章将分析 CommentNode 注释节点的结构与处理。
