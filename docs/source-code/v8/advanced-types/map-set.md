# Map 与 Set：哈希表的底层实现

你是否好奇过，为什么`Map`查找元素的速度可以做到接近O(1)？为什么`Set`能快速判断元素是否存在？而使用普通对象作为字典时，却会遇到键必须是字符串的限制？

JavaScript提供的`Map`和`Set`数据结构，底层采用了高效的哈希表实现。与普通对象相比，它们支持任意类型作为键，提供了更丰富的API，且在频繁增删场景下性能更优。本章将深入V8引擎，揭示`Map`和`Set`的哈希表实现细节、哈希冲突解决策略、以及内存布局和性能优化机制。

通过理解这些底层原理，你将能够：在`Map`、`Set`、普通对象之间做出合理选择；理解为何某些操作性能更好；编写更高效的集合操作代码。

## 为什么需要 Map 与 Set

### 普通对象的局限性

在`Map`和`Set`诞生前，JavaScript开发者常用普通对象模拟字典：

```javascript
const dict = {};
dict['key1'] = 'value1';
dict['key2'] = 'value2';

console.log(dict['key1']);  // 'value1'
```

这种方式存在明显缺陷：

**键类型限制**：对象的键只能是字符串或Symbol，其他类型会被隐式转换为字符串。

```javascript
const obj = {};
const keyObj = { id: 1 };
const keyFunc = function() {};

obj[keyObj] = 'value1';      // 键变成 "[object Object]"
obj[keyFunc] = 'value2';     // 键变成 "function() {}"

console.log(Object.keys(obj));  // ["[object Object]", "function() {}"]
```

所有对象键都被转为相同字符串`"[object Object]"`，导致数据覆盖。

**原型链污染风险**：普通对象继承`Object.prototype`，某些键（如`toString`、`valueOf`）可能触发意外行为。

```javascript
const dict = {};
dict['toString'] = 'my value';

console.log(dict.toString);         // [Function: toString] (不是我们设置的值！)
console.log(dict['toString']);      // 'my value'
```

**无内置迭代器**：遍历对象需要手动使用`Object.keys()`、`for...in`等，且需要注意原型链属性。

**无size属性**：获取键数量需要`Object.keys(obj).length`，效率较低。

### Map 与 Set 的优势

ES6引入的`Map`和`Set`解决了这些问题：

**支持任意类型键**（`Map`）：对象、函数、基本类型均可作为键，使用引用比较。

```javascript
const map = new Map();
const keyObj = { id: 1 };
const keyFunc = function() {};

map.set(keyObj, 'value1');
map.set(keyFunc, 'value2');

console.log(map.get(keyObj));    // 'value1'
console.log(map.get(keyFunc));   // 'value2'
```

**无原型链污染**：`Map`和`Set`不继承`Object.prototype`，所有键都安全。

**内置迭代器**：直接支持`for...of`、`forEach`等迭代方法。

**O(1)复杂度操作**：插入、查找、删除平均时间复杂度接近O(1)（基于哈希表）。

**size属性**：直接访问`.size`获取元素数量，无需计算。

## V8 中的哈希表结构

### JSMap 与 JSSet 的内存布局

V8中，`Map`和`Set`的实现基于相同的哈希表结构。`JSMap`和`JSSet`都是C++对象，核心字段包括：

```
JSMap/JSSet 对象结构：
+------------------------+
| Map (Hidden Class)     |  ← 指向 JSMap/JSSet 的 Map
+------------------------+
| Properties             |  ← 动态属性（很少使用）
+------------------------+
| Elements               |  ← 未使用
+------------------------+
| table (OrderedHashMap) |  ← 指向哈希表核心结构
+------------------------+
```

`table`字段指向`OrderedHashMap`或`OrderedHashSet`，这是V8实现的哈希表数据结构。

### OrderedHashMap 的结构

`OrderedHashMap`结合了哈希表的快速查找和数组的插入顺序保持特性：

```
OrderedHashMap 结构：
+------------------------+
| numberOfElements       |  ← 当前元素数量
+------------------------+
| numberOfDeletedElements|  ← 已删除但未回收的元素数
+------------------------+
| numberOfBuckets        |  ← 哈希桶数量
+------------------------+
| hashTableStart         |  ← 哈希桶数组起始位置
+------------------------+
| dataTableStart         |  ← 数据表起始位置
+------------------------+
| nextTableStart         |  ← 冲突链表索引起始
+------------------------+
| chainStart             |  ← 插入顺序链表
+------------------------+
```

