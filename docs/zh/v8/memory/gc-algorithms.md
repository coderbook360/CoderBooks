# 垃圾回收算法：Scavenge 与 Mark-Sweep-Compact

你有没有想过，V8是如何知道哪些对象可以被回收的？为什么新生代和老生代要使用不同的回收算法？垃圾回收的停顿时间能有多短?

垃圾回收是V8内存管理的核心，不同的回收算法针对不同特性的对象进行优化。本章将深入解析V8的三大回收算法，揭示它们的实现原理和性能权衡。

## Scavenge算法：新生代的快速回收

Scavenge算法基于Cheney算法，使用半空间复制策略快速回收新生代对象：

```javascript
// Scavenge算法的完整实现
class ScavengeGC {
  constructor(semiSpaceSize = 1024 * 1024) {
    this.semiSpaceSize = semiSpaceSize;
    
    // From空间：当前活跃空间
    this.fromSpace = {
      memory: new ArrayBuffer(semiSpaceSize),
      allocationPointer: 0,
      objects: []
    };
    
    // To空间：GC时的目标空间
    this.toSpace = {
      memory: new ArrayBuffer(semiSpaceSize),
      allocationPointer: 0,
      objects: []
    };
    
    // 根对象集合
    this.roots = new Set();
    
    // 转发地址映射
    this.forwardingAddresses = new Map();
    
    // GC统计
    this.stats = {
      collections: 0,
      totalPauseTime: 0,
      objectsCopied: 0,
      objectsPromoted: 0
    };
  }
  
  // 分配对象
  allocate(size, isRoot = false) {
    const from = this.fromSpace;
    
    // 空间不足，触发GC
    if (from.allocationPointer + size > this.semiSpaceSize) {
      this.collect();
      
      // GC后仍不足，抛出异常
      if (from.allocationPointer + size > this.semiSpaceSize) {
        throw new Error('Out of memory');
      }
    }
    
    // 创建对象
    const obj = {
      address: from.allocationPointer,
      size: size,
      age: 0,
      data: null,
      references: []  // 对象引用的其他对象
    };
    
    from.allocationPointer += size;
    from.objects.push(obj);
    
    // 记录根对象
    if (isRoot) {
      this.roots.add(obj);
    }
    
    return obj;
  }
  
  // 执行Scavenge GC
  collect() {
    const startTime = Date.now();
    
    console.log('Scavenge GC started');
    console.log(`From space: ${this.fromSpace.objects.length} objects`);
    
    // 1. 清空转发地址表
    this.forwardingAddresses.clear();
    
    // 2. 处理根对象
    for (const root of this.roots) {
      this.copyObject(root);
    }
    
    // 3. 遍历To空间，处理引用对象（广度优先）
    let scanPointer = 0;
    while (scanPointer < this.toSpace.objects.length) {
      const obj = this.toSpace.objects[scanPointer];
      
      // 处理该对象引用的所有对象
      for (const ref of obj.references) {
        this.copyObject(ref);
      }
      
      scanPointer++;
    }
    
    // 4. 交换From和To空间
    this.swapSpaces();
    
    // 5. 更新统计信息
    this.stats.collections++;
    this.stats.totalPauseTime += Date.now() - startTime;
    
    console.log(`Scavenge GC completed in ${Date.now() - startTime}ms`);
    console.log(`Copied ${this.stats.objectsCopied} objects`);
  }
  
  // 复制对象到To空间
  copyObject(obj) {
    // 检查是否已经复制过
    if (this.forwardingAddresses.has(obj.address)) {
      return this.forwardingAddresses.get(obj.address);
    }
    
    // 判断是否晋升到老生代
    if (this.shouldPromote(obj)) {
      this.promoteToOldGeneration(obj);
      this.stats.objectsPromoted++;
      return null;
    }
    
    // 复制到To空间
    const newAddress = this.toSpace.allocationPointer;
    const newObj = {
      ...obj,
      address: newAddress,
      age: obj.age + 1
    };
    
    this.toSpace.allocationPointer += obj.size;
    this.toSpace.objects.push(newObj);
    
    // 记录转发地址
    this.forwardingAddresses.set(obj.address, newAddress);
    this.stats.objectsCopied++;
    
    return newAddress;
  }
  
  shouldPromote(obj) {
    // 晋升条件：年龄 >= 2 或 To空间使用率 > 25%
    return obj.age >= 2 || 
           this.toSpace.allocationPointer > this.semiSpaceSize * 0.25;
  }
  
  promoteToOldGeneration(obj) {
    console.log(`Promoting object at ${obj.address} to old generation`);
    // 实际实现中会移动到老生代
  }
  
  swapSpaces() {
    // From空间变成新的To空间（清空）
    this.fromSpace.allocationPointer = 0;
    this.fromSpace.objects = [];
    
    // 交换引用
    [this.fromSpace, this.toSpace] = [this.toSpace, this.fromSpace];
  }
}

// 测试Scavenge算法
const scavenge = new ScavengeGC(2048);  // 2KB空间用于测试

// 创建对象图
const root = scavenge.allocate(100, true);
root.data = 'Root';

const child1 = scavenge.allocate(50);
child1.data = 'Child 1';
root.references.push(child1);

const child2 = scavenge.allocate(50);
child2.data = 'Child 2';
root.references.push(child2);

const orphan = scavenge.allocate(50);
orphan.data = 'Orphan';  // 不被引用的对象

console.log('Before GC:', {
  fromObjects: scavenge.fromSpace.objects.length,
  fromUsed: scavenge.fromSpace.allocationPointer
});

// 手动触发GC
scavenge.collect();

console.log('After GC:', {
  fromObjects: scavenge.fromSpace.objects.length,
  fromUsed: scavenge.fromSpace.allocationPointer,
  stats: scavenge.stats
});
```

