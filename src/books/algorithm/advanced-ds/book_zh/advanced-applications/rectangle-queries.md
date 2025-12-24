# 矩形区域查询

**矩形区域查询**是二维空间中最常见的查询类型。本章综合介绍多种处理矩形查询的技术，并分析它们的适用场景。

---

## 问题分类

| 查询类型 | 描述 | 典型问题 |
|---------|------|---------|
| 静态点 + 矩形查询 | 点不变，查询落在矩形内的点 | 范围计数 |
| 动态点 + 矩形查询 | 点可增删，查询矩形内信息 | 动态范围和 |
| 矩形修改 + 点查询 | 矩形区域增加值，查询单点 | 二维差分 |
| 矩形修改 + 矩形查询 | 矩形区域修改，矩形区域查询 | 二维线段树 |

---

## 方法一：二维前缀和

适用于**静态数组的矩形和查询**。

```python
from typing import List

class Prefix2D:
    """二维前缀和"""
    
    def __init__(self, matrix: List[List[int]]):
        if not matrix or not matrix[0]:
            self.prefix = [[0]]
            return
        
        m, n = len(matrix), len(matrix[0])
        self.prefix = [[0] * (n + 1) for _ in range(m + 1)]
        
        for i in range(1, m + 1):
            for j in range(1, n + 1):
                self.prefix[i][j] = (matrix[i-1][j-1] 
                                     + self.prefix[i-1][j]
                                     + self.prefix[i][j-1]
                                     - self.prefix[i-1][j-1])
    
    def query(self, r1: int, c1: int, r2: int, c2: int) -> int:
        """查询矩形 [r1, c1] 到 [r2, c2] 的和（0-indexed）"""
        r1, c1, r2, c2 = r1 + 1, c1 + 1, r2 + 1, c2 + 1
        return (self.prefix[r2][c2]
                - self.prefix[r1-1][c2]
                - self.prefix[r2][c1-1]
                + self.prefix[r1-1][c1-1])
```

**复杂度**：
- 预处理：O(mn)
- 查询：O(1)

---

## 方法二：二维树状数组

适用于**动态单点修改 + 矩形和查询**。

```python
class BIT2D:
    """二维树状数组"""
    
    def __init__(self, m: int, n: int):
        self.m = m
        self.n = n
        self.tree = [[0] * (n + 1) for _ in range(m + 1)]
    
    def _lowbit(self, x: int) -> int:
        return x & (-x)
    
    def update(self, x: int, y: int, delta: int) -> None:
        """单点修改 (x, y) 增加 delta"""
        i = x + 1
        while i <= self.m:
            j = y + 1
            while j <= self.n:
                self.tree[i][j] += delta
                j += self._lowbit(j)
            i += self._lowbit(i)
    
    def _prefix(self, x: int, y: int) -> int:
        """查询 [0, x] × [0, y] 的和"""
        s = 0
        i = x + 1
        while i > 0:
            j = y + 1
            while j > 0:
                s += self.tree[i][j]
                j -= self._lowbit(j)
            i -= self._lowbit(i)
        return s
    
    def query(self, r1: int, c1: int, r2: int, c2: int) -> int:
        """查询矩形和"""
        return (self._prefix(r2, c2)
                - self._prefix(r1 - 1, c2)
                - self._prefix(r2, c1 - 1)
                + self._prefix(r1 - 1, c1 - 1))
```

**复杂度**：
- 修改：O(log m × log n)
- 查询：O(log m × log n)

---

## 方法三：二维线段树

适用于**矩形修改 + 矩形查询**。

