# 最大匹配：匈牙利算法

## 什么是最大匹配？

**匹配（Matching）**：图中一组边的集合，其中任意两条边都不共享顶点。

**最大匹配（Maximum Matching）**：边数最多的匹配。

**完美匹配（Perfect Matching）**：每个顶点都被匹配的匹配。

```
二分图示例:
U: {A, B, C}
V: {1, 2, 3}

边: A-1, A-2, B-2, C-3

一个最大匹配: {A-1, B-2, C-3}（完美匹配）
```

## 匈牙利算法原理

### 核心思想

通过寻找**增广路径**（Augmenting Path）来增加匹配数。

**增广路径**：
- 起点和终点都是未匹配顶点
- 路径上的边交替为"非匹配边"和"匹配边"
- 找到增广路径后，交换路径上边的匹配状态，匹配数 +1

### 算法流程

1. 初始化：所有顶点未匹配
2. 遍历左侧每个未匹配顶点
3. 尝试找一条增广路径（DFS）
4. 找到则更新匹配，匹配数 +1
5. 重复直到无增广路径

## 算法实现

### 基础版本

```python
def max_matching(graph):
    """
    匈牙利算法求最大匹配
    graph: 二分图邻接表，graph[u] = [v1, v2, ...]
           u 在左侧集合，v 在右侧集合
    返回: 匹配数
    """
    n = len(graph)  # 左侧顶点数
    m = max(max(neighbors, default=0) for neighbors in graph) + 1  # 右侧顶点数
    
    match = [-1] * m  # match[v] = u 表示右侧 v 匹配到左侧 u
    
    def dfs(u, visited):
        """
        尝试为 u 找一条增广路径
        visited: 本轮DFS中访问过的右侧顶点
        """
        for v in graph[u]:
            if v in visited:
                continue
            
            visited.add(v)
            
            # v 未匹配，或者 v 的匹配对象能找到新的匹配
            if match[v] == -1 or dfs(match[v], visited):
                match[v] = u
                return True
        
        return False
    
    matching_count = 0
    
    for u in range(n):
        if dfs(u, set()):
            matching_count += 1
    
    return matching_count
```

**时间复杂度**：O(V × E)  
**空间复杂度**：O(V)

### 优化版本（记录匹配）

```python
def max_matching_with_pairs(graph):
    """
    返回最大匹配数和匹配对
    """
    n = len(graph)
    m = max(max(neighbors, default=0) for neighbors in graph) + 1
    
    match_right = [-1] * m  # 右侧的匹配
    match_left = [-1] * n   # 左侧的匹配
    
    def dfs(u, visited):
        for v in graph[u]:
            if v in visited:
                continue
            
            visited.add(v)
            
            if match_right[v] == -1 or dfs(match_right[v], visited):
                match_right[v] = u
                match_left[u] = v
                return True
        
        return False
    
    matching_count = 0
    
    for u in range(n):
        if dfs(u, set()):
            matching_count += 1
    
    # 构建匹配对
    pairs = [(u, match_left[u]) for u in range(n) if match_left[u] != -1]
    
    return matching_count, pairs
```

## LeetCode 实战

### LC 1615. Maximal Network Rank (变体)

虽然不是直接的二分匹配，但可以转化。

### 经典问题：最大任务分配

```python
def max_task_assignment(workers, tasks, can_do):
    """
    workers: 工人列表
    tasks: 任务列表
    can_do[i][j]: 工人 i 能否完成任务 j
    返回: 最大分配数
    """
    n = len(workers)
    m = len(tasks)
    
    # 构建二分图
    graph = [[] for _ in range(n)]
    for i in range(n):
        for j in range(m):
            if can_do[i][j]:
                graph[i].append(j)
    
    return max_matching(graph)
```

### 问题：分配作业给学生

```python
def assign_homework(students, homeworks, preferences):
    """
    students: 学生列表
    homeworks: 作业列表
    preferences[i]: 学生 i 愿意做的作业列表
    返回: (最大分配数, 分配方案)
    """
    n = len(students)
    graph = preferences  # 每个学生的偏好列表
    
    count, pairs = max_matching_with_pairs(graph)
    
    assignment = {students[u]: homeworks[v] for u, v in pairs}
    
    return count, assignment
```

## 应用场景

