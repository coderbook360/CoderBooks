# 快速上手：安装、配置与样式重置

假设你刚接手一个新项目，技术栈是 Vite + Vue，团队决定用 UnoCSS 来处理样式。你需要在半小时内完成基础配置，让团队成员可以开始用 `text-red-500`、`flex`、`p-4` 这些类名写样式。

本章就是帮你完成这件事。但我们不仅仅是"跑通一个 demo"——在配置的过程中，你会理解每一步的**工程意义**：为什么要这样配置？这个选项解决了什么问题？

---

## 1. 选择接入方式

UnoCSS 本身不绑定框架，但在实际项目中，我们需要通过构建工具接入。

思考一下，构建工具在这里扮演什么角色？

**它负责在开发和构建阶段，扫描你的代码，找出所有类名，然后交给 UnoCSS 生成对应的 CSS。**

主流的接入方式主要有三种。第一种是 Vite 插件 `@unocss/vite`，这是推荐方案，性能最好。第二种是 Webpack 插件 `@unocss/webpack`，适合仍在使用 Webpack 的项目。第三种是 CLI 方式，独立运行，适合自定义流程。

在现代前端项目中，Vite 已经足够普遍，因此本章以 **Vite + UnoCSS** 为例。如果你用 Webpack 或其他工具，原理是一样的，只是插件不同。

### 1.1 初始化 Vite 项目

如果你还没有现成项目，用 Vite 快速初始化一个：

```bash
npm create vite@latest unocss-demo -- --template vue-ts
cd unocss-demo
npm install
```

这会创建一个最小的 Vue + TypeScript 项目。**但请注意**：UnoCSS 不依赖 Vue，React、Svelte、Solid 等项目的接入方式几乎一样，差异主要在框架自己的代码结构。

---

## 2. 安装依赖：为什么是这几个包？

现在要问第二个问题：**安装 UnoCSS 需要哪些包？为什么？**

UnoCSS 的设计理念是**一切皆插件化**。核心引擎很小，具体能力通过预设（preset）提供。

最小可用安装：

```bash
npm install -D unocss @unocss/vite @unocss/preset-uno
```

这三个包分别是什么？`unocss` 是核心引擎，负责规则匹配和 CSS 生成。`@unocss/vite` 是 Vite 插件，负责在构建流程中调用引擎。`@unocss/preset-uno` 是预设，提供一套兼容 Tailwind 风格的工具类。

**注意这里有一个工程决策**：我们只安装 `preset-uno`，不急着装 icons、attributify 等其他预设。为什么？因为**好的工程实践是按需引入**。先用最小配置跑通，确认理解了基础机制，再逐步添加新能力。这比"先装一堆再慢慢删"要高效得多。

另外，使用 `-D` 安装到 devDependencies，因为 UnoCSS 只在开发和构建阶段工作，不会进入运行时代码。

---

## 3. 配置文件：理解核心抽象

现在要问第三个问题：**配置文件里写的东西是什么意思？**

在项目根目录新建 `uno.config.ts`：

```ts
// uno.config.ts
import { defineConfig, presetUno } from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),
  ],
})
```

这份配置只有几行，但它体现了 UnoCSS 的核心设计。让我拆解给你看。

`defineConfig` 提供类型推导和 IDE 提示。你可能会问"我不用 TypeScript 行不行"？当然行，但有类型提示写配置会快很多，特别是当你需要查看预设有哪些选项时。

`presets` 数组是 UnoCSS 能力的来源。每个预设（Preset）内部包含规则（rules）定义类名如何映射为 CSS，变体（variants）定义 `hover:`、`md:` 等前缀如何工作，主题（theme）定义设计 token 如颜色和间距，以及快捷方式（shortcuts）作为复合类名的别名。

`presetUno()` 帮我们带来了一套兼容 Tailwind 风格的工具类集合。**这意味着你可以直接用 `flex`、`p-4`、`text-red-500` 这些类名，不需要自己定义规则。**

在后续"核心概念"章节中，我们会详细拆解规则、变体、主题的机制。现在只需要知道：**预设是能力的集合，你可以按需组合多个预设**。

---

