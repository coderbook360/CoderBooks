# 树上启发式合并

**树上启发式合并（DSU on Tree / Small to Large）**是一种处理子树统计问题的高效技术。它的核心思想是：**保留重儿子的信息，轻儿子的信息暴力合并**。

---

## 问题背景

考虑问题：对于树上每个节点，统计其子树中某种信息（如不同颜色数、出现最多的颜色等）。

**朴素方法**：对每个节点独立统计，O(n²)。

**启发式合并**：利用轻重链性质，优化到 O(n log n)。

---

## 核心思想

对于每个节点 u：
1. 先递归处理所有**轻儿子**，处理完后**清空**它们的贡献
2. 递归处理**重儿子**，**保留**其贡献
3. 暴力加入**轻儿子子树**的所有节点
4. 加入**节点 u 自身**
5. 统计答案

### 为什么高效？

每个节点被"暴力加入"的次数 = 从该节点到根的**轻边数量** ≤ O(log n)。

因此总操作次数为 O(n log n)。

---

## 算法模板

```python
from typing import List, Dict
from collections import defaultdict

class DSUOnTree:
    """树上启发式合并"""
    
    def __init__(self, n: int, edges: List[tuple], colors: List[int], root: int = 0):
        """
        n: 节点数
        edges: 边列表
        colors: 每个节点的颜色
        root: 根节点
        """
        self.n = n
        self.root = root
        self.colors = colors
        
        # 建图
        self.adj = [[] for _ in range(n)]
        for u, v in edges:
            self.adj[u].append(v)
            self.adj[v].append(u)
        
        # 预处理
        self.parent = [-1] * n
        self.size = [0] * n
        self.heavy_son = [-1] * n
        self._preprocess(root, -1)
        
        # 统计信息
        self.color_count = defaultdict(int)  # 颜色 -> 出现次数
        self.answers = [0] * n  # 每个节点的答案
        
        # 执行算法
        self._dsu(root, -1, False)
    
    def _preprocess(self, u: int, par: int) -> None:
        """预处理 size 和重儿子"""
        self.parent[u] = par
        self.size[u] = 1
        max_son_size = 0
        
        for v in self.adj[u]:
            if v != par:
                self._preprocess(v, u)
                self.size[u] += self.size[v]
                if self.size[v] > max_son_size:
                    max_son_size = self.size[v]
                    self.heavy_son[u] = v
    
    def _add(self, u: int, par: int, sign: int) -> None:
        """暴力加入/删除 u 子树的所有节点"""
        self.color_count[self.colors[u]] += sign
        for v in self.adj[u]:
            if v != par:
                self._add(v, u, sign)
    
    def _dsu(self, u: int, par: int, keep: bool) -> None:
        """
        启发式合并主函数
        keep: 是否保留当前节点的贡献
        """
        # 1. 先处理轻儿子，不保留
        for v in self.adj[u]:
            if v != par and v != self.heavy_son[u]:
                self._dsu(v, u, False)
        
        # 2. 处理重儿子，保留
        if self.heavy_son[u] != -1:
            self._dsu(self.heavy_son[u], u, True)
        
        # 3. 暴力加入轻儿子子树
        for v in self.adj[u]:
            if v != par and v != self.heavy_son[u]:
                self._add(v, u, 1)
        
        # 4. 加入节点 u 自身
        self.color_count[self.colors[u]] += 1
        
        # 5. 统计答案（这里以不同颜色数为例）
        self.answers[u] = len([c for c, cnt in self.color_count.items() if cnt > 0])
        
        # 6. 如果不保留，清空贡献
        if not keep:
            self._add(u, par, -1)
    
    def get_answers(self) -> List[int]:
        return self.answers
```

---

## 执行过程示例

树结构（数字为颜色）：

```
        0(R)
       / \
      1(B) 2(R)
     /|\
   3(R)4(G)5(B)
```

假设 size: [6, 4, 1, 1, 1, 1]，重儿子: [1, 3 或 4 或 5, -1, -1, -1, -1]

DFS 顺序处理：

1. **节点 3, 4, 5**：叶子节点，直接统计
2. **节点 1**：
   - 处理轻儿子 4, 5（清空）
   - 处理重儿子 3（保留）
   - 加入 4, 5 子树
   - 加入自身
   - 统计：{R:1, G:1, B:1} → 3 种颜色

3. **节点 2**：叶子，{R:1} → 1 种

4. **节点 0**：
   - 处理轻儿子 2（清空）
   - 处理重儿子 1（保留）
   - 加入 2 子树
   - 加入自身
   - 统计：{R:2, B:2, G:1} → 3 种颜色

---

## 应用实例

### 问题 1：子树中出现最多的颜色

