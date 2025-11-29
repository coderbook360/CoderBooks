# 实战：分割数组的最大值（二分答案）

这道题我们在二分查找章节已经介绍过，这里从二分答案的角度分析。

## 问题描述

给定一个非负整数数组`nums`和一个整数`k`，你需要将这个数组分成`k`个非空的连续子数组。

设计一个算法使得这`k`个子数组各自和的**最大值最小**。

## 最小化最大值

"最大值最小"是二分答案的标志性词汇。

我们不直接求怎么分，而是换个问法：如果子数组和的最大值不超过`x`，最少需要分成几段？

## 答案空间

- **下界**：max(nums)，单个元素的最大值
- **上界**：sum(nums)，不分割

## 判断函数

给定上限`maxSum`，贪心地分割：每段尽可能长，直到加入下一个会超过上限。

```javascript
function canSplit(nums, k, maxSum) {
    let count = 1;
    let currentSum = 0;
    
    for (const num of nums) {
        if (currentSum + num > maxSum) {
            count++;
            currentSum = num;
        } else {
            currentSum += num;
        }
    }
    
    return count <= k;
}
```

## 完整实现

```javascript
function splitArray(nums, k) {
    let left = Math.max(...nums);
    let right = nums.reduce((a, b) => a + b, 0);
    
    while (left < right) {
        const mid = left + Math.floor((right - left) / 2);
        
        if (canSplit(nums, k, mid)) {
            right = mid;
        } else {
            left = mid + 1;
        }
    }
    
    return left;
}

function canSplit(nums, k, maxSum) {
    let count = 1;
    let currentSum = 0;
    
    for (const num of nums) {
        if (currentSum + num > maxSum) {
            count++;
            currentSum = num;
        }  else {
            currentSum += num;
        }
    }
    
    return count <= k;
}
```

## 与送包裹的对比

仔细看，这两道题几乎一模一样：

| 送包裹 | 分割数组 |
|-------|---------|
| weights | nums |
| days | k |
| 运载能力 | 子数组和上限 |
| 需要几天 | 需要分几段 |

它们的判断函数逻辑完全相同，都是贪心地划分。

## 二分答案的核心洞察

为什么"最小化最大值"适合二分答案？

因为存在单调性：
- 允许的最大值越大，分的段数越少
- 允许的最大值越小，分的段数越多

我们要找恰好能分成`k`段的最小上限。

## 复杂度分析

**时间复杂度**：O(n * log(sum - max))

**空间复杂度**：O(1)

## 小结

分割数组是"最小化最大值"类问题的代表。关键是：
1. 把"怎么分"转化为"给定上限，能否分成k段"
2. 用贪心策略实现判断函数
3. 二分找最小可行的上限
