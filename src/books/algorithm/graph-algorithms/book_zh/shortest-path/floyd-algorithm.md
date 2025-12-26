# Floyd 算法详解

Floyd-Warshall 算法（简称 Floyd 算法）用于求解**全源最短路径**问题：计算图中任意两点之间的最短路径。

## 核心思想

Floyd 算法基于**动态规划**：

- 定义 `dp[k][i][j]` 为从 i 到 j、只允许经过前 k 个顶点作为中间节点的最短路径长度
- 状态转移：`dp[k][i][j] = min(dp[k-1][i][j], dp[k-1][i][k] + dp[k-1][k][j])`
- 最终答案：`dp[V][i][j]`

**通俗理解**：考虑是否将顶点 k 作为 i 到 j 路径的中间节点。

## 空间优化

观察状态转移方程，`dp[k]` 只依赖 `dp[k-1]`，可以压缩到二维：

```python
dp[i][j] = min(dp[i][j], dp[i][k] + dp[k][j])
```

这是 Floyd 算法最经典的形式。

## 代码实现

### 基础版

```python
def floyd_warshall(n, graph):
    """
    Floyd-Warshall 算法
    n: 顶点数
    graph: 邻接矩阵，graph[i][j] 为边权，无边用 inf，i==j 时为 0
    返回：距离矩阵
    """
    INF = float('inf')
    
    # 初始化距离矩阵
    dist = [[INF] * n for _ in range(n)]
    for i in range(n):
        dist[i][i] = 0
    for i in range(n):
        for j in range(n):
            if graph[i][j] != INF:
                dist[i][j] = graph[i][j]
    
    # Floyd 三重循环（注意 k 在最外层）
    for k in range(n):
        for i in range(n):
            for j in range(n):
                if dist[i][k] != INF and dist[k][j] != INF:
                    dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j])
    
    return dist
```

### 记录路径版

```python
def floyd_with_path(n, graph):
    """返回距离矩阵和路径矩阵"""
    INF = float('inf')
    
    dist = [[INF] * n for _ in range(n)]
    next_node = [[-1] * n for _ in range(n)]  # next_node[i][j] 表示从 i 到 j 的下一跳
    
    for i in range(n):
        dist[i][i] = 0
    for i in range(n):
        for j in range(n):
            if graph[i][j] != INF and i != j:
                dist[i][j] = graph[i][j]
                next_node[i][j] = j
    
    for k in range(n):
        for i in range(n):
            for j in range(n):
                if dist[i][k] != INF and dist[k][j] != INF:
                    if dist[i][k] + dist[k][j] < dist[i][j]:
                        dist[i][j] = dist[i][k] + dist[k][j]
                        next_node[i][j] = next_node[i][k]
    
    return dist, next_node

def reconstruct_path(next_node, start, end):
    """根据 next_node 矩阵重建路径"""
    if next_node[start][end] == -1:
        return []
    
    path = [start]
    current = start
    while current != end:
        current = next_node[current][end]
        if current == -1:
            return []
        path.append(current)
    
    return path
```

## 为什么 k 必须在最外层？

**错误写法**：
```python
for i in range(n):
    for j in range(n):
        for k in range(n):  # 错误！k 应该在最外层
            dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j])
```

**问题**：当计算 `dist[i][j]` 时，可能使用尚未通过所有中间节点更新的 `dist[i][k]` 或 `dist[k][j]`。

**正确理解**：
- 外层 k 循环代表"阶段"
- 第 k 阶段：考虑将顶点 k 加入可用中间节点集合
- 必须先完成第 k-1 阶段，才能正确计算第 k 阶段

## 检测负环

```python
def floyd_detect_negative_cycle(n, graph):
    """Floyd 同时检测负环"""
    dist = floyd_warshall(n, graph)
    
    # 检查对角线是否有负值
    for i in range(n):
        if dist[i][i] < 0:
            return True, dist
    
    return False, dist
```

**原理**：如果存在负环，从某个顶点出发经过负环再回到自身的距离为负。

## 传递闭包

Floyd 算法的变体可以求解**传递闭包**（reachability）：

```python
def transitive_closure(n, graph):
    """
    计算传递闭包
    reach[i][j] = True 表示从 i 可达 j
    """
    reach = [[False] * n for _ in range(n)]
    
    for i in range(n):
        reach[i][i] = True
    for i in range(n):
        for j in range(n):
            if graph[i][j] != float('inf'):
                reach[i][j] = True
    
    for k in range(n):
        for i in range(n):
            for j in range(n):
                reach[i][j] = reach[i][j] or (reach[i][k] and reach[k][j])
    
    return reach
```

## 时间与空间复杂度

- **时间复杂度**：O(V³)
- **空间复杂度**：O(V²)

对于稠密图（E ≈ V²），Floyd 与 V 次 Dijkstra（O(V³ log V)）相比更优。
对于稀疏图，使用 Johnson 算法（V 次 Dijkstra + 一次 Bellman-Ford）更高效。

## 应用场景

1. **小规模全源最短路径**：顶点数较少（几百以内）
2. **动态图查询**：预处理后 O(1) 查询任意两点距离
3. **传递闭包**：判断可达性
4. **最小环检测**：检测图中的最小环长度

### 求最小环

```python
def minimum_cycle(n, graph):
    """求图中的最小环长度"""
    INF = float('inf')
    dist = [row[:] for row in graph]  # 复制原图
    min_cycle = INF
    
    for k in range(n):
        # 在更新前，检查经过 k 的环
        for i in range(k):
            for j in range(i + 1, k):
                if dist[i][j] != INF and graph[j][k] != INF and graph[k][i] != INF:
                    min_cycle = min(min_cycle, dist[i][j] + graph[j][k] + graph[k][i])
        
        # 标准 Floyd 更新
        for i in range(n):
            for j in range(n):
                if dist[i][k] != INF and dist[k][j] != INF:
                    dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j])
    
    return min_cycle if min_cycle != INF else -1
```

## 小结

- Floyd 算法求解全源最短路径，时间复杂度 O(V³)
- 核心是三重循环，**k 必须在最外层**
- 可以处理负权边，通过检查对角线检测负环
- 适用于小规模图和需要查询任意两点距离的场景
- 变体可用于传递闭包、最小环检测等问题
