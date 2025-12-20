# 实战：除自身以外数组的乘积

> LeetCode 238. 除自身以外数组的乘积 | 难度：中等

前缀积 + 后缀积的应用。

---

## 题目描述

给你一个整数数组 `nums`，返回数组 `answer`，其中 `answer[i]` 等于 `nums` 中除 `nums[i]` 之外其余各元素的乘积。

题目保证任意元素的全部前缀元素和后缀的乘积都在 32 位整数范围内。

**要求**：不能使用除法，时间复杂度 O(n)。

**示例**：
```
输入：nums = [1, 2, 3, 4]
输出：[24, 12, 8, 6]
```

---

## 思路分析

`answer[i] = 左边所有元素的乘积 × 右边所有元素的乘积`

定义：
- `prefix[i]`：nums[0] 到 nums[i-1] 的乘积
- `suffix[i]`：nums[i+1] 到 nums[n-1] 的乘积

则 `answer[i] = prefix[i] × suffix[i]`

---

## 方法一：两个数组

```typescript
function productExceptSelf(nums: number[]): number[] {
  const n = nums.length;
  const prefix = new Array(n).fill(1);
  const suffix = new Array(n).fill(1);
  
  // 计算前缀积
  for (let i = 1; i < n; i++) {
    prefix[i] = prefix[i - 1] * nums[i - 1];
  }
  
  // 计算后缀积
  for (let i = n - 2; i >= 0; i--) {
    suffix[i] = suffix[i + 1] * nums[i + 1];
  }
  
  // 合并结果
  const answer = new Array(n);
  for (let i = 0; i < n; i++) {
    answer[i] = prefix[i] * suffix[i];
  }
  
  return answer;
}
```

---

## 方法二：空间优化

用 answer 数组复用，只需 O(1) 额外空间。

```typescript
function productExceptSelf(nums: number[]): number[] {
  const n = nums.length;
  const answer = new Array(n).fill(1);
  
  // 第一遍：计算前缀积，存入 answer
  let prefix = 1;
  for (let i = 0; i < n; i++) {
    answer[i] = prefix;
    prefix *= nums[i];
  }
  
  // 第二遍：计算后缀积，同时乘入 answer
  let suffix = 1;
  for (let i = n - 1; i >= 0; i--) {
    answer[i] *= suffix;
    suffix *= nums[i];
  }
  
  return answer;
}
```

---

## 图示

```
nums = [1, 2, 3, 4]

第一遍（前缀积）:
answer = [1, 1, 2, 6]
         ↑  ↑  ↑  ↑
         1  1  1*2 1*2*3

第二遍（后缀积）:
i=3: answer[3] *= 1     → 6
i=2: answer[2] *= 4     → 8
i=1: answer[1] *= 12    → 12
i=0: answer[0] *= 24    → 24

返回 [24, 12, 8, 6]
```

---

## 复杂度分析

- **时间复杂度**：O(n)
- **空间复杂度**：O(1)（不算输出数组）

---

## 要点

- 不能用除法（考虑数组有 0 的情况）
- 前缀积和后缀积是前缀和的推广
- 空间优化：复用输出数组
