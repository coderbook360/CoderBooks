# 生成 render 函数代码

render 函数是编译的最终产物。**它接收组件上下文，返回 VNode 树。**

**理解 render 函数的生成逻辑，你就能理解 Vue 模板的最终形态。** 本章将分析 render 函数代码的生成逻辑。

## render 函数结构

```javascript
function render(_ctx, _cache) {
  // 1. 组件/指令解析（可选）
  const _component_MyComp = _resolveComponent("MyComp")
  
  // 2. 返回 VNode 树
  return (_openBlock(), _createElementBlock("div", null, [
    _createElementVNode("h1", null, _toDisplayString(_ctx.title)),
    _createElementVNode("p", null, _toDisplayString(_ctx.content))
  ]))
}
```

## genNode 入口

所有节点生成都通过 `genNode` 分发：

```javascript
function genNode(node, context) {
  // 字符串直接输出
  if (isString(node)) {
    context.push(node)
    return
  }
  
  // Symbol（辅助函数）
  if (isSymbol(node)) {
    context.push(context.helper(node))
    return
  }
  
  // 根据类型分发
  switch (node.type) {
    case NodeTypes.ELEMENT:
    case NodeTypes.IF:
    case NodeTypes.FOR:
      // 这些节点应该有 codegenNode
      genNode(node.codegenNode, context)
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
      
    case NodeTypes.COMPOUND_EXPRESSION:
      genCompoundExpression(node, context)
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
  }
}
```

## VNodeCall 生成

这是最核心的节点类型：

```javascript
// VNodeCall 结构
{
  type: NodeTypes.VNODE_CALL,
  tag: "div",
  props: { ... },
  children: [...],
  patchFlag: "1 /* TEXT */",
  dynamicProps: '["id"]',
  isBlock: true,
  isComponent: false
}
```

生成实现：

```javascript
function genVNodeCall(node, context) {
  const { push, helper } = context
  const {
    tag,
    props,
    children,
    patchFlag,
    dynamicProps,
    directives,
    isBlock,
    isComponent
  } = node
  
  // 指令包装
  if (directives) {
    push(helper(WITH_DIRECTIVES) + '(')
  }
  
  // Block 模式
  if (isBlock) {
    push(`(${helper(OPEN_BLOCK)}(), `)
  }
  
  // 选择创建函数
  const callHelper = isBlock
    ? isComponent ? CREATE_BLOCK : CREATE_ELEMENT_BLOCK
    : isComponent ? CREATE_VNODE : CREATE_ELEMENT_VNODE
  
  push(helper(callHelper) + '(')
  
  // 生成参数
  genNodeList(
    genNullableArgs([tag, props, children, patchFlag, dynamicProps]),
    context
  )
  
  push(')')
  
  // 关闭 Block
  if (isBlock) {
    push(')')
  }
  
  // 关闭指令包装
  if (directives) {
    push(', ')
    genNode(directives, context)
    push(')')
  }
}
```

## 表达式生成

### 简单表达式

```javascript
function genExpression(node, context) {
  const { content, isStatic } = node
  context.push(isStatic ? JSON.stringify(content) : content)
}

// 静态: "hello" -> '"hello"'
// 动态: _ctx.msg -> '_ctx.msg'
```

### 插值表达式

```javascript
function genInterpolation(node, context) {
  const { push, helper } = context
  push(`${helper(TO_DISPLAY_STRING)}(`)
  genNode(node.content, context)
  push(')')
}

// {{ msg }} -> _toDisplayString(_ctx.msg)
```

### 复合表达式

```javascript
function genCompoundExpression(node, context) {
  for (const child of node.children) {
    if (isString(child)) {
      context.push(child)
    } else {
      genNode(child, context)
    }
  }
}

// {{ a + b }} -> _toDisplayString(_ctx.a) + " + " + _toDisplayString(_ctx.b)
```

## 对象表达式生成

用于 props：

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
    
    genExpressionAsPropertyKey(key, context)
    push(': ')
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

输出示例：

```javascript
// 单属性
{ class: _ctx.cls }

// 多属性
{
  class: _ctx.cls,
  id: _ctx.id,
  onClick: _ctx.handleClick
}
```

## 数组表达式生成

用于 children：

```javascript
function genArrayExpression(node, context) {
  genNodeListAsArray(node.elements, context)
}

function genNodeListAsArray(nodes, context) {
  const { push, indent, deindent } = context
  const multilines = nodes.length > 3
  
  push('[')
  multilines && indent()
  
  genNodeList(nodes, context, multilines)
  
  multilines && deindent()
  push(']')
}
```

## 条件表达式生成

用于 v-if：

```javascript
function genConditionalExpression(node, context) {
  const { test, consequent, alternate, newline: needNewline } = node
  const { push, indent, deindent, newline } = context
  
  // 条件
  genNode(test, context)
  
  needNewline && indent()
  push(' ? ')
  genNode(consequent, context)
  
  needNewline && newline()
  push(' : ')
  
  // alternate 可能是嵌套条件
  if (alternate.type === NodeTypes.JS_CONDITIONAL_EXPRESSION) {
    genConditionalExpression(alternate, context)
  } else {
    genNode(alternate, context)
  }
  
  needNewline && deindent()
}
```

输出：

```javascript
_ctx.type === 'A'
  ? _createElementVNode("div", null, "A")
  : _ctx.type === 'B'
    ? _createElementVNode("div", null, "B")
    : _createElementVNode("div", null, "C")
```

## 缓存表达式生成

用于 v-once 和事件缓存：

```javascript
function genCacheExpression(node, context) {
  const { push } = context
  const { index, value } = node
  
  push(`_cache[${index}] || (_cache[${index}] = `)
  genNode(value, context)
  push(')')
}

// 输出: _cache[0] || (_cache[0] = _createElementVNode(...))
```

## 本章小结

本章分析了 render 函数代码的生成：

- **genNode 分发**：根据节点类型调用对应生成函数
- **VNodeCall 生成**：核心的 VNode 创建调用
- **表达式生成**：简单、插值、复合表达式
- **对象/数组生成**：props 和 children
- **条件/缓存生成**：v-if 和优化相关

下一章将分析运行时辅助函数的收集和导入生成。
