# async/await 最佳实践与常见陷阱

async/await 让异步代码看起来像同步代码？

某种程度上是的。async/await 是 Promise 的语法糖，让我们可以用接近同步的方式编写异步代码。但"看起来像"不等于"完全一样"，理解其中的差异至关重要。

本章我们将学习 async/await 的正确用法和需要避免的陷阱。

## 基本语法

### async 函数

在函数前加上 `async` 关键字，这个函数就变成了异步函数：

```javascript
async function fetchData() {
  return 'data';
}

// async 函数总是返回 Promise
fetchData().then(data => console.log(data));  // 'data'
```

async 函数的返回值会被自动包装成 Promise：
- 返回普通值 → `Promise.resolve(值)`
- 抛出错误 → `Promise.reject(错误)`

### await 表达式

`await` 只能在 async 函数内使用，它会**暂停**函数执行，等待 Promise 完成：

```javascript
async function example() {
  console.log('开始');
  
  const result = await someAsyncOperation();
  // 执行暂停，直到 someAsyncOperation() 完成
  
  console.log('结果:', result);
  return result;
}
```

### 完整示例

```javascript
async function getUserPosts(userId) {
  const user = await fetchUser(userId);
  const posts = await fetchPosts(user.id);
  return posts;
}

// 使用
getUserPosts(1)
  .then(posts => console.log(posts))
  .catch(err => console.error(err));

// 或在另一个 async 函数中
async function main() {
  try {
    const posts = await getUserPosts(1);
    console.log(posts);
  } catch (err) {
    console.error(err);
  }
}
```

## 错误处理

### try/catch

async/await 的一大优势是可以使用传统的 try/catch：

```javascript
async function fetchData() {
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (err) {
    console.error('获取数据失败:', err);
    throw err;  // 可以重新抛出
  }
}
```

### 多个 await 的错误处理

```javascript
async function processData() {
  try {
    const a = await stepA();
    const b = await stepB(a);
    const c = await stepC(b);
    return c;
  } catch (err) {
    // 捕获任一步骤的错误
    console.error('处理失败:', err);
  }
}
```

### 单独处理每个错误

如果需要对不同操作采取不同的错误处理：

```javascript
async function fetchWithFallback() {
  let data;
  
  try {
    data = await fetchFromPrimary();
  } catch (err) {
    console.log('主源失败，尝试备源');
    try {
      data = await fetchFromBackup();
    } catch (err) {
      console.log('备源也失败了');
      data = getDefaultData();
    }
  }
  
  return data;
}
```

### 不用 try/catch 的方式

有时候你可能想用更简洁的方式：

```javascript
// 方式 1：在 await 后直接 catch
async function fetchData() {
  const data = await fetch(url).catch(err => {
    console.error(err);
    return null;
  });
  
  if (!data) return;
  // 继续处理
}

// 方式 2：包装函数
async function to(promise) {
  try {
    const result = await promise;
    return [null, result];
  } catch (err) {
    return [err, null];
  }
}

// 使用
async function example() {
  const [err, data] = await to(fetchData());
  if (err) {
    console.error(err);
    return;
  }
  console.log(data);
}
```

## 并行执行

### 常见错误：不必要的串行

```javascript
// ❌ 串行执行（慢）
async function fetchAllData() {
  const users = await fetchUsers();      // 等待 1 秒
  const posts = await fetchPosts();      // 再等待 1 秒
  const comments = await fetchComments(); // 再等待 1 秒
  return { users, posts, comments };     // 总共 3 秒
}
```

如果这三个操作互不依赖，它们应该并行执行：

```javascript
// ✅ 并行执行（快）
async function fetchAllData() {
  const [users, posts, comments] = await Promise.all([
    fetchUsers(),
    fetchPosts(),
    fetchComments()
  ]);
  return { users, posts, comments };  // 总共 1 秒
}
```

### 何时串行，何时并行

**串行**：后一步依赖前一步的结果

```javascript
async function getPostComments(userId) {
  const user = await getUser(userId);        // 需要 user
  const posts = await getPosts(user.id);     // 需要 posts
  const comments = await getComments(posts[0].id);
  return comments;
}
```

**并行**：操作之间互不依赖

```javascript
async function getDashboardData() {
  const [profile, notifications, stats] = await Promise.all([
    getProfile(),
    getNotifications(),
    getStats()
  ]);
  return { profile, notifications, stats };
}
```

**混合模式**：部分并行