## Mark-Sweep算法：老生代的标记清除

Mark-Sweep算法分为标记和清除两个阶段，适用于老生代对象：

```javascript
// Mark-Sweep算法的实现
class MarkSweepGC {
  constructor(capacity = 10 * 1024 * 1024) {
    this.capacity = capacity;
    
    // 对象列表
    this.objects = [];
    
    // 标记位图
    this.markBitmap = new Map();
    
    // 空闲列表（用于快速分配）
    this.freeList = [];
    
    // 根对象
    this.roots = new Set();
    
    // GC统计
    this.stats = {
      collections: 0,
      totalPauseTime: 0,
      objectsMarked: 0,
      objectsSwept: 0,
      bytesReclaimed: 0
    };
  }
  
  // 分配对象
  allocate(size, isRoot = false) {
    // 从空闲列表查找合适的块
    let address = this.allocateFromFreeList(size);
    
    if (address === -1) {
      // 空闲列表无可用空间，尝试顺序分配
      address = this.allocateSequential(size);
    }
    
    if (address === -1) {
      // 空间不足，触发GC
      this.collect();
      address = this.allocateFromFreeList(size) || this.allocateSequential(size);
      
      if (address === -1) {
        throw new Error('Out of memory');
      }
    }
    
    const obj = {
      address,
      size,
      data: null,
      references: []
    };
    
    this.objects.push(obj);
    
    if (isRoot) {
      this.roots.add(obj);
    }
    
    return obj;
  }
  
  allocateFromFreeList(size) {
    // First-fit策略
    for (let i = 0; i < this.freeList.length; i++) {
      const block = this.freeList[i];
      if (block.size >= size) {
        const address = block.address;
        
        // 如果块大小刚好，移除整个块
        if (block.size === size) {
          this.freeList.splice(i, 1);
        } else {
          // 否则分割块
          block.address += size;
          block.size -= size;
        }
        
        return address;
      }
    }
    
    return -1;
  }
  
  allocateSequential(size) {
    // 计算已使用空间
    const used = this.objects.reduce((sum, obj) => sum + obj.size, 0);
    
    if (used + size <= this.capacity) {
      return used;
    }
    
    return -1;
  }
  
  // 执行Mark-Sweep GC
  collect() {
    const startTime = Date.now();
    
    console.log('Mark-Sweep GC started');
    
    // 1. 标记阶段
    this.markPhase();
    
    // 2. 清除阶段
    this.sweepPhase();
    
    // 3. 更新统计
    this.stats.collections++;
    this.stats.totalPauseTime += Date.now() - startTime;
    
    console.log(`Mark-Sweep GC completed in ${Date.now() - startTime}ms`);
  }
  
  // 标记阶段
  markPhase() {
    console.log('Mark phase started');
    
    // 清空标记位图
    this.markBitmap.clear();
    this.stats.objectsMarked = 0;
    
    // 标记所有可达对象（深度优先搜索）
    const markStack = [...this.roots];
    
    while (markStack.length > 0) {
      const obj = markStack.pop();
      
      // 已标记，跳过
      if (this.markBitmap.has(obj.address)) {
        continue;
      }
      
      // 标记对象
      this.markBitmap.set(obj.address, true);
      this.stats.objectsMarked++;
      
      // 将引用的对象加入栈
      for (const ref of obj.references) {
        if (!this.markBitmap.has(ref.address)) {
          markStack.push(ref);
        }
      }
    }
    
    console.log(`Marked ${this.stats.objectsMarked} objects`);
  }
  
  // 清除阶段
  sweepPhase() {
    console.log('Sweep phase started');
    
    // 清空空闲列表
    this.freeList = [];
    this.stats.objectsSwept = 0;
    
    // 按地址排序对象
    this.objects.sort((a, b) => a.address - b.address);
    
    let currentAddress = 0;
    const survivingObjects = [];
    
    for (const obj of this.objects) {
      const isMarked = this.markBitmap.get(obj.address);
      
      if (isMarked) {
        // 存活对象：记录前面的空闲空间
        if (currentAddress < obj.address) {
          this.freeList.push({
            address: currentAddress,
            size: obj.address - currentAddress
          });
        }
        
        survivingObjects.push(obj);
        currentAddress = obj.address + obj.size;
      } else {
        // 死亡对象：累计回收字节数
        this.stats.bytesReclaimed += obj.size;
        this.stats.objectsSwept++;
      }
    }
    
    // 记录末尾的空闲空间
    if (currentAddress < this.capacity) {
      this.freeList.push({
        address: currentAddress,
        size: this.capacity - currentAddress
      });
    }
    
    this.objects = survivingObjects;
    
    console.log(`Swept ${this.stats.objectsSwept} objects`);
    console.log(`Reclaimed ${this.stats.bytesReclaimed} bytes`);
    console.log(`Free list: ${this.freeList.length} blocks`);
  }
}

// 测试Mark-Sweep算法
const markSweep = new MarkSweepGC(10000);  // 10KB空间

// 创建对象
const root = markSweep.allocate(1000, true);
root.data = 'Root';

const child1 = markSweep.allocate(500);
child1.data = 'Child 1';
root.references.push(child1);

const child2 = markSweep.allocate(500);
child2.data = 'Child 2';
root.references.push(child2);

// 创建一些垃圾对象
for (let i = 0; i < 10; i++) {
  const garbage = markSweep.allocate(300);
  garbage.data = `Garbage ${i}`;
}

console.log('Before GC:', {
  objects: markSweep.objects.length,
  freeList: markSweep.freeList.length
});

// 触发GC
markSweep.collect();

console.log('After GC:', {
  objects: markSweep.objects.length,
  freeList: markSweep.freeList.length,
  stats: markSweep.stats
});
```

