# 实战：单词搜索

> LeetCode 79. 单词搜索 | 难度：中等

二维网格路径搜索的经典问题，展示回溯在"路径探索"场景中的应用。

---

## 问题描述

给定一个`m x n`二维字符网格`board`和一个字符串单词`word`。如果`word`存在于网格中，返回`true`；否则，返回`false`。

单词必须按照字母顺序，通过相邻的单元格内的字母构成，其中"相邻"单元格是那些水平相邻或垂直相邻的单元格。同一个单元格内的字母不允许被重复使用。

**示例**：
```
输入：board = [["A","B","C","E"],
              ["S","F","C","S"],
              ["A","D","E","E"]],
     word = "ABCCED"
输出：true

输入：board = [["A","B","C","E"],
              ["S","F","C","S"],
              ["A","D","E","E"]],
     word = "SEE"
输出：true

输入：board = [["A","B","C","E"],
              ["S","F","C","S"],
              ["A","D","E","E"]],
     word = "ABCB"
输出：false（B已经用过）
```

---

## 思路分析

### 问题建模

- **状态**：当前位置(i,j)，已匹配的字符长度
- **选择**：向上、下、左、右四个方向移动
- **约束**：不能越界、不能重复访问、字符必须匹配
- **目标**：匹配完整个word

### 决策树模型

```
寻找"ABC"，从(0,0)开始：

(0,0)='A' 匹配第1个字符
├─ 向右(0,1)='B' 匹配第2个字符
│  ├─ 向右(0,2)='C' 匹配第3个字符 ✓ 成功！
│  ├─ 向下(1,1)='F' 不匹配 ✗
│  └─ 向左(0,0)='A' 已访问 ✗
├─ 向下(1,0)='S' 不匹配 ✗
├─ 向左 越界 ✗
└─ 向上 越界 ✗
```

---

## 解法一：基础回溯

```typescript
function exist(board: string[][], word: string): boolean {
  const m = board.length;
  const n = board[0].length;
  
  // 访问标记
  const visited = Array.from(
    { length: m },
    () => Array(n).fill(false)
  );
  
  // 四个方向
  const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  
  function backtrack(row: number, col: number, index: number): boolean {
    // 终止条件：已匹配整个单词
    if (index === word.length) return true;
    
    // 边界检查
    if (row < 0 || row >= m || col < 0 || col >= n) return false;
    
    // 已访问检查
    if (visited[row][col]) return false;
    
    // 字符匹配检查
    if (board[row][col] !== word[index]) return false;
    
    // 标记访问
    visited[row][col] = true;
    
    // 尝试四个方向
    for (const [dr, dc] of directions) {
      if (backtrack(row + dr, col + dc, index + 1)) {
        return true;  // 找到就返回
      }
    }
    
    // 撤销标记（回溯）
    visited[row][col] = false;
    return false;
  }
  
  // 尝试从每个位置开始
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (backtrack(i, j, 0)) return true;
    }
  }
  
  return false;
}
```

---

## 解法二：原地标记优化

用特殊字符标记已访问，省去visited数组：

```typescript
function exist(board: string[][], word: string): boolean {
  const m = board.length;
  const n = board[0].length;
  
  function backtrack(row: number, col: number, index: number): boolean {
    if (index === word.length) return true;
    
    if (row < 0 || row >= m || col < 0 || col >= n) return false;
    if (board[row][col] !== word[index]) return false;
    
    // 临时标记（用原字符不可能出现的值）
    const temp = board[row][col];
    board[row][col] = '#';
    
    // 尝试四个方向
    const found = backtrack(row + 1, col, index + 1) ||
                  backtrack(row - 1, col, index + 1) ||
                  backtrack(row, col + 1, index + 1) ||
                  backtrack(row, col - 1, index + 1);
    
    // 恢复
    board[row][col] = temp;
    
    return found;
  }
  
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (backtrack(i, j, 0)) return true;
    }
  }
  
  return false;
}
```

---

## 解法三：剪枝优化

增加预检查，提前排除不可能的情况：

