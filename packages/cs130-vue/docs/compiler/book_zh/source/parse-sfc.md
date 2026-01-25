# parse 解析 SFC

parse 函数是 SFC（单文件组件）编译的第一步，将 .vue 文件解析为描述符对象。它识别 template、script、style 等块，提取各部分内容供后续编译。

## SFC 结构

一个典型的 .vue 文件：

```vue
<template>
  <div>{{ message }}</div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const message = ref('Hello')
</script>

<style scoped>
div { color: red; }
</style>
```

## SFCDescriptor

parse 的输出是 SFCDescriptor：

```typescript
interface SFCDescriptor {
  filename: string
  source: string
  template: SFCTemplateBlock | null
  script: SFCScriptBlock | null
  scriptSetup: SFCScriptBlock | null
  styles: SFCStyleBlock[]
  customBlocks: SFCBlock[]
  cssVars: string[]
  slotted: boolean
  shouldForceReload: (prevImports: Record<string, ImportBinding>) => boolean
}
```

## parse 函数

```typescript
export function parse(
  source: string,
  {
    sourceMap = true,
    filename = 'anonymous.vue',
    sourceRoot = '',
    pad = false,
    ignoreEmpty = true,
    compiler = CompilerDOM
  }: SFCParseOptions = {}
): SFCParseResult {
  const descriptor: SFCDescriptor = {
    filename,
    source,
    template: null,
    script: null,
    scriptSetup: null,
    styles: [],
    customBlocks: [],
    cssVars: [],
    slotted: false,
    shouldForceReload: prevImports => hmrShouldReload(prevImports, descriptor)
  }
  
  const errors: (CompilerError | SyntaxError)[] = []
  
  // 使用模板编译器解析顶层结构
  const ast = compiler.parse(source, {
    parseMode: 'sfc',
    onError: e => errors.push(e)
  })
  
  // 遍历顶层节点
  ast.children.forEach(node => {
    if (node.type !== NodeTypes.ELEMENT) {
      return
    }
    
    // 根据标签名分类
    switch (node.tag) {
      case 'template':
        descriptor.template = createBlock(node, source, pad) as SFCTemplateBlock
        break
      case 'script':
        const scriptBlock = createBlock(node, source, pad) as SFCScriptBlock
        if (node.props.some(p => p.name === 'setup')) {
          descriptor.scriptSetup = scriptBlock
        } else {
          descriptor.script = scriptBlock
        }
        break
      case 'style':
        descriptor.styles.push(createBlock(node, source, pad) as SFCStyleBlock)
        break
      default:
        descriptor.customBlocks.push(createBlock(node, source, pad))
    }
  })
  
  return { descriptor, errors }
}
```

## Block 创建

每个顶层块转换为 SFCBlock：

```typescript
interface SFCBlock {
  type: string              // 块类型：template, script, style
  content: string           // 块内容
  attrs: Record<string, string | true>  // 属性
  loc: SourceLocation       // 位置信息
  map?: RawSourceMap        // source map
  lang?: string             // 语言：ts, scss, pug 等
  src?: string              // 外部文件引用
}
```

```typescript
function createBlock(
  node: ElementNode,
  source: string,
  pad: boolean | 'line' | 'space'
): SFCBlock {
  const type = node.tag
  
  // 提取属性
  const attrs: Record<string, string | true> = {}
  node.props.forEach(p => {
    if (p.type === NodeTypes.ATTRIBUTE) {
      attrs[p.name] = p.value ? p.value.content : true
    }
  })
  
  // 计算内容位置
  const loc = {
    source: source.slice(node.loc.start.offset, node.loc.end.offset),
    start: { ...node.loc.start },
    end: { ...node.loc.end }
  }
  
  // 提取内容（排除标签本身）
  let content = ''
  if (node.children.length) {
    const start = node.children[0].loc.start.offset
    const end = node.children[node.children.length - 1].loc.end.offset
    content = source.slice(start, end)
  }
  
  return {
    type,
    content,
    loc,
    attrs,
    lang: attrs.lang as string,
    src: attrs.src as string
  }
}
```

## 特殊属性处理

### lang 属性

指定语言预处理器：

```vue
<template lang="pug">
div {{ message }}
</template>

<script lang="ts">
export default { ... }
</script>

<style lang="scss">
$color: red;
div { color: $color; }
</style>
```

### src 属性

引用外部文件：

```vue
<template src="./template.html"></template>
<script src="./script.js"></script>
<style src="./style.css"></style>
```

### scoped 属性

样式作用域：

```vue
<style scoped>
div { color: red; }
</style>
```

解析后 `block.scoped = true`。

### module 属性

CSS Modules：

```vue
<style module>
.container { padding: 20px; }
</style>

<style module="classes">
.title { font-size: 24px; }
</style>
```

解析后 `block.module = true | string`。

## script setup 检测

```typescript
if (node.props.some(p => p.name === 'setup')) {
  descriptor.scriptSetup = scriptBlock
} else {
  descriptor.script = scriptBlock
}
```

一个 SFC 可以同时有普通 script 和 script setup：

```vue
<script>
export const meta = { ... }
</script>

<script setup>
import { ref } from 'vue'
const count = ref(0)
</script>
```

## 多个 style 块

style 块可以有多个：

```vue
<style>
/* 全局样式 */
</style>

<style scoped>
/* 作用域样式 */
</style>

<style module>
/* CSS Modules */
</style>
```

存入 `descriptor.styles` 数组。

## 自定义块

非标准标签作为自定义块：

```vue
<docs>
# Component Documentation
</docs>

<i18n>
{ "en": { "hello": "Hello" } }
</i18n>
```

存入 `descriptor.customBlocks`，由构建工具处理。

## 错误处理

解析错误收集在结果中：

```typescript
const errors: (CompilerError | SyntaxError)[] = []

const ast = compiler.parse(source, {
  parseMode: 'sfc',
  onError: e => errors.push(e)
})

return { descriptor, errors }
```

常见错误：
- 标签未闭合
- 多个 template 块
- 无效的属性

## pad 选项

pad 用于保持行号对齐，便于 source map：

```typescript
if (pad) {
  // 用空行或空格填充，保持内容在原始位置
}
```

## parseMode: 'sfc'

特殊的解析模式：

```typescript
const ast = compiler.parse(source, {
  parseMode: 'sfc',
  ...
})
```

SFC 模式下只解析顶层块结构，不深入解析 template 内容。

## HMR 支持

```typescript
shouldForceReload: prevImports => hmrShouldReload(prevImports, descriptor)
```

帮助 HMR 判断是否需要完整重载。

## 小结

parse 函数将 .vue 文件解析为 SFCDescriptor。它识别 template、script、scriptSetup、style 和自定义块，提取内容和属性。支持 lang、src、scoped、module 等属性。解析结果供后续的 compileScript、compileTemplate、compileStyle 使用。这是 SFC 编译流程的起点。
