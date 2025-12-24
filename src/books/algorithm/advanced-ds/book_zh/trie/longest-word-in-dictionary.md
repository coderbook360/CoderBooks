# 词典中最长的单词

## 核心问题

给定一个字符串数组 `words`，找出其中最长的一个单词，该单词是由 `words` 中其他单词逐步添加一个字母组成的。如果有多个答案，返回字典序最小的。

这是一道典型的字典树应用题——如何判断一个单词能否由其他单词逐步构建？关键在于：**每一步添加字母后的前缀都必须在词典中存在**。

## LeetCode 720. 词典中最长的单词

**问题描述**：
```
输入：words = ["w","wo","wor","worl","world"]
输出："world"
解释：单词"world"可由"w" → "wo" → "wor" → "worl" → "world"逐步添加一个字母组成。

输入：words = ["a","banana","app","appl","ap","apply","apple"]
输出："apple"
解释："apply"和"apple"都可以由其他单词组成，但"apple"字典序更小。
```

**约束条件**：
- `1 <= words.length <= 1000`
- `1 <= words[i].length <= 30`
- 所有字符串由小写英文字母组成
- `words` 中所有字符串互不相同

## 思考过程

首先要问一个问题：**什么叫"逐步添加一个字母组成"？**

以 `"world"` 为例：
- `"w"` 必须在词典中
- `"wo"` 必须在词典中
- `"wor"` 必须在词典中
- `"worl"` 必须在词典中
- 最后才是 `"world"`

这意味着：**一个合法单词的所有前缀都必须存在于词典中**。

现在我要问第二个问题：**如何高效验证所有前缀？**

如果用哈希表存储所有单词，然后对每个单词遍历其所有前缀，时间复杂度是 O(n × m²)，其中 n 是单词数量，m 是单词长度。

但字典树天生适合处理前缀问题。遍历字典树时，可以标记每个节点是否是一个完整单词的结尾，这样就能在 O(m) 时间内验证所有前缀。

## 方案一：构建 + DFS 搜索

### 核心思路

1. **构建字典树**：将所有单词插入字典树，标记单词结尾
2. **DFS 搜索**：从根节点开始深度优先搜索
   - 只访问那些 `isEnd = true` 的节点（保证前缀都存在）
   - 记录路径，更新最长单词
3. **字典序处理**：按字母顺序遍历子节点

### 代码实现

```javascript
class TrieNode {
  constructor() {
    this.children = {};
    this.isEnd = false;
  }
}

class Trie {
  constructor() {
    this.root = new TrieNode();
  }

  insert(word) {
    let node = this.root;
    for (const char of word) {
      if (!node.children[char]) {
        node.children[char] = new TrieNode();
      }
      node = node.children[char];
    }
    node.isEnd = true;
  }
}

function longestWord(words) {
  const trie = new Trie();
  
  // 1. 构建字典树
  for (const word of words) {
    trie.insert(word);
  }
  
  let longest = "";
  
  // 2. DFS 搜索所有合法路径
  function dfs(node, path) {
    // 更新最长单词（长度优先，字典序其次）
    if (path.length > longest.length || 
        (path.length === longest.length && path < longest)) {
      longest = path;
    }
    
    // 按字母顺序遍历子节点
    for (const char of Object.keys(node.children).sort()) {
      const child = node.children[char];
      // 只访问完整单词节点（保证前缀存在）
      if (child.isEnd) {
        dfs(child, path + char);
      }
    }
  }
  
  dfs(trie.root, "");
  return longest;
}
```

### 复杂度分析

- **时间复杂度**：O(n × m + k)
  - 构建字典树：O(n × m)
  - DFS 遍历：最坏情况访问所有节点，O(k)，k 是所有单词的总字符数
  
- **空间复杂度**：O(k)
  - 字典树存储：O(k)
  - 递归调用栈：O(m)

## 方案二：排序 + 哈希表

