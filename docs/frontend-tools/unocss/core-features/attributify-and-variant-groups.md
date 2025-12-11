# 代码风格：属性化模式与变体组

在使用原子化 CSS 时，你可能会遇到类名过长的问题。一个元素上堆满几十个类名，不仅难以阅读，也难以维护。

UnoCSS 提供了两种解决方案：属性化模式（Attributify Mode）让你可以用 HTML 属性替代类名，变体组（Variant Groups）让你可以将相同变体下的类合并书写。这两种方式都能显著改善代码的可读性。

本章将详细介绍这两种代码风格，帮助你根据项目需求选择合适的书写方式。

---

## 1. 属性化模式

属性化模式允许你使用 HTML 属性来声明样式，而不是全部塞进 `class` 中。

### 1.1 启用属性化模式

属性化模式通过 `presetAttributify` 预设启用：

```ts
import { defineConfig, presetUno, presetAttributify } from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),
    presetAttributify(),
  ],
})
```

### 1.2 基础用法

启用后，你可以这样写样式：

```html
<!-- 传统 class 写法 -->
<button class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg">
  按钮
</button>

<!-- 属性化写法 -->
<button 
  bg="blue-500 hover:blue-600"
  text="white"
  p="x-4 y-2"
  rounded="lg"
>
  按钮
</button>
```

属性化模式将类名的前缀提取为属性名，后缀作为属性值。这种写法让样式的不同方面一目了然。

### 1.3 属性命名规则

属性名对应工具类的前缀部分。`bg` 对应背景相关的类，`text` 对应文本相关的类，`p` 和 `m` 对应内边距和外边距，`w` 和 `h` 对应宽度和高度，`flex` 和 `grid` 对应布局类，`border` 和 `rounded` 对应边框类。

属性值是去掉前缀后的部分。对于 `bg-blue-500`，属性写法是 `bg="blue-500"`。对于 `text-lg`，属性写法是 `text="lg"`。对于 `px-4 py-2`，可以合并写成 `p="x-4 y-2"`。

### 1.4 无值属性

某些类本身就是完整的，没有值的部分。这时可以使用无值属性：

```html
<div flex items-center justify-between>
  <!-- 等同于 class="flex items-center justify-between" -->
</div>

<span font-bold italic>
  <!-- 等同于 class="font-bold italic" -->
</span>
```

### 1.5 变体支持

属性化模式完全支持变体。变体可以写在属性值中：

```html
<button bg="blue-500 hover:blue-600 dark:blue-400">
  按钮
</button>
```

也可以作为属性前缀：

```html
<button 
  bg="blue-500"
  hover:bg="blue-600"
  dark:bg="blue-400"
>
  按钮
</button>
```

这两种写法是等效的，你可以根据喜好选择。

### 1.6 与 class 混用

属性化模式可以和传统的 `class` 写法混合使用：

```html
<div 
  class="custom-class"
  flex="~ col"
  p="4"
  bg="white dark:gray-800"
>
  内容
</div>
```

这种灵活性让你可以渐进式地采用属性化模式，不需要一次性重写所有代码。

---

## 2. 属性化配置选项

`presetAttributify` 提供了一些配置选项来自定义行为。

### 2.1 前缀设置

如果担心属性名与原生 HTML 属性或其他库冲突，可以设置前缀：

```ts
presetAttributify({
  prefix: 'un-',
})
```

使用时需要带上前缀：

```html
<button 
  un-bg="blue-500"
  un-text="white"
  un-p="x-4 y-2"
>
  按钮
</button>
```

### 2.2 忽略属性

某些属性名可能与已有代码冲突，可以配置忽略列表：

```ts
presetAttributify({
  ignoreAttributes: [
    'flex',  // 如果你用了其他 flex 相关的库
  ],
})
```

### 2.3 严格模式

默认情况下，属性化模式会尝试匹配所有可能的属性。如果你想更严格地控制哪些属性被处理，可以启用严格模式：

```ts
presetAttributify({
  strict: true,
})
```

在严格模式下，只有在预设中明确定义的属性组才会被处理。

### 2.4 别名设置

可以为属性设置别名：

