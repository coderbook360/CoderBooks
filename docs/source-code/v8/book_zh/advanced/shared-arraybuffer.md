# SharedArrayBuffer 与 Atomics：共享内存与原子操作

JavaScript传统上是单线程语言，但Web Workers的引入让多线程成为可能。`SharedArrayBuffer`和`Atomics`进一步提供了线程间共享内存和原子操作的能力，使JavaScript能够实现真正的并行计算。本章将探讨V8如何实现这些多线程特性，以及如何正确使用它们。

## 共享内存的基本概念

普通的`ArrayBuffer`在Worker间传递时会被转移（transfer）或复制，而`SharedArrayBuffer`可以被多个Worker同时访问：

```javascript
// 主线程
const sharedBuffer = new SharedArrayBuffer(1024);
const view = new Int32Array(sharedBuffer);
view[0] = 42;

// 创建Worker并传递共享内存
const worker = new Worker('worker.js');
worker.postMessage({ buffer: sharedBuffer });

// worker.js
self.onmessage = function(e) {
  const view = new Int32Array(e.data.buffer);
  console.log(view[0]);  // 42 - 同一块内存
  view[0] = 100;  // 修改会反映到主线程
};
```

SharedArrayBuffer的内存布局：

```
┌─────────────────────────────────────────────────────┐
│                 SharedArrayBuffer                    │
├─────────────────────────────────────────────────────┤
│  Backing Store (共享内存区域)                        │
│  ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┐ │
│  │  0  │  1  │  2  │  3  │ ... │     │     │     │ │
│  └─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘ │
├─────────────────────────────────────────────────────┤
│  引用计数 (多个Agent可以引用)                        │
└─────────────────────────────────────────────────────┘

主线程 Int32Array ──┐
                    ├──> 同一块内存
Worker Int32Array ──┘
```

## 数据竞争问题

当多个线程同时读写共享内存时，会产生数据竞争：

```javascript
// 主线程
const buffer = new SharedArrayBuffer(4);
const view = new Int32Array(buffer);
view[0] = 0;

// 两个Worker同时递增
// worker1.js 和 worker2.js
const view = new Int32Array(buffer);
for (let i = 0; i < 10000; i++) {
  view[0]++;  // 非原子操作！
}

// 预期结果：20000
// 实际结果：可能是任何值，因为view[0]++不是原子操作
// view[0]++ 实际上是：
// 1. 读取 view[0]
// 2. 加 1
// 3. 写回 view[0]
// 这三步可能被另一个线程打断
```

## Atomics原子操作

`Atomics`对象提供了原子操作，确保操作的完整性：

```javascript
const buffer = new SharedArrayBuffer(4);
const view = new Int32Array(buffer);

// 原子读写
Atomics.store(view, 0, 42);        // 原子写入
const value = Atomics.load(view, 0); // 原子读取

// 原子算术操作
Atomics.add(view, 0, 1);    // 原子加法，返回旧值
Atomics.sub(view, 0, 1);    // 原子减法
Atomics.and(view, 0, 0xFF); // 原子按位与
Atomics.or(view, 0, 0x01);  // 原子按位或
Atomics.xor(view, 0, 0x01); // 原子按位异或

// 原子比较交换
const oldValue = Atomics.compareExchange(
  view, 0,  // 数组和索引
  42,       // 期望的旧值
  100       // 如果旧值匹配，写入的新值
);
// 如果view[0]是42，则设为100并返回42
// 否则不修改，返回当前值

// 原子交换
const previous = Atomics.exchange(view, 0, 200);
// 设置为200，返回之前的值
```

## 使用Atomics实现同步原语

### 自旋锁

```javascript
// 简单的自旋锁实现
class SpinLock {
  constructor(sharedArray, index) {
    this.array = sharedArray;
    this.index = index;
  }
  
  lock() {
    // 尝试将0改为1（获取锁）
    while (Atomics.compareExchange(this.array, this.index, 0, 1) !== 0) {
      // 锁被占用，自旋等待
    }
  }
  
  unlock() {
    Atomics.store(this.array, this.index, 0);
  }
}

// 使用
const buffer = new SharedArrayBuffer(8);
const lockArray = new Int32Array(buffer);
const lock = new SpinLock(lockArray, 0);

// 临界区操作
lock.lock();
try {
  // 安全地访问共享资源
  sharedData++;
} finally {
  lock.unlock();
}
```

### 互斥锁（使用wait/notify）

