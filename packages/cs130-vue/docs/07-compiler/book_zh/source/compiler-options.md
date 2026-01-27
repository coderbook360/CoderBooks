# CompilerOptions 配置选项

CompilerOptions 定义了 Vue 编译器的所有可配置项。理解这些选项有助于在特定场景下正确配置编译器，也有助于理解编译器的能力边界。

## 选项类型定义

```typescript
export interface CompilerOptions {
  // 解析选项
  isVoidTag?: (tag: string) => boolean
  isNativeTag?: (tag: string) => boolean
  isPreTag?: (tag: string) => boolean
  isCustomElement?: (tag: string) => boolean
  getNamespace?: (tag: string, parent: ElementNode | undefined) => Namespace
  getTextMode?: (node: ElementNode, parent: ElementNode | undefined) => TextModes
  delimiters?: [string, string]
  
  // 转换选项
  nodeTransforms?: NodeTransform[]
  directiveTransforms?: Record<string, DirectiveTransform>
  transformHoist?: HoistTransform | null
  isBuiltInComponent?: (tag: string) => symbol | void
  isCustomElement?: (tag: string) => boolean | void
  
  // 优化选项
  hoistStatic?: boolean
  cacheHandlers?: boolean
  
  // 代码生成选项
  mode?: 'module' | 'function'
  prefixIdentifiers?: boolean
  sourceMap?: boolean
  filename?: string
  scopeId?: string | null
  slotted?: boolean
  ssrCssVars?: string
  
  // 开发选项
  inline?: boolean
  isTS?: boolean
  
  // 错误处理
  onError?: (error: CompilerError) => void
  onWarn?: (warning: CompilerError) => void
  
  // 兼容选项
  compatConfig?: CompatConfig
}
```

## 解析选项

这些选项帮助解析器理解标签语义：

```typescript
isVoidTag?: (tag: string) => boolean
```

判断是否是自闭合标签（如 `<br>`、`<img>`）。在 DOM 平台，这些标签不能有闭合标签。

```typescript
isNativeTag?: (tag: string) => boolean
```

判断是否是原生元素。对于 DOM 平台，这包括所有 HTML 和 SVG 标签。非原生标签被视为组件。

```typescript
isPreTag?: (tag: string) => boolean
```

判断是否是预格式化标签（如 `<pre>`）。这些标签内的空白符不会被压缩。

```typescript
isCustomElement?: (tag: string) => boolean
```

判断是否是 Custom Element。这些不会被视为 Vue 组件。

```typescript
delimiters?: [string, string]
```

插值分隔符，默认是 `['{{', '}}']`。可以自定义避免与后端模板语法冲突。

## 转换选项

```typescript
nodeTransforms?: NodeTransform[]
```

自定义节点转换插件。这些会在默认转换之后应用。

```typescript
directiveTransforms?: Record<string, DirectiveTransform>
```

自定义指令转换。映射从指令名到转换函数。

```typescript
transformHoist?: HoistTransform | null
```

静态节点提升后的额外转换。DOM 平台用于静态节点字符串化。

```typescript
isBuiltInComponent?: (tag: string) => symbol | void
```

识别内置组件（Transition、KeepAlive 等）。返回组件的 symbol 标识。

## 优化选项

```typescript
hoistStatic?: boolean
```

是否启用静态提升。默认为 true。提升后的静态节点只创建一次，后续渲染复用。

```typescript
cacheHandlers?: boolean
```

是否缓存事件处理器。默认为 true。缓存后的处理器引用稳定，避免不必要的更新。

## 代码生成选项

```typescript
mode?: 'module' | 'function'
```

生成代码的模式。module 生成 ES 模块，function 生成函数体。

```typescript
prefixIdentifiers?: boolean
```

是否前缀化表达式中的标识符。需要解析 JavaScript 表达式，不支持浏览器运行时。

```typescript
sourceMap?: boolean
```

是否生成 source map。默认 false，启用后生成结果包含 map 字段。

```typescript
filename?: string
```

源文件名。用于错误信息和 source map。

```typescript
scopeId?: string | null
```

Scoped CSS 的作用域 ID。设置后会为元素添加相应的属性。

```typescript
slotted?: boolean
```

组件是否使用了 slotted 子组件。影响作用域 ID 的传递。

## 开发选项

```typescript
inline?: boolean
```

是否内联模式。用于 SFC 的 script setup 场景，render 函数内联在 setup 中。

```typescript
isTS?: boolean
```

源码是否是 TypeScript。影响表达式解析策略。

## 错误处理

```typescript
onError?: (error: CompilerError) => void
```

错误回调。默认行为是抛出异常。可以自定义收集错误而不中断编译。

```typescript
onWarn?: (warning: CompilerError) => void
```

警告回调。警告不会中断编译，但提示潜在问题。

## 实际使用示例

构建工具中的典型配置：

```typescript
compile(template, {
  mode: 'module',
  hoistStatic: true,
  cacheHandlers: true,
  sourceMap: true,
  filename: 'MyComponent.vue',
  prefixIdentifiers: true,
  scopeId: 'data-v-7ba5bd90'
})
```

运行时编译的配置：

```typescript
compile(template, {
  mode: 'function',
  hoistStatic: true,
  cacheHandlers: false,  // 运行时不支持
  prefixIdentifiers: false,  // 运行时不支持
  onError: (err) => console.error(err)
})
```

自定义指令转换：

```typescript
compile(template, {
  directiveTransforms: {
    'my-directive': (dir, node, context) => {
      // 自定义转换逻辑
      return {
        props: [/* ... */]
      }
    }
  }
})
```

## 选项的默认值

大多数选项有合理的默认值：

```typescript
const defaultCompilerOptions = {
  mode: 'function',
  hoistStatic: true,
  cacheHandlers: false,
  prefixIdentifiers: false,
  sourceMap: false,
  delimiters: ['{{', '}}']
}
```

构建工具插件会覆盖这些默认值以适应其场景。

## 选项之间的依赖

某些选项有依赖关系：

cacheHandlers 需要 prefixIdentifiers 为 true。scopeId 需要 mode 为 'module'。prefixIdentifiers 需要非浏览器环境。

编译器会检查这些依赖，不满足时报告错误。

## 小结

CompilerOptions 提供了丰富的配置能力，涵盖解析、转换、优化、代码生成各个阶段。不同的使用场景（构建时、运行时、SSR）需要不同的配置组合。理解这些选项有助于在特定需求下正确配置编译器，也有助于理解编译器的各种能力和限制。在实际开发中，这些选项通常由构建工具插件设置，开发者很少需要直接配置。
