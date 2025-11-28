# 实战：二维区域和检索

这道题来自 LeetCode 304，是一维前缀和向二维的自然扩展。

## 题目描述

给定一个二维矩阵 `matrix`，计算其子矩形范围内元素的总和，该子矩阵的左上角为 `(row1, col1)`，右下角为 `(row2, col2)`。

实现 `NumMatrix` 类：
- `NumMatrix(matrix)` 给定整数矩阵 `matrix` 进行初始化
- `sumRegion(row1, col1, row2, col2)` 返回左上角 `(row1, col1)` 、右下角 `(row2, col2)` 所描述的子矩阵的元素总和

**示例**：

```
输入：
["NumMatrix", "sumRegion", "sumRegion", "sumRegion"]
[[[[3,0,1,4,2],[5,6,3,2,1],[1,2,0,1,5],[4,1,0,1,7],[1,0,3,0,5]]], 
 [2,1,4,3], [1,1,2,2], [1,2,2,4]]
 
输出：[null, 8, 11, 12]
```

## 从一维到二维

回顾一维前缀和：

```
sum(left, right) = prefix[right + 1] - prefix[left]
```

在二维中，我们定义 `prefix[i][j]` 为原点 (0,0) 到 (i-1, j-1) 围成的矩形内所有元素的和。

那么子矩阵 `(row1, col1) 到 (row2, col2)` 的和怎么算？

## 容斥原理

这里需要用到容斥原理。画个图更容易理解：

```
+-------+-------+
|   A   |   B   |
+-------+-------+
|   C   |   D   |  ← D 是我们要求的区域
+-------+-------+
```

如果我们知道从原点到各个角的前缀和：
- `prefix[row2+1][col2+1]` = A + B + C + D
- `prefix[row1][col2+1]` = A + B
- `prefix[row2+1][col1]` = A + C
- `prefix[row1][col1]` = A

那么：

```
D = (A + B + C + D) - (A + B) - (A + C) + A
  = prefix[row2+1][col2+1] - prefix[row1][col2+1] - prefix[row2+1][col1] + prefix[row1][col1]
```

注意最后要加回 A，因为它被减了两次。

## 构建二维前缀和

同样运用容斥原理：

```
prefix[i][j] = matrix[i-1][j-1] 
             + prefix[i-1][j] 
             + prefix[i][j-1] 
             - prefix[i-1][j-1]
```

把当前格子的值，加上上方的前缀和，加上左方的前缀和，减去重复计算的左上方。

## 完整代码

```javascript
class NumMatrix {
    constructor(matrix) {
        const m = matrix.length;
        const n = matrix[0].length;
        
        // prefix[i][j] 表示 matrix[0..i-1][0..j-1] 的和
        this.prefix = Array.from(
            { length: m + 1 }, 
            () => new Array(n + 1).fill(0)
        );
        
        // 构建前缀和矩阵
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                this.prefix[i][j] = matrix[i-1][j-1]
                                  + this.prefix[i-1][j]
                                  + this.prefix[i][j-1]
                                  - this.prefix[i-1][j-1];
            }
        }
    }
    
    sumRegion(row1, col1, row2, col2) {
        return this.prefix[row2+1][col2+1]
             - this.prefix[row1][col2+1]
             - this.prefix[row2+1][col1]
             + this.prefix[row1][col1];
    }
}
```

## 图解构建过程

以示例矩阵为例：

```
matrix:
3  0  1  4  2
5  6  3  2  1
1  2  0  1  5
4  1  0  1  7
1  0  3  0  5
```

构建 `prefix[i][j]`（这里展示部分）：

```
prefix:
0   0   0   0   0   0
0   3   3   4   8  10
0   8  14  18  24  27
0   9  17  21  28  36
0  13  22  26  34  49
0  14  23  30  38  58
```

验证 `prefix[3][3]` = 21：
- 对应原矩阵 (0,0) 到 (2,2) 的和
- 3+0+1 + 5+6+3 + 1+2+0 = 21 ✓

## 图解查询过程

查询 `sumRegion(2, 1, 4, 3)`：

```
对应区域（索引从 0 开始）：
    col1=1  col3=3
row2=2  [2, 0, 1]
row3=3  [1, 0, 1]
row4=4  [0, 3, 0]
```

手动计算：2+0+1 + 1+0+1 + 0+3+0 = 8

用公式：

```
= prefix[5][4] - prefix[2][4] - prefix[5][1] + prefix[2][1]
= 38 - 24 - 14 + 8
= 8 ✓
```

## 边界处理

和一维一样，我们让 `prefix` 比原矩阵多一行一列，全部初始化为 0。这样就不需要处理边界条件：

- 第一行/第一列的计算自动正确
- 查询时不需要判断 row1 或 col1 是否为 0

## 复杂度分析

**时间复杂度**：
- 预处理：O(m × n)，遍历整个矩阵
- 单次查询：O(1)

**空间复杂度**：O(m × n)，存储前缀和矩阵

## 小结

二维前缀和的核心是容斥原理：

- **构建时**：当前 = 单元格值 + 上 + 左 - 左上
- **查询时**：区域 = 大矩形 - 上方 - 左方 + 左上角

记住这个"加减抵消"的模式，二维前缀和就不难了。
