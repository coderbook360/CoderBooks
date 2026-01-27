# parseChildren 子节点解析

`parseChildren` 是编译器解析的核心循环。它解析一段内容中的所有子节点，处理元素、插值、注释、文本等各种类型。理解这个函数是理解整个解析过程的关键。

## 函数签名

```typescript
function parseChildren(
  context: ParserContext,
  mode: TextModes,
  ancestors: ElementNode[]
): TemplateChildNode[]
```

mode 决定如何解析文本内容，ancestors 是父元素栈用于检测结束条件。

## 主循环结构

```typescript
function parseChildren(
  context: ParserContext,
  mode: TextModes,
  ancestors: ElementNode[]
): TemplateChildNode[] {
  const parent = last(ancestors)
  const ns = parent ? parent.ns : Namespaces.HTML
  const nodes: TemplateChildNode[] = []

  while (!isEnd(context, mode, ancestors)) {
    const s = context.source
    let node: TemplateChildNode | TemplateChildNode[] | undefined = undefined

    if (mode === TextModes.DATA || mode === TextModes.RCDATA) {
      if (!context.inVPre && startsWith(s, context.options.delimiters[0])) {
        // 插值：{{ xxx }}
        node = parseInterpolation(context, mode)
      } else if (mode === TextModes.DATA && s[0] === '<') {
        // 标签相关
        if (s.length === 1) {
          emitError(context, ErrorCodes.EOF_BEFORE_TAG_NAME, 1)
        } else if (s[1] === '!') {
          // 注释或 DOCTYPE
          if (startsWith(s, '<!--')) {
            node = parseComment(context)
          } else if (startsWith(s, '<!DOCTYPE')) {
            node = parseBogusComment(context)
          } else if (startsWith(s, '<![CDATA[')) {
            if (ns !== Namespaces.HTML) {
              node = parseCDATA(context, ancestors)
            } else {
              emitError(context, ErrorCodes.CDATA_IN_HTML_CONTENT)
              node = parseBogusComment(context)
            }
          } else {
            emitError(context, ErrorCodes.INCORRECTLY_OPENED_COMMENT)
            node = parseBogusComment(context)
          }
        } else if (s[1] === '/') {
          // 结束标签处理
          if (s.length === 2) {
            emitError(context, ErrorCodes.EOF_BEFORE_TAG_NAME, 2)
          } else if (s[2] === '>') {
            emitError(context, ErrorCodes.MISSING_END_TAG_NAME, 2)
            advanceBy(context, 3)
            continue
          } else if (/[a-z]/i.test(s[2])) {
            emitError(context, ErrorCodes.X_INVALID_END_TAG)
            parseTag(context, TagType.End, parent)
            continue
          } else {
            emitError(context, ErrorCodes.INVALID_FIRST_CHARACTER_OF_TAG_NAME, 2)
            node = parseBogusComment(context)
          }
        } else if (/[a-z]/i.test(s[1])) {
          // 开始标签
          node = parseElement(context, ancestors)
        } else if (s[1] === '?') {
          emitError(context, ErrorCodes.UNEXPECTED_QUESTION_MARK_INSTEAD_OF_TAG_NAME, 1)
          node = parseBogusComment(context)
        } else {
          emitError(context, ErrorCodes.INVALID_FIRST_CHARACTER_OF_TAG_NAME, 1)
        }
      }
    }
    
    // 如果没匹配到特殊节点，当作文本处理
    if (!node) {
      node = parseText(context, mode)
    }

    if (isArray(node)) {
      for (let i = 0; i < node.length; i++) {
        pushNode(nodes, node[i])
      }
    } else {
      pushNode(nodes, node)
    }
  }

  return nodes
}
```

这是一个状态机循环。根据当前字符判断节点类型，调用对应的解析函数。

## 结束条件判断

