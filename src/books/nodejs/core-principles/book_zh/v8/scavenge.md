# 新生代垃圾回收：Scavenge算法

上一章我们了解了V8的分代回收策略。新生代专门用于存放"朝生夕死"的对象，这些对象的特点是数量多、生命周期短。那么，如何快速高效地回收这些对象呢？

V8的答案是**Scavenge算法**——一种以空间换时间的回收策略。

## Scavenge核心思想

Scavenge基于**Cheney算法**，其核心思想是将新生代空间一分为二：

```
┌─────────────────────────────────────────────────────┐
│                     New Space                        │
├─────────────────────────┬───────────────────────────┤
│       From Space        │        To Space           │
│       (活跃半区)          │       (空闲半区)          │
│                         │                           │
│   ┌───┐ ┌───┐ ┌───┐   │                           │
│   │ A │ │ B │ │ C │   │       (完全空闲)           │
│   └───┘ └───┘ └───┘   │                           │
│                         │                           │
└─────────────────────────┴───────────────────────────┘
```

- **From Space**：当前正在使用的空间，新对象在此分配
- **To Space**：空闲空间，用于GC时存放存活对象

## Scavenge执行过程

让我们一步步看Scavenge是如何工作的：

### 步骤1：初始状态

```javascript
// 假设已创建这些对象
const a = { name: 'A' };  // 仍在使用
const b = { name: 'B' };  // 仍在使用
// c 已经不再使用（没有引用）
```

```
From Space:
┌───────────────────────────────────────┐
│  ┌───┐   ┌───┐   ┌───┐   ┌───┐      │
│  │ A │   │ B │   │ C │   │...│      │
│  │ ✓ │   │ ✓ │   │ ✗ │   │   │      │
│  └───┘   └───┘   └───┘   └───┘      │
│  活跃      活跃     垃圾               │
└───────────────────────────────────────┘

To Space:
┌───────────────────────────────────────┐
│                                       │
│              (完全空闲)                 │
│                                       │
└───────────────────────────────────────┘
```

### 步骤2：遍历并复制存活对象

从GC Roots出发，将可达对象复制到To Space：

```
From Space:                    To Space:
┌──────────────────────┐      ┌──────────────────────┐
│  ┌───┐   ┌───┐      │      │  ┌───┐   ┌───┐      │
│  │ A │──────────────────────→│ A'│   │ B'│      │
│  └───┘   │   │      │      │  └───┘   └───┘      │
│          │   │      │      │                      │
│          │ B │──────────────────────→             │
│          └───┘      │      │                      │
│  ┌───┐              │      │                      │
│  │ C │ (不可达)     │      │                      │
│  └───┘              │      │                      │
└──────────────────────┘      └──────────────────────┘
```

### 步骤3：交换From和To

回收完成后，交换两个空间的角色：

```
原 To Space → 新 From Space:
┌──────────────────────┐
│  ┌───┐   ┌───┐      │
│  │ A │   │ B │      │  ← 现在是活跃空间
│  └───┘   └───┘      │
│                      │
└──────────────────────┘

原 From Space → 新 To Space:
┌──────────────────────┐
│                      │
│      (清空后空闲)      │  ← 下次GC使用
│                      │
└──────────────────────┘
```

## 为什么Scavenge高效？

### 优势1：只处理存活对象

传统的Mark-Sweep需要遍历整个堆来清除死对象。Scavenge只复制活对象，跳过死对象：

```
假设 1000 个对象，90% 是垃圾：

Mark-Sweep 工作量：
  标记 100 个活对象
  清除 900 个死对象
  总操作：1000 次

Scavenge 工作量：
  复制 100 个活对象
  总操作：100 次
```

新生代中大部分对象都是短命的，Scavenge的效率优势非常明显。

### 优势2：自动整理内存

复制过程中，对象自然地紧凑排列，没有碎片：

```
整理前（碎片化）：
┌───┬───┬───┬───┬───┬───┬───┬───┐
│ A │   │ B │   │   │ C │   │ D │
└───┴───┴───┴───┴───┴───┴───┴───┘

复制后（紧凑）：
┌───┬───┬───┬───┬───────────────┐
│ A │ B │ C │ D │    free       │
└───┴───┴───┴───┴───────────────┘
```

### 优势3：分配极快

由于空间紧凑，分配新对象只需移动指针：

```javascript
// 分配过程（简化）
class Allocator {
  constructor(space) {
    this.space = space;
    this.ptr = space.start;  // 当前分配位置
  }
  
  allocate(size) {
    if (this.ptr + size > this.space.end) {
      return null;  // 空间不足，需要GC
    }
    const result = this.ptr;
    this.ptr += size;  // 只是指针移动！
    return result;
  }
}
```

