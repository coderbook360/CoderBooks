# 可持久化并查集

并查集是处理集合合并与查询的利器。本章将学习**可持久化并查集**，支持撤销操作和历史版本回溯。

---

## 为什么需要可持久化并查集？

标准并查集有一个问题：**操作不可逆**。一旦合并两个集合，无法撤销。

但很多场景需要撤销能力：
- 线段树分治中，需要撤销操作
- 回溯算法中，需要恢复状态
- 在线回答历史版本的查询

---

## 可持久化的核心挑战

并查集有两个核心优化：
1. **路径压缩**：将节点直接指向根
2. **按秩合并**：小树合并到大树

**路径压缩破坏可持久化**：它修改大量节点的父指针，复杂度难以分析。

**解决方案**：只使用按秩合并（不用路径压缩），通过可持久化数组维护。

---

## 方法一：可持久化数组实现

将并查集的 parent 数组可持久化。

### 数据结构

```python
from typing import List

class PersistentUnionFind:
    """可持久化并查集：基于可持久化数组"""
    
    def __init__(self, n: int):
        self.n = n
        
        # 节点池
        max_nodes = n * 40
        self.left = [0] * max_nodes
        self.right = [0] * max_nodes
        self.val = [0] * max_nodes
        self.tot = 0
        
        # 版本根
        self.versions = []
        
        # 初始化：每个节点的父节点是自己，秩为 1（用负数表示秩）
        # val[i] < 0 表示 i 是根，|val[i]| 是秩
        # val[i] >= 0 表示父节点
        root = self._build(0, n - 1, [-1] * n)
        self.versions.append(root)
    
    def _new_node(self) -> int:
        self.tot += 1
        return self.tot
    
    def _build(self, l: int, r: int, init: List[int]) -> int:
        node = self._new_node()
        if l == r:
            self.val[node] = init[l]
        else:
            mid = (l + r) // 2
            self.left[node] = self._build(l, mid, init)
            self.right[node] = self._build(mid + 1, r, init)
        return node
    
    def _query(self, node: int, l: int, r: int, pos: int) -> int:
        """查询位置 pos 的值"""
        if l == r:
            return self.val[node]
        mid = (l + r) // 2
        if pos <= mid:
            return self._query(self.left[node], l, mid, pos)
        else:
            return self._query(self.right[node], mid + 1, r, pos)
    
    def _update(self, prev: int, l: int, r: int, pos: int, new_val: int) -> int:
        """更新位置 pos 的值，返回新节点"""
        node = self._new_node()
        if l == r:
            self.val[node] = new_val
        else:
            mid = (l + r) // 2
            if pos <= mid:
                self.left[node] = self._update(self.left[prev], l, mid, pos, new_val)
                self.right[node] = self.right[prev]
            else:
                self.left[node] = self.left[prev]
                self.right[node] = self._update(self.right[prev], mid + 1, r, pos, new_val)
        return node
    
    def _find(self, ver: int, x: int) -> int:
        """在版本 ver 中找 x 的根"""
        root = self.versions[ver]
        val = self._query(root, 0, self.n - 1, x)
        if val < 0:
            return x  # x 是根
        return self._find(ver, val)  # 递归查找父节点（不压缩路径）
    
    def find(self, ver: int, x: int) -> int:
        """查询版本 ver 中 x 的根"""
        return self._find(ver, x)
    
    def union(self, ver: int, x: int, y: int) -> int:
        """在版本 ver 的基础上合并 x 和 y，返回新版本号"""
        root_x = self._find(ver, x)
        root_y = self._find(ver, y)
        
        if root_x == root_y:
            # 已经在同一集合，创建相同版本
            self.versions.append(self.versions[ver])
            return len(self.versions) - 1
        
        root = self.versions[ver]
        rank_x = self._query(root, 0, self.n - 1, root_x)  # 负数
        rank_y = self._query(root, 0, self.n - 1, root_y)  # 负数
        
        # 按秩合并：小树挂到大树
        if rank_x > rank_y:  # |rank_x| < |rank_y|
            root_x, root_y = root_y, root_x
            rank_x, rank_y = rank_y, rank_x
        
        # root_x 挂到 root_y
        new_root = self._update(root, 0, self.n - 1, root_x, root_y)
        
        # 如果秩相同，root_y 的秩加 1
        if rank_x == rank_y:
            new_root = self._update(new_root, 0, self.n - 1, root_y, rank_y - 1)
        
        self.versions.append(new_root)
        return len(self.versions) - 1
    
    def same(self, ver: int, x: int, y: int) -> bool:
        """判断版本 ver 中 x 和 y 是否在同一集合"""
        return self._find(ver, x) == self._find(ver, y)
```

### 关键说明

1. **val 的含义**：
   - val < 0：节点是根，|val| 是秩
   - val >= 0：父节点编号

2. **不使用路径压缩**：
   - 保持树结构稳定
   - 单次查找 O(log n)

3. **按秩合并**：
   - 保证树高 O(log n)
   - 配合可持久化，单次操作 O(log² n)

---

## 方法二：撤销栈实现

如果不需要访问任意历史版本，只需要撤销最近的操作，可以用更简单的方法。

### 实现

