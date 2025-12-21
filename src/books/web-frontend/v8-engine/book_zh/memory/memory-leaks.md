# 内存泄漏的常见场景与分析方法

你的应用是否越跑越慢，最终崩溃？页面是否在使用一段时间后变得卡顿？这些可能都是内存泄漏的症状。即使有垃圾回收，JavaScript应用仍然可能出现内存泄漏。

内存泄漏是指程序中不再需要的内存没有被释放，导致可用内存逐渐减少。本章将深入探讨JavaScript中常见的内存泄漏场景，以及如何检测和修复它们。

## 什么是内存泄漏

内存泄漏的本质是意外的引用：

```javascript
// 内存泄漏检测器
class MemoryLeakDetector {
  constructor() {
    this.snapshots = [];
    this.leakThreshold = 1.5;  // 内存增长50%视为泄漏
  }
  
  // 记录内存快照
  takeSnapshot(label) {
    // 强制GC（仅在Node.js中可用）
    if (global.gc) {
      global.gc();
    }
    
    const snapshot = {
      label,
      timestamp: Date.now(),
      memory: process.memoryUsage().heapUsed,
      objects: []
    };
    
    this.snapshots.push(snapshot);
    
    console.log(`📸 Snapshot "${label}": ${(snapshot.memory / 1024 / 1024).toFixed(2)} MB`);
    
    return snapshot;
  }
  
  // 分析内存增长
  analyze() {
    if (this.snapshots.length < 2) {
      console.log('需要至少2个快照');
      return;
    }
    
    console.log('\n=== 内存增长分析 ===\n');
    
    for (let i = 1; i < this.snapshots.length; i++) {
      const prev = this.snapshots[i - 1];
      const curr = this.snapshots[i];
      
      const growth = curr.memory - prev.memory;
      const growthPercent = (growth / prev.memory) * 100;
      
      console.log(`${prev.label} -> ${curr.label}:`);
      console.log(`  增长: ${(growth / 1024 / 1024).toFixed(2)} MB (${growthPercent.toFixed(1)}%)`);
      
      if (growthPercent > (this.leakThreshold - 1) * 100) {
        console.log(`  ⚠️  可能存在内存泄漏！\n`);
      } else {
        console.log(`  ✅ 正常\n`);
      }
    }
  }
}

// 使用示例（需要Node.js环境）
// const detector = new MemoryLeakDetector();
// detector.takeSnapshot('开始');
// // ... 执行操作 ...
// detector.takeSnapshot('操作后');
// detector.analyze();
```

## 场景1：意外的全局变量

忘记声明变量会创建全局变量，导致内存泄漏：

```javascript
// 意外全局变量示例
class GlobalVariableLeak {
  static demonstrateLeak() {
    console.log('=== 场景1：意外的全局变量 ===\n');
    
    // 错误示例：忘记使用var/let/const
    function createLeak() {
      // 意外创建全局变量
      leakedData = new Array(1000000).fill('leaked');  // 泄漏！
      
      console.log('❌ 创建了意外的全局变量');
      console.log('   变量名: leakedData');
      console.log('   大小: ~8MB');
      console.log('   问题: 永远不会被GC回收\n');
    }
    
    createLeak();
    
    // 验证全局变量存在
    console.log(`全局变量存在: ${typeof globalThis.leakedData !== 'undefined'}\n`);
    
    // 清理（实际应用中可能无法清理）
    delete globalThis.leakedData;
  }
  
  static demonstrateFix() {
    console.log('✅ 修复方法:\n');
    
    function noLeak() {
      // 正确：使用let/const声明
      const data = new Array(1000000).fill('safe');
      
      console.log('   使用 const 声明变量');
      console.log('   函数结束后可被GC回收\n');
      
      // data在函数结束后可以被回收
    }
    
    noLeak();
    
    // 启用严格模式防止意外全局变量
    console.log('   最佳实践: 使用严格模式');
    console.log("   'use strict'");
  }
  
  static run() {
    this.demonstrateLeak();
    this.demonstrateFix();
  }
}

GlobalVariableLeak.run();
```

## 场景2：被遗忘的定时器

未清理的定时器会持续引用对象：

