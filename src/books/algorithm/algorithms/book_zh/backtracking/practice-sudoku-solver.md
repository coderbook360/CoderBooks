# 实战：解数独

> LeetCode 37. 解数独 | 难度：困难

数独是经典的约束满足问题，体现回溯算法在"多约束"场景下的应用。

---

## 问题描述

编写一个程序，通过填充空格来解决数独问题。

**数独规则**：
1. 数字1-9在每一行只能出现一次
2. 数字1-9在每一列只能出现一次
3. 数字1-9在每一个3×3宫格只能出现一次

**示例**：
```
输入：
[["5","3",".",".","7",".",".",".","."],
 ["6",".",".","1","9","5",".",".","."],
 [".","9","8",".",".",".",".","6","."],
 ["8",".",".",".","6",".",".",".","3"],
 ["4",".",".","8",".","3",".",".","1"],
 ["7",".",".",".","2",".",".",".","6"],
 [".","6",".",".",".",".","2","8","."],
 [".",".",".","4","1","9",".",".","5"],
 [".",".",".",".","8",".",".","7","9"]]

输出：
[["5","3","4","6","7","8","9","1","2"],
 ["6","7","2","1","9","5","3","4","8"],
 ["1","9","8","3","4","2","5","6","7"],
 ["8","5","9","7","6","1","4","2","3"],
 ["4","2","6","8","5","3","7","9","1"],
 ["7","1","3","9","2","4","8","5","6"],
 ["9","6","1","5","3","7","2","8","4"],
 ["2","8","7","4","1","9","6","3","5"],
 ["3","4","5","2","8","6","1","7","9"]]
```

---

## 思路分析

### 问题建模

- **状态**：棋盘当前的填充情况
- **选择**：在空格处填入1-9
- **约束**：行、列、宫格都不能有重复
- **目标**：填满所有空格

### 与N皇后的对比

| 对比项 | N皇后 | 数独 |
|-------|-------|------|
| 棋盘大小 | n×n可变 | 固定9×9 |
| 放置元素 | 皇后（同类） | 数字1-9（多类） |
| 约束类型 | 行、列、对角线 | 行、列、3×3宫格 |
| 解的数量 | 可能有多解 | 标准数独唯一解 |

### 搜索策略

**逐格搜索**：按行优先顺序遍历每个格子
- 如果是数字，跳过
- 如果是空格，尝试1-9

---

## 解法一：基础回溯

```typescript
function solveSudoku(board: string[][]): void {
  backtrack(board);
}

function backtrack(board: string[][]): boolean {
  // 遍历每个格子
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      // 跳过已填数字
      if (board[row][col] !== '.') continue;
      
      // 尝试填入1-9
      for (let num = 1; num <= 9; num++) {
        const char = String(num);
        
        // 检查是否有效
        if (!isValid(board, row, col, char)) continue;
        
        // 做选择
        board[row][col] = char;
        
        // 递归：如果成功，直接返回
        if (backtrack(board)) return true;
        
        // 撤销选择
        board[row][col] = '.';
      }
      
      // 1-9都不行，说明之前的选择有误
      return false;
    }
  }
  
  // 所有格子都填完了
  return true;
}

function isValid(
  board: string[][],
  row: number,
  col: number,
  num: string
): boolean {
  for (let i = 0; i < 9; i++) {
    // 检查行
    if (board[row][i] === num) return false;
    
    // 检查列
    if (board[i][col] === num) return false;
    
    // 检查3×3宫格
    const boxRow = Math.floor(row / 3) * 3 + Math.floor(i / 3);
    const boxCol = Math.floor(col / 3) * 3 + (i % 3);
    if (board[boxRow][boxCol] === num) return false;
  }
  
  return true;
}
```

### 关键点：返回值的作用

```typescript
if (backtrack(board)) return true;  // 找到解就立即返回
// ...
return false;  // 所有选择都失败，回溯
```

数独只需要一个解，找到后立即返回，不需要遍历所有可能。

---

## 解法二：预处理优化

预先记录每行、每列、每个宫格已有的数字，避免重复遍历：

```typescript
function solveSudoku(board: string[][]): void {
  // 预处理：记录已有数字
  const rows = Array.from({ length: 9 }, () => new Set<string>());
  const cols = Array.from({ length: 9 }, () => new Set<string>());
  const boxes = Array.from({ length: 9 }, () => new Set<string>());
  
  // 收集空格位置
  const blanks: [number, number][] = [];
  
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      if (board[i][j] === '.') {
        blanks.push([i, j]);
      } else {
        const num = board[i][j];
        const boxIdx = Math.floor(i / 3) * 3 + Math.floor(j / 3);
        rows[i].add(num);
        cols[j].add(num);
        boxes[boxIdx].add(num);
      }
    }
  }
  
  function backtrack(idx: number): boolean {
    // 所有空格都填完了
    if (idx === blanks.length) return true;
    
    const [row, col] = blanks[idx];
    const boxIdx = Math.floor(row / 3) * 3 + Math.floor(col / 3);
    
    for (let num = 1; num <= 9; num++) {
      const char = String(num);
      
      // O(1)检查冲突
      if (rows[row].has(char) || cols[col].has(char) || boxes[boxIdx].has(char)) {
        continue;
      }
      
      // 做选择
      board[row][col] = char;
      rows[row].add(char);
      cols[col].add(char);
      boxes[boxIdx].add(char);
      
      // 递归
      if (backtrack(idx + 1)) return true;
      
      // 撤销
      board[row][col] = '.';
      rows[row].delete(char);
      cols[col].delete(char);
      boxes[boxIdx].delete(char);
    }
    
    return false;
  }
  
  backtrack(0);
}
```

