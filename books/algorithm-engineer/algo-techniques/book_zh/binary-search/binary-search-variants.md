# 二分查找的变体问题

掌握了基础模板后，我们来看二分查找在不同场景中的变体。

---

## 变体一：旋转排序数组

原本有序的数组在某个位置发生了旋转：`[4, 5, 6, 7, 0, 1, 2]`

**特点**：数组由两个有序部分组成，至少有一半是有序的。

```typescript
function searchRotated(nums: number[], target: number): number {
  let left = 0;
  let right = nums.length - 1;
  
  while (left <= right) {
    const mid = left + Math.floor((right - left) / 2);
    
    if (nums[mid] === target) return mid;
    
    // 判断哪一半是有序的
    if (nums[left] <= nums[mid]) {
      // 左半边有序
      if (nums[left] <= target && target < nums[mid]) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    } else {
      // 右半边有序
      if (nums[mid] < target && target <= nums[right]) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
  }
  
  return -1;
}
```

---

## 变体二：寻找峰值

数组无序，但相邻元素不相等，找任意一个峰值（比左右邻居都大的元素）。

**关键洞察**：如果 `nums[mid] < nums[mid + 1]`，则右边一定存在峰值。

```typescript
function findPeakElement(nums: number[]): number {
  let left = 0;
  let right = nums.length - 1;
  
  while (left < right) {
    const mid = left + Math.floor((right - left) / 2);
    
    if (nums[mid] < nums[mid + 1]) {
      // 上坡，峰值在右边
      left = mid + 1;
    } else {
      // 下坡或峰值，答案在左边（含 mid）
      right = mid;
    }
  }
  
  return left;
}
```

---

## 变体三：搜索二维矩阵

矩阵每行从左到右递增，每行第一个数大于上一行最后一个数。

**方法**：将二维展开为一维，用标准二分。

```typescript
function searchMatrix(matrix: number[][], target: number): boolean {
  const m = matrix.length;
  const n = matrix[0].length;
  let left = 0;
  let right = m * n - 1;
  
  while (left <= right) {
    const mid = left + Math.floor((right - left) / 2);
    const row = Math.floor(mid / n);
    const col = mid % n;
    const val = matrix[row][col];
    
    if (val === target) return true;
    else if (val < target) left = mid + 1;
    else right = mid - 1;
  }
  
  return false;
}
```

---

## 变体四：搜索二维矩阵 II

每行递增，每列递增，但行与行之间无严格关系。

**方法**：从右上角或左下角开始搜索。

```typescript
function searchMatrixII(matrix: number[][], target: number): boolean {
  let row = 0;
  let col = matrix[0].length - 1;
  
  while (row < matrix.length && col >= 0) {
    if (matrix[row][col] === target) return true;
    else if (matrix[row][col] < target) row++;
    else col--;
  }
  
  return false;
}
```

---

## 变体五：寻找两个正序数组的中位数

两个有序数组，找合并后的中位数，要求 O(log(m+n))。

**思路**：二分查找分割点，使得左半边和右半边元素个数相等。

这是二分查找的高级应用，需要仔细处理边界。

---

## 总结

| 变体 | 关键点 |
|-----|-------|
| 旋转数组 | 判断哪一半有序 |
| 寻找峰值 | 根据上坡/下坡决定方向 |
| 二维矩阵 | 展开为一维或从角开始 |
| 中位数 | 二分分割点 |