```javascript
// 定时器泄漏示例
class TimerLeak {
  constructor() {
    this.data = new Array(100000).fill('data');
    this.timerId = null;
  }
  
  // 泄漏示例
  startLeakyTimer() {
    console.log('=== 场景2：未清理的定时器 ===\n');
    console.log('❌ 问题代码:\n');
    
    // 定时器持续引用this，导致整个对象无法回收
    this.timerId = setInterval(() => {
      console.log('定时器运行中，持有对this.data的引用');
      console.log(`数据大小: ${this.data.length} 元素`);
    }, 1000);
    
    console.log('定时器已启动，但没有清理机制');
    console.log('即使不再需要，对象仍然无法被回收\n');
  }
  
  // 修复方法
  static demonstrateFix() {
    console.log('✅ 修复方法:\n');
    
    class FixedTimer {
      constructor() {
        this.data = new Array(100000).fill('data');
        this.timerId = null;
      }
      
      start() {
        this.timerId = setInterval(() => {
          // 定时器逻辑
        }, 1000);
      }
      
      stop() {
        // 关键：清理定时器
        if (this.timerId) {
          clearInterval(this.timerId);
          this.timerId = null;
          console.log('   定时器已清理');
        }
      }
      
      destroy() {
        this.stop();
        this.data = null;
        console.log('   对象已销毁\n');
      }
    }
    
    const timer = new FixedTimer();
    timer.start();
    
    // 不再需要时清理
    setTimeout(() => {
      timer.destroy();
    }, 100);
  }
  
  static run() {
    this.demonstrateFix();
  }
}

TimerLeak.run();
```

## 场景3：闭包引用

闭包可能意外持有大对象的引用：

```javascript
// 闭包泄漏示例
class ClosureLeak {
  static demonstrateLeak() {
    console.log('=== 场景3：闭包意外引用 ===\n');
    console.log('❌ 问题代码:\n');
    
    function createLeak() {
      const largeData = new Array(1000000).fill('data');
      
      // 这个闭包持有largeData的引用
      return function smallFunction() {
        // 实际上不需要largeData
        console.log('只需要一个简单的函数');
      };
    }
    
    const fn = createLeak();
    
    console.log('   闭包创建后，largeData无法释放');
    console.log('   即使smallFunction不使用largeData\n');
  }
  
  static demonstrateFix() {
    console.log('✅ 修复方法:\n');
    
    function noLeak() {
      const largeData = new Array(1000000).fill('data');
      
      // 提取需要的数据
      const summary = {
        length: largeData.length,
        first: largeData[0]
      };
      
      // 返回的闭包只引用小对象
      return function smallFunction() {
        console.log(`   数据长度: ${summary.length}`);
      };
    }
    
    const fn = noLeak();
    fn();
    
    console.log('   只保留必要的数据\n');
  }
  
  // 常见的闭包泄漏场景
  static demonstrateCommonCase() {
    console.log('常见场景：事件处理器\n');
    
    class Component {
      constructor() {
        this.data = new Array(100000).fill('data');
      }
      
      // 错误：直接使用箭头函数
      badSetup() {
        document.addEventListener('click', () => {
          // 持有整个this的引用
          console.log(this.data.length);
        });
      }
      
      // 正确：使用命名函数并清理
      goodSetup() {
        this.handleClick = () => {
          const length = this.data.length;
          console.log(length);
        };
        
        document.addEventListener('click', this.handleClick);
      }
      
      destroy() {
        // 清理事件监听器
        document.removeEventListener('click', this.handleClick);
        this.handleClick = null;
        this.data = null;
      }
    }
    
    console.log('   关键：组件销毁时移除事件监听器\n');
  }
  
  static run() {
    this.demonstrateLeak();
    this.demonstrateFix();
    this.demonstrateCommonCase();
  }
}

ClosureLeak.run();
```

## 场景4：DOM引用

分离的DOM节点仍被JavaScript引用：

