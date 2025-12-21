# 项目初始化与环境搭建

在开始编写动画引擎之前，我们需要搭建一个现代化的开发环境。本章将创建一个 TypeScript 项目，配置构建工具和测试框架，为后续开发打下基础。

---

## 1. 技术选型

### 为什么选择 TypeScript

动画引擎涉及大量的配置对象、回调函数和内部状态，TypeScript 的类型系统能够：

- **防止配置错误**：`{ durations: 1 }` 这种拼写错误会被立即发现
- **提供智能提示**：编写 `gsap.to()` 时自动提示可用选项
- **增强代码可读性**：类型即文档

### 为什么选择 tsup

我们选择 [tsup](https://github.com/egoist/tsup) 作为构建工具：

- **零配置**：开箱即用，无需复杂的 webpack/rollup 配置
- **速度快**：基于 esbuild，构建速度极快
- **双格式输出**：同时生成 ESM 和 CJS 格式

### 为什么选择 Vitest

[Vitest](https://vitest.dev/) 是我们的测试框架：

- **兼容 Jest API**：上手成本低
- **原生 ESM 支持**：与现代前端工具链无缝集成
- **快速热重载**：开发体验极佳

---

## 2. 项目初始化

### 创建项目目录

```bash
mkdir mini-gsap
cd mini-gsap
pnpm init
```

### 安装依赖

```bash
# 开发依赖
pnpm add -D typescript tsup vitest @types/node

# 如果需要 DOM 类型
pnpm add -D @vitest/browser
```

### 初始化 TypeScript

```bash
npx tsc --init
```

修改 `tsconfig.json`：

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationDir": "./dist",
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

---

## 3. 项目结构

创建以下目录结构：

```
mini-gsap/
├── src/
│   ├── index.ts          # 入口文件
│   ├── core/
│   │   ├── ticker.ts     # 全局时钟
│   │   ├── tween.ts      # Tween 类
│   │   └── timeline.ts   # Timeline 类
│   ├── easing/
│   │   └── index.ts      # 缓动函数
│   ├── plugins/
│   │   └── css-plugin.ts # CSS 插件
│   └── types/
│       └── index.ts      # 类型定义
├── tests/
│   ├── tween.test.ts
│   └── timeline.test.ts
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── vitest.config.ts
```

---

## 4. 配置构建工具

创建 `tsup.config.ts`：

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: false,
  treeshake: true,
});
```

---

## 5. 配置测试框架

创建 `vitest.config.ts`：

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
```

---

## 6. 配置 package.json

更新 `package.json`：

```json
{
  "name": "mini-gsap",
  "version": "0.1.0",
  "description": "A minimal GSAP-like animation library",
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
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest",
    "test:run": "vitest run",
    "coverage": "vitest run --coverage"
  },
  "keywords": ["animation", "gsap", "tween", "timeline"],
  "license": "MIT"
}
```

---

## 7. 入口文件雏形

创建 `src/index.ts`：

```typescript
// Mini-GSAP 入口文件

// 版本信息
export const version = '0.1.0';

// 核心 API（后续实现）
export const gsap = {
  version,
  
  // 核心方法
  to() {
    console.log('gsap.to() - Coming soon...');
  },
  
  from() {
    console.log('gsap.from() - Coming soon...');
  },
  
  fromTo() {
    console.log('gsap.fromTo() - Coming soon...');
  },
  
  // Timeline 工厂
  timeline() {
    console.log('gsap.timeline() - Coming soon...');
  },
  
  // 插件注册
  registerPlugin() {
    console.log('gsap.registerPlugin() - Coming soon...');
  },
};

// 默认导出
export default gsap;
```

---

## 8. 第一个测试

创建 `tests/setup.test.ts`：

```typescript
import { describe, it, expect } from 'vitest';
import { gsap, version } from '../src';

describe('Mini-GSAP Setup', () => {
  it('should export version', () => {
    expect(version).toBe('0.1.0');
  });

  it('should export gsap object', () => {
    expect(gsap).toBeDefined();
    expect(typeof gsap.to).toBe('function');
    expect(typeof gsap.from).toBe('function');
    expect(typeof gsap.timeline).toBe('function');
  });
});
```

---

## 9. 验证环境

运行以下命令验证环境配置：

```bash
# 构建项目
pnpm build

# 运行测试
pnpm test:run
```

如果看到测试通过的输出，说明开发环境已经就绪。

---

## 小结

本章我们完成了：

- 选择了 TypeScript + tsup + Vitest 技术栈
- 创建了标准的项目结构
- 配置了构建和测试工具
- 编写了入口文件雏形
- 验证了环境可用性

下一章，我们将深入动画的基础原理，理解 Web 动画的底层机制。
