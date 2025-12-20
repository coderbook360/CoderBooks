# 老生代垃圾回收：Mark-Sweep-Compact

新生代的Scavenge算法虽然高效，但需要牺牲50%的空间。对于老生代这种可能占用几百MB甚至几GB的区域，这个代价太大了。V8为老生代选择了另一套算法：**Mark-Sweep-Compact**。

## 为什么老生代需要不同的算法？

让我们对比新生代和老生代的特点：

| 特性 | 新生代 | 老生代 |
|-----|--------|--------|
| 空间大小 | 小（1-8 MB） | 大（几百MB-几GB） |
| 对象存活率 | 低（10-20%） | 高（通常 > 50%） |
| 回收频率 | 高（每秒多次） | 低（分钟级） |
| 对象特点 | 短命临时对象 | 长期存活对象 |

Scavenge的问题：
- 50%空间利用率，对几GB的老生代是巨大浪费
- 存活率高时，复制开销接近全堆遍历

Mark-Sweep-Compact的优势：
- 空间利用率接近100%
- 不需要复制所有存活对象
- 适合处理大量存活对象的场景

## Mark-Sweep-Compact 三阶段

### 整体流程

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐            │
│   │  Mark    │ ──→│  Sweep   │ ──→│ Compact  │            │
│   │  标记     │    │  清除     │    │  整理     │            │
│   └──────────┘    └──────────┘    └──────────┘            │
│        │               │               │                   │
│        ▼               ▼               ▼                   │
│   识别活对象       回收死对象       消除碎片                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 阶段一：标记（Mark）

标记阶段的目标是识别所有存活对象。从GC Roots出发，遍历引用图，标记可达对象。

### 标记算法

```javascript
// 标记算法伪代码（深度优先）
function mark(roots) {
  const worklist = [];
  
  // 将根对象加入工作列表
  for (const root of roots) {
    if (!root.marked) {
      root.marked = true;
      worklist.push(root);
    }
  }
  
  // 遍历所有可达对象
  while (worklist.length > 0) {
    const obj = worklist.pop();
    
    for (const ref of obj.references) {
      if (!ref.marked) {
        ref.marked = true;
        worklist.push(ref);
      }
    }
  }
}
```

### 标记位图

V8不直接在对象头部设置标记位，而是使用独立的**位图**：

```
堆内存：
┌────┬────┬────┬────┬────┬────┬────┬────┐
│obj1│obj2│obj3│obj4│obj5│obj6│obj7│obj8│
└────┴────┴────┴────┴────┴────┴────┴────┘

标记位图（1位对应1个对象槽）：
┌───┬───┬───┬───┬───┬───┬───┬───┐
│ 1 │ 0 │ 1 │ 0 │ 0 │ 1 │ 0 │ 1 │
└───┴───┴───┴───┴───┴───┴───┴───┘
  ↑       ↑           ↑       ↑
 活       活          活       活
```

位图的优势：
- 不修改对象本身，缓存友好
- 可以快速批量操作（位运算）
- 便于并行处理

### 三色标记

V8使用**三色标记**（Tri-color Marking）来支持增量标记：

```
┌─────────────────────────────────────────────────────────────┐
│                    三色标记状态                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ○ 白色：未访问，可能是垃圾                                   │
│   ◐ 灰色：已访问，但子对象未完全处理                            │
│   ● 黑色：已访问，子对象都已处理                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘

标记过程：
1. 初始状态：所有对象为白色
2. 将根对象标记为灰色，加入工作列表
3. 循环：取出灰色对象，标记其子对象为灰色，自身变黑
4. 结束：没有灰色对象，白色对象是垃圾
```

```javascript
// 三色标记伪代码
const WHITE = 0, GRAY = 1, BLACK = 2;

function triColorMark(roots) {
  const grayList = [];
  
  // 根对象标灰
  for (const root of roots) {
    root.color = GRAY;
    grayList.push(root);
  }
  
  // 处理灰色对象
  while (grayList.length > 0) {
    const obj = grayList.pop();
    
    for (const child of obj.references) {
      if (child.color === WHITE) {
        child.color = GRAY;
        grayList.push(child);
      }
    }
    
    obj.color = BLACK;  // 子对象都处理完，变黑
  }
  
  // 剩余白色对象是垃圾
}
```

### 标记示例

```
初始状态（全白）：
      ○ Root
     / \
    ○   ○
   /   / \
  ○   ○   ○       ○ ← 不可达

步骤1（Root变灰）：
      ◐ Root      
     / \
    ○   ○
   /   / \
  ○   ○   ○       ○

步骤2（Root的子对象变灰，Root变黑）：
      ● Root
     / \
    ◐   ◐
   /   / \
  ○   ○   ○       ○

步骤3-5（继续处理）：
      ● Root
     / \
    ●   ●
   /   / \
  ●   ●   ●       ○ ← 仍然白色 = 垃圾
```

