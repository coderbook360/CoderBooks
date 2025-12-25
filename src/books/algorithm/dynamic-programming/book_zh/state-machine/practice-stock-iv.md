# 买卖股票的最佳时机 IV

最多可以完成 k 笔交易，是股票 III 的泛化版本。

## 题目描述

给你一个整数数组 `prices` 和一个整数 `k`，其中 `prices[i]` 是某支股票第 `i` 天的价格。

设计一个算法来计算你所能获取的最大利润。你最多可以完成 `k` 笔交易。也就是说，你最多可以买 `k` 次，卖 `k` 次。

注意：你不能同时参与多笔交易（你必须在再次购买前出售掉之前的股票）。

📎 [LeetCode 188. 买卖股票的最佳时机 IV](https://leetcode.cn/problems/best-time-to-buy-and-sell-stock-iv/)

**示例**：

```
输入：k = 2, prices = [3, 2, 6, 5, 0, 3]
输出：7
解释：
第 2 天买入，第 3 天卖出，利润 = 6 - 2 = 4
第 5 天买入，第 6 天卖出，利润 = 3 - 0 = 3
总利润 = 4 + 3 = 7
```

## 状态分析

这是股票 III 的泛化：
- 股票 III：k = 2
- 股票 IV：k 是参数

状态定义：
- `buy[j]` = 准备完成第 j 笔交易，持有股票时的最大收益
- `sell[j]` = 完成 j 笔交易，不持有股票时的最大收益

## 代码实现

### 基础实现

```typescript
/**
 * 状态机 DP
 * 时间复杂度：O(n * k)
 * 空间复杂度：O(k)
 */
function maxProfit(k: number, prices: number[]): number {
  const n = prices.length;
  if (n === 0 || k === 0) return 0;
  
  // buy[j] = 第 j 次买入后的最大收益
  // sell[j] = 第 j 次卖出后的最大收益
  const buy = new Array(k + 1).fill(-Infinity);
  const sell = new Array(k + 1).fill(0);
  
  for (const price of prices) {
    for (let j = 1; j <= k; j++) {
      buy[j] = Math.max(buy[j], sell[j - 1] - price);
      sell[j] = Math.max(sell[j], buy[j] + price);
    }
  }
  
  return Math.max(...sell);
}
```

### 优化：大 k 特判

当 `k >= n/2` 时，相当于无限次交易（因为最多只能 n/2 次有效交易）。

```typescript
function maxProfit(k: number, prices: number[]): number {
  const n = prices.length;
  if (n === 0 || k === 0) return 0;
  
  // 优化：k >= n/2 时相当于无限次交易
  if (k >= Math.floor(n / 2)) {
    return maxProfitUnlimited(prices);
  }
  
  const buy = new Array(k + 1).fill(-Infinity);
  const sell = new Array(k + 1).fill(0);
  
  for (const price of prices) {
    for (let j = 1; j <= k; j++) {
      buy[j] = Math.max(buy[j], sell[j - 1] - price);
      sell[j] = Math.max(sell[j], buy[j] + price);
    }
  }
  
  return Math.max(...sell);
}

// 无限次交易（股票 II）
function maxProfitUnlimited(prices: number[]): number {
  let profit = 0;
  for (let i = 1; i < prices.length; i++) {
    if (prices[i] > prices[i - 1]) {
      profit += prices[i] - prices[i - 1];
    }
  }
  return profit;
}
```

### 二维数组写法

```typescript
function maxProfit(k: number, prices: number[]): number {
  const n = prices.length;
  if (n === 0 || k === 0) return 0;
  
  if (k >= Math.floor(n / 2)) {
    let profit = 0;
    for (let i = 1; i < n; i++) {
      profit += Math.max(0, prices[i] - prices[i - 1]);
    }
    return profit;
  }
  
  // dp[i][j][h]
  // i = 第几天, j = 已完成的交易次数, h = 是否持有 (0=不持有, 1=持有)
  // 空间优化后：dp[j][h]
  const dp: number[][] = Array.from(
    { length: k + 1 },
    () => [-Infinity, -Infinity]
  );
  dp[0][0] = 0;  // 0 次交易，不持有，收益 0
  
  for (const price of prices) {
    // 从后往前更新，避免覆盖
    for (let j = k; j >= 1; j--) {
      // 不持有：保持，或卖出
      dp[j][0] = Math.max(dp[j][0], dp[j][1] + price);
      // 持有：保持，或买入
      dp[j][1] = Math.max(dp[j][1], dp[j - 1][0] - price);
    }
  }
  
  // 找最大的不持有状态
  let result = 0;
  for (let j = 0; j <= k; j++) {
    result = Math.max(result, dp[j][0]);
  }
  return result;
}
```

## 状态转移图

```
j=0                j=1                j=2               ...      j=k
┌─────────┐      ┌─────────┐      ┌─────────┐                ┌─────────┐
│sell[0]=0│ ──→  │ buy[1]  │ ──→  │ sell[1] │ ──→  ...  ──→  │ sell[k] │
└─────────┘ 买入  └─────────┘ 卖出  └─────────┘                └─────────┘
                      │                  │
                      ↓                  ↓
                  ┌─────────┐      ┌─────────┐
                  │ buy[2]  │ ──→  │ sell[2] │
                  └─────────┘ 卖出  └─────────┘
```

## 示例演算

以 `k = 2, prices = [3, 2, 6, 5, 0, 3]` 为例：

| 天 | 价格 | buy[1] | sell[1] | buy[2] | sell[2] |
|---|------|--------|---------|--------|---------|
| 0 | 3 | -3 | 0 | -3 | 0 |
| 1 | 2 | -2 | 0 | -2 | 0 |
| 2 | 6 | -2 | 4 | 2 | 4 |
| 3 | 5 | -2 | 4 | 2 | 4 |
| 4 | 0 | 0 | 4 | 4 | 4 |
| 5 | 3 | 0 | 4 | 4 | 7 |

最终答案：7

## k 的特殊情况

| k 值 | 等价问题 |
|-----|---------|
| k = 0 | 不能交易，返回 0 |
| k = 1 | 股票 I |
| k = 2 | 股票 III |
| k >= n/2 | 股票 II（无限次） |

## 为什么 k >= n/2 等价于无限次？

在 n 天内，最多只能进行 n/2 次有效交易（买入和卖出各占一天）。

当 k >= n/2 时，交易次数限制实际上不起作用，所以可以用贪心解法。

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 |
|-----|-----------|-----------|
| 基础 | O(n × k) | O(k) |
| 优化后 | O(n × min(k, n/2)) | O(min(k, n/2)) |

## 本章小结

1. **泛化思路**：从 k=2 推广到任意 k
2. **状态设计**：buy[j] 和 sell[j] 记录第 j 次交易
3. **优化技巧**：k >= n/2 时退化为无限次交易
4. **更新顺序**：从后往前或用临时变量避免覆盖
