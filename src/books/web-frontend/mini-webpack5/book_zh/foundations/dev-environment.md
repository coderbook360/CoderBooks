# 开发环境搭建与项目结构

在开始实现 Mini-Webpack 之前，我们需要搭建一个合适的开发环境。好的开发环境能让我们事半功倍。

本章将完成以下工作：
1. 初始化项目结构
2. 配置 TypeScript 开发环境
3. 设置测试框架
4. 准备调试工具

## 项目初始化

首先创建项目目录并初始化：

```bash
mkdir mini-webpack
cd mini-webpack
npm init -y
```

### 安装开发依赖

```bash
# TypeScript 相关
npm install -D typescript @types/node ts-node

# 测试框架
npm install -D vitest

# 代码质量
npm install -D eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser

# 构建工具
npm install -D tsup
```

### 运行时依赖

```bash
# AST 解析
npm install acorn acorn-walk

# 工具库
npm install neo-async
```

为什么选择这些工具？

- **TypeScript**：类型系统能帮助我们更好地理解代码结构
- **Vitest**：与 Jest 兼容的现代测试框架，速度快
- **Acorn**：Webpack 使用的 JavaScript 解析器
- **neo-async**：比原生 async 更高效的异步控制库

## 项目结构

我们采用模块化的项目结构，便于理解和维护：

```
mini-webpack/
├── src/
│   ├── index.ts              # 入口文件
│   ├── Compiler.ts           # 编译器核心
│   ├── Compilation.ts        # 编译过程
│   ├── tapable/              # Tapable 事件系统
│   │   ├── index.ts
│   │   ├── Hook.ts
│   │   ├── SyncHook.ts
│   │   ├── SyncBailHook.ts
│   │   └── ...
│   ├── module/               # 模块系统
│   │   ├── Module.ts
│   │   ├── NormalModule.ts
│   │   └── ...
│   ├── factory/              # 模块工厂
│   │   ├── NormalModuleFactory.ts
│   │   └── ...
│   ├── resolver/             # 模块解析器
│   │   ├── Resolver.ts
│   │   └── ...
│   ├── loader/               # Loader 系统
│   │   ├── LoaderRunner.ts
│   │   └── ...
│   ├── parser/               # 语法解析器
│   │   ├── JavascriptParser.ts
│   │   └── ...
│   ├── dependency/           # 依赖系统
│   │   ├── Dependency.ts
│   │   └── ...
│   ├── chunk/                # Chunk 系统
│   │   ├── Chunk.ts
│   │   ├── ChunkGroup.ts
│   │   └── ...
│   ├── generator/            # 代码生成
│   │   ├── Generator.ts
│   │   └── ...
│   ├── plugin/               # 内置插件
│   │   └── ...
│   └── utils/                # 工具函数
│       └── ...
├── test/                     # 测试文件
│   ├── tapable/
│   ├── compiler/
│   └── fixtures/             # 测试用例文件
├── examples/                 # 示例项目
│   └── basic/
├── tsconfig.json
├── vitest.config.ts
├── package.json
└── README.md
```

## TypeScript 配置

创建 `tsconfig.json`：

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Node",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "resolveJsonModule": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

关键配置说明：

- `target: ES2020`：使用现代 JavaScript 特性
- `module: ESNext`：使用 ES Module 输出
- `strict: true`：启用严格类型检查
- `declaration: true`：生成类型声明文件

## 测试环境配置

创建 `vitest.config.ts`：

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts']
    },
    testTimeout: 10000
  }
});
```

## 入口文件结构

创建 `src/index.ts`：

```typescript
// 导出核心类
export { Compiler } from './Compiler';
export { Compilation } from './Compilation';

// 导出 Tapable
export * from './tapable';

// 导出模块相关
export { Module } from './module/Module';
export { NormalModule } from './module/NormalModule';

// 导出工厂
export { NormalModuleFactory } from './factory/NormalModuleFactory';

// 导出解析器
export { Resolver } from './resolver/Resolver';

// webpack 函数
export function webpack(config: WebpackConfiguration): Compiler {
  const compiler = new Compiler(config);
  return compiler;
}

// 类型定义
export interface WebpackConfiguration {
  entry?: string | string[] | Record<string, string>;
  output?: {
    path?: string;
    filename?: string;
    publicPath?: string;
  };
  module?: {
    rules?: Rule[];
  };
  plugins?: Plugin[];
  resolve?: ResolveOptions;
  mode?: 'development' | 'production' | 'none';
}

