# 旅行商问题（TSP）

## 问题描述

> 给定 n 个城市和它们之间的距离，一个旅行商从某个城市出发，访问所有城市恰好一次后返回起点，求最短路径长度。

**示例**：
```
输入：
n = 4
dist = [
  [0, 10, 15, 20],
  [10, 0, 35, 25],
  [15, 35, 0, 30],
  [20, 25, 30, 0]
]
输出：80
解释：最优路径是 0 → 1 → 3 → 2 → 0，总长度 10 + 25 + 30 + 15 = 80
```

**约束**：
- `2 <= n <= 20`
- `dist[i][j] == dist[j][i]`（对称）
- `dist[i][i] == 0`

## 问题分析

首先要问一个问题：**为什么这个问题很难？**

TSP 是一个 **NP-hard** 问题，暴力枚举所有排列的复杂度是 O(n!)，对于 n=20，这是 `2.43 × 10^18` 次操作，完全不可行。

现在我要问第二个问题：**状态压缩 DP 如何优化？**

关键观察：
- **无后效性**：到达某个城市集合后，之前的访问顺序不重要，只需要知道**最后在哪个城市**
- **状态表示**：用一个整数 `mask` 表示已访问的城市集合
- **状态转移**：从 `mask` 转移到 `mask | (1 << nxt)`

这样复杂度降为 O(n^2 × 2^n)，对于 n=20 是可行的。

## 解法一：状态压缩 DP（迭代版）

### 思路

**状态定义**：
- `dp[mask][i]` = 访问了 `mask` 中的城市，当前在城市 `i`，到达这个状态的最短路径长度

**状态转移**：
- 枚举下一个要访问的城市 `nxt`（不在 `mask` 中）
- `dp[mask | (1 << nxt)][nxt] = min(dp[mask | (1 << nxt)][nxt], dp[mask][i] + dist[i][nxt])`

**初始化**：
- `dp[1 << 0][0] = 0`（从城市 0 出发，初始距离为 0）

**答案**：
- `min(dp[(1 << n) - 1][i] + dist[i][0] for i in range(1, n))`
- 即访问完所有城市后，从城市 `i` 返回起点 0 的最短路径

### 代码实现

```python
def tsp(n, dist):
    """
    旅行商问题（TSP）
    
    Args:
        n: 城市数量
        dist: dist[i][j] 是城市 i 到城市 j 的距离
    
    Returns:
        最短路径长度
    """
    # 初始化 DP 表
    dp = [[float('inf')] * n for _ in range(1 << n)]
    dp[1][0] = 0  # 从城市 0 出发
    
    # 枚举所有状态
    for mask in range(1 << n):
        # 枚举当前所在城市
        for last in range(n):
            if dp[mask][last] == float('inf'):
                continue  # 这个状态不可达
            
            # 枚举下一个要访问的城市
            for nxt in range(n):
                if mask & (1 << nxt):  # 已访问
                    continue
                
                new_mask = mask | (1 << nxt)
                dp[new_mask][nxt] = min(
                    dp[new_mask][nxt],
                    dp[mask][last] + dist[last][nxt]
                )
    
    # 返回起点
    full_mask = (1 << n) - 1
    ans = float('inf')
    for i in range(1, n):
        ans = min(ans, dp[full_mask][i] + dist[i][0])
    
    return ans

# 测试
dist = [
    [0, 10, 15, 20],
    [10, 0, 35, 25],
    [15, 35, 0, 30],
    [20, 25, 30, 0]
]
print(tsp(4, dist))  # 80
```

**复杂度分析**：
- **时间**：O(n^2 × 2^n)
  - 外层循环 O(2^n) 枚举状态
  - 内层两层循环 O(n^2) 枚举当前城市和下一个城市
- **空间**：O(n × 2^n)

### 逐步推导

以 n=4 为例，展示状态转移过程：

**初始状态**：
```
dp[0001][0] = 0  (只访问城市 0，在城市 0)
```

**第一步**：从城市 0 出发
```
dp[0011][1] = dp[0001][0] + dist[0][1] = 0 + 10 = 10
dp[0101][2] = dp[0001][0] + dist[0][2] = 0 + 15 = 15
dp[1001][3] = dp[0001][0] + dist[0][3] = 0 + 20 = 20
```

**第二步**：从城市 1, 2, 3 继续
```
dp[0111][2] = min(dp[0011][1] + dist[1][2], dp[0101][2] + dist[2][1])
            = min(10 + 35, 15 + 35) = 45

dp[0111][3] = min(dp[0011][1] + dist[1][3], dp[1001][3] + dist[3][1])
            = min(10 + 25, 20 + 25) = 35

...
```

**最后一步**：返回起点
```
ans = min(
    dp[1111][1] + dist[1][0],
    dp[1111][2] + dist[2][0],
    dp[1111][3] + dist[3][0]
)
```

