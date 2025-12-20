# 常见陷阱：那些年我们踩过的异步坑

异步编程的陷阱往往不会立即暴露，而是在生产环境的高并发下突然爆发。

本章收集了 Node.js 开发中最常见的异步编程错误，帮你提前规避。

## 陷阱一：循环中的 await

### 问题

```javascript
// 效率极低的写法
async function processItems(items) {
  const results = [];
  
  for (const item of items) {
    const result = await processItem(item);  // 串行！
    results.push(result);
  }
  
  return results;
}
// 10 个任务，每个 1 秒，总共 10 秒
```

### 解决方案

**并行处理**：

```javascript
async function processItems(items) {
  return Promise.all(items.map(item => processItem(item)));
}
// 10 个任务并行，总共约 1 秒
```

**需要顺序时使用 for...of**：

```javascript
// 只有真正需要顺序时才用串行
async function processOrdered(items) {
  for (const item of items) {
    await processItem(item);  // 必须按顺序
  }
}
```

**并发控制**：

```javascript
const pLimit = require('p-limit');
const limit = pLimit(5);  // 最多 5 个并发

const results = await Promise.all(
  items.map(item => limit(() => processItem(item)))
);
```

## 陷阱二：忘记 await

### 问题

```javascript
async function saveData(data) {
  await validate(data);
  db.save(data);  // 忘记 await！
  console.log('保存成功');  // 其实还没保存完
}
```

更隐蔽的情况：

```javascript
async function cleanup() {
  files.forEach(async file => {
    await fs.unlink(file);  // 不会等待
  });
  console.log('清理完成');  // 其实没清理完
}
```

### 解决方案

```javascript
// 使用 for...of
async function cleanup() {
  for (const file of files) {
    await fs.unlink(file);
  }
  console.log('清理完成');
}

// 或 Promise.all
async function cleanup() {
  await Promise.all(files.map(file => fs.unlink(file)));
  console.log('清理完成');
}
```

## 陷阱三：在非异步函数中使用 await

### 问题

```javascript
function getData() {
  const data = await fetchData();  // SyntaxError!
  return data;
}
```

### 解决方案

```javascript
// 改为 async 函数
async function getData() {
  const data = await fetchData();
  return data;
}

// 或者返回 Promise
function getData() {
  return fetchData().then(data => data);
}
```

## 陷阱四：Promise 构造函数中的 async

### 问题

```javascript
// 这是错误的模式
const promise = new Promise(async (resolve, reject) => {
  try {
    const data = await fetchData();
    resolve(data);
  } catch (err) {
    reject(err);  // 可能不会执行
  }
});
```

问题在于：如果 `fetchData()` 抛出同步错误，它不会触发 reject，而是导致未处理的 Promise 拒绝。

### 解决方案

```javascript
// 直接使用 async 函数
async function getData() {
  const data = await fetchData();
  return data;
}

// 如果确实需要包装
function getData() {
  return fetchData();  // 已经是 Promise
}
```

## 陷阱五：未处理的 Promise 拒绝

### 问题

```javascript
async function mayFail() {
  throw new Error('失败');
}

mayFail();  // 未处理！Node.js 可能崩溃
```

```javascript
// 更隐蔽的情况
const promises = items.map(item => processItem(item));
// 忘记 await Promise.all(promises)
```

### 解决方案

```javascript
// 始终处理错误
mayFail().catch(err => console.error(err));

// 或使用 try-catch
try {
  await mayFail();
} catch (err) {
  console.error(err);
}

// 设置全局处理器作为安全网
process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的 Promise 拒绝:', reason);
});
```

## 陷阱六：竞态条件

### 问题

```javascript
let cachedUser = null;

async function getUser(id) {
  if (!cachedUser) {
    cachedUser = await fetchUser(id);  // 竞态！
  }
  return cachedUser;
}

// 多次调用可能触发多次请求
getUser(1);
getUser(1);
getUser(1);
```

### 解决方案

```javascript
let userPromise = null;

async function getUser(id) {
  if (!userPromise) {
    userPromise = fetchUser(id);  // 缓存 Promise
  }
  return userPromise;
}

// 或使用 Map 管理多个请求
const pendingRequests = new Map();

async function getUser(id) {
  if (!pendingRequests.has(id)) {
    pendingRequests.set(id, fetchUser(id).finally(() => {
      pendingRequests.delete(id);
    }));
  }
  return pendingRequests.get(id);
}
```

## 陷阱七：this 丢失

### 问题

