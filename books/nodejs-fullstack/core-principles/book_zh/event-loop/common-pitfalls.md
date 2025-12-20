# 事件循环常见陷阱

理解事件循环的常见陷阱可以帮助你避免性能问题和难以调试的bug。本章汇总了实践中最常见的问题及其解决方案。

## 陷阱1：阻塞事件循环

### 问题

```javascript
const express = require('express');
const app = express();

app.get('/heavy', (req, res) => {
  // 错误：同步的CPU密集操作
  const result = heavyComputation();  // 可能需要5秒
  res.json(result);
});

app.get('/light', (req, res) => {
  // 这个接口也会受影响
  res.json({ message: 'hello' });
});

function heavyComputation() {
  let result = 0;
  for (let i = 0; i < 1e9; i++) {
    result += Math.sqrt(i);
  }
  return result;
}
```

**后果**：当`/heavy`正在执行时，所有其他请求都必须等待。

### 解决方案

#### 方案1：使用Worker线程

```javascript
const { Worker } = require('worker_threads');

app.get('/heavy', (req, res) => {
  const worker = new Worker('./heavy-worker.js');
  
  worker.on('message', (result) => {
    res.json(result);
  });
  
  worker.on('error', (err) => {
    res.status(500).json({ error: err.message });
  });
});

// heavy-worker.js
const { parentPort } = require('worker_threads');

function heavyComputation() {
  let result = 0;
  for (let i = 0; i < 1e9; i++) {
    result += Math.sqrt(i);
  }
  return result;
}

parentPort.postMessage({ result: heavyComputation() });
```

#### 方案2：分割任务

```javascript
app.get('/heavy', async (req, res) => {
  const result = await heavyComputationAsync();
  res.json(result);
});

function heavyComputationAsync() {
  return new Promise((resolve) => {
    let result = 0;
    let i = 0;
    const batchSize = 1e6;
    
    function processBatch() {
      const end = Math.min(i + batchSize, 1e9);
      while (i < end) {
        result += Math.sqrt(i++);
      }
      
      if (i < 1e9) {
        setImmediate(processBatch);  // 让出控制权
      } else {
        resolve(result);
      }
    }
    
    setImmediate(processBatch);
  });
}
```

## 陷阱2：同步I/O

### 问题

```javascript
// 错误：在请求处理中使用同步I/O
app.get('/config', (req, res) => {
  const config = fs.readFileSync('config.json');  // 阻塞！
  res.json(JSON.parse(config));
});

// 错误：在启动后使用同步方法
setInterval(() => {
  const data = fs.readFileSync('data.json');  // 每次都阻塞
  process(data);
}, 1000);
```

### 解决方案

```javascript
// 正确：使用异步方法
app.get('/config', async (req, res) => {
  const config = await fs.promises.readFile('config.json');
  res.json(JSON.parse(config));
});

// 或者：启动时缓存
let cachedConfig;
async function loadConfig() {
  cachedConfig = JSON.parse(
    await fs.promises.readFile('config.json')
  );
}

app.get('/config', (req, res) => {
  res.json(cachedConfig);
});
```

### 检测同步I/O

```bash
# 使用--trace-sync-io标志
node --trace-sync-io app.js

# 会警告所有同步I/O调用
# WARNING: sync operation in /.../file.js at line 10
```

## 陷阱3：过多的定时器

### 问题

```javascript
// 错误：为每个用户创建独立定时器
class UserSession {
  constructor(userId) {
    this.userId = userId;
    // 每个会话一个定时器
    this.timer = setInterval(() => {
      this.checkActivity();
    }, 60000);
  }
}

// 10万用户 = 10万个定时器
```

### 解决方案

```javascript
// 正确：使用单个定时器批量处理
class SessionManager {
  constructor() {
    this.sessions = new Map();
    
    // 单个定时器检查所有会话
    setInterval(() => {
      for (const session of this.sessions.values()) {
        session.checkActivity();
      }
    }, 60000);
  }
  
  addSession(userId) {
    this.sessions.set(userId, new UserSession(userId));
  }
  
  removeSession(userId) {
    this.sessions.delete(userId);
  }
}
```

