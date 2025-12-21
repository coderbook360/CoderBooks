# process.nextTick与微任务

process.nextTick是Node.js中优先级最高的异步机制。理解它与Promise微任务的关系，对于正确控制异步代码执行顺序至关重要。

## nextTick的特殊地位

### 它不属于事件循环

```
事件循环阶段：
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   timers → pending → poll → check → close               │
│                                                         │
└─────────────────────────────────────────────────────────┘

nextTick队列：（独立于事件循环阶段）
┌─────────────────────────────────────────────────────────┐
│   在每个阶段结束后、下个阶段开始前执行                     │
│   优先级高于Promise微任务                                │
└─────────────────────────────────────────────────────────┘
```

### 执行时机

```javascript
console.log('1');

setTimeout(() => console.log('2'), 0);
setImmediate(() => console.log('3'));

Promise.resolve().then(() => console.log('4'));
process.nextTick(() => console.log('5'));

console.log('6');

// 输出：1, 6, 5, 4, 2/3
// 5(nextTick) 在 4(Promise) 之前
```

## nextTick vs 微任务

### 优先级比较

```
┌─────────────────────────────────────────────────────────┐
│                    优先级排序                            │
│                                                         │
│   高 ←────────────────────────────────────────────→ 低   │
│                                                         │
│   nextTick  >  Promise微任务  >  setImmediate  >  setTimeout │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 详细对比

| 特性 | process.nextTick | Promise.then |
|------|------------------|--------------|
| 优先级 | 最高 | 次高 |
| 标准 | Node.js特有 | ECMAScript标准 |
| 执行时机 | 每个阶段后立即 | nextTick队列清空后 |
| 递归风险 | 可能饿死I/O | 受保护 |

## 微任务队列详解

### 两个队列

```cpp
// Node.js内部维护两个微任务队列

// 1. nextTick队列
std::queue<Callback> nextTickQueue;

// 2. Promise微任务队列
// 由V8管理
v8::MicrotaskQueue
```

### 执行顺序

```javascript
process.nextTick(() => console.log('nextTick 1'));
process.nextTick(() => console.log('nextTick 2'));

Promise.resolve().then(() => console.log('promise 1'));
Promise.resolve().then(() => console.log('promise 2'));

// 输出：
// nextTick 1
// nextTick 2
// promise 1
// promise 2

// 先清空所有nextTick，再处理Promise
```

### 嵌套行为

```javascript
process.nextTick(() => {
  console.log('nextTick 1');
  process.nextTick(() => console.log('nextTick 3'));
});

process.nextTick(() => console.log('nextTick 2'));

Promise.resolve().then(() => console.log('promise 1'));

// 输出：
// nextTick 1
// nextTick 2
// nextTick 3  ← 嵌套的nextTick也在Promise前执行
// promise 1
```

## nextTick的实现

### JavaScript层

```javascript
// lib/internal/process/task_queues.js
function nextTick(callback, ...args) {
  // 参数验证
  if (typeof callback !== 'function') {
    throw new TypeError('Callback must be a function');
  }
  
  // 创建tick对象
  const tickObject = {
    callback,
    args
  };
  
  // 加入队列
  queue.push(tickObject);
  
  // 标记有待处理的tick
  tickInfo[kHasScheduled] = 1;
}
```

### C++层触发

```cpp
// src/node_task_queue.cc
void RunNextTicksNative(const FunctionCallbackInfo<Value>& args) {
  Environment* env = Environment::GetCurrent(args);
  
  // 执行所有nextTick回调
  while (!env->tick_callback_queue_.empty()) {
    Local<Function> callback = env->tick_callback_queue_.front();
    env->tick_callback_queue_.pop();
    
    callback->Call(context, Undefined(isolate), 0, nullptr);
    
    // 执行后检查微任务
    isolate->PerformMicrotaskCheckpoint();
  }
}
```

## queueMicrotask

ES2020引入的标准微任务API：

```javascript
queueMicrotask(() => console.log('microtask'));

// 等价于
Promise.resolve().then(() => console.log('microtask'));
```

### 与nextTick的区别

```javascript
process.nextTick(() => console.log('nextTick'));
queueMicrotask(() => console.log('queueMicrotask'));
Promise.resolve().then(() => console.log('promise'));

// 输出：
// nextTick
// queueMicrotask
// promise

// queueMicrotask和Promise.then优先级相同
```

## 使用场景

### 1. 确保异步一致性

```javascript
// 问题：有时同步有时异步
function maybeAsync(callback) {
  if (cachedResult) {
    callback(null, cachedResult);  // 同步
  } else {
    fetchData(callback);  // 异步
  }
}

// 解决：总是异步
function alwaysAsync(callback) {
  if (cachedResult) {
    process.nextTick(callback, null, cachedResult);  // 异步
  } else {
    fetchData(callback);  // 异步
  }
}
```

### 2. 在构造函数中发出事件

```javascript
const EventEmitter = require('events');

class MyEmitter extends EventEmitter {
  constructor() {
    super();
    
    // 错误：监听器还没机会注册
    // this.emit('ready');  // ❌
    
    // 正确：让调用者先注册监听器
    process.nextTick(() => {
      this.emit('ready');  // ✓
    });
  }
}