```javascript
// DOM引用泄漏示例
class DOMReferenceLeak {
  static demonstrate() {
    console.log('=== 场景4：分离的DOM引用 ===\n');
    
    console.log('❌ 问题代码:\n');
    console.log(`
    class BadComponent {
      constructor() {
        this.element = document.createElement('div');
        this.element.innerHTML = '<span>Large content...</span>';
        document.body.appendChild(this.element);
        
        // 存储子元素引用
        this.span = this.element.querySelector('span');
      }
      
      remove() {
        // 移除父元素，但span引用仍然存在
        document.body.removeChild(this.element);
        // 问题：this.span 仍然引用已分离的DOM
      }
    }
    `);
    
    console.log('   问题：span和整个子树无法被GC回收\n');
    
    console.log('✅ 修复方法:\n');
    console.log(`
    class GoodComponent {
      constructor() {
        this.element = document.createElement('div');
        this.element.innerHTML = '<span>Large content...</span>';
        document.body.appendChild(this.element);
      }
      
      remove() {
        document.body.removeChild(this.element);
        // 清理引用
        this.element = null;
      }
      
      destroy() {
        this.remove();
        // 清理所有引用
      }
    }
    `);
    
    console.log('   关键：移除DOM时清理所有引用\n');
  }
  
  static demonstrateDetachedTree() {
    console.log('分离DOM树的内存影响:\n');
    
    // 创建大型DOM树
    const container = document.createElement('div');
    for (let i = 0; i < 1000; i++) {
      const item = document.createElement('div');
      item.textContent = `Item ${i}`;
      item.dataset.index = i;
      container.appendChild(item);
    }
    
    console.log('   创建了1000个DOM节点');
    console.log('   即使不在文档中，仍占用内存');
    console.log('   必须设置 container = null 才能释放\n');
    
    // 清理
    // container = null;  // 取消注释以释放内存
  }
}

DOMReferenceLeak.demonstrate();
DOMReferenceLeak.demonstrateDetachedTree();
```

## 场景5：事件监听器未移除

累积的事件监听器导致内存泄漏：

```javascript
// 事件监听器泄漏示例
class EventListenerLeak {
  static demonstrateLeak() {
    console.log('=== 场景5：未移除的事件监听器 ===\n');
    
    console.log('❌ 问题代码:\n');
    
    class LeakyWidget {
      constructor(element) {
        this.element = element;
        this.data = new Array(100000).fill('data');
        
        // 添加事件监听器
        this.element.addEventListener('click', () => {
          console.log(this.data.length);
        });
        
        // 问题：没有保存监听器引用，无法移除
      }
      
      destroy() {
        // 无法移除监听器！
        // this.element仍然持有对widget的引用
      }
    }
    
    console.log('   问题：监听器持有闭包，闭包持有this.data\n');
    
    console.log('✅ 修复方法:\n');
    
    class FixedWidget {
      constructor(element) {
        this.element = element;
        this.data = new Array(100000).fill('data');
        
        // 保存监听器引用
        this.handleClick = () => {
          console.log(this.data.length);
        };
        
        this.element.addEventListener('click', this.handleClick);
      }
      
      destroy() {
        // 移除监听器
        this.element.removeEventListener('click', this.handleClick);
        this.handleClick = null;
        this.data = null;
        this.element = null;
      }
    }
    
    console.log('   关键：保存监听器引用，销毁时移除\n');
  }
  
  static demonstrateMultipleListeners() {
    console.log('场景：多个监听器管理\n');
    
    class Component {
      constructor() {
        this.listeners = [];
        this.data = new Array(100000).fill('data');
      }
      
      addListener(element, event, handler) {
        element.addEventListener(event, handler);
        
        // 记录所有监听器
        this.listeners.push({ element, event, handler });
      }
      
      setup() {
        // 添加多个监听器
        this.addListener(document, 'click', () => {});
        this.addListener(window, 'resize', () => {});
        this.addListener(document, 'keydown', () => {});
      }
      
      destroy() {
        // 批量移除所有监听器
        for (const { element, event, handler } of this.listeners) {
          element.removeEventListener(event, handler);
        }
        
        this.listeners = [];
        this.data = null;
        
        console.log('   所有监听器已移除\n');
      }
    }
  }
  
  static run() {
    this.demonstrateLeak();
    this.demonstrateMultipleListeners();
  }
}

EventListenerLeak.run();
```

## 场景6：缓存无限增长

没有大小限制的缓存会导致内存泄漏：

