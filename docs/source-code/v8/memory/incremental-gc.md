# 增量标记与并发回收：Orinoco GC

你是否注意到现代Web应用运行时几乎感觉不到GC停顿？V8是如何在后台悄悄回收内存，同时让JavaScript代码持续运行的？

传统的GC需要停止整个程序（Stop-The-World），这在现代应用中是无法接受的。V8的Orinoco GC项目通过增量标记和并发回收技术，将GC停顿时间降低到毫秒级别。本章将深入探讨这些先进技术的实现原理。

## Stop-The-World的问题

传统GC需要暂停JavaScript执行：

```javascript
// 模拟传统STW GC的影响
class StopTheWorldGC {
  constructor() {
    this.objects = [];
    this.isGCRunning = false;
  }
  
  allocate(size) {
    // 分配前检查是否需要GC
    if (this.needsGC()) {
      this.collect();  // 停止世界！
    }
    
    const obj = { size, data: null };
    this.objects.push(obj);
    return obj;
  }
  
  collect() {
    this.isGCRunning = true;
    const startTime = Date.now();
    
    console.log('⏸️ JavaScript execution paused');
    
    // 模拟GC工作（标记、清除、压缩）
    this.mark();
    this.sweep();
    this.compact();
    
    const pauseTime = Date.now() - startTime;
    console.log(`⏸️ Paused for ${pauseTime}ms`);
    
    this.isGCRunning = false;
  }
  
  mark() {
    // 标记阶段：10ms
    const iterations = 10000000;
    for (let i = 0; i < iterations; i++) {
      Math.sqrt(i);  // 模拟工作
    }
  }
  
  sweep() {
    // 清除阶段：5ms
    const iterations = 5000000;
    for (let i = 0; i < iterations; i++) {
      Math.sqrt(i);
    }
  }
  
  compact() {
    // 压缩阶段：5ms
    const iterations = 5000000;
    for (let i = 0; i < iterations; i++) {
      Math.sqrt(i);
    }
  }
  
  needsGC() {
    return this.objects.length > 100;
  }
}

// 模拟应用运行
function simulateApplication() {
  const gc = new StopTheWorldGC();
  let frameCount = 0;
  
  const renderFrame = () => {
    // 每帧分配一些对象
    for (let i = 0; i < 20; i++) {
      gc.allocate(100);
    }
    
    frameCount++;
    
    // 60 FPS = 16.67ms per frame
    if (frameCount < 10) {
      setTimeout(renderFrame, 16.67);
    }
  };
  
  renderFrame();
}

// 运行会看到GC暂停
// simulateApplication();
```

## 增量标记：分步执行GC

增量标记将GC工作分解为多个小步骤，与JavaScript交替执行：

