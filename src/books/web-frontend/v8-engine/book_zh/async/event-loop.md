# 事件循环的底层实现：宏任务与微任务

当你写下这段代码时，你能准确预测输出顺序吗？

```javascript
console.log('start');

setTimeout(() => {
  console.log('timeout');
}, 0);

Promise.resolve().then(() => {
  console.log('promise');
});

console.log('end');
```

如果你认为输出是 `start → end → timeout → promise`，那你需要理解事件循环。实际输出是 `start → end → promise → timeout`。Promise 的回调竟然比 `setTimeout(..., 0)` 先执行！

这种看似"违反直觉"的行为背后，是 JavaScript 事件循环的精妙设计。本章将带你深入 V8 引擎，理解事件循环如何协调同步代码、异步回调、Promise 和定时器的执行顺序。

## 问题的起点：单线程的困境

让我们从一个真实的痛点开始。假设你要处理一个包含 100 万个元素的数组：

```javascript
// 这段代码会让浏览器失去响应
function processBigArray() {
  const bigArray = new Array(1000000).fill(0);
  const startTime = Date.now();
  
  console.log('开始处理...');
  
  bigArray.forEach((_, index) => {
    // 模拟耗时操作
    Math.sqrt(index);
  });
  
  console.log(`处理完成，耗时 ${Date.now() - startTime}ms`);
}

processBigArray();
console.log('这行代码要等很久才能执行');
```

运行这段代码，你会发现：
1. "开始处理..."立即打印
2. 浏览器**完全卡住**，鼠标点击无响应
3. 几秒后"处理完成"打印
4. 最后才打印"这行代码要等很久才能执行"

这就是 JavaScript 单线程的特性：**同一时刻只能执行一段代码**。当 `forEach` 循环霸占 CPU 时，其他一切都要等待。

### 为什么 JavaScript 是单线程的？

这不是设计缺陷，而是刻意为之。想象如果 JavaScript 是多线程的：

```javascript
// 假设有两个线程同时运行
// 线程 A
document.getElementById('box').remove();

// 线程 B（同时执行）
document.getElementById('box').style.color = 'red';
```

线程 A 删除了 DOM，线程 B 却要修改它的样式。谁应该获胜？如何保证 DOM 操作的一致性？这会引入复杂的锁机制和竞态条件问题。

JavaScript 选择了单线程，避免了这些复杂性。但如何在单线程中处理异步操作（如网络请求、定时器）？这就是事件循环要解决的问题。

## 事件循环的核心思想

事件循环的核心思想很简单：**当主线程空闲时，去任务队列中取任务来执行**。

让我们用一个简化的模型来理解：

```javascript
// 事件循环的伪代码
while (true) {
  // 1. 执行调用栈中的代码，直到栈为空
  while (callStack.length > 0) {
    const task = callStack.pop();
    execute(task);
  }
  
  // 2. 调用栈为空，检查微任务队列
  while (microtaskQueue.length > 0) {
    const microtask = microtaskQueue.shift();
    execute(microtask);
  }
  
  // 3. 微任务也清空了，取一个宏任务
  if (macrotaskQueue.length > 0) {
    const macrotask = macrotaskQueue.shift();
    execute(macrotask);
    // 回到步骤 2，检查是否有新的微任务
  }
  
  // 4. 如果所有队列都空了，等待新任务
  waitForTasks();
}
```

这个循环永不停止，不断检查并执行任务。关键在于三个队列：
- **调用栈（Call Stack）**：当前正在执行的同步代码
- **微任务队列（Microtask Queue）**：Promise.then、queueMicrotask
- **宏任务队列（Macrotask Queue）**：setTimeout、setInterval、I/O

现在让我们用真实代码来验证这个模型。

## 事件循环的基本模型

事件循环的核心结构：

