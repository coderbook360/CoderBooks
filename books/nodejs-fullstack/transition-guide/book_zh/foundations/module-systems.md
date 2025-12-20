# CommonJS 与 ES Modules：模块系统对比

为什么 Node.js 有两套模块系统？

这个问题困扰着很多从前端转向 Node.js 的开发者。在浏览器中，你只需要使用 `import/export`；但在 Node.js 中，你会看到 `require/module.exports` 和 `import/export` 混用，各种报错让人头疼。

本章我们将彻底理清两套模块系统的来龙去脉，让你在实际项目中做出正确的选择。

## 历史背景：两条演进路线

理解历史，才能理解现状。

**Node.js 的选择（2009年）**：
- JavaScript 原生没有模块系统
- Node.js 诞生时，需要一套模块方案
- 选择了社区标准 **CommonJS**
- 使用 `require()` 和 `module.exports`

**浏览器的演进**：
- 早期用 `<script>` 标签和全局变量
- 社区方案：AMD（RequireJS）、CMD（SeaJS）
- ES2015 正式标准化 **ES Modules**
- 使用 `import` 和 `export`

**现状**：
- 浏览器已完全拥抱 ES Modules
- Node.js 从 v12 开始正式支持 ES Modules
- 两套系统并存，需要知道如何选择和互操作

## 语法对比

先从语法层面看两者的差异：

### CommonJS

```javascript
// math.js - 导出
function add(a, b) {
  return a + b;
}

function subtract(a, b) {
  return a - b;
}

// 导出方式 1：整体导出
module.exports = { add, subtract };

// 导出方式 2：逐个导出
exports.add = add;
exports.subtract = subtract;
```

```javascript
// app.js - 导入
// 整体导入
const math = require('./math');
console.log(math.add(1, 2));

// 解构导入
const { add, subtract } = require('./math');
console.log(add(1, 2));
```

### ES Modules

```javascript
// math.mjs - 导出
export function add(a, b) {
  return a + b;
}

export function subtract(a, b) {
  return a - b;
}

// 默认导出
export default { add, subtract };
```

```javascript
// app.mjs - 导入
// 命名导入
import { add, subtract } from './math.mjs';
console.log(add(1, 2));

// 默认导入
import math from './math.mjs';
console.log(math.add(1, 2));

// 全部导入
import * as math from './math.mjs';
console.log(math.add(1, 2));
```

## 核心差异

语法只是表面，两者有更本质的差异：

### 1. 加载时机

**CommonJS**：运行时加载
```javascript
// 在运行时才确定加载什么
const moduleName = condition ? './a' : './b';
const module = require(moduleName); // 完全合法
```

**ES Modules**：编译时静态分析
```javascript
// 必须在顶层，不能在条件语句中
import { something } from './module.mjs';

// 这是语法错误！
if (condition) {
  import { something } from './module.mjs'; // ❌
}

// 动态导入需要用 import()
const module = await import('./module.mjs'); // ✅
```

### 2. 导出值的性质

**CommonJS**：导出值的拷贝
```javascript
// counter.js
let count = 0;
function increment() {
  count++;
}
module.exports = { count, increment };

// app.js
const counter = require('./counter');
console.log(counter.count); // 0
counter.increment();
console.log(counter.count); // 还是 0！因为是拷贝
```

**ES Modules**：导出值的引用
```javascript
// counter.mjs
export let count = 0;
export function increment() {
  count++;
}

// app.mjs
import { count, increment } from './counter.mjs';
console.log(count); // 0
increment();
console.log(count); // 1！因为是引用
```

### 3. this 的指向

**CommonJS**：`this` 指向 `module.exports`
```javascript
console.log(this === module.exports); // true
```

**ES Modules**：`this` 是 `undefined`
```javascript
console.log(this); // undefined
```

### 4. 顶层 await

**CommonJS**：不支持
```javascript
// ❌ 语法错误
const data = await fetchData();
```

**ES Modules**：支持
```javascript
// ✅ 完全合法
const data = await fetchData();
export { data };
```

## 在 Node.js 中使用 ES Modules

Node.js 默认使用 CommonJS。要使用 ES Modules，有几种方式：

### 方式 1：使用 .mjs 扩展名

