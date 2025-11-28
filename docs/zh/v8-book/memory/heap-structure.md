# V8 的堆结构：新生代与老生代

当你创建一个JavaScript对象时，V8是如何为它分配内存的？为什么有些对象会很快被回收，而有些对象却能长期存活？理解V8的堆结构，是掌握内存管理的第一步。

V8的堆内存采用分代回收策略，将对象分为新生代和老生代，针对不同生命周期的对象采用不同的回收算法。本章将深入V8的堆结构设计，揭示这种分代策略背后的智慧。

## 堆内存的整体布局

V8的堆内存主要分为以下几个区域：

```javascript
// 模拟V8的堆结构
class V8Heap {
  constructor() {
    // 新生代空间（1-8 MB，默认配置）
    this.newSpace = {
      from: new SemiSpace(1 * 1024 * 1024),  // From空间
      to: new SemiSpace(1 * 1024 * 1024),    // To空间
      // 新对象分配指针
      allocationPointer: 0,
      // 空间使用统计
      used: 0,
      capacity: 2 * 1024 * 1024
    };
    
    // 老生代空间（根据堆大小动态调整）
    this.oldSpace = {
      // 用于存储普通对象
      oldPointerSpace: [],
      // 用于存储只包含数据的对象
      oldDataSpace: [],
      // 空间使用统计
      used: 0,
      capacity: 100 * 1024 * 1024
    };
    
    // 大对象空间（存储超过阈值的对象）
    this.largeObjectSpace = {
      objects: new Map(),
      threshold: 512 * 1024,  // 512 KB阈值
      used: 0
    };
    
    // 代码空间（存储编译后的代码）
    this.codeSpace = {
      code: [],
      used: 0,
      capacity: 16 * 1024 * 1024
    };
    
    // Map空间（存储隐藏类）
    this.mapSpace = {
      maps: [],
      used: 0
    };
  }
  
  // 分配对象
  allocate(size, isLarge = false) {
    if (isLarge || size > this.largeObjectSpace.threshold) {
      return this.allocateInLargeObjectSpace(size);
    }
    
    return this.allocateInNewSpace(size);
  }
  
  allocateInNewSpace(size) {
    const space = this.newSpace.from;
    
    // 检查是否有足够空间
    if (this.newSpace.allocationPointer + size > space.capacity) {
      // 触发Minor GC
      this.minorGC();
    }
    
    // 分配对象
    const address = this.newSpace.allocationPointer;
    this.newSpace.allocationPointer += size;
    this.newSpace.used += size;
    
    return { address, size, generation: 'new' };
  }
  
  allocateInLargeObjectSpace(size) {
    const obj = { address: Date.now(), size };
    this.largeObjectSpace.objects.set(obj.address, obj);
    this.largeObjectSpace.used += size;
    
    return { ...obj, generation: 'large' };
  }
  
  minorGC() {
    // Minor GC的实现（详见下一章）
    console.log('Minor GC triggered');
  }
}

// 半空间数据结构
class SemiSpace {
  constructor(capacity) {
    this.capacity = capacity;
    this.memory = new ArrayBuffer(capacity);
    this.used = 0;
  }
  
  reset() {
    this.used = 0;
  }
}

// 测试堆分配
const heap = new V8Heap();

// 分配小对象（进入新生代）
const smallObj = heap.allocate(100);
console.log('Small object:', smallObj);
// Small object: { address: 0, size: 100, generation: 'new' }

// 分配大对象（直接进入大对象空间）
const largeObj = heap.allocate(600 * 1024);
console.log('Large object:', largeObj);
// Large object: { address: 1234567890, size: 614400, generation: 'large' }
```

## 新生代：From空间与To空间

新生代采用**Scavenge算法**，使用两个半空间（From和To）进行垃圾回收：

