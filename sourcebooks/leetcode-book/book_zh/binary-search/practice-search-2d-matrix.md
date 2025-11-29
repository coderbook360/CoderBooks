# 实战：搜索二维矩阵

二维矩阵的搜索，可以展开成一维数组处理，也可以利用矩阵的特殊结构。

## 问题描述

给你一个满足下述两条属性的`m x n`整数矩阵：
1. 每行中的整数从左到右按非递减顺序排列
2. 每行的第一个整数大于前一行的最后一个整数

给你一个整数`target`，如果在矩阵中存在，返回true，否则返回false。

**示例**：
```
输入：matrix = [[1,3,5,7],[10,11,16,20],[23,30,34,60]], target = 3
输出：true

输入：matrix = [[1,3,5,7],[10,11,16,20],[23,30,34,60]], target = 13
输出：false
```

## 思路分析

### 关键观察

因为每行第一个数大于前一行最后一个数，整个矩阵展开后是一个**严格递增的一维数组**。

### 方法：展开成一维

把二维坐标转换成一维索引：
- 一维索引 `idx` → 二维坐标 `(idx / n, idx % n)`
- 二维坐标 `(i, j)` → 一维索引 `i * n + j`

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
    
    let left = 0;
    let right = m * n - 1;
    
    while (left <= right) {
        const mid = left + Math.floor((right - left) / 2);
        
        // 一维索引转二维坐标
        const row = Math.floor(mid / n);
        const col = mid % n;
        const val = matrix[row][col];
        
        if (val === target) {
            return true;
        } else if (val < target) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    
    return false;
}
```

## 执行过程

```
matrix = [[1,3,5,7],[10,11,16,20],[23,30,34,60]], target = 3
m=3, n=4, 共12个元素

展开：[1,3,5,7,10,11,16,20,23,30,34,60]

left=0, right=11

step 1: mid=5, (5/4, 5%4)=(1,1), val=11 > 3
  right=4

step 2: mid=2, (2/4, 2%4)=(0,2), val=5 > 3
  right=1

step 3: mid=0, (0/4, 0%4)=(0,0), val=1 < 3
  left=1

step 4: mid=1, (1/4, 1%4)=(0,1), val=3 = target
  返回 true
```

## 另一种方法：两次二分

先在第一列找行，再在该行找列：

```javascript
function searchMatrix(matrix, target) {
    const m = matrix.length;
    const n = matrix[0].length;
    
    // 在第一列找最后一个 <= target 的行
    let top = 0, bottom = m - 1;
    while (top <= bottom) {
        const mid = top + Math.floor((bottom - top) / 2);
        if (matrix[mid][0] <= target) {
            top = mid + 1;
        } else {
            bottom = mid - 1;
        }
    }
    
    // bottom 是目标所在行（如果存在）
    if (bottom < 0) return false;
    const row = bottom;
    
    // 在该行中搜索
    let left = 0, right = n - 1;
    while (left <= right) {
        const mid = left + Math.floor((right - left) / 2);
        if (matrix[row][mid] === target) {
            return true;
        } else if (matrix[row][mid] < target) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    
    return false;
}
```

## 复杂度分析

**展开成一维**：
- 时间复杂度：O(log(m*n))
- 空间复杂度：O(1)

**两次二分**：
- 时间复杂度：O(log m + log n) = O(log(m*n))
- 空间复杂度：O(1)

两种方法复杂度相同。

## 小结

搜索二维矩阵的要点：

1. **矩阵特性**：展开后是递增的一维数组
2. **坐标转换**：一维索引 ↔ 二维坐标
3. **标准二分**：在虚拟的一维数组上搜索
4. **两种方法**：展开法或两次二分法

这道题的关键是认识到矩阵的特殊结构。
