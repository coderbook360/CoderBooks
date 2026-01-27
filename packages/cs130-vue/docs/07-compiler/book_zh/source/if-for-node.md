# IfNode 与 ForNode

条件节点和循环节点是 Vue 模板结构化指令的 AST 表示，它们在转换阶段从指令创建。

## IfNode 结构

```typescript
export interface IfNode extends Node {
  type: NodeTypes.IF
  branches: IfBranchNode[]
  codegenNode?: IfConditionalExpression | CacheExpression
}

export interface IfBranchNode extends Node {
  type: NodeTypes.IF_BRANCH
  condition: ExpressionNode | undefined  // v-else 时为 undefined
  children: TemplateChildNode[]
  userKey?: AttributeNode | DirectiveNode
  isTemplateIf?: boolean
}
```

IfNode 包含多个分支，每个分支有条件表达式和子节点。

## 条件指令示例

```html
<div v-if="type === 'A'">A</div>
<div v-else-if="type === 'B'">B</div>
<div v-else>C</div>
```

转换后的 AST：
```typescript
{
  type: NodeTypes.IF,
  branches: [
    {
      type: NodeTypes.IF_BRANCH,
      condition: { content: "type === 'A'" },
      children: [{ type: ELEMENT, tag: 'div', ... }]
    },
    {
      type: NodeTypes.IF_BRANCH,
      condition: { content: "type === 'B'" },
      children: [{ type: ELEMENT, tag: 'div', ... }]
    },
    {
      type: NodeTypes.IF_BRANCH,
      condition: undefined,  // v-else
      children: [{ type: ELEMENT, tag: 'div', ... }]
    }
  ]
}
```

## ForNode 结构

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

export interface ForParseResult {
  source: ExpressionNode
  value: ExpressionNode | undefined
  key: ExpressionNode | undefined
  index: ExpressionNode | undefined
}
```

ForNode 包含循环源和迭代变量的解构信息。

## 循环指令示例

```html
<div v-for="(item, index) in items" :key="item.id">
  {{ item.name }}
</div>
```

转换后的 AST：
```typescript
{
  type: NodeTypes.FOR,
  source: { content: 'items' },
  valueAlias: { content: 'item' },
  keyAlias: undefined,
  objectIndexAlias: { content: 'index' },
  parseResult: {
    source: { content: 'items' },
    value: { content: 'item' },
    key: undefined,
    index: { content: 'index' }
  },
  children: [{ type: ELEMENT, tag: 'div', ... }]
}
```

## 转换过程

```typescript
// transformIf
export const transformIf = createStructuralDirectiveTransform(
  /^(if|else|else-if)$/,
  (node, dir, context) => {
    return processIf(node, dir, context, (ifNode, branch, isRoot) => {
      // 返回退出函数
      return () => {
        if (isRoot) {
          ifNode.codegenNode = createCodegenNodeForBranch(branch, 0, context)
        } else {
          // 处理 else-if 和 else
          const parentCondition = getParentCondition(ifNode.codegenNode!)
          parentCondition.alternate = createCodegenNodeForBranch(
            branch,
            ifNode.branches.length - 1,
            context
          )
        }
      }
    })
  }
)
```

条件转换将相邻的 v-if/v-else-if/v-else 元素收集到同一个 IfNode 中。

## v-for 表达式解析

```typescript
const forAliasRE = /([\s\S]*?)\s+(?:in|of)\s+([\s\S]*)/
const forIteratorRE = /,([^,\}\]]*)(?:,([^,\}\]]*))?$/
const stripParensRE = /^\(|\)$/g

function parseForExpression(input: string): ForParseResult | undefined {
  const match = forAliasRE.exec(input)
  if (!match) return undefined

  const [, LHS, RHS] = match
  const source = createSimpleExpression(RHS.trim())
  
  const result: ForParseResult = {
    source,
    value: undefined,
    key: undefined,
    index: undefined
  }

  let valueContent = LHS.trim().replace(stripParensRE, '').trim()
  const iteratorMatch = forIteratorRE.exec(valueContent)

  if (iteratorMatch) {
    valueContent = valueContent.replace(forIteratorRE, '').trim()
    const keyContent = iteratorMatch[1].trim()
    if (keyContent) {
      result.key = createSimpleExpression(keyContent)
    }
    if (iteratorMatch[2]) {
      const indexContent = iteratorMatch[2].trim()
      if (indexContent) {
        result.index = createSimpleExpression(indexContent)
      }
    }
  }

  if (valueContent) {
    result.value = createSimpleExpression(valueContent)
  }

  return result
}
```

## 代码生成

### If 代码生成

```typescript
// 三元表达式结构
type === 'A'
  ? _createVNode("div", null, "A")
  : type === 'B'
    ? _createVNode("div", null, "B")
    : _createVNode("div", null, "C")
```

### For 代码生成

```typescript
// renderList 调用
_renderList(items, (item, index) => {
  return _createVNode("div", { key: item.id }, [
    _toDisplayString(item.name)
  ])
})
```

## key 处理

```typescript
// v-for 的 key
<div v-for="item in items" :key="item.id">

// 生成代码中的 key
_renderList(items, (item) => {
  return _createVNode("div", { key: item.id }, ...)
})

// v-if 的 key（手动指定）
<div v-if="show" key="a">A</div>
<div v-else key="b">B</div>
```

key 用于运行时的节点复用判断，是 diff 算法的关键。

## Block 优化

```typescript
// v-if 创建 Block
show
  ? (_openBlock(), _createBlock("div", { key: 0 }, "Show"))
  : _createCommentVNode("v-if", true)

// v-for 创建 Fragment Block
(_openBlock(true), _createBlock(_Fragment, null,
  _renderList(items, (item) => {
    return (_openBlock(), _createBlock("div", { key: item.id }, ...))
  })
, 128 /* KEYED_FRAGMENT */))
```

Block 机制用于优化动态结构的更新。

## 嵌套处理

```html
<div v-for="group in groups">
  <span v-for="item in group.items" v-if="item.visible">
    {{ item.name }}
  </span>
</div>
```

嵌套的指令会形成嵌套的 ForNode 和 IfNode 结构。

## 边界情况

```typescript
// v-if 和 v-for 同时使用（不推荐）
// Vue 3 中 v-if 优先级高于 v-for

// template 上的指令
<template v-if="show">
  <div>A</div>
  <div>B</div>
</template>
// 不创建额外 DOM 元素

// 空列表
<div v-for="item in []">{{ item }}</div>
// 渲染为空 Fragment
```

## 性能考虑

```typescript
// v-for 需要 key 以优化 diff
<div v-for="item in items" :key="item.id">

// 避免在 v-for 中使用 v-if
// 使用 computed 预先过滤

// 长列表考虑虚拟滚动
```

合理使用 key 和避免不必要的条件判断能显著提升性能。

## 小结

IfNode 与 ForNode 的设计特点：

1. **结构化表示**：将指令转换为专用节点类型
2. **分支管理**：IfNode 收集所有条件分支
3. **迭代解析**：ForNode 解构循环表达式
4. **代码生成支持**：生成三元表达式和 renderList 调用
5. **Block 优化**：动态结构使用 Block 追踪

下一章将分析 SlotOutletNode 与 TemplateNode 插槽相关节点。
