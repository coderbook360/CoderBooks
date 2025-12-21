# 回调模式的本质与问题

为什么要理解回调？

即使现在 async/await 已经是主流，理解回调仍然非常重要。Node.js 的核心 API 最初都是回调风格的，大量的老代码和第三方库仍在使用回调。更重要的是，理解回调是理解 Promise 的前提——Promise 本质上是对回调的抽象和改进。

本章我们将深入理解回调模式，了解它的设计理念和局限性。

## 回调的本质

**回调函数**就是"作为参数传递给另一个函数的函数"。

```javascript
// 最简单的回调
function greet(name, callback) {
  const message = `Hello, ${name}!`;
  callback(message);
}

greet('World', (msg) => {
  console.log(msg); // Hello, World!
});
```

这个例子中，匿名箭头函数就是回调函数。`greet` 函数在完成自己的工作后，调用这个回调来传递结果。

### 同步回调 vs 异步回调

**同步回调**：立即执行

```javascript
const numbers = [1, 2, 3];
numbers.forEach(n => console.log(n)); // 立即执行
console.log('done');
// 输出：1, 2, 3, done
```

**异步回调**：稍后执行

```javascript
setTimeout(() => console.log('timeout'), 0);
console.log('done');
// 输出：done, timeout
```

在 Node.js 中，我们主要讨论的是**异步回调**——用于处理 I/O 操作、定时器等异步任务的回调。

### 控制反转

回调模式的核心思想是**控制反转**（Inversion of Control）：

- 传统模式：你调用函数，获取返回值
- 回调模式：你把函数交给别人，让别人在合适的时机调用

```javascript
// 传统模式：你控制流程
const data = readFileSync('file.txt');
processData(data);

// 回调模式：你交出控制权
readFile('file.txt', (err, data) => {
  processData(data);  // 由 readFile 决定何时调用
});
```

## Node.js 的错误优先回调

Node.js 建立了一个重要的约定：**错误优先回调**（Error-First Callback）。

```javascript
fs.readFile('file.txt', (err, data) => {
  // 第一个参数永远是 error
  if (err) {
    console.error('读取失败:', err);
    return;
  }
  // 成功时 err 为 null
  console.log('读取成功:', data);
});
```

### 约定规则

1. 回调函数的**第一个参数**是错误对象
2. 如果操作成功，错误对象为 `null` 或 `undefined`
3. 如果操作失败，错误对象包含错误信息
4. 后续参数是操作的结果数据

### 为什么这样设计

这个约定解决了一个关键问题：**如何在异步代码中传递错误？**

同步代码可以用 throw：

```javascript
function syncOperation() {
  throw new Error('出错了');
}

try {
  syncOperation();
} catch (err) {
  console.error(err);
}
```

但异步代码中 throw 无效：

```javascript
function asyncOperation(callback) {
  setTimeout(() => {
    // 这个 throw 无法被外部 catch 捕获！
    throw new Error('出错了');
  }, 100);
}

try {
  asyncOperation(() => {}); // try/catch 无效
} catch (err) {
  console.error(err); // 永远不会执行
}
```

错误优先回调用约定解决了这个问题：

```javascript
function asyncOperation(callback) {
  setTimeout(() => {
    const err = new Error('出错了');
    callback(err, null); // 通过回调传递错误
  }, 100);
}

asyncOperation((err, result) => {
  if (err) {
    console.error(err); // 正确处理错误
    return;
  }
  console.log(result);
});
```

## 回调地狱

当多个异步操作需要串行执行时，回调会形成层层嵌套，这就是臭名昭著的**回调地狱**（Callback Hell）：

```javascript
// 需求：读取用户 → 获取文章 → 获取评论 → 发送通知

getUser(userId, (err, user) => {
  if (err) {
    console.error('获取用户失败', err);
    return;
  }
  
  getPosts(user.id, (err, posts) => {
    if (err) {
      console.error('获取文章失败', err);
      return;
    }
    
    getComments(posts[0].id, (err, comments) => {
      if (err) {
        console.error('获取评论失败', err);
        return;
      }
      
      sendNotification(user.email, comments, (err, result) => {
        if (err) {
          console.error('发送通知失败', err);
          return;
        }
        
        console.log('完成！', result);
      });
    });
  });
});
```

### 回调地狱的问题

**1. 代码难以阅读**

嵌套层级越深，代码越难理解。这种金字塔形状的代码被戏称为"末日金字塔"。

