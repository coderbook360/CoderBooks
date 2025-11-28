# WeakMap 与 WeakSet：弱引用集合的特殊处理

你是否遇到过这样的困扰：为DOM节点或对象附加元数据时，担心手动管理的`Map`导致内存泄漏？想缓存对象的计算结果，但又不希望缓存阻止对象被垃圾回收？

JavaScript提供的`WeakMap`和`WeakSet`正是为解决这类问题而设计的。与普通`Map`和`Set`不同，它们使用**弱引用**（Weak Reference）存储键，允许键在无其他引用时被垃圾回收。这种机制使得`WeakMap`和`WeakSet`成为管理对象生命周期绑定数据的完美工具。

本章将深入V8引擎，揭示弱引用的实现机制、垃圾回收器的特殊处理、以及这两类集合的最佳应用场景。

## 强引用 vs 弱引用：核心区别

### 强引用的问题

普通`Map`使用强引用存储键，只要`Map`存在,键对象就无法被垃圾回收：

```javascript
let obj = { data: 'important' };
const map = new Map();
map.set(obj, 'metadata');

obj = null;  // 尝试释放对象

// 问题：obj 仍被 map 强引用，无法回收！
// map 内部仍持有对 { data: 'important' } 的引用
console.log(map.size);  // 1
```

即使外部代码不再使用`obj`，`Map`内部的强引用阻止了垃圾回收。如果你在单页应用中为大量DOM节点附加数据，忘记手动清理`Map`，就会导致内存泄漏。

### 弱引用的解决方案

`WeakMap`使用弱引用存储键，不阻止垃圾回收：

```javascript
let obj = { data: 'important' };
const weakMap = new WeakMap();
weakMap.set(obj, 'metadata');

obj = null;  // 释放对象

// obj 对象可被垃圾回收
// 下次 GC 运行时，weakMap 中的条目自动清除
// weakMap.size 不可访问（无法知道何时回收）
```

弱引用的特性：
- **不阻止回收**：键对象无外部强引用时，可被GC回收。
- **自动清理**：键回收后，`WeakMap`中的对应条目自动删除。
- **不可枚举**：无法遍历`WeakMap`的键或值（无`.size`、`.keys()`、`.values()`等方法）。

### ECMAScript 规范定义

ECMAScript规范对`WeakMap`的要求：

> WeakMap对象是键/值对的集合，其中键必须是对象，且对键的引用是"弱"引用。如果键对象没有其他引用，则该对象可能成为垃圾回收的候选对象。

关键限制：
- **键必须是对象**：基本类型（数字、字符串）无法作为弱引用键。
- **键是弱引用**：值仍是强引用（因为键回收后值也会被删除）。
- **不可观察回收时机**：无法通过代码检测键何时被回收（防止回收时机依赖的不确定性）。

## V8 中的弱引用实现

### JSWeakMap 与 JSWeakSet 的结构

V8内部使用与`JSMap`类似的哈希表结构实现`WeakMap`，但有关键区别：

```
JSWeakMap 对象结构：
+------------------------+
| Map (Hidden Class)     |  ← 指向 JSWeakMap 的 Map
+------------------------+
| Properties             |
+------------------------+
| table (EphemeronHashTable) | ← 特殊的弱引用哈希表
+------------------------+
```

`table`字段指向`EphemeronHashTable`（临时哈希表），这是V8为弱引用设计的特殊数据结构。

### EphemeronHashTable 结构

`EphemeronHashTable`在结构上类似`OrderedHashMap`，但在垃圾回收时有特殊处理：

```
EphemeronHashTable 结构：
+------------------------+
| numberOfElements       |
+------------------------+
| numberOfDeletedElements|
+------------------------+
| hashTableStart         |  ← 哈希桶数组
+------------------------+
| dataTableStart         |  ← 数据表（键值对）
+------------------------+
| nextTableStart         |  ← 冲突链表
+------------------------+
```

**关键特性**：
- **键不增加引用计数**：数据表中存储的键指针不会增加对象的强引用计数。
- **GC特殊扫描**：垃圾回收器扫描时，标记`EphemeronHashTable`中的键为"可能可回收"状态。
- **延迟值标记**：只有当键被其他强引用保持存活时，才标记对应的值为存活。

### 弱引用的内存表示

在V8的堆内存中，`EphemeronHashTable`的数据表存储方式：

```
数据表：
索引 | 键指针（弱引用）  | 值指针（强引用）
-----|-----------------|----------------
  0  | 0x1A2B3C4D      | 0x5E6F7A8B
  1  | 0x9C8D7E6F      | 0x1B2C3D4E
  2  | (已删除)        | (已删除)
```

