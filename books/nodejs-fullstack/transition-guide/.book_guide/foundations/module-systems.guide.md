# CommonJS 与 ES Modules：模块系统对比

## 章节定位

本章是新增的关键章节，帮助前端开发者理解 Node.js 中的模块系统。前端开发者熟悉 ES Modules，但 Node.js 生态中 CommonJS 仍然广泛使用，理解两者差异是避免很多坑的前提。

## 学习目标

读完本章，读者应该能够：

1. 理解 CommonJS 和 ES Modules 的语法差异
2. 理解两者的加载机制差异（同步 vs 异步）
3. 知道如何在 Node.js 项目中选择和配置模块系统
4. 理解两者互操作的规则和限制
5. 掌握常见的模块相关错误和解决方法

## 核心知识点

### 1. 语法对比

**CommonJS (CJS)**
```javascript
// 导出
module.exports = { foo, bar };
exports.foo = foo;

// 导入
const { foo, bar } = require('./module');
```

**ES Modules (ESM)**
```javascript
// 导出
export { foo, bar };
export default something;

// 导入
import { foo, bar } from './module.js';
import something from './module.js';
```

### 2. 加载机制差异

- **CJS**：同步加载，运行时解析，可以动态 require
- **ESM**：异步加载，编译时静态解析，顶层 await
- **影响**：ESM 可以做更好的 tree-shaking 和静态分析

### 3. 关键差异点

| 特性 | CommonJS | ES Modules |
|------|----------|------------|
| 加载时机 | 运行时 | 编译时 |
| 导出方式 | 值的拷贝 | 值的引用 |
| 动态导入 | require() | import() |
| 顶层 await | 不支持 | 支持 |
| this 指向 | module.exports | undefined |

### 4. 在 Node.js 中使用 ESM

- 文件扩展名 `.mjs`
- 或在 package.json 中设置 `"type": "module"`
- 使用 `.cjs` 强制 CommonJS

### 5. 互操作规则

- ESM 可以 import CJS 模块
- CJS 不能直接 require ESM（需要动态 import()）
- default 导出的处理差异

### 6. 常见错误和解决

- `require is not defined`：在 ESM 中使用了 require
- `Cannot use import statement`：在 CJS 中使用了 import
- `ERR_REQUIRE_ESM`：尝试 require 一个 ESM 包

## 写作要求

### 内容结构

1. **开篇**：以"为什么 Node.js 有两套模块系统？"切入
2. **历史背景**：简述两者的起源
3. **语法对比**：并排展示两种写法
4. **机制差异**：重点讲解加载机制的区别
5. **项目配置**：如何选择和配置
6. **互操作**：如何让两者共存
7. **常见问题**：错误信息和解决方案

### 代码示例要求

- 两种语法的并排对比
- 展示配置文件写法
- 展示互操作的代码

### 避免的内容

- 不要深入模块解析算法
- 不要讲解 require 源码实现
- 不要讲循环依赖的复杂场景

## 示例代码片段

```javascript
// math.cjs - CommonJS
function add(a, b) {
  return a + b;
}
module.exports = { add };

// math.mjs - ES Modules
export function add(a, b) {
  return a + b;
}
```

```json
// package.json - 启用 ESM
{
  "type": "module"
}
```

```javascript
// 在 ESM 中导入 CJS 模块
import cjsModule from './legacy.cjs';

// 在 CJS 中导入 ESM 模块（需要异步）
const esmModule = await import('./modern.mjs');
```

## 章节长度

约 2500-3000 字，是理解 Node.js 生态的关键知识。
