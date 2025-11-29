# 实战：解数独

另一道经典的约束满足问题。

## 问题描述

编写程序解决一个数独问题，空白格用`'.'`表示。

数独的规则：
- 每行1-9各出现一次
- 每列1-9各出现一次
- 每个3×3宫格1-9各出现一次

## 思路

遍历每个空格，尝试填入1-9。

如果某个空格无法填入任何数字，回溯。

## 解法

```javascript
function solveSudoku(board) {
    // 记录每行、每列、每个宫格已有的数字
    const rows = Array.from({length: 9}, () => new Set());
    const cols = Array.from({length: 9}, () => new Set());
    const boxes = Array.from({length: 9}, () => new Set());
    
    // 初始化已有数字
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            if (board[i][j] !== '.') {
                const num = board[i][j];
                rows[i].add(num);
                cols[j].add(num);
                boxes[getBoxIndex(i, j)].add(num);
            }
        }
    }
    
    backtrack(board, 0, 0);
    
    function backtrack(board, row, col) {
        // 找下一个空格
        while (row < 9 && board[row][col] !== '.') {
            col++;
            if (col === 9) {
                col = 0;
                row++;
            }
        }
        
        // 所有格子都填完了
        if (row === 9) return true;
        
        const boxIdx = getBoxIndex(row, col);
        
        // 尝试1-9
        for (let num = 1; num <= 9; num++) {
            const ch = String(num);
            
            // 检查是否可以填
            if (rows[row].has(ch)) continue;
            if (cols[col].has(ch)) continue;
            if (boxes[boxIdx].has(ch)) continue;
            
            // 填入
            board[row][col] = ch;
            rows[row].add(ch);
            cols[col].add(ch);
            boxes[boxIdx].add(ch);
            
            // 递归
            if (backtrack(board, row, col)) return true;
            
            // 撤销
            board[row][col] = '.';
            rows[row].delete(ch);
            cols[col].delete(ch);
            boxes[boxIdx].delete(ch);
        }
        
        return false;
    }
    
    function getBoxIndex(row, col) {
        return Math.floor(row / 3) * 3 + Math.floor(col / 3);
    }
}
```

## 宫格索引计算

9个3×3宫格编号0-8：

```
0 1 2
3 4 5
6 7 8
```

坐标(row, col)对应的宫格：`Math.floor(row/3) * 3 + Math.floor(col/3)`

## 优化：选择约束最多的格子

优先填选择最少的格子，可以更早剪枝：

```javascript
function solveSudoku(board) {
    const rows = Array.from({length: 9}, () => new Set());
    const cols = Array.from({length: 9}, () => new Set());
    const boxes = Array.from({length: 9}, () => new Set());
    const empty = [];
    
    // 初始化
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            if (board[i][j] !== '.') {
                const num = board[i][j];
                rows[i].add(num);
                cols[j].add(num);
                boxes[getBoxIndex(i, j)].add(num);
            } else {
                empty.push([i, j]);
            }
        }
    }
    
    backtrack(0);
    
    function backtrack(idx) {
        if (idx === empty.length) return true;
        
        const [row, col] = empty[idx];
        const boxIdx = getBoxIndex(row, col);
        
        for (let num = 1; num <= 9; num++) {
            const ch = String(num);
            if (rows[row].has(ch)) continue;
            if (cols[col].has(ch)) continue;
            if (boxes[boxIdx].has(ch)) continue;
            
            board[row][col] = ch;
            rows[row].add(ch);
            cols[col].add(ch);
            boxes[boxIdx].add(ch);
            
            if (backtrack(idx + 1)) return true;
            
            board[row][col] = '.';
            rows[row].delete(ch);
            cols[col].delete(ch);
            boxes[boxIdx].delete(ch);
        }
        
        return false;
    }
    
    function getBoxIndex(row, col) {
        return Math.floor(row / 3) * 3 + Math.floor(col / 3);
    }
}
```

## 与N皇后的对比

| 特性 | N皇后 | 数独 |
|-----|-------|------|
| 决策单位 | 一行 | 一格 |
| 约束 | 3种(列、对角线) | 3种(行、列、宫) |
| 解的数量 | 多个 | 唯一 |
| 终止条件 | 放完n个 | 填完所有格 |

## 复杂度分析

- **时间复杂度**：O(9^m)，m是空格数
  - 最坏情况每个空格尝试9次
  - 实际由于约束会少很多
  
- **空间复杂度**：O(81)
  - 存储行、列、宫格状态

## 小结

解数独展示了回溯解决约束满足问题的模式：
- 用集合快速判断约束
- 尝试、递归、撤销
- 提前返回true表示找到解

这种模式可以应用到很多约束满足问题。
