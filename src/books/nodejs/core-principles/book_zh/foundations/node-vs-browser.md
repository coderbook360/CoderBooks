# Node.js与浏览器JavaScript的差异

JavaScript是一门语言，但运行环境决定了它的能力边界。Node.js和浏览器提供了截然不同的运行时环境，理解这些差异是从前端过渡到后端的关键。

## 全局对象差异

### 浏览器全局对象

```javascript
// 浏览器中
console.log(window);        // Window对象
console.log(document);      // DOM树
console.log(location);      // URL信息
console.log(navigator);     // 浏览器信息
console.log(localStorage);  // 本地存储
```

### Node.js全局对象

```javascript
// Node.js中
console.log(global);        // 全局命名空间
console.log(process);       // 进程信息
console.log(Buffer);        // 二进制数据
console.log(__dirname);     // 当前模块目录
console.log(__filename);    // 当前模块文件路径
console.log(module);        // 当前模块
console.log(require);       // 模块加载函数
```

### globalThis统一

ES2020引入了`globalThis`，提供跨环境的全局对象访问：

```javascript
// 浏览器和Node.js都可用
console.log(globalThis);

// 在浏览器中：globalThis === window
// 在Node.js中：globalThis === global
```

## 模块系统差异

### 浏览器模块

```html
<!-- 传统方式：script标签 -->
<script src="app.js"></script>

<!-- ES Modules -->
<script type="module">
  import { hello } from './utils.js';
</script>
```

### Node.js模块

```javascript
// CommonJS（传统方式）
const fs = require('fs');
const { readFile } = require('fs');
module.exports = { myFunction };

// ES Modules（现代方式）
import fs from 'fs';
import { readFile } from 'fs';
export { myFunction };
```

### 模块解析差异

| 特性 | 浏览器ESM | Node.js ESM | Node.js CJS |
|-----|----------|-------------|-------------|
| 路径 | 必须完整（含扩展名） | 可省略扩展名 | 可省略扩展名 |
| URL | 支持http:// | 仅file:// | N/A |
| node_modules | 不支持 | 自动查找 | 自动查找 |
| 动态导入 | import() | import() | require() |

```javascript
// 浏览器ESM（必须完整路径）
import { util } from './utils.js';

// Node.js（可省略）
import { util } from './utils';

// Node.js内置模块
import fs from 'node:fs';  // 推荐的node:前缀
import fs from 'fs';       // 也可以
```

## API差异

### 浏览器独有API

```javascript
// DOM操作
document.getElementById('app');
document.querySelector('.item');

// 事件监听
element.addEventListener('click', handler);

// 网络请求
fetch('/api/data');
new XMLHttpRequest();

// 存储
localStorage.setItem('key', 'value');
sessionStorage.getItem('key');
indexedDB.open('database');

// Web API
new WebSocket('ws://example.com');
new Worker('worker.js');
navigator.geolocation.getCurrentPosition();
```

### Node.js独有API

```javascript
// 文件系统
const fs = require('fs');
fs.readFile('data.txt', callback);

// 操作系统
const os = require('os');
os.cpus();
os.freemem();

// 路径处理
const path = require('path');
path.join(__dirname, 'file.txt');

// 子进程
const { spawn } = require('child_process');
spawn('ls', ['-la']);

// 网络服务器
const http = require('http');
http.createServer(handler).listen(3000);

// 加密
const crypto = require('crypto');
crypto.createHash('sha256');
```

## 逐渐融合的API

Node.js正在实现更多Web标准API：

```javascript
// 这些API现在Node.js也支持

// Fetch API（Node.js 18+）
const response = await fetch('https://api.example.com');

// Web Crypto（Node.js 15+）
crypto.subtle.digest('SHA-256', data);

// URL API（一直支持）
const url = new URL('https://example.com/path?query=1');

// AbortController（Node.js 15+）
const controller = new AbortController();
fetch(url, { signal: controller.signal });

// TextEncoder/TextDecoder（一直支持）
const encoder = new TextEncoder();
const decoder = new TextDecoder();

// Blob（Node.js 18+）
const blob = new Blob(['hello']);

// FormData（Node.js 18+）
const formData = new FormData();

// WebSocket客户端（Node.js 22+）
const ws = new WebSocket('ws://example.com');
```

## 事件循环差异

虽然都基于事件循环，但实现细节不同：

### 浏览器事件循环

```
┌─────────────────────────────────┐
│           宏任务队列              │
│  (setTimeout, setInterval,      │
│   事件回调, requestAnimationFrame)│
├─────────────────────────────────┤
│           微任务队列              │
│  (Promise.then, MutationObserver)│
├─────────────────────────────────┤
│           渲染                   │
│  (布局计算, 绘制)                 │
└─────────────────────────────────┘
```

### Node.js事件循环

```
┌─────────────────────────────────┐
│           timers                │
│  (setTimeout, setInterval)      │
├─────────────────────────────────┤
│         pending callbacks       │
├─────────────────────────────────┤
│          poll (I/O)            │
├─────────────────────────────────┤
│           check                 │
│  (setImmediate)                │
├─────────────────────────────────┤
│       close callbacks          │
└─────────────────────────────────┘
       + process.nextTick队列
       + 微任务队列
```

### 关键差异

```javascript
// setImmediate只在Node.js中存在
setImmediate(() => console.log('immediate'));

// requestAnimationFrame只在浏览器中存在
requestAnimationFrame(() => console.log('frame'));

// process.nextTick只在Node.js中存在
process.nextTick(() => console.log('nextTick'));

// queueMicrotask在两者都支持
queueMicrotask(() => console.log('microtask'));
```

