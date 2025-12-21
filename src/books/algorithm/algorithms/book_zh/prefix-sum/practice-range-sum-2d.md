# 实战：二维区域和检索

> LeetCode 304. 二维区域和检索 - 矩阵不可变 | 难度：中等

二维前缀和的经典应用。

---

## 题目描述

给定一个二维矩阵 `matrix`，实现一个类来处理以下查询：

计算其子矩阵内元素的总和，该子矩阵的左上角为 `(row1, col1)`，右下角为 `(row2, col2)`。

**示例**：
```
matrix = [
  [3, 0, 1, 4, 2],
  [5, 6, 3, 2, 1],
  [1, 2, 0, 1, 5],
  [4, 1, 0, 1, 7],
  [1, 0, 3, 0, 5]
]

sumRegion(2, 1, 4, 3) = 8  (蓝色区域)
```

---

## 思路分析

一维前缀和可以 O(1) 求区间和，二维前缀和可以 O(1) 求矩形区域和。

定义 `prefix[i][j]` 为从 `(0,0)` 到 `(i-1,j-1)` 的矩形区域和。

---

## 二维前缀和构建

```
prefix[i][j] = prefix[i-1][j] + prefix[i][j-1] 
             - prefix[i-1][j-1] + matrix[i-1][j-1]
```

**图示**：
```
+-------+-------+
|   A   |   B   |
+-------+-------+
|   C   |   D   |
+-------+-------+

prefix(D) = prefix(A+B) + prefix(A+C) - prefix(A) + D
```

---

## 区域和查询

```
sum(r1,c1,r2,c2) = prefix[r2+1][c2+1] 
                 - prefix[r1][c2+1] 
                 - prefix[r2+1][c1] 
                 + prefix[r1][c1]
```

**图示**：
```
求黄色区域的和：

+-------+-------+
|   A   |   B   |
+-------+-------+
|   C   | 黄色  |
+-------+-------+

黄色 = (A+B+C+黄) - (A+B) - (A+C) + A
```

---

## 代码实现

```typescript
class NumMatrix {
  private prefix: number[][];
  
  constructor(matrix: number[][]) {
    const m = matrix.length;
    const n = matrix[0].length;
    
    // prefix[i][j] = 从 (0,0) 到 (i-1,j-1) 的区域和
    this.prefix = Array.from({ length: m + 1 }, () => 
      new Array(n + 1).fill(0)
    );
    
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        this.prefix[i][j] = this.prefix[i - 1][j] 
                          + this.prefix[i][j - 1] 
                          - this.prefix[i - 1][j - 1] 
                          + matrix[i - 1][j - 1];
      }
    }
  }
  
  sumRegion(row1: number, col1: number, row2: number, col2: number): number {
    return this.prefix[row2 + 1][col2 + 1] 
         - this.prefix[row1][col2 + 1] 
         - this.prefix[row2 + 1][col1] 
         + this.prefix[row1][col1];
  }
}
```

---

## 复杂度分析

- **预处理**：O(mn)
- **单次查询**：O(1)
- **空间复杂度**：O(mn)

---

## 记忆技巧

构建：**左 + 上 - 左上 + 当前**

查询：**全 - 上 - 左 + 左上**
