# 实战：打家劫舍II

环形数组的变体问题。

## 问题描述

房屋围成一圈，意味着第一个房屋和最后一个房屋是相邻的。

求不触动警报的情况下，能偷到的最高金额。

示例：
- 输入：`[2,3,2]`
- 输出：3（偷第2间房）

## 思路分析

环形意味着：首尾不能同时偷。

把问题分成两种情况：
1. 偷第一个，不偷最后一个：考虑`nums[0...n-2]`
2. 不偷第一个，偷最后一个：考虑`nums[1...n-1]`

取两种情况的最大值。

## 解法

```javascript
function rob(nums) {
    const n = nums.length;
    if (n === 0) return 0;
    if (n === 1) return nums[0];
    if (n === 2) return Math.max(nums[0], nums[1]);
    
    // 偷[0, n-2]
    const case1 = robRange(nums, 0, n - 2);
    // 偷[1, n-1]
    const case2 = robRange(nums, 1, n - 1);
    
    return Math.max(case1, case2);
}

function robRange(nums, start, end) {
    let prev2 = 0, prev1 = 0;
    
    for (let i = start; i <= end; i++) {
        const curr = Math.max(prev1, prev2 + nums[i]);
        prev2 = prev1;
        prev1 = curr;
    }
    
    return prev1;
}
```

## 为什么这样分割是正确的

考虑最优解：
- 如果最优解偷了第一个：那么不能偷最后一个，最优解在`[0, n-2]`中
- 如果最优解不偷第一个：最优解在`[1, n-1]`中

两种情况覆盖了所有可能。

## 边界处理

- n = 1：直接返回`nums[0]`
- n = 2：返回`max(nums[0], nums[1])`

## 复杂度分析

- **时间复杂度**：O(n)
- **空间复杂度**：O(1)

## 环形问题的通用技巧

环形数组的常见处理方法：
1. **断环**：像本题一样，分成两个线性问题
2. **复制**：把数组复制一份接在后面
3. **取模**：用`i % n`处理索引

## 小结

打家劫舍II展示了如何处理环形约束：
- 分析首尾的关系
- 拆分成两个线性问题
- 合并结果

这种"断环"思想在很多环形问题中都适用。
