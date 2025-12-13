# SFC 解析：分离 template/script/style

**首先要问的是**：`.vue` 文件看起来像 HTML，但它包含了模板、JavaScript 和 CSS 三种完全不同的内容。**解析器是怎么准确地分离它们的？**

**现在要问第二个问题**：HTML 解析器能直接解析 `.vue` 文件吗？毕竟 `<script>` 和 `<style>` 作为顶级元素在标准 HTML 中是不合法的。

答案是：Vue 使用了**特殊模式**的 HTML 解析器。理解这个过程，你就能明白 `.vue` 文件是如何被拆解的。

## 解析入口

```javascript
function parse(source, options = {}) {
  // 处理 BOM
  const sourceToUse = source.startsWith('\ufeff')
    ? source.slice(1)
    : source
  
  const {
    sourceMap = true,
    filename = 'anonymous.vue',
    pad = false
  } = options
  
  // 初始化描述符
  const descriptor = {
    filename,
    source: sourceToUse,
    template: null,
    script: null,
    scriptSetup: null,
    styles: [],
    customBlocks: [],
    cssVars: [],
    slotted: false
  }
  
  const errors = []
  
  // 使用 HTML 解析器解析
  const ast = compilerDOM.parse(sourceToUse, {
    parseMode: 'sfc',  // SFC 模式
    onError: e => errors.push(e)
  })
  
  // 处理解析结果
  processAST(ast, descriptor, sourceToUse, errors)
  
  return { descriptor, errors }
}
```

**关键点**：`parseMode: 'sfc'` 告诉解析器这是 SFC 文件，不是普通 HTML。

在普通 HTML 模式下，`<script>` 和 `<style>` 只能出现在 `<head>` 或 `<body>` 内部。但 SFC 文件中，它们是**顶级元素**。设置 `parseMode: 'sfc'` 后，解析器会：

1. 跳过 HTML 规范验证
2. 允许 `<template>`、`<script>`、`<style>` 作为顶级元素
3. 保留未知标签作为自定义块

## AST 处理

遍历 AST，按标签分类：

```javascript
function processAST(ast, descriptor, source, errors) {
  ast.children.forEach(node => {
    if (node.type !== NodeTypes.ELEMENT) {
      return
    }
    
    switch (node.tag) {
      case 'template':
        handleTemplateBlock(node, descriptor, source, errors)
        break
      case 'script':
        handleScriptBlock(node, descriptor, source, errors)
        break
      case 'style':
        handleStyleBlock(node, descriptor, source)
        break
      default:
        // 自定义块
        descriptor.customBlocks.push(
          createBlock(node, source)
        )
    }
  })
}
```

## 块创建

从 AST 节点创建块对象：

```javascript
function createBlock(node, source) {
  const block = {
    type: node.tag,
    content: '',
    loc: node.loc,
    attrs: {}
  }
  
  // 解析属性
  node.props.forEach(p => {
    if (p.type === NodeTypes.ATTRIBUTE) {
      block.attrs[p.name] = p.value?.content ?? true
      
      // lang 属性特殊处理
      if (p.name === 'lang') {
        block.lang = p.value?.content
      }
    }
  })
  
  // 提取内容
  if (node.children.length === 1 && 
      node.children[0].type === NodeTypes.TEXT) {
    block.content = node.children[0].content
  } else {
    // 多个子节点，取原始文本
    const start = node.children[0].loc.start.offset
    const end = node.children[node.children.length - 1].loc.end.offset
    block.content = source.slice(start, end)
  }
  
  return block
}
```

## template 块处理

```javascript
function handleTemplateBlock(node, descriptor, source, errors) {
  if (descriptor.template) {
    errors.push(new Error('只能有一个 <template> 块'))
    return
  }
  
  const block = createBlock(node, source)
  
  // 检查 functional 属性（Vue 2 遗留）
  if (block.attrs.functional) {
    errors.push(new Error('functional 模板在 Vue 3 中已移除'))
  }
  
  descriptor.template = block
}
```

## script 块处理

区分普通 script 和 script setup：

```javascript
function handleScriptBlock(node, descriptor, source, errors) {
  const block = createBlock(node, source)
  
  // 检查 setup 属性
  const isSetup = 'setup' in block.attrs
  
  if (isSetup) {
    if (descriptor.scriptSetup) {
      errors.push(new Error('只能有一个 <script setup>'))
      return
    }
    descriptor.scriptSetup = block
  } else {
    if (descriptor.script) {
      errors.push(new Error('只能有一个 <script>'))
      return
    }
    descriptor.script = block
  }
}
```

