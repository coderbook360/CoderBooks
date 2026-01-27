# 错误处理与错误码

Vue 编译器有完善的错误处理系统。它定义了详细的错误码，提供精确的位置信息，支持自定义错误处理策略。好的错误信息让开发者能快速定位和修复问题。

## 错误类型定义

```typescript
export interface CompilerError extends SyntaxError {
  code: number | string
  loc?: SourceLocation
}

export interface CoreCompilerError extends CompilerError {
  code: ErrorCodes
}
```

每个错误包含错误码和可选的位置信息。位置信息指向源码中出问题的地方。

## 错误码枚举

Vue 编译器定义了详细的错误码：

```typescript
export const enum ErrorCodes {
  // 解析错误
  ABRUPT_CLOSING_OF_EMPTY_COMMENT,
  CDATA_IN_HTML_CONTENT,
  DUPLICATE_ATTRIBUTE,
  END_TAG_WITH_ATTRIBUTES,
  END_TAG_WITH_TRAILING_SOLIDUS,
  EOF_BEFORE_TAG_NAME,
  EOF_IN_CDATA,
  EOF_IN_COMMENT,
  EOF_IN_SCRIPT_HTML_COMMENT_LIKE_TEXT,
  EOF_IN_TAG,
  INCORRECTLY_CLOSED_COMMENT,
  INCORRECTLY_OPENED_COMMENT,
  INVALID_FIRST_CHARACTER_OF_TAG_NAME,
  MISSING_ATTRIBUTE_VALUE,
  MISSING_END_TAG_NAME,
  MISSING_WHITESPACE_BETWEEN_ATTRIBUTES,
  NESTED_COMMENT,
  UNEXPECTED_CHARACTER_IN_ATTRIBUTE_NAME,
  UNEXPECTED_CHARACTER_IN_UNQUOTED_ATTRIBUTE_VALUE,
  UNEXPECTED_EQUALS_SIGN_BEFORE_ATTRIBUTE_NAME,
  UNEXPECTED_NULL_CHARACTER,
  UNEXPECTED_QUESTION_MARK_INSTEAD_OF_TAG_NAME,
  UNEXPECTED_SOLIDUS_IN_TAG,

  // 表达式错误
  X_INVALID_EXPRESSION,
  
  // 指令错误
  X_V_IF_NO_EXPRESSION,
  X_V_IF_SAME_KEY,
  X_V_ELSE_NO_ADJACENT_IF,
  X_V_FOR_NO_EXPRESSION,
  X_V_FOR_MALFORMED_EXPRESSION,
  X_V_FOR_TEMPLATE_KEY_PLACEMENT,
  X_V_BIND_NO_EXPRESSION,
  X_V_ON_NO_EXPRESSION,
  X_V_SLOT_UNEXPECTED_DIRECTIVE_ON_SLOT_OUTLET,
  X_V_SLOT_MIXED_SLOT_USAGE,
  X_V_SLOT_DUPLICATE_SLOT_NAMES,
  X_V_SLOT_EXTRANEOUS_DEFAULT_SLOT_CHILDREN,
  X_V_SLOT_MISPLACED,
  X_V_MODEL_NO_EXPRESSION,
  X_V_MODEL_MALFORMED_EXPRESSION,
  X_V_MODEL_ON_SCOPE_VARIABLE,
  X_V_MODEL_ON_PROPS,
  X_INVALID_EXPRESSION,
  X_KEEP_ALIVE_INVALID_CHILDREN,
  
  // 选项错误
  X_PREFIX_ID_NOT_SUPPORTED,
  X_MODULE_MODE_NOT_SUPPORTED,
  X_CACHE_HANDLER_NOT_SUPPORTED,
  X_SCOPE_ID_NOT_SUPPORTED,
  
  // __EXTEND_POINT__ 用于扩展
}
```

错误码命名有规律：以 X_ 开头的是语义错误（转换阶段），其他是语法错误（解析阶段）。

## 错误消息映射

每个错误码对应一条消息：

```typescript
export const errorMessages: Record<ErrorCodes, string> = {
  [ErrorCodes.ABRUPT_CLOSING_OF_EMPTY_COMMENT]: 'Illegal comment.',
  [ErrorCodes.CDATA_IN_HTML_CONTENT]:
    'CDATA section is allowed only in XML context.',
  [ErrorCodes.DUPLICATE_ATTRIBUTE]: 'Duplicate attribute.',
  // ...
  [ErrorCodes.X_V_IF_NO_EXPRESSION]: `v-if/v-else-if is missing expression.`,
  [ErrorCodes.X_V_ELSE_NO_ADJACENT_IF]: 
    `v-else/v-else-if has no adjacent v-if or v-else-if.`,
  [ErrorCodes.X_V_FOR_NO_EXPRESSION]: `v-for is missing expression.`,
  [ErrorCodes.X_V_FOR_MALFORMED_EXPRESSION]: `v-for has invalid expression.`,
  // ...
}
```

