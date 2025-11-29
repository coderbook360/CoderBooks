# 实战：N皇后

回溯算法的经典难题。

## 问题描述

在n×n的棋盘上放置n个皇后，使得它们不能互相攻击。

皇后可以攻击同一行、同一列、同一对角线上的棋子。

返回所有不同的解法。

## 思路

逐行放置皇后，每行放一个。

对于每一行，尝试每一列，检查是否与已放置的皇后冲突。

## 冲突检测

皇后(row, col)与已有皇后冲突的条件：
- 同一列：`col === existingCol`
- 主对角线：`row - col === existingRow - existingCol`
- 副对角线：`row + col === existingRow + existingCol`

## 解法

```javascript
function solveNQueens(n) {
    const result = [];
    const cols = new Set();      // 被占用的列
    const diag1 = new Set();     // 被占用的主对角线(row-col)
    const diag2 = new Set();     // 被占用的副对角线(row+col)
    const board = Array.from({length: n}, () => Array(n).fill('.'));
    
    function backtrack(row) {
        if (row === n) {
            // 找到一个解，转换为字符串形式
            result.push(board.map(r => r.join('')));
            return;
        }
        
        for (let col = 0; col < n; col++) {
            // 检查是否冲突
            if (cols.has(col)) continue;
            if (diag1.has(row - col)) continue;
            if (diag2.has(row + col)) continue;
            
            // 放置皇后
            cols.add(col);
            diag1.add(row - col);
            diag2.add(row + col);
            board[row][col] = 'Q';
            
            // 递归下一行
            backtrack(row + 1);
            
            // 撤销
            cols.delete(col);
            diag1.delete(row - col);
            diag2.delete(row + col);
            board[row][col] = '.';
        }
    }
    
    backtrack(0);
    return result;
}
```

## 对角线的理解

主对角线：从左上到右下，同一对角线上`row - col`相同。

```
(0,0) (0,1) (0,2)
(1,0) (1,1) (1,2)
(2,0) (2,1) (2,2)

row-col:
 0    -1    -2
 1     0    -1
 2     1     0
```

副对角线：从右上到左下，同一对角线上`row + col`相同。

```
row+col:
 0     1     2
 1     2     3
 2     3     4
```

## 为什么用Set

用Set记录占用状态，O(1)判断冲突。

如果用数组检查，每次需要O(n)遍历已放置的皇后。

## 搜索过程（n=4）

```
row=0: 尝试col=0
  row=1: col=0冲突,col=1冲突,尝试col=2
    row=2: 全部冲突,回溯
  row=1: 尝试col=3
    row=2: 尝试col=1
      row=3: 全部冲突,回溯
    回溯...
回溯，尝试col=1
  row=1: 尝试col=3
    row=2: 尝试col=0
      row=3: 尝试col=2 ✓
```

找到解：
```
.Q..
...Q
Q...
..Q.
```

## 复杂度分析

- **时间复杂度**：O(n!)
  - 第一行n种选择，第二行最多n-1种...
  - 实际由于剪枝会更少
  
- **空间复杂度**：O(n)
  - 递归深度n
  - Set最多存n个元素

## 输出格式

题目要求返回字符串形式的棋盘：

```javascript
result.push(board.map(r => r.join('')));
// 输出如：[".Q..","...Q","Q...","..Q."]
```

## 小结

N皇后展示了回溯的完整流程：
- 逐行决策，减少搜索空间
- 用Set实现O(1)冲突检测
- 做选择、递归、撤销选择

这是回溯算法的经典应用，理解它有助于解决其他约束满足问题。
