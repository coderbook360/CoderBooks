# 并发控制：Promise.all、race 与 allSettled

如何优雅地处理多个异步操作？

在实际开发中，我们经常需要同时处理多个异步操作：批量获取数据、并行调用多个 API、处理多个文件。Promise 提供了一组静态方法来处理这些场景。

本章我们将深入学习这些并发控制方法，掌握它们的使用场景和最佳实践。

## Promise.all：全部成功

`Promise.all` 接收一个 Promise 数组，等待所有 Promise 都成功完成：

```javascript
const promises = [
  fetch('/api/users'),
  fetch('/api/posts'),
  fetch('/api/comments')
];

const [usersRes, postsRes, commentsRes] = await Promise.all(promises);
```

### 核心特性

1. **结果顺序与输入顺序一致**

```javascript
const results = await Promise.all([
  delay(300).then(() => 'slow'),
  delay(100).then(() => 'fast'),
  delay(200).then(() => 'medium')
]);
console.log(results);  // ['slow', 'fast', 'medium']
// 注意：不是按完成顺序，而是按输入顺序
```

2. **任一失败，整体失败**

```javascript
try {
  await Promise.all([
    Promise.resolve(1),
    Promise.reject(new Error('失败')),
    Promise.resolve(3)
  ]);
} catch (err) {
  console.log(err.message);  // '失败'
  // 注意：只能获取第一个失败的错误
}
```

3. **快速失败**

一旦有一个 Promise 失败，`Promise.all` 立即 reject，不会等待其他 Promise 完成。

### 典型使用场景

**并行获取多个资源**：

```javascript
async function getDashboard(userId) {
  const [user, notifications, stats] = await Promise.all([
    fetchUser(userId),
    fetchNotifications(userId),
    fetchStats(userId)
  ]);
  
  return { user, notifications, stats };
}
```

**批量操作**：

```javascript
async function uploadFiles(files) {
  const results = await Promise.all(
    files.map(file => uploadFile(file))
  );
  return results;
}
```

### 错误处理策略

如果你希望即使部分失败也能获取成功的结果，可以包装每个 Promise：

```javascript
async function fetchAllSafe(urls) {
  const results = await Promise.all(
    urls.map(async url => {
      try {
        return { success: true, data: await fetch(url) };
      } catch (err) {
        return { success: false, error: err };
      }
    })
  );
  
  return results;
}
```

或者使用 `Promise.allSettled`（下文介绍）。

## Promise.race：竞速

`Promise.race` 返回第一个完成的 Promise（无论成功还是失败）：

```javascript
const first = await Promise.race([
  delay(300).then(() => 'slow'),
  delay(100).then(() => 'fast'),
  delay(200).then(() => 'medium')
]);
console.log(first);  // 'fast'
```

### 典型使用场景

**实现超时控制**：

```javascript
function fetchWithTimeout(url, timeout = 5000) {
  const fetchPromise = fetch(url);
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('请求超时')), timeout);
  });
  
  return Promise.race([fetchPromise, timeoutPromise]);
}

// 使用
try {
  const response = await fetchWithTimeout('/api/data', 3000);
  const data = await response.json();
} catch (err) {
  if (err.message === '请求超时') {
    console.log('请求超时，请稍后重试');
  }
}
```

**从多个源获取数据**：

```javascript
async function fetchFromFastestMirror(resource) {
  const mirrors = [
    'https://mirror1.example.com',
    'https://mirror2.example.com',
    'https://mirror3.example.com'
  ];
  
  // 返回最快响应的那个
  return Promise.race(
    mirrors.map(mirror => fetch(`${mirror}/${resource}`))
  );
}
```

### 注意事项

- `race` 只返回第一个完成的结果，其他 Promise 仍然会继续执行
- 如果需要取消其他操作，需要额外处理（如 AbortController）

## Promise.allSettled：全部完成

`Promise.allSettled` 等待所有 Promise 完成，无论成功还是失败：

```javascript
const results = await Promise.allSettled([
  Promise.resolve('成功1'),
  Promise.reject(new Error('失败')),
  Promise.resolve('成功2')
]);

console.log(results);
// [
//   { status: 'fulfilled', value: '成功1' },
//   { status: 'rejected', reason: Error: 失败 },
//   { status: 'fulfilled', value: '成功2' }
// ]
```

### 核心特性

1. **永远不会 reject**：总是 fulfilled，返回所有结果
2. **包含每个 Promise 的状态**：`fulfilled` 或 `rejected`
3. **成功的有 `value`，失败的有 `reason`**

### 典型使用场景

**批量操作，部分失败可接受**：

```javascript
async function sendNotifications(users) {
  const results = await Promise.allSettled(
    users.map(user => sendEmail(user.email))
  );
  
  const succeeded = results.filter(r => r.status === 'fulfilled');
  const failed = results.filter(r => r.status === 'rejected');
  
  console.log(`成功: ${succeeded.length}, 失败: ${failed.length}`);
  
  // 可以对失败的进行重试
  if (failed.length > 0) {
    await retryFailed(failed);
  }
}
```