```ts
presetAttributify({
  alias: {
    'flex-center': 'flex items-center justify-center',
  },
})
```

使用：

```html
<div flex-center>内容</div>
```

---

## 3. 属性化模式的优缺点

在决定是否使用属性化模式之前，了解它的优缺点很重要。

### 3.1 优点

属性化模式能显著提升代码可读性。当类名很长时，把它们分散到多个属性中，每个属性负责一个方面的样式，结构更清晰。编辑器的属性自动完成和高亮也能提供更好的支持。

属性化模式与 Vue、Svelte 等框架的模板语法配合良好，在 HTML 属性中书写样式是很自然的事情。对于习惯 Vue 的开发者来说，这种方式会感觉更亲切。

属性化模式还有助于代码组织。相关的样式自然地聚合在一起，背景一块、文字一块、布局一块，一目了然。

### 3.2 缺点

属性化模式增加了学习成本。团队成员需要理解这种新的书写方式，以及属性名和工具类前缀的对应关系。

某些工具和插件可能不完全支持属性化语法。比如一些 CSS 格式化工具、代码检查工具可能无法正确处理这些自定义属性。

在 React 中使用属性化模式需要额外配置，因为 React 默认会警告未知的 DOM 属性。

### 3.3 适用场景

属性化模式特别适合以下场景：Vue、Svelte 等模板框架项目，团队对代码可读性有较高要求，元素上需要声明大量样式的情况。

而在以下情况下可能不太适合：React 项目（除非愿意额外配置），需要与大量第三方库集成，团队对新语法接受度较低。

---

## 4. 变体组

变体组是另一种简化代码的方式，它允许你将相同变体下的多个类合并书写。

### 4.1 启用变体组

变体组通过 `transformerVariantGroup` 转换器启用：

```ts
import { defineConfig, presetUno, transformerVariantGroup } from 'unocss'

export default defineConfig({
  presets: [presetUno()],
  transformers: [transformerVariantGroup()],
})
```

### 4.2 基础用法

变体组使用括号语法将多个类归入同一个变体：

```html
<!-- 传统写法 -->
<div class="hover:bg-blue-500 hover:text-white hover:shadow-lg">

<!-- 变体组写法 -->
<div class="hover:(bg-blue-500 text-white shadow-lg)">
```

括号内的所有类都会应用 `hover:` 变体。

### 4.3 嵌套变体组

变体组可以嵌套使用：

```html
<div class="dark:(hover:(bg-gray-800 text-white) bg-gray-900)">
```

这等同于：

```html
<div class="dark:hover:bg-gray-800 dark:hover:text-white dark:bg-gray-900">
```

### 4.4 复杂组合

变体组可以与普通类混合使用：

```html
<button class="
  px-4 py-2 rounded-lg
  bg-blue-500 text-white
  hover:(bg-blue-600 shadow-lg -translate-y-0.5)
  active:(bg-blue-700 translate-y-0 shadow-none)
  disabled:(opacity-50 cursor-not-allowed hover:(bg-blue-500 shadow-none translate-y-0))
">
  按钮
</button>
```

这种写法清晰地展示了不同状态下的样式变化。

---

## 5. 变体组的使用技巧

### 5.1 按状态组织

变体组最自然的用法是按交互状态组织样式：

```html
<a class="
  text-gray-600
  hover:(text-blue-600 underline)
  focus:(outline-none ring-2 ring-blue-500)
  active:(text-blue-700)
">
  链接文字
</a>
```

### 5.2 响应式组织

也可以按响应式断点组织：

```html
<div class="
  grid grid-cols-1 gap-4
  sm:(grid-cols-2 gap-6)
  md:(grid-cols-3 gap-8)
  lg:(grid-cols-4)
">
  网格内容
</div>
```

### 5.3 暗色模式组织

暗色模式的样式可以统一放在一个变体组中：

```html
<div class="
  bg-white text-gray-900 border-gray-200
  dark:(bg-gray-900 text-white border-gray-700)
">
  内容
</div>
```

### 5.4 混合使用

不同类型的变体组可以混合使用：