```javascript
// 事件循环模型
class EventLoopModel {
  static demonstrate() {
    console.log('=== 事件循环基本模型 ===\n');
    
    console.log('事件循环的组成部分：');
    console.log('');
    console.log('  ┌─────────────────────────────────────────┐');
    console.log('  │              调用栈 (Call Stack)         │');
    console.log('  │  执行同步代码，一次一个函数               │');
    console.log('  └─────────────────────────────────────────┘');
    console.log('                      ↓');
    console.log('  ┌─────────────────────────────────────────┐');
    console.log('  │           微任务队列 (Microtask Queue)   │');
    console.log('  │  Promise回调、queueMicrotask            │');
    console.log('  └─────────────────────────────────────────┘');
    console.log('                      ↓');
    console.log('  ┌─────────────────────────────────────────┐');
    console.log('  │           宏任务队列 (Macrotask Queue)   │');
    console.log('  │  setTimeout、setInterval、I/O           │');
    console.log('  └─────────────────────────────────────────┘');
    console.log('');
  }
  
  static demonstrateLoop() {
    console.log('=== 事件循环执行流程 ===\n');
    
    console.log('每轮事件循环：');
    console.log('');
    console.log('  1. 执行调用栈中的所有同步代码');
    console.log('     │');
    console.log('     ↓');
    console.log('  2. 清空微任务队列');
    console.log('     (执行所有微任务，包括新产生的)');
    console.log('     │');
    console.log('     ↓');
    console.log('  3. 浏览器渲染（如需要）');
    console.log('     │');
    console.log('     ↓');
    console.log('  4. 取一个宏任务执行');
    console.log('     │');
    console.log('     ↓');
    console.log('  5. 回到步骤2，继续循环');
    console.log('');
  }
  
  static runAll() {
    this.demonstrate();
    this.demonstrateLoop();
  }
}

EventLoopModel.runAll();
```

## 宏任务与微任务

两种任务类型的区别：

```javascript
// 宏任务与微任务
class MacroAndMicrotasks {
  static demonstrateMacrotasks() {
    console.log('=== 宏任务（Macrotask）===\n');
    
    console.log('宏任务来源：');
    console.log('  • setTimeout / setInterval');
    console.log('  • setImmediate（Node.js）');
    console.log('  • I/O操作');
    console.log('  • UI渲染（浏览器）');
    console.log('  • MessageChannel');
    console.log('  • script标签（整体脚本）\n');
    
    console.log('特点：');
    console.log('  • 每轮事件循环执行一个');
    console.log('  • 执行完一个后会检查微任务队列');
    console.log('  • 优先级相对较低\n');
  }
  
  static demonstrateMicrotasks() {
    console.log('=== 微任务（Microtask）===\n');
    
    console.log('微任务来源：');
    console.log('  • Promise.then/catch/finally');
    console.log('  • queueMicrotask()');
    console.log('  • MutationObserver（浏览器）');
    console.log('  • process.nextTick（Node.js，特殊）\n');
    
    console.log('特点：');
    console.log('  • 每个宏任务后全部执行');
    console.log('  • 微任务中产生的微任务也会执行');
    console.log('  • 优先级高于宏任务\n');
  }
  
  static demonstrateExample() {
    console.log('=== 执行顺序示例 ===\n');
    
    console.log('代码：');
    console.log(`
    console.log('1');
    
    setTimeout(() => {
      console.log('2');
    }, 0);
    
    Promise.resolve().then(() => {
      console.log('3');
    });
    
    console.log('4');
    `);
    
    console.log('执行分析：');
    console.log('  1. 同步代码：输出 1');
    console.log('  2. setTimeout回调进入宏任务队列');
    console.log('  3. Promise.then进入微任务队列');
    console.log('  4. 同步代码：输出 4');
    console.log('  5. 清空微任务队列：输出 3');
    console.log('  6. 执行宏任务：输出 2');
    console.log('');
    console.log('  输出顺序：1 → 4 → 3 → 2\n');
    
    // 实际执行验证
    console.log('实际执行：');
    console.log('1');
    setTimeout(() => console.log('2'), 0);
    Promise.resolve().then(() => console.log('3'));
    console.log('4');
    console.log('');
  }
  
  static runAll() {
    this.demonstrateMacrotasks();
    this.demonstrateMicrotasks();
    this.demonstrateExample();
  }
}

MacroAndMicrotasks.runAll();
```

## 事件循环的完整执行流程

现在我们已经通过实验理解了基本规则，让我们整理出完整的执行流程：