这种分配方式叫**Bump Pointer Allocation**，只需一次指针运算。

### 劣势：空间利用率

牺牲了50%的空间：

```
可用空间 = 新生代总大小 / 2

例如：新生代 8MB → 实际可用 4MB
```

但由于新生代本身较小（默认1-8MB），这个代价是可接受的。

## Cheney算法详解

Scavenge使用的Cheney算法是一种**广度优先**的复制算法：

```javascript
// Cheney 算法伪代码
function scavenge(fromSpace, toSpace, roots) {
  // 1. 初始化 To Space 的两个指针
  let allocationPtr = toSpace.start;  // 分配指针
  let scanPtr = toSpace.start;        // 扫描指针
  
  // 2. 复制根对象到 To Space
  for (const root of roots) {
    if (isInFromSpace(root.target)) {
      root.target = copyObject(root.target, toSpace, allocationPtr);
      allocationPtr += root.target.size;
    }
  }
  
  // 3. 扫描 To Space 中的对象，复制它们引用的对象
  while (scanPtr < allocationPtr) {
    const obj = getObjectAt(scanPtr);
    
    for (const field of obj.fields) {
      if (isInFromSpace(field.target)) {
        field.target = copyObject(field.target, toSpace, allocationPtr);
        allocationPtr += field.target.size;
      }
    }
    
    scanPtr += obj.size;
  }
  
  // 4. 交换 From 和 To
  swap(fromSpace, toSpace);
}

function copyObject(obj, toSpace, ptr) {
  // 检查是否已复制（避免重复）
  if (obj.forwardingPtr) {
    return obj.forwardingPtr;
  }
  
  // 复制到 To Space
  const newLocation = ptr;
  memcpy(newLocation, obj, obj.size);
  
  // 设置转发指针
  obj.forwardingPtr = newLocation;
  
  return newLocation;
}
```

### 双指针机制

Cheney算法的精妙之处在于使用两个指针来避免显式的队列：

```
To Space:
┌─────────────────────────────────────────────────┐
│                                                 │
│  scanPtr                      allocationPtr     │
│     ↓                              ↓            │
│  ┌───┬───┬───┬───┬───┬───────────────────┐    │
│  │ A │ B │ C │ D │ E │      free         │    │
│  └───┴───┴───┴───┴───┴───────────────────┘    │
│  │←── 已扫描 ──→│←─ 待扫描 ─→│                  │
│                                                 │
└─────────────────────────────────────────────────┘

扫描过程：
1. scanPtr 指向当前正在扫描的对象
2. 扫描发现新的存活对象，复制到 allocationPtr 位置
3. allocationPtr 向后移动
4. scanPtr 扫描完当前对象后向后移动
5. 当 scanPtr == allocationPtr 时，扫描结束
```

### 转发指针

避免重复复制同一个对象：

```
初始状态：
From Space:          To Space:
┌───────┐            ┌───────┐
│ obj   │            │       │
│       │            │       │
└───────┘            └───────┘

第一次复制后：
From Space:          To Space:
┌───────┐            ┌───────┐
│forward├────────────→│ obj' │
│  ptr  │            │       │
└───────┘            └───────┘

第二次访问：
发现已有转发指针，直接使用新地址
```

## 对象晋升机制

如果一个对象在多次Scavenge中存活，说明它可能是长命对象，应该移到老生代：

### 晋升条件

```javascript
// V8 的晋升策略（简化）
function shouldPromote(obj) {
  // 条件1：经历过一次 Scavenge 存活
  if (obj.age >= 1) {
    return true;
  }
  
  // 条件2：To Space 使用率超过 25%
  if (toSpace.usedRatio > 0.25) {
    return true;
  }
  
  return false;
}
```

### 晋升过程

```
第一次 Scavenge:
From Space:          To Space:
┌───────┐            ┌───────┐
│ obj   │ ─────────→ │ obj'  │  age: 0 → 1
└───────┘            └───────┘

第二次 Scavenge:
From Space:          To Space:           Old Space:
┌───────┐            ┌───────┐           ┌───────┐
│ obj'  │ ───────────────────────────────→│ obj'' │
└───────┘            └───────┘           └───────┘
                                          ↑
                                     晋升到老生代
```

### 晋升阈值调优

```bash
# 调整晋升年龄（默认为1，即存活一次就晋升）
# V8 内部参数，通常不需要调整

# 调整新生代大小
node --max-semi-space-size=16 app.js  # 每个半区 16MB
```

