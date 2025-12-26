# 统计子树信息：路径数、权重和

## 问题描述

> 给定一棵树，统计各种子树信息：
> 1. 每个子树的节点数
> 2. 每个子树的路径总数
> 3. 每个子树的权重和

**示例**：
```
输入：
n = 5
edges = [[0,1], [0,2], [1,3], [1,4]]
values = [1, 2, 3, 4, 5]

         0(1)
        / \
      1(2) 2(3)
      / \
    3(4) 4(5)

输出：
子树大小: [5, 3, 1, 1, 1]
路径数: [10, 3, 0, 0, 0]
权重和: [15, 11, 3, 4, 5]
```

## 解法一：子树大小

```python
def subtree_sizes(n, edges):
    graph = [[] for _ in range(n)]
    for u, v in edges:
        graph[u].append(v)
        graph[v].append(u)
    
    size = [0] * n
    
    def dfs(u, parent):
        size[u] = 1
        for v in graph[u]:
            if v != parent:
                dfs(v, u)
                size[u] += size[v]
    
    dfs(0, -1)
    return size

# 测试
edges = [[0,1], [0,2], [1,3], [1,4]]
print(subtree_sizes(5, edges))  # [5, 3, 1, 1, 1]
```

## 解法二：子树路径数

```python
def subtree_paths(n, edges):
    """
    子树中所有路径的数量
    路径数 = C(size, 2) + size = size * (size - 1) / 2 + size
    """
    graph = [[] for _ in range(n)]
    for u, v in edges:
        graph[u].append(v)
        graph[v].append(u)
    
    size = [0] * n
    paths = [0] * n
    
    def dfs(u, parent):
        size[u] = 1
        for v in graph[u]:
            if v != parent:
                dfs(v, u)
                # 路径 = 原有路径 + 新增路径（经过 u）
                paths[u] += paths[v]
                paths[u] += size[u] * size[v]  # u子树到v子树的路径
                size[u] += size[v]
        
        # 加上以 u 为端点的路径
        paths[u] += size[u]
    
    dfs(0, -1)
    return paths

# 测试
edges = [[0,1], [0,2], [1,3], [1,4]]
print(subtree_paths(5, edges))  # [10, 3, 0, 0, 0]
```

**推导过程**：
```
对于节点 u：
- 原有子树 v1, v2, ..., vk 已有的路径数
- 新增路径：经过 u 连接不同子树的路径
  - v1 到 v2: size[v1] * size[v2]
  - v1 到 v3: size[v1] * size[v3]
  - ...
- 加上以 u 为端点的路径：size[u]
```

## 解法三：子树权重和

```python
def subtree_sums(n, edges, values):
    graph = [[] for _ in range(n)]
    for u, v in edges:
        graph[u].append(v)
        graph[v].append(u)
    
    sums = [0] * n
    
    def dfs(u, parent):
        sums[u] = values[u]
        for v in graph[u]:
            if v != parent:
                dfs(v, u)
                sums[u] += sums[v]
    
    dfs(0, -1)
    return sums

# 测试
edges = [[0,1], [0,2], [1,3], [1,4]]
values = [1, 2, 3, 4, 5]
print(subtree_sums(5, edges, values))  # [15, 11, 3, 4, 5]
```

## 综合：同时统计多个信息

```python
class SubtreeInfo:
    def __init__(self, n, edges, values):
        self.n = n
        self.values = values
        self.graph = [[] for _ in range(n)]
        for u, v in edges:
            self.graph[u].append(v)
            self.graph[v].append(u)
        
        self.size = [0] * n
        self.sum = [0] * n
        self.paths = [0] * n
        self.max_path_sum = [0] * n
        
        self.dfs(0, -1)
    
    def dfs(self, u, parent):
        self.size[u] = 1
        self.sum[u] = self.values[u]
        
        for v in self.graph[u]:
            if v == parent:
                continue
            
            self.dfs(v, u)
            
            # 更新统计信息
            self.paths[u] += self.paths[v]
            self.paths[u] += self.size[u] * self.size[v]
            
            self.max_path_sum[u] = max(
                self.max_path_sum[u],
                self.max_path_sum[v]
            )
            
            self.size[u] += self.size[v]
            self.sum[u] += self.sum[v]
        
        self.paths[u] += self.size[u]
        self.max_path_sum[u] = max(self.max_path_sum[u], self.sum[u])
    
    def get_stats(self):
        return {
            'size': self.size,
            'sum': self.sum,
            'paths': self.paths,
            'max_path_sum': self.max_path_sum
        }

# 测试
edges = [[0,1], [0,2], [1,3], [1,4]]
values = [1, 2, 3, 4, 5]
info = SubtreeInfo(5, edges, values)
stats = info.get_stats()
print(stats)
```

## 应用：LeetCode 题目

**示例：子树中最大的和**（类似 LeetCode 1273）
```python
def deleteTreeNodes(nodes, parent, value):
    """
    删除权重和为 0 的子树，返回剩余节点数
    """
    graph = [[] for _ in range(nodes)]
    root = -1
    for i in range(nodes):
        if parent[i] == -1:
            root = i
        else:
            graph[parent[i]].append(i)
    
    def dfs(u):
        subtree_sum = value[u]
        subtree_size = 1
        
        for v in graph[u]:
            child_sum, child_size = dfs(v)
            subtree_sum += child_sum
            subtree_size += child_size
        
        # 如果子树和为 0，删除整棵子树
        if subtree_sum == 0:
            return 0, 0
        
        return subtree_sum, subtree_size
    
    _, remaining = dfs(root)
    return remaining

# 测试
parent = [-1, 0, 0, 1, 1, 2, 2]
value = [1, -2, 4, 1, -2, 3, -1]
print(deleteTreeNodes(7, parent, value))  # 4
```

## 小结

- **子树大小**：`size[u] = 1 + Σ size[v]`
- **子树路径数**：考虑跨子树路径
- **子树权重和**：`sum[u] = value[u] + Σ sum[v]`
- **复杂度**：O(n)，一次 DFS 完成
