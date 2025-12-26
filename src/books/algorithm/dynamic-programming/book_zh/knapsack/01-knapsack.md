# 01 背包问题详解

01 背包是动态规划中最经典的问题之一，是理解背包类 DP 的基础。掌握 01 背包的状态定义、转移方程和空间优化，对后续学习完全背包、多重背包至关重要。

## 问题定义

有 `n` 个物品和一个容量为 `W` 的背包：
- 第 `i` 个物品的重量为 `w[i]`，价值为 `v[i]`
- **每个物品只能选 0 次或 1 次**（01 约束）

求：在不超过背包容量的前提下，能获得的最大价值。

**示例**：
```
输入: W = 10, w = [2, 3, 4, 5], v = [3, 4, 5, 6]
输出: 10
解释: 选物品 1 和 3，重量 2+4=6，价值 3+5=8；
     或选物品 2 和 4，重量 3+5=8，价值 4+6=10（最优）
```

## 暴力解法：枚举所有组合

```python
def knapsack_bruteforce(W, w, v):
    """暴力枚举所有子集"""
    n = len(w)
    max_value = 0
    
    # 枚举 2^n 种选法
    for mask in range(1 << n):
        total_weight = 0
        total_value = 0
        
        for i in range(n):
            if mask & (1 << i):
                total_weight += w[i]
                total_value += v[i]
        
        if total_weight <= W:
            max_value = max(max_value, total_value)
    
    return max_value
```

**时间复杂度**：O(2^n × n)  
**问题**：n = 20 时就有 100 万种组合，n = 30 时超过 10 亿

## 动态规划解法

### 状态定义

**定义**：`dp[i][w]` = 考虑前 `i` 个物品，背包容量为 `w` 时的最大价值

**边界**：
- `dp[0][w] = 0`（没有物品，价值为 0）
- `dp[i][0] = 0`（容量为 0，无法选任何物品）

### 状态转移

对于第 `i` 个物品（索引从 1 开始），有两种选择：

1. **不选第 i 个物品**：
   ```
   dp[i][w] = dp[i-1][w]
   ```

2. **选第 i 个物品**（前提：`w >= weight[i]`）：
   ```
   dp[i][w] = dp[i-1][w - weight[i]] + value[i]
   ```

**转移方程**：
```
dp[i][w] = max(dp[i-1][w], dp[i-1][w - weight[i]] + value[i])
```

### 二维数组实现

```python
def knapsack_01(W, weights, values):
    """
    01背包问题
    W: 背包容量
    weights: 物品重量列表
    values: 物品价值列表
    """
    n = len(weights)
    
    # dp[i][w] = 前i个物品，容量w时的最大价值
    dp = [[0] * (W + 1) for _ in range(n + 1)]
    
    # 遍历物品
    for i in range(1, n + 1):
        weight = weights[i - 1]
        value = values[i - 1]
        
        # 遍历容量
        for w in range(W + 1):
            # 不选第 i 个物品
            dp[i][w] = dp[i - 1][w]
            
            # 选第 i 个物品（如果放得下）
            if w >= weight:
                dp[i][w] = max(dp[i][w], dp[i - 1][w - weight] + value)
    
    return dp[n][W]
```

**时间复杂度**：O(n × W)  
**空间复杂度**：O(n × W)

### 示例执行过程

```
W = 4, weights = [1, 3, 4], values = [15, 20, 30]

DP 表：
     w=0  w=1  w=2  w=3  w=4
i=0   0    0    0    0    0
i=1   0   15   15   15   15  # 物品1: w=1, v=15
i=2   0   15   15   20   35  # 物品2: w=3, v=20
i=3   0   15   15   20   35  # 物品3: w=4, v=30

最大价值: dp[3][4] = 35
解释: 选物品1(w=1,v=15)和物品2(w=3,v=20)
```

## 空间优化：一维数组

**观察**：`dp[i][w]` 只依赖 `dp[i-1][...]`，可以用滚动数组优化。

**关键**：必须**从右向左**更新容量，否则会覆盖旧值。

```python
def knapsack_01_optimized(W, weights, values):
    """空间优化的 01 背包"""
    n = len(weights)
    
    # dp[w] = 容量为 w 时的最大价值
    dp = [0] * (W + 1)
    
    for i in range(n):
        weight = weights[i]
        value = values[i]
        
        # 从右向左更新（重要！）
        for w in range(W, weight - 1, -1):
            dp[w] = max(dp[w], dp[w - weight] + value)
    
    return dp[W]
```

