# 实战：子数组和为K

这道题来自 LeetCode 560，是前缀和与哈希表结合的经典应用。

## 题目描述

给你一个整数数组 `nums` 和一个整数 `k`，请你统计并返回该数组中和为 `k` 的子数组的个数。

子数组是数组中元素的连续非空序列。

**示例 1**：

```
输入：nums = [1,1,1], k = 2
输出：2
解释：[1,1] 和 [1,1] 是两个和为 2 的子数组
```

**示例 2**：

```
输入：nums = [1,2,3], k = 3
输出：2
解释：[1,2] 和 [3] 是两个和为 3 的子数组
```

## 暴力解法：枚举所有子数组

最直接的思路是枚举所有可能的子数组，计算每个子数组的和：

```javascript
function subarraySum(nums, k) {
    let count = 0;
    const n = nums.length;
    
    for (let i = 0; i < n; i++) {
        let sum = 0;
        for (let j = i; j < n; j++) {
            sum += nums[j];
            if (sum === k) {
                count++;
            }
        }
    }
    
    return count;
}
```

时间复杂度 O(n²)，当数组很大时会超时。能否更快？

## 前缀和的视角

让我们换一个角度思考。定义 `prefix[i]` 为 `nums[0..i-1]` 的和，那么子数组 `nums[i..j]` 的和就是：

```
sum(i, j) = prefix[j+1] - prefix[i]
```

题目要求的是：有多少对 (i, j) 满足 `prefix[j+1] - prefix[i] = k`？

换个写法：

```
prefix[i] = prefix[j+1] - k
```

这意味着：对于每个位置 j，我们需要找有多少个位置 i（i <= j）满足 `prefix[i] = prefix[j+1] - k`。

## 哈希表优化

如果我们用哈希表记录每个前缀和出现的次数，就可以在 O(1) 时间内完成查找。

算法步骤：
1. 维护一个哈希表 `prefixCount`，记录每个前缀和出现的次数
2. 遍历数组，累加当前前缀和 `sum`
3. 查询 `prefixCount[sum - k]`，这就是以当前位置结尾、和为 k 的子数组个数
4. 把当前前缀和加入哈希表

```javascript
function subarraySum(nums, k) {
    // prefixCount[sum] 表示前缀和为 sum 的个数
    const prefixCount = new Map();
    prefixCount.set(0, 1); // 空前缀的和为 0
    
    let sum = 0;
    let count = 0;
    
    for (const num of nums) {
        sum += num;
        
        // 查找有多少个前缀和等于 sum - k
        if (prefixCount.has(sum - k)) {
            count += prefixCount.get(sum - k);
        }
        
        // 更新当前前缀和的计数
        prefixCount.set(sum, (prefixCount.get(sum) || 0) + 1);
    }
    
    return count;
}
```

## 图解执行过程

以 `nums = [1, 2, 3], k = 3` 为例：

```
初始状态：sum = 0, count = 0, prefixCount = {0: 1}

i = 0, num = 1:
  sum = 1
  查找 sum - k = 1 - 3 = -2，不存在
  prefixCount = {0: 1, 1: 1}

i = 1, num = 2:
  sum = 3
  查找 sum - k = 3 - 3 = 0，存在 1 个
  count = 1 （对应子数组 [1, 2]）
  prefixCount = {0: 1, 1: 1, 3: 1}

i = 2, num = 3:
  sum = 6
  查找 sum - k = 6 - 3 = 3，存在 1 个
  count = 2 （对应子数组 [3]）
  prefixCount = {0: 1, 1: 1, 3: 1, 6: 1}

最终 count = 2
```

## 为什么初始化 prefixCount[0] = 1

这是一个容易忽略的细节。`prefixCount.set(0, 1)` 的含义是：**"空前缀"的和为 0，出现了 1 次**。

它处理的是"从数组开头到某位置的子数组和恰好为 k"的情况。

举例：`nums = [3], k = 3`

- 遍历到 num = 3 时，sum = 3
- 查找 `sum - k = 0`
- 如果没有预设 `prefixCount[0] = 1`，就找不到这个子数组

## 为什么不能用双指针

你可能会想：这题能用滑动窗口或双指针吗？

答案是**不能**，因为数组元素可能为负数。当存在负数时，窗口和并不随窗口扩大而单调增加，双指针的移动逻辑就失效了。

只有当数组元素全为正数时，才能用双指针优化。

## 复杂度分析

**时间复杂度**：O(n)，遍历数组一次

**空间复杂度**：O(n)，哈希表最多存储 n 个不同的前缀和

## 小结

这道题的核心技巧是**前缀和 + 哈希表**：

- 把"和为 k 的子数组"转化为"两个前缀和之差等于 k"
- 用哈希表快速查找满足条件的前缀和个数

这个技巧在很多题目中都会用到，比如下一章的"和为 K 的子数组个数"。
