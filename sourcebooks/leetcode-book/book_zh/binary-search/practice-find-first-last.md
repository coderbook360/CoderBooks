# 实战：在排序数组中查找元素的第一个和最后一个位置

这道题综合了二分查找的两种边界变体：找第一个和找最后一个。

## 问题描述

给你一个按非递减顺序排列的整数数组`nums`，和一个目标值`target`。找出给定目标值在数组中的开始位置和结束位置。

如果数组中不存在目标值，返回`[-1, -1]`。

必须设计并实现时间复杂度为O(log n)的算法。

**示例**：
```
输入：nums = [5,7,7,8,8,10], target = 8
输出：[3, 4]

输入：nums = [5,7,7,8,8,10], target = 6
输出：[-1, -1]
```

## 思路分析

分两步：
1. 用lower_bound找**第一个等于target**的位置
2. 用upper_bound找**第一个大于target**的位置，减1得到最后一个

## 完整实现

```javascript
/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
function searchRange(nums, target) {
    const first = lowerBound(nums, target);
    
    // 检查是否找到
    if (first === nums.length || nums[first] !== target) {
        return [-1, -1];
    }
    
    // 最后一个 = 第一个大于target的位置 - 1
    const last = upperBound(nums, target) - 1;
    
    return [first, last];
}

// 第一个 >= target 的位置
function lowerBound(nums, target) {
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
    
    return left;
}

// 第一个 > target 的位置
function upperBound(nums, target) {
    let left = 0;
    let right = nums.length;
    
    while (left < right) {
        const mid = left + Math.floor((right - left) / 2);
        
        if (nums[mid] > target) {
            right = mid;
        } else {
            left = mid + 1;
        }
    }
    
    return left;
}
```

## 执行过程

```
nums = [5, 7, 7, 8, 8, 10], target = 8

找 lowerBound(8)：
left=0, right=6
mid=3, nums[3]=8 >= 8, right=3
mid=1, nums[1]=7 < 8, left=2
mid=2, nums[2]=7 < 8, left=3
返回 3

检查：nums[3] = 8 = target ✓

找 upperBound(8)：
left=0, right=6
mid=3, nums[3]=8 不大于 8, left=4
mid=5, nums[5]=10 > 8, right=5
mid=4, nums[4]=8 不大于 8, left=5
返回 5

last = 5 - 1 = 4

结果：[3, 4]
```

## 另一种实现：两次找左边界

```javascript
function searchRange(nums, target) {
    const first = findFirst(nums, target);
    
    if (first === -1) {
        return [-1, -1];
    }
    
    // 找 target + 1 的左边界，再减1
    const last = lowerBound(nums, target + 1) - 1;
    
    return [first, last];
}

function findFirst(nums, target) {
    const pos = lowerBound(nums, target);
    return (pos < nums.length && nums[pos] === target) ? pos : -1;
}
```

## 统一写法

只用一个函数：

```javascript
function searchRange(nums, target) {
    // 左边界：第一个 >= target
    const left = binarySearch(nums, target, true);
    
    // 右边界：第一个 > target 减 1
    const right = binarySearch(nums, target, false) - 1;
    
    if (left <= right && nums[left] === target) {
        return [left, right];
    }
    
    return [-1, -1];
}

function binarySearch(nums, target, findFirst) {
    let lo = 0;
    let hi = nums.length;
    
    while (lo < hi) {
        const mid = lo + Math.floor((hi - lo) / 2);
        
        // findFirst: >= target
        // !findFirst: > target
        if (nums[mid] > target || (findFirst && nums[mid] === target)) {
            hi = mid;
        } else {
            lo = mid + 1;
        }
    }
    
    return lo;
}
```

## 复杂度分析

**时间复杂度**：O(log n)
- 两次二分查找，每次O(log n)

**空间复杂度**：O(1)

## 小结

查找第一个和最后一个位置的要点：

1. **两次二分**：lower_bound + upper_bound
2. **边界关系**：`last = upperBound(target) - 1`
3. **存在性检查**：lower_bound返回后要验证值是否等于target
4. **统一接口**：可以用一个函数的参数控制行为

这是二分查找变体的综合应用，掌握它就掌握了边界查找的精髓。
