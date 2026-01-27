# CSS 作用域与 Scoped

Scoped CSS 是 Vue SFC 的重要特性，它让组件的样式只影响当前组件的元素，避免样式污染。这个特性通过编译时的转换实现，无需运行时开销。

## 样式隔离的需求

在传统的 CSS 开发中，样式是全局的。一个组件定义的 `.button` 类会影响页面上所有的 `.button` 元素。这导致样式冲突难以避免，组件难以真正独立。

解决方案有几种：BEM 命名约定、CSS Modules、CSS-in-JS、Web Components 的 Shadow DOM。Vue 提供了 Scoped CSS 作为一种简单有效的方案。

## Scoped 的使用

在 style 标签上添加 scoped 属性：

```html
<template>
  <div class="container">
    <button class="btn">Click</button>
  </div>
</template>

<style scoped>
.container {
  padding: 20px;
}

.btn {
  background: blue;
}
</style>
```

这些样式只会影响当前组件的元素，不会泄露到父组件或子组件。

## 编译转换

编译器为每个 SFC 生成唯一的 ID，然后：

在模板中，为每个元素添加属性：

```html
<div class="container" data-v-7ba5bd90>
  <button class="btn" data-v-7ba5bd90>Click</button>
</div>
```

在样式中，为每个选择器添加属性选择器：

```css
.container[data-v-7ba5bd90] {
  padding: 20px;
}

.btn[data-v-7ba5bd90] {
  background: blue;
}
```

现在 `.btn[data-v-7ba5bd90]` 只会匹配带有对应属性的按钮，实现了样式隔离。

## 作用域 ID 生成

作用域 ID 基于文件路径和内容的哈希：

```typescript
const scopeId = 'data-v-' + hash(filename + content)
```

这确保：同一文件总是生成相同的 ID、不同文件生成不同的 ID、文件内容变化时 ID 变化（用于热更新）。

## 深度选择器

有时需要从父组件样式穿透到子组件。Vue 提供深度选择器：

```html
<style scoped>
/* 使用 :deep() 穿透 */
.container :deep(.child-class) {
  color: red;
}
</style>
```

编译为：

```css
.container[data-v-7ba5bd90] .child-class {
  color: red;
}
```

注意属性选择器加在 .container 上，不加在 .child-class 上，因此能匹配子组件的元素。

旧语法 `>>>` 和 `/deep/` 已废弃，应使用 `:deep()`。

## 插槽内容的处理

插槽内容是由父组件提供的，属于父组件的作用域：

```html
<!-- Parent.vue -->
<template>
  <Child>
    <div class="slot-content">Slot</div>
  </Child>
</template>

<style scoped>
.slot-content {
  color: red;  /* 这个样式能生效 */
}
</style>
```

slot-content 元素带有父组件的 scope ID，因此父组件的 scoped 样式可以作用于它。

子组件的 scoped 样式不会影响插槽内容，因为元素没有子组件的 scope ID。

## 多个 style 块

一个 SFC 可以有多个 style 块，可以混合 scoped 和非 scoped：

```html
<style>
/* 全局样式 */
body { margin: 0; }
</style>

<style scoped>
/* 作用域样式 */
.container { padding: 20px; }
</style>
```

通常把真正需要全局的样式放在非 scoped 块，组件私有的放在 scoped 块。

## 动态类名的处理

动态绑定的类名同样会被 scope 限制：

```html
<template>
  <div :class="dynamicClass">Content</div>
</template>

<style scoped>
.highlight { background: yellow; }
.error { color: red; }
</style>
```

只要 dynamicClass 的值是 highlight 或 error，对应的样式就会生效，因为元素有 scope 属性，选择器也有。

## 与 CSS Modules 的比较

Vue 也支持 CSS Modules：

```html
<template>
  <div :class="$style.container">Content</div>
</template>

<style module>
.container { padding: 20px; }
</style>
```

CSS Modules 通过生成唯一的类名（如 `_container_1a2b3`）实现隔离。

两者的区别：Scoped CSS 保持原始类名便于调试，CSS Modules 类名完全随机。Scoped 通过属性选择器，Modules 通过类名本身。Scoped 有深度穿透语法，Modules 没有（需要 global 语法）。

## 性能考量

Scoped CSS 有轻微的性能开销：

属性选择器 `[data-v-xxx]` 比类选择器稍慢。每个元素都多了一个属性。

但这些开销在实践中可以忽略。现代浏览器的选择器匹配非常快，属性选择器的性能差异微乎其微。

如果极端追求性能，可以考虑 CSS Modules 或其他方案。但大多数应用不需要这种极端优化。

## 源码映射

Scoped CSS 编译后需要正确的 source map，让调试器能定位到原始样式：

```typescript
compileStyle({
  source,
  filename,
  id: scopeId,
  scoped: true,
  map: inputSourceMap  // 传入源映射
})
// 返回包含更新后 source map 的结果
```

DevTools 中看到的是原始的选择器，点击能跳转到 .vue 文件的正确位置。

## 边界情况

有些场景需要注意：

动态创建的元素不会自动获得 scope 属性。如果通过 innerHTML 插入内容，scoped 样式不会生效。

第三方组件的样式不受 scoped 影响。如果需要覆盖，使用 :deep() 或非 scoped 样式。

模板中的 style 属性不受影响。内联样式总是生效的。

## 小结

Scoped CSS 通过编译时转换实现样式隔离：为元素添加唯一属性，为选择器添加属性选择器。这个方案简单有效，无需运行时开销，保持了原始类名便于调试。深度选择器允许必要时穿透到子组件。与 CSS Modules 相比，Scoped 更接近传统 CSS 的写法，学习成本更低。对于大多数 Vue 应用，Scoped CSS 是样式隔离的首选方案。
