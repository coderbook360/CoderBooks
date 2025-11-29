# 实战：分割数组的最大值

这是二分答案的又一经典题目，也可以用动态规划解决，但二分答案更直观高效。

## 问题描述

给定一个非负整数数组`nums`和一个整数`k`，你需要将这个数组分成`k`个非空的连续子数组。

设计一个算法使得这`k`个子数组各自和的**最大值最小**。

**示例**：
```
输入：nums = [7,2,5,10,8], k = 2
输出：18
解释：
最优分割：[7,2,5] 和 [10,8]
各自和为 14 和 18，最大值为 18
```

## 思路分析

### 问题转化

"使最大值最小" → 二分答案

设定一个"子数组和的最大值上限"，判断能否在这个上限下分成≤k组。

**答案范围**：
- 最小：max(nums)，每个元素独立一组
- 最大：sum(nums)，所有元素一组

## 完整实现

```javascript
/**
 * @param {number[]} nums
 * @param {number} k
 * @return {number}
 */
function splitArray(nums, k) {
    let left = Math.max(...nums);
    let right = nums.reduce((a, b) => a + b, 0);
    
    while (left < right) {
        const mid = left + Math.floor((right - left) / 2);
        
        if (canSplit(nums, k, mid)) {
            // 可以分成≤k组，尝试更小的上限
            right = mid;
        } else {
            // 分不了，需要更大的上限
            left = mid + 1;
        }
    }
    
    return left;
}

// 判断每组和不超过maxSum时，能否分成≤k组
function canSplit(nums, k, maxSum) {
    let groups = 1;
    let currentSum = 0;
    
    for (const num of nums) {
        if (currentSum + num > maxSum) {
            // 当前组放不下，新开一组
            groups++;
            currentSum = num;
            
            if (groups > k) {
                return false;
            }
        } else {
            currentSum += num;
        }
    }
    
    return true;
}
```

## 执行过程

```
nums = [7, 2, 5, 10, 8], k = 2

left = 10 (最大元素)
right = 32 (总和)

step 1: mid=21, canSplit(21) = true
  分组：[7,2,5] (14), [10,8] (18), 2组 ≤ 2 ✓
  right = 21

step 2: mid=15, canSplit(15) = false
  分组：[7,2,5] (14), [10] (10), [8] (8), 3组 > 2 ✗
  left = 16

step 3: mid=18, canSplit(18) = true
  分组：[7,2,5] (14), [10,8] (18), 2组 ≤ 2 ✓
  right = 18

step 4: mid=17, canSplit(17) = false
  分组：[7,2,5] (14), [10] (10), [8] (8), 3组 > 2 ✗
  left = 18

left = right = 18, 返回18
```

## 与"D天内送达"的对比

这两道题本质相同：

| 问题 | 限制 | 最小化 |
|-----|------|-------|
| D天内送达 | 最多D天 | 每天最大载重 |
| 分割数组 | 最多k组 | 每组最大和 |

都是在"分组数限制"下，找"单组最大值"的最小可能。

## 动态规划解法（对比）

```javascript
function splitArray(nums, k) {
    const n = nums.length;
    
    // 前缀和
    const prefix = new Array(n + 1).fill(0);
    for (let i = 0; i < n; i++) {
        prefix[i + 1] = prefix[i] + nums[i];
    }
    
    // dp[i][j] = 前i个数分成j组的最大值的最小值
    const dp = Array.from({ length: n + 1 }, () => 
        new Array(k + 1).fill(Infinity)
    );
    dp[0][0] = 0;
    
    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= Math.min(i, k); j++) {
            // 枚举最后一组的起点
            for (let p = j - 1; p < i; p++) {
                const lastSum = prefix[i] - prefix[p];
                dp[i][j] = Math.min(dp[i][j], Math.max(dp[p][j - 1], lastSum));
            }
        }
    }
    
    return dp[n][k];
}
```

时间O(n²k)，不如二分答案O(n log sum)高效。

## 复杂度分析

**二分答案**：
- 时间复杂度：O(n * log(sum - max))
- 空间复杂度：O(1)

**动态规划**：
- 时间复杂度：O(n²k)
- 空间复杂度：O(nk)

## 小结

分割数组最大值的要点：

1. **问题转化**：最大值最小 → 二分答案
2. **判断函数**：给定上限，贪心判断能否分成≤k组
3. **与送达包裹相同**：本质是同一类问题
4. **二分优于DP**：时间复杂度更优

"最大值最小"或"最小值最大"类问题，优先考虑二分答案。
