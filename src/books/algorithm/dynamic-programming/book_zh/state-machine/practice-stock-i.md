# 买卖股票的最佳时机

这是股票系列的第一题，也是最简单的一题：只能买卖一次，求最大利润。

## 题目描述

给定一个数组 `prices`，它的第 `i` 个元素 `prices[i]` 表示一支给定股票第 `i` 天的价格。

你只能选择某一天买入这只股票，并选择在未来的某一个不同的日子卖出该股票。设计一个算法来计算你所能获取的最大利润。

如果你不能获取任何利润，返回 `0`。

📎 [LeetCode 121. 买卖股票的最佳时机](https://leetcode.cn/problems/best-time-to-buy-and-sell-stock/)

**示例**：

```
输入：prices = [7, 1, 5, 3, 6, 4]
输出：5
解释：在第 2 天（价格 = 1）买入，在第 5 天（价格 = 6）卖出
     利润 = 6 - 1 = 5
```

## 思路分析

### 暴力解法

枚举所有买入卖出组合：

```typescript
// 暴力解法：O(n²)
function maxProfit(prices: number[]): number {
  let maxProfit = 0;
  
  for (let i = 0; i < prices.length; i++) {
    for (let j = i + 1; j < prices.length; j++) {
      maxProfit = Math.max(maxProfit, prices[j] - prices[i]);
    }
  }
  
  return maxProfit;
}
```

### 一次遍历

**关键洞察**：如果我在第 i 天卖出，最大利润 = 第 i 天价格 - 前 i-1 天的最低价格。

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
    // 更新历史最低价
    minPrice = Math.min(minPrice, price);
    // 计算今天卖出的利润
    maxProfit = Math.max(maxProfit, price - minPrice);
  }
  
  return maxProfit;
}
```

### 状态机 DP

虽然一次遍历已经是最优解，但用状态机的视角来理解这道题，有助于解决后续更复杂的变种。

**状态定义**：
- `hold`：持有股票时的最大收益
- `notHold`：不持有股票时的最大收益

**约束**：只能买一次，所以买入时必须从 0 开始，而不是从 `notHold` 开始。

```typescript
/**
 * 状态机 DP
 * 时间复杂度：O(n)
 * 空间复杂度：O(1)
 */
function maxProfit(prices: number[]): number {
  let hold = -Infinity;   // 持有股票（买入后）
  let notHold = 0;        // 不持有股票
  
  for (const price of prices) {
    // 持有：保持持有，或者今天买入（只能买一次，所以从 0 开始）
    hold = Math.max(hold, 0 - price);
    
    // 不持有：保持不持有，或者今天卖出
    notHold = Math.max(notHold, hold + price);
  }
  
  return notHold;
}
```

**为什么 `hold = Math.max(hold, -price)` 而不是 `hold = Math.max(hold, notHold - price)`？**

因为只能买一次。如果用 `notHold - price`，当 `notHold > 0` 时，相当于用之前赚的钱来买，但我们还没卖过，所以 `notHold` 应该是 0。

## 状态转移图

```
     初始状态
         │
         │ 买入（-price）
         ↓
    ┌─────────┐
    │  hold   │ ←─┐
    │ (持有)  │   │ 保持
    └────┬────┘ ──┘
         │
         │ 卖出（+price）
         ↓
    ┌─────────┐
    │ notHold │ ←─┐
    │(不持有) │   │ 保持
    └─────────┘ ──┘
```

## 示例演算

以 `prices = [7, 1, 5, 3, 6, 4]` 为例：

| 天 | 价格 | hold | notHold | 说明 |
|---|------|------|---------|------|
| 0 | 7 | -7 | 0 | 买入 |
| 1 | 1 | -1 | 0 | 更低价买入 |
| 2 | 5 | -1 | 4 | 卖出得 5-1=4 |
| 3 | 3 | -1 | 4 | 保持 |
| 4 | 6 | -1 | 5 | 卖出得 6-1=5 |
| 5 | 4 | -1 | 5 | 保持 |

最终答案：5

## 二维数组写法

```typescript
function maxProfit(prices: number[]): number {
  const n = prices.length;
  if (n === 0) return 0;
  
  // dp[i][0] = 第 i 天不持有股票的最大收益
  // dp[i][1] = 第 i 天持有股票的最大收益
  const dp: number[][] = Array.from(
    { length: n },
    () => [0, 0]
  );
  
  dp[0][0] = 0;
  dp[0][1] = -prices[0];
  
  for (let i = 1; i < n; i++) {
    dp[i][0] = Math.max(dp[i - 1][0], dp[i - 1][1] + prices[i]);
    dp[i][1] = Math.max(dp[i - 1][1], -prices[i]);  // 注意：只能买一次
  }
  
  return dp[n - 1][0];
}
```

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 |
|-----|-----------|-----------|
| 暴力 | O(n²) | O(1) |
| 一次遍历 | O(n) | O(1) |
| 状态机 DP | O(n) | O(1) |

## 本章小结

1. **问题本质**：找 `prices[j] - prices[i]` 的最大值（j > i）
2. **一次遍历**：维护历史最低价，O(n) 解决
3. **状态机视角**：两个状态，但买入只能从 0 开始
4. **为后续铺垫**：状态机的思路可以推广到更复杂的变种
