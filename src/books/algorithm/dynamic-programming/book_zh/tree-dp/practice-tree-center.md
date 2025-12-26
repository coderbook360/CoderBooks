# 树的中心

## 问题描述

> 给定一棵树，找到树的中心。树的中心定义为：所有节点到该节点的最大距离最小的节点。

**示例**：
```
输入：
n = 6
edges = [[0,1], [1,2], [1,3], [3,4], [3,5]]

输出：[1] 或 [3]
解释：节点 1 的最大距离是 2，节点 3 的最大距离也是 2
```

**性质**：
- 树的中心最多有 2 个（相邻）
- 如果有 2 个中心，它们一定相邻

## 解法一：两次 DFS（换根 DP）

```python
def treeCenter(n, edges):
    graph = [[] for _ in range(n)]
    for u, v in edges:
        graph[u].append(v)
        graph[v].append(u)
    
    # dp_down[u] = 从 u 向下的最大距离
    # dp_up[u] = 从 u 向上的最大距离
    dp_down = [0] * n
    dp_up = [0] * n
    
    # 第一次 DFS：计算向下距离
    def dfs1(u, parent):
        for v in graph[u]:
            if v == parent:
                continue
            dfs1(v, u)
            dp_down[u] = max(dp_down[u], dp_down[v] + 1)
    
    # 第二次 DFS：计算向上距离
    def dfs2(u, parent):
        # 找到最大和次大的向下距离
        max1 = max2 = -1
        for v in graph[u]:
            if v == parent:
                continue
            if dp_down[v] > max1:
                max2 = max1
                max1 = dp_down[v]
            elif dp_down[v] > max2:
                max2 = dp_down[v]
        
        for v in graph[u]:
            if v == parent:
                continue
            
            # 计算 v 的向上距离
            if dp_down[v] == max1:
                dp_up[v] = max(dp_up[u], max2 + 1) + 1
            else:
                dp_up[v] = max(dp_up[u], max1 + 1) + 1
            
            dfs2(v, u)
    
    dfs1(0, -1)
    dfs2(0, -1)
    
    # 找到最大距离最小的节点
    max_dist = [max(dp_down[i], dp_up[i]) for i in range(n)]
    min_max_dist = min(max_dist)
    
    return [i for i in range(n) if max_dist[i] == min_max_dist]

# 测试
edges = [[0,1], [1,2], [1,3], [3,4], [3,5]]
print(treeCenter(6, edges))  # [1, 3]
```

**复杂度**：O(n)

## 解法二：BFS 找最长路径

```python
from collections import deque

def treeCenter_bfs(n, edges):
    """
    两次 BFS 找到直径的端点，中心在直径中点
    """
    graph = [[] for _ in range(n)]
    for u, v in edges:
        graph[u].append(v)
        graph[v].append(u)
    
    def bfs(start):
        """返回距离 start 最远的节点和距离"""
        visited = [False] * n
        queue = deque([(start, 0)])
        visited[start] = True
        farthest = (start, 0)
        
        while queue:
            u, dist = queue.popleft()
            if dist > farthest[1]:
                farthest = (u, dist)
            
            for v in graph[u]:
                if not visited[v]:
                    visited[v] = True
                    queue.append((v, dist + 1))
        
        return farthest
    
    # 第一次 BFS：找到一个端点
    end1, _ = bfs(0)
    
    # 第二次 BFS：找到另一个端点
    end2, diameter = bfs(end1)
    
    # 找到从 end1 到 end2 的路径
    parent = [-1] * n
    visited = [False] * n
    queue = deque([end1])
    visited[end1] = True
    
    while queue:
        u = queue.popleft()
        for v in graph[u]:
            if not visited[v]:
                visited[v] = True
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
    if len(path) % 2 == 0:
        return [path[mid-1], path[mid]]
    else:
        return [path[mid]]

# 测试
edges = [[0,1], [1,2], [1,3], [3,4], [3,5]]
print(treeCenter_bfs(6, edges))  # [1] 或 [1, 3]
```

## 小结

- **换根 DP**：两次 DFS，第一次向下，第二次向上
- **BFS 方法**：找直径端点，中心在中点
- **应用**：网络中心、最优服务器位置
