# 虚树

**虚树（Virtual Tree / Auxiliary Tree）**是一种处理树上关键点问题的技术。当查询只涉及树中少量关键点时，虚树可以将问题规模从 O(n) 降到 O(k)，其中 k 是关键点数量。

---

## 问题背景

考虑问题：给定一棵 n 个节点的树，q 次查询，每次查询给定 k 个关键点，求这 k 个点的某种信息（如最小生成树、两两距离和等）。

**直接做法**：每次 O(n) 遍历整棵树，总复杂度 O(qn)。

**虚树优化**：构建只包含关键点及其 LCA 的虚树，每次 O(k log k)。

---

## 核心思想

虚树保留的节点：
1. 所有**关键点**
2. 关键点两两之间的**所有 LCA**

**关键性质**：虚树节点数 ≤ 2k - 1（k 个关键点最多产生 k-1 个 LCA）

---

## 构建算法

### 算法步骤

1. 按 **DFS 序**对关键点排序
2. 使用**单调栈**维护当前的虚树链
3. 依次加入关键点，计算与栈顶的 LCA
4. 根据 LCA 位置弹栈并建边

### 代码实现

```python
from typing import List, Tuple
from functools import lru_cache

class VirtualTree:
    """虚树构建与应用"""
    
    def __init__(self, n: int, edges: List[Tuple[int, int]], root: int = 0):
        """初始化原树"""
        self.n = n
        self.root = root
        
        # 建图
        self.adj = [[] for _ in range(n)]
        for u, v in edges:
            self.adj[u].append(v)
            self.adj[v].append(u)
        
        # 预处理 DFS 序、深度、倍增 LCA
        self.dfn = [0] * n
        self.depth = [0] * n
        self.LOG = 20
        self.parent = [[-1] * n for _ in range(self.LOG)]
        
        self._timer = 0
        self._preprocess(root, -1, 0)
        self._build_sparse_table()
    
    def _preprocess(self, u: int, par: int, d: int) -> None:
        """DFS 预处理"""
        self.dfn[u] = self._timer
        self._timer += 1
        self.depth[u] = d
        self.parent[0][u] = par
        
        for v in self.adj[u]:
            if v != par:
                self._preprocess(v, u, d + 1)
    
    def _build_sparse_table(self) -> None:
        """倍增表"""
        for k in range(1, self.LOG):
            for u in range(self.n):
                if self.parent[k-1][u] != -1:
                    self.parent[k][u] = self.parent[k-1][self.parent[k-1][u]]
    
    def lca(self, u: int, v: int) -> int:
        """查询 LCA"""
        if self.depth[u] < self.depth[v]:
            u, v = v, u
        
        diff = self.depth[u] - self.depth[v]
        for k in range(self.LOG):
            if diff & (1 << k):
                u = self.parent[k][u]
        
        if u == v:
            return u
        
        for k in range(self.LOG - 1, -1, -1):
            if self.parent[k][u] != self.parent[k][v]:
                u = self.parent[k][u]
                v = self.parent[k][v]
        
        return self.parent[0][u]
    
    def dist(self, u: int, v: int) -> int:
        """两点距离（边数）"""
        return self.depth[u] + self.depth[v] - 2 * self.depth[self.lca(u, v)]
    
    def build_virtual_tree(self, key_nodes: List[int]) -> Tuple[List[int], List[Tuple[int, int]]]:
        """
        构建虚树
        返回：(虚树节点列表, 虚树边列表)
        """
        if not key_nodes:
            return [], []
        
        # 按 DFS 序排序
        nodes = sorted(key_nodes, key=lambda x: self.dfn[x])
        
        # 单调栈
        stack = []
        vt_nodes = set()  # 虚树节点
        vt_edges = []     # 虚树边
        
        # 添加节点并处理与栈顶的关系
        def add_edge(parent: int, child: int) -> None:
            if parent != child:
                vt_edges.append((parent, child))
        
        for node in nodes:
            if not stack:
                stack.append(node)
                vt_nodes.add(node)
                continue
            
            l = self.lca(node, stack[-1])
            vt_nodes.add(l)
            vt_nodes.add(node)
            
            if l == stack[-1]:
                # LCA 就是栈顶，直接压入
                stack.append(node)
            else:
                # 弹栈直到找到 l 的位置
                while len(stack) > 1 and self.dfn[stack[-2]] >= self.dfn[l]:
                    add_edge(stack[-2], stack[-1])
                    stack.pop()
                
                if stack[-1] != l:
                    add_edge(l, stack[-1])
                    stack[-1] = l
                
                stack.append(node)
        
        # 清空栈，连接剩余的边
        while len(stack) > 1:
            add_edge(stack[-2], stack[-1])
            stack.pop()
        
        return list(vt_nodes), vt_edges
```

---

## 构建过程示例

原树结构：

```
        0
      / | \
     1  2  3
    / \    |
   4   5   6
  /
 7
```

DFS 序：0→1→4→7→5→2→3→6

关键点：{7, 5, 6}，DFS 序排序后：[7, 5, 6]

构建过程：

1. 加入 7，栈：[7]
2. 加入 5，LCA(7,5)=1
   - 1 ≠ 7，弹栈建边 1→7
   - 栈：[1, 5]
