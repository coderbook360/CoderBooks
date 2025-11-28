# 实战：有效的数独

这道题来自 LeetCode 第 36 题，考察二维数组的遍历和哈希表的使用。

## 题目描述

请你判断一个 9 x 9 的数独是否有效。只需要根据以下规则，验证已经填入的数字是否有效即可。

1. 数字 1-9 在每一行只能出现一次
2. 数字 1-9 在每一列只能出现一次
3. 数字 1-9 在每一个 3x3 宫格内只能出现一次

**注意**：
- 一个有效的数独（部分已填）不一定是可解的
- 只需要根据以上规则，验证已填入的数字是否有效

空白格用 `'.'` 表示。

**示例**：

```
输入：
[["5","3",".",".","7",".",".",".","."]
,["6",".",".","1","9","5",".",".","."]
,[".","9","8",".",".",".",".","6","."]
,["8",".",".",".","6",".",".",".","3"]
,["4",".",".","8",".","3",".",".","1"]
,["7",".",".",".","2",".",".",".","6"]
,[".","6",".",".",".",".","2","8","."]
,[".",".",".","4","1","9",".",".","5"]
,[".",".",".",".","8",".",".","7","9"]]
输出：true
```

## 分析思路

我们需要检查三种约束：
1. 每行不能有重复数字
2. 每列不能有重复数字
3. 每个 3×3 宫格不能有重复数字

关键问题是：如何确定一个格子属于哪个 3×3 宫格？

对于位置 (i, j)，它属于第 `Math.floor(i / 3) * 3 + Math.floor(j / 3)` 个宫格。

宫格编号如下（0-8）：

```
0 0 0 | 1 1 1 | 2 2 2
0 0 0 | 1 1 1 | 2 2 2
0 0 0 | 1 1 1 | 2 2 2
------+-------+------
3 3 3 | 4 4 4 | 5 5 5
3 3 3 | 4 4 4 | 5 5 5
3 3 3 | 4 4 4 | 5 5 5
------+-------+------
6 6 6 | 7 7 7 | 8 8 8
6 6 6 | 7 7 7 | 8 8 8
6 6 6 | 7 7 7 | 8 8 8
```

## 实现代码

```javascript
function isValidSudoku(board) {
    // 记录每行、每列、每个宫格出现过的数字
    const rows = Array.from({ length: 9 }, () => new Set());
    const cols = Array.from({ length: 9 }, () => new Set());
    const boxes = Array.from({ length: 9 }, () => new Set());
    
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            const num = board[i][j];
            
            // 跳过空格
            if (num === '.') continue;
            
            // 计算宫格索引
            const boxIndex = Math.floor(i / 3) * 3 + Math.floor(j / 3);
            
            // 检查是否已存在
            if (rows[i].has(num) || cols[j].has(num) || boxes[boxIndex].has(num)) {
                return false;
            }
            
            // 记录当前数字
            rows[i].add(num);
            cols[j].add(num);
            boxes[boxIndex].add(num);
        }
    }
    
    return true;
}
```

## 图解执行过程

以一个简单的例子说明：

```
5 3 .
6 . .
. 9 8
```

遍历过程：

```
(0,0) = '5':
  rows[0] = {5}, cols[0] = {5}, boxes[0] = {5}

(0,1) = '3':
  rows[0] = {5,3}, cols[1] = {3}, boxes[0] = {5,3}

(0,2) = '.': 跳过

(1,0) = '6':
  rows[1] = {6}, cols[0] = {5,6}, boxes[0] = {5,3,6}

...以此类推
```

如果在某处发现重复（Set 中已存在），立即返回 false。

## 使用二维数组代替 Set

也可以用数组代替 Set，利用数字 1-9 的特性：

```javascript
function isValidSudoku(board) {
    // 用二维数组记录
    const rows = Array.from({ length: 9 }, () => Array(10).fill(false));
    const cols = Array.from({ length: 9 }, () => Array(10).fill(false));
    const boxes = Array.from({ length: 9 }, () => Array(10).fill(false));
    
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            if (board[i][j] === '.') continue;
            
            const num = parseInt(board[i][j]);
            const boxIndex = Math.floor(i / 3) * 3 + Math.floor(j / 3);
            
            if (rows[i][num] || cols[j][num] || boxes[boxIndex][num]) {
                return false;
            }
            
            rows[i][num] = true;
            cols[j][num] = true;
            boxes[boxIndex][num] = true;
        }
    }
    
    return true;
}
```

## 复杂度分析

**时间复杂度**：O(1)
- 虽然是两层循环，但棋盘大小固定是 9×9 = 81 格
- 可以认为是常数时间

**空间复杂度**：O(1)
- 同样，存储空间也是固定的（3 个 9×10 的数组或 27 个 Set）

## 边界情况

1. **全空棋盘**：有效
2. **行有重复**：无效
3. **列有重复**：无效
4. **宫格有重复**：无效
5. **不同行/列/宫格的重复**：有效（允许）

## 小结

这道题的核心是：
1. 理解数独的三条规则
2. 计算 3×3 宫格的索引：`Math.floor(i / 3) * 3 + Math.floor(j / 3)`
3. 用哈希表（Set 或数组）检测重复

这种"多维度约束检查"的模式在很多问题中都会出现。

这一部分的基础题就介绍到这里。下一部分，我们将学习数组的基础操作。
