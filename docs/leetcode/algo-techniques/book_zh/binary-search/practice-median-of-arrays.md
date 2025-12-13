# 实战：寻找两个正序数组的中位数

> LeetCode 4. 寻找两个正序数组的中位数 | 难度：困难

二分查找的终极挑战题。

---

## 题目描述

给定两个大小分别为 m 和 n 的正序（从小到大）数组 `nums1` 和 `nums2`。请你找出并返回这两个正序数组的**中位数**。

要求时间复杂度 O(log(m+n))。

**示例**：
```
输入：nums1 = [1, 3], nums2 = [2]
输出：2.0
解释：合并数组 = [1, 2, 3]，中位数 2
```

---

## 思路分析

**暴力思路**：合并后排序取中位数 → O(m+n)

**二分思路**：不合并，直接找分割点。

中位数将数组分成**左右两半**，左半边的所有元素 <= 右半边的所有元素。

```
nums1: [a1, a2 | a3, a4]
nums2: [b1 | b2, b3, b4]
        左半边    右半边
```

要满足：
- `max(左半边) <= min(右半边)`
- `左半边元素个数 = (m + n + 1) / 2`

---

## 代码实现

```typescript
function findMedianSortedArrays(nums1: number[], nums2: number[]): number {
  // 确保 nums1 是较短的数组
  if (nums1.length > nums2.length) {
    return findMedianSortedArrays(nums2, nums1);
  }
  
  const m = nums1.length;
  const n = nums2.length;
  let left = 0;
  let right = m;
  
  while (left <= right) {
    // i: nums1 的分割点，j: nums2 的分割点
    const i = Math.floor((left + right) / 2);
    const j = Math.floor((m + n + 1) / 2) - i;
    
    // 边界处理
    const nums1Left = i === 0 ? -Infinity : nums1[i - 1];
    const nums1Right = i === m ? Infinity : nums1[i];
    const nums2Left = j === 0 ? -Infinity : nums2[j - 1];
    const nums2Right = j === n ? Infinity : nums2[j];
    
    if (nums1Left <= nums2Right && nums2Left <= nums1Right) {
      // 找到正确的分割点
      if ((m + n) % 2 === 1) {
        return Math.max(nums1Left, nums2Left);
      } else {
        return (Math.max(nums1Left, nums2Left) + 
                Math.min(nums1Right, nums2Right)) / 2;
      }
    } else if (nums1Left > nums2Right) {
      // nums1 的左边太大，向左移动
      right = i - 1;
    } else {
      // nums2 的左边太大，向右移动
      left = i + 1;
    }
  }
  
  return 0;  // 不会到达这里
}
```

---

## 核心逻辑

```
nums1: [1, 3 | 5, 7]    i = 2
nums2: [2 | 4, 6, 8]    j = 1

左半边: [1, 3, 2]
右半边: [5, 7, 4, 6, 8]

条件检查:
- nums1[i-1]=3 <= nums2[j]=4 ✓
- nums2[j-1]=2 <= nums1[i]=5 ✓

满足条件，中位数 = (max(3,2) + min(5,4)) / 2 = 3.5
```

---

## 复杂度分析

- **时间复杂度**：O(log(min(m, n)))
- **空间复杂度**：O(1)

---

## 难点

- 边界处理（i=0, i=m, j=0, j=n）
- 奇偶情况的处理
- 确保在较短数组上二分
