# Promise 的内部机制：PromiseJobs 与微任务队列

Promise是JavaScript异步编程的核心，它与事件循环紧密协作。当你调用`then()`方法时，回调函数不会立即执行，而是被放入微任务队列。V8如何实现这一机制？Promise内部的状态转换是怎样的？本章将揭示Promise的底层实现。

## Promise的状态模型

Promise有三种状态：

```javascript
// Promise状态
class PromiseStates {
  static demonstrate() {
    console.log('=== Promise的三种状态 ===\n');
    
    console.log('状态定义：');
    console.log('  • pending   - 初始状态，等待中');
    console.log('  • fulfilled - 已成功，有结果值');
    console.log('  • rejected  - 已失败，有失败原因\n');
    
    console.log('状态转换规则：');
    console.log('');
    console.log('        ┌─────────────────┐');
    console.log('        │     pending     │');
    console.log('        └────────┬────────┘');
    console.log('                 │');
    console.log('        ┌────────┴────────┐');
    console.log('        ↓                 ↓');
    console.log('  ┌───────────┐    ┌───────────┐');
    console.log('  │ fulfilled │    │ rejected  │');
    console.log('  └───────────┘    └───────────┘');
    console.log('');
    console.log('关键规则：');
    console.log('  • 状态只能从pending转换');
    console.log('  • 转换后状态不可再变');
    console.log('  • 结果值或原因不可修改\n');
  }
  
  static demonstrateExample() {
    console.log('=== 状态转换示例 ===\n');
    
    // 创建Promise
    const promise = new Promise((resolve, reject) => {
      console.log('1. Promise创建，状态：pending');
      
      setTimeout(() => {
        resolve('成功');
        console.log('2. 调用resolve，状态：fulfilled');
        
        // 再次调用无效
        reject('失败');
        console.log('3. 调用reject无效，状态仍是fulfilled');
      }, 100);
    });
    
    return promise;
  }
  
  static async runAll() {
    this.demonstrate();
    await this.demonstrateExample();
  }
}

PromiseStates.runAll();
```

## V8中的Promise对象结构

V8如何存储Promise：

```javascript
// V8 Promise内部结构
class V8PromiseStructure {
  static demonstrate() {
    console.log('=== V8 Promise内部结构 ===\n');
    
    console.log('JSPromise对象布局：');
    console.log(`
    class JSPromise {
      // 继承自JSObject
      Map* map;           // 隐藏类
      
      // Promise特有字段
      reactions_or_result;  // 状态相关数据
      flags;                // 状态标志位
    }
    `);
    
    console.log('flags字段位布局：');
    console.log('  ┌─────────────────────────────────┐');
    console.log('  │ bit 0-1 │ status (状态)          │');
    console.log('  │ bit 2   │ has_handler (有处理器) │');
    console.log('  │ bit 3   │ handled_hint          │');
    console.log('  │ bit 4   │ async_task_id         │');
    console.log('  └─────────────────────────────────┘\n');
    
    console.log('status值含义：');
    console.log('  0 = pending');
    console.log('  1 = fulfilled');
    console.log('  2 = rejected\n');
  }
  
  static demonstrateReactionsOrResult() {
    console.log('=== reactions_or_result字段 ===\n');
    
    console.log('该字段根据状态存储不同内容：');
    console.log('');
    console.log('  pending状态：');
    console.log('    存储PromiseReaction链表');
    console.log('    （等待状态变化时执行的回调）');
    console.log('');
    console.log('  fulfilled状态：');
    console.log('    存储fulfillment值');
    console.log('    （resolve传入的值）');
    console.log('');
    console.log('  rejected状态：');
    console.log('    存储rejection原因');
    console.log('    （reject传入的值）\n');
  }
  
  static runAll() {
    this.demonstrate();
    this.demonstrateReactionsOrResult();
  }
}

V8PromiseStructure.runAll();
```

## PromiseReaction：回调的存储结构

当调用then()时，V8创建PromiseReaction：

