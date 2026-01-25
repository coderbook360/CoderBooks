# genNode 节点生成

genNode 是代码生成的核心分发函数，根据节点类型调用相应的生成函数。

## 核心实现

```typescript
function genNode(node: CodegenNode | symbol | string, context: CodegenContext) {
  if (isString(node)) {
    context.push(node)
    return
  }
  if (isSymbol(node)) {
    context.push(context.helper(node))
    return
  }
  
  switch (node.type) {
    case NodeTypes.ELEMENT:
    case NodeTypes.IF:
    case NodeTypes.FOR:
      genNode(node.codegenNode!, context)
      break
    case NodeTypes.TEXT:
      genText(node, context)
      break
    case NodeTypes.SIMPLE_EXPRESSION:
      genExpression(node, context)
      break
    case NodeTypes.INTERPOLATION:
      genInterpolation(node, context)
      break
    case NodeTypes.TEXT_CALL:
      genNode(node.codegenNode, context)
      break
    case NodeTypes.COMPOUND_EXPRESSION:
      genCompoundExpression(node, context)
      break
    case NodeTypes.COMMENT:
      genComment(node, context)
      break
    case NodeTypes.VNODE_CALL:
      genVNodeCall(node, context)
      break
    case NodeTypes.JS_CALL_EXPRESSION:
      genCallExpression(node, context)
      break
    case NodeTypes.JS_OBJECT_EXPRESSION:
      genObjectExpression(node, context)
      break
    case NodeTypes.JS_ARRAY_EXPRESSION:
      genArrayExpression(node, context)
      break
    case NodeTypes.JS_FUNCTION_EXPRESSION:
      genFunctionExpression(node, context)
      break
    case NodeTypes.JS_CONDITIONAL_EXPRESSION:
      genConditionalExpression(node, context)
      break
    case NodeTypes.JS_CACHE_EXPRESSION:
      genCacheExpression(node, context)
      break
    case NodeTypes.IF_BRANCH:
      break
    default:
      if (__DEV__) {
        assert(false, `unhandled codegen node type: ${(node as any).type}`)
      }
  }
}
```

## 节点类型分类

```typescript
// 直接输出
case string: push(node)
case symbol: push(helper(node))

// 委托给 codegenNode
case ELEMENT: genNode(node.codegenNode)
case IF: genNode(node.codegenNode)
case FOR: genNode(node.codegenNode)

// 专用生成函数
case TEXT: genText()
case SIMPLE_EXPRESSION: genExpression()
case VNODE_CALL: genVNodeCall()
case JS_CALL_EXPRESSION: genCallExpression()
// ...
```

## 文本生成

```typescript
function genText(node: TextNode | SimpleExpressionNode, context: CodegenContext) {
  context.push(JSON.stringify(node.content), node)
}

// 输入
{ type: TEXT, content: "Hello World" }

// 输出
"Hello World"
```

## 表达式生成

```typescript
function genExpression(node: SimpleExpressionNode, context: CodegenContext) {
  const { content, isStatic } = node
  context.push(isStatic ? JSON.stringify(content) : content, node)
}

// 静态表达式
{ isStatic: true, content: "hello" }
// 输出: "hello"

// 动态表达式
{ isStatic: false, content: "message" }
// 输出: message
```

## 插值生成

```typescript
function genInterpolation(node: InterpolationNode, context: CodegenContext) {
  const { push, helper } = context
  push(`${helper(TO_DISPLAY_STRING)}(`)
  genNode(node.content, context)
  push(`)`)
}

// 输入
{ type: INTERPOLATION, content: { content: "message" } }

// 输出
_toDisplayString(message)
```

## 复合表达式生成

```typescript
function genCompoundExpression(
  node: CompoundExpressionNode,
  context: CodegenContext
) {
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i]
    if (isString(child)) {
      context.push(child)
    } else {
      genNode(child, context)
    }
  }
}

// 输入
{
  type: COMPOUND_EXPRESSION,
  children: ['"Hello "', ' + ', { content: '_toDisplayString(name)' }]
}

// 输出
"Hello " + _toDisplayString(name)
```

## 注释生成

```typescript
function genComment(node: CommentNode, context: CodegenContext) {
  const { push, helper } = context
  push(`${helper(CREATE_COMMENT)}(${JSON.stringify(node.content)})`, node)
}

// 输入
{ type: COMMENT, content: " TODO: fix this " }

// 输出
_createCommentVNode(" TODO: fix this ")
```

## 对象表达式生成

```typescript
function genObjectExpression(node: ObjectExpression, context: CodegenContext) {
  const { push, indent, deindent, newline } = context
  const { properties } = node
  
  if (!properties.length) {
    push(`{}`, node)
    return
  }
  
  const multilines = properties.length > 1
  push(multilines ? `{` : `{ `)
  
  if (multilines) {
    indent()
  }
  
  for (let i = 0; i < properties.length; i++) {
    const { key, value } = properties[i]
    genExpressionAsPropertyKey(key, context)
    push(`: `)
    genNode(value, context)
    if (i < properties.length - 1) {
      push(`,`)
      newline()
    }
  }
  
  if (multilines) {
    deindent()
  }
  push(multilines ? `}` : ` }`)
}

// 多属性输出
{
  class: "container",
  id: dynamicId
}
```

## 数组表达式生成

```typescript
function genArrayExpression(node: ArrayExpression, context: CodegenContext) {
  genNodeListAsArray(node.elements as CodegenNode[], context)
}

function genNodeListAsArray(nodes: CodegenNode[], context: CodegenContext) {
  const { push } = context
  const multilines = nodes.length > 3
  
  push(`[`)
  if (multilines) {
    context.indent()
  }
  genNodeList(nodes, context, multilines)
  if (multilines) {
    context.deindent()
  }
  push(`]`)
}

// 输出示例
[child1, child2, child3]
```

## 递归与边界

```typescript
// genNode 可能被递归调用
genVNodeCall -> genNode(props) -> genObjectExpression -> genNode(value)

// 字符串和符号作为终止条件
if (isString(node)) {
  context.push(node)
  return
}
if (isSymbol(node)) {
  context.push(context.helper(node))
  return
}
```

## 小结

genNode 的设计：

1. **类型分发**：根据节点类型调用对应函数
2. **统一入口**：所有生成都通过 genNode
3. **递归处理**：嵌套节点递归调用
4. **终止条件**：字符串和符号直接输出

下一章将分析 genElement 元素生成的实现。
