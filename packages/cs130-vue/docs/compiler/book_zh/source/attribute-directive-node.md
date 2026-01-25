# AttributeNode 与 DirectiveNode

属性节点分为两类：普通属性和指令属性。它们在解析阶段被区分，在后续阶段有完全不同的处理逻辑。

## AttributeNode 结构

```typescript
export interface AttributeNode extends Node {
  type: NodeTypes.ATTRIBUTE
  name: string
  value: TextNode | undefined
}
```

普通属性包含属性名和可选的属性值。值为 undefined 表示布尔属性。

```html
<div id="app" disabled class="container">
```

解析结果：
```typescript
[
  {
    type: NodeTypes.ATTRIBUTE,
    name: 'id',
    value: { type: NodeTypes.TEXT, content: 'app' }
  },
  {
    type: NodeTypes.ATTRIBUTE,
    name: 'disabled',
    value: undefined  // 布尔属性
  },
  {
    type: NodeTypes.ATTRIBUTE,
    name: 'class',
    value: { type: NodeTypes.TEXT, content: 'container' }
  }
]
```

## DirectiveNode 结构

```typescript
export interface DirectiveNode extends Node {
  type: NodeTypes.DIRECTIVE
  name: string
  exp: ExpressionNode | undefined
  arg: ExpressionNode | undefined
  modifiers: string[]
  // 解析后的额外信息
  parseResult?: ForParseResult
}
```

指令属性的结构更复杂，包含指令名、表达式、参数和修饰符。

```html
<div 
  v-if="show"
  :class="cls"
  @click.stop="handle"
  v-model.trim="text"
>
```

解析结果：
```typescript
[
  {
    type: NodeTypes.DIRECTIVE,
    name: 'if',
    exp: { content: 'show' },
    arg: undefined,
    modifiers: []
  },
  {
    type: NodeTypes.DIRECTIVE,
    name: 'bind',
    exp: { content: 'cls' },
    arg: { content: 'class', isStatic: true },
    modifiers: []
  },
  {
    type: NodeTypes.DIRECTIVE,
    name: 'on',
    exp: { content: 'handle' },
    arg: { content: 'click', isStatic: true },
    modifiers: ['stop']
  },
  {
    type: NodeTypes.DIRECTIVE,
    name: 'model',
    exp: { content: 'text' },
    arg: undefined,
    modifiers: ['trim']
  }
]
```

## 指令语法解析

```typescript
const directiveRE = /^v-([a-z0-9-]+)?(?::([a-z0-9-]+))?(.+)?$/i

function parseDirective(name: string, value: string): DirectiveNode {
  const match = directiveRE.exec(name)
  const dirName = match[1] || 'bind'  // v- 后的指令名
  const arg = match[2]                 // : 后的参数
  const modifiers = match[3]?.slice(1).split('.') || []  // . 后的修饰符
  
  return {
    type: NodeTypes.DIRECTIVE,
    name: dirName,
    exp: value ? createSimpleExpression(value) : undefined,
    arg: arg ? createSimpleExpression(arg, true) : undefined,
    modifiers
  }
}
```

## 缩写语法

```html
<!-- v-bind 缩写 -->
:prop="value"    <!-- 等同于 v-bind:prop="value" -->

<!-- v-on 缩写 -->
@event="handler" <!-- 等同于 v-on:event="handler" -->

<!-- v-slot 缩写 -->
#default="scope" <!-- 等同于 v-slot:default="scope" -->
```

```typescript
function isDirective(name: string): boolean {
  return (
    name.startsWith('v-') ||
    name.startsWith(':') ||
    name.startsWith('@') ||
    name.startsWith('#')
  )
}
```

## 动态参数

```html
<div :[key]="value" @[event]="handler">
```

```typescript
{
  type: NodeTypes.DIRECTIVE,
  name: 'bind',
  arg: {
    type: NodeTypes.SIMPLE_EXPRESSION,
    content: 'key',
    isStatic: false  // 动态参数
  }
}
```

动态参数的 `isStatic` 为 false，表示参数名在运行时确定。

## v-for 的 parseResult

```typescript
interface ForParseResult {
  source: ExpressionNode
  value: ExpressionNode | undefined
  key: ExpressionNode | undefined
  index: ExpressionNode | undefined
}

// v-for="(item, index) in items"
{
  name: 'for',
  exp: { content: '(item, index) in items' },
  parseResult: {
    source: { content: 'items' },
    value: { content: 'item' },
    key: undefined,
    index: { content: 'index' }
  }
}
```

v-for 指令的表达式会被进一步解析为结构化的 parseResult。

## 内置指令列表

```typescript
const builtInDirectives = [
  'if',
  'else',
  'else-if',
  'for',
  'show',
  'model',
  'slot',
  'pre',
  'cloak',
  'once',
  'memo',
  'is'
]

// bind 和 on 通过缩写形式更常用
// : 和 @
```

这些内置指令在编译时有特殊处理，不需要运行时解析。

## 属性合并

```html
<div class="static" :class="dynamic">
```

静态和动态的同名属性需要在运行时合并：

```typescript
// 生成代码
_normalizeClass([
  "static",
  dynamic
])
```

## 属性传递

```html
<!-- 父组件 -->
<Child v-bind="$attrs" />

<!-- 展开所有属性 -->
<div v-bind="props" />
```

```typescript
{
  type: NodeTypes.DIRECTIVE,
  name: 'bind',
  arg: undefined,  // 无参数表示展开
  exp: { content: '$attrs' }
}
```

## 修饰符处理

不同指令的修饰符有不同的处理方式：

```typescript
// v-on 修饰符
@click.stop.prevent="handle"
// 生成事件处理包装器

// v-model 修饰符
v-model.trim.number="value"
// 影响值的转换逻辑

// 自定义指令修饰符
v-custom.foo.bar="value"
// 传递给指令的 binding.modifiers
```

## 类型守卫

```typescript
export function isAttribute(p: AttributeNode | DirectiveNode): p is AttributeNode {
  return p.type === NodeTypes.ATTRIBUTE
}

export function isDirective(p: AttributeNode | DirectiveNode): p is DirectiveNode {
  return p.type === NodeTypes.DIRECTIVE
}

export function isVSlot(p: AttributeNode | DirectiveNode): p is DirectiveNode {
  return p.type === NodeTypes.DIRECTIVE && p.name === 'slot'
}
```

类型守卫帮助在处理 props 数组时正确区分不同类型。

## 小结

属性节点的设计要点：

1. **类型区分**：静态属性与指令属性分开处理
2. **结构化解析**：指令的各部分被单独存储
3. **缩写支持**：`:` `@` `#` 语法简化书写
4. **扩展信息**：如 v-for 的 parseResult
5. **修饰符系统**：灵活的行为修改机制

下一章将分析 CompoundExpressionNode 复合表达式节点。