```
每轮事件循环（Event Loop Iteration）：

1. 执行一个宏任务（Script整体代码、setTimeout回调、I/O等）
   ↓
2. 执行所有微任务（Promise.then、queueMicrotask）
   - 微任务中新产生的微任务也要执行完
   - 直到微任务队列完全清空
   ↓
3. (浏览器) 判断是否需要渲染
   - 通常每秒60次（16.67ms一次）
   - 如果需要，执行 requestAnimationFrame 回调
   - 进行页面渲染
   ↓
4. 返回步骤1，取下一个宏任务
```

让我们用一个复杂的例子来验证这个流程：

```javascript
console.log('脚本开始');

setTimeout(() => {
  console.log('宏任务 1');
  Promise.resolve().then(() => {
    console.log('宏任务1中的微任务');
  });
}, 0);

Promise.resolve().then(() => {
  console.log('微任务 1');
}).then(() => {
  console.log('微任务 2');
});

setTimeout(() => {
  console.log('宏任务 2');
}, 0);

console.log('脚本结束');
```

**逐步推导输出顺序**：

**第一轮循环（执行整个脚本）**：
1. 同步代码：输出 `脚本开始`
2. 宏任务1（`setTimeout 1`）进入宏任务队列
3. 微任务1（`Promise 1`）进入微任务队列
4. 宏任务2（`setTimeout 2`）进入宏任务队列
5. 同步代码：输出 `脚本结束`
6. **清空微任务队列**：
   - 执行微任务1，输出 `微任务 1`
   - `then` 链中的下一个 then 进入微任务队列
   - 执行微任务2，输出 `微任务 2`
   - 微任务队列清空

此时状态：
- 宏任务队列：`[宏任务1, 宏任务2]`
- 微任务队列：`[]`
- 已输出：`脚本开始 → 脚本结束 → 微任务 1 → 微任务 2`

**第二轮循环（执行宏任务1）**：
7. 取出宏任务1执行，输出 `宏任务 1`
8. 在宏任务1中添加了新的微任务，进入微任务队列
9. **清空微任务队列**：
   - 执行，输出 `宏任务1中的微任务`

此时状态：
- 宏任务队列：`[宏任务2]`
- 微任务队列：`[]`
- 已输出：`... → 宏任务 1 → 宏任务1中的微任务`

**第三轮循环（执行宏任务2）**：
10. 取出宏任务2执行，输出 `宏任务 2`

**最终输出顺序**：
```
脚本开始
脚本结束
微任务 1
微任务 2
宏任务 1
宏任务1中的微任务
宏任务 2
```

**关键观察**：
- 每个宏任务执行后，都会立即清空微任务队列
- 微任务不会跨越宏任务边界
- 宏任务之间是完全独立的

## V8 中的微任务队列实现

现在让我们深入 V8 引擎，看看微任务队列是如何实现的。

### 微任务队列的数据结构

V8 为每个 JavaScript 执行上下文（Context）维护一个微任务队列：

```cpp
// V8 简化源码（C++）
class MicrotaskQueue {
 private:
  // 微任务存储（环形缓冲区）
  std::vector<Microtask> pending_microtasks_;
  
  // 当前是否正在执行微任务
  bool is_running_microtasks_ = false;
  
  // 嵌套深度（防止无限递归）
  int microtask_nesting_level_ = 0;
  
 public:
  // 添加微任务
  void EnqueueMicrotask(Microtask task) {
    pending_microtasks_.push_back(task);
  }
  
  // 执行所有微任务
  void PerformMicrotaskCheckpoint() {
    // 防止重入
    if (is_running_microtasks_) return;
    
    is_running_microtasks_ = true;
    microtask_nesting_level_++;
    
    // 循环执行，直到队列为空
    while (!pending_microtasks_.empty()) {
      Microtask task = pending_microtasks_.front();
      pending_microtasks_.erase(pending_microtasks_.begin());
      
      // 执行微任务（可能会添加新的微任务）
      task.Run();
    }
    
    microtask_nesting_level_--;
    is_running_microtasks_ = false;
  }
};
```

**关键设计**：

1. **FIFO 队列**：微任务按先进先出顺序执行
2. **重入保护**：通过 `is_running_microtasks_` 标志防止嵌套调用
3. **循环清空**：`while` 循环确保新产生的微任务也会执行
4. **嵌套深度**：记录递归深度，用于调试和性能分析

