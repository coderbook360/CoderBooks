# 哈希碰撞与解决方案

哈希表虽然强大，但有一个无法避免的问题：**哈希碰撞**。不同的键可能计算出相同的哈希值，导致它们映射到同一个位置。

## 什么是哈希碰撞？

```
"apple" → hash → 5
"grape" → hash → 5  // 碰撞！
```

两个不同的键得到了相同的哈希值。这是必然会发生的：
- 假设哈希表大小为100
- 但可能的键有无限多个
- 根据鸽巢原理，必然有多个键映射到同一位置

## 为什么碰撞不可避免？

想象你有10个抽屉，要放100件物品。无论怎么分配，至少有一个抽屉要放10件以上的物品。

**生日悖论**：在一个23人的房间里，有超过50%的概率至少两人同一天生日。同样，即使哈希表很大，碰撞也比你想象的更容易发生。

## 解决方案一：链地址法

最常用的方法。每个桶存储一个链表，碰撞的元素都挂在同一个链表上。

```
bucket[5] → [apple, value1] → [grape, value2] → null
```

```javascript
class HashTable {
    constructor(size = 53) {
        this.buckets = new Array(size).fill(null).map(() => []);
        this.size = size;
    }
    
    hash(key) {
        let hash = 0;
        for (const char of String(key)) {
            hash = (hash * 31 + char.charCodeAt(0)) % this.size;
        }
        return hash;
    }
    
    set(key, value) {
        const index = this.hash(key);
        const bucket = this.buckets[index];
        
        // 检查是否已存在
        for (const pair of bucket) {
            if (pair[0] === key) {
                pair[1] = value;
                return;
            }
        }
        
        // 不存在则添加
        bucket.push([key, value]);
    }
    
    get(key) {
        const index = this.hash(key);
        const bucket = this.buckets[index];
        
        for (const pair of bucket) {
            if (pair[0] === key) {
                return pair[1];
            }
        }
        
        return undefined;
    }
    
    has(key) {
        return this.get(key) !== undefined;
    }
    
    delete(key) {
        const index = this.hash(key);
        const bucket = this.buckets[index];
        
        for (let i = 0; i < bucket.length; i++) {
            if (bucket[i][0] === key) {
                bucket.splice(i, 1);
                return true;
            }
        }
        
        return false;
    }
}
```

### 链地址法的复杂度

假设n个元素，m个桶：
- 平均每个桶有n/m个元素
- 查找时间：O(1 + n/m)

当n/m（负载因子）较小时，接近O(1)。

## 解决方案二：开放地址法

当发生碰撞时，按照某种规则寻找下一个空位。

### 线性探测

碰撞后，依次检查下一个位置：

```
位置: 0  1  2  3  4  5  6  7
值:   -  -  -  -  -  X  -  -

插入key1, hash=5 → 位置5已占用
检查位置6 → 空，插入
```

```javascript
class LinearProbingHashTable {
    constructor(size = 53) {
        this.keys = new Array(size).fill(undefined);
        this.values = new Array(size).fill(undefined);
        this.size = size;
        this.count = 0;
    }
    
    hash(key) {
        let hash = 0;
        for (const char of String(key)) {
            hash = (hash * 31 + char.charCodeAt(0)) % this.size;
        }
        return hash;
    }
    
    set(key, value) {
        // 检查是否需要扩容
        if (this.count / this.size > 0.7) {
            this.resize();
        }
        
        let index = this.hash(key);
        
        // 线性探测找空位或已存在的键
        while (this.keys[index] !== undefined) {
            if (this.keys[index] === key) {
                this.values[index] = value;
                return;
            }
            index = (index + 1) % this.size;
        }
        
        this.keys[index] = key;
        this.values[index] = value;
        this.count++;
    }
    
    get(key) {
        let index = this.hash(key);
        
        while (this.keys[index] !== undefined) {
            if (this.keys[index] === key) {
                return this.values[index];
            }
            index = (index + 1) % this.size;
        }
        
        return undefined;
    }
    
    resize() {
        const oldKeys = this.keys;
        const oldValues = this.values;
        
        this.size = this.size * 2;
        this.keys = new Array(this.size).fill(undefined);
        this.values = new Array(this.size).fill(undefined);
        this.count = 0;
        
        for (let i = 0; i < oldKeys.length; i++) {
            if (oldKeys[i] !== undefined) {
                this.set(oldKeys[i], oldValues[i]);
            }
        }
    }
}
```

### 二次探测

探测位置按平方增长：`hash, hash+1, hash+4, hash+9, ...`

```javascript
// 二次探测
for (let i = 0; ; i++) {
    const index = (hash + i * i) % size;
    if (isEmpty(index)) break;
}
```

减少了线性探测的"聚集"问题。

### 双重哈希

使用第二个哈希函数决定步长：

```javascript
function doubleHash(key, i) {
    const h1 = hash1(key);
    const h2 = hash2(key);
    return (h1 + i * h2) % size;
}
```

分布更均匀，但计算成本更高。

## 负载因子与扩容

**负载因子（Load Factor）**：`α = n / m`（元素数量 / 桶数量）

```
负载因子越高 → 碰撞越多 → 性能越差
```

当负载因子超过阈值（通常0.75）时，需要**扩容**（Rehash）：

```javascript
function resize() {
    const oldBuckets = this.buckets;
    this.size = this.size * 2;
    this.buckets = new Array(this.size).fill(null).map(() => []);
    this.count = 0;
    
    // 重新插入所有元素
    for (const bucket of oldBuckets) {
        for (const [key, value] of bucket) {
            this.set(key, value);
        }
    }
}
```

扩容是O(n)操作，但由于是摊还的，平均每次插入仍是O(1)。

## 两种方法的对比

| 特点 | 链地址法 | 开放地址法 |
|------|----------|------------|
| 空间利用 | 需要额外链表空间 | 全部在数组内 |
| 删除操作 | 简单 | 需要特殊处理 |
| 缓存友好 | 较差 | 较好 |
| 负载因子 | 可以>1 | 必须<1 |
| 实现复杂度 | 中等 | 较高 |

**JavaScript的Map内部**使用了类似链地址法的实现。

## 好的哈希函数特性

1. **均匀分布**：不同的键尽量分散
2. **快速计算**：避免复杂运算
3. **确定性**：相同输入总是相同输出

常用的哈希算法：
- 乘法哈希：`hash = (key * A) % m`
- 多项式哈希：`hash = Σ(c[i] * p^i) % m`
- MurmurHash、xxHash等

## 在算法题中的应用

虽然我们很少需要自己实现哈希表，但理解碰撞处理有助于：

1. **分析复杂度**：知道最坏情况是O(n)
2. **选择合适的键**：设计好的哈希键减少碰撞
3. **理解底层机制**：面试时可能被问到

## 小结

哈希碰撞的核心知识：

1. **碰撞不可避免**：鸽巢原理决定的
2. **链地址法**：碰撞元素挂成链表
3. **开放地址法**：探测下一个空位
4. **负载因子**：控制碰撞概率，适时扩容

在实际算法题中，直接使用JavaScript的Map和Set即可，它们已经为我们处理好了碰撞问题。
