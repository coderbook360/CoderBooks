# 实战：买卖股票的最佳时机含手续费

每次交易需要手续费。

## 问题描述

给定一个整数数组prices，其中prices[i]是第i天的股票价格，整数fee代表交易手续费。

可以完成任意次数的交易，但每笔交易都需要付手续费。

返回获得利润的最大值。

示例：
- prices = [1,3,2,8,4,9], fee = 2 → 8
- 买1卖8（利润7-2=5），买4卖9（利润5-2=3）

## 分析

与无限次交易类似，但每次卖出要扣手续费。

## 解法

```javascript
function maxProfit(prices, fee) {
    const n = prices.length;
    
    // hold: 持有股票的最大利润
    // free: 不持有股票的最大利润
    let hold = -prices[0];
    let free = 0;
    
    for (let i = 1; i < n; i++) {
        const newHold = Math.max(hold, free - prices[i]);
        const newFree = Math.max(free, hold + prices[i] - fee);
        
        hold = newHold;
        free = newFree;
    }
    
    return free;
}
```

## 状态转移

- `hold`：保持持有，或从不持有买入
- `free`：保持不持有，或从持有卖出（扣手续费）

```javascript
hold = max(hold, free - prices[i])
free = max(free, hold + prices[i] - fee)
```

## 手续费何时扣

可以在买入时扣，也可以在卖出时扣，结果相同：

```javascript
// 卖出时扣（上面的写法）
hold = max(hold, free - prices[i])
free = max(free, hold + prices[i] - fee)

// 买入时扣
hold = max(hold, free - prices[i] - fee)
free = max(free, hold + prices[i])
```

## 贪心解法

```javascript
function maxProfit(prices, fee) {
    let profit = 0;
    let minPrice = prices[0];
    
    for (let i = 1; i < prices.length; i++) {
        if (prices[i] < minPrice) {
            minPrice = prices[i];
        } else if (prices[i] > minPrice + fee) {
            profit += prices[i] - minPrice - fee;
            // 虚拟卖出，但保留继续持有的可能
            minPrice = prices[i] - fee;
        }
    }
    
    return profit;
}
```

贪心的技巧：`minPrice = prices[i] - fee`允许继续上涨时合并交易。

## 与无手续费版本的对比

```javascript
// 无手续费
free = max(free, hold + prices[i])

// 有手续费
free = max(free, hold + prices[i] - fee)
```

差别就是卖出时减去fee。

## 复杂度分析

- **时间复杂度**：O(n)
- **空间复杂度**：O(1)

## 小结

买卖股票含手续费相对简单：
- 状态机只有两个状态
- 卖出时扣除手续费

手续费会减少交易次数，避免频繁买卖。
