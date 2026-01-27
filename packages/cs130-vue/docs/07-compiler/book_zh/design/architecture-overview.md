# 架构总览

Vue 编译器是一个精心设计的多阶段系统。从模板字符串到可执行的渲染函数，代码经过解析、转换、代码生成三个主要阶段。本章提供编译器架构的全景视图，帮助在深入源码之前建立整体认识。

## 核心包结构

Vue 编译器分布在多个包中：

@vue/compiler-core 是平台无关的核心，包含解析器、转换器、代码生成器的基础实现。它不关心编译目标是浏览器 DOM 还是其他平台。

@vue/compiler-dom 是浏览器 DOM 平台的编译器，扩展了 core，添加了 DOM 特定的转换（如 v-html、v-model 在不同元素上的处理）。

@vue/compiler-sfc 处理单文件组件，协调模板编译、脚本编译、样式编译。

@vue/compiler-ssr 处理服务端渲染的代码生成。

这种分层设计让核心逻辑可复用，平台特定逻辑独立。

## 编译流程

从入口到输出的完整流程：

```
模板字符串
    ↓
  parse（解析）
    ↓
   AST
    ↓
 transform（转换）
    ↓
  增强的 AST
    ↓
 generate（生成）
    ↓
渲染函数代码
```

每个阶段职责清晰：parse 负责语法分析，transform 负责语义分析和优化，generate 负责输出代码。

## 解析阶段

解析器将模板字符串转换为 AST：

```typescript
function baseParse(content: string, options: ParserOptions): RootNode {
  const context = createParserContext(content, options)
  const start = getCursor(context)
  return createRoot(
    parseChildren(context, TextModes.DATA, []),
    getSelection(context, start)
  )
}
```

解析过程是递归下降的。parseChildren 识别不同类型的内容（元素、插值、文本、注释），调用相应的解析函数。

解析结果是纯粹的语法树，反映模板的结构但不包含语义信息。

## 转换阶段

转换阶段遍历 AST，应用一系列转换插件：

```typescript
function transform(root: RootNode, options: TransformOptions) {
  const context = createTransformContext(root, options)
  traverseNode(root, context)
  
  if (options.hoistStatic) {
    hoistStatic(root, context)
  }
  
  if (!options.ssr) {
    createRootCodegen(root, context)
  }
  
  root.helpers = [...context.helpers]
  root.components = [...context.components]
  root.directives = [...context.directives]
}
```

转换插件处理特定类型的节点或指令。transformElement 处理元素、transformIf 处理 v-if、transformFor 处理 v-for。

转换后的 AST 携带了代码生成所需的全部信息，包括 codegenNode、patchFlag、静态提升列表等。

## 转换插件架构

转换使用访问者模式。每个插件是一个函数，接收节点和上下文，返回可选的退出回调：

```typescript
type NodeTransform = (
  node: RootNode | TemplateChildNode,
  context: TransformContext
) => void | (() => void) | (() => void)[]
```

插件在进入节点时被调用。如果返回函数，该函数在所有子节点处理完后调用（退出阶段）。

这允许插件做两种事情：在进入时修改节点结构（如 v-if 重组）；在退出时根据子节点信息生成代码（如元素的 codegenNode）。

## 代码生成阶段

代码生成器遍历增强的 AST，输出 JavaScript 代码：

```typescript
function generate(ast: RootNode, options: CodegenOptions): CodegenResult {
  const context = createCodegenContext(ast, options)
  
  // 生成 import
  genFunctionPreamble(ast, context)
  
  // 生成渲染函数
  const functionName = 'render'
  push(`function ${functionName}(_ctx, _cache) {`)
  
  // 生成函数体
  if (ast.codegenNode) {
    genNode(ast.codegenNode, context)
  }
  
  push(`}`)
  
  return {
    code: context.code,
    map: context.map
  }
}
```

genNode 根据节点类型调用不同的生成函数。最终产生可执行的渲染函数代码字符串。

## 上下文对象

每个阶段都有对应的上下文对象，携带阶段所需的状态和方法：

ParserContext 包含源码字符串、当前位置、解析选项。

TransformContext 包含当前节点、父节点、转换插件列表、helpers 集合。

CodegenContext 包含输出代码、缩进级别、source map 生成器。

上下文让各个函数可以共享状态，避免大量参数传递。

## 编译选项

编译行为可以通过选项定制：

```typescript
interface CompilerOptions {
  // 解析选项
  isNativeTag?: (tag: string) => boolean
  isCustomElement?: (tag: string) => boolean
  
  // 转换选项
  nodeTransforms?: NodeTransform[]
  directiveTransforms?: Record<string, DirectiveTransform>
  hoistStatic?: boolean
  cacheHandlers?: boolean
  
  // 代码生成选项
  mode?: 'module' | 'function'
  prefixIdentifiers?: boolean
  sourceMap?: boolean
  
  // 错误处理
  onError?: (error: CompilerError) => void
  onWarn?: (warning: CompilerError) => void
}
```

这些选项让编译器可以适应不同的使用场景：浏览器运行时编译、构建时预编译、SSR、测试等。

## 错误处理

编译错误通过 onError 回调报告：

```typescript
function emitError(context, code, loc) {
  context.options.onError(
    createCompilerError(code, loc, ErrorMessages)
  )
}
```

错误包含错误码、位置信息、描述信息。默认行为是抛出异常，但可以通过 onError 自定义处理。

## 与运行时的接口

编译器生成的代码依赖运行时提供的辅助函数。这些函数通过 helpers 系统管理：

```typescript
// 编译器记录需要的 helpers
context.helper(CREATE_VNODE)
context.helper(TO_DISPLAY_STRING)

// 代码生成时导入
const helpers = ast.helpers
const imports = helpers.map(h => `${helperNameMap[h]} as _${helperNameMap[h]}`)
code += `import { ${imports.join(', ')} } from 'vue'\n`
```

运行时导出这些辅助函数，编译器生成的代码调用它们。

## SFC 编译集成

单文件组件的编译协调多个子编译器：

```typescript
function compileSFC(source: string, options) {
  // 解析 SFC 结构
  const descriptor = parse(source)
  
  // 编译 script（可能含 setup）
  const script = compileScript(descriptor, options)
  
  // 编译 template，使用 script 的绑定信息
  const template = compileTemplate({
    source: descriptor.template.content,
    compilerOptions: {
      bindingMetadata: script.bindings
    }
  })
  
  // 编译 styles
  const styles = descriptor.styles.map(style => 
    compileStyle(style, options)
  )
  
  // 组装最终模块
  return assemble(script, template, styles)
}
```

这种协调让不同块的编译可以共享信息（如 script 的绑定信息传给 template 编译）。

## 小结

Vue 编译器是一个三阶段管道：解析产生 AST，转换增强 AST，代码生成输出渲染函数。分层的包结构（core、dom、sfc、ssr）让逻辑清晰可复用。插件化的转换架构让功能易于扩展。上下文对象串联各个阶段，编译选项提供灵活性。理解这个架构是深入源码的基础，后续章节将逐一展开每个部分的实现细节。
