# 事件循环的底层实现：宏任务与微任务

JavaScript是单线程语言，但它能处理异步操作。这种能力来自事件循环（Event Loop）机制。事件循环协调同步代码、异步回调、Promise和定时器的执行顺序，是JavaScript运行时的核心调度器。

理解事件循环，你就能预测代码的执行顺序，解释那些看似"违反直觉"的异步行为，写出更高效的异步代码。

## 为什么需要事件循环

JavaScript的单线程设计需要一种机制来处理异步：

```javascript
// 事件循环的必要性
class WhyEventLoop {
  static demonstrateProblem() {
    console.log('=== 单线程的挑战 ===\n');
    
    console.log('JavaScript是单线程的：');
    console.log('  • 同一时间只能执行一段代码');
    console.log('  • 长时间操作会阻塞后续代码');
    console.log('  • 用户界面会失去响应\n');
    
    console.log('如果没有异步机制：');
    console.log(`
    // 这段代码会阻塞5秒
    const data = fetchSync('/api/data');  // 等待网络响应
    console.log(data);  // 5秒后才执行
    // 期间页面完全无响应
    `);
  }
  
  static demonstrateSolution() {
    console.log('=== 异步解决方案 ===\n');
    
    console.log('事件循环的作用：');
    console.log('  • 允许发起异步操作后继续执行');
    console.log('  • 在适当时机执行回调');
    console.log('  • 保持主线程响应\n');
    
    console.log('异步代码示例：');
    console.log(`
    // 发起请求后立即继续
    fetch('/api/data')
      .then(data => console.log(data));  // 稍后执行
    
    console.log('继续执行');  // 立即执行
    `);
  }
  
  static runAll() {
    this.demonstrateProblem();
    this.demonstrateSolution();
  }
}

WhyEventLoop.runAll();
```

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

## 微任务优先级

微任务总是优先于下一个宏任务：

```javascript
// 微任务优先级
class MicrotaskPriority {
  static demonstrateNested() {
    console.log('=== 嵌套微任务 ===\n');
    
    console.log('代码：');
    console.log(`
    setTimeout(() => console.log('timeout 1'), 0);
    
    Promise.resolve().then(() => {
      console.log('promise 1');
      Promise.resolve().then(() => {
        console.log('promise 2');
      });
    });
    
    setTimeout(() => console.log('timeout 2'), 0);
    `);
    
    console.log('执行分析：');
    console.log('  1. timeout 1 进入宏任务队列');
    console.log('  2. promise 1 的回调进入微任务队列');
    console.log('  3. timeout 2 进入宏任务队列');
    console.log('  4. 执行微任务 promise 1');
    console.log('  5. promise 2 进入微任务队列');
    console.log('  6. 继续执行微任务 promise 2');
    console.log('  7. 微任务清空，执行宏任务 timeout 1');
    console.log('  8. 执行宏任务 timeout 2');
    console.log('');
    console.log('  输出：promise 1 → promise 2 → timeout 1 → timeout 2\n');
  }
  
  static demonstrateMicrotaskFlood() {
    console.log('=== 微任务洪泛问题 ===\n');
    
    console.log('危险代码：');
    console.log(`
    function recursiveMicrotask() {
      Promise.resolve().then(() => {
        console.log('microtask');
        recursiveMicrotask();  // 无限添加微任务
      });
    }
    
    recursiveMicrotask();
    setTimeout(() => console.log('timeout'), 0);
    // timeout永远不会执行！
    `);
    
    console.log('问题：');
    console.log('  • 微任务不断产生新微任务');
    console.log('  • 微任务队列永远清空不了');
    console.log('  • 宏任务永远得不到执行');
    console.log('  • 页面失去响应\n');
    
    console.log('解决方案：');
    console.log('  • 使用setTimeout分散任务');
    console.log('  • 使用requestAnimationFrame');
    console.log('  • 限制微任务递归深度\n');
  }
  
  static runAll() {
    this.demonstrateNested();
    this.demonstrateMicrotaskFlood();
  }
}

MicrotaskPriority.runAll();
```

