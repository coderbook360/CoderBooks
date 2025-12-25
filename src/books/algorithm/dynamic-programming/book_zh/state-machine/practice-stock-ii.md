# 买卖股票的最佳时机 II

可以无限次买卖，求最大利润。

## 题目描述

给你一个整数数组 `prices`，其中 `prices[i]` 表示某支股票第 `i` 天的价格。

在每一天，你可以决定是否购买和/或出售股票。你在任何时候最多只能持有一股股票。你也可以先购买，然后在同一天出售。

返回你能获得的最大利润。

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

## 思路分析

### 贪心解法

**关键洞察**：只要明天比今天贵，就今天买明天卖。

因为可以无限次交易，所以把所有上涨段都吃掉就是最优解。

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

**为什么贪心是正确的？**

假设价格是 `[1, 3, 5]`：
- 贪心：`(3-1) + (5-3) = 4`
- 一次交易：`5-1 = 4`

两者相等！因为 `(b-a) + (c-b) = c-a`。

### 状态机 DP

**状态定义**：
- `hold`：持有股票时的最大收益
- `notHold`：不持有股票时的最大收益

**与股票 I 的区别**：可以多次买入，所以买入时要从 `notHold` 开始。

```typescript
/**
 * 状态机 DP
 * 时间复杂度：O(n)
 * 空间复杂度：O(1)
 */
function maxProfit(prices: number[]): number {
  let hold = -Infinity;   // 持有股票
  let notHold = 0;        // 不持有股票
  
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

## 状态转移图

```
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

与股票 I 的区别：**买入箭头从 notHold 出发**，而不是从初始状态。

## 股票 I vs 股票 II

| 问题 | 买入转移 | 原因 |
|-----|---------|------|
| 股票 I | `hold = max(hold, -price)` | 只能买一次，从 0 开始 |
| 股票 II | `hold = max(hold, notHold - price)` | 可以多次买入 |

```typescript
// 股票 I：只能买一次
hold = Math.max(hold, -price);  // 从 0 开始

// 股票 II：可以多次买入
hold = Math.max(hold, notHold - price);  // 从上次卖出后的收益开始
```

## 示例演算

以 `prices = [7, 1, 5, 3, 6, 4]` 为例：

| 天 | 价格 | hold | notHold | 说明 |
|---|------|------|---------|------|
| 0 | 7 | -7 | 0 | 买入 |
| 1 | 1 | -1 | 0 | 更低价买入 |
| 2 | 5 | -1 | 4 | 卖出，赚 4 |
| 3 | 3 | 1 | 4 | 买入，4-3=1 |
| 4 | 6 | 1 | 7 | 卖出，1+6=7 |
| 5 | 4 | 3 | 7 | 可以买入，但不影响最终 |

最终答案：7

## 二维数组写法

```typescript
function maxProfit(prices: number[]): number {
  const n = prices.length;
  if (n === 0) return 0;
  
  const dp: number[][] = Array.from(
    { length: n },
    () => [0, 0]
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

## 贪心 vs 状态机 DP

| 解法 | 优点 | 适用场景 |
|-----|------|---------|
| 贪心 | 代码简洁，直观 | 只适用于无限次交易 |
| 状态机 DP | 通用性强，可扩展 | 所有股票问题变种 |

**建议**：虽然贪心更简单，但建议用状态机 DP 来理解，因为后续变种（冷冻期、手续费、k 次交易）都需要状态机。

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 |
|-----|-----------|-----------|
| 贪心 | O(n) | O(1) |
| 状态机 DP | O(n) | O(1) |

## 本章小结

1. **贪心思路**：累加所有上涨段
2. **状态机思路**：hold 和 notHold 两个状态
3. **与股票 I 的区别**：买入时从 `notHold` 开始
4. **为什么学状态机**：后续变种都基于这个框架