## 阶段二：清除（Sweep）

清除阶段遍历堆内存，回收所有未标记（白色）的对象。

### 清除过程

```
标记后的堆：
┌────┬────┬────┬────┬────┬────┬────┬────┐
│live│dead│live│dead│dead│live│dead│live│
│  ✓ │    │  ✓ │    │    │  ✓ │    │  ✓ │
└────┴────┴────┴────┴────┴────┴────┴────┘

清除后：
┌────┬────┬────┬────┬────┬────┬────┬────┐
│live│free│live│free│free│live│free│live│
└────┴────┴────┴────┴────┴────┴────┴────┘
      │         │    │         │
      └─────────┴────┴─────────┘
              空闲链表
```

### 空闲链表

清除后的空闲空间通过**空闲链表**（Free List）管理：

```javascript
// 空闲链表结构
class FreeList {
  constructor() {
    this.heads = new Map();  // size → 链表头
  }
  
  add(address, size) {
    // 将空闲块加入对应大小的链表
    const bucket = this.getBucket(size);
    const node = { address, size, next: this.heads.get(bucket) };
    this.heads.set(bucket, node);
  }
  
  allocate(size) {
    // 从链表中找到合适的空闲块
    const bucket = this.getBucket(size);
    let prev = null;
    let curr = this.heads.get(bucket);
    
    while (curr) {
      if (curr.size >= size) {
        // 找到合适的块
        if (prev) prev.next = curr.next;
        else this.heads.set(bucket, curr.next);
        return curr.address;
      }
      prev = curr;
      curr = curr.next;
    }
    return null;
  }
  
  getBucket(size) {
    // 大小分桶，加速查找
    if (size <= 32) return 32;
    if (size <= 64) return 64;
    if (size <= 128) return 128;
    // ...
  }
}
```

### 内存碎片问题

Mark-Sweep的问题是会产生**内存碎片**：

```
清除后（碎片化）：
┌────┬────┬────┬────┬────┬────┬────┬────┐
│live│free│live│free│free│live│free│live│
│ 4B │ 8B │16B │ 4B │ 8B │32B │ 4B │16B │
└────┴────┴────┴────┴────┴────┴────┴────┘

需要分配 20B 的对象？
虽然总空闲空间 = 8+4+8+4 = 24B > 20B
但没有连续的 20B 空间！
```

## 阶段三：整理（Compact）

整理阶段将存活对象紧密排列，消除碎片。

### 整理过程

```
整理前：
┌────┬────┬────┬────┬────┬────┬────┬────┐
│ A  │free│ B  │free│free│ C  │free│ D  │
└────┴────┴────┴────┴────┴────┴────┴────┘

整理后：
┌────┬────┬────┬────┬────────────────────┐
│ A  │ B  │ C  │ D  │       free         │
└────┴────┴────┴────┴────────────────────┘
```

### 整理算法

```javascript
// 整理算法伪代码（移动对象）
function compact(heap) {
  let dest = heap.start;
  
  // 第一遍：计算新地址
  for (let src = heap.start; src < heap.end; ) {
    const obj = getObjectAt(src);
    if (obj.marked) {
      obj.newAddress = dest;
      dest += obj.size;
    }
    src += obj.size;
  }
  
  // 第二遍：更新引用
  for (let addr = heap.start; addr < heap.end; ) {
    const obj = getObjectAt(addr);
    if (obj.marked) {
      for (const field of obj.fields) {
        if (field.target && field.target.newAddress) {
          field.target = field.target.newAddress;
        }
      }
    }
    addr += obj.size;
  }
  
  // 第三遍：移动对象
  for (let addr = heap.start; addr < heap.end; ) {
    const obj = getObjectAt(addr);
    if (obj.marked) {
      memmove(obj.newAddress, addr, obj.size);
    }
    addr += obj.size;
  }
}
```

### 整理的代价

整理操作开销大：
- 需要遍历堆三次
- 需要移动对象
- 需要更新所有引用

因此V8不是每次都整理，而是根据碎片化程度决定：

```javascript
// V8 的策略（简化）
function shouldCompact() {
  const fragmentationRatio = getFreeListFragmentation();
  
  // 碎片化严重时才整理
  if (fragmentationRatio > 0.3) {
    return true;
  }
  
  // 大对象分配失败时整理
  if (lastAllocationFailed) {
    return true;
  }
  
  return false;
}
```

## 完整的Mark-Sweep-Compact流程

