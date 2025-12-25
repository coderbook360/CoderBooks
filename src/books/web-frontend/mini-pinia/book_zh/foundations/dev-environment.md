---
sidebar_position: 5
title: 开发环境搭建与项目结构
---

# 开发环境搭建与项目结构

从本章开始，我们将动手实现 Mini-Pinia。在编写代码之前，我们需要搭建开发环境并规划项目结构。

一个好的项目结构是高质量代码的基础。让我们从零开始，建立一个专业的开发环境。

## 技术栈选择

我们的 Mini-Pinia 将使用以下技术栈：

- **TypeScript**：提供类型安全和更好的开发体验
- **Vite**：快速的开发服务器和构建工具
- **Vue 3**：作为宿主框架进行测试
- **Vitest**：与 Vite 深度集成的测试框架

为什么选择这些技术？

**TypeScript** 是 Pinia 官方使用的语言，也是现代前端项目的标配。类型系统能帮助我们在开发过程中发现问题，同时提供优秀的 IDE 支持。

**Vite** 提供极快的冷启动和热更新，开发体验极佳。作为 Vue 生态的官方构建工具，与 Vue 3 配合最为默契。

**Vitest** 与 Vite 共享配置，支持 ES Modules，运行速度快，是测试 Vue 项目的最佳选择。

## 创建项目

首先创建一个新的 Vue + TypeScript 项目：

```bash
# 使用 pnpm（推荐）
pnpm create vite mini-pinia --template vue-ts

# 或使用 npm
npm create vite@latest mini-pinia -- --template vue-ts

# 或使用 yarn
yarn create vite mini-pinia --template vue-ts
```

进入项目并安装依赖：

```bash
cd mini-pinia
pnpm install
```

安装测试框架：

```bash
pnpm add -D vitest @vue/test-utils happy-dom
```

## 项目结构规划

让我们规划 Mini-Pinia 的目录结构：

```
mini-pinia/
├── src/
│   ├── pinia/                 # Mini-Pinia 核心实现
│   │   ├── index.ts           # 统一导出
│   │   ├── createPinia.ts     # createPinia 实现
│   │   ├── defineStore.ts     # defineStore 实现
│   │   ├── store.ts           # Store 核心逻辑
│   │   ├── subscriptions.ts   # 订阅系统
│   │   ├── storeToRefs.ts     # storeToRefs 实现
│   │   ├── mapHelpers.ts      # map* 辅助函数
│   │   └── types.ts           # 类型定义
│   │
│   ├── stores/                # 测试用的 Store
│   │   ├── counter.ts
│   │   └── user.ts
│   │
│   ├── components/            # 测试组件
│   │   └── Counter.vue
│   │
│   ├── App.vue
│   └── main.ts
│
├── tests/                     # 测试文件
│   ├── createPinia.test.ts
│   ├── defineStore.test.ts
│   ├── subscriptions.test.ts
│   └── helpers.test.ts
│
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

这个结构遵循几个原则：

1. **模块化**：每个功能点独立成文件，便于维护和测试
2. **渐进实现**：从核心功能开始，逐步扩展
3. **测试友好**：测试文件与源码分离，一一对应

## 配置 TypeScript

更新 `tsconfig.json` 以支持我们的开发需求：

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve",
    
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@pinia/*": ["src/pinia/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.vue", "tests/**/*.ts"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

关键配置说明：

- **strict: true**：启用严格类型检查，捕获更多潜在错误
- **paths**：配置路径别名，方便导入

## 配置 Vite

更新 `vite.config.ts`：

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@pinia': resolve(__dirname, 'src/pinia')
    }
  }
})
```

## 配置 Vitest

创建 `vitest.config.ts`：

```typescript
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['tests/**/*.test.ts']
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@pinia': resolve(__dirname, 'src/pinia')
    }
  }
})
```

更新 `package.json` 添加测试脚本：

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:run": "vitest run"
  }
}
```

## 创建基础类型定义

在 `src/pinia/types.ts` 中定义核心类型：

```typescript
import type { App, Ref, UnwrapRef, ComputedRef } from 'vue'

/**
 * Pinia 实例类型
 */
