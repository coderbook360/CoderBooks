# 搭建 Mini Vue Router 开发环境

理论准备完成，现在是时候动手了。本章将搭建一个完整的开发环境，为后续实现 Mini Vue Router 打下基础。

## 项目目标

我们要实现的 **Mini Vue Router** 具备以下特性：

**核心功能**：
- ✅ 支持 Hash、History、Memory 三种模式
- ✅ 路由匹配与参数解析
- ✅ 嵌套路由
- ✅ 导航守卫
- ✅ `RouterView` 和 `RouterLink` 组件
- ✅ `useRouter` 和 `useRoute` Hooks

**不实现的功能**：
- ❌ 完整的类型系统（简化版即可）
- ❌ DevTools 集成
- ❌ SSR 优化（但支持 Memory 模式）
- ❌ 所有边界情况处理

目标是：**用 20% 的代码实现 80% 的核心功能**，深入理解设计思想。

## 技术栈选择

**开发语言**：TypeScript
- Vue Router 4 使用 TS 编写
- 类型系统帮助理解接口设计

**构建工具**：Vite
- 快速的开发体验
- 原生 ESM 支持

**测试环境**：Vue 3 项目
- 使用 Composition API
- 实际测试路由功能

## 项目结构设计

```
mini-vue-router/
├── src/
│   ├── history/                  # History 模块
│   │   ├── common.ts             # 通用类型和工具
│   │   ├── html5.ts              # createWebHistory
│   │   ├── hash.ts               # createWebHashHistory
│   │   └── memory.ts             # createMemoryHistory
│   │
│   ├── matcher/                  # Matcher 模块
│   │   ├── index.ts              # createRouterMatcher
│   │   ├── pathMatcher.ts        # 路径匹配
│   │   └── pathParser.ts         # 路径解析
│   │
│   ├── router.ts                 # Router 核心
│   ├── navigationGuards.ts       # 导航守卫
│   ├── location.ts               # 位置处理
│   ├── RouterView.ts             # RouterView 组件
│   ├── RouterLink.ts             # RouterLink 组件
│   ├── useApi.ts                 # Composition API
│   ├── types.ts                  # 类型定义
│   └── index.ts                  # 导出入口
│
├── examples/                     # 测试示例
│   ├── basic/                    # 基础示例
│   ├── guards/                   # 守卫示例
│   └── nested/                   # 嵌套路由示例
│
├── tests/                        # 测试文件
│   └── ...
│
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

这个结构与官方 Vue Router 保持一致，便于对照学习。

## 初始化项目

### 步骤1：创建项目

```bash
# 创建目录
mkdir mini-vue-router
cd mini-vue-router

# 初始化 package.json
npm init -y
```

### 步骤2：安装依赖

```bash
# 安装 Vue 3
npm install vue@3

# 安装开发依赖
npm install -D \
  typescript \
  vite \
  @vitejs/plugin-vue \
  @types/node
```

### 步骤3：配置 TypeScript

创建 `tsconfig.json`：

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "preserve",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 步骤4：配置 Vite

创建 `vite.config.ts`：

```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'MiniVueRouter',
      fileName: (format) => `mini-vue-router.${format}.js`
    },
    rollupOptions: {
      external: ['vue'],
      output: {
        globals: {
          vue: 'Vue'
        }
      }
    }
  }
});
```

### 步骤5：配置 package.json

```json
{
  "name": "mini-vue-router",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/mini-vue-router.umd.js",
  "module": "./dist/mini-vue-router.es.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/mini-vue-router.es.js",
      "require": "./dist/mini-vue-router.umd.js"
    }
  },
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "keywords": ["vue", "router", "mini"],
  "author": "Your Name",
  "license": "MIT"
}
```

## 创建基础类型定义

创建 `src/types.ts`：

```typescript
import { Component } from 'vue';

// ============ Route Location ============

export interface RouteLocationRaw {
  path?: string;
  name?: string;
  params?: Record<string, any>;
  query?: Record<string, any>;
  hash?: string;
}

export interface RouteLocation {
  path: string;
  name?: string;
  params: Record<string, string>;
  query: Record<string, string>;
  hash: string;
  fullPath: string;
  matched: RouteRecord[];
  meta: Record<string, any>;
}

export interface RouteLocationNormalized extends RouteLocation {
  redirectedFrom?: RouteLocationNormalized;
}

// ============ Route Record ============

export interface RouteRecordRaw {
  path: string;
  name?: string;
  component?: Component;
  components?: Record<string, Component>;
  children?: RouteRecordRaw[];
  redirect?: string | RouteLocationRaw;
  alias?: string | string[];
  meta?: Record<string, any>;
  beforeEnter?: NavigationGuard;
}

export interface RouteRecord {
  path: string;
  name?: string;
  regex: RegExp;
  components: Record<string, Component>;
  children: RouteRecord[];
  parent?: RouteRecord;
  meta: Record<string, any>;
  beforeEnter?: NavigationGuard;
}

// ============ Navigation Guard ============

export type NavigationGuardReturn = 
  | void 
  | boolean 
  | RouteLocationRaw 
  | Error;

export type NavigationGuardNext = (
  valid?: boolean | RouteLocationRaw | Error
) => void;

export type NavigationGuard = (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next?: NavigationGuardNext
) => NavigationGuardReturn | Promise<NavigationGuardReturn>;

// ============ Router History ============

