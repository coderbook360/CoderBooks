# 二分图与匹配总结

本部分介绍了二分图的判定、性质以及最大匹配问题。二分图是图论中的重要模型，在任务分配、资源调度等领域有广泛应用。

## 核心知识点回顾

### 1. 二分图定义与性质

**定义**：顶点可分为两个不相交集合，同一集合内的顶点之间无边。

**关键性质**：
- ✅ 无奇数环 ⟺ 二分图
- ✅ 2-可着色 ⟺ 二分图
- ✅ König定理：最大匹配 = 最小点覆盖

### 2. 判定算法

| 方法 | 时间复杂度 | 空间复杂度 | 适用场景 |
|-----|----------|-----------|---------|
| BFS 染色 | O(V + E) | O(V) | 稀疏图 |
| DFS 染色 | O(V + E) | O(V) | 密集图 |
| 并查集 | O(V + E × α(V)) | O(V) | 动态加边 |

**判定模板**：
```python
def is_bipartite(graph):
    n = len(graph)
    color = [-1] * n
    
    for start in range(n):
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

### 3. 最大匹配

**匈牙利算法**：通过增广路径求最大匹配

```python
def max_matching(graph):
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
    
    matching = 0
    for u in range(n):
        if dfs(u, set()):
            matching += 1
    
    return matching
```

**时间复杂度**：O(V × E)

**优化版本**：Hopcroft-Karp，O(E × √V)

## 算法选择指南

### 什么时候用二分图判定？

**识别特征**：
- 需要将元素分成两组
- 组内元素之间有某种"不兼容"关系
- 问题可转化为染色问题

**典型场景**：
- 任务分配（互斥任务）
- 课程调度（时间冲突）
- 团队分组（人员冲突）

### 什么时候用匹配算法？

**识别特征**：
- 一对一分配问题
- 左右两侧有不同类型的元素
- 需要最大化/最小化某个指标

**典型场景**：
- 工人-任务分配
- 学生-导师匹配
- 资源-需求匹配

## 经典问题类型

### 类型1：判定二分图

| LeetCode | 题目 | 难度 | 核心技术 |
|---------|------|-----|---------|
| 785 | Is Graph Bipartite? | 中等 | BFS/DFS 染色 |
| 886 | Possible Bipartition | 中等 | BFS/DFS 染色 |

### 类型2：最大匹配

| 应用 | 问题 | 算法 |
|-----|------|------|
| 任务分配 | 工人-任务匹配 | 匈牙利算法 |
| 职位招聘 | 应聘者-职位匹配 | 匈牙利算法 |
| 约会匹配 | 男女配对 | 匈牙利算法 |

### 类型3：带权匹配

| LeetCode | 题目 | 难度 | 核心技术 |
|---------|------|-----|---------|
| 1947 | Maximum Compatibility Score | 困难 | 状态压缩DP |
| - | 最大权匹配 | 困难 | Kuhn-Munkres |

## 理论知识

### König定理

**定理**：二分图的最大匹配数 = 最小点覆盖数

**应用**：
- 最小点覆盖：覆盖所有边的最小顶点集
- 最大独立集：不相邻的最大顶点集
- 关系：最大独立集 = n - 最小点覆盖

### Hall定理（婚配定理）

**定理**：二分图有完美匹配 ⟺ 对于左侧任意子集 S，其邻居集合的大小 ≥ |S|

**应用**：判断是否存在完美匹配

## 实战技巧

### 技巧1：构图

```python
# 从问题描述构建二分图
def build_graph(conflicts):
    """将冲突关系转为图"""
    graph = defaultdict(list)
    for a, b in conflicts:
        graph[a].append(b)
        graph[b].append(a)
    return graph
```

### 技巧2：多连通分量

```python
# 处理多个连通分量
for start in range(n):
    if not visited[start]:
        # 处理新的连通分量
        bfs(start)
```

### 技巧3：提前终止

```python
# 发现冲突立即返回
if color[neighbor] == color[node]:
    return False  # 不是二分图
```

## 扩展知识

### 1. 一般图匹配

**Blossom 算法**：求一般图（非二分图）的最大匹配

**时间复杂度**：O(V^2 × E)

### 2. 在线匹配

**问题**：顶点/边动态加入，维护最大匹配

**方法**：动态匈牙利算法

### 3. 近似算法

**问题**：NP困难的匹配问题

**方法**：贪心、局部搜索、近似比

## 常见错误与陷阱

### 陷阱1：忽略孤立节点

```python
# 错误：只从一个节点开始
dfs(0)

# 正确：遍历所有节点
for i in range(n):
    if not visited[i]:
        dfs(i)
```

### 陷阱2：单向边

```python
# 错误：无向图建成有向图
graph[a].append(b)

# 正确：双向边
graph[a].append(b)
graph[b].append(a)
```

### 陷阱3：索引问题

```python
# 注意：节点编号从 0 还是 1 开始
# LeetCode 有些题目从 1 开始
color = [-1] * (n + 1)  # n+1 而不是 n
```

## 性能优化

### 空间优化

```python
# 用位图代替数组
visited = 0  # 位向量

def set_visited(i):
    visited |= (1 << i)

def is_visited(i):
    return (visited >> i) & 1
```

### 时间优化

```python
# 预计算邻接关系
adjacency_set = [set(neighbors) for neighbors in graph]

# O(1) 查询是否相邻
if neighbor in adjacency_set[node]:
    ...
```

## 学习路径建议

### 初学者

1. **掌握判定**：理解二分图定义，学会 BFS/DFS 染色
2. **基础匹配**：实现匈牙利算法
3. **刷题巩固**：LC 785, 886

### 进阶

1. **优化算法**：学习 Hopcroft-Karp
2. **理论深入**：König定理、Hall定理
3. **带权匹配**：状态压缩DP、Kuhn-Munkres
4. **高级题目**：LC 1947

### 专家

1. **一般图匹配**：Blossom 算法
2. **在线算法**：动态维护匹配
3. **近似算法**：NP困难问题的近似解
4. **研究论文**：最新匹配算法

## 应用领域

- **推荐系统**：用户-物品匹配
- **任务调度**：资源-任务分配
- **网络流**：二分图匹配转化为最大流
- **组合优化**：匹配是很多问题的子问题

## 小结

- 二分图：顶点可二分，无奇数环，2-可着色
- **判定**：BFS/DFS 染色，O(V + E)
- **匹配**：匈牙利算法，O(V × E)
- **应用**：任务分配、资源调度、约会匹配
- **扩展**：带权匹配、一般图匹配、在线匹配
- **关键**：理解增广路径、掌握染色技巧

**核心思想**：将复杂的分配问题转化为图论模型，用成熟算法高效求解。
