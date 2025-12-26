# 完全背包问题详解

完全背包是 01 背包的扩展，允许每个物品选择**无限次**。这一约束的放松带来了状态转移方程的变化，同时也有更高效的空间优化方法。

## 问题定义

有 `n` 个物品和一个容量为 `W` 的背包：
- 第 `i` 个物品的重量为 `w[i]`，价值为 `v[i]`
- **每个物品可以选择无限次**（完全背包约束）

求：在不超过背包容量的前提下，能获得的最大价值。

**示例**：
```
输入: W = 10, w = [2, 3, 5], v = [3, 4, 5]
输出: 15
解释: 选5个物品0（重量2，价值3），总重量10，总价值15
```

## 与 01 背包的区别

| 特性 | 01 背包 | 完全背包 |
|-----|--------|---------|
| 物品数量 | 每个最多1次 | 每个无限次 |
| 状态定义 | `dp[i][w]` = 前i个物品，容量w | 相同 |
| 转移方程 | `dp[i-1][w-wi]` | `dp[i][w-wi]` |
| 空间优化 | 从右向左 | **从左向右** |

## 二维 DP 实现

### 状态定义

**定义**：`dp[i][w]` = 考虑前 `i` 种物品，背包容量为 `w` 时的最大价值

### 状态转移

对于第 `i` 种物品，可以选择 0, 1, 2, ... 个：

```
dp[i][w] = max(
    dp[i-1][w],                          # 不选
    dp[i-1][w - wi] + vi,                # 选1个
    dp[i-1][w - 2*wi] + 2*vi,            # 选2个
    ...
    dp[i-1][w - k*wi] + k*vi             # 选k个
)
```

**优化**：注意到 `dp[i][w - wi]` 已经包含了"选多个"的情况

```
dp[i][w] = max(dp[i-1][w], dp[i][w - wi] + vi)
```

**关键差异**：
- 01 背包：`dp[i-1][w - wi]`（上一行，没选过第 i 个）
- 完全背包：`dp[i][w - wi]`（**当前行**，可能已选过第 i 个）

```python
def unbounded_knapsack(W, weights, values):
    """
    完全背包问题（二维DP）
    """
    n = len(weights)
    
    # dp[i][w] = 前i种物品，容量w的最大价值
    dp = [[0] * (W + 1) for _ in range(n + 1)]
    
    for i in range(1, n + 1):
        weight = weights[i - 1]
        value = values[i - 1]
        
        for w in range(W + 1):
            # 不选第 i 种物品
            dp[i][w] = dp[i - 1][w]
            
            # 选第 i 种物品（可以选多次）
            if w >= weight:
                dp[i][w] = max(dp[i][w], dp[i][w - weight] + value)
    
    return dp[n][W]
```

**时间复杂度**：O(n × W)  
**空间复杂度**：O(n × W)

### 示例执行

```
W = 5, weights = [1, 2], values = [1, 3]

DP 表：
     w=0  w=1  w=2  w=3  w=4  w=5
i=0   0    0    0    0    0    0
i=1   0    1    2    3    4    5  # 物品0: w=1, v=1 (选5个)
i=2   0    1    3    4    6    7  # 物品1: w=2, v=3

dp[2][5] = 7
解释：选1个物品0(w=1,v=1) + 2个物品1(w=2×2=4,v=3×2=6) = 7
```

## 空间优化：一维数组

**关键区别**：完全背包从**左向右**更新！

```python
def unbounded_knapsack_optimized(W, weights, values):
    """空间优化的完全背包"""
    n = len(weights)
    
    # dp[w] = 容量为 w 时的最大价值
    dp = [0] * (W + 1)
    
    for i in range(n):
        weight = weights[i]
        value = values[i]
        
        # 从左向右更新（重要！）
        for w in range(weight, W + 1):
            dp[w] = max(dp[w], dp[w - weight] + value)
    
    return dp[W]
```

**时间复杂度**：O(n × W)  
**空间复杂度**：O(W)

### 为什么从左向右？

```python
# 完全背包：从左向右
for w in range(weight, W + 1):
    dp[w] = max(dp[w], dp[w - weight] + value)
    # dp[w - weight] 是本轮更新的值，表示"已经选了若干个第i种物品"

# 01 背包：从右向左
for w in range(W, weight - 1, -1):
    dp[w] = max(dp[w], dp[w - weight] + value)
    # dp[w - weight] 是上一轮的值，表示"没选第i个物品"
```

**直观理解**：
- 完全背包：需要使用"已更新的值"来表示"选多次"
- 01 背包：需要使用"旧值"来保证"只选一次"

## 恰好装满的变体