```javascript
// 缓存泄漏示例
class CacheLeak {
  static demonstrateLeak() {
    console.log('=== 场景6：无限增长的缓存 ===\n');
    
    console.log('❌ 问题代码:\n');
    
    class LeakyCache {
      constructor() {
        this.cache = new Map();
      }
      
      set(key, value) {
        // 没有大小限制，缓存会无限增长
        this.cache.set(key, value);
      }
      
      get(key) {
        return this.cache.get(key);
      }
    }
    
    const cache = new LeakyCache();
    
    // 模拟不断添加数据
    for (let i = 0; i < 10000; i++) {
      cache.set(`key${i}`, new Array(1000).fill(i));
    }
    
    console.log(`   缓存大小: ${cache.cache.size} 项`);
    console.log('   问题：缓存持续增长，旧数据永不释放\n');
  }
  
  static demonstrateFix() {
    console.log('✅ 修复方法1：LRU缓存\n');
    
    class LRUCache {
      constructor(maxSize = 1000) {
        this.maxSize = maxSize;
        this.cache = new Map();
      }
      
      get(key) {
        if (!this.cache.has(key)) {
          return undefined;
        }
        
        // 移到末尾（最近使用）
        const value = this.cache.get(key);
        this.cache.delete(key);
        this.cache.set(key, value);
        
        return value;
      }
      
      set(key, value) {
        // 如果存在，先删除
        if (this.cache.has(key)) {
          this.cache.delete(key);
        }
        
        // 添加到末尾
        this.cache.set(key, value);
        
        // 超过大小限制，删除最旧的
        if (this.cache.size > this.maxSize) {
          const firstKey = this.cache.keys().next().value;
          this.cache.delete(firstKey);
        }
      }
      
      get size() {
        return this.cache.size;
      }
    }
    
    const lru = new LRUCache(1000);
    
    // 添加数据
    for (let i = 0; i < 2000; i++) {
      lru.set(`key${i}`, new Array(1000).fill(i));
    }
    
    console.log(`   LRU缓存大小: ${lru.size} 项`);
    console.log('   优点：自动清理最久未使用的项\n');
    
    console.log('✅ 修复方法2：WeakMap缓存\n');
    
    class WeakMapCache {
      constructor() {
        // WeakMap的键必须是对象
        this.cache = new WeakMap();
      }
      
      set(key, value) {
        // 当key对象被回收时，缓存项自动清理
        this.cache.set(key, value);
      }
      
      get(key) {
        return this.cache.get(key);
      }
    }
    
    console.log('   WeakMap: 键对象被回收时自动清理');
    console.log('   适用场景：以对象为键的缓存\n');
  }
  
  static run() {
    this.demonstrateLeak();
    this.demonstrateFix();
  }
}

CacheLeak.run();
```

## 内存泄漏检测工具

使用Chrome DevTools检测内存泄漏：

```javascript
// 内存泄漏检测辅助工具
class LeakDetectionHelper {
  static demonstrateHeapSnapshot() {
    console.log('=== 使用Chrome DevTools检测泄漏 ===\n');
    
    console.log('步骤1：记录基线\n');
    console.log('  1. 打开Chrome DevTools');
    console.log('  2. 切换到Memory标签');
    console.log('  3. 选择"Heap snapshot"');
    console.log('  4. 点击"Take snapshot"记录初始状态\n');
    
    console.log('步骤2：执行操作\n');
    console.log('  1. 执行可能泄漏的操作');
    console.log('  2. 再次"Take snapshot"\n');
    
    console.log('步骤3：对比快照\n');
    console.log('  1. 选择第二个快照');
    console.log('  2. 在顶部下拉框选择"Comparison"');
    console.log('  3. 查看"# New"列（新增对象）');
    console.log('  4. 查看"# Deleted"列（删除对象）');
    console.log('  5. 查看"# Delta"列（净增长）\n');
    
    console.log('步骤4：分析泄漏对象\n');
    console.log('  1. 按"# Delta"排序，找到增长最多的类');
    console.log('  2. 展开查看具体对象');
    console.log('  3. 查看"Retainers"（保留路径）');
    console.log('  4. 找到根引用，确定泄漏原因\n');
  }
  
  static demonstrateAllocationTimeline() {
    console.log('=== 使用Allocation Timeline ===\n');
    
    console.log('适用场景：检测持续增长的内存\n');
    
    console.log('步骤：');
    console.log('  1. 选择"Allocation instrumentation on timeline"');
    console.log('  2. 点击"Start"');
    console.log('  3. 执行可能泄漏的操作');
    console.log('  4. 点击"Stop"');
    console.log('  5. 分析时间轴上的蓝色柱状（分配）');
    console.log('  6. 找到持续增长的对象类型\n');
  }
  
  static demonstrateAllocationSampling() {
    console.log('=== 使用Allocation Sampling ===\n');
    
    console.log('适用场景：低开销的长时间监控\n');
    
    console.log('步骤：');
    console.log('  1. 选择"Allocation sampling"');
    console.log('  2. 点击"Start"');
    console.log('  3. 让应用运行一段时间');
    console.log('  4. 点击"Stop"');
    console.log('  5. 查看调用树，找到分配内存最多的函数\n');
  }
  
  static runAll() {
    this.demonstrateHeapSnapshot();
    this.demonstrateAllocationTimeline();
    this.demonstrateAllocationSampling();
  }
}

LeakDetectionHelper.runAll();
```