### 微任务检查点（Microtask Checkpoint）

V8 在以下时机触发微任务检查点：

```cpp
// 伪代码：何时检查微任务
void RunScript(Script script) {
  script.Execute();
  
  // 脚本执行完毕，检查微任务
  microtask_queue->PerformMicrotaskCheckpoint();
}

void RunCallback(Callback callback) {
  callback.Execute();
  
  // 回调执行完毕，检查微任务
  microtask_queue->PerformMicrotaskCheckpoint();
}

void PerformMacrotask(Macrotask task) {
  task.Execute();
  
  // 宏任务执行完毕，检查微任务
  microtask_queue->PerformMicrotaskCheckpoint();
}
```

**检查点触发时机**：
- 脚本（`<script>` 标签）执行完成
- 每个宏任务（如 `setTimeout` 回调）执行完成
- 函数调用堆栈清空时
- 某些宿主环境操作后（如事件处理）

### Promise 如何入队微任务

当你调用 `Promise.then()` 时，V8 做了什么？

```cpp
// 简化的 Promise.then 实现（C++）
void Promise::Then(Callback onFulfilled) {
  if (this->state == PromiseState::kFulfilled) {
    // Promise 已经 resolved
    // 将回调作为微任务入队
    Microtask microtask = CreateMicrotask(onFulfilled, this->value);
    GetMicrotaskQueue()->EnqueueMicrotask(microtask);
  } else {
    // Promise 未 resolved
    // 将回调存储到 Promise 对象中，等待 resolve
    this->callbacks.push_back(onFulfilled);
  }
}

void Promise::Resolve(Value value) {
  this->state = PromiseState::kFulfilled;
  this->value = value;
  
  // 将所有 then 回调转换为微任务
  for (Callback callback : this->callbacks) {
    Microtask microtask = CreateMicrotask(callback, value);
    GetMicrotaskQueue()->EnqueueMicrotask(microtask);
  }
  
  this->callbacks.clear();
}
```

对应的 JavaScript 行为：

```javascript
const promise = new Promise(resolve => {
  console.log('1: Promise 构造函数同步执行');
  resolve('数据');
});

promise.then(data => {
  console.log('2: then 回调（微任务）');
});

console.log('3: 同步代码');

// 输出：
// 1: Promise 构造函数同步执行
// 3: 同步代码
// 2: then 回调（微任务）
```

**为什么 Promise 构造函数是同步的？**

这是 ECMAScript 规范的设计。Promise 构造函数会立即执行传入的 executor 函数，只有 `then`、`catch`、`finally` 的回调才会延迟到微任务执行。

## 经典面试题解析

掌握了事件循环的核心规则后，让我们挑战几道经典面试题。

### 面试题1：async/await 与 Promise

这是最常见的面试题之一，涉及 `async/await` 的执行顺序：

```javascript
async function async1() {
  console.log('async1 start');
  await async2();
  console.log('async1 end');
}

async function async2() {
  console.log('async2');
}

console.log('script start');

setTimeout(function() {
  console.log('setTimeout');
}, 0);

async1();

new Promise(function(resolve) {
  console.log('promise1');
  resolve();
}).then(function() {
  console.log('promise2');
});

console.log('script end');
```

**先自己推导，然后看答案**。

<details>
<summary>点击查看详细解析</summary>

**输出顺序**：
```
script start
async1 start
async2
promise1
script end
async1 end
promise2
setTimeout
```

**逐步推导**：

1. 同步代码：`console.log('script start')` → 输出 `script start`
2. `setTimeout` 回调进入**宏任务队列**
3. 调用 `async1()`：
   - 同步执行：输出 `async1 start`
   - 调用 `async2()`
   - 同步执行：输出 `async2`
   - **关键**：`await` 之后的代码相当于 `Promise.then()`，进入**微任务队列**
4. Promise 构造函数同步执行：输出 `promise1`
5. `Promise.then()` 回调进入**微任务队列**
6. 同步代码：输出 `script end`
7. 同步代码执行完毕，**清空微任务队列**：
   - 执行 `await` 之后的代码：输出 `async1 end`
   - 执行 `Promise.then()`：输出 `promise2`
