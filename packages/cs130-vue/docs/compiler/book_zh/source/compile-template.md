# compileTemplate 模板编译

compileTemplate 是 SFC 模板块的编译入口。它将 template 内容编译为渲染函数代码，处理预处理器、绑定优化、source map 等。

## 核心接口

```typescript
export function compileTemplate(
  options: SFCTemplateCompileOptions
): SFCTemplateCompileResults {
  const {
    source,
    filename,
    id,
    scoped,
    slotted,
    isProd,
    ssr,
    ssrCssVars,
    compiler,
    compilerOptions = {},
    preprocessLang,
    preprocessOptions,
    preprocessCustomRequire,
    transformAssetUrls,
    transformAssetUrlsOptions
  } = options
  
  // ...
}
```

## 编译流程

```typescript
function compileTemplate(options) {
  let { source, filename } = options
  
  // 1. 预处理（如 Pug）
  if (options.preprocessLang) {
    const preprocessor = getPreprocessor(options.preprocessLang)
    const result = preprocessor(source, options.preprocessOptions)
    source = result.code
  }
  
  // 2. 调用核心编译器
  const result = options.compiler.compile(source, {
    mode: 'module',
    prefixIdentifiers: true,
    hoistStatic: true,
    cacheHandlers: true,
    scopeId: options.scoped ? options.id : null,
    slotted: options.slotted,
    sourceMap: true,
    filename,
    ...options.compilerOptions,
    // 绑定元数据
    bindingMetadata: options.compilerOptions?.bindingMetadata
  })
  
  // 3. 处理资源 URL
  if (options.transformAssetUrls) {
    result.code = transformAssetUrls(result.code, options)
  }
  
  // 4. 返回结果
  return {
    code: result.code,
    ast: result.ast,
    source,
    errors: result.errors,
    tips: result.tips,
    map: result.map
  }
}
```

## 预处理器支持

### Pug

```vue
<template lang="pug">
div.container
  h1 {{ title }}
  p {{ content }}
</template>
```

预处理：

```typescript
function preprocessPug(source, options) {
  const pug = require('pug')
  return {
    code: pug.compile(source, options)()
  }
}
```

### 其他预处理器

- Haml
- EJS
- 自定义预处理器

```typescript
const preprocessor = options.preprocessCustomRequire?.(options.preprocessLang)
  || consolidate[options.preprocessLang]
```

## 绑定元数据

从 compileScript 获取的绑定信息传递给模板编译：

```typescript
const bindings = scriptResult.bindings
// { count: 'setup-ref', increment: 'setup-const', ... }

const result = compiler.compile(source, {
  bindingMetadata: bindings
})
```

模板编译器使用这些信息：
- 决定是否添加 .value
- 选择正确的前缀（_ctx、$setup 等）
- 优化访问方式

## 资源 URL 转换

处理模板中的静态资源：

```vue
<template>
  <img src="./logo.png">
  <video :src="videoPath"></video>
</template>
```

转换为：

```javascript
import _imports_0 from './logo.png'

createElementVNode("img", { src: _imports_0 })
createElementVNode("video", { src: _ctx.videoPath })
```

配置：

```typescript
{
  transformAssetUrls: {
    img: ['src'],
    video: ['src', 'poster'],
    source: ['src'],
    // 自定义组件
    'my-image': ['src']
  }
}
```

## Scoped 样式支持

当有 scoped 样式时，模板需要添加 data 属性：

```typescript
const result = compiler.compile(source, {
  scopeId: scoped ? `data-v-${id}` : null
})
```

生成的代码：

```javascript
// scopeId = 'data-v-abc123'
createElementVNode("div", {
  class: "container",
  "data-v-abc123": ""
})
```

运行时由 vnode 处理 scopeId。

## SSR 模式

服务端渲染模式：

```typescript
const result = compiler.compile(source, {
  ssr: true
})
```

生成字符串拼接代码而非 vnode 创建：

```javascript
// CSR
createElementVNode("div", null, toDisplayString(msg))

// SSR
`<div>${ssrInterpolate(msg)}</div>`
```

## Source Map

生成 source map 用于调试：

```typescript
const result = compiler.compile(source, {
  sourceMap: true,
  filename
})

// result.map 包含映射信息
```

调试时可以在浏览器中看到模板源码。

## 错误处理

```typescript
const result = compiler.compile(source, {
  onError: (err) => {
    errors.push(err)
  },
  onWarn: (warn) => {
    tips.push(warn)
  }
})

return {
  code: errors.length ? '' : result.code,
  errors,
  tips
}
```

## CSS v-bind 支持

```vue
<style>
.container {
  color: v-bind(textColor);
}
</style>
```

编译时提取 CSS 变量：

```typescript
const cssVars = extractCSSVars(styles)
// ['textColor']

const result = compiler.compile(source, {
  ssrCssVars: cssVars.map(v => `--${v}: v-bind(${v})`)
})
```

## 自定义编译器

可以使用自定义编译器：

```typescript
compileTemplate({
  source,
  compiler: customCompiler  // 替代默认的 @vue/compiler-dom
})
```

用于特殊平台（如小程序）。

## 输出结构

```typescript
interface SFCTemplateCompileResults {
  code: string              // 渲染函数代码
  ast?: RootNode            // 编译后的 AST
  preamble?: string         // 前置代码（imports 等）
  source: string            // 原始模板
  tips: string[]            // 提示信息
  errors: (string | CompilerError)[]  // 错误
  map?: RawSourceMap        // source map
}
```

## 完整示例

输入：

```vue
<template>
  <div class="container">
    <h1>{{ title }}</h1>
    <button @click="increment">{{ count }}</button>
  </div>
</template>
```

输出：

```javascript
import { toDisplayString as _toDisplayString, createElementVNode as _createElementVNode, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

export function render(_ctx, _cache) {
  return (_openBlock(), _createElementBlock("div", { class: "container" }, [
    _createElementVNode("h1", null, _toDisplayString(_ctx.title), 1),
    _createElementVNode("button", {
      onClick: _ctx.increment
    }, _toDisplayString(_ctx.count), 9, ["onClick"])
  ]))
}
```

## 小结

compileTemplate 是 SFC 模板编译的入口。它处理预处理器转换，调用核心编译器生成渲染函数，处理资源 URL 转换，支持 scoped 样式和 SSR。绑定元数据从 script 编译传递过来，指导正确的变量访问。输出包括渲染函数代码、AST 和 source map。这是连接 SFC 模板和运行时的关键环节。
