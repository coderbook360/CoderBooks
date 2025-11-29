# 实战：搜索旋转排序数组

这是二分查找的经典难题。数组不再完全有序，但仍可以用二分查找。关键是找出哪一半是有序的。

## 问题描述

整数数组`nums`按升序排列，数组中的值**互不相同**。

在传递给函数之前，`nums`在预先未知的某个下标`k`上进行了旋转，使数组变为`[nums[k], nums[k+1], ..., nums[n-1], nums[0], nums[1], ..., nums[k-1]]`。

给你旋转后的数组`nums`和一个整数`target`，如果存在返回其下标，否则返回-1。

**示例**：
```
输入：nums = [4,5,6,7,0,1,2], target = 0
输出：4

输入：nums = [4,5,6,7,0,1,2], target = 3
输出：-1
```

## 思路分析

### 关键观察

旋转后的数组分成两段，每段都是有序的：

```
原数组：[0, 1, 2, 4, 5, 6, 7]
旋转后：[4, 5, 6, 7, 0, 1, 2]
        [有序段1] [有序段2]
```

### 二分策略

取中点`mid`后，至少有一半是有序的。

**如何判断哪一半有序？**
- 如果`nums[left] <= nums[mid]`：左半边有序
- 否则：右半边有序

**如何决定搜索方向？**
- 如果target在有序的那一半中，就在那边搜索
- 否则在另一半搜索

## 完整实现

```javascript
/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number}
 */
function search(nums, target) {
    let left = 0;
    let right = nums.length - 1;
    
    while (left <= right) {
        const mid = left + Math.floor((right - left) / 2);
        
        if (nums[mid] === target) {
            return mid;
        }
        
        // 判断哪一半有序
        if (nums[left] <= nums[mid]) {
            // 左半边有序
            if (target >= nums[left] && target < nums[mid]) {
                // target在左半边
                right = mid - 1;
            } else {
                // target在右半边
                left = mid + 1;
            }
        } else {
            // 右半边有序
            if (target > nums[mid] && target <= nums[right]) {
                // target在右半边
                left = mid + 1;
            } else {
                // target在左半边
                right = mid - 1;
            }
        }
    }
    
    return -1;
}
```

## 执行过程

```
nums = [4, 5, 6, 7, 0, 1, 2], target = 0

left=0, right=6

step 1:
  mid=3, nums[3]=7 ≠ 0
  nums[0]=4 <= nums[3]=7, 左半边有序
  target=0 不在 [4, 7) 中
  left = 4

step 2:
  mid=5, nums[5]=1 ≠ 0
  nums[4]=0 <= nums[5]=1, 左半边有序
  target=0 在 [0, 1) 中
  right = 4

step 3:
  mid=4, nums[4]=0 = target
  返回 4
```

## 为什么用 nums[left] <= nums[mid]？

不是`<`而是`<=`，因为当`left === mid`时（只剩两个元素），`nums[left] === nums[mid]`，这时左半边只有一个元素，是"有序"的。

## 变体：有重复元素

如果数组有重复元素，需要特殊处理`nums[left] === nums[mid]`的情况：

```javascript
function search(nums, target) {
    let left = 0;
    let right = nums.length - 1;
    
    while (left <= right) {
        const mid = left + Math.floor((right - left) / 2);
        
        if (nums[mid] === target) {
            return true;
        }
        
        // 无法判断哪边有序，缩小范围
        if (nums[left] === nums[mid]) {
            left++;
            continue;
        }
        
        if (nums[left] < nums[mid]) {
            if (target >= nums[left] && target < nums[mid]) {
                right = mid - 1;
            } else {
                left = mid + 1;
            }
        } else {
            if (target > nums[mid] && target <= nums[right]) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }
    }
    
    return false;
}
```

有重复元素时，最坏情况O(n)。

## 复杂度分析

**无重复元素**：
- 时间复杂度：O(log n)
- 空间复杂度：O(1)

**有重复元素**：
- 时间复杂度：O(n)最坏，平均O(log n)
- 空间复杂度：O(1)

## 小结

搜索旋转排序数组的要点：

1. **核心思路**：每次至少有一半是有序的
2. **判断有序**：比较`nums[left]`和`nums[mid]`
3. **决定方向**：target在有序的那一半中，还是另一半
4. **处理边界**：`<=`而不是`<`

这道题展示了二分查找的灵活性：即使数组不完全有序，只要能确定target在哪一半，就能用二分。
