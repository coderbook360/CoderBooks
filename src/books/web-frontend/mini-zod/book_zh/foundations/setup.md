---
sidebar_position: 1
title: 项目初始化
---

# 项目初始化

## 创建项目结构

```bash
mkdir mini-zod
cd mini-zod
pnpm init
```

安装开发依赖：

```bash
pnpm add -D typescript vitest @types/node
```

## TypeScript 配置

创建 `tsconfig.json`：

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Node",
    "strict": true,
    "esModuleInterop": true,
    "declaration": true,
    "outDir": "dist",
    "rootDir": "src",
    "lib": ["ES2020"]
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

关键配置说明：

- `strict: true`：启用所有严格检查，Schema 验证库必须类型安全
- `declaration: true`：生成 `.d.ts` 文件，供用户获得类型提示

## 项目目录结构

```
mini-zod/
├── src/
│   ├── index.ts          # 入口文件
│   ├── types.ts          # 类型定义
│   ├── errors.ts         # 错误类
│   ├── schemas/
│   │   ├── base.ts       # Schema 基类
│   │   ├── string.ts     # 字符串 Schema
│   │   ├── number.ts     # 数字 Schema
│   │   ├── boolean.ts    # 布尔 Schema
│   │   ├── literal.ts    # 字面量 Schema
│   │   ├── enum.ts       # 枚举 Schema
│   │   ├── array.ts      # 数组 Schema
│   │   ├── object.ts     # 对象 Schema
│   │   ├── tuple.ts      # 元组 Schema
│   │   ├── union.ts      # 联合 Schema
│   │   └── optional.ts   # 可选 Schema
│   └── utils/
│       └── helpers.ts    # 工具函数
├── tests/
│   ├── string.test.ts
│   ├── number.test.ts
│   └── object.test.ts
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## 测试配置

创建 `vitest.config.ts`：

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html']
    }
  }
})
```

更新 `package.json`：

```json
{
  "name": "mini-zod",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest",
    "test:run": "vitest run"
  }
}
```

## 入口文件

创建 `src/index.ts`：

```typescript
// 类型导出
export type {
  ZodType,
  ZodTypeDef,
  infer,
  input,
  output,
  SafeParseResult,
  ParseError
} from './types'

// Schema 类导出
export { ZodSchema } from './schemas/base'
export { ZodString } from './schemas/string'
export { ZodNumber } from './schemas/number'
export { ZodBoolean } from './schemas/boolean'
export { ZodLiteral } from './schemas/literal'
export { ZodEnum } from './schemas/enum'
export { ZodArray } from './schemas/array'
export { ZodObject } from './schemas/object'
export { ZodTuple } from './schemas/tuple'
export { ZodUnion } from './schemas/union'
export { ZodOptional, ZodNullable } from './schemas/optional'

// z 命名空间
export { z } from './z'
```

## z 命名空间

Zod 的核心 API 是 `z` 对象，提供所有 Schema 构造器：

创建 `src/z.ts`：

```typescript
import { ZodString } from './schemas/string'
import { ZodNumber } from './schemas/number'
import { ZodBoolean } from './schemas/boolean'
import { ZodLiteral } from './schemas/literal'
import { ZodEnum } from './schemas/enum'
import { ZodArray } from './schemas/array'
import { ZodObject } from './schemas/object'
import { ZodTuple } from './schemas/tuple'
import { ZodUnion } from './schemas/union'

export const z = {
  // 原始类型
  string: () => new ZodString(),
  number: () => new ZodNumber(),
  boolean: () => new ZodBoolean(),
  
  // 字面量与枚举
  literal: <T extends string | number | boolean>(value: T) => 
    new ZodLiteral(value),
  enum: <T extends readonly [string, ...string[]]>(values: T) => 
    new ZodEnum(values),
  
  // 复合类型
  array: <T extends ZodSchema<any>>(schema: T) => 
    new ZodArray(schema),
  object: <T extends Record<string, ZodSchema<any>>>(shape: T) => 
    new ZodObject(shape),
  tuple: <T extends [ZodSchema<any>, ...ZodSchema<any>[]]>(schemas: T) => 
    new ZodTuple(schemas),
  union: <T extends [ZodSchema<any>, ...ZodSchema<any>[]]>(schemas: T) => 
    new ZodUnion(schemas)
}
```

## 验证项目配置

运行测试确保配置正确：

```bash
pnpm test:run
```

## 本章小结

我们完成了 Mini Zod 项目的初始化：

1. **TypeScript 配置**：严格模式确保类型安全
2. **目录结构**：按功能模块组织代码
3. **测试配置**：Vitest 提供快速测试环境
4. **入口文件**：统一导出所有 Schema 类型

下一章我们将设计核心架构，理解 Schema 验证的基本原理。
