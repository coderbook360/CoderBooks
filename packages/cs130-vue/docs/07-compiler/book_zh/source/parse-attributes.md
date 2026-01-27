# parseAttributes 属性解析

属性是元素的重要组成部分。`parseAttributes` 解析开始标签中的所有属性，包括静态属性和指令。

## 函数结构

```typescript
function parseAttributes(
  context: ParserContext,
  type: TagType
): (AttributeNode | DirectiveNode)[] {
  const props: (AttributeNode | DirectiveNode)[] = []
  const attributeNames = new Set<string>()
  
  while (
    context.source.length > 0 &&
    !startsWith(context.source, '>') &&
    !startsWith(context.source, '/>')
  ) {
    if (startsWith(context.source, '/')) {
      emitError(context, ErrorCodes.UNEXPECTED_SOLIDUS_IN_TAG)
      advanceBy(context, 1)
      advanceSpaces(context)
      continue
    }
    
    if (type === TagType.End) {
      emitError(context, ErrorCodes.END_TAG_WITH_ATTRIBUTES)
    }
    
    const attr = parseAttribute(context, attributeNames)
    
    // class 属性值规范化
    if (
      attr.type === NodeTypes.ATTRIBUTE &&
      attr.value &&
      attr.name === 'class'
    ) {
      attr.value.content = attr.value.content.replace(/\s+/g, ' ').trim()
    }
    
    if (type === TagType.Start) {
      props.push(attr)
    }
    
    if (/^[^\t\r\n\f />]/.test(context.source)) {
      emitError(context, ErrorCodes.MISSING_WHITESPACE_BETWEEN_ATTRIBUTES)
    }
    advanceSpaces(context)
  }
  
  return props
}
```

循环解析直到遇到标签结束符。用 Set 检测重复属性。

## 重复属性检测

```typescript
const attributeNames = new Set<string>()

// 在 parseAttribute 中
if (nameSet.has(name)) {
  emitError(context, ErrorCodes.DUPLICATE_ATTRIBUTE)
}
nameSet.add(name)
```

相同名称的属性只报告警告，不会阻止解析。这符合 HTML 的宽容性原则。

## class 属性规范化

```typescript
if (
  attr.type === NodeTypes.ATTRIBUTE &&
  attr.value &&
  attr.name === 'class'
) {
  attr.value.content = attr.value.content.replace(/\s+/g, ' ').trim()
}
```

class 属性值中的多余空白被压缩为单个空格。这使 `class="  foo   bar  "` 变成 `class="foo bar"`。

## 属性间空白检查

```typescript
if (/^[^\t\r\n\f />]/.test(context.source)) {
  emitError(context, ErrorCodes.MISSING_WHITESPACE_BETWEEN_ATTRIBUTES)
}
advanceSpaces(context)
```

属性之间必须有空白。`id="x"class="y"` 是错误的。

## parseAttribute 实现

```typescript
function parseAttribute(
  context: ParserContext,
  nameSet: Set<string>
): AttributeNode | DirectiveNode {
  const start = getCursor(context)
  
  // 匹配属性名
  const match = /^[^\t\r\n\f />][^\t\r\n\f />=]*/.exec(context.source)!
  const name = match[0]

  if (nameSet.has(name)) {
    emitError(context, ErrorCodes.DUPLICATE_ATTRIBUTE)
  }
  nameSet.add(name)

  if (name[0] === '=') {
    emitError(context, ErrorCodes.UNEXPECTED_EQUALS_SIGN_BEFORE_ATTRIBUTE_NAME)
  }

  advanceBy(context, name.length)

  // 解析属性值
  let value: AttributeValue = undefined
  if (/^[\t\r\n\f ]*=/.test(context.source)) {
    advanceSpaces(context)
    advanceBy(context, 1)  // 跳过 =
    advanceSpaces(context)
    value = parseAttributeValue(context)
    if (!value) {
      emitError(context, ErrorCodes.MISSING_ATTRIBUTE_VALUE)
    }
  }
  
  const loc = getSelection(context, start)

  // 判断是指令还是普通属性
  if (!context.inVPre && /^(v-[A-Za-z0-9-]|:|\.|@|#)/.test(name)) {
    return parseDirective(name, value, start, loc, context)
  }

  // 普通静态属性
  return {
    type: NodeTypes.ATTRIBUTE,
    name,
    value: value && {
      type: NodeTypes.TEXT,
      content: value.content,
      loc: value.loc
    },
    loc
  }
}
```

属性名可以包含各种字符，通过正则匹配。然后检查是否有 `=` 和值。

## 解析属性值

