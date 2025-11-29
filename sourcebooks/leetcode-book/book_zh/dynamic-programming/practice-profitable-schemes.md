# 实战：盈利计划

多维费用的背包问题。

## 问题描述

集团里有n名员工，有一系列工作profit[i]表示利润，group[i]表示需要的员工数。

任何工作只能做一次。至少产生minProfit利润的计划数量，对1e9+7取模。

每名员工最多参与一项工作。

## 分析

这是一个三维DP问题：
- 物品：各项工作
- 两个约束：员工数、利润
- 求方案数

## 状态定义

`dp[i][j][k]` = 考虑前i项工作，使用j名员工，至少获得k利润的方案数

## 解法

```javascript
function profitableSchemes(n, minProfit, group, profit) {
    const MOD = 1e9 + 7;
    const m = group.length;  // 工作数
    
    // dp[j][k] = 使用j名员工，至少获得k利润的方案数
    const dp = Array.from({length: n + 1}, () => Array(minProfit + 1).fill(0));
    
    // 初始化：0员工0利润有一种方案（什么都不做）
    for (let j = 0; j <= n; j++) {
        dp[j][0] = 1;
    }
    
    for (let i = 0; i < m; i++) {
        const g = group[i];
        const p = profit[i];
        
        // 01背包：倒序遍历
        for (let j = n; j >= g; j--) {
            for (let k = minProfit; k >= 0; k--) {
                // 选这项工作
                // 利润用max(0, k-p)，因为超过minProfit都算在dp[j][minProfit]里
                const newK = Math.max(0, k - p);
                dp[j][k] = (dp[j][k] + dp[j - g][newK]) % MOD;
            }
        }
    }
    
    return dp[n][minProfit];
}
```

## 关键点解释

### 为什么dp[j][0] = 1

0利润不是"恰好0利润"，而是"至少0利润"（包括所有情况）。

初始时不做任何工作，利润为0，这是一种有效方案。

### 为什么k要从minProfit倒序到0

因为我们求的是"至少k利润"。

### 为什么newK = max(0, k-p)

利润超过minProfit后，都算在同一状态里。

如果k=5, p=10，新状态不是k=-5，而是k=0（表示"至少0利润"）。

## 三维写法（更清晰）

```javascript
function profitableSchemes(n, minProfit, group, profit) {
    const MOD = 1e9 + 7;
    const m = group.length;
    
    // dp[i][j][k] = 前i项工作，j名员工，至少k利润的方案数
    const dp = Array.from({length: m + 1}, () => 
        Array.from({length: n + 1}, () => Array(minProfit + 1).fill(0)));
    
    // 初始化
    for (let j = 0; j <= n; j++) {
        dp[0][j][0] = 1;
    }
    
    for (let i = 1; i <= m; i++) {
        const g = group[i - 1];
        const p = profit[i - 1];
        
        for (let j = 0; j <= n; j++) {
            for (let k = 0; k <= minProfit; k++) {
                // 不选第i项工作
                dp[i][j][k] = dp[i - 1][j][k];
                
                // 选第i项工作
                if (j >= g) {
                    const newK = Math.max(0, k - p);
                    dp[i][j][k] = (dp[i][j][k] + dp[i - 1][j - g][newK]) % MOD;
                }
            }
        }
    }
    
    return dp[m][n][minProfit];
}
```

## 复杂度分析

- **时间复杂度**：O(m × n × minProfit)
- **空间复杂度**：O(n × minProfit)

## 小结

盈利计划展示了复杂背包问题：
- 多维费用约束
- "至少"而非"恰好"的处理
- 状态压缩的技巧

这是背包问题的高级应用，需要仔细处理状态定义和边界。