```javascript
// 新生代的详细实现
class NewGeneration {
  constructor(size = 1024 * 1024) {
    this.sizePerSemispace = size;
    
    // From空间：对象分配区
    this.fromSpace = {
      memory: new ArrayBuffer(size),
      allocationPointer: 0,
      objects: []
    };
    
    // To空间：GC时的复制目标
    this.toSpace = {
      memory: new ArrayBuffer(size),
      allocationPointer: 0,
      objects: []
    };
    
    // 晋升计数器
    this.promotionCounter = new WeakMap();
    
    // 晋升阈值（对象经历GC的次数）
    this.promotionThreshold = 2;
  }
  
  allocate(size) {
    const from = this.fromSpace;
    
    // 检查空间是否足够
    if (from.allocationPointer + size > this.sizePerSemispace) {
      // 空间不足，触发GC
      this.scavenge();
      
      // GC后重试
      if (from.allocationPointer + size > this.sizePerSemispace) {
        throw new Error('Out of memory');
      }
    }
    
    // 分配对象
    const obj = {
      address: from.allocationPointer,
      size: size,
      data: null,
      age: 0  // GC经历次数
    };
    
    from.allocationPointer += size;
    from.objects.push(obj);
    
    return obj;
  }
  
  scavenge() {
    console.log('Scavenge GC started');
    
    // 1. 遍历From空间的存活对象
    const survivingObjects = this.markLiveObjects();
    
    // 2. 复制存活对象到To空间
    for (const obj of survivingObjects) {
      obj.age++;  // 增加年龄
      
      // 判断是否晋升
      if (this.shouldPromote(obj)) {
        this.promoteToOldGeneration(obj);
      } else {
        this.copyToToSpace(obj);
      }
    }
    
    // 3. 交换From和To空间
    this.swapSpaces();
    
    console.log('Scavenge GC completed');
  }
  
  markLiveObjects() {
    // 简化：假设所有对象都被引用
    return this.fromSpace.objects.filter(obj => obj.data !== null);
  }
  
  shouldPromote(obj) {
    // 晋升条件：
    // 1. 对象年龄达到阈值
    // 2. To空间使用率超过25%
    return obj.age >= this.promotionThreshold ||
           this.toSpace.allocationPointer > this.sizePerSemispace * 0.25;
  }
  
  copyToToSpace(obj) {
    // 复制到To空间
    obj.address = this.toSpace.allocationPointer;
    this.toSpace.allocationPointer += obj.size;
    this.toSpace.objects.push(obj);
  }
  
  promoteToOldGeneration(obj) {
    console.log(`Promoting object ${obj.address} to old generation`);
    // 实际实现中会将对象移动到老生代
  }
  
  swapSpaces() {
    // 清空From空间
    this.fromSpace.allocationPointer = 0;
    this.fromSpace.objects = [];
    
    // 交换From和To空间
    [this.fromSpace, this.toSpace] = [this.toSpace, this.fromSpace];
  }
}

// 测试新生代GC
const newGen = new NewGeneration(1024);  // 1KB空间用于测试

// 分配对象直到触发GC
try {
  for (let i = 0; i < 20; i++) {
    const obj = newGen.allocate(100);
    obj.data = `Object ${i}`;  // 保持引用
    console.log(`Allocated object ${i} at address ${obj.address}`);
  }
} catch (e) {
  console.log(e.message);
}
```

## 老生代：标记-清除-压缩

老生代空间存储长期存活的对象，使用**Mark-Sweep-Compact算法**：