```python
class UndoUnionFind:
    """支持撤销的并查集：基于栈"""
    
    def __init__(self, n: int):
        self.parent = list(range(n))
        self.rank = [1] * n
        self.stack = []  # 记录操作
    
    def find(self, x: int) -> int:
        """不使用路径压缩的查找"""
        while self.parent[x] != x:
            x = self.parent[x]
        return x
    
    def union(self, x: int, y: int) -> bool:
        """按秩合并，记录操作以便撤销"""
        root_x, root_y = self.find(x), self.find(y)
        
        if root_x == root_y:
            self.stack.append(None)  # 无效操作也要记录
            return False
        
        # 按秩合并
        if self.rank[root_x] > self.rank[root_y]:
            root_x, root_y = root_y, root_x
        
        # 记录操作前的状态
        self.stack.append((root_x, self.parent[root_x], self.rank[root_y]))
        
        # 执行合并
        self.parent[root_x] = root_y
        if self.rank[root_x] == self.rank[root_y]:
            self.rank[root_y] += 1
        
        return True
    
    def undo(self) -> None:
        """撤销最近一次 union"""
        if not self.stack:
            return
        
        op = self.stack.pop()
        if op is None:
            return  # 无效操作
        
        root_x, old_parent, old_rank = op
        self.rank[self.parent[root_x]] = old_rank
        self.parent[root_x] = old_parent
    
    def same(self, x: int, y: int) -> bool:
        return self.find(x) == self.find(y)
```

### 特点

- **空间**：O(n + 操作数)
- **时间**：union/undo 均为 O(log n)
- **限制**：只能按顺序撤销，不能访问任意历史版本

---

## 应用场景

### 场景 1：线段树分治

线段树分治需要在递归过程中添加和撤销边：

```python
def segment_tree_divide(edges, queries):
    """
    线段树分治模板
    每条边有一个有效时间区间 [l, r]
    需要回答每个时刻的查询
    """
    uf = UndoUnionFind(n)
    
    def divide(node, l, r, edge_list):
        # 添加当前节点的边
        added = 0
        for u, v in edge_list:
            if uf.union(u, v):
                added += 1
        
        if l == r:
            # 处理时刻 l 的查询
            process_query(l, uf)
        else:
            mid = (l + r) // 2
            divide(left_child, l, mid, left_edges)
            divide(right_child, mid + 1, r, right_edges)
        
        # 撤销添加的边
        for _ in range(added):
            uf.undo()
```

### 场景 2：回溯算法

在回溯过程中维护连通性：

```python
def backtrack_with_uf():
    uf = UndoUnionFind(n)
    
    def dfs(step):
        if step == target:
            # 使用 uf 判断当前状态
            check_solution(uf)
            return
        
        for edge in candidates:
            # 尝试添加边
            if uf.union(edge[0], edge[1]):
                dfs(step + 1)
                uf.undo()  # 撤销
    
    dfs(0)
```

### 场景 3：历史版本查询

在线回答历史版本的连通性查询：

```python
# 使用可持久化并查集
puf = PersistentUnionFind(n)

# 执行操作序列
versions = [0]
for u, v in operations:
    ver = puf.union(versions[-1], u, v)
    versions.append(ver)

# 回答历史查询
def query(time: int, x: int, y: int) -> bool:
    return puf.same(versions[time], x, y)
```

---

## 复杂度分析

### 可持久化并查集

| 操作 | 时间复杂度 | 空间复杂度 |
|------|-----------|-----------|
| find | O(log n) | O(1) |
| union | O(log² n) | O(log n) |

- 不使用路径压缩，树高 O(log n)
- 每次 find 需要 O(log n) 次数组访问
- 每次数组访问需要 O(log n)（线段树）

### 撤销栈并查集

| 操作 | 时间复杂度 | 空间复杂度 |
|------|-----------|-----------|
| find | O(log n) | O(1) |
| union | O(log n) | O(1) |
| undo | O(1) | O(1) |

---

## 常见错误

### 错误 1：使用路径压缩

```python
# 错误：路径压缩会修改多个节点
def find(self, x):
    if self.parent[x] != x:
        self.parent[x] = self.find(self.parent[x])
    return self.parent[x]

# 正确：不压缩路径
def find(self, x):
    while self.parent[x] != x:
        x = self.parent[x]
    return x
```

### 错误 2：忘记记录无效操作

```python
# 错误：只记录有效合并
def union(self, x, y):
    if root_x == root_y:
        return False
    # ... 记录并执行

# 正确：无效操作也要记录
def union(self, x, y):
    if root_x == root_y:
        self.stack.append(None)  # 重要！
        return False
```

### 错误 3：撤销顺序错误

撤销必须按 LIFO 顺序，否则状态不一致。

---

## 本章小结

本章学习了可持久化并查集：

1. **核心挑战**
   - 路径压缩破坏可持久化
   - 解决方案：只用按秩合并

2. **两种实现**
   - 可持久化数组：支持任意历史版本
   - 撤销栈：只支持顺序撤销

3. **复杂度**
   - 可持久化版本：O(log² n) 每操作
   - 撤销栈版本：O(log n) 每操作

4. **应用场景**
   - 线段树分治
   - 回溯算法
   - 历史版本查询

下一章我们将学习**可持久化字典树**，用于处理区间异或问题。