export interface Pinia {
  /**
   * Vue 应用实例
   */
  _a?: App
  
  /**
   * 已注册的 Store Map
   */
  _s: Map<string, StoreGeneric>
  
  /**
   * 全局状态树
   */
  state: Ref<Record<string, StateTree>>
  
  /**
   * 已注册的插件
   */
  _p: PiniaPlugin[]
  
  /**
   * 安装到 Vue 应用
   */
  install: (app: App) => void
  
  /**
   * 注册插件
   */
  use: (plugin: PiniaPlugin) => Pinia
}

/**
 * 状态树类型
 */
export type StateTree = Record<string | number | symbol, any>

/**
 * Store 泛型类型
 */
export type StoreGeneric = Store<string, StateTree, Record<string, any>, Record<string, any>>

/**
 * Store 类型
 */
export interface Store<
  Id extends string = string,
  S extends StateTree = {},
  G = {},
  A = {}
> {
  /**
   * Store 唯一标识
   */
  $id: Id
  
  /**
   * Store 状态
   */
  $state: UnwrapRef<S>
  
  /**
   * 批量更新状态
   */
  $patch(partialState: Partial<UnwrapRef<S>>): void
  $patch(stateMutator: (state: UnwrapRef<S>) => void): void
  
  /**
   * 重置状态
   */
  $reset(): void
  
  /**
   * 订阅状态变更
   */
  $subscribe(
    callback: SubscriptionCallback<S>,
    options?: SubscribeOptions
  ): () => void
  
  /**
   * 订阅 action 调用
   */
  $onAction(callback: StoreOnActionListener<Id, S, G, A>): () => void
  
  /**
   * 销毁 Store
   */
  $dispose(): void
}

/**
 * 订阅回调类型
 */
export type SubscriptionCallback<S> = (
  mutation: SubscriptionCallbackMutation<S>,
  state: UnwrapRef<S>
) => void

/**
 * 变更类型
 */
export type MutationType = 'direct' | 'patch object' | 'patch function'

/**
 * 变更信息
 */
export interface SubscriptionCallbackMutation<S> {
  type: MutationType
  storeId: string
  events?: any
  payload?: Partial<S>
}

/**
 * 订阅选项
 */
export interface SubscribeOptions {
  detached?: boolean
  flush?: 'pre' | 'post' | 'sync'
}

/**
 * Action 监听器
 */
export type StoreOnActionListener<Id, S, G, A> = (
  context: StoreOnActionListenerContext<Id, S, G, A>
) => void

/**
 * Action 监听器上下文
 */
export interface StoreOnActionListenerContext<Id, S, G, A> {
  name: string
  store: Store<Id, S, G, A>
  args: any[]
  after: (callback: () => void) => void
  onError: (callback: (error: Error) => void) => void
}

/**
 * 插件上下文
 */
export interface PiniaPluginContext {
  pinia: Pinia
  app: App
  store: StoreGeneric
  options: DefineStoreOptions<string, StateTree, any, any>
}

/**
 * 插件类型
 */
export type PiniaPlugin = (context: PiniaPluginContext) => 
  Partial<PiniaCustomProperties> | void

/**
 * 自定义属性扩展接口
 */
export interface PiniaCustomProperties {}

/**
 * defineStore 选项类型
 */
export interface DefineStoreOptions<
  Id extends string,
  S extends StateTree,
  G,
  A
> {
  id?: Id
  state?: () => S
  getters?: G
  actions?: A
}

/**
 * Setup Store 返回类型
 */
export type SetupStoreDefinition<Id extends string, SS> = () => Store<
  Id,
  ExtractStateFromSetup<SS>,
  ExtractGettersFromSetup<SS>,
  ExtractActionsFromSetup<SS>
>

/**
 * 从 Setup 函数返回值提取 State 类型
 */
export type ExtractStateFromSetup<SS> = {
  [K in keyof SS]: SS[K] extends Ref<infer T>
    ? T
    : SS[K] extends ComputedRef<any>
    ? never
    : SS[K] extends (...args: any[]) => any
    ? never
    : SS[K]
}

/**
 * 从 Setup 函数返回值提取 Getters 类型
 */
