# 单词搜索 II

本章讲解字典树与回溯结合的经典应用，通过 LeetCode 212 题实战演练。

---

## 题目描述

**LeetCode 212. 单词搜索 II**

给定一个 m x n 二维字符网格 board 和一个单词列表 words，找出所有同时在二维网格和单词列表中出现的单词。

单词必须按照字母顺序，通过相邻的单元格内的字母构成，其中"相邻"单元格是那些水平相邻或垂直相邻的单元格。同一个单元格内的字母在一个单词中不允许被重复使用。

**示例**：

```
输入：
board = [
  ["o","a","a","n"],
  ["e","t","a","e"],
  ["i","h","k","r"],
  ["i","f","l","v"]
]
words = ["oath","pea","eat","rain"]

输出：["eat","oath"]
```

---

## 思路分析

### 暴力方法的问题

对于每个单词，在网格中做一次 DFS 搜索。如果有 k 个单词，每个单词长度为 L，网格大小为 m × n：
- 时间复杂度：O(k × m × n × 4^L)
- 当 k 很大时，效率很低

### 优化思路

**问题本质**：多个单词共享相同的前缀时，暴力方法会重复搜索。

**解决方案**：用 Trie 存储所有单词，在一次 DFS 中同时匹配所有可能的单词。

### 为什么 Trie 有效？

1. **剪枝**：如果当前路径不是任何单词的前缀，立即终止
2. **共享搜索**：共享前缀的单词在同一次搜索中被处理
3. **避免重复**：找到单词后标记，避免重复添加

---

## 代码实现

```typescript
class TrieNode {
  children: Map<string, TrieNode>;
  word: string | null;  // 存储完整单词，而非 isEndOfWord
  
  constructor() {
    this.children = new Map();
    this.word = null;
  }
}

function findWords(board: string[][], words: string[]): string[] {
  const result: string[] = [];
  const root = new TrieNode();
  
  // 1. 构建 Trie
  for (const word of words) {
    let node = root;
    for (const char of word) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode());
      }
      node = node.children.get(char)!;
    }
    node.word = word;  // 在叶子节点存储完整单词
  }
  
  const m = board.length;
  const n = board[0].length;
  const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  
  // 2. DFS 搜索
  function dfs(row: number, col: number, node: TrieNode): void {
    const char = board[row][col];
    const nextNode = node.children.get(char);
    
    // 剪枝：当前字符不在 Trie 中
    if (!nextNode) return;
    
    // 找到一个单词
    if (nextNode.word !== null) {
      result.push(nextNode.word);
      nextNode.word = null;  // 避免重复添加
    }
    
    // 标记访问
    board[row][col] = '#';
    
    // 探索四个方向
    for (const [dx, dy] of directions) {
      const newRow = row + dx;
      const newCol = col + dy;
      
      if (newRow >= 0 && newRow < m && 
          newCol >= 0 && newCol < n && 
          board[newRow][newCol] !== '#') {
        dfs(newRow, newCol, nextNode);
      }
    }
    
    // 恢复
    board[row][col] = char;
  }
  
  // 3. 从每个位置开始搜索
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      dfs(i, j, root);
    }
  }
  
  return result;
}
```

---

## 关键设计决策

### 1. 为什么存储完整单词而非 isEndOfWord？

```typescript
// 方案一：使用 isEndOfWord
if (node.isEndOfWord) {
  // 需要额外追踪路径来重建单词
  result.push(path.join(''));  // 需要维护 path 数组
}

// 方案二：直接存储单词（更简洁）
if (node.word !== null) {
  result.push(node.word);
}
```

存储完整单词可以避免在 DFS 过程中维护路径字符串。

### 2. 如何避免重复添加同一个单词？

```typescript
if (nextNode.word !== null) {
  result.push(nextNode.word);
  nextNode.word = null;  // 找到后立即置空
}
```

### 3. 原地标记 vs 使用 visited 数组

