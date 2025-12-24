# Tarjan 离线求 LCA

**Tarjan 离线算法**是一种基于 DFS 和并查集的 LCA 算法。它的特点是必须**离线**处理所有查询，但总复杂度接近 O(n + q)。

---

## 适用场景

- 所有查询已知（可以离线处理）
- 查询数量很大
- 不需要支持动态添加查询

---

## 算法思想

Tarjan 算法的核心思想：

1. DFS 遍历树，维护三种状态的节点：
   - **未访问**：还没有 DFS 到
   - **进行中**：已访问但未回溯
   - **已完成**：已回溯

2. 对于查询 (u, v)，当 v 完成回溯时，u 的状态决定了 LCA：
   - 如果 u **进行中**：LCA = u 到根路径上第一个进行中的节点
   - 如果 u **已完成**：LCA = u 回溯时合并到的祖先

3. 使用**并查集**维护已完成节点到最近进行中祖先的映射。

---

## 算法步骤

```
Tarjan(u):
    1. 标记 u 为"进行中"
    2. 初始化 u 的并查集为自己
    3. 对于每个儿子 v：
        a. Tarjan(v)
        b. 合并 v 到 u
    4. 标记 u 为"已完成"
    5. 遍历所有关于 u 的查询 (u, other)：
        如果 other 已完成：
            LCA(u, other) = Find(other)
```

---

## 完整实现

```python
from typing import List, Tuple, Dict
from collections import defaultdict

class LCATarjan:
    """Tarjan 离线算法求 LCA"""
    
    def __init__(self, n: int, edges: List[Tuple[int, int]], 
                 queries: List[Tuple[int, int]], root: int = 0):
        """
        n: 节点数
        edges: 边列表
        queries: LCA 查询列表
        root: 根节点
        """
        self.n = n
        self.root = root
        
        # 建图
        self.adj = [[] for _ in range(n)]
        for u, v in edges:
            self.adj[u].append(v)
            self.adj[v].append(u)
        
        # 并查集
        self.parent = list(range(n))
        
        # 状态：0=未访问, 1=进行中, 2=已完成
        self.state = [0] * n
        
        # 查询：对每个节点存储与其相关的查询
        self.node_queries = defaultdict(list)  # node -> [(other, query_index)]
        for i, (u, v) in enumerate(queries):
            self.node_queries[u].append((v, i))
            if u != v:
                self.node_queries[v].append((u, i))
        
        # 结果
        self.answers = [-1] * len(queries)
        
        # 执行算法
        self._tarjan(root, -1)
    
    def _find(self, x: int) -> int:
        """并查集查找（路径压缩）"""
        if self.parent[x] != x:
            self.parent[x] = self._find(self.parent[x])
        return self.parent[x]
    
    def _union(self, child: int, parent: int) -> None:
        """将 child 合并到 parent"""
        root_child = self._find(child)
        self.parent[root_child] = parent
    
    def _tarjan(self, u: int, par: int) -> None:
        """Tarjan DFS"""
        self.state[u] = 1  # 进行中
        
        # 遍历儿子
        for v in self.adj[u]:
            if v != par and self.state[v] == 0:
                self._tarjan(v, u)
                self._union(v, u)  # v 回溯后合并到 u
        
        self.state[u] = 2  # 已完成
        
        # 处理关于 u 的查询
        for other, query_idx in self.node_queries[u]:
            if self.state[other] == 2:  # other 已完成
                self.answers[query_idx] = self._find(other)
    
    def get_results(self) -> List[int]:
        """获取所有查询结果"""
        return self.answers
```

---

## 执行过程示例

树结构：

```
        0
       /|\
      1 2 3
     /|
    4 5
```

查询：[(4, 3), (5, 2)]

### DFS 过程

1. **访问 0**：state[0] = 1

2. **访问 1**：state[1] = 1

3. **访问 4**：state[4] = 1
   - 无儿子，state[4] = 2
   - 查询 (4, 3)：3 未完成，跳过

4. **回溯到 1**：union(4, 1)
   - parent[4] = 1

5. **访问 5**：state[5] = 1
   - 无儿子，state[5] = 2
   - 查询 (5, 2)：2 未完成，跳过

6. **回溯到 1**：union(5, 1)

7. **state[1] = 2**

8. **回溯到 0**：union(1, 0)

9. **访问 2**：state[2] = 1
   - state[2] = 2
   - 查询 (5, 2)：5 已完成
   - Find(5) = Find(5) → Find(1) → Find(0) = 0
   - answers[1] = 0

10. **回溯到 0**：union(2, 0)

11. **访问 3**：state[3] = 1
    - state[3] = 2
    - 查询 (4, 3)：4 已完成
    - Find(4) = Find(4) → Find(1) → Find(0) = 0
    - answers[0] = 0

结果：LCA(4, 3) = 0, LCA(5, 2) = 0

---

## 正确性证明

**关键观察**：

当处理查询 (u, other) 时，如果 other 已完成：
- other 一定在 u 的某个已完成子树中，或在 u 的祖先子树中
- Find(other) 沿着并查集找到的是 other 到根路径上**第一个未回溯**的节点
- 这恰好是 LCA(u, other)

---

## 复杂度分析

| 操作 | 时间复杂度 |
|------|-----------|
| DFS | O(n) |
| 并查集操作 | O((n + q) × α(n)) |
| 总体 | O(n + q × α(n)) |

其中 α 是阿克曼函数的反函数，实际可视为 O(1)。

**空间复杂度**：O(n + q)

---

## 变体：不使用递归

为了避免栈溢出，可以用迭代实现：

```python
def tarjan_iterative(self) -> None:
    """迭代版 Tarjan"""
    stack = [(self.root, -1, False)]  # (node, parent, is_backtracking)
    
    while stack:
        u, par, is_back = stack.pop()
        
        if is_back:
            # 回溯阶段
            self.state[u] = 2
            
            for other, query_idx in self.node_queries[u]:
                if self.state[other] == 2:
                    self.answers[query_idx] = self._find(other)
            
            if par != -1:
                self._union(u, par)
        else:
            self.state[u] = 1
            
            # 压入回溯标记
            stack.append((u, par, True))
            
            # 压入儿子
            for v in self.adj[u]:
                if v != par and self.state[v] == 0:
                    stack.append((v, u, False))
```

---

## 与其他算法对比

| 算法 | 预处理 | 单次查询 | 空间 | 在线/离线 |
|------|--------|---------|------|----------|
| 暴力 | O(n) | O(n) | O(n) | 在线 |
| 倍增 | O(n log n) | O(log n) | O(n log n) | 在线 |
| Tarjan | O(n + q) | 摊还 O(1) | O(n + q) | **离线** |
| RMQ | O(n) | O(1) | O(n) | 在线 |

---

## 使用建议

**适合 Tarjan 的场景**：
- 所有查询预先已知
- 查询数量很大（q >> n）
- 对空间敏感（O(n) vs O(n log n)）

**不适合的场景**：
- 需要在线查询
- 查询会动态增加

---

## 本章小结

本章介绍了 Tarjan 离线算法求 LCA：

1. **核心思想**
   - DFS + 并查集
   - 已完成节点合并到父节点
   - 查询时 Find 得到 LCA

2. **实现要点**
   - 三种状态：未访问、进行中、已完成
   - 回溯时合并并查集
   - 处理查询时检查对方状态

3. **复杂度**
   - 时间：O(n + q × α(n)) ≈ O(n + q)
   - 空间：O(n + q)

4. **适用场景**
   - 离线处理大量查询

下一章我们将学习**树上差分**技术。
