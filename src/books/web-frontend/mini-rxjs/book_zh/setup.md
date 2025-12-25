---
sidebar_position: 2
title: 项目初始化与环境搭建
---

# 项目初始化与环境搭建

在动手实现 Mini-RxJS 之前，我们需要搭建一个规范的开发环境。一个良好的项目结构不仅能让代码井然有序，更能为后续的开发、测试、发布打下坚实基础。

## 我们要构建什么

首先要明确我们的目标：**构建一个可发布的 npm 包**，而不是一个简单的练习项目。

这意味着我们需要考虑：

- **TypeScript 支持**：提供完整的类型定义
- **模块化设计**：支持 Tree-shaking，按需引入
- **单元测试**：确保每个功能的正确性
- **构建产物**：同时输出 ESM 和 CJS 格式

## 项目初始化

创建项目目录并初始化：

```bash
mkdir mini-rxjs
cd mini-rxjs
pnpm init
```

生成的 `package.json` 需要进行以下调整：

```json
{
  "name": "mini-rxjs",
  "version": "0.0.1",
  "description": "A minimal implementation of RxJS for learning purposes",
  "type": "module",
  "main": "./dist/cjs/index.js",
  "module": "./dist/esm/index.js",
  "types": "./dist/types/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/types/index.d.ts",
      "import": "./dist/esm/index.js",
      "require": "./dist/cjs/index.js"
    },
    "./operators": {
      "types": "./dist/types/operators/index.d.ts",
      "import": "./dist/esm/operators/index.js",
      "require": "./dist/cjs/operators/index.js"
    }
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "dev": "vitest",
    "test": "vitest run",
    "build": "tsup",
    "lint": "eslint src --ext .ts",
    "type-check": "tsc --noEmit"
  },
  "keywords": [
    "rxjs",
    "reactive",
    "observable",
    "stream"
  ],
  "license": "MIT"
}
```

几个关键配置的解释：

- **`"type": "module"`**：声明项目使用 ES Module
- **`exports` 字段**：支持条件导出，让打包工具根据环境选择正确的模块格式
- **`files` 字段**：指定发布到 npm 时包含的文件

## 安装依赖

我们需要以下开发依赖：

```bash
pnpm add -D typescript tsup vitest @types/node eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

各个包的作用：

| 包名 | 作用 |
|------|------|
| typescript | TypeScript 编译器 |
| tsup | 零配置打包工具，基于 esbuild |
| vitest | 快速的单元测试框架 |
| eslint | 代码检查工具 |
| @typescript-eslint/* | TypeScript 的 ESLint 支持 |

## TypeScript 配置

创建 `tsconfig.json`：

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "lib": ["ES2020", "DOM"],
    "types": ["node"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

配置要点：

- **`"strict": true`**：开启严格模式，这对于类型安全至关重要
- **`"moduleResolution": "bundler"`**：适用于现代打包工具的模块解析策略
- **`"declaration": true`**：生成类型声明文件
- **`"lib": ["ES2020", "DOM"]`**：我们需要 DOM API 来处理事件相关功能

## 打包配置

创建 `tsup.config.ts`：

```typescript
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'operators/index': 'src/operators/index.ts'
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  minify: false,
  target: 'es2020',
  outDir: 'dist'
})
```

tsup 会根据这个配置：

- 生成 `dist/esm/` 和 `dist/cjs/` 两个目录
- 自动生成类型声明文件到 `dist/types/`
- 每次构建前清理 dist 目录

## 测试配置

创建 `vitest.config.ts`：

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['**/*.test.ts', '**/index.ts']
    }
  }
})
```

Vitest 的优势在于它与 Vite 生态无缝集成，执行速度极快，并且 API 与 Jest 高度兼容。

## 项目目录结构

根据 RxJS 的模块划分，我们设计如下目录结构：

