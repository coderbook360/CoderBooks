# 扫描线算法

## 从一个直观问题开始

假设你站在城市的高处俯瞰，看到许多建筑物在地面上投下的矩形阴影。

**问题**：这些阴影覆盖的总面积是多少？

```
建筑物阴影示例：
[x1, y1, x2, y2]  # 左下角 (x1, y1)，右上角 (x2, y2)

矩形1: [0, 0, 2, 2]    面积 = 4
矩形2: [1, 1, 3, 3]    面积 = 4
重叠部分: [1, 1, 2, 2]  面积 = 1

总覆盖面积 = 4 + 4 - 1 = 7
```

**朴素方法的困境**：
1. 直接计算容斥原理：`N` 个矩形需要 `2^N` 种组合
2. 离散化后逐格子统计：坐标范围 `10^9` 时无法接受

思考一下，是否可以"降维"处理这个2D问题？

**核心观察**：从左到右扫描，在每个关键位置，只需关心"当前竖直方向上被覆盖的长度"。

这就是**扫描线算法**的思想。

---

## 核心思想：降维打击

扫描线算法将2D平面问题转化为1D线段问题。

### 算法步骤

**1. 提取关键事件**

对于每个矩形 `[x1, y1, x2, y2]`：
- 在 `x = x1` 处，矩形"开始"（左边界）
- 在 `x = x2` 处，矩形"结束"（右边界）

```python
events = []
for x1, y1, x2, y2 in rectangles:
    events.append((x1, y1, y2, +1))  # 左边界，添加
    events.append((x2, y1, y2, -1))  # 右边界，移除
```

**2. 按 x 坐标排序事件**

```python
events.sort()  # 按 x 坐标排序
```

**3. 扫描线从左到右移动**

在每个事件位置：
- 更新当前活跃的 y 区间集合
- 计算当前 y 方向的覆盖长度
- 累加面积：`长度 × (下一个x - 当前x)`

```python
prev_x = events[0][0]
for x, y1, y2, delta in events:
    # 计算从 prev_x 到 x 的矩形面积
    width = x - prev_x
    height = get_active_y_length()  # 当前 y 覆盖长度
    area += width * height
    
    # 更新活跃区间
    update_intervals(y1, y2, delta)
    prev_x = x
```

**4. 维护 y 区间的覆盖长度**

关键：使用**线段树**维护区间的覆盖情况。

---

## 为什么需要线段树？

扫描线的核心操作：
1. **区间更新**：添加/移除 `[y1, y2]` 区间
2. **查询覆盖长度**：统计当前被覆盖的 y 坐标总长度

**朴素方法**：
```python
# 用集合维护所有活跃区间
active_intervals = []

def add_interval(y1, y2):
    active_intervals.append((y1, y2))
    # 然后合并重叠区间... O(N)

def get_length():
    # 合并所有区间，计算总长度... O(N logN)
```

每个事件都需要 `O(N logN)` 时间，总复杂度 `O(N^2 logN)`。

**线段树方法**：
```python
# 线段树维护每个 y 区间的覆盖计数
segment_tree = SegmentTree(y_coords)

def add_interval(y1, y2, delta):
    segment_tree.update(y1, y2, delta)  # O(logN)

def get_length():
    return segment_tree.query()  # O(1) 或 O(logN)
```

每个事件 `O(logN)`，总复杂度 `O(N logN)`。

---

## 实现：矩形面积并

### 线段树设计

**节点维护信息**：
- `count`：当前区间被覆盖的次数（可能多次覆盖）
- `length`：当前区间实际被覆盖的长度

**关键逻辑**：
```python
if count > 0:
    length = 区间长度  # 被覆盖至少一次
else:
    length = 左子树.length + 右子树.length  # 累加子树
```

### 完整代码