### 场景1：约会匹配

```python
def dating_match(boys, girls, compatibility):
    """
    boys: 男生列表
    girls: 女生列表
    compatibility[i][j]: 男生 i 和女生 j 是否合适
    返回: 最大匹配对数
    """
    n = len(boys)
    m = len(girls)
    
    graph = [[] for _ in range(n)]
    for i in range(n):
        for j in range(m):
            if compatibility[i][j]:
                graph[i].append(j)
    
    count, pairs = max_matching_with_pairs(graph)
    
    matches = [(boys[u], girls[v]) for u, v in pairs]
    
    return count, matches
```

### 场景2：职位招聘

```python
def job_hiring(applicants, jobs, qualifications):
    """
    applicants: 应聘者
    jobs: 职位
    qualifications[i]: 应聘者 i 胜任的职位列表
    """
    graph = qualifications
    count, pairs = max_matching_with_pairs(graph)
    
    hires = {applicants[u]: jobs[v] for u, v in pairs}
    
    return count, hires
```

## 算法优化

### 优化1：Hopcroft-Karp 算法

更快的算法，时间复杂度 O(E × √V)：

```python
from collections import deque

def hopcroft_karp(graph, n, m):
    """
    Hopcroft-Karp 算法
    n: 左侧顶点数
    m: 右侧顶点数
    """
    match_left = [-1] * n
    match_right = [-1] * m
    
    def bfs():
        """构建层次图"""
        queue = deque()
        dist = [-1] * n
        
        for u in range(n):
            if match_left[u] == -1:
                dist[u] = 0
                queue.append(u)
        
        found = False
        
        while queue:
            u = queue.popleft()
            
            for v in graph[u]:
                if match_right[v] == -1:
                    found = True
                else:
                    next_u = match_right[v]
                    if dist[next_u] == -1:
                        dist[next_u] = dist[u] + 1
                        queue.append(next_u)
        
        return found, dist
    
    def dfs(u, dist):
        """在层次图中找增广路径"""
        for v in graph[u]:
            if match_right[v] == -1:
                match_left[u] = v
                match_right[v] = u
                return True
            
            next_u = match_right[v]
            if dist[next_u] == dist[u] + 1:
                if dfs(next_u, dist):
                    match_left[u] = v
                    match_right[v] = u
                    return True
        
        dist[u] = -1
        return False
    
    matching = 0
    
    while True:
        found, dist = bfs()
        if not found:
            break
        
        for u in range(n):
            if match_left[u] == -1:
                if dfs(u, dist):
                    matching += 1
    
    return matching
```

**时间复杂度**：O(E × √V)

### 优化2：提前终止

```python
def max_matching_early_stop(graph, target):
    """
    当匹配数达到目标时提前终止
    """
    n = len(graph)
    m = max(max(neighbors, default=0) for neighbors in graph) + 1
    
    match = [-1] * m
    
    def dfs(u, visited):
        for v in graph[u]:
            if v in visited:
                continue
            visited.add(v)
            
            if match[v] == -1 or dfs(match[v], visited):
                match[v] = u
                return True
        
        return False
    
    matching_count = 0
    
    for u in range(n):
        if dfs(u, set()):
            matching_count += 1
            if matching_count >= target:
                return matching_count
    
    return matching_count
```

## König定理应用

**König定理**：二分图的最大匹配数 = 最小点覆盖数。

### 最小点覆盖

```python
def min_vertex_cover(graph):
    """
    求最小点覆盖（覆盖所有边的最小顶点集）
    """
    # 1. 求最大匹配
    count, pairs = max_matching_with_pairs(graph)
    
    # 2. König定理：最小点覆盖数 = 最大匹配数
    return count
```

### 最大独立集

```python
def max_independent_set(graph, n, m):
    """
    求最大独立集（不相邻的最大顶点集）
    """
    max_match = max_matching(graph)
    
    # 最大独立集 = 总顶点数 - 最大匹配数
    return n + m - max_match
```

## 小结

- 匈牙利算法：通过增广路径求最大匹配
- **时间复杂度**：O(V × E)，Hopcroft-Karp 为 O(E × √V)
- **核心**：DFS 寻找增广路径
- **应用**：任务分配、职位招聘、婚配问题
- **扩展**：König定理连接匹配与覆盖
