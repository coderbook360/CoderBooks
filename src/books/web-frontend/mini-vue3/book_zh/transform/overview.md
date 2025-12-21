# AST 转换概述

解析阶段生成的 AST 只是模板的结构化表示。要生成高效的渲染函数，还需要对 AST 进行转换和优化。

**这就是 Transform 阶段的工作——编译器最耐人寻味的部分。** 本章将分析 Transform 的整体设计和核心流程。

## Transform 的目标

Transform 阶段承担几个关键任务：

**1. 指令处理**

将 `v-if`、`v-for` 等指令转换为对应的控制流结构：

```javascript
// 输入：原始 AST
{
  type: NodeTypes.ELEMENT,
  tag: 'div',
  props: [{
    type: NodeTypes.DIRECTIVE,
    name: 'if',
    exp: { content: 'show' }
  }]
}

// 输出：转换后的 AST
{
  type: NodeTypes.IF,
  branches: [{
    condition: { content: '_ctx.show' },
    children: [/* ... */]
  }]
}
```

**2. 表达式处理**

为表达式添加前缀，处理作用域：

```javascript
// 模板中
{{ msg }}

// 转换后
_ctx.msg
```

**3. 优化标记**

分析静态内容，添加 PatchFlag：

```javascript
// 只有 class 是动态的
{
  patchFlag: 2 /* CLASS */
}
```

**4. 代码生成准备**

为每个节点生成 `codegenNode`，供代码生成阶段使用。

## transform 入口

```javascript
function transform(root, options) {
  // 1. 创建转换上下文
  const context = createTransformContext(root, options)
  
  // 2. 遍历并转换 AST
  traverseNode(root, context)
  
  // 3. 静态提升
  if (options.hoistStatic) {
    hoistStatic(root, context)
  }
  
  // 4. 创建根节点的 codegenNode
  if (!options.ssr) {
    createRootCodegen(root, context)
  }
  
  // 5. 收集信息到根节点
  root.helpers = [...context.helpers.keys()]
  root.components = [...context.components]
  root.directives = [...context.directives]
  root.hoists = context.hoists
  root.temps = context.temps
  root.cached = context.cached
}
```

## 遍历策略

Transform 使用深度优先遍历，但有个特别之处：转换器返回的是**退出函数**，在子节点处理完毕后才执行。

```javascript
function traverseNode(node, context) {
  context.currentNode = node
  
  const { nodeTransforms } = context
  const exitFns = []
  
  // 执行所有转换器，收集退出函数
  for (let i = 0; i < nodeTransforms.length; i++) {
    const onExit = nodeTransforms[i](node, context)
    if (onExit) {
      if (isArray(onExit)) {
        exitFns.push(...onExit)
      } else {
        exitFns.push(onExit)
      }
    }
    // 节点可能被删除或替换
    if (!context.currentNode) {
      return
    }
    node = context.currentNode
  }
  
  // 递归处理子节点
  switch (node.type) {
    case NodeTypes.IF:
      for (const branch of node.branches) {
        traverseNode(branch, context)
      }
      break
    case NodeTypes.FOR:
    case NodeTypes.ELEMENT:
    case NodeTypes.ROOT:
      traverseChildren(node, context)
      break
  }
  
  // 反向执行退出函数（后进先出）
  context.currentNode = node
  let i = exitFns.length
  while (i--) {
    exitFns[i]()
  }
}
```

**为什么需要"退出函数"这种设计？**

用一个具体例子来说明：

```html
<div v-if="show">
  <span>{{ msg }}</span>
</div>
```

**如果不用退出函数**（父节点先处理完再处理子节点）：

```
1. 处理 div 的 v-if → 需要生成三元表达式
   但此时 span 还没被转换，不知道 consequent 是什么！
2. 处理 span → 生成 codegenNode
```

**使用退出函数**（子节点先处理完，再执行父节点的退出函数）：

```
1. 进入 div，发现 v-if → 返回退出函数，暂不处理
2. 递归进入 span → 生成 span 的 codegenNode
3. 递归退出 span
4. 执行 div 的退出函数 → 此时 span 已有 codegenNode
   可以正确生成：show ? spanCodegen : comment
```

**核心原则**：**子节点先处理完，父节点才能做决策**。

## 转换器类型

Vue 3 有两类转换器：

### NodeTransform

处理节点结构：

```javascript
type NodeTransform = (
  node: RootNode | TemplateChildNode,
  context: TransformContext
) => void | (() => void) | (() => void)[]
```

### DirectiveTransform

处理指令：

```javascript
type DirectiveTransform = (
  dir: DirectiveNode,
  node: ElementNode,
  context: TransformContext
) => DirectiveTransformResult
```

## 内置转换器

Vue 3 编译器注册了多个内置转换器：

```javascript
const nodeTransforms = [
  transformOnce,       // v-once
  transformIf,         // v-if/v-else
  transformMemo,       // v-memo
  transformFor,        // v-for
  transformElement,    // 元素处理
  transformSlotOutlet, // <slot>
  transformText        // 文本处理
]

const directiveTransforms = {
  bind: transformBind,   // v-bind
  on: transformOn,       // v-on
  model: transformModel  // v-model
}
```

转换器的执行顺序很重要——`v-if` 在 `v-for` 之前，符合 Vue 的优先级规则。

## 转换上下文

`TransformContext` 是转换过程的共享状态：

```javascript
interface TransformContext {
  // AST 相关
  root: RootNode
  currentNode: ParentNode | null
  parent: ParentNode | null
  childIndex: number
  
  // 收集信息
  helpers: Map<symbol, number>  // 辅助函数
  components: Set<string>
  directives: Set<string>
  hoists: JSChildNode[]         // 静态提升
  
  // 方法
  helper(name): void
  replaceNode(node): void
  removeNode(): void
  hoist(exp): SimpleExpressionNode
}
```

下一章我们将详细分析这个上下文对象。

## 转换示例

以一个简单模板为例：

```html
<div v-if="show">{{ msg }}</div>
```

转换过程：

1. **transformIf** 识别 `v-if`，创建 IfNode，返回退出函数
2. **traverseChildren** 递归处理子节点
3. **transformText** 处理插值表达式，添加 `TO_DISPLAY_STRING` helper
4. **transformElement** 处理 div 元素，生成 `codegenNode`
5. **transformIf 退出函数**执行，生成条件表达式

最终生成的 AST 包含完整的代码生成信息：

```javascript
{
  type: NodeTypes.IF,
  branches: [{
    condition: { content: '_ctx.show' },
    children: [{
      type: NodeTypes.ELEMENT,
      codegenNode: { /* VNodeCall */ }
    }]
  }],
  codegenNode: {
    type: NodeTypes.JS_CONDITIONAL_EXPRESSION,
    test: { content: '_ctx.show' },
    consequent: { /* VNodeCall */ },
    alternate: { /* createCommentVNode */ }
  }
}
```

## 本章小结

本章分析了 Transform 阶段的整体设计：

- **职责**：指令处理、表达式转换、优化标记、代码生成准备
- **遍历策略**：深度优先，退出函数后处理
- **转换器类型**：NodeTransform 和 DirectiveTransform
- **执行顺序**：内置转换器按优先级排列

Transform 是编译器最复杂的阶段，接下来几章我们将逐一分析各个转换器的实现。
