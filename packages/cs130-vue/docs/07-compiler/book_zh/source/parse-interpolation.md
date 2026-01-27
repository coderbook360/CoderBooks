# parseInterpolation 插值解析

插值是 Vue 模板的核心特性之一。`parseInterpolation` 解析 `{{ }}` 语法，提取其中的表达式。

## 基本结构

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
  
  // 计算修剪后的精确位置
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

## 自定义分隔符

Vue 允许自定义插值分隔符：

```typescript
const app = createApp({
  template: '<div>${ msg }</div>',
  delimiters: ['${', '}']
})
```

解析器通过 `context.options.delimiters` 获取分隔符配置。

## 查找结束符

```typescript
const closeIndex = context.source.indexOf(close, open.length)

if (closeIndex === -1) {
  emitError(context, ErrorCodes.X_MISSING_INTERPOLATION_END)
  return undefined
}
```

从开始符后面开始查找结束符。找不到时报告错误，返回 undefined。

## 内容提取

```typescript
const rawContentLength = closeIndex - open.length
const rawContent = context.source.slice(0, rawContentLength)
const preTrimContent = parseTextData(context, rawContentLength, mode)
const content = preTrimContent.trim()
```

提取原始内容，然后去除首尾空白。`{{ msg }}` 提取的 content 是 `msg`，不是 ` msg `。

## 精确位置计算

位置信息需要指向去除空白后的实际内容：

```typescript
const startOffset = preTrimContent.indexOf(content)
if (startOffset > 0) {
  advancePositionWithMutation(innerStart, rawContent, startOffset)
}
const endOffset = rawContentLength - (preTrimContent.length - content.length - startOffset)
advancePositionWithMutation(innerEnd, rawContent, endOffset)
```

这确保 `{{  msg  }}` 中 `msg` 的位置信息准确，而不是指向空白。

## 返回节点结构

```typescript
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
```

插值节点包含一个简单表达式节点。表达式被标记为非静态，因为它需要在运行时求值。

## 位置信息差异

注意两个 loc 的区别：

```typescript
// {{ msg }}
//  ^     ^
//  |     |--- content.loc 指向 "msg"
//  |--------- loc 指向 "{{ msg }}"
```

外层 loc 包含分隔符，内层 loc 只包含表达式内容。

## 实体解码

在某些模式下，内容可能需要解码 HTML 实体：

```typescript
const preTrimContent = parseTextData(context, rawContentLength, mode)
```

`parseTextData` 在 DATA 和 RCDATA 模式下会解码 `&amp;` 等实体。

## v-pre 中的插值

```typescript
// 在 parseChildren 中
if (!context.inVPre && startsWith(s, context.options.delimiters[0])) {
  node = parseInterpolation(context, mode)
}
```

在 v-pre 模式下，`{{` 被当作普通文本，不解析为插值。

## 嵌套花括号

```typescript
{{ { a: 1 } }}  // 对象字面量
{{ fn({ x }) }}  // 对象参数
```

简单的 `indexOf(close)` 对这些情况会出问题吗？

实际上没问题，因为 Vue 的插值只查找第一个 `}}`，内部的 `}` 不会干扰：

```
{{ { a: 1 } }}
      ^   ^--- 这是结束符
      |------- 这只是对象的 }
```

但是这意味着 `{{ }}` 内不能包含 `}}`。

## 文本模式影响

```typescript
function parseInterpolation(
  context: ParserContext,
  mode: TextModes
): InterpolationNode | undefined
```

mode 参数影响实体解码。在 RAWTEXT 模式下不会调用 parseInterpolation（script/style 内不解析插值）。

## 空插值

```typescript
{{}}  // content 是空字符串
```

空插值是合法的，会生成一个空表达式。在转换阶段可能会报告警告。

## 复杂表达式

```typescript
{{ count > 0 ? 'yes' : 'no' }}
{{ items.filter(x => x.active).map(x => x.name).join(', ') }}
```

所有这些都只是简单地提取字符串内容，不做语法分析。表达式验证在转换阶段进行。

## 与其他节点的关系

在 parseChildren 的主循环中，插值检查在元素之前：

```typescript
if (!context.inVPre && startsWith(s, context.options.delimiters[0])) {
  node = parseInterpolation(context, mode)
} else if (mode === TextModes.DATA && s[0] === '<') {
  // 元素解析
}
```

所以 `{{<div>}}` 中的 `<div>` 不会被当作元素，而是插值的一部分（虽然这可能是无效的 JavaScript）。

## 小结

parseInterpolation 解析 `{{ }}` 插值语法。它提取分隔符之间的内容，去除首尾空白，计算精确的位置信息。返回的是包含简单表达式的插值节点。自定义分隔符通过选项配置。在 v-pre 模式下不解析插值。表达式内容只是字符串，不做语法分析，验证在转换阶段进行。
