# CDQ 分治

**CDQ 分治（CDQ Divide and Conquer）**是一种处理偏序问题的分治技术。它的核心思想是：**将"动态"问题转化为"静态"问题，用分治消除一维偏序**。

---

## 问题背景

### 偏序问题

给定 n 个元素，每个元素有 d 个属性 (a₁, a₂, ..., aₓ)，求满足某种偏序关系的元素对数量。

| 维度 | 问题示例 | 经典解法 |
|------|---------|---------|
| 1D | 逆序对 | 归并排序 |
| 2D | 二维偏序 | 树状数组 |
| 3D | 三维偏序 | CDQ 分治 |
| 4D+ | 高维偏序 | CDQ 嵌套 / K-D 树 |

### CDQ 分治的优势

- 将在线问题转化为离线处理
- 每层分治消除一维
- 代码简洁，常数小

---

## 核心思想

对于三维偏序 (a, b, c)：

1. **按 a 排序**：消除第一维
2. **分治处理**：
   - 递归处理左半部分
   - 递归处理右半部分
   - **合并**：统计左半部分对右半部分的贡献（此时 a 已有序）
3. **合并时按 b 排序**：使用树状数组处理第三维 c

---

## 三维偏序模板

### 问题定义

给定 n 个点 (a, b, c)，对每个点 i，求满足 a_j ≤ a_i, b_j ≤ b_i, c_j ≤ c_i 的点 j 的数量。

```python
from typing import List, Tuple

class CDQ3D:
    """三维偏序 CDQ 分治"""
    
    def __init__(self, points: List[Tuple[int, int, int]]):
        """
        points: [(a, b, c), ...] 三维点
        """
        self.n = len(points)
        
        # 离散化 c 坐标
        c_vals = sorted(set(p[2] for p in points))
        self.c_map = {v: i + 1 for i, v in enumerate(c_vals)}
        self.c_size = len(c_vals)
        
        # 树状数组
        self.bit = [0] * (self.c_size + 2)
        
        # 按 a 排序，相同则按 b、c 排序
        self.points = [(a, b, self.c_map[c], i) for i, (a, b, c) in enumerate(points)]
        self.points.sort()
        
        # 去重处理（相同的点需要特殊处理）
        self.count = [0] * self.n  # 重复点计数
        self.result = [0] * self.n  # 每个原始点的答案
        
        self._dedup()
        self._cdq(0, len(self.unique_points) - 1)
        self._restore()
    
    def _dedup(self) -> None:
        """去重并记录重复次数"""
        self.unique_points = []
        i = 0
        while i < self.n:
            j = i
            while j < self.n and self.points[j][:3] == self.points[i][:3]:
                j += 1
            # points[i:j] 是相同的点
            cnt = j - i
            for k in range(i, j):
                self.count[self.points[k][3]] = cnt - 1  # 不包含自己
            self.unique_points.append((*self.points[i][:3], self.points[i][3], cnt))
            i = j
    
    def _lowbit(self, x: int) -> int:
        return x & (-x)
    
    def _update(self, i: int, delta: int) -> None:
        while i <= self.c_size:
            self.bit[i] += delta
            i += self._lowbit(i)
    
    def _query(self, i: int) -> int:
        s = 0
        while i > 0:
            s += self.bit[i]
            i -= self._lowbit(i)
        return s
    
    def _cdq(self, l: int, r: int) -> None:
        """CDQ 分治主函数"""
        if l >= r:
            return
        
        mid = (l + r) // 2
        self._cdq(l, mid)
        self._cdq(mid + 1, r)
        
        # 合并：统计左半部分对右半部分的贡献
        self._merge(l, mid, r)
    
    def _merge(self, l: int, mid: int, r: int) -> None:
        """合并左右两部分"""
        left = self.unique_points[l:mid+1]
        right = self.unique_points[mid+1:r+1]
        
        # 按 b 排序
        left.sort(key=lambda x: (x[1], x[2]))
        right.sort(key=lambda x: (x[1], x[2]))
        
        j = 0
        modified = []  # 记录修改过的位置，用于清空
        
        for (a, b, c, idx, cnt) in right:
            # 将所有 b_j <= b 的左半点加入树状数组
            while j < len(left) and left[j][1] <= b:
                self._update(left[j][2], left[j][4])
                modified.append(left[j][2])
                j += 1
            
            # 查询 c_j <= c 的数量
            self.result[idx] += self._query(c)
        
        # 清空树状数组（只清空修改过的位置）
        for c_val in modified:
            pos = c_val
            while pos <= self.c_size:
                self.bit[pos] = 0
                pos += self._lowbit(pos)
    
    def _restore(self) -> None:
        """加上重复点的贡献"""
        for i in range(self.n):
            self.result[i] += self.count[i]
    
    def get_results(self) -> List[int]:
        """返回每个点的答案"""
        return self.result
```

---

## 执行过程示例

点集：[(1,2,3), (1,3,2), (2,2,2), (2,3,1), (3,1,1)]

