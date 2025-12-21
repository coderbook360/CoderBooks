# 实战：N 皇后

> LeetCode 51. N 皇后 | 难度：困难

棋盘问题的经典：在n×n棋盘上放置n个皇后，使其互不攻击。这道题完美展示了回溯算法在约束满足问题中的应用。

---

## 问题描述

n皇后问题研究的是如何将n个皇后放置在n×n的棋盘上，并且使皇后彼此之间不能相互攻击。

**皇后的攻击规则**：
- 同一行的任意位置
- 同一列的任意位置
- 同一对角线的任意位置

**示例**：
```
输入：n = 4
输出：[
  [".Q..",
   "...Q",
   "Q...",
   "..Q."],

  ["..Q.",
   "Q...",
   "...Q",
   ".Q.."]
]

输入：n = 1
输出：[["Q"]]
```

---

## 思路分析

### 问题建模

- **状态**：棋盘上已放置的皇后位置
- **选择**：在当前行的某一列放置皇后
- **约束**：新放置的皇后不能与已有皇后冲突
- **目标**：放置n个皇后

### 决策树模型（n=4）

```
第0行：尝试每一列
├─ 列0：放置Q
│  └─ 第1行：列0冲突，列1对角线冲突，尝试列2
│     ├─ 列2：放置Q
│     │  └─ 第2行：...
│     └─ 列3：放置Q
│        └─ 第2行：列0可以
│           └─ 第3行：列2可以 ✓
├─ 列1：放置Q
│  └─ 第1行：列0对角线冲突，列1冲突，尝试列3
│     └─ 列3：放置Q
│        └─ 第2行：列0可以
│           └─ 第3行：列2可以 ✓
└─ ...
```

### 冲突检测

- **列冲突**：两皇后在同一列 → `col1 === col2`
- **主对角线冲突**：左上到右下 → `row - col`相同
- **副对角线冲突**：右上到左下 → `row + col`相同

---

## 解法一：基础回溯

```typescript
function solveNQueens(n: number): string[][] {
  const result: string[][] = [];
  const board: string[] = Array(n).fill('.'.repeat(n));
  
  // 记录已占用的列和对角线
  const cols = new Set<number>();      // 列
  const diag1 = new Set<number>();     // 主对角线（row - col）
  const diag2 = new Set<number>();     // 副对角线（row + col）
  
  function backtrack(row: number) {
    // 终止条件：所有行都放置了皇后
    if (row === n) {
      result.push([...board]);
      return;
    }
    
    // 尝试在当前行的每一列放置皇后
    for (let col = 0; col < n; col++) {
      const d1 = row - col;  // 主对角线标识
      const d2 = row + col;  // 副对角线标识
      
      // 检查冲突
      if (cols.has(col) || diag1.has(d1) || diag2.has(d2)) {
        continue;  // 冲突，跳过
      }
      
      // 放置皇后
      board[row] = '.'.repeat(col) + 'Q' + '.'.repeat(n - col - 1);
      cols.add(col);
      diag1.add(d1);
      diag2.add(d2);
      
      // 递归处理下一行
      backtrack(row + 1);
      
      // 撤销皇后
      board[row] = '.'.repeat(n);
      cols.delete(col);
      diag1.delete(d1);
      diag2.delete(d2);
    }
  }
  
  backtrack(0);
  return result;
}
```

---

## 对角线冲突检测原理

### 主对角线（左上 → 右下）

同一主对角线上的所有格子，`row - col`的值相同。

```
    col: 0   1   2   3
row:
 0      [0] [-1] [-2] [-3]    ← row - col
 1      [1] [0] [-1] [-2]
 2      [2] [1] [0] [-1]
 3      [3] [2] [1] [0]
```

### 副对角线（右上 → 左下）

同一副对角线上的所有格子，`row + col`的值相同。

```
    col: 0   1   2   3
row:
 0      [0] [1] [2] [3]    ← row + col
 1      [1] [2] [3] [4]
 2      [2] [3] [4] [5]
 3      [3] [4] [5] [6]
```

---

## 解法二：使用数组优化

用数组替代Set，常数因子更小：

```typescript
function solveNQueens(n: number): string[][] {
  const result: string[][] = [];
  const queens: number[] = [];  // queens[row] = col
  
  const colUsed = new Array(n).fill(false);
  const diag1Used = new Array(2 * n - 1).fill(false);  // row - col + n - 1
  const diag2Used = new Array(2 * n - 1).fill(false);  // row + col
  
  function backtrack(row: number) {
    if (row === n) {
      result.push(buildBoard(queens, n));
      return;
    }
    
    for (let col = 0; col < n; col++) {
      const d1 = row - col + n - 1;  // 偏移，确保非负
      const d2 = row + col;
      
      if (colUsed[col] || diag1Used[d1] || diag2Used[d2]) {
        continue;
      }
      
      queens.push(col);
      colUsed[col] = diag1Used[d1] = diag2Used[d2] = true;
      
      backtrack(row + 1);
      
      queens.pop();
      colUsed[col] = diag1Used[d1] = diag2Used[d2] = false;
    }
  }
  
  backtrack(0);
  return result;
}

function buildBoard(queens: number[], n: number): string[] {
  return queens.map(col => 
    '.'.repeat(col) + 'Q' + '.'.repeat(n - col - 1)
  );
}
```