```html
<button class="
  px-4 py-2 rounded
  bg-blue-500 text-white
  hover:bg-blue-600
  dark:(bg-blue-600 hover:bg-blue-700)
  md:(px-6 py-3 text-lg)
">
  自适应按钮
</button>
```

---

## 6. 属性化与变体组结合

属性化模式和变体组可以同时使用，创造更灵活的书写方式。

### 6.1 在属性值中使用变体组

```html
<button
  bg="blue-500 hover:(blue-600 shadow-lg) dark:blue-400"
  text="white"
  p="x-4 y-2"
>
  按钮
</button>
```

### 6.2 选择合适的方式

属性化模式适合按样式类型组织（背景、文字、布局），变体组适合按状态组织（悬停、响应式、暗色模式）。在实际项目中，可以根据具体情况灵活选择。

```html
<!-- 主要按类型组织，状态用变体组 -->
<div
  flex="~ col md:row"
  bg="white dark:gray-800"
  p="4 md:6"
  text="gray-800 dark:white hover:(blue-600 dark:blue-400)"
>
  内容
</div>
```

---

## 7. TypeScript 支持

如果你的项目使用 TypeScript，可能需要为属性化模式添加类型支持。

### 7.1 生成类型声明

UnoCSS 可以自动生成属性化模式的类型声明：

```ts
// uno.config.ts
export default defineConfig({
  presets: [
    presetUno(),
    presetAttributify({
      // 生成类型声明文件
    }),
  ],
})
```

### 7.2 Vue 支持

在 Vue 项目中，需要在 `env.d.ts` 或类似文件中添加类型引用：

```ts
/// <reference types="@unocss/preset-attributify/volar" />
```

这样 Vue 模板中的属性化语法就能获得类型检查和自动完成支持。

### 7.3 React 支持

在 React 中使用属性化模式需要额外处理，因为 React 会对未知的 DOM 属性发出警告。一种解决方案是使用前缀，另一种是配置 React 忽略特定前缀的属性。

```ts
// React 配置
presetAttributify({
  prefix: 'un-',
  prefixedOnly: true,  // 只处理有前缀的属性
})
```

---

## 8. 代码风格选择建议

面对多种书写方式，如何选择？

### 8.1 团队一致性优先

无论选择哪种方式，团队内部保持一致是最重要的。混合使用多种风格会增加代码的认知负担。

### 8.2 渐进式采用

不需要一开始就全面采用属性化模式或变体组。可以先在新代码中尝试，积累经验后再决定是否推广。

### 8.3 根据项目特点选择

小型项目或个人项目可以大胆尝试新特性。大型团队项目需要更谨慎，考虑学习成本和工具链支持。Vue 项目可以更放心地使用属性化模式，React 项目可能更适合变体组。

### 8.4 混合策略

很多项目采用混合策略：基础样式用传统 class，复杂状态用变体组，特别长的样式列表用属性化。关键是建立清晰的使用规范。

```html
<!-- 示例：混合策略 -->
<button
  class="btn btn-primary"
  hover:(scale-105 shadow-lg)
  disabled:(opacity-50 cursor-not-allowed)
>
  按钮
</button>
```

---

## 9. 小结

本章介绍了两种改善代码风格的特性。

属性化模式通过 `presetAttributify` 启用，允许使用 HTML 属性声明样式。属性名对应工具类前缀，属性值是去掉前缀后的部分。这种方式让样式的不同方面更加清晰，特别适合 Vue 等模板框架。配置选项包括前缀设置、忽略列表、严格模式等，可以根据项目需求灵活调整。

变体组通过 `transformerVariantGroup` 启用，使用括号语法将多个类归入同一个变体。这种方式减少了变体前缀的重复书写，让代码更简洁。变体组可以嵌套使用，也可以与属性化模式结合。

两种方式各有优缺点。属性化模式提供更好的结构化，但增加了学习成本和工具链适配问题。变体组更容易上手，兼容性也更好。

选择代码风格时，团队一致性是首要考虑因素。可以渐进式采用，在新代码中尝试后再决定是否推广。不同的书写方式可以混合使用，关键是建立清晰的规范。

下一章我们将学习 UnoCSS 的图标系统，这是一个开箱即用的图标解决方案。
