# 实战：有效的数独

这道题需要用哈希表进行**多维度约束检查**。

## 题目描述

> **LeetCode 36. 有效的数独**
>
> 判断一个 9×9 的数独是否有效。只需验证**已经填入的数字**是否有效。

**规则**：
1. 数字 1-9 在**每一行**只能出现一次
2. 数字 1-9 在**每一列**只能出现一次
3. 数字 1-9 在**每一个 3×3 宫格**只能出现一次

注意：只验证当前状态，不需要判断数独是否可解。

## 问题分析

我们需要同时检查三个约束：
- 每行不重复
- 每列不重复
- 每个 3×3 宫格不重复

**关键问题**：如何确定一个格子 (row, col) 属于哪个 3×3 宫格？

```
宫格索引计算：
boxIndex = Math.floor(row / 3) * 3 + Math.floor(col / 3)

9 个宫格的编号：
0 | 1 | 2
---------
3 | 4 | 5
---------
6 | 7 | 8
```

比如：
- (4, 5) → floor(4/3) × 3 + floor(5/3) = 1 × 3 + 1 = 4
- (7, 8) → floor(7/3) × 3 + floor(8/3) = 2 × 3 + 2 = 8

## 解法：三组哈希集合

为行、列、宫格各创建 9 个 Set，记录出现过的数字。

```javascript
function isValidSudoku(board) {
    // 9 行、9 列、9 个宫格，各自用一个 Set
    const rows = Array.from({ length: 9 }, () => new Set());
    const cols = Array.from({ length: 9 }, () => new Set());
    const boxes = Array.from({ length: 9 }, () => new Set());
    
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            const num = board[row][col];
            
            if (num === '.') continue;  // 跳过空格
            
            // 计算宫格索引
            const boxIndex = Math.floor(row / 3) * 3 + Math.floor(col / 3);
            
            // 检查三个约束
            if (rows[row].has(num) || 
                cols[col].has(num) || 
                boxes[boxIndex].has(num)) {
                return false;
            }
            
            // 记录当前数字
            rows[row].add(num);
            cols[col].add(num);
            boxes[boxIndex].add(num);
        }
    }
    
    return true;
}
```

### 执行过程示例

假设第一行是 `["5","3",".",".","7",".",".",".","."]`：

```
(0,0) num="5": 
  boxIndex = 0
  rows[0].has("5")? No
  cols[0].has("5")? No
  boxes[0].has("5")? No
  添加到三个 Set

(0,1) num="3":
  boxIndex = 0
  rows[0].has("3")? No
  cols[1].has("3")? No
  boxes[0].has("3")? No
  添加到三个 Set

(0,4) num="7":
  boxIndex = 0*3 + floor(4/3) = 1
  rows[0].has("7")? No
  cols[4].has("7")? No
  boxes[1].has("7")? No
  添加到三个 Set
```

如果某行出现两个相同数字，`rows[row].has(num)` 会返回 true，直接返回 false。

## 复杂度分析

- **时间**：O(1)，固定遍历 81 个格子
- **空间**：O(1)，固定 27 个 Set，每个最多 9 个元素

虽然理论上是常数，但准确地说是 O(n²)，n=9。

## 位运算优化（进阶）

可以用整数的位代替 Set，更节省空间：

```javascript
function isValidSudoku(board) {
    const rows = new Array(9).fill(0);
    const cols = new Array(9).fill(0);
    const boxes = new Array(9).fill(0);
    
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            const char = board[row][col];
            if (char === '.') continue;
            
            const num = parseInt(char);
            const bit = 1 << num;  // 用第 num 位表示
            const boxIndex = Math.floor(row / 3) * 3 + Math.floor(col / 3);
            
            // 检查对应位是否已为 1
            if ((rows[row] & bit) || 
                (cols[col] & bit) || 
                (boxes[boxIndex] & bit)) {
                return false;
            }
            
            // 设置对应位为 1
            rows[row] |= bit;
            cols[col] |= bit;
            boxes[boxIndex] |= bit;
        }
    }
    
    return true;
}
```

用一个整数的位来记录哪些数字出现过：
- 数字 5 出现 → 第 5 位设为 1 → `num |= (1 << 5)`
- 检查数字 5 是否出现 → `num & (1 << 5)` 是否非零

## 本章小结

有效的数独展示了哈希表进行多维度约束检查：

1. **三组 Set**：分别记录行、列、宫格中出现的数字
2. **宫格索引**：`floor(row/3)*3 + floor(col/3)`
3. **一次遍历**：同时检查三个约束
4. **位运算优化**：用整数位代替 Set

这是哈希表在**状态记录**方面的典型应用，当需要快速判断"某个状态是否出现过"时，哈希表是首选数据结构。
