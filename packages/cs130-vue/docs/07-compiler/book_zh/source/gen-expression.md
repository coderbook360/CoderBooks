# genExpression 表达式生成# genExpression 表达式生成














































































































































































下一章将分析 genVNodeCall 的详细实现。4. **调用表达式**：helper 函数调用3. **条件表达式**：递归生成三元嵌套2. **复合表达式**：遍历 children 混合处理1. **静态/动态区分**：静态需要 JSON.stringify表达式生成的关键点：## 小结```}  push(`)`)  genNodeList(node.arguments, context)  push(callee + `(`, node)  }    push(PURE_ANNOTATION)  if (pure) {    : helper(node.callee)    ? node.callee  const callee = isString(node.callee)  const { push, helper, pure } = context) {  context: CodegenContext  node: CallExpression,function genCallExpression(```typescript## 调用表达式```_ctx.obj[_ctx.dynamicKey]// obj[dynamicKey]_ctx.obj['key']// obj['key']_ctx.obj.prop// obj.prop```typescript## 成员表达式```    : (_openBlock(), _createElementBlock("div", { key: 2 }, "C"))    ? (_openBlock(), _createElementBlock("div", { key: 1 }, "B"))  : b  ? (_openBlock(), _createElementBlock("div", { key: 0 }, "A"))a```typescript```<div v-else>C</div><div v-else-if="b">B</div><div v-if="a">A</div>```html## 生成示例```}  newline && deindent(true)  }    genNode(alternate, context)  } else {    genConditionalExpression(alternate, context)  if (alternate.type === NodeTypes.JS_CONDITIONAL_EXPRESSION) {    push(` : `)  newline && _newline()  context.indentLevel--  genNode(consequent, context)  push(` ? `)  context.indentLevel++  newline && indent()  }    genNode(test, context)  } else {    needsParens && push(`)`)    genExpression(test, context)    needsParens && push(`(`)    const needsParens = !isSimpleIdentifier(test.content)  if (test.type === NodeTypes.SIMPLE_EXPRESSION) {  const { push, indent, deindent, newline: _newline } = context  const { test, consequent, alternate, newline } = node) {  context: CodegenContext  node: ConditionalExpression,function genConditionalExpression(```typescript## 条件表达式```_toDisplayString(`Hello ${_ctx.name}`)// {{ `Hello ${name}` }}```typescript## 模板文字插值使用 toDisplayString 包装。```}  push(`)`)  genNode(node.content, context)  push(`${helper(TO_DISPLAY_STRING)}(`)  if (pure) push(PURE_ANNOTATION)  const { push, helper, pure } = context) {  context: CodegenContext  node: InterpolationNode,function genInterpolation(```typescript## 插值表达式复合表达式的 children 可能是字符串或节点，分别处理。```}  }    }      genNode(child, context)    } else {      context.push(child)    if (isString(child)) {    const child = node.children[i]  for (let i = 0; i < node.children.length; i++) {) {  context: CodegenContext  node: CompoundExpressionNode,function genCompoundExpression(```typescript## 复合表达式```_ctx.message// 生成}  isStatic: false  content: '_ctx.message',  // 已添加前缀  type: NodeTypes.SIMPLE_EXPRESSION,{// transform 阶段添加前缀```typescript## 前缀处理静态内容需要 JSON.stringify 转义，动态内容直接输出。```}  )    node    isStatic ? JSON.stringify(content) : content,  context.push(  const { content, isStatic } = nodefunction genExpression(node: SimpleExpressionNode, context: CodegenContext) {```typescript## 简单表达式表达式生成是代码生成的核心，处理 SimpleExpressionNode 和 CompoundExpressionNode。































































































































































































































































































