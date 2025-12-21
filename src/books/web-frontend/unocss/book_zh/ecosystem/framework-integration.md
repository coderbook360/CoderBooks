# 主流框架集成指南

UnoCSS 可以与几乎所有主流前端框架无缝集成。不同框架有不同的构建工具和文件格式，需要相应的配置方式。

本章将详细介绍如何在 Vite、Vue、React、Nuxt、Next.js、Svelte 等框架中集成 UnoCSS，帮助你快速在任何项目中开始使用。

---

## 1. Vite 项目

Vite 是最简单的集成方式，UnoCSS 为 Vite 提供了官方插件。

### 1.1 安装

```bash
npm install -D unocss
```

### 1.2 配置 Vite

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import UnoCSS from 'unocss/vite'

export default defineConfig({
  plugins: [
    UnoCSS(),
  ],
})
```

### 1.3 创建 UnoCSS 配置

```ts
// uno.config.ts
import { defineConfig, presetUno, presetIcons } from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),
    presetIcons(),
  ],
})
```

### 1.4 引入样式

在入口文件中引入 UnoCSS：

```ts
// main.ts
import 'virtual:uno.css'
```

如果需要 CSS 重置，还可以引入：

```ts
import '@unocss/reset/tailwind.css'
import 'virtual:uno.css'
```

### 1.5 完整示例

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'

export default defineConfig({
  plugins: [
    vue(),
    UnoCSS(),
  ],
})
```

---

## 2. Vue 项目

Vue 项目通常使用 Vite，配置方式与上面相同。这里介绍一些 Vue 特有的配置。

### 2.1 Vue CLI 项目

如果使用 Vue CLI（Webpack）：

```bash
npm install -D @unocss/webpack
```

```js
// vue.config.js
const UnoCSS = require('@unocss/webpack').default

module.exports = {
  configureWebpack: {
    plugins: [
      UnoCSS(),
    ],
  },
}
```

### 2.2 属性化模式类型支持

如果使用属性化模式，添加类型支持：

```ts
// env.d.ts
/// <reference types="@unocss/preset-attributify/volar" />
```

这样 Vue 模板中的属性化语法就能获得类型检查。

### 2.3 Vue 组件中使用

```vue-html
<template>
  <div class="p-4 bg-blue-500 text-white rounded-lg">
    <h1 class="text-2xl font-bold">Hello UnoCSS</h1>
    <button class="mt-4 px-4 py-2 bg-white text-blue-500 rounded hover:bg-gray-100">
      按钮
    </button>
  </div>
</template>
```

### 2.4 Scoped 样式与 @apply

在 Vue 的 scoped 样式中使用 `@apply`：

```vue-html
<style scoped>
.custom-button {
  @apply px-4 py-2 bg-blue-500 text-white rounded;
}
</style>
```

需要确保启用了 `transformerDirectives`。

---

## 3. React 项目

React 项目通常使用 Vite 或 Create React App。

### 3.1 Vite + React

配置与普通 Vite 项目相同：

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import UnoCSS from 'unocss/vite'

export default defineConfig({
  plugins: [
    react(),
    UnoCSS(),
  ],
})
```

### 3.2 Create React App

CRA 需要使用 craco 或 eject 来修改配置：

```bash
npm install -D @craco/craco @unocss/webpack
```

```js
// craco.config.js
const UnoCSS = require('@unocss/webpack').default

module.exports = {
  webpack: {
    plugins: {
      add: [UnoCSS()],
    },
  },
}
```

### 3.3 属性化模式在 React 中的使用

React 默认会对未知的 DOM 属性发出警告。使用属性化模式时，建议添加前缀：

```ts
// uno.config.ts
import { presetAttributify } from 'unocss'

export default defineConfig({
  presets: [
    presetAttributify({
      prefix: 'un-',
      prefixedOnly: true,
    }),
  ],
})
```

使用时带上前缀：

```jsx
<div un-bg="blue-500" un-text="white" un-p="4">
  内容
</div>
```

### 3.4 React 组件示例

```jsx
function Button({ children, variant = 'primary' }) {
  const baseClasses = 'px-4 py-2 rounded-lg font-medium transition-colors'
  const variantClasses = {
    primary: 'bg-blue-500 text-white hover:bg-blue-600',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
  }
  
  return (
    <button className={`${baseClasses} ${variantClasses[variant]}`}>
      {children}
    </button>
  )
}
```

---

## 4. Nuxt 项目

Nuxt 有官方的 UnoCSS 模块，集成非常简单。

### 4.1 安装

```bash
npm install -D @unocss/nuxt
```

### 4.2 配置 Nuxt

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@unocss/nuxt'],
})
```

### 4.3 UnoCSS 配置

创建 `uno.config.ts`，模块会自动加载：

```ts
// uno.config.ts
import { defineConfig, presetUno, presetIcons } from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),
    presetIcons(),
  ],
})
```

### 4.4 模块选项

