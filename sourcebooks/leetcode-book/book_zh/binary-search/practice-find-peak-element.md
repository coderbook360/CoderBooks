# 实战：寻找峰值

峰值是局部最大值，不需要数组完全有序，只需要有"上升-下降"的趋势，就可以用二分查找。

## 问题描述

峰值元素是指其值严格大于左右相邻值的元素。

给你一个整数数组`nums`，找到峰值元素并返回其索引。数组可能包含多个峰值，返回任何一个峰值所在位置即可。

假设`nums[-1] = nums[n] = -∞`。

必须实现时间复杂度为O(log n)的算法。

**示例**：
```
输入：nums = [1,2,3,1]
输出：2
解释：3 是峰值元素，返回其索引 2

输入：nums = [1,2,1,3,5,6,4]
输出：5 或 1
解释：索引 5 的元素 6 是峰值，索引 1 的元素 2 也是峰值
```

## 思路分析

### 关键观察

因为`nums[-1] = nums[n] = -∞`，数组一定存在峰值。

站在任意位置`mid`：
- 如果`nums[mid] < nums[mid + 1]`：右边有峰值
- 如果`nums[mid] > nums[mid + 1]`：左边有峰值（包括mid自己）

### 为什么？

想象爬山：
- 如果当前位置比右边低，说明山峰在右边
- 如果当前位置比右边高，说明山峰在左边（可能就是当前位置，或者在更左边）

## 完整实现

```javascript
/**
 * @param {number[]} nums
 * @return {number}
 */
function findPeakElement(nums) {
    let left = 0;
    let right = nums.length - 1;
    
    while (left < right) {
        const mid = left + Math.floor((right - left) / 2);
        
        if (nums[mid] < nums[mid + 1]) {
            // 上坡，峰值在右边
            left = mid + 1;
        } else {
            // 下坡或平，峰值在左边（包括mid）
            right = mid;
        }
    }
    
    return left;
}
```

## 为什么用 left < right？

因为我们要找峰值的位置，当`left === right`时就找到了。

如果用`left <= right`，需要额外处理`mid + 1`越界的情况。

## 执行过程

```
nums = [1, 2, 1, 3, 5, 6, 4]

left=0, right=6

step 1: mid=3, nums[3]=3 < nums[4]=5
  上坡，left = 4

step 2: mid=5, nums[5]=6 > nums[6]=4
  下坡，right = 5

step 3: mid=4, nums[4]=5 < nums[5]=6
  上坡，left = 5

left = right = 5, 返回5
```

## 为什么一定能找到峰值？

用反证法：

假设区间`[left, right]`没有峰值：
- 如果`nums[mid] < nums[mid+1]`，我们去`[mid+1, right]`
- 如果`nums[mid] > nums[mid+1]`，我们去`[left, mid]`

每次都往"更高"的方向走，由于边界是`-∞`，一定会遇到下降点，那就是峰值。

## 复杂度分析

**时间复杂度**：O(log n)
- 每次排除一半

**空间复杂度**：O(1)

## 变体：找山脉数组的峰顶

山脉数组是先严格上升后严格下降的数组：

```javascript
function peakIndexInMountainArray(arr) {
    let left = 0;
    let right = arr.length - 1;
    
    while (left < right) {
        const mid = left + Math.floor((right - left) / 2);
        
        if (arr[mid] < arr[mid + 1]) {
            left = mid + 1;
        } else {
            right = mid;
        }
    }
    
    return left;
}
```

和找峰值完全一样，因为山脉数组保证只有一个峰值。

## 小结

寻找峰值的要点：

1. **爬山思想**：向"更高"的方向走
2. **边界条件**：`nums[-1] = nums[n] = -∞`保证峰值存在
3. **二分策略**：比较`nums[mid]`和`nums[mid+1]`
4. **循环条件**：`left < right`，最终`left === right`是答案

这道题展示了二分查找的核心：**不需要完全有序，只需要能确定答案在哪一半**。
