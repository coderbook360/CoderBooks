# 实战：搜索二维矩阵

> LeetCode 74. 搜索二维矩阵 | 难度：中等

二维转一维的二分应用，理解索引转换是关键。

---

## 题目描述

给你一个满足下述两条属性的 m x n 整数矩阵：
- 每行中的整数从左到右按非严格递增顺序排列
- 每行的第一个整数大于前一行的最后一个整数

给你一个整数 `target`，如果 `target` 在矩阵中，返回 `true`；否则返回 `false`。

**示例**：
```
matrix = [
  [1, 3, 5, 7],
  [10, 11, 16, 20],
  [23, 30, 34, 60]
]
target = 3
输出：true

target = 13
输出：false
```

---

## 思路分析

### 矩阵的特殊性质

由于**每行第一个数大于上一行最后一个数**，整个矩阵按行展开后是一个**完全有序的数组**。

```
原矩阵:
[1,  3,  5,  7 ]
[10, 11, 16, 20]
[23, 30, 34, 60]

展开后:
[1, 3, 5, 7, 10, 11, 16, 20, 23, 30, 34, 60]
 0  1  2  3   4   5   6   7   8   9  10  11
```

所以可以把二维矩阵当作一维数组进行二分搜索！

### 索引转换公式

假设矩阵有 `m` 行 `n` 列，一维索引 `idx` 转换为二维坐标：

```
row = Math.floor(idx / n)
col = idx % n
```

**示例**：
```
n = 4（每行4个元素）
idx = 5 → row = 5/4 = 1, col = 5%4 = 1
matrix[1][1] = 11 ✓
```

---

## 代码实现

### 方法一：二维转一维二分

```typescript
function searchMatrix(matrix: number[][], target: number): boolean {
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

### 方法二：两次二分

先确定目标所在行，再在该行内二分。

```typescript
function searchMatrix(matrix: number[][], target: number): boolean {
  const m = matrix.length;
  const n = matrix[0].length;
  
  // 第一次二分：找目标所在行
  let top = 0;
  let bottom = m - 1;
  
  while (top < bottom) {
    const mid = Math.floor((top + bottom + 1) / 2);
    if (matrix[mid][0] <= target) {
      top = mid;  // 目标可能在 mid 行或更下面
    } else {
      bottom = mid - 1;  // 目标在更上面的行
    }
  }
  
  const row = top;
  
  // 第二次二分：在确定的行内搜索
  let left = 0;
  let right = n - 1;
  
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const val = matrix[row][mid];
    
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

---

## 执行过程可视化

```
matrix = [[1,3,5,7], [10,11,16,20], [23,30,34,60]]
target = 11
m = 3, n = 4, 总共 12 个元素

方法一（一维二分）：
初始：left = 0, right = 11

mid = 5 → row=1, col=1 → val=11 === target
返回 true ✓
```

```
target = 13
初始：left = 0, right = 11

mid = 5 → val=11 < 13, left = 6
mid = 8 → row=2, col=0 → val=23 > 13, right = 7
mid = 6 → row=1, col=2 → val=16 > 13, right = 5

left > right，返回 false ✓
```

---

## 两种方法对比

| 方法 | 时间复杂度 | 优点 | 缺点 |
|-----|----------|------|------|
| 一维二分 | O(log(mn)) | 代码简洁 | 索引转换稍复杂 |
| 两次二分 | O(log m + log n) | 思路直观 | 代码较长 |

**数学上等价**：`log(mn) = log m + log n`

---

## 常见错误

**错误1：索引转换用错 m 和 n**
```typescript
// 错误：用 m 做除法
const row = Math.floor(mid / m);  // ❌

// 正确：用 n（每行的列数）
const row = Math.floor(mid / n);  // ✅
```

**错误2：忘记处理边界**
```typescript
// 如果矩阵为空或第一行为空
if (matrix.length === 0 || matrix[0].length === 0) {
  return false;
}
```

**错误3：right 初始值错误**
```typescript
// 错误：右边界设置为 m * n
let right = m * n;  // ❌ 越界！

// 正确
let right = m * n - 1;  // ✅
```

---

## 与搜索二维矩阵 II 的区别

| 题目 | 矩阵性质 | 最优解法 |
|-----|---------|---------|
| 74（本题） | 完全有序 | 一维二分 O(log mn) |
| 240 | 行有序、列有序 | Z 字形搜索 O(m+n) |

**74 题的矩阵更严格**：不仅行列有序，而且行与行之间也有序。

---

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [240. 搜索二维矩阵 II](https://leetcode.com/problems/search-a-2d-matrix-ii/) | 中等 | 行列分别有序 |
| [378. 有序矩阵中第 K 小的元素](https://leetcode.com/problems/kth-smallest-element-in-a-sorted-matrix/) | 中等 | 值域二分 |
| [33. 搜索旋转排序数组](https://leetcode.com/problems/search-in-rotated-sorted-array/) | 中等 | 旋转数组二分 |

---

## 索引转换速查表

```
二维 → 一维: idx = row * n + col
一维 → 二维: row = idx / n, col = idx % n

记忆技巧:
- n 是列数（每行有 n 个元素）
- 除以 n 得行号
- 模 n 得列号
```

---

## 总结

搜索二维矩阵的核心要点：

1. **识别完全有序**：行与行之间也有序
2. **二维转一维**：把矩阵看作展开的有序数组
3. **索引转换**：`row = idx/n, col = idx%n`
4. **标准二分**：找到就返回 true，否则返回 false
5. **边界注意**：right = m*n-1，不要越界
