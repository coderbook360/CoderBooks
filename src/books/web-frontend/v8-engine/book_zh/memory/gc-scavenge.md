# Scavenge 算法：新生代的快速回收

在上一章中，我们了解了 V8 垃圾回收的整体架构。本章将深入新生代回收的核心——**Scavenge 算法**。

你可能听说过"Scavenge 很快，但浪费空间"。为什么会这样？它是如何在毫秒级完成回收的？本章将揭开这个算法的所有秘密。

## 问题的起点：为什么需要快速回收？

让我们先看看新生代对象的特点：

```javascript
function processRequests() {
  // 每个请求处理中都会创建大量临时对象
  app.get('/api/users', (req, res) => {
    const query = parseQuery(req.url);     // 临时对象
    const result = database.query(query);  // 临时对象
    const response = format(result);       // 临时对象
    res.send(response);
    // 这些对象在响应发送后就不再需要了
  });
}
```

**观察**：
- 函数每秒可能被调用数百次
- 每次调用创建多个临时对象
- 这些对象生命周期极短（几毫秒）
- 需要快速回收，否则新生代很快会满

**Scavenge 的设计目标**：
1. **极快**：回收速度必须在毫秒级
2. **简单**：算法逻辑要足够简单，减少 CPU 消耗
3. **停顿短**：JavaScript 执行暂停时间要短

## 半空间复制策略

Scavenge 算法的核心思想是：**将内存分为两半，每次只使用一半**。

### 基本结构

```
新生代内存布局：

┌───────────────────────────────────────────┐
│          新生代 (8MB，典型值)              │
├───────────────────────────────────────────┤
│                                           │
│  ┌──────────────────┬──────────────────┐ │
│  │   From Space     │    To Space      │ │
│  │     (4MB)        │     (4MB)        │ │
│  ├──────────────────┼──────────────────┤ │
│  │  ┌──┐ ┌──┐ ┌──┐ │                  │ │
│  │  │A │ │B │ │C │ │   (空闲)          │ │
│  │  └──┘ └──┘ └──┘ │                  │ │
│  │   ↑   ×   ↑     │                  │ │
│  │ 存活 死亡 存活   │                  │ │
│  └──────────────────┴──────────────────┘ │
│                                           │
└───────────────────────────────────────────┘

From Space：当前活跃的内存区域，新对象在这里分配
To Space：  空闲区域，GC 时存放存活对象
```

**关键设计**：
- 新生代被等分为两个 Semispace
- 任何时候只有一个空间（From Space）处于使用状态
- 另一个空间（To Space）保持空闲，等待 GC 时使用

### 分配对象：指针碰撞（Bump Allocation）

在 From Space 中分配对象非常简单：

```javascript
// 伪代码：对象分配
class SemispaceAllocator {
  constructor(size) {
    this.start = 0;                    // 空间起始地址
    this.end = size;                   // 空间结束地址
    this.allocationPointer = this.start;  // 当前分配指针
  }
  
  allocate(objectSize) {
    // 检查空间是否足够
    if (this.allocationPointer + objectSize > this.end) {
      // 空间不足，触发 Scavenge GC
      triggerScavenge();
      
      // GC 后重试
      if (this.allocationPointer + objectSize > this.end) {
        throw new Error('Out of memory');
      }
    }
    
    // 分配：仅仅是移动指针！
    const address = this.allocationPointer;
    this.allocationPointer += objectSize;
    
    return address;
  }
}
```

**为什么分配如此快速？**
- 只需要简单的指针移动（加法运算）
- 无需查找空闲块
- 无需维护空闲列表
- **时间复杂度：O(1)**

对比老生代的分配：
```javascript
// 老生代：需要在空闲列表中查找合适的块
findFreeBlock(size) {
  for (let block of freeList) {  // 遍历，O(n)
    if (block.size >= size) {
      return block;
    }
  }
  return null;
}
```

## Scavenge 的完整流程