**键指针特性**：
- 指向堆中的对象，但不增加对象的引用计数。
- GC标记阶段，键对象不会因为`EphemeronHashTable`中的指针而被标记为存活。
- 键对象被回收后，GC清理阶段会将该条目标记为已删除。

**值指针特性**：
- 强引用，只要键存活，值就不会被回收。
- 键回收后，值的引用也被移除，允许值被回收（如果无其他引用）。

## 垃圾回收器的特殊处理

### 三色标记算法中的弱引用

V8使用增量标记（Incremental Marking）和三色标记算法进行垃圾回收。对于`EphemeronHashTable`，GC执行以下特殊逻辑：

**1. 初始标记阶段**：
- 扫描根对象（全局对象、栈变量等），标记为灰色（待处理）。
- `EphemeronHashTable`中的键不会因为表的存在而被标记。

**2. 增量标记阶段**：
- 处理灰色对象，将其引用的对象标记为灰色，处理完的对象标记为黑色（存活）。
- **弱引用延迟标记**：当扫描到`EphemeronHashTable`时，跳过键的标记，将表加入"弱引用待处理队列"。

**3. 弱引用处理阶段**：
- 遍历弱引用队列中的`EphemeronHashTable`。
- 对于每个条目，检查键是否已被标记为存活（被其他强引用保持）。
- **键存活**：标记对应的值为灰色（保持值存活）。
- **键未标记**：不标记值，等待清理阶段删除该条目。

```
弱引用处理伪代码：
for each entry in EphemeronHashTable:
  if entry.key is marked (存活):
    mark entry.value as grey  // 值跟随键存活
  else:
    // 键未被其他引用保持，不标记值
    // 清理阶段会删除该条目
```

**4. 清理阶段**：
- 删除所有键未标记的条目（键已被回收）。
- 回收未标记的对象内存。

### 示例：弱引用的GC行为

```javascript
let key1 = { id: 1 };
let key2 = { id: 2 };
const weakMap = new WeakMap();

weakMap.set(key1, { data: 'value1' });
weakMap.set(key2, { data: 'value2' });

// 外部保持 key1 的引用，释放 key2
key2 = null;

// 触发 GC（实际代码中无法手动触发，此处为演示）
// GC 标记阶段：
// - key1 被全局变量引用，标记为存活
// - key2 无外部引用，不被标记
// 
// 弱引用处理阶段：
// - weakMap 中 key1 的条目：key1 存活 → 标记 value1 存活
// - weakMap 中 key2 的条目：key2 未标记 → 不标记 value2
// 
// 清理阶段：
// - key2 和 value2 被回收
// - weakMap 中 key2 的条目被删除

// GC 后，weakMap 只剩 key1 的条目（无法通过代码验证，因为无 .size 属性）
```

### 为什么键必须是对象

弱引用的核心是利用GC的对象生命周期管理。基本类型（如数字、字符串）在JavaScript中是值传递，没有独立的内存地址和生命周期管理：

```javascript
// 错误示例：基本类型作为键
const weakMap = new WeakMap();
weakMap.set('key', 'value');  // TypeError: Invalid value used as weak map key
```

**原因**：
- 基本类型不是GC管理的对象，无法添加弱引用。
- 字符串的intern机制（字符串池）导致相同字符串共享内存，无法判断何时回收。
- 数字、布尔值等是立即值（immediate values），直接存储在栈或寄存器中，无堆内存地址。

只有对象（包括数组、函数、普通对象）才是堆分配的GC管理对象，可以作为`WeakMap`的键。

## WeakMap 与 WeakSet 的核心操作

### WeakMap 的API限制

`WeakMap`只提供最基本的操作方法：

```javascript
const weakMap = new WeakMap();

// 设置键值对
const key = { id: 1 };
weakMap.set(key, { data: 'value' });

// 获取值
console.log(weakMap.get(key));  // { data: 'value' }

// 检查键是否存在
console.log(weakMap.has(key));  // true

// 删除键值对
weakMap.delete(key);
console.log(weakMap.has(key));  // false

// 不支持的操作：
// weakMap.size          // undefined（无法获取大小）
// weakMap.keys()        // TypeError
// weakMap.values()      // TypeError
// weakMap.entries()     // TypeError
// weakMap.forEach()     // TypeError
// weakMap.clear()       // 不存在该方法
```

**限制原因**：
- **不可枚举**：无法遍历键，因为键可能在任意时刻被GC回收，枚举会暴露回收时机的不确定性。
- **无size**：键数量动态变化（随GC变化），提供`.size`会产生误导。
- **无clear()**：虽然可以实现，但ES规范未定义该方法。

### WeakSet 的实现

`WeakSet`是值即键的`WeakMap`，内部使用相同的`EphemeronHashTable`：