## Mark-Compact算法：消除内存碎片

Mark-Compact在Mark-Sweep基础上增加压缩阶段，消除内存碎片：

```javascript
// Mark-Compact算法的实现
class MarkCompactGC {
  constructor(capacity = 10 * 1024 * 1024) {
    this.capacity = capacity;
    this.objects = [];
    this.markBitmap = new Map();
    this.roots = new Set();
    
    // 转发地址表
    this.forwardingAddresses = new Map();
    
    // 碎片率阈值
    this.fragmentationThreshold = 0.3;
    
    // 统计
    this.stats = {
      collections: 0,
      compactions: 0,
      totalPauseTime: 0,
      bytesReclaimed: 0
    };
  }
  
  allocate(size, isRoot = false) {
    const address = this.findSpace(size);
    
    if (address === -1) {
      this.collect();
      const newAddress = this.findSpace(size);
      
      if (newAddress === -1) {
        throw new Error('Out of memory');
      }
      
      return this.createObject(newAddress, size, isRoot);
    }
    
    return this.createObject(address, size, isRoot);
  }
  
  createObject(address, size, isRoot) {
    const obj = {
      address,
      size,
      data: null,
      references: []
    };
    
    this.objects.push(obj);
    
    if (isRoot) {
      this.roots.add(obj);
    }
    
    return obj;
  }
  
  findSpace(size) {
    // 简化：顺序分配
    const used = this.objects.reduce((sum, obj) => sum + obj.size, 0);
    return used + size <= this.capacity ? used : -1;
  }
  
  // 执行Mark-Compact GC
  collect() {
    const startTime = Date.now();
    
    console.log('Mark-Compact GC started');
    
    // 1. 标记阶段
    this.markPhase();
    
    // 2. 计算碎片率
    const fragmentation = this.calculateFragmentation();
    console.log(`Fragmentation: ${(fragmentation * 100).toFixed(2)}%`);
    
    // 3. 根据碎片率决定是否压缩
    if (fragmentation > this.fragmentationThreshold) {
      this.compactPhase();
      this.stats.compactions++;
    } else {
      this.sweepPhase();
    }
    
    // 4. 更新统计
    this.stats.collections++;
    this.stats.totalPauseTime += Date.now() - startTime;
    
    console.log(`Mark-Compact GC completed in ${Date.now() - startTime}ms`);
  }
  
  markPhase() {
    this.markBitmap.clear();
    
    const markStack = [...this.roots];
    
    while (markStack.length > 0) {
      const obj = markStack.pop();
      
      if (this.markBitmap.has(obj.address)) {
        continue;
      }
      
      this.markBitmap.set(obj.address, true);
      
      for (const ref of obj.references) {
        markStack.push(ref);
      }
    }
  }
  
  sweepPhase() {
    const beforeCount = this.objects.length;
    
    this.objects = this.objects.filter(obj => {
      const isMarked = this.markBitmap.get(obj.address);
      if (!isMarked) {
        this.stats.bytesReclaimed += obj.size;
      }
      return isMarked;
    });
    
    console.log(`Swept ${beforeCount - this.objects.length} objects`);
  }
  
  // 压缩阶段
  compactPhase() {
    console.log('Compact phase started');
    
    // 1. 计算转发地址
    this.computeForwardingAddresses();
    
    // 2. 更新引用
    this.updateReferences();
    
    // 3. 移动对象
    this.moveObjects();
    
    // 4. 清除死亡对象
    this.removeDeadObjects();
  }
  
  computeForwardingAddresses() {
    this.forwardingAddresses.clear();
    
    // 按地址排序存活对象
    const liveObjects = this.objects
      .filter(obj => this.markBitmap.get(obj.address))
      .sort((a, b) => a.address - b.address);
    
    let newAddress = 0;
    
    for (const obj of liveObjects) {
      this.forwardingAddresses.set(obj.address, newAddress);
      newAddress += obj.size;
    }
  }
  
  updateReferences() {
    for (const obj of this.objects) {
      if (!this.markBitmap.get(obj.address)) {
        continue;  // 死亡对象，跳过
      }
      
      // 更新对象的引用
      obj.references = obj.references.map(ref => {
        const newAddress = this.forwardingAddresses.get(ref.address);
        if (newAddress !== undefined) {
          // 创建新的引用对象（指向新地址）
          return this.objects.find(o => 
            this.forwardingAddresses.get(o.address) === newAddress
          );
        }
        return ref;
      });
    }
  }
  
  moveObjects() {
    for (const obj of this.objects) {
      const newAddress = this.forwardingAddresses.get(obj.address);
      
      if (newAddress !== undefined && newAddress !== obj.address) {
        console.log(`Moving object from ${obj.address} to ${newAddress}`);
        obj.address = newAddress;
      }
    }
  }
  
  removeDeadObjects() {
    const beforeCount = this.objects.length;
    
    this.objects = this.objects.filter(obj => 
      this.markBitmap.get(obj.address) || 
      this.forwardingAddresses.has(obj.address)
    );
    
    const removed = beforeCount - this.objects.length;
    console.log(`Removed ${removed} dead objects`);
  }
  
  calculateFragmentation() {
    if (this.objects.length === 0) return 0;
    
    // 排序对象
    const sorted = [...this.objects].sort((a, b) => a.address - b.address);
    
    let fragmentedSpace = 0;
    let currentAddress = 0;
    
    for (const obj of sorted) {
      if (obj.address > currentAddress) {
        fragmentedSpace += obj.address - currentAddress;
      }
      currentAddress = obj.address + obj.size;
    }
    
    const used = this.objects.reduce((sum, obj) => sum + obj.size, 0);
    return used > 0 ? fragmentedSpace / used : 0;
  }
}

// 测试Mark-Compact算法
const markCompact = new MarkCompactGC(10000);

// 创建对象并产生碎片
const root = markCompact.allocate(1000, true);
root.data = 'Root';

for (let i = 0; i < 10; i++) {
  const obj = markCompact.allocate(300);
  obj.data = `Object ${i}`;
  
  // 只保留偶数对象的引用
  if (i % 2 === 0) {
    root.references.push(obj);
  }
}

console.log('Before GC:', {
  objects: markCompact.objects.length,
  fragmentation: markCompact.calculateFragmentation()
});

// 触发GC
markCompact.collect();

console.log('After GC:', {
  objects: markCompact.objects.length,
  fragmentation: markCompact.calculateFragmentation(),
  stats: markCompact.stats
});
```

