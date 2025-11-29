# 实战：和可被K整除的子数组

这道题来自 LeetCode 974，是前缀和与哈希表技巧的进阶应用，引入了**同余**的概念。

## 题目描述

给定一个整数数组 `nums` 和一个整数 `k`，返回其中元素之和可被 `k` 整除的（连续、非空）子数组的数目。

**示例 1**：

```
输入：nums = [4,5,0,-2,-3,1], k = 5
输出：7
解释：有 7 个子数组满足其元素之和可被 k = 5 整除：
[4, 5, 0, -2, -3, 1], [5], [5, 0], [5, 0, -2, -3], [0], [0, -2, -3], [-2, -3]
```

**示例 2**：

```
输入：nums = [5], k = 9
输出：0
```

## 从"和为K"到"和能被K整除"

回顾前面学过的"和为 K 的子数组"：我们找满足 `prefix[j] - prefix[i] = k` 的配对。

这道题的条件变成：`prefix[j] - prefix[i]` 能被 k 整除。

用数学语言表达：

```
(prefix[j] - prefix[i]) % k == 0
```

这等价于：

```
prefix[j] % k == prefix[i] % k
```

也就是说，如果两个前缀和**对 k 同余**，它们的差就能被 k 整除。

## 关键洞察：同余分组

这个发现非常重要：我们不再需要记录具体的前缀和，只需要记录**前缀和对 k 的余数**。

余数相同的前缀和可以两两配对，每一对都对应一个"和能被 k 整除"的子数组。

## 处理负数余数

JavaScript（以及大多数编程语言）对负数取余可能得到负数：

```javascript
-1 % 5  // 结果是 -1，不是 4
```

但在数学上，我们希望余数总是在 `[0, k-1]` 范围内。修正方法：

```javascript
((n % k) + k) % k
```

这样 `-1 % 5` 就会得到 4。

## 代码实现

```javascript
function subarraysDivByK(nums, k) {
    // remainderCount[r] 表示前缀和余数为 r 的个数
    const remainderCount = new Array(k).fill(0);
    remainderCount[0] = 1; // 空前缀的余数是 0
    
    let prefixSum = 0;
    let count = 0;
    
    for (const num of nums) {
        prefixSum += num;
        
        // 计算当前前缀和对 k 的余数（处理负数）
        const remainder = ((prefixSum % k) + k) % k;
        
        // 之前有多少个前缀和的余数相同，就能配对多少个
        count += remainderCount[remainder];
        
        // 更新计数
        remainderCount[remainder]++;
    }
    
    return count;
}
```

## 图解执行过程

以 `nums = [4, 5, 0, -2, -3, 1], k = 5` 为例：

```
初始：remainderCount = [1, 0, 0, 0, 0], count = 0

i = 0, num = 4:
  prefixSum = 4
  remainder = 4 % 5 = 4
  count += remainderCount[4] = 0
  remainderCount = [1, 0, 0, 0, 1]

i = 1, num = 5:
  prefixSum = 9
  remainder = 9 % 5 = 4
  count += remainderCount[4] = 1 → count = 1
  remainderCount = [1, 0, 0, 0, 2]

i = 2, num = 0:
  prefixSum = 9
  remainder = 9 % 5 = 4
  count += remainderCount[4] = 2 → count = 3
  remainderCount = [1, 0, 0, 0, 3]

i = 3, num = -2:
  prefixSum = 7
  remainder = 7 % 5 = 2
  count += remainderCount[2] = 0
  remainderCount = [1, 0, 1, 0, 3]

i = 4, num = -3:
  prefixSum = 4
  remainder = 4 % 5 = 4
  count += remainderCount[4] = 3 → count = 6
  remainderCount = [1, 0, 1, 0, 4]

i = 5, num = 1:
  prefixSum = 5
  remainder = 5 % 5 = 0
  count += remainderCount[0] = 1 → count = 7
  remainderCount = [2, 0, 1, 0, 4]

最终 count = 7
```

## 为什么用数组而不是 Map

因为余数的范围是固定的 `[0, k-1]`，我们可以直接用长度为 k 的数组代替哈希表，这样更高效。

但如果 k 非常大（比如 10^9），就应该用 Map 来避免内存浪费。

## 与"和为K"的对比

| 题目 | 查找条件 | 存储内容 |
|-----|---------|---------|
| 和为K | `prefix[j] - prefix[i] == k` | 前缀和的值 |
| 和能被K整除 | `prefix[j] % k == prefix[i] % k` | 前缀和的余数 |

本质上是同一个思路，只是从"精确匹配"变成了"同余匹配"。

## 复杂度分析

**时间复杂度**：O(n)，遍历数组一次

**空间复杂度**：O(k)，存储 k 个可能的余数

## 小结

这道题的核心技巧是**同余原理**：

- `(a - b) % k == 0` 等价于 `a % k == b % k`
- 记录前缀和的余数，而不是前缀和本身
- 余数相同的前缀和可以两两配对

记住处理负数余数的技巧：`((n % k) + k) % k`
