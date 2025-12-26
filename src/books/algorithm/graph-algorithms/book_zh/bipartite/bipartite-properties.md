# 二分图的判定与性质

## 什么是二分图？

**定义**：二分图（Bipartite Graph）是一个图，其顶点可以分为两个不相交的集合 U 和 V，使得同一集合内的顶点之间没有边。

```
集合 U: {A, B, C}
集合 V: {1, 2, 3}

边: A-1, A-2, B-2, C-3
```

**直观理解**：可以用两种颜色给所有顶点染色，使得相邻顶点颜色不同。

## 核心性质

### 性质1：无奇数环

**定理**：图是二分图 ⟺ 图中不包含奇数长度的环。

**证明**：
- 如果是二分图，任何环都需要在 U 和 V 之间来回跳转，长度必然是偶数
- 如果无奇数环，可以从任意点开始 BFS 染色，相邻节点交替染色

### 性质2：可二着色

**定理**：图是二分图 ⟺ 图是 2-可着色的。

这是判定二分图的核心算法基础。

### 性质3：最大匹配

**König定理**：二分图的最大匹配数 = 最小点覆盖数。

这是解决二分图匹配问题的理论基础。

## 判定算法

### 解法1：BFS 染色

```python
from collections import deque

def isBipartite_bfs(graph):
    """
    BFS 染色判定
    graph: 邻接表，graph[i] = [邻居列表]
    """
    n = len(graph)
    color = [-1] * n  # -1 表示未染色，0 和 1 表示两种颜色
    
    for start in range(n):
        if color[start] != -1:
            continue  # 已访问
        
        # BFS 染色
        queue = deque([start])
        color[start] = 0
        
        while queue:
            node = queue.popleft()
            
            for neighbor in graph[node]:
                if color[neighbor] == -1:
                    # 未染色，染成相反颜色
                    color[neighbor] = 1 - color[node]
                    queue.append(neighbor)
                elif color[neighbor] == color[node]:
                    # 相邻节点同色，不是二分图
                    return False
    
    return True
```

**时间复杂度**：O(V + E)  
**空间复杂度**：O(V)

### 解法2：DFS 染色

```python
def isBipartite_dfs(graph):
    """DFS 染色判定"""
    n = len(graph)
    color = [-1] * n
    
    def dfs(node, c):
        """染色并检查"""
        color[node] = c
        
        for neighbor in graph[node]:
            if color[neighbor] == -1:
                if not dfs(neighbor, 1 - c):
                    return False
            elif color[neighbor] == c:
                return False
        
        return True
    
    for start in range(n):
        if color[start] == -1:
            if not dfs(start, 0):
                return False
    
    return True
```

**时间复杂度**：O(V + E)  
**空间复杂度**：O(V)

## LeetCode 实战

### LC 785. Is Graph Bipartite?

```python
def isBipartite(graph):
    """
    判断是否为二分图
    graph[i] = [j, k, ...] 表示节点 i 的邻居
    """
    n = len(graph)
    color = {}
    
    def dfs(node, c):
        if node in color:
            return color[node] == c
        
        color[node] = c
        
        for neighbor in graph[node]:
            if not dfs(neighbor, 1 - c):
                return False
        
        return True
    
    for i in range(n):
        if i not in color:
            if not dfs(i, 0):
                return False
    
    return True
```

### LC 886. Possible Bipartition

给定一组人和他们的厌恶关系，判断能否将他们分成两组，使得每组内的人互不厌恶。

```python
def possibleBipartition(n, dislikes):
    """
    n: 人数（1 到 n）
    dislikes: [[a, b], ...] 表示 a 和 b 互相厌恶
    """
    # 构建图
    graph = [[] for _ in range(n + 1)]
    for a, b in dislikes:
        graph[a].append(b)
        graph[b].append(a)
    
    # BFS 染色
    color = [-1] * (n + 1)
    
    for start in range(1, n + 1):
        if color[start] != -1:
            continue
        
        queue = deque([start])
        color[start] = 0
        
        while queue:
            node = queue.popleft()
            
            for neighbor in graph[node]:
                if color[neighbor] == -1:
                    color[neighbor] = 1 - color[node]
                    queue.append(neighbor)
                elif color[neighbor] == color[node]:
                    return False
    
    return True
```

## 应用场景

### 场景1：任务分配

将任务分配给两个团队，使得有冲突的任务不在同一团队。

