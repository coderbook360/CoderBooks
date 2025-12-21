# JavaScript 运行时对比：浏览器 vs Node.js

同样是 JavaScript，为什么在服务端会有不同的思考方式？

这是很多前端开发者转向 Node.js 时的第一个困惑。你用了多年的 `document.querySelector`、`window.localStorage`、`fetch` API，突然发现它们在 Node.js 中全都不存在。取而代之的是 `fs.readFile`、`http.createServer`、`process.env` 这些陌生的面孔。

**这不是 JavaScript 变了，而是运行环境变了。**

理解这一点，是从前端开发者转变为全栈开发者的第一步。

## 两个完全不同的世界

浏览器和 Node.js 都运行 JavaScript，但它们面向的场景完全不同：

**浏览器环境**的核心使命是**与用户交互**：
- 渲染页面（DOM）
- 响应用户操作（事件）
- 与服务器通信（XHR/Fetch）
- 存储本地数据（Storage/IndexedDB）

**Node.js 环境**的核心使命是**系统级编程**：
- 读写文件系统
- 创建网络服务
- 执行系统命令
- 管理进程和线程

这两个环境共享的是 JavaScript 语言本身——变量、函数、类、Promise、async/await 这些语法特性是完全一致的。差异在于**宿主环境提供的 API**。

## 全局对象的差异

在浏览器中，你习惯了 `window` 作为全局对象：

```javascript
// 浏览器
console.log(window.location.href);
console.log(window.innerWidth);
window.alert('Hello');
```

在 Node.js 中，全局对象是 `global`：

```javascript
// Node.js
console.log(global.process.version);
console.log(global.Buffer);
// global.alert 不存在！
```

从 ES2020 开始，JavaScript 引入了 `globalThis`，它在两个环境中都指向各自的全局对象：

```javascript
// 浏览器中：globalThis === window
// Node.js 中：globalThis === global
console.log(globalThis);
```

**实践建议**：在编写跨环境代码时，优先使用 `globalThis`。

## API 能力对比

让我们直观地对比两个环境的核心 API：

| 能力 | 浏览器 | Node.js |
|------|--------|---------|
| DOM 操作 | `document.querySelector()` | ❌ 不存在 |
| 页面存储 | `localStorage`, `sessionStorage` | ❌ 不存在 |
| 网络请求 | `fetch()`, `XMLHttpRequest` | `http`, `https` 模块 |
| 定时器 | `setTimeout`, `setInterval` | ✅ 相同 |
| 文件操作 | ❌ 不存在 | `fs` 模块 |
| 进程控制 | ❌ 不存在 | `process`, `child_process` |
| 二进制数据 | `ArrayBuffer`, `Blob` | `Buffer` |
| 路径处理 | ❌ 不存在 | `path` 模块 |
| 加密功能 | `crypto.subtle` | `crypto` 模块 |

思考一下：为什么浏览器没有文件操作 API？

答案很简单：**安全**。如果网页能随意读写你电脑上的文件，那将是一场灾难。浏览器是沙箱环境，刻意限制了对系统资源的访问。

而 Node.js 运行在服务器上，由开发者完全控制，因此可以拥有完整的系统访问能力。

## 事件循环的差异

虽然两个环境都有事件循环，但它们的实现细节有所不同。

**浏览器的事件循环**关注渲染：

```javascript
// 浏览器
setTimeout(() => console.log('timeout'), 0);
requestAnimationFrame(() => console.log('animation frame'));
Promise.resolve().then(() => console.log('microtask'));

// 输出：microtask → animation frame → timeout
```

**Node.js 的事件循环**关注 I/O：

```javascript
// Node.js
setTimeout(() => console.log('timeout'), 0);
setImmediate(() => console.log('immediate'));
Promise.resolve().then(() => console.log('microtask'));

// 输出：microtask → 顺序可能是 timeout → immediate 或 immediate → timeout
```

注意 `setImmediate` 是 Node.js 特有的 API，浏览器中不存在。而 `requestAnimationFrame` 是浏览器特有的，用于动画渲染。

