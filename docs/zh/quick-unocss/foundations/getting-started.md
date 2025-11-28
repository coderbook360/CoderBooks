# 快速上手：安装、配置与样式重置

在上一章中，我们了解了 UnoCSS 激动人心的设计哲学和核心优势。现在，是时候卷起袖子，亲手将它运行起来了。本章将为你提供一条清晰、无痛的“Hello World”路径，让你在几分钟内亲眼见证 UnoCSS 的魔力。

我们将以目前与 UnoCSS 集成度最高、体验最流畅的前端构建工具——Vite——为例，来完成我们的第一个 UnoCSS 项目。

## 准备工作：创建一个 Vite 项目

首先，你需要一个全新的 Vite 项目作为实验田。打开你的终端，执行以下命令：

```bash
# 使用 NPM
npm create vite@latest my-unocss-project -- --template vanilla
```

> 你也可以根据自己的喜好选择其他模板，如 `--template vue` 或 `--template react`。本章示例将以 `vanilla`（原生 JavaScript）模板为基础。

命令执行完毕后，根据终端的提示，进入项目目录并安装基础依赖：

```bash
cd my-unocss-project
npm install
```

好了，我们的画布已经准备就绪。

## 第一步：安装依赖

接下来，我们需要为项目安装 UnoCSS 相关的核心依赖。你只需要安装两个包：

```bash
npm install -D unocss @unocss/preset-wind
```

让我们来认识一下这两位新成员：

- **`unocss`**: 这是 UnoCSS 的核心引擎，它本身不包含任何具体的 CSS 规则，只负责扫描代码、生成样式。
- **`@unocss/preset-wind`**: 这是一个“预设”包，它为 UnoCSS 引擎提供了一套丰富的、与 Tailwind CSS 几乎完全一致的工具类规则。我们熟悉的 `flex`, `pt-4`, `text-center` 等都由它提供。

你可以这样理解：`unocss` 是一个空的“播放器”，而 `@unocss/preset-wind` 就是一张包含所有经典曲目的“歌单”。

## 第二步：配置 `vite.config.ts`

安装好依赖后，我们需要在 Vite 的配置中“启用”UnoCSS。打开项目根目录下的 `vite.config.ts` 文件，将其修改为如下内容：

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import UnoCSS from 'unocss/vite'
import { presetWind } from 'unocss'

export default defineConfig({
  plugins: [
    UnoCSS({
      presets: [
        presetWind(),
      ],
    }),
  ],
})
```

这段配置非常直观：
1. 我们从 `unocss/vite` 引入了 UnoCSS 的 Vite 插件。
2. 我们将 `UnoCSS()` 插件实例添加到了 Vite 的 `plugins` 数组中。
3. 在 `UnoCSS()` 插件的配置里，我们告诉它使用我们刚刚安装的 `presetWind()` 这个预设。

至此，Vite 和 UnoCSS 已经成功“握手”。

## 第三步：引入 UnoCSS

配置完成后，最后一步是在我们的项目入口文件中，真正地“注入”UnoCSS 生成的样式。打开 `src/main.js` 文件，在文件的最顶部添加两行代码：

```javascript
// src/main.js
import 'virtual:uno.css'
import '@unocss/reset/tailwind.css'

// 你原有的其他代码，如 import './style.css'
// ...
```

这两行代码至关重要，让我们来解读一下它们的含义：

- **`import 'virtual:uno.css'`**: 这是 UnoCSS 魔法的核心。它并不是一个真实存在的文件，而是一个**虚拟模块**。在开发过程中，UnoCSS 引擎会实时扫描你的所有代码，然后将你用到的工具类动态地生成为 CSS 内容，并通过这个虚拟模块注入到你的应用中。因为是按需生成，所以它永远只包含你需要的样式。

- **`import '@unocss/reset/tailwind.css'`**: 这是一个**样式重置**（也称为 Preflights）文件。它的作用类似于 `normalize.css` 或 `reset.css`，可以抹平不同浏览器之间默认样式的差异，确保你的项目在一个统一、可预测的样式基础上开始。UnoCSS 提供了多种重置方案，`@unocss/reset/tailwind.css` 是与 `preset-wind` 搭配使用的推荐方案。虽然这是可选的，但我们强烈建议你使用它。

## 第四步：应用样式并查看结果

万事俱备！现在，让我们来应用一些样式，看看最终的成果。

打开根目录下的 `index.html` 文件，找到 `<h1>` 标签，为它添加一些来自 `preset-wind` 的工具类：

```html
<!-- index.html -->
<h1 class="text-3xl font-bold text-blue-600 underline">
  Hello UnoCSS!
</h1>
```

保存文件，然后在终端中运行开发服务器：

```bash
npm run dev
```

Vite 会启动一个开发服务器，并为你打开浏览器。此时，你应该能看到页面上显示的 “Hello UnoCSS!” 文本已经应用了我们指定的样式：字体变大、加粗、变成了蓝色，并且带有一条下划线。

![Hello UnoCSS!](https://user-images.githubusercontent.com/8626338/207230399-01a38994-0248-4103-85f0-159c506548a6.png)

恭喜你！你已经成功地搭建并运行了你的第一个 UnoCSS 项目。感受一下那几乎瞬时的启动速度和热更新体验，这正是 UnoCSS 想要带给你的。从这里开始，一个更广阔、更高效的 CSS 世界正在向你敞开。