export interface Rule {
  test?: RegExp;
  include?: string | string[];
  exclude?: string | string[];
  use?: string | Loader | (string | Loader)[];
}

export interface Loader {
  loader: string;
  options?: Record<string, unknown>;
}

export interface Plugin {
  apply(compiler: Compiler): void;
}

export interface ResolveOptions {
  extensions?: string[];
  alias?: Record<string, string>;
  modules?: string[];
  mainFields?: string[];
}
```

## package.json 脚本

更新 `package.json`：

```json
{
  "name": "mini-webpack",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsup src/index.ts --format esm,cjs --dts",
    "dev": "tsup src/index.ts --format esm --dts --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src --ext .ts",
    "typecheck": "tsc --noEmit"
  }
}
```

## 创建基础骨架

让我们创建几个核心类的基础骨架：

### Compiler 骨架

创建 `src/Compiler.ts`：

```typescript
import { AsyncSeriesHook, SyncHook, SyncBailHook } from './tapable';
import { Compilation } from './Compilation';
import type { WebpackConfiguration } from './index';

export class Compiler {
  public options: WebpackConfiguration;
  public context: string;
  public hooks: {
    initialize: SyncHook<[]>;
    beforeRun: AsyncSeriesHook<[Compiler]>;
    run: AsyncSeriesHook<[Compiler]>;
    compile: SyncHook<[CompilationParams]>;
    compilation: SyncHook<[Compilation, CompilationParams]>;
    make: AsyncSeriesHook<[Compilation]>;
    afterCompile: AsyncSeriesHook<[Compilation]>;
    emit: AsyncSeriesHook<[Compilation]>;
    afterEmit: AsyncSeriesHook<[Compilation]>;
    done: AsyncSeriesHook<[Stats]>;
    failed: SyncHook<[Error]>;
  };

  constructor(options: WebpackConfiguration) {
    this.options = options;
    this.context = process.cwd();
    
    this.hooks = {
      initialize: new SyncHook([]),
      beforeRun: new AsyncSeriesHook(['compiler']),
      run: new AsyncSeriesHook(['compiler']),
      compile: new SyncHook(['params']),
      compilation: new SyncHook(['compilation', 'params']),
      make: new AsyncSeriesHook(['compilation']),
      afterCompile: new AsyncSeriesHook(['compilation']),
      emit: new AsyncSeriesHook(['compilation']),
      afterEmit: new AsyncSeriesHook(['compilation']),
      done: new AsyncSeriesHook(['stats']),
      failed: new SyncHook(['error'])
    };
  }

  async run(): Promise<Stats> {
    // TODO: 实现编译流程
    throw new Error('Not implemented');
  }
}

export interface CompilationParams {
  normalModuleFactory: unknown;
}

export interface Stats {
  compilation: Compilation;
  hasErrors(): boolean;
  hasWarnings(): boolean;
}
```

### Compilation 骨架

创建 `src/Compilation.ts`：

```typescript
import { SyncHook, AsyncSeriesHook, SyncBailHook } from './tapable';
import type { Compiler } from './Compiler';

export class Compilation {
  public compiler: Compiler;
  public hooks: {
    buildModule: SyncHook<[Module]>;
    succeedModule: SyncHook<[Module]>;
    finishModules: AsyncSeriesHook<[Module[]]>;
    seal: SyncHook<[]>;
    optimizeModules: SyncBailHook<[Module[]], boolean | undefined>;
    afterOptimizeModules: SyncHook<[Module[]]>;
    optimizeChunks: SyncBailHook<[Chunk[]], boolean | undefined>;
    afterOptimizeChunks: SyncHook<[Chunk[]]>;
    processAssets: AsyncSeriesHook<[Assets]>;
  };
  
  public modules: Set<Module>;
  public chunks: Set<Chunk>;
  public assets: Assets;
  public entries: Map<string, EntryData>;

  constructor(compiler: Compiler) {
    this.compiler = compiler;
    
    this.hooks = {
      buildModule: new SyncHook(['module']),
      succeedModule: new SyncHook(['module']),
      finishModules: new AsyncSeriesHook(['modules']),
      seal: new SyncHook([]),
      optimizeModules: new SyncBailHook(['modules']),
      afterOptimizeModules: new SyncHook(['modules']),
      optimizeChunks: new SyncBailHook(['chunks']),
      afterOptimizeChunks: new SyncHook(['chunks']),
      processAssets: new AsyncSeriesHook(['assets'])
    };
    
    this.modules = new Set();
    this.chunks = new Set();
    this.assets = {};
    this.entries = new Map();
  }