也可以直接在 Nuxt 配置中配置 UnoCSS：

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@unocss/nuxt'],
  unocss: {
    preflight: true,
    icons: true,
    attributify: true,
    shortcuts: {
      btn: 'px-4 py-2 rounded bg-blue-500 text-white',
    },
  },
})
```

### 4.5 自动导入

Nuxt 模块会自动引入 UnoCSS 的样式，不需要手动在入口文件中引入。

---

## 5. Next.js 项目

Next.js 的集成稍微复杂一些，因为它使用自己的构建系统。

### 5.1 安装

```bash
npm install -D unocss @unocss/webpack
```

### 5.2 配置 Next.js

```js
// next.config.js
const UnoCSS = require('@unocss/webpack').default

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.plugins.push(UnoCSS())
    return config
  },
}

module.exports = nextConfig
```

### 5.3 创建配置文件

```ts
// uno.config.ts
import { defineConfig, presetUno } from 'unocss'

export default defineConfig({
  presets: [presetUno()],
})
```

### 5.4 引入样式

在 `_app.tsx` 或 `layout.tsx` 中引入：

```tsx
// pages/_app.tsx (Pages Router)
import 'uno.css'
import type { AppProps } from 'next/app'

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />
}

// app/layout.tsx (App Router)
import 'uno.css'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  )
}
```

### 5.5 PostCSS 集成

另一种方式是通过 PostCSS 集成：

```bash
npm install -D @unocss/postcss
```

```js
// postcss.config.js
module.exports = {
  plugins: {
    '@unocss/postcss': {},
  },
}
```

---

## 6. Svelte 项目

Svelte 项目通常使用 Vite 或 SvelteKit。

### 6.1 Vite + Svelte

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import UnoCSS from 'unocss/vite'

export default defineConfig({
  plugins: [
    svelte(),
    UnoCSS(),
  ],
})
```

### 6.2 SvelteKit

```ts
// vite.config.ts
import { sveltekit } from '@sveltejs/kit/vite'
import UnoCSS from 'unocss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    UnoCSS(),
    sveltekit(),
  ],
})
```

### 6.3 Svelte 组件示例

```svelte
<script>
  export let count = 0
</script>

<div class="p-4 bg-gray-100 rounded-lg">
  <h1 class="text-2xl font-bold text-gray-800">Counter: {count}</h1>
  <button 
    class="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
    on:click={() => count++}
  >
    Increment
  </button>
</div>

<style>
  /* 可以使用 @apply */
  .custom-class {
    @apply text-red-500 font-bold;
  }
</style>
```

---

## 7. Astro 项目

Astro 是一个现代的静态网站生成器，对 UnoCSS 有很好的支持。

### 7.1 安装

```bash
npm install -D unocss
```

### 7.2 配置

```ts
// astro.config.mjs
import { defineConfig } from 'astro/config'
import UnoCSS from 'unocss/astro'

export default defineConfig({
  integrations: [
    UnoCSS(),
  ],
})
```

### 7.3 特性

Astro 集成支持所有 UnoCSS 特性，包括属性化模式和变体组。由于 Astro 的岛屿架构，UnoCSS 能很好地处理来自不同框架组件的类名。

---

## 8. Webpack 项目

对于纯 Webpack 项目或其他使用 Webpack 的框架。

### 8.1 安装

```bash
npm install -D @unocss/webpack
```

### 8.2 配置

```js
// webpack.config.js
const UnoCSS = require('@unocss/webpack').default

module.exports = {
  plugins: [
    UnoCSS(),
  ],
}
```

### 8.3 引入样式

```js
import 'uno.css'
```

---

## 9. 常见问题解决

### 9.1 样式不生效

如果类名没有生成样式，检查以下几点：是否正确引入了 `virtual:uno.css` 或 `uno.css`，UnoCSS 配置文件是否被正确加载，文件是否在提取范围内，类名是否正确（大小写敏感）。

### 9.2 HMR 不工作

如果热更新不生效，尝试重启开发服务器，检查 Vite 插件顺序（UnoCSS 应该在框架插件之前），清除缓存重新构建。

### 9.3 构建产物过大

如果生成的 CSS 过大，检查是否有过于宽泛的安全列表，是否启用了不需要的预设，是否有重复的规则。

### 9.4 与其他 CSS 工具冲突

UnoCSS 可以与其他 CSS 工具共存。如果有冲突，调整 CSS 层级顺序，使用更具体的选择器，考虑添加类名前缀。

---

## 10. 小结

本章详细介绍了 UnoCSS 在各种框架中的集成方式。

Vite 项目使用官方的 Vite 插件，配置最简单。Vue 项目通常基于 Vite，支持属性化模式的类型检查，scoped 样式中可以使用 `@apply`。React 项目同样基于 Vite 或 CRA，属性化模式建议使用前缀避免 DOM 属性警告。

Nuxt 有官方模块，配置非常简单，会自动引入样式。Next.js 需要使用 Webpack 插件或 PostCSS 集成。Svelte 和 SvelteKit 基于 Vite，配置与普通 Vite 项目相同。Astro 有专门的集成，支持所有特性。

Webpack 项目使用 `@unocss/webpack` 插件，适用于任何使用 Webpack 的场景。

无论使用哪种框架，核心步骤都是相同的：安装依赖，配置构建工具插件，创建 UnoCSS 配置文件，引入生成的样式。

下一章我们将介绍 UnoCSS 的调试利器——Inspector。