---

## 解法三：位运算极致优化

使用位掩码记录每行、每列、每宫格的可用数字：

```typescript
function solveSudoku(board: string[][]): void {
  const rows = new Array(9).fill((1 << 9) - 1);  // 初始所有数字可用
  const cols = new Array(9).fill((1 << 9) - 1);
  const boxes = new Array(9).fill((1 << 9) - 1);
  const blanks: [number, number][] = [];
  
  // 预处理
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      if (board[i][j] === '.') {
        blanks.push([i, j]);
      } else {
        const bit = 1 << (board[i][j].charCodeAt(0) - '1'.charCodeAt(0));
        const boxIdx = Math.floor(i / 3) * 3 + Math.floor(j / 3);
        rows[i] &= ~bit;  // 标记为不可用
        cols[j] &= ~bit;
        boxes[boxIdx] &= ~bit;
      }
    }
  }
  
  function backtrack(idx: number): boolean {
    if (idx === blanks.length) return true;
    
    const [row, col] = blanks[idx];
    const boxIdx = Math.floor(row / 3) * 3 + Math.floor(col / 3);
    
    // 可用数字 = 行、列、宫格都可用的数字
    let available = rows[row] & cols[col] & boxes[boxIdx];
    
    while (available !== 0) {
      // 取最低位的1
      const bit = available & -available;
      available &= available - 1;
      
      const num = String.fromCharCode('1'.charCodeAt(0) + Math.log2(bit));
      
      // 做选择
      board[row][col] = num;
      rows[row] &= ~bit;
      cols[col] &= ~bit;
      boxes[boxIdx] &= ~bit;
      
      if (backtrack(idx + 1)) return true;
      
      // 撤销
      board[row][col] = '.';
      rows[row] |= bit;
      cols[col] |= bit;
      boxes[boxIdx] |= bit;
    }
    
    return false;
  }
  
  backtrack(0);
}
```

---

## 宫格索引计算

3×3宫格的索引计算是数独问题的关键：

```
宫格编号：
+-----+-----+-----+
|  0  |  1  |  2  |
+-----+-----+-----+
|  3  |  4  |  5  |
+-----+-----+-----+
|  6  |  7  |  8  |
+-----+-----+-----+

公式：boxIdx = Math.floor(row / 3) * 3 + Math.floor(col / 3)

例：(row=4, col=7)
boxIdx = 1 * 3 + 2 = 5（中间偏右的宫格）
```

---

## 复杂度分析

**时间复杂度**：O(9^m)
- m是空格数量
- 每个空格最多尝试9个数字
- 实际因为约束剪枝，远小于理论值

**空间复杂度**：
- 基础版：O(1)（原地修改，递归栈最多81层）
- 优化版：O(81)预处理存储

---

## 常见错误

**错误1：忘记返回值**
```typescript
// 错误：只有一个解也会继续搜索
backtrack(board);  // ❌ 没有利用返回值

// 正确
if (backtrack(board)) return true;  // ✅
```

**错误2：宫格索引计算错误**
```typescript
// 错误：行列搞反或除法取整错误
const boxIdx = row * 3 + col;  // ❌

// 正确
const boxIdx = Math.floor(row / 3) * 3 + Math.floor(col / 3);  // ✅
```

**错误3：遍历顺序问题**
```typescript
// 正确的遍历：遇到第一个空格就处理
for (let row = 0; row < 9; row++) {
  for (let col = 0; col < 9; col++) {
    if (board[row][col] !== '.') continue;
    // 处理这个空格...
    return false;  // 处理完毕后返回，不继续遍历
  }
}
return true;  // 没有空格了，成功
```

---

## 进阶优化：选择最少可能的格子

```typescript
// 启发式：优先填可选数字最少的格子
function findBestBlank(blanks, rows, cols, boxes) {
  let minCount = 10;
  let bestIdx = 0;
  
  for (let i = 0; i < blanks.length; i++) {
    const [row, col] = blanks[i];
    const boxIdx = Math.floor(row / 3) * 3 + Math.floor(col / 3);
    const available = rows[row] & cols[col] & boxes[boxIdx];
    const count = countBits(available);
    
    if (count < minCount) {
      minCount = count;
      bestIdx = i;
    }
  }
  
  return bestIdx;
}
```

---

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [36. 有效的数独](https://leetcode.com/problems/valid-sudoku/) | 中等 | 只验证不求解 |
| [51. N皇后](https://leetcode.com/problems/n-queens/) | 困难 | 类似的约束满足 |

---

## 总结

解数独的核心要点：

1. **三重约束**：行、列、3×3宫格
2. **宫格索引**：`floor(row/3)*3 + floor(col/3)`
3. **回溯策略**：逐格尝试1-9，无解时回溯
4. **优化层次**：
   - 基础：每次遍历检查
   - 中级：预处理Set/数组
   - 高级：位运算
   - 极致：选择最少可能的格子优先填

数独是"约束满足问题"（CSP）的经典案例，解法思路可推广到调度、规划等领域。
```