```javascript
// 更高效的互斥锁，避免忙等待
class Mutex {
  constructor(sharedArray, index) {
    this.array = sharedArray;
    this.index = index;
  }
  
  lock() {
    while (true) {
      // 尝试获取锁
      if (Atomics.compareExchange(this.array, this.index, 0, 1) === 0) {
        return;  // 成功获取
      }
      
      // 等待锁释放
      Atomics.wait(this.array, this.index, 1);
    }
  }
  
  unlock() {
    Atomics.store(this.array, this.index, 0);
    // 唤醒一个等待的线程
    Atomics.notify(this.array, this.index, 1);
  }
}

// 主线程无法使用Atomics.wait，需要使用waitAsync
async function mainThreadLock(mutex) {
  while (true) {
    if (Atomics.compareExchange(mutex.array, mutex.index, 0, 1) === 0) {
      return;
    }
    
    // 主线程使用异步等待
    const result = await Atomics.waitAsync(mutex.array, mutex.index, 1);
    if (result.async) {
      await result.value;
    }
  }
}
```

### 信号量

```javascript
// 信号量实现
class Semaphore {
  constructor(sharedArray, index, initialValue) {
    this.array = sharedArray;
    this.index = index;
    Atomics.store(this.array, this.index, initialValue);
  }
  
  async acquire() {
    while (true) {
      const current = Atomics.load(this.array, this.index);
      
      if (current > 0) {
        // 尝试减少计数
        if (Atomics.compareExchange(this.array, this.index, current, current - 1) === current) {
          return;  // 成功获取
        }
        // CAS失败，重试
        continue;
      }
      
      // 计数为0，等待
      const result = Atomics.waitAsync(this.array, this.index, 0);
      if (result.async) {
        await result.value;
      }
    }
  }
  
  release() {
    Atomics.add(this.array, this.index, 1);
    Atomics.notify(this.array, this.index, 1);
  }
}

// 使用：限制并发数
const buffer = new SharedArrayBuffer(4);
const semArray = new Int32Array(buffer);
const sem = new Semaphore(semArray, 0, 3);  // 最多3个并发
```

## V8中的原子操作实现

V8将Atomics操作映射到CPU的原子指令：

```javascript
// V8内部的原子操作实现（概念性）
class V8Atomics {
  // Atomics.add 对应 CPU的 lock xadd 指令
  static add(typedArray, index, value) {
    // 1. 计算内存地址
    const address = typedArray.buffer + index * typedArray.BYTES_PER_ELEMENT;
    
    // 2. 执行原子加法
    // x86: lock xadd [address], value
    // ARM: ldadd (Load-Add)
    return atomicAdd(address, value);
  }
  
  // Atomics.compareExchange 对应 CPU的 cmpxchg 指令
  static compareExchange(typedArray, index, expected, replacement) {
    const address = typedArray.buffer + index * typedArray.BYTES_PER_ELEMENT;
    
    // x86: lock cmpxchg [address], replacement
    // ARM: ldaxr/stlxr 循环
    return atomicCompareExchange(address, expected, replacement);
  }
  
  // Atomics.wait 使用 futex 系统调用
  static wait(typedArray, index, value, timeout) {
    const address = typedArray.buffer + index * typedArray.BYTES_PER_ELEMENT;
    
    // 检查当前值
    if (load(address) !== value) {
      return 'not-equal';
    }
    
    // 调用futex等待
    const result = futex_wait(address, value, timeout);
    
    return result === FUTEX_TIMEOUT ? 'timed-out' : 'ok';
  }
}
```

## 内存顺序与屏障

原子操作还涉及内存顺序（Memory Ordering）：

```javascript
// Atomics操作提供顺序一致性（Sequential Consistency）
const buffer = new SharedArrayBuffer(8);
const view = new Int32Array(buffer);

// 线程1
Atomics.store(view, 0, 1);  // 写入A
Atomics.store(view, 1, 1);  // 写入B

// 线程2
const b = Atomics.load(view, 1);  // 读取B
const a = Atomics.load(view, 0);  // 读取A

// 如果b === 1，则a必定 === 1
// 顺序一致性保证：所有线程看到相同的操作顺序
```

## 性能考量

### 原子操作的开销

```javascript
// 性能对比
function benchmarkAtomics() {
  const buffer = new SharedArrayBuffer(4);
  const view = new Int32Array(buffer);
  const iterations = 1000000;
  
  // 非原子操作
  let start = performance.now();
  for (let i = 0; i < iterations; i++) {
    view[0]++;
  }
  console.log(`非原子操作: ${performance.now() - start}ms`);
  
  // 原子操作
  start = performance.now();
  for (let i = 0; i < iterations; i++) {
    Atomics.add(view, 0, 1);
  }
  console.log(`原子操作: ${performance.now() - start}ms`);
}

// 典型结果：
// 非原子操作: 5ms
// 原子操作: 50ms
// 原子操作约慢10倍，但保证正确性
```

### 减少竞争

```javascript
// 反模式：高竞争
const counter = new Int32Array(buffer);
// 所有Worker都在争抢同一个计数器
workers.forEach(w => w.postMessage({ counter, index: 0 }));

// 推荐：分片减少竞争
const counters = new Int32Array(buffer);  // 每个Worker一个计数器
workers.forEach((w, i) => w.postMessage({ counters, index: i }));

// 最后汇总
function getTotalCount(counters) {
  let total = 0;
  for (let i = 0; i < counters.length; i++) {
    total += Atomics.load(counters, i);
  }
  return total;
}
```