## 三种算法的性能对比

不同算法有不同的性能特点：

```javascript
// 性能对比测试
class GCPerformanceComparison {
  static testScavenge() {
    const scavenge = new ScavengeGC(100000);
    const startTime = Date.now();
    
    // 分配1000个小对象
    const objects = [];
    for (let i = 0; i < 1000; i++) {
      try {
        const obj = scavenge.allocate(50, i === 0);
        obj.data = `Object ${i}`;
        if (i === 0 || i % 10 === 0) {
          objects.push(obj);  // 保持部分引用
        }
      } catch (e) {
        console.log('Scavenge: Out of memory');
        break;
      }
    }
    
    return {
      algorithm: 'Scavenge',
      time: Date.now() - startTime,
      collections: scavenge.stats.collections,
      pauseTime: scavenge.stats.totalPauseTime
    };
  }
  
  static testMarkSweep() {
    const markSweep = new MarkSweepGC(100000);
    const startTime = Date.now();
    
    const objects = [];
    for (let i = 0; i < 1000; i++) {
      try {
        const obj = markSweep.allocate(50, i === 0);
        obj.data = `Object ${i}`;
        if (i === 0 || i % 10 === 0) {
          objects.push(obj);
        }
      } catch (e) {
        console.log('Mark-Sweep: Out of memory');
        break;
      }
    }
    
    return {
      algorithm: 'Mark-Sweep',
      time: Date.now() - startTime,
      collections: markSweep.stats.collections,
      pauseTime: markSweep.stats.totalPauseTime
    };
  }
  
  static testMarkCompact() {
    const markCompact = new MarkCompactGC(100000);
    const startTime = Date.now();
    
    const objects = [];
    for (let i = 0; i < 1000; i++) {
      try {
        const obj = markCompact.allocate(50, i === 0);
        obj.data = `Object ${i}`;
        if (i === 0 || i % 10 === 0) {
          objects.push(obj);
        }
      } catch (e) {
        console.log('Mark-Compact: Out of memory');
        break;
      }
    }
    
    return {
      algorithm: 'Mark-Compact',
      time: Date.now() - startTime,
      collections: markCompact.stats.collections,
      pauseTime: markCompact.stats.totalPauseTime,
      compactions: markCompact.stats.compactions
    };
  }
  
  static compare() {
    console.log('=== GC Algorithm Performance Comparison ===\n');
    
    const results = [
      this.testScavenge(),
      this.testMarkSweep(),
      this.testMarkCompact()
    ];
    
    for (const result of results) {
      console.log(`${result.algorithm}:`);
      console.log(`  Total time: ${result.time}ms`);
      console.log(`  Collections: ${result.collections}`);
      console.log(`  Total pause time: ${result.pauseTime}ms`);
      if (result.compactions !== undefined) {
        console.log(`  Compactions: ${result.compactions}`);
      }
      console.log();
    }
  }
}

GCPerformanceComparison.compare();
```

