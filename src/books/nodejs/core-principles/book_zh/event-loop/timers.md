# Timers阶段与定时器实现

定时器是异步编程的基础工具。本章深入分析Node.js中setTimeout、setInterval的实现原理，以及定时器在事件循环中的处理机制。

## 定时器类型

Node.js提供了四种定时器API：

| API | 作用 | 特点 |
|-----|------|------|
| `setTimeout` | 延迟执行一次 | 最常用 |
| `setInterval` | 循环执行 | 需要手动清除 |
| `setImmediate` | 当前迭代check阶段执行 | Node.js特有 |
| `process.nextTick` | 当前阶段后立即执行 | 优先级最高 |

## Timers阶段的位置

```
   ┌───────────────────────────┐
   │         timers            │ ◄── 这里执行setTimeout/setInterval回调
   └─────────────┬─────────────┘
                 │
   ┌─────────────▼─────────────┐
   │     pending callbacks     │
   └─────────────┬─────────────┘
                 │
                 ▼
              ...后续阶段...
```

## setTimeout实现原理

### JavaScript层

```javascript
// lib/timers.js
function setTimeout(callback, delay, ...args) {
  // 参数处理
  if (typeof callback !== 'function') {
    throw new TypeError('Callback must be a function');
  }
  
  delay = Math.max(1, delay | 0);  // 最小1ms
  
  // 创建Timeout对象
  const timeout = new Timeout(callback, delay, args);
  
  // 插入定时器队列
  insert(timeout);
  
  return timeout;
}
```

### Timeout对象

```javascript
// lib/internal/timers.js
class Timeout {
  constructor(callback, delay, args) {
    this._idleTimeout = delay;
    this._idleStart = now();  // 记录创建时间
    this._onTimeout = callback;
    this._timerArgs = args;
    this._repeat = null;      // setInterval用
    this._destroyed = false;
  }
  
  refresh() {
    // 重置定时器
    this._idleStart = now();
    // 重新插入队列
  }
  
  unref() {
    // 不阻止进程退出
    this[kRefed] = false;
  }
  
  ref() {
    // 阻止进程退出
    this[kRefed] = true;
  }
}
```

### 定时器存储结构

Node.js使用一种优化的数据结构来管理定时器：

```
定时器列表（按延迟时间分组）
┌────────────────────────────────────────────────────┐
│ 延迟=100ms:  Timer1 → Timer2 → Timer3              │
│ 延迟=200ms:  Timer4 → Timer5                       │
│ 延迟=500ms:  Timer6                                │
│ 延迟=1000ms: Timer7 → Timer8 → Timer9 → Timer10    │
└────────────────────────────────────────────────────┘

相同延迟的定时器放在同一个链表中
只需为每组设置一个底层定时器
```

### 优化：定时器合并

```javascript
// 这三个定时器共享一个底层handle
setTimeout(() => console.log('a'), 1000);
setTimeout(() => console.log('b'), 1000);
setTimeout(() => console.log('c'), 1000);

// 只创建一个libuv定时器，到期时依次执行回调
```

## libuv层实现

### 红黑树存储

libuv使用红黑树管理定时器，保证O(log n)的插入和查找：

```c
// deps/uv/src/timer.c
void uv_timer_start(uv_timer_t* handle,
                    uv_timer_cb cb,
                    uint64_t timeout,
                    uint64_t repeat) {
  // 计算到期时间
  handle->timeout = loop->time + timeout;
  handle->repeat = repeat;
  handle->timer_cb = cb;
  
  // 插入红黑树
  RB_INSERT(uv__timers, &loop->timer_handles, handle);
}
```

### 定时器执行

```c
// deps/uv/src/timer.c
void uv__run_timers(uv_loop_t* loop) {
  // 更新当前时间
  uv__update_time(loop);
  
  // 循环执行所有到期的定时器
  for (;;) {
    // 获取最早的定时器
    uv_timer_t* handle = RB_MIN(uv__timers, &loop->timer_handles);
    
    if (handle == NULL)
      break;
    
    // 如果还没到期，结束
    if (handle->timeout > loop->time)
      break;
    
    // 从树中移除
    RB_REMOVE(uv__timers, &loop->timer_handles, handle);
    
    // 如果是repeat（setInterval），重新插入
    if (handle->repeat != 0) {
      handle->timeout = loop->time + handle->repeat;
      RB_INSERT(uv__timers, &loop->timer_handles, handle);
    }
    
    // 执行回调
    handle->timer_cb(handle);
  }
}
```

## 定时器精度问题

### 最小延迟

```javascript
// 即使指定0ms，实际最小是1ms
setTimeout(() => {}, 0);   // 实际1ms
setTimeout(() => {}, 0.5); // 实际1ms
setTimeout(() => {}, 1);   // 实际1ms
```

