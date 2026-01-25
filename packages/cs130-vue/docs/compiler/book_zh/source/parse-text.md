# parseText 文本解析

parseText 负责解析模板中的纯文本内容。文本是 HTML 中最基础的内容类型，看似简单但有很多边界情况需要处理。

## 设计思路

模板中的文本可能出现在各种位置：元素内容、属性值、插值之间。文本解析需要正确识别文本的边界——遇到标签开始、插值开始、注释开始时停止。同时还要处理 HTML 实体的解码，将 `&lt;` 转换为 `<` 等。

## 核心实现

```typescript
function parseText(context: ParserContext, mode: TextModes): TextNode {
  // 确定文本结束位置
  const endTokens =
    mode === TextModes.CDATA
      ? [']]>']
      : ['<', context.options.delimiters[0]]  // '<' 和 '{{'
  
  let endIndex = context.source.length
  
  // 找到最近的结束标记
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

## 文本边界检测

文本在遇到以下字符时结束：
- `<` - 标签或注释开始
- `{{` - 插值开始（默认分隔符）
- `]]>` - CDATA 结束（仅 CDATA 模式）

```typescript
const endTokens = ['<', context.options.delimiters[0]]

for (let i = 0; i < endTokens.length; i++) {
  const index = context.source.indexOf(endTokens[i], 1)
  if (index !== -1 && endIndex > index) {
    endIndex = index
  }
}
```

从索引 1 开始搜索，因为索引 0 已经确认是文本字符。

## 文本数据提取

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
    // 不需要解码
    return rawText
  }
  
  // 解码 HTML 实体
  return context.options.decodeEntities(
    rawText,
    false /* 不是属性值 */
  )
}
```

## HTML 实体解码

文本中的 HTML 实体需要解码：

```typescript
// 输入
'Hello &lt;World&gt;'

// 解码后
'Hello <World>'
```

常见实体：
- `&lt;` → `<`
- `&gt;` → `>`
- `&amp;` → `&`
- `&quot;` → `"`
- `&apos;` → `'`
- `&#60;` → `<`（数字实体）
- `&#x3c;` → `<`（十六进制实体）

## TextModes 的影响

不同模式下文本处理不同：

```typescript
enum TextModes {
  DATA,          // 普通模式，解析所有
  RCDATA,        // <textarea> 内，只解析实体和插值
  RAWTEXT,       // <script>/<style> 内，不解析任何东西
  CDATA,         // CDATA 节，原样输出
  ATTRIBUTE_VALUE  // 属性值
}
```

```typescript
if (mode === TextModes.RAWTEXT || mode === TextModes.CDATA) {
  return rawText  // 不解码
}
```

## 与插值的交互

文本和插值交替出现：

```html
Hello {{ name }}!
```

解析流程：
1. parseText 解析 "Hello "
2. parseInterpolation 解析 `{{ name }}`
3. parseText 解析 "!"

每个部分都是独立的节点。

## 空白处理

Vue 编译器有空白压缩选项：

```typescript
interface CompilerOptions {
  whitespace?: 'preserve' | 'condense'
}
```

condense 模式（默认）：
- 连续空白压缩为单个空格
- 元素间的纯空白可能被移除

这在 transform 阶段处理，parseText 保留原始文本。

## 位置追踪

文本节点保留精确的源码位置：

```typescript
const start = getCursor(context)
const content = parseTextData(context, endIndex, mode)

return {
  type: NodeTypes.TEXT,
  content,
  loc: getSelection(context, start)
}
```

这对错误报告和 source map 很重要。

## 特殊字符处理

某些字符在模板中有特殊含义：

```html
<!-- 需要转义 -->
<div>1 &lt; 2</div>

<!-- 或使用 v-text -->
<div v-text="'1 < 2'"></div>
```

parseText 会解码实体，使内容正确显示。

## CDATA 处理

XML 命名空间（如 SVG）中可能有 CDATA：

```html
<svg>
  <![CDATA[
    Some <special> content
  ]]>
</svg>
```

CDATA 内容原样保留，不解析标签或实体。

## 错误场景

文本解析很少出错，但有一些边界：

```html
<!-- 未闭合的实体 -->
<div>Hello &</div>
<!-- 警告但不报错，保留 & 原样 -->

<!-- 无效的数字实体 -->
<div>&#999999999;</div>
<!-- 回退到原字符串 -->
```

## 生成的 AST

```typescript
{
  type: NodeTypes.TEXT,
  content: "Hello World",
  loc: {
    start: { line: 1, column: 6, offset: 5 },
    end: { line: 1, column: 17, offset: 16 },
    source: "Hello World"
  }
}
```

## 与 transform 的关系

文本节点在 transform 阶段可能被合并：

```html
Hello {{ name }} World
```

如果 name 是静态的，可能合并为单个文本。动态插值则保持分开，生成 createTextVNode 调用。

## 小结

parseText 解析模板中的纯文本内容。它检测文本边界（`<` 或 `{{`），提取文本数据，并在需要时解码 HTML 实体。不同的 TextModes 决定是否进行实体解码。文本节点保留精确的位置信息用于后续处理。这看似简单的功能是模板解析的基础组成部分。
