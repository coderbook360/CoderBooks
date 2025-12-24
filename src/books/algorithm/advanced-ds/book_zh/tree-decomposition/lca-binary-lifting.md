# 倍增法求 LCA

**倍增法（Binary Lifting）**是求 LCA 最常用的算法。它预处理每个节点的第 2^k 个祖先，使得查询时可以按二进制位"跳跃"，从而达到 O(log n) 的查询复杂度。

---

## 核心思想

### 暴力法的问题

暴力法每次向上走一步，最坏 O(n)。

### 倍增的优化

预处理 `ancestor[u][k]` = u 的第 2^k 个祖先。

查询时，按二进制分解，跳 O(log n) 次即可。

---

## 预处理

### 状态定义

```
ancestor[u][k] = u 的第 2^k 个祖先
```

### 递推关系

```
ancestor[u][0] = parent[u]
ancestor[u][k] = ancestor[ancestor[u][k-1]][k-1]
```

即：第 2^k 个祖先 = 第 2^(k-1) 个祖先的第 2^(k-1) 个祖先。

### 实现

```python
from typing import List, Tuple
import math

class LCABinaryLifting:
    """倍增法求 LCA"""
    
    def __init__(self, n: int, edges: List[Tuple[int, int]], root: int = 0):
        self.n = n
        self.root = root
        self.LOG = max(1, int(math.log2(n)) + 1)
        
        # 建图
        adj = [[] for _ in range(n)]
        for u, v in edges:
            adj[u].append(v)
            adj[v].append(u)
        
        # 初始化数组
        self.depth = [0] * n
        self.ancestor = [[-1] * self.LOG for _ in range(n)]
        
        # BFS 或 DFS 预处理
        self._preprocess(root, adj)
    
    def _preprocess(self, root: int, adj: List[List[int]]) -> None:
        """BFS 预处理 depth 和 ancestor"""
        from collections import deque
        
        visited = [False] * self.n
        queue = deque([root])
        visited[root] = True
        self.depth[root] = 0
        self.ancestor[root][0] = root  # 根的父亲定义为自己
        
        while queue:
            node = queue.popleft()
            
            # 计算更高层的祖先
            for k in range(1, self.LOG):
                self.ancestor[node][k] = self.ancestor[self.ancestor[node][k-1]][k-1]
            
            for child in adj[node]:
                if not visited[child]:
                    visited[child] = True
                    self.depth[child] = self.depth[node] + 1
                    self.ancestor[child][0] = node
                    queue.append(child)
    
    def query(self, u: int, v: int) -> int:
        """查询 LCA(u, v)"""
        # 让 u 更深
        if self.depth[u] < self.depth[v]:
            u, v = v, u
        
        # 将 u 跳到与 v 同深度
        diff = self.depth[u] - self.depth[v]
        for k in range(self.LOG):
            if (diff >> k) & 1:
                u = self.ancestor[u][k]
        
        # 如果此时相等，v 就是 LCA
        if u == v:
            return u
        
        # 同步向上跳
        for k in range(self.LOG - 1, -1, -1):
            if self.ancestor[u][k] != self.ancestor[v][k]:
                u = self.ancestor[u][k]
                v = self.ancestor[v][k]
        
        # 此时 u 和 v 的父亲相同，就是 LCA
        return self.ancestor[u][0]
    
    def kth_ancestor(self, u: int, k: int) -> int:
        """返回 u 的第 k 个祖先"""
        for i in range(self.LOG):
            if (k >> i) & 1:
                u = self.ancestor[u][i]
                if u == -1:
                    return -1
        return u
    
    def distance(self, u: int, v: int) -> int:
        """树上两点距离"""
        lca = self.query(u, v)
        return self.depth[u] + self.depth[v] - 2 * self.depth[lca]
```

---

## 查询过程详解

假设树：

```
        0 (depth=0)
       /|\
      1 2 3
     /|   |
    4 5   6
   /
  7
```

查询 LCA(7, 6)：

1. **初始**：depth[7] = 3, depth[6] = 2

2. **调整深度**：
   - diff = 3 - 2 = 1 = 0b01
   - k=0: 跳 2^0 = 1 步，7 → 4
   - 现在 u=4, v=6, 同深度

3. **同步向上**：
   - k=1: ancestor[4][1] = 0, ancestor[6][1] = 0，相等，不跳
   - k=0: ancestor[4][0] = 1, ancestor[6][0] = 3，不等，跳
   - 现在 u=1, v=3

4. **返回父亲**：
   - ancestor[1][0] = 0
   - LCA = 0

---

## 求第 k 个祖先

倍增法天然支持"求第 k 个祖先"：

```python
def kth_ancestor(self, u: int, k: int) -> int:
    """返回 u 的第 k 个祖先，不存在返回 -1"""
    for i in range(self.LOG):
        if (k >> i) & 1:
            u = self.ancestor[u][i]
            if u == -1 or u == self.root and (k >> i) > 1:
                return -1
    return u
```

