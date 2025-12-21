# 贪心 vs 动态规划

贪心和动态规划都需要最优子结构，但选择策略截然不同。理解它们的区别，是选对算法的关键。

---

## 核心区别

| 维度 | 贪心算法 | 动态规划 |
|-----|---------|---------|
| **决策方式** | 每步选局部最优 | 比较所有可能，选全局最优 |
| **是否回溯** | 不回溯 | 需要保存子问题结果 |
| **时间复杂度** | 通常 O(n log n) | 通常 O(n²) 或更高 |
| **适用条件** | 贪心选择性质 + 最优子结构 | 最优子结构 + 重叠子问题 |
| **正确性** | 需要证明 | 天然正确（穷举所有可能） |

---

## 同一问题的两种视角

### 例1：找零钱问题

#### 贪心版本（币值 [25, 10, 5, 1]）

```typescript
function coinChangeGreedy(amount: number): number {
  const coins = [25, 10, 5, 1];
  let count = 0;
  
  for (const coin of coins) {
    count += Math.floor(amount / coin);
    amount %= coin;
  }
  
  return count;
}

// 找零 41 分
// 贪心：25×1 + 10×1 + 5×1 + 1×1 = 4 枚 ✓
```

**为什么贪心可行？**

这组币值满足"大币值是小币值的整数倍"关系，保证贪心选择性质。

#### 动态规划版本（任意币值）

```typescript
function coinChangeDP(coins: number[], amount: number): number {
  const dp = Array(amount + 1).fill(Infinity);
  dp[0] = 0;
  
  for (let i = 1; i <= amount; i++) {
    for (const coin of coins) {
      if (i >= coin) {
        dp[i] = Math.min(dp[i], dp[i - coin] + 1);
      }
    }
  }
  
  return dp[amount] === Infinity ? -1 : dp[amount];
}

// 币值 [11, 5, 1]，找零 15
// 贪心：11×1 + 1×4 = 5 枚
// DP：  5×3 = 3 枚  ✓ 更优
```

**为什么贪心失败？**

`[11, 5, 1]` 不满足整数倍关系，贪心选择性质不成立。

---

### 例2：活动选择

#### 贪心解法

```typescript
interface Activity {
  start: number;
  end: number;
}

function activitySelectionGreedy(activities: Activity[]): number {
  // 按结束时间排序
  activities.sort((a, b) => a.end - b.end);
  
  let count = 1;
  let lastEnd = activities[0].end;
  
  for (let i = 1; i < activities.length; i++) {
    if (activities[i].start >= lastEnd) {
      count++;
      lastEnd = activities[i].end;
    }
  }
  
  return count;
}
```

**时间复杂度**：O(n log n)（排序）

#### 动态规划解法（理论上可行）

```typescript
function activitySelectionDP(activities: Activity[]): number {
  activities.sort((a, b) => a.end - b.end);
  const n = activities.length;
  const dp = Array(n).fill(1);
  
  for (let i = 1; i < n; i++) {
    for (let j = 0; j < i; j++) {
      if (activities[j].end <= activities[i].start) {
        dp[i] = Math.max(dp[i], dp[j] + 1);
      }
    }
  }
  
  return Math.max(...dp);
}
```

**时间复杂度**：O(n²)

**结论**：贪心更优，且正确性可以证明。

---

## 何时选贪心，何时选DP

### 选贪心的信号

1. **明确的局部最优策略**：
   - 按某个属性排序后，每次选最X的
   - 示例：最早结束、最小开销、最大收益

2. **无后效性**：
   - 当前选择不影响后续选择的可行性
   - 示例：活动选择（选了 i 不影响后面）

3. **性能要求高**：
   - 数据规模 10^5 以上
   - DP 的 O(n²) 可能超时，贪心 O(n log n) 可行

### 选DP的信号

1. **没有明确的贪心策略**：
   - 多次尝试找不到贪心规则
   - 或贪心规则在反例上失败

2. **有后效性**：
   - 当前选择影响后续可行性
   - 示例：0-1 背包（选了大物品，后面可能装不下小但贵的）

3. **重叠子问题明显**：
   - 子问题会被重复计算
   - 示例：斐波那契数列

---

## 典型问题对比

### 背包问题

| 类型 | 策略 | 算法 |
|-----|------|------|
| **分数背包** | 按性价比排序，贪心选 | 贪心 O(n log n) |
| **0-1 背包** | 物品不可分割，有后效性 | DP O(nW) |

### 路径问题

| 类型 | 策略 | 算法 |
|-----|------|------|
| **最短路径（单源）** | Dijkstra 贪心选最近节点 | 贪心 O(E log V) |
| **最短路径（负权边）** | 贪心失效 | DP（Bellman-Ford） |

### 区间问题

| 类型 | 策略 | 算法 |
|-----|------|------|
| **无重叠区间** | 按结束时间贪心 | 贪心 O(n log n) |
| **区间覆盖（最少点）** | 贪心 | 贪心 O(n log n) |
| **区间DP（最大收益）** | 子问题重叠 | DP O(n²) 或 O(n³) |

---

## 从贪心到DP的演化

很多DP问题最初尝试贪心，失败后才转向DP。

### 示例：买卖股票

#### 买卖一次（简单）

```typescript
// 贪心：一次遍历找最低买入、最高卖出
function maxProfit1(prices: number[]): number {
  let minPrice = Infinity;
  let maxProfit = 0;
  
  for (const price of prices) {
    minPrice = Math.min(minPrice, price);
    maxProfit = Math.max(maxProfit, price - minPrice);
  }
  
  return maxProfit;
}
```

#### 买卖无数次（贪心）

```typescript
// 贪心：每次上涨都买卖
function maxProfit2(prices: number[]): number {
  let profit = 0;
  
  for (let i = 1; i < prices.length; i++) {
    if (prices[i] > prices[i-1]) {
      profit += prices[i] - prices[i-1];
    }
  }
  
  return profit;
}
```

#### 买卖k次（DP）

```typescript
// DP：状态转移复杂，贪心无法处理
function maxProfitK(k: number, prices: number[]): number {
  // dp[i][j][0] = 第i天，交易了j次，当前不持股的最大利润
  // dp[i][j][1] = 第i天，交易了j次，当前持股的最大利润
  // ...
  // 需要DP
}
```

---

## 本章小结

**贪心 vs DP 选择清单**：

| 问题特征 | 推荐算法 |
|---------|---------|
| 有明确局部最优 + 无后效性 | 贪心 |
| 无明显贪心规则 | 尝试DP |
| 有后效性 | DP |
| 重叠子问题多 | DP |
| 性能要求苛刻 (10^5+) | 优先贪心 |
| 贪心反例存在 | DP |

**判断流程**：
1. 尝试找贪心规则（按X排序，每次选Y）
2. 构造反例测试
3. 如果贪心失败，转向DP
4. DP 也不行？考虑其他方法（回溯、搜索）

掌握两者的适用场景，才能在算法选择上游刃有余。
