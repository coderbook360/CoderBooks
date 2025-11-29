# 实战：爬楼梯

DP的入门经典题。

## 问题描述

假设你正在爬楼梯。需要n阶你才能到达楼顶。

每次你可以爬1或2个台阶。有多少种不同的方法可以爬到楼顶？

示例：
- n = 2 → 2（1+1 或 2）
- n = 3 → 3（1+1+1 或 1+2 或 2+1）

## 思路分析

到达第n阶有两种方式：
- 从第n-1阶爬1步
- 从第n-2阶爬2步

所以方法数 = 到第n-1阶的方法数 + 到第n-2阶的方法数。

这就是斐波那契数列！

## 解法1：递归（超时）

```javascript
function climbStairs(n) {
    if (n <= 2) return n;
    return climbStairs(n - 1) + climbStairs(n - 2);
}
```

时间O(2^n)，会超时。

## 解法2：记忆化递归

```javascript
function climbStairs(n, memo = {}) {
    if (n <= 2) return n;
    if (memo[n]) return memo[n];
    
    memo[n] = climbStairs(n - 1, memo) + climbStairs(n - 2, memo);
    return memo[n];
}
```

时间O(n)，空间O(n)。

## 解法3：DP

```javascript
function climbStairs(n) {
    if (n <= 2) return n;
    
    const dp = new Array(n + 1);
    dp[1] = 1;
    dp[2] = 2;
    
    for (let i = 3; i <= n; i++) {
        dp[i] = dp[i - 1] + dp[i - 2];
    }
    
    return dp[n];
}
```

## 解法4：空间优化

```javascript
function climbStairs(n) {
    if (n <= 2) return n;
    
    let prev2 = 1, prev1 = 2;
    
    for (let i = 3; i <= n; i++) {
        const curr = prev1 + prev2;
        prev2 = prev1;
        prev1 = curr;
    }
    
    return prev1;
}
```

时间O(n)，空间O(1)。

## DP五步法

1. **状态定义**：`dp[i]` = 到达第i阶的方法数
2. **转移方程**：`dp[i] = dp[i-1] + dp[i-2]`
3. **初始条件**：`dp[1] = 1, dp[2] = 2`
4. **计算顺序**：从小到大
5. **返回结果**：`dp[n]`

## 变种：一次可以爬1到m步

```javascript
function climbStairs(n, m) {
    const dp = new Array(n + 1).fill(0);
    dp[0] = 1;
    
    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m && j <= i; j++) {
            dp[i] += dp[i - j];
        }
    }
    
    return dp[n];
}
```

## 复杂度分析

- **时间复杂度**：O(n)
- **空间复杂度**：O(1)（优化后）

## 小结

爬楼梯展示了DP的基本模式：
- 定义状态
- 找出转移
- 确定初始
- 优化空间

这是理解DP的第一步。