### 延迟不保证精确

```javascript
// 延迟100ms执行，但可能是100+ms
const start = Date.now();

setTimeout(() => {
  const actual = Date.now() - start;
  console.log(`预期: 100ms, 实际: ${actual}ms`);
}, 100);

// 可能输出: 预期: 100ms, 实际: 102ms
```

原因：
1. 事件循环可能正在处理其他回调
2. 系统调度延迟
3. Poll阶段可能正在阻塞

### 精度测试

```javascript
function measureTimerAccuracy(delay, iterations = 100) {
  return new Promise((resolve) => {
    const results = [];
    let count = 0;
    
    function runTest() {
      const start = process.hrtime.bigint();
      setTimeout(() => {
        const elapsed = Number(process.hrtime.bigint() - start) / 1e6;
        results.push(elapsed);
        count++;
        
        if (count < iterations) {
          runTest();
        } else {
          resolve(results);
        }
      }, delay);
    }
    
    runTest();
  });
}

// 测试
(async () => {
  const results = await measureTimerAccuracy(100, 50);
  const avg = results.reduce((a, b) => a + b) / results.length;
  const max = Math.max(...results);
  const min = Math.min(...results);
  
  console.log(`延迟100ms, 测试50次:`);
  console.log(`平均: ${avg.toFixed(2)}ms`);
  console.log(`最小: ${min.toFixed(2)}ms`);
  console.log(`最大: ${max.toFixed(2)}ms`);
})();
```

## setInterval深入

### 实现原理

```javascript
// 简化的setInterval实现
function setInterval(callback, delay, ...args) {
  const timeout = new Timeout(callback, delay, args);
  timeout._repeat = delay;  // 设置重复
  insert(timeout);
  return timeout;
}
```

### setInterval的问题

```javascript
// 问题：回调执行时间累积
setInterval(async () => {
  // 每次执行需要50ms
  await longOperation();  // 50ms
}, 100);

// 期望: 每100ms执行一次
// 实际: 
// 0ms: 开始执行，50ms完成
// 100ms: 开始执行，150ms完成
// 200ms: 开始执行，250ms完成
// 正常工作

// 但如果执行时间超过间隔：
setInterval(async () => {
  await veryLongOperation();  // 150ms
}, 100);

// 实际:
// 0ms: 开始执行，150ms完成
// 150ms: 立即开始执行（因为已经过了100ms）
// 300ms: 立即开始执行
// 任务会堆积！
```

### 更好的替代方案

```javascript
// 使用递归setTimeout确保间隔
function reliableInterval(callback, delay) {
  let timeoutId;
  
  async function tick() {
    await callback();
    timeoutId = setTimeout(tick, delay);
  }
  
  timeoutId = setTimeout(tick, delay);
  
  return {
    clear() {
      clearTimeout(timeoutId);
    }
  };
}

// 使用
const interval = reliableInterval(async () => {
  await longOperation();
}, 100);

// 现在每次回调完成后才开始计时
```

## setTimeout(fn, 0)与setImmediate

这是一个经典问题：

```javascript
setTimeout(() => console.log('timeout'), 0);
setImmediate(() => console.log('immediate'));
```

输出顺序不确定！

### 原因分析

```
主模块代码执行完毕
     │
     ▼
进入事件循环
     │
     ├─ 如果此时已经过了1ms：
     │    timers阶段执行setTimeout
     │    check阶段执行setImmediate
     │    输出: timeout, immediate
     │
     └─ 如果还没过1ms：
          timers阶段没有到期定时器
          check阶段执行setImmediate
          下次迭代timers执行setTimeout
          输出: immediate, timeout
```

### 在I/O回调中的行为

```javascript
const fs = require('fs');

fs.readFile(__filename, () => {
  setTimeout(() => console.log('timeout'), 0);
  setImmediate(() => console.log('immediate'));
});

// 总是输出: immediate, timeout
```

原因：I/O回调在poll阶段执行，之后是check阶段（setImmediate），然后才是下一轮的timers阶段。

```
poll阶段（执行fs回调）
     │ 注册 setTimeout
     │ 注册 setImmediate
     ▼
check阶段（执行setImmediate）
     │
     ▼
close阶段
     │
     ▼
timers阶段（执行setTimeout）
```

## Timer性能优化

### 减少定时器数量

```javascript
// 差：大量定时器
users.forEach(user => {
  setTimeout(() => checkUser(user), 60000);
});

// 好：单个定时器批量处理
setInterval(() => {
  users.forEach(checkUser);
}, 60000);
```

### 使用unref()

