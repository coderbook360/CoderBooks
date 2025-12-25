# 项目初始化

本章搭建 mini-zepto 的开发环境。

## 项目结构

```
mini-zepto/
├── src/
│   ├── index.ts         # 入口
│   ├── zepto.ts         # 核心类
│   ├── selector.ts      # 选择器
│   ├── dom.ts           # DOM 操作
│   ├── events.ts        # 事件系统
│   ├── animation.ts     # 动画
│   ├── ajax.ts          # AJAX
│   └── utils.ts         # 工具函数
├── test/
│   └── ...
├── package.json
├── tsconfig.json
└── rollup.config.js
```

## 初始化项目

```bash
mkdir mini-zepto && cd mini-zepto
pnpm init
pnpm add -D typescript rollup @rollup/plugin-typescript vitest
```

## TypeScript 配置

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "declaration": true,
    "strict": true,
    "moduleResolution": "node",
    "esModuleInterop": true,
    "outDir": "./dist"
  },
  "include": ["src/**/*"]
}
```

## Rollup 配置

```javascript
// rollup.config.js
import typescript from '@rollup/plugin-typescript'

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/zepto.js',
      format: 'umd',
      name: 'Zepto'
    },
    {
      file: 'dist/zepto.esm.js',
      format: 'esm'
    }
  ],
  plugins: [typescript()]
}
```

## 入口文件

```typescript
// src/index.ts
import { Zepto } from './zepto'

// 工厂函数
function $(selector: string | Element | Document): Zepto {
  return new Zepto(selector)
}

// 挂载到全局
if (typeof window !== 'undefined') {
  (window as any).$ = $
  (window as any).Zepto = $
}

export default $
export { $ }
```

## 测试环境

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true
  }
})
```

## 第一个测试

```typescript
// test/basic.test.ts
import { describe, it, expect } from 'vitest'
import $ from '../src'

describe('Zepto', () => {
  it('should create Zepto instance', () => {
    document.body.innerHTML = '<div id="app"></div>'
    const $el = $('#app')
    expect($el).toBeDefined()
  })
})
```

## 构建脚本

```json
// package.json
{
  "scripts": {
    "build": "rollup -c",
    "test": "vitest",
    "dev": "rollup -c -w"
  }
}
```

## 小结

本章完成了：

- 项目目录结构规划
- TypeScript 和 Rollup 配置
- 入口文件和工厂函数
- 测试环境搭建

下一章我们将设计 Zepto 的核心架构。
