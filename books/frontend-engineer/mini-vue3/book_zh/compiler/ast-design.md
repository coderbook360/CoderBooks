# 模板 AST 节点类型设计

AST 是编译器的核心数据结构。它需要表示模板的所有信息，同时支持后续的转换和代码生成。

**好的 AST 设计是编译器质量的基础。** 本章将分析 Vue 3 模板 AST 的节点类型设计，理解为什么这样设计。

## 节点类型枚举

```javascript
const NodeTypes = {
  // === 模板节点 ===
  ROOT: 0,                  // 根节点
  ELEMENT: 1,               // 元素节点
  TEXT: 2,                  // 文本节点
  COMMENT: 3,               // 注释节点
  SIMPLE_EXPRESSION: 4,     // 简单表达式
  INTERPOLATION: 5,         // 插值 {{ }}
  ATTRIBUTE: 6,             // 属性
  DIRECTIVE: 7,             // 指令
  
  // === 容器节点（转换阶段生成）===
  COMPOUND_EXPRESSION: 8,   // 复合表达式
  IF: 9,                    // v-if 分支容器
  IF_BRANCH: 10,            // v-if 单个分支
  FOR: 11,                  // v-for 容器
  TEXT_CALL: 12,            // createTextVNode 调用
  
  // === 代码生成节点 ===
  VNODE_CALL: 13,           // createVNode 调用
  JS_CALL_EXPRESSION: 14,   // 函数调用表达式
  JS_OBJECT_EXPRESSION: 15, // 对象表达式
  JS_PROPERTY: 16,          // 对象属性
  JS_ARRAY_EXPRESSION: 17,  // 数组表达式
  JS_FUNCTION_EXPRESSION: 18, // 函数表达式
  JS_CONDITIONAL_EXPRESSION: 19, // 条件表达式
  JS_CACHE_EXPRESSION: 20   // 缓存表达式
}
```

分为三类：
1. **模板节点**：直接从模板解析得到
2. **容器节点**：转换阶段生成，用于结构化表示
3. **代码生成节点**：表示 JavaScript 代码结构

## 元素类型枚举

```javascript
const ElementTypes = {
  ELEMENT: 0,     // 原生 DOM 元素
  COMPONENT: 1,   // 组件
  SLOT: 2,        // <slot>
  TEMPLATE: 3     // <template>
}
```

## 基础节点接口

```javascript
// 所有节点的基础
interface Node {
  type: NodeTypes
  loc: SourceLocation
}

// 源码位置
interface SourceLocation {
  start: Position
  end: Position
  source: string
}

interface Position {
  offset: number  // 字符偏移
  line: number    // 行号
  column: number  // 列号
}
```

## 根节点

```javascript
interface RootNode extends Node {
  type: NodeTypes.ROOT
  children: TemplateChildNode[]
  
  // 转换阶段填充
  helpers: symbol[]       // 使用的运行时帮助函数
  components: string[]    // 使用的组件
  directives: string[]    // 使用的指令
  hoists: JSChildNode[]   // 提升的静态节点
  imports: ImportItem[]   // 导入项
  cached: number          // 缓存数量
  codegenNode?: TemplateChildNode  // 代码生成入口
}
```

## 元素节点

```javascript
interface ElementNode extends Node {
  type: NodeTypes.ELEMENT
  tag: string                     // 标签名
  tagType: ElementTypes           // 元素类型
  props: (AttributeNode | DirectiveNode)[]
  children: TemplateChildNode[]
  isSelfClosing: boolean
  
  // 转换阶段填充
  codegenNode?: VNodeCall | SimpleExpressionNode
}
```

## 属性节点

```javascript
// 普通属性
interface AttributeNode extends Node {
  type: NodeTypes.ATTRIBUTE
  name: string
  value: TextNode | undefined
}

// 指令
interface DirectiveNode extends Node {
  type: NodeTypes.DIRECTIVE
  name: string                    // 指令名（不含 v-）
  exp: ExpressionNode | undefined // 表达式
  arg: ExpressionNode | undefined // 参数
  modifiers: string[]             // 修饰符
}
```

示例：

```html
<div v-bind:class.sync="className">
```

```javascript
{
  type: NodeTypes.DIRECTIVE,
  name: 'bind',
  arg: { content: 'class' },
  exp: { content: 'className' },
  modifiers: ['sync']
}
```

## 表达式节点

```javascript
// 简单表达式
interface SimpleExpressionNode extends Node {
  type: NodeTypes.SIMPLE_EXPRESSION
  content: string           // 表达式内容
  isStatic: boolean         // 是否静态
  constType: ConstantTypes  // 常量类型
}

// 复合表达式（包含多个部分）
interface CompoundExpressionNode extends Node {
  type: NodeTypes.COMPOUND_EXPRESSION
  children: (SimpleExpressionNode | string | symbol)[]
}
```

