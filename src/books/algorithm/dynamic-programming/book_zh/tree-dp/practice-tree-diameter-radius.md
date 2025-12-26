# 树的直径与半径

## 问题描述

> 给定一棵树，计算树的直径和半径。
> - **直径**：树中任意两节点之间的最长路径
> - **半径**：从某个节点到所有其他节点的最大距离的最小值

**示例**：
```
输入：
n = 6
edges = [[0,1], [1,2], [1,3], [3,4], [3,5]]

         0
         |
         1
        / \
       2   3
          / \
         4   5

输出：
直径: 4 (路径 2-1-3-4 或 2-1-3-5)
半径: 2 (从节点 1 或 3 出发)
```

## 解法一：直径（两次BFS）

```python
from collections import deque

def treeDiameter(n, edges):
    """
    两次 BFS 找直径
    """
    graph = [[] for _ in range(n)]
    for u, v in edges:
        graph[u].append(v)
        graph[v].append(u)
    
    def bfs(start):
        visited = [-1] * n
        queue = deque([start])
        visited[start] = 0
        farthest = (start, 0)
        
        while queue:
            u = queue.popleft()
            for v in graph[u]:
                if visited[v] == -1:
                    visited[v] = visited[u] + 1
                    queue.append(v)
                    if visited[v] > farthest[1]:
                        farthest = (v, visited[v])
        
        return farthest, visited
    
    # 第一次 BFS：找一个端点
    (end1, _), _ = bfs(0)
    
    # 第二次 BFS：找另一个端点
    (end2, diameter), dist_from_end1 = bfs(end1)
    
    return diameter, (end1, end2), dist_from_end1

# 测试
edges = [[0,1], [1,2], [1,3], [3,4], [3,5]]
diameter, (end1, end2), _ = treeDiameter(6, edges)
print(f"直径: {diameter}, 端点: {end1} 和 {end2}")  # 直径: 4
```

## 解法二：半径（换根DP）

```python
def treeRadius(n, edges):
    """
    树的半径 = 直径的一半（向上取整）
    """
    diameter, _, _ = treeDiameter(n, edges)
    return (diameter + 1) // 2

# 或者直接找中心
def treeCenter(n, edges):
    """
    树的中心（半径最小的节点）
    """
    graph = [[] for _ in range(n)]
    for u, v in edges:
        graph[u].append(v)
        graph[v].append(u)
    
    down = [0] * n  # 向下最大距离
    up = [0] * n    # 向上最大距离
    
    def dfs1(u, parent):
        for v in graph[u]:
            if v == parent:
                continue
            dfs1(v, u)
            down[u] = max(down[u], down[v] + 1)
    
    def dfs2(u, parent):
        # 找到最大和次大的向下距离
        dists = [down[v] for v in graph[u] if v != parent]
        dists.sort(reverse=True)
        
        for v in graph[u]:
            if v == parent:
                continue
            
            # v 的向上距离
            if down[v] == dists[0] - 1 if dists else -1:
                # v 是最大分支，使用次大
                up[v] = max(up[u] + 1, (dists[1] if len(dists) > 1 else -1) + 2)
            else:
                up[v] = max(up[u] + 1, dists[0] + 2 if dists else 0)
            
            dfs2(v, u)
    
    dfs1(0, -1)
    dfs2(0, -1)
    
    # 每个节点的最大距离（半径候选）
    radius_candidates = [max(down[i], up[i]) for i in range(n)]
    min_radius = min(radius_candidates)
    
    return min_radius, [i for i in range(n) if radius_candidates[i] == min_radius]

# 测试
edges = [[0,1], [1,2], [1,3], [3,4], [3,5]]
radius, centers = treeCenter(6, edges)
print(f"半径: {radius}, 中心: {centers}")  # 半径: 2, 中心: [1, 3]
```

## 直径和半径的关系

**定理**：
- 半径 = ⌈直径/2⌉
- 树的中心在直径的中点
- 如果直径是偶数，有 1 个中心；如果是奇数，有 2 个中心

```python
def diameter_and_radius(n, edges):
    """
    同时计算直径和半径
    """
    diameter, (end1, end2), dist_from_end1 = treeDiameter(n, edges)
    radius = (diameter + 1) // 2
    
    # 找到中心（直径路径的中点）
    graph = [[] for _ in range(n)]
    for u, v in edges:
        graph[u].append(v)
        graph[v].append(u)
    
    # BFS 重建从 end1 到 end2 的路径
    parent = [-1] * n
    queue = deque([end1])
    visited = {end1}
    
    while queue:
        u = queue.popleft()
        if u == end2:
            break
        for v in graph[u]:
            if v not in visited:
                visited.add(v)
                parent[v] = u
                queue.append(v)
    
    # 重建路径
    path = []
    cur = end2
    while cur != -1:
        path.append(cur)
        cur = parent[cur]
    
    # 中心在路径中点
    mid = len(path) // 2
    centers = [path[mid]] if len(path) % 2 == 1 else [path[mid-1], path[mid]]
    
    return {
        'diameter': diameter,
        'radius': radius,
        'centers': centers,
        'diameter_path': path[::-1]
    }

# 测试
edges = [[0,1], [1,2], [1,3], [3,4], [3,5]]
result = diameter_and_radius(6, edges)
print(result)
```

## 小结

- **直径**：两次 BFS 或 DFS，复杂度 O(n)
- **半径**：换根 DP 或直径/2，复杂度 O(n)
- **关系**：半径 = ⌈直径/2⌉，中心在直径中点
