# 树的重心

## 问题描述

> 找到树的重心。树的重心定义为：删除该节点后，剩余各个连通块中节点数的最大值最小的节点。

**示例**：
```
输入：
n = 7
edges = [[0,1], [0,2], [1,3], [1,4], [2,5], [2,6]]

         0
        / \
       1   2
      / \ / \
     3  4 5  6

输出：[0]
解释：删除节点 0 后，最大连通块有 3 个节点（1,3,4 或 2,5,6）
      删除节点 1 后，最大连通块有 5 个节点（0,2,5,6,3或4）
      节点 0 是重心
```

## 解法：DFS

```python
def treeCentroid(n, edges):
    graph = [[] for _ in range(n)]
    for u, v in edges:
        graph[u].append(v)
        graph[v].append(u)
    
    size = [0] * n
    max_subtree = [0] * n
    
    def dfs(u, parent):
        size[u] = 1
        for v in graph[u]:
            if v == parent:
                continue
            dfs(v, u)
            size[u] += size[v]
            max_subtree[u] = max(max_subtree[u], size[v])
        
        # 考虑父节点方向的子树
        if parent != -1:
            max_subtree[u] = max(max_subtree[u], n - size[u])
    
    dfs(0, -1)
    
    min_max = min(max_subtree)
    return [i for i in range(n) if max_subtree[i] == min_max]

# 测试
edges = [[0,1], [0,2], [1,3], [1,4], [2,5], [2,6]]
print(treeCentroid(7, edges))  # [0]
```

**性质**：
- 树的重心最多有 2 个
- 重心到所有节点的距离和最小
- 以重心为根，所有子树大小 ≤ n/2

## 应用：树的分治

```python
def treeDecomposition(n, edges):
    """
    基于重心的树分治
    """
    graph = [[] for _ in range(n)]
    for u, v in edges:
        graph[u].append(v)
        graph[v].append(u)
    
    visited = [False] * n
    
    def get_size(u, parent):
        size = 1
        for v in graph[u]:
            if v != parent and not visited[v]:
                size += get_size(v, u)
        return size
    
    def get_centroid(u, parent, tree_size):
        for v in graph[u]:
            if v != parent and not visited[v]:
                if get_size(v, u) > tree_size // 2:
                    return get_centroid(v, u, tree_size)
        return u
    
    def decompose(u):
        tree_size = get_size(u, -1)
        centroid = get_centroid(u, -1, tree_size)
        visited[centroid] = True
        
        # 处理以 centroid 为根的子问题
        print(f"处理重心: {centroid}")
        
        # 递归处理子树
        for v in graph[centroid]:
            if not visited[v]:
                decompose(v)
    
    decompose(0)

# 测试
edges = [[0,1], [0,2], [1,3], [1,4], [2,5], [2,6]]
treeDecomposition(7, edges)
```

## 小结

- **重心定义**：删除后最大连通块最小
- **性质**：最多 2 个，子树大小 ≤ n/2
- **应用**：树分治、树的分解
