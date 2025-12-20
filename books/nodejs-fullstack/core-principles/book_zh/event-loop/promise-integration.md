# Promise与事件循环的交互

Promise是现代JavaScript异步编程的基石。本章深入分析Promise如何与Node.js事件循环协同工作，以及微任务队列的运行机制。

## Promise在事件循环中的位置

```
┌─────────────────────────────────────────────────────────────┐
│                      事件循环一次迭代                        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    timers阶段                        │   │
│  │              执行setTimeout/setInterval              │   │
│  └─────────────────────────────────────────────────────┘   │
│                            │                                │
│                            ▼                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              nextTick队列（全部执行）                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                            │                                │
│                            ▼                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            微任务队列（全部执行，包括Promise）        │   │
│  └─────────────────────────────────────────────────────┘   │
│                            │                                │
│                            ▼                                │
│                     ... 下一个阶段 ...                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 微任务队列的优先级

Node.js中有两种"微任务"：

1. **process.nextTick队列**：优先级最高
2. **Promise微任务队列**：优先级次之

```javascript
Promise.resolve().then(() => console.log('1. Promise'));
process.nextTick(() => console.log('2. nextTick'));
console.log('3. 同步');

// 输出：
// 3. 同步
// 2. nextTick（先于Promise执行）
// 1. Promise
```

### 执行顺序图

```
同步代码执行
     │
     ▼
process.nextTick队列（清空）
     │
     ▼
Promise微任务队列（清空）
     │
     ▼
下一个事件循环阶段
     │
     ▼
process.nextTick队列（清空）
     │
     ▼
Promise微任务队列（清空）
     │
     ▼
... 循环继续 ...
```

## async/await与事件循环

`async/await`是Promise的语法糖，其执行时机遵循相同规则：

```javascript
async function example() {
  console.log('1. async函数开始');
  
  await Promise.resolve();
  // await之后的代码相当于.then()
  console.log('3. await之后');
}

console.log('0. 开始');
example();
console.log('2. 同步代码继续');

// 输出：
// 0. 开始
// 1. async函数开始
// 2. 同步代码继续
// 3. await之后
```

### await的本质

```javascript
// 这两段代码等价：

// 使用async/await
async function foo() {
  const result = await somePromise();
  console.log(result);
}

// 使用Promise
function foo() {
  return somePromise().then(result => {
    console.log(result);
  });
}
```

## Promise与定时器的交互

```javascript
setTimeout(() => console.log('1. setTimeout'), 0);
Promise.resolve().then(() => console.log('2. Promise'));
console.log('3. 同步');

// 输出：
// 3. 同步
// 2. Promise（微任务先于定时器）
// 1. setTimeout
```

### 在定时器回调中的Promise

```javascript
setTimeout(() => {
  console.log('1. setTimeout');
  
  Promise.resolve().then(() => {
    console.log('2. Promise in setTimeout');
  });
  
  console.log('3. setTimeout结束');
}, 0);

// 输出：
// 1. setTimeout
// 3. setTimeout结束
// 2. Promise in setTimeout
```

微任务在当前阶段的回调执行完毕后立即执行。

## Promise与setImmediate的交互

```javascript
setImmediate(() => {
  console.log('1. setImmediate');
  
  Promise.resolve().then(() => {
    console.log('2. Promise');
  });
});

setImmediate(() => {
  console.log('3. setImmediate 2');
});

// 输出：
// 1. setImmediate
// 2. Promise（在两个setImmediate之间）
// 3. setImmediate 2
```

关键点：每个回调执行完后都会检查并执行微任务队列。

## 嵌套Promise的执行顺序

```javascript
Promise.resolve()
  .then(() => {
    console.log('1. 外层Promise');
    
    return Promise.resolve()
      .then(() => {
        console.log('2. 内层Promise');
      });
  })
  .then(() => {
    console.log('3. 外层Promise链继续');
  });

Promise.resolve().then(() => {
  console.log('4. 另一个Promise');
});

// 输出：
// 1. 外层Promise
// 4. 另一个Promise
// 2. 内层Promise
// 3. 外层Promise链继续
```

### 分析

```
微任务队列初始状态：
[外层Promise.then, 另一个Promise.then]

执行"外层Promise.then"：
  - 打印"1. 外层Promise"
  - 返回的Promise创建新的.then
  - 队列：[另一个Promise.then, 内层Promise.then]

执行"另一个Promise.then"：
  - 打印"4. 另一个Promise"
  - 队列：[内层Promise.then]