```typescript
function parseAttributeValue(context: ParserContext): AttributeValue {
  const start = getCursor(context)
  let content: string

  const quote = context.source[0]
  const isQuoted = quote === `"` || quote === `'`
  
  if (isQuoted) {
    advanceBy(context, 1)
    const endIndex = context.source.indexOf(quote)
    if (endIndex === -1) {
      content = parseTextData(
        context,
        context.source.length,
        TextModes.ATTRIBUTE_VALUE
      )
    } else {
      content = parseTextData(context, endIndex, TextModes.ATTRIBUTE_VALUE)
      advanceBy(context, 1)
    }
  } else {
    // 无引号值
    const match = /^[^\t\r\n\f >]+/.exec(context.source)
    if (!match) {
      return undefined
    }
    const unexpectedChars = /["'<=`]/
    for (let i = 0; i < match[0].length; i++) {
      const char = match[0][i]
      if (unexpectedChars.test(char)) {
        emitError(context, ErrorCodes.UNEXPECTED_CHARACTER_IN_UNQUOTED_ATTRIBUTE_VALUE, i)
      }
    }
    content = parseTextData(context, match[0].length, TextModes.ATTRIBUTE_VALUE)
  }

  return { content, isQuoted, loc: getSelection(context, start) }
}
```

支持三种形式：双引号、单引号、无引号。无引号时检查非法字符。

## 指令解析

```typescript
function parseDirective(
  name: string,
  value: AttributeValue | undefined,
  start: Position,
  loc: SourceLocation,
  context: ParserContext
): DirectiveNode {
  const match = /(?:^v-([a-z0-9-]+))?(?:(?::|^\.|^@|^#)(\[[^\]]+\]|[^\.]+))?(.+)?$/i.exec(name)!

  // 确定指令名
  let isPropShorthand = startsWith(name, '.')
  let dirName = match[1] || 
    (isPropShorthand || startsWith(name, ':') ? 'bind' : 
     startsWith(name, '@') ? 'on' : 'slot')

  // 解析参数
  let arg: ExpressionNode | undefined
  if (match[2]) {
    const isSlot = dirName === 'slot'
    const startOffset = name.lastIndexOf(match[2])
    const loc = getSelection(
      context,
      getNewPosition(context, start, startOffset),
      getNewPosition(context, start, startOffset + match[2].length + ((isSlot && match[3]) || '').length)
    )

    let content = match[2]
    let isStatic = true

    // 动态参数 [xxx]
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

  // 解析修饰符
  const modifiers = match[3]?.slice(1).split('.').filter(Boolean) || []
  if (isPropShorthand) {
    modifiers.push('prop')
  }

  // 表达式值
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

指令解析处理多种语法：

```
v-bind:id        → { name: 'bind', arg: 'id' }
:id              → { name: 'bind', arg: 'id' }
.id              → { name: 'bind', arg: 'id', modifiers: ['prop'] }
v-on:click       → { name: 'on', arg: 'click' }
@click           → { name: 'on', arg: 'click' }
@click.stop      → { name: 'on', arg: 'click', modifiers: ['stop'] }
v-slot:header    → { name: 'slot', arg: 'header' }
#header          → { name: 'slot', arg: 'header' }
v-if="show"      → { name: 'if', exp: { content: 'show' } }
v-for="..."      → { name: 'for', exp: { content: '...' } }
:[dynamic]       → { name: 'bind', arg: { content: 'dynamic', isStatic: false } }
```

## 动态参数

```typescript
if (content.startsWith('[')) {
  isStatic = false
  if (!content.endsWith(']')) {
    emitError(context, ErrorCodes.X_MISSING_DYNAMIC_DIRECTIVE_ARGUMENT_END)
    content = content.slice(1)
  } else {
    content = content.slice(1, content.length - 1)
  }
}
```

`:[foo]` 是动态绑定，参数名由 `foo` 的值决定。

## 布尔属性

没有值的属性被视为布尔属性：

```typescript
// disabled 没有值
<button disabled>
// 解析结果
{ type: ATTRIBUTE, name: 'disabled', value: undefined }
```

在转换阶段会处理为 `disabled: true`。

## v-pre 模式

```typescript
if (!context.inVPre && /^(v-[A-Za-z0-9-]|:|\.|@|#)/.test(name)) {
  return parseDirective(...)
}
```

在 v-pre 模式下，即使是 `v-` 开头的属性也当作普通属性，不解析为指令。

## 小结

parseAttributes 循环解析所有属性直到标签结束。每个属性可能是静态属性或指令。指令语法丰富，支持多种简写。动态参数用方括号包裹。修饰符用点号分隔。在 v-pre 模式下所有属性都当作静态属性。重复属性报告错误但不阻止解析。class 属性值被规范化，压缩多余空白。
