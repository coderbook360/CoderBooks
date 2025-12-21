# V8垃圾回收机制概述

在前面的章节中，我们探讨了V8如何将JavaScript代码编译为高效的机器码。但代码执行只是V8职责的一半——另一半同样关键的工作是**内存管理**。思考一下，JavaScript开发者几乎从不手动释放内存，那这些不再使用的对象去哪了？

这就是垃圾回收器（Garbage Collector, GC）的舞台。

## 为什么需要垃圾回收？

让我们先理解问题的本质。看一段简单的代码：

```javascript
function processData() {
  const users = fetchUsers();        // 分配内存存储用户数据
  const filtered = users.filter(u => u.active);  // 分配新数组
  const formatted = filtered.map(u => u.name);   // 又分配新数组
  return formatted;
}

// 调用完成后，users 和 filtered 还需要吗？
const result = processData();
```

每次函数调用都在堆上分配对象。如果不清理，内存会很快耗尽。手动管理内存的语言（如C++）要求程序员显式释放：

```cpp
// C++ 风格的手动内存管理
User* users = new User[100];
// ... 使用 users
delete[] users;  // 必须手动释放，否则内存泄漏
```

这带来两个问题：
- **忘记释放** → 内存泄漏
- **释放后继续使用** → 悬空指针，程序崩溃

JavaScript选择了自动垃圾回收，让开发者专注于业务逻辑。但"自动"不意味着"免费"——理解GC的工作原理，能帮助我们写出更高效的代码。

## V8堆内存布局

V8将堆内存划分为几个区域，每个区域有不同的用途和回收策略：

```
┌─────────────────────────────────────────────────────────────┐
│                        V8 Heap                               │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │                   New Space (新生代)                  │    │
│  │  ┌──────────────────┬──────────────────┐            │    │
│  │  │   From Space     │    To Space      │            │    │
│  │  │   (活跃半区)       │   (空闲半区)      │            │    │
│  │  └──────────────────┴──────────────────┘            │    │
│  │  用途：存放新创建的小对象                               │    │
│  │  特点：空间小(1-8MB)，回收频繁，使用Scavenge算法         │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                   Old Space (老生代)                  │    │
│  │  ┌──────────────────┬──────────────────┐            │    │
│  │  │ Old Pointer Space│ Old Data Space   │            │    │
│  │  │ (含指针的对象)     │ (纯数据对象)      │            │    │
│  │  └──────────────────┴──────────────────┘            │    │
│  │  用途：存放存活较久的对象                               │    │
│  │  特点：空间大，回收较少，使用Mark-Sweep-Compact算法      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Large Object │  │  Code Space  │  │  Map Space   │      │
│  │    Space      │  │  (编译后代码) │  │ (隐藏类)     │      │
│  │  (大对象)      │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 为什么要分代？

这基于一个重要的经验观察——**代际假说**（Generational Hypothesis）：

> 大多数对象朝生夕死，少数对象长期存活。

想想实际代码中的对象生命周期：

```javascript
// 短命对象：函数内的临时变量
function calculateTotal(items) {
  const prices = items.map(i => i.price);  // 临时数组，函数返回后不再需要
  const sum = prices.reduce((a, b) => a + b, 0);
  return sum;
}

// 长命对象：缓存、连接池
const cache = new Map();  // 整个应用生命周期都存在
cache.set('config', loadConfig());
```

基于这个假说，V8采用**分代回收**策略：

| 代 | 对象特点 | 空间大小 | 回收算法 | 回收频率 |
|---|---------|---------|---------|---------|
| 新生代 | 刚创建的对象 | 1-8 MB | Scavenge | 高频 |
| 老生代 | 存活久的对象 | 几百MB-几GB | Mark-Sweep-Compact | 低频 |

## 垃圾识别：可达性分析

垃圾回收的第一步是识别哪些对象是"垃圾"。V8使用**可达性分析**而非引用计数。

### 什么是可达性？

从一组**根对象**（GC Roots）出发，通过引用链能访问到的对象都是"活"的，其余是"垃圾"：

```javascript
// GC Roots 包括：
// - 全局对象 (global/window)
// - 当前调用栈上的变量
// - 活跃的闭包引用

let globalUser = { name: 'Alice' };  // 可达：通过全局变量

function outer() {
  const config = { debug: true };    // 可达：在调用栈上
  
  return function inner() {
    console.log(config.debug);       // config 通过闭包可达
  };
}

const fn = outer();  // config 仍然可达，因为 fn 持有闘包
```

### 可达性分析图示

```
        GC Roots
           │
           ▼
    ┌──────────────┐
    │   global     │ ───────┐
    └──────────────┘        │
           │                │
           ▼                ▼
    ┌──────────────┐  ┌──────────────┐
    │   user       │  │   config     │  ← 可达对象
    └──────────────┘  └──────────────┘
           │
           ▼
    ┌──────────────┐
    │   profile    │  ← 可达对象
    └──────────────┘


    ┌──────────────┐
    │   orphan     │  ← 不可达 = 垃圾
    └──────────────┘
    
    ┌──────────────┐     ┌──────────────┐
    │   objA       │ ←──→│   objB       │  ← 循环引用但不可达 = 垃圾
    └──────────────┘     └──────────────┘
