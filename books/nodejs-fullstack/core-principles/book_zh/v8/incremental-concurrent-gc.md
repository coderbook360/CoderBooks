# 增量标记与并发垃圾回收

在前面的章节中，我们了解了Mark-Sweep-Compact算法的原理。但这个算法有一个致命问题：**Stop-The-World**。当堆内存达到几百MB甚至几GB时，GC暂停可能长达几百毫秒，这对于需要低延迟的应用是不可接受的。

V8通过两项关键技术解决这个问题：**增量标记**（Incremental Marking）和**并发回收**（Concurrent GC）。

## Stop-The-World 问题

传统的GC需要完全暂停应用程序：

```
传统 Mark-Sweep：
时间 ────────────────────────────────────────────────→

│←── JavaScript 执行 ──→│←── GC 暂停 ──→│←── JS ──→│
                         │   200-500ms   │
                         │    用户卡顿！   │
```

对于60fps的动画，每帧预算只有16.67ms。如果GC暂停200ms，相当于丢失12帧，用户会明显感知到卡顿。

## 增量标记（Incremental Marking）

### 核心思想

将长时间的标记工作分成小块，与JavaScript交替执行：

```
增量标记：
时间 ────────────────────────────────────────────────→

│JS│mark│JS│mark│JS│mark│JS│mark│JS│ sweep │JS│
   │5ms │   │5ms │   │5ms │   │5ms │   │15ms  │
   │    │   │    │   │    │   │    │   │      │
   └────┴───┴────┴───┴────┴───┴────┴───┴──────┘
   总标记时间相同，但分散了暂停时间
```

### 实现机制

增量标记利用**三色标记**的特性：

```
颜色状态：
○ 白色：未访问
◐ 灰色：已访问，子对象未处理
● 黑色：已访问，子对象已处理

增量标记可以在任意灰色对象处暂停，下次继续处理。
```

```javascript
// 增量标记伪代码
class IncrementalMarker {
  constructor() {
    this.grayList = [];      // 灰色对象队列
    this.stepBudget = 5;     // 每步时间预算（ms）
  }
  
  start(roots) {
    // 初始化：根对象标灰
    for (const root of roots) {
      root.color = GRAY;
      this.grayList.push(root);
    }
    this.state = 'marking';
  }
  
  step() {
    const startTime = Date.now();
    
    while (this.grayList.length > 0) {
      const obj = this.grayList.pop();
      
      // 处理子对象
      for (const child of obj.references) {
        if (child.color === WHITE) {
          child.color = GRAY;
          this.grayList.push(child);
        }
      }
      obj.color = BLACK;
      
      // 检查时间预算
      if (Date.now() - startTime > this.stepBudget) {
        return 'continue';  // 暂停，下次继续
      }
    }
    
    return 'done';  // 标记完成
  }
}
```

### 写屏障问题

增量标记有一个关键问题：标记过程中，JavaScript可能修改对象引用：

```javascript
// 问题场景
let a = { child: target };  // a 是黑色，target 是白色
let b = { child: null };    // b 是白色

// GC 暂停...
// JavaScript 执行：
b.child = target;           // 白色对象引用白色对象（OK）
a.child = null;             // 黑色对象断开引用

// 问题：target 现在只被白色对象 b 引用
// 但 b 可能还没被扫描到
// target 可能被误判为垃圾！
```

```
初始状态：
    ● a ──→ ○ target
    ○ b

JavaScript 修改后：
    ● a
    ○ b ──→ ○ target
              ↑
         可能被误判为垃圾！
```

### 写屏障解决方案

V8使用**写屏障**（Write Barrier）来处理这个问题：

```javascript
// 写屏障伪代码
function writeBarrier(obj, field, value) {
  // 原始写操作
  obj[field] = value;
  
  // 增量标记写屏障
  if (gc.state === 'incremental_marking') {
    if (obj.color === BLACK && value.color === WHITE) {
      // 黑色对象引用白色对象，将白色对象标灰
      value.color = GRAY;
      gc.grayList.push(value);
    }
  }
}
```

这确保了**不变性**：黑色对象不会直接引用白色对象。

```
写屏障触发后：
    ● a
    ◐ b ──→ ◐ target  ← 被标灰，会被扫描
```

### 增量标记的调度

V8通过**空闲时间回调**和**分配触发**来调度增量标记：

```javascript
// V8 调度策略（简化）
class GCScheduler {
  onIdle(idleTimeMs) {
    // 浏览器/Node.js 空闲时
    if (this.marker.state === 'marking') {
      this.marker.step();
    }
  }
  
  onAllocation(size) {
    // 分配时检查
    if (this.needsGC()) {
      // 做一小步标记工作
      this.marker.step();
    }
  }
  
  needsGC() {
    const heapUsage = getHeapUsage();
    return heapUsage > this.threshold;
  }
}
```

## 并发标记（Concurrent Marking）

