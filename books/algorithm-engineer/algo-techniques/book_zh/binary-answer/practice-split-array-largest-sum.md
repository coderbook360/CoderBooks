# 实战：分割数组的最大值

> LeetCode 410. 分割数组的最大值 | 难度：困难

"最小化最大值"的经典问题，是二分答案的标志性题目。

---

## 题目描述

给定一个非负整数数组 `nums` 和一个整数 `k`，你需要将这个数组分成 `k` 个非空的连续子数组。

使得这 `k` 个子数组各自和的**最大值最小**。

**示例**：
```
输入：nums = [7, 2, 5, 10, 8], k = 2
输出：18
解释：
分成 [7, 2, 5] 和 [10, 8]
两个子数组的和分别为 14 和 18
最大值是 18，这是所有分割方式中最大值最小的

输入：nums = [1, 2, 3, 4, 5], k = 2
输出：9
解释：分成 [1, 2, 3, 4] 和 [5] → 最大 10
      分成 [1, 2, 3] 和 [4, 5] → 最大 9 ✓

输入：nums = [1, 4, 4], k = 3
输出：4
解释：每个元素单独一组 → 最大 4
```

---

## 思路分析

### 为什么这是二分答案？

核心观察：**最小化最大值** 这类问题天然适合二分答案。

1. **答案空间确定**：maxSum ∈ [max(nums), sum(nums)]
   - 最小：每段至少包含一个元素，所以最大段和 ≥ max(nums)
   - 最大：只分一段，最大段和 = sum(nums)

2. **单调性**：允许的最大子数组和越大，所需段数越少
   - maxSum = sum(nums) → 只需 1 段
   - maxSum = max(nums) → 可能需要 n 段

3. **可验证性**：给定 maxSum，可以 O(n) 贪心判断

### check 函数设计

```
给定 maxSum，贪心地分割：
- 从左到右累加元素
- 当累加和超过 maxSum 时，开始新的一段
- 统计需要多少段

如果需要的段数 ≤ k，说明 maxSum 可行
```

---

## 代码实现

```typescript
function splitArray(nums: number[], k: number): number {
  let left = Math.max(...nums);
  let right = nums.reduce((a, b) => a + b, 0);
  
  while (left < right) {
    const mid = left + Math.floor((right - left) / 2);
    
    if (canSplit(nums, mid, k)) {
      right = mid;  // mid 可行，尝试更小的最大值
    } else {
      left = mid + 1;
    }
  }
  
  return left;
}

function canSplit(nums: number[], maxSum: number, k: number): boolean {
  let count = 1;  // 当前段数，初始为1
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

---

## 执行过程详解

以 `nums = [7, 2, 5, 10, 8], k = 2` 为例：

**初始化**：
- left = max(7, 2, 5, 10, 8) = 10
- right = 7 + 2 + 5 + 10 + 8 = 32

**第一轮：mid = 21**
```
贪心分割过程：
  段1: 累加 7 → 7
       累加 2 → 9
       累加 5 → 14
       累加 10 → 24 > 21 → 分割！
  段2: 从 10 开始 → 10
       累加 8 → 18

段数 = 2 ≤ 2，可行！
right = 21
```

**第二轮：mid = 15**
```
贪心分割过程：
  段1: 7 + 2 + 5 = 14 ≤ 15
       14 + 10 = 24 > 15 → 分割！
  段2: 10 ≤ 15
       10 + 8 = 18 > 15 → 分割！
  段3: 8

段数 = 3 > 2，不可行！
left = 16
```

**第三轮：mid = 18**
```
贪心分割过程：
  段1: 7 + 2 + 5 = 14 ≤ 18
       14 + 10 = 24 > 18 → 分割！
  段2: 10 + 8 = 18 ≤ 18

段数 = 2 ≤ 2，可行！
right = 18
```

**第四轮：mid = 17**
```
贪心分割过程：
  段1: 7 + 2 + 5 = 14 ≤ 17
       14 + 10 = 24 > 17 → 分割！
  段2: 10 ≤ 17
       10 + 8 = 18 > 17 → 分割！
  段3: 8

