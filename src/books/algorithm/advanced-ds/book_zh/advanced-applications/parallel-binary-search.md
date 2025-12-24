# 整体二分

**整体二分（Parallel Binary Search）**是一种将多个二分查询合并处理的离线技术。当每个查询都需要独立二分时，整体二分可以将总复杂度从 O(q × n log n) 优化到 O((n + q) log n log V)。

---

## 问题背景

### 典型问题：区间第 K 小

给定数组 arr[1..n]，q 次查询，每次求区间 [l, r] 的第 k 小元素。

**朴素方法**：每次查询二分答案，O(q × n log V)。

**整体二分**：所有查询一起二分，O((n + q) log V)。

---

## 核心思想

1. 将所有查询放在一起
2. 对**答案值域** [lo, hi] 进行二分
3. 根据 mid 将查询分成两组：
   - 答案 ≤ mid 的查询 → 递归左半
   - 答案 > mid 的查询 → 递归右半
4. 同时处理相关的修改操作

### 关键洞察

所有查询共享同一个值域，可以**并行**地对值域二分。

---

## 算法模板

### 静态区间第 K 小

```python
from typing import List, Tuple

class ParallelBinarySearch:
    """整体二分模板"""
    
    def __init__(self, arr: List[int], queries: List[Tuple[int, int, int]]):
        """
        arr: 原数组 (1-indexed)
        queries: [(l, r, k), ...] 查询区间 [l, r] 的第 k 小
        """
        self.n = len(arr)
        self.q = len(queries)
        
        # 离散化
        vals = sorted(set(arr))
        self.val_to_rank = {v: i for i, v in enumerate(vals)}
        self.rank_to_val = vals
        self.V = len(vals)
        
        # 将数组元素转为"插入事件"
        # 事件格式：(value_rank, position, type)
        # type: 0 = 插入, 1 = 查询
        self.events = []
        for i, v in enumerate(arr):
            self.events.append((self.val_to_rank[v], i + 1, 0))  # 1-indexed
        
        # 查询格式：(l, r, k, query_id)
        self.queries = [(l, r, k, i) for i, (l, r, k) in enumerate(queries)]
        
        # 树状数组（用于统计区间内元素个数）
        self.bit = [0] * (self.n + 2)
        
        # 答案
        self.answers = [0] * self.q
        
        # 执行整体二分
        self._solve(0, self.V - 1, self.events, self.queries)
    
    def _lowbit(self, x: int) -> int:
        return x & (-x)
    
    def _update(self, i: int, delta: int) -> None:
        while i <= self.n:
            self.bit[i] += delta
            i += self._lowbit(i)
    
    def _query(self, i: int) -> int:
        s = 0
        while i > 0:
            s += self.bit[i]
            i -= self._lowbit(i)
        return s
    
    def _range_query(self, l: int, r: int) -> int:
        return self._query(r) - self._query(l - 1)
    
    def _solve(self, lo: int, hi: int, events: list, queries: list) -> None:
        """整体二分主函数"""
        if not queries:
            return
        
        if lo == hi:
            # 值域收敛，所有查询的答案都是 lo
            for l, r, k, qid in queries:
                self.answers[qid] = self.rank_to_val[lo]
            return
        
        mid = (lo + hi) // 2
        
        # 分离事件和查询
        left_events, right_events = [], []
        left_queries, right_queries = [], []
        
        # 处理值 <= mid 的插入事件
        for val_rank, pos, etype in events:
            if val_rank <= mid:
                self._update(pos, 1)
                left_events.append((val_rank, pos, etype))
            else:
                right_events.append((val_rank, pos, etype))
        
        # 根据区间内 <= mid 的元素个数，分离查询
        for l, r, k, qid in queries:
            cnt = self._range_query(l, r)
            if cnt >= k:
                # 答案 <= mid
                left_queries.append((l, r, k, qid))
            else:
                # 答案 > mid，需要找第 k - cnt 小
                right_queries.append((l, r, k - cnt, qid))
        
        # 清空树状数组（只清空修改过的位置）
        for val_rank, pos, etype in events:
            if val_rank <= mid:
                self._update(pos, -1)
        
        # 递归处理
        self._solve(lo, mid, left_events, left_queries)
        self._solve(mid + 1, hi, right_events, right_queries)
    
    def get_answers(self) -> List[int]:
        return self.answers
```

---

## 执行过程示例

数组：[3, 1, 4, 1, 5]

查询：[(1, 3, 2), (2, 5, 3)]（区间第 k 小）

离散化后值域：[0, 1, 2, 3]（对应 1, 3, 4, 5）

**第一轮**：mid = 1

- 插入 arr[1]=3 → rank 1 ≤ mid，加入 BIT
- 插入 arr[2]=1 → rank 0 ≤ mid，加入 BIT
- 插入 arr[3]=4 → rank 2 > mid
- 插入 arr[4]=1 → rank 0 ≤ mid，加入 BIT
- 插入 arr[5]=5 → rank 3 > mid

