# 背包问题空间优化总结

在背包问题中，空间优化是提高算法效率的关键技术。本章系统总结各类背包问题的空间优化技巧。

## 核心思想

### 滚动数组原理

**观察**：计算 `dp[i][w]` 只需要 `dp[i-1][...]` 的信息

```python
# 2D 状态
dp[i][w] = max(
    dp[i-1][w],           # 不选第 i 个物品
    dp[i-1][w-weight] + value  # 选第 i 个物品
)

# 发现：第 i 行只依赖第 i-1 行
# 可以用一维数组滚动更新
```

**压缩策略**：用一维数组 `dp[w]` 代替二维数组 `dp[i][w]`

## 01 背包空间优化

### 2D → 1D 转换

**原始代码**（2D）：
```python
def knapsack_01_2d(W, weights, values):
    n = len(weights)
    dp = [[0] * (W + 1) for _ in range(n + 1)]
    
    for i in range(1, n + 1):
        for w in range(W + 1):
            # 不选
            dp[i][w] = dp[i-1][w]
            
            # 选（如果能装下）
            if w >= weights[i-1]:
                dp[i][w] = max(
                    dp[i][w],
                    dp[i-1][w - weights[i-1]] + values[i-1]
                )
    
    return dp[n][W]
```

**优化代码**（1D）：
```python
def knapsack_01_1d(W, weights, values):
    n = len(weights)
    dp = [0] * (W + 1)
    
    for i in range(n):
        # 关键：从右向左遍历
        for w in range(W, weights[i] - 1, -1):
            dp[w] = max(dp[w], dp[w - weights[i]] + values[i])
    
    return dp[W]
```

### 为什么必须从右向左？

**错误示例**（从左向右）：
```python
# 错误！会导致物品被重复选择
for w in range(weights[i], W + 1):
    dp[w] = max(dp[w], dp[w - weights[i]] + values[i])
```

**原因分析**：
```
假设物品重量=3，价值=5，W=10

从左向右：
w=3: dp[3] = max(0, dp[0] + 5) = 5
w=6: dp[6] = max(0, dp[3] + 5) = 10  # 错误！使用了已更新的 dp[3]
w=9: dp[9] = max(0, dp[6] + 5) = 15  # 物品被选了3次！

从右向左：
w=9: dp[9] = max(0, dp[6] + 5) = 5   # 正确！使用旧的 dp[6]=0
w=6: dp[6] = max(0, dp[3] + 5) = 5   # 使用旧的 dp[3]=0
w=3: dp[3] = max(0, dp[0] + 5) = 5   # 物品只选1次
```

**关键**：从右向左保证 `dp[w - weight]` 是**上一轮**的值（未被更新）

## 完全背包空间优化

### 2D → 1D 转换

**原始代码**（2D）：
```python
def knapsack_complete_2d(W, weights, values):
    n = len(weights)
    dp = [[0] * (W + 1) for _ in range(n + 1)]
    
    for i in range(1, n + 1):
        for w in range(W + 1):
            # 不选
            dp[i][w] = dp[i-1][w]
            
            # 选（如果能装下）
            if w >= weights[i-1]:
                dp[i][w] = max(
                    dp[i][w],
                    dp[i][w - weights[i-1]] + values[i-1]  # 注意：dp[i]
                )
    
    return dp[n][W]
```

**优化代码**（1D）：
```python
def knapsack_complete_1d(W, weights, values):
    n = len(weights)
    dp = [0] * (W + 1)
    
    for i in range(n):
        # 关键：从左向右遍历
        for w in range(weights[i], W + 1):
            dp[w] = max(dp[w], dp[w - weights[i]] + values[i])
    
    return dp[W]
```

### 为什么必须从左向右？

**正确行为**（从左向右）：
```
假设物品重量=3，价值=5，W=10

w=3: dp[3] = max(0, dp[0] + 5) = 5   # 选1个
w=6: dp[6] = max(0, dp[3] + 5) = 10  # 选2个（使用本轮更新的 dp[3]）
w=9: dp[9] = max(0, dp[6] + 5) = 15  # 选3个（正确！）
```