```javascript
// 增量标记的实现
class IncrementalMarkingGC {
  constructor() {
    this.objects = [];
    this.roots = new Set();
    
    // 标记状态
    this.markBitmap = new Map();
    this.markingWorkList = [];
    
    // 增量标记状态
    this.isMarking = false;
    this.markingProgress = 0;
    
    // 每次增量步骤的工作量（字节）
    this.incrementalStepSize = 1024;
    
    // 统计
    this.stats = {
      incrementalSteps: 0,
      totalMarkingTime: 0,
      maxStepTime: 0
    };
  }
  
  allocate(size, isRoot = false) {
    // 分配时执行增量标记步骤
    if (this.isMarking) {
      this.performIncrementalStep();
    }
    
    // 检查是否需要启动新的GC周期
    if (this.needsGC()) {
      this.startIncremental Marking();
    }
    
    const obj = {
      address: this.objects.length,
      size,
      data: null,
      references: [],
      marked: false
    };
    
    this.objects.push(obj);
    
    if (isRoot) {
      this.roots.add(obj);
    }
    
    return obj;
  }
  
  // 启动增量标记
  startIncrementalMarking() {
    if (this.isMarking) return;
    
    console.log('🚀 Starting incremental marking');
    
    this.isMarking = true;
    this.markingProgress = 0;
    this.markBitmap.clear();
    
    // 将根对象加入工作列表
    this.markingWorkList = [...this.roots];
  }
  
  // 执行一个增量步骤
  performIncrementalStep() {
    if (!this.isMarking || this.markingWorkList.length === 0) {
      // 标记完成，进入最终标记阶段
      if (this.isMarking) {
        this.finishMarking();
      }
      return;
    }
    
    const startTime = Date.now();
    let bytesProcessed = 0;
    
    // 处理对象直到达到步骤大小
    while (this.markingWorkList.length > 0 && 
           bytesProcessed < this.incrementalStepSize) {
      const obj = this.markingWorkList.pop();
      
      // 跳过已标记对象
      if (this.markBitmap.has(obj.address)) {
        continue;
      }
      
      // 标记对象
      this.markBitmap.set(obj.address, true);
      obj.marked = true;
      bytesProcessed += obj.size;
      
      // 将引用的对象加入工作列表
      for (const ref of obj.references) {
        if (!this.markBitmap.has(ref.address)) {
          this.markingWorkList.push(ref);
        }
      }
    }
    
    const stepTime = Date.now() - startTime;
    this.stats.incrementalSteps++;
    this.stats.totalMarkingTime += stepTime;
    this.stats.maxStepTime = Math.max(this.stats.maxStepTime, stepTime);
    
    this.markingProgress = this.markBitmap.size / this.objects.length;
    
    console.log(`📊 Incremental step: ${bytesProcessed} bytes in ${stepTime}ms (${(this.markingProgress * 100).toFixed(1)}%)`);
  }
  
  // 最终标记阶段（短暂STW）
  finishMarking() {
    console.log('🏁 Finishing marking (STW)');
    
    const startTime = Date.now();
    
    // 处理剩余的灰色对象
    while (this.markingWorkList.length > 0) {
      const obj = this.markingWorkList.pop();
      
      if (!this.markBitmap.has(obj.address)) {
        this.markBitmap.set(obj.address, true);
        
        for (const ref of obj.references) {
          if (!this.markBitmap.has(ref.address)) {
            this.markingWorkList.push(ref);
          }
        }
      }
    }
    
    const pauseTime = Date.now() - startTime;
    console.log(`⏸️ Final marking pause: ${pauseTime}ms`);
    
    this.isMarking = false;
    
    // 执行清除和压缩
    this.sweep();
  }
  
  sweep() {
    const beforeCount = this.objects.length;
    
    this.objects = this.objects.filter(obj => obj.marked);
    
    // 清除标记
    for (const obj of this.objects) {
      obj.marked = false;
    }
    
    console.log(`🧹 Swept ${beforeCount - this.objects.length} objects`);
  }
  
  needsGC() {
    return this.objects.length > 1000;
  }
}

// 测试增量标记
const incrementalGC = new IncrementalMarkingGC();

// 创建对象图
const root = incrementalGC.allocate(100, true);
root.data = 'Root';

// 创建子对象
for (let i = 0; i < 50; i++) {
  const child = incrementalGC.allocate(50);
  child.data = `Child ${i}`;
  root.references.push(child);
}

// 创建垃圾对象
for (let i = 0; i < 100; i++) {
  const garbage = incrementalGC.allocate(50);
  garbage.data = `Garbage ${i}`;
}

// 模拟应用运行，GC在后台增量执行
let allocCount = 0;
const interval = setInterval(() => {
  const obj = incrementalGC.allocate(50);
  obj.data = `Runtime object ${allocCount++}`;
  
  if (allocCount >= 20) {
    clearInterval(interval);
    console.log('\n=== Final Stats ===');
    console.log(incrementalGC.stats);
  }
}, 10);
```

## 三色标记：追踪对象状态

增量标记使用三色标记算法追踪对象状态：

