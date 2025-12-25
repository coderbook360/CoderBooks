# 买卖股票的最佳时机 III

最多可以完成两笔交易，求最大利润。

## 题目描述

给定一个数组，它的第 `i` 个元素是一支给定的股票在第 `i` 天的价格。

设计一个算法来计算你所能获取的最大利润。你最多可以完成**两笔**交易。

注意：你不能同时参与多笔交易（你必须在再次购买前出售掉之前的股票）。

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

## 状态分析

由于最多两笔交易，状态需要记录：
- 当前持有/不持有股票
- 已完成的交易次数（0、1、2）

定义五个状态：
- `notHold0`：完成 0 笔交易，不持有股票（初始状态）
- `hold1`：准备进行第 1 笔交易，持有股票
- `notHold1`：完成 1 笔交易，不持有股票
- `hold2`：准备进行第 2 笔交易，持有股票
- `notHold2`：完成 2 笔交易，不持有股票

## 状态转移图

```
0笔交易        第1笔交易              第2笔交易
┌────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│notHold0│──→│  hold1   │──→│ notHold1 │──→│  hold2   │──→│ notHold2 │
│  (=0)  │买入│(第1次持有)│卖出│(第1次完成)│买入│(第2次持有)│卖出│(第2次完成)│
└────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘
```

## 代码实现

### 五状态写法

```typescript
/**
 * 五状态状态机 DP
 * 时间复杂度：O(n)
 * 空间复杂度：O(1)
 */
function maxProfit(prices: number[]): number {
  // 初始化
  let hold1 = -Infinity;      // 第一次买入后
  let notHold1 = -Infinity;   // 第一次卖出后
  let hold2 = -Infinity;      // 第二次买入后
  let notHold2 = -Infinity;   // 第二次卖出后
  
  for (const price of prices) {
    // 注意更新顺序：从后往前，或者用临时变量
    // 第一次买入
    hold1 = Math.max(hold1, -price);
    // 第一次卖出
    notHold1 = Math.max(notHold1, hold1 + price);
    // 第二次买入
    hold2 = Math.max(hold2, notHold1 - price);
    // 第二次卖出
    notHold2 = Math.max(notHold2, hold2 + price);
  }
  
  // 返回最大值（可能是 0、1、2 笔交易）
  return Math.max(0, notHold1, notHold2);
}
```

### 更直观的写法

```typescript
function maxProfit(prices: number[]): number {
  // buy1: 第一次买入后的最大收益
  // sell1: 第一次卖出后的最大收益
  // buy2: 第二次买入后的最大收益
  // sell2: 第二次卖出后的最大收益
  
  let buy1 = -Infinity;
  let sell1 = 0;
  let buy2 = -Infinity;
  let sell2 = 0;
  
  for (const price of prices) {
    buy1 = Math.max(buy1, -price);
    sell1 = Math.max(sell1, buy1 + price);
    buy2 = Math.max(buy2, sell1 - price);
    sell2 = Math.max(sell2, buy2 + price);
  }
  
  return sell2;
}
```

**为什么更新顺序不会影响结果？**

在同一天，`sell2` 依赖 `buy2`，`buy2` 依赖 `sell1`，`sell1` 依赖 `buy1`。

如果按顺序更新：
- `buy1` 更新后，`sell1` 用的是新 `buy1`（可以同一天买卖）
- 这相当于：可以在同一天完成买入和卖出

虽然允许同一天买卖看起来奇怪，但不会增加收益（同一天买卖利润为 0），所以不影响答案。

## 示例演算

以 `prices = [3, 3, 5, 0, 0, 3, 1, 4]` 为例：

| 天 | 价格 | buy1 | sell1 | buy2 | sell2 |
|---|------|------|-------|------|-------|
| 0 | 3 | -3 | 0 | -3 | 0 |
| 1 | 3 | -3 | 0 | -3 | 0 |
| 2 | 5 | -3 | 2 | -1 | 2 |
| 3 | 0 | 0 | 2 | 2 | 2 |
| 4 | 0 | 0 | 2 | 2 | 2 |
| 5 | 3 | 0 | 3 | 2 | 5 |
| 6 | 1 | 0 | 3 | 2 | 5 |
| 7 | 4 | 0 | 4 | 2 | 6 |

最终答案：6

## 另一种理解：分段

把数组分成两段，分别求每段的最大利润：

```typescript
function maxProfit(prices: number[]): number {
  const n = prices.length;
  if (n < 2) return 0;
  
  // left[i] = 前 i 天最多一次交易的最大利润
  const left = new Array(n).fill(0);
  let minPrice = prices[0];
  for (let i = 1; i < n; i++) {
    left[i] = Math.max(left[i - 1], prices[i] - minPrice);
    minPrice = Math.min(minPrice, prices[i]);
  }
  
  // right[i] = 后 n-i 天最多一次交易的最大利润
  const right = new Array(n).fill(0);
  let maxPrice = prices[n - 1];
  for (let i = n - 2; i >= 0; i--) {
    right[i] = Math.max(right[i + 1], maxPrice - prices[i]);
    maxPrice = Math.max(maxPrice, prices[i]);
  }
  
  // 枚举分界点
  let maxProfit = 0;
  for (let i = 0; i < n; i++) {
    maxProfit = Math.max(maxProfit, left[i] + right[i]);
  }
  
  return maxProfit;
}
```

这种方法时间复杂度 O(n)，空间复杂度 O(n)。

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 |
|-----|-----------|-----------|
| 状态机 DP | O(n) | O(1) |
| 分段法 | O(n) | O(n) |

## 本章小结

1. **状态设计**：需要记录交易次数，所以有 5 个状态
2. **转移顺序**：从后往前或用临时变量
3. **同一天买卖**：允许但不影响答案
4. **分段理解**：也可以用前缀/后缀的方式理解