## 陷阱4：Promise地狱

### 问题

```javascript
// 错误：串行执行可以并行的操作
async function getData() {
  const users = await fetchUsers();
  const products = await fetchProducts();
  const orders = await fetchOrders();
  // 总时间 = users + products + orders
  
  return { users, products, orders };
}
```

### 解决方案

```javascript
// 正确：并行执行独立操作
async function getData() {
  const [users, products, orders] = await Promise.all([
    fetchUsers(),
    fetchProducts(),
    fetchOrders()
  ]);
  // 总时间 = max(users, products, orders)
  
  return { users, products, orders };
}

// 带错误处理
async function getDataSafe() {
  const results = await Promise.allSettled([
    fetchUsers(),
    fetchProducts(),
    fetchOrders()
  ]);
  
  return {
    users: results[0].status === 'fulfilled' ? results[0].value : [],
    products: results[1].status === 'fulfilled' ? results[1].value : [],
    orders: results[2].status === 'fulfilled' ? results[2].value : []
  };
}
```

## 陷阱5：nextTick饿死I/O

### 问题

```javascript
// 错误：无限递归nextTick
function processQueue(queue) {
  if (queue.length === 0) return;
  
  process(queue.shift());
  process.nextTick(() => processQueue(queue));  // I/O永远没机会执行
}

processQueue(hugeQueue);  // 阻塞事件循环
```

### 解决方案

```javascript
// 正确：使用setImmediate
function processQueue(queue) {
  if (queue.length === 0) return;
  
  process(queue.shift());
  setImmediate(() => processQueue(queue));  // 让I/O有机会执行
}

// 或者：批处理
function processQueue(queue, batchSize = 100) {
  if (queue.length === 0) return;
  
  for (let i = 0; i < batchSize && queue.length > 0; i++) {
    process(queue.shift());
  }
  
  setImmediate(() => processQueue(queue, batchSize));
}
```

## 陷阱6：忘记清理资源

### 问题

```javascript
// 错误：定时器泄漏
class Poller {
  start() {
    this.timer = setInterval(() => {
      this.poll();
    }, 1000);
  }
  
  // 忘记实现stop方法
}

// 每次创建新Poller，旧的定时器还在运行
let poller = new Poller();
poller.start();
poller = new Poller();  // 旧的泄漏了
poller.start();
```

### 解决方案

```javascript
// 正确：实现清理方法
class Poller {
  start() {
    this.stop();  // 先停止旧的
    this.timer = setInterval(() => {
      this.poll();
    }, 1000);
  }
  
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

// 或者使用AbortController
class Poller {
  constructor() {
    this.controller = null;
  }
  
  start() {
    this.stop();
    this.controller = new AbortController();
    
    const poll = async () => {
      while (!this.controller.signal.aborted) {
        await this.poll();
        await sleep(1000);
      }
    };
    
    poll();
  }
  
  stop() {
    if (this.controller) {
      this.controller.abort();
    }
  }
}
```

## 陷阱7：误解执行顺序

### 问题

```javascript
// 依赖不确定的执行顺序
let data;

setTimeout(() => {
  data = 'loaded';
}, 0);

setImmediate(() => {
  console.log(data);  // 可能是undefined！
});
```

### 解决方案

```javascript
// 正确：使用明确的依赖关系
async function main() {
  const data = await loadData();
  processData(data);
}

// 或使用Promise
const dataPromise = new Promise((resolve) => {
  setTimeout(() => resolve('loaded'), 0);
});

setImmediate(async () => {
  const data = await dataPromise;
  console.log(data);  // 确定是'loaded'
});
```

## 陷阱8：回调中的this丢失

### 问题

```javascript
class DataProcessor {
  constructor() {
    this.data = [];
  }
  
  load(callback) {
    setTimeout(() => {
      this.data.push('item');  // this是什么？
      callback();
    }, 100);
  }
}
```

### 解决方案