**2. 错误处理分散**

每层回调都需要处理错误，代码充斥着 `if (err)` 检查。

**3. 难以复用和修改**

如果需要调整执行顺序或添加新步骤，改动非常困难。

**4. 变量作用域混乱**

深层嵌套中，很难追踪变量来自哪一层。

## 回调的更多问题

除了回调地狱，回调模式还有其他固有问题：

### 1. 回调可能被多次调用

```javascript
function riskyOperation(callback) {
  // 糟糕的代码：可能多次调用回调
  if (someCondition) {
    callback(null, 'result');
  }
  if (anotherCondition) {
    callback(null, 'another result'); // 又调用了一次！
  }
}
```

调用者无法阻止回调被多次调用。

### 2. 回调可能永远不被调用

```javascript
function forgotToCallback(callback) {
  const result = doSomething();
  // 忘记调用 callback 了！
  // callback(null, result);
}
```

调用者会永远等待。

### 3. 回调可能同步调用也可能异步调用

```javascript
function inconsistentCallback(value, callback) {
  if (cache[value]) {
    callback(null, cache[value]); // 同步调用
  } else {
    fetchFromServer(value, callback); // 异步调用
  }
}
```

这种不一致性会导致难以调试的 bug。

### 4. 无法取消

一旦发起异步操作，通常没有标准方式取消它。

### 5. 难以组合

假设需要并行执行多个操作，回调方式非常繁琐：

```javascript
// 并行获取三个用户
let completed = 0;
const results = [];

function checkComplete() {
  if (completed === 3) {
    processAllUsers(results);
  }
}

getUser(1, (err, user) => {
  if (err) return handleError(err);
  results[0] = user;
  completed++;
  checkComplete();
});

getUser(2, (err, user) => {
  if (err) return handleError(err);
  results[1] = user;
  completed++;
  checkComplete();
});

getUser(3, (err, user) => {
  if (err) return handleError(err);
  results[2] = user;
  completed++;
  checkComplete();
});
```

这段代码冗长且容易出错。

## 改进回调代码

在 Promise 出现之前，有一些技巧可以改善回调代码：

### 1. 命名函数代替匿名函数

```javascript
// 改进前
getUser(userId, (err, user) => {
  getPosts(user.id, (err, posts) => {
    // ...
  });
});

// 改进后
function handleUser(err, user) {
  if (err) return handleError(err);
  getPosts(user.id, handlePosts);
}

function handlePosts(err, posts) {
  if (err) return handleError(err);
  // ...
}

getUser(userId, handleUser);
```

### 2. 提前返回

```javascript
// 改进前
fs.readFile('file.txt', (err, data) => {
  if (err) {
    console.error(err);
  } else {
    processData(data);
  }
});

// 改进后
fs.readFile('file.txt', (err, data) => {
  if (err) {
    console.error(err);
    return;  // 提前返回，减少嵌套
  }
  processData(data);
});
```

### 3. 使用 async 库

在 Promise 普及之前，`async` 库提供了实用的流程控制工具：

```javascript
const async = require('async');

async.waterfall([
  callback => getUser(userId, callback),
  (user, callback) => getPosts(user.id, callback),
  (posts, callback) => getComments(posts[0].id, callback)
], (err, result) => {
  if (err) return handleError(err);
  console.log(result);
});
```

## 何时仍然使用回调

即使有了 Promise 和 async/await，回调在某些场景仍然是最佳选择：

### 1. 事件监听器

```javascript
button.addEventListener('click', (event) => {
  handleClick(event);
});

server.on('request', (req, res) => {
  handleRequest(req, res);
});
```

事件可能触发多次，回调模式是自然选择。

### 2. 流式处理

```javascript
readable.on('data', (chunk) => {
  processChunk(chunk);
});
```

### 3. 简单的一次性操作

```javascript
setTimeout(() => {
  console.log('延迟执行');
}, 1000);
```

### 4. 性能关键场景

回调比 Promise 有更低的开销，在极端性能场景可能有意义。

## 本章小结

- 回调是"将函数作为参数传递给另一个函数"
- Node.js 采用错误优先回调约定：第一个参数是 error
- 回调地狱是深层嵌套导致的代码可读性问题
- 回调模式有固有局限：可能多次调用、可能不调用、难以组合
- 事件监听、流式处理等场景仍适合使用回调

回调的问题促使了 Promise 的诞生。下一章，我们将学习 Promise 如何优雅地解决这些问题。