段数 = 3 > 2，不可行！
left = 18
```

此时 `left = right = 18`，返回答案 **18**。

---

## 复杂度分析

- **时间复杂度**：O(n log S)，S = sum(nums)
  - 二分次数：O(log S)
  - 每次 check：O(n) 遍历数组
  
- **空间复杂度**：O(1)，只用常数额外空间

---

## 常见错误分析

### 错误1：check 函数返回条件写反

```typescript
// ❌ 错误：count >= k 是错的
return count >= k;

// ✅ 正确：count ≤ k 才可行
return count <= k;
```

**分析**：如果我们用 2 段就能满足，那么 k = 3 肯定也能满足（少分几段即可）。

### 错误2：忘记 count 初始化为 1

```typescript
// ❌ 错误：从 0 开始
let count = 0;
for (const num of nums) {
  if (currentSum + num > maxSum) {
    count++;
    currentSum = num;
  } else {
    currentSum += num;
  }
}

// ✅ 正确：从 1 开始（即使不分割，也至少有一段）
let count = 1;
```

### 错误3：边界选择错误

```typescript
// ❌ 错误：左边界从 0 开始
let left = 0;

// ✅ 正确：左边界是数组最大值
let left = Math.max(...nums);
```

**分析**：如果 maxSum < max(nums)，那么最大元素本身就无法放入任何一段。

### 错误4：使用错误的二分模板

```typescript
// ❌ 错误：找右边界（会找到可行范围的最右边）
if (canSplit(nums, mid, k)) {
  left = mid + 1;  // 错！
} else {
  right = mid;
}

// ✅ 正确：找左边界（找到可行范围的最左边）
if (canSplit(nums, mid, k)) {
  right = mid;  // 可行，尝试更小的值
} else {
  left = mid + 1;
}
```

---

## 动态规划对比

这道题也可以用 DP 解决：

```typescript
function splitArrayDP(nums: number[], k: number): number {
  const n = nums.length;
  // prefix[i] = nums[0..i-1] 的和
  const prefix = [0];
  for (const num of nums) {
    prefix.push(prefix[prefix.length - 1] + num);
  }
  
  // dp[i][j] = 将前 i 个元素分成 j 段的最小最大值
  const dp = Array.from({ length: n + 1 }, () => 
    Array(k + 1).fill(Infinity)
  );
  dp[0][0] = 0;
  
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= Math.min(i, k); j++) {
      // 枚举最后一段的起点
      for (let m = j - 1; m < i; m++) {
        const lastSegmentSum = prefix[i] - prefix[m];
        dp[i][j] = Math.min(dp[i][j], Math.max(dp[m][j - 1], lastSegmentSum));
      }
    }
  }
  
  return dp[n][k];
}
```

**复杂度对比**：

| 方法 | 时间复杂度 | 空间复杂度 |
|------|-----------|-----------|
| 二分答案 | O(n log S) | O(1) |
| 动态规划 | O(n²k) | O(nk) |

当 n 和 S 较大时，二分答案明显更高效。

---

## 相关题目

1. **LeetCode 1011. 在 D 天内送达包裹的能力** - 同样是"最小化最大值"
2. **书籍分配问题** - 完全相同的模型
3. **LeetCode 875. 爱吃香蕉的珂珂** - 类似的二分答案框架
4. **LeetCode 1482. 制作 m 束花所需的最少天数** - check 函数需要处理连续性

---

## 总结

分割数组最大值是二分答案的"教科书级"题目：

1. **识别信号**："最小化最大值" → 二分答案
2. **确定搜索空间**：[max(nums), sum(nums)]
3. **设计 check 函数**：贪心分割，统计段数
4. **选择正确模板**：找左边界（第一个可行解）

这道题的思维模式可以推广到大量类似问题，是算法面试的高频考点。
