# 工程化：与 Vite 集成

欢迎来到本书的最后一部分：“生态与工具链”。在这一部分，我们将把目光从 UnoCSS 本身扩展到它所处的开发环境中，学习如何将其与现代前端工作流无缝集成，打造极致的开发体验。

[Vite](https://vitejs.dev/) 是一个革命性的前端构建工具，它以其闪电般的冷启动速度和毫秒级的热模块更新（HMR）而闻名。UnoCSS 的设计理念与 Vite 高度契合，因此将它们结合使用是目前最推荐、也是最高效的方案。

本章将指导你如何在一个 Vite 项目中从零开始集成 UnoCSS。

## 1. 安装依赖

首先，你需要安装 UnoCSS 的 Vite 插件 `@unocss/vite` 以及 UnoCSS 核心包。

```bash
npm install -D unocss @unocss/vite
```

## 2. 配置 Vite

接下来，在你的 `vite.config.ts` 文件中引入并使用 UnoCSS 插件。

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue' // 以 Vue 项目为例
import UnoCSS from 'unocss/vite'

export default defineConfig({
  plugins: [
    vue(),
    UnoCSS(), // 直接调用 UnoCSS 插件
  ],
})
```

就这样！`@unocss/vite` 插件会自动处理所有事情。它会：

-   在你的项目中寻找 `uno.config.ts` 或 `unocss.config.ts` 配置文件。
-   根据你的配置，在需要时按需生成 CSS。
-   将生成的 CSS 注入到你的应用中。

## 3. 创建 UnoCSS 配置文件

在你的项目根目录下创建 `uno.config.ts` 文件。这是你定义所有 UnoCSS 规则、预设和快捷方式的地方。

```typescript
// uno.config.ts
import { defineConfig, presetUno } from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),
  ],
  // ... 在这里添加你的其他配置
})
```

## 4. 在主入口文件引入 UnoCSS

最后一步，在你的应用主入口文件（通常是 `main.ts` 或 `main.js`）中，引入 UnoCSS 的“虚拟模块”。

```typescript
// src/main.ts
import { createApp } from 'vue'
import App from './App.vue'

// 引入 UnoCSS
import 'uno.css'

createApp(App).mount('#app')
```

`'uno.css'` 是一个虚拟文件，它并不真实存在于你的文件系统中。Vite 插件会拦截这个导入请求，并在构建时将所有动态生成的 CSS 内容注入到这个“文件”中。这确保了所有的样式都能被正确加载。

## 5. 启动项目，体验魔法

现在，运行你的开发服务器：

```bash
npm run dev
```

当你启动项目后，你会发现：

-   **瞬间启动**：Vite 的原生 ES 模块支持和 UnoCSS 的按需设计，让你的项目几乎可以立即启动。
-   **毫秒级热更新**：在你修改任何组件中的工具类时，页面会以肉眼几乎无法察觉的速度更新，无需等待。

这个工作流完美体现了 UnoCSS 的核心价值：在提供强大功能的同时，绝不牺牲开发者的幸福感。

## 总结

将 UnoCSS 与 Vite 集成是一个简单直接的过程，但它带来的开发体验提升是巨大的。

-   通过 `@unocss/vite` 插件，UnoCSS 可以无缝接入 Vite 的构建流程。
-   在 `main.ts` 中引入虚拟的 `uno.css` 模块是让样式生效的关键一步。
-   Vite + UnoCSS 的组合为你提供了当今前端领域最顶级的开发效率和体验。

在下一章，我们将探讨如何通过 VS Code 插件，让 UnoCSS 的开发体验更上一层楼，实现智能提示、悬停预览等强大功能。