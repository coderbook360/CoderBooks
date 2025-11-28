# 搜索二维矩阵

> LeetCode 74. Search a 2D Matrix

给你一个 m × n 的整数矩阵，判断目标值是否存在于矩阵中。

这道题的精妙之处在于：**把二维问题转化为一维问题**。一旦理解了这个转换，原本复杂的矩阵搜索就变成了简单的二分查找。

## 问题描述

```javascript
输入：matrix = [
    [1,  3,  5,  7],
    [10, 11, 16, 20],
    [23, 30, 34, 60]
], target = 3

输出：true
```

矩阵的特性：
- 每行从左到右递增
- 每行的第一个元素大于上一行的最后一个元素

## 思路分析

### 矩阵特性分析

观察矩阵的特性，你会发现：如果把每一行首尾相接，整个矩阵就是一个**有序的一维数组**：

```
矩阵:
[1,  3,  5,  7 ]
[10, 11, 16, 20]
[23, 30, 34, 60]

拉成一维:
[1, 3, 5, 7, 10, 11, 16, 20, 23, 30, 34, 60]
 ↑                                        ↑
 有序！
```

既然是有序数组，二分查找就是最佳选择。

### 二维转一维的思想

我们不需要真的创建一个一维数组，只需要**假装**它是一维的：

- 给每个位置编一个索引：0, 1, 2, ..., m×n-1
- 用这个索引做二分查找
- 需要访问元素时，把一维索引转换回二维坐标

```
矩阵:
[1,  3,  5,  7 ]   编号: 0  1  2  3
[10, 11, 16, 20]         4  5  6  7
[23, 30, 34, 60]         8  9  10 11
```

### 坐标转换公式

设矩阵有 m 行 n 列，一维索引为 `mid`：

```javascript
row = Math.floor(mid / n);  // 在第几行
col = mid % n;              // 在第几列
```

**为什么这个公式有效**？

- 每行有 n 个元素
- 索引 `mid` 相当于"跳过了多少个完整的行"加上"当前行走了几步"
- `mid / n`（取整）= 跳过的完整行数 = 行号
- `mid % n` = 当前行走的步数 = 列号

例如：`mid = 7`，`n = 4`
- `row = 7 / 4 = 1`（第 1 行）
- `col = 7 % 4 = 3`（第 3 列）
- 对应 `matrix[1][3] = 20` ✓

## 解法详解

```javascript
function searchMatrix(matrix, target) {
    // 边界检查
    if (!matrix.length || !matrix[0].length) return false;
    
    const m = matrix.length;     // 行数
    const n = matrix[0].length;  // 列数
    
    // 在"虚拟一维数组"上二分
    let left = 0;
    let right = m * n - 1;
    
    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        
        // 一维索引转二维坐标
        const row = Math.floor(mid / n);
        const col = mid % n;
        const value = matrix[row][col];
        
        if (value === target) {
            return true;
        } else if (value < target) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    
    return false;
}
```

## 执行过程图解

以矩阵 `[[1,3,5,7],[10,11,16,20],[23,30,34,60]]`，`target = 3` 为例：

```
m=3, n=4，共 12 个元素

初始：left=0, right=11

第1轮：
  mid = (0+11)/2 = 5
  row = 5/4 = 1, col = 5%4 = 1
  matrix[1][1] = 11 > 3
  → right = 4

第2轮：
  mid = (0+4)/2 = 2
  row = 2/4 = 0, col = 2%4 = 2
  matrix[0][2] = 5 > 3
  → right = 1

第3轮：
  mid = (0+1)/2 = 0
  row = 0/4 = 0, col = 0%4 = 0
  matrix[0][0] = 1 < 3
  → left = 1

第4轮：
  mid = (1+1)/2 = 1
  row = 1/4 = 0, col = 1%4 = 1
  matrix[0][1] = 3 == 3
  → 找到！返回 true
```

## 复杂度分析

**时间复杂度：O(log(m × n))**
- 二分查找的时间复杂度
- 相当于在长度为 m×n 的数组上二分

**空间复杂度：O(1)**
- 只使用了几个变量
- 没有创建额外的数组

## 边界情况

```javascript
// 空矩阵
searchMatrix([], 1)       // false
searchMatrix([[]], 1)     // false

// 单元素矩阵
searchMatrix([[5]], 5)    // true
searchMatrix([[5]], 1)    // false

// target 超出范围
searchMatrix([[1,3],[5,7]], 0)   // false（小于最小值）
searchMatrix([[1,3],[5,7]], 10)  // false（大于最大值）
```

## 另一种思路：两次二分

有些人会想：先二分确定在哪一行，再二分在那一行中搜索。

```javascript
function searchMatrix(matrix, target) {
    const m = matrix.length;
    const n = matrix[0].length;
    
    // 第一次二分：找到target可能在的行
    let top = 0, bottom = m - 1;
    while (top <= bottom) {
        const mid = Math.floor((top + bottom) / 2);
        if (matrix[mid][0] <= target && target <= matrix[mid][n-1]) {
            // 在这一行，进行第二次二分
            let left = 0, right = n - 1;
            while (left <= right) {
                const col = Math.floor((left + right) / 2);
                if (matrix[mid][col] === target) return true;
                if (matrix[mid][col] < target) left = col + 1;
                else right = col - 1;
            }
            return false;
        }
        if (matrix[mid][0] > target) bottom = mid - 1;
        else top = mid + 1;
    }
    return false;
}
```

这种方法也是 O(log m + log n) = O(log(m×n))，但代码更复杂。**推荐使用第一种方法**，更简洁。

## 相关题目

**LeetCode 240. 搜索二维矩阵 II** 是这道题的进阶版：
- 每行从左到右递增
- 每列从上到下递增
- 但行与行之间**没有**第一个比上一行最后一个大的约束

那道题不能用"二维转一维"的技巧，需要从右上角或左下角开始搜索，是一种完全不同的思路。

## 小结

这道题的核心技巧：

1. **观察规律**：发现矩阵本质上是有序的
2. **二维转一维**：把复杂问题简化
3. **坐标转换**：`row = mid / n`，`col = mid % n`

这种"降维"的思想在很多矩阵问题中都有应用。当你看到有特殊性质的矩阵时，想想能否把它看作更简单的结构。