消息简洁明了，指出问题所在。

## 创建错误

```typescript
export function createCompilerError<T extends number>(
  code: T,
  loc?: SourceLocation,
  messages?: { [code: number]: string },
  additionalMessage?: string
): CompilerError {
  const msg =
    __DEV__ || !__BROWSER__
      ? (messages || errorMessages)[code] + (additionalMessage || '')
      : code
  const error = new SyntaxError(String(msg)) as CompilerError
  error.code = code
  error.loc = loc
  return error
}
```

开发环境使用完整消息，生产环境只保留错误码（减小体积）。

## 报告错误

解析器和转换器通过 context 的 onError 报告错误：

```typescript
// 解析器中
function emitError(context, code, offset) {
  const loc = getCursor(context)
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

// 转换器中
function createTransformContext(root, options) {
  const context = {
    onError(error) {
      options.onError?.(error) ?? defaultOnError(error)
    },
    // ...
  }
  return context
}
```

位置信息包含 start 和 end，对于点错误两者相同。

## 默认错误处理

```typescript
function defaultOnError(error: CompilerError): never {
  throw error
}

function defaultOnWarn(warning: CompilerError) {
  if (__DEV__) {
    console.warn(`[Vue warn] ${warning.message}`)
  }
}
```

默认行为是抛出错误异常。警告只在开发环境输出控制台。

## 自定义错误处理

可以收集所有错误而不中断编译：

```typescript
const errors: CompilerError[] = []
const warnings: CompilerError[] = []

const result = compile(template, {
  onError: (error) => {
    errors.push(error)
  },
  onWarn: (warning) => {
    warnings.push(warning)
  }
})

if (errors.length) {
  errors.forEach(e => {
    console.error(`Error at ${e.loc?.start.line}:${e.loc?.start.column}`)
    console.error(e.message)
  })
}
```

这在批量编译或 IDE 集成中很有用。

## 位置信息的精确性

位置信息尽可能精确：

```typescript
interface SourceLocation {
  start: Position
  end: Position
  source: string  // 对应的源码片段
}

interface Position {
  offset: number  // 从开始的字符偏移
  line: number    // 行号（1-based）
  column: number  // 列号（1-based）
}
```

source 字段包含出错的源码片段，帮助用户理解问题。

## 错误恢复

编译器在某些错误后会尝试恢复继续解析：

```typescript
function parseElement(context, ancestors) {
  const element = parseTag(context, TagType.Start, ancestors)
  
  if (element.isSelfClosing || context.options.isVoidTag?.(element.tag)) {
    return element
  }
  
  // 解析子内容
  element.children = parseChildren(context, mode, ancestors)
  
  // 检查闭合标签
  if (startsWithEndTagOpen(context.source, element.tag)) {
    parseTag(context, TagType.End, ancestors)
  } else {
    // 缺少闭合标签，报告错误但继续
    emitError(context, ErrorCodes.X_MISSING_END_TAG, 0, element.loc.start)
    if (context.source.length === 0 && element.tag.toLowerCase() === 'script') {
      // 特殊处理
    }
  }
  
  return element
}
```

缺少闭合标签时报告错误，但元素节点仍然被创建，编译可以继续。

## DOM 平台特有错误

compiler-dom 扩展了错误码：

```typescript
export const enum DOMErrorCodes {
  X_V_HTML_NO_EXPRESSION = ErrorCodes.__EXTEND_POINT__,
  X_V_HTML_WITH_CHILDREN,
  X_V_TEXT_NO_EXPRESSION,
  X_V_TEXT_WITH_CHILDREN,
  X_V_MODEL_ON_INVALID_ELEMENT,
  X_V_MODEL_ARG_ON_ELEMENT,
  X_V_MODEL_ON_FILE_INPUT_ELEMENT,
  X_V_SHOW_NO_EXPRESSION,
  // ...
}
```

这些针对 DOM 特有的指令和用法。

## 错误信息的国际化

错误消息目前只有英文。社区提供了一些国际化方案，但官方暂未内置。

开发者可以通过 onError 回调进行消息转换：

```typescript
const errorMessagesZh = {
  [ErrorCodes.X_V_IF_NO_EXPRESSION]: 'v-if/v-else-if 缺少表达式',
  // ...
}

compile(template, {
  onError: (error) => {
    const message = errorMessagesZh[error.code] || error.message
    console.error(`[编译错误] ${message}`)
  }
})
```

## 小结

Vue 编译器的错误处理系统包含详细的错误码、精确的位置信息、可自定义的错误回调。错误分为解析错误（语法问题）和转换错误（语义问题）。编译器在某些错误后会尝试恢复继续，尽可能多地报告问题。良好的错误信息是开发体验的重要组成部分，Vue 编译器在这方面下了很多功夫。
