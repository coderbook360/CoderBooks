# Mark-Sweep-Compact：老生代的垃圾回收

在上一章中，我们学习了 Scavenge 算法如何快速回收新生代对象。但老生代对象有不同的特点：
- **生命周期长**：经历了多次 Scavenge 仍然存活
- **数量庞大**：老生代空间远大于新生代（几百 MB vs 8MB）
- **存活率高**：大部分对象都是活跃的

这些特点使得 Scavenge 算法不再适用。本章将深入 V8 老生代使用的两个核心算法：**Mark-Sweep** 和 **Mark-Compact**。

## 为什么 Scavenge 不适合老生代？

让我们先算一笔账：

```
假设老生代：200MB
存活率：90%（大部分对象长期存活）

如果使用 Scavenge：
- 需要 200MB + 200MB = 400MB 空间（From + To）
- 每次 GC 需要复制 180MB 数据（90% 存活）
- 复制时间：180MB / (10GB/s) ≈ 18ms

问题：
1. 空间浪费：50% 的内存被闲置
2. 复制开销：高存活率导致大量复制
3. 停顿时间：停顿时间随老生代大小线性增长
```

**老生代需要不同的策略**：
- 不复制对象，减少开销
- 原地回收，避免空间浪费
- 增量和并发，减少停顿时间

## Mark-Sweep：标记-清除

Mark-Sweep 是经典的垃圾回收算法，分为两个阶段。

### 阶段一：标记（Mark）

从 GC Roots 出发，遍历所有可达对象，标记为存活。

**标记过程**：

```
初始状态：

GC Roots:
- 全局变量: objA
- 调用栈: objB

堆内存:
[A] → [C] → [D]
[B] → [E]
[F] (无引用)
[G] (无引用)

标记过程：
1. 标记 A（从 GC Root 可达）
2. A 引用 C，标记 C
3. C 引用 D，标记 D
4. 标记 B（从 GC Root 可达）
5. B 引用 E，标记 E
6. F 和 G 没有被标记

结果：
✓ [A] → ✓ [C] → ✓ [D]
✓ [B] → ✓ [E]
  [F] (垃圾)
  [G] (垃圾)
```

**标记算法实现**：

```javascript
// 伪代码：深度优先标记
function mark() {
  const markStack = [];
  const marked = new Set();
  
  // 1. 将所有 GC Roots 入栈
  for (const root of gcRoots) {
    markStack.push(root);
  }
  
  // 2. 深度优先遍历
  while (markStack.length > 0) {
    const obj = markStack.pop();
    
    // 已标记过，跳过
    if (marked.has(obj)) {
      continue;
    }
    
    // 标记对象
    marked.add(obj);
    obj.setMarkBit(true);  // 在对象头部设置标记位
    
    // 将引用的对象入栈
    for (const ref of obj.getReferences()) {
      if (!marked.has(ref)) {
        markStack.push(ref);
      }
    }
  }
  
  return marked;
}
```

**标记位存储**：

V8 使用**位图（Bitmap）**存储标记信息，而不是在对象本身：

```
对象空间：
地址 0:    [对象 A, 32字节]
地址 32:   [对象 B, 64字节]
地址 96:   [对象 C, 48字节]

标记位图：
位 0: 1  (对象 A 存活)
位 1: 1  (对象 B 存活)
位 2: 0  (对象 C 死亡)

优点：
- 标记信息独立存储，不修改对象
- 可以快速清除所有标记（清空位图）
- 方便并发标记（减少对对象的写操作）
```

### 阶段二：清除（Sweep）

扫描整个堆，回收未标记的对象，并将空闲空间加入**空闲列表（Free List）**。

**清除过程**：

```javascript
// 伪代码：清除死亡对象
function sweep() {
  const freeList = [];
  let currentAddress = heapStart;
  
  while (currentAddress < heapEnd) {
    const obj = readObject(currentAddress);
    
    if (!obj.isMarked()) {
      // 死亡对象，加入空闲列表
      freeList.push({
        address: currentAddress,
        size: obj.size
      });
      
      // 清除对象内容（可选，用于安全）
      memset(currentAddress, 0, obj.size);
    } else {
      // 存活对象，清除标记位
      obj.setMarkBit(false);
    }
    
    currentAddress += obj.size;
  }
  
  return freeList;
}
```

