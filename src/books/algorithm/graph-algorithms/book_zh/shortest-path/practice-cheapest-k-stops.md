# 实战：K 站中转内最便宜的航班

## 题目描述

这是 LeetCode 787 的另一种表述方式，我们来看一个变体问题：

**变体：恰好 K 次中转**

如果题目要求**恰好**经过 K 次中转（而不是最多 K 次），应该如何处理？

## 问题分析

"恰好 K 次中转"意味着路径必须有**恰好 K + 1 条边**，不能多也不能少。

这需要修改我们的状态定义和转移方程。

## 解法：动态规划

定义 `dp[t][i]` 为**恰好**经过 t 条边到达城市 i 的最小花费：

```python
from typing import List

class Solution:
    def findCheapestPriceExactK(self, n: int, flights: List[List[int]], 
                                  src: int, dst: int, k: int) -> int:
        INF = float('inf')
        # dp[t][i] = 恰好经过 t 条边到达 i 的最小花费
        dp = [[INF] * n for _ in range(k + 2)]
        dp[0][src] = 0
        
        for t in range(1, k + 2):
            for u, v, price in flights:
                if dp[t - 1][u] != INF:
                    dp[t][v] = min(dp[t][v], dp[t - 1][u] + price)
        
        # 恰好 k+1 条边
        return dp[k + 1][dst] if dp[k + 1][dst] != INF else -1
```

**与"最多 K 次"的区别**：
- 最多 K 次：`dp[t] = dp[t-1].copy()` 允许继承上一轮的值
- 恰好 K 次：不继承，只从 `t-1` 转移

## 扩展：打印路径

```python
def findCheapestPriceWithPath(n, flights, src, dst, k):
    INF = float('inf')
    dp = [[INF] * n for _ in range(k + 2)]
    parent = [[(-1, -1)] * n for _ in range(k + 2)]  # (上一跳城市, 上一轮次)
    dp[0][src] = 0
    
    for t in range(1, k + 2):
        dp[t] = dp[t - 1].copy()
        for u, v, price in flights:
            if dp[t - 1][u] != INF and dp[t - 1][u] + price < dp[t][v]:
                dp[t][v] = dp[t - 1][u] + price
                parent[t][v] = (u, t - 1)
    
    if dp[k + 1][dst] == INF:
        return -1, []
    
    # 重建路径
    path = [dst]
    city, step = dst, k + 1
    while city != src:
        prev_city, prev_step = parent[step][city]
        if prev_city == -1:
            break
        path.append(prev_city)
        city, step = prev_city, prev_step
    
    return dp[k + 1][dst], path[::-1]
```

## 相关变体问题

### 变体1：带机场关闭时间

某些机场在特定时间段关闭，航班无法降落。需要在状态中加入时间维度。

### 变体2：航班时刻表

每个航班有固定的起飞和降落时间，需要考虑时间约束。

```python
def findCheapestWithSchedule(n, flights, src, dst, k, start_time):
    """
    flights: [(from, to, depart_time, arrive_time, price), ...]
    """
    INF = float('inf')
    # dp[i] = (最早到达时间, 最小花费)
    # 这是一个更复杂的多目标优化问题
    pass
```

### 变体3：多源点出发

从多个城市中任选一个出发，找最便宜的路线：

```python
def findCheapestFromMultipleSrc(n, flights, sources, dst, k):
    INF = float('inf')
    dist = [INF] * n
    
    # 所有源点初始距离为 0
    for src in sources:
        dist[src] = 0
    
    for _ in range(k + 1):
        new_dist = dist.copy()
        for u, v, price in flights:
            if dist[u] != INF and dist[u] + price < new_dist[v]:
                new_dist[v] = dist[u] + price
        dist = new_dist
    
    return dist[dst] if dist[dst] != INF else -1
```

## 实战技巧

### 1. 边界条件处理

- k = 0 时，只能直飞
- src = dst 时，花费为 0
- 图可能不连通

```python
def findCheapestPrice(n, flights, src, dst, k):
    if src == dst:
        return 0
    
    INF = float('inf')
    dist = [INF] * n
    dist[src] = 0
    
    # 检查是否有直飞
    direct_flight = INF
    for u, v, price in flights:
        if u == src and v == dst:
            direct_flight = min(direct_flight, price)
    
    if k == 0:
        return direct_flight if direct_flight != INF else -1
    
    # 正常 Bellman-Ford
    for _ in range(k + 1):
        new_dist = dist.copy()
        for u, v, price in flights:
            if dist[u] != INF:
                new_dist[v] = min(new_dist[v], dist[u] + price)
        dist = new_dist
    
    return dist[dst] if dist[dst] != INF else -1
```

### 2. 处理重复航班

同一对城市之间可能有多个航班（不同价格）：

```python
from collections import defaultdict

def preprocess_flights(flights):
    """只保留每对城市间最便宜的航班"""
    best = defaultdict(lambda: float('inf'))
    for u, v, price in flights:
        best[(u, v)] = min(best[(u, v)], price)
    return [(u, v, price) for (u, v), price in best.items()]
```

## 小结

1. K 站中转问题是限制边数的最短路径问题
2. Bellman-Ford 通过控制松弛轮数自然处理边数限制
3. 关键技巧：使用上一轮的距离值，避免同轮传递
4. 可扩展到恰好 K 次、多源点、带时间约束等变体