增量标记减少了单次暂停时间，但总的GC时间没有减少。**并发标记**更进一步：让标记工作在后台线程执行。

### 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                     并发标记架构                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   主线程：─── JavaScript 执行 ───────────────────────→       │
│                     │                                       │
│                     │ 写屏障通知                             │
│                     ↓                                       │
│   标记线程：─────── 并发标记 ────────────────────────→       │
│                                                             │
│   主线程：                     ├── 短暂同步 ──┤               │
│                               └─ 最终化标记 ─┘               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 并发标记流程

```
时间 ────────────────────────────────────────────────→

主线程：│←──────── JavaScript 执行 ─────────→│pause│←─ JS ─→│
                                             │ 1ms │
标记线程：     │←────── 并发标记 ────────────→│     │
```

大部分标记工作在后台完成，主线程只需短暂暂停来：
1. 处理写屏障记录的变化
2. 完成最后的标记工作
3. 开始清除阶段

### 并发标记实现

```javascript
// 并发标记伪代码
class ConcurrentMarker {
  constructor() {
    this.grayList = new ConcurrentQueue();  // 线程安全队列
    this.writeBarrierLog = new ConcurrentQueue();
  }
  
  // 后台线程执行
  markConcurrently() {
    while (this.grayList.length > 0) {
      const obj = this.grayList.pop();
      
      // 原子操作：检查并标记
      if (atomicCompareAndSet(obj.color, GRAY, BLACK)) {
        for (const child of obj.references) {
          if (atomicCompareAndSet(child.color, WHITE, GRAY)) {
            this.grayList.push(child);
          }
        }
      }
    }
  }
  
  // 主线程写屏障
  writeBarrier(obj, field, value) {
    obj[field] = value;
    
    if (obj.color === BLACK && value.color === WHITE) {
      // 记录到日志，稍后处理
      this.writeBarrierLog.push({ obj, value });
    }
  }
  
  // 主线程最终化
  finalize() {
    // 处理写屏障日志
    while (this.writeBarrierLog.length > 0) {
      const { value } = this.writeBarrierLog.pop();
      if (value.color === WHITE) {
        value.color = GRAY;
        this.grayList.push(value);
      }
    }
    
    // 完成剩余标记
    while (this.grayList.length > 0) {
      // ... 标记逻辑
    }
  }
}
```

## 并行清除（Parallel Sweeping）

清除阶段也可以并行化：

```
┌─────────────────────────────────────────────────────────────┐
│                     并行清除                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   堆内存页分配给多个线程：                                    │
│                                                             │
│   清除线程1：│── Page1 ──│── Page4 ──│                       │
│   清除线程2：│── Page2 ──│── Page5 ──│                       │
│   清除线程3：│── Page3 ──│── Page6 ──│                       │
│                                                             │
│   主线程：  │←────── JavaScript 执行 ─────────→│             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

清除可以完全在后台进行，因为清除只是更新空闲链表，不修改存活对象。

```javascript
// 并行清除伪代码
class ParallelSweeper {
  sweep(pages, numThreads) {
    const threads = [];
    const pageQueue = new ConcurrentQueue(pages);
    
    for (let i = 0; i < numThreads; i++) {
      threads.push(new Thread(() => {
        while (true) {
          const page = pageQueue.pop();
          if (!page) break;
          
          this.sweepPage(page);
        }
      }));
    }
    
    // 等待所有线程完成
    threads.forEach(t => t.join());
  }
  
  sweepPage(page) {
    for (let addr = page.start; addr < page.end; ) {
      const obj = getObjectAt(addr);
      
      if (!obj.marked) {
        // 加入空闲链表
        page.freeList.add(addr, obj.size);
      } else {
        obj.marked = false;  // 重置标记
      }
      
      addr += obj.size;
    }
  }
}
```

## 并发整理（Concurrent Compaction）

整理是最复杂的阶段，因为需要移动对象并更新引用。V8采用**分页整理**策略：

```
┌─────────────────────────────────────────────────────────────┐
│                     分页整理策略                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   选择碎片化严重的页面进行整理：                               │
│                                                             │
│   Page1 [█░█░░█░█] → 碎片率 50%，需要整理                    │
│   Page2 [████████] → 碎片率 0%，跳过                         │
│   Page3 [█░░░░░░░] → 碎片率 87%，需要整理                    │
│                                                             │
│   整理目标：将 Page1、Page3 的存活对象移到新页面               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 整理流程

```
1. 选择疏散页（Evacuation Candidates）
   ┌─────────────────────────────────────────────┐
   │ 选择标准：                                    │
   │ - 存活对象比例低                              │
   │ - 碎片化严重                                  │
   │ - 整理收益大于成本                            │
   └─────────────────────────────────────────────┘

2. 分配目标页
   ┌─────────────────────────────────────────────┐
   │ 创建新的空白页作为目标                         │
   └─────────────────────────────────────────────┘

3. 复制存活对象（可并行）
   ┌─────────────────────────────────────────────┐
   │ 多线程并行复制对象到目标页                     │
   │ 设置转发指针                                  │
   └─────────────────────────────────────────────┘

4. 更新引用（需要暂停）
   ┌─────────────────────────────────────────────┐
   │ 遍历所有引用，更新指向被移动对象的指针          │
   └─────────────────────────────────────────────┘
```

