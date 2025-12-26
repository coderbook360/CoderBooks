# 树的最长路径

## 问题描述

> 给定一棵带权重的树（无向图），找到树中任意两个节点之间的最长路径长度。路径长度定义为路径上所有边的权重之和。

**示例**：
```
输入：
n = 5
edges = [[0,1,2], [1,2,3], [1,3,4], [3,4,1]]
（格式：[u, v, weight]）

输出：9
解释：最长路径是 2→1→3→4，长度 3+4+1+1 = 9
```

**约束**：
- `2 <= n <= 10^4`
- `edges.length == n - 1`
- 权重范围：`[-1000, 1000]`

## 解法：树形 DP

```python
def longestPath(n, edges):
    # 构建图
    graph = [[] for _ in range(n)]
    for u, v, w in edges:
        graph[u].append((v, w))
        graph[v].append((u, w))
    
    max_length = [0]
    
    def dfs(u, parent):
        """返回从 u 向下的最长路径"""
        max1 = max2 = 0  # 最长和次长
        
        for v, w in graph[u]:
            if v == parent:
                continue
            
            child_len = dfs(v, u) + w
            
            if child_len > max1:
                max2 = max1
                max1 = child_len
            elif child_len > max2:
                max2 = child_len
        
        max_length[0] = max(max_length[0], max1 + max2)
        return max1
    
    dfs(0, -1)
    return max_length[0]

# 测试
edges = [[0,1,2], [1,2,3], [1,3,4], [3,4,1]]
print(longestPath(5, edges))  # 9
```

**复杂度**：O(n)

## 关键点

1. **记录最长和次长**：经过某节点的最长路径 = max1 + max2
2. **加权边**：`child_len = dfs(v, u) + w`
3. **负权处理**：可能所有权重都是负数，需要正确初始化

## 扩展：返回路径

```python
def longestPathWithNodes(n, edges):
    graph = [[] for _ in range(n)]
    for u, v, w in edges:
        graph[u].append((v, w))
        graph[v].append((u, w))
    
    result = {'length': 0, 'path': []}
    
    def dfs(u, parent):
        """返回 (最长路径长度, 路径节点列表)"""
        max1_len, max1_path = 0, []
        max2_len, max2_path = 0, []
        
        for v, w in graph[u]:
            if v == parent:
                continue
            
            child_len, child_path = dfs(v, u)
            child_len += w
            child_path = child_path + [v]
            
            if child_len > max1_len:
                max2_len, max2_path = max1_len, max1_path
                max1_len, max1_path = child_len, child_path
            elif child_len > max2_len:
                max2_len, max2_path = child_len, child_path
        
        total_len = max1_len + max2_len
        if total_len > result['length']:
            result['length'] = total_len
            result['path'] = max1_path[::-1] + [u] + max2_path
        
        return max1_len, max1_path
    
    dfs(0, -1)
    return result['length'], result['path']
```

## 小结

- **核心**：记录最长和次长路径
- **技巧**：DFS 返回向下最长路径，全局更新最长路径
- **应用**：树的直径、最长路径、树形 DP 基础
