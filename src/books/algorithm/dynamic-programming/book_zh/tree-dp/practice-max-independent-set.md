# 树上最大独立集

## 问题描述

> 给定一棵带权重的树，选择一些节点，使得选中的节点两两不相邻，且权重和最大。

**示例**：
```
输入：
n = 5
edges = [[0,1], [0,2], [1,3], [1,4]]
values = [3, 2, 3, 4, 5]

输出：11
解释：选择节点 0, 3, 4，权重和 = 3 + 4 + 5 = 12（错误！）
正确：选择节点 2, 3, 4，权重和 = 3 + 4 + 5 = 12（但3和4与1相邻，1没选）
实际：选择 0, 3, 4 或 2, 3, 4
```

## 解法：树形 DP

```python
def maxIndependentSet(n, edges, values):
    """
    dp[u][0] = 不选节点 u 的最大权重
    dp[u][1] = 选节点 u 的最大权重
    """
    graph = [[] for _ in range(n)]
    for u, v in edges:
        graph[u].append(v)
        graph[v].append(u)
    
    dp = [[0, 0] for _ in range(n)]
    
    def dfs(u, parent):
        dp[u][0] = 0
        dp[u][1] = values[u]
        
        for v in graph[u]:
            if v == parent:
                continue
            
            dfs(v, u)
            
            # u 不选：v 可以选或不选
            dp[u][0] += max(dp[v][0], dp[v][1])
            
            # u 选：v 必须不选
            dp[u][1] += dp[v][0]
    
    dfs(0, -1)
    return max(dp[0][0], dp[0][1])

# 测试
edges = [[0,1], [0,2], [1,3], [1,4]]
values = [3, 2, 3, 4, 5]
print(maxIndependentSet(5, edges, values))  # 11 (选择 2, 3, 4)
```

**复杂度**：O(n)

## 返回选中的节点

```python
def maxIndependentSetWithNodes(n, edges, values):
    graph = [[] for _ in range(n)]
    for u, v in edges:
        graph[u].append(v)
        graph[v].append(u)
    
    dp = [[0, 0] for _ in range(n)]
    
    def dfs(u, parent):
        dp[u][0] = 0
        dp[u][1] = values[u]
        
        for v in graph[u]:
            if v == parent:
                continue
            dfs(v, u)
            dp[u][0] += max(dp[v][0], dp[v][1])
            dp[u][1] += dp[v][0]
    
    dfs(0, -1)
    
    # 回溯找到选中的节点
    selected = []
    
    def backtrack(u, parent, is_selected):
        if is_selected:
            selected.append(u)
        
        for v in graph[u]:
            if v == parent:
                continue
            
            if is_selected:
                # u 选了，v 必须不选
                backtrack(v, u, False)
            else:
                # u 没选，v 选择最优的
                backtrack(v, u, dp[v][1] > dp[v][0])
    
    backtrack(0, -1, dp[0][1] > dp[0][0])
    return max(dp[0][0], dp[0][1]), selected

# 测试
edges = [[0,1], [0,2], [1,3], [1,4]]
values = [3, 2, 3, 4, 5]
weight, nodes = maxIndependentSetWithNodes(5, edges, values)
print(f"最大权重: {weight}, 选中节点: {nodes}")
```

## 扩展：LeetCode 337 - 打家劫舍 III

```python
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def rob(root):
    """
    不能同时抢劫相邻节点
    """
    def dfs(node):
        if not node:
            return 0, 0  # (不抢, 抢)
        
        left = dfs(node.left)
        right = dfs(node.right)
        
        # 不抢当前节点
        not_rob = max(left) + max(right)
        
        # 抢当前节点
        rob = node.val + left[0] + right[0]
        
        return not_rob, rob
    
    return max(dfs(root))

# 测试
root = TreeNode(3)
root.left = TreeNode(2, None, TreeNode(3))
root.right = TreeNode(3, None, TreeNode(1))
print(rob(root))  # 7
```

## 小结

- **状态**：`dp[u][0/1]` 表示不选/选节点 u
- **转移**：
  - 不选 u：`dp[u][0] = sum(max(dp[v][0], dp[v][1]))`
  - 选 u：`dp[u][1] = values[u] + sum(dp[v][0])`
- **应用**：独立集、覆盖集、打家劫舍
