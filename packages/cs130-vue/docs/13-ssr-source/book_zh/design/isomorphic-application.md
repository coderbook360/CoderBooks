# 同构应用概念

在前面的章节中，我们多次提到"同构"这个词。现在是时候深入理解这个概念了。同构（Isomorphic）是现代 SSR 架构的核心理念，理解它对于理解 Vue SSR 的设计至关重要。

## 什么是同构

"同构"这个术语来源于数学，表示两个结构在某种变换下保持一致。在 Web 开发语境中，同构应用指的是：**同一套代码可以同时在服务器和浏览器中运行，产生一致的结果**。

这听起来很简单，但实际上涉及很深的技术考量。服务器运行的是 Node.js 环境，浏览器运行的是 Web 环境，这两个环境有着本质的差异。让同一套代码在两个环境中都能运行，并且产生一致的渲染结果，需要精心的架构设计。

在同构出现之前，服务端和客户端的代码是完全分离的。PHP 或 Java 负责在服务器上生成 HTML，JavaScript 负责在浏览器中添加交互。这两套代码使用不同的语言，遵循不同的模式，维护成本很高。

Node.js 的出现改变了这一切。当服务器也可以运行 JavaScript 时，一个诱人的可能性出现了：能不能用同一套代码完成服务端渲染和客户端交互？

## 同构架构的核心组成

一个典型的同构应用包含几个关键部分：共享的应用代码、服务端入口、客户端入口，以及构建配置。

共享的应用代码是同构的核心。这部分代码定义了应用的组件、路由、状态管理逻辑，可以在两个环境中运行。

```javascript
// shared/App.vue - 这个组件在服务端和客户端都会使用
<template>
  <div id="app">
    <nav>
      <router-link to="/">Home</router-link>
      <router-link to="/about">About</router-link>
    </nav>
    <router-view />
  </div>
</template>

<script>
export default {
  name: 'App'
}
</script>
```

这个组件本身没有任何环境特定的代码。它只是描述了 UI 结构和数据绑定，无论在哪个环境渲染都会产生相同的结果。

服务端入口负责处理 HTTP 请求，创建应用实例，执行服务端特定的逻辑（如数据预取），然后调用渲染函数生成 HTML。

```javascript
// entry-server.js
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
import App from './shared/App.vue'
import { createRouter } from './shared/router'

export async function render(url) {
  const app = createSSRApp(App)
  const router = createRouter()
  
  app.use(router)
  
  // 设置服务端的路由位置
  await router.push(url)
  await router.isReady()
  
  // 渲染应用
  const html = await renderToString(app)
  
  return { html }
}
```

这段代码展示了服务端入口的核心逻辑。注意我们使用的是 `createSSRApp` 而不是 `createApp`——这是 Vue 3 专门为 SSR 提供的 API，它创建的应用实例针对服务端渲染做了优化。

客户端入口负责在浏览器中"接管"服务端渲染的 HTML。它创建应用实例，挂载到 DOM 上，使页面变得可交互。

```javascript
// entry-client.js
import { createSSRApp } from 'vue'
import App from './shared/App.vue'
import { createRouter } from './shared/router'

const app = createSSRApp(App)
const router = createRouter()

app.use(router)

// 等待路由准备就绪
router.isReady().then(() => {
  // 挂载应用，触发水合
  app.mount('#app')
})
```

客户端入口同样使用 `createSSRApp` 和相同的组件。当调用 `app.mount('#app')` 时，Vue 会检测到 DOM 中已经存在内容，于是进入水合模式而不是重新渲染。

## 环境差异的处理

同构应用面临的最大挑战是两个运行环境的差异。Node.js 和浏览器虽然都运行 JavaScript，但它们的全局对象、可用 API、生命周期模型都不同。

浏览器环境有 `window`、`document`、`navigator` 等全局对象，可以操作 DOM，可以发起 fetch 请求，可以使用 localStorage。Node.js 环境有 `process`、`fs`、`path` 等模块，可以访问文件系统，可以执行操作系统命令，但没有 DOM。

如果共享代码中不小心使用了环境特定的 API，就会在另一个环境中报错。

```javascript
// 错误示例：这段代码在服务端会崩溃
export default {
  data() {
    return {
      // window 在 Node.js 中不存在
      screenWidth: window.innerWidth
    }
  }
}
```

