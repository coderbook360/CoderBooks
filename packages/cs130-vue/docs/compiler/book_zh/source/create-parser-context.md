# createParserContext 上下文创建

解析器上下文是 Vue 模板解析过程中的核心数据结构，它维护了解析过程中所需的所有状态信息。

## 上下文结构

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

## createParserContext 实现

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

解析器上下文的创建过程首先合并用户选项与默认选项，然后初始化位置信息。`originalSource` 保存原始模板内容用于错误报告，`source` 则是当前待解析的内容，会随着解析过程逐步消费。位置跟踪通过 `line`、`column`、`offset` 三个字段实现，确保错误信息能够精确定位到源码位置。

## 默认解析选项

```typescript
export const defaultParserOptions: MergedParserOptions = {
  delimiters: [`{{`, `}}`],
  getNamespace: () => Namespaces.HTML,
  getTextMode: () => TextModes.DATA,
  isVoidTag: NO,
  isPreTag: NO,
  isCustomElement: NO,
  decodeEntities: (rawText: string): string =>
    rawText.replace(decodeRE, (_, p1) => decodeMap[p1]),
  onError: defaultOnError,
  onWarn: defaultOnWarn,
  comments: __DEV__
}
```

这些默认选项覆盖了常见的解析需求。`delimiters` 定义插值语法的定界符，默认是双大括号。`getNamespace` 和 `getTextMode` 用于处理不同 HTML 上下文中的解析规则。`isVoidTag` 判断自闭合标签，`isPreTag` 识别预格式化标签。

## 位置跟踪机制

```typescript
function getCursor(context: ParserContext): Position {
  const { column, line, offset } = context
  return { column, line, offset }
}

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

位置跟踪是错误报告的基础。`getCursor` 获取当前解析位置的快照，`getSelection` 创建一个源码位置范围对象，包含起始位置、结束位置和对应的源码片段。

## 前进与回退

```typescript
function advanceBy(context: ParserContext, numberOfCharacters: number): void {
  const { source } = context
  advancePositionWithMutation(context, source, numberOfCharacters)
  context.source = source.slice(numberOfCharacters)
}

function advancePositionWithMutation(
  pos: Position,
  source: string,
  numberOfCharacters: number
): Position {
  let linesCount = 0
  let lastNewLinePos = -1
  for (let i = 0; i < numberOfCharacters; i++) {
    if (source.charCodeAt(i) === 10 /* newline */) {
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

`advanceBy` 是解析过程中消费源码的核心方法。它不仅更新 `source` 字符串，还同步更新位置信息。`advancePositionWithMutation` 通过扫描被消费的字符来统计换行次数，从而正确更新行号和列号。

## 空白处理

```typescript
function advanceSpaces(context: ParserContext): void {
  const match = /^[\t\r\n\f ]+/.exec(context.source)
  if (match) {
    advanceBy(context, match[0].length)
  }
}
```

空白处理在 HTML 解析中非常常见。`advanceSpaces` 跳过连续的空白字符，包括空格、制表符、换行符等。这个函数在标签解析、属性解析等多个场景中使用。

## 状态标记

上下文中的 `inPre` 和 `inVPre` 两个布尔标记控制着解析行为：

`inPre` 表示当前处于 `<pre>` 标签内部，此时空白字符的处理规则会发生变化，需要保留原始格式。

`inVPre` 表示当前处于 `v-pre` 指令作用范围内，此时应跳过所有指令解析，将模板内容原样输出。

这两个标记的正确维护对于生成正确的 AST 至关重要。

## 小结

createParserContext 创建的上下文对象承载了解析过程中的所有状态：

1. **源码管理**：originalSource 保留原始内容，source 逐步消费
2. **位置跟踪**：line、column、offset 精确定位
3. **解析配置**：options 合并默认与用户选项
4. **状态标记**：inPre、inVPre 控制解析行为

下一章将分析 parseChildren 如何递归解析子节点。
