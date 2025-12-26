# 启发式搜索与 A* 算法

A* (A-star) 算法是一种结合了 Dijkstra 和启发式搜索的高效路径查找算法，广泛应用于游戏开发、机器人导航、地图应用等领域。

## 启发式搜索的思想

**盲目搜索**（如 BFS、Dijkstra）：不知道目标在哪，均匀扩展所有方向

**启发式搜索**：利用**启发函数**估计到目标的距离，优先探索更有希望的方向

## A* 算法核心

### 评估函数

A* 使用评估函数 `f(n) = g(n) + h(n)`：

- `g(n)`：从起点到节点 n 的**实际代价**
- `h(n)`：从节点 n 到终点的**估计代价**（启发函数）
- `f(n)`：从起点经过 n 到终点的**预估总代价**

A* 总是选择 f(n) 最小的节点扩展。

### 可采纳性（Admissible）

**定义**：启发函数 h(n) 永远不会高估实际代价，即 h(n) ≤ h*(n)，其中 h*(n) 是真实最短距离。

**重要性**：可采纳的启发函数保证 A* 找到最优解。

**常见可采纳启发函数**：

| 场景 | 启发函数 | 说明 |
|-----|---------|------|
| 网格（四方向） | 曼哈顿距离 | \|x1-x2\| + \|y1-y2\| |
| 网格（八方向） | 切比雪夫距离 | max(\|x1-x2\|, \|y1-y2\|) |
| 网格（任意方向） | 欧几里得距离 | √((x1-x2)² + (y1-y2)²) |

## A* 算法实现

```python
import heapq
from typing import Tuple, Callable, List

def a_star(start: Tuple, goal: Tuple, 
           get_neighbors: Callable, 
           heuristic: Callable) -> Tuple[List, int]:
    """
    A* 算法
    start: 起点
    goal: 终点
    get_neighbors: 函数 (node) -> [(neighbor, cost), ...]
    heuristic: 启发函数 (node, goal) -> estimated_cost
    返回: (路径, 总代价)
    """
    # g_score[node] = 从起点到 node 的实际代价
    g_score = {start: 0}
    
    # f_score[node] = g_score[node] + h(node)
    f_score = {start: heuristic(start, goal)}
    
    # 优先队列：(f_score, node)
    open_set = [(f_score[start], start)]
    
    # 记录路径
    came_from = {}
    
    # 已访问节点
    closed_set = set()
    
    while open_set:
        current_f, current = heapq.heappop(open_set)
        
        if current == goal:
            return reconstruct_path(came_from, current), g_score[current]
        
        if current in closed_set:
            continue
        
        closed_set.add(current)
        
        for neighbor, cost in get_neighbors(current):
            if neighbor in closed_set:
                continue
            
            tentative_g = g_score[current] + cost
            
            if neighbor not in g_score or tentative_g < g_score[neighbor]:
                came_from[neighbor] = current
                g_score[neighbor] = tentative_g
                f_score[neighbor] = tentative_g + heuristic(neighbor, goal)
                heapq.heappush(open_set, (f_score[neighbor], neighbor))
    
    return [], -1  # 无解

def reconstruct_path(came_from, current):
    """重建路径"""
    path = [current]
    while current in came_from:
        current = came_from[current]
        path.append(current)
    return path[::-1]
```

## 网格地图应用

```python
def grid_a_star(grid, start, goal):
    """
    网格地图上的 A*
    grid[i][j] = 0 可通行, 1 障碍物
    """
    m, n = len(grid), len(grid[0])
    
    def heuristic(pos, goal):
        """曼哈顿距离"""
        return abs(pos[0] - goal[0]) + abs(pos[1] - goal[1])
    
    def get_neighbors(pos):
        """四方向邻居"""
        x, y = pos
        neighbors = []
        for dx, dy in [(0,1), (0,-1), (1,0), (-1,0)]:
            nx, ny = x + dx, y + dy
            if 0 <= nx < m and 0 <= ny < n and grid[nx][ny] == 0:
                neighbors.append(((nx, ny), 1))  # 代价为 1
        return neighbors
    
    return a_star(start, goal, get_neighbors, heuristic)
```

### 八方向移动