```javascript
// PromiseReaction结构
class PromiseReactionStructure {
  static demonstrate() {
    console.log('=== PromiseReaction结构 ===\n');
    
    console.log('每个then()调用创建一个PromiseReaction：');
    console.log(`
    class PromiseReaction {
      next;              // 下一个Reaction（链表）
      promise_or_capability;  // 返回的新Promise
      fulfill_handler;   // onFulfilled回调
      reject_handler;    // onRejected回调
    }
    `);
    
    console.log('示例代码：');
    console.log(`
    const p = new Promise(resolve => resolve(1));
    
    p.then(onFulfilled1, onRejected1);
    p.then(onFulfilled2, onRejected2);
    `);
    
    console.log('内部结构：');
    console.log('');
    console.log('  JSPromise p');
    console.log('    │');
    console.log('    └─ reactions_or_result');
    console.log('         │');
    console.log('         ↓');
    console.log('    ┌────────────────────┐');
    console.log('    │ PromiseReaction #1 │');
    console.log('    │ fulfill: handler1  │');
    console.log('    │ reject:  handler1  │');
    console.log('    └─────────┬──────────┘');
    console.log('              │ next');
    console.log('              ↓');
    console.log('    ┌────────────────────┐');
    console.log('    │ PromiseReaction #2 │');
    console.log('    │ fulfill: handler2  │');
    console.log('    │ reject:  handler2  │');
    console.log('    └────────────────────┘');
    console.log('');
  }
  
  static runAll() {
    this.demonstrate();
  }
}

PromiseReactionStructure.runAll();
```

## resolve和reject的实现

状态转换的内部流程：

```javascript
// resolve/reject实现
class ResolveRejectImplementation {
  static demonstrateResolve() {
    console.log('=== resolve实现流程 ===\n');
    
    console.log('FulfillPromise伪代码：');
    console.log(`
    function FulfillPromise(promise, value) {
      // 1. 检查状态
      if (promise.status !== PENDING) return;
      
      // 2. 获取reactions链表
      const reactions = promise.reactions_or_result;
      
      // 3. 设置结果值
      promise.reactions_or_result = value;
      
      // 4. 更新状态
      promise.status = FULFILLED;
      
      // 5. 触发所有reaction
      TriggerPromiseReactions(reactions, value, FULFILL);
    }
    `);
  }
  
  static demonstrateTrigger() {
    console.log('=== TriggerPromiseReactions ===\n');
    
    console.log('触发reactions的流程：');
    console.log(`
    function TriggerPromiseReactions(reactions, value, type) {
      // 遍历reaction链表
      while (reactions !== null) {
        const reaction = reactions;
        reactions = reaction.next;
        
        // 创建PromiseReactionJob
        const job = new PromiseReactionJob(reaction, value, type);
        
        // 加入微任务队列
        EnqueueMicrotask(job);
      }
    }
    `);
    
    console.log('关键点：');
    console.log('  • reactions不是直接执行');
    console.log('  • 而是包装成PromiseReactionJob');
    console.log('  • 放入微任务队列等待执行\n');
  }
  
  static runAll() {
    this.demonstrateResolve();
    this.demonstrateTrigger();
  }
}

ResolveRejectImplementation.runAll();
```

## PromiseReactionJob：微任务的核心

每个Promise回调都是一个PromiseReactionJob：

