# 主流框架集成指南

UnoCSS 的设计哲学之一是“与框架无关”，它的核心引擎可以独立于任何特定的前端框架运行。这种解耦是通过与现代前端构建工具的深度集成实现的。虽然 Vite 是 UnoCSS 的“一等公民”，提供了最无缝的体验，但这并不意味着你不能在其他环境中享受 UnoCSS 带来的开发便利。

本章将作为一份清晰的“地图”，指导你如何在 Vite 之外的主流前端工具链（如 Webpack, PostCSS）中成功集成 UnoCSS，并介绍如何通过 CLI 在没有构建工具的环境中使用它。

## 1. 前情回顾：Vite (一等公民)

在我们深入其他集成方式之前，让我们快速回顾一下在 Vite 项目中的标准配置。这是官方支持最好、体验最丝滑的方式。

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import UnoCSS from 'unocss/vite'

export default defineConfig({
  plugins: [
    UnoCSS(), // 直接作为 Vite 插件使用
  ],
})
```

然后，在你的项目主入口文件（如 `main.ts`）中引入虚拟模块即可：

```typescript
// src/main.ts
import 'virtual:uno.css'
```

这种简洁的配置得益于 Vite 强大的插件机制。但 UnoCSS 的模块化设计让它同样能轻松适配其他各种构建工具。

## 2. Webpack 集成 (`@unocss/webpack`)

对于使用 Webpack 作为构建工具的项目（例如旧版的 Vue CLI、Create React App 或自定义的 Webpack 配置），你可以使用 `@unocss/webpack` 插件。

**适用场景**：任何基于 Webpack 的项目。

### 安装

```bash
npm install -D @unocss/webpack
```

### 配置

在你的 `webpack.config.js` 文件中，将 UnoCSS 作为一个插件添加进去。

```javascript
// webpack.config.js
const UnoCSS = require('@unocss/webpack').default

module.exports = {
  // ... 其他 Webpack 配置
  plugins: [
    new UnoCSS({
      // 在这里放置你的 UnoCSS 配置，例如 presets
      // presets: [presetUno()]
    })
  ],
  // 如果你使用 webpack-dev-server，确保开启热更新
  devServer: {
    hot: true,
  },
}
```

### 引入 CSS

与 Vite 类似，你也需要在项目的入口文件中引入 `virtual:uno.css` 来注入生成的样式。

```javascript
// src/main.js
import 'virtual:uno.css'
```

## 3. PostCSS 集成 (`@unocss/postcss`)

PostCSS 是一个用 JavaScript 工具和插件转换 CSS 代码的工具。许多现代框架（如 Next.js, Create React App）的底层都依赖于它。`@unocss/postcss` 插件提供了最具通用性的集成方式之一。

**适用场景**：任何使用 PostCSS 处理 CSS 的项目。

### 安装

```bash
npm install -D @unocss/postcss
```

### 配置

在你的 `postcss.config.js` 文件中添加 `@unocss/postcss` 插件。

```javascript
// postcss.config.js
module.exports = {
  plugins: {
    '@unocss/postcss': {
      // 在这里放置你的 UnoCSS 配置
    },
    // ... 其他 PostCSS 插件
  },
}
```

### 关键差异：`@unocss` 指令

这是 PostCSS 方式与 Vite/Webpack 方式最大的不同。你**不再**需要引入 `virtual:uno.css`。取而代之的是，你需要在你的主 CSS 文件（例如 `src/index.css`）的顶部添加一个 `@unocss` 指令。

```css
/* src/index.css */
@unocss;

/* 你其他的全局样式可以写在这里 */
body {
  font-family: sans-serif;
}
```

**工作原理**：当 PostCSS 处理这个 CSS 文件时，`@unocss/postcss` 插件会拦截到 `@unocss;` 指令，然后扫描你的项目代码，并将所有生成的原子化 CSS **注入**到这个指令所在的位置。

## 4. CLI 集成 (`@unocss/cli`)

如果你正在开发一个简单的静态网站，或者在一个不方便引入复杂构建工具的后端模板项目中，`@unocss/cli` 是你的最佳选择。它允许你通过命令行直接扫描文件并生成一个静态的 CSS 文件。

**适用场景**：静态 HTML、后端模板、无构建工具的项目。

### 安装

```bash
npm install -D @unocss/cli
```

### 使用

最常见的使用方式是在 `package.json` 的 `scripts` 中添加命令。

```json
// package.json
{
  "scripts": {
    "uno:build": "unocss \"src/**/*.html\" --out-file dist/uno.css",
    "uno:watch": "unocss \"src/**/*.html\" --out-file dist/uno.css --watch"
  }
}
```

- **`uno:build`**: 这个命令会扫描 `src` 目录下所有的 `.html` 文件，并将生成的 CSS 输出到 `dist/uno.css` 文件中。
- **`uno:watch`**: 这个命令在 `build` 的基础上增加了 `-w` (或 `--watch`) 标志，它会持续监听文件变化，并自动重新生成 `uno.css`。

### 引入 CSS

最后，在你的 HTML 文件中，通过一个标准的 `<link>` 标签引入这个生成的 CSS 文件。

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="dist/uno.css">
</head>
<body>
  <!-- ... -->
</body>
</html>
```

## 5. 特定框架的集成：授人以渔

虽然以上介绍的方法具有很好的通用性，但对于许多现代框架，社区已经提供了封装更好、开箱即用的官方集成包。这些包通常能更好地处理框架的特定机制（如组件作用域、服务端渲染等）。

一些例子包括：
- **Nuxt**: `@unocss/nuxt`
- **SvelteKit**: `@unocss/svelte-scoped`
- **Astro**: `@unocss/astro`
- **Next.js**: 官方文档中有详细的 PostCSS 配置指南。

**强烈建议**：在开始一个新项目时，请**优先查阅 UnoCSS 官方文档的 “Integrations” 部分**。那里有针对各种主流框架和工具的最新、最详细的集成指南。本章提供的是通用的基础知识，而官方集成包提供了针对特定框架的最佳体验。