可以同时有 `<script>` 和 `<script setup>`：

```html
<script>
// 普通 script，用于无法在 setup 中表达的内容
export const namedExport = 'value'
</script>

<script setup>
// setup 代码
const count = ref(0)
</script>
```

## style 块处理

style 块可以有多个：

```javascript
function handleStyleBlock(node, descriptor, source) {
  const block = createBlock(node, source)
  
  // 标记 scoped
  block.scoped = 'scoped' in block.attrs
  
  // 标记 module
  block.module = block.attrs.module ?? false
  
  descriptor.styles.push(block)
}
```

示例：

```html
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

## src 属性处理

块可以引用外部文件：

```html
<template src="./template.html"></template>
<script src="./script.js"></script>
<style src="./style.css"></style>
```

解析时记录 src 属性，由构建工具解析：

```javascript
function createBlock(node, source) {
  const block = { /* ... */ }
  
  // src 属性
  const srcAttr = node.props.find(
    p => p.type === NodeTypes.ATTRIBUTE && p.name === 'src'
  )
  
  if (srcAttr && srcAttr.value) {
    block.src = srcAttr.value.content
    block.content = ''  // 内容为空，需要加载
  }
  
  return block
}
```

## Source Map 生成

每个块需要独立的 Source Map：

```javascript
function generateBlockSourceMaps(descriptor, source, filename) {
  const { template, script, scriptSetup, styles } = descriptor
  
  if (template) {
    template.map = generateSourceMap(
      source,
      template.loc,
      filename
    )
  }
  
  if (script) {
    script.map = generateSourceMap(
      source,
      script.loc,
      filename
    )
  }
  
  // ...同理处理其他块
}
```

这确保调试时能定位到 `.vue` 文件中的正确位置。

## 本章小结

本章分析了 SFC 的解析机制：

- **解析入口**：parse 函数，使用 HTML 解析器
- **块分类**：template、script、style、customBlocks
- **script 区分**：普通 script 和 script setup
- **style 多个**：支持 scoped 和 module
- **外部引用**：src 属性
- **Source Map**：每个块独立的映射

下一章将深入分析 `<script setup>` 的编译处理。

---

## 源码参考

本章涉及的 Vue 3 源码位置：

- **parse**：`packages/compiler-sfc/src/parse.ts`
- **createBlock**：`packages/compiler-sfc/src/parse.ts` 约 L100
- **processAST**：`packages/compiler-sfc/src/parse.ts` 约 L150
- **SFCBlock**：`packages/compiler-sfc/src/parse.ts` 约 L20

---

## 踩坑经验

**1. 多个 template 块报错**

```html
<!-- ❌ 错误：只能有一个 template -->
<template>
  <div>第一个</div>
</template>

<template>
  <div>第二个</div>
</template>

<!-- ✅ 正确：使用条件渲染 -->
<template>
  <div v-if="condition">第一个</div>
  <div v-else>第二个</div>
</template>
```

**2. src 引用路径问题**

```html
<!-- ❌ src 路径解析是相对于当前文件 -->
<script src="./utils/script.js"></script>

<!-- 注意：src 引用的文件不会被 Vue 编译器处理 -->
<!-- 如果需要使用 TypeScript，应该直接写在 .vue 文件中 -->
```

**3. 自定义块被忽略**

```html
<!-- 自定义块需要构建工具支持 -->
<docs>
# 组件文档
这是一个示例组件。
</docs>

<!-- 如果没有配置对应的 loader/plugin，自定义块会被忽略 -->
```

---

## 练习与思考

1. **代码分析**：解析以下 `.vue` 文件后，`SFCDescriptor` 中各字段的值是什么？

   ```html
   <template lang="pug">
   div Hello
   </template>
   <script setup lang="ts">
   const x = 1
   </script>
   <style scoped lang="scss">
   .x { color: red; }
   </style>
   ```

2. **思考题**：为什么 Vue 允许同时有 `<script>` 和 `<script setup>`？这解决了什么问题？

3. **进阶探索**：修改 parse 函数的 `parseMode`，看看如果设为 `'base'` 会发生什么？