## V8中的微任务实现

V8如何管理微任务：

```javascript
// V8微任务实现
class V8MicrotaskImplementation {
  static demonstrate() {
    console.log('=== V8微任务队列 ===\n');
    
    console.log('V8的微任务队列结构：');
    console.log(`
    class MicrotaskQueue {
      // 微任务存储
      pending_microtasks: Microtask[];
      
      // 当前正在运行微任务
      is_running_microtasks: boolean;
      
      // 添加微任务
      EnqueueMicrotask(microtask);
      
      // 运行所有微任务
      PerformMicrotaskCheckpoint();
    }
    `);
    
    console.log('关键点：');
    console.log('  • 每个Context有自己的微任务队列');
    console.log('  • 微任务按FIFO顺序执行');
    console.log('  • 检查点时清空整个队列\n');
  }
  
  static demonstrateCheckpoint() {
    console.log('=== 微任务检查点 ===\n');
    
    console.log('检查点触发时机：');
    console.log('  • 脚本执行完成');
    console.log('  • 回调执行完成');
    console.log('  • 某些宿主操作后\n');
    
    console.log('检查点执行逻辑（伪代码）：');
    console.log(`
    function PerformMicrotaskCheckpoint() {
      if (is_running_microtasks) return;
      
      is_running_microtasks = true;
      
      while (pending_microtasks.length > 0) {
        const microtask = pending_microtasks.shift();
        RunMicrotask(microtask);
        // 新产生的微任务会添加到pending_microtasks
      }
      
      is_running_microtasks = false;
    }
    `);
  }
  
  static runAll() {
    this.demonstrate();
    this.demonstrateCheckpoint();
  }
}

V8MicrotaskImplementation.runAll();
```

## 经典面试题解析

常见的事件循环面试题：

```javascript
// 经典面试题
class ClassicInterviewQuestions {
  static question1() {
    console.log('=== 面试题1 ===\n');
    
    console.log('代码：');
    console.log(`
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
    `);
    
    console.log('\n执行分析：');
    console.log('  1. script start（同步）');
    console.log('  2. setTimeout回调入宏任务队列');
    console.log('  3. 调用async1');
    console.log('  4. async1 start（同步）');
    console.log('  5. 调用async2');
    console.log('  6. async2（同步）');
    console.log('  7. await后面的代码入微任务队列');
    console.log('  8. promise1（Promise构造函数同步执行）');
    console.log('  9. then回调入微任务队列');
    console.log('  10. script end（同步）');
    console.log('  11. 执行微任务：async1 end');
    console.log('  12. 执行微任务：promise2');
    console.log('  13. 执行宏任务：setTimeout\n');
    
    console.log('输出顺序：');
    console.log('  script start');
    console.log('  async1 start');
    console.log('  async2');
    console.log('  promise1');
    console.log('  script end');
    console.log('  async1 end');
    console.log('  promise2');
    console.log('  setTimeout\n');
  }
  
  static question2() {
    console.log('=== 面试题2 ===\n');
    
    console.log('代码：');
    console.log(`
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
    `);
    
    console.log('\n执行分析：');
    console.log('  1. start（同步）');
    console.log('  2. timer1回调入宏任务队列');
    console.log('  3. timer2回调入宏任务队列');
    console.log('  4. promise3回调入微任务队列');
    console.log('  5. end（同步）');
    console.log('  6. 执行微任务：promise3');
    console.log('  7. 执行宏任务timer1');
    console.log('  8. timer1（同步）');
    console.log('  9. promise1入微任务队列');
    console.log('  10. 执行微任务：promise1');
    console.log('  11. 执行宏任务timer2');
    console.log('  12. timer2（同步）');
    console.log('  13. promise2入微任务队列');
    console.log('  14. 执行微任务：promise2\n');
    
    console.log('输出顺序：');
    console.log('  start → end → promise3 →');
    console.log('  timer1 → promise1 →');
    console.log('  timer2 → promise2\n');
  }
  
  static runAll() {
    this.question1();
    this.question2();
  }
}

ClassicInterviewQuestions.runAll();
```

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