8. 微任务清空，执行**宏任务**：
   - 执行 `setTimeout`：输出 `setTimeout`

**核心知识点**：
- `await` 之后的代码等价于 `Promise.then()` 回调
- `async` 函数内部的同步代码会立即执行
- `await` 会暂停 `async` 函数的执行，将后续代码加入微任务队列

</details>

### 面试题2：setTimeout 中的 Promise

这道题考察宏任务和微任务的交替执行：

```javascript
console.log('start');

setTimeout(() => {
  console.log('timer1');
  Promise.resolve().then(() => {
    console.log('promise1');
  });
}, 0);

setTimeout(() => {
  console.log('timer2');
  Promise.resolve().then(() => {
    console.log('promise2');
  });
}, 0);

Promise.resolve().then(() => {
  console.log('promise3');
});

console.log('end');
```

<details>
<summary>点击查看详细解析</summary>

**输出顺序**：
```
start
end
promise3
timer1
promise1
timer2
promise2
```

**逐步推导**：

**第一轮（执行脚本）**：
1. 同步代码：输出 `start`
2. `timer1` 进入宏任务队列：`[timer1]`
3. `timer2` 进入宏任务队列：`[timer1, timer2]`
4. `promise3` 进入微任务队列：`[promise3]`
5. 同步代码：输出 `end`
6. 清空微任务队列：输出 `promise3`

**第二轮（执行 timer1）**：
7. 取出 `timer1` 执行：输出 `timer1`
8. `promise1` 进入微任务队列：`[promise1]`
9. 清空微任务队列：输出 `promise1`

**第三轮（执行 timer2）**：
10. 取出 `timer2` 执行：输出 `timer2`
11. `promise2` 进入微任务队列：`[promise2]`
12. 清空微任务队列：输出 `promise2`

**关键观察**：
- 每个 `setTimeout` 回调是独立的宏任务
- 每个宏任务执行后，都会立即清空微任务队列
- 微任务不会跨越宏任务边界

</details>

### 面试题3：多层嵌套

这道题考察对执行顺序的综合理解：

```javascript
Promise.resolve().then(() => {
  console.log('Promise 1');
  setTimeout(() => {
    console.log('setTimeout 2');
  }, 0);
});

setTimeout(() => {
  console.log('setTimeout 1');
  Promise.resolve().then(() => {
    console.log('Promise 2');
  });
}, 0);
```

<details>
<summary>点击查看详细解析</summary>

**输出顺序**：
```
Promise 1
setTimeout 1
Promise 2
setTimeout 2
```

**逐步推导**：

**第一轮（执行脚本）**：
1. 第一个 `Promise.then` 进入微任务队列
2. 第一个 `setTimeout` 进入宏任务队列
3. 清空微任务队列：
   - 执行：输出 `Promise 1`
   - 第二个 `setTimeout` 进入宏任务队列

此时宏任务队列：`[setTimeout1, setTimeout2]`

**第二轮（执行 setTimeout1）**：
4. 取出 `setTimeout1` 执行：输出 `setTimeout 1`
5. `Promise 2` 进入微任务队列
6. 清空微任务队列：输出 `Promise 2`

**第三轮（执行 setTimeout2）**：
7. 取出 `setTimeout2` 执行：输出 `setTimeout 2`

**关键点**：
- 微任务中添加的宏任务会排在现有宏任务之后
- 宏任务是严格按加入队列的顺序执行的

</details>

## 模拟事件循环

实现一个简化的事件循环：