```
mini-rxjs/
├── src/
│   ├── internal/              # 内部实现（不对外暴露）
│   │   ├── Observable.ts
│   │   ├── Subscriber.ts
│   │   ├── Subscription.ts
│   │   ├── Subject.ts
│   │   └── scheduler/
│   │       ├── Scheduler.ts
│   │       └── AsyncScheduler.ts
│   ├── operators/             # 操作符（按需导入）
│   │   ├── index.ts
│   │   ├── creation/
│   │   │   ├── of.ts
│   │   │   ├── from.ts
│   │   │   └── fromEvent.ts
│   │   ├── transformation/
│   │   │   ├── map.ts
│   │   │   └── scan.ts
│   │   ├── filtering/
│   │   │   ├── filter.ts
│   │   │   └── take.ts
│   │   └── combination/
│   │       ├── merge.ts
│   │       └── combineLatest.ts
│   ├── types/                 # 类型定义
│   │   └── index.ts
│   └── index.ts               # 主入口
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
└── package.json
```

这个结构遵循了几个重要原则：

1. **internal 目录**：核心实现放在 internal 目录，表示这些是内部实现细节
2. **operators 独立**：操作符单独成目录，支持按需引入
3. **types 集中管理**：类型定义集中在 types 目录

## 创建入口文件

首先创建类型定义文件 `src/types/index.ts`：

```typescript
/**
 * 观察者接口 - 接收 Observable 推送的值
 */
export interface Observer<T> {
  next: (value: T) => void
  error: (err: unknown) => void
  complete: () => void
}

/**
 * 部分观察者 - 允许只实现部分回调
 */
export type PartialObserver<T> = Partial<Observer<T>>

/**
 * 订阅函数 - Observable 的核心逻辑
 */
export type SubscribeFunction<T> = (subscriber: Subscriber<T>) => TeardownLogic

/**
 * 清理逻辑 - 取消订阅时执行
 */
export type TeardownLogic = (() => void) | void | Subscription

/**
 * 操作符类型 - 接收 Observable 返回新 Observable
 */
export type OperatorFunction<T, R> = (source: Observable<T>) => Observable<R>

// 前向引用，后续章节会实现
export interface Subscriber<T> extends Observer<T> {
  closed: boolean
  unsubscribe(): void
}

export interface Subscription {
  closed: boolean
  unsubscribe(): void
  add(teardown: TeardownLogic): void
  remove(teardown: TeardownLogic): void
}

export interface Observable<T> {
  subscribe(observer?: PartialObserver<T>): Subscription
  pipe<R>(...operators: OperatorFunction<any, any>[]): Observable<R>
}
```

这些类型定义了 RxJS 的核心概念，我们会在后续章节逐一实现。

接下来创建主入口文件 `src/index.ts`：

```typescript
// 核心类
export { Observable } from './internal/Observable'
export { Subject, BehaviorSubject, ReplaySubject, AsyncSubject } from './internal/Subject'
export { Subscription } from './internal/Subscription'

// 类型导出
export type {
  Observer,
  PartialObserver,
  SubscribeFunction,
  TeardownLogic,
  OperatorFunction
} from './types'

// 创建操作符（常用的直接从主入口导出）
export { of } from './operators/creation/of'
export { from } from './operators/creation/from'
export { fromEvent } from './operators/creation/fromEvent'
export { interval, timer } from './operators/creation/interval-timer'
```

操作符入口文件 `src/operators/index.ts`：

```typescript
// 创建操作符
export { of } from './creation/of'
export { from } from './creation/from'
export { fromEvent } from './creation/fromEvent'
export { interval, timer } from './creation/interval-timer'
export { defer } from './creation/defer'
export { range } from './creation/range'

// 转换操作符
export { map } from './transformation/map'
export { scan } from './transformation/scan'

// 过滤操作符
export { filter } from './transformation/filter'
export { take } from './filtering/take'

// 组合操作符
export { merge } from './combination/merge'
export { combineLatest } from './combination/combineLatest'
```

## 验证项目设置

创建一个简单的占位实现来验证配置是否正确。

