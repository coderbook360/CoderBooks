# 实战：最大子数组乘积

## 题目描述

给你一个整数数组 `nums`，请你找出数组中乘积最大的非空连续子数组（该子数组中至少包含一个数字），并返回该子数组所对应的乘积。

📎 [LeetCode 152. 乘积最大子数组](https://leetcode.cn/problems/maximum-product-subarray/)

**示例**：

```
输入：nums = [2, 3, -2, 4]
输出：6
解释：子数组 [2, 3] 有最大乘积 6
```

## 与最大子数组和的区别

| 问题 | 操作 | 负数影响 |
|-----|------|---------|
| 最大子数组和 | 加法 | 负数使和减小 |
| 最大子数组乘积 | 乘法 | **负负得正**，最小可能变最大 |

关键区别：**乘法中，负数 × 负数 = 正数**。

所以不能只维护最大值，还要维护最小值（可能是负的最大绝对值）。

## 状态定义

```
maxProduct[i] = 以 nums[i] 结尾的子数组的最大乘积
minProduct[i] = 以 nums[i] 结尾的子数组的最小乘积
```

## 状态转移

```
如果 nums[i] >= 0:
    maxProduct[i] = max(nums[i], maxProduct[i-1] × nums[i])
    minProduct[i] = min(nums[i], minProduct[i-1] × nums[i])

如果 nums[i] < 0:
    maxProduct[i] = max(nums[i], minProduct[i-1] × nums[i])  // 最小×负=最大
    minProduct[i] = min(nums[i], maxProduct[i-1] × nums[i])  // 最大×负=最小
```

或者统一写成：

```
maxProduct[i] = max(nums[i], maxProduct[i-1] × nums[i], minProduct[i-1] × nums[i])
minProduct[i] = min(nums[i], maxProduct[i-1] × nums[i], minProduct[i-1] × nums[i])
```

## 代码实现

```typescript
/**
 * 乘积最大子数组
 * 时间复杂度：O(n)
 * 空间复杂度：O(1)
 */
function maxProduct(nums: number[]): number {
  if (nums.length === 0) return 0;
  
  let maxProd = nums[0];
  let minProd = nums[0];
  let result = nums[0];
  
  for (let i = 1; i < nums.length; i++) {
    const num = nums[i];
    
    // 保存上一轮的值
    const prevMax = maxProd;
    const prevMin = minProd;
    
    // 三选一：自己、最大×自己、最小×自己
    maxProd = Math.max(num, prevMax * num, prevMin * num);
    minProd = Math.min(num, prevMax * num, prevMin * num);
    
    result = Math.max(result, maxProd);
  }
  
  return result;
}
```

## 另一种写法：负数时交换

```typescript
function maxProduct(nums: number[]): number {
  let maxProd = nums[0];
  let minProd = nums[0];
  let result = nums[0];
  
  for (let i = 1; i < nums.length; i++) {
    const num = nums[i];
    
    // 负数时，最大和最小会交换
    if (num < 0) {
      [maxProd, minProd] = [minProd, maxProd];
    }
    
    maxProd = Math.max(num, maxProd * num);
    minProd = Math.min(num, minProd * num);
    
    result = Math.max(result, maxProd);
  }
  
  return result;
}
```

## 示例演算

以 `nums = [2, 3, -2, 4]` 为例：

| i | nums[i] | maxProd | minProd | result |
|---|---------|---------|---------|--------|
| 0 | 2 | 2 | 2 | 2 |
| 1 | 3 | 6 | 3 | 6 |
| 2 | -2 | -2 | -12 | 6 |
| 3 | 4 | 4 | -48 | **6** |

最终答案：6

## 含零的情况

`nums = [-2, 0, -1]`：

| i | nums[i] | maxProd | minProd | result |
|---|---------|---------|---------|--------|
| 0 | -2 | -2 | -2 | -2 |
| 1 | 0 | 0 | 0 | 0 |
| 2 | -1 | -1 | -1 | **0** |

零会"断开"乘积链，但答案可能在零之前或之后。

## 理解"为什么需要最小值"

```
nums = [2, -1, 3, -2]

如果只维护最大值：
- 位置 0：max = 2
- 位置 1：max = max(-1, 2 × -1) = -1
- 位置 2：max = max(3, -1 × 3) = 3
- 位置 3：max = max(-2, 3 × -2) = -2

答案 = 3（错误！）

正确答案 = 2 × -1 × 3 × -2 = 12

维护最小值的情况：
- 位置 1：min = -2
- 位置 2：min = -6
- 位置 3：max = max(-2, 3 × -2, -6 × -2) = 12 ✓
```

## 与 Kadane 算法的对比

| 问题 | 维护状态 | 原因 |
|-----|---------|------|
| 最大子数组和 | 只要 max | 加法中负数总是减小和 |
| 最大子数组乘积 | max + min | 乘法中负负得正 |

## 边界情况

1. **全负数**：答案是最大的那个负数
2. **含零**：零会断开乘积链
3. **单元素**：直接返回该元素

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 |
|-----|-----------|-----------|
| 双状态 DP | O(n) | O(1) |

## 本章小结

1. **乘法的特殊性**：负负得正，最小可能变最大
2. **双状态维护**：同时维护 maxProd 和 minProd
3. **转移方式**：三选一（自己、max×自己、min×自己）
4. **负数处理**：可以通过交换 max/min 简化代码
