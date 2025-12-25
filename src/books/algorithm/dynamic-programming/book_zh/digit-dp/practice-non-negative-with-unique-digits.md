# 不含重复数字的数

## 题目描述

**LeetCode 357. Count Numbers with Unique Digits**

给你一个整数 `n`，统计并返回各位数字都不同的数字 `x` 的个数，其中 `0 <= x < 10^n`。

**示例 1**：
```
输入：n = 2
输出：91
解释：
0 <= x < 100，除 11, 22, 33, 44, 55, 66, 77, 88, 99 外都满足
共 100 - 9 = 91 个
```

**示例 2**：
```
输入：n = 0
输出：1
解释：只有 x = 0 满足
```

**约束**：
- `0 <= n <= 8`

## 思路分析

与 LeetCode 2376（统计特殊整数）类似，但这道题：
- 给定的是位数 n，而非具体数字
- 范围是 `[0, 10^n)`
- n 最大为 8，可以直接用排列计数

## 解法一：排列数学

逐位统计：
- 0 位数：只有数字 0，共 1 个
- 1 位数：1~9，共 9 个
- 2 位数：首位 9 选（1-9），第二位 9 选（0-9 除首位），共 9 × 9 = 81 个
- k 位数：首位 9 选，后续依次从剩余数字选

```typescript
function countNumbersWithUniqueDigits(n: number): number {
  if (n === 0) return 1;
  if (n === 1) return 10;
  
  let result = 10;  // 0~9
  let product = 9;  // 首位选择数
  
  for (let i = 2; i <= n && i <= 10; i++) {
    product *= (11 - i);  // 第 i 位有 (11-i) 种选择
    result += product;
  }
  
  return result;
}
```

**推导过程**：

```
f(1) = 10 (0~9)
f(2) = f(1) + 9 × 9 = 10 + 81 = 91
f(3) = f(2) + 9 × 9 × 8 = 91 + 648 = 739
f(4) = f(3) + 9 × 9 × 8 × 7 = 739 + 4536 = 5275
...
```

**复杂度分析**：
- 时间：O(n)
- 空间：O(1)

## 解法二：记忆化搜索

用数位 DP 的标准模板，虽然效率不如直接计算，但展示通用方法。

```typescript
function countNumbersWithUniqueDigits(n: number): number {
  if (n === 0) return 1;
  
  const upperBound = Math.pow(10, n) - 1;
  const s = String(upperBound);
  const len = s.length;
  const digits = s.split('').map(Number);
  
  const memo: Map<string, number> = new Map();
  
  function dfs(
    pos: number,
    mask: number,
    tight: boolean,
    started: boolean
  ): number {
    if (pos === len) return 1;
    
    const key = `${pos},${mask},${started}`;
    if (!tight && memo.has(key)) {
      return memo.get(key)!;
    }
    
    let result = 0;
    
    if (!started) {
      result += dfs(pos + 1, mask, false, false);
    }
    
    const limit = tight ? digits[pos] : 9;
    const start = started ? 0 : 1;
    
    for (let d = start; d <= limit; d++) {
      if ((mask >> d) & 1) continue;
      
      const newMask = mask | (1 << d);
      const newTight = tight && (d === limit);
      
      result += dfs(pos + 1, newMask, newTight, true);
    }
    
    if (!tight) {
      memo.set(key, result);
    }
    
    return result;
  }
  
  return dfs(0, 0, true, false);
}
```

## 解法三：递推 DP

```typescript
function countNumbersWithUniqueDigits(n: number): number {
  if (n === 0) return 1;
  
  // dp[i] = 恰好 i 位的各位不同的数的个数
  const dp: number[] = Array(n + 1).fill(0);
  dp[1] = 9;  // 1~9
  
  for (let i = 2; i <= n; i++) {
    // 首位 9 种，第 2 位 9 种，第 3 位 8 种...
    // dp[i] = 9 × 9 × 8 × ... × (11-i)
    dp[i] = dp[i - 1] * (11 - i);
  }
  
  // 总数 = 1（数字0） + dp[1] + dp[2] + ... + dp[n]
  let result = 1;
  for (let i = 1; i <= n; i++) {
    result += dp[i];
  }
  
  return result;
}
```

## 预计算表

由于 n ≤ 8，可以直接预计算：

```typescript
const UNIQUE_DIGIT_COUNT = [1, 10, 91, 739, 5275, 32491, 168571, 712891, 2345851];

function countNumbersWithUniqueDigits(n: number): number {
  return UNIQUE_DIGIT_COUNT[Math.min(n, 10)];
}
```

**表格详解**：

| n | 范围 | 各位不同的数 |
|---|------|-------------|
| 0 | [0, 1) | 1 |
| 1 | [0, 10) | 10 |
| 2 | [0, 100) | 91 |
| 3 | [0, 1000) | 739 |
| 4 | [0, 10000) | 5275 |
| 5 | [0, 100000) | 32491 |
| 6 | [0, 1000000) | 168571 |
| 7 | [0, 10000000) | 712891 |
| 8 | [0, 100000000) | 2345851 |

## 数学推导

设 f(k) 为恰好 k 位且各位不同的正整数个数：

```
f(1) = 9                           (1~9)
f(2) = 9 × 9                       (首位 1-9，次位 0-9 去首位)
f(3) = 9 × 9 × 8                   (再选一个不同的)
f(k) = 9 × 9 × 8 × 7 × ... × (11-k)  (k ≤ 10)
```

当 k > 10 时，f(k) = 0（因为只有 10 个数字）。

总数：

```
g(n) = 1 + f(1) + f(2) + ... + f(n)
     = 1 + 9 × (1 + 9 + 9×8 + 9×8×7 + ...)
```

## 相关题目

| 题目 | 难度 | 说明 |
|------|------|------|
| [2376. 统计特殊整数](https://leetcode.cn/problems/count-special-integers/) | 困难 | 给定上界 n |
| [1012. 至少有 1 位重复的数字](https://leetcode.cn/problems/numbers-with-repeated-digits/) | 困难 | 本题取反 |
| [902. 最大为 N 的数字组合](https://leetcode.cn/problems/numbers-at-most-n-given-digit-set/) | 困难 | 限定数字集合 |

## 总结

这道题是数位 DP 的入门题：

1. **数学解法最优**：直接用排列计数，O(n) 时间
2. **数位 DP 通用**：可处理任意上界的变体
3. **注意边界**：n=0 返回 1，包含数字 0

核心公式：
- k 位不重复数：9 × 9 × 8 × 7 × ... × (11-k)
- 累加得到答案

这道题体现了"特殊问题用特殊方法"的原则：能用数学直接算的，就不需要复杂的 DP。
