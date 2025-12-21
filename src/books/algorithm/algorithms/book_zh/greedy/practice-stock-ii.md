# 实战：买卖股票的最佳时机 II

> LeetCode 122. 买卖股票的最佳时机 II | 难度：中等

贪心思想的典型应用，理解"累积收益"的核心思想。

📎 [LeetCode 122. 买卖股票的最佳时机 II](https://leetcode.cn/problems/best-time-to-buy-and-sell-stock-ii/)

---

## 题目描述

给定一个数组 `prices`，其中 `prices[i]` 是股票第 i 天的价格。

你可以进行**无限次**交易（买入和卖出各算一次交易）。同一天可以先卖再买。

求能获得的最大利润。

**示例1**：
```
输入：prices = [7,1,5,3,6,4]
输出：7
解释：
第2天买入(1)，第3天卖出(5)，利润 4
第4天买入(3)，第5天卖出(6)，利润 3
总利润 = 4 + 3 = 7
```

**示例2**：
```
输入：prices = [1,2,3,4,5]
输出：4
解释：每天买入，第二天卖出
利润 = (2-1) + (3-2) + (4-3) + (5-4) = 4
```

**示例3**：
```
输入：prices = [7,6,4,3,1]
输出：0
解释：价格持续下跌，不交易
```

---

## 思路分析

### 问题的本质

每天有两个选择：持有股票或不持有。但由于可以无限次交易，问题变得简单。

### 关键洞察

**核心发现**：只要明天比今天高，就今天买明天卖。

把价格曲线想象成一座座山：
- 上坡段：收集所有正向差值
- 下坡段：不交易

```
利润 = 所有上涨日的涨幅之和
     = Σ max(0, prices[i] - prices[i-1])
```

### 为什么可以这样理解？

假设从第 a 天买入，第 d 天卖出：

```
利润 = prices[d] - prices[a]
     = (prices[d] - prices[c]) + (prices[c] - prices[b]) + (prices[b] - prices[a])
```

**望远镜公式**：总利润等于每日差值之和。我们只需要收集正向差值！

---

## 代码实现

```typescript
function maxProfit(prices: number[]): number {
  let profit = 0;
  
  for (let i = 1; i < prices.length; i++) {
    // 只收集正向差值（上涨日）
    if (prices[i] > prices[i - 1]) {
      profit += prices[i] - prices[i - 1];
    }
  }
  
  return profit;
}
```

### 更简洁的写法

```typescript
function maxProfit(prices: number[]): number {
  return prices.reduce((profit, price, i) => 
    i > 0 ? profit + Math.max(0, price - prices[i - 1]) : profit
  , 0);
}
```

---

## 执行过程详解

```
prices = [7, 1, 5, 3, 6, 4]

日差值计算：
Day 1→2: 1 - 7 = -6 (下跌，不计入)
Day 2→3: 5 - 1 = +4 (上涨，计入)
Day 3→4: 3 - 5 = -2 (下跌，不计入)
Day 4→5: 6 - 3 = +3 (上涨，计入)
Day 5→6: 4 - 6 = -2 (下跌，不计入)

总利润 = 4 + 3 = 7
```

**可视化**：
```
价格
 7 ●
 6    ●           ●
 5       ●              
 4          ●        ●
 3                ●
 2
 1    ●

收集所有上升段：
  ↗ (1→5): +4
  ↗ (3→6): +3
```

---

## 贪心正确性证明

### 定理：贪心收集正差值等于最优利润

**证明**：

设最优解中有 k 次交易，买入日为 $b_1, b_2, ..., b_k$，卖出日为 $s_1, s_2, ..., s_k$。

总利润 = $\sum_{j=1}^{k} (prices[s_j] - prices[b_j])$

由望远镜公式：
$prices[s_j] - prices[b_j] = \sum_{i=b_j}^{s_j-1} (prices[i+1] - prices[i])$

所以总利润等于所有"被交易覆盖"的日差值之和。

**关键观察**：
- 最优解一定会覆盖所有正差值（否则可以添加交易增加利润）
- 最优解一定不会覆盖负差值（否则可以拆分交易减少损失）

因此，贪心解 = 最优解 = 所有正差值之和。

---

## 复杂度分析

- **时间复杂度**：O(n)，一次遍历
- **空间复杂度**：O(1)，只用常量空间

---

## 与其他股票问题的对比

| 问题 | 交易次数 | 核心思路 | 复杂度 |
|-----|---------|---------|-------|
| **I** | 最多1次 | 记录历史最低价 | O(n) |
| **II** (本题) | **无限次** | **贪心收集涨幅** | **O(n)** |
| **III** | 最多2次 | 分段 DP | O(n) |
| **IV** | 最多k次 | 通用 DP | O(nk) |
| **含冷冻期** | 无限次+休息 | 状态机 DP | O(n) |
| **含手续费** | 无限次+费用 | 贪心或 DP | O(n) |

---

## 变体：含手续费

LeetCode 714：每次交易有手续费 `fee`。

**思路**：只有涨幅超过手续费才值得交易。

```typescript
function maxProfitWithFee(prices: number[], fee: number): number {
  let profit = 0;
  let buy = prices[0];  // 当前持有成本
  
  for (let i = 1; i < prices.length; i++) {
    if (prices[i] < buy) {
      // 发现更低价，更新买入点
      buy = prices[i];
    } else if (prices[i] > buy + fee) {
      // 卖出有利可图
      profit += prices[i] - buy - fee;
      // 关键：假装以 prices[i] - fee 的价格重新买入
      // 这样如果明天继续涨，可以继续持有
      buy = prices[i] - fee;
    }
  }
  
  return profit;
}
```

**`buy = prices[i] - fee` 的妙处**：
- 如果明天下跌：今天卖出的决定正确，buy 会被更低价格覆盖
- 如果明天上涨：相当于继续持有，避免重复扣手续费

---

## 常见错误

### 错误1：计算峰谷差

```typescript
// ❌ 复杂且容易出错
function maxProfit(prices: number[]): number {
  let profit = 0;
  let valley = prices[0];
  let peak = prices[0];
  
  for (let i = 1; i < prices.length; i++) {
    // 找谷底和峰顶...复杂逻辑
  }
  return profit;
}
```

贪心收集日差值更简洁可靠。

### 错误2：忽略相邻日交易

```typescript
// ❌ 忘记可以同一天卖出后买入
// 实际上贪心方法自然处理了这种情况
```

---

## 相关题目

- LeetCode 121. 买卖股票的最佳时机（最多1次）
- LeetCode 123. 买卖股票的最佳时机 III（最多2次）
- LeetCode 188. 买卖股票的最佳时机 IV（最多k次）
- LeetCode 309. 最佳买卖股票时机含冷冻期
- LeetCode 714. 买卖股票的最佳时机含手续费

---

## 总结

买卖股票 II 是贪心算法的完美案例：

1. **核心洞察**：收集所有上涨日的涨幅
2. **数学本质**：望远镜公式将大区间分解为小区间之和
3. **代码极简**：遍历一次，累加正差值

记住这个思路：**无限次交易 = 贪心收集每一段上涨**。这是股票系列问题中最简单优雅的解法。
```
