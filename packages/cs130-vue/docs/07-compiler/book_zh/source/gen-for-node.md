# genForNode 循环节点生成

循环节点生成处理 v-for 指令，生成 renderList 调用。

## ForNode 结构

```typescript
interface ForNode extends Node {
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

## 代码生成节点

```typescript
interface ForCodegenNode extends VNodeCall {
  isBlock: true
  tag: typeof FRAGMENT
  props: undefined
  children: ForRenderListExpression
}

interface ForRenderListExpression extends CallExpression {
  callee: typeof RENDER_LIST
  arguments: [ExpressionNode, ForIteratorExpression]
}
```

## genFor 函数

```typescript
function genFor(node: ForNode, context: CodegenContext) {
  genVNodeCall(node.codegenNode!, context)
}
```

实际生成委托给 genVNodeCall，因为 ForNode 的 codegenNode 是 VNodeCall。

## renderList 调用

```typescript
function genCallExpression(
  node: CallExpression,
  context: CodegenContext
) {
  const { push, helper } = context
  const callee = isString(node.callee)
    ? node.callee
    : helper(node.callee)

  push(callee + `(`)
  genNodeList(node.arguments, context)
  push(`)`)
}
```

## 生成示例

```html
<div v-for="item in items" :key="item.id">
  {{ item.name }}
</div>
```

```typescript
(_openBlock(true), _createElementBlock(_Fragment, null,
  _renderList(_ctx.items, (item) => {
    return (_openBlock(), _createElementBlock("div", {
      key: item.id
    }, _toDisplayString(item.name), 1))
  }), 128 /* KEYED_FRAGMENT */))
```

## 迭代器表达式

```typescript
interface ForIteratorExpression extends FunctionExpression {
  returns: VNodeCall
}

// 生成的函数
(item) => {
  return (_openBlock(), _createElementBlock(...))
}
```

## 带索引的循环

```html
<div v-for="(item, index) in items">
  {{ index }}: {{ item }}
</div>
```

```typescript
_renderList(_ctx.items, (item, index) => {
  return (_openBlock(), _createElementBlock("div", null,
    _toDisplayString(index) + ": " + _toDisplayString(item), 1))
})
```

## 对象循环

```html
<div v-for="(value, key, index) in obj">
  {{ key }}: {{ value }} ({{ index }})
</div>
```

```typescript
_renderList(_ctx.obj, (value, key, index) => {
  return (_openBlock(), _createElementBlock("div", null,
    _toDisplayString(key) + ": " + _toDisplayString(value) +
    " (" + _toDisplayString(index) + ")", 1))
})
```

## PatchFlag 类型

```typescript
// 有 key 的 Fragment
128 /* KEYED_FRAGMENT */

// 无 key 的 Fragment
256 /* UNKEYED_FRAGMENT */
```

## openBlock(true)

```typescript
// v-for 使用 openBlock(true)
// true 表示禁用 Block 追踪
(_openBlock(true), _createElementBlock(_Fragment, ...))
```

循环内部的动态节点不会被收集到外层 Block。

## 范围循环

```html
<div v-for="n in 10">{{ n }}</div>
```

```typescript
_renderList(10, (n) => {
  return (_openBlock(), _createElementBlock("div", null,
    _toDisplayString(n), 1))
})
```

## 稳定 Fragment

```html
<template v-for="item in items" :key="item.id">
  <div>{{ item.a }}</div>
  <div>{{ item.b }}</div>
</template>
```

```typescript
_renderList(_ctx.items, (item) => {
  return (_openBlock(), _createElementBlock(_Fragment, {
    key: item.id
  }, [
    _createElementVNode("div", null, _toDisplayString(item.a), 1),
    _createElementVNode("div", null, _toDisplayString(item.b), 1)
  ]))
})
```

## 小结

循环生成的关键点：

1. **renderList**：运行时循环 helper
2. **迭代器函数**：value, key, index 参数
3. **Block 追踪**：openBlock(true) 隔离
4. **Fragment**：KEYED 或 UNKEYED

下一章将分析插槽的代码生成。
