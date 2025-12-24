# 键值映射

## 核心问题

设计一个支持键值映射的字典树，能够插入键值对，并查询给定前缀的所有键对应值的总和。

这是字典树的一个实用扩展——**如何在树节点中存储额外信息，并支持聚合查询？** 不同于普通字典树只判断存在性，这里需要维护数值累加。

## LeetCode 677. 键值映射

**问题描述**：
```javascript
class MapSum {
  constructor() {}
  
  insert(key, val) {
    // 插入键值对或更新值
  }
  
  sum(prefix) {
    // 返回所有以 prefix 为前缀的键对应值的总和
  }
}
```

**示例**：
```
输入：
["MapSum", "insert", "sum", "insert", "sum"]
[[], ["apple", 3], ["ap"], ["app", 2], ["ap"]]

输出：
[null, null, 3, null, 5]

解释：
mapSum.insert("apple", 3);   
mapSum.sum("ap");            // 返回 3（"apple"）
mapSum.insert("app", 2);      
mapSum.sum("ap");            // 返回 5（"apple" + "app"）
```

**约束条件**：
- `1 <= key.length, prefix.length <= 50`
- `key` 和 `prefix` 由小写英文字母组成
- `1 <= val <= 1000`
- 最多调用 50 次 `insert` 和 `sum`

## 思考过程

首先要问一个问题：**如何在节点中存储值？**

直观想法：每个单词结尾节点存储值。查询时 DFS 遍历所有子树，累加所有结尾节点的值。

但这样查询效率是 O(k)，k 是以该前缀开头的单词数量。能否优化？

现在我要问第二个问题：**能否在每个节点预存该子树的总和？**

如果每个节点存储 `sum`，表示以该节点为根的子树中所有单词值的总和，查询就变成 O(m)，m 是前缀长度。

但更新时怎么办？插入或更新一个键时，需要更新路径上所有节点的 `sum`。

## 方案一：路径存储 + DFS 查询

### 核心思路

1. **节点结构**：只在单词结尾存储值
2. **插入**：沿路径创建节点，在结尾存储值
3. **查询**：找到前缀节点，DFS 遍历子树累加所有值

### 代码实现

```javascript
class TrieNode {
  constructor() {
    this.children = {};
    this.value = 0; // 如果是单词结尾，存储其值
  }
}

class MapSum {
  constructor() {
    this.root = new TrieNode();
  }
  
  insert(key, val) {
    let node = this.root;
    for (const char of key) {
      if (!node.children[char]) {
        node.children[char] = new TrieNode();
      }
      node = node.children[char];
    }
    node.value = val; // 在结尾存储值
  }
  
  sum(prefix) {
    // 1. 找到前缀节点
    let node = this.root;
    for (const char of prefix) {
      if (!node.children[char]) {
        return 0; // 前缀不存在
      }
      node = node.children[char];
    }
    
    // 2. DFS 累加子树所有值
    return this.dfsSum(node);
  }
  
  dfsSum(node) {
    let total = node.value; // 当前节点的值
    for (const child of Object.values(node.children)) {
      total += this.dfsSum(child); // 递归累加子节点
    }
    return total;
  }
}
```

### 复杂度分析

- **时间复杂度**：
  - `insert`：O(m)，m 是键的长度
  - `sum`：O(k)，k 是以该前缀开头的所有键的字符总数
  
- **空间复杂度**：O(n × m)，n 个键，每个长度 m

### 问题

这个方案有个隐藏的 bug：**更新值时没有处理旧值**。

```javascript
mapSum.insert("apple", 3);
mapSum.sum("ap"); // 返回 3
mapSum.insert("apple", 5); // 更新值
mapSum.sum("ap"); // 期望 5，但实际会累加旧值
```

需要记录每个键的旧值。

## 方案二：增量更新（推荐）

### 核心思路

1. **记录旧值**：用哈希表记录每个键的当前值
2. **计算差值**：插入时计算 `delta = newVal - oldVal`
3. **路径更新**：将差值传播到路径上的所有节点

### 代码实现

```javascript
class TrieNode {
  constructor() {
    this.children = {};
    this.sum = 0; // 该节点及其子树的总和
  }
}

class MapSum {
  constructor() {
    this.root = new TrieNode();
    this.map = new Map(); // 记录每个键的当前值
  }
  
  insert(key, val) {
    const oldVal = this.map.get(key) || 0;
    const delta = val - oldVal; // 计算差值
    this.map.set(key, val);
    
    // 沿路径更新所有节点的 sum
    let node = this.root;
    for (const char of key) {
      if (!node.children[char]) {
        node.children[char] = new TrieNode();
      }
      node = node.children[char];
      node.sum += delta; // 增量更新
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
    return node.sum; // 直接返回预计算的和
  }
}
```

### 为什么这样更优？