**关键**：从左向右允许 `dp[w - weight]` 是**本轮**的值（已被更新）

## 多重背包空间优化

### 二进制优化 + 滚动数组

```python
def multiple_knapsack_optimized(W, weights, values, counts):
    # 二进制拆分
    new_weights = []
    new_values = []
    
    for i in range(len(weights)):
        weight, value, count = weights[i], values[i], counts[i]
        
        k = 1
        while k <= count:
            new_weights.append(k * weight)
            new_values.append(k * value)
            count -= k
            k *= 2
        
        if count > 0:
            new_weights.append(count * weight)
            new_values.append(count * value)
    
    # 01 背包（从右向左）
    dp = [0] * (W + 1)
    
    for i in range(len(new_weights)):
        weight = new_weights[i]
        value = new_values[i]
        
        for w in range(W, weight - 1, -1):
            dp[w] = max(dp[w], dp[w - weight] + value)
    
    return dp[W]
```

## 混合背包空间优化

```python
def mixed_knapsack_optimized(W, weights, values, counts):
    """
    counts[i] = -1: 完全背包
    counts[i] = 1: 01 背包
    counts[i] > 1: 多重背包
    """
    # 二进制拆分
    items = []  # (weight, value, type)
    
    for i in range(len(weights)):
        weight, value, count = weights[i], values[i], counts[i]
        
        if count == -1:
            # 完全背包
            items.append((weight, value, 'complete'))
        elif count == 1:
            # 01 背包
            items.append((weight, value, '01'))
        else:
            # 多重背包：二进制拆分
            k = 1
            while k <= count:
                items.append((k * weight, k * value, '01'))
                count -= k
                k *= 2
            
            if count > 0:
                items.append((count * weight, count * value, '01'))
    
    # 统一 DP
    dp = [0] * (W + 1)
    
    for weight, value, item_type in items:
        if item_type == '01':
            # 从右向左
            for w in range(W, weight - 1, -1):
                dp[w] = max(dp[w], dp[w - weight] + value)
        else:
            # 从左向右
            for w in range(weight, W + 1):
                dp[w] = max(dp[w], dp[w - weight] + value)
    
    return dp[W]
```

## 恰好装满问题

### 初始化技巧

**问题**：背包必须恰好装满，求最大价值

**关键**：初始化 `dp[0] = 0`，其他为 `-∞`

```python
def knapsack_exact_fill(W, weights, values):
    # 初始化
    dp = [float('-inf')] * (W + 1)
    dp[0] = 0  # 容量为 0 时，价值为 0（恰好装满）
    
    for i in range(len(weights)):
        weight = weights[i]
        value = values[i]
        
        for w in range(W, weight - 1, -1):
            dp[w] = max(dp[w], dp[w - weight] + value)
    
    # 如果 dp[W] 仍为 -∞，说明无法恰好装满
    return dp[W] if dp[W] != float('-inf') else -1
```

### 求最小价值

**问题**：在不超过容量的前提下，求最小价值

**关键**：初始化 `dp[0] = 0`，其他为 `+∞`，状态转移用 `min`

```python
def knapsack_min_value(W, weights, values):
    # 初始化
    dp = [float('inf')] * (W + 1)
    dp[0] = 0
    
    for i in range(len(weights)):
        weight = weights[i]
        value = values[i]
        
        for w in range(W, weight - 1, -1):
            dp[w] = min(dp[w], dp[w - weight] + value)
    
    return dp[W] if dp[W] != float('inf') else -1
```

## 方案数问题

### 求方案总数

**问题**：有多少种装法可以达到最大价值？

