# 状态压缩 DP 设计技巧

## 什么是状态压缩 DP

首先要问一个问题：**为什么需要状态压缩？**

在许多动态规划问题中，状态可能是一个**集合**或**排列**，如果用常规方式表示，空间和时间复杂度会非常高。状态压缩 DP 通过**位运算**将集合状态编码为整数，从而：
- **空间优化**：一个整数替代数组
- **时间优化**：位运算比循环快 10-100 倍
- **代码简洁**：状态转移更清晰

## 核心设计技巧

### 技巧 1：集合状态编码

**问题**：如何用整数表示集合？

**方案**：用整数的二进制位表示集合中的元素。

```python
# 集合 {0, 2, 3} 的状态
mask = (1 << 0) | (1 << 2) | (1 << 3)  # 1101 (二进制) = 13

# 检查元素 i 是否在集合中
def has_element(mask, i):
    return (mask & (1 << i)) != 0

# 添加元素 i
def add_element(mask, i):
    return mask | (1 << i)

# 移除元素 i
def remove_element(mask, i):
    return mask & ~(1 << i)
```

**示例：最短Hamilton路径**

> 给定 n 个城市和它们之间的距离，求从城市 0 出发访问所有城市一次并返回的最短路径。

```python
def shortest_hamilton_path(n, dist):
    """
    dp[mask][i] = 访问了 mask 中的城市，当前在城市 i 的最短路径
    """
    # 初始化
    dp = [[float('inf')] * n for _ in range(1 << n)]
    dp[1][0] = 0  # 从城市 0 出发
    
    # 枚举所有状态
    for mask in range(1 << n):
        for last in range(n):
            if dp[mask][last] == float('inf'):
                continue
            
            # 尝试访问下一个城市
            for nxt in range(n):
                if mask & (1 << nxt):  # 已访问
                    continue
                
                new_mask = mask | (1 << nxt)  # 新增城市 nxt
                dp[new_mask][nxt] = min(
                    dp[new_mask][nxt],
                    dp[mask][last] + dist[last][nxt]
                )
    
    # 返回起点
    ans = float('inf')
    for i in range(1, n):
        ans = min(ans, dp[(1 << n) - 1][i] + dist[i][0])
    
    return ans

# 测试
dist = [
    [0, 2, 9, 10],
    [1, 0, 6, 4],
    [15, 7, 0, 8],
    [6, 3, 12, 0]
]
print(shortest_hamilton_path(4, dist))  # 21
```

**复杂度分析**：
- **时间**：O(2^n × n^2)（枚举状态 × 枚举当前城市 × 枚举下一个城市）
- **空间**：O(2^n × n)

### 技巧 2：子集枚举

**问题**：如何枚举一个集合的所有子集？

**方案 1：从空集到全集**

```python
def enumerate_all_subsets(n):
    """
    枚举 {0, 1, ..., n-1} 的所有子集
    """
    for mask in range(1 << n):
        # 处理子集 mask
        subset = [i for i in range(n) if mask & (1 << i)]
        print(subset)

# 示例
enumerate_all_subsets(3)
# []
# [0]
# [1]
# [0, 1]
# [2]
# [0, 2]
# [1, 2]
# [0, 1, 2]
```

**方案 2：枚举某个集合的子集**

```python
def enumerate_subsets(mask):
    """
    枚举 mask 的所有子集（包括空集）
    """
    sub = mask
    while True:
        print(bin(sub))
        if sub == 0:
            break
        sub = (sub - 1) & mask

# 示例
enumerate_subsets(5)  # 0101 (集合 {0, 2})
# 0b101 ({0, 2})
# 0b100 ({2})
# 0b1   ({0})
# 0b0   ({})
```

**应用：子集和问题**

> 给定 n 个数字和目标 target，问有多少种方式选出子集使和为 target。

```python
def subset_sum_count(nums, target):
    """
    dp[mask] = 选择 mask 子集的和
    """
    n = len(nums)
    dp = [0] * (1 << n)
    dp[0] = 0
    
    count = 0
    for mask in range(1 << n):
        # 枚举添加哪个数字
        for i in range(n):
            if mask & (1 << i):  # 已选择
                continue
            
            new_mask = mask | (1 << i)
            new_sum = dp[mask] + nums[i]
            dp[new_mask] = new_sum
            
            if new_sum == target:
                count += 1
    
    return count

# 但这种方法会重复计数，正确方法是：
def subset_sum_count_correct(nums, target):
    n = len(nums)
    count = 0
    
    for mask in range(1 << n):
        total = sum(nums[i] for i in range(n) if mask & (1 << i))
        if total == target:
            count += 1
    
    return count

# 测试
print(subset_sum_count_correct([1, 2, 3], 3))  # 2 ({3}, {1, 2})
```

