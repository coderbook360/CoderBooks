# transformIf 条件转换

`transformIf` 处理 v-if、v-else-if 和 v-else 指令，将它们转换为条件结构。

## 函数入口

```typescript
export const transformIf = createStructuralDirectiveTransform(
  /^(if|else|else-if)$/,
  (node, dir, context) => {
    return processIf(node, dir, context, (ifNode, branch, isRoot) => {
      // 退出回调
    })
  }
)
```

使用 `createStructuralDirectiveTransform` 辅助函数处理结构性指令。

## createStructuralDirectiveTransform

```typescript
export function createStructuralDirectiveTransform(
  name: string | RegExp,
  fn: StructuralDirectiveTransform
): NodeTransform {
  const matches = isString(name)
    ? (n: string) => n === name
    : (n: string) => name.test(n)

  return (node, context) => {
    if (node.type === NodeTypes.ELEMENT) {
      const { props } = node
      
      // 不处理 template v-slot
      if (node.tagType === ElementTypes.TEMPLATE && props.some(isVSlot)) {
        return
      }
      
      const exitFns = []
      for (let i = 0; i < props.length; i++) {
        const p = props[i]
        if (p.type === NodeTypes.DIRECTIVE && matches(p.name)) {
          // 从属性列表移除
          props.splice(i, 1)
          i--
          const onExit = fn(node, p, context)
          if (onExit) exitFns.push(onExit)
        }
      }
      return exitFns
    }
  }
}
```

## processIf 主逻辑

```typescript
export function processIf(
  node: ElementNode,
  dir: DirectiveNode,
  context: TransformContext,
  processCodegen?: (
    node: IfNode,
    branch: IfBranchNode,
    isRoot: boolean
  ) => (() => void) | undefined
) {
  if (dir.name === 'if') {
    // 创建 IfNode
    const branch = createIfBranch(node, dir)
    const ifNode: IfNode = {
      type: NodeTypes.IF,
      loc: node.loc,
      branches: [branch]
    }
    context.replaceNode(ifNode)
    
    if (processCodegen) {
      return processCodegen(ifNode, branch, true)
    }
  } else {
    // v-else-if 或 v-else
    const siblings = context.parent!.children
    let i = siblings.indexOf(node)
    while (i-- >= -1) {
      const sibling = siblings[i]
      
      // 跳过注释和空文本
      if (sibling && sibling.type === NodeTypes.COMMENT) {
        context.removeNode(sibling)
        continue
      }
      if (sibling && sibling.type === NodeTypes.TEXT && !sibling.content.trim().length) {
        context.removeNode(sibling)
        continue
      }
      
      // 找到对应的 v-if
      if (sibling && sibling.type === NodeTypes.IF) {
        context.removeNode()
        const branch = createIfBranch(node, dir)
        sibling.branches.push(branch)
        
        const onExit = processCodegen && processCodegen(sibling, branch, false)
        traverseNode(branch, context)
        if (onExit) onExit()
        
        context.currentNode = null
      } else {
        context.onError(
          createCompilerError(ErrorCodes.X_V_ELSE_NO_ADJACENT_IF, node.loc)
        )
      }
      break
    }
  }
}
```

## 创建 IfBranch

```typescript
function createIfBranch(node: ElementNode, dir: DirectiveNode): IfBranchNode {
  const isTemplateIf = node.tagType === ElementTypes.TEMPLATE
  return {
    type: NodeTypes.IF_BRANCH,
    loc: node.loc,
    condition: dir.name === 'else' ? undefined : dir.exp,
    children: isTemplateIf && !findDir(node, 'for')
      ? node.children
      : [node],
    userKey: findProp(node, 'key'),
    isTemplateIf
  }
}
```

v-else 没有条件表达式。template 上的 v-if 展开其子节点。

## 生成条件表达式

退出回调生成 codegenNode：

```typescript
return (ifNode, branch, isRoot) => {
  return () => {
    if (isRoot) {
      ifNode.codegenNode = createCodegenNodeForBranch(branch, key, context)
    } else {
      // 添加到条件链
      const parentCondition = getParentCondition(ifNode.codegenNode!)
      parentCondition.alternate = createCodegenNodeForBranch(branch, key + ifNode.branches.length - 1, context)
    }
  }
}
```

