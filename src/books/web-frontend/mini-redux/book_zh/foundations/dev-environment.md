# 开发环境搭建与项目结构

在这一章，我们将搭建 Mini-Redux 的开发环境。一个良好的开发环境能让我们专注于代码逻辑，而不是被工具链问题困扰。

## 项目初始化

首先，创建一个新的项目目录并初始化：

```bash
mkdir mini-redux
cd mini-redux
npm init -y
```

## 依赖安装

我们需要安装以下开发依赖：

```bash
# TypeScript 相关
npm install -D typescript @types/node

# 构建工具
npm install -D tsup

# 测试框架
npm install -D vitest

# 代码规范
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
npm install -D prettier
```

## TypeScript 配置

创建 `tsconfig.json`：

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2020"],
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

关键配置说明：

- `strict: true`：开启所有严格类型检查
- `declaration: true`：生成 `.d.ts` 类型声明文件
- `moduleResolution: "bundler"`：使用现代模块解析策略

## 构建配置

创建 `tsup.config.ts`：

```typescript
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: false,
  treeshake: true
})
```

tsup 是一个基于 esbuild 的零配置打包工具，非常适合库开发。

## 测试配置

创建 `vitest.config.ts`：

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/types.ts']
    }
  }
})
```

## package.json 配置

更新 `package.json`：

```json
{
  "name": "mini-redux",
  "version": "1.0.0",
  "description": "A minimal Redux implementation for learning purposes",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.js"
      },
      "require": {
        "types": "./dist/index.d.cts",
        "default": "./dist/index.cjs"
      }
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src --ext .ts",
    "format": "prettier --write src/**/*.ts",
    "typecheck": "tsc --noEmit"
  },
  "keywords": ["redux", "state-management", "flux"],
  "license": "MIT"
}
```

## 项目目录结构

创建以下目录结构：

```
mini-redux/
├── src/
│   ├── index.ts              # 入口文件
│   ├── types.ts              # 类型定义
│   ├── createStore.ts        # 核心 Store
│   ├── createStore.test.ts   # Store 测试
│   ├── combineReducers.ts    # Reducer 组合
│   ├── combineReducers.test.ts
│   ├── bindActionCreators.ts # Action 绑定
│   ├── bindActionCreators.test.ts
│   ├── applyMiddleware.ts    # 中间件
│   ├── applyMiddleware.test.ts
│   ├── compose.ts            # 函数组合
│   └── compose.test.ts
├── tests/
│   └── integration.test.ts   # 集成测试
├── examples/
│   ├── counter/              # 计数器示例
│   └── todos/                # 待办事项示例
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
└── README.md
```

## 初始代码骨架

让我们创建一些初始文件：

### src/types.ts

```typescript
/**
 * Action 必须有 type 属性
 */
export interface Action<T = any> {
  type: T
}

/**
 * 可以携带任意额外属性的 Action
 */
export interface AnyAction extends Action {
  [extraProps: string]: any
}

/**
 * Reducer 函数签名
 */
export type Reducer<S = any, A extends Action = AnyAction> = (
  state: S | undefined,
  action: A
) => S

/**
 * dispatch 函数签名
 */
export type Dispatch<A extends Action = AnyAction> = (action: A) => A

/**
 * 取消订阅函数
 */
export type Unsubscribe = () => void

/**
 * 监听器函数
 */
export type Listener = () => void

/**
 * Store 接口
 */
export interface Store<S = any, A extends Action = AnyAction> {
  getState(): S
  dispatch: Dispatch<A>
  subscribe(listener: Listener): Unsubscribe
  replaceReducer(nextReducer: Reducer<S, A>): void
}

/**
 * Store 增强器
 */
export type StoreEnhancer<Ext = object, StateExt = object> = (
  createStore: StoreCreator
) => StoreCreator<Ext, StateExt>

/**
 * Store 创建器
 */
export type StoreCreator<Ext = object, StateExt = object> = <
  S,
  A extends Action = AnyAction
