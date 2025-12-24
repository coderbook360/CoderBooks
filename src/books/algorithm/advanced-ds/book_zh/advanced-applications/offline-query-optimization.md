# 离线查询优化

**离线查询优化**是指当所有查询预先给定时，通过重新排列查询顺序或合并处理来提高效率的技术。

---

## 离线 vs 在线

| 特性 | 离线查询 | 在线查询 |
|------|---------|---------|
| 查询已知 | 所有查询预先给定 | 查询逐个到来 |
| 顺序要求 | 可以任意重排 | 必须按序回答 |
| 优化空间 | 大（可排序、合并） | 小（必须即时响应） |

---

## 技术一：莫队算法

通过**分块排序查询**来优化区间查询。

### 基本莫队

```python
from typing import List, Tuple
from math import isqrt
from collections import defaultdict

def mo_algorithm(arr: List[int], queries: List[Tuple[int, int]]) -> List[int]:
    """
    莫队算法：回答多个区间内的不同元素个数
    """
    n = len(arr)
    q = len(queries)
    block_size = max(1, isqrt(n))
    
    # 给查询排序：按左端点所在块，同块按右端点
    indexed_queries = [(l, r, i) for i, (l, r) in enumerate(queries)]
    indexed_queries.sort(key=lambda x: (x[0] // block_size, x[1]))
    
    # 当前区间状态
    count = defaultdict(int)
    distinct = 0
    cur_l, cur_r = 0, -1
    
    def add(idx: int) -> None:
        nonlocal distinct
        if count[arr[idx]] == 0:
            distinct += 1
        count[arr[idx]] += 1
    
    def remove(idx: int) -> None:
        nonlocal distinct
        count[arr[idx]] -= 1
        if count[arr[idx]] == 0:
            distinct -= 1
    
    answers = [0] * q
    
    for l, r, idx in indexed_queries:
        # 扩展/收缩当前区间到 [l, r]
        while cur_r < r:
            cur_r += 1
            add(cur_r)
        while cur_l > l:
            cur_l -= 1
            add(cur_l)
        while cur_r > r:
            remove(cur_r)
            cur_r -= 1
        while cur_l < l:
            remove(cur_l)
            cur_l += 1
        
        answers[idx] = distinct
    
    return answers
```

**复杂度**：O((n + q) × √n)

### 带修莫队

支持**单点修改**的莫队算法。

```python
def mo_with_modifications(arr: List[int], 
                          modifications: List[Tuple[int, int]],
                          queries: List[Tuple[int, int, int]]) -> List[int]:
    """
    带修莫队
    modifications: [(pos, new_val), ...]
    queries: [(l, r, time), ...] time 表示查询时有多少个修改已执行
    """
    n = len(arr)
    q = len(queries)
    m = len(modifications)
    
    # 块大小为 n^(2/3)
    block_size = max(1, int(n ** (2/3)))
    
    # 按 (l/块, r/块, time) 排序
    indexed_queries = [(l, r, t, i) for i, (l, r, t) in enumerate(queries)]
    indexed_queries.sort(key=lambda x: (x[0] // block_size, 
                                        x[1] // block_size, 
                                        x[2]))
    
    # ... 类似基本莫队，增加时间维度的移动
    pass
```

**复杂度**：O(n^(5/3))

---

## 技术二：查询分块

将查询按某种属性分块处理。

### 按时间分块（根号重建）

```python
class SqrtDecomposition:
    """
    根号重建：每 √q 次修改后重建数据结构
    """
    
    def __init__(self, arr: List[int]):
        self.arr = arr[:]
        self.pending = []  # 待处理的修改
        self.block_size = isqrt(len(arr))
        self._rebuild()
    
    def _rebuild(self) -> None:
        """重建数据结构"""
        # 将 pending 中的修改应用到 arr
        for pos, val in self.pending:
            self.arr[pos] = val
        self.pending.clear()
        
        # 重建辅助结构（如前缀和）
        self.prefix = [0] * (len(self.arr) + 1)
        for i, v in enumerate(self.arr):
            self.prefix[i + 1] = self.prefix[i] + v
    
    def update(self, pos: int, val: int) -> None:
        self.pending.append((pos, val))
        if len(self.pending) >= self.block_size:
            self._rebuild()
    
    def query(self, l: int, r: int) -> int:
        # 基础答案
        ans = self.prefix[r + 1] - self.prefix[l]
        
        # 加上 pending 中的修改对答案的影响
        for pos, val in self.pending:
            if l <= pos <= r:
                ans += val - self.arr[pos]
        
        return ans
```

---

## 技术三：按端点排序

按查询端点排序，配合单调数据结构。

### 右端点排序 + 树状数组

```python
def count_distinct_in_ranges(arr: List[int], queries: List[Tuple[int, int]]) -> List[int]:
    """
    区间内不同元素个数（离线 + 树状数组）
    """
    n = len(arr)
    q = len(queries)
    
    # 按右端点排序
    indexed_queries = [(r, l, i) for i, (l, r) in enumerate(queries)]
    indexed_queries.sort()
    
    # last[v] = v 最后一次出现的位置
    last = {}
    
    # 树状数组：bit[i] 表示位置 i 是否是某元素的最后一次出现
    bit = [0] * (n + 1)
    
    def update(i: int, delta: int) -> None:
        while i <= n:
            bit[i] += delta
            i += i & (-i)
    
    def query(i: int) -> int:
        s = 0
        while i > 0:
            s += bit[i]
            i -= i & (-i)
        return s
    
    answers = [0] * q
    j = 0
    
    for r, l, idx in indexed_queries:
        # 处理 arr[j..r]
        while j <= r:
            v = arr[j]
            if v in last:
                update(last[v] + 1, -1)  # 移除旧位置
            last[v] = j
            update(j + 1, 1)  # 添加新位置
            j += 1
        
        # 查询 [l, r] 内的不同元素数
        answers[idx] = query(r + 1) - query(l)
    
    return answers
```

