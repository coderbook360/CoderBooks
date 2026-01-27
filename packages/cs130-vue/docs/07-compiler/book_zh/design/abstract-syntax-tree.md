# 抽象语法树 AST

抽象语法树（Abstract Syntax Tree，AST）是源代码的树形表示。它抽象掉了语法的表面细节，保留程序的本质结构。在 Vue 编译器中，AST 是连接解析阶段和代码生成阶段的核心数据结构。

## 为什么需要 AST

直接从源码文本生成目标代码当然是可能的，但这种做法问题很多。源码是线性的字符序列，而程序的逻辑结构是层级嵌套的。遍历和操作文本非常困难，容易出错。

AST 提供了一个中间层。它是结构化的、可遍历的、可操作的。对 AST 进行转换比直接操作文本容易得多。而且 AST 可以被多个阶段共享——解析一次，转换多次，生成一次。

## 抽象 vs 具体

"抽象"意味着 AST 省略了语法的一些表面细节。比如括号、分号、空白符——这些在源码中存在，但在 AST 中通常不保留，因为它们不影响程序的语义。

考虑 `(a + b) * c`。AST 只保留乘法节点包含两个子节点：一个加法表达式和变量 c。括号的信息已经隐含在树的结构中，不需要显式表示。

但有时候也需要保留某些"具体"信息。位置信息就是一个例子。虽然它不影响语义，但对于错误报告和 source map 生成至关重要。Vue 的 AST 节点都保留了完整的位置信息。

## Vue AST 的节点类型

Vue 模板 AST 定义了多种节点类型，每种对应模板中的一种语法结构。

根节点（RootNode）是整个模板的容器。它包含 children 数组存放顶层节点，还有一些模板级的信息如静态提升列表、helpers 集合等。

元素节点（ElementNode）表示 HTML 元素或组件。它包含标签名、属性列表、子节点列表，以及 tagType 区分原生元素、组件、slot 等。

文本节点（TextNode）表示纯文本内容。插值节点（InterpolationNode）表示 `{{ expr }}`，包含一个表达式节点作为内容。

属性节点和指令节点分别表示普通属性和 Vue 指令。指令节点还有 arg（参数）、exp（表达式）、modifiers（修饰符）等字段。

## 节点类型标识

Vue 使用枚举来标识节点类型：

```typescript
export const enum NodeTypes {
  ROOT,
  ELEMENT,
  TEXT,
  COMMENT,
  SIMPLE_EXPRESSION,
  INTERPOLATION,
  ATTRIBUTE,
  DIRECTIVE,
  // 转换后的节点类型
  IF,
  IF_BRANCH,
  FOR,
  TEXT_CALL,
  VNODE_CALL,
  // ...
}
```

通过 type 字段可以判断节点类型，进行类型收窄。这种设计比传统的 instanceof 检查更高效，也更适合跨边界传递。

## 树的遍历

AST 的核心操作是遍历。遍历分为深度优先和广度优先，前者更常用。深度优先又分为前序、中序、后序。

Vue 编译器的转换阶段使用前序遍历——先处理父节点，再处理子节点。但有时候需要后序处理，这时使用退出钩子——先进入所有子节点，处理完后再处理父节点。

```typescript
function traverseNode(node, context) {
  // 进入阶段：应用转换插件
  for (const transform of transforms) {
    const onExit = transform(node, context)
    if (onExit) exitFns.push(onExit)
  }
  
  // 递归处理子节点
  traverseChildren(node, context)
  
  // 退出阶段：执行退出钩子
  let i = exitFns.length
  while (i--) {
    exitFns[i]()
  }
}
```

## 节点的创建

AST 节点通过工厂函数创建，这保证了结构的一致性：

```typescript
export function createRoot(children, loc): RootNode {
  return {
    type: NodeTypes.ROOT,
    children,
    helpers: [],
    components: [],
    directives: [],
    hoists: [],
    imports: [],
    cached: 0,
    temps: 0,
    codegenNode: undefined,
    loc
  }
}
```

工厂函数确保必需字段存在，提供默认值，并正确设置类型。这比直接构造对象字面量更安全。

## 节点的不可变性

理论上 AST 节点应该是不可变的——创建后不再修改。这样可以安全地在多个阶段间共享，也便于实现撤销/重做等功能。

但在实践中，Vue 编译器为了性能会原地修改节点。转换阶段会向节点添加新字段（如 codegenNode），而不是创建新节点。这是性能和纯粹性之间的权衡。

## 位置信息

每个节点都有 loc 字段记录源码位置：

```typescript
interface SourceLocation {
  start: Position
  end: Position
  source: string  // 对应的源码片段
}

interface Position {
  offset: number  // 从文件开始的字符偏移
  line: number    // 行号（1-indexed）
  column: number  // 列号（1-indexed）
}
```

精确的位置信息让编译错误能够准确指向问题所在。它也是生成 source map 的基础，让开发者在调试时能够看到原始模板而不是生成的代码。

## 表达式节点

Vue 模板中的表达式（插值、指令值）使用专门的表达式节点：

```typescript
interface SimpleExpressionNode {
  type: NodeTypes.SIMPLE_EXPRESSION
  content: string
  isStatic: boolean
  isConstant: boolean
  loc: SourceLocation
}
```

isStatic 表示表达式是否是静态的（不依赖响应式数据），isConstant 表示是否是编译时常量。这些标记帮助优化器做出决策。

## 转换后的节点

转换阶段会创建新类型的节点，或向现有节点添加信息。比如 v-if 转换后会产生 IfNode 包含多个分支：

```typescript
interface IfNode {
  type: NodeTypes.IF
  branches: IfBranchNode[]
  codegenNode?: IfConditionalExpression
}
```

codegenNode 字段由转换阶段填充，指导代码生成阶段如何输出。它包含了生成代码所需的全部信息。

## AST 的调试

Vue 提供了 AST Explorer 等工具可视化 AST。在调试编译器问题时，能够直观地看到 AST 结构非常有帮助。

在代码中，可以 JSON.stringify AST（需要处理循环引用）来检查结构。Vue 编译器的错误信息通常包含问题节点的位置，便于定位。

## 小结

AST 是 Vue 编译器的核心数据结构，它在解析阶段被创建，在转换阶段被分析和修改，在代码生成阶段被消费。精心设计的节点类型系统让各个阶段能够准确表达和处理模板的各种结构。位置信息的保留确保了良好的错误报告和调试体验。理解 AST 的设计是深入 Vue 编译器源码的基础。