```python
class DSUMaxColor(DSUOnTree):
    def __init__(self, n, edges, colors, root=0):
        self.max_count = 0
        self.max_color_sum = 0
        super().__init__(n, edges, colors, root)
    
    def _dsu(self, u: int, par: int, keep: bool) -> None:
        for v in self.adj[u]:
            if v != par and v != self.heavy_son[u]:
                self._dsu(v, u, False)
        
        if self.heavy_son[u] != -1:
            self._dsu(self.heavy_son[u], u, True)
        
        for v in self.adj[u]:
            if v != par and v != self.heavy_son[u]:
                self._add_with_track(v, u, 1)
        
        self._update_with_track(u)
        
        # 答案：出现次数最多的颜色编号之和
        self.answers[u] = self.max_color_sum
        
        if not keep:
            self._clear()
    
    def _add_with_track(self, u: int, par: int, sign: int) -> None:
        c = self.colors[u]
        old_count = self.color_count[c]
        self.color_count[c] += sign
        new_count = self.color_count[c]
        
        # 更新最大值统计
        if sign > 0:
            if new_count > self.max_count:
                self.max_count = new_count
                self.max_color_sum = c
            elif new_count == self.max_count:
                self.max_color_sum += c
        
        for v in self.adj[u]:
            if v != par:
                self._add_with_track(v, u, sign)
    
    def _update_with_track(self, u: int) -> None:
        c = self.colors[u]
        self.color_count[c] += 1
        if self.color_count[c] > self.max_count:
            self.max_count = self.color_count[c]
            self.max_color_sum = c
        elif self.color_count[c] == self.max_count:
            self.max_color_sum += c
    
    def _clear(self) -> None:
        self.color_count.clear()
        self.max_count = 0
        self.max_color_sum = 0
```

### 问题 2：子树中某颜色的出现次数

```python
def subtree_color_count(n, edges, colors, queries):
    """
    queries: [(u, c), ...] 查询节点 u 子树中颜色 c 的出现次数
    """
    # 将查询按节点分组
    # 在 DSU on Tree 过程中回答
    pass
```

---

## 复杂度证明

**关键引理**：每个节点被暴力访问的次数 ≤ 从该节点到根的轻边数量。

**证明**：
- 节点 u 被暴力访问，只有当它属于某个轻儿子子树
- 每跳过一条轻边，u 到根的距离减少 1
- 轻边数量 ≤ log n（因为每走一条轻边，子树大小至少减半）

**总复杂度**：O(n log n)

---

## 与树链剖分对比

| 特性 | DSU on Tree | 树链剖分 |
|------|-------------|---------|
| 适用场景 | 子树统计 | 路径查询/修改 |
| 核心思想 | 保留重儿子，暴力轻儿子 | 分解为链 |
| 复杂度 | O(n log n) | O(n log n) 预处理 |
| 数据结构 | 无额外结构 | 线段树 |

---

## 优化：DFS 序优化

使用 DFS 序，可以进一步减少常数：

```python
class DSUWithDFN:
    """使用 DFS 序优化的版本"""
    
    def __init__(self, n, edges, colors, root=0):
        # ... 初始化 ...
        
        # 计算 DFS 序
        self.dfn = [0] * n
        self.end_dfn = [0] * n
        self.dfn_to_node = [0] * n
        self._compute_dfn(root, -1)
    
    def _compute_dfn(self, u: int, par: int) -> None:
        self.dfn[u] = self._timer
        self.dfn_to_node[self._timer] = u
        self._timer += 1
        
        # 重儿子优先
        if self.heavy_son[u] != -1:
            self._compute_dfn(self.heavy_son[u], u)
        
        for v in self.adj[u]:
            if v != par and v != self.heavy_son[u]:
                self._compute_dfn(v, u)
        
        self.end_dfn[u] = self._timer - 1
    
    def _add_range(self, l: int, r: int, sign: int) -> None:
        """添加 DFS 序范围 [l, r] 内的所有节点"""
        for i in range(l, r + 1):
            node = self.dfn_to_node[i]
            self.color_count[self.colors[node]] += sign
```

---

## 本章小结

本章介绍了树上启发式合并：

1. **核心思想**
   - 保留重儿子，暴力合并轻儿子
   - 每个节点被访问 O(log n) 次

2. **算法框架**
   - 先处理轻儿子（清空）
   - 再处理重儿子（保留）
   - 暴力加入轻儿子子树

3. **应用**
   - 子树不同颜色数
   - 子树中出现最多的颜色
   - 各种子树统计问题

4. **复杂度**
   - 时间：O(n log n)
   - 空间：O(n)

下一章我们将学习**虚树**技术。
