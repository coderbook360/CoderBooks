# 实战：整数拆分

乘积最大化问题。

## 问题描述

给定一个正整数n，将其拆分为至少两个正整数的和，并使这些整数的乘积最大化。

返回你可以获得的最大乘积。

示例：
- n = 2 → 1（1 × 1）
- n = 10 → 36（3 × 3 × 4）

## 思路分析

对于每个n，考虑第一次拆分成i和n-i：
- 不再拆分：i × (n-i)
- 继续拆分：i × dp[n-i]（或dp[i] × dp[n-i]）

## 解法1：DP

```javascript
function integerBreak(n) {
    const dp = new Array(n + 1).fill(0);
    dp[2] = 1;  // 2 = 1 + 1
    
    for (let i = 3; i <= n; i++) {
        for (let j = 1; j < i; j++) {
            // j × (i-j)：不再拆分i-j
            // j × dp[i-j]：继续拆分i-j
            dp[i] = Math.max(dp[i], j * (i - j), j * dp[i - j]);
        }
    }
    
    return dp[n];
}
```

## 优化：只需要考虑j=2和j=3

数学上可以证明，最优拆分只用2和3：
- 1无意义（1×x < x）
- 4可以拆成2×2
- 5可以拆成2×3
- ≥6的数都应该拆分

```javascript
function integerBreak(n) {
    if (n === 2) return 1;
    if (n === 3) return 2;
    
    const dp = new Array(n + 1).fill(0);
    dp[2] = 2;  // 作为因子时不拆分
    dp[3] = 3;
    
    for (let i = 4; i <= n; i++) {
        dp[i] = Math.max(dp[i - 2] * 2, dp[i - 3] * 3);
    }
    
    return dp[n];
}
```

## 解法2：贪心（数学）

尽可能多地拆出3：

```javascript
function integerBreak(n) {
    if (n === 2) return 1;
    if (n === 3) return 2;
    
    let product = 1;
    while (n > 4) {
        product *= 3;
        n -= 3;
    }
    return product * n;
}
```

为什么是3？
- 2 < 3 < e < 4
- e ≈ 2.718是数学上最优的拆分数
- 整数中3最接近e

## 为什么n>4时拆3

证明：
- n=4时，2×2=4，3×1=3，不拆4
- n=5时，2×3=6 > 5
- n≥6时，3×(n-3) > n（因为n-3≥3时，3×(n-3) = 3n-9 > n）

## 复杂度分析

**DP解法**：
- 时间：O(n²)或O(n)
- 空间：O(n)

**贪心解法**：
- 时间：O(n)
- 空间：O(1)

## 小结

整数拆分展示了：
- 标准DP解法
- 数学优化（只用2和3）
- 贪心解法

很多DP问题都有数学上的更优解法，但DP方法更通用。