## 算法选择策略

V8根据对象特征选择合适的GC算法：

```javascript
// GC策略选择器
class GCStrategySelector {
  static selectStrategy(obj) {
    const decisions = [];
    
    // 1. 对象大小判断
    if (obj.size > 512 * 1024) {
      decisions.push({
        criteria: 'Large object (>512KB)',
        strategy: 'Large Object Space',
        reason: 'Avoid copy overhead'
      });
      return decisions;
    }
    
    // 2. 对象年龄判断
    if (obj.age === 0) {
      decisions.push({
        criteria: 'Young object (age=0)',
        strategy: 'Scavenge in New Generation',
        reason: 'Fast allocation and collection'
      });
    } else if (obj.age >= 2) {
      decisions.push({
        criteria: 'Old object (age>=2)',
        strategy: 'Mark-Sweep in Old Generation',
        reason: 'Infrequent collection'
      });
    }
    
    // 3. 内存碎片判断
    if (obj.fragmentationRatio > 0.3) {
      decisions.push({
        criteria: 'High fragmentation (>30%)',
        strategy: 'Mark-Compact',
        reason: 'Eliminate fragmentation'
      });
    } else {
      decisions.push({
        criteria: 'Low fragmentation',
        strategy: 'Mark-Sweep',
        reason: 'Faster than compacting'
      });
    }
    
    return decisions;
  }
  
  static demonstrate() {
    const scenarios = [
      { size: 100, age: 0, fragmentationRatio: 0.1 },
      { size: 1000, age: 3, fragmentationRatio: 0.2 },
      { size: 600 * 1024, age: 0, fragmentationRatio: 0 },
      { size: 2000, age: 5, fragmentationRatio: 0.4 }
    ];
    
    for (let i = 0; i < scenarios.length; i++) {
      console.log(`\nScenario ${i + 1}:`, scenarios[i]);
      const decisions = this.selectStrategy(scenarios[i]);
      
      for (const decision of decisions) {
        console.log(`  ${decision.criteria} -> ${decision.strategy}`);
        console.log(`    Reason: ${decision.reason}`);
      }
    }
  }
}

GCStrategySelector.demonstrate();
```

