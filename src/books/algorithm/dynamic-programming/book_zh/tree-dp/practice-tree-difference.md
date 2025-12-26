# 子树差分与树上前缀和

## 问题描述

> 给定一棵树和若干操作：
> 1. 给从 u 到 v 的路径上所有节点 +1
> 2. 查询某个节点的值

**示例**：
```
输入：
n = 5
edges = [[0,1], [0,2], [1,3], [1,4]]
operations = [
    ('add', 3, 4),  # 路径 3-1-4 所有节点 +1
    ('query', 1)
]

输出：2
解释：节点 1 在路径上，被加了 1 次
```

## 解法：树上差分

```python
class TreeDifference:
    def __init__(self, n, edges):
        self.n = n
        self.graph = [[] for _ in range(n)]
        for u, v in edges:
            self.graph[u].append(v)
            self.graph[v].append(u)
        
        # 预处理：LCA
        self.depth = [0] * n
        self.parent = [[-1] * 20 for _ in range(n)]
        self.dfs(0, -1)
        
        # 差分数组
        self.diff = [0] * n
    
    def dfs(self, u, p):
        self.parent[u][0] = p
        for i in range(1, 20):
            if self.parent[u][i-1] != -1:
                self.parent[u][i] = self.parent[self.parent[u][i-1]][i-1]
        
        for v in self.graph[u]:
            if v != p:
                self.depth[v] = self.depth[u] + 1
                self.dfs(v, u)
    
    def lca(self, u, v):
        if self.depth[u] < self.depth[v]:
            u, v = v, u
        
        # u 跳到与 v 同一深度
        diff = self.depth[u] - self.depth[v]
        for i in range(20):
            if (diff >> i) & 1:
                u = self.parent[u][i]
        
        if u == v:
            return u
        
        # 同时向上跳
        for i in range(19, -1, -1):
            if self.parent[u][i] != self.parent[v][i]:
                u = self.parent[u][i]
                v = self.parent[v][i]
        
        return self.parent[u][0]
    
    def add_path(self, u, v):
        """路径 u-v 上所有节点 +1"""
        l = self.lca(u, v)
        self.diff[u] += 1
        self.diff[v] += 1
        self.diff[l] -= 1
        if self.parent[l][0] != -1:
            self.diff[self.parent[l][0]] -= 1
    
    def query(self):
        """计算所有节点的实际值"""
        result = [0] * self.n
        
        def dfs(u, p):
            result[u] = self.diff[u]
            for v in self.graph[u]:
                if v != p:
                    dfs(v, u)
                    result[u] += result[v]
        
        dfs(0, -1)
        return result

# 测试
edges = [[0,1], [0,2], [1,3], [1,4]]
tree = TreeDifference(5, edges)
tree.add_path(3, 4)
values = tree.query()
print(values[1])  # 2
```

## 树上前缀和

```python
class TreePrefixSum:
    def __init__(self, n, edges, values):
        self.n = n
        self.values = values
        self.graph = [[] for _ in range(n)]
        for u, v in edges:
            self.graph[u].append(v)
            self.graph[v].append(u)
        
        # 预处理前缀和
        self.prefix = [0] * n
        self.dfs_prefix(0, -1, 0)
    
    def dfs_prefix(self, u, parent, sum_so_far):
        self.prefix[u] = sum_so_far + self.values[u]
        for v in self.graph[u]:
            if v != parent:
                self.dfs_prefix(v, u, self.prefix[u])
    
    def path_sum(self, u, v):
        """计算路径 u-v 的权重和"""
        # 需要 LCA...
        pass

# 简化版：只支持根到节点的路径
def tree_prefix_sum_simple(n, edges, values):
    graph = [[] for _ in range(n)]
    for u, v in edges:
        graph[u].append(v)
        graph[v].append(u)
    
    prefix = [0] * n
    
    def dfs(u, parent):
        prefix[u] = values[u]
        if parent != -1:
            prefix[u] += prefix[parent]
        
        for v in graph[u]:
            if v != parent:
                dfs(v, u)
    
    dfs(0, -1)
    return prefix

# 测试
edges = [[0,1], [0,2], [1,3], [1,4]]
values = [1, 2, 3, 4, 5]
prefix = tree_prefix_sum_simple(5, edges, values)
print(prefix)  # [1, 3, 4, 7, 8]
```

## 应用：树上区间修改

```python
def tree_range_update(n, edges, updates):
    """
    updates: [(u, v, delta)]  # 路径 u-v 上所有节点 +delta
    """
    tree = TreeDifference(n, edges)
    
    for u, v, delta in updates:
        for _ in range(delta):
            tree.add_path(u, v)
    
    return tree.query()

# 测试
edges = [[0,1], [0,2], [1,3], [1,4]]
updates = [(3, 4, 2), (0, 2, 1)]
result = tree_range_update(5, edges, updates)
print(result)
```

## 小结

- **树上差分**：O(log n) 修改，O(n) 查询所有
- **树上前缀和**：O(1) 查询根到节点的路径和
- **应用**：路径修改、子树修改、路径查询
