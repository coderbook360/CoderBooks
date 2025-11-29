# 实战：N皇后II

只需要返回解的数量，可以简化代码。

## 问题描述

返回n皇后问题的解的数量。

示例：
- 输入：`n = 4`
- 输出：`2`

## 与N皇后I的区别

N皇后I需要返回所有具体解，N皇后II只需要计数。

不需要维护board和生成字符串，更简洁。

## 解法

```javascript
function totalNQueens(n) {
    let count = 0;
    const cols = new Set();
    const diag1 = new Set();
    const diag2 = new Set();
    
    function backtrack(row) {
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

## 位运算优化

用位运算代替Set，更高效：

```javascript
function totalNQueens(n) {
    let count = 0;
    
    function backtrack(row, cols, diag1, diag2) {
        if (row === n) {
            count++;
            return;
        }
        
        // 可用位置：取反后的有效位
        let available = ((1 << n) - 1) & ~(cols | diag1 | diag2);
        
        while (available) {
            // 取最低位的1
            const pos = available & (-available);
            available &= (available - 1);
            
            backtrack(
                row + 1,
                cols | pos,
                (diag1 | pos) << 1,
                (diag2 | pos) >> 1
            );
        }
    }
    
    backtrack(0, 0, 0, 0);
    return count;
}
```

## 位运算解释

- `cols`：被占用的列，第i位为1表示第i列被占用
- `diag1`：主对角线的影响，每层左移
- `diag2`：副对角线的影响，每层右移
- `available`：可放置的位置
- `pos & (-pos)`：取最低位的1

## 为什么对角线要移位

主对角线：皇后在(row, col)，影响(row+1, col+1)。
从当前行看，col要+1，等价于掩码左移。

副对角线：皇后在(row, col)，影响(row+1, col-1)。
col要-1，等价于掩码右移。

## N皇后解的数量

| n | 解的数量 |
|---|---------|
| 1 | 1 |
| 2 | 0 |
| 3 | 0 |
| 4 | 2 |
| 5 | 10 |
| 6 | 4 |
| 7 | 40 |
| 8 | 92 |

## 复杂度分析

- **时间复杂度**：O(n!)，与N皇后I相同
- **空间复杂度**：O(n)，递归深度

位运算版本常数更小，实际运行更快。

## 小结

N皇后II展示了：
- 只需计数时可以简化代码
- 位运算可以优化集合操作

位运算版本是竞赛中常用的技巧。