## 生产者-消费者模式

```javascript
// 环形缓冲区实现
class RingBuffer {
  constructor(sharedBuffer, size) {
    // 布局：[head, tail, ...data]
    this.control = new Int32Array(sharedBuffer, 0, 2);
    this.data = new Int32Array(sharedBuffer, 8, size);
    this.size = size;
  }
  
  push(value) {
    while (true) {
      const head = Atomics.load(this.control, 0);
      const tail = Atomics.load(this.control, 1);
      const nextHead = (head + 1) % this.size;
      
      if (nextHead === tail) {
        // 缓冲区满，等待消费者
        Atomics.wait(this.control, 0, head);
        continue;
      }
      
      // 尝试推进head
      if (Atomics.compareExchange(this.control, 0, head, nextHead) === head) {
        this.data[head] = value;
        Atomics.notify(this.control, 1, 1);  // 通知消费者
        return true;
      }
    }
  }
  
  pop() {
    while (true) {
      const head = Atomics.load(this.control, 0);
      const tail = Atomics.load(this.control, 1);
      
      if (head === tail) {
        // 缓冲区空，等待生产者
        Atomics.wait(this.control, 1, tail);
        continue;
      }
      
      const nextTail = (tail + 1) % this.size;
      
      // 尝试推进tail
      if (Atomics.compareExchange(this.control, 1, tail, nextTail) === tail) {
        const value = this.data[tail];
        Atomics.notify(this.control, 0, 1);  // 通知生产者
        return value;
      }
    }
  }
}
```

## 安全限制与跨域隔离

由于Spectre攻击，SharedArrayBuffer的使用有安全限制：

```javascript
// 需要设置正确的HTTP头
// Cross-Origin-Opener-Policy: same-origin
// Cross-Origin-Embedder-Policy: require-corp

// 检查是否可用
if (typeof SharedArrayBuffer !== 'undefined') {
  console.log('SharedArrayBuffer可用');
} else {
  console.log('需要跨域隔离');
}

// 检查跨域隔离状态
console.log('crossOriginIsolated:', self.crossOriginIsolated);
```

服务器配置示例：

```
# nginx配置
location / {
    add_header Cross-Origin-Opener-Policy same-origin;
    add_header Cross-Origin-Embedder-Policy require-corp;
}
```

## 实际应用案例

### 并行数组处理

```javascript
// 并行求和
async function parallelSum(array, numWorkers = 4) {
  const chunkSize = Math.ceil(array.length / numWorkers);
  
  // 创建共享内存存储部分和
  const resultBuffer = new SharedArrayBuffer(numWorkers * 8);
  const results = new Float64Array(resultBuffer);
  
  // 创建共享数据
  const dataBuffer = new SharedArrayBuffer(array.length * 8);
  const sharedData = new Float64Array(dataBuffer);
  sharedData.set(array);
  
  // 启动Workers
  const workers = [];
  for (let i = 0; i < numWorkers; i++) {
    const worker = new Worker('sum-worker.js');
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, array.length);
    
    worker.postMessage({
      dataBuffer,
      resultBuffer,
      workerIndex: i,
      start,
      end
    });
    
    workers.push(new Promise(resolve => {
      worker.onmessage = resolve;
    }));
  }
  
  // 等待所有Worker完成
  await Promise.all(workers);
  
  // 汇总结果
  let total = 0;
  for (let i = 0; i < numWorkers; i++) {
    total += Atomics.load(results, i);
  }
  
  return total;
}

// sum-worker.js
self.onmessage = function(e) {
  const { dataBuffer, resultBuffer, workerIndex, start, end } = e.data;
  const data = new Float64Array(dataBuffer);
  const results = new Float64Array(resultBuffer);
  
  let sum = 0;
  for (let i = start; i < end; i++) {
    sum += data[i];
  }
  
  Atomics.store(results, workerIndex, sum);
  self.postMessage('done');
};
```

## 本章小结

SharedArrayBuffer和Atomics为JavaScript带来了真正的多线程共享内存能力，但也带来了并发编程的复杂性。

核心要点：

- **共享内存**：SharedArrayBuffer允许多个Worker访问同一块内存
- **原子操作**：Atomics提供原子读写和算术操作，避免数据竞争
- **同步原语**：可以用Atomics实现锁、信号量等同步机制
- **wait/notify**：提供线程等待和唤醒机制，避免忙等待
- **安全限制**：需要跨域隔离才能使用SharedArrayBuffer

正确使用共享内存和原子操作，可以实现高效的并行计算。但要注意避免数据竞争和死锁等并发问题。下一章，我们将探索Realm与多全局对象，了解JavaScript的隔离执行环境。