```python
def knapsack_count_ways(W, weights, values):
    # dp[w] 表示容量为 w 时的最大价值
    max_value = [0] * (W + 1)
    
    # count[w] 表示达到 max_value[w] 的方案数
    count = [0] * (W + 1)
    count[0] = 1  # 容量为 0 时，有 1 种方案（不选）
    
    for i in range(len(weights)):
        weight = weights[i]
        value = values[i]
        
        for w in range(W, weight - 1, -1):
            new_value = max_value[w - weight] + value
            
            if new_value > max_value[w]:
                # 找到更大价值
                max_value[w] = new_value
                count[w] = count[w - weight]
            elif new_value == max_value[w]:
                # 价值相同，累加方案数
                count[w] += count[w - weight]
    
    return max_value[W], count[W]
```

## 记录选择方案

### 路径回溯

**问题**：如何记录选了哪些物品？

**方法1**：保留 2D 数组
```python
def knapsack_with_items(W, weights, values):
    n = len(weights)
    dp = [[0] * (W + 1) for _ in range(n + 1)]
    
    # DP 过程
    for i in range(1, n + 1):
        for w in range(W + 1):
            dp[i][w] = dp[i-1][w]
            
            if w >= weights[i-1]:
                dp[i][w] = max(
                    dp[i][w],
                    dp[i-1][w - weights[i-1]] + values[i-1]
                )
    
    # 回溯路径
    w = W
    items = []
    for i in range(n, 0, -1):
        if w >= weights[i-1] and \
           dp[i][w] == dp[i-1][w - weights[i-1]] + values[i-1]:
            items.append(i - 1)
            w -= weights[i-1]
    
    items.reverse()
    return dp[n][W], items
```

**方法2**：记录选择标记
```python
def knapsack_with_choices(W, weights, values):
    n = len(weights)
    dp = [0] * (W + 1)
    chosen = [[False] * (W + 1) for _ in range(n)]
    
    for i in range(n):
        weight = weights[i]
        value = values[i]
        
        for w in range(W, weight - 1, -1):
            if dp[w - weight] + value > dp[w]:
                dp[w] = dp[w - weight] + value
                chosen[i][w] = True
    
    # 重建路径
    w = W
    items = []
    for i in range(n - 1, -1, -1):
        if chosen[i][w]:
            items.append(i)
            w -= weights[i]
    
    items.reverse()
    return dp[W], items
```

## 空间复杂度对比

| 问题类型 | 2D 空间 | 1D 空间 | 备注 |
|---------|---------|---------|------|
| 01 背包 | O(nW) | O(W) | 从右向左 |
| 完全背包 | O(nW) | O(W) | 从左向右 |
| 多重背包 | O(nW) | O(W) | 二进制拆分 |
| 混合背包 | O(nW) | O(W) | 根据类型选择 |
| 记录方案 | O(nW) | O(nW) | 需要保留路径 |

## 常见错误

### 错误1：01 背包从左向右

```python
# 错误！物品会被重复选择
for w in range(weight, W + 1):
    dp[w] = max(dp[w], dp[w - weight] + value)
```

### 错误2：完全背包从右向左

```python
# 错误！物品只能选一次
for w in range(W, weight - 1, -1):
    dp[w] = max(dp[w], dp[w - weight] + value)
```

### 错误3：恰好装满初始化错误

```python
# 错误！全部初始化为 0
dp = [0] * (W + 1)

# 正确：除 dp[0] 外初始化为 -∞
dp = [float('-inf')] * (W + 1)
dp[0] = 0
```

## 小结

### 核心技巧
1. **滚动数组**：2D → 1D，节省空间
2. **遍历方向**：
   - 01 背包/多重背包：**从右向左**
   - 完全背包：**从左向右**
3. **初始化**：
   - 最大价值：`dp[0] = 0`，其他为 0 或 `-∞`
   - 最小价值：`dp[0] = 0`，其他为 `+∞`
   - 方案数：`count[0] = 1`

### 选择建议
- **只求最优值**：1D 数组（推荐）
- **需要方案**：保留 2D 数组或记录选择
- **空间受限**：滚动数组 + 路径压缩

### 记忆口诀
- **01 背包**：从右向左，防重复
- **完全背包**：从左向右，允重复
- **恰好装满**：除 `dp[0]` 外初始化为极值

掌握这些空间优化技巧，可以大幅提升背包问题的求解效率！