```python
def assign_tasks(n, conflicts):
    """
    n: 任务数量
    conflicts: 冲突的任务对
    返回: (是否可行, 分配方案)
    """
    graph = [[] for _ in range(n)]
    for a, b in conflicts:
        graph[a].append(b)
        graph[b].append(a)
    
    color = [-1] * n
    
    def dfs(node, c):
        color[node] = c
        for neighbor in graph[node]:
            if color[neighbor] == -1:
                if not dfs(neighbor, 1 - c):
                    return False
            elif color[neighbor] == c:
                return False
        return True
    
    for i in range(n):
        if color[i] == -1:
            if not dfs(i, 0):
                return False, []
    
    team1 = [i for i in range(n) if color[i] == 0]
    team2 = [i for i in range(n) if color[i] == 1]
    
    return True, (team1, team2)
```

### 场景2：课程安排

学生选课，某些课程不能同时开设在同一时间段。

```python
def schedule_courses(courses, conflicts):
    """
    courses: 课程列表
    conflicts: 冲突的课程对
    返回: 两个时间段的课程安排
    """
    n = len(courses)
    graph = [[] for _ in range(n)]
    
    for c1, c2 in conflicts:
        i1 = courses.index(c1)
        i2 = courses.index(c2)
        graph[i1].append(i2)
        graph[i2].append(i1)
    
    color = [-1] * n
    
    def bfs(start):
        queue = deque([start])
        color[start] = 0
        
        while queue:
            node = queue.popleft()
            for neighbor in graph[node]:
                if color[neighbor] == -1:
                    color[neighbor] = 1 - color[node]
                    queue.append(neighbor)
                elif color[neighbor] == color[node]:
                    return False
        return True
    
    for i in range(n):
        if color[i] == -1:
            if not bfs(i):
                return None
    
    slot1 = [courses[i] for i in range(n) if color[i] == 0]
    slot2 = [courses[i] for i in range(n) if color[i] == 1]
    
    return (slot1, slot2)
```

## 二分图的性质应用

### 检测奇数环

```python
def has_odd_cycle(graph):
    """检测是否存在奇数环"""
    return not isBipartite(graph)
```

### 最大独立集

在二分图中，最大独立集 = n - 最大匹配数

```python
def max_independent_set_size(graph):
    """
    二分图最大独立集大小
    需要结合最大匹配算法
    """
    n = len(graph)
    max_matching = compute_max_matching(graph)
    return n - max_matching
```

## 扩展：k-分图

判断图是否可以分成 k 组（k-可着色）：

```python
def is_k_partite(graph, k):
    """判断是否为 k-分图"""
    n = len(graph)
    color = [-1] * n
    
    def dfs(node):
        for c in range(k):
            # 尝试染成颜色 c
            valid = True
            for neighbor in graph[node]:
                if color[neighbor] == c:
                    valid = False
                    break
            
            if valid:
                color[node] = c
                
                # 递归染色邻居
                all_colored = True
                for neighbor in graph[node]:
                    if color[neighbor] == -1:
                        if not dfs(neighbor):
                            all_colored = False
                            break
                
                if all_colored:
                    return True
                
                color[node] = -1  # 回溯
        
        return False
    
    for i in range(n):
        if color[i] == -1:
            if not dfs(i):
                return False
    
    return True
```

## 常见错误

### 错误1：忽略连通分量

```python
# 错误：只检查一个连通分量
def isBipartite_wrong(graph):
    color = [-1] * len(graph)
    queue = deque([0])  # 只从 0 开始
    color[0] = 0
    # ...

# 正确：检查所有连通分量
def isBipartite_correct(graph):
    color = [-1] * len(graph)
    for start in range(len(graph)):  # 遍历所有节点
        if color[start] == -1:
            # BFS/DFS
```

### 错误2：未处理自环

```python
# 有自环的图不是二分图
def isBipartite_with_self_loop(graph):
    for i, neighbors in enumerate(graph):
        if i in neighbors:  # 自环
            return False
    
    # 继续正常判定
    return isBipartite_bfs(graph)
```

## 小结

- 二分图：顶点可分为两个不相交集合，边只连接不同集合的顶点
- **核心性质**：无奇数环 ⟺ 2-可着色
- **判定算法**：BFS/DFS 染色，O(V + E)
- **应用**：任务分配、课程安排、匹配问题
- **关键点**：处理所有连通分量，检测染色冲突
