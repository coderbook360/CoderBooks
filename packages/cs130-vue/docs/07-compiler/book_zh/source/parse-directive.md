# parseDirective 指令解析

指令是 Vue 模板的核心特性。`parseDirective` 解析各种指令语法，从 `v-bind:id` 到 `@click.stop`，将它们转换为统一的指令节点结构。

## 指令语法概览

Vue 支持多种指令语法：

```html
<!-- 完整语法 -->
<div v-bind:id="userId"></div>
<div v-on:click="handleClick"></div>
<div v-slot:header="{ data }"></div>

<!-- 简写语法 -->
<div :id="userId"></div>
<div @click="handleClick"></div>
<div #header="{ data }"></div>

<!-- 修饰符 -->
<div @click.stop.prevent="handleClick"></div>
<div :class.camel="className"></div>

<!-- 动态参数 -->
<div :[dynamicAttr]="value"></div>
<div @[dynamicEvent]="handler"></div>

<!-- .prop 简写 -->
<div .innerHTML="html"></div>
```

## 解析入口

```typescript
function parseAttribute(
  context: ParserContext,
  nameSet: Set<string>
): AttributeNode | DirectiveNode {
  // ... 解析属性名和值 ...
  
  // 判断是否是指令
  if (!context.inVPre && /^(v-[A-Za-z0-9-]|:|\.|@|#)/.test(name)) {
    // 是指令，调用指令解析
    return parseDirective(...)
  }
  
  // 普通属性
  return { type: NodeTypes.ATTRIBUTE, name, value, loc }
}
```

以 `v-`、`:`、`.`、`@`、`#` 开头的属性名被识别为指令。

## 核心解析逻辑

```typescript
function parseDirective(
  name: string,
  value: AttributeValue | undefined,
  start: Position,
  loc: SourceLocation,
  context: ParserContext
): DirectiveNode {
  // 正则解析指令各部分
  const match = /(?:^v-([a-z0-9-]+))?(?:(?::|^\.|^@|^#)(\[[^\]]+\]|[^\.]+))?(.+)?$/i.exec(name)!
  
  // 1. 确定指令名称
  let isPropShorthand = startsWith(name, '.')
  let dirName =
    match[1] ||
    (isPropShorthand || startsWith(name, ':')
      ? 'bind'
      : startsWith(name, '@')
        ? 'on'
        : 'slot')
  
  // 2. 解析参数
  let arg: ExpressionNode | undefined
  // ...
  
  // 3. 解析修饰符
  const modifiers = match[3]?.slice(1).split('.').filter(Boolean) || []
  
  // 4. 解析表达式
  let exp: ExpressionNode | undefined
  if (value) {
    exp = {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content: value.content,
      isStatic: false,
      constType: ConstantTypes.NOT_CONSTANT,
      loc: value.loc
    }
  }
  
  return {
    type: NodeTypes.DIRECTIVE,
    name: dirName,
    exp,
    arg,
    modifiers,
    loc
  }
}
```

## 正则表达式详解

```typescript
/(?:^v-([a-z0-9-]+))?(?:(?::|^\.|^@|^#)(\[[^\]]+\]|[^\.]+))?(.+)?$/i

// 拆解：
// (?:^v-([a-z0-9-]+))?   - 可选的 v-xxx 指令名
// (?:(?::|^\.|^@|^#)     - : 或 . 或 @ 或 # 前缀
//   (\[[^\]]+\]|[^\.]+)  - 参数（动态或静态）
// )?                     - 整个参数部分可选
// (.+)?                  - 修饰符部分可选
```

这个正则处理所有指令语法变体。

## 指令名称识别

```typescript
let isPropShorthand = startsWith(name, '.')
let dirName =
  match[1] ||  // v-xxx 的 xxx 部分
  (isPropShorthand || startsWith(name, ':')
    ? 'bind'   // . 或 : 开头是 bind
    : startsWith(name, '@')
      ? 'on'   // @ 开头是 on
      : 'slot') // # 开头是 slot
```

简写语法映射：
- `:` → `v-bind`
- `.` → `v-bind` + `prop` 修饰符
- `@` → `v-on`
- `#` → `v-slot`

## 参数解析

