# CSS Modules 设计

CSS Modules 是另一种 CSS 作用域方案。它通过生成唯一的类名来实现样式隔离，与 Scoped CSS 的属性选择器方案互为补充。Vue SFC 原生支持 CSS Modules。

## CSS Modules 的理念

CSS Modules 的核心理念是：类名应该是局部的，就像 JavaScript 变量一样。写代码时使用有意义的类名，编译时自动转换为唯一的标识符。

```css
/* 源码 */
.button { background: blue; }
.title { font-size: 24px; }

/* 编译后 */
._button_1a2b3_1 { background: blue; }
._title_1a2b3_5 { font-size: 24px; }
```

类名的唯一性由编译器保证，完全消除了命名冲突的可能。

## 在 Vue 中使用

使用 module 属性代替 scoped：

```html
<template>
  <div :class="$style.container">
    <h1 :class="$style.title">Hello</h1>
  </div>
</template>

<style module>
.container {
  padding: 20px;
}

.title {
  font-size: 24px;
}
</style>
```

编译后 $style 是一个对象，包含原始类名到转换后类名的映射：

```javascript
$style = {
  container: '_container_1a2b3_1',
  title: '_title_1a2b3_5'
}
```

模板中通过 `$style.title` 访问实际的类名。

## 编译流程

CSS Modules 编译分两步：

首先是 CSS 转换。将原始类名替换为生成的唯一类名，同时记录映射关系。

```typescript
const result = compileStyle({
  source: styleContent,
  filename: 'Component.vue',
  id: scopeId,
  modules: true
})

// result.modules 包含映射
// { container: '_container_1a2b3_1', ... }
```

然后是注入映射。将映射对象作为 $style 暴露给组件：

```javascript
export default {
  __cssModules: {
    $style: { container: '_container_1a2b3_1', ... }
  },
  setup() { ... }
}
```

运行时通过 getCurrentInstance 访问 $style。

## 类名生成规则

生成的类名格式通常是：`_[原始类名]_[哈希]_[行号]`。

可以通过配置自定义格式：

```javascript
compileStyle({
  modules: {
    generateScopedName: '[name]__[local]___[hash:base64:5]'
  }
})
```

生产环境可能使用更短的哈希提高压缩效果：`_a1b2c`。

## 组合（Composes）

CSS Modules 支持 composes 关键字，用于复用样式：

```html
<style module>
.base {
  padding: 10px;
  border: 1px solid gray;
}

.button {
  composes: base;
  background: blue;
}
</style>
```

编译后 $style.button 会包含两个类名的组合：

```javascript
$style = {
  base: '_base_1a2b3_1',
  button: '_base_1a2b3_1 _button_1a2b3_5'
}
```

使用 `:class="$style.button"` 会同时应用两个类的样式。

## 全局样式

在 CSS Modules 中声明全局样式使用 :global：

```html
<style module>
:global(.external-class) {
  color: red;
}

.local :global(.nested-global) {
  font-size: 14px;
}
</style>
```

:global() 内的类名不会被转换。这用于覆盖第三方库的样式或定义真正需要全局的规则。

## 多个 CSS Modules

一个组件可以有多个 CSS Modules：

```html
<template>
  <div :class="$style.container">
    <span :class="classes.highlight">Text</span>
  </div>
</template>

<style module>
.container { ... }
</style>

<style module="classes">
.highlight { ... }
</style>
```

第二个 style 块通过 `module="classes"` 指定名称，用 `classes` 代替默认的 `$style` 访问。

## 在 script 中访问

CSS Modules 也可以在 JavaScript 中使用：

```html
<script setup>
import { useCssModule } from 'vue'

const $style = useCssModule()

// 或获取命名模块
const classes = useCssModule('classes')

// 动态使用类名
const className = $style.container
</script>
```

这在需要程序化处理类名时很有用。

## 与 Scoped CSS 的比较

两种方案各有优势：

CSS Modules 的优势：类名完全唯一，不依赖运行时属性；更符合 JavaScript 模块化思维；与其他 CSS Modules 生态兼容。

Scoped CSS 的优势：使用更简单，不需要 :class 绑定；类名保持原样便于调试；有 :deep() 等穿透语法。

实践中的选择：偏好函数式/模块化风格的团队可能喜欢 CSS Modules；习惯传统 CSS 的团队可能更适应 Scoped CSS。两者可以在同一项目中混用。

## TypeScript 支持

CSS Modules 的映射对象可以有类型定义：

```typescript
// shims-css-modules.d.ts
declare module '*.module.css' {
  const classes: { readonly [key: string]: string }
  export default classes
}
```

配合 IDE，可以获得类名的自动补全和类型检查。

Volar 对 Vue SFC 中的 CSS Modules 也有特殊支持，$style.xxx 会有补全提示。

## 条件类名

CSS Modules 与动态类名配合良好：

```html
<template>
  <button 
    :class="[
      $style.button,
      isActive && $style.active,
      { [$style.disabled]: isDisabled }
    ]"
  >
    Click
  </button>
</template>
```

由于类名是字符串，可以使用 Vue 支持的所有类名绑定语法。

## 性能特点

CSS Modules 的性能特点：

选择器是纯类选择器，没有属性选择器的开销。类名可能较长，但 gzip 压缩后差异不大。

运行时需要访问 $style 对象获取类名，有轻微开销。但这个对象是静态的，不会重新计算。

整体性能与 Scoped CSS 相当，在实践中差异可以忽略。

## 小结

CSS Modules 提供了一种模块化的 CSS 组织方式，通过生成唯一类名实现样式隔离。在 Vue 中使用 module 属性启用，通过 $style 对象访问类名映射。与 Scoped CSS 相比，它更符合 JavaScript 模块化思维，但使用上略微繁琐。两种方案可以根据团队偏好选择，也可以在同一项目中混用。CSS Modules 的 composes 功能和 :global 语法提供了必要的灵活性。