**关键组成部分**：

1. **哈希桶数组（Hash Buckets）**：长度为`numberOfBuckets`，存储哈希值到数据表索引的映射。
2. **数据表（Data Table）**：存储实际的键值对，按插入顺序排列。
3. **冲突链表（Next Table）**：处理哈希冲突，存储同一桶中下一个元素的索引。
4. **插入顺序链表（Chain）**：维护元素插入顺序，支持按序遍历。

### 哈希计算与桶定位

当插入键值对时，V8执行以下步骤：

**1. 计算哈希值**：对键调用`GetHash()`函数。

```cpp
// V8 简化逻辑
uint32_t hash = key->GetHash();  // 对象有内部哈希缓存
```

对象类型键（如对象、函数）在创建时生成随机哈希值并缓存。基本类型（如数字、字符串）根据值计算哈希。

**2. 定位哈希桶**：使用哈希值对桶数量取模。

```cpp
uint32_t bucket_index = hash % numberOfBuckets;
```

**3. 处理冲突**：如果桶已被占用，通过冲突链表找到空位或匹配键。

```cpp
int entry = hashTable[bucket_index];  // 获取桶中第一个元素索引

while (entry != kNotFound) {
  if (dataTable[entry].key == key) {
    // 找到匹配键，更新值
    dataTable[entry].value = value;
    return;
  }
  entry = nextTable[entry];  // 检查冲突链中的下一个元素
}

// 未找到匹配键，插入新元素
```

### 数据表布局

数据表按插入顺序存储键值对：

```
数据表（Data Table）：
索引  |  键      |  值      |  哈希值
-----|---------|---------|--------
  0  |  key1   | value1  | hash1
  1  |  key2   | value2  | hash2
  2  |  key3   | value3  | hash3
  3  |  (空)   | (空)    |  -
  4  |  (空)   | (空)    |  -
```

删除元素时，V8不立即回收空间，而是标记为已删除，增加`numberOfDeletedElements`计数。当删除元素过多时，触发rehash操作重建哈希表。

## 哈希冲突解决：链地址法

### 冲突链表的工作原理

V8使用**链地址法（Separate Chaining）**解决哈希冲突。当多个键映射到同一桶时，通过`nextTable`数组维护冲突链：

```
哈希桶数组：
桶索引 |  第一个元素索引
-------|----------------
  0    |   -1 (空)
  1    |    0  ──┐
  2    |    2    │
  3    |   -1    │
                 │
数据表（按插入顺序）：    │
索引 | 键  | 值 | 哈希值    │
-----|-----|---|--------    │
  0  | k1  | v1| hash1 ←────┘
  1  | k2  | v2| hash2 ←────┐
  2  | k3  | v3| hash3      │
                            │
冲突链表（nextTable）：     │
索引 |  下一个元素索引       │
-----|------------------    │
  0  |   1  ────────────────┘
  1  |  -1 (链表结束)
  2  |  -1
```

假设`k1`和`k2`都映射到桶1：

1. 插入`k1`时，桶1为空，将数据表索引0写入桶1，`nextTable[0] = -1`表示链表结束。
2. 插入`k2`时，桶1已有元素，将新元素（数据表索引1）链接到`k1`后：`nextTable[0] = 1`，`nextTable[1] = -1`。

查找`k2`时：
1. 计算哈希，定位到桶1。
2. 从桶1获取第一个元素索引0（`k1`）。
3. 检查`k1`不匹配，通过`nextTable[0]`获取下一个索引1（`k2`）。
4. 检查`k2`匹配，返回对应值。

### 冲突对性能的影响

哈希冲突会导致查找时间从O(1)退化到O(n)（n为冲突链长度）。V8通过以下策略缓解：

**动态扩容**：当`numberOfElements`超过`numberOfBuckets`的75%（负载因子0.75）时，触发rehash，将桶数量翻倍。

```cpp
if (numberOfElements > numberOfBuckets * 0.75) {
  Rehash(numberOfBuckets * 2);
}
```

**随机哈希**：对象键的哈希值在创建时随机生成，避免人为构造冲突（哈希洪水攻击）。

**质数桶数量**：桶数量选择接近2的幂的质数，减少模运算导致的冲突聚集。

## Map 与 Set 的核心操作实现

### Map.prototype.set 的实现

`set`操作的核心逻辑：