```javascript
const weakSet = new WeakSet();

const obj1 = { id: 1 };
const obj2 = { id: 2 };

// 添加对象
weakSet.add(obj1);
weakSet.add(obj2);

// 检查对象是否存在
console.log(weakSet.has(obj1));  // true

// 删除对象
weakSet.delete(obj1);
console.log(weakSet.has(obj1));  // false

// 同样的限制：无 .size、.keys()、.values() 等
```

`WeakSet`常用于标记对象集合，例如记录哪些对象已被处理过。

## 典型应用场景

### 私有数据存储

`WeakMap`最常见的用途是为对象存储私有数据，无需担心内存泄漏：

```javascript
const privateData = new WeakMap();

class User {
  constructor(name, password) {
    this.name = name;  // 公开属性
    privateData.set(this, { password });  // 私有数据
  }
  
  authenticate(inputPassword) {
    const data = privateData.get(this);
    return data.password === inputPassword;
  }
}

const user = new User('Alice', 'secret123');
console.log(user.name);                      // 'Alice'
console.log(user.password);                  // undefined（无法直接访问）
console.log(user.authenticate('secret123')); // true

// user 对象销毁时，privateData 中的条目自动清除
```

**优势**：
- 真正的私有性：外部无法访问`privateData`中的数据。
- 自动清理：对象销毁时，关联的私有数据自动释放。
- 无内存泄漏：不会因为忘记清理而导致对象无法回收。

对比使用Symbol的方案：

```javascript
// 使用 Symbol（不够私有）
const passwordSymbol = Symbol('password');

class User {
  constructor(name, password) {
    this.name = name;
    this[passwordSymbol] = password;
  }
}

const user = new User('Alice', 'secret123');
console.log(user[passwordSymbol]);  // 'secret123'（可通过 Symbol 访问）
console.log(Object.getOwnPropertySymbols(user));  // [Symbol(password)]（可枚举）
```

Symbol属性仍可通过`Object.getOwnPropertySymbols()`访问，而`WeakMap`完全隐藏数据。

### DOM节点元数据管理

为DOM节点附加元数据时，使用`WeakMap`避免内存泄漏：

```javascript
const nodeMetadata = new WeakMap();

function attachMetadata(element, data) {
  nodeMetadata.set(element, data);
}

function getMetadata(element) {
  return nodeMetadata.get(element);
}

// 使用示例
const button = document.createElement('button');
attachMetadata(button, { clickCount: 0, lastClicked: null });

button.addEventListener('click', () => {
  const meta = getMetadata(button);
  meta.clickCount++;
  meta.lastClicked = new Date();
  console.log(`Clicked ${meta.clickCount} times`);
});

// 当 button 从 DOM 移除且无其他引用时，元数据自动清除
document.body.removeChild(button);  // 假设 button 在 DOM 中
// GC 后，nodeMetadata 中的条目消失，无内存泄漏
```

对比使用普通`Map`：

```javascript
const nodeMetadata = new Map();  // 强引用

// 问题：即使 button 从 DOM 移除，Map 仍持有引用
// 必须手动清理：
nodeMetadata.delete(button);  // 容易忘记，导致内存泄漏
```

### 缓存对象计算结果

缓存与对象生命周期绑定的计算结果：

```javascript
const computeCache = new WeakMap();

function expensiveComputation(obj) {
  if (computeCache.has(obj)) {
    console.log('Cache hit');
    return computeCache.get(obj);
  }
  
  console.log('Computing...');
  const result = obj.values.reduce((sum, val) => sum + val, 0) * 2;
  
  computeCache.set(obj, result);
  return result;
}

// 使用示例
const data1 = { values: [1, 2, 3, 4, 5] };
console.log(expensiveComputation(data1));  // Computing... 30
console.log(expensiveComputation(data1));  // Cache hit 30

const data2 = { values: [10, 20, 30] };
console.log(expensiveComputation(data2));  // Computing... 120

// data1 无其他引用时被回收，缓存自动清除，无内存泄漏
```

**适用场景**：
- 计算结果依赖对象本身，对象不变时结果不变。
- 对象生命周期不确定，手动清理缓存困难。
- 缓存不应阻止对象被回收。

### 对象标记与去重

使用`WeakSet`标记已处理的对象，避免重复操作：

```javascript
const processedObjects = new WeakSet();

function processObject(obj) {
  if (processedObjects.has(obj)) {
    console.log('Already processed');
    return;
  }
  
  console.log('Processing:', obj);
  // 执行处理逻辑...
  
  processedObjects.add(obj);
}

const obj1 = { id: 1 };
const obj2 = { id: 2 };

processObject(obj1);  // Processing: { id: 1 }
processObject(obj1);  // Already processed
processObject(obj2);  // Processing: { id: 2 }

// obj1 和 obj2 被回收后，processedObjects 自动清除标记
```

