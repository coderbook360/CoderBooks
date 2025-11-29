# 实战：和为K的子数组个数

这道题和上一章的"子数组和为K"本质上是同一道题（LeetCode 560），但我们从另一个角度来理解它，加深对前缀和技巧的掌握。

## 题目回顾

给定一个整数数组 `nums` 和一个整数 `k`，统计和为 `k` 的子数组的**个数**。

## 换一个理解角度

上一章我们用"查找差值"的思路：对于每个位置 j，查找有多少个 i 满足 `prefix[j+1] - prefix[i] = k`。

这一章，让我们从"配对"的角度重新理解这个问题。

### 配对思维

想象前缀和数组 `prefix` 中的每个值都是一个"节点"。如果两个节点的差值恰好为 k，它们就能"配对"成功，代表一个和为 k 的子数组。

```
prefix = [0, a, b, c, d, e, ...]
```

我们要统计的是：有多少对 `(prefix[i], prefix[j])` 满足 `j > i` 且 `prefix[j] - prefix[i] = k`。

### 计数技巧

为了避免重复统计，我们**从左到右**遍历，对于每个位置 j：
- 先看前面有多少个节点能和当前节点配对
- 再把当前节点加入"候选池"

这样可以保证 `i < j`，不会重复计数。

## 代码实现

```javascript
function subarraySum(nums, k) {
    const prefixCount = new Map();
    prefixCount.set(0, 1); // 初始节点：前缀和为 0
    
    let currentSum = 0;
    let count = 0;
    
    for (const num of nums) {
        // 更新当前前缀和
        currentSum += num;
        
        // 寻找能配对的节点：需要 prefix = currentSum - k
        const target = currentSum - k;
        if (prefixCount.has(target)) {
            count += prefixCount.get(target);
        }
        
        // 把当前节点加入候选池
        prefixCount.set(currentSum, (prefixCount.get(currentSum) || 0) + 1);
    }
    
    return count;
}
```

## 处理重复前缀和

一个关键问题是：**前缀和可能重复**。

比如 `nums = [1, -1, 1, -1, 1]`：

```
prefix = [0, 1, 0, 1, 0, 1]
```

前缀和 0 出现了 3 次，前缀和 1 出现了 3 次。

如果 `k = 0`，那么任意两个相同的前缀和都能配对。这就是为什么我们用哈希表记录**计数**而不是简单地记录是否存在。

让我们验证 `nums = [1, -1, 1], k = 0`：

```
初始：prefixCount = {0: 1}

i = 0, currentSum = 1
  target = 1 - 0 = 1，不存在
  prefixCount = {0: 1, 1: 1}

i = 1, currentSum = 0
  target = 0 - 0 = 0，存在 1 个 → count = 1
  prefixCount = {0: 2, 1: 1}

i = 2, currentSum = 1
  target = 1 - 0 = 1，存在 1 个 → count = 2
  prefixCount = {0: 2, 1: 2}
```

结果是 2，对应子数组 `[1, -1]` 和 `[-1, 1]`。

## 为什么顺序很重要

注意代码中的顺序：**先查找，再更新**。

```javascript
// 正确顺序
if (prefixCount.has(target)) {
    count += prefixCount.get(target);
}
prefixCount.set(currentSum, ...);

// 错误顺序会导致自己和自己配对
prefixCount.set(currentSum, ...);  // 先更新
if (prefixCount.has(target)) {     // 再查找可能找到自己
    count += prefixCount.get(target);
}
```

如果先更新再查找，当 `k = 0` 时，当前节点可能和自己配对，导致错误计数。

## 边界情况分析

**1. 整个数组的和为 k**

```
nums = [1, 2], k = 3
prefix = [0, 1, 3]
```

遍历到最后，`currentSum = 3`，`target = 0`。初始化的 `prefixCount[0] = 1` 正好能配对，找到子数组 `[1, 2]`。

**2. 空子数组的处理**

题目要求子数组非空，所以 `prefixCount[0] = 1` 代表的是"空前缀"，配对后得到的子数组一定非空。

**3. 包含负数**

```
nums = [1, -1, 0], k = 0
```

和为 0 的子数组有：`[1, -1]`、`[-1, 0, 1]`... 等等，负数不影响算法正确性。

## 复杂度分析

**时间复杂度**：O(n)，遍历数组一次

**空间复杂度**：O(n)，哈希表存储前缀和计数

## 小结

这道题的两种理解方式：

1. **差值查找**：对于每个 j，找有多少个 i 满足 `prefix[j+1] - prefix[i] = k`
2. **节点配对**：统计有多少对节点差值为 k

两种方式本质相同，但"配对"的视角更直观，也更容易理解为什么要先查找再更新。

**核心公式**：`prefix[j] - prefix[i] = k` 等价于 `prefix[i] = prefix[j] - k`