```python
def unbounded_knapsack_exact_fill(W, weights, values):
    """恰好装满的完全背包"""
    n = len(weights)
    
    # 初始化：只有容量0能恰好装满
    dp = [float('-inf')] * (W + 1)
    dp[0] = 0
    
    for i in range(n):
        weight = weights[i]
        value = values[i]
        
        # 从左向右更新
        for w in range(weight, W + 1):
            dp[w] = max(dp[w], dp[w - weight] + value)
    
    return dp[W] if dp[W] != float('-inf') else -1
```

## 求方案数

**问题**：有多少种方法恰好装满背包？

```python
def unbounded_knapsack_count(W, weights):
    """求方案数"""
    n = len(weights)
    
    # dp[w] = 恰好装满容量 w 的方案数
    dp = [0] * (W + 1)
    dp[0] = 1  # 容量0有1种方案（什么都不选）
    
    for i in range(n):
        weight = weights[i]
        
        for w in range(weight, W + 1):
            dp[w] += dp[w - weight]
    
    return dp[W]
```

**经典应用**：零钱兑换 II（LeetCode 518）

## 求最小值变体

```python
def unbounded_knapsack_min(W, weights, costs):
    """求最小代价"""
    n = len(weights)
    
    dp = [float('inf')] * (W + 1)
    dp[0] = 0
    
    for i in range(n):
        weight = weights[i]
        cost = costs[i]
        
        for w in range(weight, W + 1):
            dp[w] = min(dp[w], dp[w - weight] + cost)
    
    return dp[W] if dp[W] != float('inf') else -1
```

**经典应用**：零钱兑换（LeetCode 322）

## 二维费用完全背包

**问题**：物品有两个属性（如重量和体积），背包有两个容量限制

```python
def unbounded_knapsack_2d(W1, W2, weights1, weights2, values):
    """二维费用完全背包"""
    n = len(weights1)
    
    # dp[w1][w2] = 重量w1、体积w2时的最大价值
    dp = [[0] * (W2 + 1) for _ in range(W1 + 1)]
    
    for i in range(n):
        w1, w2, v = weights1[i], weights2[i], values[i]
        
        # 两个维度都从左向右
        for c1 in range(w1, W1 + 1):
            for c2 in range(w2, W2 + 1):
                dp[c1][c2] = max(dp[c1][c2], dp[c1 - w1][c2 - w2] + v)
    
    return dp[W1][W2]
```

## 与 01 背包的对比

```python
# 01 背包
for i in range(n):
    for w in range(W, weight - 1, -1):  # 从右向左
        dp[w] = max(dp[w], dp[w - weight] + value)

# 完全背包
for i in range(n):
    for w in range(weight, W + 1):  # 从左向右
        dp[w] = max(dp[w], dp[w - weight] + value)
```

**记忆技巧**：
- 01 背包：物品只能用一次 → 从右向左（避免重复使用）
- 完全背包：物品可无限用 → 从左向右（允许重复使用）

## 真实案例：零钱兑换

**LeetCode 322. Coin Change**

```python
def coinChange(coins, amount):
    """
    最少硬币数
    完全背包 + 求最小值
    """
    dp = [float('inf')] * (amount + 1)
    dp[0] = 0
    
    for coin in coins:
        for w in range(coin, amount + 1):
            dp[w] = min(dp[w], dp[w - coin] + 1)
    
    return dp[amount] if dp[amount] != float('inf') else -1
```

**LeetCode 518. Coin Change II**

```python
def change(amount, coins):
    """
    组成金额的方案数
    完全背包 + 求方案数
    """
    dp = [0] * (amount + 1)
    dp[0] = 1
    
    for coin in coins:
        for w in range(coin, amount + 1):
            dp[w] += dp[w - coin]
    
    return dp[amount]
```

## 常见错误

### 错误1：更新方向错误

```python
# 错误：完全背包从右向左
for w in range(W, weight - 1, -1):
    dp[w] = max(dp[w], dp[w - weight] + value)

# 正确：完全背包从左向右
for w in range(weight, W + 1):
    dp[w] = max(dp[w], dp[w - weight] + value)
```

### 错误2：方案数求和时顺序错误

```python
# 求组合数（不考虑顺序）
for coin in coins:
    for w in range(coin, amount + 1):
        dp[w] += dp[w - coin]

# 求排列数（考虑顺序）
for w in range(1, amount + 1):
    for coin in coins:
        if w >= coin:
            dp[w] += dp[w - coin]
```

## 小结

- **状态定义**：`dp[i][w]` = 前 i 种物品，容量 w 的最大价值
- **转移方程**：`dp[i][w] = max(dp[i-1][w], dp[i][w-wi] + vi)`
- **空间优化**：从**左向右**更新，O(W) 空间
- **关键区别**：`dp[i][w-wi]` 而非 `dp[i-1][w-wi]`
- **应用**：零钱兑换、最小代价、方案数统计
- **时间复杂度**：O(n × W)

完全背包与 01 背包的核心差异在于能否重复选择，这直接影响了状态转移和遍历顺序。