```

### 为什么不用引用计数？

引用计数的问题是**循环引用**：

```javascript
function createCycle() {
  const a = {};
  const b = {};
  a.ref = b;  // a 引用 b
  b.ref = a;  // b 引用 a
  // 函数返回后，a 和 b 互相引用，计数都是 1
  // 但实际上它们已经不可达了
}

createCycle();
// 引用计数无法识别这是垃圾
// 可达性分析可以正确识别
```

## 垃圾回收的三个阶段

无论使用哪种算法，GC都包含三个核心阶段：

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   标记阶段   │ ──→│   清除阶段   │ ──→│   整理阶段   │
│   Marking   │    │  Sweeping   │    │ Compacting  │
└─────────────┘    └─────────────┘    └─────────────┘
      │                  │                  │
      ▼                  ▼                  ▼
  识别活对象          回收死对象          消除碎片
```

### 阶段一：标记（Marking）

从GC Roots遍历所有可达对象，标记为"活"：

```javascript
// 伪代码表示标记过程
function mark(roots) {
  const worklist = [...roots];
  
  while (worklist.length > 0) {
    const obj = worklist.pop();
    if (!obj.marked) {
      obj.marked = true;
      // 将所有被引用的对象加入工作列表
      for (const ref of obj.references) {
        worklist.push(ref);
      }
    }
  }
}
```

### 阶段二：清除（Sweeping）

遍历堆内存，回收所有未标记的对象：

```
标记后的堆：
┌────┬────┬────┬────┬────┬────┬────┬────┐
│ ✓  │    │ ✓  │    │    │ ✓  │    │ ✓  │
│live│dead│live│dead│dead│live│dead│live│
└────┴────┴────┴────┴────┴────┴────┴────┘

清除后的堆：
┌────┬────┬────┬────┬────┬────┬────┬────┐
│ ✓  │free│ ✓  │free│free│ ✓  │free│ ✓  │
│live│    │live│    │    │live│    │live│
└────┴────┴────┴────┴────┴────┴────┴────┘
```

### 阶段三：整理（Compacting）

将存活对象紧密排列，消除内存碎片：

```
整理前（碎片化）：
┌────┬────┬────┬────┬────┬────┬────┬────┐
│live│free│live│free│free│live│free│live│
└────┴────┴────┴────┴────┴────┴────┴────┘

整理后（紧凑）：
┌────┬────┬────┬────┬────────────────────┐
│live│live│live│live│      free          │
└────┴────┴────┴────┴────────────────────┘
```

## Stop-The-World 问题

传统的GC需要**暂停JavaScript执行**（Stop-The-World, STW），这会导致应用卡顿：

```
时间轴：
─────────────────────────────────────────────────→

│← JavaScript 执行 →│← GC暂停 →│← JavaScript 执行 →│
                     │  卡顿！  │
```

如果GC暂停时间过长（比如100ms），用户会明显感觉到：
- 动画卡顿
- 响应延迟
- 实时应用掉帧

V8通过多种技术减少STW时间：

### 1. 分代回收

新生代空间小，回收快（通常 < 1ms）：

```
主线程：─── JS ──┬── GC(新生代) ──┬── JS ───
                 │    < 1ms      │
```

### 2. 增量标记（Incremental Marking）

将标记工作分成小块，与JavaScript交替执行：

```
传统标记：
─── JS ───┬─────── 长时间标记 ───────┬─── JS ───
          │        200ms             │

增量标记：
─ JS ─┬─ 标记 ─┬─ JS ─┬─ 标记 ─┬─ JS ─┬─ 标记 ─┬─ JS ─
      │ 5ms   │      │ 5ms   │      │ 5ms   │
```

### 3. 并发回收（Concurrent GC）

部分GC工作在后台线程执行，不阻塞主线程：

```
主线程：    ─────── JavaScript 执行 ───────
后台线程：  ──── 标记 ────┬──── 清除 ────
                         │
                    短暂同步点
```

### 4. 并行回收（Parallel GC）

多个线程同时进行GC工作：

```
主线程：    ─ JS ─┬─── GC ───┬─ JS ─
GC线程1：         │── 标记 ──│
GC线程2：         │── 标记 ──│
GC线程3：         │── 标记 ──│
                  │  并行加速  │
```

## 监控GC活动

Node.js提供了多种方式监控GC：

### 方式一：启动参数

