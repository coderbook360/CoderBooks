# parseAttributeValue 属性值解析

属性值解析是模板解析中相对独立但细节丰富的部分，需要处理引号、实体解码和各种边界情况。

## 核心实现

```typescript
function parseAttributeValue(context: ParserContext): AttributeValue {
  const start = getCursor(context)
  let content: string

  const quote = context.source[0]
  const isQuoted = quote === `"` || quote === `'`
  
  if (isQuoted) {
    // 带引号的值
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
    // 无引号的值
    const match = /^[^\t\r\n\f >]+/.exec(context.source)
    if (!match) {
      return undefined
    }
    const unexpectedChars = /["'<=`]/
    let i = 0
    while (i < match[0].length) {
      const char = match[0][i]
      if (unexpectedChars.test(char)) {
        emitError(
          context,
          ErrorCodes.UNEXPECTED_CHARACTER_IN_UNQUOTED_ATTRIBUTE_VALUE,
          i
        )
      }
      i++
    }
    content = parseTextData(context, match[0].length, TextModes.ATTRIBUTE_VALUE)
  }

  return { content, isQuoted, loc: getSelection(context, start) }
}
```

属性值解析首先判断是否有引号包裹。对于带引号的值，找到匹配的结束引号，提取中间内容。对于无引号的值，使用正则匹配直到遇到空白或结束符，同时检查是否包含不合法的字符。

## parseTextData 文本数据处理

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
  
  // 包含 HTML 实体，需要解码
  return context.options.decodeEntities(
    rawText,
    mode === TextModes.ATTRIBUTE_VALUE
  )
}
```

文本数据处理根据不同的模式决定是否进行 HTML 实体解码。`RAWTEXT` 和 `CDATA` 模式直接返回原始文本，而普通文本和属性值中的 `&` 字符需要被解码为对应的字符。

## HTML 实体解码

```typescript
const decodeRE = /&(gt|lt|amp|apos|quot);/g
const decodeMap: Record<string, string> = {
  gt: '>',
  lt: '<',
  amp: '&',
  apos: "'",
  quot: '"'
}

function decodeEntities(rawText: string, asAttr: boolean): string {
  let decodedText = ''
  let i = 0
  let match: RegExpExecArray | null
  
  decodeRE.lastIndex = 0
  while ((match = decodeRE.exec(rawText))) {
    decodedText += rawText.slice(i, match.index)
    decodedText += decodeMap[match[1]]
    i = match.index + match[0].length
  }
  
  decodedText += rawText.slice(i)
  return decodedText
}
```

HTML 实体解码处理最常见的五个命名实体。在浏览器环境中，Vue 会利用 DOM API 进行完整的实体解码；在非浏览器环境中，则使用这个简化版本处理基本情况。

## 引号处理的边界情况

```typescript
// 未闭合的引号
// <div title="hello
if (endIndex === -1) {
  emitError(context, ErrorCodes.EOF_IN_TAG)
  content = parseTextData(
    context,
    context.source.length,
    TextModes.ATTRIBUTE_VALUE
  )
}

// 空属性值
// <div title="">
if (!content && isQuoted) {
  content = ''
}
```

解析器需要处理各种异常情况。未闭合的引号会消费剩余所有内容并报错。空属性值是合法的，需要正确返回空字符串。

## 值类型判断

```typescript
// 属性值可能是静态的也可能是动态的
interface AttributeValue {
  content: string
  isQuoted: boolean
  loc: SourceLocation
}

// 静态属性值
// <div title="hello">

// 动态属性值（包含插值）
// <component :is="comp">
```

属性值解析本身不区分静态和动态，这个判断在更上层的属性解析中完成。这里只负责提取引号内的原始文本内容。

## 与指令值的区别

普通属性值和指令属性值的解析路径不同：

```typescript
// 普通属性 - 值是纯文本
// <div title="hello">
// 调用 parseAttributeValue

// 指令属性 - 值是表达式
// <div :title="message">
// 值被解析为表达式节点
```

指令属性的值会在后续阶段被解析为 JavaScript 表达式，而非简单的文本内容。

## 特殊字符转义

```typescript
// 属性值中的特殊字符
// <div title="say &quot;hello&quot;">
// 解码后: say "hello"

// v-bind 中的引号
// <div :title="'hello'">
// 这是 JS 表达式，不需要实体解码
```

理解何时需要实体解码很重要。HTML 属性值中的引号需要用实体表示，而 JavaScript 表达式中可以直接使用引号（使用不同类型）。

## 小结

parseAttributeValue 的设计考虑了多种情况：

1. **引号识别**：支持双引号、单引号和无引号三种形式
2. **实体解码**：根据上下文决定是否解码
3. **错误处理**：未闭合引号、非法字符的检测
4. **位置追踪**：为错误报告提供精确位置

下一章将分析 parseInterpolation 如何解析模板插值语法。
