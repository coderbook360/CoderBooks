# 最大连续1的个数

> LeetCode 485. Max Consecutive Ones

给定一个二进制数组（只包含 0 和 1），找出其中最大连续 1 的个数。

这是一道简单的计数题，但它引出的"连续计数"技巧在很多问题中都有应用。

## 问题描述

```javascript
输入：nums = [1, 1, 0, 1, 1, 1]
输出：3
解释：前两位和后三位都是连续的 1，最长的是后三位

输入：nums = [1, 0, 1, 1, 0, 1]
输出：2
```

## 思路分析

遍历数组，遇到 1 就计数，遇到 0 就重置计数器。同时维护一个全局最大值。

这就像数连续的台阶：
- 每踩到一级台阶（遇到 1），计数 +1
- 一旦踩空（遇到 0），从头开始数
- 记住你踩过的最长连续台阶数

## 解法详解

```javascript
function findMaxConsecutiveOnes(nums) {
    let maxCount = 0;      // 全局最大值
    let currentCount = 0;  // 当前连续计数
    
    for (const num of nums) {
        if (num === 1) {
            currentCount++;
            // 每次遇到 1，都检查是否破纪录
            maxCount = Math.max(maxCount, currentCount);
        } else {
            // 遇到 0，重置计数器
            currentCount = 0;
        }
    }
    
    return maxCount;
}
```

### 执行过程

以 `[1, 1, 0, 1, 1, 1]` 为例：

```
初始: maxCount=0, currentCount=0

num=1: currentCount=1, maxCount=max(0,1)=1
num=1: currentCount=2, maxCount=max(1,2)=2
num=0: currentCount=0, maxCount 不变=2
num=1: currentCount=1, maxCount=max(2,1)=2
num=1: currentCount=2, maxCount=max(2,2)=2
num=1: currentCount=3, maxCount=max(2,3)=3

返回 3
```

## 复杂度分析

**时间复杂度：O(n)**
- 只需遍历一次数组

**空间复杂度：O(1)**
- 只用了两个变量

## 边界情况

```javascript
// 没有 1
findMaxConsecutiveOnes([0])        // 0
findMaxConsecutiveOnes([0, 0, 0])  // 0

// 全是 1
findMaxConsecutiveOnes([1])        // 1
findMaxConsecutiveOnes([1, 1, 1])  // 3

// 1 在边界
findMaxConsecutiveOnes([1, 0, 0])  // 1（开头）
findMaxConsecutiveOnes([0, 0, 1])  // 1（结尾）
```

## 另一种写法

有些人喜欢在循环结束后再更新一次 `maxCount`：

```javascript
function findMaxConsecutiveOnes(nums) {
    let maxCount = 0;
    let currentCount = 0;
    
    for (const num of nums) {
        if (num === 1) {
            currentCount++;
        } else {
            maxCount = Math.max(maxCount, currentCount);
            currentCount = 0;
        }
    }
    
    // 处理以 1 结尾的情况
    return Math.max(maxCount, currentCount);
}
```

这种写法稍微节省一些比较操作，但需要记得在最后补一次更新。推荐第一种写法，更不容易出错。

## 相关题目

这道题有两个进阶版本：

**LeetCode 487. 最大连续1的个数 II**：
- 可以将**最多一个** 0 翻转成 1
- 需要滑动窗口技巧

**LeetCode 1004. 最大连续1的个数 III**：
- 可以将**最多 K 个** 0 翻转成 1
- 更复杂的滑动窗口

## 小结

这道题虽然简单，但展示了一个重要的编程模式：

**连续计数模式**：
1. 维护当前计数 `currentCount`
2. 满足条件时递增
3. 不满足条件时重置为 0
4. 同时维护全局最大值 `maxCount`

这个模式在统计"最长连续子数组"、"最大连续区间"等问题中频繁出现。掌握了它，遇到类似问题就能快速写出解法。