**复杂度**：O((n + q) log n)

---

## 技术四：扫描线

将查询转化为事件，按某一维度扫描。

### 区间加 + 单点查询（离线）

```python
def offline_range_add_point_query(n: int,
                                  updates: List[Tuple[int, int, int]],
                                  queries: List[Tuple[int, int]]) -> List[int]:
    """
    updates: [(l, r, delta), ...] 区间 [l, r] 加 delta
    queries: [(time, pos), ...] 在 time 个更新后查询 pos 的值
    """
    # 将更新拆分为事件
    events = []  # (time, type, ...)
    
    for i, (l, r, delta) in enumerate(updates):
        events.append((i, 'update_start', l, delta))
        events.append((i, 'update_end', r, delta))
    
    for i, (time, pos) in enumerate(queries):
        events.append((time, 'query', pos, i))
    
    # 按时间排序处理
    events.sort()
    
    # 使用差分数组或树状数组
    diff = [0] * (n + 2)
    answers = [0] * len(queries)
    
    for event in events:
        if event[1] == 'update_start':
            diff[event[2]] += event[3]
        elif event[1] == 'update_end':
            diff[event[2] + 1] -= event[3]
        else:  # query
            pos, idx = event[2], event[3]
            # 计算前缀和
            answers[idx] = sum(diff[:pos + 1])
    
    return answers
```

---

## 技术五：离线 LCA

将 LCA 查询离线处理，使用 Tarjan 算法。

```python
def offline_lca(n: int, edges: List[Tuple[int, int]], 
                queries: List[Tuple[int, int]], root: int = 0) -> List[int]:
    """
    离线 LCA 查询（Tarjan 算法）
    """
    # 建图
    adj = [[] for _ in range(n)]
    for u, v in edges:
        adj[u].append(v)
        adj[v].append(u)
    
    # 查询分组
    query_map = [[] for _ in range(n)]
    for i, (u, v) in enumerate(queries):
        query_map[u].append((v, i))
        query_map[v].append((u, i))
    
    # 并查集
    parent = list(range(n))
    rank = [0] * n
    
    def find(x: int) -> int:
        if parent[x] != x:
            parent[x] = find(parent[x])
        return parent[x]
    
    def union(x: int, y: int) -> None:
        px, py = find(x), find(y)
        if px != py:
            if rank[px] < rank[py]:
                px, py = py, px
            parent[py] = px
            if rank[px] == rank[py]:
                rank[px] += 1
    
    visited = [False] * n
    ancestor = list(range(n))
    answers = [0] * len(queries)
    
    def tarjan(u: int, par: int) -> None:
        visited[u] = True
        
        for v in adj[u]:
            if v != par:
                tarjan(v, u)
                union(u, v)
                ancestor[find(u)] = u
        
        # 回答以 u 为端点的查询
        for v, idx in query_map[u]:
            if visited[v]:
                answers[idx] = ancestor[find(v)]
    
    tarjan(root, -1)
    return answers
```

---

## 方法对比

| 技术 | 适用场景 | 时间复杂度 | 特点 |
|------|---------|-----------|------|
| 莫队 | 区间统计 | O((n+q)√n) | 通用性强 |
| 带修莫队 | 区间统计 + 修改 | O(n^(5/3)) | 支持单点修改 |
| 右端点排序 | 区间不同元素 | O((n+q)log n) | 需要特定性质 |
| 扫描线 | 二维问题 | O(n log n) | 降维处理 |
| Tarjan LCA | 树上 LCA | O(n + q) | 离线最优 |

---

## 应用实例

### 问题 1：区间众数

```python
def range_mode(arr: List[int], queries: List[Tuple[int, int]]) -> List[int]:
    """区间众数（出现次数最多的元素）"""
    # 莫队 + 分块维护众数
    pass
```

### 问题 2：历史版本查询

```python
def version_query(initial: List[int],
                  operations: List[tuple]) -> List[int]:
    """
    operations: [('update', pos, val), ('query', version, pos), ...]
    离线处理：将所有版本的状态预先计算
    """
    pass
```

---

## 常见错误

1. **莫队块大小错误**
   ```python
   # 错误：块大小太小或太大
   block_size = n // 100
   
   # 正确：使用 √n
   block_size = isqrt(n)
   ```

2. **忘记恢复查询顺序**
   ```python
   # 错误：直接返回答案
   return answers
   
   # 正确：按原始索引返回
   return [ans for _, ans in sorted(zip(indices, answers))]
   ```

3. **扫描线事件顺序**
   ```python
   # 错误：同一时间点事件顺序不对
   
   # 正确：更新在查询之前
   events.sort(key=lambda e: (e.time, e.type))  # type: 0=更新, 1=查询
   ```

---

## 本章小结

本章介绍了离线查询优化技术：

1. **莫队算法**
   - 通过排序减少指针移动
   - O((n + q)√n) 复杂度

2. **查询分块**
   - 根号重建
   - 按端点排序

3. **扫描线**
   - 将多维问题降维
   - 事件驱动处理

4. **选择建议**
   - 区间统计 → 莫队
   - 区间不同元素 → 右端点排序 + BIT
   - 二维问题 → 扫描线
   - 树上 LCA → Tarjan 离线

下一章我们将学习**在线查询优化**技术。
