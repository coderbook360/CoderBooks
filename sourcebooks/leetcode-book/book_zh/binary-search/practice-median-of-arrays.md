# 实战：寻找两个正序数组的中位数

这是二分查找的巅峰难题，也是面试常考的hard题。关键是将"找中位数"转化为"找第k小"。

## 问题描述

给定两个大小分别为`m`和`n`的正序（从小到大）数组`nums1`和`nums2`。找出并返回这两个数组的中位数。

要求算法的时间复杂度为O(log(m+n))。

**示例**：
```
输入：nums1 = [1,3], nums2 = [2]
输出：2.0
解释：合并数组 = [1,2,3]，中位数 2

输入：nums1 = [1,2], nums2 = [3,4]
输出：2.5
解释：合并数组 = [1,2,3,4]，中位数 (2+3)/2 = 2.5
```

## 思路分析

### 方法一：合并数组

合并后取中间元素，时间O(m+n)，不满足要求。

### 方法二：二分查找

将问题转化为：**找两个有序数组的第k小元素**。

中位数 = 第(m+n+1)/2小（奇数）或 第(m+n)/2和第(m+n)/2+1小的平均（偶数）。

## 找第k小的元素

```javascript
function findKth(nums1, i, nums2, j, k) {
    // nums1用完了，从nums2中取
    if (i >= nums1.length) {
        return nums2[j + k - 1];
    }
    // nums2用完了，从nums1中取
    if (j >= nums2.length) {
        return nums1[i + k - 1];
    }
    // k = 1，返回两个数组开头的较小值
    if (k === 1) {
        return Math.min(nums1[i], nums2[j]);
    }
    
    // 比较两个数组的第 k/2 个元素
    const half = Math.floor(k / 2);
    const newI = Math.min(i + half, nums1.length) - 1;
    const newJ = Math.min(j + half, nums2.length) - 1;
    
    if (nums1[newI] <= nums2[newJ]) {
        // nums1的前半部分可以排除
        const excluded = newI - i + 1;
        return findKth(nums1, newI + 1, nums2, j, k - excluded);
    } else {
        // nums2的前半部分可以排除
        const excluded = newJ - j + 1;
        return findKth(nums1, i, nums2, newJ + 1, k - excluded);
    }
}
```

## 完整实现

```javascript
/**
 * @param {number[]} nums1
 * @param {number[]} nums2
 * @return {number}
 */
function findMedianSortedArrays(nums1, nums2) {
    const total = nums1.length + nums2.length;
    const half = Math.floor((total + 1) / 2);
    
    if (total % 2 === 1) {
        // 奇数个，取第 half 小
        return findKth(nums1, 0, nums2, 0, half);
    } else {
        // 偶数个，取第 half 和 half+1 小的平均
        const a = findKth(nums1, 0, nums2, 0, half);
        const b = findKth(nums1, 0, nums2, 0, half + 1);
        return (a + b) / 2;
    }
}
```

## 执行示例

```
nums1 = [1, 3], nums2 = [2], 找第2小

findKth(nums1, 0, nums2, 0, 2)
  half = 1
  比较 nums1[0]=1 和 nums2[0]=2
  1 <= 2, 排除nums1[0]
  
findKth(nums1, 1, nums2, 0, 1)
  k = 1
  返回 min(nums1[1], nums2[0]) = min(3, 2) = 2

结果：2.0
```

## 方法三：划分数组

直接在较短的数组上二分，找到划分点：

```javascript
function findMedianSortedArrays(nums1, nums2) {
    // 确保 nums1 是较短的数组
    if (nums1.length > nums2.length) {
        [nums1, nums2] = [nums2, nums1];
    }
    
    const m = nums1.length;
    const n = nums2.length;
    const half = Math.floor((m + n + 1) / 2);
    
    let left = 0;
    let right = m;
    
    while (left <= right) {
        const i = Math.floor((left + right) / 2);  // nums1的划分点
        const j = half - i;  // nums2的划分点
        
        const nums1Left = i === 0 ? -Infinity : nums1[i - 1];
        const nums1Right = i === m ? Infinity : nums1[i];
        const nums2Left = j === 0 ? -Infinity : nums2[j - 1];
        const nums2Right = j === n ? Infinity : nums2[j];
        
        if (nums1Left <= nums2Right && nums2Left <= nums1Right) {
            // 找到正确的划分
            if ((m + n) % 2 === 1) {
                return Math.max(nums1Left, nums2Left);
            } else {
                return (Math.max(nums1Left, nums2Left) + 
                        Math.min(nums1Right, nums2Right)) / 2;
            }
        } else if (nums1Left > nums2Right) {
            // nums1划分点太大，向左移
            right = i - 1;
        } else {
            // nums1划分点太小，向右移
            left = i + 1;
        }
    }
    
    return 0;  // 不会到达这里
}
```

## 划分法的思想

把两个数组各分成左右两部分：

```
nums1:  [左1] | [右1]
nums2:  [左2] | [右2]

要求：
1. 左边元素个数 = 右边元素个数（或多1）
2. max(左1, 左2) <= min(右1, 右2)
```

满足这两个条件，中位数就是左边的最大值（或与右边最小值的平均）。

## 复杂度分析

**方法二（找第k小）**：
- 时间复杂度：O(log(m+n))
- 空间复杂度：O(log(m+n))递归栈

**方法三（划分数组）**：
- 时间复杂度：O(log(min(m,n)))
- 空间复杂度：O(1)

## 小结

寻找两个正序数组中位数的要点：

1. **问题转化**：中位数 → 第k小元素
2. **二分排除**：每次排除k/2个元素
3. **边界处理**：数组用完、k=1等特殊情况
4. **划分法**：更优雅，直接在较短数组上二分

这是二分查找的终极应用，理解它需要深刻理解二分的本质：**每次排除一半**。