```
┌─────────────────────────────────────────────────────────────┐
│                   老生代 GC 流程                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. 暂停 JavaScript 执行 (Stop-The-World)                   │
│                                                             │
│  2. 标记阶段 (Mark)                                         │
│     ├── 从 GC Roots 开始                                    │
│     ├── 三色标记遍历对象图                                   │
│     └── 所有可达对象标记为黑色                                │
│                                                             │
│  3. 清除阶段 (Sweep)                                        │
│     ├── 遍历堆内存                                          │
│     ├── 回收未标记对象                                       │
│     └── 更新空闲链表                                         │
│                                                             │
│  4. 整理阶段 (Compact) - 可选                               │
│     ├── 计算新地址                                          │
│     ├── 更新引用                                            │
│     └── 移动对象                                            │
│                                                             │
│  5. 恢复 JavaScript 执行                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 性能特征

### GC暂停时间

老生代GC的暂停时间取决于：
- 堆大小
- 存活对象数量
- 是否进行整理

```
典型暂停时间（仅供参考）：
├── 100MB 堆：50-100ms
├── 500MB 堆：200-500ms
└── 1GB+ 堆：可能超过1秒
```

这就是为什么V8引入了增量标记和并发回收。

### 监控老生代GC

```javascript
const { PerformanceObserver } = require('perf_hooks');

const obs = new PerformanceObserver((list) => {
  list.getEntries().forEach(entry => {
    // kind 2 = Mark-Sweep-Compact
    if (entry.detail.kind === 2) {
      console.log(`Major GC: ${entry.duration.toFixed(2)}ms`);
    }
  });
});

obs.observe({ entryTypes: ['gc'] });
```

```bash
# 详细 GC 日志
node --trace-gc --trace-gc-verbose app.js

# 输出示例：
# [12345:0x...] 1234 ms: Mark-sweep 100.5 (120.0) -> 80.2 (120.0) MB, 
#   45.3 / 0.0 ms (+ 5.2 ms in 12 steps since start of marking, 
#   biggest step 2.1 ms) ...
```

## 优化策略

### 减少老生代GC频率

```javascript
// 避免大对象频繁创建
// Bad: 每次请求创建大缓冲区
function handleRequest(data) {
  const buffer = Buffer.alloc(1024 * 1024);  // 1MB，直接进老生代
  // ...
}

// Good: 复用缓冲区
const sharedBuffer = Buffer.alloc(1024 * 1024);
function handleRequest(data) {
  sharedBuffer.fill(0);  // 清空复用
  // ...
}
```

### 控制对象生命周期

```javascript
// 避免意外的长生命周期
class Service {
  constructor() {
    this.cache = new Map();
  }
  
  // Bad: cache 无限增长，对象无法回收
  getData(key) {
    if (!this.cache.has(key)) {
      this.cache.set(key, fetchData(key));
    }
    return this.cache.get(key);
  }
  
  // Good: 限制缓存大小
  getData(key) {
    if (!this.cache.has(key)) {
      if (this.cache.size >= 1000) {
        // 删除最旧的条目
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }
      this.cache.set(key, fetchData(key));
    }
    return this.cache.get(key);
  }
}
```

### 使用WeakMap/WeakSet

```javascript
// 使用 WeakMap 避免内存泄漏
const metadata = new WeakMap();

function attachMetadata(obj, data) {
  metadata.set(obj, data);
  // 当 obj 被回收时，metadata 中的条目也会被回收
}

// 对比：普通 Map 会阻止对象回收
const badMetadata = new Map();
function attachMetadata(obj, data) {
  badMetadata.set(obj, data);
  // obj 被 Map 引用，永远不会被回收！
}
```

## Mark-Sweep vs Scavenge 对比

```
┌──────────────────┬────────────────────┬────────────────────┐
│      特性         │     Scavenge       │  Mark-Sweep-Compact│
├──────────────────┼────────────────────┼────────────────────┤
│ 空间利用率        │       50%          │       ~100%        │
├──────────────────┼────────────────────┼────────────────────┤
│ 适合场景          │ 低存活率（新生代）   │ 高存活率（老生代）  │
├──────────────────┼────────────────────┼────────────────────┤
│ 暂停时间          │ 短（< 1ms）        │ 长（10-100+ms）    │
├──────────────────┼────────────────────┼────────────────────┤
│ 碎片             │ 无                 │ 有（需整理）        │
├──────────────────┼────────────────────┼────────────────────┤
│ 分配速度          │ 快（指针移动）      │ 较慢（空闲链表）    │
└──────────────────┴────────────────────┴────────────────────┘
```

## 小结

Mark-Sweep-Compact是V8老生代GC的核心算法：

- **Mark**：三色标记识别存活对象
- **Sweep**：回收未标记对象，维护空闲链表
- **Compact**：消除碎片（可选，按需执行）

关键特性：
- 空间利用率高，适合大堆
- 暂停时间与堆大小相关
- 碎片化需要整理来解决

优化建议：
- 复用大对象
- 控制缓存大小
- 使用WeakMap/WeakSet

下一章，我们将探讨V8如何通过**增量标记**和**并发回收**来减少GC暂停时间，让大堆的应用也能保持良好的响应性。