genExpression 处理各类表达式的代码生成。简单表达式根据 isStatic 决定是否加引号。复合表达式遍历子节点依次生成。插值表达式包装 toDisplayString 调用。条件表达式生成三元运算符，支持格式化换行。对象和数组表达式处理字面量语法。所有生成都传入节点信息用于 source map 映射。这套机制确保模板中的动态表达式能正确转换为可执行的 JavaScript 代码。## 小结```}  }    push(`}`)    deindent()  if (newline) {    }    genNode(body, context)  } else if (body) {    genNode(returns, context)    if (newline) push(`return `)  if (returns) {    }    indent()    push(`{`)  if (newline) {    push(`) => `)  }    genNode(params, context)  } else if (params) {    genNodeList(params, context)  if (isArray(params)) {  push(`(`)    const { params, returns, body, newline } = node  const { push, indent, deindent } = context) {  context: CodegenContext  node: FunctionExpression,function genFunctionExpression(```typescript事件处理器等需要函数：## 函数表达式```_toDisplayString(_ctx.message + _ctx.suffix)// 插值{ active: _ctx.isActive, 'text-danger': _ctx.hasError }// class 绑定```javascript生成的表达式：```</div>  {{ message + suffix }}<div :class="{ active: isActive, 'text-danger': hasError }">```html## 示例：复杂表达式```const _hoisted_1 = "static value"// 提升到模块顶层// constType: ConstantTypes.CAN_HOIST"static value"// 直接输出字符串化结果// constType: ConstantTypes.CAN_STRINGIFY```typescript静态表达式可以内联：## 常量优化这确保生成的代码位置能映射回模板中的原始位置，调试时可以看到模板源码。```context.push(content, node)```typescript表达式生成时传入节点用于 source map：## Source Map 支持```}  push(`]`)  genNodeList(nodes, context)  push(`[`)  const { push } = context) {  context: CodegenContext  nodes: any[],function genNodeListAsArray(}  genNodeListAsArray(node.elements, context)) {  context: CodegenContext  node: ArrayExpression,function genArrayExpression(```typescript## 数组表达式```}  }    push(`[${node.content}]`)    // 动态键用方括号  } else {    push(text)      : JSON.stringify(node.content)      ? node.content    const text = isSimpleIdentifier(node.content)    // 静态键可能需要引号  } else if (node.isStatic) {    push(`]`)    genCompoundExpression(node, context)    push(`[`)  if (node.type === NodeTypes.COMPOUND_EXPRESSION) {  const { push } = context) {  context: CodegenContext  node: ExpressionNode,function genExpressionAsPropertyKey(```typescript## 属性键生成```}  push(multilines ? `}` : ` }`)  multilines && deindent()    }    }      multilines ? newline() : push(` `)      push(`,`)    if (i < properties.length - 1) {        genNode(value, context)    // 生成 value    push(`: `)    genExpressionAsPropertyKey(key, context)    // 生成 key    const { key, value } = properties[i]  for (let i = 0; i < properties.length; i++) {    multilines && indent()  push(multilines ? `{` : `{ `)  const multilines = properties.length > 1    }    return    push(`{}`)  if (!properties.length) {    const { properties } = node  const { push, indent, deindent, newline } = context) {  context: CodegenContext  node: ObjectExpression,function genObjectExpression(```typescript对象字面量的生成：## 对象表达式```_renderList(source, callback)// 生成}  arguments: [source, callback]  callee: RENDER_LIST,  type: NodeTypes.JS_CALL_EXPRESSION,{// 节点```typescript```}  push(`)`)  genNodeList(node.arguments, context)  push(callee + `(`)    const callee = isString(node.callee) ? node.callee : helper(node.callee)  const { push, helper } = context) {  context: CodegenContext  node: CallExpression,function genCallExpression(```typescript函数调用的生成：## 调用表达式```}  needNewline && deindent(true)    genNode(alternate, context)  push(` : `)  needNewline && newline()    genNode(consequent, context)  push(` ? `)  needNewline && indent()  // 增加可读性的换行    }    push(`)`)    genNode(test, context)    push(`(`)  } else {    genExpression(test, context)    // 简单测试条件  if (test.type === NodeTypes.SIMPLE_EXPRESSION) {    const { push, indent, deindent, newline } = context  const { test, consequent, alternate, newline: needNewline } = node) {  context: CodegenContext  node: ConditionalExpression,function genConditionalExpression(```typescript三元表达式的生成：## 条件表达式```toDisplayString(_ctx.message)```javascript生成：```{{ message }}```html```}  push(`)`)  genNode(node.content, context)  push(`${helper(TO_DISPLAY_STRING)}(`)  const { push, helper } = contextfunction genInterpolation(node: InterpolationNode, context: CodegenContext) {```typescript插值 `{{ expr }}` 生成 `toDisplayString` 调用：## 插值表达式genExpression 只负责输出已转换的内容，不做前缀处理。```$setup.message// 或在 script setup 中_ctx.message// 转换后的表达式{{ message }}// 模板中```typescript在 transform 阶段，表达式会被添加前缀：## 表达式前缀处理```}  }    }      genNode(child, context)      // 其他节点递归生成    } else {      context.push(context.helper(child))      // Symbol 是 helper 引用    } else if (isSymbol(child)) {      context.push(child)
      // 字符串直接输出
    if (isString(child)) {
    const child = node.children[i]
  for (let i = 0; i < node.children.length; i++) {
) {
  context: CodegenContext
  node: CompoundExpressionNode,
function genCompoundExpression(
```typescript

复合表达式是多个片段的组合：

## 复合表达式生成

```
// 输出: _ctx.message
genExpression({ content: '_ctx.message', isStatic: false })
// 动态

// 输出: "hello"
genExpression({ content: 'hello', isStatic: true })
// 静态
```typescript

静态表达式作为字符串字面量输出，动态表达式直接输出内容：

```
}
  context.push(isStatic ? JSON.stringify(content) : content, node)
  // 静态表达式加引号
  const { content, isStatic } = node
function genExpression(node: SimpleExpressionNode, context: CodegenContext) {
```typescript

## 简单表达式生成

```
}
  )[]
    | symbol
    | string
    | TextNode
    | InterpolationNode
    | CompoundExpressionNode
    | SimpleExpressionNode
  children: (
  type: NodeTypes.COMPOUND_EXPRESSION
interface CompoundExpressionNode extends Node {

}
  identifiers?: string[]
  constType: ConstantTypes
  isStatic: boolean
  content: string
  type: NodeTypes.SIMPLE_EXPRESSION
interface SimpleExpressionNode extends Node {
```typescript

编译器处理两种主要表达式类型：

## 表达式类型
genExpression 负责生成表达式节点的代码。表达式是模板中动态部分的核心，包括简单标识符、成员访问、复合表达式等。