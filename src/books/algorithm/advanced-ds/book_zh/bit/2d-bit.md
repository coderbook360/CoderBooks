# 二维树状数组

## 从一维到二维

掌握了一维树状数组后，自然会想：能否扩展到二维？

**二维场景**：
- 有一个 M × N 的矩阵
- 单点修改：`matrix[x][y] += delta`
- 矩形查询：查询左上角 (x1, y1) 到右下角 (x2, y2) 的元素和

**朴素方法**：
- 修改：O(1)
- 查询：O(M × N)

**二维前缀和**：
- 修改：O(M × N)（需要更新所有后续前缀和）
- 查询：O(1)

**二维树状数组**：
- 修改：O(log M × log N)
- 查询：O(log M × log N)

---

## 核心思想：嵌套结构

二维树状数组本质上是「树状数组的树状数组」：

- 对于每个 x 坐标，维护一个关于 y 的树状数组
- x 方向的跳转遵循一维树状数组的规则
- y 方向的跳转也遵循一维树状数组的规则

```python
# 一维：
def update(i, delta):
    while i <= n:
        tree[i] += delta
        i += lowbit(i)

# 二维：
def update(x, y, delta):
    while x <= m:
        j = y
        while j <= n:
            tree[x][j] += delta
            j += lowbit(j)
        x += lowbit(x)
```

---

## 完整实现

```python
class BIT2D:
    """二维树状数组：单点修改 + 矩形查询"""
    
    def __init__(self, m, n):
        """m 行 n 列的矩阵（1-indexed）"""
        self.m = m
        self.n = n
        self.tree = [[0] * (n + 1) for _ in range(m + 1)]
    
    @staticmethod
    def lowbit(x):
        return x & (-x)
    
    def update(self, x, y, delta):
        """位置 (x, y) 增加 delta"""
        i = x
        while i <= self.m:
            j = y
            while j <= self.n:
                self.tree[i][j] += delta
                j += self.lowbit(j)
            i += self.lowbit(i)
    
    def query(self, x, y):
        """查询 (1,1) 到 (x,y) 的前缀和"""
        result = 0
        i = x
        while i > 0:
            j = y
            while j > 0:
                result += self.tree[i][j]
                j -= self.lowbit(j)
            i -= self.lowbit(i)
        return result
    
    def range_query(self, x1, y1, x2, y2):
        """查询矩形 (x1,y1) 到 (x2,y2) 的元素和"""
        # 二维容斥原理
        return (self.query(x2, y2) 
                - self.query(x1 - 1, y2) 
                - self.query(x2, y1 - 1) 
                + self.query(x1 - 1, y1 - 1))
```

---

## 二维容斥原理

矩形查询使用容斥原理：

```
设 S(x, y) = query(x, y) 表示 (1,1) 到 (x,y) 的前缀和

矩形 (x1,y1) 到 (x2,y2) 的和：
= S(x2, y2) - S(x1-1, y2) - S(x2, y1-1) + S(x1-1, y1-1)

可视化：
+------------------+
|    A    |    B   |
+---------+--------+ y1-1
|    C    | Target |
+------------------+ y2
        x1-1     x2

S(x2, y2) = A + B + C + Target
S(x1-1, y2) = A + B
S(x2, y1-1) = A + C
S(x1-1, y1-1) = A

Target = S(x2,y2) - S(x1-1,y2) - S(x2,y1-1) + S(x1-1,y1-1)
```

---

## LeetCode 实战

### 308. 二维区域和检索 - 可变

**LeetCode 308: Range Sum Query 2D - Mutable**

给定一个二维矩阵，实现：
- `update(row, col, val)`：将 `matrix[row][col]` 更新为 `val`
- `sumRegion(row1, col1, row2, col2)`：返回矩形区域的元素和

```python
class NumMatrix:
    def __init__(self, matrix):
        if not matrix or not matrix[0]:
            self.m = self.n = 0
            return
        
        self.m = len(matrix)
        self.n = len(matrix[0])
        self.matrix = [[0] * self.n for _ in range(self.m)]
        self.tree = [[0] * (self.n + 1) for _ in range(self.m + 1)]
        
        # 初始化
        for i in range(self.m):
            for j in range(self.n):
                self.update(i, j, matrix[i][j])
    
    def _lowbit(self, x):
        return x & (-x)
    
    def _update(self, x, y, delta):
        """内部更新（1-indexed）"""
        i = x
        while i <= self.m:
            j = y
            while j <= self.n:
                self.tree[i][j] += delta
                j += self._lowbit(j)
            i += self._lowbit(i)
    
    def _query(self, x, y):
        """查询前缀和（1-indexed）"""
        if x <= 0 or y <= 0:
            return 0
        result = 0
        i = x
        while i > 0:
            j = y
            while j > 0:
                result += self.tree[i][j]
                j -= self._lowbit(j)
            i -= self._lowbit(i)
        return result
    
    def update(self, row, col, val):
        """更新 matrix[row][col] = val（0-indexed）"""
        delta = val - self.matrix[row][col]
        self.matrix[row][col] = val
        self._update(row + 1, col + 1, delta)
    
    def sumRegion(self, row1, col1, row2, col2):
        """查询矩形和（0-indexed）"""
        return (self._query(row2 + 1, col2 + 1)
                - self._query(row1, col2 + 1)
                - self._query(row2 + 1, col1)
                + self._query(row1, col1))
```