### 技巧 3：状态压缩 + 维度

**问题**：除了集合状态，还需要其他维度怎么办？

**方案**：组合使用 `dp[mask][其他维度]`

**示例：带时间限制的TSP**

```python
def tsp_with_time_limit(n, dist, time_limit):
    """
    dp[mask][i][t] = 访问了 mask 中的城市，当前在城市 i，用时 t 的最短路径
    """
    dp = [[[float('inf')] * (time_limit + 1) for _ in range(n)] 
          for _ in range(1 << n)]
    dp[1][0][0] = 0
    
    for mask in range(1 << n):
        for last in range(n):
            for t in range(time_limit + 1):
                if dp[mask][last][t] == float('inf'):
                    continue
                
                for nxt in range(n):
                    if mask & (1 << nxt):
                        continue
                    
                    new_mask = mask | (1 << nxt)
                    new_time = t + 1  # 假设每步用时 1
                    
                    if new_time <= time_limit:
                        dp[new_mask][nxt][new_time] = min(
                            dp[new_mask][nxt][new_time],
                            dp[mask][last][t] + dist[last][nxt]
                        )
    
    # 找最优解
    ans = float('inf')
    for i in range(1, n):
        for t in range(time_limit + 1):
            ans = min(ans, dp[(1 << n) - 1][i][t] + dist[i][0])
    
    return ans if ans != float('inf') else -1
```

### 技巧 4：状态转移优化

**问题**：状态转移时如何避免重复计算？

**方案 1：按位枚举**

```python
# 枚举当前状态可以转移到的下一个状态
for mask in range(1 << n):
    for i in range(n):
        if not (mask & (1 << i)):  # 元素 i 不在 mask 中
            new_mask = mask | (1 << i)
            # 转移
```

**方案 2：反向枚举（从大状态到小状态）**

```python
# 从全集开始，逐个移除元素
for mask in range((1 << n) - 1, -1, -1):
    for i in range(n):
        if mask & (1 << i):  # 元素 i 在 mask 中
            prev_mask = mask & ~(1 << i)
            # 转移
```

### 技巧 5：轮廓线 DP

**问题**：棋盘覆盖问题，如何表示当前行的状态？

**方案**：用一个 mask 表示当前行哪些格子被上一行占用。

**示例：方格覆盖**

> 用 1×2 的骨牌覆盖 n×m 的棋盘，有多少种方式？

```python
def tile_covering(n, m):
    """
    dp[i][mask] = 填完前 i 行，第 i 行状态为 mask 的方案数
    mask 的第 j 位为 1 表示 (i, j) 被上一行占用
    """
    dp = [[0] * (1 << m) for _ in range(n + 1)]
    dp[0][0] = 1
    
    for i in range(n):
        for mask in range(1 << m):
            if dp[i][mask] == 0:
                continue
            
            fill_row(dp, i, m, mask, 0, 0)
    
    return dp[n][0]

def fill_row(dp, i, m, cur_mask, j, next_mask):
    """
    递归填充第 i 行的第 j 列
    cur_mask: 第 i 行当前状态（哪些格子被占用）
    next_mask: 第 i+1 行状态（哪些格子会被占用）
    """
    if j == m:
        dp[i + 1][next_mask] += dp[i][cur_mask]
        return
    
    if cur_mask & (1 << j):  # (i, j) 被上一行占用
        fill_row(dp, i, m, cur_mask, j + 1, next_mask)
    else:
        # 选择 1：竖放（占用 (i+1, j)）
        fill_row(dp, i, m, cur_mask | (1 << j), j + 1, next_mask | (1 << j))
        
        # 选择 2：横放（占用 (i, j+1)）
        if j + 1 < m and not (cur_mask & (1 << (j + 1))):
            fill_row(dp, i, m, cur_mask | (1 << j) | (1 << (j + 1)), j + 2, next_mask)

# 测试
print(tile_covering(3, 3))  # 0 (3×3 无法用 1×2 骨牌完全覆盖)
print(tile_covering(2, 3))  # 3
```

### 技巧 6：状态压缩 + 记忆化搜索

**问题**：状态转移顺序不确定时怎么办？

**方案**：使用记忆化搜索（DFS + 缓存）

```python
from functools import lru_cache

@lru_cache(maxsize=None)
def dfs(mask, last):
    """
    访问了 mask 中的城市，当前在 last
    """
    if mask == (1 << n) - 1:  # 访问完所有城市
        return dist[last][0]  # 返回起点
    
    ans = float('inf')
    for nxt in range(n):
        if mask & (1 << nxt):  # 已访问
            continue
        
        new_mask = mask | (1 << nxt)
        ans = min(ans, dfs(new_mask, nxt) + dist[last][nxt])
    
    return ans

# 调用
n = 4
dist = [[0, 10, 15, 20], [10, 0, 35, 25], [15, 35, 0, 30], [20, 25, 30, 0]]
result = dfs(1, 0)  # 从城市 0 出发
```

