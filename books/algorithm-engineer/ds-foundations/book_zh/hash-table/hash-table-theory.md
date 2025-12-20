# 哈希表原理与实现

在前面的章节中，我们多次使用 Map 和 Set 来解决问题。这一章，我们深入理解它们背后的数据结构——**哈希表**。

## 什么是哈希表

首先要问一个问题：如何在一堆数据中快速找到特定的元素？

- **数组**：按索引访问 O(1)，但按值查找 O(n)
- **有序数组**：二分查找 O(log n)，但插入删除 O(n)

有没有一种方式，能让**查找、插入、删除都是 O(1)**？

有！哈希表。

**核心思想**：通过一个**哈希函数**，将键（Key）直接映射到存储位置。

```
键 → 哈希函数 → 索引 → 存储位置

示例：
key = "apple"
hash("apple") = 3

数组：
[0]: null
[1]: ("banana", 2)
[2]: null
[3]: ("apple", 5)  ← 直接定位！
[4]: ("cherry", 3)
```

不需要逐个比较，直接计算出位置，所以是 O(1)。

## 哈希函数

哈希函数是哈希表的灵魂。它需要满足：

1. **确定性**：相同输入必须产生相同输出
2. **均匀分布**：尽量把键均匀分布到不同位置，减少碰撞
3. **高效计算**：计算要快

### 数字哈希

最简单的方法：取模。

```javascript
function hashNumber(key, size) {
    return key % size;
}
```

size 通常取质数，可以减少碰撞。

### 字符串哈希

多项式哈希（前面章节详细讲过）：

```javascript
function hashString(key, size) {
    let hash = 0;
    const prime = 31;
    for (const char of key) {
        hash = (hash * prime + char.charCodeAt(0)) % size;
    }
    return hash;
}
```

## 核心操作的时间复杂度

| 操作 | 平均 | 最坏 |
|-----|------|------|
| 查找 | O(1) | O(n) |
| 插入 | O(1) | O(n) |
| 删除 | O(1) | O(n) |

为什么最坏是 O(n)？

当所有键都碰撞到同一个位置时，哈希表退化为链表。这就是**哈希碰撞**，下一章会详细讨论。

## 简单实现

让我们手写一个简单的哈希表：

```javascript
class SimpleHashTable {
    constructor(size = 53) {
        this.size = size;
        // 每个桶是一个数组（链地址法处理碰撞）
        this.buckets = new Array(size).fill(null).map(() => []);
    }
    
    // 哈希函数
    _hash(key) {
        let hash = 0;
        for (const char of String(key)) {
            hash = (hash * 31 + char.charCodeAt(0)) % this.size;
        }
        return hash;
    }
    
    // 插入/更新
    set(key, value) {
        const index = this._hash(key);
        const bucket = this.buckets[index];
        
        // 检查是否已存在，存在则更新
        for (const pair of bucket) {
            if (pair[0] === key) {
                pair[1] = value;
                return;
            }
        }
        
        // 不存在则添加
        bucket.push([key, value]);
    }
    
    // 查找
    get(key) {
        const index = this._hash(key);
        const bucket = this.buckets[index];
        
        for (const pair of bucket) {
            if (pair[0] === key) {
                return pair[1];
            }
        }
        
        return undefined;
    }
    
    // 删除
    delete(key) {
        const index = this._hash(key);
        const bucket = this.buckets[index];
        
        for (let i = 0; i < bucket.length; i++) {
            if (bucket[i][0] === key) {
                bucket.splice(i, 1);
                return true;
            }
        }
        
        return false;
    }
    
    // 是否存在
    has(key) {
        return this.get(key) !== undefined;
    }
}
```

使用：

```javascript
const table = new SimpleHashTable();
table.set('name', 'Alice');
table.set('age', 25);

console.log(table.get('name'));  // 'Alice'
console.log(table.has('age'));   // true
table.delete('age');
console.log(table.has('age'));   // false
```

## JavaScript 中的哈希表

JavaScript 提供了两种内置的哈希表实现：Object 和 Map。

### Object vs Map

| 特性 | Object | Map |
|-----|--------|-----|
| 键类型 | 字符串/Symbol | **任意类型** |
| 顺序 | 不保证（ES6 后有部分保证） | **插入顺序** |
| 大小 | 需要手动计算 | **size 属性** |
| 迭代 | 不太方便 | **for...of** |
| 性能 | 大量数据时较慢 | **频繁增删更优** |

### 使用示例

```javascript
// Map
const map = new Map();
map.set('key', 'value');
map.set(123, 'number key');       // 数字键
map.set({id: 1}, 'object key');   // 对象键

map.get('key');     // 'value'
map.has(123);       // true
map.delete('key');
map.size;           // 2

// 迭代
for (const [key, value] of map) {
    console.log(key, value);
}

// Object
const obj = {};
obj['key'] = 'value';
obj.key = 'value';  // 等价

'key' in obj;       // true
delete obj.key;
Object.keys(obj).length;  // 需要手动计算
```

### 选择建议

- **需要非字符串键** → Map
- **需要保持插入顺序** → Map
- **频繁增删** → Map
- **简单键值存储，与 JSON 互转** → Object
- **LeetCode 刷题** → Map（更直观）

## 本章小结

哈希表是一种通过**哈希函数**将键映射到存储位置的数据结构：

1. **核心优势**：O(1) 的平均查找、插入、删除
2. **核心组件**：哈希函数 + 桶数组 + 碰撞处理
3. **JavaScript 实现**：Map（推荐）和 Object

哈希表是算法问题中最常用的数据结构之一。接下来几章，我们将学习哈希碰撞的处理，并通过大量实战题目掌握哈希表的应用技巧。
