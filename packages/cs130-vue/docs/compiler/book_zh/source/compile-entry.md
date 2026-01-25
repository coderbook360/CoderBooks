# compile 编译入口

compile 函数是 Vue 编译器的顶层入口。它接收模板字符串和选项，返回编译结果。理解这个入口函数有助于把握编译器的整体流程。

## 函数签名

编译器导出的主要函数：

```typescript
export function compile(
  template: string,
  options: CompilerOptions = {}
): CodegenResult {
  return baseCompile(
    template,
    extend({}, parserOptions, options, {
      nodeTransforms: [
        ...DOMNodeTransforms,
        ...(options.nodeTransforms || [])
      ],
      directiveTransforms: extend(
        {},
        DOMDirectiveTransforms,
        options.directiveTransforms || {}
      ),
      transformHoist: __BROWSER__ ? null : stringifyStatic
    })
  )
}
```

这是 @vue/compiler-dom 导出的 compile，它包装了 baseCompile 并添加 DOM 特定的转换。

## baseCompile 核心流程

@vue/compiler-core 导出的 baseCompile 是真正的编译核心：

```typescript
export function baseCompile(
  template: string | RootNode,
  options: CompilerOptions = {}
): CodegenResult {
  const onError = options.onError || defaultOnError
  const isModuleMode = options.mode === 'module'

  // 1. 解析阶段
  const ast = isString(template) 
    ? baseParse(template, options) 
    : template

  // 2. 获取转换插件
  const [nodeTransforms, directiveTransforms] = getBaseTransformPreset(
    options.prefixIdentifiers
  )

  // 3. 转换阶段
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

  // 4. 代码生成阶段
  return generate(
    ast,
    extend({}, options, {
      prefixIdentifiers
    })
  )
}
```

三个阶段清晰可见：baseParse 解析、transform 转换、generate 生成。

## 输入参数

template 可以是字符串或已解析的 AST。如果传入 AST，跳过解析阶段。这允许在某些场景下复用解析结果。

options 包含多种配置：

```typescript
interface CompilerOptions {
  // 模式
  mode?: 'module' | 'function'  // 模块模式或函数模式
  
  // 标识符处理
  prefixIdentifiers?: boolean    // 是否前缀化标识符
  
  // 优化选项
  hoistStatic?: boolean          // 静态提升
  cacheHandlers?: boolean        // 缓存事件处理器
  
  // 自定义转换
  nodeTransforms?: NodeTransform[]
  directiveTransforms?: Record<string, DirectiveTransform>
  
  // 错误处理
  onError?: (error: CompilerError) => void
  onWarn?: (warning: CompilerError) => void
  
  // Source Map
  sourceMap?: boolean
  filename?: string
}
```

## 模块模式 vs 函数模式

mode 选项决定生成代码的形式：

模块模式（'module'）生成 ES 模块代码：

```javascript
import { createVNode as _createVNode } from 'vue'

export function render(_ctx, _cache) {
  return _createVNode('div', null, 'Hello')
}
```

函数模式（'function'）生成函数体代码，用于运行时编译：

```javascript
const { createVNode: _createVNode } = Vue

return function render(_ctx, _cache) {
  return _createVNode('div', null, 'Hello')
}
```

构建工具使用模块模式，浏览器运行时编译使用函数模式。

## 返回值结构

compile 返回 CodegenResult：

```typescript
interface CodegenResult {
  code: string           // 生成的代码字符串
  preamble: string       // 前导代码（模块模式下的 import）
  ast: RootNode          // 增强后的 AST
  map?: RawSourceMap     // Source Map
}
```

code 是可执行的渲染函数代码。ast 包含转换后的完整信息，可用于进一步分析。

## 默认转换插件

getBaseTransformPreset 返回默认的转换插件集：

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

nodeTransforms 按顺序应用于所有节点。directiveTransforms 在 transformElement 中按指令名调用。

## 错误处理

编译错误通过 onError 回调报告：

```typescript
const onError = options.onError || defaultOnError

function defaultOnError(error: CompilerError) {
  throw error
}
```

默认行为是抛出异常。可以自定义处理，比如收集所有错误后统一报告：

```typescript
const errors: CompilerError[] = []

compile(template, {
  onError: err => errors.push(err)
})

if (errors.length) {
  console.error('Compilation errors:', errors)
}
```

## 与 SFC 编译的关系

SFC 编译（compileTemplate）内部调用 compile：

```typescript
export function compileTemplate(options) {
  const { source, filename, id, scoped } = options
  
  const result = compile(source, {
    mode: 'module',
    hoistStatic: true,
    cacheHandlers: true,
    sourceMap: true,
    filename,
    scopeId: scoped ? id : undefined,
    bindingMetadata: options.compilerOptions?.bindingMetadata
  })
  
  return result
}
```

SFC 编译器设置适当的选项，确保生成的代码与组件其他部分正确集成。

## 运行时编译

在浏览器中包含编译器时，可以动态编译模板：

```typescript
import { compile } from 'vue'

const { code } = compile('<div>{{ msg }}</div>')
const render = new Function('Vue', code)(Vue)

// 使用编译的 render 函数
const App = {
  data: () => ({ msg: 'Hello' }),
  render
}
```

这是 template 选项在运行时工作的原理。完整版 Vue 包含编译器，运行时版不包含。

## 性能计时

开发环境下可以测量编译时间：

```typescript
if (__DEV__) {
  const start = performance.now()
  const result = compile(template, options)
  console.log(`Compile time: ${performance.now() - start}ms`)
}
```

对于大型模板或需要优化编译性能的场景，这种测量很有用。

## 小结

compile 是 Vue 编译器的入口函数，串联了解析、转换、代码生成三个阶段。它通过选项参数提供丰富的定制能力：模式选择、优化开关、自定义转换、错误处理等。理解这个入口函数的结构和选项，是深入后续各个阶段的基础。在实际使用中，开发者很少直接调用 compile，但它是构建工具插件和高级场景的基础。