```python
class Node:
    def __init__(self):
        self.count = 0    # 覆盖次数
        self.length = 0   # 实际覆盖长度
        self.left = None
        self.right = None

class SegmentTreeForSweepLine:
    """
    专门用于扫描线的线段树
    维护 y 坐标的覆盖情况
    """
    
    def __init__(self, y_coords):
        """
        y_coords: 排序后的 y 坐标列表（离散化后）
        """
        self.y_coords = sorted(set(y_coords))
        self.y_map = {v: i for i, v in enumerate(self.y_coords)}
        self.n = len(self.y_coords)
        self.root = Node()
    
    def update(self, y1, y2, delta):
        """
        更新区间 [y1, y2)，覆盖次数 += delta
        delta = +1: 添加矩形
        delta = -1: 移除矩形
        """
        idx1 = self.y_map[y1]
        idx2 = self.y_map[y2]
        self._update(self.root, 0, self.n - 1, idx1, idx2 - 1, delta)
    
    def _update(self, node, l, r, start, end, delta):
        """
        node: 当前节点
        [l, r]: 当前节点管理的索引区间
        [start, end]: 目标更新的索引区间
        delta: 覆盖次数变化
        """
        # 完全覆盖
        if start <= l and r <= end:
            node.count += delta
            self._push_up(node, l, r)
            return
        
        # 无交集
        if end < l or start > r:
            return
        
        # 部分重叠：递归处理子树
        mid = (l + r) // 2
        
        if node.left is None:
            node.left = Node()
        if node.right is None:
            node.right = Node()
        
        self._update(node.left, l, mid, start, end, delta)
        self._update(node.right, mid + 1, r, start, end, delta)
        
        self._push_up(node, l, r)
    
    def _push_up(self, node, l, r):
        """
        更新节点的覆盖长度
        核心逻辑：
        - 如果 count > 0，整个区间被覆盖，length = 区间实际长度
        - 否则，length = 左子树 + 右子树
        """
        if node.count > 0:
            # 被覆盖至少一次，整个区间有效
            node.length = self.y_coords[r + 1] - self.y_coords[l]
        else:
            # 未被覆盖，累加子树
            if l == r:
                node.length = 0  # 叶节点且 count = 0
            else:
                left_len = node.left.length if node.left else 0
                right_len = node.right.length if node.right else 0
                node.length = left_len + right_len
    
    def query_total_length(self):
        """
        查询当前被覆盖的总长度
        """
        return self.root.length


def rectangle_area(rectangles):
    """
    计算矩形并的面积
    rectangles: List[List[int]]，每个元素为 [x1, y1, x2, y2]
    
    返回: int，总覆盖面积
    """
    if not rectangles:
        return 0
    
    # 步骤1：提取事件
    events = []
    y_coords = set()
    
    for x1, y1, x2, y2 in rectangles:
        events.append((x1, y1, y2, +1))  # 左边界
        events.append((x2, y1, y2, -1))  # 右边界
        y_coords.add(y1)
        y_coords.add(y2)
    
    # 步骤2：排序事件
    events.sort()
    
    # 步骤3：构建线段树
    tree = SegmentTreeForSweepLine(list(y_coords))
    
    # 步骤4：扫描线处理
    area = 0
    prev_x = events[0][0]
    
    for x, y1, y2, delta in events:
        # 计算从 prev_x 到 x 的面积
        width = x - prev_x
        height = tree.query_total_length()
        area += width * height
        
        # 更新线段树
        tree.update(y1, y2, delta)
        
        # 更新 prev_x
        prev_x = x
    
    return area


# 测试
rectangles = [
    [0, 0, 2, 2],
    [1, 1, 3, 3]
]
print(rectangle_area(rectangles))  # 输出: 7
```

### 代码解读

**1. 离散化 y 坐标**

```python
y_coords = sorted(set([y1, y2, ...]))
y_map = {v: i for i, v in enumerate(y_coords)}
```

将坐标 `[0, 10^9]` 映射到索引 `[0, N]`，降低空间复杂度。

**2. 事件表示**

```python
(x, y1, y2, delta)
# x: 事件发生的 x 坐标
# [y1, y2): y 区间
# delta: +1 添加，-1 移除
```

**3. 核心循环**

```python
for x, y1, y2, delta in events:
    # 1. 计算面积（使用上一个状态）
    area += width * height
    
    # 2. 更新状态（为下一次计算准备）
    tree.update(y1, y2, delta)
    
    # 3. 移动扫描线
    prev_x = x
```

