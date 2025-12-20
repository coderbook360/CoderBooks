# 异步迭代器：for-await-of 与生成器

如何优雅地处理异步数据流？

传统的 `for...of` 循环只能处理同步可迭代对象。但在 Node.js 中，我们经常需要处理异步数据流：逐行读取文件、分页获取 API 数据、处理消息队列。

异步迭代器和 `for-await-of` 正是为这些场景设计的。

## 从同步迭代到异步迭代

### 同步迭代器回顾

```javascript
const array = [1, 2, 3];

for (const item of array) {
  console.log(item);
}
// 输出：1, 2, 3
```

背后的机制是迭代器协议：

```javascript
const iterator = array[Symbol.iterator]();
iterator.next();  // { value: 1, done: false }
iterator.next();  // { value: 2, done: false }
iterator.next();  // { value: 3, done: false }
iterator.next();  // { value: undefined, done: true }
```

### 异步迭代器

异步迭代器的区别：`next()` 返回 Promise：

```javascript
const asyncIterable = {
  [Symbol.asyncIterator]() {
    let i = 0;
    return {
      async next() {
        if (i < 3) {
          await delay(100);  // 模拟异步操作
          return { value: i++, done: false };
        }
        return { value: undefined, done: true };
      }
    };
  }
};

// 使用 for-await-of
for await (const item of asyncIterable) {
  console.log(item);
}
// 每隔 100ms 输出：0, 1, 2
```

## for-await-of 语法

`for-await-of` 是处理异步可迭代对象的语法糖：

```javascript
// 必须在 async 函数中使用
async function process() {
  for await (const chunk of asyncDataSource) {
    await processChunk(chunk);
  }
}
```

### 与普通 for...of 的区别

```javascript
// 同步迭代
for (const item of syncIterable) { ... }

// 异步迭代
for await (const item of asyncIterable) { ... }
```

关键差异：

1. 必须在 async 函数中使用
2. 每次迭代会 await `next()` 返回的 Promise
3. 可以在循环体内继续使用 await

## Node.js 内置的异步可迭代对象

### Readable Stream

Node.js 的 Readable 流实现了异步迭代器接口：

```javascript
const fs = require('fs');

async function readFile() {
  const stream = fs.createReadStream('large-file.txt', { 
    encoding: 'utf8',
    highWaterMark: 64 * 1024  // 64KB chunks
  });
  
  for await (const chunk of stream) {
    console.log(`收到 ${chunk.length} 字符`);
    await processChunk(chunk);
  }
  
  console.log('文件读取完成');
}
```

### 逐行读取文件

```javascript
const readline = require('readline');
const fs = require('fs');

async function processLineByLine(filePath) {
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath),
    crlfDelay: Infinity
  });
  
  let lineNumber = 0;
  for await (const line of rl) {
    lineNumber++;
    if (line.includes('ERROR')) {
      console.log(`第 ${lineNumber} 行发现错误: ${line}`);
    }
  }
}
```

### HTTP 请求体

```javascript
const http = require('http');

const server = http.createServer(async (req, res) => {
  const chunks = [];
  
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  
  const body = Buffer.concat(chunks).toString();
  console.log('请求体:', body);
  
  res.end('OK');
});
```

## 异步生成器

异步生成器结合了生成器和异步函数的特性：

```javascript
async function* asyncGenerator() {
  yield await fetchData(1);
  yield await fetchData(2);
  yield await fetchData(3);
}

// 使用
for await (const data of asyncGenerator()) {
  console.log(data);
}
```

### 创建自定义异步可迭代对象

**分页获取数据**：

```javascript
async function* fetchPages(baseUrl) {
  let page = 1;
  
  while (true) {
    const response = await fetch(`${baseUrl}?page=${page}`);
    const data = await response.json();
    
    if (data.items.length === 0) {
      return;  // 没有更多数据
    }
    
    yield data.items;
    page++;
  }
}

// 使用
async function getAllUsers() {
  const allUsers = [];
  
  for await (const users of fetchPages('/api/users')) {
    allUsers.push(...users);
    console.log(`已获取 ${allUsers.length} 个用户`);
  }
  
  return allUsers;
}
```

**轮询数据源**：

```javascript
async function* poll(url, interval = 5000) {
  while (true) {
    try {
      const response = await fetch(url);
      const data = await response.json();
      yield data;
    } catch (err) {
      console.error('轮询失败:', err.message);
    }
    
    await delay(interval);
  }
}

// 使用（注意：这是无限循环）
for await (const status of poll('/api/status')) {
  if (status.complete) {
    console.log('任务完成');
    break;  // 主动退出循环
  }
  console.log('进度:', status.progress);
}
```

**处理消息队列**：

```javascript
async function* consumeQueue(queue) {
  while (true) {
    const message = await queue.receive();  // 阻塞等待消息
    
    if (!message) {
      return;  // 队列关闭
    }
    
    yield message;
  }
}

// 使用
for await (const message of consumeQueue(messageQueue)) {
  await handleMessage(message);
}
```

