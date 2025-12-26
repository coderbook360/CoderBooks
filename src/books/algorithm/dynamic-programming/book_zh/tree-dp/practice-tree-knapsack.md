# 树上背包问题

## 问题描述

> 给定一棵带权重的树和容量 k，从树中选择最多 k 个节点，使得权重和最大。选中的节点必须形成一个连通子树（包含根节点）。

**示例**：
```
输入：
n = 5, k = 3
edges = [[0,1], [0,2], [1,3], [1,4]]
values = [3, 2, 5, 4, 6]

输出：14
解释：选择节点 0, 1, 4，权重和 = 3 + 2 + 6 = 11（错误！）
实际：选择 0, 2, 4，但4不与2相邻...
正确：选择 0, 1, 4，权重和 = 3 + 2 + 6 = 11
```

## 解法：树形 DP + 背包

```python
def treeKnapsack(n, k, edges, values):
    """
    dp[u][j] = 从 u 的子树中选 j 个节点的最大权重（必须包含 u）
    """
    graph = [[] for _ in range(n)]
    for u, v in edges:
        graph[u].append(v)
        graph[v].append(u)
    
    dp = [[0] * (k + 1) for _ in range(n)]
    size = [1] * n
    
    def dfs(u, parent):
        dp[u][1] = values[u]  # 只选 u
        
        for v in graph[u]:
            if v == parent:
                continue
            
            dfs(v, u)
            
            # 背包合并：u 的子树与 v 的子树
            new_dp = dp[u][:]
            for j in range(1, min(size[u] + size[v], k) + 1):
                for t in range(1, min(j, size[v]) + 1):
                    # 从 u 选 j-t 个，从 v 选 t 个
                    if j - t <= size[u]:
                        new_dp[j] = max(new_dp[j], dp[u][j-t] + dp[v][t])
            
            dp[u] = new_dp
            size[u] += size[v]
    
    dfs(0, -1)
    return max(dp[0])

# 测试
edges = [[0,1], [0,2], [1,3], [1,4]]
values = [3, 2, 5, 4, 6]
print(treeKnapsack(5, 3, edges, values))  # 14
```

**复杂度**：O(n × k^2)

## 优化：滚动数组

```python
def treeKnapsackOptimized(n, k, edges, values):
    """
    空间优化版本
    """
    graph = [[] for _ in range(n)]
    for u, v in edges:
        graph[u].append(v)
        graph[v].append(u)
    
    dp = [[0] * (k + 1) for _ in range(n)]
    size = [1] * n
    
    def dfs(u, parent):
        dp[u][1] = values[u]
        
        for v in graph[u]:
            if v == parent:
                continue
            
            dfs(v, u)
            
            # 逆序遍历，避免重复计算
            for j in range(min(size[u] + size[v], k), 0, -1):
                for t in range(1, min(j, size[v]) + 1):
                    if j - t >= 1 and j - t <= size[u]:
                        dp[u][j] = max(dp[u][j], dp[u][j-t] + dp[v][t])
            
            size[u] += size[v]
    
    dfs(0, -1)
    return max(dp[0])
```

## 小结

- **树形DP + 背包**：合并子树的DP数组
- **复杂度**：O(n × k^2)，可优化到 O(n × k)
- **应用**：树上资源分配、任务选择