当 From Space 满了，Scavenge GC 会被触发。让我们逐步看看它做了什么。

### 第一步：标记根对象

**什么是根对象（GC Roots）？**

根对象是垃圾回收的起点，包括：
- 全局对象（`window` / `global`）
- 当前调用栈上的局部变量
- 活跃的闭包捕获的变量

```javascript
// 示例：哪些是根对象？
const globalVar = { data: 1 };  // ← 根对象（全局变量）

function outer() {
  const outerVar = { data: 2 };  // ← 根对象（栈上变量）
  
  return function inner() {
    console.log(outerVar);  // outerVar 被闭包捕获 → 根对象
    
    const innerVar = { data: 3 };  // ← 根对象（栈上变量）
    const temp = { data: 4 };      // ← 根对象（栈上变量）
  };
}

const closure = outer();

// 此时的根对象：globalVar, closure, outerVar
// temp 和 innerVar 已经出栈，不再是根
```

### 第二步：复制存活对象

Scavenge 会遍历所有根对象，将它们及其引用的对象复制到 To Space：

```
初始状态（From Space）：

根对象 → A → B → C
         ↓
         D

对象 E（无人引用，将被回收）

复制过程：
1. 从根对象开始，复制 A 到 To Space
2. A 引用了 B 和 D，复制 B 和 D
3. B 引用了 C，复制 C
4. E 没有被任何对象引用，不复制

结果（To Space）：
A → B → C
↓
D

From Space：
[空] [空] [空] [E 被回收]
```

**复制算法（Cheney 算法）**：

```javascript
// 伪代码：Cheney 复制算法
function scavenge() {
  // To Space 的分配指针
  let scanPointer = toSpace.start;
  let allocationPointer = toSpace.start;
  
  // 1. 复制根对象
  for (let root of gcRoots) {
    const newAddress = copy(root, allocationPointer);
    root.updateAddress(newAddress);  // 更新根引用
    allocationPointer += root.size;
  }
  
  // 2. 扫描已复制的对象，复制它们引用的对象
  while (scanPointer < allocationPointer) {
    const obj = readObject(scanPointer);
    
    // 遍历该对象的所有引用
    for (let field of obj.referenceFields) {
      const referenced = field.value;
      
      if (!referenced.hasForwardingAddress()) {
        // 未复制过，立即复制
        const newAddress = copy(referenced, allocationPointer);
        referenced.setForwardingAddress(newAddress);
        allocationPointer += referenced.size;
      }
      
      // 更新引用，指向新地址
      field.value = referenced.getForwardingAddress();
    }
    
    scanPointer += obj.size;
  }
  
  // 3. 交换 From 和 To
  swap(fromSpace, toSpace);
  
  // 4. 清空新的 To Space（原来的 From Space）
  toSpace.clear();
}

function copy(obj, address) {
  // 将对象内容复制到新地址
  memcpy(address, obj.address, obj.size);
  return address;
}
```

**关键技术：转发地址（Forwarding Address）**

当一个对象被复制到 To Space 后，V8 会在原对象的位置记录新地址，这就是转发地址：

```
From Space 中的对象 A：
┌─────────────────┐
│  对象 A 的原始内容 │
└─────────────────┘
       ↓ 复制后
┌─────────────────┐
│ 转发地址 → To:100 │  ← 原位置被修改为指向新地址
└─────────────────┘

To Space：
地址 100:
┌─────────────────┐
│  对象 A 的副本   │
└─────────────────┘
```

**为什么需要转发地址？**

避免重复复制：
```javascript
const obj = { name: 'A' };
const arr = [obj, obj, obj];  // obj 被引用 3 次

// 如果没有转发地址：
// 第1次遇到 obj → 复制到 To Space
// 第2次遇到 obj → 再复制一次（错误！）
// 第3次遇到 obj → 又复制一次（错误！）

// 有了转发地址：
// 第1次遇到 obj → 复制，记录转发地址
// 第2次遇到 obj → 发现有转发地址，直接使用
// 第3次遇到 obj → 同上
```

