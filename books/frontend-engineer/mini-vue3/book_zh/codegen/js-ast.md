# JavaScript AST 的代码生成

Transform 阶段生成的不只是模板 AST，**还包括 JavaScript AST 节点**。这些节点描述了最终代码的结构。

**这是一个精妙的分层设计：先生成代码 AST，再生成代码字符串。** 本章将分析各类 JavaScript AST 节点的代码生成。

## 模板 AST vs JavaScript AST

模板 AST 描述模板结构：

```javascript
{
  type: NodeTypes.ELEMENT,
  tag: 'div',
  children: [...]
}
```

JavaScript AST 描述代码结构：

```javascript
{
  type: NodeTypes.JS_CALL_EXPRESSION,
  callee: CREATE_ELEMENT_VNODE,
  arguments: ['div', null, ...]
}
```

Transform 阶段将模板 AST 转换为 JavaScript AST（存储在 `codegenNode` 中），Codegen 阶段再将 JavaScript AST 转换为代码字符串。

## JS AST 节点类型

```javascript
const NodeTypes = {
  // JavaScript AST 节点
  JS_CALL_EXPRESSION: 14,        // 函数调用
  JS_OBJECT_EXPRESSION: 15,      // 对象字面量
  JS_PROPERTY: 16,               // 对象属性
  JS_ARRAY_EXPRESSION: 17,       // 数组
  JS_FUNCTION_EXPRESSION: 18,    // 函数表达式
  JS_CONDITIONAL_EXPRESSION: 19, // 条件表达式
  JS_CACHE_EXPRESSION: 20,       // 缓存表达式
  JS_SEQUENCE_EXPRESSION: 25     // 序列表达式
}
```

## CallExpression

函数调用是最常见的节点：

```javascript
interface CallExpression {
  type: NodeTypes.JS_CALL_EXPRESSION
  callee: string | symbol
  arguments: CodegenNode[]
}
```

生成实现：

```javascript
function genCallExpression(node, context) {
  const { push, helper } = context
  const callee = isString(node.callee) 
    ? node.callee 
    : helper(node.callee)
  
  push(callee + '(')
  genNodeList(node.arguments, context)
  push(')')
}
```

示例：

```javascript
// AST
{
  type: JS_CALL_EXPRESSION,
  callee: TO_DISPLAY_STRING,
  arguments: [{ content: '_ctx.msg' }]
}

// 输出
_toDisplayString(_ctx.msg)
```

## ObjectExpression

对象字面量用于 props：

```javascript
interface ObjectExpression {
  type: NodeTypes.JS_OBJECT_EXPRESSION
  properties: Property[]
}

interface Property {
  type: NodeTypes.JS_PROPERTY
  key: ExpressionNode
  value: ExpressionNode
}
```

生成实现：

```javascript
function genObjectExpression(node, context) {
  const { push, indent, deindent, newline } = context
  const { properties } = node
  
  if (!properties.length) {
    push('{}')
    return
  }
  
  const multilines = properties.length > 1
  
  push(multilines ? '{' : '{ ')
  multilines && indent()
  
  for (let i = 0; i < properties.length; i++) {
    const { key, value } = properties[i]
    
    // key
    if (key.type === NodeTypes.SIMPLE_EXPRESSION && key.isStatic) {
      push(key.content + ': ')
    } else {
      push('[')
      genNode(key, context)
      push(']: ')
    }
    
    // value
    genNode(value, context)
    
    if (i < properties.length - 1) {
      push(',')
      multilines ? newline() : push(' ')
    }
  }
  
  multilines && deindent()
  push(multilines ? '}' : ' }')
}
```

## ArrayExpression

数组用于 children：

```javascript
interface ArrayExpression {
  type: NodeTypes.JS_ARRAY_EXPRESSION
  elements: CodegenNode[]
}
```

生成实现：

```javascript
function genArrayExpression(node, context) {
  const { push, indent, deindent } = context
  const { elements } = node
  
  const multilines = elements.length > 3
  
  push('[')
  multilines && indent()
  
  for (let i = 0; i < elements.length; i++) {
    genNode(elements[i], context)
    if (i < elements.length - 1) {
      push(',')
      multilines ? context.newline() : push(' ')
    }
  }
  
  multilines && deindent()
  push(']')
}
```

