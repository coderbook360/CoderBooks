# 前缀和后缀搜索

## 核心问题

设计一个支持前缀和后缀同时匹配的数据结构。给定一个前缀 `prefix` 和后缀 `suffix`，返回词典中满足条件的单词的权重（索引）。

这是一道典型的字典树扩展题——**如何同时处理字符串的两端信息？** 前缀用正向字典树，后缀用反向字典树，但如何将它们关联起来？

## LeetCode 745. 前缀和后缀搜索

**问题描述**：
```javascript
class WordFilter {
  constructor(words) {
    // words = ["apple"]
  }
  
  f(prefix, suffix) {
    // f("a", "e") 返回 0（"apple"的索引）
    // f("ap", "le") 返回 0
    // f("a", "") 返回 0
  }
}
```

**约束条件**：
- `1 <= words.length <= 10^4`
- `1 <= words[i].length <= 7`
- `1 <= prefix.length, suffix.length <= 7`
- 所有字符串由小写英文字母组成
- 最多调用 `10^4` 次 `f` 函数
- 如果有多个满足条件的单词，返回最大的索引

## 思考过程

首先要问一个问题：**为什么不能用两个独立的字典树？**

假设用两个字典树：
- 正向字典树存储前缀
- 反向字典树存储后缀

查询时分别查找，然后取交集。但问题是：**如何高效计算交集？**

如果每个节点存储所有单词索引，空间开销是 O(n² × m)，n 是单词数量，m 是单词长度。

现在我要问第二个问题：**能否在一棵树中同时包含前缀和后缀信息？**

关键洞察：**将后缀反向拼接到前缀前面，用特殊符号分隔**。

例如，单词 `"apple"`：
- 插入 `"e#apple"`（后缀 "e"）
- 插入 `"le#apple"`（后缀 "le"）
- 插入 `"ple#apple"`（后缀 "ple"）
- ...

查询 `f("ap", "le")` 时，搜索 `"le#ap"`。

## 方案一：组合键字典树

### 核心思路

1. **构建阶段**：对每个单词的每个后缀，生成 `suffix + "#" + word` 并插入字典树
2. **查询阶段**：搜索 `suffix + "#" + prefix`
3. **权重记录**：每个节点记录最大索引

### 代码实现

```javascript
class TrieNode {
  constructor() {
    this.children = {};
    this.weight = -1; // 记录经过此节点的单词的最大索引
  }
}

class WordFilter {
  constructor(words) {
    this.root = new TrieNode();
    
    // 遍历所有单词
    for (let weight = 0; weight < words.length; weight++) {
      const word = words[weight];
      const n = word.length;
      
      // 为每个后缀生成组合键
      for (let i = 0; i <= n; i++) {
        const suffix = word.slice(i); // 后缀（包括空字符串）
        const key = suffix + "#" + word; // 组合键
        
        // 插入字典树
        this.insert(key, weight);
      }
    }
  }
  
  insert(key, weight) {
    let node = this.root;
    for (const char of key) {
      if (!node.children[char]) {
        node.children[char] = new TrieNode();
      }
      node = node.children[char];
      node.weight = weight; // 更新最大索引
    }
  }
  
  f(prefix, suffix) {
    const searchKey = suffix + "#" + prefix;
    let node = this.root;
    
    // 搜索组合键
    for (const char of searchKey) {
      if (!node.children[char]) {
        return -1; // 未找到
      }
      node = node.children[char];
    }
    
    return node.weight; // 返回最大索引
  }
}
```

### 为什么这样设计？

**组合键的巧妙之处**：
- `"le#ap"` 确保同时匹配后缀 "le" 和前缀 "ap"
- 字典树天然支持前缀匹配
- 后续字符会自动验证前缀

**权重更新策略**：
- 因为后面的单词索引更大，直接覆盖即可
- 同一路径上，最后插入的单词索引最大

### 复杂度分析

- **时间复杂度**：
  - 构造函数：O(n × m²)，n 个单词，每个单词 m 个后缀，每个后缀长度 O(m)
  - 查询：O(m)，m 是前缀和后缀的总长度
  
- **空间复杂度**：O(n × m²)
  - 每个单词生成 m 个组合键，每个长度 O(m)

## 方案二：优化空间——只存必要后缀

现在思考一个问题：**是否需要存储所有后缀？**

注意到查询时 `suffix.length <= 7`，而且 `word.length <= 7`。如果单词最长 7 个字符，那么后缀最多 7 个。

但方案一为每个单词生成了 m+1 个组合键（包括空后缀），这是必要的吗？

**答案是必要的**，因为查询时后缀可能是空字符串（`f("a", "")`）。

但我们可以优化：**不存储完整单词，只存储索引**。

### 优化实现