### 第三步：交换 From 和 To

复制完成后，存活对象都在 To Space 中，From Space 中只剩垃圾。

V8 直接**交换两个空间的角色**：
- 原来的 To Space（现在有存活对象） → 新的 From Space
- 原来的 From Space（现在只有垃圾） → 新的 To Space

```javascript
// 交换空间（伪代码）
function swapSpaces() {
  // 简单地交换指针！
  [fromSpace, toSpace] = [toSpace, fromSpace];
  
  // 重置新 To Space 的分配指针
  toSpace.allocationPointer = toSpace.start;
}
```

**为什么不需要清空垃圾？**

因为下次分配对象时，会直接覆盖旧数据。这又是一个**空间换时间**的设计。

## 对象晋升（Promotion）

不是所有存活对象都会留在新生代。如果一个对象经历了多次 Scavenge 仍然存活，它会被**晋升**到老生代。

### 晋升条件

V8 使用两个条件判断是否晋升：

**条件1：年龄阈值**
```javascript
// 伪代码：年龄检查
if (obj.age >= 2) {
  promoteToOldGeneration(obj);
}
```

每个对象有一个 `age` 字段：
- 对象首次分配时，`age = 0`
- 每经历一次 Scavenge，`age++`
- 当 `age >= 2` 时，晋升

**条件2：To Space 使用率**
```javascript
// 伪代码：空间压力检查
const toSpaceUsage = toSpace.used / toSpace.size;

if (toSpaceUsage > 0.25) {
  // To Space 使用超过 25%，提前晋升
  promoteToOldGeneration(obj);
}
```

**为什么有第二个条件？**

假设没有空间压力检查：
```
场景：一次 GC 后，大量对象存活（比如 90% 存活率）
问题：这些对象都复制到 To Space，占用 90% 空间
后果：下次分配只有 10% 空间可用，很快又触发 GC
结果：频繁 GC，性能下降

解决：提前晋升部分对象，给新生代留出更多空间
```

### 晋升过程

晋升就是将对象从新生代复制到老生代：

```javascript
// 伪代码：晋升对象
function promoteToOldGeneration(obj) {
  // 1. 在老生代分配空间
  const newAddress = oldGeneration.allocate(obj.size);
  
  // 2. 复制对象内容
  memcpy(newAddress, obj.address, obj.size);
  
  // 3. 记录转发地址（指向老生代）
  obj.setForwardingAddress(newAddress);
  
  // 4. 更新所有引用
  updateAllReferences(obj, newAddress);
}
```

## 性能分析

### Scavenge 的优势

**1. 速度极快**
```
典型 Scavenge 耗时：1-5 毫秒
复制 1MB 对象（假设存活率 10%）：
- 只需复制 100KB 数据
- 现代 CPU 复制速度：10 GB/s
- 理论时间：0.01 毫秒
```

**2. 无内存碎片**
```
From Space：
[A] [B] [] [C] []  ← 碎片化

复制后的 To Space：
[A] [B] [C] []     ← 紧凑排列，无碎片
```

**3. 算法简单**
- 单次遍历，无需复杂的数据结构
- 易于实现和优化
- CPU 缓存友好（顺序访问）

### Scavenge 的代价

**1. 空间利用率低（50%）**
```
新生代总容量：8MB
实际可用：4MB（另外 4MB 作为 To Space）
空间浪费：50%
```

**为什么可以接受？**
- 新生代本身很小（通常 8MB）
- 浪费的绝对值不大（4MB）
- 速度提升远超空间损失

**2. 复制开销**
```
存活率越高，复制越多：
- 存活率 10%：复制 400KB（很快）
- 存活率 50%：复制 2MB（较慢）
- 存活率 90%：复制 3.6MB（很慢）
```

**解决方案**：晋升机制
- 高存活率的对象会被晋升
- 保持新生代的存活率在低水平

