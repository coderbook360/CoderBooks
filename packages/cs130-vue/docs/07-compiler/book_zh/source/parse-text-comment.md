# parseText 与 parseComment 文本注释解析

文本和注释是模板中最基础的节点类型。它们的解析相对简单，但细节处理同样重要。

## parseText 实现

```typescript
function parseText(
  context: ParserContext,
  mode: TextModes
): TextNode {
  const endTokens =
    mode === TextModes.CDATA ? [']]>'] : ['<', context.options.delimiters[0]]

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

文本解析到下一个标签或插值开始符为止。

## 确定文本结束位置

```typescript
const endTokens =
  mode === TextModes.CDATA ? [']]>'] : ['<', context.options.delimiters[0]]

let endIndex = context.source.length
for (let i = 0; i < endTokens.length; i++) {
  const index = context.source.indexOf(endTokens[i], 1)
  if (index !== -1 && endIndex > index) {
    endIndex = index
  }
}
```

在 DATA 模式下，文本在 `<` 或 `{{` 之前结束。在 CDATA 模式下，只有 `]]>` 才结束文本。

## parseTextData 实现

```typescript
function parseTextData(
  context: ParserContext,
  length: number,
  mode: TextModes
): string {
  const rawText = context.source.slice(0, length)
  advanceBy(context, length)
  
  if (
    mode === TextModes.RAWTEXT ||
    mode === TextModes.CDATA ||
    !rawText.includes('&')
  ) {
    return rawText
  }
  
  // DATA 或 RCDATA 模式需要解码实体
  return context.options.decodeEntities(rawText, mode === TextModes.ATTRIBUTE_VALUE)
}
```

RAWTEXT 模式（script/style）不解码实体。如果文本不包含 `&`，也跳过解码。

## 实体解码

```typescript
// 默认的实体解码（简化版）
function decodeEntities(rawText: string, isAttribute: boolean): string {
  return rawText.replace(decodeRE, (_, p1) => decodeMap[p1])
}

const decodeMap: Record<string, string> = {
  lt: '<',
  gt: '>',
  amp: '&',
  quot: '"',
  apos: "'"
}
```

compiler-dom 提供完整的 HTML 实体解码，包括数字实体（`&#60;`）和命名实体（`&copy;`）。

## parseComment 实现

```typescript
function parseComment(context: ParserContext): CommentNode {
  const start = getCursor(context)
  let content: string

  // 查找注释结束标记
  const match = /--(\!)?>/.exec(context.source)
  
  if (!match) {
    // 未闭合的注释
    content = context.source.slice(4)
    advanceBy(context, context.source.length)
    emitError(context, ErrorCodes.EOF_IN_COMMENT)
  } else {
    if (match.index <= 3) {
      // <!-- 后立即 -->
      emitError(context, ErrorCodes.ABRUPT_CLOSING_OF_EMPTY_COMMENT)
    }
    if (match[1]) {
      // --!> 结尾是错误的
      emitError(context, ErrorCodes.INCORRECTLY_CLOSED_COMMENT)
    }
    content = context.source.slice(4, match.index)

    // 检查嵌套注释
    const s = context.source.slice(0, match.index)
    let prevIndex = 1
    let nestedIndex = 0
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

注释解析处理多种边界情况。

## 注释边界情况

```html
<!-- 正常注释 -->
<!---->          <!-- 空注释，报告警告 -->
<!-- -- -->      <!-- 包含 -- -->
<!---- -->       <!-- 错误的开头 -->
<!-- --!>        <!-- 错误的结尾 -->
<!-- <!-- 嵌套 --> --> <!-- 嵌套注释，报告警告 -->
```

这些情况都需要正确处理并报告适当的错误。

## 嵌套注释检测

```typescript
const s = context.source.slice(0, match.index)
let prevIndex = 1
let nestedIndex = 0
while ((nestedIndex = s.indexOf('<!--', prevIndex)) !== -1) {
  advanceBy(context, nestedIndex - prevIndex + 1)
  if (nestedIndex + 4 < s.length) {
    emitError(context, ErrorCodes.NESTED_COMMENT)
  }
  prevIndex = nestedIndex + 1
}
```

在注释内容中查找 `<!--`，发现则报告嵌套注释错误。

## parseBogusComment 实现

```typescript
function parseBogusComment(context: ParserContext): CommentNode | undefined {
  const start = getCursor(context)
  const contentStart = context.source[1] === '?' ? 1 : 2
  let content: string

  const closeIndex = context.source.indexOf('>')
  if (closeIndex === -1) {
    content = context.source.slice(contentStart)
    advanceBy(context, context.source.length)
  } else {
    content = context.source.slice(contentStart, closeIndex)
    advanceBy(context, closeIndex + 1)
  }

  return {
    type: NodeTypes.COMMENT,
    content,
    loc: getSelection(context, start)
  }
}
```

Bogus comment 处理 `<!DOCTYPE>`、`<?xml?>` 等非标准注释语法。

## 文本合并

在 parseChildren 中，相邻文本节点会被合并：

```typescript
function pushNode(nodes: TemplateChildNode[], node: TemplateChildNode): void {
  if (node.type === NodeTypes.TEXT) {
    const prev = last(nodes)
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

这发生在文本被插值打断后重新合并：

```html
hello {{ name }} world
```

解析为三个节点：文本 "hello "、插值、文本 " world"。

## 空白处理

文本节点的空白处理在 parseChildren 末尾进行：

```typescript
if (!context.inPre) {
  if (!/[^\t\r\n\f ]/.test(node.content)) {
    // 纯空白节点
    const prev = nodes[i - 1]
    const next = nodes[i + 1]
    if (
      !prev || !next ||
      (shouldCondense &&
        (prev.type === NodeTypes.COMMENT ||
          next.type === NodeTypes.COMMENT ||
          (prev.type === NodeTypes.ELEMENT &&
            next.type === NodeTypes.ELEMENT &&
            /[\r\n]/.test(node.content))))
    ) {
      // 移除纯空白节点
      removedWhitespace = true
      nodes[i] = null as any
    } else {
      // 压缩为单个空格
      node.content = ' '
    }
  } else if (shouldCondense) {
    // 压缩连续空白为单个空格
    node.content = node.content.replace(/[\t\r\n\f ]+/g, ' ')
  }
}
```

两个元素之间的纯空白行被移除。其他连续空白被压缩为单个空格。

## pre 标签内的文本

```typescript
if (context.inPre) {
  // 只规范化换行符
  node.content = node.content.replace(/\r\n/g, '\n')
}
```

`<pre>` 内的空白被保留，只是把 CRLF 统一为 LF。

## 注释是否保留

```typescript
const parserOptions = {
  comments: __DEV__  // 只在开发环境保留注释
}
```

默认情况下，生产构建中注释会被移除。开发构建保留注释用于调试。

## 小结

文本和注释是最基础的节点类型。文本解析到下一个标签或插值为止，可能需要解码 HTML 实体。注释解析处理多种边界情况：空注释、嵌套注释、错误的结束标记。空白处理在解析完成后进行，可以移除或压缩。pre 标签内的空白被保留。注释节点默认只在开发环境保留。
