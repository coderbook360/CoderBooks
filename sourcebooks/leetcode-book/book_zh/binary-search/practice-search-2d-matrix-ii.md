# 实战：搜索二维矩阵 II

这是搜索二维矩阵的变体，矩阵不能展开成一维，需要不同的策略。

## 问题描述

编写一个高效的算法来搜索`m x n`矩阵中的一个目标值。该矩阵具有以下特性：
1. 每行的元素从左到右升序排列
2. 每列的元素从上到下升序排列

**注意**：不同于搜索二维矩阵I，这里每行的第一个元素**不一定**大于上一行的最后一个元素。

**示例**：
```
输入：matrix = [
  [1,4,7,11,15],
  [2,5,8,12,19],
  [3,6,9,16,22],
  [10,13,14,17,24],
  [18,21,23,26,30]
], target = 5
输出：true
```

## 思路分析

### 关键观察

从**右上角**或**左下角**开始搜索：
- **右上角**：当前元素大于左边所有，小于下边所有
- **左下角**：当前元素小于右边所有，大于上边所有

这样每次比较都能排除一行或一列。

## 完整实现

```javascript
/**
 * @param {number[][]} matrix
 * @param {number} target
 * @return {boolean}
 */
function searchMatrix(matrix, target) {
    const m = matrix.length;
    const n = matrix[0].length;
    
    // 从右上角开始
    let row = 0;
    let col = n - 1;
    
    while (row < m && col >= 0) {
        const val = matrix[row][col];
        
        if (val === target) {
            return true;
        } else if (val > target) {
            // target在左边
            col--;
        } else {
            // target在下边
            row++;
        }
    }
    
    return false;
}
```

## 执行过程

```
matrix = [
  [1,4,7,11,15],
  [2,5,8,12,19],
  [3,6,9,16,22],
  [10,13,14,17,24],
  [18,21,23,26,30]
], target = 5

从右上角 (0, 4) 开始

step 1: (0,4)=15 > 5, col--
step 2: (0,3)=11 > 5, col--
step 3: (0,2)=7 > 5, col--
step 4: (0,1)=4 < 5, row++
step 5: (1,1)=5 = target, 返回true
```

## 为什么选择右上角？

```
     小 → 大
      ↓
     [1, 4, 7, 11, 15]
  小  [2, 5, 8, 12, 19]  ↓
  ↓   [3, 6, 9, 16, 22]  大
  大  [10,13,14,17,24]
      [18,21,23,26,30]
```

在右上角(0, n-1)：
- 左边的都比它小 → 如果target更小，往左走
- 下边的都比它大 → 如果target更大，往下走

每次都能确定一个方向。

如果从左上角开始，target大时既可以往右也可以往下，无法确定方向。

## 从左下角开始

```javascript
function searchMatrix(matrix, target) {
    const m = matrix.length;
    const n = matrix[0].length;
    
    // 从左下角开始
    let row = m - 1;
    let col = 0;
    
    while (row >= 0 && col < n) {
        const val = matrix[row][col];
        
        if (val === target) {
            return true;
        } else if (val > target) {
            // target在上边
            row--;
        } else {
            // target在右边
            col++;
        }
    }
    
    return false;
}
```

## 复杂度分析

**时间复杂度**：O(m + n)
- 每次移动排除一行或一列
- 最多移动m + n次

**空间复杂度**：O(1)

## 对比：两种矩阵搜索

| 矩阵类型 | 特性 | 方法 | 复杂度 |
|---------|------|------|-------|
| 矩阵I | 展开是递增数组 | 二分查找 | O(log(mn)) |
| 矩阵II | 每行每列递增 | 右上角/左下角 | O(m+n) |

## 小结

搜索二维矩阵II的要点：

1. **选择起点**：右上角或左下角
2. **每次排除一行或一列**：根据比较结果决定方向
3. **单调性**：每个方向都是单调的
4. **线性时间**：O(m + n)

这道题的技巧是找到一个"分界点"，使得两个方向分别是单调增和单调减。
