# transformFor 循环转换

`transformFor` 处理 v-for 指令，将其转换为循环结构。

## 函数入口

```typescript
export const transformFor = createStructuralDirectiveTransform(
  'for',
  (node, dir, context) => {
    return processFor(node, dir, context, forNode => {
      // 退出回调
    })
  }
)
```

## processFor 主逻辑

```typescript
export function processFor(
  node: ElementNode,
  dir: DirectiveNode,
  context: TransformContext,
  processCodegen?: (forNode: ForNode) => (() => void) | undefined
) {
  if (!dir.exp) {
    context.onError(
      createCompilerError(ErrorCodes.X_V_FOR_NO_EXPRESSION, dir.loc)
    )
    return
  }

  const parseResult = parseForExpression(
    dir.exp as SimpleExpressionNode,
    context
  )

  if (!parseResult) {
    context.onError(
      createCompilerError(ErrorCodes.X_V_FOR_MALFORMED_EXPRESSION, dir.loc)
    )
    return
  }

  const { addIdentifiers, removeIdentifiers, scopes } = context
  const { source, value, key, index } = parseResult

  const forNode: ForNode = {
    type: NodeTypes.FOR,
    loc: dir.loc,
    source,
    valueAlias: value,
    keyAlias: key,
    objectIndexAlias: index,
    parseResult,
    children: isTemplateNode(node) ? node.children : [node]
  }

  context.replaceNode(forNode)
  scopes.vFor++
  
  // 将变量添加到作用域
  if (value) addIdentifiers(value)
  if (key) addIdentifiers(key)
  if (index) addIdentifiers(index)

  const onExit = processCodegen && processCodegen(forNode)

  return () => {
    scopes.vFor--
    if (value) removeIdentifiers(value)
    if (key) removeIdentifiers(key)
    if (index) removeIdentifiers(index)
    if (onExit) onExit()
  }
}
```

## 解析 v-for 表达式

```typescript
const forAliasRE = /([\s\S]*?)\s+(?:in|of)\s+([\s\S]*)/
const forIteratorRE = /,([^,\}\]]*)(?:,([^,\}\]]*))?$/
const stripParensRE = /^\(|\)$/g

export function parseForExpression(
  input: SimpleExpressionNode,
  context: TransformContext
): ForParseResult | undefined {
  const exp = input.content
  const inMatch = exp.match(forAliasRE)
  if (!inMatch) return undefined

  const [, LHS, RHS] = inMatch
  
  const result: ForParseResult = {
    source: createAliasExpression(
      input.loc,
      RHS.trim(),
      exp.indexOf(RHS, LHS.length)
    ),
    value: undefined,
    key: undefined,
    index: undefined
  }

  let valueContent = LHS.trim().replace(stripParensRE, '').trim()
  const iteratorMatch = valueContent.match(forIteratorRE)
  
  if (iteratorMatch) {
    valueContent = valueContent.replace(forIteratorRE, '').trim()
    const keyContent = iteratorMatch[1].trim()
    if (keyContent) {
      result.key = createAliasExpression(input.loc, keyContent, ...)
    }
    if (iteratorMatch[2]) {
      const indexContent = iteratorMatch[2].trim()
      if (indexContent) {
        result.index = createAliasExpression(input.loc, indexContent, ...)
      }
    }
  }
  
  if (valueContent) {
    result.value = createAliasExpression(input.loc, valueContent, ...)
  }

  return result
}
```

### 支持的语法

```typescript
// 基本语法
v-for="item in items"
// value: item, source: items

// 带 key
v-for="(item, key) in items"
// value: item, key: key, source: items

// 带 index
v-for="(item, key, index) in items"
// value: item, key: key, index: index, source: items

// of 替代 in
v-for="item of items"

// 解构
v-for="{ id, name } in items"
// value: { id, name }
```

## 作用域管理

```typescript
// 添加到作用域
if (value) addIdentifiers(value)
if (key) addIdentifiers(key)
if (index) addIdentifiers(index)

// 退出时移除
return () => {
  if (value) removeIdentifiers(value)
  if (key) removeIdentifiers(key)
  if (index) removeIdentifiers(index)
}
```

v-for 的变量只在循环体内有效，不需要添加 `_ctx` 前缀。