**时间复杂度**：O(n × W)  
**空间复杂度**：O(W)

**为什么从右向左？**
```python
# 错误：从左向右（会覆盖旧值）
for w in range(weight, W + 1):
    dp[w] = max(dp[w], dp[w - weight] + value)
    # dp[w - weight] 已经是更新后的值，不是上一轮的值

# 正确：从右向左（使用旧值）
for w in range(W, weight - 1, -1):
    dp[w] = max(dp[w], dp[w - weight] + value)
    # dp[w - weight] 还是上一轮的值，因为还没更新到它
```

## 恰好装满的变体

**问题**：背包必须恰好装满，求最大价值。如果无法装满返回 -1。

**区别**：初始化不同

```python
def knapsack_exact_fill(W, weights, values):
    """恰好装满的 01 背包"""
    n = len(weights)
    
    # 初始化：dp[0] = 0（容量0恰好装满），其余为负无穷
    dp = [float('-inf')] * (W + 1)
    dp[0] = 0
    
    for i in range(n):
        weight = weights[i]
        value = values[i]
        
        for w in range(W, weight - 1, -1):
            dp[w] = max(dp[w], dp[w - weight] + value)
    
    return dp[W] if dp[W] != float('-inf') else -1
```

**关键差异**：
- 普通 01 背包：`dp = [0] * (W + 1)`（任何容量初始价值为 0）
- 恰好装满：`dp = [float('-inf')] * (W + 1), dp[0] = 0`（只有容量 0 能恰好装满）

## 求最小值变体

**问题**：求最小值（如最少硬币数）

```python
def knapsack_min_value(W, weights, values):
    """求最小价值"""
    n = len(weights)
    
    # 初始化为正无穷
    dp = [float('inf')] * (W + 1)
    dp[0] = 0
    
    for i in range(n):
        weight = weights[i]
        value = values[i]
        
        for w in range(W, weight - 1, -1):
            dp[w] = min(dp[w], dp[w - weight] + value)
    
    return dp[W] if dp[W] != float('inf') else -1
```

## 记录选择方案

```python
def knapsack_with_choices(W, weights, values):
    """记录选择了哪些物品"""
    n = len(weights)
    dp = [[0] * (W + 1) for _ in range(n + 1)]
    
    # 填表
    for i in range(1, n + 1):
        weight = weights[i - 1]
        value = values[i - 1]
        
        for w in range(W + 1):
            dp[i][w] = dp[i - 1][w]
            
            if w >= weight:
                dp[i][w] = max(dp[i][w], dp[i - 1][w - weight] + value)
    
    # 回溯选择
    w = W
    chosen = []
    for i in range(n, 0, -1):
        # 如果选了第 i 个物品
        if w >= weights[i - 1] and dp[i][w] == dp[i - 1][w - weights[i - 1]] + values[i - 1]:
            chosen.append(i - 1)
            w -= weights[i - 1]
    
    chosen.reverse()
    return dp[n][W], chosen
```

## 常见错误

### 错误1：不从右向左更新

```python
# 错误
for w in range(weight, W + 1):
    dp[w] = max(dp[w], dp[w - weight] + value)

# 正确
for w in range(W, weight - 1, -1):
    dp[w] = max(dp[w], dp[w - weight] + value)
```

### 错误2：索引混淆

```python
# 注意：i 从 1 开始，但 weights[i-1]
for i in range(1, n + 1):
    weight = weights[i - 1]  # 正确
    # weight = weights[i]  # 错误：索引越界
```

### 错误3：初始化错误

```python
# 求最大值：初始化为 0
dp = [0] * (W + 1)

# 求最小值：初始化为正无穷
dp = [float('inf')] * (W + 1)
dp[0] = 0
```

## 小结

- **状态定义**：`dp[i][w]` = 前 i 个物品，容量 w 的最大价值
- **转移方程**：`dp[i][w] = max(dp[i-1][w], dp[i-1][w-wi] + vi)`
- **空间优化**：从右向左更新，O(W) 空间
- **变体**：恰好装满、求最小值、记录方案
- **时间复杂度**：O(n × W)
- **适用条件**：每个物品只能选 0 或 1 次

01 背包是背包问题的基础，完全背包、多重背包等都是在此基础上的变形。
