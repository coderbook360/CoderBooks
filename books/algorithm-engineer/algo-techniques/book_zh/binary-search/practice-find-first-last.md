# 实战：在排序数组中查找元素的第一个和最后一个位置

> LeetCode 34. 在排序数组中查找元素的第一个和最后一个位置 | 难度：中等

同时考察左边界和右边界的查找。

---

## 题目描述

给你一个按照非递减顺序排列的整数数组 `nums`，和一个目标值 `target`。请你找出给定目标值在数组中的开始位置和结束位置。

如果数组中不存在目标值 `target`，返回 `[-1, -1]`。

**示例**：
```
输入：nums = [5, 7, 7, 8, 8, 10], target = 8
输出：[3, 4]
```

---

## 思路分析

分两步：
1. 用左边界模板找第一个等于 target 的位置
2. 用右边界模板找最后一个等于 target 的位置

---

## 代码实现

```typescript
function searchRange(nums: number[], target: number): number[] {
  const first = findFirst(nums, target);
  const last = findLast(nums, target);
  return [first, last];
}

function findFirst(nums: number[], target: number): number {
  let left = 0;
  let right = nums.length;
  
  while (left < right) {
    const mid = left + Math.floor((right - left) / 2);
    if (nums[mid] >= target) {
      right = mid;
    } else {
      left = mid + 1;
    }
  }
  
  // 验证是否找到 target
  if (left < nums.length && nums[left] === target) {
    return left;
  }
  return -1;
}

function findLast(nums: number[], target: number): number {
  let left = 0;
  let right = nums.length;
  
  while (left < right) {
    const mid = left + Math.floor((right - left) / 2);
    if (nums[mid] <= target) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }
  
  // left - 1 是最后一个 <= target 的位置
  if (left > 0 && nums[left - 1] === target) {
    return left - 1;
  }
  return -1;
}
```

---

## 优化：复用左边界

```typescript
function searchRange(nums: number[], target: number): number[] {
  const first = lowerBound(nums, target);
  
  // 如果第一个位置不是 target，说明不存在
  if (first === nums.length || nums[first] !== target) {
    return [-1, -1];
  }
  
  // 找 target + 1 的左边界 - 1 就是 target 的右边界
  const last = lowerBound(nums, target + 1) - 1;
  return [first, last];
}

function lowerBound(nums: number[], target: number): number {
  let left = 0;
  let right = nums.length;
  
  while (left < right) {
    const mid = left + Math.floor((right - left) / 2);
    if (nums[mid] >= target) right = mid;
    else left = mid + 1;
  }
  
  return left;
}
```

---

## 复杂度分析

- **时间复杂度**：O(log n)
- **空间复杂度**：O(1)