```javascript
// 老生代的实现
class OldGeneration {
  constructor(capacity = 100 * 1024 * 1024) {
    this.capacity = capacity;
    this.used = 0;
    
    // 对象列表
    this.objects = [];
    
    // 标记位图
    this.markBitmap = new Map();
    
    // 碎片率阈值
    this.fragmentationThreshold = 0.3;
  }
  
  allocate(size) {
    // 查找合适的空闲空间
    let address = this.findFreeSpace(size);
    
    if (address === -1) {
      // 空间不足，触发Major GC
      this.majorGC();
      address = this.findFreeSpace(size);
      
      if (address === -1) {
        throw new Error('Out of memory');
      }
    }
    
    const obj = {
      address,
      size,
      data: null
    };
    
    this.objects.push(obj);
    this.used += size;
    
    return obj;
  }
  
  findFreeSpace(size) {
    // 简化实现：使用first-fit策略
    // 实际V8使用更复杂的空闲列表管理
    let currentAddress = 0;
    
    for (const obj of this.objects.sort((a, b) => a.address - b.address)) {
      if (obj.address - currentAddress >= size) {
        return currentAddress;
      }
      currentAddress = obj.address + obj.size;
    }
    
    // 检查末尾是否有空间
    if (this.capacity - currentAddress >= size) {
      return currentAddress;
    }
    
    return -1;
  }
  
  majorGC() {
    console.log('Major GC started');
    
    // 1. 标记阶段：标记所有存活对象
    this.markPhase();
    
    // 2. 清除阶段：回收未标记的对象
    this.sweepPhase();
    
    // 3. 压缩阶段：整理内存碎片（如果碎片率高）
    if (this.calculateFragmentation() > this.fragmentationThreshold) {
      this.compactPhase();
    }
    
    console.log('Major GC completed');
  }
  
  markPhase() {
    // 标记所有存活对象
    this.markBitmap.clear();
    
    for (const obj of this.objects) {
      if (obj.data !== null) {  // 简化：检查是否被引用
        this.markBitmap.set(obj.address, true);
      }
    }
  }
  
  sweepPhase() {
    // 清除未标记的对象
    const beforeCount = this.objects.length;
    
    this.objects = this.objects.filter(obj => {
      const isMarked = this.markBitmap.get(obj.address);
      if (!isMarked) {
        this.used -= obj.size;
      }
      return isMarked;
    });
    
    console.log(`Swept ${beforeCount - this.objects.length} objects`);
  }
  
  compactPhase() {
    console.log('Compacting memory');
    
    // 按地址排序
    this.objects.sort((a, b) => a.address - b.address);
    
    // 移动对象，消除碎片
    let currentAddress = 0;
    
    for (const obj of this.objects) {
      if (obj.address !== currentAddress) {
        // 移动对象
        console.log(`Moving object from ${obj.address} to ${currentAddress}`);
        obj.address = currentAddress;
      }
      currentAddress += obj.size;
    }
  }
  
  calculateFragmentation() {
    if (this.used === 0) return 0;
    
    // 计算碎片率：(总空间 - 已用空间) / 总空间
    const fragmented = this.capacity - this.used;
    return fragmented / this.capacity;
  }
}

// 测试老生代GC
const oldGen = new OldGeneration(10000);  // 10KB空间用于测试

// 分配对象
for (let i = 0; i < 10; i++) {
  const obj = oldGen.allocate(500);
  obj.data = `Old object ${i}`;
}

console.log('Before GC:', {
  objectCount: oldGen.objects.length,
  used: oldGen.used
});

// 释放一些对象的引用
for (let i = 0; i < 5; i++) {
  oldGen.objects[i * 2].data = null;
}

// 触发GC
oldGen.majorGC();

console.log('After GC:', {
  objectCount: oldGen.objects.length,
  used: oldGen.used,
  fragmentation: oldGen.calculateFragmentation()
});
```

## 对象的晋升机制

对象从新生代晋升到老生代有两个条件：

```javascript
// 晋升策略的实现
class PromotionStrategy {
  constructor() {
    // 对象年龄阈值
    this.ageThreshold = 2;
    
    // To空间使用率阈值
    this.toSpaceThreshold = 0.25;
  }
  
  shouldPromote(obj, toSpaceUsage, toSpaceCapacity) {
    // 条件1：对象年龄达到阈值
    if (obj.age >= this.ageThreshold) {
      return {
        promote: true,
        reason: 'age_threshold'
      };
    }
    
    // 条件2：To空间使用率过高
    const toSpaceRatio = toSpaceUsage / toSpaceCapacity;
    if (toSpaceRatio > this.toSpaceThreshold) {
      return {
        promote: true,
        reason: 'to_space_overflow'
      };
    }
    
    return {
      promote: false,
      reason: 'stay_in_new_generation'
    };
  }
  
  // 模拟晋升过程
  simulate() {
    const objects = [
      { id: 1, age: 0, size: 100 },
      { id: 2, age: 1, size: 100 },
      { id: 3, age: 2, size: 100 },
      { id: 4, age: 3, size: 100 }
    ];
    
    const toSpaceCapacity = 1024;
    let toSpaceUsage = 0;
    
    for (const obj of objects) {
      const decision = this.shouldPromote(obj, toSpaceUsage, toSpaceCapacity);
      
      console.log(`Object ${obj.id} (age: ${obj.age}):`, decision);
      
      if (!decision.promote) {
        toSpaceUsage += obj.size;
      }
    }
  }
}

const strategy = new PromotionStrategy();
strategy.simulate();
// Object 1 (age: 0): { promote: false, reason: 'stay_in_new_generation' }
// Object 2 (age: 1): { promote: false, reason: 'stay_in_new_generation' }
// Object 3 (age: 2): { promote: true, reason: 'age_threshold' }
// Object 4 (age: 3): { promote: true, reason: 'age_threshold' }
```

