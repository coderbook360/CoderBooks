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
    
    // 关键：判断哪一半是有序的
    // 由于数组只旋转了一次，mid 左边或右边至少有一半是有序的
    if (nums[left] <= nums[mid]) {
      // 左半边 [left, mid] 是有序的
      // 检查 target 是否在有序的左半边
      if (nums[left] <= target && target < nums[mid]) {
        // target 在有序的左半边，收缩右边界
        right = mid - 1;
      } else {
        // target 在无序的右半边，收缩左边界
        left = mid + 1;
      }
    } else {
      // 右半边 [mid, right] 是有序的
      // 检查 target 是否在有序的右半边
      if (nums[mid] < target && target <= nums[right]) {
        // target 在有序的右半边，收缩左边界
        left = mid + 1;
      } else {
        // target 在无序的左半边，收缩右边界
        right = mid - 1;
      }
    }
  }
  
  return -1;
}
```

**为什么能用二分？**
- 虽然整体不有序，但每次划分后至少有一半是有序的
- 利用有序的那一半判断 target 的位置

---

## 变体二：寻找峰值

数组无序，但相邻元素不相等，找任意一个峰值（比左右邻居都大的元素）。

**关键洞察**：如果 `nums[mid] < nums[mid + 1]`，则右边一定存在峰值。

```typescript
function findPeakElement(nums: number[]): number {
  let left = 0;
  let right = nums.length - 1;
  
  // 为什么用 left < right？因为我们要保留一个候选答案
  while (left < right) {
    const mid = left + Math.floor((right - left) / 2);
    
    if (nums[mid] < nums[mid + 1]) {
      // mid 到 mid+1 是"上坡"
      // 想象爬山：继续往右走，一定会遇到峰值（或到达边界）
      // 边界外视为 -∞，所以边界也是峰值
      left = mid + 1;
    } else {
      // mid 到 mid+1 是"下坡"或平坡（题目保证不相等，所以是下坡）
      // mid 可能是峰值（如果 mid-1 < mid），或者峰值在左边
      // 无论如何，mid 有可能是答案，所以 right = mid（保留 mid）
      right = mid;
    }
  }
  
  // 循环结束时 left === right，就是峰值位置
  return left;
}
```

**为什么一定存在峰值？**
- 边界外的值视为 -∞
- 所以只要数组非空，两端或中间一定有峰值

---

## 变体三：搜索二维矩阵

矩阵每行从左到右递增，每行第一个数大于上一行最后一个数。

**方法**：将二维展开为一维，用标准二分。

```typescript
function searchMatrix(matrix: number[][], target: number): boolean {
  const m = matrix.length;     // 行数
  const n = matrix[0].length;  // 列数
  
  // 将二维矩阵视为一维数组，长度为 m * n
  let left = 0;
  let right = m * n - 1;
  
  while (left <= right) {
    const mid = left + Math.floor((right - left) / 2);
    
    // 关键：将一维索引 mid 转换为二维坐标 (row, col)
    // row = mid / n（商）
    // col = mid % n（余）
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

**为什么可以展开成一维？**
- 因为每行第一个数 > 上一行最后一个数
- 整个矩阵按行优先顺序是完全有序的

---

## 变体四：搜索二维矩阵 II

每行递增，每列递增，但行与行之间无严格关系。

**方法**：从右上角或左下角开始搜索（这两个位置很特殊）。

```typescript
function searchMatrixII(matrix: number[][], target: number): boolean {
  // 从右上角开始：row=0, col=最后一列
  let row = 0;
  let col = matrix[0].length - 1;
  
  // 只要还在矩阵范围内就继续搜索
  while (row < matrix.length && col >= 0) {
    const val = matrix[row][col];
    
    if (val === target) {
      return true;
    } else if (val < target) {
      // 当前值太小，需要更大的值
      // 由于当前列都 <= val（上面的更小），所以排除这一行
      row++;
    } else {
      // 当前值太大，需要更小的值
      // 由于当前行都 <= val（左边的更小），所以排除这一列
      col--;
    }
  }
  
  return false;
}
```

**为什么选右上角？**
```
从右上角 (0, n-1) 出发：
- 如果 target 更大：向下走（row++），排除当前行
- 如果 target 更小：向左走（col--），排除当前列

每次排除一行或一列，最多走 m + n 步
时间复杂度：O(m + n)
```

**左下角同理**，只是方向相反。

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
