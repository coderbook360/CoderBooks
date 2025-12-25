# 买卖股票的最佳时机 I & II

买卖股票 I 和 II 是状态机 DP 的入门题，分别代表"最多一次交易"和"无限次交易"两种场景。

## 买卖股票 I

### 题目描述

给定一个数组 `prices`，它的第 `i` 个元素 `prices[i]` 表示一支给定股票第 `i` 天的价格。

你只能选择某一天买入这只股票，并选择在未来的某一个不同的日子卖出该股票。设计一个算法来计算你所能获取的最大利润。

📎 [LeetCode 121. 买卖股票的最佳时机](https://leetcode.cn/problems/best-time-to-buy-and-sell-stock/)

**示例**：

```
输入：prices = [7, 1, 5, 3, 6, 4]
输出：5
解释：在第 2 天（价格 = 1）买入，在第 5 天（价格 = 6）卖出
     利润 = 6 - 1 = 5
```

### 思路一：一次遍历

维护到目前为止的最低价格，计算当前价格卖出的利润：

```typescript
/**
 * 一次遍历
 * 时间复杂度：O(n)
 * 空间复杂度：O(1)
 */
function maxProfit(prices: number[]): number {
  let minPrice = Infinity;
  let maxProfit = 0;
  
  for (const price of prices) {
    minPrice = Math.min(minPrice, price);
    maxProfit = Math.max(maxProfit, price - minPrice);
  }
  
  return maxProfit;
}
```

### 思路二：状态机 DP

定义两个状态：
- `hold`：持有股票时的最大收益
- `notHold`：不持有股票时的最大收益

```typescript
/**
 * 状态机 DP
 * 时间复杂度：O(n)
 * 空间复杂度：O(1)
 */
function maxProfit(prices: number[]): number {
  let hold = -Infinity;     // 持有股票
  let notHold = 0;          // 不持有股票
  
  for (const price of prices) {
    // 持有：保持持有，或者今天买入（只能买一次，所以从 0 开始）
    hold = Math.max(hold, -price);
    
    // 不持有：保持不持有，或者今天卖出
    notHold = Math.max(notHold, hold + price);
  }
  
  return notHold;
}
```

**注意**：`hold = Math.max(hold, -price)` 而不是 `hold = Math.max(hold, notHold - price)`，因为只能买一次。

## 买卖股票 II

### 题目描述

给你一个整数数组 `prices`，其中 `prices[i]` 表示某支股票第 `i` 天的价格。

在每一天，你可以决定是否购买和/或出售股票。你在任何时候最多只能持有一股股票。你也可以先购买，然后在同一天出售。

📎 [LeetCode 122. 买卖股票的最佳时机 II](https://leetcode.cn/problems/best-time-to-buy-and-sell-stock-ii/)

**示例**：

```
输入：prices = [7, 1, 5, 3, 6, 4]
输出：7
解释：
第 2 天买入，第 3 天卖出，利润 = 5 - 1 = 4
第 4 天买入，第 5 天卖出，利润 = 6 - 3 = 3
总利润 = 4 + 3 = 7
```

### 思路一：贪心

只要今天比昨天贵，就假装昨天买今天卖：

```typescript
/**
 * 贪心
 * 时间复杂度：O(n)
 * 空间复杂度：O(1)
 */
function maxProfit(prices: number[]): number {
  let profit = 0;
  
  for (let i = 1; i < prices.length; i++) {
    if (prices[i] > prices[i - 1]) {
      profit += prices[i] - prices[i - 1];
    }
  }
  
  return profit;
}
```

### 思路二：状态机 DP

```typescript
/**
 * 状态机 DP
 * 时间复杂度：O(n)
 * 空间复杂度：O(1)
 */
function maxProfit(prices: number[]): number {
  let hold = -Infinity;     // 持有股票
  let notHold = 0;          // 不持有股票
  
  for (const price of prices) {
    const prevHold = hold;
    const prevNotHold = notHold;
    
    // 持有：保持持有，或者今天买入（可以多次买入）
    hold = Math.max(prevHold, prevNotHold - price);
    
    // 不持有：保持不持有，或者今天卖出
    notHold = Math.max(prevNotHold, prevHold + price);
  }
  
  return notHold;
}
```

**注意**：`hold = Math.max(hold, notHold - price)`，因为可以无限次交易，所以买入时要基于当前的 `notHold`。

## 状态转移图

```
买卖股票 I（最多一次）：
                   买入（只能一次）
              ┌───────────────────┐
              │                   ↓
        ┌─────┴─────┐       ┌─────┴─────┐
        │  notHold  │       │   hold    │
        │  (不持有)  │       │  (持有)   │
        └─────┬─────┘       └─────┬─────┘
              │                   │
              └───────────────────┘
                    卖出

买卖股票 II（无限次）：
                   买入
              ┌───────────────────┐
              │                   ↓
        ┌─────┴─────┐       ┌─────┴─────┐
        │  notHold  │       │   hold    │
        │  (不持有)  │       │  (持有)   │
        └─────┬─────┘       └─────┬─────┘
              ↑                   │
              └───────────────────┘
                    卖出
```

## I 和 II 的对比

| 问题 | 约束 | 买入转移 |
|-----|------|---------|
| 买卖股票 I | 最多 1 次 | `max(hold, -price)` |
| 买卖股票 II | 无限次 | `max(hold, notHold - price)` |

## 二维数组写法（更清晰）

```typescript
// 买卖股票 II
function maxProfit(prices: number[]): number {
  const n = prices.length;
  
  // dp[i][0] = 第 i 天不持有股票的最大收益
  // dp[i][1] = 第 i 天持有股票的最大收益
  const dp: number[][] = Array.from(
    { length: n },
    () => new Array(2).fill(0)
  );
  
  dp[0][0] = 0;
  dp[0][1] = -prices[0];
  
  for (let i = 1; i < n; i++) {
    dp[i][0] = Math.max(dp[i - 1][0], dp[i - 1][1] + prices[i]);
    dp[i][1] = Math.max(dp[i - 1][1], dp[i - 1][0] - prices[i]);
  }
  
  return dp[n - 1][0];
}
```

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 |
|-----|-----------|-----------|
| 一次遍历（I）| O(n) | O(1) |
| 贪心（II）| O(n) | O(1) |
| 状态机 DP | O(n) | O(1) |
| 二维 DP | O(n) | O(n) |

## 本章小结

1. **买卖股票 I**：找最大差值，或者状态机限制只买一次
2. **买卖股票 II**：贪心累加上涨，或者状态机允许多次买入
3. **状态机的核心**：定义 hold 和 notHold 两个状态
4. **关键区别**：买入时是从 0 开始还是从 notHold 开始

**下一章**：我们将学习买卖股票 III 和 IV，加入"交易次数"的限制。
