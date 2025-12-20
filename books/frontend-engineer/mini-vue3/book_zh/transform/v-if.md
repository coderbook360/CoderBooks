# v-if 与 v-else 的转换实现

`v-if` 是 Vue 最常用的指令之一。**它需要将模板中的条件渲染声明转换为 JavaScript 的三元表达式。**

**理解这个转换过程，你就能明白 `v-if` 的性能特点和使用场景。** 本章将分析 v-if 转换器的实现。

## 转换目标

```html
<!-- 原始模板 -->
<div v-if="type === 'A'">A</div>
<div v-else-if="type === 'B'">B</div>
<div v-else>Other</div>
```

```javascript
// 转换后的渲染函数
function render(_ctx) {
  return _ctx.type === 'A'
    ? _createElementVNode("div", null, "A")
    : _ctx.type === 'B'
      ? _createElementVNode("div", null, "B")
      : _createElementVNode("div", null, "Other")
}
```

如果没有 `v-else`，需要注释占位：

```javascript
// <div v-if="show">Content</div>
function render(_ctx) {
  return _ctx.show
    ? _createElementVNode("div", null, "Content")
    : _createCommentVNode("v-if", true)
}
```

## 从简单开始：只处理 v-if

**首先要问的是**：如果只需要处理单独的 `v-if`（不考虑 v-else-if 和 v-else），怎么实现？

```javascript
// 简化版：只处理 v-if
function transformIfSimple(node, context) {
  const dir = findDir(node, 'if')
  if (!dir) return
  
  // 创建条件表达式
  node.codegenNode = {
    type: 'ConditionalExpression',
    test: dir.exp,                    // 条件：show
    consequent: node.codegenNode,     // 真：元素
    alternate: createComment('v-if')  // 假：注释
  }
}
```

**问题来了**：这样做有什么局限性？

1. 没有处理 v-else-if 和 v-else
2. 多个条件分支需要嵌套三元表达式
3. 相邻的 v-if/v-else 需要关联起来

**所以 Vue 设计了 IfNode 结构**，用 `branches` 数组存储所有分支：

## IfNode 结构

v-if 转换后生成 `IfNode`：

```javascript
interface IfNode extends Node {
  type: NodeTypes.IF
  branches: IfBranchNode[]
  codegenNode?: IfConditionalExpression
}

interface IfBranchNode extends Node {
  type: NodeTypes.IF_BRANCH
  condition: ExpressionNode | undefined  // undefined 表示 v-else
  children: TemplateChildNode[]
  userKey?: AttributeNode | DirectiveNode
}
```

示例 AST：

```javascript
{
  type: NodeTypes.IF,
  branches: [
    {
      type: NodeTypes.IF_BRANCH,
      condition: { content: "type === 'A'" },
      children: [{ type: NodeTypes.ELEMENT, tag: 'div', ... }]
    },
    {
      type: NodeTypes.IF_BRANCH,
      condition: { content: "type === 'B'" },
      children: [{ type: NodeTypes.ELEMENT, tag: 'div', ... }]
    },
    {
      type: NodeTypes.IF_BRANCH,
      condition: undefined,  // v-else 没有条件
      children: [{ type: NodeTypes.ELEMENT, tag: 'div', ... }]
    }
  ]
}
```

## 结构指令转换器

v-if 是"结构指令"，它改变 AST 结构而不仅仅是生成属性。Vue 3 提供了专门的工厂函数：