```typescript
function exist(board: string[][], word: string): boolean {
  const m = board.length;
  const n = board[0].length;
  
  // 剪枝1：字符频率检查
  const boardCount = new Map<string, number>();
  const wordCount = new Map<string, number>();
  
  for (const row of board) {
    for (const char of row) {
      boardCount.set(char, (boardCount.get(char) || 0) + 1);
    }
  }
  
  for (const char of word) {
    wordCount.set(char, (wordCount.get(char) || 0) + 1);
  }
  
  for (const [char, count] of wordCount) {
    if ((boardCount.get(char) || 0) < count) {
      return false;  // 字符不够，不可能找到
    }
  }
  
  // 剪枝2：首尾翻转优化
  // 如果word末尾字符在board中更少，翻转word可以更快失败
  const firstCount = boardCount.get(word[0]) || 0;
  const lastCount = boardCount.get(word[word.length - 1]) || 0;
  if (lastCount < firstCount) {
    word = word.split('').reverse().join('');
  }
  
  // 正常回溯
  function backtrack(row: number, col: number, index: number): boolean {
    if (index === word.length) return true;
    if (row < 0 || row >= m || col < 0 || col >= n) return false;
    if (board[row][col] !== word[index]) return false;
    
    const temp = board[row][col];
    board[row][col] = '#';
    
    const found = backtrack(row + 1, col, index + 1) ||
                  backtrack(row - 1, col, index + 1) ||
                  backtrack(row, col + 1, index + 1) ||
                  backtrack(row, col - 1, index + 1);
    
    board[row][col] = temp;
    return found;
  }
  
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (backtrack(i, j, 0)) return true;
    }
  }
  
  return false;
}
```

---

## 复杂度分析

**时间复杂度**：O(m × n × 3^L)
- m × n：起点数量
- 3^L：每步有3个方向（排除来时的方向），L是word长度
- 实际因为字符匹配限制，远小于理论值

**空间复杂度**：O(L)
- 递归栈深度等于word长度

---

## 执行过程可视化

寻找"ABCCED"：

```
初始棋盘：
A B C E
S F C S
A D E E

步骤1: (0,0)='A'匹配
访问: A* B C E
      S  F C S
      A  D E E

步骤2: (0,1)='B'匹配
访问: A* B* C E
      S  F  C S
      A  D  E E

步骤3: (0,2)='C'匹配
访问: A* B* C* E
      S  F  C  S
      A  D  E  E

步骤4: (1,2)='C'匹配（向下）
访问: A* B* C* E
      S  F  C* S
      A  D  E  E

步骤5: (2,2)='E'匹配（向下）
访问: A* B* C* E
      S  F  C* S
      A  D  E* E

步骤6: (2,1)='D'匹配（向左）
访问: A* B* C* E
      S  F  C* S
      A  D* E* E

✓ 找到 "ABCCED"
```

---

## 常见错误

**错误1：忘记恢复状态**
```typescript
// 错误
visited[row][col] = true;
backtrack(row + 1, col, index + 1);
// 忘记 visited[row][col] = false;  ❌

// 正确
visited[row][col] = true;
const result = backtrack(row + 1, col, index + 1);
visited[row][col] = false;  // ✅
return result;
```

**错误2：检查顺序错误**
```typescript
// 错误：先访问再检查字符，可能越界
visited[row][col] = true;  // ❌ row/col可能越界
if (board[row][col] !== word[index]) ...

// 正确：先检查边界和字符
if (row < 0 || row >= m || col < 0 || col >= n) return false;
if (board[row][col] !== word[index]) return false;
visited[row][col] = true;  // ✅
```

**错误3：使用||时忘记短路特性**
```typescript
// 正确利用短路
const found = backtrack(row + 1, col, index + 1) ||
              backtrack(row - 1, col, index + 1) ||  // 只有前面都false才执行
              backtrack(row, col + 1, index + 1) ||
              backtrack(row, col - 1, index + 1);
```

---

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [212. 单词搜索 II](https://leetcode.com/problems/word-search-ii/) | 困难 | 搜索多个单词，需要Trie优化 |
| [980. 不同路径 III](https://leetcode.com/problems/unique-paths-iii/) | 困难 | 必须经过所有可行格 |
| [490. 迷宫](https://leetcode.com/problems/the-maze/) | 中等 | 滚动直到碰壁 |

---

## 单词搜索I vs 单词搜索II

| 对比项 | 单词搜索I | 单词搜索II |
|-------|----------|-----------|
| 搜索目标 | 单个单词 | 多个单词 |
| 算法 | 纯回溯 | 回溯 + Trie |
| 优化策略 | 剪枝 | 共享前缀 |

---

## 总结

单词搜索的核心要点：

1. **路径问题模型**：起点→四方向移动→终点
2. **回溯三要素**：
   - 标记访问：防止重复使用
   - 尝试四方向：递归探索
   - 撤销标记：恢复现场
3. **优化技巧**：
   - 原地标记省空间
   - 字符频率预检查
   - 首尾翻转优化

本题是"路径搜索"类回溯问题的模板题，掌握后可以轻松处理迷宫、岛屿等变体。
```
