# 模块化发展历程：从 IIFE 到 ESM

要深入理解 Webpack，我们必须先理解它要解决的问题——**JavaScript 模块化**。

这一章，我们将回顾 JavaScript 模块化的演进历程，理解每种方案的设计动机和局限性，最终你会明白：为什么 Webpack 需要处理多种模块格式，以及它是如何做到的。

## 混沌时代：全局变量污染

在模块化概念出现之前，JavaScript 代码是这样组织的：

```html
<script src="jquery.js"></script>
<script src="utils.js"></script>
<script src="app.js"></script>
```

每个文件的变量都暴露在全局作用域：

```javascript
// utils.js
var name = 'utils';
function add(a, b) {
  return a + b;
}

// app.js
var name = 'app'; // 覆盖了 utils.js 中的 name
console.log(add(1, 2));
```

这带来了严重的问题：

1. **命名冲突**：不同文件的同名变量相互覆盖
2. **依赖关系不明确**：必须手动维护 `<script>` 标签顺序
3. **难以测试**：全局状态使单元测试变得困难

## IIFE：最原始的封装

为了解决全局污染，开发者开始使用**立即执行函数表达式**（IIFE）：

```javascript
// utils.js
var Utils = (function() {
  var privateVar = 'private';
  
  function add(a, b) {
    return a + b;
  }
  
  function subtract(a, b) {
    return a - b;
  }
  
  // 只暴露需要公开的 API
  return {
    add: add,
    subtract: subtract
  };
})();
```

IIFE 利用函数作用域创建了私有空间，只暴露必要的接口。这是模块化的雏形。

但 IIFE 仍然有局限：

- 模块之间的依赖关系不明确
- 需要手动维护全局命名空间
- 无法实现按需加载

jQuery、Lodash 等早期库都采用了这种模式。

## CommonJS：服务端的标准

2009 年，Node.js 诞生，带来了 **CommonJS** 规范：

```javascript
// math.js
const PI = 3.14159;

function add(a, b) {
  return a + b;
}

function multiply(a, b) {
  return a * b;
}

module.exports = {
  PI,
  add,
  multiply
};

// app.js
const math = require('./math');
console.log(math.add(1, 2)); // 3
console.log(math.PI); // 3.14159
```

CommonJS 的核心设计：

- **`require`**：同步加载模块
- **`module.exports`**：导出模块接口
- **文件即模块**：每个文件是独立的模块作用域

这解决了依赖管理的问题，但为什么 CommonJS 不适合浏览器？

**同步加载是关键问题**。在服务端，模块文件在本地磁盘，同步读取几乎无延迟。但在浏览器端，文件通过网络加载，同步等待会阻塞页面渲染。

```javascript
// 浏览器中，这会阻塞渲染
const lodash = require('lodash'); // 等待网络请求完成
```

## AMD：浏览器的异步方案

为了解决浏览器端的模块加载问题，**AMD**（Asynchronous Module Definition）应运而生：

```javascript
// 定义模块
define('math', [], function() {
  return {
    add: function(a, b) {
      return a + b;
    }
  };
});

// 使用模块
require(['math', 'lodash'], function(math, _) {
  console.log(math.add(1, 2));
  console.log(_.chunk([1, 2, 3, 4], 2));
});
```

AMD 的核心特点：

- **异步加载**：不阻塞页面渲染
- **依赖前置**：在回调执行前加载所有依赖
- **显式依赖声明**：依赖关系一目了然

RequireJS 是 AMD 规范的主要实现。

但 AMD 也有问题：

```javascript
// 依赖多时，参数列表冗长
define(['dep1', 'dep2', 'dep3', 'dep4', 'dep5'], 
  function(dep1, dep2, dep3, dep4, dep5) {
    // 必须保证顺序一致
  }
);
```

## CMD：按需加载的改进

**CMD**（Common Module Definition）是 SeaJS 推广的规范，它改进了 AMD 的依赖前置问题：

```javascript
// CMD 风格
define(function(require, exports, module) {
  // 依赖就近声明
  var math = require('./math');
  console.log(math.add(1, 2));
  
  // 条件加载
  if (needLodash) {
    var _ = require('lodash');
    console.log(_.chunk([1, 2, 3, 4], 2));
  }
});
```

CMD 的特点是**依赖就近，延迟执行**。模块在需要时才加载和执行，更符合开发者的直觉。

但 AMD 和 CMD 都需要额外的加载器（RequireJS、SeaJS），增加了复杂性。

## UMD：兼容性方案

面对 CommonJS、AMD、全局变量三种环境，**UMD**（Universal Module Definition）提供了兼容方案：

```javascript
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD 环境
    define(['lodash'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS 环境
    module.exports = factory(require('lodash'));
  } else {
    // 浏览器全局变量
    root.MyLibrary = factory(root._);
  }
})(typeof self !== 'undefined' ? self : this, function(_) {
  // 模块实现
  return {
    chunk: function(arr, size) {
      return _.chunk(arr, size);
    }
  };
});
```

UMD 本质上是一个**适配器模式**，通过运行时检测环境来选择合适的模块规范。