## 大对象空间

超过一定大小的对象直接分配到大对象空间，避免频繁复制：

```javascript
// 大对象空间的实现
class LargeObjectSpace {
  constructor() {
    // 大对象阈值（512 KB）
    this.threshold = 512 * 1024;
    
    // 大对象列表
    this.objects = new Map();
    
    // 使用统计
    this.used = 0;
  }
  
  allocate(size) {
    if (size < this.threshold) {
      throw new Error('Object too small for large object space');
    }
    
    // 为大对象分配独立页
    const obj = {
      address: Date.now(),  // 模拟分配
      size: size,
      pages: Math.ceil(size / (4 * 1024)),  // 4KB页
      data: null
    };
    
    this.objects.set(obj.address, obj);
    this.used += size;
    
    console.log(`Allocated large object: ${size} bytes (${obj.pages} pages)`);
    
    return obj;
  }
  
  free(address) {
    const obj = this.objects.get(address);
    if (obj) {
      this.used -= obj.size;
      this.objects.delete(address);
      console.log(`Freed large object: ${obj.size} bytes`);
    }
  }
  
  // 大对象空间的GC
  collect() {
    console.log('Large object space GC');
    
    const beforeCount = this.objects.size;
    
    // 检查并回收未引用的大对象
    for (const [address, obj] of this.objects.entries()) {
      if (obj.data === null) {
        this.free(address);
      }
    }
    
    console.log(`Collected ${beforeCount - this.objects.size} large objects`);
  }
}

// 测试大对象空间
const los = new LargeObjectSpace();

// 分配大对象
const largeObj1 = los.allocate(600 * 1024);
largeObj1.data = new ArrayBuffer(600 * 1024);

const largeObj2 = los.allocate(1024 * 1024);
largeObj2.data = new ArrayBuffer(1024 * 1024);

console.log('Total used:', los.used);

// 释放引用
largeObj1.data = null;

// GC
los.collect();

console.log('After GC:', los.used);
```

## 堆大小的动态调整

V8根据堆使用情况动态调整堆大小：

```javascript
// 堆大小管理器
class HeapSizeManager {
  constructor() {
    // 初始堆大小
    this.initialSize = 16 * 1024 * 1024;  // 16 MB
    
    // 最大堆大小（64位：1.4GB，32位：700MB）
    this.maxSize = 1400 * 1024 * 1024;
    
    // 当前堆大小
    this.currentSize = this.initialSize;
    
    // 增长因子
    this.growthFactor = 2;
    
    // 收缩阈值
    this.shrinkThreshold = 0.3;
  }
  
  shouldGrow(used) {
    // 使用率超过75%时增长
    const usageRatio = used / this.currentSize;
    return usageRatio > 0.75 && this.currentSize < this.maxSize;
  }
  
  shouldShrink(used) {
    // 使用率低于30%时收缩
    const usageRatio = used / this.currentSize;
    return usageRatio < this.shrinkThreshold && 
           this.currentSize > this.initialSize;
  }
  
  grow() {
    const newSize = Math.min(
      this.currentSize * this.growthFactor,
      this.maxSize
    );
    
    console.log(`Heap growing: ${this.currentSize} -> ${newSize}`);
    this.currentSize = newSize;
  }
  
  shrink() {
    const newSize = Math.max(
      this.currentSize / this.growthFactor,
      this.initialSize
    );
    
    console.log(`Heap shrinking: ${this.currentSize} -> ${newSize}`);
    this.currentSize = newSize;
  }
  
  // 模拟堆大小调整
  simulate() {
    const usageScenarios = [
      { used: 10 * 1024 * 1024, label: 'Low usage' },
      { used: 14 * 1024 * 1024, label: 'High usage' },
      { used: 3 * 1024 * 1024, label: 'After GC' }
    ];
    
    for (const scenario of usageScenarios) {
      console.log(`\n${scenario.label}: ${scenario.used} bytes`);
      
      if (this.shouldGrow(scenario.used)) {
        this.grow();
      } else if (this.shouldShrink(scenario.used)) {
        this.shrink();
      } else {
        console.log(`Heap size stable: ${this.currentSize}`);
      }
    }
  }
}

const heapManager = new HeapSizeManager();
heapManager.simulate();
```

