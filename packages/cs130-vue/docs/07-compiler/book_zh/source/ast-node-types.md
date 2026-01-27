# 其他 AST 节点类型

除了元素和表达式，AST 还包含多种辅助节点类型。它们在解析和转换阶段产生，支持完整的模板功能。

## TextNode 文本节点

```typescript
export interface TextNode extends Node {
  type: NodeTypes.TEXT
  content: string
  loc: SourceLocation
}
```

纯文本内容：

```html
<div>Hello World</div>
```

```typescript
{
  type: NodeTypes.TEXT,
  content: 'Hello World',
  loc: { ... }
}
```

## CommentNode 注释节点

```typescript
export interface CommentNode extends Node {
  type: NodeTypes.COMMENT
  content: string
  loc: SourceLocation
}
```

HTML 注释：

```html
<!-- This is a comment -->
```

```typescript
{
  type: NodeTypes.COMMENT,
  content: ' This is a comment ',
  loc: { ... }
}
```

注释默认在生产环境被移除，可通过 `comments: true` 选项保留。

## InterpolationNode 插值节点

```typescript
export interface InterpolationNode extends Node {
  type: NodeTypes.INTERPOLATION
  content: ExpressionNode
  loc: SourceLocation
}
```

双花括号插值：

```html
{{ message }}
```

```typescript
{
  type: NodeTypes.INTERPOLATION,
  content: {
    type: NodeTypes.SIMPLE_EXPRESSION,
    content: 'message',
    isStatic: false
  },
  loc: { ... }
}
```

## AttributeNode 属性节点

```typescript
export interface AttributeNode extends Node {
  type: NodeTypes.ATTRIBUTE
  name: string
  value: TextNode | undefined
  loc: SourceLocation
}
```

静态属性：

```html
<div id="app" class="container">
```

```typescript
[
  { type: NodeTypes.ATTRIBUTE, name: 'id', value: { content: 'app' } },
  { type: NodeTypes.ATTRIBUTE, name: 'class', value: { content: 'container' } }
]
```

## DirectiveNode 指令节点

```typescript
export interface DirectiveNode extends Node {
  type: NodeTypes.DIRECTIVE
  name: string
  exp: ExpressionNode | undefined
  arg: ExpressionNode | undefined
  modifiers: string[]
  loc: SourceLocation
}
```

指令属性：

```html
<button v-on:click.stop="handleClick">
```

```typescript
{
  type: NodeTypes.DIRECTIVE,
  name: 'on',
  arg: { content: 'click', isStatic: true },
  exp: { content: 'handleClick', isStatic: false },
  modifiers: ['stop']
}
```

## IfNode 条件节点

转换阶段产生，表示 v-if/v-else-if/v-else 链：

```typescript
export interface IfNode extends Node {
  type: NodeTypes.IF
  branches: IfBranchNode[]
  codegenNode?: IfConditionalExpression | CacheExpression
}

export interface IfBranchNode extends Node {
  type: NodeTypes.IF_BRANCH
  condition: ExpressionNode | undefined  // v-else 没有条件
  children: TemplateChildNode[]
  userKey?: AttributeNode | DirectiveNode
  isTemplateIf?: boolean
}
```

```html
<div v-if="a">A</div>
<div v-else-if="b">B</div>
<div v-else>C</div>
```

```typescript
{
  type: NodeTypes.IF,
  branches: [
    { condition: { content: 'a' }, children: [...] },
    { condition: { content: 'b' }, children: [...] },
    { condition: undefined, children: [...] }  // v-else
  ]
}
```

## ForNode 循环节点

转换阶段产生，表示 v-for：

```typescript
export interface ForNode extends Node {
  type: NodeTypes.FOR
  source: ExpressionNode
  valueAlias: ExpressionNode | undefined
  keyAlias: ExpressionNode | undefined
  objectIndexAlias: ExpressionNode | undefined
  parseResult: ForParseResult
  children: TemplateChildNode[]
  codegenNode?: ForCodegenNode
}
```

```html
<div v-for="(item, index) in items" :key="item.id">
```

```typescript
{
  type: NodeTypes.FOR,
  source: { content: 'items' },
  valueAlias: { content: 'item' },
  keyAlias: { content: 'index' },
  children: [...]
}
```

## TextCallNode 文本调用节点

转换阶段产生，用于优化多个相邻的文本/插值：

```typescript
export interface TextCallNode extends Node {
  type: NodeTypes.TEXT_CALL
  content: TextNode | InterpolationNode | CompoundExpressionNode
  codegenNode: CallExpression | SimpleExpressionNode
}
```

```html
Hello {{ name }}!
```

```typescript
{
  type: NodeTypes.TEXT_CALL,
  content: { type: NodeTypes.COMPOUND_EXPRESSION, ... },
  codegenNode: createTextVNode(...)
}
```

## VNodeCall VNode 调用节点

代码生成辅助节点：

```typescript
export interface VNodeCall extends Node {
  type: NodeTypes.VNODE_CALL
  tag: string | symbol | CallExpression
  props: PropsExpression | undefined
  children:
    | TemplateChildNode[]
    | TemplateTextChildNode
    | SlotsExpression
    | ForRenderListExpression
    | SimpleExpressionNode
    | undefined
  patchFlag: string | undefined
  dynamicProps: string | undefined
  directives: DirectiveArguments | undefined
  isBlock: boolean
  disableTracking: boolean
  isComponent: boolean
}
```

这是代码生成的核心结构，对应 `createVNode` 或 `createElementVNode` 调用。

## SlotOutletNode 插槽出口节点

`<slot>` 元素的转换结果：

```typescript
export interface SlotOutletNode extends Node {
  type: NodeTypes.ELEMENT
  tagType: ElementTypes.SLOT
  codegenNode: RenderSlotCall
}
```

## 节点类型枚举

```typescript
export const enum NodeTypes {
  ROOT,
  ELEMENT,
  TEXT,
  COMMENT,
  SIMPLE_EXPRESSION,
  INTERPOLATION,
  ATTRIBUTE,
  DIRECTIVE,
  // 转换阶段产生
  COMPOUND_EXPRESSION,
  IF,
  IF_BRANCH,
  FOR,
  TEXT_CALL,
  // 代码生成辅助
  VNODE_CALL,
  JS_CALL_EXPRESSION,
  JS_OBJECT_EXPRESSION,
  JS_PROPERTY,
  JS_ARRAY_EXPRESSION,
  JS_FUNCTION_EXPRESSION,
  JS_CONDITIONAL_EXPRESSION,
  JS_CACHE_EXPRESSION,
  // SSR 相关
  JS_BLOCK_STATEMENT,
  JS_TEMPLATE_LITERAL,
  JS_IF_STATEMENT,
  JS_ASSIGNMENT_EXPRESSION,
  JS_SEQUENCE_EXPRESSION,
  JS_RETURN_STATEMENT
}
```

## 解析 vs 转换产生的节点

解析阶段产生：
- ROOT
- ELEMENT
- TEXT
- COMMENT
- SIMPLE_EXPRESSION
- INTERPOLATION
- ATTRIBUTE
- DIRECTIVE

转换阶段产生：
- COMPOUND_EXPRESSION
- IF, IF_BRANCH
- FOR
- TEXT_CALL
- VNODE_CALL
- JS_* 系列

## 小结

AST 包含多种节点类型，服务于不同目的。基础节点（TEXT、COMMENT、ATTRIBUTE）表示模板的基本元素。结构节点（IF、FOR）表示控制流。代码生成节点（VNODE_CALL、JS_*）是转换阶段的产物，直接映射到生成的代码。这种分层设计使每个阶段职责清晰。
