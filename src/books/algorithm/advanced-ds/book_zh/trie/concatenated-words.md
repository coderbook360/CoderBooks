# 连接词

## 核心问题

找出给定词典中所有由词典中其他单词组成的单词。这些单词称为"连接词"（Concatenated Words）。

这是一道字典树与动态规划的经典结合题——**如何判断一个单词能否由多个其他单词拼接而成？** 不同于"词典中最长的单词"逐个字母构建，这里是任意长度的单词拼接。

## LeetCode 472. 连接词

**问题描述**：
```
输入：words = ["cat","cats","catsdogcats","dog","dogcatsdog","hippopotamuses","rat","ratcatdogcat"]
输出：["catsdogcats","dogcatsdog","ratcatdogcat"]

解释：
"catsdogcats" = "cats" + "dog" + "cats"
"dogcatsdog" = "dog" + "cats" + "dog"
"ratcatdogcat" = "rat" + "cat" + "dog" + "cat"
```

**约束条件**：
- `1 <= words.length <= 10^4`
- `1 <= words[i].length <= 30`
- 所有字符串由小写英文字母组成
- 所有字符串唯一
- 答案中不含输入中的顺序

## 思考过程

首先要问一个问题：**如何判断一个单词是连接词？**

暴力做法：对每个单词，尝试所有可能的分割点，递归检查每部分是否在词典中。

但这样会有大量重复计算。比如 `"ratcatdogcat"`：
- 检查 `"rat"` 后，剩余 `"catdogcat"`
- 检查 `"ratcat"` 后，剩余 `"dogcat"`
- 两条路径都会计算 `"cat"` 是否在词典中

现在我要问第二个问题：**能否用动态规划避免重复计算？**

定义 `dp[i]`：表示 `word[0...i-1]` 能否由词典中的单词组成。

状态转移：
```
dp[i] = true，如果存在 j < i，使得：
  - dp[j] = true（前半部分可拆分）
  - word[j...i-1] 在词典中（后半部分存在）
```

但还有一个问题：**如何快速判断子串是否在词典中？**

这就是字典树的用武之地。

## 方案一：字典树 + 动态规划

### 核心思路

1. **构建字典树**：将所有单词插入字典树
2. **DP 判断**：对每个单词，用 DP 判断是否可拆分
3. **剪枝优化**：不能用自己拆分自己

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

  search(word) {
    let node = this.root;
    for (const char of word) {
      if (!node.children[char]) return false;
      node = node.children[char];
    }
    return node.isEnd;
  }
}

function findAllConcatenatedWordsInADict(words) {
  const trie = new Trie();
  const result = [];
  
  // 1. 按长度排序（短单词优先插入）
  words.sort((a, b) => a.length - b.length);
  
  for (const word of words) {
    if (word.length === 0) continue;
    
    // 2. 检查当前单词是否可由已插入的单词组成
    if (canForm(word, trie)) {
      result.push(word);
    }
    
    // 3. 将当前单词插入字典树
    trie.insert(word);
  }
  
  return result;
}

function canForm(word, trie) {
  const n = word.length;
  const dp = new Array(n + 1).fill(false);
  dp[0] = true; // 空字符串可拆分
  
  for (let i = 1; i <= n; i++) {
    // 遍历所有分割点
    for (let j = 0; j < i; j++) {
      if (dp[j]) {
        const substr = word.slice(j, i);
        if (trie.search(substr)) {
          dp[i] = true;
          break; // 找到一种拆分方式即可
        }
      }
    }
  }
  
  return dp[n];
}
```

### 为什么按长度排序？

关键洞察：**一个连接词必定由更短的单词组成**。

排序的好处：
- 检查当前单词时，所有更短的单词已经在字典树中
- 避免自己拆分自己的问题
- 自然保证了"由其他单词组成"的约束

### 复杂度分析

- **时间复杂度**：O(n log n + n × m²)
  - 排序：O(n log n)
  - 对每个单词：DP O(m²)，m 是单词长度
  - 字典树查询：O(m)
  
- **空间复杂度**：O(n × m)
  - 字典树：O(n × m)
  - DP 数组：O(m)

## 方案二：字典树 + DFS（回溯）

现在换个角度思考：**能否用 DFS 直接搜索所有可能的拆分？**

### 核心思路

从单词的第一个字符开始，尝试所有可能的前缀：
- 如果前缀在词典中，递归处理剩余部分
- 如果剩余部分也能拆分，则整个单词可拆分

### 代码实现

```javascript
function findAllConcatenatedWordsInADict(words) {
  const wordSet = new Set(words);
  const result = [];
  
  for (const word of words) {
    if (canFormDFS(word, wordSet, 0, 0)) {
      result.push(word);
    }
  }
  
  return result;
}