```javascript
// 伪代码展示 V8 内部逻辑
function mapSet(map, key, value) {
  const hash = getHash(key);              // 计算键的哈希值
  const bucketIndex = hash % map.numberOfBuckets;
  
  let entry = map.hashTable[bucketIndex]; // 获取桶中第一个元素
  
  // 检查键是否已存在
  while (entry !== kNotFound) {
    if (sameValueZero(map.dataTable[entry].key, key)) {
      // 键已存在，更新值
      map.dataTable[entry].value = value;
      return map;
    }
    entry = map.nextTable[entry];         // 检查冲突链中的下一个
  }
  
  // 键不存在，插入新元素
  const newIndex = map.numberOfElements;
  map.dataTable[newIndex] = { key, value, hash };
  map.nextTable[newIndex] = map.hashTable[bucketIndex]; // 新元素链到桶头
  map.hashTable[bucketIndex] = newIndex;                // 更新桶指向新元素
  map.numberOfElements++;
  
  // 检查是否需要扩容
  if (map.numberOfElements > map.numberOfBuckets * 0.75) {
    rehash(map, map.numberOfBuckets * 2);
  }
  
  return map;
}
```

**关键点**：
- 使用`SameValueZero`比较键（`NaN === NaN`为true，与对象比较使用引用相等）。
- 新元素插入到冲突链头部（效率更高）。
- 插入后检查负载因子，必要时触发rehash。

### Map.prototype.get 的实现

查找操作：

```javascript
function mapGet(map, key) {
  const hash = getHash(key);
  const bucketIndex = hash % map.numberOfBuckets;
  
  let entry = map.hashTable[bucketIndex];
  
  while (entry !== kNotFound) {
    if (sameValueZero(map.dataTable[entry].key, key)) {
      return map.dataTable[entry].value;  // 找到匹配键，返回值
    }
    entry = map.nextTable[entry];
  }
  
  return undefined;  // 未找到键，返回 undefined
}
```

平均时间复杂度O(1)，最坏情况O(n)（所有键冲突到同一桶）。

### Map.prototype.delete 的实现

删除操作标记元素为已删除，但不立即回收：

```javascript
function mapDelete(map, key) {
  const hash = getHash(key);
  const bucketIndex = hash % map.numberOfBuckets;
  
  let entry = map.hashTable[bucketIndex];
  let prev = kNotFound;
  
  while (entry !== kNotFound) {
    if (sameValueZero(map.dataTable[entry].key, key)) {
      // 找到匹配键，从冲突链中移除
      if (prev === kNotFound) {
        map.hashTable[bucketIndex] = map.nextTable[entry]; // 移除头节点
      } else {
        map.nextTable[prev] = map.nextTable[entry];        // 移除中间节点
      }
      
      // 标记为已删除（不立即回收）
      map.dataTable[entry].key = kTheHole;
      map.dataTable[entry].value = kTheHole;
      map.numberOfElements--;
      map.numberOfDeletedElements++;
      
      // 检查是否需要收缩哈希表
      if (map.numberOfDeletedElements > map.numberOfBuckets / 2) {
        rehash(map, map.numberOfBuckets);  // 重建哈希表清理已删除元素
      }
      
      return true;
    }
    prev = entry;
    entry = map.nextTable[entry];
  }
  
  return false;  // 键不存在
}
```

**延迟回收策略**：删除元素时，V8将键值标记为`TheHole`（特殊内部值），避免立即移动数据表中的其他元素（保持插入顺序）。当已删除元素过多时，触发rehash重建哈希表，清理空洞。

### Set 操作的实现

`Set`本质是值即键的`Map`，`Set.prototype.add(value)`内部调用`Map.set(value, value)`：

```javascript
// V8 内部简化逻辑
Set.prototype.add = function(value) {
  // Set 内部使用 OrderedHashSet，结构与 OrderedHashMap 类似
  // 存储时键和值都是 value
  return this.table.set(value, value);
};

Set.prototype.has = function(value) {
  return this.table.has(value);
};

Set.prototype.delete = function(value) {
  return this.table.delete(value);
};
```

`Set`复用了`Map`的哈希表实现，所有操作特性（哈希冲突处理、扩容策略、性能特征）与`Map`相同。

## 插入顺序保持机制

### 为什么需要保持插入顺序

ECMAScript规范要求`Map`和`Set`的迭代顺序与插入顺序一致：

```javascript
const map = new Map();
map.set('c', 3);
map.set('a', 1);
map.set('b', 2);

for (const [key, value] of map) {
  console.log(key, value);
}
// 输出顺序：c 3, a 1, b 2（插入顺序）
```