## V8 的 Orinoco GC

V8的现代GC引擎叫**Orinoco**，整合了以上所有技术：

```
┌─────────────────────────────────────────────────────────────┐
│                     Orinoco GC 架构                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   新生代：                                                   │
│   ├── 并行 Scavenge（多线程复制）                            │
│   └── 增量标记（大对象）                                     │
│                                                             │
│   老生代：                                                   │
│   ├── 并发标记（后台线程）                                   │
│   ├── 增量标记（主线程空闲时）                               │
│   ├── 并行/并发清除                                         │
│   └── 并行整理（选择性）                                     │
│                                                             │
│   调度：                                                     │
│   ├── 空闲时间调度（Idle Time GC）                          │
│   ├── 分配触发                                              │
│   └── 内存压力触发                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Orinoco 性能数据

```
传统 GC vs Orinoco：

堆大小: 500MB
存活对象: 200MB

传统 Mark-Sweep：
├── 标记时间: 150ms
├── 清除时间: 50ms
└── 总暂停: 200ms

Orinoco：
├── 并发标记: 140ms（后台）
├── 最终化标记: 2ms（暂停）
├── 并发清除: 45ms（后台）
└── 总暂停: 约 5ms
```

## 监控并发GC

```javascript
const v8 = require('v8');
const { PerformanceObserver } = require('perf_hooks');

// 监控 GC 事件
const obs = new PerformanceObserver((list) => {
  list.getEntries().forEach(entry => {
    const kindMap = {
      1: 'Scavenge',
      2: 'Major GC',
      4: 'Incremental Marking',
      8: 'Weak Processing',
      16: 'Compacting'
    };
    
    console.log(`${kindMap[entry.detail.kind] || 'Unknown'}: ${entry.duration.toFixed(2)}ms`);
  });
});

obs.observe({ entryTypes: ['gc'] });
```

```bash
# 详细 GC 跟踪
node --trace-gc --trace-gc-verbose app.js

# 输出示例：
# [12345:0x...] Incremental marking started
# [12345:0x...] Incremental marking step 1.2ms
# [12345:0x...] Incremental marking step 0.8ms
# [12345:0x...] Concurrent sweeping started
# [12345:0x...] Pause: Mark-sweep 5.3ms
```

## 调优建议

### 1. 减少写屏障开销

写屏障在增量/并发标记期间持续执行，频繁修改引用会增加开销：

```javascript
// 写屏障开销高：频繁修改引用
function badPattern() {
  const obj = {};
  for (let i = 0; i < 10000; i++) {
    obj.data = { value: i };  // 每次都触发写屏障
  }
}

// 写屏障开销低：减少引用修改
function goodPattern() {
  const obj = { data: null };
  const data = { value: 0 };
  obj.data = data;  // 只触发一次
  
  for (let i = 0; i < 10000; i++) {
    data.value = i;  // 修改值，不是引用
  }
}
```

### 2. 利用空闲时间

Node.js可以通过`setImmediate`让出时间给GC：

```javascript
async function processLargeDataset(items) {
  const BATCH_SIZE = 1000;
  
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    await processBatch(batch);
    
    // 让出时间给 GC
    await new Promise(resolve => setImmediate(resolve));
  }
}
```

### 3. 避免触发紧急GC

当内存接近限制时，V8会触发紧急GC，这时并发优化失效：

```javascript
// 监控内存使用
function checkMemory() {
  const usage = process.memoryUsage();
  const heapUsedMB = usage.heapUsed / 1024 / 1024;
  const heapTotalMB = usage.heapTotal / 1024 / 1024;
  
  if (heapUsedMB / heapTotalMB > 0.9) {
    console.warn('Memory usage > 90%, expect GC pressure');
    // 考虑释放一些缓存
  }
}
```

## 小结

V8通过增量标记和并发回收大幅减少了GC暂停时间：

| 技术 | 原理 | 效果 |
|-----|-----|-----|
| 增量标记 | 将标记分成小步 | 单次暂停 < 5ms |
| 写屏障 | 跟踪引用变化 | 保证标记正确性 |
| 并发标记 | 后台线程标记 | 减少主线程负担 |
| 并行清除 | 多线程清除 | 加速清除阶段 |
| 并行整理 | 选择性并行整理 | 减少碎片 |

关键要点：
- 增量标记需要写屏障支持
- 并发标记大部分工作在后台进行
- 清除可以完全并发
- 整理需要短暂暂停

下一章，我们将探讨V8的内存限制和配置，了解如何根据应用场景调整堆大小。