```javascript
class UserService {
  constructor() {
    this.baseUrl = '/api';
  }
  
  async getUser(id) {
    // this.baseUrl 在某些情况下是 undefined
    return fetch(`${this.baseUrl}/users/${id}`);
  }
}

const service = new UserService();
const handler = service.getUser;  // this 丢失
await handler(1);  // TypeError: Cannot read property 'baseUrl' of undefined
```

### 解决方案

```javascript
// 方案1：箭头函数
class UserService {
  getUser = async (id) => {
    return fetch(`${this.baseUrl}/users/${id}`);
  }
}

// 方案2：绑定
const handler = service.getUser.bind(service);

// 方案3：包装
const handler = (id) => service.getUser(id);
```

## 陷阱八：错误被吞掉

### 问题

```javascript
async function process() {
  try {
    await step1();
    await step2();
    await step3();
  } catch (err) {
    console.log('出错了');  // 错误信息丢失
  }
}
```

### 解决方案

```javascript
async function process() {
  try {
    await step1();
    await step2();
    await step3();
  } catch (err) {
    console.error('处理失败:', err.message);
    console.error(err.stack);
    throw err;  // 或重新抛出
  }
}
```

## 陷阱九：内存泄漏

### 问题

```javascript
// 事件监听器未移除
async function watchFile(path) {
  const watcher = fs.watch(path);
  
  watcher.on('change', async () => {
    await processChange();
  });
  
  // watcher 永远不会被清理
}
```

```javascript
// 未完成的 Promise 持有引用
const pending = new Map();

async function request(id) {
  pending.set(id, fetch(`/api/${id}`));
  // 永远不会删除
}
```

### 解决方案

```javascript
async function watchFile(path, signal) {
  const watcher = fs.watch(path);
  
  const handler = async () => {
    await processChange();
  };
  
  watcher.on('change', handler);
  
  // 提供清理方法
  signal.addEventListener('abort', () => {
    watcher.close();
  });
}

// 使用
const controller = new AbortController();
watchFile('/path', controller.signal);

// 清理时
controller.abort();
```

## 陷阱十：超时处理不当

### 问题

```javascript
// 超时后请求仍在继续
async function fetchWithTimeout(url, timeout) {
  return Promise.race([
    fetch(url),
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('超时')), timeout);
    })
  ]);
}
// 问题：超时后 fetch 仍在执行
```

### 解决方案

```javascript
async function fetchWithTimeout(url, timeout) {
  const controller = new AbortController();
  
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('请求超时');
    }
    throw err;
  }
}
```

## 陷阱十一：并发修改共享状态

### 问题

```javascript
let balance = 100;

async function withdraw(amount) {
  if (balance >= amount) {
    await delay(100);  // 模拟异步操作
    balance -= amount;
    return true;
  }
  return false;
}

// 同时取款
await Promise.all([
  withdraw(80),  // 检查时 balance = 100，通过
  withdraw(80)   // 检查时 balance = 100，通过
]);
// 结果：balance = -60，超额取款！
```

### 解决方案

```javascript
const { Mutex } = require('async-mutex');
const mutex = new Mutex();

async function withdraw(amount) {
  const release = await mutex.acquire();
  
  try {
    if (balance >= amount) {
      await delay(100);
      balance -= amount;
      return true;
    }
    return false;
  } finally {
    release();
  }
}
```

## 最佳实践清单

1. **始终处理 Promise 错误**：使用 `.catch()` 或 `try-catch`
2. **并行优先**：除非有顺序要求，否则使用 `Promise.all`
3. **控制并发**：使用限流避免资源耗尽
4. **设置超时**：网络请求必须有超时
5. **使用 AbortController**：支持取消操作
6. **避免共享可变状态**：使用锁或消息队列
7. **记录完整错误信息**：不要吞掉错误
8. **测试异步代码**：包括错误路径
9. **设置全局错误处理器**：作为最后防线
10. **定期检查内存**：发现泄漏及时修复

## 本章小结

- 循环中的 `await` 导致串行执行，应使用 `Promise.all` 并行化
- 忘记 `await` 是常见错误，特别是在 `forEach` 中
- 未处理的 Promise 拒绝可能导致应用崩溃
- 竞态条件通过缓存 Promise 而非结果来避免
- 使用 `AbortController` 实现可取消的操作
- 并发修改共享状态需要加锁

掌握这些陷阱和解决方案，你的异步代码将更加健壮可靠。

下一部分，我们将深入学习 Node.js 的核心模块。