## 写屏障：跨代引用问题

当老生代对象引用新生代对象时，会产生跨代引用问题：

```javascript
// 场景：老生代对象引用新生代对象
const cache = {};  // 假设 cache 已晋升到老生代

function addEntry(key, value) {
  cache[key] = { data: value };  // 新对象在新生代
}
```

### 问题

Scavenge只扫描GC Roots和新生代：

```
Old Space:           New Space:
┌───────────┐        ┌───────────┐
│  cache    │────────→│  entry   │
│ (不扫描)   │        │ (需要保留) │
└───────────┘        └───────────┘
                          ↑
              如何知道这个对象是活的？
```

### 解决方案：记忆集（Remembered Set）

V8维护一个记忆集，记录所有"老生代 → 新生代"的引用：

```
┌────────────────────────────────────────┐
│           Remembered Set               │
├────────────────────────────────────────┤
│  cache.entry  →  新生代地址 0x1234     │
│  config.temp  →  新生代地址 0x5678     │
│  ...                                   │
└────────────────────────────────────────┘
```

### 写屏障（Write Barrier）

每次老生代对象的写操作都会检查并更新记忆集：

```javascript
// 写屏障伪代码
function writeField(obj, field, value) {
  // 原始写操作
  obj[field] = value;
  
  // 写屏障
  if (isInOldSpace(obj) && isInNewSpace(value)) {
    rememberedSet.add({ obj, field, value });
  }
}
```

Scavenge时，记忆集中的引用也被当作GC Roots：

```
Scavenge Roots = 正常的 GC Roots + Remembered Set
```

## 性能特征

### Scavenge性能数据

```javascript
const v8 = require('v8');
const { PerformanceObserver } = require('perf_hooks');

// 监控 Scavenge
const obs = new PerformanceObserver((list) => {
  list.getEntries().forEach(entry => {
    if (entry.detail.kind === 1) {  // 1 = Scavenge
      console.log(`Scavenge: ${entry.duration.toFixed(2)}ms`);
    }
  });
});
obs.observe({ entryTypes: ['gc'] });

// 典型结果：
// Scavenge: 0.5ms
// Scavenge: 0.3ms
// Scavenge: 0.8ms
// 通常在 1ms 以内
```

### 触发频率

```javascript
// 高分配率 = 频繁 Scavenge
function highAllocation() {
  for (let i = 0; i < 100000; i++) {
    const temp = { x: i };  // 每次循环分配新对象
  }
}

// 低分配率 = 少量 Scavenge
function lowAllocation() {
  const buffer = { x: 0 };
  for (let i = 0; i < 100000; i++) {
    buffer.x = i;  // 复用对象
  }
}
```

### 调优建议

```bash
# 增大新生代空间，减少 Scavenge 频率
node --max-semi-space-size=32 app.js

# 观察效果
node --trace-gc --max-semi-space-size=32 app.js
```

## 实战：对象池模式

减少分配是避免频繁Scavenge的最佳策略：

```javascript
class ObjectPool {
  constructor(factory, initialSize = 100) {
    this.factory = factory;
    this.pool = [];
    
    // 预分配对象
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(factory());
    }
  }
  
  acquire() {
    return this.pool.pop() || this.factory();
  }
  
  release(obj) {
    // 重置对象状态
    this.reset(obj);
    this.pool.push(obj);
  }
  
  reset(obj) {
    // 清理对象，准备复用
    for (const key in obj) {
      obj[key] = null;
    }
  }
}

// 使用示例
const pointPool = new ObjectPool(() => ({ x: 0, y: 0 }));

function processPoints(data) {
  const results = [];
  
  for (const item of data) {
    const point = pointPool.acquire();
    point.x = item.x;
    point.y = item.y;
    
    // 处理...
    results.push(transform(point));
    
    pointPool.release(point);  // 归还对象池
  }
  
  return results;
}
```

## 小结

Scavenge算法是V8新生代回收的核心：

- **空间换时间**：牺牲50%空间，获得O(存活对象)的复制效率
- **Cheney算法**：双指针广度优先遍历，避免递归开销
- **转发指针**：防止重复复制，正确更新引用
- **晋升机制**：存活足够久的对象进入老生代
- **写屏障**：处理跨代引用，维护记忆集

理解Scavenge的工作原理，能帮助我们：
- 理解为什么短命对象对GC友好
- 理解对象池模式的价值
- 合理配置新生代大小

下一章，我们将探讨老生代的Mark-Sweep-Compact算法，了解长命对象是如何被回收的。