## 写屏障：跨代引用的处理

当老生代对象引用新生代对象时，需要写屏障机制：

```javascript
// 写屏障实现
class WriteBarrier {
  constructor() {
    // 记忆集：记录跨代引用
    this.rememberedSet = new Set();
  }
  
  // 更新引用时调用
  recordReference(oldObj, newObj) {
    // 如果是老生代对象引用新生代对象
    if (this.isOldGeneration(oldObj) && this.isNewGeneration(newObj)) {
      // 将老生代对象加入记忆集
      this.rememberedSet.add(oldObj);
      console.log(`Write barrier: ${oldObj.address} -> ${newObj.address}`);
    }
  }
  
  isOldGeneration(obj) {
    return obj.generation === 'old';
  }
  
  isNewGeneration(obj) {
    return obj.generation === 'new';
  }
  
  // Scavenge时处理记忆集
  processRememberedSet() {
    console.log('Processing remembered set');
    
    for (const oldObj of this.rememberedSet) {
      console.log(`Scanning old object ${oldObj.address} for new references`);
      
      // 扫描该对象引用的新生代对象
      for (const ref of oldObj.references) {
        if (this.isNewGeneration(ref)) {
          console.log(`  Found new generation reference: ${ref.address}`);
          // 标记为存活，需要复制
        }
      }
    }
  }
  
  // 清理记忆集
  clearRememberedSet() {
    this.rememberedSet.clear();
  }
}

// 测试写屏障
const barrier = new WriteBarrier();

const oldObj = { address: 1000, generation: 'old', references: [] };
const newObj = { address: 100, generation: 'new', references: [] };

// 建立跨代引用
oldObj.references.push(newObj);
barrier.recordReference(oldObj, newObj);

// GC时处理
barrier.processRememberedSet();
```

## 本章小结

本章深入探讨了V8的三大垃圾回收算法。我们学习了以下核心内容：

1. **Scavenge算法**：使用半空间复制，快速回收新生代对象，停顿时间短但空间利用率低。

2. **Mark-Sweep算法**：标记-清除两阶段，适用于老生代，避免对象移动但产生内存碎片。

3. **Mark-Compact算法**：在Mark-Sweep基础上增加压缩，消除碎片但停顿时间更长。

4. **算法选择**：根据对象大小、年龄和碎片率选择合适的GC策略。

5. **写屏障**：使用记忆集处理跨代引用，确保Scavenge时不遗漏对象。

理解这些算法的权衡，能够帮助你写出更高效的代码。在下一章中，我们将探讨增量标记和并发回收技术，了解V8如何进一步减少GC停顿时间。
