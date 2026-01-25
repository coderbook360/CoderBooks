# parseElement 元素解析

元素是模板中最复杂的节点类型。`parseElement` 解析完整的元素结构：开始标签、子内容、结束标签。它还处理自闭合标签和 void 元素。

## 函数结构

```typescript
function parseElement(
  context: ParserContext,
  ancestors: ElementNode[]
): ElementNode | undefined {
  // 解析开始标签
  const wasInPre = context.inPre
  const wasInVPre = context.inVPre
  const parent = last(ancestors)
  const element = parseTag(context, TagType.Start, parent)
  const isPreBoundary = context.inPre && !wasInPre
  const isVPreBoundary = context.inVPre && !wasInVPre

  // 自闭合或 void 元素直接返回
  if (element.isSelfClosing || context.options.isVoidTag(element.tag)) {
    if (isPreBoundary) {
      context.inPre = false
    }
    if (isVPreBoundary) {
      context.inVPre = false
    }
    return element
  }

  // 解析子内容
  ancestors.push(element)
  const mode = context.options.getTextMode(element, parent)
  const children = parseChildren(context, mode, ancestors)
  ancestors.pop()
  element.children = children

  // 解析结束标签
  if (startsWithEndTagOpen(context.source, element.tag)) {
    parseTag(context, TagType.End, parent)
  } else {
    emitError(context, ErrorCodes.X_MISSING_END_TAG, 0, element.loc.start)
    if (context.source.length === 0 && element.tag.toLowerCase() === 'script') {
      const first = children[0]
      if (first && startsWith(first.loc.source, '<!--')) {
        emitError(context, ErrorCodes.EOF_IN_SCRIPT_HTML_COMMENT_LIKE_TEXT)
      }
    }
  }

  element.loc = getSelection(context, element.loc.start)

  // 恢复状态
  if (isPreBoundary) {
    context.inPre = false
  }
  if (isVPreBoundary) {
    context.inVPre = false
  }
  return element
}
```

这个函数的核心是三步：解析开始标签、递归解析子内容、解析结束标签。

## 解析开始标签

```typescript
function parseTag(
  context: ParserContext,
  type: TagType,
  parent: ElementNode | undefined
): ElementNode | undefined {
  const start = getCursor(context)
  const match = /^<\/?([a-z][^\t\r\n\f />]*)/i.exec(context.source)!
  const tag = match[1]
  const ns = context.options.getNamespace(tag, parent)

  advanceBy(context, match[0].length)
  advanceSpaces(context)

  // 检查是否是 v-pre
  const cursor = getCursor(context)
  const currentSource = context.source
  
  // 预解析属性检测 v-pre
  if (context.options.isPreTag(tag)) {
    context.inPre = true
  }
  
  // 解析属性
  let props = parseAttributes(context, type)
  
  // 检测 v-pre 指令
  if (type === TagType.Start && !context.inVPre) {
    const vPreIndex = props.findIndex(p => p.type === NodeTypes.DIRECTIVE && p.name === 'pre')
    if (vPreIndex !== -1) {
      context.inVPre = true
      // 移除 v-pre 指令
      extend(context, { source: currentSource, ...cursor })
      // 重新解析属性（在 v-pre 模式下）
      props = parseAttributes(context, type).filter(p => p.name !== 'v-pre')
    }
  }
  
  // 检查自闭合
  let isSelfClosing = false
  if (context.source.length === 0) {
    emitError(context, ErrorCodes.EOF_IN_TAG)
  } else {
    isSelfClosing = startsWith(context.source, '/>')
    if (type === TagType.End && isSelfClosing) {
      emitError(context, ErrorCodes.END_TAG_WITH_TRAILING_SOLIDUS)
    }
    advanceBy(context, isSelfClosing ? 2 : 1)
  }

  if (type === TagType.End) {
    return
  }

  // 确定元素类型
  let tagType = ElementTypes.ELEMENT
  if (!context.inVPre) {
    if (tag === 'slot') {
      tagType = ElementTypes.SLOT
    } else if (tag === 'template') {
      if (props.some(p => p.type === NodeTypes.DIRECTIVE && isSpecialTemplateDirective(p.name))) {
        tagType = ElementTypes.TEMPLATE
      }
    } else if (isComponent(tag, props, context)) {
      tagType = ElementTypes.COMPONENT
    }
  }

  return {
    type: NodeTypes.ELEMENT,
    ns,
    tag,
    tagType,
    props,
    isSelfClosing,
    children: [],
    loc: getSelection(context, start),
    codegenNode: undefined
  }
}
```

标签解析的复杂性在于 v-pre 处理：如果发现 v-pre 指令，需要重新解析属性（不解析指令语法）。

## 判断组件