```javascript
// utils.mjs
export function greet(name) {
  return `Hello, ${name}!`;
}

// app.mjs
import { greet } from './utils.mjs';
console.log(greet('World'));
```

### 方式 2：在 package.json 中声明

```json
{
  "type": "module"
}
```

然后所有 `.js` 文件都被视为 ES Modules：

```javascript
// utils.js - 现在是 ES Module
export function greet(name) {
  return `Hello, ${name}!`;
}
```

如果需要在 `"type": "module"` 的项目中使用 CommonJS，用 `.cjs` 扩展名：

```javascript
// legacy.cjs - 强制使用 CommonJS
module.exports = { something: 'value' };
```

## 两者互操作

现实中，你的项目可能需要混用两种模块系统。

### ES Modules 导入 CommonJS

```javascript
// legacy.cjs (CommonJS)
module.exports = {
  greet: (name) => `Hello, ${name}!`
};

// app.mjs (ES Module)
import legacy from './legacy.cjs';
console.log(legacy.greet('World'));

// 注意：只能默认导入，不能解构导入
// import { greet } from './legacy.cjs'; // ❌ 可能失败
```

### CommonJS 导入 ES Modules

```javascript
// modern.mjs (ES Module)
export function greet(name) {
  return `Hello, ${name}!`;
}

// app.cjs (CommonJS)
// ❌ 不能直接 require
// const { greet } = require('./modern.mjs'); // 报错！

// ✅ 必须使用动态 import()
async function main() {
  const { greet } = await import('./modern.mjs');
  console.log(greet('World'));
}
main();
```

**核心规则**：
- ESM 可以 `import` CJS（作为默认导出）
- CJS 不能 `require` ESM（必须用 `import()`）

## 常见错误与解决

### 错误 1：`require is not defined`

```
ReferenceError: require is not defined in ES module scope
```

**原因**：在 ES Module 中使用了 `require`

**解决**：
```javascript
// 方式 1：改用 import
import something from './module.js';

// 方式 2：创建 require 函数
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const something = require('./module.js');
```

### 错误 2：`Cannot use import statement outside a module`

```
SyntaxError: Cannot use import statement outside a module
```

**原因**：在 CommonJS 文件中使用了 `import`

**解决**：
1. 将文件扩展名改为 `.mjs`
2. 或在 `package.json` 中添加 `"type": "module"`
3. 或改用 `require`

### 错误 3：`ERR_REQUIRE_ESM`

```
Error [ERR_REQUIRE_ESM]: require() of ES Module ... not supported
```

**原因**：尝试 `require` 一个 ES Module 包

**解决**：
```javascript
// 使用动态导入
const module = await import('es-module-package');
```

## 如何选择

**推荐使用 ES Modules 的场景**：
- 新项目
- 前后端同构项目
- 需要 Tree-shaking
- 需要顶层 await

**继续使用 CommonJS 的场景**：
- 老项目维护
- 依赖大量 CJS 包
- 团队更熟悉 CJS
- 特定工具只支持 CJS（如某些测试框架）

**实践建议**：

```json
// package.json - 现代项目推荐配置
{
  "type": "module",
  "engines": {
    "node": ">=18"
  }
}
```

## 一个完整的对比表

| 特性 | CommonJS | ES Modules |
|------|----------|------------|
| 语法 | `require/exports` | `import/export` |
| 加载时机 | 运行时 | 编译时 |
| 导出值 | 值的拷贝 | 值的引用 |
| 动态导入 | `require()` | `import()` |
| 顶层 await | ❌ | ✅ |
| this 指向 | `module.exports` | `undefined` |
| 文件扩展名 | `.js` / `.cjs` | `.mjs` / `.js`* |
| Tree-shaking | 困难 | 原生支持 |
| 浏览器支持 | ❌ | ✅ |

*需要 `"type": "module"`

## 本章小结

- Node.js 同时支持 CommonJS 和 ES Modules
- CommonJS 是运行时加载，ES Modules 是编译时静态分析
- ES Modules 导出的是引用，CommonJS 导出的是拷贝
- 使用 `.mjs` 或 `"type": "module"` 启用 ES Modules
- ESM 可以导入 CJS，但 CJS 需要用 `import()` 导入 ESM
- 新项目推荐使用 ES Modules

下一章，我们将学习 Node.js 的版本管理和 LTS 策略。
