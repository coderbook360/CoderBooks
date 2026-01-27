# parseComment 注释解析

HTML 注释在模板编译中需要特殊处理，Vue 可以选择保留或移除这些注释。

## 注释语法

```html
<!-- 这是一个 HTML 注释 -->
<!-- 
  多行注释
  也是支持的
-->
```

## 核心实现

```typescript
function parseComment(context: ParserContext): CommentNode {
  const start = getCursor(context)
  let content: string

  // 匹配注释结束标记
  const match = /--(\!)?>/.exec(context.source)
  
  if (!match) {
    // 未找到结束标记，消费所有剩余内容
    content = context.source.slice(4)
    advanceBy(context, context.source.length)
    emitError(context, ErrorCodes.EOF_IN_COMMENT)
  } else {
    if (match.index <= 3) {
      // 注释内容过短或格式错误
      emitError(context, ErrorCodes.ABRUPT_CLOSING_OF_EMPTY_COMMENT)
    }
    if (match[1]) {
      // 结束标记是 --!> 而非 -->
      emitError(context, ErrorCodes.INCORRECTLY_CLOSED_COMMENT)
    }
    
    content = context.source.slice(4, match.index)
    
    // 检查注释内容中的嵌套注释
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

注释解析首先跳过开始标记 `<!--`，然后寻找结束标记 `-->`。解析过程中需要处理多种异常情况：未闭合的注释、错误的结束标记格式、以及嵌套注释。

## 注释节点结构

```typescript
export interface CommentNode extends Node {
  type: NodeTypes.COMMENT
  content: string
}

// 示例：<!-- hello world -->
// 生成的节点
{
  type: NodeTypes.COMMENT,    // 节点类型
  content: ' hello world ',   // 注释内容（不含定界符）
  loc: {
    start: { line: 1, column: 1, offset: 0 },
    end: { line: 1, column: 21, offset: 20 },
    source: '<!-- hello world -->'
  }
}
```

注释节点结构简单，只包含类型标识和注释文本内容。位置信息包含完整的注释标记。

## 错误检测

```typescript
// 未闭合的注释
// <!--  这是未闭合的注释
// ErrorCodes.EOF_IN_COMMENT

// 空注释或格式错误
// <!-->
// <!--->
// ErrorCodes.ABRUPT_CLOSING_OF_EMPTY_COMMENT

// 错误的结束标记
// <!-- comment --!>
// ErrorCodes.INCORRECTLY_CLOSED_COMMENT

// 嵌套注释
// <!-- outer <!-- inner --> outer -->
// ErrorCodes.NESTED_COMMENT
```

这些错误检测遵循 HTML 规范对注释格式的要求。虽然浏览器可能宽容处理，但编译器会严格检测并警告。

## 注释保留策略

```typescript
// 编译选项
interface CompilerOptions {
  comments?: boolean // 是否保留注释
}

// parseChildren 中的处理
if (context.options.comments) {
  nodes.push(parseComment(context))
} else {
  // 跳过注释，不生成节点
  advanceBy(context, commentEndIndex + 3)
}
```

通过编译选项可以控制是否在输出中保留注释。开发模式通常保留注释便于调试，生产模式可以移除以减小体积。

## 条件注释

```html
<!-- IE 条件注释 -->
<!--[if IE]>
  <p>只在 IE 中显示</p>
<![endif]-->

<!-- 下层显示条件注释 -->
<!--[if !IE]><!-->
  <p>在非 IE 中显示</p>
<!--<![endif]-->
```

Vue 模板编译器将 IE 条件注释视为普通注释处理，因为现代应用通常不需要支持 IE。

## 与代码生成

```typescript
// 注释节点的代码生成
function genComment(node: CommentNode, context: CodegenContext) {
  const { push, helper } = context
  push(`${helper(CREATE_COMMENT)}(${JSON.stringify(node.content)})`, node)
}

// 生成代码
// _createCommentVNode(" hello world ")
```

保留的注释会被转换为运行时的注释节点创建调用。这些注释在渲染时会生成真实的 DOM 注释节点。

## 开发与生产差异

```typescript
// 开发模式
{
  comments: __DEV__
}

// 生产模式通常
{
  comments: false
}
```

默认配置下，开发模式保留注释，生产模式移除。这是一种合理的默认行为，开发时注释有助于调试，生产时移除可以优化性能和减小体积。

## 特殊注释用途

```html
<!-- v-if="false" 的渲染结果 -->
<!--v-if-->

<!-- teleport 禁用时的占位符 -->
<!--teleport start-->
<!--teleport end-->

<!-- suspense 的边界标记 -->
<!--[-->
<!--]-->
```

Vue 内部也使用注释节点作为占位符和边界标记。这些特殊注释帮助运行时识别组件边界和状态。

## 小结

parseComment 处理 HTML 注释的完整解析：

1. **语法解析**：识别注释开始和结束标记
2. **错误检测**：未闭合、格式错误、嵌套注释
3. **可配置性**：通过选项控制是否保留
4. **代码生成**：转换为运行时注释节点

下一章将分析 parseBogusComment 如何处理伪注释和特殊标记。