```javascript
// 三色标记算法
class TriColorMarking {
  constructor() {
    this.objects = [];
    
    // 三色分类
    this.white = new Set();  // 未访问
    this.gray = new Set();   // 已访问但引用未处理
    this.black = new Set();  // 已访问且引用已处理
  }
  
  allocate(size, isRoot = false) {
    const obj = {
      id: this.objects.length,
      size,
      references: [],
      color: 'white'
    };
    
    this.objects.push(obj);
    this.white.add(obj);
    
    if (isRoot) {
      this.markGray(obj);
    }
    
    return obj;
  }
  
  // 标记为灰色
  markGray(obj) {
    if (obj.color === 'white') {
      this.white.delete(obj);
      this.gray.add(obj);
      obj.color = 'gray';
      console.log(`Object ${obj.id}: white -> gray`);
    }
  }
  
  // 标记为黑色
  markBlack(obj) {
    if (obj.color === 'gray') {
      this.gray.delete(obj);
      this.black.add(obj);
      obj.color = 'black';
      console.log(`Object ${obj.id}: gray -> black`);
    }
  }
  
  // 执行一个标记步骤
  markStep() {
    if (this.gray.size === 0) {
      return false;  // 标记完成
    }
    
    // 从灰色集合取一个对象
    const obj = this.gray.values().next().value;
    
    // 处理它的引用
    for (const ref of obj.references) {
      if (ref.color === 'white') {
        this.markGray(ref);
      }
    }
    
    // 标记为黑色
    this.markBlack(obj);
    
    return true;  // 还有工作要做
  }
  
  // 完整的增量标记
  incrementalMark() {
    console.log('Starting tri-color marking\n');
    
    let step = 0;
    while (this.markStep()) {
      step++;
      console.log(`Step ${step}: white=${this.white.size}, gray=${this.gray.size}, black=${this.black.size}\n`);
      
      // 模拟JavaScript执行
      console.log('  ... JavaScript running ...\n');
    }
    
    console.log('Marking completed');
    console.log(`White (garbage): ${this.white.size} objects`);
    console.log(`Black (live): ${this.black.size} objects`);
  }
}

// 测试三色标记
const triColor = new TriColorMarking();

// 创建对象图
const root = triColor.allocate(100, true);

const child1 = triColor.allocate(50);
const child2 = triColor.allocate(50);
root.references.push(child1, child2);

const grandchild = triColor.allocate(50);
child1.references.push(grandchild);

// 垃圾对象
const garbage1 = triColor.allocate(50);
const garbage2 = triColor.allocate(50);

// 执行增量标记
triColor.incrementalMark();
```

## 写屏障：处理增量标记期间的对象变化

增量标记期间，JavaScript可能修改对象引用，需要写屏障维护三色不变性：

```javascript
// 写屏障实现
class WriteBarrierGC {
  constructor() {
    this.objects = [];
    this.markBitmap = new Map();
    this.graySet = new Set();
    
    // 写屏障统计
    this.writeBarrierCalls = 0;
  }
  
  allocate(size) {
    const obj = {
      id: this.objects.length,
      size,
      references: [],
      color: 'white'
    };
    
    this.objects.push(obj);
    return obj;
  }
  
  // 更新对象引用（带写屏障）
  updateReference(obj, oldRef, newRef) {
    // 移除旧引用
    if (oldRef) {
      const index = obj.references.indexOf(oldRef);
      if (index > -1) {
        obj.references.splice(index, 1);
      }
    }
    
    // 添加新引用
    if (newRef) {
      obj.references.push(newRef);
      
      // 写屏障：维护三色不变性
      this.writeBarrier(obj, newRef);
    }
  }
  
  // 写屏障：确保黑色对象不直接引用白色对象
  writeBarrier(obj, newRef) {
    this.writeBarrierCalls++;
    
    // 如果父对象是黑色，新引用是白色
    if (obj.color === 'black' && newRef.color === 'white') {
      // 策略1：将新引用标记为灰色（Dijkstra写屏障）
      newRef.color = 'gray';
      this.graySet.add(newRef);
      
      console.log(`Write barrier: marking object ${newRef.id} gray`);
      console.log(`  Reason: black object ${obj.id} references white object ${newRef.id}`);
    }
  }
  
  // 模拟增量标记过程
  simulate() {
    // 创建对象
    const root = this.allocate(100);
    root.color = 'black';  // 假设已标记
    
    const child1 = this.allocate(50);
    child1.color = 'black';
    root.references.push(child1);
    
    const child2 = this.allocate(50);
    child2.color = 'white';  // 未标记
    
    console.log('Initial state:');
    console.log(`  Root (id=${root.id}): black`);
    console.log(`  Child1 (id=${child1.id}): black`);
    console.log(`  Child2 (id=${child2.id}): white\n`);
    
    // 在增量标记期间，JavaScript修改引用
    console.log('JavaScript updates reference:\n');
    this.updateReference(root, null, child2);
    
    console.log(`\nWrite barrier calls: ${this.writeBarrierCalls}`);
    console.log(`Gray set size: ${this.graySet.size}`);
  }
}

const wbGC = new WriteBarrierGC();
wbGC.simulate();
```