>(
  reducer: Reducer<S, A>,
  preloadedState?: S
) => Store<S & StateExt, A> & Ext

/**
 * Middleware API
 */
export interface MiddlewareAPI<D extends Dispatch = Dispatch, S = any> {
  dispatch: D
  getState(): S
}

/**
 * Middleware 签名
 */
export type Middleware<S = any, D extends Dispatch = Dispatch> = (
  api: MiddlewareAPI<D, S>
) => (next: D) => (action: any) => any

/**
 * Action Creator
 */
export type ActionCreator<A, P extends any[] = any[]> = (...args: P) => A
```

### src/index.ts

```typescript
// 核心函数
export { createStore } from './createStore'
export { combineReducers } from './combineReducers'
export { bindActionCreators } from './bindActionCreators'
export { applyMiddleware } from './applyMiddleware'
export { compose } from './compose'

// 类型导出
export type {
  Action,
  AnyAction,
  Reducer,
  Dispatch,
  Store,
  Middleware,
  MiddlewareAPI,
  StoreEnhancer,
  ActionCreator,
  Unsubscribe,
  Listener
} from './types'
```

### src/compose.ts

让我们从最简单的模块开始：

```typescript
/**
 * 从右到左组合多个函数
 * compose(f, g, h) 等价于 (...args) => f(g(h(...args)))
 */
export function compose<R>(): (a: R) => R
export function compose<F extends Function>(f: F): F
export function compose<A, R>(f1: (a: A) => R, f2: (...args: any[]) => A): (...args: any[]) => R
export function compose(...funcs: Function[]): Function {
  if (funcs.length === 0) {
    return <T>(arg: T) => arg
  }

  if (funcs.length === 1) {
    return funcs[0]
  }

  return funcs.reduce(
    (a, b) =>
      (...args: any[]) =>
        a(b(...args))
  )
}
```

### src/compose.test.ts

```typescript
import { describe, it, expect } from 'vitest'
import { compose } from './compose'

describe('compose', () => {
  it('returns identity function when no arguments', () => {
    const identity = compose()
    expect(identity(42)).toBe(42)
    expect(identity('hello')).toBe('hello')
  })

  it('returns the single function when one argument', () => {
    const double = (x: number) => x * 2
    const composed = compose(double)
    expect(composed(5)).toBe(10)
  })

  it('composes functions from right to left', () => {
    const add1 = (x: number) => x + 1
    const double = (x: number) => x * 2
    const square = (x: number) => x * x

    // compose(add1, double, square)(2)
    // = add1(double(square(2)))
    // = add1(double(4))
    // = add1(8)
    // = 9
    const composed = compose(add1, double, square)
    expect(composed(2)).toBe(9)
  })

  it('composes multiple functions', () => {
    const a = (x: string) => x + 'a'
    const b = (x: string) => x + 'b'
    const c = (x: string) => x + 'c'

    // compose(a, b, c)('') = 'cba'
    expect(compose(a, b, c)('')).toBe('cba')
  })
})
```

## 验证环境

运行以下命令验证环境是否正确配置：

```bash
# 类型检查
npm run typecheck

# 运行测试
npm run test:run

# 构建
npm run build
```

如果一切正常，你应该看到测试通过，并且在 `dist` 目录下生成了构建产物。

## 开发工作流

日常开发建议的工作流：

1. **启动测试监视模式**：`npm test`（文件变化时自动运行测试）
2. **编写测试**：先写测试用例
3. **实现功能**：让测试通过
4. **重构**：在测试保护下优化代码

这是经典的 TDD（测试驱动开发）流程，非常适合库开发。

## 本章小结

我们完成了 Mini-Redux 的开发环境搭建：

- **TypeScript**：类型安全的开发体验
- **tsup**：快速的构建工具
- **Vitest**：现代化的测试框架
- **清晰的目录结构**：便于维护和扩展

环境准备就绪，从下一章开始，我们将正式进入 Redux 核心概念的实现。

> 下一章，我们将学习 State 状态树的设计理念。