1. **按 a 排序**：
   [(1,2,3), (1,3,2), (2,2,2), (2,3,1), (3,1,1)]

2. **分治**：
   - 左半：[(1,2,3), (1,3,2)]
   - 右半：[(2,2,2), (2,3,1), (3,1,1)]

3. **合并时统计**：
   - 对于 (2,2,2)：左边 b≤2 且 c≤2 的点数
   - 对于 (2,3,1)：左边 b≤3 且 c≤1 的点数

---

## 应用实例

### 问题 1：动态逆序对

给定数组，支持：
- 修改某个位置的值
- 查询区间逆序对数

```python
class DynamicInversions:
    """
    动态逆序对（CDQ 分治 + 离线）
    
    核心思想：
    1. 将所有操作（修改和查询）离线收集
    2. 每个修改拆分为：删除旧值 + 插入新值
    3. 转化为三元组 (时间, 位置, 值) 的偏序问题
    4. 使用 CDQ 分治处理
    
    注意：这是一个复杂问题的框架示例，
    完整实现需要根据具体查询类型调整
    """
    
    def __init__(self, arr: List[int], operations: List[tuple]):
        self.arr = arr[:]
        self.events = []  # (time, pos, val, type, query_id)
        self.query_results = {}
        
        # 将初始数组转为插入事件
        for i, v in enumerate(arr):
            self.events.append((0, i, v, 'insert', -1))
        
        # 处理操作序列
        time = 1
        query_id = 0
        for op in operations:
            if op[0] == 'update':
                _, pos, new_val = op
                old_val = self.arr[pos]
                self.events.append((time, pos, old_val, 'delete', -1))
                self.events.append((time, pos, new_val, 'insert', -1))
                self.arr[pos] = new_val
                time += 1
            elif op[0] == 'query':
                _, l, r = op
                self.events.append((time, l, r, 'query', query_id))
                query_id += 1
                time += 1
```

### 问题 2：三维偏序计数

```python
def count_3d_dominance(points: List[Tuple[int, int, int]]) -> int:
    """统计所有满足 a_i < a_j, b_i < b_j, c_i < c_j 的点对 (i, j)"""
    cdq = CDQ3D(points)
    results = cdq.get_results()
    return sum(results)
```

---

## CDQ 分治处理动态问题

将修改和查询都视为"事件"，按时间排序后分治。

### 修改-查询模型

```python
class CDQDynamic:
    """CDQ 处理动态修改查询"""
    
    def process(self, events: List[tuple]) -> List[int]:
        """
        events: [(time, type, data), ...]
        type: 0=修改, 1=查询
        
        分治思想：
        - 左半部分的修改 → 右半部分的查询
        """
        def cdq(l: int, r: int) -> None:
            if l >= r:
                return
            
            mid = (l + r) // 2
            cdq(l, mid)
            cdq(mid + 1, r)
            
            # 左边的修改对右边查询的贡献
            modifications = [e for e in events[l:mid+1] if e[1] == 0]
            queries = [e for e in events[mid+1:r+1] if e[1] == 1]
            
            # 用数据结构（如树状数组）处理
            self._calc_contribution(modifications, queries)
        
        cdq(0, len(events) - 1)
```

---

## 复杂度分析

| 问题 | 时间复杂度 | 空间复杂度 |
|------|-----------|-----------|
| 三维偏序 | O(n log² n) | O(n) |
| 四维偏序 | O(n log³ n) | O(n) |
| 动态逆序对 | O(q log² n) | O(n + q) |

**分析**：
- 分治层数：O(log n)
- 每层合并：O(n log n)（树状数组操作）
- 总复杂度：O(n log² n)

---

## 与其他方法对比

| 方法 | 适用场景 | 优势 | 劣势 |
|------|---------|------|------|
| CDQ 分治 | 离线高维偏序 | 代码简洁 | 必须离线 |
| 树套树 | 在线高维偏序 | 支持在线 | 常数大 |
| K-D 树 | 多维最近邻 | 灵活 | 最坏情况差 |

---

## 常见错误

1. **忘记去重**
   ```python
   # 错误：相同点未特殊处理
   
   # 正确：相同点的贡献需要单独计算
   ```

2. **树状数组未清空**
   ```python
   # 错误：直接 self.bit = [0] * n（太慢）
   
   # 正确：只清空修改过的位置
   for pos in modified:
       self._clear(pos)
   ```

3. **排序不稳定**
   ```python
   # 错误：排序时相同元素顺序变化
   
   # 正确：使用稳定排序或加入原始索引
   ```

---

## 本章小结

本章介绍了 CDQ 分治：

1. **核心思想**
   - 分治消除一维
   - 左半修改 → 右半查询

2. **经典应用**
   - 三维偏序
   - 动态逆序对
   - 离线查询优化

3. **实现要点**
   - 按第一维排序
   - 合并时按第二维双指针
   - 第三维用数据结构

4. **复杂度**
   - 三维偏序：O(n log² n)

下一章我们将学习**整体二分**技术。