export type ExtractGettersFromSetup<SS> = {
  [K in keyof SS]: SS[K] extends ComputedRef<infer T> ? T : never
}

/**
 * 从 Setup 函数返回值提取 Actions 类型
 */
export type ExtractActionsFromSetup<SS> = {
  [K in keyof SS]: SS[K] extends (...args: any[]) => any ? SS[K] : never
}
```

这些类型定义是 Mini-Pinia 的骨架。虽然看起来复杂，但每个类型都有其用途：

- **Pinia**：Pinia 实例的完整结构
- **Store**：Store 实例的公共 API
- **PiniaPluginContext**：插件接收的上下文
- **DefineStoreOptions**：Options Store 的配置类型

## 创建入口文件

在 `src/pinia/index.ts` 中统一导出：

```typescript
// 核心函数
export { createPinia } from './createPinia'
export { defineStore } from './defineStore'

// 辅助函数
export { storeToRefs } from './storeToRefs'
export { mapStores, mapState, mapWritableState, mapActions, mapGetters } from './mapHelpers'

// 类型导出
export type {
  Pinia,
  Store,
  StoreGeneric,
  StateTree,
  PiniaPlugin,
  PiniaPluginContext,
  PiniaCustomProperties,
  DefineStoreOptions,
  SubscriptionCallback,
  SubscriptionCallbackMutation,
  SubscribeOptions,
  MutationType,
  StoreOnActionListener,
  StoreOnActionListenerContext
} from './types'
```

## 创建占位实现

为了让项目能够运行，我们先创建占位实现：

```typescript
// src/pinia/createPinia.ts
import type { Pinia } from './types'

export function createPinia(): Pinia {
  // TODO: 实现
  throw new Error('Not implemented')
}
```

```typescript
// src/pinia/defineStore.ts
export function defineStore(
  idOrOptions: any,
  setup?: any,
  setupOptions?: any
): any {
  // TODO: 实现
  throw new Error('Not implemented')
}
```

```typescript
// src/pinia/storeToRefs.ts
export function storeToRefs(store: any): any {
  // TODO: 实现
  throw new Error('Not implemented')
}
```

```typescript
// src/pinia/mapHelpers.ts
export function mapStores(...stores: any[]): any {
  // TODO: 实现
  throw new Error('Not implemented')
}

export function mapState(useStore: any, keys: any): any {
  // TODO: 实现
  throw new Error('Not implemented')
}

export function mapWritableState(useStore: any, keys: any): any {
  // TODO: 实现
  throw new Error('Not implemented')
}

export function mapActions(useStore: any, keys: any): any {
  // TODO: 实现
  throw new Error('Not implemented')
}

export function mapGetters(useStore: any, keys: any): any {
  // TODO: 实现
  return mapState(useStore, keys)
}
```

## 验证环境

确保一切配置正确：

```bash
# 启动开发服务器
pnpm dev

# 运行测试（目前会失败，因为还没有实现）
pnpm test
```

如果开发服务器正常启动，说明环境配置成功。

## 开发策略

在后续章节中，我们将按以下顺序实现 Mini-Pinia：

1. **createPinia**：创建 Pinia 实例，实现全局状态管理
2. **defineStore + useStore**：实现 Store 定义和获取
3. **Options Store**：实现选项式 Store
4. **Setup Store**：实现组合式 Store
5. **Store API**：实现 $patch、$reset、$subscribe 等
6. **辅助函数**：实现 storeToRefs、mapState 等
7. **插件系统**：实现完整的插件机制

每个功能都会遵循 TDD（测试驱动开发）的方式：先写测试，再实现功能。

## 本章小结

本章我们完成了 Mini-Pinia 的开发环境搭建：

1. **技术栈**：TypeScript + Vite + Vue 3 + Vitest

2. **项目结构**：模块化的目录组织，核心代码与测试分离

3. **类型定义**：完整的 TypeScript 类型，为后续实现提供骨架

4. **配置文件**：TypeScript、Vite、Vitest 的配置

5. **开发策略**：渐进式实现，TDD 驱动

现在我们的开发环境已经准备就绪。下一章将开始阅读 Pinia 源码结构，为实现做最后的准备。

---

**下一章**：[Pinia 源码结构导读](source-structure.md)
