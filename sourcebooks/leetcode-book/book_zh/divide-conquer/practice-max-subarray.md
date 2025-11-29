# 实战：最大子数组和

这道题展示了分治在数组问题中的应用。

## 问题描述

给你一个整数数组`nums`，请你找出一个具有最大和的连续子数组（子数组最少包含一个元素），返回其最大和。

## 思路分析

### 动态规划（常规解法）

```javascript
function maxSubArray(nums) {
    let maxSum = nums[0];
    let currentSum = nums[0];
    
    for (let i = 1; i < nums.length; i++) {
        currentSum = Math.max(nums[i], currentSum + nums[i]);
        maxSum = Math.max(maxSum, currentSum);
    }
    
    return maxSum;
}
```

这是O(n)的解法，但我们来看看分治如何解决这个问题。

### 分治思路

将数组分成左右两半，最大子数组要么：
1. 完全在左半部分
2. 完全在右半部分
3. 跨越中点

前两种情况递归解决，第三种情况单独处理。

## 分治实现

```javascript
function maxSubArray(nums) {
    return divideAndConquer(nums, 0, nums.length - 1);
}

function divideAndConquer(nums, left, right) {
    if (left === right) {
        return nums[left];
    }
    
    const mid = Math.floor((left + right) / 2);
    
    // 左半部分的最大子数组和
    const leftMax = divideAndConquer(nums, left, mid);
    
    // 右半部分的最大子数组和
    const rightMax = divideAndConquer(nums, mid + 1, right);
    
    // 跨越中点的最大子数组和
    const crossMax = maxCrossing(nums, left, mid, right);
    
    return Math.max(leftMax, rightMax, crossMax);
}

function maxCrossing(nums, left, mid, right) {
    // 从mid向左扩展的最大和
    let leftSum = -Infinity;
    let sum = 0;
    for (let i = mid; i >= left; i--) {
        sum += nums[i];
        leftSum = Math.max(leftSum, sum);
    }
    
    // 从mid+1向右扩展的最大和
    let rightSum = -Infinity;
    sum = 0;
    for (let i = mid + 1; i <= right; i++) {
        sum += nums[i];
        rightSum = Math.max(rightSum, sum);
    }
    
    return leftSum + rightSum;
}
```

## 图解

```
nums = [-2, 1, -3, 4, -1, 2, 1, -5, 4]

分解:
[-2, 1, -3, 4] | [-1, 2, 1, -5, 4]

左半部分:
[-2, 1] | [-3, 4]
最大: 4

右半部分:
[-1, 2, 1] | [-5, 4]
最大: 3 (子数组[2, 1])

跨越中点:
从4向左: 4, 4+(-3)=1, 1+1=2, 2+(-2)=0 → 最大4
从-1向右: -1, -1+2=1, 1+1=2, 2+(-5)=-3, -3+4=1 → 最大2
跨越最大: 4 + 2 = 6

最终结果: max(4, 3, 6) = 6
```

## 为什么分治可行？

### 子问题独立

左半部分和右半部分可以独立求解。

### 可以合并

跨越中点的情况可以通过O(n)扫描找到。

### 递归结构

T(n) = 2T(n/2) + O(n) = O(n log n)

## 分治 vs 动态规划

| 方法 | 时间复杂度 | 空间复杂度 | 特点 |
|-----|-----------|-----------|------|
| DP | O(n) | O(1) | 最优 |
| 分治 | O(n log n) | O(log n) | 思路清晰 |

这道题DP更优，但分治提供了另一种思考角度。

## 扩展：线段树

分治思路可以扩展为线段树，支持：
- 区间查询最大子数组和
- 单点更新

每个节点存储四个值：
- 区间和
- 最大前缀和
- 最大后缀和
- 最大子数组和

```javascript
// 合并两个区间
function merge(leftNode, rightNode) {
    return {
        sum: leftNode.sum + rightNode.sum,
        maxPrefix: Math.max(leftNode.maxPrefix, leftNode.sum + rightNode.maxPrefix),
        maxSuffix: Math.max(rightNode.maxSuffix, rightNode.sum + leftNode.maxSuffix),
        maxSubarray: Math.max(
            leftNode.maxSubarray,
            rightNode.maxSubarray,
            leftNode.maxSuffix + rightNode.maxPrefix
        )
    };
}
```

## 复杂度分析

**时间复杂度**：O(n log n)
- T(n) = 2T(n/2) + O(n)

**空间复杂度**：O(log n)，递归栈深度

## 小结

最大子数组和的分治解法展示了：
1. 如何处理"跨越边界"的情况
2. 分治不一定最优，但提供了不同的思路
3. 分治思路可以扩展为线段树，支持更复杂的操作