```javascript
// PromiseReactionJob
class PromiseReactionJobDetail {
  static demonstrate() {
    console.log('=== PromiseReactionJob执行流程 ===\n');
    
    console.log('Job执行伪代码：');
    console.log(`
    function PromiseReactionJob(reaction, value, type) {
      // 获取处理器
      const handler = type === FULFILL
        ? reaction.fulfill_handler
        : reaction.reject_handler;
      
      // 获取返回的Promise
      const promiseCapability = reaction.promise_or_capability;
      
      try {
        // 执行回调
        let result;
        if (handler === undefined) {
          // 没有处理器，直接传递值
          result = value;
        } else {
          // 调用处理器
          result = handler(value);
        }
        
        // 解析返回的Promise
        Resolve(promiseCapability.promise, result);
        
      } catch (error) {
        // 处理器抛出异常
        Reject(promiseCapability.promise, error);
      }
    }
    `);
  }
  
  static demonstrateChaining() {
    console.log('=== Promise链式调用原理 ===\n');
    
    console.log('代码：');
    console.log(`
    Promise.resolve(1)
      .then(x => x + 1)
      .then(x => x * 2)
      .then(console.log);  // 输出 4
    `);
    
    console.log('执行过程：');
    console.log('');
    console.log('  1. Promise.resolve(1) 创建 p1 (fulfilled, 值=1)');
    console.log('');
    console.log('  2. p1.then(x => x + 1) 创建 p2 (pending)');
    console.log('     PromiseReactionJob入队：{handler: x=>x+1, promise: p2}');
    console.log('');
    console.log('  3. p2.then(x => x * 2) 创建 p3 (pending)');
    console.log('     p3等待p2');
    console.log('');
    console.log('  4. p3.then(console.log) 创建 p4 (pending)');
    console.log('     p4等待p3');
    console.log('');
    console.log('  5. 微任务执行：');
    console.log('     - Job1执行: 1+1=2, resolve(p2, 2)');
    console.log('     - Job2入队: {handler: x=>x*2, promise: p3}');
    console.log('     - Job2执行: 2*2=4, resolve(p3, 4)');
    console.log('     - Job3入队: {handler: console.log, promise: p4}');
    console.log('     - Job3执行: console.log(4)');
    console.log('');
  }
  
  static runAll() {
    this.demonstrate();
    this.demonstrateChaining();
  }
}

PromiseReactionJobDetail.runAll();
```

## then的完整实现

then方法的内部逻辑：

```javascript
// then方法实现
class ThenImplementation {
  static demonstrate() {
    console.log('=== Promise.prototype.then实现 ===\n');
    
    console.log('伪代码：');
    console.log(`
    Promise.prototype.then = function(onFulfilled, onRejected) {
      // 1. 创建新的Promise（用于返回）
      const resultCapability = NewPromiseCapability();
      
      // 2. 创建PromiseReaction
      const reaction = {
        promise_or_capability: resultCapability,
        fulfill_handler: onFulfilled,
        reject_handler: onRejected,
        next: null
      };
      
      // 3. 根据当前状态处理
      if (this.status === PENDING) {
        // pending: 添加到reactions链表
        AppendReaction(this, reaction);
        
      } else if (this.status === FULFILLED) {
        // fulfilled: 直接创建Job入队
        const job = new PromiseReactionJob(
          reaction,
          this.reactions_or_result,  // 结果值
          FULFILL
        );
        EnqueueMicrotask(job);
        
      } else {
        // rejected: 直接创建Job入队
        const job = new PromiseReactionJob(
          reaction,
          this.reactions_or_result,  // 失败原因
          REJECT
        );
        EnqueueMicrotask(job);
      }
      
      // 4. 返回新Promise
      return resultCapability.promise;
    };
    `);
  }
  
  static demonstrateCapability() {
    console.log('=== PromiseCapability ===\n');
    
    console.log('PromiseCapability结构：');
    console.log(`
    class PromiseCapability {
      promise;   // 新创建的Promise
      resolve;   // 控制该Promise的resolve函数
      reject;    // 控制该Promise的reject函数
    }
    `);
    
    console.log('作用：');
    console.log('  • 保存对新Promise的控制权');
    console.log('  • 允许在handler执行后决议新Promise');
    console.log('  • 实现链式调用的关键\n');
  }
  
  static runAll() {
    this.demonstrate();
    this.demonstrateCapability();
  }
}

ThenImplementation.runAll();
```

## 模拟Promise实现

通过代码理解Promise核心机制：

