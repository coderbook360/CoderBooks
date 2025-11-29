# 实战：买卖股票的最佳时机含冷冻期

状态机DP的经典问题。

## 问题描述

给定一个整数数组prices，其中prices[i]是第i天的股票价格。

设计一个算法计算最大利润。可以多次买卖，但卖出后要等一天才能再买（冷冻期）。

示例：
- prices = [1,2,3,0,2] → 3
- 买入→卖出→冷冻→买入→卖出

## 状态分析

每天结束时有三种状态：
1. 持有股票
2. 不持有股票，处于冷冻期
3. 不持有股票，不处于冷冻期

## 解法

```javascript
function maxProfit(prices) {
    const n = prices.length;
    if (n < 2) return 0;
    
    // hold: 持有股票
    // freeze: 刚卖出，冷冻期
    // free: 不持有，可以买入
    let hold = -prices[0];
    let freeze = 0;
    let free = 0;
    
    for (let i = 1; i < n; i++) {
        const newHold = Math.max(hold, free - prices[i]);
        const newFreeze = hold + prices[i];
        const newFree = Math.max(free, freeze);
        
        hold = newHold;
        freeze = newFreeze;
        free = newFree;
    }
    
    return Math.max(freeze, free);
}
```

## 状态转移详解

```
      买入(从free)
  free ---------> hold
   ↑               |
   |               | 卖出
   |               ↓
   +--------- freeze
      经过一天
```

- `hold`：从hold保持，或从free买入
- `freeze`：从hold卖出
- `free`：从free保持，或从freeze经过一天

## 二维数组写法

```javascript
function maxProfit(prices) {
    const n = prices.length;
    if (n < 2) return 0;
    
    // dp[i][0]: 第i天结束持有股票
    // dp[i][1]: 第i天结束不持有，冷冻期
    // dp[i][2]: 第i天结束不持有，非冷冻期
    const dp = Array.from({length: n}, () => [0, 0, 0]);
    
    dp[0][0] = -prices[0];
    dp[0][1] = 0;
    dp[0][2] = 0;
    
    for (let i = 1; i < n; i++) {
        dp[i][0] = Math.max(dp[i-1][0], dp[i-1][2] - prices[i]);
        dp[i][1] = dp[i-1][0] + prices[i];
        dp[i][2] = Math.max(dp[i-1][2], dp[i-1][1]);
    }
    
    return Math.max(dp[n-1][1], dp[n-1][2]);
}
```

## 简化状态

也可以用两个状态：

```javascript
function maxProfit(prices) {
    const n = prices.length;
    if (n < 2) return 0;
    
    // dp[i][0]: 第i天结束持有股票
    // dp[i][1]: 第i天结束不持有股票
    // 买入时需要看dp[i-2][1]（冷冻期）
    
    let dp0 = -prices[0];  // 持有
    let dp1 = 0;           // 不持有
    let dp1Prev = 0;       // dp[i-2][1]
    
    for (let i = 1; i < n; i++) {
        const newDp0 = Math.max(dp0, dp1Prev - prices[i]);
        const newDp1 = Math.max(dp1, dp0 + prices[i]);
        
        dp1Prev = dp1;
        dp0 = newDp0;
        dp1 = newDp1;
    }
    
    return dp1;
}
```

## 复杂度分析

- **时间复杂度**：O(n)
- **空间复杂度**：O(1)

## 股票问题系列

| 问题 | 特点 | 状态数 |
|-----|------|-------|
| 只买卖一次 | 找最大差值 | 2 |
| 无限次交易 | 贪心或DP | 2 |
| 最多k次交易 | 多维DP | 2k |
| 含冷冻期 | 状态机DP | 3 |
| 含手续费 | 状态机DP | 2 |

## 小结

买卖股票含冷冻期展示了状态机DP：
- 定义清晰的状态
- 画出状态转移图
- 写出转移方程

状态机DP的关键是正确识别所有状态和转移条件。
