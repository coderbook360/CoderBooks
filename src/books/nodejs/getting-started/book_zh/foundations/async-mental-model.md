# 从单线程理解异步思维模型

为什么 Node.js 代码都是回调、Promise、async/await？

如果你写过前端代码，你一定熟悉这些异步模式。但在前端，异步主要用于"不阻塞 UI"；而在 Node.js，异步是关乎"服务器能否正常工作"的生死问题。

本章我们将建立正确的异步思维模型，理解为什么 Node.js 开发者如此执着于异步编程。

## 一个餐厅的故事

想象一家只有一个服务员的餐厅。

**同步模式**的服务员：
1. 接待客人 A，带到座位
2. 等客人 A 看完菜单
3. 记录客人 A 的订单
4. 去厨房等菜做好
5. 把菜端给客人 A
6. 等客人 A 吃完
7. 收钱送客
8. **然后才能接待下一位客人**

这样的餐厅一小时能服务几个客人？可能只有两三个。

**异步模式**的服务员：
1. 接待客人 A，带到座位，给菜单
2. 不等待，去接待客人 B
3. 客人 A 招手表示选好了，过去记录订单
4. 订单送到厨房，不等待
5. 继续服务其他客人
6. 厨房喊"A 号桌的菜好了"，服务员去端菜
7. ...

这个服务员可以同时服务十几桌客人，效率天差地别。

**Node.js 就是那个异步模式的服务员。**

## 同步 vs 异步的本质

让我们用代码来理解这两种模式：

**同步阻塞**：

```javascript
const fs = require('fs');

console.log('开始读取文件');
const data = fs.readFileSync('large-file.txt', 'utf8'); // 阻塞在这里
console.log('文件读取完成');
console.log('继续处理其他任务');

// 输出顺序一定是：
// 开始读取文件
// 文件读取完成
// 继续处理其他任务
```

在 `readFileSync` 执行期间，整个 Node.js 进程什么都干不了。如果文件有 1GB，读取需要 10 秒，那这 10 秒内服务器完全瘫痪。

**异步非阻塞**：

```javascript
const fs = require('fs');

console.log('开始读取文件');
fs.readFile('large-file.txt', 'utf8', (err, data) => {
  console.log('文件读取完成');
});
console.log('继续处理其他任务');

// 输出顺序是：
// 开始读取文件
// 继续处理其他任务
// 文件读取完成
```

`readFile` 立即返回，主线程继续执行后续代码。文件读取在后台进行，完成后通过回调通知。

## 异步编程的心智模型

理解异步编程，需要建立这样的心智模型：

```
发起异步操作
    ↓
立即返回（不等待）
    ↓
主线程继续执行后续代码
    ↓
...（时间流逝，操作在后台进行）...
    ↓
操作完成，回调函数被放入队列
    ↓
事件循环取出回调执行
```

**关键认知**：你的代码不是按书写顺序执行的，而是按**完成顺序**执行的。

```javascript
console.log('1');

setTimeout(() => {
  console.log('2');
}, 0);

Promise.resolve().then(() => {
  console.log('3');
});

console.log('4');

// 输出：1, 4, 3, 2
// 为什么？因为：
// - 同步代码先执行：1, 4
// - 微任务（Promise）次之：3
// - 宏任务（setTimeout）最后：2
```

## 别阻塞事件循环

这是 Node.js 开发的第一原则：**永远不要阻塞事件循环**。

### 常见的阻塞操作

**1. 同步 I/O 操作**

```javascript
// ❌ 错误：使用同步 API
const data = fs.readFileSync('file.txt');
const parsed = JSON.parse(data);

// ✅ 正确：使用异步 API
fs.readFile('file.txt', (err, data) => {
  const parsed = JSON.parse(data);
});
```

**2. 大量 CPU 计算**

```javascript
// ❌ 错误：阻塞主线程
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}
const result = fibonacci(45); // 可能需要几十秒

// ✅ 正确：使用 Worker Threads（后续章节讲解）
// 或者分批处理
```

**3. 复杂的正则表达式**

```javascript
// ❌ 危险：可能导致灾难性回溯
const evilRegex = /^(a+)+$/;
evilRegex.test('aaaaaaaaaaaaaaaaaaaaaaaaaaaa!'); // 可能卡死

// ✅ 正确：优化正则，设置超时
```

**4. 大型 JSON 解析**