## 并发标记：后台线程执行GC

并发标记在后台线程执行，进一步减少主线程停顿：

```javascript
// 并发标记的模拟实现
class ConcurrentMarkingGC {
  constructor() {
    this.objects = [];
    this.roots = new Set();
    this.markBitmap = new Map();
    
    // 并发标记状态
    this.isConcurrentMarking = false;
    this.markingThreadRunning = false;
    
    // 记忆集：主线程记录的引用变化
    this.rememberedSet = new Set();
    
    // 统计
    this.stats = {
      concurrentMarkingTime: 0,
      finalPauseTime: 0,
      rememberedSetSize: 0
    };
  }
  
  allocate(size, isRoot = false) {
    const obj = {
      id: this.objects.length,
      size,
      references: [],
      marked: false
    };
    
    this.objects.push(obj);
    
    if (isRoot) {
      this.roots.add(obj);
    }
    
    // 在并发标记期间分配的对象标记为存活
    if (this.isConcurrentMarking) {
      this.markBitmap.set(obj.id, true);
      obj.marked = true;
    }
    
    return obj;
  }
  
  // 主线程：更新引用时记录
  updateReference(obj, newRef) {
    obj.references.push(newRef);
    
    // 如果正在并发标记，记录这个变化
    if (this.isConcurrentMarking) {
      this.rememberedSet.add({ obj, newRef });
      console.log(`📝 Main thread: recorded reference update`);
    }
  }
  
  // 启动并发标记
  startConcurrentMarking() {
    console.log('🚀 Starting concurrent marking (background thread)');
    
    this.isConcurrentMarking = true;
    this.markBitmap.clear();
    this.rememberedSet.clear();
    
    // 模拟后台线程标记
    this.concurrentMarkingThread();
  }
  
  // 后台线程：并发标记
  async concurrentMarkingThread() {
    this.markingThreadRunning = true;
    const startTime = Date.now();
    
    // 模拟后台标记工作
    console.log('🔧 Background thread: marking objects...');
    
    const workList = [...this.roots];
    let markedCount = 0;
    
    while (workList.length > 0) {
      const obj = workList.pop();
      
      if (this.markBitmap.has(obj.id)) {
        continue;
      }
      
      this.markBitmap.set(obj.id, true);
      markedCount++;
      
      // 模拟标记工作
      await this.sleep(1);
      
      console.log(`  Marked object ${obj.id} (${markedCount} total)`);
      
      // 添加引用的对象
      for (const ref of obj.references) {
        if (!this.markBitmap.has(ref.id)) {
          workList.push(ref);
        }
      }
    }
    
    this.stats.concurrentMarkingTime = Date.now() - startTime;
    this.markingThreadRunning = false;
    
    console.log(`✅ Background marking completed in ${this.stats.concurrentMarkingTime}ms`);
    
    // 进入最终标记阶段
    this.finalizeMarking();
  }
  
  // 最终标记阶段（短暂STW）
  finalizeMarking() {
    console.log('\n⏸️ Final marking (STW on main thread)');
    
    const startTime = Date.now();
    
    // 处理记忆集中的引用变化
    this.stats.rememberedSetSize = this.rememberedSet.size;
    
    for (const { obj, newRef } of this.rememberedSet) {
      if (!this.markBitmap.has(newRef.id)) {
        console.log(`  Processing remembered reference: ${obj.id} -> ${newRef.id}`);
        this.markBitmap.set(newRef.id, true);
        
        // 递归标记引用的对象
        this.markRecursive(newRef);
      }
    }
    
    this.stats.finalPauseTime = Date.now() - startTime;
    this.isConcurrentMarking = false;
    
    console.log(`⏸️ Final pause: ${this.stats.finalPauseTime}ms`);
    console.log(`📊 Remembered set size: ${this.stats.rememberedSetSize}`);
    
    // 清除未标记对象
    this.sweep();
  }
  
  markRecursive(obj) {
    for (const ref of obj.references) {
      if (!this.markBitmap.has(ref.id)) {
        this.markBitmap.set(ref.id, true);
        this.markRecursive(ref);
      }
    }
  }
  
  sweep() {
    const beforeCount = this.objects.length;
    
    this.objects = this.objects.filter(obj => 
      this.markBitmap.has(obj.id)
    );
    
    console.log(`🧹 Swept ${beforeCount - this.objects.length} objects\n`);
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 测试并发标记
async function testConcurrentMarking() {
  const gc = new ConcurrentMarkingGC();
  
  // 创建对象图
  const root = gc.allocate(100, true);
  const child1 = gc.allocate(50);
  const child2 = gc.allocate(50);
  root.references.push(child1, child2);
  
  // 创建垃圾
  const garbage = gc.allocate(50);
  
  // 启动并发标记
  gc.startConcurrentMarking();
  
  // 模拟主线程继续运行
  console.log('\n🏃 Main thread continues...\n');
  await gc.sleep(5);
  
  // 主线程修改引用
  const newChild = gc.allocate(50);
  gc.updateReference(root, newChild);
  
  // 等待GC完成
  await gc.sleep(20);
  
  console.log('=== Final Stats ===');
  console.log(gc.stats);
}

// testConcurrentMarking();
```

