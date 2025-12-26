# 树形 DP 中的 DFS 状态转移

## 核心概念

首先要问一个问题：**什么是树形 DP？**

树形 DP 是在**树结构**上进行的动态规划，通过 **DFS（深度优先搜索）** 遍历树，自底向上地计算每个节点的状态。

现在我要问第二个问题：**为什么需要 DFS 状态转移？**

因为：
1. **树的递归结构**：每个子树是一个独立的子问题
2. **自底向上**：先计算子节点，再计算父节点
3. **状态依赖**：父节点的状态依赖于所有子节点的状态

## DFS 状态转移模式

### 模式 1：单状态转移

**定义**：
- `dp[u]` = 以节点 u 为根的子树的最优解

**转移方程**：
```python
def dfs(u, parent):
    """
    计算以 u 为根的子树的 DP 值
    """
    # 初始化
    dp[u] = 初始值
    
    # 遍历所有子节点
    for v in children[u]:
        if v == parent:
            continue
        
        # 递归计算子节点
        dfs(v, u)
        
        # 状态转移
        dp[u] = 更新(dp[u], dp[v])
```

**示例：树的直径**
```python
def tree_diameter(n, edges):
    """
    dp[u] = 以 u 为根的子树中，从 u 出发的最长路径
    """
    graph = [[] for _ in range(n)]
    for u, v in edges:
        graph[u].append(v)
        graph[v].append(u)
    
    dp = [0] * n
    diameter = [0]  # 使用列表以便在递归中修改
    
    def dfs(u, parent):
        max1 = max2 = 0  # 最长和次长路径
        
        for v in graph[u]:
            if v == parent:
                continue
            
            dfs(v, u)
            
            # 更新最长路径
            if dp[v] + 1 > max1:
                max2 = max1
                max1 = dp[v] + 1
            elif dp[v] + 1 > max2:
                max2 = dp[v] + 1
        
        dp[u] = max1
        diameter[0] = max(diameter[0], max1 + max2)
    
    dfs(0, -1)
    return diameter[0]
```

### 模式 2：多状态转移

**定义**：
- `dp[u][0]` = 节点 u 不选的最优解
- `dp[u][1]` = 节点 u 选的最优解

**转移方程**：
```python
def dfs(u, parent):
    """
    多状态 DP
    """
    dp[u][0] = 0
    dp[u][1] = value[u]
    
    for v in children[u]:
        if v == parent:
            continue
        
        dfs(v, u)
        
        # 状态转移
        dp[u][0] += max(dp[v][0], dp[v][1])  # u 不选，v 可以选或不选
        dp[u][1] += dp[v][0]  # u 选，v 必须不选
```

**示例：打家劫舍 III**
```python
def rob(root):
    """
    dp[u][0] = 不抢节点 u 的最大金额
    dp[u][1] = 抢节点 u 的最大金额
    """
    def dfs(node):
        if not node:
            return (0, 0)
        
        left = dfs(node.left)
        right = dfs(node.right)
        
        # 不抢当前节点
        not_rob = max(left[0], left[1]) + max(right[0], right[1])
        
        # 抢当前节点
        rob = node.val + left[0] + right[0]
        
        return (not_rob, rob)
    
    result = dfs(root)
    return max(result[0], result[1])
```

### 模式 3：换根 DP

**定义**：
- 第一次 DFS：计算以某个节点为根的 DP 值
- 第二次 DFS：换根，计算以每个节点为根的 DP 值

**转移方程**：
```python
def rerooting_dp(n, edges):
    """
    换根 DP
    """
    graph = [[] for _ in range(n)]
    for u, v in edges:
        graph[u].append(v)
        graph[v].append(u)
    
    dp1 = [0] * n  # 以 u 为根，向下的 DP 值
    dp2 = [0] * n  # 以 u 为根，全局的 DP 值
    
    # 第一次 DFS：计算 dp1
    def dfs1(u, parent):
        for v in graph[u]:
            if v == parent:
                continue
            dfs1(v, u)
            dp1[u] += dp1[v] + 1  # 示例：子树大小
    
    # 第二次 DFS：计算 dp2
    def dfs2(u, parent):
        for v in graph[u]:
            if v == parent:
                continue
            
            # 换根：从 u 换到 v
            dp2[v] = dp2[u] - dp1[v] - 1 + (n - dp1[v] - 1)
            
            dfs2(v, u)
    
    dfs1(0, -1)
    dp2[0] = dp1[0]
    dfs2(0, -1)
    
    return dp2
```

## 常见技巧

### 技巧 1：记录最大和次大值

**应用**：树的直径、最长路径

```python
def dfs(u, parent):
    max1 = max2 = 0
    
    for v in children[u]:
        if v == parent:
            continue
        
        dfs(v, u)
        
        if dp[v] > max1:
            max2 = max1
            max1 = dp[v]
        elif dp[v] > max2:
            max2 = dp[v]
    
    dp[u] = max1
    diameter = max(diameter, max1 + max2)
```

### 技巧 2：向上和向下分离

**应用**：换根 DP

```python
# 向下：从根到叶子的信息
def dfs_down(u, parent):
    for v in children[u]:
        if v == parent:
            continue
        dfs_down(v, u)
        down[u] += down[v] + 1

# 向上：从子节点到父节点的信息
def dfs_up(u, parent):
    for v in children[u]:
        if v == parent:
            continue
        up[v] = up[u] + 1
        dfs_up(v, u)
```