---

## 扩展：路径上的第 k 个节点

```python
def kth_on_path(self, u: int, v: int, k: int) -> int:
    """
    返回 u 到 v 路径上的第 k 个节点（0-indexed，u 是第 0 个）
    """
    lca = self.query(u, v)
    dist_u_lca = self.depth[u] - self.depth[lca]
    dist_v_lca = self.depth[v] - self.depth[lca]
    total = dist_u_lca + dist_v_lca
    
    if k > total:
        return -1
    
    if k <= dist_u_lca:
        # 在 u 到 lca 这段
        return self.kth_ancestor(u, k)
    else:
        # 在 lca 到 v 这段
        steps_from_v = total - k
        return self.kth_ancestor(v, steps_from_v)
```

---

## 扩展：路径上的最值

可以同时预处理路径上的最值：

```python
class LCAWithMax:
    """倍增法求 LCA + 路径最大值"""
    
    def __init__(self, n: int, edges: List[Tuple[int, int, int]], root: int = 0):
        """edges: [(u, v, weight), ...]"""
        self.n = n
        self.LOG = max(1, int(math.log2(n)) + 1)
        
        # 建图
        adj = [[] for _ in range(n)]
        for u, v, w in edges:
            adj[u].append((v, w))
            adj[v].append((u, w))
        
        self.depth = [0] * n
        self.ancestor = [[-1] * self.LOG for _ in range(n)]
        self.max_edge = [[0] * self.LOG for _ in range(n)]  # 路径上的最大边权
        
        self._preprocess(root, adj)
    
    def _preprocess(self, root: int, adj: List[List[tuple]]) -> None:
        from collections import deque
        
        visited = [False] * self.n
        queue = deque([root])
        visited[root] = True
        self.ancestor[root][0] = root
        
        while queue:
            node = queue.popleft()
            
            for k in range(1, self.LOG):
                self.ancestor[node][k] = self.ancestor[self.ancestor[node][k-1]][k-1]
                # 路径最大值 = max(前半段, 后半段)
                self.max_edge[node][k] = max(
                    self.max_edge[node][k-1],
                    self.max_edge[self.ancestor[node][k-1]][k-1]
                )
            
            for child, weight in adj[node]:
                if not visited[child]:
                    visited[child] = True
                    self.depth[child] = self.depth[node] + 1
                    self.ancestor[child][0] = node
                    self.max_edge[child][0] = weight  # 到父亲的边权
                    queue.append(child)
    
    def query_max(self, u: int, v: int) -> int:
        """查询 u 到 v 路径上的最大边权"""
        result = 0
        
        if self.depth[u] < self.depth[v]:
            u, v = v, u
        
        diff = self.depth[u] - self.depth[v]
        for k in range(self.LOG):
            if (diff >> k) & 1:
                result = max(result, self.max_edge[u][k])
                u = self.ancestor[u][k]
        
        if u == v:
            return result
        
        for k in range(self.LOG - 1, -1, -1):
            if self.ancestor[u][k] != self.ancestor[v][k]:
                result = max(result, self.max_edge[u][k], self.max_edge[v][k])
                u = self.ancestor[u][k]
                v = self.ancestor[v][k]
        
        result = max(result, self.max_edge[u][0], self.max_edge[v][0])
        return result
```

---

## 常见错误

### 错误 1：LOG 值太小

```python
# 错误
self.LOG = 20  # 如果 n > 2^20，会数组越界

# 正确
self.LOG = max(1, int(math.log2(n)) + 1)
```

### 错误 2：根节点的祖先

```python
# 错误：根节点的 ancestor[0] 设为 -1
self.ancestor[root][0] = -1  # 会导致查询出错

# 正确：设为自己
self.ancestor[root][0] = root
```

### 错误 3：深度差计算

```python
# 错误：忘记让 u 更深
diff = self.depth[u] - self.depth[v]  # 可能为负

# 正确：先交换
if self.depth[u] < self.depth[v]:
    u, v = v, u
```

---

## 复杂度分析

| 操作 | 时间复杂度 | 空间复杂度 |
|------|-----------|-----------|
| 预处理 | O(n log n) | O(n log n) |
| 查询 LCA | O(log n) | O(1) |
| 第 k 个祖先 | O(log n) | O(1) |
| 路径距离 | O(log n) | O(1) |

---

## 本章小结

本章详细介绍了倍增法求 LCA：

1. **核心思想**
   - 预处理第 2^k 个祖先
   - 查询时按二进制跳跃

2. **实现要点**
   - ancestor[u][k] = ancestor[ancestor[u][k-1]][k-1]
   - 先调整深度，再同步向上跳

3. **扩展应用**
   - 第 k 个祖先
   - 路径最值

4. **复杂度**
   - 预处理 O(n log n)
   - 查询 O(log n)

下一章我们将介绍 Tarjan 离线算法求 LCA。
