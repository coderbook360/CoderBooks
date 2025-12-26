# 实战：最便宜的航班

## 题目描述

**LeetCode 787. Cheapest Flights Within K Stops**

有 `n` 个城市通过一些航班连接。给你一个数组 `flights`，其中 `flights[i] = [fromi, toi, pricei]`，表示该航班从城市 `fromi` 开始，以价格 `pricei` 抵达 `toi`。

现在给定所有的城市和航班，以及出发城市 `src` 和目的地 `dst`，你的任务是找到从 `src` 到 `dst` 最多经过 `k` 站中转的最便宜的价格。如果不存在这样的路线，返回 `-1`。

**示例**：

```
输入：n = 4, flights = [[0,1,100],[1,2,100],[2,0,100],[1,3,600],[2,3,200]], src = 0, dst = 3, k = 1
输出：700
解释：从 0 到 3 最多经过 1 次中转，最便宜的路径是 0 -> 1 -> 3，价格 100 + 600 = 700
```

## 问题分析

这道题的关键约束是**最多经过 k 站中转**，即路径最多有 **k + 1** 条边。

这正是 **Bellman-Ford 算法**的强项：它可以自然地处理"限制边数"的最短路径问题。

## 解法一：Bellman-Ford（限制边数）

```python
from typing import List

class Solution:
    def findCheapestPrice(self, n: int, flights: List[List[int]], src: int, dst: int, k: int) -> int:
        INF = float('inf')
        dist = [INF] * n
        dist[src] = 0
        
        # 最多 k+1 条边，松弛 k+1 轮
        for _ in range(k + 1):
            # 使用上一轮的 dist 值，避免同一轮内传递
            new_dist = dist.copy()
            for u, v, price in flights:
                if dist[u] != INF and dist[u] + price < new_dist[v]:
                    new_dist[v] = dist[u] + price
            dist = new_dist
        
        return dist[dst] if dist[dst] != INF else -1
```

**关键点**：必须使用 `dist.copy()` 保存上一轮的结果，否则一轮内可能松弛多条边。

**复杂度分析**：
- 时间：O(k × E)
- 空间：O(V)

## 解法二：BFS + 剪枝

使用 BFS 按层次遍历，层数即中转次数：

```python
from collections import deque, defaultdict

class Solution:
    def findCheapestPrice(self, n: int, flights: List[List[int]], src: int, dst: int, k: int) -> int:
        graph = defaultdict(list)
        for u, v, price in flights:
            graph[u].append((v, price))
        
        INF = float('inf')
        dist = [INF] * n
        dist[src] = 0
        
        # BFS：(当前城市, 当前花费)
        queue = deque([(src, 0)])
        stops = 0
        
        while queue and stops <= k:
            size = len(queue)
            for _ in range(size):
                u, cost = queue.popleft()
                
                for v, price in graph[u]:
                    new_cost = cost + price
                    # 只有更优时才入队
                    if new_cost < dist[v]:
                        dist[v] = new_cost
                        queue.append((v, new_cost))
            
            stops += 1
        
        return dist[dst] if dist[dst] != INF else -1
```

**复杂度分析**：
- 时间：O(k × E)（最坏情况每轮每条边都处理）
- 空间：O(V + E)

## 解法三：Dijkstra 变体

使用改进的 Dijkstra，状态为 `(花费, 城市, 剩余中转次数)`：

```python
import heapq
from collections import defaultdict

class Solution:
    def findCheapestPrice(self, n: int, flights: List[List[int]], src: int, dst: int, k: int) -> int:
        graph = defaultdict(list)
        for u, v, price in flights:
            graph[u].append((v, price))
        
        # (花费, 城市, 剩余可中转次数)
        heap = [(0, src, k + 1)]
        # 记录每个 (城市, 剩余中转) 状态的最小花费
        visited = {}
        
        while heap:
            cost, u, stops = heapq.heappop(heap)
            
            if u == dst:
                return cost
            
            if stops <= 0:
                continue
            
            # 剪枝：如果这个状态已经以更低成本访问过
            if (u, stops) in visited and visited[(u, stops)] <= cost:
                continue
            visited[(u, stops)] = cost
            
            for v, price in graph[u]:
                new_cost = cost + price
                heapq.heappush(heap, (new_cost, v, stops - 1))
        
        return -1
```

**注意**：这个解法需要小心状态空间爆炸，因为同一个城市可能以不同的剩余中转次数多次入堆。

## 解法四：动态规划

定义 `dp[t][i]` 为最多经过 t 条边到达城市 i 的最小花费：

```python
class Solution:
    def findCheapestPrice(self, n: int, flights: List[List[int]], src: int, dst: int, k: int) -> int:
        INF = float('inf')
        # dp[t][i] = 最多经过 t 条边到达 i 的最小花费
        dp = [[INF] * n for _ in range(k + 2)]
        dp[0][src] = 0
        
        for t in range(1, k + 2):
            dp[t] = dp[t - 1].copy()  # 可以不走边
            for u, v, price in flights:
                if dp[t - 1][u] != INF:
                    dp[t][v] = min(dp[t][v], dp[t - 1][u] + price)
        
        return dp[k + 1][dst] if dp[k + 1][dst] != INF else -1
```

**空间优化**（滚动数组）：

```python
class Solution:
    def findCheapestPrice(self, n: int, flights: List[List[int]], src: int, dst: int, k: int) -> int:
        INF = float('inf')
        prev = [INF] * n
        prev[src] = 0
        
        for _ in range(k + 1):
            curr = prev.copy()
            for u, v, price in flights:
                if prev[u] != INF:
                    curr[v] = min(curr[v], prev[u] + price)
            prev = curr
        
        return prev[dst] if prev[dst] != INF else -1
```

## 算法对比

| 算法 | 时间复杂度 | 空间复杂度 | 特点 |
|-----|-----------|-----------|------|
| Bellman-Ford | O(kE) | O(V) | 最简洁，推荐 |
| BFS | O(kE) | O(V+E) | 直观 |
| Dijkstra 变体 | O(kE log(kV)) | O(kV) | 需要小心状态爆炸 |
| DP | O(kE) | O(V) 或 O(kV) | 等价于 Bellman-Ford |

## 关键点总结

1. 本题的核心约束是**限制边数**（中转次数）
2. **Bellman-Ford** 最适合处理边数限制，松弛 k+1 轮即可
3. **必须使用上一轮的距离值**，避免同一轮内松弛多条边
4. 其他算法需要额外处理"剩余中转次数"这个状态维度
