# 哈希碰撞与解决方案

上一章提到，哈希表最坏情况是 O(n)。这是因为**哈希碰撞**——不同的键可能映射到相同的位置。

本章深入探讨碰撞的原因和解决方案。

## 什么是哈希碰撞

当两个不同的键通过哈希函数计算后，得到相同的索引，就发生了**哈希碰撞**。

```
hash("apple") = 3
hash("grape") = 3  // 碰撞！

两个不同的键都想存到位置 3
```

## 碰撞为什么不可避免

思考一下：如果我们有 100 万个不同的键，但数组只有 1000 个位置，会发生什么？

**鸽巢原理**：如果 n+1 只鸽子放入 n 个笼子，必有至少一个笼子有 2 只以上鸽子。

所以只要键的数量超过桶的数量，碰撞就**必然发生**。

即使键的数量少于桶的数量，由于哈希函数不是完美的一对一映射，碰撞仍然可能发生。

## 解决方案一：链地址法

**思路**：每个桶不只存一个元素，而是存一个**链表**（或数组），碰撞的元素都放入同一个链表。

```
链地址法示意图：

[0]: null
[1]: ("banana", 2) → ("kiwi", 8) → null
[2]: null
[3]: ("apple", 5) → ("grape", 7) → null
[4]: ("cherry", 3) → null
```

### 实现

```javascript
class ChainedHashTable {
    constructor(size = 53) {
        this.size = size;
        this.buckets = new Array(size).fill(null).map(() => []);
        this.count = 0;
    }
    
    _hash(key) {
        let hash = 0;
        for (const char of String(key)) {
            hash = (hash * 31 + char.charCodeAt(0)) % this.size;
        }
        return hash;
    }
    
    set(key, value) {
        const index = this._hash(key);
        const bucket = this.buckets[index];
        
        // 检查是否已存在
        for (const pair of bucket) {
            if (pair[0] === key) {
                pair[1] = value;
                return;
            }
        }
        
        // 添加新元素
        bucket.push([key, value]);
        this.count++;
        
        // 负载因子过高时扩容
        if (this.count / this.size > 0.75) {
            this._resize();
        }
    }
    
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
    
    delete(key) {
        const index = this._hash(key);
        const bucket = this.buckets[index];
        
        for (let i = 0; i < bucket.length; i++) {
            if (bucket[i][0] === key) {
                bucket.splice(i, 1);
                this.count--;
                return true;
            }
        }
        
        return false;
    }
    
    _resize() {
        const oldBuckets = this.buckets;
        this.size *= 2;
        this.buckets = new Array(this.size).fill(null).map(() => []);
        this.count = 0;
        
        for (const bucket of oldBuckets) {
            for (const [key, value] of bucket) {
                this.set(key, value);
            }
        }
    }
}
```

### 优缺点

**优点**：
- 实现简单直观
- 删除操作方便
- 负载因子可以大于 1（一个桶可以存多个元素）

**缺点**：
- 链表指针需要额外空间
- 链表遍历对 CPU 缓存不友好

## 解决方案二：开放地址法

**思路**：碰撞时，按照某种规则寻找**下一个空的位置**。

### 线性探测

最简单的方式：碰撞后依次检查下一个位置。

```
插入 "apple"，hash = 3
位置 3 已被占用
检查位置 4 → 空，插入！

探测公式：index = (hash + i) % size，i = 1, 2, 3...
```

```javascript
class LinearProbingHashTable {
    constructor(size = 53) {
        this.size = size;
        this.keys = new Array(size);
        this.values = new Array(size);
        this.count = 0;
    }
    
    _hash(key) {
        let hash = 0;
        for (const char of String(key)) {
            hash = (hash * 31 + char.charCodeAt(0)) % this.size;
        }
        return hash;
    }
    
    set(key, value) {
        // 负载因子超过 0.5 时扩容
        if (this.count / this.size > 0.5) {
            this._resize();
        }
        
        let index = this._hash(key);
        
        // 线性探测找空位
        while (this.keys[index] !== undefined) {
            if (this.keys[index] === key) {
                // 找到已存在的键，更新值
                this.values[index] = value;
                return;
            }
            index = (index + 1) % this.size;
        }
        
        // 找到空位，插入
        this.keys[index] = key;
        this.values[index] = value;
        this.count++;
    }
    
    get(key) {
        let index = this._hash(key);
        
        while (this.keys[index] !== undefined) {
            if (this.keys[index] === key) {
                return this.values[index];
            }
            index = (index + 1) % this.size;
        }
        
        return undefined;
    }
    
    // 删除比较复杂，需要标记删除
    delete(key) {
        // 开放地址法的删除需要特殊处理
        // 简单实现中可以用特殊标记
    }
    
    _resize() {
        const oldKeys = this.keys;
        const oldValues = this.values;
        
        this.size *= 2;
        this.keys = new Array(this.size);
        this.values = new Array(this.size);
        this.count = 0;
        
        for (let i = 0; i < oldKeys.length; i++) {
            if (oldKeys[i] !== undefined) {
                this.set(oldKeys[i], oldValues[i]);
            }
        }
    }
}
```

### 其他探测方式

**二次探测**：步长为 i²
```
index = (hash + i²) % size，i = 1, 2, 3...
```

**双重哈希**：用第二个哈希函数决定步长
```
index = (hash1 + i × hash2) % size
```

### 优缺点

**优点**：
- 不需要额外的链表空间
- 数据连续存储，缓存友好

**缺点**：
- 删除操作复杂（需要标记删除，不能真删）
- 负载因子必须小于 1
- 可能产生"聚集"现象

## 动态扩容

当元素越来越多，碰撞会越来越频繁。解决方案是**扩容**。

### 负载因子

**负载因子** = 元素数量 / 桶数量

- 链地址法：通常在负载因子 > 0.75 时扩容
- 开放地址法：通常在负载因子 > 0.5 时扩容

### 扩容过程

1. 创建更大的数组（通常 2 倍）
2. **重新计算**所有键的哈希值（因为 size 变了）
3. 迁移所有数据

扩容是 O(n) 操作，但由于不频繁发生，**均摊**下来每次插入仍是 O(1)。

## 两种方案对比

| 特性 | 链地址法 | 开放地址法 |
|-----|---------|-----------|
| 空间利用 | 可大于 100% | 必须小于 100% |
| 删除操作 | 简单 | 需要标记删除 |
| 缓存性能 | 较差（链表） | 较好（连续） |
| 实现复杂度 | 简单 | 中等 |
| 最坏查找 | O(n) 链表长度 | O(n) 整个数组 |

**实际选择**：
- Java HashMap：链地址法（链表长度超过 8 转红黑树）
- Python dict：开放地址法（优化版本）
- JavaScript Map：取决于引擎实现

## 本章小结

哈希碰撞是不可避免的，但可以有效处理：

1. **链地址法**：每个桶存链表，简单直观
2. **开放地址法**：碰撞时探测空位，缓存友好
3. **动态扩容**：负载因子过高时扩大容量

理解碰撞处理机制，有助于：
- 理解哈希表为什么平均 O(1)、最坏 O(n)
- 在实际开发中合理设置初始容量
- 在面试中深入讨论数据结构原理

接下来，我们通过大量实战题目来掌握哈希表的应用技巧。
