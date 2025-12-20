# Promise 原理与高级模式

Promise 解决了什么问题？

上一章我们看到了回调模式的种种问题：回调地狱、错误处理分散、难以组合。Promise 是 JavaScript 对这些问题的系统性解决方案。

本章我们将深入理解 Promise，不仅学会使用，更要理解其设计原理。

## Promise 基础

### 什么是 Promise

Promise 是一个**代表异步操作最终结果的对象**。它有三种状态：

- **Pending**（进行中）：初始状态，操作尚未完成
- **Fulfilled**（已成功）：操作成功完成，有一个结果值
- **Rejected**（已失败）：操作失败，有一个失败原因

```
              ┌─────────────┐
              │   Pending   │
              └──────┬──────┘
                     │
        ┌────────────┴────────────┐
        ↓                         ↓
┌───────────────┐        ┌───────────────┐
│   Fulfilled   │        │   Rejected    │
│  (有结果值)    │        │  (有失败原因)  │
└───────────────┘        └───────────────┘
```

**关键特性**：状态一旦改变就不会再变。Pending 只能变为 Fulfilled 或 Rejected，不能逆转。

### 创建 Promise

```javascript
const promise = new Promise((resolve, reject) => {
  // 执行器函数立即执行
  const success = doSomething();
  
  if (success) {
    resolve('操作成功');  // 状态变为 fulfilled
  } else {
    reject(new Error('操作失败'));  // 状态变为 rejected
  }
});
```

执行器函数接收两个参数：
- `resolve`：调用它使 Promise 变为 fulfilled
- `reject`：调用它使 Promise 变为 rejected

### 消费 Promise

```javascript
promise
  .then(
    value => console.log('成功:', value),   // 处理成功
    reason => console.log('失败:', reason)  // 处理失败
  );

// 更常见的写法：分开处理
promise
  .then(value => console.log('成功:', value))
  .catch(reason => console.log('失败:', reason));
```

## Promise 链式调用

Promise 最强大的特性是**链式调用**。每个 `then` 返回一个新的 Promise。

### 值的传递

```javascript
Promise.resolve(1)
  .then(x => x + 1)      // 返回 2
  .then(x => x * 2)      // 返回 4
  .then(x => console.log(x));  // 输出 4
```

`then` 的回调返回值会成为下一个 `then` 的参数。

### 返回 Promise

如果 `then` 的回调返回一个 Promise，链会等待这个 Promise 完成：

```javascript
fetchUser(userId)
  .then(user => fetchPosts(user.id))  // 返回 Promise
  .then(posts => fetchComments(posts[0].id))  // 等待上一个完成
  .then(comments => console.log(comments));
```

这就是 Promise 解决回调地狱的方式：**嵌套变成了链式调用**。

对比一下：

```javascript
// 回调地狱
getUser(userId, (err, user) => {
  getPosts(user.id, (err, posts) => {
    getComments(posts[0].id, (err, comments) => {
      console.log(comments);
    });
  });
});

// Promise 链
getUser(userId)
  .then(user => getPosts(user.id))
  .then(posts => getComments(posts[0].id))
  .then(comments => console.log(comments));
```

代码变得扁平、清晰、易读。

## 错误处理

### catch 方法

```javascript
fetchData()
  .then(data => processData(data))
  .then(result => saveResult(result))
  .catch(err => {
    console.error('出错了:', err);
  });
```

`catch` 会捕获链中任何位置产生的错误。

### 错误传播

错误会沿着链传播，直到被 `catch` 捕获：

```javascript
Promise.resolve()
  .then(() => {
    throw new Error('第一步出错');
  })
  .then(() => {
    console.log('这里不会执行');
  })
  .then(() => {
    console.log('这里也不会执行');
  })
  .catch(err => {
    console.error('捕获到错误:', err.message);
  });
```

### 错误恢复

`catch` 之后可以继续链式调用，实现错误恢复：

```javascript
fetchData()
  .catch(err => {
    console.log('主数据获取失败，使用备份');
    return fetchBackupData();
  })
  .then(data => {
    console.log('获取到数据:', data);
  });
```

### finally 方法

无论成功还是失败都会执行：

```javascript
showLoading();

fetchData()
  .then(data => processData(data))
  .catch(err => handleError(err))
  .finally(() => {
    hideLoading();  // 无论如何都隐藏加载状态
  });
```

## Promise 静态方法

### Promise.resolve / Promise.reject

快速创建已完成的 Promise：

```javascript
// 创建 fulfilled 状态的 Promise
const resolved = Promise.resolve('success');

// 创建 rejected 状态的 Promise
const rejected = Promise.reject(new Error('failed'));
```

### Promise.all

等待所有 Promise 完成，任一失败则整体失败：