**增量更新的优势**：
- 查询 O(m)：只需找到节点，直接返回 `sum`
- 更新正确处理：通过 `delta` 避免重复累加
- 空间换时间：额外的哈希表换来查询加速

### 复杂度分析

- **时间复杂度**：
  - `insert`：O(m)
  - `sum`：O(m)
  
- **空间复杂度**：O(n × m)
  - 字典树：O(n × m)
  - 哈希表：O(n)

## 方案三：惰性计算

现在思考另一个角度：**如果插入频繁，查询很少呢？**

预计算的方案会在每次插入时更新所有节点，浪费计算。能否延迟计算？

### 核心思路

只在查询时才计算总和，插入时只记录值。

```javascript
class TrieNode {
  constructor() {
    this.children = {};
    this.value = 0;
  }
}

class MapSum {
  constructor() {
    this.root = new TrieNode();
    this.map = new Map();
  }
  
  insert(key, val) {
    this.map.set(key, val);
    let node = this.root;
    for (const char of key) {
      if (!node.children[char]) {
        node.children[char] = new TrieNode();
      }
      node = node.children[char];
    }
    node.value = val; // 只在结尾存储
  }
  
  sum(prefix) {
    // 遍历所有键，累加匹配的值
    let total = 0;
    for (const [key, val] of this.map) {
      if (key.startsWith(prefix)) {
        total += val;
      }
    }
    return total;
  }
}
```

### 权衡取舍

这个方案完全不用字典树也行，直接用哈希表 + `startsWith`。

**适用场景**：
- 插入非常频繁
- 查询很少
- 不在意查询性能

但对于本题场景（插入和查询都是 50 次），预计算方案更优。

## 方案对比

| 方案 | 插入时间 | 查询时间 | 更新正确性 | 适用场景 |
|-----|---------|---------|----------|---------|
| DFS 查询 | O(m) | O(k) | 需要额外处理 | 键少，树浅 |
| 增量更新 | O(m) | O(m) | ✅ 正确 | 查询频繁 |
| 惰性计算 | O(1) | O(n) | ✅ 正确 | 插入频繁 |

**推荐方案**：增量更新，平衡了时间和空间，且实现简洁。

## 测试用例

```javascript
// 测试用例 1：基本功能
const ms1 = new MapSum();
ms1.insert("apple", 3);
console.log(ms1.sum("ap")); // 3

ms1.insert("app", 2);
console.log(ms1.sum("ap")); // 5

// 测试用例 2：更新值
const ms2 = new MapSum();
ms2.insert("apple", 3);
console.log(ms2.sum("ap")); // 3

ms2.insert("apple", 5); // 更新
console.log(ms2.sum("ap")); // 5（不是 8）

// 测试用例 3：不同前缀
const ms3 = new MapSum();
ms3.insert("apple", 3);
ms3.insert("app", 2);
ms3.insert("apex", 4);
console.log(ms3.sum("ap")); // 9（apple + app + apex）
console.log(ms3.sum("app")); // 5（apple + app）
console.log(ms3.sum("apex")); // 4

// 测试用例 4：前缀不存在
const ms4 = new MapSum();
ms4.insert("apple", 3);
console.log(ms4.sum("b")); // 0

// 测试用例 5：空前缀
const ms5 = new MapSum();
ms5.insert("a", 1);
ms5.insert("b", 2);
console.log(ms5.sum("")); // 3（所有值）
```

## 关键要点

1. **节点存储策略**：
   - 只存值：结尾节点 `value`，查询需要 DFS
   - 预存和：每个节点 `sum`，查询 O(m)
2. **更新问题**：插入已存在的键时，必须处理旧值
3. **增量更新技巧**：`delta = newVal - oldVal`，避免重复累加
4. **空间换时间**：额外的哈希表换来查询加速
5. **字典树不是唯一方案**：哈希表 + `startsWith` 也能解决

## 扩展思考

**变体 1**：如果要支持删除键呢？

需要在删除时沿路径减去对应的值。

```javascript
delete(key) {
  if (!this.map.has(key)) return;
  const val = this.map.get(key);
  this.map.delete(key);
  
  let node = this.root;
  for (const char of key) {
    node = node.children[char];
    node.sum -= val; // 减去值
  }
}
```

**变体 2**：如果要查询前缀出现次数而非值的和呢？

将 `sum` 改为 `count`，插入时 `delta = 1`。

**变体 3**：如果要支持区间查询（如查询 "a" 到 "c" 之间的键）呢？

字典树天然按字典序组织，可以 DFS 遍历指定区间。

**变体 4**：如果键是整数而非字符串呢？

将整数转为字符串，或者改用前缀树的变体（如 01-Trie）。

这道题展示了字典树的灵活性：**通过在节点中存储聚合信息，可以高效支持前缀范围的统计查询**。这种思想在实际工程中也很实用，比如实现自动补全的权重排序、统计日志前缀出现次数等场景。