## 解法二：记忆化搜索

### 思路

使用 DFS + 记忆化，更直观地表达递归关系。

### 代码实现

```python
from functools import lru_cache

def tsp_dfs(n, dist):
    """
    使用记忆化搜索解决 TSP
    """
    @lru_cache(maxsize=None)
    def dfs(mask, last):
        """
        已访问 mask 中的城市，当前在 last
        返回剩余路径的最短长度
        """
        if mask == (1 << n) - 1:
            # 访问完所有城市，返回起点
            return dist[last][0]
        
        ans = float('inf')
        for nxt in range(n):
            if mask & (1 << nxt):  # 已访问
                continue
            
            new_mask = mask | (1 << nxt)
            ans = min(ans, dfs(new_mask, nxt) + dist[last][nxt])
        
        return ans
    
    # 从城市 0 出发
    return dfs(1, 0)

# 测试
dist = [
    [0, 10, 15, 20],
    [10, 0, 35, 25],
    [15, 35, 0, 30],
    [20, 25, 30, 0]
]
print(tsp_dfs(4, dist))  # 80
```

**优点**：
- 代码更简洁
- 递归关系更清晰
- 自动处理状态依赖

**缺点**：
- 递归深度可能较大
- 难以重构路径

## 解法三：记录路径

### 思路

除了记录最短距离，还要记录路径。

### 代码实现

```python
def tsp_with_path(n, dist):
    """
    返回最短路径长度和路径
    """
    dp = [[float('inf')] * n for _ in range(1 << n)]
    parent = [[-1] * n for _ in range(1 << n)]
    
    dp[1][0] = 0
    
    for mask in range(1 << n):
        for last in range(n):
            if dp[mask][last] == float('inf'):
                continue
            
            for nxt in range(n):
                if mask & (1 << nxt):
                    continue
                
                new_mask = mask | (1 << nxt)
                new_dist = dp[mask][last] + dist[last][nxt]
                
                if new_dist < dp[new_mask][nxt]:
                    dp[new_mask][nxt] = new_dist
                    parent[new_mask][nxt] = last
    
    # 找到最优解
    full_mask = (1 << n) - 1
    min_dist = float('inf')
    last_city = -1
    
    for i in range(1, n):
        total = dp[full_mask][i] + dist[i][0]
        if total < min_dist:
            min_dist = total
            last_city = i
    
    # 重构路径
    path = []
    mask = full_mask
    while last_city != -1:
        path.append(last_city)
        prev = parent[mask][last_city]
        mask ^= (1 << last_city)
        last_city = prev
    
    path.reverse()
    path.append(0)  # 返回起点
    
    return min_dist, path

# 测试
dist = [
    [0, 10, 15, 20],
    [10, 0, 35, 25],
    [15, 35, 0, 30],
    [20, 25, 30, 0]
]
length, path = tsp_with_path(4, dist)
print(f"最短路径长度: {length}")  # 80
print(f"路径: {' -> '.join(map(str, path))}")  # 0 -> 1 -> 3 -> 2 -> 0
```

## 优化技巧

### 技巧 1：从任意起点出发

由于 TSP 是一个环，可以从任意城市出发。

```python
def tsp_any_start(n, dist):
    """
    从任意城市出发
    """
    ans = float('inf')
    for start in range(n):
        # 修改初始化
        dp = [[float('inf')] * n for _ in range(1 << n)]
        dp[1 << start][start] = 0
        
        # ... DP 过程 ...
        
        # 返回起点
        full_mask = (1 << n) - 1
        for i in range(n):
            if i == start:
                continue
            ans = min(ans, dp[full_mask][i] + dist[i][start])
    
    return ans
```

### 技巧 2：状态剪枝

如果当前距离已经超过已知最优解，提前返回。

```python
def tsp_pruning(n, dist):
    """
    带剪枝的 TSP
    """
    best = float('inf')
    
    @lru_cache(maxsize=None)
    def dfs(mask, last, cur_dist):
        nonlocal best
        
        if cur_dist >= best:
            return float('inf')  # 剪枝
        
        if mask == (1 << n) - 1:
            total = cur_dist + dist[last][0]
            best = min(best, total)
            return dist[last][0]
        
        ans = float('inf')
        for nxt in range(n):
            if mask & (1 << nxt):
                continue
            
            new_mask = mask | (1 << nxt)
            ans = min(ans, dfs(new_mask, nxt, cur_dist + dist[last][nxt]) + dist[last][nxt])
        
        return ans
    
    return dfs(1, 0, 0)
```

### 技巧 3：启发式搜索（A*）

使用最小生成树（MST）作为启发函数。

