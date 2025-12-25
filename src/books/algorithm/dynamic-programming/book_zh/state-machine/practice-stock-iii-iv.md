# 买卖股票的最佳时机 III & IV

买卖股票 III 和 IV 是在 I、II 的基础上，加入了"交易次数限制"的约束。这需要在状态中额外记录交易次数。

## 买卖股票 III

### 题目描述

给定一个数组，它的第 `i` 个元素是一支给定的股票在第 `i` 天的价格。

设计一个算法来计算你所能获取的最大利润。你最多可以完成**两笔**交易。

📎 [LeetCode 123. 买卖股票的最佳时机 III](https://leetcode.cn/problems/best-time-to-buy-and-sell-stock-iii/)

**示例**：

```
输入：prices = [3, 3, 5, 0, 0, 3, 1, 4]
输出：6
解释：
第 4 天买入，第 6 天卖出，利润 = 3 - 0 = 3
第 7 天买入，第 8 天卖出，利润 = 4 - 1 = 3
总利润 = 3 + 3 = 6
```

### 状态定义

由于最多两笔交易，需要记录：
- 当前天数
- 持有/不持有股票
- 已完成的交易次数（0、1、2）

定义五个状态变量：
- `notHold0`：完成 0 笔交易，不持有股票
- `hold1`：准备进行第 1 笔交易，持有股票
- `notHold1`：完成 1 笔交易，不持有股票
- `hold2`：准备进行第 2 笔交易，持有股票
- `notHold2`：完成 2 笔交易，不持有股票

### 代码实现

```typescript
/**
 * 状态机 DP
 * 时间复杂度：O(n)
 * 空间复杂度：O(1)
 */
function maxProfit(prices: number[]): number {
  // 初始化：第 0 天之前
  let hold1 = -Infinity;      // 第一次买入后
  let notHold1 = -Infinity;   // 第一次卖出后
  let hold2 = -Infinity;      // 第二次买入后
  let notHold2 = -Infinity;   // 第二次卖出后
  
  for (const price of prices) {
    // 注意更新顺序：从后往前更新，或者用临时变量
    hold1 = Math.max(hold1, -price);
    notHold1 = Math.max(notHold1, hold1 + price);
    hold2 = Math.max(hold2, notHold1 - price);
    notHold2 = Math.max(notHold2, hold2 + price);
  }
  
  // 返回不持有股票的最大值（可能是 0、1、2 笔交易）
  return Math.max(0, notHold1, notHold2);
}
```

### 状态转移图

```
第 0 笔      第 1 笔交易        第 2 笔交易
┌────┐     ┌──────────┐     ┌──────────┐
│ 0  │ ──→ │ hold1    │ ──→ │ notHold1 │ ──→ │ hold2    │ ──→ │ notHold2 │
│    │买入  │(第1次持有)│卖出  │(第1次完成)│买入  │(第2次持有)│卖出  │(第2次完成)│
└────┘     └──────────┘     └──────────┘
```

## 买卖股票 IV

### 题目描述

给你一个整数数组 `prices` 和一个整数 `k`，其中 `prices[i]` 是某支股票第 `i` 天的价格。

设计一个算法来计算你所能获取的最大利润。你最多可以完成 `k` 笔交易。

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

### 状态定义

- `dp[j][0]` = 完成 j 笔交易，不持有股票时的最大收益
- `dp[j][1]` = 完成 j-1 笔交易后买入，持有股票时的最大收益

### 代码实现

```typescript
/**
 * 状态机 DP
 * 时间复杂度：O(n * k)
 * 空间复杂度：O(k)
 */
function maxProfit(k: number, prices: number[]): number {
  const n = prices.length;
  if (n === 0 || k === 0) return 0;
  
  // 优化：如果 k >= n/2，相当于无限次交易
  if (k >= n / 2) {
    return maxProfitUnlimited(prices);
  }
  
  // dp[j][0] = 完成 j 笔交易，不持有股票
  // dp[j][1] = 准备完成第 j 笔交易，持有股票
  const dp: number[][] = Array.from(
    { length: k + 1 },
    () => [-Infinity, -Infinity]
  );
  dp[0][0] = 0;  // 0 笔交易，不持有股票，收益为 0
  
  for (const price of prices) {
    for (let j = k; j >= 1; j--) {
      // 完成 j 笔交易，不持有：保持，或卖出
      dp[j][0] = Math.max(dp[j][0], dp[j][1] + price);
      
      // 准备第 j 笔交易，持有：保持，或买入（从 j-1 笔不持有状态买入）
      dp[j][1] = Math.max(dp[j][1], dp[j - 1][0] - price);
    }
  }
  
  // 返回最大收益
  return Math.max(0, ...dp.map(d => d[0]));
}

// 无限次交易（同买卖股票 II）
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

### 更直观的二维写法

```typescript
function maxProfit(k: number, prices: number[]): number {
  const n = prices.length;
  if (n === 0 || k === 0) return 0;
  
  if (k >= n / 2) {
    let profit = 0;
    for (let i = 1; i < n; i++) {
      profit += Math.max(0, prices[i] - prices[i - 1]);
    }
    return profit;
  }
  
  // buy[j] = 完成 j-1 笔交易后买入的最大收益
  // sell[j] = 完成 j 笔交易后的最大收益
  const buy = new Array(k + 1).fill(-Infinity);
  const sell = new Array(k + 1).fill(0);
  sell[0] = 0;
  
  for (const price of prices) {
    for (let j = 1; j <= k; j++) {
      buy[j] = Math.max(buy[j], sell[j - 1] - price);
      sell[j] = Math.max(sell[j], buy[j] + price);
    }
  }
  
  return Math.max(...sell);
}
```

## III 和 IV 的对比

| 问题 | 约束 | 状态数量 |
|-----|------|---------|
| 买卖股票 III | 最多 2 次 | 5 个状态 |
| 买卖股票 IV | 最多 k 次 | 2k+1 个状态 |

## 完整状态机模板

```typescript
/**
 * 通用买卖股票模板（最多 k 次交易）
 */
function maxProfit(k: number, prices: number[]): number {
  const n = prices.length;
  if (n === 0 || k === 0) return 0;
  
  // 状态：dp[i][j][h]
  // i = 第几天
  // j = 已完成的交易次数
  // h = 是否持有股票 (0 = 不持有, 1 = 持有)
  
  // 优化空间后：dp[j][h]
  const dp: number[][] = Array.from(
    { length: k + 1 },
    () => new Array(2).fill(-Infinity)
  );
  dp[0][0] = 0;  // 0 次交易，不持有，收益 0
  
  for (const price of prices) {
    // 从后往前更新，避免覆盖
    for (let j = k; j >= 1; j--) {
      // 不持有：保持，或卖出
      dp[j][0] = Math.max(dp[j][0], dp[j][1] + price);
      
      // 持有：保持，或买入（买入消耗一次交易机会）
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

## 复杂度分析

| 问题 | 时间复杂度 | 空间复杂度 |
|-----|-----------|-----------|
| 买卖股票 III | O(n) | O(1) |
| 买卖股票 IV | O(n × k) | O(k) |

## k 的特殊情况

- `k = 0`：不能交易，返回 0
- `k = 1`：买卖股票 I
- `k = 2`：买卖股票 III
- `k >= n/2`：相当于无限次（买卖股票 II）

## 本章小结

1. **买卖股票 III**：最多 2 次交易，需要 5 个状态
2. **买卖股票 IV**：最多 k 次交易，需要 2k+1 个状态
3. **状态设计**：(交易次数, 是否持有) 二元组
4. **优化技巧**：k >= n/2 时退化为无限次交易

**下一章**：我们将学习带有冷冻期和手续费的变种问题。
