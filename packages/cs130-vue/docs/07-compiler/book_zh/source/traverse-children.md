# traverseChildren 子节点遍历

子节点遍历是 AST 转换的核心机制，负责递归处理所有子节点并维护转换上下文。

## 核心实现

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

遍历每个子节点前设置上下文的父节点引用、子节点索引和移除回调，然后递归调用 traverseNode 处理子节点。

## 上下文维护

```typescript
interface TransformContext {
  parent: ParentNode | null
  childIndex: number
  currentNode: TemplateChildNode | null
  onNodeRemoved: () => void
  // ...其他字段
}
```

上下文中的 parent 和 childIndex 帮助转换插件定位当前节点在树中的位置，这在需要修改父节点或兄弟节点时非常有用。

## 节点移除处理

```typescript
const nodeRemoved = () => {
  i--
}

// 转换插件中移除节点
context.removeNode()

// removeNode 实现
removeNode(node?: TemplateChildNode) {
  const parent = context.parent!
  const list = parent.children
  const removalIndex = node
    ? list.indexOf(node)
    : context.currentNode
      ? context.childIndex
      : -1
      
  if (!node || node === context.currentNode) {
    context.currentNode = null
    context.onNodeRemoved()  // 调用 i--
  } else {
    if (context.childIndex > removalIndex) {
      context.childIndex--
      context.onNodeRemoved()
    }
  }
  
  list.splice(removalIndex, 1)
}
```

节点移除后需要调整索引 i，防止跳过下一个节点或越界访问。

## 节点替换处理

```typescript
replaceNode(node: TemplateChildNode) {
  context.parent!.children[context.childIndex] = context.currentNode = node
}

// 使用示例：将 text + interpolation 替换为 compound
if (hasText) {
  context.replaceNode(
    createCompoundExpression(children)
  )
}
```

替换节点直接修改父节点的 children 数组并更新 currentNode。

## 字符串子节点

```typescript
if (isString(child)) continue
```

某些节点的 children 可能包含字符串（如 CompoundExpressionNode），这些不是 AST 节点，跳过不处理。

## 遍历顺序

```typescript
// 前序遍历：先处理父节点，再处理子节点
traverseNode(parent)
  -> 执行转换插件（进入阶段）
  -> traverseChildren(parent)
    -> traverseNode(child1)
    -> traverseNode(child2)
    -> ...
  -> 执行转换插件（退出阶段）
```

这种遍历顺序允许转换在进入时准备上下文，在退出时收集信息。

## 结构性指令处理

```typescript
// v-if 转换创建 IfNode
// 原始子节点被移到 IfBranchNode 中
<div v-if="show">content</div>

// 转换后
IfNode {
  branches: [
    IfBranchNode {
      children: [
        ElementNode { tag: 'div', children: [...] }
      ]
    }
  ]
}
```

结构性指令转换会改变节点的父子关系，traverseChildren 需要正确处理这种情况。

## 嵌套遍历

```typescript
// 多层嵌套
<div>
  <span>
    <a>text</a>
  </span>
</div>

// 遍历过程
traverseNode(div)
  traverseChildren(div)
    traverseNode(span)
      traverseChildren(span)
        traverseNode(a)
          traverseChildren(a)
            traverseNode(text)
```

递归遍历确保每个节点都被处理。

## 转换插件与遍历

```typescript
function traverseNode(node, context) {
  context.currentNode = node
  const { nodeTransforms } = context
  const exitFns = []
  
  // 进入阶段
  for (let i = 0; i < nodeTransforms.length; i++) {
    const onExit = nodeTransforms[i](node, context)
    if (onExit) {
      exitFns.push(onExit)
    }
    if (!context.currentNode) {
      // 节点被移除
      return
    }
    node = context.currentNode
  }

  // 处理子节点
  switch (node.type) {
    case NodeTypes.ELEMENT:
    case NodeTypes.ROOT:
    case NodeTypes.IF:
    case NodeTypes.FOR:
      traverseChildren(node, context)
      break
  }

  // 退出阶段
  context.currentNode = node
  let i = exitFns.length
  while (i--) {
    exitFns[i]()
  }
}
```

转换插件可以返回退出函数，在子节点处理完成后执行。

## 性能考虑

```typescript
// 避免重复遍历
// 转换插件应该只处理相关节点类型

// 早期退出
if (node.type !== NodeTypes.ELEMENT) {
  return
}

// 跳过已处理的节点
if (node.codegenNode) {
  return
}
```

良好的转换插件设计能减少不必要的遍历开销。

## 小结

traverseChildren 的设计要点：

1. **索引维护**：正确处理节点增删后的索引变化
2. **上下文传递**：设置 parent、childIndex 等信息
3. **节点移除**：通过回调调整遍历索引
4. **递归遍历**：深度优先遍历整个树
5. **字符串跳过**：过滤非 AST 节点

下一章将分析 transformElement 元素转换的实现。
