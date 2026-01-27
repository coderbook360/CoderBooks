# baseCompile 核心流程

baseCompile 是 Vue 编译器的核心函数，定义在 @vue/compiler-core 中。它实现了平台无关的编译逻辑，将模板转换为渲染函数代码。

## 函数实现

```typescript
export function baseCompile(
  template: string | RootNode,
  options: CompilerOptions = {}
): CodegenResult {
  const onError = options.onError || defaultOnError
  const isModuleMode = options.mode === 'module'

  if (__BROWSER__) {
    if (options.prefixIdentifiers === true) {
      onError(createCompilerError(ErrorCodes.X_PREFIX_ID_NOT_SUPPORTED))
    } else if (isModuleMode) {
      onError(createCompilerError(ErrorCodes.X_MODULE_MODE_NOT_SUPPORTED))
    }
  }

  const prefixIdentifiers =
    !__BROWSER__ && (options.prefixIdentifiers === true || isModuleMode)

  if (!prefixIdentifiers && options.cacheHandlers) {
    onError(createCompilerError(ErrorCodes.X_CACHE_HANDLER_NOT_SUPPORTED))
  }
  if (options.scopeId && !isModuleMode) {
    onError(createCompilerError(ErrorCodes.X_SCOPE_ID_NOT_SUPPORTED))
  }

  // 1. 解析
  const ast = isString(template) ? baseParse(template, options) : template

  // 2. 获取转换预设
  const [nodeTransforms, directiveTransforms] = getBaseTransformPreset(
    prefixIdentifiers
  )

  // 3. 转换
  transform(
    ast,
    extend({}, options, {
      prefixIdentifiers,
      nodeTransforms: [
        ...nodeTransforms,
        ...(options.nodeTransforms || [])
      ],
      directiveTransforms: extend(
        {},
        directiveTransforms,
        options.directiveTransforms || {}
      )
    })
  )

  // 4. 代码生成
  return generate(
    ast,
    extend({}, options, {
      prefixIdentifiers
    })
  )
}
```

## 选项预处理

函数开始处理选项的兼容性：

```typescript
const onError = options.onError || defaultOnError
const isModuleMode = options.mode === 'module'
```

浏览器环境有一些限制。prefixIdentifiers 在浏览器中不支持，因为它依赖 Babel 等工具解析表达式。模块模式也不支持，因为浏览器运行时编译需要生成函数体而非 ES 模块。

```typescript
if (__BROWSER__) {
  if (options.prefixIdentifiers === true) {
    onError(createCompilerError(ErrorCodes.X_PREFIX_ID_NOT_SUPPORTED))
  } else if (isModuleMode) {
    onError(createCompilerError(ErrorCodes.X_MODULE_MODE_NOT_SUPPORTED))
  }
}
```

这些检查确保在不支持的环境下给出明确错误。

## prefixIdentifiers 的作用

prefixIdentifiers 控制表达式中的标识符是否前缀化：

```javascript
// prefixIdentifiers: false
_ctx.msg

// prefixIdentifiers: true  
// 表达式被解析，识别出 msg 是绑定的变量
_ctx.msg
```

启用时，编译器会解析表达式，识别其中的变量引用，生成正确的访问代码。这需要 JavaScript 解析器（如 @babel/parser），所以浏览器环境不支持。

构建时编译启用这个选项，可以实现更精确的绑定分析和更好的压缩效果。

## 阶段一：解析

```typescript
const ast = isString(template) ? baseParse(template, options) : template
```

如果 template 是字符串，调用 baseParse 解析成 AST。如果已经是 AST（由外部预解析），直接使用。

这种设计允许解析和后续阶段分离，在某些场景下可以复用解析结果。

## 阶段二：获取转换预设

```typescript
const [nodeTransforms, directiveTransforms] = getBaseTransformPreset(
  prefixIdentifiers
)
```

getBaseTransformPreset 返回默认的转换插件：

```typescript
export function getBaseTransformPreset(
  prefixIdentifiers?: boolean
): TransformPreset {
  return [
    [
      transformOnce,
      transformIf,
      transformMemo,
      transformFor,
      ...(!__BROWSER__ && prefixIdentifiers
        ? [trackVForSlotScopes, transformExpression]
        : []),
      transformSlotOutlet,
      transformElement,
      trackSlotScopes,
      transformText
    ],
    {
      on: transformOn,
      bind: transformBind,
      model: transformModel
    }
  ]
}
```

nodeTransforms 按顺序应用于每个节点。顺序很重要：transformIf 必须在 transformFor 之前（处理 v-if 优先级）；transformElement 在大多数其他转换之后（需要收集子节点信息）。

directiveTransforms 是一个映射，在 transformElement 处理元素时按指令名调用。

## 阶段三：转换

```typescript
transform(
  ast,
  extend({}, options, {
    prefixIdentifiers,
    nodeTransforms: [
      ...nodeTransforms,
      ...(options.nodeTransforms || [])
    ],
    directiveTransforms: extend(
      {},
      directiveTransforms,
      options.directiveTransforms || {}
    )
  })
)
```

转换阶段遍历 AST，应用所有转换插件。用户提供的自定义转换被合并到默认转换之后。

转换后的 AST 携带了代码生成所需的全部信息：每个节点的 codegenNode 描述如何生成代码；helpers 集合记录需要导入的运行时函数；hoists 列表包含被提升的静态节点。

## 阶段四：代码生成

```typescript
return generate(
  ast,
  extend({}, options, {
    prefixIdentifiers
  })
)
```

generate 遍历增强的 AST，输出 JavaScript 代码字符串。返回的 CodegenResult 包含：

```typescript
interface CodegenResult {
  code: string         // 完整的代码
  preamble: string     // 前导部分（import 语句）
  ast: RootNode        // 转换后的 AST
  map?: RawSourceMap   // Source Map
}
```

## 错误处理流程

错误在各个阶段产生，通过 onError 回调统一处理：

```typescript
const onError = options.onError || defaultOnError

function defaultOnError(error: CompilerError) {
  throw error
}
```

CompilerError 包含错误码、位置、消息等信息。解析错误在 baseParse 中产生，转换错误在各个转换插件中产生，生成错误较少见。

## 与平台特定编译器的关系

@vue/compiler-dom 的 compile 包装了 baseCompile：

```typescript
export function compile(template, options = {}) {
  return baseCompile(
    template,
    extend({}, parserOptions, options, {
      nodeTransforms: [...DOMNodeTransforms, ...options.nodeTransforms],
      directiveTransforms: extend({}, DOMDirectiveTransforms, options.directiveTransforms),
      transformHoist: stringifyStatic
    })
  )
}
```

DOM 平台添加了特定的解析选项（如识别 HTML 元素）、特定的转换插件（如 v-html、v-model 的 DOM 行为）、静态节点字符串化优化。

SSR 编译器类似，添加 SSR 特定的处理。

## 小结

baseCompile 是 Vue 编译的核心，清晰地实现了三阶段管道：baseParse 解析产生 AST，transform 增强 AST，generate 输出代码。选项预处理确保各种配置的正确性和兼容性。平台特定编译器通过包装 baseCompile 并添加特定转换来实现。这种分层设计让核心逻辑保持简洁，同时支持多平台扩展。
