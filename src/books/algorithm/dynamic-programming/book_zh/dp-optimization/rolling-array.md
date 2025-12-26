# 滚动数组优化

## 核心思想

> 动态规划通常需要二维数组 `dp[i][j]`，但如果状态转移只依赖于前一行/前几行，可以用一维数组滚动更新，节省空间。

**空间优化**：O(n × m) → O(m) 或 O(2m)

## 适用场景

1. **状态转移只依赖前一行**：01背包、最长公共子序列
2. **状态转移依赖前几行**：多重背包、斐波那契
3. **状态转移有固定模式**：线性DP、区间DP

## 示例一：01背包

**原始版本**（二维）：
```python
def knapsack_2d(weights, values, capacity):
    n = len(weights)
    dp = [[0] * (capacity + 1) for _ in range(n + 1)]
    
    for i in range(1, n + 1):
        for j in range(capacity + 1):
            # 不选
            dp[i][j] = dp[i-1][j]
            # 选
            if j >= weights[i-1]:
                dp[i][j] = max(dp[i][j], dp[i-1][j-weights[i-1]] + values[i-1])
    
    return dp[n][capacity]
```

**滚动数组优化**（一维）：
```python
def knapsack_1d(weights, values, capacity):
    dp = [0] * (capacity + 1)
    
    for i in range(len(weights)):
        # 逆序遍历，避免重复使用
        for j in range(capacity, weights[i] - 1, -1):
            dp[j] = max(dp[j], dp[j - weights[i]] + values[i])
    
    return dp[capacity]
```

**关键点**：
- **逆序遍历**：保证 `dp[j - weights[i]]` 是上一轮的值
- **正序会导致**：物品被重复选择

## 示例二：最长公共子序列

**原始版本**：
```python
def lcs_2d(s1, s2):
    m, n = len(s1), len(s2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if s1[i-1] == s2[j-1]:
                dp[i][j] = dp[i-1][j-1] + 1
            else:
                dp[i][j] = max(dp[i-1][j], dp[i][j-1])
    
    return dp[m][n]
```

**滚动数组优化**（一维）：
```python
def lcs_1d(s1, s2):
    m, n = len(s1), len(s2)
    dp = [0] * (n + 1)
    
    for i in range(1, m + 1):
        prev = 0  # 保存 dp[i-1][j-1]
        for j in range(1, n + 1):
            temp = dp[j]
            if s1[i-1] == s2[j-1]:
                dp[j] = prev + 1
            else:
                dp[j] = max(dp[j], dp[j-1])
            prev = temp
    
    return dp[n]
```

**关键点**：
- 需要额外变量 `prev` 保存 `dp[i-1][j-1]`
- **正序遍历**：因为需要 `dp[j-1]`（当前行的前一个）

## 示例三：完全背包

**原始版本**：
```python
def unbounded_knapsack_2d(weights, values, capacity):
    n = len(weights)
    dp = [[0] * (capacity + 1) for _ in range(n + 1)]
    
    for i in range(1, n + 1):
        for j in range(capacity + 1):
            dp[i][j] = dp[i-1][j]
            if j >= weights[i-1]:
                # 注意：这里是 dp[i][...]，可以重复选择
                dp[i][j] = max(dp[i][j], dp[i][j-weights[i-1]] + values[i-1])
    
    return dp[n][capacity]
```

**滚动数组优化**：
```python
def unbounded_knapsack_1d(weights, values, capacity):
    dp = [0] * (capacity + 1)
    
    for i in range(len(weights)):
        # 正序遍历，允许重复使用
        for j in range(weights[i], capacity + 1):
            dp[j] = max(dp[j], dp[j - weights[i]] + values[i])
    
    return dp[capacity]
```

**关键点**：
- **正序遍历**：因为完全背包可以重复选择
- 对比01背包：唯一的区别就是遍历顺序

## 模板总结

**01背包（逆序）**：
```python
for i in range(n):
    for j in range(capacity, weights[i] - 1, -1):
        dp[j] = max(dp[j], dp[j - weights[i]] + values[i])
```

**完全背包（正序）**：
```python
for i in range(n):
    for j in range(weights[i], capacity + 1):
        dp[j] = max(dp[j], dp[j - weights[i]] + values[i])
```

**需要保存前一行的某个值**：
```python
for i in range(m):
    prev = initial_value
    for j in range(n):
        temp = dp[j]
        dp[j] = f(dp[j], dp[j-1], prev)
        prev = temp
```

## 进阶：多行滚动

有时状态转移依赖前 k 行，可以用 k 个数组轮流使用：

```python
def dp_with_k_rows(n, m, k):
    """
    状态转移依赖前 k 行
    """
    dp = [[0] * m for _ in range(k)]
    
    for i in range(n):
        cur_row = i % k
        prev_row = (i - 1) % k
        
        for j in range(m):
            dp[cur_row][j] = f(dp[prev_row][j], ...)
    
    return dp[(n-1) % k]
```

## 小结

| 技巧 | 空间复杂度 | 适用场景 |
|-----|-----------|---------|
| 二维DP | O(n × m) | 需要回溯路径 |
| 一维滚动 | O(m) | 只需最终结果，转移依赖前一行 |
| 多行滚动 | O(k × m) | 转移依赖前 k 行 |
| 双变量 | O(1) | 斐波那契类问题 |

**优化原则**：
1. 分析状态转移依赖关系
2. 确定最少需要保存几行
3. 选择合适的滚动方式
4. 注意遍历顺序（正序/逆序）