执行"内层Promise.then"：
  - 打印"2. 内层Promise"
  - 内层Promise完成，外层链可以继续
  - 队列：[外层Promise链继续]

执行"外层Promise链继续"：
  - 打印"3. 外层Promise链继续"
```

## Promise.all与事件循环

```javascript
console.log('开始');

Promise.all([
  Promise.resolve().then(() => {
    console.log('Promise 1');
    return 1;
  }),
  Promise.resolve().then(() => {
    console.log('Promise 2');
    return 2;
  }),
  Promise.resolve().then(() => {
    console.log('Promise 3');
    return 3;
  })
]).then(results => {
  console.log('All完成:', results);
});

console.log('结束');

// 输出：
// 开始
// 结束
// Promise 1
// Promise 2
// Promise 3
// All完成: [1, 2, 3]
```

## 实际应用：控制执行顺序

### 确保异步操作按顺序执行

```javascript
async function sequential() {
  const results = [];
  
  for (const item of items) {
    // 每次等待完成再处理下一个
    const result = await processItem(item);
    results.push(result);
  }
  
  return results;
}
```

### 并发执行但保持顺序

```javascript
async function concurrent() {
  // 同时启动所有操作
  const promises = items.map(item => processItem(item));
  
  // 按顺序收集结果
  return Promise.all(promises);
}
```

### 批量处理避免饿死事件循环

```javascript
async function batchProcess(items, batchSize = 100) {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map(processItem));
    
    // 给事件循环一个喘息的机会
    await new Promise(resolve => setImmediate(resolve));
  }
}
```

## Promise错误处理与事件循环

### unhandledRejection事件

```javascript
process.on('unhandledRejection', (reason, promise) => {
  console.log('未处理的Promise拒绝:', reason);
});

// 这个拒绝会触发unhandledRejection
Promise.reject(new Error('出错了'));
```

### 错误处理时机

```javascript
const promise = Promise.reject(new Error('错误'));

// 在下一个tick之前添加处理器，不会触发unhandledRejection
promise.catch(err => {
  console.log('捕获错误:', err.message);
});
```

## 性能考虑

### 避免微任务风暴

```javascript
// 危险：可能创建大量微任务
function dangerousRecursive() {
  Promise.resolve().then(() => {
    // 无限递归创建微任务
    dangerousRecursive();
  });
}

// 会阻塞事件循环，其他任务无法执行
```

### 使用setImmediate分割工作

```javascript
async function safeProcess(items) {
  for (let i = 0; i < items.length; i++) {
    await processItem(items[i]);
    
    // 每处理100个，让出控制权
    if (i % 100 === 0) {
      await new Promise(resolve => setImmediate(resolve));
    }
  }
}
```

## queueMicrotask API

Node.js 12+提供了标准的`queueMicrotask`API：

```javascript
queueMicrotask(() => {
  console.log('微任务执行');
});

// 等价于
Promise.resolve().then(() => {
  console.log('Promise微任务');
});
```

### 与process.nextTick的区别

```javascript
process.nextTick(() => console.log('1. nextTick'));
queueMicrotask(() => console.log('2. queueMicrotask'));
Promise.resolve().then(() => console.log('3. Promise'));

// 输出：
// 1. nextTick（nextTick队列优先）
// 2. queueMicrotask
// 3. Promise
```

## 调试Promise执行顺序

```javascript
const async_hooks = require('async_hooks');

const promiseMap = new Map();

async_hooks.createHook({
  init(asyncId, type) {
    if (type === 'PROMISE') {
      promiseMap.set(asyncId, {
        type,
        created: Date.now(),
        stack: new Error().stack
      });
    }
  },
  before(asyncId) {
    if (promiseMap.has(asyncId)) {
      console.log(`Promise ${asyncId} 开始执行`);
    }
  },
  after(asyncId) {
    if (promiseMap.has(asyncId)) {
      console.log(`Promise ${asyncId} 执行完成`);
    }
  }
}).enable();
```

## 本章小结

- Promise回调在微任务队列中执行
- `process.nextTick`优先级高于Promise微任务
- 微任务在每个事件循环阶段的回调之间执行
- `async/await`遵循相同的微任务规则
- 避免创建过多微任务导致事件循环饿死
- 使用`setImmediate`分割长时间的Promise链
- `queueMicrotask`提供标准的微任务API

下一章，我们将学习如何可视化调试事件循环，更直观地理解其运行机制。