现在换个角度思考：**如果按长度排序，能否简化验证？**

如果先处理短单词，再处理长单词，那么验证一个单词时，它的所有前缀要么已经验证过，要么不存在。

### 核心思路

1. **按长度排序**：短单词优先处理
2. **哈希表验证**：已验证的单词存入哈希表
3. **前缀检查**：验证新单词时，只需检查去掉最后一个字母的前缀是否在哈希表中

### 代码实现

```javascript
function longestWord(words) {
  // 1. 按长度排序，长度相同时按字典序
  words.sort((a, b) => {
    if (a.length !== b.length) {
      return a.length - b.length;
    }
    return a < b ? -1 : 1;
  });
  
  const validWords = new Set();
  validWords.add(""); // 空字符串作为基础
  
  let longest = "";
  
  // 2. 依次验证每个单词
  for (const word of words) {
    const prefix = word.slice(0, -1); // 去掉最后一个字母
    
    // 3. 前缀存在则当前单词合法
    if (validWords.has(prefix)) {
      validWords.add(word);
      
      // 4. 更新最长单词
      if (word.length > longest.length || 
          (word.length === longest.length && word < longest)) {
        longest = word;
      }
    }
  }
  
  return longest;
}
```

### 为什么这样更简单？

- **不需要字典树**：哈希表足以完成验证
- **不需要 DFS**：按顺序处理保证前缀已验证
- **代码更简洁**：逻辑更直观

但它也有代价：
- **排序开销**：O(n log n)
- **不适合动态场景**：如果词典频繁变化，每次都要重新排序

### 复杂度分析

- **时间复杂度**：O(n log n + n × m)
  - 排序：O(n log n)
  - 遍历验证：O(n × m)
  
- **空间复杂度**：O(n × m)
  - 哈希表存储所有合法单词

## 方案对比

| 方案 | 时间复杂度 | 空间复杂度 | 适用场景 |
|-----|----------|----------|---------|
| 字典树 + DFS | O(n × m + k) | O(k) | 词典固定，多次查询 |
| 排序 + 哈希表 | O(n log n + n × m) | O(n × m) | 一次性处理，简单直观 |

**如何选择？**

- **数据规模小**：排序方案更简单
- **词典动态变化**：字典树方案更高效
- **多次查询**：字典树避免重复排序

## 测试用例

```javascript
// 测试用例 1：基本示例
console.log(longestWord(["w","wo","wor","worl","world"])); // "world"

// 测试用例 2：字典序选择
console.log(longestWord(["a","banana","app","appl","ap","apply","apple"])); // "apple"

// 测试用例 3：无法构建
console.log(longestWord(["abc","ab","bc"])); // "ab"

// 测试用例 4：单字母
console.log(longestWord(["a","b","c"])); // "a"

// 测试用例 5：空词典
console.log(longestWord([])); // ""
```

## 关键要点

1. **前缀验证是核心**：合法单词的所有前缀都必须存在
2. **字典树天然适合前缀问题**：节点标记 + DFS 遍历
3. **排序可以简化问题**：按长度处理，前缀自然已验证
4. **字典序处理细节**：
   - 字典树方案：按字母顺序遍历子节点
   - 排序方案：排序时直接处理
5. **空字符串是基础**：所有单字母单词的"前缀"

## 扩展思考

**变体 1**：如果不要求所有前缀都存在，只要求任意一条路径存在呢？

这就变成了"连接词"问题（第 8 章），需要用动态规划或回溯。

**变体 2**：如果要找所有满足条件的单词呢？

只需将 `longest` 改为列表，收集所有合法单词。

**变体 3**：如果词典很大，内存受限呢？

可以分批处理：
1. 按长度分组
2. 每次只加载相邻长度的单词
3. 验证后释放内存

这道题展示了字典树在前缀验证场景的强大能力，同时也说明：**合适的数据预处理（如排序）有时能让问题变得更简单**。