## 错误处理差异

### 浏览器错误处理

```javascript
// 全局错误捕获
window.onerror = (msg, url, line, col, error) => {
  console.log('Error:', msg);
};

// Promise拒绝捕获
window.onunhandledrejection = (event) => {
  console.log('Unhandled rejection:', event.reason);
};
```

### Node.js错误处理

```javascript
// 全局错误捕获
process.on('uncaughtException', (err) => {
  console.log('Uncaught exception:', err);
  process.exit(1);  // 建议退出
});

// Promise拒绝捕获
process.on('unhandledRejection', (reason, promise) => {
  console.log('Unhandled rejection:', reason);
});

// 警告
process.on('warning', (warning) => {
  console.warn(warning.name, warning.message);
});
```

## 安全模型差异

### 浏览器安全模型

```javascript
// 同源策略限制跨域请求
fetch('https://other-domain.com/api');  // 可能被CORS阻止

// 沙箱环境：无法访问本地文件
// 用户必须主动选择文件
input.addEventListener('change', (e) => {
  const file = e.target.files[0];
});

// CSP限制脚本来源
// <meta http-equiv="Content-Security-Policy" content="script-src 'self'">
```

### Node.js安全模型

```javascript
// 完全的文件系统访问
const fs = require('fs');
fs.readFile('/etc/passwd', (err, data) => {
  console.log(data.toString());  // 可以读取任何文件
});

// 完全的网络访问
// 没有同源策略限制
await fetch('https://any-domain.com/api');

// 可以执行系统命令
const { exec } = require('child_process');
exec('ls -la', (err, stdout) => {
  console.log(stdout);
});

// Node.js 20+权限模型（实验性）
// node --experimental-permission --allow-fs-read=./data app.js
```

### 安全意识差异

| 环境 | 信任模型 | 关注点 |
|-----|---------|-------|
| 浏览器 | 不信任代码 | 保护用户数据 |
| Node.js | 信任代码 | 保护服务器资源 |

## 并发模型

### 浏览器并发

```javascript
// Web Worker（真正的多线程）
const worker = new Worker('worker.js');
worker.postMessage({ data: 'hello' });
worker.onmessage = (e) => console.log(e.data);

// 主线程与Worker线程完全隔离
// 通过消息传递通信
```

### Node.js并发

```javascript
// Worker Threads
const { Worker, isMainThread, parentPort } = require('worker_threads');

if (isMainThread) {
  const worker = new Worker(__filename);
  worker.postMessage({ data: 'hello' });
  worker.on('message', (msg) => console.log(msg));
} else {
  parentPort.on('message', (msg) => {
    parentPort.postMessage({ result: msg.data.toUpperCase() });
  });
}

// Cluster（多进程）
const cluster = require('cluster');
if (cluster.isPrimary) {
  for (let i = 0; i < 4; i++) {
    cluster.fork();
  }
} else {
  // 工作进程
}
```

## 调试差异

### 浏览器调试

- 开发者工具（F12）
- 内置网络面板
- 内置元素检查
- 内置性能分析
- 内置内存分析

### Node.js调试

```bash
# 命令行调试器
node inspect app.js

# Chrome DevTools
node --inspect app.js
# 打开 chrome://inspect

# VS Code调试
# 配置launch.json
```

## 编码风格影响

### 浏览器代码特点

```javascript
// 用户交互驱动
button.addEventListener('click', async () => {
  const data = await fetch('/api/data');
  updateUI(data);
});

// 关注用户体验
// - 页面加载速度
// - 交互响应性
// - 视觉反馈
```

### Node.js代码特点

```javascript
// 请求驱动
app.get('/api/data', async (req, res) => {
  const data = await database.query('SELECT ...');
  res.json(data);
});

// 关注服务器性能
// - 吞吐量（QPS）
// - 内存使用
// - CPU使用
// - 错误处理
```

## 从浏览器到Node.js的思维转变

### 1. 从短生命周期到长运行进程

```javascript
// 浏览器：页面刷新就重置
let cache = {};  // 每次刷新都是新的

// Node.js：进程持续运行
let cache = {};  // 会一直累积，可能内存泄漏
```

### 2. 从单用户到多用户

```javascript
// 浏览器：只服务一个用户
const user = getCurrentUser();

// Node.js：同时服务多个用户
app.get('/profile', (req, res) => {
  // req代表不同用户的请求
  const user = req.user;
});
```

### 3. 从沙箱到完全权限

```javascript
// 浏览器：API有限，相对安全
// Node.js：完全权限，需要谨慎

// 不要直接使用用户输入
const path = require('path');
const userInput = '../../../etc/passwd';
const safePath = path.join('/safe/dir', path.basename(userInput));
```

## 本章小结

- 全局对象不同：浏览器有window、document，Node.js有process、Buffer
- 模块系统：浏览器ESM需要完整路径，Node.js支持省略和自动查找
- API差异：浏览器有DOM/BOM，Node.js有文件/网络/进程API
- Node.js正在实现更多Web标准API（Fetch、WebSocket等）
- 事件循环实现细节不同
- 安全模型：浏览器限制多，Node.js权限完全

理解这些差异，能帮助你更快地适应Node.js开发环境。下一章，我们将介绍Node.js运行时的启动流程，了解从启动到执行第一行代码的完整过程。