```python
class SegTree2D:
    """二维线段树（线段树套线段树）"""
    
    def __init__(self, m: int, n: int):
        self.m = m
        self.n = n
        # 外层是 x 方向的线段树，每个节点是一棵 y 方向的线段树
        self.tree = [[0] * (4 * n) for _ in range(4 * m)]
    
    def update(self, x: int, y: int, val: int) -> None:
        """单点更新"""
        self._update_x(1, 0, self.m - 1, x, y, val)
    
    def _update_x(self, node: int, lx: int, rx: int, x: int, y: int, val: int) -> None:
        if lx == rx:
            self._update_y(node, 1, 0, self.n - 1, y, val)
            return
        
        mid = (lx + rx) // 2
        if x <= mid:
            self._update_x(2 * node, lx, mid, x, y, val)
        else:
            self._update_x(2 * node + 1, mid + 1, rx, x, y, val)
        
        # 合并左右子树对应位置
        self._merge_y(node, 2 * node, 2 * node + 1, 1, 0, self.n - 1, y)
    
    def _update_y(self, x_node: int, node: int, ly: int, ry: int, y: int, val: int) -> None:
        if ly == ry:
            self.tree[x_node][node] = val
            return
        
        mid = (ly + ry) // 2
        if y <= mid:
            self._update_y(x_node, 2 * node, ly, mid, y, val)
        else:
            self._update_y(x_node, 2 * node + 1, mid + 1, ry, y, val)
        
        self.tree[x_node][node] = (self.tree[x_node][2 * node] 
                                   + self.tree[x_node][2 * node + 1])
    
    def _merge_y(self, node: int, left: int, right: int, 
                 y_node: int, ly: int, ry: int, y: int) -> None:
        if ly == ry:
            self.tree[node][y_node] = self.tree[left][y_node] + self.tree[right][y_node]
            return
        
        mid = (ly + ry) // 2
        if y <= mid:
            self._merge_y(node, left, right, 2 * y_node, ly, mid, y)
        else:
            self._merge_y(node, left, right, 2 * y_node + 1, mid + 1, ry, y)
        
        self.tree[node][y_node] = (self.tree[node][2 * y_node] 
                                   + self.tree[node][2 * y_node + 1])
    
    def query(self, x1: int, y1: int, x2: int, y2: int) -> int:
        """矩形查询"""
        return self._query_x(1, 0, self.m - 1, x1, x2, y1, y2)
    
    def _query_x(self, node: int, lx: int, rx: int, 
                 x1: int, x2: int, y1: int, y2: int) -> int:
        if x1 > rx or x2 < lx:
            return 0
        if x1 <= lx and rx <= x2:
            return self._query_y(node, 1, 0, self.n - 1, y1, y2)
        
        mid = (lx + rx) // 2
        return (self._query_x(2 * node, lx, mid, x1, x2, y1, y2) +
                self._query_x(2 * node + 1, mid + 1, rx, x1, x2, y1, y2))
    
    def _query_y(self, x_node: int, node: int, ly: int, ry: int, y1: int, y2: int) -> int:
        if y1 > ry or y2 < ly:
            return 0
        if y1 <= ly and ry <= y2:
            return self.tree[x_node][node]
        
        mid = (ly + ry) // 2
        return (self._query_y(x_node, 2 * node, ly, mid, y1, y2) +
                self._query_y(x_node, 2 * node + 1, mid + 1, ry, y1, y2))
```

**复杂度**：
- 修改：O(log m × log n)
- 查询：O(log m × log n)
- 空间：O(mn) 或动态开点 O(q log m × log n)

---

## 方法四：扫描线

适用于**离线矩形面积并/覆盖问题**。

```python
from typing import List, Tuple
from collections import defaultdict

def rectangle_area_union(rectangles: List[Tuple[int, int, int, int]]) -> int:
    """
    计算矩形面积并
    rectangles: [(x1, y1, x2, y2), ...]
    """
    # 离散化 y 坐标
    y_coords = set()
    for x1, y1, x2, y2 in rectangles:
        y_coords.add(y1)
        y_coords.add(y2)
    y_sorted = sorted(y_coords)
    y_map = {y: i for i, y in enumerate(y_sorted)}
    
    # 扫描线事件：(x, type, y1, y2)
    # type: 1 表示矩形左边，-1 表示矩形右边
    events = []
    for x1, y1, x2, y2 in rectangles:
        events.append((x1, 1, y_map[y1], y_map[y2]))
        events.append((x2, -1, y_map[y1], y_map[y2]))
    events.sort()
    
    # 线段树维护 y 方向的覆盖长度
    n = len(y_sorted)
    cover = [0] * (4 * n)
    length = [0] * (4 * n)
    
    def update(node, l, r, ql, qr, delta):
        if ql > r or qr < l:
            return
        if ql <= l and r <= qr:
            cover[node] += delta
        else:
            mid = (l + r) // 2
            update(2 * node, l, mid, ql, qr, delta)
            update(2 * node + 1, mid + 1, r, ql, qr, delta)
        
        if cover[node] > 0:
            length[node] = y_sorted[r + 1] - y_sorted[l] if r + 1 < n else 0
        elif l == r:
            length[node] = 0
        else:
            length[node] = length[2 * node] + length[2 * node + 1]
    
    area = 0
    prev_x = events[0][0]
    
    for x, delta, y1, y2 in events:
        area += length[1] * (x - prev_x)
        update(1, 0, n - 2, y1, y2 - 1, delta)
        prev_x = x
    
    return area
```