```javascript
class TrieNode {
  constructor() {
    this.children = {};
    this.indices = []; // 存储所有匹配的单词索引
  }
}

class WordFilter {
  constructor(words) {
    this.root = new TrieNode();
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const n = word.length;
      
      // 为每个后缀生成组合键
      for (let j = 0; j <= n; j++) {
        const suffix = word.slice(j);
        const key = suffix + "#" + word;
        this.insert(key, i);
      }
    }
  }
  
  insert(key, index) {
    let node = this.root;
    for (const char of key) {
      if (!node.children[char]) {
        node.children[char] = new TrieNode();
      }
      node = node.children[char];
      node.indices.push(index); // 记录所有索引
    }
  }
  
  f(prefix, suffix) {
    const searchKey = suffix + "#" + prefix;
    let node = this.root;
    
    for (const char of searchKey) {
      if (!node.children[char]) {
        return -1;
      }
      node = node.children[char];
    }
    
    // 返回最大索引
    return node.indices.length > 0 
      ? node.indices[node.indices.length - 1] 
      : -1;
  }
}
```

这个方案的问题是：**每个节点存储所有索引，空间开销更大**。

因此，原方案更优：**只存储最大索引即可**。

## 方案三：哈希表暴力

如果不用字典树，能否用哈希表？

### 核心思路

预处理所有可能的 `(prefix, suffix)` 组合，存入哈希表。

```javascript
class WordFilter {
  constructor(words) {
    this.map = new Map();
    
    for (let weight = 0; weight < words.length; weight++) {
      const word = words[weight];
      const n = word.length;
      
      // 枚举所有前缀和后缀组合
      for (let i = 0; i <= n; i++) {
        for (let j = 0; j <= n; j++) {
          const prefix = word.slice(0, i);
          const suffix = word.slice(j);
          const key = prefix + "#" + suffix;
          this.map.set(key, weight); // 自动保留最大索引
        }
      }
    }
  }
  
  f(prefix, suffix) {
    const key = prefix + "#" + suffix;
    return this.map.get(key) ?? -1;
  }
}
```

### 复杂度分析

- **时间复杂度**：
  - 构造函数：O(n × m³)，每个单词枚举 m² 种组合
  - 查询：O(1)
  
- **空间复杂度**：O(n × m²)

### 方案对比

| 方案 | 构造时间 | 查询时间 | 空间复杂度 | 特点 |
|-----|---------|---------|----------|------|
| 字典树 | O(n × m²) | O(m) | O(n × m²) | 节省空间，查询稍慢 |
| 哈希表 | O(n × m³) | O(1) | O(n × m²) | 查询最快，构造慢 |

**如何选择？**

- **查询频繁**：哈希表方案
- **空间受限**：字典树方案
- **实际场景**：m ≤ 7，两种方案差异不大

## 测试用例

```javascript
// 测试用例 1：基本功能
const wf1 = new WordFilter(["apple"]);
console.log(wf1.f("a", "e")); // 0
console.log(wf1.f("ap", "le")); // 0
console.log(wf1.f("x", "e")); // -1

// 测试用例 2：多个单词
const wf2 = new WordFilter(["apple", "application", "appetite"]);
console.log(wf2.f("app", "e")); // 2（"appetite"）
console.log(wf2.f("ap", "ion")); // 1（"application"）

// 测试用例 3：空前缀/后缀
const wf3 = new WordFilter(["cat", "cart", "car"]);
console.log(wf3.f("", "t")); // 1（"cart"）
console.log(wf3.f("ca", "")); // 2（"car"）

// 测试用例 4：重复单词
const wf4 = new WordFilter(["test", "test"]);
console.log(wf4.f("t", "t")); // 1（返回最大索引）
```

## 关键要点

1. **组合键是核心**：`suffix + "#" + prefix` 将两端信息编码到一个键中
2. **字典树适合前缀匹配**：天然支持 `startsWith` 操作
3. **权重策略**：
   - 只存最大索引：节省空间
   - 存所有索引：支持更多查询变体
4. **空后缀/前缀处理**：必须包括空字符串的情况
5. **哈希表 vs 字典树**：
   - 哈希表：查询 O(1)，但构造慢
   - 字典树：查询 O(m)，但空间更优

## 扩展思考

**变体 1**：如果要求返回所有满足条件的单词呢？

修改节点结构，存储 `indices` 数组而非单个 `weight`。

**变体 2**：如果支持模糊匹配（如 `?` 通配符）呢？

需要 DFS 遍历字典树，类似"添加与搜索单词"问题。

**变体 3**：如果单词很长（如 m = 1000）呢？

哈希表方案会爆炸（m³ 构造时间），字典树方案更实用。

**变体 4**：如果要支持删除单词呢？

哈希表方案需要重新计算 `weight`，字典树方案需要引用计数。

这道题展示了字典树的灵活性：**通过巧妙的键编码，可以在一棵树中同时处理多维信息**。这种思想可以推广到更复杂的多条件查询场景。
