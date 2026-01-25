# ElementNode 元素节点

ElementNode 表示模板中的元素。它是 AST 中最复杂的节点类型，包含标签信息、属性、子节点等。

## 节点定义

```typescript
export interface ElementNode extends Node {
  type: NodeTypes.ELEMENT
  ns: Namespaces
  tag: string
  tagType: ElementTypes
  isSelfClosing: boolean
  props: Array<AttributeNode | DirectiveNode>
  children: TemplateChildNode[]
  codegenNode:
    | VNodeCall
    | SimpleExpressionNode
    | CacheExpression
    | MemoExpression
    | undefined
  loc: SourceLocation
}
```

## 标签类型

```typescript
export const enum ElementTypes {
  ELEMENT,     // 普通元素：div, span, ...
  COMPONENT,   // 组件：MyComponent, ...
  SLOT,        // 插槽出口：<slot>
  TEMPLATE     // 模板元素：<template v-if>, <template v-for>
}
```

元素类型决定转换和代码生成的策略：

```typescript
// ELEMENT
<div class="box">...</div>
→ createElementVNode('div', { class: 'box' }, ...)

// COMPONENT
<MyButton @click="...">...</MyButton>
→ createVNode(MyButton, { onClick: ... }, ...)

// SLOT
<slot name="header" :data="..."></slot>
→ renderSlot($slots, 'header', { data: ... })

// TEMPLATE
<template v-if="show">...</template>
→ 条件表达式，不生成实际元素
```

## 命名空间

```typescript
export const enum Namespaces {
  HTML = 0,
  SVG,
  MATH_ML
}
```

命名空间影响解析和代码生成：

```html
<!-- HTML 命名空间 -->
<div></div>

<!-- SVG 命名空间 -->
<svg>
  <circle cx="50" cy="50" r="40"/>
</svg>

<!-- MathML 命名空间 -->
<math>
  <mrow>...</mrow>
</math>
```

SVG 和 MathML 有不同的标签名规则和属性处理。

## props 属性

```typescript
props: Array<AttributeNode | DirectiveNode>
```

包含静态属性和指令：

```html
<div id="app" :class="cls" @click="handle">
```

```typescript
props: [
  { type: NodeTypes.ATTRIBUTE, name: 'id', value: { content: 'app' } },
  { type: NodeTypes.DIRECTIVE, name: 'bind', arg: { content: 'class' }, exp: { content: 'cls' } },
  { type: NodeTypes.DIRECTIVE, name: 'on', arg: { content: 'click' }, exp: { content: 'handle' } }
]
```

## 自闭合标签

```typescript
isSelfClosing: boolean
```

```html
<input type="text" />   <!-- isSelfClosing: true -->
<div></div>             <!-- isSelfClosing: false -->
<br>                    <!-- isSelfClosing: false, 但是 void 元素 -->
```

自闭合和 void 元素的区别：
- 自闭合：显式以 `/>` 结尾
- void：HTML 规定不能有内容的元素（br, hr, img, input...）

## children 子节点

```typescript
children: TemplateChildNode[]
```

可以包含各种类型的子节点：

```html
<div>
  <span>Text</span>
  {{ interpolation }}
  <!-- comment -->
</div>
```

```typescript
children: [
  { type: NodeTypes.ELEMENT, tag: 'span', ... },
  { type: NodeTypes.INTERPOLATION, ... },
  { type: NodeTypes.COMMENT, ... }
]
```

## codegenNode 代码生成节点

```typescript
codegenNode:
  | VNodeCall
  | SimpleExpressionNode
  | CacheExpression
  | MemoExpression
  | undefined
```

转换阶段填充，代码生成阶段使用：

```typescript
// 普通元素
codegenNode = {
  type: NodeTypes.VNODE_CALL,
  tag: '"div"',
  props: { ... },
  children: [ ... ],
  patchFlag: PatchFlags.CLASS,
  ...
}

// 组件缓存（v-memo）
codegenNode = {
  type: NodeTypes.JS_CACHE_EXPRESSION,
  ...
}
```

## 解析产出

解析阶段产生的 ElementNode：

```typescript
function parseTag(context, type, parent): ElementNode {
  return {
    type: NodeTypes.ELEMENT,
    ns,           // 从父元素继承或新确定
    tag,          // 解析的标签名
    tagType,      // 根据标签名和属性确定
    props,        // 解析的属性列表
    isSelfClosing,// 是否自闭合
    children: [], // 由 parseElement 填充
    loc,          // 位置信息
    codegenNode: undefined  // 转换阶段填充
  }
}
```

## 组件判断

```typescript
function isComponent(tag, props, context): boolean {
  // 自定义元素不是组件
  if (context.options.isCustomElement(tag)) return false
  
  // 特殊标签名
  if (tag === 'component') return true
  
  // 大写开头
  if (/^[A-Z]/.test(tag)) return true
  
  // 核心组件
  if (isCoreComponent(tag)) return true
  
  // 平台内置组件
  if (context.options.isBuiltInComponent?.(tag)) return true
  
  // 非原生标签
  if (context.options.isNativeTag?.(tag) === false) return true
  
  // 有 is 指令
  for (const p of props) {
    if (p.type === NodeTypes.DIRECTIVE && p.name === 'is') {
      return true
    }
  }
  
  return false
}
```

## SLOT 元素

```html
<slot name="header" :data="headerData"></slot>
```

```typescript
{
  type: NodeTypes.ELEMENT,
  tag: 'slot',
  tagType: ElementTypes.SLOT,
  props: [
    { name: 'name', value: { content: 'header' } },
    { name: 'bind', arg: { content: 'data' }, exp: { content: 'headerData' } }
  ],
  children: []
}
```

## TEMPLATE 元素

```html
<template v-if="show">
  <div>Content</div>
</template>
```

带有结构指令（v-if, v-for, v-slot）的 template 元素有特殊处理：

```typescript
{
  type: NodeTypes.ELEMENT,
  tag: 'template',
  tagType: ElementTypes.TEMPLATE,
  props: [
    { name: 'if', exp: { content: 'show' } }
  ],
  children: [...]
}
```

转换后不会生成 template 元素本身，只生成内部内容。

## 位置信息

```typescript
loc: SourceLocation
```

完整的位置信息包含开始标签、内容和结束标签：

```html
<div class="box">content</div>
^                           ^
|                           |
start                       end
```

```typescript
{
  start: { line: 1, column: 1, offset: 0 },
  end: { line: 1, column: 28, offset: 27 },
  source: '<div class="box">content</div>'
}
```

## 小结

ElementNode 是模板中最复杂的节点类型。它区分四种元素类型（ELEMENT、COMPONENT、SLOT、TEMPLATE），每种有不同的转换和代码生成策略。props 包含属性和指令，children 包含子节点。codegenNode 在转换阶段填充，是代码生成的依据。命名空间影响解析规则和运行时行为。