## 并发清除与压缩

清除和压缩阶段也可以并发执行：

```javascript
// 并发清除实现
class ConcurrentSweepingGC {
  constructor() {
    this.pages = [];  // 内存页列表
    this.freeList = [];
    this.isSweeping = false;
  }
  
  // 并发清除
  async concurrentSweep(markedObjects) {
    console.log('🧹 Starting concurrent sweeping (background thread)');
    
    this.isSweeping = true;
    const startTime = Date.now();
    
    // 按页遍历
    for (let pageIndex = 0; pageIndex < this.pages.length; pageIndex++) {
      const page = this.pages[pageIndex];
      
      console.log(`  Sweeping page ${pageIndex}...`);
      
      // 释放未标记对象
      for (const obj of page.objects) {
        if (!markedObjects.has(obj.id)) {
          // 添加到空闲列表
          this.freeList.push({
            address: obj.address,
            size: obj.size
          });
        }
      }
      
      // 模拟清除工作
      await this.sleep(2);
    }
    
    const sweepTime = Date.now() - startTime;
    this.isSweeping = false;
    
    console.log(`✅ Sweeping completed in ${sweepTime}ms`);
    console.log(`📋 Free list: ${this.freeList.length} blocks`);
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

## Orinoco GC的完整流程

V8的Orinoco GC综合运用了所有这些技术：

```javascript
// Orinoco GC完整流程模拟
class OrinocoGC {
  constructor() {
    this.heap = {
      newGeneration: new NewGenerationSpace(),
      oldGeneration: new OldGenerationSpace()
    };
    
    this.phases = {
      incrementalMarking: false,
      concurrentMarking: false,
      concurrentSweeping: false
    };
    
    this.stats = {
      minorGCCount: 0,
      majorGCCount: 0,
      totalPauseTime: 0,
      concurrentTime: 0
    };
  }
  
  // Minor GC：新生代回收（STW但很快）
  minorGC() {
    const startTime = Date.now();
    
    console.log('⚡ Minor GC (Scavenge)');
    
    // 快速复制存活对象
    this.heap.newGeneration.scavenge();
    
    const pauseTime = Date.now() - startTime;
    this.stats.minorGCCount++;
    this.stats.totalPauseTime += pauseTime;
    
    console.log(`  Pause: ${pauseTime}ms\n`);
  }
  