```javascript
// ❌ 风险：解析大型 JSON 是同步操作
const hugeData = JSON.parse(hugeJsonString); // 可能阻塞数秒

// ✅ 正确：使用流式 JSON 解析器
// 或者分批处理
```

### 如何检测阻塞

一个简单的检测方法：

```javascript
// 监控事件循环延迟
let lastCheck = Date.now();

setInterval(() => {
  const now = Date.now();
  const delay = now - lastCheck - 1000;
  if (delay > 100) {
    console.log(`事件循环延迟了 ${delay}ms`);
  }
  lastCheck = now;
}, 1000);
```

如果延迟经常超过 100ms，说明有代码在阻塞事件循环。

## I/O 密集 vs CPU 密集

理解这两个概念对选择技术方案很重要。

**I/O 密集型**：大部分时间在等待 I/O 操作
- 读写文件
- 数据库查询
- 网络请求
- 外部 API 调用

```javascript
// 典型的 I/O 密集型操作
async function handleRequest(req) {
  const user = await db.findUser(req.userId);    // 等待数据库
  const posts = await db.findPosts(user.id);      // 等待数据库
  const comments = await api.fetchComments();     // 等待网络
  return { user, posts, comments };
}
// CPU 大部分时间是空闲的，在等待 I/O
```

**CPU 密集型**：大部分时间在进行计算
- 图像处理
- 视频编码
- 加密解密
- 复杂算法

```javascript
// 典型的 CPU 密集型操作
function processImage(buffer) {
  // 逐像素处理
  for (let i = 0; i < buffer.length; i++) {
    buffer[i] = applyFilter(buffer[i]);
  }
  return buffer;
}
// CPU 一直在忙碌计算
```

**Node.js 的选择**：
- I/O 密集型：Node.js 的强项，异步 I/O 大显身手
- CPU 密集型：需要使用 Worker Threads 或子进程

## 异步编程的三种形态

Node.js 中异步编程有三种主要形态，它们是一个演进的过程：

### 1. 回调函数（Callback）

```javascript
// 最原始的异步模式
fs.readFile('file.txt', (err, data) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log(data);
});
```

优点：简单直接
缺点：容易形成回调地狱

### 2. Promise

```javascript
// Promise 模式
const fsPromises = require('fs').promises;

fsPromises.readFile('file.txt')
  .then(data => console.log(data))
  .catch(err => console.error(err));
```

优点：链式调用，错误传播
缺点：仍然有 `.then` 链

### 3. async/await

```javascript
// 现代异步模式
const fsPromises = require('fs').promises;

async function readData() {
  try {
    const data = await fsPromises.readFile('file.txt');
    console.log(data);
  } catch (err) {
    console.error(err);
  }
}
```

优点：代码看起来像同步，易读易维护
缺点：需要理解 Promise 基础

我们将在第二部分详细讲解这三种模式。

## 实战：感受异步的威力

让我们用一个实际例子感受异步编程的威力。

假设我们需要同时读取 5 个文件：

**同步方式**（总耗时 = 各文件耗时之和）：

```javascript
const fs = require('fs');

console.time('sync');
const file1 = fs.readFileSync('file1.txt');
const file2 = fs.readFileSync('file2.txt');
const file3 = fs.readFileSync('file3.txt');
const file4 = fs.readFileSync('file4.txt');
const file5 = fs.readFileSync('file5.txt');
console.timeEnd('sync');
// 假设每个文件读取 100ms，总耗时约 500ms
```

**异步并发方式**（总耗时 ≈ 最慢的那个文件）：

```javascript
const fs = require('fs').promises;

console.time('async');
const [file1, file2, file3, file4, file5] = await Promise.all([
  fs.readFile('file1.txt'),
  fs.readFile('file2.txt'),
  fs.readFile('file3.txt'),
  fs.readFile('file4.txt'),
  fs.readFile('file5.txt'),
]);
console.timeEnd('async');
// 总耗时约 100ms（假设文件大小相近）
```

5 倍的性能差距！这就是异步编程的威力。

## 本章小结

- 异步编程不是可选项，是 Node.js 的核心范式
- 同步阻塞会让整个服务器瘫痪，必须使用异步 I/O
- 核心原则：**永远不要阻塞事件循环**
- Node.js 适合 I/O 密集型任务，CPU 密集型需要特殊处理
- 异步编程有三种形态：回调 → Promise → async/await
- 异步并发可以显著提升性能

下一章，我们将学习 Node.js 的模块系统——CommonJS 和 ES Modules 的对比与选择。
