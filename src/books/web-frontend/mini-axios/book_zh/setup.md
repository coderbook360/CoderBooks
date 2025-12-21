# 项目初始化与环境搭建

在开始编写代码之前，我们需要搭建好开发环境。这一章会帮助你创建一个标准的 TypeScript 库项目结构。

## 本节目标

通过本节学习，你将：

1. **创建标准的 TypeScript 库项目结构**
2. **配置 TypeScript 编译选项**
3. **配置 tsup 构建工具**
4. **配置 Vitest 测试框架**
5. **验证开发环境正确工作**

## 技术栈选择

在开始之前，先了解我们选择的技术栈：

```
开发技术栈
├── 语言：TypeScript
│   └── 原因：类型安全、IDE 支持、自动生成 .d.ts
├── 构建：tsup
│   └── 原因：零配置、速度快（基于 esbuild）、多格式输出
├── 测试：Vitest
│   └── 原因：原生 TS 支持、API 兼容 Jest、速度快
└── 包管理：npm/pnpm/yarn
    └── 推荐 pnpm（速度快、节省磁盘）
```

## 创建项目

首先，创建项目目录并初始化：

```bash
mkdir mini-axios
cd mini-axios
npm init -y
```

## 安装依赖

安装开发依赖（选择你喜欢的包管理器）：

```bash
# 使用 npm
npm install -D typescript tsup vitest @types/node

# 或使用 pnpm（推荐，更快）
pnpm add -D typescript tsup vitest @types/node

# 或使用 yarn
yarn add -D typescript tsup vitest @types/node
```

**依赖说明**：

| 工具 | 用途 | 为什么选择 |
|-----|------|-----------|
| **TypeScript** | 类型检查与编译 | 库开发必备，提供类型安全和智能提示 |
| **tsup** | 打包构建 | 基于 esbuild，零配置、速度快、支持多格式输出 |
| **vitest** | 单元测试 | 原生支持 TypeScript，API 与 Jest 兼容 |
| **@types/node** | Node.js 类型 | 开发 Node.js 适配器时需要 |

## 目录结构

创建以下目录结构：

```
mini-axios/
├── src/
│   ├── index.ts           # 入口文件
│   ├── axios.ts           # Axios 类
│   ├── types.ts           # 类型定义
│   ├── defaults.ts        # 默认配置
│   ├── core/
│   │   ├── dispatchRequest.ts
│   │   ├── InterceptorManager.ts
│   │   └── mergeConfig.ts
│   ├── adapters/
│   │   ├── index.ts
│   │   ├── xhr.ts
│   │   └── http.ts
│   ├── helpers/
│   │   ├── buildURL.ts
│   │   ├── cookies.ts
│   │   └── utils.ts
│   └── cancel/
│       ├── CancelToken.ts
│       └── isCancel.ts
├── test/
│   └── index.test.ts
├── package.json
├── tsconfig.json
└── README.md
```

执行以下命令创建目录：

```bash
mkdir -p src/core src/adapters src/helpers src/cancel test
```

## 配置 TypeScript

创建 `tsconfig.json`：

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2020", "DOM"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

关键配置说明：

| 选项 | 值 | 作用 |
|-----|-----|------|
| `target` | `"ES2020"` | 编译目标版本，支持 `Promise.allSettled`、可选链等特性 |
| `module` | `"ESNext"` | 输出 ES 模块格式，由 tsup 进一步处理 |
| `moduleResolution` | `"bundler"` | 适配打包工具的模块解析策略 |
| `strict` | `true` | 开启所有严格类型检查，库开发必须启用 |
| `declaration` | `true` | 生成 `.d.ts` 类型声明文件，供使用者获得类型提示 |
| `declarationMap` | `true` | 生成声明文件的 source map，方便调试 |

## 配置 package.json

更新 `package.json`：

```json
{
  "name": "mini-axios",
  "version": "0.1.0",
  "description": "A mini implementation of axios",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts --clean",
    "dev": "tsup src/index.ts --format cjs,esm --dts --watch",
    "test": "vitest",
    "test:run": "vitest run"
  },
  "keywords": ["http", "axios", "request"],
  "license": "MIT"
}
```