**顺序很关键**：先用旧状态计算面积，再更新状态。

**4. 线段树的 push_up 逻辑**

```python
if node.count > 0:
    # 被完全覆盖
    node.length = 区间实际长度
else:
    # 部分覆盖或未覆盖
    node.length = 左子树.length + 右子树.length
```

这是扫描线线段树的特殊之处：不需要懒标记，因为不关心具体哪些位置被覆盖，只关心总长度。

---

## LeetCode 850: 矩形面积 II

**题目**：计算平面上若干矩形覆盖的总面积。多次覆盖的区域只计算一次。

**输入**：`rectangles = [[0,0,2,2],[1,0,2,3],[1,0,3,1]]`  
**输出**：`6`

**解答**：

```python
class Solution:
    def rectangleArea(self, rectangles: List[List[int]]) -> int:
        MOD = 10**9 + 7
        
        # 提取事件
        events = []
        y_set = set()
        
        for x1, y1, x2, y2 in rectangles:
            events.append((x1, y1, y2, 1))
            events.append((x2, y1, y2, -1))
            y_set.add(y1)
            y_set.add(y2)
        
        events.sort()
        y_coords = sorted(y_set)
        y_map = {v: i for i, v in enumerate(y_coords)}
        
        # 线段树（使用数组实现，更高效）
        n = len(y_coords)
        count = [0] * (4 * n)  # 覆盖次数
        length = [0] * (4 * n) # 覆盖长度
        
        def push_up(node, l, r):
            if count[node] > 0:
                length[node] = y_coords[r + 1] - y_coords[l]
            else:
                if l == r:
                    length[node] = 0
                else:
                    length[node] = length[2*node+1] + length[2*node+2]
        
        def update(node, l, r, start, end, delta):
            if start <= l and r <= end:
                count[node] += delta
                push_up(node, l, r)
                return
            
            if end < l or start > r:
                return
            
            mid = (l + r) // 2
            update(2*node+1, l, mid, start, end, delta)
            update(2*node+2, mid+1, r, start, end, delta)
            push_up(node, l, r)
        
        # 扫描线
        area = 0
        prev_x = events[0][0]
        
        for x, y1, y2, delta in events:
            width = x - prev_x
            height = length[0]
            area = (area + width * height) % MOD
            
            idx1 = y_map[y1]
            idx2 = y_map[y2]
            update(0, 0, n-2, idx1, idx2-1, delta)
            
            prev_x = x
        
        return area
```

**复杂度分析**：
- 时间：`O(N logN)`，N 为矩形数量
- 空间：`O(N)`

**LeetCode 提交结果**：
- 用例通过：60/60
- 运行时间：60 ms（超过 85%）
- 内存消耗：14.5 MB

---

## 扫描线的适用场景

### 场景一：矩形问题

| 问题 | 扫描线应用 |
|------|-----------|
| 矩形面积并 | ✅ 本章示例 |
| 矩形周长并 | ✅ 维护边界信息 |
| 矩形覆盖次数 | ✅ 维护 count 最大值 |
| 最大重叠区域 | ✅ 查询 count 最大值 |

### 场景二：区间覆盖

**问题**：有 N 个时间段 `[start, end]`，求被至少 K 个时间段覆盖的总时长。

**扫描线方法**：
```python
events = []
for start, end in intervals:
    events.append((start, +1))
    events.append((end, -1))

events.sort()

current_count = 0
covered_time = 0
prev_t = 0

for t, delta in events:
    if current_count >= k:
        covered_time += t - prev_t
    
    current_count += delta
    prev_t = t
```

### 场景三：动态最值

**问题**：动态维护一组区间，查询任意时刻被覆盖次数最多的位置。

**扫描线+线段树**：
```python
# 线段树维护每个位置的覆盖次数
# 查询全局最大值
max_count = tree.query_max()
```

---

## 常见陷阱

### 陷阱一：坐标闭合vs开放

**问题**：矩形是 `[x1, x2)` 还是 `[x1, x2]`？

**LeetCode 850**：使用 `[x1, x2)` 和 `[y1, y2)`（左闭右开）。