**空闲列表管理**：

回收后，V8 维护多个按大小分类的空闲列表：

```javascript
// 空闲列表结构
class FreeListManager {
  constructor() {
    // 按大小分类的空闲列表
    this.smallBlocks = [];   // 256 字节以下
    this.mediumBlocks = [];  // 256 - 2048 字节
    this.largeBlocks = [];   // 2048 字节以上
  }
  
  addFreeBlock(address, size) {
    const block = { address, size };
    
    if (size < 256) {
      this.smallBlocks.push(block);
    } else if (size < 2048) {
      this.mediumBlocks.push(block);
    } else {
      this.largeBlocks.push(block);
    }
  }
  
  allocate(size) {
    // 根据大小选择合适的列表
    let list;
    if (size < 256) {
      list = this.smallBlocks;
    } else if (size < 2048) {
      list = this.mediumBlocks;
    } else {
      list = this.largeBlocks;
    }
    
    // 查找足够大的空闲块（First Fit）
    for (let i = 0; i < list.length; i++) {
      const block = list[i];
      
      if (block.size >= size) {
        // 找到合适的块
        list.splice(i, 1);  // 从列表移除
        
        // 如果块太大，切分并返回剩余部分
        if (block.size > size + 16) {  // 16 字节最小块
          this.addFreeBlock(block.address + size, block.size - size);
        }
        
        return block.address;
      }
    }
    
    return null;  // 没有合适的块
  }
}
```

### Mark-Sweep 的优缺点

**优点**：

1. **不移动对象**：对象地址不变，无需更新引用
2. **无空间浪费**：不需要预留 To Space
3. **适合高存活率**：不受存活率影响

**缺点**：

1. **内存碎片**：清除后产生大量不连续的空闲空间

```
清除后的堆：
[A, 存活] [空闲, 20B] [B, 存活] [空闲, 50B] [C, 存活] [空闲, 30B]

问题：想分配 80B 对象
- 总空闲：20 + 50 + 30 = 100B（足够）
- 但没有连续的 80B 空间（碎片化）
- 分配失败！
```

2. **分配效率低**：需要在空闲列表中查找合适的块

3. **缓存不友好**：频繁访问不连续的内存

## Mark-Compact：消除碎片

当内存碎片严重时，V8 会使用 Mark-Compact 算法。它在 Mark-Sweep 基础上增加了**压缩（Compact）**阶段。

### 压缩的必要性

让我们看一个碎片化导致的问题：

```javascript
// 场景：老生代已经很碎片化
const heap = {
  size: 100,
  used: 60,
  free: 40,  // 看起来还有 40% 空间
  fragmented: true
};

// 尝试分配一个 20 单位的对象
function allocate(size) {
  // Mark-Sweep 后的空闲列表
  const freeBlocks = [
    { address: 10, size: 5 },
    { address: 30, size: 8 },
    { address: 50, size: 7 },
    { address: 70, size: 6 },
    { address: 90, size: 14 }
  ];
  
  // 没有单个块能容纳 20 单位
  // 即使总空闲空间 = 5+8+7+6+14 = 40 > 20
  
  // 分配失败！触发 Mark-Compact
  return null;
}
```

### 压缩过程

Mark-Compact 分为三个阶段：

**阶段一：标记（同 Mark-Sweep）**

**阶段二：计算转发地址**

遍历所有存活对象，计算它们在压缩后的新地址：

```javascript
// 伪代码：计算转发地址
function computeForwardingAddresses() {
  const forwardingTable = new Map();
  let newAddress = heapStart;
  
  // 按地址顺序遍历存活对象
  for (const obj of liveObjectsInOrder()) {
    // 记录：原地址 → 新地址
    forwardingTable.set(obj.address, newAddress);
    
    // 新地址向后移动
    newAddress += obj.size;
  }
  
  return forwardingTable;
}
```

**可视化**：

```
压缩前（存活对象）：
地址 0:    [A, 20B]
地址 30:   [B, 30B]
地址 80:   [C, 40B]
地址 150:  [D, 25B]

计算转发地址：
A: 0  → 0   (不动)
B: 30 → 20  (移动到 A 后面)
C: 80 → 50  (移动到 B 后面)
D: 150 → 90 (移动到 C 后面)

压缩后：
地址 0:    [A, 20B]
地址 20:   [B, 30B]
地址 50:   [C, 40B]
地址 90:   [D, 25B]
地址 115:  [空闲空间]
```

