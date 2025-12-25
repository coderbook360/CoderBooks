# 最佳买卖股票时机含冷冻期

在买卖股票 II 的基础上，加入"冷冻期"限制：卖出后必须等一天才能再次买入。

## 题目描述

给定一个整数数组 `prices`，其中 `prices[i]` 表示第 `i` 天的股票价格。

设计一个算法计算出最大利润。在满足以下约束条件下，你可以尽可能地完成更多的交易（多次买卖一支股票）：

- 卖出股票后，你无法在第二天买入股票（即冷冻期为 1 天）

📎 [LeetCode 309. 最佳买卖股票时机含冷冻期](https://leetcode.cn/problems/best-time-to-buy-and-sell-stock-with-cooldown/)

**示例**：

```
输入：prices = [1, 2, 3, 0, 2]
输出：3
解释：
第 1 天买入，第 2 天卖出，利润 = 2 - 1 = 1
第 3 天是冷冻期，不能买入
第 4 天买入，第 5 天卖出，利润 = 2 - 0 = 2
总利润 = 1 + 2 = 3
```

## 状态分析

普通的买卖股票只有两个状态：持有、不持有。

加入冷冻期后，"不持有"需要细分：
- **冷冻期**：刚卖出，明天不能买
- **非冷冻期**：可以买入

因此需要三个状态：
- `hold`：持有股票
- `frozen`：冷冻期（刚卖出）
- `notHold`：不持有，非冷冻期

## 状态转移

```
                  买入
              ┌───────────────────┐
              │                   ↓
        ┌─────┴─────┐       ┌─────┴─────┐
        │  notHold  │       │   hold    │
        │ (可以买入) │       │  (持有)   │
        └─────┬─────┘       └─────┬─────┘
              ↑                   │
              │                   │ 卖出
              │                   ↓
              │           ┌─────────────┐
              └───────────│   frozen    │
                  休息     │  (冷冻期)  │
                          └─────────────┘
```

状态转移方程：
- `hold[i] = max(hold[i-1], notHold[i-1] - price)`
- `frozen[i] = hold[i-1] + price`（卖出进入冷冻期）
- `notHold[i] = max(notHold[i-1], frozen[i-1])`（冷冻期过后）

## 代码实现

### 三状态写法

```typescript
/**
 * 三状态状态机 DP
 * 时间复杂度：O(n)
 * 空间复杂度：O(1)
 */
function maxProfit(prices: number[]): number {
  if (prices.length === 0) return 0;
  
  let hold = -prices[0];  // 持有股票
  let frozen = 0;         // 冷冻期（刚卖出）
  let notHold = 0;        // 不持有，可以买入
  
  for (let i = 1; i < prices.length; i++) {
    const prevHold = hold;
    const prevFrozen = frozen;
    const prevNotHold = notHold;
    
    // 持有：保持持有，或者从非冷冻期买入
    hold = Math.max(prevHold, prevNotHold - prices[i]);
    
    // 冷冻：从持有状态卖出
    frozen = prevHold + prices[i];
    
    // 非冷冻不持有：保持，或者从冷冻期过来
    notHold = Math.max(prevNotHold, prevFrozen);
  }
  
  // 最后一天不应该持有股票
  return Math.max(frozen, notHold);
}
```

### 两状态写法（更简洁）

另一种理解方式：
- `hold[i]`：第 i 天持有股票的最大收益
- `notHold[i]`：第 i 天不持有股票的最大收益

买入时需要看 `notHold[i-2]`（跳过冷冻期）：

```typescript
/**
 * 两状态 + 延迟一天
 * 时间复杂度：O(n)
 * 空间复杂度：O(1)
 */
function maxProfit(prices: number[]): number {
  const n = prices.length;
  if (n === 0) return 0;
  
  let hold = -prices[0];
  let notHold = 0;
  let notHoldPrev = 0;  // notHold[i-2]
  
  for (let i = 1; i < n; i++) {
    const prevHold = hold;
    const prevNotHold = notHold;
    
    // 持有：保持，或者从 i-2 天的不持有状态买入
    hold = Math.max(prevHold, notHoldPrev - prices[i]);
    
    // 不持有：保持，或者卖出
    notHold = Math.max(prevNotHold, prevHold + prices[i]);
    
    // 更新 notHold[i-2] 为 notHold[i-1]
    notHoldPrev = prevNotHold;
  }
  
  return notHold;
}
```

### 二维数组写法（最清晰）

```typescript
/**
 * 二维 DP
 * 时间复杂度：O(n)
 * 空间复杂度：O(n)
 */
function maxProfit(prices: number[]): number {
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
    // 不持有：保持，或者卖出
    dp[i][0] = Math.max(dp[i - 1][0], dp[i - 1][1] + prices[i]);
    
    // 持有：保持，或者从 i-2 的不持有状态买入
    if (i >= 2) {
      dp[i][1] = Math.max(dp[i - 1][1], dp[i - 2][0] - prices[i]);
    } else {
      // i = 1 时，i-2 不存在，用 0 代替
      dp[i][1] = Math.max(dp[i - 1][1], -prices[i]);
    }
  }
  
  return dp[n - 1][0];
}
```

## 示例演算

以 `prices = [1, 2, 3, 0, 2]` 为例：

| 天 | 价格 | hold | frozen | notHold |
|---|------|------|--------|---------|
| 0 | 1 | -1 | 0 | 0 |
| 1 | 2 | -1 | 1 | 0 |
| 2 | 3 | -1 | 2 | 1 |
| 3 | 0 | 1 | -1 | 2 |
| 4 | 2 | 1 | 3 | 2 |

最终答案：`max(frozen, notHold) = max(3, 2) = 3`

## 与其他变种的对比

| 问题 | 状态数 | 买入条件 |
|-----|-------|---------|
| 买卖股票 II | 2 | `notHold[i-1] - price` |
| 含冷冻期 | 3 | `notHold[i-2] - price` |
| 含手续费 | 2 | `notHold[i-1] - price` |

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 |
|-----|-----------|-----------|
| 三状态 | O(n) | O(1) |
| 两状态 | O(n) | O(1) |
| 二维 DP | O(n) | O(n) |

## 本章小结

1. **冷冻期的本质**：卖出后的"不持有"状态需要细分
2. **三状态设计**：hold、frozen、notHold
3. **简化理解**：买入时看 `notHold[i-2]` 而不是 `notHold[i-1]`
4. **状态转移**：冷冻期是 hold → frozen → notHold 的过渡

**下一章**：我们将学习带手续费的股票买卖问题。
