# 解析上下文与状态管理

解析上下文是编译器解析阶段的核心数据结构。它维护解析状态、跟踪位置、管理选项配置。理解上下文的设计有助于理解整个解析过程如何运作。

## 上下文接口定义

```typescript
export interface ParserContext {
  options: MergedParserOptions
  readonly originalSource: string
  source: string
  offset: number
  line: number
  column: number
  inPre: boolean
  inVPre: boolean
  onWarn: NonNullable<ErrorHandlingOptions['onWarn']>
}
```

每个字段都有明确职责：options 是配置，source 是待解析内容，offset/line/column 是位置，inPre/inVPre 是状态标志。

## 创建上下文

```typescript
function createParserContext(
  content: string,
  rawOptions: ParserOptions
): ParserContext {
  const options = extend({}, defaultParserOptions)
  
  let key: keyof ParserOptions
  for (key in rawOptions) {
    options[key] =
      rawOptions[key] === undefined
        ? defaultParserOptions[key]
        : rawOptions[key]
  }
  
  return {
    options,
    column: 1,
    line: 1,
    offset: 0,
    originalSource: content,
    source: content,
    inPre: false,
    inVPre: false,
    onWarn: options.onWarn
  }
}
```

originalSource 保持不变，用于生成位置信息中的 source 片段。source 随着解析不断消费变短。

## 位置跟踪

解析器需要精确跟踪当前位置，这对错误报告和源码映射至关重要：

```typescript
function getCursor(context: ParserContext): Position {
  const { column, line, offset } = context
  return { column, line, offset }
}
```

返回当前位置的快照。注意行列号从 1 开始，偏移从 0 开始。

## 位置推进

每次消费字符，位置需要更新：

```typescript
function advanceBy(context: ParserContext, numberOfCharacters: number): void {
  const { source } = context
  advancePositionWithMutation(context, source, numberOfCharacters)
  context.source = source.slice(numberOfCharacters)
}
```

这个函数做两件事：更新位置计数器，截取剩余源码。

```typescript
function advancePositionWithMutation(
  pos: Position,
  source: string,
  numberOfCharacters: number
): Position {
  let linesCount = 0
  let lastNewLinePos = -1
  
  for (let i = 0; i < numberOfCharacters; i++) {
    if (source.charCodeAt(i) === 10 /* \n */) {
      linesCount++
      lastNewLinePos = i
    }
  }

  pos.offset += numberOfCharacters
  pos.line += linesCount
  pos.column =
    lastNewLinePos === -1
      ? pos.column + numberOfCharacters
      : numberOfCharacters - lastNewLinePos

  return pos
}
```

遍历被消费的字符，统计换行符数量。行号增加换行数，列号根据最后一个换行位置计算。

## 跳过空白

```typescript
function advanceSpaces(context: ParserContext): void {
  const match = /^[\t\r\n\f ]+/.exec(context.source)
  if (match) {
    advanceBy(context, match[0].length)
  }
}
```

匹配开头的连续空白字符并跳过。这在解析标签属性时频繁使用。

## 选择源码片段

```typescript
function getSelection(
  context: ParserContext,
  start: Position,
  end?: Position
): SourceLocation {
  end = end || getCursor(context)
  return {
    start,
    end,
    source: context.originalSource.slice(start.offset, end.offset)
  }
}
```

从 originalSource 中截取指定范围的源码。这就是为什么要保留 originalSource——source 会被消费，但生成位置信息时需要原始内容。

## 状态标志

### inPre 标志

```typescript
// 进入 <pre> 标签
if (context.options.isPreTag(element.tag)) {
  context.inPre = true
}

// 解析子内容时保留空白
if (context.inPre) {
  // 不压缩空白
}
```

`<pre>` 标签内的空白不能被压缩，需要原样保留。

### inVPre 标志

```typescript
// 检测 v-pre 指令
const hasPre = element.props.some(
  p => p.type === NodeTypes.DIRECTIVE && p.name === 'pre'
)
if (hasPre) {
  context.inVPre = true
}
```

`v-pre` 指令跳过该元素的编译。在 inVPre 模式下，插值和指令不会被解析。

## 命名空间管理

```typescript
const ns = context.options.getNamespace(tag, parent, currentNs)
```

命名空间影响解析行为。HTML、SVG、MathML 有不同的解析规则：

```typescript
export const enum Namespaces {
  HTML = 0,
  SVG,
  MATH_ML
}

function getNamespace(
  tag: string,
  parent: ElementNode | undefined,
  rootNamespace: Namespaces
): Namespaces {
  if (parent) {
    let ns = parent.ns
    if (ns === Namespaces.SVG && parent.tag === 'foreignObject') {
      ns = Namespaces.HTML
    }
    return ns
  }
  if (tag === 'svg') return Namespaces.SVG
  if (tag === 'math') return Namespaces.MATH_ML
  return Namespaces.HTML
}
```

SVG 内的 foreignObject 可以包含 HTML 内容。

## 文本解析模式

```typescript
const mode = context.options.getTextMode(element, parent)
```

不同元素内有不同的文本解析规则：

```typescript
function getTextMode(element: ElementNode): TextModes {
  const { tag, ns } = element
  if (ns === Namespaces.HTML) {
    if (tag === 'textarea' || tag === 'title') {
      return TextModes.RCDATA
    }
    if (isRawTextElement(tag)) {
      return TextModes.RAWTEXT
    }
  }
  return TextModes.DATA
}
```

script 和 style 内是 RAWTEXT 模式，内容原样保留不解析。

## 错误报告

```typescript
function emitError(
  context: ParserContext,
  code: ErrorCodes,
  offset?: number,
  loc: Position = getCursor(context)
): void {
  if (offset) {
    loc.offset += offset
    loc.column += offset
  }
  context.options.onError(
    createCompilerError(code, {
      start: loc,
      end: loc,
      source: ''
    })
  )
}
```

通过上下文的 onError 回调报告错误。位置信息来自当前解析位置，可以指定偏移调整。

## 判断辅助函数

```typescript
function isEnd(
  context: ParserContext,
  mode: TextModes,
  ancestors: ElementNode[]
): boolean {
  const s = context.source
  
  switch (mode) {
    case TextModes.DATA:
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
      const parent = last(ancestors)
      if (parent && startsWithEndTagOpen(s, parent.tag)) {
        return true
      }
      break
      
    case TextModes.CDATA:
      if (startsWith(s, ']]>')) {
        return true
      }
      break
  }
  
  return !s
}
```

判断当前位置是否是内容结束。根据文本模式有不同的结束条件。

## 祖先栈

祖先栈不在上下文中，而是作为参数传递：

```typescript
function parseChildren(
  context: ParserContext,
  mode: TextModes,
  ancestors: ElementNode[]
): TemplateChildNode[] {
  // 祖先栈用于：
  // 1. 检测未闭合标签
  // 2. 确定文本解析模式
  // 3. 解析作用域插槽
}
```

解析元素时入栈，解析完成后出栈。

## 小结

解析上下文是解析过程的状态容器。它维护当前位置（行、列、偏移）、剩余源码、解析模式、状态标志。位置推进时精确计算换行，用于生成准确的错误信息。状态标志（inPre、inVPre）影响空白处理和指令解析。这种设计使解析逻辑清晰，状态管理集中，易于调试和扩展。
