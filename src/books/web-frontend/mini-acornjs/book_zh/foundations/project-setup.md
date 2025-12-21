# 准备工作：搭建 mini-acorn 项目

在前几章中，我们学习了编译原理基础、ESTree 规范和 Acorn 的整体架构。现在，是时候动手实践了。本章将带你从零开始搭建 `mini-acorn` 项目，建立一个坚实的开发基础。

一个好的项目架构不仅能让代码更易于维护，还能为后续的功能扩展铺平道路。我们将遵循**简洁、模块化、可测试**的原则，逐步构建一个专业级别的解析器项目。

## 1. 项目目标与技术选型

### 项目定位

我们的目标是构建一个**教学用途的 JavaScript 解析器**，它应该：

-   **功能完备**：能够解析 ES6 的核心语法（变量声明、函数、类、箭头函数等）
-   **结构清晰**：代码组织合理，易于理解和扩展
-   **符合规范**：输出严格遵循 ESTree 规范的 AST
-   **可测试**：便于编写单元测试，验证每个功能模块

### 技术栈

| 技术 | 用途 | 理由 |
|------|------|------|
| **TypeScript** | 开发语言 | 类型安全，提升代码质量和开发体验 |
| **Vitest** | 测试框架 | 快速、现代化的测试工具 |
| **Rollup** | 构建工具 | 轻量级，适合库的打包 |
| **ESLint + Prettier** | 代码质量 | 统一代码风格，避免低级错误 |

**为什么选择 TypeScript？**

- **类型约束**：解析器涉及大量的数据结构（Token、AST 节点），TypeScript 的类型系统能避免许多运行时错误
- **智能提示**：IDE 能提供准确的代码补全和重构支持
- **接口契约**：ESTree 规范的节点类型可以直接用 TypeScript 接口表达

## 2. 初始化项目

### 创建项目目录

```bash
# 创建项目文件夹
mkdir mini-acorn
cd mini-acorn

# 初始化 npm 项目
npm init -y
```

### 安装依赖

```bash
# 安装 TypeScript 和类型定义
npm install -D typescript @types/node

# 安装测试框架
npm install -D vitest

# 安装构建工具
npm install -D rollup @rollup/plugin-typescript tslib

# 安装代码质量工具
npm install -D eslint prettier eslint-config-prettier
npm install -D @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

### 配置 TypeScript

创建 `tsconfig.json`：

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020"],
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

**配置要点**：
- `strict: true`：启用所有严格类型检查
- `declaration: true`：生成 `.d.ts` 类型声明文件，方便其他项目使用
- `noUnusedLocals`：避免无用代码累积

## 3. 项目目录结构

一个清晰的目录结构是项目可维护性的基础。我们采用**按功能模块**而非按文件类型的组织方式：

```
mini-acorn/
├── src/
│   ├── index.ts                 # 入口文件，导出公共 API
│   ├── parser.ts                # Parser 类（语法分析）
│   ├── tokenizer.ts             # Tokenizer 类（词法分析）
│   ├── state.ts                 # State 类（状态管理）
│   ├── types/                   # 类型定义
│   │   ├── token.ts            # Token 相关类型
│   │   ├── ast.ts              # AST 节点类型（ESTree）
│   │   └── options.ts          # 解析器选项
│   ├── utils/                   # 工具函数
│   │   ├── identifier.ts       # 标识符相关工具
│   │   ├── whitespace.ts       # 空白字符处理
│   │   └── position.ts         # 位置计算
│   └── constants/               # 常量定义
│       ├── keywords.ts         # 关键字列表
│       └── token-types.ts      # Token 类型常量
├── test/                        # 测试文件
│   ├── tokenizer.test.ts
│   ├── parser.test.ts
│   └── fixtures/               # 测试用例
│       └── samples.ts
├── package.json
├── tsconfig.json
├── rollup.config.js
└── README.md
```

**设计原则**：

1. **单一职责**：每个文件专注于一个功能模块
2. **清晰分层**：`types` 存放接口定义，`utils` 存放纯函数，`constants` 存放常量
3. **测试就近**：测试文件与源码目录平行，便于定位

## 4. 定义核心类型

在编写业务逻辑之前，先定义好类型系统。这是 TypeScript 项目的最佳实践。

### Token 类型定义

创建 `src/types/token.ts`：

```typescript
// Token 类型枚举
export enum TokenType {
  // 字面量
  Numeric = "Numeric",
  String = "String",
  
  // 标识符与关键字
  Identifier = "Identifier",
  Keyword = "Keyword",
  
  // 运算符
  Punctuator = "Punctuator",
  
  // 特殊
  EOF = "EOF",  // End of File
}

