# 实战：数组的度

这道题需要同时追踪多种信息：频次、首次位置、末次位置。让我们看看如何用哈希表优雅地解决这个**多信息聚合**问题。

---

## 题目描述

**LeetCode 697. Degree of an Array**

给定一个非空且只包含非负整数的整数数组 `nums`，数组的**度**的定义是指数组里任一元素出现频数的最大值。

你的任务是在 `nums` 中找到与 `nums` 拥有相同度的最短连续子数组，返回其长度。

**示例 1**：

```
输入：nums = [1,2,2,3,1]
输出：2
解释：
输入数组的度是 2，因为元素 1 和 2 的出现频数最大，都为 2。
连续子数组里面拥有相同度的有：[1,2,2,3,1], [1,2,2,3], [2,2,3,1], [1,2,2], [2,2,3], [2,2]
最短连续子数组 [2,2] 的长度为 2，所以返回 2。
```

**示例 2**：

```
输入：nums = [1,2,2,3,1,4,2]
输出：6
解释：
数组的度是 3，因为元素 2 出现了 3 次。
包含所有 2 的最短子数组是 [2,2,3,1,4,2]，长度为 6。
```

---

## 问题分析

首先要问一个问题：**题目到底在问什么？**

让我们拆解一下：
1. 找到数组的"度"（出现次数最多的元素的频次）
2. 找到**最短**的子数组，使得这个子数组的度等于原数组的度

再问第二个问题：**要使子数组的度等于原数组的度，子数组必须包含什么？**

答案是：必须包含某个出现次数等于度的元素的**所有出现**。

那么对于这个元素，最短的子数组就是**从它第一次出现到最后一次出现**的区间。

---

## 解题思路

我们需要收集三种信息：
1. **频次**：每个元素出现了多少次
2. **首次位置**：每个元素第一次出现的索引
3. **末次位置**：每个元素最后一次出现的索引

然后：
1. 找到度（最大频次）
2. 对于所有频次等于度的元素，计算区间长度
3. 取最短的区间

---

## 解法一：三个 Map（清晰版）

```javascript
function findShortestSubArray(nums) {
  const count = new Map();     // 频次
  const firstPos = new Map();  // 首次出现位置
  const lastPos = new Map();   // 末次出现位置
  
  // 一次遍历收集所有信息
  for (let i = 0; i < nums.length; i++) {
    const num = nums[i];
    
    // 更新频次
    count.set(num, (count.get(num) || 0) + 1);
    
    // 首次位置只记录第一次
    if (!firstPos.has(num)) {
      firstPos.set(num, i);
    }
    
    // 末次位置每次都更新
    lastPos.set(num, i);
  }
  
  // 找到度
  const degree = Math.max(...count.values());
  
  // 找最短子数组
  let minLen = nums.length;
  for (const [num, freq] of count) {
    if (freq === degree) {
      const len = lastPos.get(num) - firstPos.get(num) + 1;
      minLen = Math.min(minLen, len);
    }
  }
  
  return minLen;
}
```

**复杂度分析**：
- 时间复杂度：O(n)
- 空间复杂度：O(n)

---

## 解法二：单 Map 存对象（优化版）

可以把三种信息合并到一个对象中，减少代码冗余：

```javascript
function findShortestSubArray(nums) {
  // 每个元素存储：{ count, first, last }
  const info = new Map();
  
  for (let i = 0; i < nums.length; i++) {
    const num = nums[i];
    
    if (info.has(num)) {
      const data = info.get(num);
      data.count++;
      data.last = i;
    } else {
      info.set(num, { count: 1, first: i, last: i });
    }
  }
  
  // 一次遍历找度和最短长度
  let degree = 0;
  let minLen = nums.length;
  
  for (const { count, first, last } of info.values()) {
    const len = last - first + 1;
    
    if (count > degree) {
      // 发现更大的度，重置
      degree = count;
      minLen = len;
    } else if (count === degree) {
      // 度相同，取更短的
      minLen = Math.min(minLen, len);
    }
  }
  
  return minLen;
}
```

---

## 执行过程可视化

用 `[1, 2, 2, 3, 1]` 走一遍：

```
遍历过程：

i=0, num=1: 
  info = { 1: {count:1, first:0, last:0} }

i=1, num=2: 
  info = { 1: {...}, 2: {count:1, first:1, last:1} }

i=2, num=2: 
  info = { 1: {...}, 2: {count:2, first:1, last:2} }

i=3, num=3: 
  info = { ..., 3: {count:1, first:3, last:3} }

i=4, num=1: 
  info = { 1: {count:2, first:0, last:4}, 2: {...}, 3: {...} }

最终信息：
  1: count=2, first=0, last=4, len=5
  2: count=2, first=1, last=2, len=2
  3: count=1, first=3, last=3, len=1

度 = 2（最大频次）
候选元素：1 和 2（频次都是 2）
  元素 1 的区间长度：5
  元素 2 的区间长度：2

最短长度：min(5, 2) = 2
```

---

## 关键细节解析

### 区间长度怎么算？

```javascript
const len = last - first + 1;
```

注意要**加 1**，因为是闭区间。比如从索引 1 到索引 2，长度是 2，不是 1。

### 为什么要比较所有候选？

可能有多个元素的频次都等于度。我们要在所有候选中找**最短**的区间：

```javascript
// ❌ 错误：只取第一个找到的
if (freq === degree) {
  return last - first + 1;  // 可能不是最短！
}

// ✅ 正确：比较所有候选
if (freq === degree) {
  minLen = Math.min(minLen, last - first + 1);
}
```

---

## 边界情况

- **单元素**：如 `[1]`，度为 1，长度为 1
- **全相同**：如 `[2, 2, 2]`，度为 3，长度为整个数组
- **各不同**：如 `[1, 2, 3]`，度为 1，最短长度为 1

---

## 本章小结

这道题的核心是**问题分解**：
1. 求度 → 统计频次，找最大值
2. 找候选 → 哪些元素的出现次数等于度
3. 算长度 → 对每个候选，计算首末位置的区间长度

以及**信息聚合**：在一次遍历中同时收集频次、首次位置、末次位置。

这种"多信息聚合"的思维方式，在处理复杂问题时非常有用。当你发现需要多种信息时，不要急着写多个循环，先想想能不能在一次遍历中全部收集。