**复杂度**：
- 初始化：O(M × N × log M × log N)
- 更新：O(log M × log N)
- 查询：O(log M × log N)

---

## 二维区间修改

类似一维的差分技巧，二维树状数组也可以支持区间修改。

### 二维差分

对于矩形 (x1, y1) 到 (x2, y2) 增加 delta：

```python
diff[x1][y1] += delta
diff[x1][y2+1] -= delta
diff[x2+1][y1] -= delta
diff[x2+1][y2+1] += delta
```

### 二维 RUPQ（区间修改 + 单点查询）

```python
class BIT2D_RUPQ:
    """二维树状数组：矩形修改 + 单点查询"""
    
    def __init__(self, m, n):
        self.m = m
        self.n = n
        self.tree = [[0] * (n + 2) for _ in range(m + 2)]
    
    def _update(self, x, y, delta):
        i = x
        while i <= self.m:
            j = y
            while j <= self.n:
                self.tree[i][j] += delta
                j += j & (-j)
            i += i & (-i)
    
    def _query(self, x, y):
        result = 0
        i = x
        while i > 0:
            j = y
            while j > 0:
                result += self.tree[i][j]
                j -= j & (-j)
            i -= i & (-i)
        return result
    
    def range_update(self, x1, y1, x2, y2, delta):
        """矩形 (x1,y1) 到 (x2,y2) 增加 delta"""
        self._update(x1, y1, delta)
        self._update(x1, y2 + 1, -delta)
        self._update(x2 + 1, y1, -delta)
        self._update(x2 + 1, y2 + 1, delta)
    
    def point_query(self, x, y):
        """查询位置 (x, y) 的值"""
        return self._query(x, y)
```

---

## 执行流程可视化

```python
# 5×5 矩阵，初始全为 0
bit = BIT2D(5, 5)

# 更新 (2, 3) 增加 5
bit.update(2, 3, 5)

# 树状数组更新过程（2D）：
# x = 2:
#   y = 3: tree[2][3] += 5
#   y = 4: tree[2][4] += 5
# x = 4:
#   y = 3: tree[4][3] += 5
#   y = 4: tree[4][4] += 5

# 查询矩形 (1,1) 到 (3,4):
result = bit.range_query(1, 1, 3, 4)
# = query(3,4) - query(0,4) - query(3,0) + query(0,0)
# = 5 - 0 - 0 + 0 = 5 ✓
```

---

## 复杂度分析

| 操作 | 时间复杂度 | 空间复杂度 |
|-----|----------|-----------|
| 初始化 | O(MN log M log N) | O(MN) |
| 单点更新 | O(log M × log N) | - |
| 矩形查询 | O(log M × log N) | - |

**与二维线段树对比**：
- 二维树状数组代码更简洁
- 二维线段树功能更强大（支持区间最值等）

---

## 应用场景

### 场景一：动态矩阵求和

如前面 LeetCode 308 所示。

### 场景二：二维逆序对

统计二维平面上满足 `x1 < x2` 且 `y1 > y2` 的点对数量。

### 场景三：离线矩形计数

给定 N 个点和 Q 个矩形查询，统计每个矩形内的点数。

```python
# 离线处理：按 x 坐标排序
# 扫描线 + 一维树状数组（或二维树状数组）

# 思路：
# 1. 将所有点和查询按 x 坐标排序
# 2. 从左到右扫描，遇到点就插入
# 3. 遇到查询的右边界时，查询 y 范围内的点数
```

---

## 常见错误与陷阱

### 错误一：循环嵌套顺序

```python
# 错误：内外循环写反
def update(self, x, y, delta):
    j = y
    while j <= self.n:
        i = x
        while i <= self.m:  # ← 逻辑没问题，但要确保一致性
```

**建议**：保持一致的风格，外层 x，内层 y。

### 错误二：边界处理

```python
# 当 x1 = 1 或 y1 = 1 时，x1-1 = 0 或 y1-1 = 0
# query(0, y) 或 query(x, 0) 应该返回 0

def _query(self, x, y):
    if x <= 0 or y <= 0:  # ← 必须有这个检查
        return 0
```

### 错误三：容斥公式记错

```python
# 正确的容斥公式
return (query(x2, y2) 
        - query(x1-1, y2) 
        - query(x2, y1-1) 
        + query(x1-1, y1-1))

# 常见错误：符号写错、坐标写错
```

---

## 本章小结

本章核心要点：

1. **二维树状数组结构**：树状数组的树状数组，嵌套的 lowbit 跳转

2. **核心操作**：
   - 更新：双重 while 循环，每层都用 `+= lowbit`
   - 查询：双重 while 循环，每层都用 `-= lowbit`

3. **矩形查询**：使用二维容斥原理

4. **复杂度**：更新和查询都是 O(log M × log N)

5. **扩展**：二维区间修改需要使用二维差分

**设计启示**：

二维树状数组展示了「降维」和「嵌套」的思想：
- 将二维问题分解为多个一维问题
- 每一维独立使用树状数组的跳转规则

这种思想可以进一步推广到更高维度（三维、四维...），虽然在实际中较少使用。

下一章我们将进入 LeetCode 实战，从**计算右侧小于当前元素的个数**开始，看看树状数组如何解决统计类问题。