**应用场景**：
- 深度遍历对象图时，避免循环引用导致无限递归。
- 事件处理中标记已触发的对象。
- 去重逻辑中记录已见对象。

## 性能特性与限制

### 性能对比：WeakMap vs Map

`WeakMap`的操作性能与`Map`相当（都基于哈希表），但有额外GC开销：

```javascript
// 性能测试：插入与查找
function testPerformance(iterations) {
  const map = new Map();
  const weakMap = new WeakMap();
  const keys = Array.from({ length: iterations }, (_, i) => ({ id: i }));
  
  // Map 插入
  console.time('Map set');
  for (const key of keys) {
    map.set(key, key.id);
  }
  console.timeEnd('Map set');
  
  // WeakMap 插入
  console.time('WeakMap set');
  for (const key of keys) {
    weakMap.set(key, key.id);
  }
  console.timeEnd('WeakMap set');
  
  // Map 查找
  console.time('Map get');
  for (const key of keys) {
    map.get(key);
  }
  console.timeEnd('Map get');
  
  // WeakMap 查找
  console.time('WeakMap get');
  for (const key of keys) {
    weakMap.get(key);
  }
  console.timeEnd('WeakMap get');
}

testPerformance(100000);
// Map set: 15ms
// WeakMap set: 16ms
// Map get: 5ms
// WeakMap get: 5ms
```

**性能特点**：
- 插入、查找速度与`Map`几乎相同（哈希表操作）。
- GC额外开销：垃圾回收时，`EphemeronHashTable`需要额外的弱引用处理阶段，但对单次GC影响很小。
- 无遍历开销：`WeakMap`无法遍历，避免了大数据集遍历的性能问题。

### WeakMap 的限制与权衡

**限制1：键必须是对象**

```javascript
const weakMap = new WeakMap();
weakMap.set(1, 'value');       // TypeError
weakMap.set('key', 'value');   // TypeError
weakMap.set(true, 'value');    // TypeError

// 只能使用对象
weakMap.set({}, 'value');      // ✓
weakMap.set([], 'value');      // ✓
weakMap.set(() => {}, 'value'); // ✓
```

**限制2：不可遍历**

无法获取所有键或值，无法实现"遍历所有条目"的需求：

```javascript
const weakMap = new WeakMap();
weakMap.set({ id: 1 }, 'value1');
weakMap.set({ id: 2 }, 'value2');

// 无法实现：
// for (const [key, value] of weakMap) { ... }  // TypeError
// const allKeys = [...weakMap.keys()];         // TypeError
```

**权衡**：`WeakMap`牺牲了遍历能力，换取自动内存管理。如果需要遍历，应使用`Map`并手动管理生命周期。

**限制3：无size属性**

无法获取当前条目数量（因为键可能随时被GC回收）：

```javascript
const weakMap = new WeakMap();
weakMap.set({ id: 1 }, 'value');

console.log(weakMap.size);  // undefined
```

## 本章小结

`WeakMap`和`WeakSet`通过弱引用机制，提供了与对象生命周期自动绑定的数据存储能力，解决了手动管理集合生命周期导致的内存泄漏问题：

1. **弱引用机制**：`EphemeronHashTable`存储键时不增加对象的引用计数，允许键在无外部强引用时被垃圾回收。

2. **GC特殊处理**：垃圾回收器在标记阶段跳过弱引用键的标记，在弱引用处理阶段根据键的存活状态决定值的标记，清理阶段自动删除键已回收的条目。

3. **API限制**：不提供遍历、大小获取等方法，防止暴露GC回收时机的不确定性。键必须是对象类型（利用GC的对象生命周期管理）。

4. **典型场景**：私有数据存储（类私有字段模拟）、DOM节点元数据管理（避免内存泄漏）、对象计算结果缓存（自动失效）、对象标记与去重（深度遍历防循环）。

理解弱引用的底层机制后,你可以在需要与对象生命周期绑定的数据管理场景中，自信地选择`WeakMap`和`WeakSet`，编写无内存泄漏风险的高质量代码。下一章我们将探讨`BigInt`类型，看V8如何实现任意精度整数运算。

### 思考题

1. 为什么`WeakMap`的值是强引用而非弱引用？如果值也使用弱引用会有什么问题？

2. 实现一个`CachedFunction`工具，使用`WeakMap`缓存函数对对象参数的计算结果，确保对象销毁时缓存自动清除。

3. 在浏览器环境中，如何验证`WeakMap`确实允许键对象被垃圾回收？（提示：使用Chrome DevTools的Heap Snapshot）