```javascript
// 事件循环模拟器
class EventLoopSimulator {
  constructor() {
    this.macrotaskQueue = [];
    this.microtaskQueue = [];
    this.running = false;
    this.log = [];
  }
  
  // 添加宏任务
  addMacrotask(name, callback) {
    this.macrotaskQueue.push({ name, callback });
    this.logEvent(`宏任务入队: ${name}`);
  }
  
  // 添加微任务
  addMicrotask(name, callback) {
    this.microtaskQueue.push({ name, callback });
    this.logEvent(`微任务入队: ${name}`);
  }
  
  // 执行微任务检查点
  runMicrotasks() {
    while (this.microtaskQueue.length > 0) {
      const task = this.microtaskQueue.shift();
      this.logEvent(`执行微任务: ${task.name}`);
      task.callback();
    }
  }
  
  // 运行事件循环
  run() {
    this.running = true;
    
    while (this.macrotaskQueue.length > 0 || this.microtaskQueue.length > 0) {
      // 先清空微任务队列
      this.runMicrotasks();
      
      // 执行一个宏任务
      if (this.macrotaskQueue.length > 0) {
        const task = this.macrotaskQueue.shift();
        this.logEvent(`执行宏任务: ${task.name}`);
        task.callback();
        
        // 宏任务后检查微任务
        this.runMicrotasks();
      }
    }
    
    this.running = false;
    this.logEvent('事件循环结束');
  }
  
  logEvent(message) {
    this.log.push(message);
    console.log(`  [事件循环] ${message}`);
  }
  
  // 演示
  static demonstrate() {
    console.log('=== 事件循环模拟 ===\n');
    
    const eventLoop = new EventLoopSimulator();
    
    // 模拟代码执行
    console.log('模拟代码：');
    console.log('  setTimeout(() => log("timeout"), 0)');
    console.log('  Promise.resolve().then(() => log("promise"))');
    console.log('  log("sync")\n');
    
    console.log('执行过程：');
    
    // 添加任务
    eventLoop.addMacrotask('setTimeout', () => {
      console.log('    输出: timeout');
    });
    
    eventLoop.addMicrotask('Promise.then', () => {
      console.log('    输出: promise');
    });
    
    // 同步代码
    console.log('    输出: sync');
    
    // 运行事件循环
    eventLoop.run();
    console.log('');
  }
}

EventLoopSimulator.demonstrate();
```

## 浏览器与Node.js的差异

不同环境的事件循环差异：

```javascript
// 环境差异
class EnvironmentDifferences {
  static demonstrateBrowser() {
    console.log('=== 浏览器事件循环 ===\n');
    
    console.log('特点：');
    console.log('  • 有渲染步骤');
    console.log('  • requestAnimationFrame在渲染前执行');
    console.log('  • 有UI事件处理');
    console.log('  • MutationObserver是微任务\n');
    
    console.log('一轮完整循环：');
    console.log('  1. 执行一个宏任务');
    console.log('  2. 清空微任务队列');
    console.log('  3. 判断是否需要渲染');
    console.log('  4. 执行requestAnimationFrame');
    console.log('  5. 渲染');
    console.log('  6. 判断是否空闲');
    console.log('  7. 执行requestIdleCallback\n');
  }
  
  static demonstrateNodejs() {
    console.log('=== Node.js事件循环 ===\n');
    
    console.log('Node.js有多个阶段：');
    console.log('');
    console.log('  ┌───────────────────────────┐');
    console.log('  │         timers            │  setTimeout/setInterval');
    console.log('  └───────────────────────────┘');
    console.log('                ↓');
    console.log('  ┌───────────────────────────┐');
    console.log('  │     pending callbacks     │  系统回调');
    console.log('  └───────────────────────────┘');
    console.log('                ↓');
    console.log('  ┌───────────────────────────┐');
    console.log('  │       idle, prepare       │  内部使用');
    console.log('  └───────────────────────────┘');
    console.log('                ↓');
    console.log('  ┌───────────────────────────┐');
    console.log('  │           poll            │  I/O回调');
    console.log('  └───────────────────────────┘');
    console.log('                ↓');
    console.log('  ┌───────────────────────────┐');
    console.log('  │          check            │  setImmediate');
    console.log('  └───────────────────────────┘');
    console.log('                ↓');
    console.log('  ┌───────────────────────────┐');
    console.log('  │      close callbacks      │  close事件');
    console.log('  └───────────────────────────┘');
    console.log('');
  }
  
  static demonstrateProcessNextTick() {
    console.log('=== process.nextTick ===\n');
    
    console.log('特点：');
    console.log('  • 不属于事件循环的任何阶段');
    console.log('  • 在当前阶段结束后立即执行');
    console.log('  • 优先级高于Promise.then');
    console.log('  • 可能导致I/O饥饿\n');
    
    console.log('示例：');
    console.log(`
    // Node.js环境
    setTimeout(() => console.log('timeout'), 0);
    setImmediate(() => console.log('immediate'));
    
    process.nextTick(() => console.log('nextTick'));
    Promise.resolve().then(() => console.log('promise'));
    
    // 输出顺序：nextTick → promise → timeout/immediate
    `);
  }
  
  static runAll() {
    this.demonstrateBrowser();
    this.demonstrateNodejs();
    this.demonstrateProcessNextTick();
  }
}

EnvironmentDifferences.runAll();
```