### 条件表达式结构

```typescript
// v-if="a" ... v-else-if="b" ... v-else

a ? branch1 : b ? branch2 : branch3
```

代码生成节点：

```typescript
{
  type: NodeTypes.JS_CONDITIONAL_EXPRESSION,
  test: { content: 'a' },
  consequent: createCodegenNodeForBranch(branch1),
  alternate: {
    type: NodeTypes.JS_CONDITIONAL_EXPRESSION,
    test: { content: 'b' },
    consequent: createCodegenNodeForBranch(branch2),
    alternate: createCodegenNodeForBranch(branch3)
  }
}
```

## createCodegenNodeForBranch

```typescript
function createCodegenNodeForBranch(
  branch: IfBranchNode,
  keyIndex: number,
  context: TransformContext
): IfConditionalExpression | BlockCodegenNode {
  if (branch.condition) {
    return createConditionalExpression(
      branch.condition,
      createChildrenCodegenNode(branch, keyIndex, context),
      createCallExpression(context.helper(CREATE_COMMENT), ['"v-if"', 'true'])
    )
  } else {
    return createChildrenCodegenNode(branch, keyIndex, context)
  }
}
```

条件分支生成三元表达式，v-else 分支直接生成内容。false 分支生成注释节点（用于占位）。

## key 处理

```typescript
// 用户显式 key
const userKey = findProp(node, 'key')

// 自动生成 key
const key = userKey || createSimpleExpression(String(keyIndex), true)
```

如果用户没有提供 key，自动生成一个。

## 相同 key 检查

```typescript
if (__DEV__ && dir.exp && dir.name === 'if') {
  const siblings = context.parent?.children
  if (siblings) {
    for (let i = 0; i < siblings.length; i++) {
      const sibling = siblings[i]
      if (sibling && sibling.type === NodeTypes.IF) {
        // 检查是否有相同的 key
        for (const branch of sibling.branches) {
          if (branch.userKey && areKeysEqual(branch.userKey, userKey)) {
            context.onError(
              createCompilerError(ErrorCodes.X_V_IF_SAME_KEY, branch.userKey.loc)
            )
          }
        }
      }
    }
  }
}
```

开发环境检查相同 key 的警告。

## 示例转换

```html
<div v-if="type === 'A'">A</div>
<div v-else-if="type === 'B'">B</div>
<div v-else>Default</div>
```

转换后的 AST：

```typescript
{
  type: NodeTypes.IF,
  branches: [
    {
      type: NodeTypes.IF_BRANCH,
      condition: { content: "type === 'A'" },
      children: [/* div A */]
    },
    {
      type: NodeTypes.IF_BRANCH,
      condition: { content: "type === 'B'" },
      children: [/* div B */]
    },
    {
      type: NodeTypes.IF_BRANCH,
      condition: undefined,  // v-else
      children: [/* div Default */]
    }
  ],
  codegenNode: {
    type: NodeTypes.JS_CONDITIONAL_EXPRESSION,
    test: { content: "type === 'A'" },
    consequent: /* VNode for A */,
    alternate: {
      type: NodeTypes.JS_CONDITIONAL_EXPRESSION,
      test: { content: "type === 'B'" },
      consequent: /* VNode for B */,
      alternate: /* VNode for Default */
    }
  }
}
```

## v-if 与 v-for 优先级

v-if 比 v-for 先处理（在 nodeTransforms 中顺序靠前）：

```html
<!-- 不推荐，但会这样处理 -->
<div v-for="item in items" v-if="item.show">

<!-- 每个 item 都会执行 v-if 检查 -->
```

Vue 3 推荐使用 template 明确优先级。

## 小结

transformIf 将 v-if/v-else-if/v-else 转换为 IfNode 结构。它查找相邻的条件分支，合并到同一个 IfNode 中。每个分支有条件表达式和内容。codegenNode 是嵌套的三元表达式。template 上的 v-if 会展开其子节点。key 可以用户指定或自动生成。