```typescript
function isEnd(
  context: ParserContext,
  mode: TextModes,
  ancestors: ElementNode[]
): boolean {
  const s = context.source
  
  switch (mode) {
    case TextModes.DATA:
      // 遇到祖先的结束标签
      if (startsWith(s, '</')) {
        for (let i = ancestors.length - 1; i >= 0; --i) {
          if (startsWithEndTagOpen(s, ancestors[i].tag)) {
            return true
          }
        }
      }
      break
      
    case TextModes.RCDATA:
    case TextModes.RAWTEXT:
      // 遇到父元素的结束标签
      const parent = last(ancestors)
      if (parent && startsWithEndTagOpen(s, parent.tag)) {
        return true
      }
      break
      
    case TextModes.CDATA:
      // 遇到 CDATA 结束标记
      if (startsWith(s, ']]>')) {
        return true
      }
      break
  }
  
  // 源码耗尽
  return !s
}
```

DATA 模式下，遇到任何祖先的结束标签都会停止——这用于处理未闭合标签的情况。

## 节点收集

```typescript
function pushNode(nodes: TemplateChildNode[], node: TemplateChildNode): void {
  if (node.type === NodeTypes.TEXT) {
    const prev = last(nodes)
    // 合并相邻文本节点
    if (
      prev &&
      prev.type === NodeTypes.TEXT &&
      prev.loc.end.offset === node.loc.start.offset
    ) {
      prev.content += node.content
      prev.loc.end = node.loc.end
      return
    }
  }
  nodes.push(node)
}
```

相邻的文本节点会被合并。这发生在文本被其他内容（如插值）打断后重新连接时。

## 空白处理

解析完成后可能需要移除或压缩空白：

```typescript
// 移除纯空白节点
let removedWhitespace = false
if (mode !== TextModes.RAWTEXT && mode !== TextModes.RCDATA) {
  const shouldCondense = context.options.whitespace !== 'preserve'
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    if (node.type === NodeTypes.TEXT) {
      if (!context.inPre) {
        if (!/[^\t\r\n\f ]/.test(node.content)) {
          const prev = nodes[i - 1]
          const next = nodes[i + 1]
          // 在开头、结尾或两个元素之间的纯空白可以移除
          if (
            !prev ||
            !next ||
            (shouldCondense &&
              (prev.type === NodeTypes.COMMENT ||
                next.type === NodeTypes.COMMENT ||
                (prev.type === NodeTypes.ELEMENT &&
                  next.type === NodeTypes.ELEMENT &&
                  /[\r\n]/.test(node.content))))
          ) {
            removedWhitespace = true
            nodes[i] = null as any
          } else {
            // 压缩为单个空格
            node.content = ' '
          }
        } else if (shouldCondense) {
          // 连续空白压缩为单个空格
          node.content = node.content.replace(/[\t\r\n\f ]+/g, ' ')
        }
      } else {
        // pre 内保留空白，只规范化换行
        node.content = node.content.replace(/\r\n/g, '\n')
      }
    }
  }
  if (removedWhitespace) {
    nodes = nodes.filter(Boolean)
  }
}
```

这段逻辑复杂但重要：两个元素之间的纯空白行可以移除，其他连续空白压缩为一个空格。

## 解析插值

```typescript
function parseInterpolation(
  context: ParserContext,
  mode: TextModes
): InterpolationNode | undefined {
  const [open, close] = context.options.delimiters
  const closeIndex = context.source.indexOf(close, open.length)
  
  if (closeIndex === -1) {
    emitError(context, ErrorCodes.X_MISSING_INTERPOLATION_END)
    return undefined
  }

  const start = getCursor(context)
  advanceBy(context, open.length)
  
  const innerStart = getCursor(context)
  const innerEnd = getCursor(context)
  const rawContentLength = closeIndex - open.length
  const rawContent = context.source.slice(0, rawContentLength)
  const preTrimContent = parseTextData(context, rawContentLength, mode)
  const content = preTrimContent.trim()
  
  // 计算修剪后的位置
  const startOffset = preTrimContent.indexOf(content)
  if (startOffset > 0) {
    advancePositionWithMutation(innerStart, rawContent, startOffset)
  }
  const endOffset = rawContentLength - (preTrimContent.length - content.length - startOffset)
  advancePositionWithMutation(innerEnd, rawContent, endOffset)
  
  advanceBy(context, close.length)

  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      isStatic: false,
      constType: ConstantTypes.NOT_CONSTANT,
      content,
      loc: getSelection(context, innerStart, innerEnd)
    },
    loc: getSelection(context, start)
  }
}
```