3. 加入 6，LCA(5,6)=0
   - 0 ≠ 5，弹栈建边 0→5（经过1→5，0→1）
   - 栈：[0, 6]

虚树边：0→1, 1→7, 1→5, 0→3, 3→6

```
虚树：
    0
   / \
  1   3
 / \   \
7   5   6
```

---

## 应用实例

### 问题 1：关键点最小生成树

求 k 个关键点在原树上的最小连通子图的边权和。

```python
def min_spanning_tree(self, key_nodes: List[int], edge_weights: dict) -> int:
    """
    关键点的最小生成树（原树上的边权和）
    edge_weights: {(u, v): weight} 原树边权
    """
    vt_nodes, vt_edges = self.build_virtual_tree(key_nodes)
    
    total = 0
    for u, v in vt_edges:
        # 虚树边权 = 原树路径权重
        total += self._path_weight(u, v, edge_weights)
    
    return total

def _path_weight(self, u: int, v: int, edge_weights: dict) -> int:
    """计算原树 u→v 路径的边权和"""
    # 简化实现：假设边权为1
    return self.dist(u, v)
```

### 问题 2：关键点两两距离和

```python
def pairwise_distance_sum(self, key_nodes: List[int]) -> int:
    """关键点两两距离之和"""
    vt_nodes, vt_edges = self.build_virtual_tree(key_nodes)
    
    # 建虚树邻接表
    vt_adj = {node: [] for node in vt_nodes}
    for u, v in vt_edges:
        w = self.dist(u, v)  # 虚树边权 = 原树距离
        vt_adj[u].append((v, w))
        vt_adj[v].append((u, w))
    
    key_set = set(key_nodes)
    root = min(vt_nodes, key=lambda x: self.dfn[x])
    
    # DP：每条边的贡献 = 边权 × 两侧关键点数的乘积
    total = [0]
    
    def dfs(u: int, parent: int) -> int:
        """返回子树中的关键点数"""
        cnt = 1 if u in key_set else 0
        for v, w in vt_adj[u]:
            if v != parent:
                sub_cnt = dfs(v, u)
                # 边 (u,v) 被经过的次数 = sub_cnt × (k - sub_cnt)
                total[0] += w * sub_cnt * (len(key_nodes) - sub_cnt)
                cnt += sub_cnt
        return cnt
    
    dfs(root, -1)
    return total[0]
```

### 问题 3：消灭病毒（每次断开最少边使关键点与根断开）

```python
def min_cut_to_root(self, key_nodes: List[int], edge_weights: dict) -> int:
    """
    最少断开多少边权，使所有关键点与根断开
    等价于：虚树上每条从根到关键点的路径至少断一条边
    """
    vt_nodes, vt_edges = self.build_virtual_tree(key_nodes)
    
    # 建虚树（有向，从根向下）
    vt_adj = {node: [] for node in vt_nodes}
    for u, v in vt_edges:
        if self.depth[u] < self.depth[v]:
            vt_adj[u].append((v, self._min_edge_on_path(u, v, edge_weights)))
        else:
            vt_adj[v].append((u, self._min_edge_on_path(v, u, edge_weights)))
    
    key_set = set(key_nodes)
    root = min(vt_nodes, key=lambda x: self.depth[x])
    
    def dfs(u: int) -> int:
        """返回切断 u 子树中所有关键点所需的最小代价"""
        if u in key_set:
            return float('inf')  # 关键点必须被切断
        
        total = 0
        for v, w in vt_adj[u]:
            total += min(w, dfs(v))
        
        return total if total > 0 else float('inf')
    
    return dfs(root) if dfs(root) != float('inf') else 0
```

---

## 复杂度分析

| 操作 | 时间复杂度 |
|------|-----------|
| 预处理（LCA） | O(n log n) |
| 构建虚树 | O(k log k) |
| 虚树上 DP | O(k) |
| 单次查询 | O(k log k) |

---

## 常见错误

1. **忘记添加 LCA**
   ```python
   # 错误：只添加关键点
   vt_nodes = key_nodes
   
   # 正确：关键点 + 所有 LCA
   ```

2. **DFS 序排序错误**
   ```python
   # 错误：按节点编号排序
   nodes.sort()
   
   # 正确：按 DFS 序排序
   nodes.sort(key=lambda x: self.dfn[x])
   ```

3. **虚树边权计算错误**
   ```python
   # 错误：虚树边权 = 1
   
   # 正确：虚树边权 = 原树路径长度
   weight = self.dist(u, v)
   ```

---

## 本章小结

本章介绍了虚树技术：

1. **核心思想**
   - 只保留关键点和它们的 LCA
   - 将问题规模从 O(n) 降到 O(k)

2. **构建方法**
   - 按 DFS 序排序
   - 单调栈维护虚树链
   - 动态计算 LCA 并建边

3. **应用场景**
   - 关键点最小生成树
   - 关键点距离统计
   - 树上切割问题

4. **复杂度**
   - 预处理 O(n log n)
   - 每次查询 O(k log k)

至此，第九部分"树链剖分与 LCA"全部完成。下一部分我们将进入高级应用专题。
