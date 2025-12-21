# Check阶段与setImmediate

setImmediate是Node.js特有的定时器API，它在check阶段执行。理解setImmediate对于控制异步代码执行顺序至关重要。

## setImmediate的定位

```
事件循环各阶段：

┌─ timers ────────────────────────────────────────┐
│  setTimeout/setInterval回调                      │
└─────────────────────────────────────────────────┘
                    │
                    ▼
┌─ pending callbacks ─────────────────────────────┐
│  系统级I/O回调                                   │
└─────────────────────────────────────────────────┘
                    │
                    ▼
┌─ poll ──────────────────────────────────────────┐
│  I/O回调（网络、文件等）                          │
│  检查是否有setImmediate → 如果有，不阻塞          │
└─────────────────────────────────────────────────┘
                    │
                    ▼
┌─ check ─────────────────────────────────────────┐
│  setImmediate回调                         ◄── 这里│
└─────────────────────────────────────────────────┘
                    │
                    ▼
┌─ close callbacks ───────────────────────────────┐
│  关闭回调                                        │
└─────────────────────────────────────────────────┘
```

## 为什么需要setImmediate

### 场景1：递归异步操作

```javascript
// 问题：使用setTimeout(fn, 0)递归
function processItems(items) {
  if (items.length === 0) return;
  
  processOne(items[0]);
  
  // 每次都要等待下一轮timers阶段
  setTimeout(() => processItems(items.slice(1)), 0);
}

// 更好：使用setImmediate
function processItems(items) {
  if (items.length === 0) return;
  
  processOne(items[0]);
  
  // 当前迭代的check阶段就能执行
  setImmediate(() => processItems(items.slice(1)));
}
```

### 场景2：不阻塞I/O

```javascript
// 大量计算时，让出事件循环处理I/O
function heavyComputation(data, callback) {
  let result = 0;
  let index = 0;
  
  function processChunk() {
    const end = Math.min(index + 1000, data.length);
    
    while (index < end) {
      result += expensiveOperation(data[index]);
      index++;
    }
    
    if (index < data.length) {
      // 让事件循环有机会处理其他I/O
      setImmediate(processChunk);
    } else {
      callback(result);
    }
  }
  
  setImmediate(processChunk);
}
```

### 场景3：确保回调在I/O后执行

```javascript
const fs = require('fs');

fs.readFile('file.txt', (err, data) => {
  // 我们在poll阶段
  
  // 使用setImmediate确保在当前I/O批次处理完后执行
  setImmediate(() => {
    console.log('所有I/O回调处理完毕后执行');
  });
  
  // 这也会在当前poll阶段执行
  processData(data);
});
```

## setImmediate实现原理

### JavaScript层

```javascript
// lib/timers.js
function setImmediate(callback, ...args) {
  // 创建Immediate对象
  const immediate = new Immediate(callback, args);
  
  // 加入队列
  immediateQueue.push(immediate);
  
  // 通知事件循环有immediate待处理
  // 这会影响poll阶段的等待时间
  
  return immediate;
}
```

### libuv层

```c
// deps/uv/src/unix/loop-watcher.c
// check阶段使用idle/check/prepare机制实现

void uv__run_check(uv_loop_t* loop) {
  // 执行所有check回调
  QUEUE* q;
  QUEUE_FOREACH(q, &loop->check_handles) {
    uv_check_t* h = QUEUE_DATA(q, uv_check_t, queue);
    h->check_cb(h);
  }
}
```

### 执行流程

```
注册 setImmediate(callback)
          │
          ▼
    添加到immediateQueue
          │
          ▼
    设置标志：有immediate待处理
          │
          ▼
    poll阶段检查标志
          │ 发现有immediate
          ▼
    poll阶段不阻塞，立即退出
          │
          ▼
    进入check阶段
          │
          ▼
    执行所有immediate回调
          │
          ▼
    清空immediateQueue
```

## setImmediate vs setTimeout(fn, 0)

### 关键区别

| 特性 | setImmediate | setTimeout(fn, 0) |
|------|--------------|-------------------|
| 执行阶段 | check阶段 | timers阶段 |
| 最小延迟 | 无 | 1ms |
| 在I/O回调中 | 当前迭代执行 | 下一迭代执行 |
| 性能 | 更快 | 有定时器开销 |

### 性能对比

```javascript
const Benchmark = require('benchmark');
const suite = new Benchmark.Suite();

suite
  .add('setImmediate', {
    defer: true,
    fn: function(deferred) {
      setImmediate(() => deferred.resolve());
    }
  })
  .add('setTimeout', {
    defer: true,
    fn: function(deferred) {
      setTimeout(() => deferred.resolve(), 0);
    }
  })
  .on('cycle', function(event) {
    console.log(String(event.target));
  })
  .run();

// 典型结果:
// setImmediate x 200,000 ops/sec
// setTimeout x 50,000 ops/sec
// setImmediate快约4倍
```