## FunctionExpression

用于 v-for 的回调、slot 函数等：

```javascript
interface FunctionExpression {
  type: NodeTypes.JS_FUNCTION_EXPRESSION
  params: ExpressionNode[]
  returns?: CodegenNode
  body?: BlockStatement
  newline: boolean
}
```

生成实现：

```javascript
function genFunctionExpression(node, context) {
  const { push, indent, deindent } = context
  const { params, returns, body, newline } = node
  
  // 参数
  push('(')
  genNodeList(params, context)
  push(') => ')
  
  // 函数体
  if (body) {
    // 块语句
    push('{')
    indent()
    genNode(body, context)
    deindent()
    push('}')
  } else if (returns) {
    // 表达式返回
    if (newline) {
      push('(')
      indent()
      genNode(returns, context)
      deindent()
      push(')')
    } else {
      genNode(returns, context)
    }
  }
}
```

示例：

```javascript
// v-for 回调
(item, index) => {
  return _createElementVNode("div", null, ...)
}
```

## ConditionalExpression

三元表达式用于 v-if：

```javascript
interface ConditionalExpression {
  type: NodeTypes.JS_CONDITIONAL_EXPRESSION
  test: ExpressionNode
  consequent: CodegenNode
  alternate: CodegenNode
  newline: boolean
}
```

生成实现：

```javascript
function genConditionalExpression(node, context) {
  const { test, consequent, alternate, newline } = node
  const { push, indent, deindent } = context
  
  // 条件
  genNode(test, context)
  
  newline && indent()
  push(' ? ')
  
  // true 分支
  genNode(consequent, context)
  
  newline && context.newline()
  push(' : ')
  
  // false 分支（可能嵌套）
  if (alternate.type === NodeTypes.JS_CONDITIONAL_EXPRESSION) {
    genConditionalExpression(alternate, context)
  } else {
    genNode(alternate, context)
  }
  
  newline && deindent()
}
```

## SequenceExpression

逗号表达式：

```javascript
interface SequenceExpression {
  type: NodeTypes.JS_SEQUENCE_EXPRESSION
  expressions: CodegenNode[]
}
```

生成实现：

```javascript
function genSequenceExpression(node, context) {
  const { push } = context
  
  push('(')
  for (let i = 0; i < node.expressions.length; i++) {
    genNode(node.expressions[i], context)
    if (i < node.expressions.length - 1) {
      push(', ')
    }
  }
  push(')')
}
```

用于 v-once：

```javascript
(_setBlockTracking(-1), _cache[0] = ..., _setBlockTracking(1), _cache[0])
```

## CacheExpression

缓存表达式：

```javascript
interface CacheExpression {
  type: NodeTypes.JS_CACHE_EXPRESSION
  index: number
  value: CodegenNode
  isVNode: boolean
}
```

生成实现：

```javascript
function genCacheExpression(node, context) {
  const { push } = context
  const { index, value, isVNode } = node
  
  push(`_cache[${index}] || (`)
  
  if (isVNode) {
    // VNode 缓存需要禁用 block 追踪
    push(`${context.helper(SET_BLOCK_TRACKING)}(-1), `)
  }
  
  push(`_cache[${index}] = `)
  genNode(value, context)
  
  if (isVNode) {
    push(`, ${context.helper(SET_BLOCK_TRACKING)}(1), _cache[${index}]`)
  }
  
  push(')')
}
```

## 本章小结

本章分析了 JavaScript AST 节点的代码生成：

- **CallExpression**：函数调用
- **ObjectExpression**：对象字面量（props）
- **ArrayExpression**：数组（children）
- **FunctionExpression**：箭头函数
- **ConditionalExpression**：三元表达式（v-if）
- **SequenceExpression**：逗号表达式
- **CacheExpression**：缓存表达式

这些节点类型覆盖了 render 函数中所有可能的代码结构。下一章将分析 Source Map 的生成。