```python
def get_neighbors_8dir(pos, grid):
    """八方向移动，对角线代价为 √2"""
    m, n = len(grid), len(grid[0])
    x, y = pos
    neighbors = []
    
    # 四方向
    for dx, dy in [(0,1), (0,-1), (1,0), (-1,0)]:
        nx, ny = x + dx, y + dy
        if 0 <= nx < m and 0 <= ny < n and grid[nx][ny] == 0:
            neighbors.append(((nx, ny), 1))
    
    # 对角线
    for dx, dy in [(1,1), (1,-1), (-1,1), (-1,-1)]:
        nx, ny = x + dx, y + dy
        if 0 <= nx < m and 0 <= ny < n and grid[nx][ny] == 0:
            neighbors.append(((nx, ny), 1.414))  # √2 ≈ 1.414
    
    return neighbors
```

## 启发函数的选择

### 1. h(n) = 0：退化为 Dijkstra

```python
def heuristic_zero(node, goal):
    return 0
```

保证最优，但慢。

### 2. h(n) = 真实距离：完美启发

理论最优，但通常无法计算。

### 3. h(n) 太大：快但可能非最优

```python
def heuristic_overestimate(node, goal):
    return manhattan_distance(node, goal) * 2  # 高估
```

更快到达目标，但不保证最优路径。

### 4. 一致性（Consistent）

**定义**：对于任意边 (n, n')，h(n) ≤ cost(n, n') + h(n')

一致性强于可采纳性，保证每个节点只扩展一次。

## A* vs Dijkstra vs BFS

| 算法 | 策略 | 保证最优 | 适用场景 |
|-----|------|---------|---------|
| BFS | 按层次扩展 | ✅ (无权图) | 无权图 |
| Dijkstra | 按实际代价 g(n) | ✅ | 非负权图 |
| A* | 按预估总代价 f(n) | ✅ (h可采纳) | 有明确目标 |

**A* 的优势**：
- 比 Dijkstra 更快（利用启发函数）
- 仍然保证最优（启发函数可采纳时）

## 优化技巧

### 1. Tie-breaking（打破平局）

当 f(n) 相同时，优先选择 h(n) 更小的：

```python
heapq.heappush(open_set, (f_score[neighbor], h_score[neighbor], neighbor))
```

### 2. Jump Point Search (JPS)

网格地图上的 A* 优化，跳过对称路径：

```python
# 在直线方向上快速前进，直到遇到转折点
def jump(x, y, dx, dy, goal, grid):
    """跳点搜索"""
    nx, ny = x + dx, y + dy
    
    if not is_valid(nx, ny, grid):
        return None
    
    if (nx, ny) == goal:
        return (nx, ny)
    
    # 检查是否有强制邻居
    if has_forced_neighbor(nx, ny, dx, dy, grid):
        return (nx, ny)
    
    # 递归跳跃
    return jump(nx, ny, dx, dy, goal, grid)
```

## 实战应用

### LeetCode 1091：二进制矩阵中的最短路径

```python
def shortestPathBinaryMatrix(grid):
    """使用 A* 求最短路径"""
    n = len(grid)
    if grid[0][0] == 1 or grid[n-1][n-1] == 1:
        return -1
    
    start, goal = (0, 0), (n-1, n-1)
    
    def heuristic(pos, goal):
        return max(abs(pos[0] - goal[0]), abs(pos[1] - goal[1]))  # 切比雪夫距离
    
    def get_neighbors(pos):
        x, y = pos
        neighbors = []
        for dx in [-1, 0, 1]:
            for dy in [-1, 0, 1]:
                if dx == 0 and dy == 0:
                    continue
                nx, ny = x + dx, y + dy
                if 0 <= nx < n and 0 <= ny < n and grid[nx][ny] == 0:
                    neighbors.append(((nx, ny), 1))
        return neighbors
    
    path, cost = a_star(start, goal, get_neighbors, heuristic)
    return cost + 1 if path else -1
```

## 小结

- A* 结合了 Dijkstra 和启发式搜索的优点
- 评估函数 f(n) = g(n) + h(n)，优先扩展总代价小的节点
- **可采纳的启发函数**保证找到最优解
- 常用启发函数：曼哈顿距离、欧几里得距离、切比雪夫距离
- A* 比 Dijkstra 快，比贪心算法准
- 广泛应用于游戏、导航、机器人等领域