---

## 方法对比

| 方法 | 修改类型 | 查询类型 | 时间复杂度 | 空间复杂度 |
|------|---------|---------|-----------|-----------|
| 二维前缀和 | 不支持 | 矩形和 | O(1) | O(mn) |
| 二维树状数组 | 单点 | 矩形和 | O(log² n) | O(mn) |
| 二维线段树 | 单点/矩形 | 矩形和/最值 | O(log² n) | O(mn) |
| K-D 树 | 单点 | 矩形内点 | O(√n + k) | O(n) |
| 扫描线 | 离线 | 面积并 | O(n log n) | O(n) |

---

## 应用实例

### 问题 1：LeetCode 308 - 二维区域和检索（可变）

```python
class NumMatrix:
    def __init__(self, matrix: List[List[int]]):
        if not matrix:
            return
        self.m, self.n = len(matrix), len(matrix[0])
        self.bit = BIT2D(self.m, self.n)
        self.data = [[0] * self.n for _ in range(self.m)]
        
        for i in range(self.m):
            for j in range(self.n):
                self.update(i, j, matrix[i][j])
    
    def update(self, row: int, col: int, val: int) -> None:
        delta = val - self.data[row][col]
        self.data[row][col] = val
        self.bit.update(row, col, delta)
    
    def sumRegion(self, row1: int, col1: int, row2: int, col2: int) -> int:
        return self.bit.query(row1, col1, row2, col2)
```

### 问题 2：矩形覆盖次数

```python
def max_coverage(rectangles: List[Tuple[int, int, int, int]]) -> int:
    """求被覆盖最多次的点的覆盖次数"""
    # 使用扫描线 + 线段树维护最大值
    pass
```

### 问题 3：动态矩形最值

```python
class RangeMaxQuery2D:
    """二维区间最值查询"""
    
    def __init__(self, m: int, n: int):
        # 使用二维线段树，合并操作改为 max
        pass
    
    def update(self, x: int, y: int, val: int) -> None:
        pass
    
    def query_max(self, x1: int, y1: int, x2: int, y2: int) -> int:
        pass
```

---

## 常见错误

1. **前缀和索引偏移**
   ```python
   # 错误：忘记 +1 偏移
   self.prefix[i][j] = matrix[i][j] + ...
   
   # 正确：使用 1-indexed
   self.prefix[i+1][j+1] = matrix[i][j] + ...
   ```

2. **二维树状数组边界**
   ```python
   # 错误：查询时左边界为负
   self._prefix(r1 - 1, c1 - 1)  # 当 r1=0 或 c1=0 时出错
   
   # 正确：处理边界
   if r1 == 0:
       return self._prefix(r2, c2) - self._prefix(r2, c1 - 1)
   ```

3. **扫描线事件顺序**
   ```python
   # 错误：相同 x 坐标时先处理右边
   
   # 正确：先处理左边（开始事件）
   events.sort(key=lambda e: (e[0], -e[1]))
   ```

---

## 本章小结

本章综合介绍了矩形区域查询技术：

1. **静态查询**
   - 二维前缀和：O(1) 查询

2. **动态查询**
   - 二维树状数组：单点修改 + 矩形和
   - 二维线段树：矩形修改 + 矩形查询

3. **离线处理**
   - 扫描线：面积并、覆盖问题

4. **选择建议**
   - 只有查询 → 前缀和
   - 单点修改 → 树状数组
   - 矩形修改 → 线段树
   - 离线 + 面积 → 扫描线

下一章我们将学习**离线查询优化**技术。