## 生成代码

退出回调生成渲染列表调用：

```typescript
return forNode => {
  return () => {
    // 确定子节点是否需要 fragment
    const isStableFragment = 
      forNode.source.type === NodeTypes.SIMPLE_EXPRESSION &&
      forNode.source.constType > ConstantTypes.NOT_CONSTANT
    const fragmentFlag = isStableFragment
      ? PatchFlags.STABLE_FRAGMENT
      : keyProp
        ? PatchFlags.KEYED_FRAGMENT
        : PatchFlags.UNKEYED_FRAGMENT

    forNode.codegenNode = createVNodeCall(
      context,
      helper(FRAGMENT),
      undefined,
      renderList,
      fragmentFlag,
      undefined,
      undefined,
      true,
      !isStableFragment,
      false,
      node.loc
    )
  }
}
```

## renderList 调用

```typescript
const renderList = createCallExpression(helper(RENDER_LIST), [
  source,
  createFunctionExpression(
    createForLoopParams(forNode.parseResult),
    childBlock,
    true /* force newline */
  )
])
```

生成的代码：

```typescript
renderList(items, (item, key, index) => {
  return createElementVNode("div", { key: item.id }, ...)
})
```

## key 处理

```typescript
const keyProp = findProp(node, 'key')
const keyProperty = keyProp
  ? createObjectProperty('key', keyProp.type === NodeTypes.ATTRIBUTE
      ? createSimpleExpression(keyProp.value!.content, true)
      : keyProp.exp!)
  : null
```

key 被提取并添加到每个循环项。

### 推断 key

```typescript
// 在某些情况下可以推断 key
v-for="item in items" :key="item.id"
// 显式 key

v-for="item in items"
// 无 key，生成 UNKEYED_FRAGMENT
```

## Fragment 标志

```typescript
const fragmentFlag = isStableFragment
  ? PatchFlags.STABLE_FRAGMENT    // 源数据不变
  : keyProp
    ? PatchFlags.KEYED_FRAGMENT   // 有 key
    : PatchFlags.UNKEYED_FRAGMENT // 无 key
```

这影响运行时的 diff 策略。

## template v-for

```html
<template v-for="item in items" :key="item.id">
  <div>{{ item.a }}</div>
  <div>{{ item.b }}</div>
</template>
```

template 上的 v-for 展开子节点，不生成额外元素。

## 嵌套 v-for

```html
<div v-for="row in rows">
  <div v-for="cell in row.cells">
    {{ cell }}
  </div>
</div>
```

每层 v-for 都有自己的作用域，变量名可以遮蔽外层。

## 示例转换

```html
<div v-for="(item, index) in items" :key="item.id">
  {{ item.name }} - {{ index }}
</div>
```

转换后的 codegenNode：

```typescript
{
  type: NodeTypes.VNODE_CALL,
  tag: FRAGMENT,
  children: {
    type: NodeTypes.JS_CALL_EXPRESSION,
    callee: RENDER_LIST,
    arguments: [
      { content: 'items' },
      {
        type: NodeTypes.JS_FUNCTION_EXPRESSION,
        params: [
          { content: 'item' },
          { content: 'index' }
        ],
        returns: {
          type: NodeTypes.VNODE_CALL,
          tag: '"div"',
          props: { key: { content: 'item.id' } },
          children: /* compound expression */
        }
      }
    ]
  },
  patchFlag: PatchFlags.KEYED_FRAGMENT
}
```

## 生成的代码

```typescript
(_openBlock(true), _createElementBlock(_Fragment, null, 
  _renderList(items, (item, index) => {
    return (_openBlock(), _createElementBlock("div", {
      key: item.id
    }, _toDisplayString(item.name) + " - " + _toDisplayString(index), 1))
  }), 
128 /* KEYED_FRAGMENT */))
```

## 小结

transformFor 解析 v-for 表达式，提取 value、key、index 别名和数据源。它将变量添加到作用域，使其不需要 `_ctx` 前缀。生成 renderList 调用，每个项生成一个 VNode。Fragment 标志告诉运行时如何 diff：有 key 用 keyed diff，无 key 用顺序 diff。template 上的 v-for 展开子节点。