```javascript
async function getPageData(userId) {
  // 第一步：获取用户（必须先完成）
  const user = await getUser(userId);
  
  // 第二步：并行获取多个依赖用户的数据
  const [posts, friends, settings] = await Promise.all([
    getPosts(user.id),
    getFriends(user.id),
    getSettings(user.id)
  ]);
  
  return { user, posts, friends, settings };
}
```

## 循环中的 await

### for...of 循环

```javascript
// 串行处理（一个接一个）
async function processSequentially(items) {
  const results = [];
  for (const item of items) {
    const result = await processItem(item);
    results.push(result);
  }
  return results;
}
```

### 并行处理

```javascript
// 并行处理（同时进行）
async function processInParallel(items) {
  const results = await Promise.all(
    items.map(item => processItem(item))
  );
  return results;
}
```

### forEach 陷阱

**`forEach` 中的 await 不会按预期工作！**

```javascript
// ❌ 错误：forEach 不会等待
async function processItems(items) {
  items.forEach(async (item) => {
    await processItem(item);
  });
  console.log('完成');  // 这会立即执行，不会等待！
}

// ✅ 正确：使用 for...of
async function processItems(items) {
  for (const item of items) {
    await processItem(item);
  }
  console.log('完成');  // 所有项处理完后才执行
}
```

### 控制并发数量

有时候你需要并行，但不想同时发起太多请求：

```javascript
async function processWithLimit(items, limit) {
  const results = [];
  const executing = [];
  
  for (const item of items) {
    const promise = processItem(item).then(result => {
      executing.splice(executing.indexOf(promise), 1);
      return result;
    });
    
    results.push(promise);
    executing.push(promise);
    
    if (executing.length >= limit) {
      await Promise.race(executing);
    }
  }
  
  return Promise.all(results);
}

// 或使用库如 p-limit
const pLimit = require('p-limit');
const limit = pLimit(3);  // 最多 3 个并发

const results = await Promise.all(
  items.map(item => limit(() => processItem(item)))
);
```

## 顶层 await

在 ES Modules 中，可以在模块顶层使用 await：

```javascript
// config.mjs
const response = await fetch('/api/config');
export const config = await response.json();

// app.mjs
import { config } from './config.mjs';
console.log(config);  // 配置已经加载好了
```

**注意**：
- 只在 ES Modules 中可用
- CommonJS 不支持
- 会阻塞模块加载

## 常见陷阱

### 1. 忘记 await

```javascript
// ❌ 错误：忘记 await
async function example() {
  const data = fetchData();  // data 是 Promise，不是数据！
  console.log(data);         // Promise { <pending> }
}

// ✅ 正确
async function example() {
  const data = await fetchData();
  console.log(data);
}
```

### 2. 不必要的 await

```javascript
// ❌ 冗余：return 时不需要 await
async function fetchData() {
  return await fetch(url);  // await 是多余的
}

// ✅ 简洁
async function fetchData() {
  return fetch(url);
}

// 例外：如果在 try/catch 中需要捕获错误
async function fetchData() {
  try {
    return await fetch(url);  // 这里需要 await 才能捕获错误
  } catch (err) {
    console.error(err);
    return null;
  }
}
```

### 3. async 不等于并行

```javascript
// ❌ 误解：这不是并行
const a = await fetchA();
const b = await fetchB();

// ✅ 这才是并行
const [a, b] = await Promise.all([fetchA(), fetchB()]);
```

### 4. 在回调中使用 async

```javascript
// ❌ 可能有问题
setTimeout(async () => {
  await doSomething();
  // 如果出错，没有地方 catch
}, 1000);

// ✅ 添加错误处理
setTimeout(async () => {
  try {
    await doSomething();
  } catch (err) {
    console.error(err);
  }
}, 1000);
```

## 最佳实践总结

1. **优先使用 async/await**：比 Promise 链更易读
2. **总是处理错误**：使用 try/catch 或 .catch()
3. **并行执行无依赖的操作**：使用 Promise.all
4. **避免在 forEach 中使用 await**：使用 for...of 或 map
5. **不要在 return 时使用多余的 await**：除非在 try/catch 中
6. **控制并发数**：避免同时发起过多请求

## 本章小结

- async 函数总是返回 Promise
- await 暂停执行，等待 Promise 完成
- 使用 try/catch 处理错误
- 无依赖的操作应该用 Promise.all 并行执行
- forEach 中的 await 不会按预期工作
- 顶层 await 只在 ES Modules 中可用

下一章，我们将学习 Promise 的并发控制方法。