```typescript
let arg: ExpressionNode | undefined
if (match[2]) {
  const isSlot = dirName === 'slot'
  const startOffset = name.lastIndexOf(match[2])
  const loc = getSelection(
    context,
    getNewPosition(context, start, startOffset),
    getNewPosition(
      context,
      start,
      startOffset + match[2].length + ((isSlot && match[3]) || '').length
    )
  )

  let content = match[2]
  let isStatic = true

  // 动态参数检测
  if (content.startsWith('[')) {
    isStatic = false
    if (!content.endsWith(']')) {
      emitError(context, ErrorCodes.X_MISSING_DYNAMIC_DIRECTIVE_ARGUMENT_END)
      content = content.slice(1)
    } else {
      content = content.slice(1, content.length - 1)
    }
  } else if (isSlot) {
    // v-slot 参数可能包含修饰符语法
    content += match[3] || ''
  }

  arg = {
    type: NodeTypes.SIMPLE_EXPRESSION,
    content,
    isStatic,
    constType: isStatic ? ConstantTypes.CAN_STRINGIFY : ConstantTypes.NOT_CONSTANT,
    loc
  }
}
```

参数可以是静态的（`:id`）或动态的（`:[dynamicId]`）。

## 动态参数

```typescript
if (content.startsWith('[')) {
  isStatic = false
  content = content.slice(1, content.length - 1)  // 移除方括号
}
```

`:[foo]="bar"` 中，`foo` 是一个表达式，在运行时求值确定属性名。

## 修饰符解析

```typescript
const modifiers = match[3]?.slice(1).split('.').filter(Boolean) || []
if (isPropShorthand) {
  modifiers.push('prop')
}
```

修饰符是点号分隔的标识符：

```
@click.stop.prevent
      ^^^^  ^^^^^^^
      |     |
      |     第二个修饰符
      第一个修饰符
```

`.prop` 简写自动添加 `prop` 修饰符。

## 表达式解析

```typescript
let exp: ExpressionNode | undefined
if (value) {
  exp = {
    type: NodeTypes.SIMPLE_EXPRESSION,
    content: value.content,
    isStatic: false,
    constType: ConstantTypes.NOT_CONSTANT,
    loc: value.loc
  }
}
```

表达式只是简单地提取字符串，不做语法分析。验证在转换阶段进行。

## 指令节点结构

```typescript
interface DirectiveNode extends Node {
  type: NodeTypes.DIRECTIVE
  name: string           // 指令名：bind, on, if, for, model...
  exp: ExpressionNode    // 表达式
  arg: ExpressionNode    // 参数
  modifiers: string[]    // 修饰符数组
  loc: SourceLocation
}
```

## 解析示例

```typescript
// @click.stop="handleClick"
{
  type: NodeTypes.DIRECTIVE,
  name: 'on',
  exp: { content: 'handleClick', isStatic: false },
  arg: { content: 'click', isStatic: true },
  modifiers: ['stop']
}

// :class="{ active: isActive }"
{
  type: NodeTypes.DIRECTIVE,
  name: 'bind',
  exp: { content: '{ active: isActive }', isStatic: false },
  arg: { content: 'class', isStatic: true },
  modifiers: []
}

// v-for="item in items"
{
  type: NodeTypes.DIRECTIVE,
  name: 'for',
  exp: { content: 'item in items', isStatic: false },
  arg: undefined,
  modifiers: []
}

// :[dynamic].sync="value"
{
  type: NodeTypes.DIRECTIVE,
  name: 'bind',
  exp: { content: 'value', isStatic: false },
  arg: { content: 'dynamic', isStatic: false },
  modifiers: ['sync']
}
```

## v-pre 影响

```typescript
if (!context.inVPre && /^(v-[A-Za-z0-9-]|:|\.|@|#)/.test(name)) {
  return parseDirective(...)
}
```

在 `v-pre` 模式下，`v-if`、`:id` 等都被当作普通属性，不解析为指令。

## 错误处理

```typescript
// 动态参数未闭合
if (content.startsWith('[') && !content.endsWith(']')) {
  emitError(context, ErrorCodes.X_MISSING_DYNAMIC_DIRECTIVE_ARGUMENT_END)
  content = content.slice(1)  // 移除 [ 继续
}
```

报告错误但继续解析，提供尽可能多的诊断信息。

## 小结

指令解析将多种语法变体转换为统一的指令节点结构。它识别指令名（从完整语法或简写推断）、解析参数（静态或动态）、收集修饰符、提取表达式内容。这种统一的结构使后续转换阶段能够一致地处理所有指令形式。