---

## 解法三：位运算优化

对于N较大的情况，位运算可以显著提升性能：

```typescript
function solveNQueens(n: number): string[][] {
  const result: string[][] = [];
  const queens: number[] = [];
  
  function backtrack(row: number, cols: number, diag1: number, diag2: number) {
    if (row === n) {
      result.push(buildBoard(queens, n));
      return;
    }
    
    // 可用位置：不在列、主对角线、副对角线的位置
    let availablePositions = ((1 << n) - 1) & ~(cols | diag1 | diag2);
    
    while (availablePositions !== 0) {
      // 取最低位的1（一个可用位置）
      const position = availablePositions & -availablePositions;
      availablePositions &= availablePositions - 1;  // 移除这个位置
      
      const col = Math.log2(position);
      queens.push(col);
      
      backtrack(
        row + 1,
        cols | position,
        (diag1 | position) << 1,
        (diag2 | position) >> 1
      );
      
      queens.pop();
    }
  }
  
  backtrack(0, 0, 0, 0);
  return result;
}

function buildBoard(queens: number[], n: number): string[] {
  return queens.map(col => 
    '.'.repeat(col) + 'Q' + '.'.repeat(n - col - 1)
  );
}
```

---

## 复杂度分析

**时间复杂度**：O(n!)
- 第一行有n个选择
- 第二行最多n-1个选择（排除冲突）
- 以此类推
- 实际由于对角线约束，远小于n!

**空间复杂度**：O(n)
- 递归栈深度为n
- 存储冲突状态需要O(n)空间

**N皇后解的数量**：

| n | 解的数量 |
|---|---------|
| 1 | 1 |
| 4 | 2 |
| 8 | 92 |
| 12 | 14,200 |

---

## 执行过程可视化

以`n = 4`为例：

```
第0行：
├─ col=0: 放Q
│  第1行：col=0冲突，col=1对角线冲突
│  ├─ col=2: 放Q
│  │  第2行：col=0对角线冲突，col=1冲突，col=2冲突，col=3对角线冲突
│  │  └─ 无解，回溯
│  └─ col=3: 放Q
│     第2行：
│     ├─ col=1: 放Q
│     │  第3行：col=0冲突，col=1冲突，col=2对角线冲突，col=3冲突
│     │  └─ 无解，回溯
│     └─ col=0: 放Q（跳过col=1对角线冲突）
│        第3行：col=2可以 ✓
│        └─ 找到解：[".Q..", "...Q", "Q...", "..Q."]
│
├─ col=1: 放Q
│  第1行：col=0对角线冲突，col=1冲突，col=2对角线冲突
│  └─ col=3: 放Q
│     第2行：
│     └─ col=0: 放Q
│        第3行：col=2可以 ✓
│        └─ 找到解：["..Q.", "Q...", "...Q", ".Q.."]
│
└─ ...（col=2, col=3由对称性可推导）

结果：2个解
```

---

## 常见错误

**错误1：对角线标识计算错误**
```typescript
// 错误：使用绝对值会混淆不同对角线
const d1 = Math.abs(row - col);  // ❌

// 正确
const d1 = row - col;  // ✅ 或 row - col + n - 1 确保非负
```

**错误2：忘记撤销状态**
```typescript
// 错误：只撤销了部分状态
cols.delete(col);
// 忘记 diag1.delete(d1); diag2.delete(d2);  ❌

// 正确：撤销所有状态
cols.delete(col);
diag1.delete(d1);
diag2.delete(d2);  // ✅
```

**错误3：结果引用问题**
```typescript
// 错误：直接push引用
result.push(board);  // ❌ 后续修改会影响结果

// 正确：拷贝
result.push([...board]);  // ✅
```

---

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [52. N皇后 II](https://leetcode.com/problems/n-queens-ii/) | 困难 | 只求数量 |
| [37. 解数独](https://leetcode.com/problems/sudoku-solver/) | 困难 | 类似的约束满足 |
| [79. 单词搜索](https://leetcode.com/problems/word-search/) | 中等 | 棋盘路径 |

---

## N皇后 vs N皇后II

| 题目 | 返回值 | 优化空间 |
|-----|--------|---------|
| **51. N皇后** | 所有解的具体摆放 | 需要存储棋盘 |
| **52. N皇后II** | 解的数量 | 只需计数，可用位运算极致优化 |

---

## 总结

N皇后问题的核心要点：

1. **逐行放置**：每行只放一个皇后，自然避免行冲突
2. **三类冲突**：列、主对角线、副对角线
3. **对角线标识**：主对角线用`row-col`，副对角线用`row+col`
4. **优化层次**：
   - 基础：Set存储
   - 中级：数组存储
   - 高级：位运算

N皇后是回溯算法在"约束满足问题"中的典型应用，展示了如何通过状态维护高效剪枝。