普通对象的属性顺序规则更复杂（整数键按数值排序，其他按插入顺序），而`Map`严格按插入顺序。

### 数据表顺序与迭代

V8的数据表（Data Table）天然按插入顺序排列元素：

```
插入序列：set(k1, v1) → set(k2, v2) → set(k3, v3)

数据表：
索引 | 键  | 值
-----|-----|----
  0  | k1  | v1   ← 第一个插入
  1  | k2  | v2   ← 第二个插入
  2  | k3  | v3   ← 第三个插入
```

迭代器遍历时，直接按数据表索引0到`numberOfElements-1`顺序返回元素，无需额外排序。

### 删除元素的处理

删除元素时，V8不移动后续元素（避免O(n)操作），而是标记为空洞：

```
删除 k2 后的数据表：
索引 | 键     | 值
-----|--------|----
  0  | k1     | v1
  1  | (空)   | (空)  ← 标记为已删除
  2  | k3     | v3
```

迭代器跳过空洞，直接返回有效元素。当空洞过多时，rehash重建数据表：

```
Rehash 后：
索引 | 键  | 值
-----|-----|----
  0  | k1  | v1
  1  | k3  | v3   ← 紧凑排列，空洞被清除
```

## 性能分析与最佳实践

### Map vs 普通对象：性能对比

在不同场景下，`Map`和对象各有优势：

```javascript
// 测试：频繁插入删除
function testInsertDelete(iterations) {
  // 使用 Map
  console.time('Map insert/delete');
  const map = new Map();
  for (let i = 0; i < iterations; i++) {
    map.set(i, i);
  }
  for (let i = 0; i < iterations; i++) {
    map.delete(i);
  }
  console.timeEnd('Map insert/delete');
  
  // 使用对象
  console.time('Object insert/delete');
  const obj = {};
  for (let i = 0; i < iterations; i++) {
    obj[i] = i;
  }
  for (let i = 0; i < iterations; i++) {
    delete obj[i];
  }
  console.timeEnd('Object insert/delete');
}

testInsertDelete(100000);
// Map insert/delete: 8ms
// Object insert/delete: 25ms
```

**Map优势**：频繁增删场景下，`Map`使用哈希表内部管理内存，效率更高。`delete`操作对对象会触发V8的属性删除逻辑，可能导致Hidden Class转换，影响性能。

```javascript
// 测试：查找性能
function testLookup(iterations) {
  const map = new Map();
  const obj = {};
  
  // 预填充数据
  for (let i = 0; i < 10000; i++) {
    map.set(i, i);
    obj[i] = i;
  }
  
  // Map 查找
  console.time('Map lookup');
  for (let i = 0; i < iterations; i++) {
    map.get(i % 10000);
  }
  console.timeEnd('Map lookup');
  
  // 对象查找
  console.time('Object lookup');
  for (let i = 0; i < iterations; i++) {
    obj[i % 10000];
  }
  console.timeEnd('Object lookup');
}

testLookup(1000000);
// Map lookup: 10ms
// Object lookup: 5ms
```

**对象优势**：纯查找场景下，对象属性访问经过Inline Cache优化，性能略优于`Map.get()`（需要哈希计算和函数调用开销）。

**选择建议**：
- 键为非字符串类型、需要频繁增删、需要保持插入顺序 → 使用`Map`
- 键为字符串、结构固定、纯查找为主 → 使用对象
- 需要JSON序列化、与外部API交互 → 使用对象

### 避免哈希冲突的优化

**均匀分布键类型**：避免大量相似对象作为键（可能产生相似哈希值）。

```javascript
// 不好：大量相似对象
const map = new Map();
for (let i = 0; i < 1000; i++) {
  map.set({ id: i }, i);  // 每个对象哈希值随机，但结构相同
}

// 更好：使用基本类型或唯一标识
const map = new Map();
for (let i = 0; i < 1000; i++) {
  map.set(i, { id: i });  // 数字键哈希分布更均匀
}
```

**避免频繁rehash**：预知数据量时，提前设置合适大小的Map（V8暂无公开API，但可通过预插入占位实现）。

```javascript
// 预分配空间（非标准，仅示意）
function createPreallocatedMap(expectedSize) {
  const map = new Map();
  // 插入占位元素触发扩容
  for (let i = 0; i < expectedSize; i++) {
    map.set(i, null);
  }
  // 清空占位元素
  map.clear();
  return map;  // 此时内部桶数量已扩容
}
```

