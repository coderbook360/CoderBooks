# 代码生成器的架构设计

经过 Parse 和 Transform 阶段，我们得到了一棵增强的 AST。**最后一步是将这棵 AST 转换为可执行的 JavaScript 代码。**

这就是 Codegen 阶段的工作。**理解代码生成器，你就完整了对 Vue 编译器的理解。** 本章将分析代码生成器的整体架构。

## Codegen 的定位

```
Parse → Transform → Codegen
                      ↓
              CodegenResult {
                code: string,      // 渲染函数代码
                preamble: string,  // 前导声明
                ast: RootNode,     // 处理后的 AST
                map?: RawSourceMap // Source Map
              }
```

输入：经过 Transform 处理的 AST
输出：可执行的 JavaScript 代码字符串

## CodegenContext

代码生成需要维护大量状态，通过 `CodegenContext` 管理：

```javascript
interface CodegenContext {
  // 代码缓冲区
  code: string
  
  // 格式控制
  indentLevel: number
  
  // 源码映射
  source: string
  line: number
  column: number
  map?: SourceMapGenerator
  
  // 运行时辅助
  helper(key: symbol): string
  runtimeModuleName: string
  
  // 编译选项
  mode: 'module' | 'function'
  prefixIdentifiers: boolean
  ssr: boolean
  isTS: boolean
  
  // 核心方法
  push(code: string, node?: CodegenNode): void
  indent(): void
  deindent(withoutNewLine?: boolean): void
  newline(): void
}
```

## 上下文创建

```javascript
function createCodegenContext(ast, options) {
  const context = {
    code: '',
    indentLevel: 0,
    source: ast.source ?? '',
    line: 1,
    column: 1,
    
    push(code, node) {
      context.code += code
      // 更新 Source Map（如果启用）
    },
    
    indent() {
      ++context.indentLevel
      context.newline()
    },
    
    deindent(withoutNewLine = false) {
      --context.indentLevel
      if (!withoutNewLine) {
        context.newline()
      }
    },
    
    newline() {
      context.push('\n' + '  '.repeat(context.indentLevel))
    },
    
    helper(key) {
      return `_${helperNameMap[key]}`
    }
  }
  
  return context
}
```

## generate 函数流程

```javascript
function generate(ast, options = {}) {
  // 1. 创建上下文
  const context = createCodegenContext(ast, options)
  const { mode, push, indent, deindent, newline } = context
  
  // 2. 生成前导代码
  if (mode === 'module') {
    genModulePreamble(ast, context)
  } else {
    genFunctionPreamble(ast, context)
  }
  
  // 3. 生成函数签名
  const functionName = options.ssr ? 'ssrRender' : 'render'
  const args = options.ssr
    ? ['_ctx', '_push', '_parent', '_attrs']
    : ['_ctx', '_cache']
  
  push(`function ${functionName}(${args.join(', ')}) {`)
  indent()
  
  // 4. 生成组件/指令解析
  if (ast.components.length) {
    genAssets(ast.components, 'component', context)
  }
  if (ast.directives.length) {
    genAssets(ast.directives, 'directive', context)
  }
  
  // 5. 生成 return 语句
  push('return ')
  if (ast.codegenNode) {
    genNode(ast.codegenNode, context)
  } else {
    push('null')
  }
  
  // 6. 结束函数
  deindent()
  push('}')
  
  return {
    code: context.code,
    preamble: '',
    ast,
    map: context.map?.toJSON()
  }
}
```

## 两种代码模式

### module 模式

用于 SFC 编译，输出 ES Module：

```javascript
import { createElementVNode, toDisplayString } from "vue"

export function render(_ctx, _cache) {
  return createElementVNode("div", null, toDisplayString(_ctx.msg))
}
```

### function 模式

用于运行时编译，输出普通函数：

```javascript
const { createElementVNode, toDisplayString } = Vue

return function render(_ctx, _cache) {
  return createElementVNode("div", null, toDisplayString(_ctx.msg))
}
```

## 缩进管理

缩进让生成的代码可读：

```javascript
function render(_ctx, _cache) {
  return (_openBlock(), _createElementBlock("div", null, [
    _createElementVNode("span", null, "Hello"),
    _createElementVNode("span", null, _toDisplayString(_ctx.msg))
  ]))
}
```

通过 `indent()`、`deindent()`、`newline()` 控制：

```javascript
push('function render(_ctx, _cache) {')
indent()  // +1
push('return (')
indent()  // +2
// ... 生成内容
deindent()  // +1
push(')')
deindent()  // +0
push('}')
```

## 代码拼接

`push` 是最基础的操作：

```javascript
push('function ')
push('render')
push('(')
push('_ctx, _cache')
push(')')
push(' {')
// 结果：function render(_ctx, _cache) {
```

配合 `genNode` 递归调用，逐步构建完整代码。

## 生成结果

一个完整的编译输出：

```javascript
// 前导代码（preamble）
import { 
  createElementVNode as _createElementVNode,
  toDisplayString as _toDisplayString,
  openBlock as _openBlock,
  createElementBlock as _createElementBlock
} from "vue"

// 静态提升
const _hoisted_1 = { class: "container" }

// 渲染函数
export function render(_ctx, _cache) {
  return (_openBlock(), _createElementBlock("div", _hoisted_1, [
    _createElementVNode("p", null, _toDisplayString(_ctx.msg), 1 /* TEXT */)
  ]))
}
```

## 本章小结

本章分析了代码生成器的架构：

- **CodegenContext**：维护生成状态和方法
- **generate 流程**：前导代码 → 函数签名 → 资源解析 → 返回语句
- **两种模式**：module 和 function
- **格式控制**：缩进、换行、代码拼接

架构理解后，下一章我们将分析具体的 render 函数代码生成。