// 位置信息
export interface Position {
  line: number;
  column: number;
}

export interface SourceLocation {
  start: Position;
  end: Position;
}

// Token 接口
export interface Token {
  type: TokenType;
  value: string;
  start: number;
  end: number;
  loc?: SourceLocation;
}
```

### AST 节点类型定义

创建 `src/types/ast.ts`，遵循 ESTree 规范：

```typescript
// 基础节点接口
export interface BaseNode {
  type: string;
  start: number;
  end: number;
  loc?: SourceLocation;
}

// 程序根节点
export interface Program extends BaseNode {
  type: "Program";
  sourceType: "script" | "module";
  body: Array<Statement | ModuleDeclaration>;
}

// 标识符
export interface Identifier extends BaseNode {
  type: "Identifier";
  name: string;
}

// 字面量
export interface Literal extends BaseNode {
  type: "Literal";
  value: string | number | boolean | null;
  raw: string;
}

// 表达式语句
export interface ExpressionStatement extends BaseNode {
  type: "ExpressionStatement";
  expression: Expression;
}

// 更多节点类型将在后续章节逐步添加...

// 联合类型
export type Statement = ExpressionStatement; // 后续会扩展
export type Expression = Identifier | Literal; // 后续会扩展
export type ModuleDeclaration = any; // 暂时占位
```

**设计考量**：
- 使用 `interface` 而非 `type`，便于扩展
- `BaseNode` 包含所有节点的公共字段
- 通过联合类型组织不同类别的节点

### 解析器选项

创建 `src/types/options.ts`：

```typescript
export interface ParserOptions {
  // 是否生成位置信息
  locations?: boolean;
  
  // 源类型
  sourceType?: "script" | "module";
  
  // ECMAScript 版本
  ecmaVersion?: 5 | 6 | 2015 | 2016 | 2017 | 2018 | 2019 | 2020 | "latest";
  
  // 允许使用保留字作为属性名
  allowReserved?: boolean;
}
```

## 5. 构建入口文件

创建 `src/index.ts`，这是用户使用解析器的入口：

```typescript
import { Parser } from './parser';
import { ParserOptions } from './types/options';
import { Program } from './types/ast';

/**
 * 解析 JavaScript 代码，返回符合 ESTree 规范的 AST
 * @param input - 源代码字符串
 * @param options - 解析器选项
 * @returns AST 根节点
 */
export function parse(input: string, options: ParserOptions = {}): Program {
  const parser = new Parser(input, options);
  return parser.parse();
}

// 导出类型，方便使用者进行类型标注
export * from './types/ast';
export * from './types/token';
export * from './types/options';
```

**API 设计原则**：
- **简洁的公共接口**：用户只需调用 `parse(code, options)`
- **类型完整导出**：便于 TypeScript 用户进行类型标注
- **合理的默认值**：不传 `options` 也能正常工作

## 6. 配置测试环境

### Vitest 配置

创建 `vitest.config.ts`：

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
```

### 编写第一个测试

创建 `test/tokenizer.test.ts`：

```typescript
import { describe, it, expect } from 'vitest';
import { parse } from '../src';

describe('Tokenizer', () => {
  it('should parse a simple variable declaration', () => {
    const code = 'let x = 1;';
    const ast = parse(code);
    
    expect(ast).toBeDefined();
    expect(ast.type).toBe('Program');
    expect(ast.body).toHaveLength(1);
  });
});
```

**测试策略**：
- **从高层API开始**：先测试 `parse()` 函数，确保整体流程正确
- **逐步细化**：后续为每个模块编写独立的单元测试
- **使用真实代码**：测试用例尽量使用实际的 JavaScript 代码片段

## 7. 配置构建流程

### Rollup 配置

创建 `rollup.config.js`：

```javascript
import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/mini-acorn.cjs.js',
      format: 'cjs',
      sourcemap: true,
    },
    {
      file: 'dist/mini-acorn.esm.js',
      format: 'es',
      sourcemap: true,
    },
  ],
  plugins: [
    typescript({
      tsconfig: './tsconfig.json',
    }),
  ],
};
```

### package.json 脚本

更新 `package.json`：

```json
{
  "name": "mini-acorn",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/mini-acorn.cjs.js",
  "module": "./dist/mini-acorn.esm.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "dev": "rollup -c -w",
    "build": "rollup -c",
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest --coverage",
    "lint": "eslint src --ext .ts",
    "format": "prettier --write \"src/**/*.ts\""
  },
  "keywords": ["parser", "ast", "javascript", "acorn"],
  "license": "MIT"
}
```

**脚本说明**：
- `dev`：开发模式，监听文件变化自动构建
- `build`：生产构建
- `test`：运行测试
- `test:coverage`：生成测试覆盖率报告