插值解析提取 `{{` 和 `}}` 之间的内容，去除首尾空白，精确计算内容的位置信息。

## 解析注释

```typescript
function parseComment(context: ParserContext): CommentNode {
  const start = getCursor(context)
  let content: string

  const match = /--(\!)?>/.exec(context.source)
  if (!match) {
    content = context.source.slice(4)
    advanceBy(context, context.source.length)
    emitError(context, ErrorCodes.EOF_IN_COMMENT)
  } else {
    if (match.index <= 3) {
      emitError(context, ErrorCodes.ABRUPT_CLOSING_OF_EMPTY_COMMENT)
    }
    if (match[1]) {
      emitError(context, ErrorCodes.INCORRECTLY_CLOSED_COMMENT)
    }
    content = context.source.slice(4, match.index)
    
    // 检查嵌套注释
    const s = context.source.slice(0, match.index)
    let prevIndex = 1, nestedIndex = 0
    while ((nestedIndex = s.indexOf('<!--', prevIndex)) !== -1) {
      advanceBy(context, nestedIndex - prevIndex + 1)
      if (nestedIndex + 4 < s.length) {
        emitError(context, ErrorCodes.NESTED_COMMENT)
      }
      prevIndex = nestedIndex + 1
    }
    advanceBy(context, match.index + match[0].length - prevIndex + 1)
  }

  return {
    type: NodeTypes.COMMENT,
    content,
    loc: getSelection(context, start)
  }
}
```

注释解析处理各种边界情况：未闭合注释、空注释、嵌套注释等。

## 解析文本

```typescript
function parseText(
  context: ParserContext,
  mode: TextModes
): TextNode {
  const endTokens = mode === TextModes.CDATA ? [']]>'] : ['<', context.options.delimiters[0]]

  let endIndex = context.source.length
  for (let i = 0; i < endTokens.length; i++) {
    const index = context.source.indexOf(endTokens[i], 1)
    if (index !== -1 && endIndex > index) {
      endIndex = index
    }
  }

  const start = getCursor(context)
  const content = parseTextData(context, endIndex, mode)

  return {
    type: NodeTypes.TEXT,
    content,
    loc: getSelection(context, start)
  }
}
```

文本解析到下一个标签或插值开始符为止。在 CDATA 模式下只到 `]]>` 为止。

## RCDATA 与 RAWTEXT

```typescript
function parseTextData(
  context: ParserContext,
  length: number,
  mode: TextModes
): string {
  const rawText = context.source.slice(0, length)
  advanceBy(context, length)
  
  if (mode === TextModes.RAWTEXT || mode === TextModes.CDATA || !rawText.includes('&')) {
    return rawText
  }
  
  // DATA 或 RCDATA 模式需要解码实体
  return context.options.decodeEntities(rawText, mode === TextModes.ATTRIBUTE_VALUE)
}
```

RAWTEXT（script/style 内）不解码实体，RCDATA（textarea/title 内）需要解码。

## 小结

parseChildren 是解析的核心循环，根据当前字符判断节点类型。它处理元素、插值、注释、文本等各种节点。结束条件根据文本模式不同：DATA 模式下遇到任何祖先的结束标签停止，RAWTEXT/RCDATA 遇到父元素结束标签停止。空白处理在解析完成后进行，可以移除或压缩。相邻文本节点会被合并。这种设计使解析逻辑清晰，各类型节点的解析相互独立。
