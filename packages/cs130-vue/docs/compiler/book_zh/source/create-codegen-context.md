# createCodegenContext 上下文

代码生成上下文维护了生成过程中的所有状态，包括代码缓冲区、缩进、帮助函数等。

## 上下文结构

```typescript
export interface CodegenContext
  extends Omit<Required<CodegenOptions>, 'bindingMetadata' | 'inline'> {
  source: string
  code: string
  line: number
  column: number
  offset: number
  indentLevel: number
  pure: boolean
  map?: SourceMapGenerator
  helper(key: symbol): string
  push(code: string, node?: CodegenNode): void
  indent(): void
  deindent(withoutNewLine?: boolean): void
  newline(): void
}
```

## 创建函数

```typescript
function createCodegenContext(
  ast: RootNode,
  {
    mode = 'function',
    prefixIdentifiers = mode === 'module',
    sourceMap = false,
    filename = `template.vue.html`,
    scopeId = null,
    optimizeImports = false,
    runtimeGlobalName = `Vue`,
    runtimeModuleName = `vue`,
    ssrRuntimeModuleName = `vue/server-renderer`,
    ssr = false,
    isTS = false,
    inSSR = false
  }: CodegenOptions
): CodegenContext {
  const context: CodegenContext = {
    mode,
    prefixIdentifiers,
    sourceMap,
    filename,
    scopeId,
    optimizeImports,
    runtimeGlobalName,
    runtimeModuleName,
    ssrRuntimeModuleName,
    ssr,
    isTS,
    inSSR,
    source: ast.loc.source,
    code: ``,
    column: 1,
    line: 1,
    offset: 0,
    indentLevel: 0,
    pure: false,
    map: undefined,
    
    helper(key) {
      return `_${helperNameMap[key]}`
    },
    
    push(code, node) {
      context.code += code
      if (context.map) {
        if (node) {
          addMapping(node.loc.start, context)
        }
        advancePositionWithMutation(context, code)
        if (node) {
          addMapping(node.loc.end, context)
        }
      }
    },
    
    indent() {
      newline(++context.indentLevel)
    },
    
    deindent(withoutNewLine = false) {
      if (withoutNewLine) {
        --context.indentLevel
      } else {
        newline(--context.indentLevel)
      }
    },
    
    newline() {
      newline(context.indentLevel)
    }
  }

  function newline(n: number) {
    context.push('\n' + `  `.repeat(n))
  }

  if (sourceMap) {
    context.map = new SourceMapGenerator()
    context.map.setSourceContent(filename, context.source)
  }

  return context
}
```

## 代码输出

```typescript
// push 方法追加代码
context.push(`function render(_ctx) {`)
context.push(`return `)
context.push(`_createVNode("div")`)
context.push(`}`)

// 结果
context.code === `function render(_ctx) {return _createVNode("div")}`
```

push 是最基础的输出方法，所有代码都通过它写入缓冲区。

## 缩进管理

```typescript
// indent 增加缩进
context.push(`function render() {`)
context.indent()
context.push(`return null`)
context.deindent()
context.push(`}`)

// 输出
function render() {
  return null
}
```

缩进通过 indentLevel 计数器控制，每级缩进两个空格。

## 帮助函数

```typescript
export const helperNameMap: Record<symbol, string> = {
  [FRAGMENT]: `Fragment`,
  [TELEPORT]: `Teleport`,
  [SUSPENSE]: `Suspense`,
  [KEEP_ALIVE]: `KeepAlive`,
  [BASE_TRANSITION]: `BaseTransition`,
  [OPEN_BLOCK]: `openBlock`,
  [CREATE_BLOCK]: `createBlock`,
  [CREATE_ELEMENT_BLOCK]: `createElementBlock`,
  [CREATE_VNODE]: `createVNode`,
  [CREATE_ELEMENT_VNODE]: `createElementVNode`,
  [CREATE_COMMENT]: `createCommentVNode`,
  [CREATE_TEXT]: `createTextVNode`,
  [CREATE_STATIC]: `createStaticVNode`,
  [RESOLVE_COMPONENT]: `resolveComponent`,
  [RESOLVE_DYNAMIC_COMPONENT]: `resolveDynamicComponent`,
  [RESOLVE_DIRECTIVE]: `resolveDirective`,
  [RESOLVE_FILTER]: `resolveFilter`,
  [WITH_DIRECTIVES]: `withDirectives`,
  [RENDER_LIST]: `renderList`,
  [RENDER_SLOT]: `renderSlot`,
  [TO_DISPLAY_STRING]: `toDisplayString`,
  [MERGE_PROPS]: `mergeProps`,
  [NORMALIZE_CLASS]: `normalizeClass`,
  [NORMALIZE_STYLE]: `normalizeStyle`,
  [NORMALIZE_PROPS]: `normalizeProps`,
  [TO_HANDLERS]: `toHandlers`,
  [SET_BLOCK_TRACKING]: `setBlockTracking`,
  [WITH_CTX]: `withCtx`,
  [WITH_MEMO]: `withMemo`
}

// 使用
context.helper(CREATE_VNODE)  // 返回 "_createVNode"
```

## Source Map 支持

```typescript
function addMapping(loc: Position, context: CodegenContext) {
  context.map!.addMapping({
    name: undefined,
    source: context.filename,
    original: {
      line: loc.line,
      column: loc.column - 1  // source-map 使用 0-based
    },
    generated: {
      line: context.line,
      column: context.column - 1
    }
  })
}

function advancePositionWithMutation(
  context: CodegenContext,
  code: string
) {
  let lastNewLinePos = -1
  for (let i = 0; i < code.length; i++) {
    if (code.charCodeAt(i) === 10 /* newline */) {
      context.line++
      lastNewLinePos = i
    }
  }
  context.column =
    lastNewLinePos === -1
      ? context.column + code.length
      : code.length - lastNewLinePos
}
```

Source Map 记录生成代码与源码的对应关系，便于调试。

## 模式配置

```typescript
// Module 模式
{
  mode: 'module',
  prefixIdentifiers: true,
  // 生成 ES Module 代码
  // import { createVNode } from 'vue'
}

// Function 模式
{
  mode: 'function',
  prefixIdentifiers: false,
  // 生成运行时编译代码
  // const _Vue = Vue
  // with (_ctx) { ... }
}
```

## 作用域 ID

```typescript
// SFC 作用域样式
{
  scopeId: 'data-v-f3f3eg9'
}

// 生成代码会添加作用域
_createElementVNode("div", { "data-v-f3f3eg9": "" })
```

作用域 ID 用于实现 Scoped CSS。

## pure 标记

```typescript
// pure 标记用于 Tree Shaking
context.pure = true
context.push(`/*#__PURE__*/`)
context.push(`_createVNode(...)`)
context.pure = false

// 输出
/*#__PURE__*/_createVNode(...)
```

打包工具可以根据这个注释移除未使用的代码。

## 小结

CodegenContext 的设计：

1. **代码缓冲**：通过 push 累积生成的代码
2. **格式控制**：indent/deindent/newline 管理缩进
3. **帮助函数**：helper 方法获取运行时函数名
4. **位置追踪**：为 Source Map 提供位置信息
5. **配置管理**：支持多种输出模式

下一章将分析 genNode 节点生成的实现。