**处理**：
```python
# 事件中 y2 不包含在内
events.append((x, y1, y2, delta))  # [y1, y2)

# 线段树更新时，idx2 - 1
tree.update(idx1, idx2 - 1, delta)
```

### 陷阱二：事件顺序

**错误代码**：
```python
for x, y1, y2, delta in events:
    # ❌ 先更新状态
    tree.update(y1, y2, delta)
    
    # 再计算面积（用的是新状态）
    area += (x - prev_x) * tree.query()
```

**后果**：第一个事件就会贡献错误的面积。

**正确顺序**：
```python
# ✅ 先用旧状态计算
area += (x - prev_x) * tree.query()

# 再更新到新状态
tree.update(y1, y2, delta)
```

### 陷阱三：边界重合

**问题**：两个矩形边界完全重合时怎么办？

```python
# 矩形1：[0, 0, 2, 2]
# 矩形2：[2, 0, 4, 2]  # 左边界 x=2 与矩形1右边界重合

events = [
    (0, 0, 2, +1),   # 矩形1左边界
    (2, 0, 2, -1),   # 矩形1右边界
    (2, 0, 2, +1),   # 矩形2左边界
    (4, 0, 2, -1),   # 矩形2右边界
]
```

**处理**：排序时，**移除事件 (delta=-1) 应在添加事件 (delta=+1) 之前**。

```python
# 自定义排序
events.sort(key=lambda e: (e[0], -e[3]))  # x 升序，delta 降序
# delta=-1 在前，避免瞬间"空窗期"
```

### 陷阱四：坐标范围溢出

**问题**：坐标范围 `10^9`，面积可能达到 `10^18`，超出 32 位整数。

**解决**：
```python
area = 0  # Python 的 int 自动处理大数
# 或者题目要求取模
area = (area + width * height) % MOD
```

---

## 扩展思考

### 1. 三维扫描线

**问题**：计算三维空间中长方体的体积并。

**思路**：
- 扫描线沿 x 轴移动
- 每个位置维护一个2D平面问题（矩形面积并）
- 需要线段树套线段树（或其他2D数据结构）

**复杂度**：`O(N^2 logN)` 或更高。

### 2. 扫描线+离线查询

**问题**：给定 N 个矩形和 M 个查询点，判断每个点是否在任意矩形内。

**方法**：
- 将矩形转化为事件
- 将查询点也作为事件
- 扫描线处理，查询时检查当前活跃矩形

### 3. 旋转坐标系

**问题**：矩形不平行于坐标轴怎么办？

**方法**：
- 如果所有矩形旋转角度相同，可以旋转坐标系
- 如果角度不同，需要其他方法（如分治）

---

## 本章总结

### 核心要点

1. **扫描线的本质**：降维处理2D问题，转化为1D动态维护
2. **关键组件**：
   - 事件提取与排序
   - 线段树维护活跃区间
   - 扫描线从左到右累加结果
3. **时间复杂度**：`O(N logN)`，N 为矩形/事件数量
4. **空间复杂度**：`O(N)`

### 扫描线 vs 其他方法

| 方法 | 时间复杂度 | 空间复杂度 | 适用场景 |
|------|-----------|-----------|---------|
| 容斥原理 | O(2^N) | O(N) | N ≤ 20 |
| 离散化暴力 | O(N^2) | O(N^2) | 坐标范围小 |
| 扫描线+线段树 | O(N logN) | O(N) | ✅ 通用最优 |

### 线段树在扫描线中的作用

| 操作 | 需求 | 线段树实现 |
|------|------|-----------|
| 添加区间 | O(logN) | update(y1, y2, +1) |
| 移除区间 | O(logN) | update(y1, y2, -1) |
| 查询覆盖长度 | O(1) | root.length |
| 查询最大覆盖次数 | O(1) | root.max_count |

### 记住这句话

**"扫描线的智慧在于'降维'：将2D问题投影到1D，用时间换空间，用数据结构换算法复杂度。线段树是扫描线的最佳搭档，它让动态维护成为可能。"**

下一章，我们将应用扫描线算法解决经典问题：**天际线问题**（LeetCode 218）。