## 异步迭代器的实现细节

### 手动实现

```javascript
class AsyncRange {
  constructor(start, end, delay = 100) {
    this.start = start;
    this.end = end;
    this.delay = delay;
  }
  
  [Symbol.asyncIterator]() {
    let current = this.start;
    const end = this.end;
    const delayTime = this.delay;
    
    return {
      async next() {
        if (current <= end) {
          await new Promise(r => setTimeout(r, delayTime));
          return { value: current++, done: false };
        }
        return { value: undefined, done: true };
      }
    };
  }
}

// 使用
for await (const num of new AsyncRange(1, 5)) {
  console.log(num);
}
// 每隔 100ms 输出 1, 2, 3, 4, 5
```

### 使用生成器简化

```javascript
class AsyncRange {
  constructor(start, end, delay = 100) {
    this.start = start;
    this.end = end;
    this.delay = delay;
  }
  
  async *[Symbol.asyncIterator]() {
    for (let i = this.start; i <= this.end; i++) {
      await new Promise(r => setTimeout(r, this.delay));
      yield i;
    }
  }
}
```

## 错误处理

### try-catch 包裹

```javascript
async function processStream(stream) {
  try {
    for await (const chunk of stream) {
      await process(chunk);
    }
  } catch (err) {
    console.error('处理流时出错:', err);
  } finally {
    // 清理工作
    stream.destroy?.();
  }
}
```

### 生成器内的错误处理

```javascript
async function* robustGenerator() {
  for (let i = 1; i <= 10; i++) {
    try {
      const data = await fetchData(i);
      yield data;
    } catch (err) {
      // 跳过失败的项，继续处理
      console.error(`获取第 ${i} 项失败:`, err.message);
      yield { error: err.message, index: i };
    }
  }
}
```

### 提前退出

使用 `break`、`return` 或抛出异常可以提前退出：

```javascript
async function* infiniteGenerator() {
  let i = 0;
  try {
    while (true) {
      yield i++;
    }
  } finally {
    console.log('生成器被终止');
    // 执行清理工作
  }
}

// 使用 break 退出
for await (const num of infiniteGenerator()) {
  if (num >= 5) break;
  console.log(num);
}
// 输出：0, 1, 2, 3, 4
// 然后输出：生成器被终止
```

## 实战案例

### 并发控制的异步迭代

```javascript
async function* batchProcess(items, batchSize, concurrency) {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    // 并发处理当前批次
    const results = await Promise.all(
      batch.map(item => processItem(item))
    );
    
    for (const result of results) {
      yield result;
    }
  }
}

// 使用
for await (const result of batchProcess(allItems, 10, 3)) {
  console.log('处理结果:', result);
}
```

### 带速率限制的 API 调用

```javascript
async function* rateLimitedFetch(urls, rateLimit = 10) {
  const interval = 1000 / rateLimit;  // 每秒最多 rateLimit 个请求
  
  for (const url of urls) {
    const startTime = Date.now();
    
    const response = await fetch(url);
    const data = await response.json();
    yield data;
    
    // 确保间隔
    const elapsed = Date.now() - startTime;
    if (elapsed < interval) {
      await delay(interval - elapsed);
    }
  }
}
```

### 组合多个异步迭代器

```javascript
async function* merge(...iterators) {
  const pending = iterators.map(async function* (iterator) {
    for await (const item of iterator) {
      yield item;
    }
  });
  
  // 简单实现：按顺序处理
  for (const iterator of pending) {
    for await (const item of iterator) {
      yield item;
    }
  }
}

// 真正的并发 merge 更复杂，需要使用 Promise.race
```

## 性能注意事项

1. **避免不必要的异步迭代**

```javascript
// 如果数据已经在内存中，用普通 for...of 更快
const items = [1, 2, 3, 4, 5];

// 不必要的 async
for await (const item of items) { ... }

// 更好
for (const item of items) { ... }
```

2. **控制内存使用**

异步迭代器的优势是可以处理大量数据而不占用大量内存：

```javascript
// 好：流式处理，内存占用恒定
for await (const chunk of fileStream) {
  await process(chunk);
}

// 不好：先读取全部，内存可能溢出
const allData = await fs.promises.readFile(path);
```

3. **合理的批处理**

```javascript
// 逐条处理可能太慢
for await (const item of source) {
  await saveToDb(item);  // 每次一条
}

// 批量处理更高效
const batch = [];
for await (const item of source) {
  batch.push(item);
  if (batch.length >= 100) {
    await saveToDb(batch);
    batch.length = 0;
  }
}
if (batch.length > 0) {
  await saveToDb(batch);
}
```

## 本章小结

- 异步迭代器使用 `Symbol.asyncIterator` 和返回 Promise 的 `next()`
- `for-await-of` 是处理异步可迭代对象的简洁语法
- Node.js 的 Readable 流内置支持异步迭代
- 异步生成器 `async function*` 简化了自定义异步迭代器的创建
- 适用于分页数据、流式处理、消息队列等场景

下一章，我们将学习异步错误处理的系统性策略。
