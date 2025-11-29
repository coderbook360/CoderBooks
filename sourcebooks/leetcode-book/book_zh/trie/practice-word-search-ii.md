# 实战：单词搜索II

这是一道Hard难度的经典题，将Trie和回溯完美结合。在二维网格中搜索多个单词，暴力解法会超时，用Trie可以大幅优化。

## 问题描述

给定一个`m x n`二维字符网格`board`和一个单词列表`words`，返回所有在网格中能找到的单词。

单词必须按照字母顺序，通过**相邻的单元格**内的字母构成，其中"相邻"是指水平或垂直相邻。同一个单元格内的字母在一个单词中不允许被重复使用。

**示例**：
```
board = [
  ['o','a','a','n'],
  ['e','t','a','e'],
  ['i','h','k','r'],
  ['i','f','l','v']
]
words = ["oath","pea","eat","rain"]

输出：["eat","oath"]
```

## 思路分析

### 暴力思路

对每个单词，从每个格子开始DFS搜索。时间复杂度O(w × m × n × 4^L)，其中w是单词数，L是单词长度。当单词很多时会超时。

### Trie优化

核心思想：**把所有单词插入Trie，然后从每个格子开始DFS，同时在Trie上移动**。

这样做的好处：
1. 多个单词可以共享搜索路径（如"oath"和"oat"）
2. 可以提前剪枝（如果当前路径在Trie中不存在，立即停止）

## 算法步骤

1. 把所有单词插入Trie
2. 从每个格子开始DFS
3. DFS过程中同时在Trie上移动
4. 如果Trie节点不存在，剪枝
5. 如果到达单词结尾，记录结果

## 完整实现

```javascript
class TrieNode {
    constructor() {
        this.children = {};
        this.word = null;  // 存储完整单词，方便记录结果
    }
}

/**
 * @param {character[][]} board
 * @param {string[]} words
 * @return {string[]}
 */
function findWords(board, words) {
    // 1. 构建Trie
    const root = new TrieNode();
    for (const word of words) {
        let node = root;
        for (const char of word) {
            if (!node.children[char]) {
                node.children[char] = new TrieNode();
            }
            node = node.children[char];
        }
        node.word = word;  // 在单词结尾存储完整单词
    }
    
    const result = [];
    const m = board.length;
    const n = board[0].length;
    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    
    // 2. DFS搜索
    function dfs(i, j, node) {
        const char = board[i][j];
        const nextNode = node.children[char];
        
        // 剪枝：Trie中没有这条路
        if (!nextNode) return;
        
        // 找到一个单词
        if (nextNode.word) {
            result.push(nextNode.word);
            nextNode.word = null;  // 避免重复添加
        }
        
        // 标记访问
        board[i][j] = '#';
        
        // 向四个方向搜索
        for (const [di, dj] of dirs) {
            const ni = i + di;
            const nj = j + dj;
            if (ni >= 0 && ni < m && nj >= 0 && nj < n && board[ni][nj] !== '#') {
                dfs(ni, nj, nextNode);
            }
        }
        
        // 恢复
        board[i][j] = char;
    }
    
    // 3. 从每个格子开始搜索
    for (let i = 0; i < m; i++) {
        for (let j = 0; j < n; j++) {
            dfs(i, j, root);
        }
    }
    
    return result;
}
```

## 执行过程

```
board = [
  ['o','a'],
  ['e','t']
]
words = ["oat", "eat"]

Trie结构：
        root
       /    \
      o      e
      |      |
      a      a
      |      |
      t*     t*

从(0,0)='o'开始：
  Trie有'o'，进入
  标记board[0][0]='#'
  
  从(0,1)='a'继续：
    Trie有'o'→'a'，进入
    标记board[0][1]='#'
    
    从(1,1)='t'继续：
      Trie有'o'→'a'→'t'，是单词结尾
      记录"oat"
      
  恢复board

从(1,0)='e'开始：
  Trie有'e'，进入
  ...最终找到"eat"

结果：["oat", "eat"]
```

## 剪枝优化

### 优化1：删除已找到的单词

找到单词后，可以从Trie中删除，减少后续搜索：

```javascript
function dfs(i, j, node) {
    const char = board[i][j];
    const nextNode = node.children[char];
    if (!nextNode) return;
    
    if (nextNode.word) {
        result.push(nextNode.word);
        nextNode.word = null;
    }
    
    board[i][j] = '#';
    
    for (const [di, dj] of dirs) {
        // ...
    }
    
    board[i][j] = char;
    
    // 优化：如果子节点为空，删除这个分支
    if (Object.keys(nextNode.children).length === 0) {
        delete node.children[char];
    }
}
```

### 优化2：检查字符是否存在

搜索前先检查单词中的字符是否都在board中：

```javascript
function findWords(board, words) {
    // 统计board中的字符
    const charSet = new Set();
    for (const row of board) {
        for (const char of row) {
            charSet.add(char);
        }
    }
    
    // 过滤不可能的单词
    words = words.filter(word => {
        for (const char of word) {
            if (!charSet.has(char)) return false;
        }
        return true;
    });
    
    // ... 继续正常流程
}
```

## 复杂度分析

**时间复杂度**：O(m × n × 4^L)
- 最坏情况要访问所有格子，每个格子最多延伸L步
- 但Trie剪枝大大减少了实际搜索量

**空间复杂度**：O(W × L)
- W是单词数，L是最长单词长度
- 存储Trie需要的空间

## 为什么Trie比直接搜索快？

假设有1000个以"app"开头的单词：

**直接搜索**：每个单词都要从头搜索"app"，重复1000次

**用Trie**：搜索一次"app"路径，就能同时处理所有以"app"开头的单词

这就是**前缀共享**的威力。

## 小结

这道题是Trie + 回溯的经典组合：

1. **Trie用于剪枝**：快速判断当前路径是否有希望
2. **回溯用于搜索**：在二维网格中遍历所有可能路径
3. **优化是关键**：删除已找到的单词、提前过滤等

这类题目在面试中很常见，掌握Trie + DFS的组合技巧非常重要。