### 在主模块中的行为

```javascript
// 主模块（非I/O回调中）
setTimeout(() => console.log('setTimeout'), 0);
setImmediate(() => console.log('setImmediate'));

// 输出顺序不确定！

// 原因：取决于进入事件循环时是否已过1ms
```

### 在I/O回调中的行为

```javascript
const fs = require('fs');

fs.readFile(__filename, () => {
  setTimeout(() => console.log('setTimeout'), 0);
  setImmediate(() => console.log('setImmediate'));
});

// 输出总是：
// setImmediate
// setTimeout
```

原因分析：
```
poll阶段（执行readFile回调）
     │
     │ 注册setTimeout → 添加到timers队列
     │ 注册setImmediate → 添加到check队列
     │
     ▼
check阶段（执行setImmediate）
     │
     ▼
close阶段
     │
     ▼
下一轮timers阶段（执行setTimeout）
```

## 批量执行与迭代限制

### 一次执行多少

```javascript
// 所有当前队列中的setImmediate都会执行
setImmediate(() => console.log('1'));
setImmediate(() => console.log('2'));
setImmediate(() => console.log('3'));

// 输出：1, 2, 3（同一check阶段）
```

### 但新添加的在下一轮

```javascript
setImmediate(() => {
  console.log('1');
  setImmediate(() => console.log('3'));  // 下一轮check阶段
});
setImmediate(() => console.log('2'));

// 输出：1, 2, 3
```

### 与递归的区别

```javascript
// 递归setImmediate
function recursive() {
  console.log('tick');
  setImmediate(recursive);
}
recursive();

// 每轮事件循环执行一次
// 不会阻塞其他I/O
```

```javascript
// 对比：同步递归
function syncRecursive() {
  console.log('tick');
  syncRecursive();  // 永远阻塞，直到栈溢出
}
```

## setImmediate应用场景

### 1. 分割长任务

```javascript
function processLargeArray(array, processItem, callback) {
  let index = 0;
  
  function next() {
    // 每次处理100个
    const startIndex = index;
    const endIndex = Math.min(index + 100, array.length);
    
    for (let i = startIndex; i < endIndex; i++) {
      processItem(array[i], i);
    }
    
    index = endIndex;
    
    if (index < array.length) {
      // 让出控制权，处理其他I/O
      setImmediate(next);
    } else {
      callback();
    }
  }
  
  setImmediate(next);
}

// 使用
processLargeArray(
  largeData,
  (item, i) => console.log(`处理第${i}项`),
  () => console.log('完成')
);
```

### 2. 事件聚合

```javascript
class EventAggregator {
  constructor() {
    this.events = [];
    this.scheduled = false;
  }
  
  add(event) {
    this.events.push(event);
    
    if (!this.scheduled) {
      this.scheduled = true;
      setImmediate(() => this.flush());
    }
  }
  
  flush() {
    const events = this.events;
    this.events = [];
    this.scheduled = false;
    
    // 批量处理
    console.log('处理事件:', events.length);
    events.forEach(e => this.process(e));
  }
  
  process(event) {
    // 处理单个事件
  }
}
```

### 3. 避免栈溢出

```javascript
// 问题：深度递归导致栈溢出
function badRecursion(n) {
  if (n <= 0) return;
  badRecursion(n - 1);
}
badRecursion(100000);  // 栈溢出

// 解决：使用setImmediate
function safeRecursion(n, callback) {
  if (n <= 0) {
    callback();
    return;
  }
  
  setImmediate(() => safeRecursion(n - 1, callback));
}
safeRecursion(100000, () => console.log('完成'));  // 正常完成
```

### 4. 测试中的使用

```javascript
// 确保异步操作完成
it('should emit event', (done) => {
  const emitter = new MyEmitter();
  
  emitter.on('ready', () => {
    done();
  });
  
  emitter.start();
  
  // 确保start()触发的同步代码执行完
  setImmediate(() => {
    // 这里可以做断言
  });
});
```

## clearImmediate

```javascript
const immediate = setImmediate(() => {
  console.log('不会执行');
});

clearImmediate(immediate);
```

### 注意事项

```javascript
// clearImmediate只能取消未执行的
setImmediate(() => {
  console.log('会执行');
  clearImmediate(immediate2);  // 可以取消同批次的其他immediate
});

const immediate2 = setImmediate(() => {
  console.log('不会执行');
});
```

## ref()和unref()