```typescript
// 方案一：原地标记（节省空间）
board[row][col] = '#';
// ... DFS ...
board[row][col] = char;

// 方案二：使用 visited 数组
const visited = Array(m).fill(null).map(() => Array(n).fill(false));
visited[row][col] = true;
// ... DFS ...
visited[row][col] = false;
```

原地标记更高效，但需要注意恢复。

---

## 进一步优化

### 剪枝优化：删除已匹配的叶子节点

当一个节点的所有子节点都被清空时，可以删除该节点：

```typescript
function dfs(row: number, col: number, node: TrieNode): void {
  const char = board[row][col];
  const nextNode = node.children.get(char);
  
  if (!nextNode) return;
  
  if (nextNode.word !== null) {
    result.push(nextNode.word);
    nextNode.word = null;
  }
  
  board[row][col] = '#';
  
  for (const [dx, dy] of directions) {
    const newRow = row + dx;
    const newCol = col + dy;
    
    if (newRow >= 0 && newRow < m && 
        newCol >= 0 && newCol < n && 
        board[newRow][newCol] !== '#') {
      dfs(newRow, newCol, nextNode);
    }
  }
  
  board[row][col] = char;
  
  // 新增：如果子节点为空，删除该节点
  if (nextNode.children.size === 0) {
    node.children.delete(char);
  }
}
```

这样可以避免后续搜索进入已经匹配完成的分支。

---

## 执行过程演示

以示例为例，搜索 "eat"：

```
board:
  o a a n
  e t a e
  i h k r
  i f l v

Trie 包含：oath, pea, eat, rain

搜索过程（从位置 (1,0) 的 'e' 开始）：

1. 位置 (1,0)='e'，Trie 中存在 'e' 分支
   标记 board[1][0]='#'
   
2. 探索 (1,1)='t'，Trie 中 e→t 存在
   标记 board[1][1]='#'
   
3. 探索 (0,1)='a'，Trie 中 e→t→a 存在
   node.word = "eat" ✓
   添加到结果
   
4. 继续探索，无更多匹配

5. 回溯，恢复标记
```

---

## 复杂度分析

设 m × n 是网格大小，k 是单词数量，L 是单词平均长度。

- **时间复杂度**：O(m × n × 4^L)
  - 虽然看起来和暴力相同，但 Trie 的剪枝大大减少了实际搜索量
  
- **空间复杂度**：O(k × L)
  - Trie 存储所有单词
  - 递归栈深度最多 L

---

## 易错点

1. **忘记恢复标记**
   ```typescript
   // 错误：DFS 后忘记恢复
   board[row][col] = '#';
   for (const [dx, dy] of directions) {
     dfs(newRow, newCol, nextNode);
   }
   // 缺少：board[row][col] = char;
   ```

2. **重复添加单词**
   ```typescript
   // 错误：没有清除 word 标记
   if (nextNode.word !== null) {
     result.push(nextNode.word);
     // 缺少：nextNode.word = null;
   }
   ```

3. **边界检查顺序**
   ```typescript
   // 错误：先访问再检查
   const newRow = row + dx;
   const newCol = col + dy;
   dfs(newRow, newCol, nextNode);  // 可能越界！
   
   // 正确：先检查再访问
   if (newRow >= 0 && newRow < m && newCol >= 0 && newCol < n) {
     dfs(newRow, newCol, nextNode);
   }
   ```

---

## 相关题目

| 题号 | 题目 | 难度 | 关联 |
|-----|------|------|------|
| 79 | 单词搜索 | 中等 | 本题的单词版本 |
| 208 | 实现 Trie | 中等 | Trie 基础 |
| 211 | 添加与搜索单词 | 中等 | Trie + 通配符 |
| 1032 | 字符流 | 困难 | Trie + 流处理 |

---

## 本章小结

1. **核心技巧**：Trie + DFS 回溯，一次搜索匹配多个单词
2. **关键优化**：利用 Trie 结构进行剪枝，避免无效搜索
3. **实现要点**：原地标记、避免重复添加、正确恢复状态
4. **进阶优化**：删除已匹配的叶子节点，进一步减少搜索空间