// 使用
const emitter = new MyEmitter();
emitter.on('ready', () => console.log('ready!'));
// 'ready!' 会被正确输出
```

### 3. API一致性

```javascript
// Stream的destroy方法使用nextTick
class MyStream extends Stream {
  destroy(err) {
    if (this.destroyed) return;
    this.destroyed = true;
    
    // 使用nextTick确保错误处理器有机会注册
    process.nextTick(() => {
      if (err) this.emit('error', err);
      this.emit('close');
    });
  }
}
```

### 4. 初始化完成通知

```javascript
class Database {
  constructor(config) {
    this.ready = false;
    
    // 模拟异步连接
    this._connect(config).then(() => {
      this.ready = true;
      // 在下一个tick通知
      process.nextTick(() => {
        this.emit('ready');
      });
    });
  }
}
```

## 危险：nextTick饿死I/O

### 问题演示

```javascript
// 危险：无限递归的nextTick会阻塞事件循环
function recursiveNextTick() {
  process.nextTick(recursiveNextTick);
}
recursiveNextTick();

// I/O回调永远不会执行
fs.readFile('file.txt', (err, data) => {
  console.log('这永远不会执行');
});
```

### 为什么会这样

```
同步代码
    │
    ▼
清空nextTick队列（无限）
    │ ← 永远停在这里
    ▼
永远不会到达
    timers阶段
    poll阶段
    ...
```

### 解决方案

```javascript
// 使用setImmediate替代
function recursiveSafe() {
  setImmediate(recursiveSafe);
}
recursiveSafe();

// I/O可以正常处理
fs.readFile('file.txt', (err, data) => {
  console.log('这会正常执行');
});
```

### 限制递归深度

```javascript
let depth = 0;
const MAX_DEPTH = 1000;

function limitedRecursion() {
  if (depth++ > MAX_DEPTH) {
    // 切换到setImmediate让出控制权
    depth = 0;
    setImmediate(limitedRecursion);
    return;
  }
  
  // 处理任务
  doWork();
  
  process.nextTick(limitedRecursion);
}
```

## Promise与nextTick的交互

### 复杂示例

```javascript
console.log('start');

process.nextTick(() => {
  console.log('nextTick 1');
  Promise.resolve().then(() => console.log('promise in nextTick'));
});

Promise.resolve().then(() => {
  console.log('promise 1');
  process.nextTick(() => console.log('nextTick in promise'));
});

process.nextTick(() => console.log('nextTick 2'));

console.log('end');
```

输出：
```
start
end
nextTick 1
nextTick 2
promise in nextTick  ← 嵌套的promise在nextTick队列清空后
promise 1
nextTick in promise  ← 但promise中注册的nextTick又优先
```

### 执行流程图

```
1. 同步代码：start, end

2. 开始处理微任务队列
   ├─ nextTick队列: [nextTick1, nextTick2]
   │   ├─ 执行nextTick1 → 输出"nextTick 1"
   │   │   └─ 注册promise（加入Promise队列）
   │   └─ 执行nextTick2 → 输出"nextTick 2"
   │
   └─ Promise队列: [promise_in_nextTick, promise1]
       ├─ 执行promise_in_nextTick → 输出"promise in nextTick"
       └─ 执行promise1 → 输出"promise 1"
           └─ 注册nextTick（加入nextTick队列）

3. 检查nextTick队列（不为空）
   └─ 执行nextTick_in_promise → 输出"nextTick in promise"

4. 微任务队列全部清空，进入下一阶段
```

## 性能考虑

### nextTick vs setImmediate

```javascript
const { performance } = require('perf_hooks');

// nextTick更快但要谨慎使用
const start1 = performance.now();
for (let i = 0; i < 10000; i++) {
  process.nextTick(() => {});
}
// nextTick: ~1-2ms

const start2 = performance.now();
for (let i = 0; i < 10000; i++) {
  setImmediate(() => {});
}
// setImmediate: ~5-10ms
```

### 何时使用nextTick

```javascript
// ✓ 适用场景
// 1. 保证异步一致性
// 2. 事件发射（让监听器先注册）
// 3. 错误传播（让错误处理器先注册）

// ✗ 不适用场景
// 1. 长时间运行的任务分割
// 2. 递归操作
// 3. 需要让I/O有机会执行时
```

## async/await与微任务

```javascript
async function example() {
  console.log('async start');
  
  await Promise.resolve();
  
  console.log('after await');
}

console.log('start');
example();
console.log('end');

// 输出：
// start
// async start
// end
// after await
```

await之后的代码相当于放在Promise.then中。

### 与nextTick混合

```javascript
console.log('1');

process.nextTick(() => console.log('2'));

(async () => {
  console.log('3');
  await Promise.resolve();
  console.log('4');
})();

Promise.resolve().then(() => console.log('5'));

console.log('6');

// 输出：1, 3, 6, 2, 5, 4
```

## 调试微任务

### 追踪微任务

```javascript
// 包装nextTick进行追踪
const originalNextTick = process.nextTick;
process.nextTick = function(callback, ...args) {
  const stack = new Error().stack;
  console.log('nextTick registered from:', stack);
  
  originalNextTick(() => {
    console.log('nextTick executing');
    callback(...args);
  });
};
```

### 使用async_hooks

```javascript
const async_hooks = require('async_hooks');

const hook = async_hooks.createHook({
  init(asyncId, type) {
    if (type === 'TickObject') {
      console.log('nextTick created:', asyncId);
    }
  },
  before(asyncId) {
    console.log('entering:', asyncId);
  },
  after(asyncId) {
    console.log('exiting:', asyncId);
  }
});

hook.enable();
```

## 本章小结

- process.nextTick优先级最高，在每个阶段结束后立即执行
- nextTick队列先于Promise微任务队列执行
- queueMicrotask是标准化的微任务API，与Promise.then同优先级
- nextTick适用于：异步一致性、事件发射、错误传播
- 警惕：递归nextTick会饿死I/O，应使用setImmediate
- async/await后的代码作为微任务执行

下一章，我们将分析pending和close回调阶段的工作机制。
