# parseBogusComment 伪注释解析

伪注释是 HTML 规范中定义的特殊结构，包括 DOCTYPE 声明和其他以 `<!` 或 `<?` 开头但不是标准注释的内容。

## 什么是伪注释

```html
<!-- 标准 HTML 注释 -->
<!-- comment -->

<!-- 伪注释：DOCTYPE 声明 -->
<!DOCTYPE html>

<!-- 伪注释：XML 处理指令 -->
<?xml version="1.0"?>

<!-- 伪注释：CDATA 区段 -->
<![CDATA[ content ]]>
```

这些结构在 HTML 解析规范中被归类为 "bogus comment"，因为它们不是标准的注释格式，但通常被浏览器容错处理。

## 核心实现

```typescript
function parseBogusComment(context: ParserContext): CommentNode | undefined {
  const start = getCursor(context)
  
  // 确定结束位置
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

伪注释的解析相对简单：找到结束的 `>` 字符，提取中间内容。与标准注释不同，伪注释不需要 `-->` 结束标记。

## 触发条件

```typescript
// parseChildren 中的分支判断
if (source[0] === '<') {
  if (source[1] === '!') {
    if (startsWith(source, '<!--')) {
      // 标准注释
      node = parseComment(context)
    } else if (startsWith(source, '<!DOCTYPE')) {
      // DOCTYPE 声明 - 视为伪注释
      node = parseBogusComment(context)
    } else if (startsWith(source, '<![CDATA[')) {
      // CDATA - 特殊处理
      node = parseCDATA(context, ancestors)
    } else {
      // 其他 <! 开头 - 伪注释
      node = parseBogusComment(context)
    }
  } else if (source[1] === '?') {
    // <? 开头 - XML 处理指令，视为伪注释
    emitError(context, ErrorCodes.UNEXPECTED_QUESTION_MARK_INSTEAD_OF_TAG_NAME)
    node = parseBogusComment(context)
  }
}
```

解析器根据 `<!` 或 `<?` 后的字符判断具体类型，不符合标准注释格式的都交给 parseBogusComment 处理。

## DOCTYPE 处理

```typescript
// <!DOCTYPE html>
// 被解析为伪注释，内容是 "DOCTYPE html"

// 在模板编译中，DOCTYPE 通常是多余的
// Vue 组件不需要 DOCTYPE 声明
// 但解析器需要正确跳过它
```

在 Vue 单文件组件中，DOCTYPE 声明没有意义。解析器将其作为伪注释处理，在后续编译阶段会被忽略。

## XML 声明处理

```typescript
// <?xml version="1.0" encoding="UTF-8"?>
// 被解析为伪注释

// HTML5 不支持 XML 声明
// 但解析器需要容错处理
if (source[1] === '?') {
  emitError(
    context,
    ErrorCodes.UNEXPECTED_QUESTION_MARK_INSTEAD_OF_TAG_NAME,
    0
  )
}
```

XML 声明在 HTML5 中是无效的，解析器会报告错误但仍然正确解析，保证后续内容能继续处理。

## 与标准注释的区别

```typescript
// 标准注释
// <!-- content -->
// - 需要 --> 结束
// - 不能嵌套
// - 内容中不能有 --

// 伪注释
// <!DOCTYPE html>
// <? processing ?>
// - 只需要 > 结束
// - 简单的开闭结构
```

这种区别源于 HTML 规范的历史演进。早期 SGML 的复杂语法在 HTML5 中被大幅简化。

## 浏览器兼容性

```html
<!-- 浏览器容错行为 -->
<!DOCTYPE html>     <!-- 正常处理 -->
<!ELEMENT ...>      <!-- DTD 元素声明，被忽略 -->
<!ENTITY ...>       <!-- DTD 实体声明，被忽略 -->
<?php ... ?>        <!-- PHP 标签，被视为注释 -->
```

现代浏览器对这些非标准内容有完善的容错处理。Vue 编译器的处理方式与浏览器行为保持一致。

## 节点生成

```typescript
// 伪注释生成的 AST 节点
{
  type: NodeTypes.COMMENT,
  content: 'DOCTYPE html',
  loc: {
    source: '<!DOCTYPE html>',
    start: { line: 1, column: 1, offset: 0 },
    end: { line: 1, column: 16, offset: 15 }
  }
}
```

伪注释最终也生成 CommentNode，与标准注释使用相同的节点类型。这简化了后续处理逻辑。

## 编译时行为

```typescript
// 伪注释在代码生成阶段
// 通常与标准注释一样处理
// - 开发模式：可能保留
// - 生产模式：通常移除

// 特殊情况：DOCTYPE
// 在 SSR 中可能需要保留完整 HTML 结构
```

大多数情况下，伪注释会被移除。但在 SSR 场景中，如果需要输出完整的 HTML 文档，DOCTYPE 可能需要特殊处理。

## 错误处理

```typescript
// 常见错误
// <?xml?   - 没有正确闭合
// <!       - 不完整的标记

if (closeIndex === -1) {
  // 没有找到闭合的 >
  // 消费所有剩余内容
  content = context.source.slice(contentStart)
  advanceBy(context, context.source.length)
  emitError(context, ErrorCodes.EOF_IN_TAG)
}
```

未闭合的伪注释会触发错误，但解析器会继续工作，保证最大程度的容错性。

## 小结

parseBogusComment 处理非标准注释结构：

1. **DOCTYPE 声明**：HTML5 文档类型声明
2. **XML 处理指令**：以 `<?` 开头的内容
3. **其他 SGML 结构**：DTD 声明等遗留语法
4. **容错处理**：保证解析器的健壮性

下一章将分析 AST 节点类型定义，了解编译器的数据结构设计。