## 4. 接入 Vite：让 UnoCSS 参与构建

配置文件写好了，但 Vite 还不知道要用它。我们需要在 Vite 配置中引入 UnoCSS 插件。

打开 `vite.config.ts`：

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'

export default defineConfig({
  plugins: [
    vue(),
    UnoCSS(),  // 新增
  ],
})
```

关键点说明：`UnoCSS()` 会自动读取同级目录下的 `uno.config.ts`，不需要手动传入配置。插件顺序一般放在框架插件之后，无需过度纠结。**你不需要显式引入生成的 CSS 文件**，UnoCSS 会通过虚拟模块机制注入。

现在启动开发服务器：

```bash
npm run dev
```

如果一切顺利，此时你已经可以在组件里使用类似 `text-red-500`、`flex` 等类名了。

**但是等等，还有一个问题**——你写了类名，UnoCSS 生成了 CSS，但这个 CSS 怎么进入页面的？

---

## 5. 引入生成的样式：`uno.css` 是什么？

现在要问第四个问题：**UnoCSS 生成的 CSS 去哪了？怎么让它生效？**

答案是：你需要在入口文件中引入一个"虚拟模块"。

打开 `src/main.ts`（或你项目的入口文件）：

```ts
// main.ts
import { createApp } from 'vue'
import App from './App.vue'

import 'uno.css'  // 新增

createApp(App).mount('#app')
```

**这里有一个关键概念需要理解**：`'uno.css'` 不是项目里真实存在的文件，而是 UnoCSS 插件在编译阶段注入的**虚拟模块**。

当 Vite 遇到 `import 'uno.css'` 时，UnoCSS 插件会拦截这个请求，返回它扫描源码后生成的 CSS 内容。

**有没有感觉这很巧妙？** 这种设计意味着你不需要配置输出路径，不需要手动把 CSS 文件加到 HTML 里，开发时改动类名 CSS 自动热更新。

---

## 6. 样式重置：为什么需要？怎么选？

现在要问第五个问题：**为什么很多项目都要引入"样式重置"？**

思考一下，浏览器默认会给 HTML 元素加样式。比如 `<h1>` 默认有很大的字号和 margin，`<ul>` 默认有 padding 和 list-style，而且不同浏览器的默认样式还不一样。

如果不处理这些默认样式，你的页面在不同浏览器上会长得不一样，而且原子类的效果会被默认样式干扰。

**所以我们需要一个"样式重置"（Reset CSS），把浏览器的默认样式抹平。**

### 6.1 使用 @unocss/reset

UnoCSS 提供了配套的重置样式包：

```bash
npm install -D @unocss/reset
```

然后在入口文件中引入：

```ts
// main.ts
import { createApp } from 'vue'
import App from './App.vue'

import '@unocss/reset/tailwind.css'  // 新增：重置样式
import 'uno.css'

createApp(App).mount('#app')
```

**注意引入顺序**：重置样式要在 `uno.css` 之前，这样你的工具类才能覆盖重置样式。

`@unocss/reset` 提供了几种预设的重置方案。`tailwind.css` 与 Tailwind Reset 类似，是最常用的选择。`normalize.css` 是经典的 Normalize.css。`eric-meyer.css` 则是 Eric Meyer 的经典 Reset。

### 6.2 重置策略的选择

**在什么情况下用什么重置？**

对于新项目或后台管理系统，直接用 `tailwind.css` 即可，开箱即用。

对于已有大型项目，先评估现有 Reset 与 UnoCSS 的兼容性，避免重复覆盖。如果项目已经有自己的基础样式，可能不需要再引入 Reset。

对于使用 UI 框架的项目（如 Element Plus、Naive UI），这些框架通常自带 Reset，你可能不需要再引入一份。

**记住一个原则：Reset 的目的是"统一默认"，不是"样式归零"。** 选择适合你项目的方案就好。

---

## 7. 验证：按需生成是不是真的生效了？

配置完成后，让我们做一个简单的实验，验证 UnoCSS 的按需生成机制。

首先，在某个组件中写入类名：

```vue
<!-- App.vue -->
<template>
  <div class="p-4">
    <button class="px-4 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-600">
      UnoCSS Button
    </button>
  </div>