**监控size变化**：定期检查`map.size`，避免无意识的内存泄漏。

### Set 的唯一性检查优化

`Set`提供高效的去重功能：

```javascript
// 数组去重
const arr = [1, 2, 2, 3, 3, 3, 4];
const uniqueArr = [...new Set(arr)];
console.log(uniqueArr);  // [1, 2, 3, 4]
```

对比传统方法：

```javascript
// 方法1：使用 indexOf（O(n²)）
function uniqueWithIndexOf(arr) {
  const result = [];
  for (const item of arr) {
    if (result.indexOf(item) === -1) {
      result.push(item);
    }
  }
  return result;
}

// 方法2：使用 Set（O(n)）
function uniqueWithSet(arr) {
  return [...new Set(arr)];
}

// 性能测试
const largeArr = Array.from({ length: 10000 }, (_, i) => i % 100);

console.time('indexOf');
uniqueWithIndexOf(largeArr);
console.timeEnd('indexOf');  // ~150ms

console.time('Set');
uniqueWithSet(largeArr);
console.timeEnd('Set');      // ~2ms
```

**适用场景**：
- 数组去重
- 检查集合交集、并集、差集
- 快速判断元素存在性（替代`array.includes()`）

```javascript
// 集合运算
const setA = new Set([1, 2, 3, 4]);
const setB = new Set([3, 4, 5, 6]);

// 并集
const union = new Set([...setA, ...setB]);
console.log([...union]);  // [1, 2, 3, 4, 5, 6]

// 交集
const intersection = new Set([...setA].filter(x => setB.has(x)));
console.log([...intersection]);  // [3, 4]

// 差集
const difference = new Set([...setA].filter(x => !setB.has(x)));
console.log([...difference]);  // [1, 2]
```

### WeakMap 与 WeakSet 的场景

`WeakMap`和`WeakSet`使用弱引用存储键，允许键被垃圾回收（详见第19章）。适用于：

**私有数据存储**：不影响对象生命周期的元数据。

```javascript
const privateData = new WeakMap();

class Person {
  constructor(name, age) {
    this.name = name;
    privateData.set(this, { age });  // age 作为私有数据
  }
  
  getAge() {
    return privateData.get(this).age;
  }
}

let p = new Person('Alice', 30);
console.log(p.getAge());  // 30
p = null;  // Person 对象可被垃圾回收，WeakMap 中的记录自动清除
```

**缓存机制**：缓存与对象生命周期绑定的计算结果。

```javascript
const cache = new WeakMap();

function expensiveComputation(obj) {
  if (cache.has(obj)) {
    return cache.get(obj);  // 命中缓存
  }
  
  const result = /* 复杂计算 */ obj.data * 2;
  cache.set(obj, result);
  return result;
}
```

## 本章小结

`Map`和`Set`是JavaScript中高效的键值集合和值集合数据结构，V8通过以下机制实现高性能：

1. **哈希表基础**：使用`OrderedHashMap`和`OrderedHashSet`结构，结合哈希桶数组、数据表、冲突链表实现O(1)平均时间复杂度的增删查操作。

2. **冲突解决**：采用链地址法处理哈希冲突，通过动态扩容（负载因子0.75）和随机哈希降低冲突概率，保持高效查找性能。

3. **插入顺序保持**：数据表按插入顺序存储元素，迭代时直接按索引遍历，满足ECMAScript规范要求。删除操作采用延迟回收策略（标记为空洞），rehash时清理空洞。

4. **性能权衡**：`Map`适合键类型多样、频繁增删的场景；普通对象在固定结构、纯查找场景下因Inline Cache优化而性能更优。`Set`提供高效去重和集合运算能力。

理解这些底层机制后，你可以在不同数据结构间做出合理选择，编写性能更优的集合操作代码。下一章我们将探讨`WeakMap`和`WeakSet`的弱引用机制，以及它们与垃圾回收系统的深度集成。

### 思考题

1. 为什么`Map`的`delete`操作不立即回收数据表中的空间，而是延迟到rehash时清理？这种设计的优缺点是什么？

2. 如果你需要存储大量对象键的`Map`，且这些对象的生命周期较短，应该选择`Map`还是`WeakMap`？为什么？

3. 实现一个`LRUCache`类（最近最少使用缓存），要求使用`Map`实现，get和set操作均为O(1)，并在容量满时自动淘汰最久未使用的项。