## 8. 骨架代码：准备核心类

在正式实现功能前，先创建核心类的骨架代码，明确职责边界。

### State 类骨架

创建 `src/state.ts`：

```typescript
import { ParserOptions } from './types/options';

export class State {
  // 输入源码
  input: string;
  
  // 当前字符位置
  pos: number = 0;
  
  // 当前行号（从 1 开始）
  line: number = 1;
  
  // 当前行的起始位置
  lineStart: number = 0;
  
  constructor(input: string, options: ParserOptions) {
    this.input = input;
  }
  
  // 获取当前列号
  get column(): number {
    return this.pos - this.lineStart;
  }
}
```

### Tokenizer 类骨架

创建 `src/tokenizer.ts`：

```typescript
import { State } from './state';
import { Token, TokenType } from './types/token';

export class Tokenizer extends State {
  // 当前 Token
  currentToken!: Token;
  
  // 读取下一个 Token
  nextToken(): void {
    // TODO: 将在后续章节实现
    throw new Error('Not implemented');
  }
  
  // 获取当前字符
  currentChar(): string {
    return this.input[this.pos];
  }
  
  // 前进一个字符
  advance(): void {
    this.pos++;
  }
}
```

### Parser 类骨架

创建 `src/parser.ts`：

```typescript
import { Tokenizer } from './tokenizer';
import { ParserOptions } from './types/options';
import { Program } from './types/ast';

export class Parser extends Tokenizer {
  constructor(input: string, options: ParserOptions = {}) {
    super(input, options);
  }
  
  // 解析入口方法
  parse(): Program {
    // TODO: 将在后续章节实现
    throw new Error('Not implemented');
  }
}
```

**继承关系**：
- `State`：基础状态管理
- `Tokenizer extends State`：在状态基础上实现词法分析
- `Parser extends Tokenizer`：在词法分析基础上实现语法分析

这种设计使得 `Parser` 可以直接访问 `Tokenizer` 的方法（如 `nextToken()`），同时也能访问 `State` 的属性（如 `pos`、`line`）。

## 9. 验证环境搭建

运行测试，确保项目配置正确：

```bash
# 安装依赖
npm install

# 运行测试（预期失败，因为还未实现核心逻辑）
npm test

# 构建项目
npm run build
```

**预期结果**：
- 依赖安装成功
- 测试能够运行（虽然会失败，因为抛出了 "Not implemented" 错误）
- 构建能够成功生成 `dist` 目录

## 10. 开发工作流建议

### 推荐的开发流程

1. **测试驱动**：先编写测试用例，明确预期行为
2. **小步迭代**：每次只实现一个小功能（如只解析数字字面量）
3. **持续验证**：实现后立即运行测试，确保功能正确
4. **代码审查**：定期回顾代码，优化结构和命名

### 调试技巧

```typescript
// 在关键位置添加调试日志
console.log(`[DEBUG] Current token: ${this.currentToken.type}`);
console.log(`[DEBUG] Position: ${this.pos}, Char: ${this.currentChar()}`);
```

使用 VS Code 的调试功能：
- 设置断点
- 使用 `Debug: Run Test` 命令调试单个测试用例
- 观察变量值和调用栈

## 11. 总结

本章，我们完成了 `mini-acorn` 项目的基础搭建工作。

**我们做了什么**：
- 选择了**TypeScript + Vitest + Rollup**技术栈
- 设计了清晰的**目录结构**和**模块划分**
- 定义了符合 **ESTree 规范**的类型系统
- 创建了核心类的**骨架代码**，明确了职责边界
- 配置了**测试和构建**环境

**为什么这样做**：
- **类型安全**：TypeScript 的类型系统能及早发现错误
- **模块化**：清晰的目录结构便于团队协作和维护
- **可测试**：测试驱动开发能提高代码质量
- **专业**：这些实践是现代前端项目的标准配置

**下一步**：
从下一章开始，我们将进入**词法分析**的实现。我们会逐步完善 `Tokenizer` 类，让它能够识别 JavaScript 代码中的各种 Token：关键字、标识符、数字、字符串、运算符等。

### 练习

1. **熟悉项目结构**：浏览所有文件，理解每个文件的职责。

2. **扩展类型定义**：在 `ast.ts` 中添加 `BinaryExpression` 节点类型的接口定义。

3. **编写测试用例**：在 `test/` 目录下创建一个新的测试文件，尝试测试一个简单的场景（即使现在会失败）。

4. **阅读 Acorn 源码**：访问 [Acorn GitHub 仓库](https://github.com/acornjs/acorn)，浏览 `src` 目录，对比我们的项目结构，思考异同点。