  // Major GC：老生代回收（增量+并发）
  async majorGC() {
    console.log('🔄 Major GC (Incremental + Concurrent)\n');
    
    const startTime = Date.now();
    
    // 1. 增量标记（与JavaScript交替）
    console.log('Phase 1: Incremental marking');
    this.phases.incrementalMarking = true;
    
    for (let step = 0; step < 10; step++) {
      await this.incrementalMarkingStep();
      console.log('  ... JavaScript running ...');
      await this.sleep(2);
    }
    
    this.phases.incrementalMarking = false;
    
    // 2. 并发标记（后台线程）
    console.log('\nPhase 2: Concurrent marking');
    this.phases.concurrentMarking = true;
    
    const concurrentStart = Date.now();
    await this.concurrentMarking();
    this.stats.concurrentTime += Date.now() - concurrentStart;
    
    this.phases.concurrentMarking = false;
    
    // 3. 最终标记（短暂STW）
    console.log('\nPhase 3: Final marking');
    const finalPauseStart = Date.now();
    this.finalMarking();
    const finalPauseTime = Date.now() - finalPauseStart;
    
    this.stats.totalPauseTime += finalPauseTime;
    console.log(`  Pause: ${finalPauseTime}ms\n`);
    
    // 4. 并发清除（后台线程）
    console.log('Phase 4: Concurrent sweeping');
    this.phases.concurrentSweeping = true;
    
    const sweepStart = Date.now();
    await this.concurrentSweeping();
    this.stats.concurrentTime += Date.now() - sweepStart;
    
    this.phases.concurrentSweeping = false;
    
    const totalTime = Date.now() - startTime;
    this.stats.majorGCCount++;
    
    console.log(`\n✅ Major GC completed in ${totalTime}ms`);
    console.log(`  Main thread pause: ${finalPauseTime}ms`);
    console.log(`  Background work: ${this.stats.concurrentTime}ms\n`);
  }
  
  async incrementalMarkingStep() {
    // 模拟增量标记步骤
    await this.sleep(1);
  }
  
  async concurrentMarking() {
    // 模拟并发标记
    await this.sleep(10);
  }
  
  finalMarking() {
    // 最终标记（STW）
    const iterations = 1000000;
    for (let i = 0; i < iterations; i++) {
      Math.sqrt(i);
    }
  }
  
  async concurrentSweeping() {
    // 模拟并发清除
    await this.sleep(8);
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  printStats() {
    console.log('=== GC Statistics ===');
    console.log(`Minor GCs: ${this.stats.minorGCCount}`);
    console.log(`Major GCs: ${this.stats.majorGCCount}`);
    console.log(`Total pause time: ${this.stats.totalPauseTime}ms`);
    console.log(`Concurrent time: ${this.stats.concurrentTime}ms`);
    console.log(`Average pause: ${(this.stats.totalPauseTime / (this.stats.minorGCCount + this.stats.majorGCCount)).toFixed(2)}ms`);
  }
}

// 简化的新生代和老生代空间
class NewGenerationSpace {
  scavenge() {
    // Scavenge实现
  }
}

class OldGenerationSpace {
  mark() {}
  sweep() {}
}

// 测试Orinoco GC
async function testOrinocoGC() {
  const gc = new OrinocoGC();
  
  // 执行Minor GC
  gc.minorGC();
  await gc.sleep(10);
  
  // 执行Major GC
  await gc.majorGC();
  
  // 打印统计
  gc.printStats();
}

// testOrinocoGC();
```

## 本章小结

本章深入探讨了V8的Orinoco GC项目及其先进技术。我们学习了以下核心内容：

1. **增量标记**：将标记工作分解为小步骤，与JavaScript交替执行，避免长时间停顿。

2. **三色标记**：使用白、灰、黑三色追踪对象状态，支持增量标记的正确性。

3. **写屏障**：在增量标记期间维护三色不变性，确保不遗漏存活对象。

4. **并发标记**：在后台线程执行标记工作，主线程只需短暂停顿处理记忆集。

5. **并发清除**：清除阶段也在后台执行，进一步减少主线程停顿。

6. **Orinoco流程**：综合运用增量标记、并发标记、并发清除，将GC停顿时间降至毫秒级。

理解这些技术，能够帮助你理解V8如何在不影响用户体验的情况下进行内存管理。在下一章中，我们将探讨内存对齐与填充，了解V8如何优化对象布局。