</template>
```

然后启动开发服务器，打开浏览器开发者工具，查看 CSS。你应该能看到只包含与这几个类名相关的规则：`p-4` 对应 `padding: 1rem`，`px-4` 对应 `padding-left/right: 1rem`，`bg-blue-500` 对应具体的背景色，`hover:bg-blue-600` 对应带 `:hover` 伪类的规则。**没有使用的工具类不会出现在产物中。**

接下来，删除按钮，保留空容器：

```vue
<template>
  <div class="p-4">
    <!-- 按钮已删除 -->
  </div>
</template>
```

再看 CSS，与按钮相关的样式全部消失，只剩下 `p-4` 的规则。

**这就是"按需生成"的含义**：CSS 规则与源码中的类名一一对应，不会产生"历史遗留"的无用样式。

---

## 8. 常见问题与排查思路

在实际接入过程中，可能会遇到一些问题。我来帮你预判几个常见的坑。

### 8.1 类名写了但样式不生效

这是最常见的问题。排查顺序如下：首先确认 Vite 配置里 `UnoCSS()` 插件是否添加到 `plugins` 数组。其次确认入口文件中 `import 'uno.css'` 是否写了。然后确认类名拼写，是 `bg-blue-500` 还是 `bg-blue500`？少了个 `-` 就不匹配了。最后确认预设支持，你用的类名在 `presetUno()` 中是否存在。

如果以上都没问题，可以用 Inspector 工具（后续章节会介绍）查看类名匹配情况。

### 8.2 动态拼接的类名不生效

比如这样的代码：

```vue
<div :class="`text-${size}`">
  ...
</div>
```

UnoCSS 在构建时基于**静态分析**提取类名。对于完全运行时才能确定的字符串，它无法识别。

**怎么解决？**

第一个方案是改为有限集合映射：

```ts
const sizeClassMap = {
  small: 'text-sm',
  medium: 'text-base',
  large: 'text-lg',
} as const

// 模板中
<div :class="sizeClassMap[size]">
```

这样 UnoCSS 能在代码中扫描到 `text-sm`、`text-base`、`text-lg` 这些完整字符串。

第二个方案是使用 safelist：

```ts
// uno.config.ts
export default defineConfig({
  safelist: ['text-sm', 'text-base', 'text-lg'],
})
```

safelist 里的类名会**强制生成**，无论代码中是否出现。

**但这也有代价**：safelist 太多会失去"按需生成"的优势。所以优先用第一个方案。

### 8.3 自定义设计 token 怎么办？

你的设计师说："我们的间距是 12px、16px、24px，不是 Tailwind 那套。"

**没问题**，UnoCSS 不强制你用任何 scale。在 `uno.config.ts` 的 `theme` 中自定义：

```ts
export default defineConfig({
  presets: [presetUno()],
  theme: {
    spacing: {
      'sm': '12px',
      'md': '16px',
      'lg': '24px',
    }
  }
})
```

然后你就可以用 `p-sm`、`m-md`、`gap-lg` 这些类名了。

**这就是 UnoCSS "无主见引擎"的体现**：预设提供默认值，但你可以完全覆盖。

---

## 9. 小结

本章我们完成了 UnoCSS 的最小工程接入，并在过程中理解了几个关键点。

在安装依赖方面，核心引擎加 Vite 插件加预设，三件套组成最小配置。按需引入，不要一上来就装一堆。

在配置文件方面，`uno.config.ts` 是系统中枢，通过 `presets` 集中启用能力。预设内部包含规则、变体、主题等抽象。

在样式入口方面，`'uno.css'` 是虚拟模块，由插件在编译阶段注入。配合 Reset 使用，注意引入顺序。

在按需生成方面，类名与 CSS 一一对应，删除类名 CSS 也消失。这是 UnoCSS 的核心能力，也是它比传统方案更高效的原因。

下一章"核心概念：规则、预设与变体"，我们会深入 UnoCSS 的抽象模型——**规则如何匹配类名？预设如何组织能力？变体如何与 `hover:`、`md:` 这些前缀结合？** 理解这些，你就能从"会用"进阶到"能定制"。