```typescript
function isComponent(
  tag: string,
  props: (AttributeNode | DirectiveNode)[],
  context: ParserContext
): boolean {
  const options = context.options
  
  if (options.isCustomElement(tag)) {
    return false
  }
  
  if (
    tag === 'component' ||
    /^[A-Z]/.test(tag) ||
    isCoreComponent(tag) ||
    options.isBuiltInComponent?.(tag) ||
    options.isNativeTag?.(tag) === false
  ) {
    return true
  }
  
  // 有 is 指令
  for (let i = 0; i < props.length; i++) {
    const p = props[i]
    if (p.type === NodeTypes.DIRECTIVE) {
      if (p.name === 'is') {
        return true
      } else if (
        p.name === 'bind' &&
        isStaticArgOf(p.arg, 'is') &&
        props.some(p => p.name === 'vue:' && p.type === NodeTypes.ATTRIBUTE)
      ) {
        return true
      }
    }
  }
  
  return false
}
```

大写开头的标签是组件，`component` 是动态组件，有 `is` 属性的也是组件。

## 解析属性列表

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
    
    // 去除 class 属性值两端的空白
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

循环解析属性直到遇到 `>` 或 `/>`。用 Set 检测重复属性名。

## 解析单个属性

```typescript
function parseAttribute(
  context: ParserContext,
  nameSet: Set<string>
): AttributeNode | DirectiveNode {
  const start = getCursor(context)
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
    advanceBy(context, 1)
    advanceSpaces(context)
    value = parseAttributeValue(context)
    if (!value) {
      emitError(context, ErrorCodes.MISSING_ATTRIBUTE_VALUE)
    }
  }
  const loc = getSelection(context, start)

  // 在非 v-pre 模式下解析指令
  if (!context.inVPre && /^(v-[A-Za-z0-9-]|:|\.|@|#)/.test(name)) {
    // ...指令解析
    return {
      type: NodeTypes.DIRECTIVE,
      name: dirName,
      exp: undefined,
      arg,
      modifiers,
      loc
    }
  }

  // 静态属性
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

属性名以 `v-`、`:`、`.`、`@`、`#` 开头时解析为指令，否则是普通属性。

## 指令解析细节

```typescript
// v-on:click.stop  -> name='on', arg='click', modifiers=['stop']
// @click.stop      -> name='on', arg='click', modifiers=['stop']
// v-bind:id        -> name='bind', arg='id'
// :id              -> name='bind', arg='id'
// v-slot:header    -> name='slot', arg='header'
// #header          -> name='slot', arg='header'
// v-model          -> name='model'
// v-if             -> name='if'

const match = /(?:^v-([a-z0-9-]+))?(?:(?::|^\.|^@|^#)(\[[^\]]+\]|[^\.]+))?(.+)?$/i.exec(name)!

let isPropShorthand = startsWith(name, '.')
let dirName = match[1] || (isPropShorthand || startsWith(name, ':') ? 'bind' : startsWith(name, '@') ? 'on' : 'slot')

let arg: ExpressionNode | undefined
if (match[2]) {
  const isSlot = dirName === 'slot'
  const startOffset = name.lastIndexOf(match[2])
  const loc = getSelection(context, getNewPosition(context, start, startOffset), getNewPosition(context, start, startOffset + match[2].length + (isSlot && match[3] || '').length))

  let content = match[2]
  let isStatic = true

  if (content.startsWith('[')) {
    isStatic = false
    if (!content.endsWith(']')) {
      emitError(context, ErrorCodes.X_MISSING_DYNAMIC_DIRECTIVE_ARGUMENT_END)
      content = content.slice(1)
    } else {
      content = content.slice(1, content.length - 1)
    }
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

指令参数可以是静态的（`:id`）或动态的（`:[dynamicId]`）。

## 处理结束标签

```typescript
if (startsWithEndTagOpen(context.source, element.tag)) {
  parseTag(context, TagType.End, parent)
} else {
  emitError(context, ErrorCodes.X_MISSING_END_TAG, 0, element.loc.start)
}
```

如果找不到匹配的结束标签，报告错误但继续——元素仍然有效，只是标签未闭合。

## pre 和 v-pre 边界

```typescript
const isPreBoundary = context.inPre && !wasInPre
const isVPreBoundary = context.inVPre && !wasInVPre

// 解析完成后恢复状态
if (isPreBoundary) {
  context.inPre = false
}
if (isVPreBoundary) {
  context.inVPre = false
}
```

进入 pre 或 v-pre 元素时设置标志，离开时恢复。这确保状态只在元素范围内生效。

## 小结

parseElement 解析完整的元素结构。它处理开始标签（包括属性和指令）、递归解析子内容、解析结束标签。元素类型根据标签名和指令确定：slot、template、component 或普通元素。v-pre 需要特殊处理：发现后重新解析属性，不解析指令语法。自闭合和 void 元素没有子内容和结束标签。错误恢复使编译能在某些错误后继续进行。
