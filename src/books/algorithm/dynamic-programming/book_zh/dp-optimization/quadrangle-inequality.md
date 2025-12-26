# 四边形不等式优化

## 核心思想

> 某些区间DP的决策点具有**单调性**，即最优分割点随着区间右端点增大而不减。利用这一性质，可以将时间复杂度从 O(n³) 降到 O(n²)。

**时间优化**：O(n³) → O(n²)

## 四边形不等式定义

对于代价函数 `w(i, j)`，如果满足：

**交叉单调性**：
```
w(a, c) + w(b, d) ≤ w(a, d) + w(b, c)  (其中 a ≤ b ≤ c ≤ d)
```

则称 `w` 满足**四边形不等式**。

**几何直观**：
```
    a     b     c     d
    |-----|-----|-----|
    
    w(a,c) + w(b,d) ≤ w(a,d) + w(b,c)
    [交叉] ≤ [包含]
```

## 决策单调性

如果 `w` 满足四边形不等式，则DP的最优决策点具有单调性：

**定理**：设 `s[i][j]` 是区间 `[i, j]` 的最优分割点，则：
```
s[i][j-1] ≤ s[i][j] ≤ s[i+1][j]
```

**含义**：
- 区间右端点增大时，最优分割点不会向左移动
- 区间左端点增大时，最优分割点不会向右移动

## 示例一：矩阵连乘

**问题**：n 个矩阵相乘，确定最优的括号划分顺序。

**状态定义**：
```
dp[i][j] = 矩阵 i 到 j 相乘的最小代价
```

**状态转移**：
```
dp[i][j] = min(dp[i][k] + dp[k+1][j] + p[i-1] × p[k] × p[j])
          k=i..j-1
```

**暴力DP**（O(n³)）：
```python
def matrixChainOrder_brute(p):
    """
    p[i] 表示第 i 个矩阵的行数，p[i+1] 是列数
    """
    n = len(p) - 1
    dp = [[0] * n for _ in range(n)]
    
    for length in range(2, n + 1):
        for i in range(n - length + 1):
            j = i + length - 1
            dp[i][j] = float('inf')
            
            # 遍历所有分割点
            for k in range(i, j):
                cost = dp[i][k] + dp[k+1][j] + p[i] * p[k+1] * p[j+1]
                dp[i][j] = min(dp[i][j], cost)
    
    return dp[0][n-1]
```

**四边形不等式优化**（O(n²)）：
```python
def matrixChainOrder(p):
    n = len(p) - 1
    dp = [[0] * n for _ in range(n)]
    s = [[0] * n for _ in range(n)]  # 记录最优分割点
    
    # 初始化
    for i in range(n):
        s[i][i] = i
    
    for length in range(2, n + 1):
        for i in range(n - length + 1):
            j = i + length - 1
            dp[i][j] = float('inf')
            
            # 只在 [s[i][j-1], s[i+1][j]] 范围内搜索
            left = s[i][j-1] if j > 0 else i
            right = s[i+1][j] if i + 1 < n else j - 1
            
            for k in range(left, min(right + 1, j)):
                cost = dp[i][k] + dp[k+1][j] + p[i] * p[k+1] * p[j+1]
                if cost < dp[i][j]:
                    dp[i][j] = cost
                    s[i][j] = k
    
    return dp[0][n-1]

# 测试
p = [30, 35, 15, 5, 10, 20, 25]
print(matrixChainOrder(p))
# 15125
```

**复杂度分析**：
- 暴力：每个 `(i, j)` 遍历 O(n) 个分割点 → O(n³)
- 优化：每个 `(i, j)` 只遍历 `s[i+1][j] - s[i][j-1]` 个点
- 总和：每个点最多被访问 O(1) 次 → O(n²)

## 示例二：石子合并

**问题**：n 堆石子排成一排，每次合并相邻两堆，代价是两堆石子总数。求最小总代价。

**代价函数**：
```
w(i, j) = sum(stones[i:j+1])
```

**验证四边形不等式**：
```
w(a, c) + w(b, d) = sum[a:c] + sum[b:d]
w(a, d) + w(b, c) = sum[a:d] + sum[b:c]

因为 sum[a:c] + sum[b:d] ≤ sum[a:d] + sum[b:c]（重叠部分只算一次）
所以满足四边形不等式
```

**优化后的代码**：
```python
def mergeStones(stones):
    n = len(stones)
    prefix = [0] * (n + 1)
    for i in range(n):
        prefix[i+1] = prefix[i] + stones[i]
    
    dp = [[0] * n for _ in range(n)]
    s = [[0] * n for _ in range(n)]
    
    for i in range(n):
        s[i][i] = i
    
    for length in range(2, n + 1):
        for i in range(n - length + 1):
            j = i + length - 1
            dp[i][j] = float('inf')
            
            left = s[i][j-1]
            right = s[i+1][j] if i + 1 <= j else j - 1
            
            for k in range(left, right + 1):
                cost = dp[i][k] + dp[k+1][j] + prefix[j+1] - prefix[i]
                if cost < dp[i][j]:
                    dp[i][j] = cost
                    s[i][j] = k
    
    return dp[0][n-1]

# 测试
stones = [3, 4, 3, 5, 6]
print(mergeStones(stones))
```

## 如何判断是否满足四边形不等式

**方法一：直接验证**
```python
def check_quadrangle_inequality(w, n):
    """
    检查代价函数是否满足四边形不等式
    """
    for a in range(n):
        for b in range(a, n):
            for c in range(b, n):
                for d in range(c, n):
                    if w(a, c) + w(b, d) > w(a, d) + w(b, c):
                        return False
    return True
```

**方法二：充分条件**

如果 `w` 同时满足：
1. **区间包含单调性**：`w(i, j) ≤ w(i', j')`（当 `i ≤ i' ≤ j' ≤ j`）
2. **四边形不等式**

则DP的最优决策点具有单调性。

**常见满足的函数**：
- `w(i, j) = (j - i + 1) × cost`（均摊代价）
- `w(i, j) = sum[i:j]`（区间和）
- `w(i, j) = max[i:j]`（区间最大值）

## 模板代码

```python
def quadrangle_inequality_dp(n, cost_func):
    """
    四边形不等式优化的区间DP模板
    """
    dp = [[0] * n for _ in range(n)]
    s = [[0] * n for _ in range(n)]
    
    # 初始化
    for i in range(n):
        dp[i][i] = 0
        s[i][i] = i
    
    # 枚举区间长度
    for length in range(2, n + 1):
        for i in range(n - length + 1):
            j = i + length - 1
            dp[i][j] = float('inf')
            
            # 优化搜索范围
            left = s[i][j-1]
            right = s[i+1][j] if i + 1 <= j else j - 1
            
            for k in range(left, right + 1):
                cost = dp[i][k] + dp[k+1][j] + cost_func(i, j)
                if cost < dp[i][j]:
                    dp[i][j] = cost
                    s[i][j] = k
    
    return dp[0][n-1]
```

## 小结

| 方法 | 时间复杂度 | 适用条件 |
|-----|-----------|---------|
| 暴力区间DP | O(n³) | 无要求 |
| 四边形不等式 | O(n²) | 满足四边形不等式和区间包含单调性 |

**识别技巧**：
1. 区间DP，枚举分割点
2. 代价函数是区间和/最值
3. 相邻区间合并的代价

**应用场景**：
- 矩阵连乘
- 石子合并
- 最优二叉搜索树
- 邮局选址问题
