# 实战：最大连续 1 的个数

这是一道"计数器模式"的入门题。虽然简单，但它建立了一个重要的思维模型：**如何高效统计连续元素**。

---

## 题目描述

**LeetCode 485. Max Consecutive Ones**

给定一个二进制数组 `nums`，计算其中最大连续 `1` 的个数。

**示例 1**：

```
输入：nums = [1,1,0,1,1,1]
输出：3
解释：开头的两位和最后的三位都是连续 1，所以最大连续 1 的个数是 3。
```

**示例 2**：

```
输入：nums = [1,0,1,1,0,1]
输出：2
```

**提示**：
- 1 <= nums.length <= 10^5
- nums[i] 不是 0 就是 1

---

## 问题分析

首先要问一个问题：**"连续"意味着什么？**

连续意味着：
- 遇到目标元素（1），计数累加
- 遇到非目标元素（0），计数重置

这就是经典的**计数器模式**。

---

## 解法：双变量计数

维护两个变量：
- `count`：当前连续 1 的个数
- `maxCount`：历史最大连续 1 的个数

```javascript
function findMaxConsecutiveOnes(nums) {
  let count = 0;
  let maxCount = 0;
  
  for (const num of nums) {
    if (num === 1) {
      count++;
      maxCount = Math.max(maxCount, count);
    } else {
      count = 0;  // 遇到 0，重置计数
    }
  }
  
  return maxCount;
}
```

**复杂度分析**：
- 时间复杂度：O(n)
- 空间复杂度：O(1)

---

## 执行过程可视化

用 `[1, 1, 0, 1, 1, 1]` 走一遍：

```
i=0, num=1: count=1, maxCount=1
i=1, num=1: count=2, maxCount=2
i=2, num=0: count=0, maxCount=2  ← 重置
i=3, num=1: count=1, maxCount=2
i=4, num=1: count=2, maxCount=2
i=5, num=1: count=3, maxCount=3  ← 新最大

输出：3
```

图示：
```
nums:     [1, 1, 0, 1, 1, 1]
count:     1  2  0  1  2  3
maxCount:  1  2  2  2  2  3
                         ↑
                       最终答案
```

---

## 关键细节：最值更新时机

有两种写法，效果相同：

**写法一：遇 1 时更新（推荐）**

```javascript
if (num === 1) {
  count++;
  maxCount = Math.max(maxCount, count);
} else {
  count = 0;
}
```

逻辑统一，无需额外处理。

**写法二：遇 0 时更新**

```javascript
if (num === 1) {
  count++;
} else {
  maxCount = Math.max(maxCount, count);
  count = 0;
}
// 关键：循环结束后还要再更新一次
return Math.max(maxCount, count);
```

这种写法需要**在循环后额外处理**，因为如果数组以 1 结尾，最后一段连续 1 不会触发更新。

```javascript
// 比如 [0, 1, 1]
// 遍历结束时 count=2，但 maxCount 还没更新
// 必须在循环后再 Math.max 一次
```

---

## 计数器模式总结

这道题展示了处理"连续元素"问题的通用模式：

```javascript
let count = 0;
let maxCount = 0;

for (const item of array) {
  if (满足条件) {
    count++;
    maxCount = Math.max(maxCount, count);
  } else {
    count = 0;  // 重置
  }
}

return maxCount;
```

这个模式适用于：
- 最长连续相同元素
- 最长连续满足某条件的子序列
- 等等

---

## 边界情况

- **全是 1**：如 `[1, 1, 1]`，返回 3
- **全是 0**：如 `[0, 0, 0]`，返回 0
- **单个元素**：如 `[1]` 返回 1，`[0]` 返回 0
- **末尾是 1**：如 `[0, 1, 1]`，确保最后一段被计入

---

## 拓展思考

这道题有几个变体：

- **LeetCode 487**：最多翻转一个 0，求最长连续 1（需要滑动窗口）
- **LeetCode 1004**：最多翻转 K 个 0，求最长连续 1

这些进阶题目需要更复杂的技巧，我们会在后面的章节中学习。

---

## 本章小结

计数器模式是处理"连续"问题的基本模式：
- 满足条件：累加
- 不满足：重置
- 实时更新最大值

这个简单的模式是很多复杂算法的基础，比如滑动窗口、动态规划等。掌握它，为后续学习打下基础。
