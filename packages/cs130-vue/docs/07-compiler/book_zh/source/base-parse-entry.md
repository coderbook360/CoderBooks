# baseParse 解析入口

`baseParse` 是编译器解析阶段的入口函数。它接收模板字符串，返回 AST 根节点。理解这个函数是掌握 Vue 编译器解析过程的起点。

## 函数签名

```typescript
export function baseParse(
  content: string,
  options: ParserOptions = {}
): RootNode {
  const context = createParserContext(content, options)
  const start = getCursor(context)
  return createRoot(
    parseChildren(context, TextModes.DATA, []),
    getSelection(context, start)
  )
}
```

整个流程非常清晰：创建解析上下文，记录起始位置，解析子节点，创建根节点。

## 解析上下文

解析上下文是解析过程的核心数据结构：

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

上下文维护解析状态：当前位置（行、列、偏移）、剩余源码、是否在 pre 标签内等。

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

这些是平台无关的默认值。compiler-dom 会提供 HTML 特定的实现，如 `isVoidTag` 会识别 `<br>`、`<img>` 等自闭合标签。

## 位置跟踪

解析过程中需要精确跟踪位置，用于错误报告和源码映射：

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

`getSelection` 从原始源码中截取对应片段，这在调试时非常有用。

## 推进解析位置

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

每次消费字符时，更新行号、列号和偏移量。遇到换行符时行号增加。

## 创建根节点

```typescript
export function createRoot(
  children: TemplateChildNode[],
  loc = locStub
): RootNode {
  return {
    type: NodeTypes.ROOT,
    children,
    helpers: new Set(),
    components: [],
    directives: [],
    hoists: [],
    imports: [],
    cached: 0,
    temps: 0,
    codegenNode: undefined,
    loc
  }
}
```

根节点包含转换阶段需要的各种辅助信息：helpers（运行时帮助函数）、hoists（静态提升内容）等。这些在转换阶段填充，解析阶段只是初始化。

## 文本模式

解析器根据上下文使用不同的文本解析模式：

```typescript
export const enum TextModes {
  DATA,          // 普通模式，解析元素、插值、实体
  RCDATA,        // <textarea>、<title> 内，解析实体
  RAWTEXT,       // <style>、<script> 内，原样输出
  CDATA,         // XML CDATA，原样输出
  ATTRIBUTE_VALUE // 属性值，解析实体
}
```

不同模式决定如何解析特殊字符。比如在 `<script>` 内部，`{{` 不会被解析为插值。

## 祖先栈

`parseChildren` 接收祖先栈参数：

```typescript
parseChildren(context, TextModes.DATA, [])
```

祖先栈用于追踪当前解析位置的父元素链。这对检测未闭合标签和解析作用域插槽很重要。

## 错误处理

解析过程中的错误通过 context 的 onError 报告：

```typescript
const context = createParserContext(content, {
  onError: (error) => {
    errors.push(error)
    // 不抛出异常，继续解析
  }
})
```

可以收集所有错误，而不是遇到第一个错误就停止。

## 空白处理

baseParse 不处理空白，这是转换阶段的工作。但解析选项可以配置空白行为：

```typescript
interface ParserOptions {
  whitespace?: 'preserve' | 'condense'
}
```

`preserve` 保留所有空白，`condense` 压缩连续空白为单个空格。

## 与 compiler-dom 的关系

compiler-dom 的 parse 函数调用 baseParse：

```typescript
export function parse(
  template: string,
  options: ParserOptions = {}
): RootNode {
  return baseParse(template, extend({}, parserOptions, options))
}
```

它传入 DOM 特定的选项，如识别 HTML 元素、void 标签等。

## 解析结果示例

```typescript
const ast = baseParse('<div id="app">{{ msg }}</div>')
```

返回的 AST：

```javascript
{
  type: 0, // ROOT
  children: [{
    type: 1, // ELEMENT
    tag: 'div',
    props: [{
      type: 6, // ATTRIBUTE
      name: 'id',
      value: { content: 'app' }
    }],
    children: [{
      type: 5, // INTERPOLATION
      content: {
        type: 4, // SIMPLE_EXPRESSION
        content: 'msg'
      }
    }]
  }],
  loc: { start: { line: 1, column: 1 }, end: { line: 1, column: 30 } }
}
```

## 小结

baseParse 是解析阶段的入口。它创建解析上下文，调用 parseChildren 解析内容，然后创建根节点。上下文维护解析状态，包括当前位置、剩余源码、解析模式等。位置信息精确到行列，用于错误报告和源码映射。解析结果是纯粹的语法结构，语义分析在转换阶段进行。