```javascript
// 定时器不阻止进程退出
const timer = setInterval(() => {
  console.log('健康检查');
}, 5000);
timer.unref();

// 当没有其他活跃任务时，进程可以退出
```

### 定时器复用

```javascript
// 差：每次创建新定时器
function debounce(fn, delay) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// 好：使用refresh()复用
function debounce(fn, delay) {
  let timer = setTimeout(() => {}, delay);
  timer.unref();  // 不阻止退出
  
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}
```

## 高精度定时

### setImmediate循环

```javascript
// 尽可能快地执行
function highFrequencyTask() {
  // 处理任务
  doWork();
  
  // 立即安排下一次
  setImmediate(highFrequencyTask);
}
```

### process.hrtime

```javascript
// 高精度时间测量
const start = process.hrtime.bigint();

// ... 执行代码 ...

const end = process.hrtime.bigint();
console.log(`耗时: ${end - start}ns`);
```

### performance.now

```javascript
const { performance } = require('perf_hooks');

const start = performance.now();
// ... 执行代码 ...
const end = performance.now();

console.log(`耗时: ${end - start}ms`);
```

## 定时器与内存泄漏

### 常见泄漏场景

```javascript
// 泄漏：闭包引用大对象
function setup() {
  const largeData = new Array(1000000).fill('x');
  
  setInterval(() => {
    // largeData被闭包引用，无法释放
    console.log(largeData.length);
  }, 1000);
}

// 正确：只引用需要的数据
function setup() {
  const largeData = new Array(1000000).fill('x');
  const length = largeData.length;  // 只保存需要的
  
  setInterval(() => {
    console.log(length);
  }, 1000);
}
```

### 清理定时器

```javascript
class Service {
  constructor() {
    this.timer = setInterval(() => this.check(), 5000);
  }
  
  check() {
    console.log('检查中...');
  }
  
  destroy() {
    // 必须清理！
    clearInterval(this.timer);
    this.timer = null;
  }
}
```

## 深入：libuv定时器底层实现

### 核心数据结构

```c
// deps/uv/include/uv.h
struct uv_timer_s {
  void* data;
  uv_loop_t* loop;
  uv_timer_cb timer_cb;    // 回调函数
  
  union {
    void* heap[3];         // 堆节点（新版本）
    struct {
      RB_ENTRY(uv_timer_s) tree_entry;  // 红黑树节点（旧版本）
    };
  };
  
  uint64_t timeout;        // 到期时间（绝对时间）
  uint64_t repeat;         // 重复间隔（0表示单次）
  uint64_t start_id;       // 用于相同timeout排序
};
```

### 最小堆实现（现代libuv）

```c
// 最小堆结构
//            10ms          <- 堆顶（最近到期）
//           /    \
//        30ms    50ms
//        /  \    /
//     40ms 80ms 100ms

// 操作复杂度
// 插入: O(log n)
// 删除: O(log n)
// 获取最小: O(1)
```

### 时间管理

```c
// 使用单调时钟，不受系统时间调整影响
uint64_t uv__hrtime(uv_clocktype_t type) {
  struct timespec ts;
  clock_gettime(CLOCK_MONOTONIC, &ts);
  return ts.tv_sec * 1000000000ull + ts.tv_nsec;
}

// 时间缓存，避免频繁系统调用
void uv__update_time(uv_loop_t* loop) {
  loop->time = uv__hrtime(UV_CLOCK_FAST) / 1000000;
}
```

### 定时器执行流程

```c
void uv__run_timers(uv_loop_t* loop) {
  for (;;) {
    // 获取堆顶定时器
    heap_node = heap_min(&loop->timer_heap);
    if (heap_node == NULL) break;
    
    handle = container_of(heap_node, uv_timer_t, heap_node);
    
    // 检查是否到期
    if (handle->timeout > loop->time) break;
    
    // 停止定时器
    uv_timer_stop(handle);
    
    // 如果是重复定时器，重新启动
    if (handle->repeat != 0)
      uv_timer_again(handle);
    
    // 执行回调
    handle->timer_cb(handle);
  }
}
```

## 本章小结

- setTimeout/setInterval在timers阶段执行
- libuv使用最小堆存储定时器，保证O(1)获取最近到期定时器
- Node.js层优化：相同延迟的定时器会合并，共享底层handle
- 使用单调时钟，不受系统时间调整影响
- 最小延迟是1ms，实际延迟可能更长
- setTimeout(fn, 0)和setImmediate的执行顺序在主模块中不确定
- 在I/O回调中，setImmediate总是先于setTimeout执行
- setInterval可能导致任务堆积，考虑使用递归setTimeout
- 使用unref()让定时器不阻止进程退出
- 注意清理定时器避免内存泄漏

下一章，我们将深入pending callbacks阶段，理解延迟I/O回调的处理机制。