**阶段三：更新引用**

遍历所有存活对象，更新它们的引用，指向新地址：

```javascript
// 伪代码：更新引用
function updateReferences(forwardingTable) {
  for (const obj of liveObjects()) {
    // 遍历对象的每个引用字段
    for (const field of obj.getReferenceFields()) {
      const oldAddress = field.value;
      const newAddress = forwardingTable.get(oldAddress);
      
      if (newAddress !== undefined) {
        // 更新引用，指向新地址
        field.value = newAddress;
      }
    }
  }
  
  // 更新 GC Roots
  for (const root of gcRoots) {
    const newAddress = forwardingTable.get(root.address);
    if (newAddress !== undefined) {
      root.address = newAddress;
    }
  }
}
```

**阶段四：移动对象**

将对象移动到新位置：

```javascript
// 伪代码：移动对象
function moveObjects(forwardingTable) {
  // 按地址顺序遍历（从后往前，避免覆盖）
  for (const obj of liveObjectsInReverseOrder()) {
    const oldAddress = obj.address;
    const newAddress = forwardingTable.get(oldAddress);
    
    if (newAddress !== oldAddress) {
      // 移动对象内容
      memmove(newAddress, oldAddress, obj.size);
      
      // 更新对象的地址字段
      obj.address = newAddress;
    }
  }
}
```

**为什么从后往前移动？**

```
从前往后移动（错误）：

初始：
[A] [空] [B] [空] [C]

移动 A → 不动
移动 B → 移到 A 后面，覆盖了原来 B 的位置
移动 C → 想移到 B 后面，但 B 已经被移走了！(数据丢失)

从后往前移动（正确）：

移动 C → 移到最终位置（不会覆盖前面的对象）
移动 B → 移到 C 前面
移动 A → 不动

所有对象都安全移动
```

### Mark-Compact 的触发时机

V8 不是每次都执行 Mark-Compact，而是根据碎片率决定：

```javascript
// 伪代码：选择算法
function selectGCAlgorithm() {
  const fragmentation = calculateFragmentation();
  
  if (fragmentation > 0.3) {
    // 碎片率超过 30%，执行 Mark-Compact
    return 'mark-compact';
  } else {
    // 碎片率低，执行更快的 Mark-Sweep
    return 'mark-sweep';
  }
}

function calculateFragmentation() {
  const freeBlocks = getFreeList();
  
  if (freeBlocks.length === 0) return 0;
  
  // 计算最大空闲块占总空闲空间的比例
  const totalFree = freeBlocks.reduce((sum, b) => sum + b.size, 0);
  const maxBlock = Math.max(...freeBlocks.map(b => b.size));
  
  // 碎片率 = 1 - (最大块 / 总空闲)
  return 1 - (maxBlock / totalFree);
  
  // 示例：
  // 总空闲 100，最大块 80 → 碎片率 = 1 - 0.8 = 0.2（低碎片）
  // 总空闲 100，最大块 20 → 碎片率 = 1 - 0.2 = 0.8（高碎片）
}
```

## 性能对比

让我们对比三个算法的性能特点：

| 算法 | 停顿时间 | 空间利用率 | 碎片情况 | 适用场景 |
|------|---------|-----------|---------|---------|
| **Scavenge** | 很短 (1-5ms) | 低 (50%) | 无碎片 | 新生代，低存活率 |
| **Mark-Sweep** | 中等 (10-50ms) | 高 (接近100%) | 有碎片 | 老生代，碎片率低 |
| **Mark-Compact** | 长 (50-200ms) | 高 (接近100%) | 无碎片 | 老生代，碎片率高 |

**停顿时间分析**：

```javascript
// 假设老生代 200MB，存活率 90%

// Mark-Sweep：
// 1. 标记：遍历 180MB 对象（存活）
//    时间：~20ms
// 2. 清除：扫描 200MB 堆空间
//    时间：~10ms
// 总计：~30ms

// Mark-Compact：
// 1. 标记：遍历 180MB 对象
//    时间：~20ms
// 2. 计算转发地址：遍历 180MB 对象
//    时间：~10ms
// 3. 更新引用：遍历 180MB 对象
//    时间：~20ms
// 4. 移动对象：复制 180MB 数据
//    时间：~18ms
// 总计：~68ms（是 Mark-Sweep 的 2-3 倍）
```