```javascript
// 方案1：箭头函数
class DataProcessor {
  load(callback) {
    setTimeout(() => {
      this.data.push('item');  // 箭头函数保持this
      callback();
    }, 100);
  }
}

// 方案2：bind
class DataProcessor {
  load(callback) {
    setTimeout(function() {
      this.data.push('item');
      callback();
    }.bind(this), 100);
  }
}

// 方案3：保存引用
class DataProcessor {
  load(callback) {
    const self = this;
    setTimeout(function() {
      self.data.push('item');
      callback();
    }, 100);
  }
}
```

## 陷阱9：错误处理遗漏

### 问题

```javascript
// 错误：未捕获的异步错误
app.get('/data', async (req, res) => {
  const data = await fetchData();  // 如果抛错呢？
  res.json(data);
});

// 错误：事件发射器错误未处理
const emitter = new EventEmitter();
emitter.emit('error', new Error('oops'));  // 会崩溃！
```

### 解决方案

```javascript
// 正确：Express异步错误处理
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

app.get('/data', asyncHandler(async (req, res) => {
  const data = await fetchData();
  res.json(data);
}));

// 正确：事件发射器错误处理
emitter.on('error', (err) => {
  console.error('Emitter error:', err);
});

// 全局未捕获处理
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});
```

## 陷阱10：内存泄漏

### 问题

```javascript
// 问题：闭包引用大对象
function processLargeData() {
  const largeData = new Array(1000000).fill('x');
  
  setInterval(() => {
    // largeData被闭包引用，无法释放
    console.log(largeData.length);
  }, 1000);
}

// 问题：监听器累积
const server = net.createServer();

setInterval(() => {
  // 每次都添加新监听器
  server.on('connection', handleConnection);
}, 1000);
```

### 解决方案

```javascript
// 正确：只引用需要的数据
function processLargeData() {
  const largeData = new Array(1000000).fill('x');
  const length = largeData.length;  // 只保存需要的
  
  setInterval(() => {
    console.log(length);
  }, 1000);
}

// 正确：一次性添加监听器
server.on('connection', handleConnection);

// 或者：移除旧监听器
let currentHandler = null;

setInterval(() => {
  if (currentHandler) {
    server.removeListener('connection', currentHandler);
  }
  currentHandler = handleConnection;
  server.on('connection', currentHandler);
}, 1000);
```

## 检测问题的工具

### 内存泄漏检测

```javascript
// 定期检查内存
setInterval(() => {
  const usage = process.memoryUsage();
  console.log({
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + 'MB',
    external: Math.round(usage.external / 1024 / 1024) + 'MB'
  });
}, 30000).unref();
```

### 事件循环阻塞检测

```javascript
let lastCheck = Date.now();

setInterval(() => {
  const now = Date.now();
  const delay = now - lastCheck - 1000;
  
  if (delay > 100) {
    console.warn(`事件循环阻塞: ${delay}ms`);
  }
  
  lastCheck = now;
}, 1000);
```

### 监听器泄漏检测

```javascript
// 设置警告阈值
require('events').EventEmitter.defaultMaxListeners = 10;

// 捕获警告
process.on('warning', (warning) => {
  if (warning.name === 'MaxListenersExceededWarning') {
    console.error('可能的监听器泄漏:', warning.message);
  }
});
```

## 最佳实践清单

### ✅ 应该做的

- 使用异步I/O方法
- 将CPU密集任务移到Worker线程
- 使用`Promise.all`并行化独立操作
- 正确清理定时器和监听器
- 设置错误处理
- 监控事件循环延迟
- 使用`setImmediate`而非递归`nextTick`

### ❌ 避免做的

- 在请求处理中使用同步方法
- 在主线程执行长时间计算
- 创建过多定时器
- 依赖不确定的执行顺序
- 忽略错误处理
- 闭包引用大对象

## 本章小结

- 阻塞事件循环是最常见的性能问题
- 同步I/O应只在启动时使用
- 合理使用定时器，避免创建过多
- 并行化独立的异步操作
- 正确处理错误和清理资源
- 使用监控工具及时发现问题

下一章，我们将介绍事件循环性能调优技术。
