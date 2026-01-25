# parseTag 标签解析

`parseTag` 解析开始标签和结束标签的核心部分：标签名、属性、自闭合标记。它是 parseElement 的核心组成部分。

## 函数签名

```typescript
function parseTag(
  context: ParserContext,
  type: TagType,
  parent: ElementNode | undefined
): ElementNode | undefined
```

`type` 区分开始标签和结束标签。结束标签返回 undefined，只消费源码。

## 标签类型

```typescript
const enum TagType {
  Start,
  End
}
```

两种类型的处理逻辑有差异：开始标签解析属性，结束标签只验证格式。

## 解析标签名

```typescript
const start = getCursor(context)
const match = /^<\/?([a-z][^\t\r\n\f />]*)/i.exec(context.source)!
const tag = match[1]
```

正则匹配标签名。标签名以字母开头，后面可以跟字母、数字、`-`、`_` 等。

## 确定命名空间

```typescript
const ns = context.options.getNamespace(tag, parent)
```

命名空间影响后续解析。在 SVG 命名空间内，标签名是大小写敏感的。

```typescript
function getNamespace(tag: string, parent: ElementNode | undefined): Namespaces {
  let ns = parent ? parent.ns : Namespaces.HTML
  
  if (parent && ns === Namespaces.SVG) {
    if (parent.tag === 'annotation-xml') {
      if (tag === 'svg') {
        return Namespaces.SVG
      }
      if (['text/html', 'application/xhtml+xml'].includes(
        parent.props.find(p => p.name === 'encoding')?.value?.content
      )) {
        ns = Namespaces.HTML
      }
    } else if (
      ['desc', 'title', 'foreignObject'].includes(parent.tag)
    ) {
      ns = Namespaces.HTML
    }
  } else if (parent && ns === Namespaces.MATH_ML) {
    if (parent.tag === 'annotation-xml' && tag === 'svg') {
      return Namespaces.SVG
    }
    if (['mi', 'mo', 'mn', 'ms', 'mtext'].includes(parent.tag)) {
      if (tag !== 'mglyph' && tag !== 'malignmark') {
        ns = Namespaces.HTML
      }
    }
  }

  if (ns === Namespaces.HTML) {
    if (tag === 'svg') {
      return Namespaces.SVG
    }
    if (tag === 'math') {
      return Namespaces.MATH_ML
    }
  }
  return ns
}
```

SVG 和 MathML 有复杂的嵌套规则，比如 foreignObject 内可以嵌套 HTML。

## 解析属性

```typescript
advanceBy(context, match[0].length)  // 跳过 '<tag' 或 '</tag'
advanceSpaces(context)  // 跳过空白

let props = parseAttributes(context, type)
```

标签名后的部分全是属性，循环解析直到遇到 `>` 或 `/>`。

## v-pre 检测与重解析

```typescript
// 检测 v-pre 指令
if (type === TagType.Start && !context.inVPre) {
  const vPreIndex = props.findIndex(
    p => p.type === NodeTypes.DIRECTIVE && p.name === 'pre'
  )
  if (vPreIndex !== -1) {
    context.inVPre = true
    // 重置源码位置
    extend(context, { source: currentSource, ...cursor })
    // 在 v-pre 模式下重新解析属性
    props = parseAttributes(context, type).filter(p => p.name !== 'v-pre')
  }
}
```

这是个有趣的设计：先正常解析属性检测 v-pre，发现后重置位置重新解析（这次不解析指令语法）。

## 检查自闭合

```typescript
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
```

自闭合标签以 `/>` 结尾。结束标签不应该自闭合（`</div/>` 是错误的）。

## 确定元素类型

```typescript
if (type === TagType.End) {
  return  // 结束标签不需要返回节点
}

let tagType = ElementTypes.ELEMENT
if (!context.inVPre) {
  if (tag === 'slot') {
    tagType = ElementTypes.SLOT
  } else if (tag === 'template') {
    if (props.some(p => 
      p.type === NodeTypes.DIRECTIVE && 
      isSpecialTemplateDirective(p.name)
    )) {
      tagType = ElementTypes.TEMPLATE
    }
  } else if (isComponent(tag, props, context)) {
    tagType = ElementTypes.COMPONENT
  }
}
```

元素类型在转换阶段有不同的处理逻辑：

```typescript
const enum ElementTypes {
  ELEMENT,     // 普通元素
  COMPONENT,   // 组件
  SLOT,        // <slot>
  TEMPLATE     // 带结构指令的 <template>
}
```

## 特殊 template 指令

```typescript
function isSpecialTemplateDirective(name: string): boolean {
  return name === 'if' || name === 'else' || name === 'else-if' || 
         name === 'for' || name === 'slot'
}
```

`<template v-if>`、`<template v-for>`、`<template v-slot>` 是特殊的模板元素，需要不同的处理。

## pre 标签处理

```typescript
if (context.options.isPreTag(tag)) {
  context.inPre = true
}
```

`<pre>` 标签内保留空白，不压缩。这个标志影响 parseChildren 的行为。

## 返回元素节点

```typescript
return {
  type: NodeTypes.ELEMENT,
  ns,
  tag,
  tagType,
  props,
  isSelfClosing,
  children: [],  // 稍后在 parseElement 中填充
  loc: getSelection(context, start),
  codegenNode: undefined  // 转换阶段填充
}
```

此时 children 为空，由 parseElement 递归解析后填充。

## 结束标签验证

结束标签的处理更简单：

```typescript
if (type === TagType.End) {
  // 结束标签不应该有属性
  if (props.length > 0) {
    emitError(context, ErrorCodes.END_TAG_WITH_ATTRIBUTES)
  }
  // 结束标签不应该自闭合
  if (isSelfClosing) {
    emitError(context, ErrorCodes.END_TAG_WITH_TRAILING_SOLIDUS)
  }
  return undefined
}
```

结束标签只需消费源码，不需要返回节点。

## 辅助函数

```typescript
function startsWithEndTagOpen(source: string, tag: string): boolean {
  return (
    startsWith(source, '</') &&
    source.slice(2, 2 + tag.length).toLowerCase() === tag.toLowerCase() &&
    /[\t\r\n\f />]/.test(source[2 + tag.length] || '>')
  )
}
```

检查源码是否以特定的结束标签开始。比较时忽略大小写，还要检查标签名后是空白或 `>`。

## 错误处理

parseTag 可能遇到的错误：

```typescript
// 文件结束在标签内
ErrorCodes.EOF_IN_TAG

// 结束标签有属性
ErrorCodes.END_TAG_WITH_ATTRIBUTES

// 结束标签自闭合
ErrorCodes.END_TAG_WITH_TRAILING_SOLIDUS

// 属性名以 = 开头
ErrorCodes.UNEXPECTED_EQUALS_SIGN_BEFORE_ATTRIBUTE_NAME

// 标签内有意外的 /
ErrorCodes.UNEXPECTED_SOLIDUS_IN_TAG
```

报告错误后继续解析，尽可能多地产出有用信息。

## 位置信息

```typescript
const start = getCursor(context)
// ... 解析过程 ...
loc: getSelection(context, start)
```

元素的位置信息从 `<` 开始到 `>` 或 `/>` 结束。这只是开始标签的位置，完整元素位置在 parseElement 结束时更新。

## 小结

parseTag 解析标签的核心部分：标签名、命名空间、属性列表、自闭合标记。它区分开始标签和结束标签，确定元素类型（普通元素、组件、slot、template）。v-pre 检测需要特殊处理：发现后重新解析属性。错误处理使解析能继续进行。返回的元素节点的 children 为空，由 parseElement 填充。