## 增量标记：减少停顿

即使使用 Mark-Sweep，老生代 GC 的停顿时间仍然可能很长。V8 使用**增量标记（Incremental Marking）**技术，将标记过程分散到多个小步骤。

### 增量标记原理

```javascript
// 传统标记：一次性完成
function fullMark() {
  pauseJavaScript();  // 停止 JS 执行
  
  // 标记所有对象（可能需要 50ms）
  markAllObjects();
  
  resumeJavaScript();  // 恢复 JS 执行
}

// 增量标记：分多次完成
function incrementalMark() {
  // 初始化
  initMarkingWorkList();
  
  // 多次小步骤
  while (hasMarkingWork()) {
    pauseJavaScript();
    
    // 只标记一小部分对象（1-5ms）
    markSomeObjects(5);  // 5ms 时间片
    
    resumeJavaScript();
    
    // 让 JS 执行一段时间
    yield;
  }
}
```

**可视化**：

```
传统标记：
[JS 运行] ─→ [停顿 50ms，标记] ─→ [JS 运行]
              ^^^^^^^^^^^^^^^^^^^^
              用户感知到明显卡顿

增量标记：
[JS 运行] → [标记 5ms] → [JS 运行] → [标记 5ms] → [JS 运行] → ...
            ^^^^^^^^^^              ^^^^^^^^^^
            停顿短，用户基本无感
```

### 写屏障：处理增量标记中的对象变化

增量标记的挑战：在标记期间，JS 代码仍在运行，对象关系可能发生变化。

**问题场景**：

```javascript
// 初始状态
const A = { ref: B };  // A 引用 B
const C = { ref: null };

// 增量标记开始
// 第1步：标记 A（✓）
// 第2步：标记 B（✓）

// --- JS 代码执行 ---
C.ref = B;  // C 引用 B
A.ref = null;  // A 不再引用 B

// 第3步：标记 C（✓）
// 但 C.ref 指向的 B 已经被标记过了，不会再标记

// 问题：如果没有其他对象引用 B，B 会被误回收！
```

**解决方案：写屏障（Write Barrier）**

V8 在每次修改对象引用时，插入写屏障代码：

```javascript
// 伪代码：写屏障
function setField(obj, field, newValue) {
  const oldValue = obj[field];
  
  // 写屏障逻辑
  if (isMarking && isBlack(obj) && isWhite(newValue)) {
    // 增量标记期间
    // 黑色对象（已标记）引用白色对象（未标记）
    // 将新对象标记为灰色，防止漏标
    markGray(newValue);
  }
  
  // 执行实际赋值
  obj[field] = newValue;
}
```

**三色标记**：

- **白色**：未访问的对象
- **灰色**：已访问但子对象未访问的对象
- **黑色**：已访问且子对象已访问的对象

```
标记过程：

初始：所有对象都是白色
[A白] [B白] [C白] [D白]

标记 A，A 变灰色（已访问但子对象未访问）
[A灰] [B白] [C白] [D白]

扫描 A 的子对象 B，B 变灰色，A 变黑色（已完成）
[A黑] [B灰] [C白] [D白]

扫描 B 的子对象 C，C 变灰色，B 变黑色
[A黑] [B黑] [C灰] [D白]

C 没有子对象，C 变黑色
[A黑] [B黑] [C黑] [D白]

标记结束，D 是白色（垃圾）
```

## 并发标记：进一步优化

V8 还使用**并发标记（Concurrent Marking）**，在后台线程执行标记，主线程继续运行 JS。

```javascript
// 并发标记架构
class ConcurrentGC {
  constructor() {
    this.mainThread = new Thread('main');
    this.gcThread = new Thread('gc-worker');
  }
  
  startConcurrentMarking() {
    // 主线程继续运行 JS
    this.mainThread.run(() => {
      // JavaScript 代码执行
      executeJavaScript();
    });
    
    // GC 线程在后台标记
    this.gcThread.run(() => {
      // 在后台标记对象
      markObjectsConcurrently();
    });
  }
}
```

**并发标记 vs 增量标记**：

```
增量标记：
主线程：[JS] → [标记] → [JS] → [标记] → [JS]

并发标记：
主线程：[JS 执行..............................]
GC线程：     [标记.........................]

优势：主线程几乎不停顿
```