## 自动化内存泄漏检测

编写测试检测内存泄漏：

```javascript
// 自动化泄漏检测
class AutomatedLeakDetection {
  static async detectLeak(operation, iterations = 10) {
    console.log('=== 自动化泄漏检测 ===\n');
    
    const snapshots = [];
    
    // 记录多个快照
    for (let i = 0; i < iterations; i++) {
      // 强制GC
      if (global.gc) {
        global.gc();
      }
      
      // 记录内存
      const memBefore = process.memoryUsage().heapUsed;
      
      // 执行操作
      await operation();
      
      // 强制GC
      if (global.gc) {
        global.gc();
      }
      
      // 记录内存
      const memAfter = process.memoryUsage().heapUsed;
      
      snapshots.push({
        iteration: i,
        memBefore,
        memAfter,
        growth: memAfter - memBefore
      });
      
      console.log(`迭代 ${i + 1}: ${(memAfter / 1024 / 1024).toFixed(2)} MB`);
    }
    
    // 分析趋势
    this.analyzeTrend(snapshots);
  }
  
  static analyzeTrend(snapshots) {
    console.log('\n=== 泄漏分析 ===\n');
    
    // 计算平均增长
    const avgGrowth = snapshots.reduce((sum, s) => sum + s.growth, 0) / snapshots.length;
    
    // 计算增长趋势
    const firstMem = snapshots[0].memAfter;
    const lastMem = snapshots[snapshots.length - 1].memAfter;
    const totalGrowth = lastMem - firstMem;
    const growthPercent = (totalGrowth / firstMem) * 100;
    
    console.log(`总增长: ${(totalGrowth / 1024 / 1024).toFixed(2)} MB`);
    console.log(`增长百分比: ${growthPercent.toFixed(2)}%`);
    console.log(`平均每次增长: ${(avgGrowth / 1024 / 1024).toFixed(2)} MB`);
    
    // 判断是否泄漏
    if (growthPercent > 50) {
      console.log('\n⚠️  可能存在内存泄漏！');
    } else if (growthPercent > 20) {
      console.log('\n⚠️  内存增长较多，需要关注');
    } else {
      console.log('\n✅ 内存增长正常');
    }
  }
}

// 使用示例
// AutomatedLeakDetection.detectLeak(async () => {
//   // 执行可能泄漏的操作
//   const arr = new Array(100000).fill('data');
// }, 10);
```

## 本章小结

本章深入探讨了JavaScript中常见的内存泄漏场景。我们学习了以下核心内容：

1. **意外全局变量**：未声明的变量成为全局变量，永不释放。解决：使用严格模式和let/const。

2. **未清理的定时器**：setInterval持续引用对象。解决：组件销毁时clearInterval。

3. **闭包引用**：闭包意外持有大对象引用。解决：只保留必要数据。

4. **DOM引用**：分离的DOM节点仍被引用。解决：移除DOM时清理引用。

5. **事件监听器**：未移除的监听器累积。解决：保存引用，销毁时移除。

6. **缓存增长**：无限增长的缓存。解决：使用LRU缓存或WeakMap。

7. **检测工具**：Chrome DevTools的Heap Snapshot、Allocation Timeline等。

8. **自动化检测**：编写测试检测内存增长趋势。

理解这些泄漏场景，能够帮助你避免内存问题，写出更健壮的应用。在下一章中，我们将深入探讨内存快照分析工具的使用。
