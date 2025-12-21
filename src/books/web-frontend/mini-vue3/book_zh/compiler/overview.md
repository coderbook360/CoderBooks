# 编译器概述

Vue 的模板语法简洁直观，但浏览器并不认识 `v-if`、`@click`、`{{ }}`。**它们是如何变成可执行的 JavaScript 代码的？**

这就是编译器的工作。**理解编译器，是深入 Vue 3 的必经之路。** 本章将介绍 Vue 3 编译器的整体架构和工作流程。

## 为什么需要编译器

开发者写的模板：

```html
<div class="container">
  <h1>{{ title }}</h1>
  <p v-if="showContent">{{ content }}</p>
  <button @click="handleClick">Click me</button>
</div>
```

编译器生成的渲染函数：

```javascript
function render(_ctx, _cache) {
  return (_openBlock(), _createElementBlock("div", { class: "container" }, [
    _createElementVNode("h1", null, _toDisplayString(_ctx.title), 1),
    _ctx.showContent
      ? (_openBlock(), _createElementBlock("p", { key: 0 }, 
          _toDisplayString(_ctx.content), 1))
      : _createCommentVNode("v-if", true),
    _createElementVNode("button", {
      onClick: _ctx.handleClick
    }, "Click me", 8, ["onClick"])
  ]))
}
```

编译器的价值：
1. **开发体验**：模板语法直观易读
2. **性能优化**：静态分析，生成优化提示（PatchFlags）
3. **错误检查**：编译时发现模板错误
4. **代码分割**：预编译减少运行时体积

## 三阶段架构

Vue 3 编译器分为三个阶段：

```
模板字符串
    │
    ▼
┌─────────────────┐
│     Parse       │  解析阶段
│  词法分析        │  → 模板 AST
│  语法分析        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Transform     │  转换阶段
│  节点转换        │  → JavaScript AST
│  优化标记        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Codegen      │  生成阶段
│  代码生成        │  → 渲染函数字符串
└────────┬────────┘
         │
         ▼
    render 函数
```

### Parse（解析）

将模板字符串转换为 AST（抽象语法树）：

```javascript
const template = '<div>{{ msg }}</div>'

// 解析后的 AST
{
  type: 'ROOT',
  children: [{
    type: 'ELEMENT',
    tag: 'div',
    children: [{
      type: 'INTERPOLATION',
      content: { content: 'msg' }
    }]
  }]
}
```

### Transform（转换）

对 AST 进行转换和优化：
- 处理 v-if、v-for 等指令
- 标记静态节点
- 添加 PatchFlags
- 转换为 JavaScript AST

### Codegen（生成）

将 JavaScript AST 转换为代码字符串：

```javascript
// 生成的代码
`function render(_ctx) {
  return _createElementVNode("div", null, _toDisplayString(_ctx.msg))
}`
```

## 编译入口

```javascript
function compile(template, options = {}) {
  // 1. 解析
  const ast = parse(template, options)
  
  // 2. 转换
  transform(ast, {
    ...options,
    nodeTransforms: [
      transformIf,
      transformFor,
      transformElement,
      // ...
    ],
    directiveTransforms: {
      on: transformOn,
      bind: transformBind,
      model: transformModel
    }
  })
  
  // 3. 生成
  return generate(ast, options)
}
```

## 运行时编译 vs 预编译

### 运行时编译

```javascript
import { createApp } from 'vue'

createApp({
  template: '<div>{{ msg }}</div>',
  data() {
    return { msg: 'Hello' }
  }
})
```

需要包含编译器的 Vue 版本（vue.esm-bundler.js），体积更大。

### 预编译（推荐）

```vue
<template>
  <div>{{ msg }}</div>
</template>

<script>
export default {
  data() {
    return { msg: 'Hello' }
  }
}
</script>
```

构建时由 vue-loader 或 @vitejs/plugin-vue 编译，运行时只需 runtime 版本。

## 编译器包结构

```
@vue/compiler-core     核心编译逻辑（平台无关）
@vue/compiler-dom      DOM 平台特定编译
@vue/compiler-sfc      单文件组件编译
@vue/compiler-ssr      SSR 编译
```

### compiler-core

平台无关的核心：
- 解析器（Parser）
- 转换器（Transformer）
- 代码生成器（Codegen）

### compiler-dom

DOM 平台扩展：
- 特殊标签处理（script、style）
- 事件修饰符转换
- v-html、v-text 指令

### compiler-sfc

SFC 编译：
- 解析 `<template>`、`<script>`、`<style>` 块
- 处理 `<script setup>`
- 作用域 CSS 处理

## 编译选项

```javascript
compile(template, {
  // 是否为服务端渲染
  isSSR: false,
  
  // 自定义指令
  directiveTransforms: {},
  
  // 自定义元素
  isCustomElement: (tag) => false,
  
  // 是否生成 sourceMap
  sourceMap: false,
  
  // 模式：module | function
  mode: 'function',
  
  // 前缀标识符
  prefixIdentifiers: false,
  
  // 是否缓存事件处理器
  cacheHandlers: false
})
```

## 编译结果

```javascript
const { code, ast, map } = compile(template, options)

// code: 生成的代码字符串
// ast: 转换后的 AST
// map: Source Map（可选）
```

## 本章小结

本章介绍了 Vue 3 编译器的整体架构：

- **三阶段流程**：Parse → Transform → Codegen
- **Parse**：将模板解析为 AST
- **Transform**：转换和优化 AST
- **Codegen**：生成渲染函数代码
- **预编译优势**：减少运行时体积，提前发现错误

编译器是 Vue 性能优化的关键。静态分析让 Vue 3 能够生成带有优化提示的渲染函数，运行时可以跳过不必要的比较。

接下来的章节，我们将深入每个阶段的实现细节。