## 性能影响分析

不同的分配策略会影响性能：

```javascript
// 性能测试
function performanceTest() {
  const iterations = 100000;
  
  // 测试1：小对象分配（新生代）
  console.time('Small objects');
  const smallObjects = [];
  for (let i = 0; i < iterations; i++) {
    smallObjects.push({ x: i });
  }
  console.timeEnd('Small objects');
  
  // 测试2：大对象分配（大对象空间）
  console.time('Large objects');
  const largeObjects = [];
  for (let i = 0; i < 100; i++) {
    largeObjects.push(new Array(100000).fill(i));
  }
  console.timeEnd('Large objects');
  
  // 测试3：混合分配
  console.time('Mixed allocation');
  const mixed = [];
  for (let i = 0; i < 1000; i++) {
    if (i % 10 === 0) {
      mixed.push(new Array(10000).fill(i));
    } else {
      mixed.push({ index: i });
    }
  }
  console.timeEnd('Mixed allocation');
}

performanceTest();
// 典型结果：
// Small objects: ~10ms
// Large objects: ~50ms
// Mixed allocation: ~15ms
```

## 内存使用优化建议

基于V8的堆结构，以下是一些优化建议：

```javascript
// 优化示例
class MemoryOptimization {
  // 1. 避免创建大量临时对象
  badPractice() {
    for (let i = 0; i < 10000; i++) {
      const temp = { x: i, y: i * 2 };  // 频繁分配
      console.log(temp.x + temp.y);
    }
  }
  
  goodPractice() {
    const reusable = { x: 0, y: 0 };  // 重用对象
    for (let i = 0; i < 10000; i++) {
      reusable.x = i;
      reusable.y = i * 2;
      console.log(reusable.x + reusable.y);
    }
  }
  
  // 2. 对象池技术
  createObjectPool(size) {
    const pool = [];
    for (let i = 0; i < size; i++) {
      pool.push({ x: 0, y: 0, inUse: false });
    }
    return pool;
  }
  
  acquireFromPool(pool) {
    return pool.find(obj => !obj.inUse);
  }
  
  releaseToPool(obj) {
    obj.inUse = false;
  }
  
  // 3. 及时释放大对象
  processLargeData() {
    let data = new Array(1000000).fill(0);
    // 处理数据
    data = null;  // 立即释放引用
  }
}
```

## 本章小结

本章深入探讨了V8的堆结构设计。我们学习了以下核心内容：

1. **分代策略**：新生代和老生代采用不同的回收算法，针对对象生命周期优化。

2. **新生代结构**：使用From/To半空间和Scavenge算法，快速回收短生命周期对象。

3. **老生代结构**：使用Mark-Sweep-Compact算法，高效管理长生命周期对象。

4. **晋升机制**：对象年龄和To空间使用率决定对象是否晋升到老生代。

5. **大对象空间**：超过阈值的对象单独管理，避免复制开销。

6. **动态调整**：堆大小根据使用情况动态增长和收缩，平衡性能和内存占用。

理解V8的堆结构，能够帮助你更好地管理内存，避免性能问题。在下一章中，我们将深入探讨垃圾回收算法的具体实现。