```javascript
// 简化版Promise实现
class SimplePromise {
  static PENDING = 'pending';
  static FULFILLED = 'fulfilled';
  static REJECTED = 'rejected';
  
  constructor(executor) {
    this.status = SimplePromise.PENDING;
    this.value = undefined;
    this.reactions = [];
    
    const resolve = (value) => {
      if (this.status !== SimplePromise.PENDING) return;
      
      this.status = SimplePromise.FULFILLED;
      this.value = value;
      
      // 触发所有reaction
      this.reactions.forEach(reaction => {
        queueMicrotask(() => {
          this._executeReaction(reaction, 'fulfill');
        });
      });
    };
    
    const reject = (reason) => {
      if (this.status !== SimplePromise.PENDING) return;
      
      this.status = SimplePromise.REJECTED;
      this.value = reason;
      
      this.reactions.forEach(reaction => {
        queueMicrotask(() => {
          this._executeReaction(reaction, 'reject');
        });
      });
    };
    
    try {
      executor(resolve, reject);
    } catch (error) {
      reject(error);
    }
  }
  
  then(onFulfilled, onRejected) {
    return new SimplePromise((resolve, reject) => {
      const reaction = {
        onFulfilled,
        onRejected,
        resolve,
        reject
      };
      
      if (this.status === SimplePromise.PENDING) {
        this.reactions.push(reaction);
      } else {
        queueMicrotask(() => {
          this._executeReaction(
            reaction,
            this.status === SimplePromise.FULFILLED ? 'fulfill' : 'reject'
          );
        });
      }
    });
  }
  
  _executeReaction(reaction, type) {
    const handler = type === 'fulfill'
      ? reaction.onFulfilled
      : reaction.onRejected;
    
    try {
      if (typeof handler === 'function') {
        const result = handler(this.value);
        reaction.resolve(result);
      } else {
        // 没有处理器，透传
        if (type === 'fulfill') {
          reaction.resolve(this.value);
        } else {
          reaction.reject(this.value);
        }
      }
    } catch (error) {
      reaction.reject(error);
    }
  }
  
  catch(onRejected) {
    return this.then(undefined, onRejected);
  }
  
  static resolve(value) {
    return new SimplePromise(resolve => resolve(value));
  }
  
  static reject(reason) {
    return new SimplePromise((_, reject) => reject(reason));
  }
}

// 测试
console.log('=== SimplePromise测试 ===\n');

SimplePromise.resolve(1)
  .then(x => {
    console.log('第一个then:', x);
    return x + 1;
  })
  .then(x => {
    console.log('第二个then:', x);
    return x * 2;
  })
  .then(x => {
    console.log('第三个then:', x);
  });

console.log('同步代码结束\n');
```

## Promise.all和Promise.race

聚合方法的实现原理：

```javascript
// Promise.all实现
class PromiseAggregation {
  static demonstrateAll() {
    console.log('=== Promise.all实现原理 ===\n');
    
    console.log('伪代码：');
    console.log(`
    Promise.all = function(promises) {
      return new Promise((resolve, reject) => {
        const results = [];
        let remaining = promises.length;
        
        if (remaining === 0) {
          resolve(results);
          return;
        }
        
        promises.forEach((promise, index) => {
          Promise.resolve(promise).then(
            value => {
              results[index] = value;
              remaining--;
              
              if (remaining === 0) {
                resolve(results);
              }
            },
            reason => {
              // 任一拒绝，整体拒绝
              reject(reason);
            }
          );
        });
      });
    };
    `);
    
    console.log('关键点：');
    console.log('  • 结果数组保持原始顺序');
    console.log('  • 使用计数器跟踪完成数');
    console.log('  • 任一拒绝立即结束\n');
  }
  
  static demonstrateRace() {
    console.log('=== Promise.race实现原理 ===\n');
    
    console.log('伪代码：');
    console.log(`
    Promise.race = function(promises) {
      return new Promise((resolve, reject) => {
        promises.forEach(promise => {
          Promise.resolve(promise).then(resolve, reject);
        });
      });
    };
    `);
    
    console.log('关键点：');
    console.log('  • 第一个完成的决定结果');
    console.log('  • 后续完成的被忽略');
    console.log('  • 状态只能转换一次\n');
  }
  
  static runAll() {
    this.demonstrateAll();
    this.demonstrateRace();
  }
}

PromiseAggregation.runAll();
```

## 微任务队列与Promise的协作

Promise如何与微任务队列配合：