export interface RouterHistory {
  readonly location: string;
  readonly state: StateEntry;
  push(to: string, data?: StateEntry): void;
  replace(to: string, data?: StateEntry): void;
  go(delta: number): void;
  listen(callback: NavigationCallback): () => void;
  destroy(): void;
}

export interface StateEntry {
  back: string | null;
  current: string;
  forward: string | null;
  position: number;
  replaced: boolean;
  scroll: { left: number; top: number } | null;
}

export type NavigationCallback = (
  to: string,
  from: string,
  info: NavigationInformation
) => void;

export interface NavigationInformation {
  type: NavigationType;
  direction: NavigationDirection;
  delta: number;
}

export enum NavigationType {
  pop = 'pop',
  push = 'push'
}

export enum NavigationDirection {
  back = 'back',
  forward = 'forward',
  unknown = ''
}

// ============ Router Options ============

export interface RouterOptions {
  history: RouterHistory;
  routes: RouteRecordRaw[];
}

// ============ Router ============

export interface Router {
  readonly currentRoute: RouteLocationNormalized;
  readonly options: RouterOptions;
  
  push(to: RouteLocationRaw): Promise<void>;
  replace(to: RouteLocationRaw): Promise<void>;
  go(delta: number): void;
  back(): void;
  forward(): void;
  
  addRoute(route: RouteRecordRaw): () => void;
  removeRoute(name: string): void;
  hasRoute(name: string): boolean;
  getRoutes(): RouteRecord[];
  
  beforeEach(guard: NavigationGuard): () => void;
  afterEach(guard: NavigationGuard): () => void;
  
  install(app: any): void;
}
```

## 创建入口文件

创建 `src/index.ts`：

```typescript
// 导出类型
export * from './types';

// 导出 History 创建函数
export { createWebHistory } from './history/html5';
export { createWebHashHistory } from './history/hash';
export { createMemoryHistory } from './history/memory';

// 导出 Router 创建函数
export { createRouter } from './router';

// 导出组件
export { RouterView } from './RouterView';
export { RouterLink } from './RouterLink';

// 导出 Composition API
export { useRouter, useRoute } from './useApi';
```

## 创建测试示例

创建 `examples/basic/index.html`：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mini Vue Router - Basic Example</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="./main.ts"></script>
</body>
</html>
```

创建 `examples/basic/main.ts`：

```typescript
import { createApp } from 'vue';
import { createRouter, createWebHistory } from '../../src';
import App from './App.vue';

// 定义路由
const routes = [
  {
    path: '/',
    name: 'Home',
    component: { template: '<div>Home Page</div>' }
  },
  {
    path: '/about',
    name: 'About',
    component: { template: '<div>About Page</div>' }
  }
];

// 创建路由实例
const router = createRouter({
  history: createWebHistory(),
  routes
});

// 创建应用
const app = createApp(App);
app.use(router);
app.mount('#app');
```

创建 `examples/basic/App.vue`：

```vue
<template>
  <div>
    <h1>Mini Vue Router</h1>
    <nav>
      <router-link to="/">Home</router-link>
      <router-link to="/about">About</router-link>
    </nav>
    <main>
      <router-view />
    </main>
  </div>
</template>

<style scoped>
nav {
  display: flex;
  gap: 1rem;
  margin: 1rem 0;
}

nav a {
  padding: 0.5rem 1rem;
  background: #42b883;
  color: white;
  text-decoration: none;
  border-radius: 4px;
}

nav a.router-link-active {
  background: #35495e;
}
</style>
```

## 运行测试

```bash
# 启动开发服务器
npm run dev
```

访问 `http://localhost:5173/examples/basic/`，应该看到应用（目前会报错，因为还没有实现路由）。

## 开发工作流

从下一章开始，我们将按照以下顺序实现：

1. **History 模块**（第5-9章）
   - 实现三种 History 模式
   - 测试 URL 变化和监听

2. **Matcher 模块**（第10-15章）
   - 实现路径解析
   - 实现路由匹配
   - 测试动态路由和嵌套路由

3. **Router 核心**（第16-27章）
   - 实现 `createRouter`
   - 实现导航方法
   - 实现守卫系统

4. **Vue 集成**（第28-33章）
   - 实现 `RouterView` 和 `RouterLink`
   - 实现 Composition API
   - 测试完整应用

**渐进式开发**：每实现一个模块，立即在示例中测试，确保功能正确。

## 调试技巧

### 1. 使用 console.log 追踪

在关键位置添加日志：

```typescript
export function createRouter(options: RouterOptions) {
  console.log('[Router] 创建路由实例', options);
  // ...
}
```

### 2. 使用 Vue Devtools

安装 Vue Devtools 浏览器插件，可以：
- 查看当前路由状态
- 查看路由匹配结果
- 追踪导航历史

### 3. 断点调试

在浏览器开发者工具中设置断点，逐步执行代码。

### 4. 对照官方源码

遇到问题时，打开 Vue Router 4 的源码对照：

```
https://github.com/vuejs/router/tree/main/packages/router/src
```

## 总结

本章完成了开发环境的搭建：

**项目结构**：模块化设计，与官方 Vue Router 一致。

**技术栈**：TypeScript + Vite + Vue 3。

**类型定义**：定义了核心接口，为实现打下基础。

**测试环境**：准备了基础示例，可以实时测试功能。

**开发流程**：渐进式实现，每个模块独立开发和测试。

从下一章开始，我们将进入核心实现，首先从 History 模块开始，这是整个路由系统的基石。
