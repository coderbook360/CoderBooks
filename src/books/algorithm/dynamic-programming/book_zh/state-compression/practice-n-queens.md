# 实战：N 皇后问题

## 题目描述

按照国际象棋的规则，皇后可以攻击与之处在同一行或同一列或同一斜线上的棋子。

n 皇后问题研究的是如何将 n 个皇后放置在 n×n 的棋盘上，使得皇后彼此之间不能相互攻击。

给你一个整数 n，返回所有不同的 n 皇后问题的解决方案数量。

📎 [LeetCode 52. N 皇后 II](https://leetcode.cn/problems/n-queens-ii/)

**示例**：

```
输入：n = 4
输出：2

输入：n = 1
输出：1
```

## 方法一：回溯

标准的回溯解法，逐行放置皇后。

```typescript
function totalNQueens(n: number): number {
  let count = 0;
  
  // 记录哪些列、对角线已被占用
  const cols = new Set<number>();
  const diag1 = new Set<number>();  // row - col
  const diag2 = new Set<number>();  // row + col
  
  function backtrack(row: number): void {
    if (row === n) {
      count++;
      return;
    }
    
    for (let col = 0; col < n; col++) {
      if (cols.has(col)) continue;
      if (diag1.has(row - col)) continue;
      if (diag2.has(row + col)) continue;
      
      cols.add(col);
      diag1.add(row - col);
      diag2.add(row + col);
      
      backtrack(row + 1);
      
      cols.delete(col);
      diag1.delete(row - col);
      diag2.delete(row + col);
    }
  }
  
  backtrack(0);
  return count;
}
```

## 方法二：状态压缩回溯

用位运算替代 Set，大幅提升效率。

```typescript
/**
 * 状态压缩回溯
 * 时间复杂度：O(n!)
 * 空间复杂度：O(n)
 */
function totalNQueens(n: number): number {
  let count = 0;
  
  // cols: 被占用的列
  // diag1: 被占用的主对角线（左上到右下）
  // diag2: 被占用的副对角线（右上到左下）
  function backtrack(
    row: number,
    cols: number,
    diag1: number,
    diag2: number
  ): void {
    if (row === n) {
      count++;
      return;
    }
    
    // 可用位置：取反后与 (2^n - 1) 按位与
    let availablePositions = ((1 << n) - 1) & ~(cols | diag1 | diag2);
    
    while (availablePositions > 0) {
      // 取最低位的 1
      const position = availablePositions & (-availablePositions);
      availablePositions &= (availablePositions - 1);
      
      backtrack(
        row + 1,
        cols | position,
        (diag1 | position) << 1,
        (diag2 | position) >> 1
      );
    }
  }
  
  backtrack(0, 0, 0, 0);
  return count;
}
```

### 关键理解

**对角线的位移**：

当从第 row 行移到第 row+1 行时：
- 主对角线（左上→右下）的影响向右移一位（`<< 1`）
- 副对角线（右上→左下）的影响向左移一位（`>> 1`）

```
示例：在第 0 行第 2 列放置皇后

第 0 行：..Q..
         cols = 00100

第 1 行：
  cols 影响：00100（直接下方）
  diag1 影响：01000（左移，主对角线）
  diag2 影响：00010（右移，副对角线）
  
  占用：00100 | 01000 | 00010 = 01110
  可用：10001
```

## 方法三：纯状态压缩 DP（不实用）

理论上可以用 DP，但状态空间太大（需要记录每行的放置位置）。

对于 N 皇后，回溯更高效。

## 输出具体方案（LeetCode 51）

```typescript
function solveNQueens(n: number): string[][] {
  const result: string[][] = [];
  const queens: number[] = new Array(n).fill(-1);
  
  function backtrack(
    row: number,
    cols: number,
    diag1: number,
    diag2: number
  ): void {
    if (row === n) {
      const board = queens.map(col => {
        return '.'.repeat(col) + 'Q' + '.'.repeat(n - col - 1);
      });
      result.push(board);
      return;
    }
    
    let available = ((1 << n) - 1) & ~(cols | diag1 | diag2);
    
    while (available > 0) {
      const position = available & (-available);
      available &= (available - 1);
      
      const col = Math.log2(position);
      queens[row] = col;
      
      backtrack(
        row + 1,
        cols | position,
        (diag1 | position) << 1,
        (diag2 | position) >> 1
      );
      
      queens[row] = -1;
    }
  }
  
  backtrack(0, 0, 0, 0);
  return result;
}
```

## 示例演算

以 n = 4 为例：

```
状态压缩过程：

row 0: cols=0, diag1=0, diag2=0
  available = 1111
  
  尝试位置 0001 (col=0):
    row 1: cols=0001, diag1=0010, diag2=0000
    available = 1111 & ~(0001|0010|0000) = 1100
    
    尝试位置 0100 (col=2):
      row 2: cols=0101, diag1=1010, diag2=0010
      available = 1111 & ~(0101|1010|0010) = 0000
      无可用位置，回溯
    
    尝试位置 1000 (col=3):
      row 2: cols=1001, diag1=0010, diag2=0100
      available = 1111 & ~(1001|0010|0100) = 0000
      无可用位置，回溯
  
  尝试位置 0010 (col=1):
    row 1: cols=0010, diag1=0100, diag2=0001
    available = 1111 & ~(0010|0100|0001) = 1000
    
    尝试位置 1000 (col=3):
      row 2: cols=1010, diag1=0001, diag2=0100
      available = 1111 & ~(1010|0001|0100) = 0000
      无可用位置，回溯

  ... 继续尝试其他位置 ...

最终找到 2 个解：
  .Q..    ..Q.
  ...Q    Q...
  Q...    ...Q
  ..Q.    .Q..
```

## 复杂度分析

- **时间复杂度**：O(n!)，但位运算让常数因子很小
- **空间复杂度**：O(n)，只需要记录递归栈

## 本章小结

1. **位运算优化**：用整数代替 Set/数组
2. **对角线位移**：主对角线左移，副对角线右移
3. **lowbit 技巧**：`x & (-x)` 取最低位

**关键代码模式**：
```typescript
// 取所有可用位置
let available = FULL & ~(cols | diag1 | diag2);

while (available > 0) {
  // 取最低位
  const pos = available & (-available);
  available &= (available - 1);
  
  // 递归
  backtrack(
    row + 1,
    cols | pos,
    (diag1 | pos) << 1,
    (diag2 | pos) >> 1
  );
}
```

## 相关题目

- [51. N 皇后](https://leetcode.cn/problems/n-queens/)（输出具体方案）
- [37. 解数独](https://leetcode.cn/problems/sudoku-solver/)