## 性能优化建议

利用事件循环优化性能：

```javascript
// 性能优化
class PerformanceOptimization {
  static demonstrateChunkProcessing() {
    console.log('=== 分片处理大数据 ===\n');
    
    console.log('问题：大数组处理阻塞主线程');
    console.log(`
    // 阻塞式处理
    const bigArray = new Array(1000000);
    bigArray.forEach(item => process(item));
    // 期间页面无响应
    `);
    
    console.log('解决方案：分片处理');
    console.log(`
    function processInChunks(array, chunkSize = 1000) {
      let index = 0;
      
      function processChunk() {
        const end = Math.min(index + chunkSize, array.length);
        
        while (index < end) {
          process(array[index]);
          index++;
        }
        
        if (index < array.length) {
          // 使用setTimeout让出主线程
          setTimeout(processChunk, 0);
        }
      }
      
      processChunk();
    }
    `);
  }
  
  static demonstrateMicrotaskBatching() {
    console.log('=== 微任务批量更新 ===\n');
    
    console.log('Vue的响应式更新机制：');
    console.log(`
    let pending = false;
    const queue = [];
    
    function queueJob(job) {
      if (!queue.includes(job)) {
        queue.push(job);
      }
      
      if (!pending) {
        pending = true;
        // 使用微任务批量处理
        Promise.resolve().then(flushJobs);
      }
    }
    
    function flushJobs() {
      for (const job of queue) {
        job();
      }
      queue.length = 0;
      pending = false;
    }
    `);
    
    console.log('好处：');
    console.log('  • 多次状态修改只触发一次更新');
    console.log('  • 微任务在渲染前执行');
    console.log('  • 避免不必要的DOM操作\n');
  }
  
  static demonstrateRAF() {
    console.log('=== requestAnimationFrame ===\n');
    
    console.log('适用场景：');
    console.log('  • 动画更新');
    console.log('  • DOM测量和修改');
    console.log('  • 与渲染同步的操作\n');
    
    console.log('示例：');
    console.log(`
    function animate() {
      // 更新动画状态
      element.style.left = newPosition + 'px';
      
      // 下一帧继续
      requestAnimationFrame(animate);
    }
    
    requestAnimationFrame(animate);
    `);
    
    console.log('优势：');
    console.log('  • 自动与屏幕刷新率同步');
    console.log('  • 页面不可见时暂停');
    console.log('  • 避免掉帧和重复绘制\n');
  }
  
  static runAll() {
    this.demonstrateChunkProcessing();
    this.demonstrateMicrotaskBatching();
    this.demonstrateRAF();
  }
}

PerformanceOptimization.runAll();
```

## 本章小结

本章深入探讨了JavaScript事件循环的工作原理。核心要点包括：

1. **事件循环模型**：调用栈、微任务队列、宏任务队列三者协作，实现异步编程。

2. **宏任务**：setTimeout、setInterval、I/O等，每轮循环执行一个。

3. **微任务**：Promise.then、queueMicrotask等，每个宏任务后清空整个队列。

4. **优先级**：同步代码 > 微任务 > 宏任务。微任务中产生的微任务在当轮全部执行。

5. **V8实现**：每个Context有独立的微任务队列，在检查点时清空。

6. **环境差异**：浏览器有渲染步骤和requestAnimationFrame，Node.js有多个阶段和process.nextTick。

7. **性能优化**：利用微任务批量更新，使用分片处理大数据，合理使用requestAnimationFrame。

理解事件循环是掌握JavaScript异步编程的基础。在下一章中，我们将深入探讨Promise的内部机制，了解它如何与事件循环协作。