**3. 不适合大对象**
```
假设对象大小：2MB
新生代可用：4MB

问题：分配 2 个对象后就满了，频繁 GC
解决：大对象直接分配在老生代或大对象空间
```

## 实战：观察 Scavenge

让我们写一段代码，观察 Scavenge 的行为：

```javascript
// 触发多次 Scavenge
function triggerScavenge() {
  const array = [];
  
  // 分配大量临时对象
  for (let i = 0; i < 1000000; i++) {
    const temp = { index: i, data: new Array(100) };
    
    // 只保留部分对象（模拟 10% 存活率）
    if (i % 10 === 0) {
      array.push(temp);
    }
    // 其他 90% 的对象成为垃圾
  }
  
  return array;
}

// 使用 Node.js 的 --trace-gc 标志运行：
// node --trace-gc script.js

// 输出示例：
// [1234:0x...]   Scavenge 2.1 (3.5) -> 0.3 (4.0) MB, 1.2 ms
//                ^^^^^^^^           ^^^^         ^^^^^^^
//                回收类型        回收后大小   耗时（毫秒）
```

**观察要点**：
- Scavenge 触发频率（取决于分配速度）
- 每次回收耗时（通常 1-5ms）
- 存活对象大小（反映存活率）

## 代码优化建议

理解 Scavenge 后，我们可以写出对 GC 更友好的代码。

### 1. 减少临时对象分配

```javascript
// ❌ 不好：每次调用创建新对象
function process(data) {
  const config = { timeout: 1000, retries: 3 };
  return fetch(data, config);
}

// ✅ 好：复用配置对象
const CONFIG = { timeout: 1000, retries: 3 };
function process(data) {
  return fetch(data, CONFIG);
}
```

### 2. 使用对象池

```javascript
// 对象池模式
class ObjectPool {
  constructor(create, reset, initialSize = 10) {
    this.create = create;
    this.reset = reset;
    this.pool = [];
    
    // 预分配对象
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(create());
    }
  }
  
  acquire() {
    return this.pool.pop() || this.create();
  }
  
  release(obj) {
    this.reset(obj);
    this.pool.push(obj);
  }
}

// 使用示例
const vectorPool = new ObjectPool(
  () => ({ x: 0, y: 0, z: 0 }),
  (v) => { v.x = 0; v.y = 0; v.z = 0; }
);

function calculate() {
  const v = vectorPool.acquire();  // 从池中获取
  v.x = 1; v.y = 2; v.z = 3;
  // ... 使用 v ...
  vectorPool.release(v);  // 归还给池
}
```

### 3. 避免闭包捕获大对象

```javascript
// ❌ 不好：闭包捕获大数组
function badClosure() {
  const bigArray = new Array(1000000);
  
  return function() {
    // 即使不使用 bigArray，它也无法被回收
    console.log('hello');
  };
}

// ✅ 好：只捕获必要的数据
function goodClosure() {
  const bigArray = new Array(1000000);
  const summary = bigArray.length;  // 提取需要的数据
  
  return function() {
    console.log(summary);  // 只捕获 summary，bigArray 可以被回收
  };
}
```

## 本章小结

1. **半空间复制**：Scavenge 将新生代分为两半，通过复制存活对象来回收内存

2. **极快的分配**：指针碰撞分配，时间复杂度 O(1)

3. **Cheney 算法**：使用两个指针（scan 和 allocation）实现高效复制

4. **转发地址**：避免重复复制同一个对象

5. **对象晋升**：经历 2 次 Scavenge 或空间压力大时，对象晋升到老生代

6. **权衡取舍**：
   - ✅ 速度快（1-5ms）
   - ✅ 无碎片
   - ⚠️ 空间利用率低（50%）
   - ⚠️ 不适合大对象

7. **优化建议**：减少临时对象、使用对象池、避免闭包捕获大对象

在下一章中，我们将深入老生代回收算法——Mark-Sweep-Compact，看看它如何处理长命对象。