```javascript
function createStructuralDirectiveTransform(name, fn) {
  const matches = isString(name)
    ? (n) => n === name
    : (n) => name.test(n)
  
  return (node, context) => {
    if (node.type === NodeTypes.ELEMENT) {
      const { props } = node
      const exitFns = []
      
      for (let i = 0; i < props.length; i++) {
        const p = props[i]
        if (p.type === NodeTypes.DIRECTIVE && matches(p.name)) {
          // 移除指令，避免无限递归
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

## transformIf 实现

```javascript
const transformIf = createStructuralDirectiveTransform(
  /^(if|else|else-if)$/,
  (node, dir, context) => {
    return processIf(node, dir, context, (ifNode, branch, isRoot) => {
      // 收集同级分支，计算 key
      const siblings = context.parent.children
      let i = siblings.indexOf(ifNode)
      let key = 0
      while (i-- >= 0) {
        const sibling = siblings[i]
        if (sibling && sibling.type === NodeTypes.IF) {
          key += sibling.branches.length
        }
      }
      
      // 返回退出函数
      return () => {
        if (isRoot) {
          // v-if 根节点，生成 codegenNode
          ifNode.codegenNode = createCodegenNodeForBranch(
            branch,
            key,
            context
          )
        } else {
          // v-else-if / v-else，附加到已有条件表达式
          const parentCondition = getParentCondition(ifNode.codegenNode)
          parentCondition.alternate = createCodegenNodeForBranch(
            branch,
            key + ifNode.branches.length - 1,
            context
          )
        }
      }
    })
  }
)
```

## processIf 核心逻辑

```javascript
function processIf(node, dir, context, processCodegen) {
  // 验证表达式
  if (dir.name !== 'else' && (!dir.exp || !dir.exp.content.trim())) {
    context.onError(
      createCompilerError(ErrorCodes.X_V_IF_NO_EXPRESSION, dir.exp.loc)
    )
    dir.exp = createSimpleExpression('true', false)
  }
  
  // 前缀处理
  if (context.prefixIdentifiers && dir.exp) {
    dir.exp = processExpression(dir.exp, context)
  }
  
  if (dir.name === 'if') {
    // v-if：创建新的 IfNode
    const branch = createIfBranch(node, dir)
    const ifNode = {
      type: NodeTypes.IF,
      loc: node.loc,
      branches: [branch]
    }
    
    // 替换原节点
    context.replaceNode(ifNode)
    
    // 返回代码生成处理器
    if (processCodegen) {
      return processCodegen(ifNode, branch, true)
    }
  } else {
    // v-else-if / v-else：找到前面的 v-if
    const siblings = context.parent.children
    let i = siblings.indexOf(node)
    
    while (i-- >= 0) {
      const sibling = siblings[i]
      
      // 跳过注释和空白
      if (sibling.type === NodeTypes.COMMENT) continue
      if (sibling.type === NodeTypes.TEXT && !sibling.content.trim()) continue
      
      if (sibling.type === NodeTypes.IF) {
        // 找到了！添加分支
        const branch = createIfBranch(node, dir)
        sibling.branches.push(branch)
        
        // 删除当前节点
        context.removeNode()
        
        // 确保子节点被转换
        const onExit = processCodegen?.(sibling, branch, false)
        
        // 切换到新分支继续遍历
        traverseNode(branch, context)
        
        return onExit
      } else {
        // 前面不是 v-if，报错
        context.onError(
          createCompilerError(ErrorCodes.X_V_ELSE_NO_ADJACENT_IF)
        )
        break
      }
    }
  }
}
```

## 分支创建

```javascript
function createIfBranch(node, dir) {
  return {
    type: NodeTypes.IF_BRANCH,
    loc: node.loc,
    condition: dir.name === 'else' ? undefined : dir.exp,
    children: node.tagType === ElementTypes.TEMPLATE
      ? node.children
      : [node],
    userKey: findProp(node, 'key')
  }
}
```

`<template v-if>` 的特殊处理：children 直接取 template 的子节点，而不是 template 本身。

## 代码生成节点

```javascript
function createCodegenNodeForBranch(branch, keyIndex, context) {
  if (branch.condition) {
    // 有条件：生成条件表达式
    return createConditionalExpression(
      branch.condition,
      createChildrenCodegenNode(branch, keyIndex, context),
      // alternate 暂时为注释，后面可能被替换
      createCallExpression(context.helper(CREATE_COMMENT), ['"v-if"', 'true'])
    )
  } else {
    // v-else：直接返回子节点
    return createChildrenCodegenNode(branch, keyIndex, context)
  }
}

function createConditionalExpression(test, consequent, alternate) {
  return {
    type: NodeTypes.JS_CONDITIONAL_EXPRESSION,
    test,
    consequent,
    alternate
  }
}
```

## 嵌套条件处理

v-else-if 和 v-else 需要附加到已有的条件表达式上。关键是找到"最内层的 alternate"：

```javascript
function getParentCondition(node) {
  while (true) {
    if (node.type === NodeTypes.JS_CONDITIONAL_EXPRESSION) {
      if (node.alternate.type === NodeTypes.JS_CONDITIONAL_EXPRESSION) {
        node = node.alternate
      } else {
        return node
      }
    } else if (node.type === NodeTypes.JS_CACHE_EXPRESSION) {
      node = node.value
    } else {
      return node
    }
  }
}
```

这样就能构建出嵌套的三元表达式：

```javascript
a ? A : b ? B : C
```

## key 处理

每个分支需要唯一的 key：

```javascript
function createChildrenCodegenNode(branch, keyIndex, context) {
  const { children } = branch
  const child = children[0]
  
  // 是否需要 Fragment
  const needFragmentWrapper = children.length !== 1 || 
    child.type !== NodeTypes.ELEMENT
  
  if (needFragmentWrapper) {
    // 多个子节点，包装 Fragment
    return createVNodeCall(
      context,
      context.helper(FRAGMENT),
      createObjectExpression([
        createObjectProperty('key', createSimpleExpression(keyIndex + '', false))
      ]),
      children
    )
  }
  
  // 单个元素，注入 key
  const codegenNode = child.codegenNode
  codegenNode.props = createObjectExpression([
    createObjectProperty('key', createSimpleExpression(keyIndex + '', false)),
    ...(codegenNode.props?.properties || [])
  ])
  
  return codegenNode
}
```

## 本章小结

本章分析了 v-if 转换器的实现：

- **IfNode 结构**：branches 数组存放所有分支
- **结构指令转换**：替换节点而非添加属性
- **分支关联**：v-else 找前面的 v-if，附加分支
- **条件表达式**：嵌套三元表达式表示多分支
- **key 注入**：确保每个分支有唯一 key

理解 v-if 转换器的模式后，v-for 的转换就容易理解了——下一章将分析它的实现。
