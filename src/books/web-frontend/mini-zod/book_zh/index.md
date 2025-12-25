---
sidebar_position: 1
title: Introduction
---

# Mini Zod：TypeScript Schema 验证库

## 什么是 Zod？

Zod 是一个 TypeScript-first 的 schema 声明和验证库。它的核心特点：

- **类型安全**：Schema 定义自动推断 TypeScript 类型
- **运行时验证**：不仅是类型检查，还有运行时数据验证
- **零依赖**：无外部依赖，体积小巧
- **链式 API**：流畅的声明式语法

## 为什么需要 Schema 验证？

TypeScript 只在编译时检查类型，但运行时数据（API 响应、用户输入）无法保证类型正确：

```typescript
interface User {
  name: string
  age: number
}

// 编译时正确，但运行时可能错误
const user: User = await fetch('/api/user').then(r => r.json())
// user.age 可能是 string，可能是 null，可能根本不存在
```

Zod 解决这个问题：

```typescript
import { z } from 'zod'

const UserSchema = z.object({
  name: z.string(),
  age: z.number()
})

// 运行时验证 + 类型推断
const user = UserSchema.parse(data)  // 验证失败会抛错
type User = z.infer<typeof UserSchema>  // 自动推断类型
```

## 本书目标

通过从零实现 Mini Zod，你将学到：

- Schema 验证的核心原理
- TypeScript 类型推断技巧
- 链式 API 设计模式
- 错误处理最佳实践
- 数据转换与验证分离

## 最终成果

```typescript
import { z } from 'mini-zod'

// 定义 Schema
const UserSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  age: z.number().int().positive().optional(),
  role: z.enum(['admin', 'user', 'guest']),
  settings: z.object({
    theme: z.enum(['light', 'dark']).default('light'),
    notifications: z.boolean().default(true)
  })
})

// 类型自动推断
type User = z.infer<typeof UserSchema>

// 验证数据
const result = UserSchema.safeParse(inputData)
if (result.success) {
  console.log(result.data)  // 类型安全的 User
} else {
  console.log(result.error.issues)  // 详细错误信息
}
```

## 前置知识

- TypeScript 基础（泛型、类型推断）
- ES6+ 语法
- 函数式编程基础

## 章节概览

1. **基础篇**：项目初始化、架构设计、Schema 基类
2. **原始类型**：string、number、boolean、enum
3. **复合类型**：object、array、tuple、union
4. **高级特性**：自定义验证、数据转换、类型推断
5. **实战应用**：表单验证、API 验证、环境变量
6. **总结**：完整实现、与 Zod 对比

让我们开始实现吧！