## 插值节点

```javascript
interface InterpolationNode extends Node {
  type: NodeTypes.INTERPOLATION
  content: ExpressionNode
}
```

示例：

```html
{{ user.name }}
```

```javascript
{
  type: NodeTypes.INTERPOLATION,
  content: {
    type: NodeTypes.SIMPLE_EXPRESSION,
    content: 'user.name',
    isStatic: false
  }
}
```

## 文本节点

```javascript
interface TextNode extends Node {
  type: NodeTypes.TEXT
  content: string
}
```

## 注释节点

```javascript
interface CommentNode extends Node {
  type: NodeTypes.COMMENT
  content: string
}
```

## 条件节点（v-if）

转换阶段生成：

```javascript
// v-if 容器
interface IfNode extends Node {
  type: NodeTypes.IF
  branches: IfBranchNode[]
  codegenNode?: ConditionalExpression
}

// 单个分支
interface IfBranchNode extends Node {
  type: NodeTypes.IF_BRANCH
  condition: ExpressionNode | undefined  // v-else 时为 undefined
  children: TemplateChildNode[]
}
```

## 循环节点（v-for）

```javascript
interface ForNode extends Node {
  type: NodeTypes.FOR
  source: ExpressionNode          // 数据源
  valueAlias: ExpressionNode | undefined  // item
  keyAlias: ExpressionNode | undefined    // index
  objectIndexAlias: ExpressionNode | undefined
  children: TemplateChildNode[]
  codegenNode?: ForCodegenNode
}
```

## VNode 调用节点

代码生成阶段的核心节点：

```javascript
interface VNodeCall extends Node {
  type: NodeTypes.VNODE_CALL
  tag: string | symbol | CallExpression
  props: ObjectExpression | undefined
  children: TemplateChildNode[] | undefined
  patchFlag: string | undefined
  dynamicProps: string | undefined
  directives: DirectiveArguments | undefined
  isBlock: boolean
  disableTracking: boolean
  isComponent: boolean
}
```

## JavaScript 表达式节点

用于表示生成的 JavaScript 代码：

```javascript
// 函数调用
interface CallExpression extends Node {
  type: NodeTypes.JS_CALL_EXPRESSION
  callee: string | symbol
  arguments: JSChildNode[]
}

// 对象表达式
interface ObjectExpression extends Node {
  type: NodeTypes.JS_OBJECT_EXPRESSION
  properties: Property[]
}

// 数组表达式
interface ArrayExpression extends Node {
  type: NodeTypes.JS_ARRAY_EXPRESSION
  elements: JSChildNode[]
}

// 条件表达式
interface ConditionalExpression extends Node {
  type: NodeTypes.JS_CONDITIONAL_EXPRESSION
  test: ExpressionNode
  consequent: JSChildNode
  alternate: JSChildNode
}
```

## 辅助函数

创建节点的工厂函数：

```javascript
function createVNodeCall(
  context,
  tag,
  props,
  children,
  patchFlag,
  dynamicProps,
  directives,
  isBlock,
  disableTracking,
  isComponent
) {
  if (context) {
    if (isBlock) {
      context.helper(OPEN_BLOCK)
      context.helper(isComponent ? CREATE_BLOCK : CREATE_ELEMENT_BLOCK)
    } else {
      context.helper(isComponent ? CREATE_VNODE : CREATE_ELEMENT_VNODE)
    }
  }
  
  return {
    type: NodeTypes.VNODE_CALL,
    tag,
    props,
    children,
    patchFlag,
    dynamicProps,
    directives,
    isBlock,
    disableTracking,
    isComponent,
    loc: locStub
  }
}
```

## 常量类型

用于静态提升优化：

```javascript
const ConstantTypes = {
  NOT_CONSTANT: 0,      // 非常量
  CAN_SKIP_PATCH: 1,    // 可跳过 patch
  CAN_HOIST: 2,         // 可提升
  CAN_STRINGIFY: 3      // 可字符串化
}
```

## 本章小结

本章分析了 AST 节点类型设计：

- **三类节点**：模板节点、容器节点、代码生成节点
- **基础接口**：type + loc
- **元素节点**：tag、tagType、props、children
- **表达式节点**：简单表达式、复合表达式
- **指令节点**：name、exp、arg、modifiers
- **容器节点**：IF、FOR（转换阶段生成）
- **VNodeCall**：代码生成的核心节点

良好的 AST 设计是编译器的基础。它需要既能完整表示模板信息，又能支持高效的转换和代码生成。

下一章，我们将分析插值表达式和指令的解析细节。
