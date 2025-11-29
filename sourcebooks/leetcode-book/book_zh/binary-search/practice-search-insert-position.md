# 实战：搜索插入位置

这是二分查找变体的入门题，要找的不是target本身，而是它"应该在的位置"。

## 问题描述

给定一个排序数组和一个目标值，在数组中找到目标值，并返回其索引。如果目标值不存在于数组中，返回它将会被按顺序插入的位置。

请使用O(log n)时间复杂度。

**示例**：
```
输入：nums = [1,3,5,6], target = 5
输出：2

输入：nums = [1,3,5,6], target = 2
输出：1
解释：2应该插入到索引1的位置

输入：nums = [1,3,5,6], target = 7
输出：4
解释：7应该插入到末尾
```

## 思路分析

插入位置 = **第一个大于等于target的位置**

这就是`lower_bound`函数。

## 完整实现

```javascript
/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number}
 */
function searchInsert(nums, target) {
    let left = 0;
    let right = nums.length;  // 注意：right = nums.length
    
    while (left < right) {  // 注意：left < right
        const mid = left + Math.floor((right - left) / 2);
        
        if (nums[mid] >= target) {
            right = mid;
        } else {
            left = mid + 1;
        }
    }
    
    return left;
}
```

## 为什么right = nums.length？

因为target可能比所有元素都大，应该插入到末尾。

如果用`right = nums.length - 1`，就无法表示这种情况。

## 执行过程

```
nums = [1, 3, 5, 6], target = 2

初始：left=0, right=4

step 1: mid=2, nums[2]=5 >= 2, right=2
step 2: mid=1, nums[1]=3 >= 2, right=1
step 3: mid=0, nums[0]=1 < 2, left=1

left = right = 1, 返回1
```

```
nums = [1, 3, 5, 6], target = 7

初始：left=0, right=4

step 1: mid=2, nums[2]=5 < 7, left=3
step 2: mid=3, nums[3]=6 < 7, left=4

left = right = 4, 返回4
```

## 另一种写法：闭区间

```javascript
function searchInsert(nums, target) {
    let left = 0;
    let right = nums.length - 1;
    
    while (left <= right) {
        const mid = left + Math.floor((right - left) / 2);
        
        if (nums[mid] >= target) {
            right = mid - 1;
        } else {
            left = mid + 1;
        }
    }
    
    return left;
}
```

最终`left`就是第一个 >= target的位置。

## 理解返回值

无论target是否存在：
- 如果存在：返回它的位置
- 如果不存在：返回它应该插入的位置（保持有序）

两种情况都是"第一个 >= target的位置"。

## 复杂度分析

**时间复杂度**：O(log n)

**空间复杂度**：O(1)

## 小结

搜索插入位置的要点：

1. **问题转化**：插入位置 = lower_bound
2. **左闭右开**：`right = nums.length`，`while (left < right)`
3. **统一处理**：存在和不存在的情况用同一个公式

这是理解二分查找变体的关键题目。