```javascript
// 默认：immediate阻止进程退出
const immediate = setImmediate(() => {
  console.log('执行');
});

// unref()：不阻止退出
immediate.unref();

// 如果没有其他活跃任务，进程可能在immediate执行前退出

// ref()：重新阻止退出
immediate.ref();
```

## 与Promise的交互

```javascript
console.log('1');

setImmediate(() => console.log('2'));

Promise.resolve().then(() => console.log('3'));

console.log('4');

// 输出：1, 4, 3, 2
// Promise微任务在check阶段之前执行
```

### 执行顺序

```
同步代码执行
     │
     ▼
微任务队列（Promise）
     │
     ▼
check阶段（setImmediate）
```

## 性能最佳实践

### 1. 避免过多setImmediate

```javascript
// 差：每个item都setImmediate
items.forEach(item => {
  setImmediate(() => process(item));
});

// 好：批量处理
setImmediate(() => {
  items.forEach(process);
});
```

### 2. 合理使用递归

```javascript
// 控制递归频率
function processWithLimit(items, batchSize = 100) {
  let index = 0;
  
  function processBatch() {
    const end = Math.min(index + batchSize, items.length);
    
    while (index < end) {
      process(items[index++]);
    }
    
    if (index < items.length) {
      setImmediate(processBatch);
    }
  }
  
  setImmediate(processBatch);
}
```

### 3. 监控check阶段

```javascript
const { monitorEventLoopDelay } = require('perf_hooks');

// 如果延迟高，可能check阶段回调太多或太耗时
const h = monitorEventLoopDelay({ resolution: 20 });
h.enable();

setInterval(() => {
  console.log('Event loop delay:', h.percentile(99) / 1e6, 'ms');
}, 1000);
```

## setImmediate与setTimeout(fn, 0)深度对比

这是Node.js中最常被讨论的话题之一：`setImmediate(fn)`和`setTimeout(fn, 0)`有什么区别？

### 核心差异

| 特性 | setImmediate | setTimeout(fn, 0) |
|------|--------------|-------------------|
| 执行阶段 | check | timers |
| 最小延迟 | 无 | 1ms |
| 在poll后执行 | 是 | 否（下一轮） |
| I/O回调中顺序 | 先执行 | 后执行 |

### 主模块中的不确定性

```javascript
// main.js
setTimeout(() => console.log('timeout'), 0);
setImmediate(() => console.log('immediate'));

// 运行多次，输出顺序可能不同：
// 可能：timeout, immediate
// 可能：immediate, timeout
```

原因分析：

```
Node.js启动
     │
     ▼
执行主模块同步代码
     │
     ├─ 注册setTimeout (timeout = now + 1ms)
     └─ 注册setImmediate
     │
     ▼
进入事件循环
     │
     ├─ 情况1：已过1ms
     │    timers阶段：执行setTimeout
     │    check阶段：执行setImmediate
     │    输出：timeout, immediate
     │
     └─ 情况2：还没过1ms
          timers阶段：没有到期定时器
          check阶段：执行setImmediate
          下一轮timers：执行setTimeout
          输出：immediate, timeout
```

### I/O回调中的确定性

```javascript
const fs = require('fs');

fs.readFile(__filename, () => {
  setTimeout(() => console.log('timeout'), 0);
  setImmediate(() => console.log('immediate'));
});

// 总是输出：
// immediate
// timeout
```

### 性能对比

```javascript
// 基准测试结果（典型）：
// setImmediate: 50ms (10000次迭代)
// setTimeout: 200ms (10000次迭代)
// Ratio: 4.00x

// setImmediate更快的原因：
// setTimeout需要：计算到期时间、插入堆O(log n)、检查堆顶、移除O(log n)
// setImmediate只需：加入链表尾部O(1)、移除O(1)
```

### 使用建议

**推荐使用setImmediate的场景：**
- 分割长时间CPU任务
- 在I/O回调后立即执行
- 需要更好的性能
- 递归异步操作

**推荐使用setTimeout的场景：**
- 需要确定的最小延迟
- 需要可取消的操作
- 与浏览器代码共享

## 本章小结

- setImmediate在check阶段执行，位于poll阶段之后
- setImmediate比setTimeout(fn, 0)快约4倍
- 在I/O回调中，setImmediate总是先于setTimeout执行
- 主模块中两者执行顺序不确定
- setImmediate用于分割长任务、避免阻塞I/O
- 当前批次的所有setImmediate会一起执行
- 回调中新注册的setImmediate在下一轮执行
- 使用unref()让immediate不阻止进程退出

下一章，我们将深入close callbacks阶段，理解资源关闭回调的处理机制。
