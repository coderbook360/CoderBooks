# 买卖股票系列总结

回顾整个股票问题系列，总结状态机 DP 的核心模式。

## 题目汇总

| 问题 | 约束 | LeetCode |
|-----|------|----------|
| 股票 I | 最多 1 次交易 | [121](https://leetcode.cn/problems/best-time-to-buy-and-sell-stock/) |
| 股票 II | 无限次交易 | [122](https://leetcode.cn/problems/best-time-to-buy-and-sell-stock-ii/) |
| 股票 III | 最多 2 次交易 | [123](https://leetcode.cn/problems/best-time-to-buy-and-sell-stock-iii/) |
| 股票 IV | 最多 k 次交易 | [188](https://leetcode.cn/problems/best-time-to-buy-and-sell-stock-iv/) |
| 含冷冻期 | 无限次 + 冷冻期 | [309](https://leetcode.cn/problems/best-time-to-buy-and-sell-stock-with-cooldown/) |
| 含手续费 | 无限次 + 手续费 | [714](https://leetcode.cn/problems/best-time-to-buy-and-sell-stock-with-transaction-fee/) |

## 统一框架

所有股票问题都可以用同一个框架解决：

```typescript
/**
 * 股票问题通用框架
 * @param prices 每天的价格
 * @param k 最多交易次数（Infinity 表示无限）
 * @param cooldown 冷冻期天数
 * @param fee 每次交易手续费
 */
function maxProfit(
  prices: number[],
  k: number = Infinity,
  cooldown: number = 0,
  fee: number = 0
): number {
  const n = prices.length;
  if (n === 0) return 0;
  
  // 如果 k >= n/2，相当于无限次
  if (k >= Math.floor(n / 2)) k = Infinity;
  
  if (k === Infinity) {
    // 无限次交易
    return maxProfitUnlimited(prices, cooldown, fee);
  } else {
    // 有限次交易
    return maxProfitLimited(prices, k, fee);
  }
}

// 无限次交易（处理冷冻期和手续费）
function maxProfitUnlimited(
  prices: number[],
  cooldown: number,
  fee: number
): number {
  const n = prices.length;
  
  // dp[i][j] = 第 i 天状态 j 的最大收益
  // j = 0: 不持有, j = 1: 持有
  // 为处理冷冻期，需要保留 cooldown+1 天的状态
  
  let hold = -prices[0];
  let notHold = 0;
  const notHoldHistory: number[] = new Array(cooldown + 1).fill(0);
  
  for (let i = 1; i < n; i++) {
    const prevHold = hold;
    
    // 买入：从 cooldown 天前的不持有状态
    const canBuyFrom = notHoldHistory[0];
    hold = Math.max(hold, canBuyFrom - prices[i]);
    
    // 卖出：从持有状态（扣手续费）
    notHold = Math.max(notHold, prevHold + prices[i] - fee);
    
    // 更新历史
    notHoldHistory.shift();
    notHoldHistory.push(notHold);
  }
  
  return notHold;
}

// 有限次交易
function maxProfitLimited(
  prices: number[],
  k: number,
  fee: number
): number {
  const buy = new Array(k + 1).fill(-Infinity);
  const sell = new Array(k + 1).fill(0);
  
  for (const price of prices) {
    for (let j = 1; j <= k; j++) {
      buy[j] = Math.max(buy[j], sell[j - 1] - price);
      sell[j] = Math.max(sell[j], buy[j] + price - fee);
    }
  }
  
  return Math.max(...sell);
}
```

## 状态转移对比

| 问题 | hold 更新 | notHold 更新 |
|-----|----------|-------------|
| I | `max(hold, -price)` | `max(notHold, hold + price)` |
| II | `max(hold, notHold - price)` | `max(notHold, hold + price)` |
| III/IV | `max(hold, sell[j-1] - price)` | `max(sell, buy + price)` |
| 冷冻期 | `max(hold, notHold[i-2] - price)` | `max(notHold, hold + price)` |
| 手续费 | `max(hold, notHold - price)` | `max(notHold, hold + price - fee)` |

## 简化代码模板

### 股票 I（1 次）

```typescript
function maxProfit(prices: number[]): number {
  let hold = -Infinity, notHold = 0;
  for (const p of prices) {
    hold = Math.max(hold, -p);
    notHold = Math.max(notHold, hold + p);
  }
  return notHold;
}
```

### 股票 II（无限次）

```typescript
function maxProfit(prices: number[]): number {
  let hold = -Infinity, notHold = 0;
  for (const p of prices) {
    [hold, notHold] = [
      Math.max(hold, notHold - p),
      Math.max(notHold, hold + p)
    ];
  }
  return notHold;
}
```

### 股票 III（2 次）

```typescript
function maxProfit(prices: number[]): number {
  let b1 = -Infinity, s1 = 0, b2 = -Infinity, s2 = 0;
  for (const p of prices) {
    b1 = Math.max(b1, -p);
    s1 = Math.max(s1, b1 + p);
    b2 = Math.max(b2, s1 - p);
    s2 = Math.max(s2, b2 + p);
  }
  return s2;
}
```

### 股票 IV（k 次）

```typescript
function maxProfit(k: number, prices: number[]): number {
  if (k >= prices.length / 2) {
    // 无限次
    let profit = 0;
    for (let i = 1; i < prices.length; i++)
      profit += Math.max(0, prices[i] - prices[i - 1]);
    return profit;
  }
  
  const buy = new Array(k + 1).fill(-Infinity);
  const sell = new Array(k + 1).fill(0);
  for (const p of prices) {
    for (let j = 1; j <= k; j++) {
      buy[j] = Math.max(buy[j], sell[j - 1] - p);
      sell[j] = Math.max(sell[j], buy[j] + p);
    }
  }
  return Math.max(...sell);
}
```

### 含冷冻期

```typescript
function maxProfit(prices: number[]): number {
  let hold = -Infinity, notHold = 0, notHoldPrev = 0;
  for (const p of prices) {
    const prevHold = hold;
    hold = Math.max(hold, notHoldPrev - p);
    notHoldPrev = notHold;
    notHold = Math.max(notHold, prevHold + p);
  }
  return notHold;
}
```

### 含手续费

```typescript
function maxProfit(prices: number[], fee: number): number {
  let hold = -Infinity, notHold = 0;
  for (const p of prices) {
    [hold, notHold] = [
      Math.max(hold, notHold - p),
      Math.max(notHold, hold + p - fee)
    ];
  }
  return notHold;
}
```

## 复杂度汇总

| 问题 | 时间复杂度 | 空间复杂度 |
|-----|-----------|-----------|
| 股票 I | O(n) | O(1) |
| 股票 II | O(n) | O(1) |
| 股票 III | O(n) | O(1) |
| 股票 IV | O(n × k) | O(k) |
| 含冷冻期 | O(n) | O(1) |
| 含手续费 | O(n) | O(1) |

## 状态机 DP 的核心思想

通过股票系列，我们掌握了状态机 DP 的核心：

1. **识别状态**：问题中有哪些互斥的情况？
2. **画状态图**：状态之间如何转换？
3. **定义转移**：每个状态的值如何计算？
4. **处理边界**：初始状态是什么？
5. **确定答案**：最终哪个状态是目标？

这种思维模式可以推广到其他问题：
- 打家劫舍系列
- 粉刷房子系列
- 字符串匹配问题
- 有限状态自动机问题

## 练习建议

1. **按顺序刷**：I → II → III → IV → 冷冻期 → 手续费
2. **理解状态**：每道题先画状态转移图
3. **写出模板**：熟练掌握各种变种的代码
4. **举一反三**：把思想迁移到其他问题

## 本章小结

1. **统一框架**：所有股票问题都是状态机 DP
2. **关键变量**：hold、notHold（或 buy、sell）
3. **变种处理**：交易次数、冷冻期、手续费
4. **核心技巧**：正确的状态转移和边界处理
