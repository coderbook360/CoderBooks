# Scoped CSS 实现

Scoped CSS 是 Vue SFC 的核心特性，通过编译时转换实现组件级样式隔离，避免样式冲突。

## 工作原理

Scoped CSS 的实现分为两部分：
1. 模板编译：给元素添加 data 属性
2. 样式编译：给选择器添加属性选择器

```vue
<template>
  <div class="container">
    <span class="title">Hello</span>
  </div>
</template>

<style scoped>
.container { padding: 20px; }
.title { color: red; }
</style>
```

编译后：

```html
<div class="container" data-v-abc123>
  <span class="title" data-v-abc123>Hello</span>
</div>
```

```css
.container[data-v-abc123] { padding: 20px; }
.title[data-v-abc123] { color: red; }
```

## scopeId 生成

每个组件有唯一的 scopeId：

```typescript
function generateScopeId(filename: string, source: string): string {
  // 基于文件名和内容生成 hash
  const hash = createHash('md5')
    .update(filename + source)
    .digest('hex')
    .substring(0, 8)
  return `data-v-${hash}`
}
```

## 模板处理

模板编译时传入 scopeId：

```typescript
const result = compile(template, {
  scopeId: 'data-v-abc123'
})
```

生成的 vnode 携带 scopeId：

```javascript
createElementVNode("div", {
  class: "container",
  "data-v-abc123": ""
}, [...])
```

运行时处理：

```typescript
// runtime-core
function mountElement(vnode, container) {
  const el = document.createElement(vnode.type)
  
  // 设置 scopeId
  if (vnode.scopeId) {
    el.setAttribute(vnode.scopeId, '')
  }
  
  // 处理子组件的 scopeId
  if (parentScopeId) {
    el.setAttribute(parentScopeId, '')
  }
}
```

## 样式编译

PostCSS 插件处理选择器：

```typescript
import selectorParser from 'postcss-selector-parser'

function scopedPlugin(id: string) {
  const keyframes = new Set<string>()
  
  return {
    postcssPlugin: 'vue-scoped',
    
    Rule(rule) {
      processRule(id, rule)
    },
    
    AtRule(atRule) {
      if (atRule.name === 'keyframes') {
        // 处理动画名称
        keyframes.add(atRule.params)
        atRule.params = `${atRule.params}-${id}`
      }
    }
  }
}

function processRule(id: string, rule: Rule) {
  rule.selector = selectorParser(selectors => {
    selectors.each(selector => {
      rewriteSelector(id, selector)
    })
  }).processSync(rule.selector)
}
```

## 选择器重写

```typescript
function rewriteSelector(id: string, selector: Selector) {
  let node: Node | null = null
  let shouldInject = true
  
  selector.each(n => {
    // 跳过深度选择器内部
    if (n.type === 'pseudo' && n.value === ':deep') {
      shouldInject = false
      // 移除 :deep，保留内部选择器
      const inner = n.nodes[0]
      if (inner) {
        selector.insertAfter(n, inner)
      }
      n.remove()
      return
    }
    
    // 跳过 :global
    if (n.type === 'pseudo' && n.value === ':global') {
      shouldInject = false
      const inner = n.nodes[0]
      if (inner) {
        selector.insertAfter(n, inner)
      }
      n.remove()
      return
    }
    
    // 记录最后一个可注入的节点
    if (n.type !== 'combinator' && n.type !== 'comment') {
      node = n
    }
  })
  
  if (node && shouldInject) {
    // 在最后一个节点后添加属性选择器
    selector.insertAfter(
      node,
      selectorParser.attribute({ attribute: id })
    )
  }
}
```

## 复杂选择器处理

### 后代选择器

```css
/* 输入 */
.parent .child { color: red; }

/* 输出 */
.parent .child[data-v-abc123] { color: red; }
```

属性选择器添加到最后一个元素。

### 多选择器

```css
/* 输入 */
.a, .b { color: red; }

/* 输出 */
.a[data-v-abc123], .b[data-v-abc123] { color: red; }
```

每个选择器独立处理。

### 伪类和伪元素

```css
/* 输入 */
.button:hover { color: blue; }
.text::before { content: ''; }

/* 输出 */
.button[data-v-abc123]:hover { color: blue; }
.text[data-v-abc123]::before { content: ''; }
```

属性选择器在伪类/伪元素之前。

## 深度选择器

### :deep()

穿透到子组件：

```css
/* 输入 */
.parent :deep(.child-component-class) {
  color: red;
}

/* 输出 */
.parent[data-v-abc123] .child-component-class {
  color: red;
}
```

scopeId 加到 :deep 之前的选择器上，:deep 内部不加。

### 旧语法

```css
/* 已废弃，但仍支持 */
.parent >>> .child { }
.parent /deep/ .child { }
.parent ::v-deep .child { }
```

## 插槽内容

### :slotted()

样式作用于插槽内容：

```css
/* 输入 */
:slotted(.slot-item) {
  margin: 10px;
}

/* 输出 */
.slot-item[data-v-abc123-s] {
  margin: 10px;
}
```

使用 `-s` 后缀区分插槽 scopeId。

模板中插槽内容标记：

```javascript
// 渲染插槽时
renderSlot(slots, 'default', {
  key: 0
}, null, parentScope, 'abc123-s')
```

## 全局样式

### :global()

```css
/* 输入 */
:global(.app-header) {
  position: fixed;
}

/* 输出 */
.app-header {
  position: fixed;
}
```

:global 内部的选择器不添加 scopeId。

## 动画处理

keyframes 名称也需要 scope：

```css
/* 输入 */
@keyframes fade {
  from { opacity: 0; }
  to { opacity: 1; }
}
.element {
  animation: fade 1s;
}

/* 输出 */
@keyframes fade-abc123 {
  from { opacity: 0; }
  to { opacity: 1; }
}
.element[data-v-abc123] {
  animation: fade-abc123 1s;
}
```

## 根元素处理

组件根元素会同时有自己和父组件的 scopeId：

```html
<!-- Parent.vue -->
<Child class="child" />

<!-- Child.vue 的根元素 -->
<div class="root" data-v-child data-v-parent></div>
```

这使父组件可以样式化子组件的根元素。

## 性能考虑

属性选择器比类选择器稍慢，但差异通常可忽略。优势：
- 不污染全局样式
- 无需手动命名约定
- 无运行时开销

## 小结

Scoped CSS 通过编译时转换实现样式隔离。模板中的元素添加 data 属性，样式选择器添加对应的属性选择器。:deep() 允许样式穿透到子组件，:slotted() 样式作用于插槽内容，:global() 定义全局样式。这种设计在编译时完成，运行时无额外开销，是 Vue 组件化开发的重要特性。
