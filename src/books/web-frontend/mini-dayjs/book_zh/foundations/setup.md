# 项目初始化与开发环境

在开始实现 Mini-Dayjs 之前，我们先搭建一个现代化的开发环境。

## 项目结构

```
mini-dayjs/
├── src/
│   ├── index.ts          # 入口文件
│   ├── dayjs.ts          # Dayjs 类定义
│   ├── constant.ts       # 常量定义
│   ├── utils.ts          # 工具函数
│   └── plugins/          # 插件目录
├── locale/               # 本地化文件
├── test/                 # 测试文件
├── package.json
└── tsconfig.json
```

## 初始化项目

```bash
mkdir mini-dayjs && cd mini-dayjs
pnpm init
pnpm add -D typescript vitest @types/node
```

## TypeScript 配置

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Node",
    "strict": true,
    "esModuleInterop": true,
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

## 核心常量定义

首先定义时间单位常量，这是整个库的基础：

```typescript
// src/constant.ts
export const SECONDS_A_MINUTE = 60
export const SECONDS_A_HOUR = SECONDS_A_MINUTE * 60
export const SECONDS_A_DAY = SECONDS_A_HOUR * 24
export const SECONDS_A_WEEK = SECONDS_A_DAY * 7

export const MILLISECONDS_A_SECOND = 1000
export const MILLISECONDS_A_MINUTE = SECONDS_A_MINUTE * MILLISECONDS_A_SECOND
export const MILLISECONDS_A_HOUR = SECONDS_A_HOUR * MILLISECONDS_A_SECOND
export const MILLISECONDS_A_DAY = SECONDS_A_DAY * MILLISECONDS_A_SECOND
export const MILLISECONDS_A_WEEK = SECONDS_A_WEEK * MILLISECONDS_A_SECOND

// 时间单位缩写
export const UNIT_MAP: Record<string, string> = {
  y: 'year',
  M: 'month',
  D: 'day',
  d: 'day',
  h: 'hour',
  m: 'minute',
  s: 'second',
  ms: 'millisecond',
  w: 'week',
  Q: 'quarter',
}
```

为什么要定义这些常量？两个原因：

1. **避免魔法数字**：`86400000` 不如 `MILLISECONDS_A_DAY` 直观
2. **减少计算错误**：手动计算毫秒数容易出错

## 工具函数

```typescript
// src/utils.ts
import { UNIT_MAP } from './constant'

/**
 * 标准化时间单位
 * 'y' -> 'year', 'M' -> 'month', etc.
 */
export function normalizeUnit(unit: string): string {
  return UNIT_MAP[unit] || unit.toLowerCase().replace(/s$/, '')
}

/**
 * 补零：1 -> '01'
 */
export function padStart(value: number, length: number = 2): string {
  return String(value).padStart(length, '0')
}

/**
 * 判断是否为闰年
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

/**
 * 获取某月的天数
 */
export function getDaysInMonth(year: number, month: number): number {
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  if (month === 1 && isLeapYear(year)) {
    return 29
  }
  return daysInMonth[month]
}
```

## 入口文件骨架

```typescript
// src/index.ts
import { Dayjs } from './dayjs'

function dayjs(date?: string | number | Date | Dayjs): Dayjs {
  return new Dayjs(date)
}

// 静态方法
dayjs.isDayjs = (value: unknown): value is Dayjs => {
  return value instanceof Dayjs
}

export default dayjs
export { Dayjs }
```

## 验证环境

创建一个简单的测试文件验证环境是否正确：

```typescript
// test/setup.test.ts
import { describe, it, expect } from 'vitest'
import dayjs from '../src'

describe('环境验证', () => {
  it('dayjs 函数存在', () => {
    expect(typeof dayjs).toBe('function')
  })

  it('isDayjs 静态方法存在', () => {
    expect(typeof dayjs.isDayjs).toBe('function')
  })
})
```

运行测试：

```bash
npx vitest run
```

## 小结

本章完成了：

- 项目目录结构设计
- TypeScript 开发环境配置
- 核心常量和工具函数定义
- 入口文件骨架搭建

下一章，我们将深入分析 Day.js 的整体架构设计。
