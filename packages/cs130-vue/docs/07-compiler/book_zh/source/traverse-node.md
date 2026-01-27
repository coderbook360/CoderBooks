# traverseNode 节点遍历

`traverseNode` 实现 AST 的深度优先遍历，是转换阶段的核心机制。

## 函数实现

```typescript
export function traverseNode(
  node: RootNode | TemplateChildNode,
  context: TransformContext
) {
  context.currentNode = node
  
  // 获取节点转换列表
  const { nodeTransforms } = context
  const exitFns: (() => void)[] = []
  
  // 应用所有节点转换
  for (let i = 0; i < nodeTransforms.length; i++) {
    const onExit = nodeTransforms[i](node, context)
    if (onExit) {
      if (isArray(onExit)) {
        exitFns.push(...onExit)
      } else {
        exitFns.push(onExit)
      }
    }
    // 检查节点是否被移除
    if (!context.currentNode) {
      return
    } else {
      // 节点可能被替换，更新引用
      node = context.currentNode
    }
  }

  // 根据节点类型处理
  switch (node.type) {
    case NodeTypes.COMMENT:
      if (!context.ssr) {
        context.helper(CREATE_COMMENT)
      }
      break
    case NodeTypes.INTERPOLATION:
      if (!context.ssr) {
        context.helper(TO_DISPLAY_STRING)
      }
      break
    case NodeTypes.IF:
      for (let i = 0; i < node.branches.length; i++) {
        traverseNode(node.branches[i], context)
      }
      break
    case NodeTypes.IF_BRANCH:
    case NodeTypes.FOR:
    case NodeTypes.ELEMENT:
    case NodeTypes.ROOT:
      traverseChildren(node, context)
      break
  }

  // 逆序调用退出函数
  context.currentNode = node
  let i = exitFns.length
  while (i--) {
    exitFns[i]()
  }
}
```

## 遍历顺序

遍历是深度优先、先序访问：

```
ROOT
├── ELEMENT (div)
│   ├── TEXT ("Hello")
│   └── ELEMENT (span)
│       └── INTERPOLATION ({{ msg }})
└── ELEMENT (p)
```

访问顺序：ROOT → div → "Hello" → span → {{ msg }} → p

## 节点转换的执行

每个节点都会依次应用所有 nodeTransforms：

```typescript
for (let i = 0; i < nodeTransforms.length; i++) {
  const onExit = nodeTransforms[i](node, context)
  // ...
}
```

转换的顺序很重要。比如 `transformIf` 在 `transformFor` 之前，决定了 v-if 和 v-for 同时使用时的优先级。

## 退出函数机制

转换可以返回退出函数：

```typescript
function transformElement(node, context) {
  // 进入阶段：在子节点处理前执行
  // 这里可以修改节点，但子节点还未处理
  
  return () => {
    // 退出阶段：子节点都已处理
    // 这里可以基于处理后的子节点生成代码
  }
}
```

退出函数按逆序调用：

```typescript
// 注册顺序：A, B, C
// 调用顺序：C, B, A（逆序）
let i = exitFns.length
while (i--) {
  exitFns[i]()
}
```

这确保后注册的转换先完成，形成洋葱模型。

## 节点移除处理

```typescript
if (!context.currentNode) {
  return
}
```

如果转换移除了当前节点，立即返回，不继续处理。

## 节点替换处理

```typescript
node = context.currentNode
```

转换可能替换节点（如 v-if 将 ElementNode 替换为 IfNode）。更新 node 引用确保后续转换和子节点遍历使用新节点。

## 按类型处理

```typescript
switch (node.type) {
  case NodeTypes.COMMENT:
    if (!context.ssr) {
      context.helper(CREATE_COMMENT)
    }
    break
  case NodeTypes.INTERPOLATION:
    if (!context.ssr) {
      context.helper(TO_DISPLAY_STRING)
    }
    break
  // ...
}
```

某些节点类型需要注册帮助函数。这个 switch 处理不需要专门转换函数的简单情况。

## 递归遍历子节点

```typescript
case NodeTypes.IF:
  for (let i = 0; i < node.branches.length; i++) {
    traverseNode(node.branches[i], context)
  }
  break
case NodeTypes.IF_BRANCH:
case NodeTypes.FOR:
case NodeTypes.ELEMENT:
case NodeTypes.ROOT:
  traverseChildren(node, context)
  break
```

IfNode 特殊处理：遍历每个分支。其他容器节点使用 `traverseChildren`。

## traverseChildren 实现

```typescript
export function traverseChildren(
  parent: ParentNode,
  context: TransformContext
) {
  let i = 0
  const nodeRemoved = () => {
    i--
  }
  for (; i < parent.children.length; i++) {
    const child = parent.children[i]
    if (isString(child)) continue
    context.parent = parent
    context.childIndex = i
    context.onNodeRemoved = nodeRemoved
    traverseNode(child, context)
  }
}
```

### 节点移除的索引调整

当子节点被移除时，需要调整循环索引：

```typescript
const nodeRemoved = () => {
  i--
}
context.onNodeRemoved = nodeRemoved
```

如果不调整，会跳过紧随被移除节点之后的节点。

## 实际转换流程示例

```html
<div v-if="show">{{ msg }}</div>
```

1. traverseNode(ELEMENT)
2. transformOnce(node) - 无操作
3. transformIf(node) - 将 ELEMENT 替换为 IF
4. 更新 node = IF
5. transformFor(IF) - 无操作
6. ...其他转换
7. switch: IF 类型
8. traverseNode(IF_BRANCH)
9. traverseChildren(IF_BRANCH)
10. traverseNode(ELEMENT)
11. 处理 div 元素
12. traverseChildren(div)
13. traverseNode(INTERPOLATION)
14. 注册 TO_DISPLAY_STRING
15. 回溯：执行退出函数

## 退出函数的用途

```typescript
// transformElement
return () => {
  // 此时所有子节点都已转换
  // 可以基于转换后的子节点生成 VNode 调用
  node.codegenNode = createVNodeCall(
    context,
    tag,
    props,
    children,  // 子节点已转换
    patchFlag,
    ...
  )
}

// transformIf
return () => {
  // 此时所有分支都已转换
  // 可以生成条件表达式
  node.codegenNode = createCodegenNode(...)
}
```

## 多个退出函数

转换可以返回多个退出函数：

```typescript
function someTransform(node, context) {
  return [
    () => { /* 退出处理 1 */ },
    () => { /* 退出处理 2 */ }
  ]
}
```

它们都会被调用，顺序同样是逆序。

## 小结

traverseNode 实现深度优先遍历。每个节点依次应用所有转换，转换可以返回退出函数在子节点处理后执行。节点可能被替换或移除，遍历逻辑会相应调整。这种设计使转换能够在进入阶段预处理、在退出阶段后处理，形成灵活的转换管道。