### 技巧 3：状态压缩

**应用**：树上背包、子集选择

```python
def dfs(u, parent):
    """
    dp[u][j] = 从 u 的子树中选 j 个节点的最优解
    """
    dp[u][1] = value[u]
    
    for v in children[u]:
        if v == parent:
            continue
        
        dfs(v, u)
        
        # 背包合并
        for j in range(size[u], 0, -1):
            for k in range(1, min(j, size[v] + 1)):
                dp[u][j] = max(dp[u][j], dp[u][j-k] + dp[v][k])
        
        size[u] += size[v]
```

## 完整示例

### 示例 1：计算子树大小

```python
def subtree_size(n, edges):
    """
    计算每个节点的子树大小
    """
    graph = [[] for _ in range(n)]
    for u, v in edges:
        graph[u].append(v)
        graph[v].append(u)
    
    size = [1] * n  # 初始化每个节点大小为 1
    
    def dfs(u, parent):
        for v in graph[u]:
            if v == parent:
                continue
            dfs(v, u)
            size[u] += size[v]
    
    dfs(0, -1)
    return size

# 测试
edges = [(0,1), (0,2), (1,3), (1,4)]
print(subtree_size(5, edges))  # [5, 3, 1, 1, 1]
```

### 示例 2：树的中心

```python
def tree_center(n, edges):
    """
    找到树的中心（所有节点到它的最大距离最小）
    """
    graph = [[] for _ in range(n)]
    for u, v in edges:
        graph[u].append(v)
        graph[v].append(u)
    
    # dp1[u] = 以 u 为根，向下的最大距离
    # dp2[u] = 以 u 为根，全局的最大距离
    dp1 = [0] * n
    dp2 = [0] * n
    
    def dfs1(u, parent):
        for v in graph[u]:
            if v == parent:
                continue
            dfs1(v, u)
            dp1[u] = max(dp1[u], dp1[v] + 1)
    
    def dfs2(u, parent, up_dist):
        dp2[u] = max(dp1[u], up_dist)
        
        # 计算每个子节点向上的距离
        max_dists = [(dp1[v] + 1, v) for v in graph[u] if v != parent]
        max_dists.sort(reverse=True)
        
        for v in graph[u]:
            if v == parent:
                continue
            
            # 向上距离 = max(父节点向上距离, 父节点向下距离（不经过 v）)
            new_up = up_dist + 1
            if max_dists and max_dists[0][1] == v:
                if len(max_dists) > 1:
                    new_up = max(new_up, max_dists[1][0] + 1)
            elif max_dists:
                new_up = max(new_up, max_dists[0][0] + 1)
            
            dfs2(v, u, new_up)
    
    dfs1(0, -1)
    dfs2(0, -1, 0)
    
    # 找到最大距离最小的节点
    min_dist = min(dp2)
    return [i for i in range(n) if dp2[i] == min_dist]

# 测试
edges = [(0,1), (1,2), (1,3)]
print(tree_center(4, edges))  # [1]
```

### 示例 3：树上最大独立集

```python
def max_independent_set(n, edges, values):
    """
    树上最大独立集（不相邻节点的最大权值和）
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
            dp[u][0] += max(dp[v][0], dp[v][1])
            dp[u][1] += dp[v][0]
    
    dfs(0, -1)
    return max(dp[0][0], dp[0][1])

# 测试
edges = [(0,1), (0,2), (1,3)]
values = [3, 2, 3, 4]
print(max_independent_set(4, edges, values))  # 7 (选择 0 和 3)
```

## 常见错误

### 错误 1：忘记排除父节点

```python
# 错误
for v in graph[u]:
    dfs(v, u)  # 会访问回父节点！

# 正确
for v in graph[u]:
    if v == parent:
        continue
    dfs(v, u)
```

### 错误 2：初始化错误

```python
# 错误
dp[u] = 0  # 可能应该是 1 或其他值

# 正确：根据问题确定初始值
dp[u] = 1  # 子树大小
dp[u] = values[u]  # 节点权值
```

### 错误 3：状态转移顺序

```python
# 错误：先更新后遍历
dp[u] = value[u]
for v in children[u]:
    dfs(v, u)

# 正确：先遍历后更新
for v in children[u]:
    dfs(v, u)
dp[u] = 计算(...)
```

## 性能对比

| 方法 | 时间复杂度 | 空间复杂度 | 适用场景 |
|-----|-----------|-----------|---------|
| 单状态 DFS | O(n) | O(n) | 简单树形 DP |
| 多状态 DFS | O(n × k) | O(n × k) | k 个状态的树形 DP |
| 换根 DP | O(n) | O(n) | 全局优化问题 |
| 树上背包 | O(n^2) | O(n^2) | 子集选择问题 |

## 小结

### 核心思想
1. **递归结构**：树的子问题是子树
2. **自底向上**：先计算子节点，再计算父节点
3. **状态转移**：父节点状态由子节点状态决定

### 关键技巧
- DFS 遍历：`dfs(u, parent)`
- 排除父节点：`if v == parent: continue`
- 多状态：`dp[u][0]`, `dp[u][1]`
- 换根：两次 DFS，第一次向下，第二次向上

### 适用场景
- 树的直径、中心、最长路径
- 树上背包、独立集、覆盖问题
- 换根优化、全局最优解

掌握这些 DFS 状态转移技巧，是解决树形 DP 问题的关键！
