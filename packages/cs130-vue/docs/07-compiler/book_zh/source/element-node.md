# ElementNode 元素节点

元素节点是 Vue 模板 AST 中最核心的节点类型，用于表示 HTML 元素、Vue 组件、slot 和 template 等各种标签。

## 节点结构

```typescript
export interface BaseElementNode extends Node {
  type: NodeTypes.ELEMENT
  ns: Namespace
  tag: string
  tagType: ElementTypes
  isSelfClosing: boolean
  props: Array<AttributeNode | DirectiveNode>
  children: TemplateChildNode[]
}

export interface PlainElementNode extends BaseElementNode {
  tagType: ElementTypes.ELEMENT
  codegenNode:
    | VNodeCall
    | SimpleExpressionNode
    | CacheExpression
    | MemoExpression
    | undefined
  ssrCodegenNode?: TemplateLiteral
}

export interface ComponentNode extends BaseElementNode {
  tagType: ElementTypes.COMPONENT
  codegenNode:
    | VNodeCall
    | CacheExpression
    | MemoExpression
    | undefined
  ssrCodegenNode?: CallExpression
}
```

基础元素节点包含命名空间、标签名、标签类型、是否自闭合、属性列表和子节点。不同的标签类型会扩展出不同的 codegenNode 类型。

## 标签类型枚举

```typescript
export const enum ElementTypes {
  ELEMENT,    // 普通 HTML 元素
  COMPONENT,  // Vue 组件
  SLOT,       // slot 插槽
  TEMPLATE    // template 模板元素
}
```

标签类型的区分发生在 parse 阶段，通过检查标签名和编译配置来判断：

```typescript
function resolveElementType(
  tag: string,
  props: (AttributeNode | DirectiveNode)[],
  context: ParserContext
): ElementTypes {
  const options = context.options
  
  // 内置 slot 标签
  if (tag === 'slot') {
    return ElementTypes.SLOT
  }
  
  // template 标签（带 v-if/v-for/v-slot）
  if (tag === 'template') {
    if (props.some(p => 
      p.type === NodeTypes.DIRECTIVE && 
      isSpecialTemplateDirective(p.name)
    )) {
      return ElementTypes.TEMPLATE
    }
  }
  
  // 组件判断
  if (isComponent(tag, props, context)) {
    return ElementTypes.COMPONENT
  }
  
  return ElementTypes.ELEMENT
}
```

## 命名空间

```typescript
export const enum Namespaces {
  HTML = 0,
  SVG = 1,
  MATH_ML = 2
}
```

命名空间影响标签和属性的解析规则。HTML 元素使用默认命名空间，SVG 和 MathML 有各自的特殊处理。

```typescript
function getNamespace(tag: string, parent: ElementNode | undefined) {
  let ns = parent ? parent.ns : Namespaces.HTML
  
  if (parent && ns === Namespaces.HTML) {
    if (tag === 'svg') {
      return Namespaces.SVG
    }
    if (tag === 'math') {
      return Namespaces.MATH_ML
    }
  }
  
  return ns
}
```

## 属性处理

元素节点的 props 数组包含两种类型：静态属性和指令属性。

```typescript
// 静态属性
interface AttributeNode extends Node {
  type: NodeTypes.ATTRIBUTE
  name: string
  value: TextNode | undefined
}

// 指令属性
interface DirectiveNode extends Node {
  type: NodeTypes.DIRECTIVE
  name: string
  exp: ExpressionNode | undefined
  arg: ExpressionNode | undefined
  modifiers: string[]
}
```

解析示例：

```html
<div id="app" :class="cls" @click="handle" v-show="visible">
```

生成的 props 数组：
```typescript
[
  { type: 'ATTRIBUTE', name: 'id', value: { content: 'app' } },
  { type: 'DIRECTIVE', name: 'bind', arg: { content: 'class' }, exp: { content: 'cls' } },
  { type: 'DIRECTIVE', name: 'on', arg: { content: 'click' }, exp: { content: 'handle' } },
  { type: 'DIRECTIVE', name: 'show', exp: { content: 'visible' } }
]
```

## 自闭合标签

```typescript
// isSelfClosing 标记
<input />           // isSelfClosing: true
<MyComponent />     // isSelfClosing: true
<div></div>         // isSelfClosing: false

// HTML void 元素也视为自闭合
<input>             // 自动识别为 void 元素
<br>
<img>
```

自闭合标签影响解析行为：不需要寻找闭合标签，也不会有子节点。

## 子节点

元素的 children 数组可以包含多种类型的子节点：

```typescript
type TemplateChildNode =
  | ElementNode
  | InterpolationNode
  | CompoundExpressionNode
  | TextNode
  | CommentNode
  | IfNode
  | IfBranchNode
  | ForNode
  | TextCallNode
```

解析阶段生成的子节点相对简单，转换阶段会创建更复杂的容器节点。

## 组件识别

```typescript
function isComponent(
  tag: string,
  props: (AttributeNode | DirectiveNode)[],
  context: ParserContext
): boolean {
  const options = context.options
  
  // is 属性
  if (props.some(p => p.name === 'is')) {
    return true
  }
  
  // 动态组件
  if (tag === 'component') {
    return true
  }
  
  // 首字母大写
  if (/^[A-Z]/.test(tag)) {
    return true
  }
  
  // 内置组件
  if (isBuiltInComponent(tag)) {
    return true
  }
  
  // 配置中的自定义元素判断
  if (options.isCustomElement && options.isCustomElement(tag)) {
    return false
  }
  
  // 原生 HTML 标签
  if (options.isNativeTag && options.isNativeTag(tag)) {
    return false
  }
  
  return true
}
```

组件识别逻辑综合考虑多种因素，确保正确区分组件和原生元素。

## 代码生成节点

在 transform 阶段，元素节点会附加 codegenNode：

```typescript
node.codegenNode = {
  type: NodeTypes.VNODE_CALL,
  tag: `"div"`,
  props: createObjectExpression(propNodes),
  children: node.children,
  patchFlag: '1 /* TEXT */',
  dynamicProps: undefined,
  directives: undefined,
  isBlock: false,
  disableTracking: false,
  isComponent: false
}
```

这个结构直接用于代码生成，包含了创建虚拟节点所需的全部信息。

## 小结

ElementNode 是模板 AST 的核心：

1. **类型区分**：ELEMENT、COMPONENT、SLOT、TEMPLATE
2. **命名空间**：支持 HTML、SVG、MathML
3. **属性系统**：静态属性与指令属性
4. **子节点管理**：递归包含各类子节点
5. **代码生成准备**：codegenNode 存储编译结果

下一章将分析 TextNode 与 InterpolationNode 文本相关节点。