```javascript
// 微任务队列协作
class MicrotaskCooperation {
  static demonstrate() {
    console.log('=== Promise与微任务队列 ===\n');
    
    console.log('代码示例：');
    console.log(`
    console.log('1');
    
    Promise.resolve()
      .then(() => {
        console.log('2');
        return Promise.resolve();
      })
      .then(() => {
        console.log('3');
      });
    
    Promise.resolve().then(() => {
      console.log('4');
    });
    
    console.log('5');
    `);
    
    console.log('执行分析：');
    console.log('');
    console.log('  同步执行：');
    console.log('    输出 1');
    console.log('    Job A入队（输出2的那个）');
    console.log('    Job B入队（输出4的那个）');
    console.log('    输出 5');
    console.log('');
    console.log('  微任务执行：');
    console.log('    Job A: 输出 2，return Promise.resolve()');
    console.log('           这里产生额外的微任务！');
    console.log('    Job B: 输出 4');
    console.log('    Job C: Promise.resolve()的内部处理');
    console.log('    Job D: 输出 3');
    console.log('');
    console.log('  最终输出：1 → 5 → 2 → 4 → 3');
    console.log('');
  }
  
  static demonstrateThenable() {
    console.log('=== then中返回Promise ===\n');
    
    console.log('返回Promise时的特殊处理：');
    console.log(`
    // 当handler返回一个Promise时
    .then(() => {
      return Promise.resolve(value);
    })
    
    // V8的处理步骤：
    // 1. handler执行完成
    // 2. 发现返回值是Promise
    // 3. 创建PromiseResolveThenableJob
    // 4. 该Job会等待返回的Promise
    // 5. 这会额外消耗1-2个微任务周期
    `);
    
    console.log('性能建议：');
    console.log('  • 避免不必要的Promise包装');
    console.log('  • 直接返回值比返回Promise快');
    console.log('  • async函数自动处理这个问题\n');
  }
  
  static runAll() {
    this.demonstrate();
    this.demonstrateThenable();
  }
}

MicrotaskCooperation.runAll();
```

## 性能优化

Promise使用的性能考量：

```javascript
// Promise性能优化
class PromisePerformance {
  static demonstrateAvoidUnnecessaryPromise() {
    console.log('=== 避免不必要的Promise ===\n');
    
    console.log('不推荐：');
    console.log(`
    // 冗余的Promise.resolve
    async function getData() {
      const data = await fetch('/api');
      return Promise.resolve(data);  // 不必要
    }
    `);
    
    console.log('推荐：');
    console.log(`
    async function getData() {
      const data = await fetch('/api');
      return data;  // async自动包装
    }
    `);
  }
  
  static demonstrateBatchPromises() {
    console.log('=== 批量Promise处理 ===\n');
    
    console.log('串行（慢）：');
    console.log(`
    // 每个请求等前一个完成
    for (const url of urls) {
      await fetch(url);  // 串行执行
    }
    `);
    
    console.log('并行（快）：');
    console.log(`
    // 所有请求同时发起
    await Promise.all(urls.map(url => fetch(url)));
    `);
    
    console.log('受控并发（最佳）：');
    console.log(`
    // 限制同时进行的请求数
    async function parallelLimit(tasks, limit) {
      const results = [];
      const executing = [];
      
      for (const task of tasks) {
        const p = Promise.resolve().then(() => task());
        results.push(p);
        
        if (tasks.length >= limit) {
          const e = p.then(() => {
            executing.splice(executing.indexOf(e), 1);
          });
          executing.push(e);
          
          if (executing.length >= limit) {
            await Promise.race(executing);
          }
        }
      }
      
      return Promise.all(results);
    }
    `);
  }
  
  static runAll() {
    this.demonstrateAvoidUnnecessaryPromise();
    this.demonstrateBatchPromises();
  }
}

PromisePerformance.runAll();
```

## 本章小结

本章深入探讨了Promise的内部实现机制。核心要点包括：

1. **状态模型**：Promise有pending、fulfilled、rejected三种状态，状态转换不可逆。

2. **内部结构**：V8的JSPromise对象包含flags（状态标志）和reactions_or_result（反应链表或结果值）。

3. **PromiseReaction**：每个then()调用创建一个PromiseReaction，存储回调函数和返回的Promise。

4. **PromiseReactionJob**：当Promise状态改变时，V8将每个reaction包装成Job放入微任务队列。

5. **then实现**：根据当前状态决定是添加到reactions链表还是直接入队微任务。

6. **链式调用**：每个then返回新Promise，handler的返回值决定新Promise的状态。

7. **性能考量**：避免不必要的Promise包装，合理使用并行和批量处理。

理解Promise的内部机制，能帮助你写出更高效的异步代码，也能更好地调试异步问题。下一章我们将探讨async/await的底层实现，了解它如何被转换为Promise和生成器。