## 实战：监控 GC 性能

让我们写代码来监控 GC 行为：

```javascript
// 使用 Node.js 的 Performance API
const { PerformanceObserver, performance } = require('perf_hooks');

// 监控 GC 事件
const obs = new PerformanceObserver((items) => {
  items.getEntries().forEach((entry) => {
    console.log(`GC: ${entry.name}`);
    console.log(`  Kind: ${entry.kind}`);
    console.log(`  Duration: ${entry.duration.toFixed(2)}ms`);
    console.log(`  Flags: ${entry.flags}`);
  });
});
obs.observe({ entryTypes: ['gc'] });

// 触发老生代 GC
function allocateLongLivedObjects() {
  const objects = [];
  
  // 分配大量长期存活的对象
  for (let i = 0; i < 100000; i++) {
    objects.push({
      id: i,
      data: new Array(100).fill(i),
      timestamp: Date.now()
    });
  }
  
  // 保持引用，对象不会被回收
  global.longLived = objects;
}

allocateLongLivedObjects();

// 手动触发 GC（需要 --expose-gc 标志）
// node --expose-gc --trace-gc script.js
if (global.gc) {
  global.gc();  // 触发 Mark-Sweep
}
```

**输出示例**：

```
GC: major
  Kind: Major GC (Mark-Sweep-Compact)
  Duration: 45.23ms
  Flags: [incremental, concurrent]
```

## 代码优化建议

理解老生代 GC 后，我们可以优化代码：

### 1. 避免创建大量长期对象

```javascript
// ❌ 不好：缓存所有请求数据
const cache = {};
app.get('/api/data', (req, res) => {
  const key = req.query.id;
  
  if (!cache[key]) {
    cache[key] = fetchData(key);  // 无限增长，导致老生代膨胀
  }
  
  res.send(cache[key]);
});

// ✅ 好：使用 LRU 缓存
const LRU = require('lru-cache');
const cache = new LRU({ max: 500 });  // 最多 500 项

app.get('/api/data', (req, res) => {
  const key = req.query.id;
  
  if (!cache.has(key)) {
    cache.set(key, fetchData(key));  // 自动淘汰旧数据
  }
  
  res.send(cache.get(key));
});
```

### 2. 及时释放大对象

```javascript
// ❌ 不好：闭包捕获大对象
function processData(largeData) {
  const summary = analyzeLargeData(largeData);  // largeData 很大
  
  return function getSummary() {
    // 闭包捕获了整个 largeData
    return summary;
  };
}

// ✅ 好：只保留需要的数据
function processData(largeData) {
  const summary = analyzeLargeData(largeData);
  // largeData 可以被回收
  
  return function getSummary() {
    // 只捕获 summary
    return summary;
  };
}
```

### 3. 避免内存碎片

```javascript
// ❌ 不好：频繁创建不同大小的对象
function badPattern() {
  const objects = [];
  
  for (let i = 0; i < 1000; i++) {
    // 每个对象大小不同，导致碎片化
    objects.push({
      data: new Array(Math.random() * 100)
    });
  }
  
  return objects;
}

// ✅ 好：使用固定大小的对象
function goodPattern() {
  const objects = [];
  
  for (let i = 0; i < 1000; i++) {
    // 对象大小一致，减少碎片
    objects.push({
      data: new Array(100)
    });
  }
  
  return objects;
}
```

## 本章小结

1. **Mark-Sweep**：标记存活对象，清除死亡对象，适用于老生代但产生碎片

2. **Mark-Compact**：在 Mark-Sweep 基础上增加压缩，消除碎片但停顿时间更长

3. **算法选择**：V8 根据碎片率动态选择 Mark-Sweep 或 Mark-Compact

4. **增量标记**：将标记过程分散到多个小步骤，减少停顿时间

5. **写屏障**：在增量标记期间，确保不漏标对象

6. **并发标记**：在后台线程执行标记，主线程继续运行 JS

7. **优化建议**：
   - 使用 LRU 缓存限制对象数量
   - 及时释放大对象的引用
   - 使用固定大小的对象，减少碎片

在下一章中，我们将探讨增量 GC 和并发 GC 的更多细节，了解 V8 如何实现"几乎无停顿"的垃圾回收。