配置说明：

- `type: "module"`：使用 ES 模块作为默认
- `exports`：现代的包导出方式，同时支持 ESM 和 CommonJS
- `files`：发布时只包含 dist 目录

## 配置 tsup

创建 `tsup.config.ts`（可选，使用默认配置也可以）：

```typescript
// tsup.config.ts

import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],   // 入口文件
  format: ['cjs', 'esm'],    // 输出 CJS 和 ESM 两种格式
  dts: true,                 // 生成类型声明
  clean: true,               // 构建前清理 dist
  splitting: false,          // 不拆分代码
  sourcemap: true,           // 生成 sourcemap
});
```

> **提示**：tsup 基于 esbuild，构建速度极快。对于简单项目，使用命令行参数即可，无需配置文件。

## 创建入口文件

创建 `src/index.ts`，先写一个占位：

```typescript
// src/index.ts

// Mini-Axios 版本号
export const VERSION = '0.1.0';

// 后续章节会逐步完善这个文件
console.log('Mini-Axios is loading...');
```

## 验证环境

运行构建命令，确保环境配置正确：

```bash
npm run build
```

如果一切正常，你会看到 `dist` 目录下生成了：

```
dist/
├── index.js       # ES 模块版本
├── index.cjs      # CommonJS 版本
├── index.d.ts     # 类型声明文件
└── index.js.map   # Sourcemap（调试用）
```

**常见问题排查**：

| 问题 | 可能原因 | 解决方案 |
|------|---------|---------|
| 找不到 tsup 命令 | 依赖未安装 | `npm install` |
| TypeScript 错误 | tsconfig 配置问题 | 检查 include/exclude |
| 无输出文件 | entry 路径错误 | 确认 src/index.ts 存在 |

## 配置测试

创建 `vitest.config.ts`：

```typescript
// vitest.config.ts

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,       // 全局 describe/it/expect
    environment: 'node', // 默认 Node 环境
  },
});
```

创建第一个测试文件 `test/index.test.ts`：

```typescript
// test/index.test.ts

import { describe, it, expect } from 'vitest';
import { VERSION } from '../src/index';

describe('Mini-Axios', () => {
  it('should export VERSION', () => {
    expect(VERSION).toBe('0.1.0');
  });
});
```

运行测试：

```bash
npm test
```

看到绿色的 `✓` 表示测试通过！

## 常见问题解答

### Q: pnpm、npm、yarn 选哪个？

| 工具 | 特点 | 推荐场景 |
|------|------|---------|
| **pnpm** | 最快、节省磁盘 | 新项目首选 |
| **npm** | 官方工具、最普及 | 团队统一使用 npm |
| **yarn** | 稳定、功能丰富 | 已有 yarn 项目 |

### Q: 为什么用 tsup 而不是 webpack/rollup？

tsup 专为 TypeScript 库设计：
- 零配置即可使用
- 基于 esbuild，速度极快
- 自动生成类型声明

webpack/rollup 更适合应用打包。

### Q: 如何添加浏览器环境测试？

在 vitest.config.ts 中：

```typescript
export default defineConfig({
  test: {
    environment: 'jsdom',  // 改为 jsdom
  },
});
```

## 小结

本节我们完成了开发环境的搭建：

```
项目结构
├── src/                    # 源代码目录
│   └── index.ts            # 入口文件
├── test/                   # 测试目录
│   └── index.test.ts       # 测试文件
├── dist/                   # 构建输出（自动生成）
├── package.json            # 项目配置
├── tsconfig.json           # TypeScript 配置
├── tsup.config.ts          # 构建配置
└── vitest.config.ts        # 测试配置
```

**环境检查清单**：

- ✅ TypeScript 配置完成（tsconfig.json）
- ✅ 构建工具配置完成（tsup）
- ✅ 测试框架配置完成（vitest）
- ✅ 目录结构创建完成
- ✅ 构建成功（npm run build）
- ✅ 测试通过（npm test）

下一章，我们将开始编写第一个真正的功能：发送一个 HTTP 请求。
