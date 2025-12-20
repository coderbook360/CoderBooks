# 实战：搜索旋转排序数组

> LeetCode 33. 搜索旋转排序数组 | 难度：中等

二分查找在非标准有序数组中的应用。

---

## 题目描述

整数数组 `nums` 按升序排列，数组中的值**互不相同**。

在传递给函数之前，`nums` 在预先未知的某个下标 k 上进行了**旋转**，使数组变为 `[nums[k], nums[k+1], ..., nums[n-1], nums[0], nums[1], ..., nums[k-1]]`。

给你旋转后的数组 `nums` 和一个整数 `target`，如果 `nums` 中存在这个目标值，则返回它的下标，否则返回 -1。

**示例**：
```
输入：nums = [4, 5, 6, 7, 0, 1, 2], target = 0
输出：4
```

---

## 思路分析

旋转数组由两个有序部分组成：
```
[4, 5, 6, 7, 0, 1, 2]
 ↑--------↑  ↑-----↑
  有序部分   有序部分
```

**关键洞察**：取 mid 后，左半边或右半边**至少有一边是完全有序的**。

判断逻辑：
1. 如果 `nums[left] <= nums[mid]`，左半边有序
2. 否则，右半边有序

---

## 代码实现

```typescript
function search(nums: number[], target: number): number {
  let left = 0;
  let right = nums.length - 1;
  
  while (left <= right) {
    const mid = left + Math.floor((right - left) / 2);
    
    if (nums[mid] === target) return mid;
    
    // 判断哪一半有序
    if (nums[left] <= nums[mid]) {
      // 左半边有序
      if (nums[left] <= target && target < nums[mid]) {
        // target 在左半边
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    } else {
      // 右半边有序
      if (nums[mid] < target && target <= nums[right]) {
        // target 在右半边
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

## 图示

```
nums = [4, 5, 6, 7, 0, 1, 2], target = 0

第1次：left=0, right=6, mid=3
       nums[0]=4 <= nums[3]=7, 左半边有序
       target=0 不在 [4, 7) 中
       left = 4

第2次：left=4, right=6, mid=5
       nums[4]=0 <= nums[5]=1, 左半边有序
       target=0 在 [0, 1) 中
       right = 4

第3次：left=4, right=4, mid=4
       nums[4]=0 === target, 返回 4
```

---

## 复杂度分析

- **时间复杂度**：O(log n)
- **空间复杂度**：O(1)