查询分离：
- Q1(1,3,2)：区间 [1,3] 内 ≤ mid 的元素数 = 2 ≥ 2 → 左边
- Q2(2,5,3)：区间 [2,5] 内 ≤ mid 的元素数 = 2 < 3 → 右边，k 更新为 3-2=1

递归左边 [0,1]，右边 [2,3]...

---

## 动态版本

支持插入/删除元素后查询区间第 K 小。

```python
class DynamicKth:
    """带修改的区间第 K 小（整体二分）"""
    
    def __init__(self, arr: List[int], operations: List[tuple]):
        """
        operations: [('query', l, r, k), ('update', pos, val), ...]
        """
        # 将操作按时间排序
        # 修改操作拆分为：删除旧值 + 插入新值
        # 统一用整体二分处理
        pass
    
    def _solve_with_time(self, lo, hi, events, queries):
        """
        events: (time, val_rank, pos, delta)
        delta: +1 表示插入, -1 表示删除
        """
        if not queries:
            return
        
        if lo == hi:
            for q in queries:
                self.answers[q.id] = self.rank_to_val[lo]
            return
        
        mid = (lo + hi) // 2
        
        # 按时间顺序处理事件
        left_events, right_events = [], []
        
        for time, val_rank, pos, delta in events:
            if val_rank <= mid:
                self._update(pos, delta)
                left_events.append((time, val_rank, pos, delta))
            else:
                right_events.append((time, val_rank, pos, delta))
        
        # 分离查询（同上）
        # ...
        
        # 清空并递归
        for time, val_rank, pos, delta in events:
            if val_rank <= mid:
                self._update(pos, -delta)
        
        self._solve_with_time(lo, mid, left_events, left_queries)
        self._solve_with_time(mid + 1, hi, right_events, right_queries)
```

---

## 应用实例

### 问题 1：最小操作次数使区间满足条件

求使区间 [l, r] 中所有元素 ≤ x 的最小 x。

```python
def min_x_for_condition(arr, queries):
    """
    queries: [(l, r, cnt)] 
    求最小的 x，使得区间 [l,r] 中 <= x 的元素至少有 cnt 个
    """
    # 等价于区间第 cnt 小
    pbs = ParallelBinarySearch(arr, queries)
    return pbs.get_answers()
```

### 问题 2：时间线上的第 K 大

```python
def timeline_kth(events, queries):
    """
    events: [(time, value)] 在 time 时刻插入 value
    queries: [(query_time, k)] 在 query_time 时刻查询第 k 大
    """
    # 整体二分 + 按时间戳排序
    pass
```

---

## 复杂度分析

| 操作 | 时间复杂度 |
|------|-----------|
| 静态区间第 K 小 | O((n + q) log V × log n) |
| 动态区间第 K 小 | O((n + q) log V × log n) |

**分析**：
- 二分层数：O(log V)
- 每层处理：O((n + q) log n)（树状数组操作）

---

## 与主席树对比

| 特性 | 整体二分 | 主席树 |
|------|---------|-------|
| 查询类型 | 离线 | 在线 |
| 空间复杂度 | O(n) | O(n log n) |
| 时间复杂度 | O((n+q) log V log n) | O(q log n) |
| 支持修改 | 容易扩展 | 需要树套树 |
| 实现难度 | 较简单 | 较复杂 |

**选择建议**：
- 必须在线 → 主席树
- 需要修改且可离线 → 整体二分
- 内存紧张 → 整体二分

---

## 常见错误

1. **值域没有离散化**
   ```python
   # 错误：直接用原始值
   self._solve(min(arr), max(arr), ...)
   
   # 正确：离散化后用 rank
   self._solve(0, V - 1, ...)
   ```

2. **k 值未正确传递**
   ```python
   # 错误：右边查询的 k 没有减去左边的计数
   right_queries.append((l, r, k, qid))
   
   # 正确：减去已统计的数量
   right_queries.append((l, r, k - cnt, qid))
   ```

3. **树状数组清空不完整**
   ```python
   # 错误：每次 memset 全部清空
   
   # 正确：只撤销本轮的修改
   for event in left_events:
       self._update(event.pos, -1)
   ```

---

## 本章小结

本章介绍了整体二分：

1. **核心思想**
   - 多个查询共享值域
   - 对值域并行二分

2. **算法流程**
   - 按 mid 分离事件和查询
   - 用数据结构统计
   - 递归处理两边

3. **应用场景**
   - 静态区间第 K 小
   - 动态区间第 K 小
   - 时间线查询

4. **复杂度**
   - O((n + q) log V × log n)

下一章我们将学习 **K-D 树**。