```javascript
const promises = [
  fetchUser(1),
  fetchUser(2),
  fetchUser(3)
];

Promise.all(promises)
  .then(users => {
    console.log('所有用户:', users);  // [user1, user2, user3]
  })
  .catch(err => {
    console.error('至少一个请求失败:', err);
  });
```

**特点**：
- 结果数组顺序与输入顺序一致
- 任一 Promise 失败，整体立即失败
- 适合"全部成功才能继续"的场景

### Promise.race

返回第一个完成的结果（无论成功失败）：

```javascript
// 实现请求超时
const timeout = new Promise((_, reject) => {
  setTimeout(() => reject(new Error('超时')), 5000);
});

Promise.race([fetchData(), timeout])
  .then(data => console.log('获取成功:', data))
  .catch(err => console.error('获取失败:', err));
```

### Promise.allSettled

等待所有 Promise 完成，无论成功失败：

```javascript
const promises = [
  fetchUser(1),  // 成功
  fetchUser(999),  // 失败（用户不存在）
  fetchUser(2)  // 成功
];

Promise.allSettled(promises)
  .then(results => {
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        console.log(`用户${index}: ${result.value.name}`);
      } else {
        console.log(`用户${index}: 获取失败 - ${result.reason}`);
      }
    });
  });
```

**特点**：
- 永远不会 reject
- 返回每个 Promise 的状态和值/原因
- 适合"尽可能获取所有结果"的场景

### Promise.any

返回第一个成功的结果：

```javascript
// 从多个镜像获取资源，用最快的那个
const mirrors = [
  fetch('https://mirror1.example.com/data'),
  fetch('https://mirror2.example.com/data'),
  fetch('https://mirror3.example.com/data')
];

Promise.any(mirrors)
  .then(response => response.json())
  .then(data => console.log('获取成功:', data))
  .catch(err => console.error('所有镜像都失败了'));
```

**特点**：
- 返回第一个成功的结果
- 只有全部失败才会 reject（返回 AggregateError）
- 适合冗余请求、降级策略

## 常见陷阱

### 1. 忘记返回

```javascript
// ❌ 错误：忘记 return
fetchUser(userId)
  .then(user => {
    fetchPosts(user.id);  // 没有 return！
  })
  .then(posts => {
    console.log(posts);  // undefined！
  });

// ✅ 正确：返回 Promise
fetchUser(userId)
  .then(user => {
    return fetchPosts(user.id);
  })
  .then(posts => {
    console.log(posts);  // 正确获取 posts
  });
```

### 2. 在 then 中嵌套

```javascript
// ❌ 错误：又回到了嵌套
fetchUser(userId)
  .then(user => {
    return fetchPosts(user.id).then(posts => {
      return fetchComments(posts[0].id).then(comments => {
        // 嵌套了...
      });
    });
  });

// ✅ 正确：保持链式
fetchUser(userId)
  .then(user => fetchPosts(user.id))
  .then(posts => fetchComments(posts[0].id))
  .then(comments => {
    // 扁平的
  });
```

### 3. 忘记 catch

```javascript
// ❌ 危险：未处理的 rejection
fetchData()
  .then(data => processData(data));  // 如果出错，错误会被吞掉

// ✅ 安全：总是添加 catch
fetchData()
  .then(data => processData(data))
  .catch(err => console.error(err));
```

### 4. 在 catch 中再次抛出

```javascript
fetchData()
  .catch(err => {
    console.error(err);
    throw err;  // 重新抛出
  })
  .then(() => {
    // 如果上面 catch 抛出错误，这里不会执行
  })
  .catch(err => {
    // 需要再次 catch
  });
```

## 将回调转换为 Promise

Node.js 提供了 `util.promisify` 将回调风格函数转换为 Promise：

```javascript
const util = require('util');
const fs = require('fs');

// 原始回调风格
fs.readFile('file.txt', (err, data) => {});

// 转换为 Promise
const readFile = util.promisify(fs.readFile);
readFile('file.txt')
  .then(data => console.log(data))
  .catch(err => console.error(err));
```

现代 Node.js 也提供了 Promise 版本的 API：

```javascript
const fs = require('fs').promises;
// 或
const { readFile } = require('fs/promises');

const data = await fs.readFile('file.txt');
```

## 本章小结

- Promise 是代表异步操作最终结果的对象
- 三种状态：Pending → Fulfilled / Rejected
- 链式调用解决了回调地狱问题
- `catch` 捕获链中任何位置的错误
- 静态方法：`all`（全部成功）、`race`（最快完成）、`allSettled`（全部完成）、`any`（第一个成功）
- 注意陷阱：忘记返回、嵌套 then、忘记 catch
- 使用 `util.promisify` 或 `fs/promises` 获取 Promise 版 API

下一章，我们将学习 async/await——让异步代码看起来像同步代码的语法糖。