## 状态压缩 DP 模板

### 模板 1：基础状态压缩

```python
def state_compression_dp(n, ...):
    """
    dp[mask] = 选择了 mask 子集的最优解
    """
    dp = [初始值] * (1 << n)
    dp[0] = 0  # 空集
    
    for mask in range(1 << n):
        # 枚举添加哪个元素
        for i in range(n):
            if mask & (1 << i):  # 已选择
                continue
            
            new_mask = mask | (1 << i)
            dp[new_mask] = 更新(dp[mask], ...)
    
    return dp[(1 << n) - 1]  # 全集
```

### 模板 2：状态压缩 + 位置

```python
def state_compression_with_position(n, ...):
    """
    dp[mask][i] = 选择了 mask 子集，当前在位置 i 的最优解
    """
    dp = [[初始值] * n for _ in range(1 << n)]
    dp[1][0] = 0  # 从位置 0 出发
    
    for mask in range(1 << n):
        for last in range(n):
            if dp[mask][last] == 初始值:
                continue
            
            for nxt in range(n):
                if mask & (1 << nxt):
                    continue
                
                new_mask = mask | (1 << nxt)
                dp[new_mask][nxt] = 更新(dp[mask][last], ...)
    
    return min(dp[(1 << n) - 1])
```

### 模板 3：轮廓线 DP

```python
def profile_dp(n, m, ...):
    """
    dp[i][mask] = 处理完前 i 行，当前行状态为 mask 的方案数
    """
    dp = [[0] * (1 << m) for _ in range(n + 1)]
    dp[0][0] = 1
    
    for i in range(n):
        for mask in range(1 << m):
            if dp[i][mask] == 0:
                continue
            
            # 填充当前行
            fill_row(dp, i, m, mask, ...)
    
    return dp[n][0]
```

## 常见陷阱

### 陷阱 1：位运算优先级

```python
# 错误
if mask & 1 << i:  # 错误！等价于 mask & (1 << i)

# 正确
if (mask & (1 << i)) != 0:
    pass
```

### 陷阱 2：边界条件

```python
# 错误：忘记初始化空集
dp = [float('inf')] * (1 << n)
# dp[0] 应该初始化！

# 正确
dp = [float('inf')] * (1 << n)
dp[0] = 0
```

### 陷阱 3：状态转移顺序

```python
# 错误：状态转移顺序不对
for mask in range((1 << n) - 1, -1, -1):  # 从大到小
    for i in range(n):
        new_mask = mask | (1 << i)
        dp[new_mask] = ...  # 错误！new_mask 可能已经处理过了

# 正确：从小到大
for mask in range(1 << n):
    for i in range(n):
        if not (mask & (1 << i)):
            new_mask = mask | (1 << i)
            dp[new_mask] = ...
```

### 陷阱 4：空间优化

```python
# 错误：滚动数组用错
dp = [[0] * n for _ in range(2)]
for mask in range(1 << n):
    cur = mask & 1
    prev = 1 - cur
    # 这样做是错误的！mask 不是线性递增的关系

# 正确：不能用滚动数组优化状态压缩 DP
dp = [[0] * n for _ in range(1 << n)]
```

## 性能对比

| 方法 | 时间复杂度 | 空间复杂度 | 适用范围 |
|-----|-----------|-----------|---------|
| 暴力枚举 | O(n!) | O(n) | n ≤ 10 |
| 记忆化搜索 | O(2^n × n) | O(2^n × n) | n ≤ 20 |
| 状态压缩 DP | O(2^n × n^2) | O(2^n × n) | n ≤ 20 |
| 轮廓线 DP | O(n × m × 2^m) | O(2^m) | m ≤ 10 |

## 小结

### 核心技巧
1. **集合编码**：用整数的二进制位表示集合
2. **子集枚举**：`for mask in range(1 << n)` 或 `sub = (sub - 1) & mask`
3. **状态转移**：`new_mask = mask | (1 << i)` 添加元素
4. **轮廓线 DP**：表示当前行的占用状态
5. **记忆化搜索**：状态转移顺序不确定时使用

### 设计步骤
1. **定义状态**：`dp[mask][...]` 表示什么
2. **初始化**：空集或起始状态
3. **状态转移**：枚举下一个状态
4. **答案提取**：通常是 `dp[(1 << n) - 1][...]`

### 适用场景
- 旅行商问题（TSP）
- 子集和/选择问题
- 棋盘覆盖问题
- 图的染色/匹配问题
- 任务分配问题

掌握这些技巧，就能灵活应对各种状态压缩 DP 问题！