很多开源库会同时提供 ESM、CJS、UMD 三种格式，UMD 用于直接通过 `<script>` 标签引入。

## ES Modules：语言层面的标准

2015 年，ES6 带来了**原生模块系统**——ES Modules：

```javascript
// math.js
export const PI = 3.14159;

export function add(a, b) {
  return a + b;
}

export default function multiply(a, b) {
  return a * b;
}

// app.js
import multiply, { add, PI } from './math.js';
console.log(add(1, 2)); // 3
console.log(multiply(2, 3)); // 6
```

ESM 是 JavaScript 语言规范的一部分，具有以下优势：

### 静态分析

ESM 的 `import`/`export` 必须在模块顶层，且模块路径必须是字面量：

```javascript
// ✅ 合法
import { add } from './math.js';

// ❌ 非法：不能在条件语句中
if (condition) {
  import { add } from './math.js';
}

// ❌ 非法：路径不能是变量
import { add } from modulePath;
```

为什么要这样设计？

**静态结构使得编译期优化成为可能**。编译器在不运行代码的情况下，就能知道：
- 哪些模块被引用
- 哪些导出被使用
- 依赖关系图的完整结构

这是 **Tree Shaking** 的基础——只有静态分析才能安全地删除未使用的代码。

### 实时绑定

ESM 导出的是**绑定**（binding），而非值的拷贝：

```javascript
// counter.js
export let count = 0;
export function increment() {
  count++;
}

// app.js
import { count, increment } from './counter.js';
console.log(count); // 0
increment();
console.log(count); // 1 - 反映了模块内部的变化
```

对比 CommonJS：

```javascript
// counter.js
let count = 0;
module.exports = {
  count,
  increment: function() { count++; }
};

// app.js
const { count, increment } = require('./counter');
console.log(count); // 0
increment();
console.log(count); // 0 - 仍然是 0，因为这是值的拷贝
```

### 循环依赖处理

ESM 对循环依赖有更好的处理：

```javascript
// a.js
import { b } from './b.js';
export const a = 'a';
console.log('a.js:', b);

// b.js
import { a } from './a.js';
export const b = 'b';
console.log('b.js:', a);
```

ESM 会在绑定创建后、初始化前就允许访问，避免了 CommonJS 中可能出现的 undefined 问题。

## 动态导入：按需加载

ES2020 引入了动态 `import()` 语法：

```javascript
// 静态导入（编译时）
import { add } from './math.js';

// 动态导入（运行时）
const module = await import('./math.js');
console.log(module.add(1, 2));
```

动态导入返回 Promise，支持：

- **条件加载**：根据条件决定是否加载
- **按需加载**：只在需要时加载模块
- **动态路径**：路径可以是变量或表达式

```javascript
// 条件加载
if (user.isAdmin) {
  const { AdminPanel } = await import('./AdminPanel.js');
  AdminPanel.init();
}

// 动态路径
const locale = 'zh-CN';
const messages = await import(`./locales/${locale}.js`);
```

动态导入是 Webpack **代码分割**的基础。每个 `import()` 调用会生成一个独立的 chunk。

## Webpack 如何处理模块

理解了模块化的历史，我们来看 Webpack 是如何统一处理这些模块格式的。

### 模块识别

Webpack 通过语法分析识别模块类型：

```javascript
// ESM
import foo from './foo';
export default bar;

// CommonJS
const foo = require('./foo');
module.exports = bar;

// AMD
define(['./foo'], function(foo) {});
```

### 模块转换

Webpack 将所有模块格式转换为统一的内部表示，最终输出为浏览器可执行的代码：

```javascript
// 原始代码
import { add } from './math.js';
console.log(add(1, 2));

// Webpack 输出（简化版）
__webpack_require__.r(__webpack_exports__);
var _math__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./math.js");
console.log((0,_math__WEBPACK_IMPORTED_MODULE_0__.add)(1, 2));
```

`__webpack_require__` 是 Webpack 的模块加载运行时，它模拟了模块系统的行为。

### 模块图构建

Webpack 从入口开始，解析每个模块的依赖，构建完整的模块依赖图：

```
Entry: index.js
├── import './App.js'
│   ├── import './Header.js'
│   │   └── import './styles.css'
│   ├── import './Footer.js'
│   └── import 'react'
├── import './utils.js'
│   └── import 'lodash'
└── import './config.json'
```

这张图是后续所有操作的基础：代码分割、Tree Shaking、哈希计算等。

## 本章小结

- JavaScript 模块化经历了：全局变量 → IIFE → CommonJS → AMD/CMD → UMD → ESM 的演进
- **CommonJS**：同步加载，适合服务端，`require`/`module.exports`
- **AMD/CMD**：异步加载，适合浏览器，`define`/`require`
- **ESM**：语言标准，静态结构，支持 Tree Shaking
- 动态 `import()` 支持按需加载，是代码分割的基础
- Webpack 统一处理多种模块格式，构建模块依赖图

下一章，我们将介绍 Webpack 5 的新特性，了解相比 Webpack 4 的重要变化。
