# 实战：找出第K小的距离对

这是一道结合排序、双指针和二分答案的综合题。

## 问题描述

给定一个整数数组`nums`和一个正整数`k`，找出所有点对`(nums[i], nums[j])`中第`k`小的距离。

两点距离定义为`|nums[i] - nums[j]|`。

## 思路分析

### 暴力法的问题

枚举所有点对需要O(n²)，如果n很大会超时。

### 二分答案

换个思路：不枚举点对，而是二分"距离值"。

对于给定的距离`d`，数组中有多少对点的距离`≤d`？如果能快速回答这个问题，就可以二分找到第k小的距离。

### 答案空间

- **下界**：0，两个相同的数
- **上界**：max(nums) - min(nums)

### 单调性

距离阈值越大，满足条件的点对越多。

## 如何快速统计

先排序数组。对于排序后的数组，距离`≤d`的点对可以用双指针统计。

对于每个右端点`j`，找到最小的`i`使得`nums[j] - nums[i] <= d`，则`j - i`就是以`j`为右端点的合法点对数。

```javascript
function countPairs(nums, d) {
    let count = 0;
    let i = 0;
    
    for (let j = 1; j < nums.length; j++) {
        while (nums[j] - nums[i] > d) {
            i++;
        }
        count += j - i;
    }
    
    return count;
}
```

## 完整实现

```javascript
function smallestDistancePair(nums, k) {
    nums.sort((a, b) => a - b);
    
    let left = 0;
    let right = nums[nums.length - 1] - nums[0];
    
    while (left < right) {
        const mid = left + Math.floor((right - left) / 2);
        
        if (countPairs(nums, mid) >= k) {
            right = mid;
        } else {
            left = mid + 1;
        }
    }
    
    return left;
}

function countPairs(nums, d) {
    let count = 0;
    let i = 0;
    
    for (let j = 1; j < nums.length; j++) {
        while (nums[j] - nums[i] > d) {
            i++;
        }
        count += j - i;
    }
    
    return count;
}
```

## 关键细节

### 为什么`countPairs >= k`时收缩右边界？

我们要找的是"恰好第k小"的距离。

当`count >= k`时，说明距离`≤mid`的点对至少有k对，答案可能是mid或更小，所以收缩右边界。

当`count < k`时，说明距离`≤mid`的点对不够k个，答案必须更大，所以收缩左边界。

### 答案一定存在吗？

是的。因为最终`left`会收敛到一个确实存在的距离值上——至少有一对点的距离正好是这个值。

## 复杂度分析

**时间复杂度**：O(n * log(n) + n * log(max - min))
- 排序：O(n * log(n))
- 二分：O(log(max - min))次，每次O(n)统计

**空间复杂度**：O(log n)，排序的栈空间

## 小结

这道题的精华在于：
1. 将"找第k小"转化为"统计≤d的数量"
2. 排序后用双指针高效统计
3. 二分找到临界的距离值

这种"值域二分+计数"的模式很重要，在很多"第k大/小"问题中都能用到。