  async addEntry(entry: string, name: string): Promise<void> {
    // TODO: 实现入口添加
  }

  async buildModule(module: Module): Promise<Module> {
    // TODO: 实现模块构建
    throw new Error('Not implemented');
  }

  seal(): void {
    // TODO: 实现封装阶段
  }
}

export interface Module {
  identifier(): string;
  build(): Promise<void>;
}

export interface Chunk {
  id: string | number | null;
  name: string;
  modules: Set<Module>;
}

export interface Assets {
  [filename: string]: Source;
}

export interface Source {
  source(): string;
  size(): number;
}

export interface EntryData {
  dependencies: unknown[];
  options: unknown;
}
```

## 测试用例结构

创建测试目录结构：

```
test/
├── tapable/
│   ├── SyncHook.test.ts
│   ├── SyncBailHook.test.ts
│   └── ...
├── compiler/
│   ├── basic.test.ts
│   └── ...
└── fixtures/
    └── basic/
        ├── src/
        │   ├── index.js
        │   └── utils.js
        └── expected/
            └── main.js
```

创建一个简单的测试示例 `test/tapable/SyncHook.test.ts`：

```typescript
import { describe, it, expect, vi } from 'vitest';
import { SyncHook } from '../../src/tapable';

describe('SyncHook', () => {
  it('should call tapped functions', () => {
    const hook = new SyncHook<[string]>(['name']);
    const fn = vi.fn();
    
    hook.tap('Test', fn);
    hook.call('webpack');
    
    expect(fn).toHaveBeenCalledWith('webpack');
  });

  it('should call multiple tapped functions in order', () => {
    const hook = new SyncHook<[string]>(['name']);
    const calls: string[] = [];
    
    hook.tap('Plugin1', () => calls.push('Plugin1'));
    hook.tap('Plugin2', () => calls.push('Plugin2'));
    hook.tap('Plugin3', () => calls.push('Plugin3'));
    
    hook.call('test');
    
    expect(calls).toEqual(['Plugin1', 'Plugin2', 'Plugin3']);
  });
});
```

## 调试配置

创建 VS Code 调试配置 `.vscode/launch.json`：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/vitest/vitest.mjs",
      "args": ["run", "--reporter=verbose"],
      "console": "integratedTerminal",
      "cwd": "${workspaceFolder}"
    },
    {
      "name": "Debug Current Test File",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/vitest/vitest.mjs",
      "args": ["run", "${relativeFile}", "--reporter=verbose"],
      "console": "integratedTerminal",
      "cwd": "${workspaceFolder}"
    },
    {
      "name": "Debug Example",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/examples/basic/build.ts",
      "preLaunchTask": "tsc: build",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "console": "integratedTerminal"
    }
  ]
}
```

## 示例项目

创建一个简单的示例项目用于测试：

`examples/basic/src/index.js`：

```javascript
import { add } from './math.js';
import { greet } from './utils.js';

console.log(add(1, 2));
console.log(greet('Webpack'));
```

`examples/basic/src/math.js`：

```javascript
export function add(a, b) {
  return a + b;
}

export function subtract(a, b) {
  return a - b;
}
```

`examples/basic/src/utils.js`：

```javascript
export function greet(name) {
  return `Hello, ${name}!`;
}
```

`examples/basic/build.ts`：

```typescript
import { webpack } from '../../src';
import path from 'path';

const compiler = webpack({
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js'
  },
  mode: 'development'
});

compiler.run().then(stats => {
  console.log('Build completed!');
  if (stats.hasErrors()) {
    console.error('Build failed with errors');
  }
}).catch(err => {
  console.error('Build failed:', err);
});
```

## 开发工作流

推荐的开发工作流：

1. **编写测试**：先写测试用例，明确功能需求
2. **实现功能**：按照测试要求实现代码
3. **运行测试**：确保所有测试通过
4. **重构优化**：在测试保护下进行重构

```bash
# 开发模式，监听文件变化
npm run dev

# 运行测试，监听模式
npm run test:watch

# 类型检查
npm run typecheck
```

## 本章小结

- 项目使用 **TypeScript** 开发，配合 **Vitest** 测试框架
- 采用**模块化**项目结构，便于理解和维护
- 核心类包括：`Compiler`、`Compilation`，以及 `tapable` 子系统
- 准备了示例项目和调试配置，方便开发调试
- 推荐**测试驱动**的开发工作流

下一章，我们将导读 Webpack 源码结构，了解官方实现的组织方式，为后续的实现提供参考。