创建 `src/internal/Observable.ts`：

```typescript
import type { PartialObserver, SubscribeFunction, OperatorFunction } from '../types'
import type { Subscription } from './Subscription'

export class Observable<T> {
  constructor(private _subscribe?: SubscribeFunction<T>) {}

  subscribe(_observer?: PartialObserver<T>): Subscription {
    // 占位实现，后续章节完善
    throw new Error('Not implemented yet')
  }

  pipe<R>(..._operators: OperatorFunction<any, any>[]): Observable<R> {
    // 占位实现，后续章节完善
    throw new Error('Not implemented yet')
  }
}
```

创建 `src/internal/Subscription.ts`：

```typescript
import type { TeardownLogic } from '../types'

export class Subscription {
  closed = false

  unsubscribe(): void {
    // 占位实现，后续章节完善
    this.closed = true
  }

  add(_teardown: TeardownLogic): void {
    // 占位实现，后续章节完善
  }

  remove(_teardown: TeardownLogic): void {
    // 占位实现，后续章节完善
  }
}
```

创建 `src/internal/Subject.ts`：

```typescript
import { Observable } from './Observable'

export class Subject<T> extends Observable<T> {
  // 占位实现，后续章节完善
}

export class BehaviorSubject<T> extends Subject<T> {
  constructor(_initialValue: T) {
    super()
  }
}

export class ReplaySubject<T> extends Subject<T> {
  constructor(_bufferSize?: number) {
    super()
  }
}

export class AsyncSubject<T> extends Subject<T> {
  // 占位实现，后续章节完善
}
```

为操作符创建占位文件，例如 `src/operators/creation/of.ts`：

```typescript
import { Observable } from '../../internal/Observable'

export function of<T>(..._values: T[]): Observable<T> {
  // 占位实现，后续章节完善
  return new Observable()
}
```

现在运行类型检查，验证配置是否正确：

```bash
pnpm type-check
```

如果没有错误，说明项目配置正确。

## ESLint 配置

创建 `.eslintrc.cjs`：

```javascript
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  env: {
    node: true,
    es2020: true
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 'off', // RxJS 操作符需要使用 any
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': 'warn'
  }
}
```

我们将 `no-explicit-any` 设为 off，因为 RxJS 的某些操作符（如 `pipe`）确实需要使用 `any` 来保持灵活性。

## 创建第一个测试

创建 `src/internal/Observable.test.ts`：

```typescript
import { describe, it, expect } from 'vitest'
import { Observable } from './Observable'

describe('Observable', () => {
  it('should create an Observable instance', () => {
    const observable = new Observable()
    expect(observable).toBeInstanceOf(Observable)
  })

  it('should accept a subscribe function', () => {
    const subscribeFn = () => {}
    const observable = new Observable(subscribeFn)
    expect(observable).toBeInstanceOf(Observable)
  })
})
```

运行测试：

```bash
pnpm test
```

测试通过，项目基础设施搭建完成。

## 本章小结

本章我们完成了 Mini-RxJS 项目的基础设施搭建：

- **项目初始化**：配置 package.json，支持 ESM/CJS 双格式输出
- **TypeScript 配置**：开启严格模式，生成类型声明
- **打包工具**：使用 tsup 实现零配置打包
- **测试框架**：使用 Vitest 进行单元测试
- **目录结构**：按照 internal/operators/types 划分模块
- **入口文件**：定义核心类型和导出结构

现在我们有了一个规范的项目骨架，接下来就可以开始真正的实现工作了。下一章，我们将深入探讨响应式编程的核心思想，为理解 Observable 的设计打下理论基础。

---

**思考题**：

1. 为什么我们需要同时输出 ESM 和 CJS 两种格式？在什么场景下会用到哪种格式？
2. `exports` 字段中的条件导出是如何工作的？打包工具如何决定使用哪个入口？
3. 为什么要把核心实现放在 `internal` 目录下？这样设计有什么好处？