```python
def tsp_astar(n, dist):
    """
    使用 A* 优化的 TSP
    """
    import heapq
    
    def mst_heuristic(unvisited):
        """
        计算未访问城市的 MST 长度（启发函数）
        """
        if len(unvisited) <= 1:
            return 0
        
        # Prim 算法计算 MST
        visited = {unvisited[0]}
        edges = []
        for v in visited:
            for u in unvisited:
                if u not in visited:
                    heapq.heappush(edges, (dist[v][u], v, u))
        
        mst_cost = 0
        while len(visited) < len(unvisited):
            cost, u, v = heapq.heappop(edges)
            if v in visited:
                continue
            
            visited.add(v)
            mst_cost += cost
            
            for w in unvisited:
                if w not in visited:
                    heapq.heappush(edges, (dist[v][w], v, w))
        
        return mst_cost
    
    # A* 搜索
    pq = [(0, 1, 0)]  # (f = g + h, mask, last)
    g_score = {(1, 0): 0}
    
    while pq:
        f, mask, last = heapq.heappop(pq)
        
        if mask == (1 << n) - 1:
            return g_score[(mask, last)] + dist[last][0]
        
        for nxt in range(n):
            if mask & (1 << nxt):
                continue
            
            new_mask = mask | (1 << nxt)
            new_g = g_score[(mask, last)] + dist[last][nxt]
            
            if (new_mask, nxt) not in g_score or new_g < g_score[(new_mask, nxt)]:
                g_score[(new_mask, nxt)] = new_g
                
                unvisited = [i for i in range(n) if not (new_mask & (1 << i))]
                h = mst_heuristic(unvisited)
                
                heapq.heappush(pq, (new_g + h, new_mask, nxt))
    
    return float('inf')
```

## 常见错误

### 错误 1：初始化错误

```python
# 错误：忘记设置起点
dp = [[float('inf')] * n for _ in range(1 << n)]
# 缺少 dp[1][0] = 0

# 正确
dp[1][0] = 0
```

### 错误 2：状态转移顺序

```python
# 错误：状态转移顺序不对
for mask in range((1 << n) - 1, -1, -1):  # 错误！
    ...

# 正确：从小到大
for mask in range(1 << n):
    ...
```

### 错误 3：路径重构错误

```python
# 错误：忘记反转路径
path = []
while last != -1:
    path.append(last)
    ...
# 缺少 path.reverse()

# 正确
path.reverse()
```

### 错误 4：返回起点

```python
# 错误：忘记加上返回起点的距离
return dp[(1 << n) - 1][i]  # 错误！

# 正确
return dp[(1 << n) - 1][i] + dist[i][0]
```

## 扩展问题

### 扩展 1：多旅行商问题（mTSP）

> k 个旅行商从起点出发，每个城市访问一次，所有人返回起点，最小化最大路径长度。

```python
def mtsp(n, k, dist):
    """
    k 个旅行商的 TSP
    """
    # dp[mask][j] = 访问了 mask 中的城市，用了 j 个旅行商，最大路径长度
    # ...
    pass
```

### 扩展 2：带时间窗的 TSP

> 每个城市有访问时间窗 [earliest, latest]，必须在这个时间段内访问。

```python
def tsp_time_window(n, dist, time_windows):
    """
    带时间窗的 TSP
    """
    # dp[mask][i][t] = 访问了 mask，在城市 i，当前时间 t
    # ...
    pass
```

### 扩展 3：TSP with Profits

> 每个城市有利润，目标是最大化利润同时最小化距离。

```python
def tsp_profit(n, dist, profit):
    """
    带利润的 TSP
    """
    # dp[mask][i] = (最短距离, 最大利润)
    # ...
    pass
```

## 性能对比

| 方法 | 时间复杂度 | 空间复杂度 | 适用范围 |
|-----|-----------|-----------|---------|
| 暴力枚举 | O(n!) | O(n) | n ≤ 10 |
| 状态压缩 DP | O(n^2 × 2^n) | O(n × 2^n) | n ≤ 20 |
| 记忆化搜索 | O(n^2 × 2^n) | O(n × 2^n) | n ≤ 20 |
| A* 搜索 | O(n^2 × 2^n) | O(n × 2^n) | n ≤ 20 |
| 近似算法 | O(n^2 log n) | O(n) | n > 20 |

## 小结

### 核心思想
1. **状态压缩**：用整数表示已访问城市集合
2. **无后效性**：只需知道访问了哪些城市和当前位置
3. **状态转移**：枚举下一个要访问的城市
4. **路径重构**：回溯 parent 数组

### 关键技巧
- 初始化起点：`dp[1 << 0][0] = 0`
- 状态转移：`dp[mask | (1 << nxt)][nxt] = dp[mask][last] + dist[last][nxt]`
- 返回起点：`dp[full][i] + dist[i][0]`
- 路径重构：回溯 parent 数组并反转

### 适用场景
- 旅行商问题
- 车辆路径规划
- 电路板打孔优化
- DNA 测序
- 任务调度

TSP 是状态压缩 DP 的经典应用，掌握它的解法对理解状态压缩 DP 至关重要！