**健康检查**：

```javascript
async function healthCheck(services) {
  const results = await Promise.allSettled(
    services.map(service => checkService(service))
  );
  
  return results.map((result, index) => ({
    service: services[index],
    status: result.status === 'fulfilled' ? 'healthy' : 'unhealthy',
    ...(result.status === 'rejected' && { error: result.reason.message })
  }));
}
```

## Promise.any：第一个成功

`Promise.any` 返回第一个成功的 Promise：

```javascript
const first = await Promise.any([
  Promise.reject('失败1'),
  delay(200).then(() => '成功1'),
  delay(100).then(() => '成功2')
]);
console.log(first);  // '成功2'（第一个成功的）
```

### 核心特性

1. **忽略失败**：只关注成功的 Promise
2. **返回第一个成功**：不是第一个完成
3. **全部失败才 reject**：返回 AggregateError

```javascript
try {
  await Promise.any([
    Promise.reject('失败1'),
    Promise.reject('失败2'),
    Promise.reject('失败3')
  ]);
} catch (err) {
  console.log(err.name);    // 'AggregateError'
  console.log(err.errors);  // ['失败1', '失败2', '失败3']
}
```

### 典型使用场景

**冗余请求**：

```javascript
async function fetchWithRedundancy(url) {
  // 从多个 CDN 请求，用第一个成功的
  return Promise.any([
    fetch(`https://cdn1.example.com${url}`),
    fetch(`https://cdn2.example.com${url}`),
    fetch(`https://cdn3.example.com${url}`)
  ]);
}
```

**降级策略**：

```javascript
async function getData() {
  return Promise.any([
    fetchFromPrimaryAPI(),       // 主 API
    fetchFromSecondaryAPI(),     // 备用 API
    getFromCache()               // 本地缓存
  ]);
}
```

## 方法对比

| 方法 | 何时完成 | 何时失败 | 返回值 |
|------|----------|----------|--------|
| `all` | 全部成功 | 任一失败 | 结果数组 |
| `race` | 任一完成 | 任一失败 | 单个结果 |
| `allSettled` | 全部完成 | 永不失败 | 状态数组 |
| `any` | 任一成功 | 全部失败 | 单个结果 |

## 实现并发限制

有时候我们需要并行处理，但不想同时发起太多请求（避免服务器压力或触发限流）：

```javascript
async function limitConcurrency(tasks, limit) {
  const results = [];
  const executing = new Set();
  
  for (const [index, task] of tasks.entries()) {
    // 创建一个 Promise
    const promise = Promise.resolve().then(() => task()).then(result => {
      executing.delete(promise);
      return result;
    });
    
    results[index] = promise;
    executing.add(promise);
    
    // 如果达到并发限制，等待一个完成
    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }
  
  // 等待所有完成
  return Promise.all(results);
}

// 使用
const urls = ['url1', 'url2', 'url3', 'url4', 'url5'];
const tasks = urls.map(url => () => fetch(url));

const responses = await limitConcurrency(tasks, 2);  // 最多 2 个并发
```

或者使用成熟的库：

```javascript
const pLimit = require('p-limit');

const limit = pLimit(3);  // 最多 3 个并发

const results = await Promise.all(
  urls.map(url => limit(() => fetch(url)))
);
```

## 实战案例

### 带超时和降级的数据获取

```javascript
async function fetchDataWithFallback(userId) {
  // 超时 Promise
  const timeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('超时')), 3000);
  });
  
  try {
    // 尝试从主 API 获取，带超时
    const response = await Promise.race([
      fetch(`/api/users/${userId}`),
      timeout
    ]);
    return await response.json();
  } catch (primaryError) {
    console.log('主 API 失败，尝试备用');
    
    try {
      // 尝试备用 API
      const response = await fetch(`/api-backup/users/${userId}`);
      return await response.json();
    } catch (backupError) {
      console.log('备用 API 也失败，使用缓存');
      
      // 最后的降级：返回缓存数据
      return getCachedUser(userId);
    }
  }
}
```

### 批量处理并汇总结果

```javascript
async function processOrders(orderIds) {
  const results = await Promise.allSettled(
    orderIds.map(id => processOrder(id))
  );
  
  const summary = {
    total: results.length,
    succeeded: 0,
    failed: 0,
    errors: []
  };
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      summary.succeeded++;
    } else {
      summary.failed++;
      summary.errors.push({
        orderId: orderIds[index],
        error: result.reason.message
      });
    }
  });
  
  return summary;
}
```

## 本章小结

- `Promise.all`：等待全部成功，适合所有结果都需要的场景
- `Promise.race`：返回最快完成的，适合超时控制
- `Promise.allSettled`：等待全部完成，适合部分失败可接受的场景
- `Promise.any`：返回第一个成功，适合冗余/降级策略
- 使用并发限制避免同时发起过多请求

下一章，我们将学习异步迭代器和 for-await-of。
