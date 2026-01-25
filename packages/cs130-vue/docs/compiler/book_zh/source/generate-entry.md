# generate 代码生成入口

代码生成是编译的最后阶段，将转换后的 AST 转换为可执行的 JavaScript 渲染函数代码。

## 核心实现

```typescript
export function generate(
  ast: RootNode,
  options: CodegenOptions & { onContextCreated?: (context: CodegenContext) => void } = {}
): CodegenResult {
  const context = createCodegenContext(ast, options)
  
  if (options.onContextCreated) {
    options.onContextCreated(context)
  }
  
  const { mode, push, prefixIdentifiers, indent, deindent, newline, scopeId, ssr } = context

  const helpers = Array.from(ast.helpers)
  const hasHelpers = helpers.length > 0
  const useWithBlock = !prefixIdentifiers && mode !== 'module'
  const genScopeId = scopeId != null && mode === 'module'
  const isSetupInlined = !!options.inline

  // 序言
  genFunctionPreamble(ast, context)

  // 函数签名
  const functionName = ssr ? `ssrRender` : `render`
  const args = ssr
    ? ['_ctx', '_push', '_parent', '_attrs']
    : ['_ctx', '_cache']
  
  const signature = args.join(', ')

  if (isSetupInlined) {
    push(`(${signature}) => {`)
  } else {
    push(`function ${functionName}(${signature}) {`)
  }
  indent()

  // with 块
  if (useWithBlock) {
    push(`with (_ctx) {`)
    indent()
    if (hasHelpers) {
      push(`const { ${helpers.map(aliasHelper).join(', ')} } = _Vue`)
      push(`\n`)
      newline()
    }
  }

  // 资源声明
  if (ast.components.length) {
    genAssets(ast.components, 'component', context)
    if (ast.directives.length || ast.temps > 0) {
      newline()
    }
  }
  if (ast.directives.length) {
    genAssets(ast.directives, 'directive', context)
    if (ast.temps > 0) {
      newline()
    }
  }

  // 临时变量
  if (ast.temps > 0) {
    push(`let `)
    for (let i = 0; i < ast.temps; i++) {
      push(`${i > 0 ? `, ` : ``}_temp${i}`)
    }
  }

  if (ast.components.length || ast.directives.length || ast.temps) {
    push(`\n`)
    newline()
  }

  // 生成返回语句
  if (!ssr) {
    push(`return `)
  }
  if (ast.codegenNode) {
    genNode(ast.codegenNode, context)
  } else {
    push(`null`)
  }

  // 关闭
  if (useWithBlock) {
    deindent()
    push(`}`)
  }
  deindent()
  push(`}`)

  return {
    ast,
    code: context.code,
    preamble: isSetupInlined ? '' : context.preamble,
    map: context.map ? context.map.toJSON() : undefined
  }
}
```

## 生成结果结构

```typescript
interface CodegenResult {
  code: string          // 生成的代码
  ast: RootNode         // 原始 AST（可能有修改）
  preamble: string      // 序言代码（导入语句等）
  map?: RawSourceMap    // Source Map
}
```

## 序言生成

```typescript
function genFunctionPreamble(ast: RootNode, context: CodegenContext) {
  const { push, newline, runtimeModuleName, runtimeGlobalName, ssrRuntimeModuleName } = context
  
  const VueBinding = runtimeGlobalName
  const helpers = Array.from(ast.helpers)
  
  if (context.mode === 'module') {
    // ES Module 模式
    if (helpers.length) {
      push(
        `import { ${helpers
          .map(s => `${helperNameMap[s]} as _${helperNameMap[s]}`)
          .join(', ')} } from ${JSON.stringify(runtimeModuleName)}\n`
      )
    }
    
    // 静态提升
    if (ast.hoists.length) {
      push(`\n`)
      for (const h of ast.hoists) {
        push(`const _hoisted_${ast.hoists.indexOf(h) + 1} = `)
        genNode(h, context)
        push(`\n`)
      }
    }
  } else {
    // Function 模式
    push(`const _Vue = ${VueBinding}\n`)
  }
}
```

## 模式区别

```typescript
// Module 模式 - ES Module 输出
import { createVNode as _createVNode } from "vue"

export function render(_ctx, _cache) {
  return _createVNode("div")
}

// Function 模式 - 运行时编译
const _Vue = Vue

return function render(_ctx, _cache) {
  with (_ctx) {
    const { createVNode: _createVNode } = _Vue
    return _createVNode("div")
  }
}
```

Module 模式用于构建工具预编译，Function 模式用于运行时编译。

## with 块

```typescript
// 使用 with 块简化变量访问
with (_ctx) {
  // 可以直接访问 message 而不是 _ctx.message
  return _createVNode("div", null, message)
}

// 不使用 with（module 模式）
return _createVNode("div", null, _ctx.message)
```

with 块在运行时编译中提供便利，但在严格模式下不可用。

## 资源解析

```typescript
function genAssets(
  assets: string[],
  type: 'component' | 'directive',
  context: CodegenContext
) {
  const resolver = type === 'component' ? RESOLVE_COMPONENT : RESOLVE_DIRECTIVE
  
  for (let i = 0; i < assets.length; i++) {
    const id = assets[i]
    const resolvedName = toValidAssetId(id, type)
    
    context.push(
      `const ${resolvedName} = ${context.helper(resolver)}(${JSON.stringify(id)})`
    )
    
    if (i < assets.length - 1) {
      context.newline()
    }
  }
}

// 输出示例
const _component_MyButton = _resolveComponent("MyButton")
const _directive_focus = _resolveDirective("focus")
```

## 静态提升

```typescript
// 序言中的静态提升
const _hoisted_1 = { class: "static" }
const _hoisted_2 = _createElementVNode("span", null, "Static")

// 渲染函数中引用
return _createElementVNode("div", _hoisted_1, [
  _hoisted_2,
  _toDisplayString(dynamic)
])
```

静态提升的节点在序言中创建，渲染函数中直接引用。

## 小结

generate 的职责：

1. **创建上下文**：初始化代码生成所需的状态
2. **生成序言**：导入语句和静态提升
3. **生成函数体**：资源解析、返回语句
4. **模式适配**：支持 Module 和 Function 两种模式
5. **Source Map**：支持生成源码映射

下一章将分析 createCodegenContext 上下文的创建。