```bash
# 打印GC日志
node --trace-gc app.js

# 输出示例：
# [12345:0x...] 12.3 ms: Scavenge 4.2 (5.0) -> 3.8 (6.0) MB, 1.2 / 0.0 ms
# [12345:0x...] 45.6 ms: Mark-sweep 8.5 (10.0) -> 6.2 (10.0) MB, 15.3 / 0.0 ms
```

解读GC日志：

```
[12345:0x...]     进程ID和isolate
12.3 ms:          从启动到GC发生的时间
Scavenge:         GC类型（新生代）
4.2 (5.0):        回收前 已用(已提交) MB
3.8 (6.0):        回收后 已用(已提交) MB
1.2 / 0.0 ms:     GC耗时 / 外部回调耗时
```

### 方式二：v8模块

```javascript
const v8 = require('v8');

// 获取堆统计信息
const heapStats = v8.getHeapStatistics();
console.log({
  heapSizeLimit: heapStats.heap_size_limit,      // 堆上限
  totalHeapSize: heapStats.total_heap_size,      // 已提交堆大小
  usedHeapSize: heapStats.used_heap_size,        // 已使用堆大小
  externalMemory: heapStats.external_memory,     // 外部内存(如Buffer)
});

// 获取各空间详细信息
const spaceStats = v8.getHeapSpaceStatistics();
spaceStats.forEach(space => {
  console.log(`${space.space_name}: ${space.space_used_size} bytes`);
});
```

### 方式三：perf_hooks

```javascript
const { PerformanceObserver, constants } = require('perf_hooks');

// 监听GC事件
const obs = new PerformanceObserver((list) => {
  const entries = list.getEntries();
  entries.forEach(entry => {
    console.log(`GC ${entry.detail.kind}: ${entry.duration.toFixed(2)}ms`);
  });
});

obs.observe({ 
  entryTypes: ['gc'],
  buffered: true 
});

// GC kind 对应关系：
// 1 = Scavenge (新生代)
// 2 = Mark-Sweep-Compact (老生代)
// 4 = Incremental Marking
// 8 = Weak Callback Processing
```

## 内存分配与GC触发

了解GC何时触发有助于优化：

```javascript
// GC 触发条件：
// 1. 新生代空间满
// 2. 老生代空间超过阈值
// 3. 手动调用（不推荐生产使用）
// 4. 内存压力（操作系统层面）

// 手动触发GC（需要 --expose-gc 参数）
if (global.gc) {
  global.gc();  // 触发完整GC
  global.gc({ type: 'minor' });  // 仅新生代
}
```

分配模式对GC影响巨大：

```javascript
// 高分配率 = 频繁GC
function highAllocationRate() {
  for (let i = 0; i < 1000000; i++) {
    const temp = { x: i, y: i * 2 };  // 每次迭代都分配
  }
}

// 对象池模式 = 减少分配和GC
class ObjectPool {
  constructor(createFn, size = 100) {
    this.pool = Array.from({ length: size }, createFn);
    this.index = 0;
  }
  
  acquire() {
    if (this.index < this.pool.length) {
      return this.pool[this.index++];
    }
    return null;  // 池耗尽
  }
  
  release(obj) {
    if (this.index > 0) {
      this.pool[--this.index] = obj;
    }
  }
}
```

## 常见GC问题模式

### 问题1：内存泄漏

对象意外保持可达状态：

```javascript
// 泄漏：全局数组无限增长
const logs = [];
function log(message) {
  logs.push({ time: Date.now(), message });  // 永远不清理
}

// 修复：限制大小或使用循环缓冲
const MAX_LOGS = 1000;
function log(message) {
  if (logs.length >= MAX_LOGS) {
    logs.shift();  // 移除最旧的
  }
  logs.push({ time: Date.now(), message });
}
```

### 问题2：过早晋升

新生代空间太小，对象过早进入老生代：

```javascript
// 症状：Mark-Sweep 频繁执行
// 原因：大量临时对象晋升到老生代

// 解决：增大新生代空间
// node --max-semi-space-size=64 app.js
```

### 问题3：大对象

超过一定大小的对象直接分配到老生代：

```javascript
// 大数组会直接进入老生代
const bigArray = new Array(1000000);

// 更好的做法：流式处理
async function* processLargeData(source) {
  for await (const chunk of source) {
    yield transform(chunk);
  }
}
```

## 小结

本章我们从宏观角度理解了V8的垃圾回收机制：

- **分代回收**：基于代际假说，将堆分为新生代和老生代
- **可达性分析**：从GC Roots遍历，识别活对象
- **三个阶段**：标记、清除、整理
- **减少STW**：增量标记、并发回收、并行回收

接下来的章节，我们将深入每种GC算法的细节：
- 新生代的Scavenge算法
- 老生代的Mark-Sweep-Compact算法
- 增量标记与并发GC的实现

理解这些原理，能帮助我们编写对GC更友好的代码，避免不必要的性能问题。
