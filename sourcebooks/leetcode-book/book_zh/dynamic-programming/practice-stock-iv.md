# 实战：买卖股票的最佳时机IV

最多k次交易的通用解法。

## 问题描述

给定一个整数数组prices和整数k，最多可以完成k笔交易。

返回你能获得的最大利润。

示例：
- k = 2, prices = [2,4,1] → 2（买2卖4）
- k = 2, prices = [3,2,6,5,0,3] → 7（买2卖6，买0卖3）

## 状态定义

`dp[i][j][0]` = 第i天，已完成j次交易，不持有股票的最大利润
`dp[i][j][1]` = 第i天，已完成j次交易，持有股票的最大利润

一次完整交易 = 买入 + 卖出

## 解法

```javascript
function maxProfit(k, prices) {
    const n = prices.length;
    if (n === 0 || k === 0) return 0;
    
    // 如果k足够大，等同于无限次交易
    if (k >= n / 2) {
        let profit = 0;
        for (let i = 1; i < n; i++) {
            if (prices[i] > prices[i - 1]) {
                profit += prices[i] - prices[i - 1];
            }
        }
        return profit;
    }
    
    // dp[j][0]: 完成j次交易，不持有
    // dp[j][1]: 完成j次交易，持有（正在进行第j+1次）
    const dp = Array.from({length: k + 1}, () => [0, -Infinity]);
    
    for (const price of prices) {
        for (let j = k; j >= 1; j--) {
            // 不持有：保持，或卖出
            dp[j][0] = Math.max(dp[j][0], dp[j - 1][1] + price);
            // 持有：保持，或买入
            dp[j - 1][1] = Math.max(dp[j - 1][1], dp[j - 1][0] - price);
        }
    }
    
    return dp[k][0];
}
```

## 交易次数的定义

这里"完成j次交易"指已经完成j次买入和卖出。

转移关系：
- 买入：从`dp[j][0]`到`dp[j][1]`
- 卖出：从`dp[j][1]`到`dp[j+1][0]`

## 简化版本

另一种状态定义更直观：

```javascript
function maxProfit(k, prices) {
    const n = prices.length;
    if (n === 0 || k === 0) return 0;
    
    if (k >= n / 2) {
        return prices.reduce((profit, price, i) => 
            i > 0 && price > prices[i-1] ? profit + price - prices[i-1] : profit, 0);
    }
    
    // buy[j]: 进行到第j次买入的最大利润
    // sell[j]: 进行到第j次卖出的最大利润
    const buy = Array(k + 1).fill(-Infinity);
    const sell = Array(k + 1).fill(0);
    
    for (const price of prices) {
        for (let j = 1; j <= k; j++) {
            buy[j] = Math.max(buy[j], sell[j - 1] - price);
            sell[j] = Math.max(sell[j], buy[j] + price);
        }
    }
    
    return sell[k];
}
```

## 为什么k >= n/2时特殊处理

n天最多进行n/2次完整交易（每次至少2天）。

如果k >= n/2，等同于无限次交易，用贪心更快。

## 股票问题的统一框架

所有股票问题都可以用这个框架：

```javascript
dp[i][k][s]  // 第i天，已完成k次交易，状态s（0不持有/1持有）

// 不持有 = max(保持不持有, 卖出)
dp[i][k][0] = max(dp[i-1][k][0], dp[i-1][k][1] + price)

// 持有 = max(保持持有, 买入)
dp[i][k][1] = max(dp[i-1][k][1], dp[i-1][k-1][0] - price)
```

不同题目的区别在于k的限制和额外约束（冷冻期、手续费）。

## 复杂度分析

- **时间复杂度**：O(n × k)
- **空间复杂度**：O(k)

## 小结

买卖股票IV是股票系列最通用的问题：
- 用二维DP记录交易次数
- k较大时优化为贪心
- 理解后可以解决所有股票问题

掌握这个框架，股票系列问题就都能解决了。
