# 实战：乘积最大子数组

乘积最大子数组是最大子数组和的变体，但因为乘法的特殊性，需要同时维护最大值和最小值。

## 题目描述

给你一个整数数组 `nums`，请你找出数组中乘积最大的非空连续子数组（该子数组中至少包含一个数字），并返回该子数组所对应的乘积。

📎 [LeetCode 152. 乘积最大子数组](https://leetcode.cn/problems/maximum-product-subarray/)

**示例**：

```
输入：nums = [2, 3, -2, 4]
输出：6
解释：子数组 [2, 3] 有最大乘积 6

输入：nums = [-2, 0, -1]
输出：0
解释：结果不能为 2，因为 [-2, -1] 不是连续子数组
```

**约束**：
- `1 <= nums.length <= 2 * 10^4`
- `-10 <= nums[i] <= 10`
- 乘积保证是 32 位整数

## 思路分析

### 为什么不能直接套用最大子数组和的思路？

最大子数组和：负数只会让和变小，所以前面的和如果是负数就丢弃。

乘积的问题：**负负得正**！一个很小的负数乘以当前的负数，可能变成很大的正数。

```
例如：[-2, 3, -4]
位置 0: -2 (负数)
位置 1: 3 (正数，-2 × 3 = -6，不如重新开始)
位置 2: -4 (负数，-6 × -4 = 24！如果丢弃了 -6 就错了)
```

### 正确的状态定义

同时维护两个值：
- `maxProd[i]`：以 i 结尾的子数组的最大乘积
- `minProd[i]`：以 i 结尾的子数组的最小乘积

为什么需要最小乘积？因为当前元素是负数时，最小乘积乘以负数会变成最大乘积。

### 状态转移

```
如果 nums[i] >= 0:
  maxProd[i] = max(maxProd[i-1] * nums[i], nums[i])
  minProd[i] = min(minProd[i-1] * nums[i], nums[i])

如果 nums[i] < 0:
  maxProd[i] = max(minProd[i-1] * nums[i], nums[i])  // 最小变最大
  minProd[i] = min(maxProd[i-1] * nums[i], nums[i])  // 最大变最小
```

简化为统一公式：
```
maxProd[i] = max(maxProd[i-1] * nums[i], minProd[i-1] * nums[i], nums[i])
minProd[i] = min(maxProd[i-1] * nums[i], minProd[i-1] * nums[i], nums[i])
```

### 图示理解

```
nums:    2      3     -2      4
         ↓      ↓      ↓      ↓
max:     2      6     -2      4
min:     2      3    -12    -48

最终答案：max(2, 6, -2, 4) = 6
```

注意：虽然 -12 × 4 = -48 是最小的，但我们需要的是最大值，所以 4 位置选择重新开始。

## 解法一：二维 DP

```typescript
/**
 * 二维 DP
 * 时间复杂度：O(n)
 * 空间复杂度：O(n)
 */
function maxProduct(nums: number[]): number {
  const n = nums.length;
  const maxProd = new Array(n);
  const minProd = new Array(n);
  
  maxProd[0] = nums[0];
  minProd[0] = nums[0];
  let result = nums[0];
  
  for (let i = 1; i < n; i++) {
    const num = nums[i];
    
    // 三个候选值
    const candidates = [
      maxProd[i - 1] * num,
      minProd[i - 1] * num,
      num
    ];
    
    maxProd[i] = Math.max(...candidates);
    minProd[i] = Math.min(...candidates);
    
    result = Math.max(result, maxProd[i]);
  }
  
  return result;
}
```

## 解法二：空间优化

只需要上一个位置的最大/最小值：

```typescript
/**
 * 空间优化
 * 时间复杂度：O(n)
 * 空间复杂度：O(1)
 */
function maxProduct(nums: number[]): number {
  let maxProd = nums[0];
  let minProd = nums[0];
  let result = nums[0];
  
  for (let i = 1; i < nums.length; i++) {
    const num = nums[i];
    
    // 注意：要同时更新，所以先保存
    const prevMax = maxProd;
    const prevMin = minProd;
    
    maxProd = Math.max(prevMax * num, prevMin * num, num);
    minProd = Math.min(prevMax * num, prevMin * num, num);
    
    result = Math.max(result, maxProd);
  }
  
  return result;
}
```

### 另一种写法（交换思路）

当遇到负数时，交换最大和最小：

```typescript
function maxProduct(nums: number[]): number {
  let maxProd = nums[0];
  let minProd = nums[0];
  let result = nums[0];
  
  for (let i = 1; i < nums.length; i++) {
    const num = nums[i];
    
    // 如果是负数，交换最大和最小
    if (num < 0) {
      [maxProd, minProd] = [minProd, maxProd];
    }
    
    // 现在可以安全地更新
    maxProd = Math.max(maxProd * num, num);
    minProd = Math.min(minProd * num, num);
    
    result = Math.max(result, maxProd);
  }
  
  return result;
}
```

## 处理零的情况

零是乘积的"断点"：
- 任何数乘以零都是零
- 零之前的子数组和零之后的子数组是独立的

```typescript
// 遇到零时的行为
nums = [2, -1, 0, 3, -2]

处理到 0 时：
maxProd = max(-1 * 0, 0) = 0
minProd = min(-1 * 0, 0) = 0

处理到 3 时：
maxProd = max(0 * 3, 3) = 3  // 重新开始
```

## 变体问题

### 变体一：乘积为正数的最长子数组长度

📎 [LeetCode 1567. 乘积为正数的最长子数组长度](https://leetcode.cn/problems/maximum-length-of-subarray-with-positive-product/)

```typescript
function getMaxLen(nums: number[]): number {
  let posLen = 0;  // 以当前位置结尾的正乘积子数组长度
  let negLen = 0;  // 以当前位置结尾的负乘积子数组长度
  let result = 0;
  
  for (const num of nums) {
    if (num === 0) {
      posLen = 0;
      negLen = 0;
    } else if (num > 0) {
      posLen++;
      negLen = negLen > 0 ? negLen + 1 : 0;
    } else {
      const prevPos = posLen;
      posLen = negLen > 0 ? negLen + 1 : 0;
      negLen = prevPos + 1;
    }
    
    result = Math.max(result, posLen);
  }
  
  return result;
}
```

### 变体二：子数组乘积小于 k

📎 [LeetCode 713. 乘积小于 K 的子数组](https://leetcode.cn/problems/subarray-product-less-than-k/)

这是滑动窗口问题，不是 DP：

```typescript
function numSubarrayProductLessThanK(nums: number[], k: number): number {
  if (k <= 1) return 0;
  
  let product = 1;
  let left = 0;
  let count = 0;
  
  for (let right = 0; right < nums.length; right++) {
    product *= nums[right];
    
    while (product >= k) {
      product /= nums[left];
      left++;
    }
    
    // 以 right 结尾的合法子数组数量
    count += right - left + 1;
  }
  
  return count;
}
```

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 |
|-----|-----------|-----------|
| 二维 DP | O(n) | O(n) |
| 空间优化 | O(n) | O(1) |

## 易错点

1. **忘记维护最小值**：乘积问题必须同时维护最大和最小
2. **更新顺序错误**：同时更新 maxProd 和 minProd 时，要先保存旧值
3. **初始值设置**：`maxProd[0] = minProd[0] = nums[0]`，不是 0 或 1

## 本章小结

1. **核心思想**：负负得正，必须同时维护最大和最小
2. **状态转移**：三个候选值取最大/最小
3. **零的处理**：乘以零后相当于重新开始
4. **空间优化**：只需两个变量

**与最大子数组和的对比**：

| 特点 | 最大子数组和 | 乘积最大子数组 |
|-----|-------------|---------------|
| 状态数量 | 1 个（最大值） | 2 个（最大和最小） |
| 负数影响 | 只会变小 | 可能变大（负负得正） |
| 零的影响 | 重置为 0 | 重置为 0 |
| 转移公式 | max(dp[i-1]+num, num) | 三者取最大/最小 |