function canFormDFS(word, wordSet, start, count) {
  // count 记录已匹配的单词数，至少要 2 个
  if (start === word.length) {
    return count >= 2;
  }
  
  // 尝试所有可能的结束位置
  for (let end = start + 1; end <= word.length; end++) {
    const substr = word.slice(start, end);
    
    // 跳过整个单词（避免用自己拆分自己）
    if (end === word.length && count === 0) {
      continue;
    }
    
    if (wordSet.has(substr)) {
      if (canFormDFS(word, wordSet, end, count + 1)) {
        return true;
      }
    }
  }
  
  return false;
}
```

### 优化：记忆化搜索

DFS 会重复计算相同的子问题。比如 `"abcd"`：
- 路径 1：`"a" + "bcd"`
- 路径 2：`"ab" + "cd"`
- 两条路径都可能计算 `"bcd"` 的起始位置

添加记忆化：

```javascript
function canFormDFS(word, wordSet, start, count, memo = new Map()) {
  if (start === word.length) {
    return count >= 2;
  }
  
  const key = `${start}-${count}`;
  if (memo.has(key)) {
    return memo.get(key);
  }
  
  for (let end = start + 1; end <= word.length; end++) {
    const substr = word.slice(start, end);
    
    if (end === word.length && count === 0) continue;
    
    if (wordSet.has(substr)) {
      if (canFormDFS(word, wordSet, end, count + 1, memo)) {
        memo.set(key, true);
        return true;
      }
    }
  }
  
  memo.set(key, false);
  return false;
}
```

### 复杂度分析

- **时间复杂度**：O(n × m²)
  - 每个单词：最多 m 个状态，每个状态尝试 m 个子串
  
- **空间复杂度**：O(m)
  - 记忆化：O(m)
  - 递归栈：O(m)

## 方案对比

| 方案 | 时间复杂度 | 空间复杂度 | 优点 | 缺点 |
|-----|----------|----------|------|------|
| 字典树 + DP | O(n log n + n × m²) | O(n × m) | 清晰稳定 | 需要排序 |
| 哈希表 + DFS | O(n × m²) | O(m) | 简单直观 | 需要记忆化 |

**如何选择？**

- **数据规模大**：DP 方案更稳定
- **单词很长**：记忆化 DFS 可能更快（剪枝效果好）
- **实现简单**：哈希表 + DFS

## 测试用例

```javascript
// 测试用例 1：基本示例
const words1 = ["cat","cats","catsdogcats","dog","dogcatsdog","hippopotamuses","rat","ratcatdogcat"];
console.log(findAllConcatenatedWordsInADict(words1));
// ["catsdogcats","dogcatsdog","ratcatdogcat"]

// 测试用例 2：无连接词
const words2 = ["cat","dog","rat"];
console.log(findAllConcatenatedWordsInADict(words2)); // []

// 测试用例 3：长连接词
const words3 = ["a","b","ab","abc"];
console.log(findAllConcatenatedWordsInADict(words3)); // ["ab","abc"]

// 测试用例 4：自己拆分自己
const words4 = ["a","aa"];
console.log(findAllConcatenatedWordsInADict(words4)); // ["aa"]

// 测试用例 5：空字符串
const words5 = ["","a"];
console.log(findAllConcatenatedWordsInADict(words5)); // []
```

## 关键要点

1. **连接词定义**：由至少 2 个其他单词组成
2. **排序技巧**：按长度排序，保证检查时更短的单词已处理
3. **DP 状态定义**：`dp[i]` 表示前 i 个字符能否拆分
4. **DFS 搜索**：尝试所有分割点，记忆化避免重复
5. **边界处理**：
   - 不能用自己拆分自己
   - 至少要 2 个单词
   - 空字符串不是连接词

## 扩展思考

**变体 1**：如果要返回所有可能的拆分方案呢？

修改 DP 或 DFS，记录路径而非只判断可行性。

```javascript
function getAllSplits(word, wordSet) {
  const result = [];
  function dfs(start, path) {
    if (start === word.length && path.length >= 2) {
      result.push([...path]);
      return;
    }
    for (let end = start + 1; end <= word.length; end++) {
      const substr = word.slice(start, end);
      if (wordSet.has(substr)) {
        path.push(substr);
        dfs(end, path);
        path.pop();
      }
    }
  }
  dfs(0, []);
  return result;
}
```

**变体 2**：如果单词可以重复使用呢？

移除 `count >= 2` 的限制，允许用自己拆分自己。

**变体 3**：如果要找最长的连接词呢？

在结果中按长度排序，取最大值。

**变体 4**：如果词典非常大（如 10^6）呢？

字典树方案更优，哈希表的空间开销会很大。

这道题展示了字典树与动态规划的完美结合：**字典树提供高效的子串查询，DP 避免重复计算**。这种组合在很多字符串拆分、分词问题中都非常实用。