处理这种差异有几种常见的策略。第一种是条件判断：在使用环境特定 API 之前，先检查当前运行环境。

```javascript
export default {
  data() {
    return {
      screenWidth: typeof window !== 'undefined' ? window.innerWidth : 0
    }
  }
}
```

第二种是利用生命周期钩子。Vue 组件的某些生命周期钩子只在客户端执行。`mounted`、`updated`、`beforeUnmount` 等钩子在服务端渲染时不会被调用，因为服务端只生成 HTML 字符串，没有 DOM 挂载的概念。

```javascript
export default {
  data() {
    return {
      screenWidth: 0
    }
  },
  mounted() {
    // mounted 只在客户端执行，可以安全使用浏览器 API
    this.screenWidth = window.innerWidth
    window.addEventListener('resize', this.handleResize)
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.handleResize)
  },
  methods: {
    handleResize() {
      this.screenWidth = window.innerWidth
    }
  }
}
```

这种模式是同构应用中最常用的处理方式。把所有浏览器特定的逻辑放到 `mounted` 或之后的钩子中，就能确保它们只在客户端执行。

第三种是抽象层封装。对于需要在两个环境中都使用但实现不同的功能，可以创建一个抽象层，提供统一的接口，内部根据环境选择不同的实现。

```javascript
// utils/storage.js
const storage = {
  get(key) {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(key)
    }
    // 服务端返回 null 或从其他存储获取
    return null
  },
  set(key, value) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, value)
    }
  }
}

export default storage
```

## 工厂函数模式

同构应用的另一个重要模式是使用工厂函数来创建应用实例。在服务端，每个请求都应该获得一个全新的应用实例。如果多个请求共享同一个实例，就会出现状态污染——一个用户的数据可能泄露给另一个用户。

```javascript
// 错误：直接导出单例
import { createSSRApp } from 'vue'
import App from './App.vue'

// 这个实例会被所有请求共享
export const app = createSSRApp(App)
```

正确的做法是导出一个工厂函数，每次调用都创建新的实例。

```javascript
// 正确：导出工厂函数
import { createSSRApp } from 'vue'
import App from './App.vue'
import { createRouter } from './router'
import { createStore } from './store'

export function createApp() {
  const app = createSSRApp(App)
  const router = createRouter()
  const store = createStore()
  
  app.use(router)
  app.use(store)
  
  return { app, router, store }
}
```

这个工厂函数每次被调用时都会创建全新的 app、router、store 实例。在服务端，每个请求都调用这个函数获取独立的实例；在客户端，整个页面生命周期只调用一次。

路由和状态管理也需要同样的处理。`createRouter` 和 `createStore` 也应该是工厂函数，而不是直接导出单例。这是 Vue 3 的 Vue Router 和 Pinia 的默认设计，就是为了支持同构应用。

## 构建配置

同构应用需要两套构建配置：一套为服务端生成代码，一套为客户端生成代码。

服务端构建的目标是生成可以在 Node.js 中运行的代码。它需要处理 Vue 单文件组件、TypeScript 等语法，但不需要代码分割或资源优化，因为代码运行在服务器上，不需要通过网络传输。

客户端构建的目标是生成可以在浏览器中运行的代码。它需要考虑兼容性、代码分割、资源优化、缓存策略等浏览器环境的特殊需求。

```javascript
// vite.config.js - Vite 的 SSR 配置示例
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  build: {
    ssr: true, // 服务端构建模式
    rollupOptions: {
      input: 'src/entry-server.js'
    }
  }
})
```

Vite 和 Nuxt 这样的现代工具已经封装了大部分构建配置的复杂性。开发者只需要编写应用代码，工具会自动处理两端的构建差异。

## 同构的价值

理解了同构的概念，我们就能更清楚地看到 Vue SSR 的设计目标：让开发者用一套代码、一套心智模型，就能同时实现服务端渲染和客户端交互。

Vue 的组件模型天然适合同构。组件是纯粹的 UI 描述——给定 props 和 state，产生对应的 DOM 结构。这个映射关系在哪个环境执行都是一样的。服务端把这个结构渲染为 HTML 字符串，客户端把它渲染为真实 DOM，核心逻辑是共享的。

在接下来的章节中，我们会探讨同构渲染的具体设计目标，以及 Vue 是如何实现这些目标的。
