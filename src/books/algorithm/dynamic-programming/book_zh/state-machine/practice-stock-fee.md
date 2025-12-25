# 买卖股票的最佳时机含手续费

在买卖股票 II 的基础上，每次卖出时需要支付手续费。

## 题目描述

给定一个整数数组 `prices`，其中 `prices[i]` 表示第 `i` 天的股票价格；整数 `fee` 代表了交易股票的手续费用。

你可以无限次地完成交易，但是你每笔交易都需要付手续费。如果你已经购买了一个股票，在卖出它之前你就不能再继续购买股票了。

返回获得利润的最大值。

📎 [LeetCode 714. 买卖股票的最佳时机含手续费](https://leetcode.cn/problems/best-time-to-buy-and-sell-stock-with-transaction-fee/)

**示例**：

```
输入：prices = [1, 3, 2, 8, 4, 9], fee = 2
输出：8
解释：
第 1 天买入，第 4 天卖出，利润 = 8 - 1 - 2 = 5
第 5 天买入，第 6 天卖出，利润 = 9 - 4 - 2 = 3
总利润 = 5 + 3 = 8
```

## 问题分析

与买卖股票 II 的区别：
- 每次完成一笔交易（卖出）时，需要支付 `fee` 的手续费
- 手续费会影响是否进行交易的决策

## 状态定义

和买卖股票 II 完全一样：
- `hold`：持有股票时的最大收益
- `notHold`：不持有股票时的最大收益

关键是在卖出时扣除手续费。

## 状态转移

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
                 卖出（扣手续费）
```

状态转移方程：
- `hold[i] = max(hold[i-1], notHold[i-1] - price)`
- `notHold[i] = max(notHold[i-1], hold[i-1] + price - fee)`

## 代码实现

### 标准写法

```typescript
/**
 * 状态机 DP
 * 时间复杂度：O(n)
 * 空间复杂度：O(1)
 */
function maxProfit(prices: number[], fee: number): number {
  let hold = -Infinity;     // 持有股票
  let notHold = 0;          // 不持有股票
  
  for (const price of prices) {
    const prevHold = hold;
    const prevNotHold = notHold;
    
    // 持有：保持持有，或者买入
    hold = Math.max(prevHold, prevNotHold - price);
    
    // 不持有：保持不持有，或者卖出（扣手续费）
    notHold = Math.max(prevNotHold, prevHold + price - fee);
  }
  
  return notHold;
}
```

### 手续费在买入时扣

也可以在买入时扣手续费，效果一样：

```typescript
function maxProfit(prices: number[], fee: number): number {
  let hold = -Infinity;
  let notHold = 0;
  
  for (const price of prices) {
    const prevHold = hold;
    const prevNotHold = notHold;
    
    // 持有：保持，或者买入（扣手续费）
    hold = Math.max(prevHold, prevNotHold - price - fee);
    
    // 不持有：保持，或者卖出
    notHold = Math.max(prevNotHold, prevHold + price);
  }
  
  return notHold;
}
```

### 二维数组写法

```typescript
function maxProfit(prices: number[], fee: number): number {
  const n = prices.length;
  if (n === 0) return 0;
  
  // dp[i][0] = 第 i 天不持有股票的最大收益
  // dp[i][1] = 第 i 天持有股票的最大收益
  const dp: number[][] = Array.from(
    { length: n },
    () => new Array(2).fill(0)
  );
  
  dp[0][0] = 0;
  dp[0][1] = -prices[0];
  
  for (let i = 1; i < n; i++) {
    dp[i][0] = Math.max(dp[i - 1][0], dp[i - 1][1] + prices[i] - fee);
    dp[i][1] = Math.max(dp[i - 1][1], dp[i - 1][0] - prices[i]);
  }
  
  return dp[n - 1][0];
}
```

## 与贪心的对比

买卖股票 II 可以用贪心（累加上涨），但含手续费不能直接贪心。

**为什么？**

贪心会把一段连续上涨拆成多次交易，每次都扣手续费：

```
prices = [1, 3, 7], fee = 2

贪心做法：
第 1-2 天：3 - 1 - 2 = 0
第 2-3 天：7 - 3 - 2 = 2
总利润 = 2

最优做法：
第 1-3 天：7 - 1 - 2 = 4
```

手续费使得"合并交易"比"多次交易"更优。

## 示例演算

以 `prices = [1, 3, 2, 8, 4, 9], fee = 2` 为例：

| 天 | 价格 | hold | notHold | 说明 |
|---|------|------|---------|------|
| 0 | 1 | -1 | 0 | 买入 |
| 1 | 3 | -1 | 0 | 卖出利润 = 3 - 1 - 2 = 0，不值得 |
| 2 | 2 | -1 | 0 | 持有更优 |
| 3 | 8 | -1 | 5 | 卖出！8 - 1 - 2 = 5 |
| 4 | 4 | 1 | 5 | 买入！5 - 4 = 1 |
| 5 | 9 | 1 | 8 | 卖出！1 + 9 - 2 = 8 |

最终答案：8

## 股票问题总结

| 问题 | 交易次数 | 特殊限制 | 状态转移特点 |
|-----|---------|---------|-------------|
| I | 1 次 | 无 | `hold = max(hold, -price)` |
| II | 无限 | 无 | `hold = max(hold, notHold - price)` |
| III | 2 次 | 无 | 需要 5 个状态 |
| IV | k 次 | 无 | 需要 2k+1 个状态 |
| 冷冻期 | 无限 | 卖出后休息 1 天 | `hold = max(hold, notHold[i-2] - price)` |
| 手续费 | 无限 | 每笔交易扣 fee | `notHold = max(notHold, hold + price - fee)` |

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 |
|-----|-----------|-----------|
| 状态机 DP | O(n) | O(1) |
| 二维 DP | O(n) | O(n) |

## 本章小结

1. **手续费的影响**：每笔交易需要扣除 fee
2. **状态机不变**：仍然是 hold 和 notHold 两个状态
3. **卖出时扣费**：`notHold = max(notHold, hold + price - fee)`
4. **不能贪心**：手续费使得合并交易可能更优

## 状态机 DP 系列总结

经过股票问题的学习，我们掌握了状态机 DP 的核心思想：

1. **识别状态**：问题中有哪些互斥的状态？
2. **画状态图**：状态之间如何转换？
3. **定义转移**：每个状态从哪些状态转移而来？
4. **处理边界**：初始状态如何定义？

这种思维模式可以推广到其他问题，如：
- 打家劫舍系列
- 字符串匹配问题
- 有限状态自动机问题
