# 实战：键值映射

这道题要求实现一个特殊的Map，不仅能存储键值对，还能快速计算某个前缀对应的所有值的总和。

## 问题描述

实现`MapSum`类：
- `MapSum()` 初始化对象
- `void insert(String key, int val)` 插入key-val键值对。如果key已存在，用新值替换原值
- `int sum(String prefix)` 返回所有以prefix为前缀的key的val总和

**示例**：
```
MapSum mapSum = new MapSum();
mapSum.insert("apple", 3);
mapSum.sum("ap");           // 返回 3
mapSum.insert("app", 2);
mapSum.sum("ap");           // 返回 5 (apple=3 + app=2)
mapSum.insert("apple", 2);  // 更新apple的值
mapSum.sum("ap");           // 返回 4 (apple=2 + app=2)
```

## 思路分析

这道题的关键在于：
1. **前缀查询** → 用Trie
2. **值的累加** → 在Trie节点上存储信息

### 方法一：遍历计算

每次`sum()`时，遍历以prefix结尾的节点的所有子树，累加所有值。

### 方法二：前缀和优化

在每个节点上存储"经过该节点的所有单词的值之和"，这样`sum()`只需要O(m)时间（m是前缀长度）。

## 方法一：遍历子树

```javascript
class TrieNode {
    constructor() {
        this.children = {};
        this.val = 0;  // 如果是单词结尾，存储值
    }
}

class MapSum {
    constructor() {
        this.root = new TrieNode();
    }
    
    /**
     * @param {string} key
     * @param {number} val
     * @return {void}
     */
    insert(key, val) {
        let node = this.root;
        for (const char of key) {
            if (!node.children[char]) {
                node.children[char] = new TrieNode();
            }
            node = node.children[char];
        }
        node.val = val;
    }
    
    /**
     * @param {string} prefix
     * @return {number}
     */
    sum(prefix) {
        let node = this.root;
        
        // 找到前缀对应的节点
        for (const char of prefix) {
            if (!node.children[char]) {
                return 0;
            }
            node = node.children[char];
        }
        
        // DFS累加所有子树的值
        return this._sumSubtree(node);
    }
    
    _sumSubtree(node) {
        let total = node.val;
        for (const child of Object.values(node.children)) {
            total += this._sumSubtree(child);
        }
        return total;
    }
}
```

## 方法二：前缀和优化（推荐）

```javascript
class TrieNode {
    constructor() {
        this.children = {};
        this.prefixSum = 0;  // 所有经过此节点的单词值之和
    }
}

class MapSum {
    constructor() {
        this.root = new TrieNode();
        this.map = new Map();  // 存储key->val，用于处理更新
    }
    
    insert(key, val) {
        // 计算增量（新值 - 旧值）
        const delta = val - (this.map.get(key) || 0);
        this.map.set(key, val);
        
        // 更新路径上所有节点的prefixSum
        let node = this.root;
        for (const char of key) {
            if (!node.children[char]) {
                node.children[char] = new TrieNode();
            }
            node = node.children[char];
            node.prefixSum += delta;
        }
    }
    
    sum(prefix) {
        let node = this.root;
        for (const char of prefix) {
            if (!node.children[char]) {
                return 0;
            }
            node = node.children[char];
        }
        return node.prefixSum;
    }
}
```

## 执行过程对比

```
操作：insert("apple", 3), insert("app", 2), sum("ap")

方法一（遍历子树）：
Trie结构：
    root → a → p → p → l → e (val=3)
                    ↓
                  (val=2)

sum("ap")：
  找到第二个p节点
  DFS子树：3 + 2 = 5

方法二（前缀和）：
每次insert时更新路径上的prefixSum

insert("apple", 3):
    a(3) → p(3) → p(3) → l(3) → e(3)

insert("app", 2):
    a(5) → p(5) → p(5) → l(3) → e(3)
                    ↓
                  终点(prefixSum不变，只是标记)

sum("ap")：
  直接返回第二个p节点的prefixSum = 5
```

## 处理更新的关键

当同一个key被更新时，需要用**增量**更新，而不是直接覆盖：

```javascript
insert(key, val) {
    // 如果key已存在，计算变化量
    const oldVal = this.map.get(key) || 0;
    const delta = val - oldVal;
    
    // 用增量更新路径
    // ...
}
```

例如，`apple`从3更新到5：
- delta = 5 - 3 = 2
- 路径上所有prefixSum += 2

## 复杂度分析

| 操作 | 方法一 | 方法二 |
|------|--------|--------|
| insert | O(m) | O(m) |
| sum | O(子树大小) | O(m) |

方法二的`sum`操作是O(m)，因为只需要沿着前缀走一遍。

**空间复杂度**：两种方法都是O(n × m)，方法二额外需要一个Map存储旧值。

## 小结

这道题展示了Trie的一个重要扩展：**在节点上存储额外信息**。

关键点：
1. **前缀和思想**：每个节点存储经过它的所有值之和
2. **增量更新**：处理更新时用增量而非直接覆盖
3. **哈希表辅助**：记录key的旧值，计算增量

这种"在Trie节点上存储信息"的技巧，在很多Trie变体题目中都会用到。