**关键认知**：Node.js 的事件循环有六个阶段（timers、pending callbacks、idle/prepare、poll、check、close callbacks），比浏览器更复杂。但作为入门，你只需要知道：**微任务优先于宏任务执行**，这一点两个环境是一致的。

## 模块系统的演进

模块系统是另一个重要差异。

**浏览器的历史**：
1. 早期：全局变量 + `<script>` 标签
2. 过渡期：AMD（RequireJS）、CMD（SeaJS）
3. 现代：ES Modules（`import`/`export`）

**Node.js 的历史**：
1. 诞生起：CommonJS（`require`/`module.exports`）
2. 现代：同时支持 CommonJS 和 ES Modules

现在，两个环境都支持 ES Modules，但细节上仍有差异。这个话题我们会在后续章节详细讨论。

## 可以直接迁移的能力

好消息是，作为资深前端开发者，你有大量的知识可以直接迁移到 Node.js：

**100% 通用**：
- JavaScript 语言特性（ES6+）
- Promise 和 async/await
- 数组/对象操作方法
- JSON 处理
- 正则表达式
- 错误处理（try/catch）

**大部分通用**：
- 第三方库（lodash、dayjs、axios 等）
- TypeScript
- 测试框架（Jest、Mocha）
- 代码规范（ESLint、Prettier）

## 需要重新学习的能力

同时，有一些能力是前端开发中很少涉及的，需要重新学习：

**系统级 API**：
- 文件系统操作（`fs` 模块）
- 网络编程（`http`、`net` 模块）
- 进程管理（`child_process`、`cluster`）
- 二进制数据处理（`Buffer`）
- 流式处理（`Stream`）

**服务端思维**：
- 并发处理：同时服务成千上万个请求
- 资源管理：内存泄漏、连接池、文件句柄
- 安全意识：输入验证、SQL 注入、XSS
- 错误恢复：进程崩溃后的自动重启
- 日志记录：结构化日志、日志级别

**运维相关**：
- 进程守护：PM2、systemd
- 性能监控：APM、指标收集
- 配置管理：环境变量、配置文件

## 实际代码对比

让我们用一个具体的例子来感受两个环境的差异。

**需求**：获取当前运行环境的信息。

**浏览器实现**：

```javascript
// 浏览器环境信息
const info = {
  url: window.location.href,
  userAgent: navigator.userAgent,
  screenWidth: window.innerWidth,
  screenHeight: window.innerHeight,
  language: navigator.language,
  online: navigator.onLine
};
console.log(info);
```

**Node.js 实现**：

```javascript
// Node.js 环境信息
const os = require('os');

const info = {
  cwd: process.cwd(),
  nodeVersion: process.version,
  platform: process.platform,
  arch: process.arch,
  cpus: os.cpus().length,
  totalMemory: os.totalmem(),
  freeMemory: os.freemem(),
  uptime: os.uptime()
};
console.log(info);
```

两段代码做的是类似的事情——获取环境信息，但使用的 API 完全不同。这就是运行时环境差异的具体体现。

## 思维模式的转变

最后，让我们谈谈思维模式的转变。

**前端思维**通常关注：
- 用户体验
- 页面性能
- 视觉呈现
- 交互响应

**后端思维**需要关注：
- 系统稳定性
- 并发处理
- 数据一致性
- 资源效率

举个例子：在前端，一个函数执行 100ms 可能没问题；但在后端，如果每个请求都阻塞 100ms，并发 1000 个请求就意味着 100 秒的处理时间——这是不可接受的。

这就是为什么 Node.js 如此强调**非阻塞 I/O** 和**异步编程**。我们将在下一章深入探讨这个话题。

## 本章小结

- 浏览器和 Node.js 共享 JavaScript 语言，但 API 完全不同
- 浏览器面向用户交互，Node.js 面向系统编程
- 全局对象：浏览器是 `window`，Node.js 是 `global`，通用是 `globalThis`
- 你的 JavaScript 能力可以完全迁移，但需要学习系统级 API 和服务端思维
- 理解环境差异是成为全栈开发者的第一步

下一章，我们将快速了解 Node.js 的整体架构，建立正确的心智模型。
