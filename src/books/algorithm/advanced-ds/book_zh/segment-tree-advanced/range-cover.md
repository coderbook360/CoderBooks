# 区间覆盖问题

## 问题的提出

在实际应用中，我们经常遇到「覆盖」类型的操作：

**场景一：画布涂色**
```python
# 有一面墙，初始为白色（0）
# 操作：将区间 [l, r] 涂成颜色 c
# 查询：区间 [l, r] 有多少种不同的颜色？
```

**场景二：会议室调度**
```python
# 会议室时间轴 [0, 1000]
# 操作：时间段 [l, r] 安排了会议（被占用）
# 查询：时间段 [l, r] 有多少时间被占用？
```

**场景三：广告牌系统**
```python
# 一块广告牌，高度为 h
# 操作：在高度 [l, r] 处贴一张海报
# 海报会完全覆盖该区域
# 最终能看到多少张不同的海报？
```

**共同特点**：新的操作会**完全覆盖**旧的值，而不是像加法或乘法那样累加。

---

## 区间赋值 vs 区间加法

先对比这两种操作的本质区别：

| 特性 | 区间加法 | 区间赋值（覆盖）|
|-----|---------|---------------|
| 操作语义 | `a[i] += delta` | `a[i] = value` |
| 历史依赖 | 依赖原始值 | 完全覆盖，不依赖原始值 |
| 懒标记叠加 | 累加：`tag += delta` | 覆盖：`tag = value` |
| 空标记表示 | `tag = 0` | 需要特殊值（如 -1 或 None）|

**关键洞察**：区间赋值的懒标记不是累加，而是**直接覆盖**。新的赋值操作会完全抹去之前的懒标记。

---

## 核心实现

### 数据结构设计

```python
class Node:
    def __init__(self):
        self.sum = 0           # 区间和
        self.cover = None      # 覆盖标记，None 表示无覆盖
```

**关键**：用 `None` 表示无覆盖，而不是 0（因为 0 可能是有效的覆盖值）。

### 懒标记下推

```python
def pushdown(self, node, l, r):
    """下推覆盖标记"""
    if node.cover is None:
        return  # 无覆盖标记
    
    mid = (l + r) // 2
    left_len = mid - l + 1
    right_len = r - mid
    
    # 直接覆盖子节点
    node.left.sum = node.cover * left_len
    node.left.cover = node.cover
    
    node.right.sum = node.cover * right_len
    node.right.cover = node.cover
    
    # 清空当前节点的覆盖标记
    node.cover = None
```

**注意**：下推时，子节点的 `cover` 被直接赋值，而不是累加。这是与区间加法的关键区别。

### 区间赋值

```python
def range_assign(self, node, l, r, ql, qr, value):
    """将区间 [ql, qr] 的每个元素赋值为 value"""
    if l > qr or r < ql:
        return  # 完全不相交
    
    if ql <= l and r <= qr:
        # 完全覆盖：直接赋值
        node.sum = value * (r - l + 1)
        node.cover = value
        return
    
    # 部分覆盖：下推后递归
    self.pushdown(node, l, r)
    mid = (l + r) // 2
    
    if ql <= mid:
        self.range_assign(node.left, l, mid, ql, qr, value)
    if qr > mid:
        self.range_assign(node.right, mid + 1, r, ql, qr, value)
    
    # 上推更新
    node.sum = node.left.sum + node.right.sum
```

### 区间查询

```python
def range_query(self, node, l, r, ql, qr):
    """查询区间 [ql, qr] 的和"""
    if l > qr or r < ql:
        return 0
    
    if ql <= l and r <= qr:
        return node.sum
    
    # 下推后递归
    self.pushdown(node, l, r)
    mid = (l + r) // 2
    
    result = 0
    if ql <= mid:
        result += self.range_query(node.left, l, mid, ql, qr)
    if qr > mid:
        result += self.range_query(node.right, mid + 1, r, ql, qr)
    
    return result
```

---

## 完整实现

```python
class SegmentTreeCover:
    """支持区间赋值、区间求和的线段树"""
    
    class Node:
        __slots__ = ['sum', 'cover', 'left', 'right']
        
        def __init__(self):
            self.sum = 0
            self.cover = None  # None 表示无覆盖
            self.left = None
            self.right = None
    
    def __init__(self, nums):
        self.n = len(nums)
        self.root = self._build(nums, 0, self.n - 1)
    
    def _build(self, nums, l, r):
        node = self.Node()
        if l == r:
            node.sum = nums[l]
            return node
        
        mid = (l + r) // 2
        node.left = self._build(nums, l, mid)
        node.right = self._build(nums, mid + 1, r)
        node.sum = node.left.sum + node.right.sum
        return node
    
    def _pushdown(self, node, l, r):
        if node.cover is None:
            return
        
        mid = (l + r) // 2
        left_len = mid - l + 1
        right_len = r - mid
        
        node.left.sum = node.cover * left_len
        node.left.cover = node.cover
        
        node.right.sum = node.cover * right_len
        node.right.cover = node.cover
        
        node.cover = None
    
    def assign(self, ql, qr, value):
        """区间 [ql, qr] 赋值为 value"""
        self._assign(self.root, 0, self.n - 1, ql, qr, value)
    
    def _assign(self, node, l, r, ql, qr, value):
        if l > qr or r < ql:
            return
        
        if ql <= l and r <= qr:
            node.sum = value * (r - l + 1)
            node.cover = value
            return
        
        self._pushdown(node, l, r)
        mid = (l + r) // 2
        
        if ql <= mid:
            self._assign(node.left, l, mid, ql, qr, value)
        if qr > mid:
            self._assign(node.right, mid + 1, r, ql, qr, value)
        
        node.sum = node.left.sum + node.right.sum
    
    def query(self, ql, qr):
        """查询区间 [ql, qr] 的和"""
        return self._query(self.root, 0, self.n - 1, ql, qr)
    
    def _query(self, node, l, r, ql, qr):
        if l > qr or r < ql:
            return 0
        
        if ql <= l and r <= qr:
            return node.sum
        
        self._pushdown(node, l, r)
        mid = (l + r) // 2
        
        result = 0
        if ql <= mid:
            result += self._query(node.left, l, mid, ql, qr)
        if qr > mid:
            result += self._query(node.right, mid + 1, r, ql, qr)
        
        return result
```

---

## LeetCode 实战

### 699. 掉落的方块

虽然我们在前面章节已经讲过这道题，但这里从「区间覆盖」的角度重新审视。

**题目**：在二维平面上依次掉落方块，每个方块 `[left, side]` 表示左边界和边长。方块会堆叠在之前的方块上。返回每次掉落后的最大高度。

**核心操作**：
- 查询区间 `[left, left+side-1]` 的最大高度
- 将区间 `[left, left+side-1]` 的高度赋值为 `max_height + side`

```python
class SegmentTreeMax:
    """区间最大值 + 区间赋值"""
    
    def __init__(self, max_val):
        self.max_val = max_val
        self.tree = {}
        self.lazy = {}
    
    def _pushdown(self, idx, l, r):
        if idx not in self.lazy:
            return
        
        mid = (l + r) // 2
        left, right = idx * 2, idx * 2 + 1
        
        self.tree[left] = self.lazy[idx]
        self.lazy[left] = self.lazy[idx]
        
        self.tree[right] = self.lazy[idx]
        self.lazy[right] = self.lazy[idx]
        
        del self.lazy[idx]
    
    def update(self, ql, qr, value, idx=1, l=0, r=None):
        if r is None:
            r = self.max_val
        
        if l > qr or r < ql:
            return
        
        if ql <= l and r <= qr:
            self.tree[idx] = value
            self.lazy[idx] = value
            return
        
        self._pushdown(idx, l, r)
        mid = (l + r) // 2
        
        if ql <= mid:
            self.update(ql, qr, value, idx * 2, l, mid)
        if qr > mid:
            self.update(ql, qr, value, idx * 2 + 1, mid + 1, r)
        
        self.tree[idx] = max(
            self.tree.get(idx * 2, 0),
            self.tree.get(idx * 2 + 1, 0)
        )
    
    def query(self, ql, qr, idx=1, l=0, r=None):
        if r is None:
            r = self.max_val
        
        if l > qr or r < ql:
            return 0
        
        if ql <= l and r <= qr:
            return self.tree.get(idx, 0)
        
        self._pushdown(idx, l, r)
        mid = (l + r) // 2
        
        result = 0
        if ql <= mid:
            result = max(result, self.query(ql, qr, idx * 2, l, mid))
        if qr > mid:
            result = max(result, self.query(ql, qr, idx * 2 + 1, mid + 1, r))
        
        return result


class Solution:
    def fallingSquares(self, positions):
        # 坐标离散化
        coords = set()
        for left, side in positions:
            coords.add(left)
            coords.add(left + side - 1)
        coords = sorted(coords)
        compress = {v: i for i, v in enumerate(coords)}
        
        n = len(coords)
        tree = SegmentTreeMax(n - 1)
        
        result = []
        max_height = 0
        
        for left, side in positions:
            l = compress[left]
            r = compress[left + side - 1]
            
            # 查询当前区间最大高度
            cur_max = tree.query(l, r)
            # 新高度
            new_height = cur_max + side
            # 区间赋值
            tree.update(l, r, new_height)
            
            max_height = max(max_height, new_height)
            result.append(max_height)
        
        return result
```

---

### 715. Range 模块

**LeetCode 715: Range Module**

实现一个数据结构，支持：
- `addRange(left, right)`：添加区间 `[left, right)`
- `removeRange(left, right)`：移除区间 `[left, right)`
- `queryRange(left, right)`：查询区间 `[left, right)` 是否被完全覆盖

**分析**：本质是「区间赋值」问题
- `addRange`：将区间赋值为 1（被覆盖）
- `removeRange`：将区间赋值为 0（未覆盖）
- `queryRange`：查询区间最小值是否为 1

```python
class RangeModule:
    def __init__(self):
        self.MAX = 10**9
        self.tree = {}   # 存储区间最小值
        self.lazy = {}   # 覆盖标记
    
    def _pushdown(self, idx):
        if idx in self.lazy:
            left, right = idx * 2, idx * 2 + 1
            self.tree[left] = self.lazy[idx]
            self.lazy[left] = self.lazy[idx]
            self.tree[right] = self.lazy[idx]
            self.lazy[right] = self.lazy[idx]
            del self.lazy[idx]
    
    def _update(self, ql, qr, value, idx=1, l=0, r=None):
        if r is None:
            r = self.MAX
        
        if l >= qr or r <= ql:
            return
        
        if ql <= l and r <= qr:
            self.tree[idx] = value
            self.lazy[idx] = value
            return
        
        self._pushdown(idx)
        mid = (l + r) // 2
        
        if ql < mid:
            self._update(ql, qr, value, idx * 2, l, mid)
        if qr > mid:
            self._update(ql, qr, value, idx * 2 + 1, mid, r)
        
        # 用最小值合并（如果全是1，则查询返回1）
        self.tree[idx] = min(
            self.tree.get(idx * 2, 0),
            self.tree.get(idx * 2 + 1, 0)
        )
    
    def _query(self, ql, qr, idx=1, l=0, r=None):
        if r is None:
            r = self.MAX
        
        if l >= qr or r <= ql:
            return 1  # 不相交区间返回1（不影响min结果）
        
        if ql <= l and r <= qr:
            return self.tree.get(idx, 0)
        
        self._pushdown(idx)
        mid = (l + r) // 2
        
        left_min = self._query(ql, qr, idx * 2, l, mid) if ql < mid else 1
        right_min = self._query(ql, qr, idx * 2 + 1, mid, r) if qr > mid else 1
        
        return min(left_min, right_min)
    
    def addRange(self, left: int, right: int) -> None:
        self._update(left, right, 1)
    
    def queryRange(self, left: int, right: int) -> bool:
        return self._query(left, right) == 1
    
    def removeRange(self, left: int, right: int) -> None:
        self._update(left, right, 0)
```

**复杂度分析**：
- 时间：每次操作 O(log MAX)
- 空间：动态开点，最多 O(Q × log MAX)

---

## 变体：区间颜色段计数

### 问题描述

维护一个序列，支持：
- `assign(l, r, color)`：将区间 `[l, r]` 染成颜色 `color`
- `count(l, r)`：查询区间 `[l, r]` 中有多少个连续颜色段

**示例**：
```
序列：[1, 1, 2, 2, 2, 1, 3, 3]
区间 [0, 7] 有 4 个颜色段：[1,1] [2,2,2] [1] [3,3]
```

### 解决思路

每个节点维护三个信息：
- `left_color`：区间最左边的颜色
- `right_color`：区间最右边的颜色
- `count`：区间内颜色段数量

合并时，如果左子区间的右端颜色 == 右子区间的左端颜色，段数减 1。

```python
class SegmentTreeColorCount:
    class Node:
        def __init__(self):
            self.left_color = -1   # 最左颜色
            self.right_color = -1  # 最右颜色
            self.count = 0         # 颜色段数
            self.cover = None      # 覆盖标记
    
    def _merge(self, left, right):
        """合并两个子区间的信息"""
        node = self.Node()
        node.left_color = left.left_color
        node.right_color = right.right_color
        node.count = left.count + right.count
        
        # 如果中间颜色相同，段数减 1
        if left.right_color == right.left_color:
            node.count -= 1
        
        return node
    
    def _pushdown(self, node, l, r):
        if node.cover is None:
            return
        
        color = node.cover
        
        # 下推到左子节点
        node.left.left_color = color
        node.left.right_color = color
        node.left.count = 1
        node.left.cover = color
        
        # 下推到右子节点
        node.right.left_color = color
        node.right.right_color = color
        node.right.count = 1
        node.right.cover = color
        
        node.cover = None
    
    def assign(self, node, l, r, ql, qr, color):
        """区间染色"""
        if l > qr or r < ql:
            return
        
        if ql <= l and r <= qr:
            node.left_color = color
            node.right_color = color
            node.count = 1
            node.cover = color
            return
        
        self._pushdown(node, l, r)
        mid = (l + r) // 2
        
        if ql <= mid:
            self.assign(node.left, l, mid, ql, qr, color)
        if qr > mid:
            self.assign(node.right, mid + 1, r, ql, qr, color)
        
        # 上推
        merged = self._merge(node.left, node.right)
        node.left_color = merged.left_color
        node.right_color = merged.right_color
        node.count = merged.count
```

---

## 常见错误与陷阱

### 错误一：用 0 表示无覆盖

```python
# 错误实现
class Node:
    def __init__(self):
        self.cover = 0  # ← 0 可能是有效值！

def pushdown(self, node, l, r):
    if node.cover == 0:  # ← 错误：无法区分「覆盖为0」和「无覆盖」
        return
```

**解决**：使用 `None` 或特殊值（如 `-1`、`inf`）表示无覆盖。

### 错误二：下推时忘记清空覆盖标记

```python
def pushdown(self, node, l, r):
    if node.cover is None:
        return
    
    node.left.cover = node.cover
    node.right.cover = node.cover
    # 忘记：node.cover = None  ← 会导致重复下推！
```

### 错误三：混淆开区间和闭区间

```python
# 题目要求：[left, right) 左闭右开
# 实现时：[left, right-1] 左闭右闭

# 需要统一区间表示方式
def addRange(self, left, right):
    # 转换为闭区间
    self._update(left, right - 1, 1)
```

---

## 与区间加法的对比总结

| 方面 | 区间加法 | 区间覆盖 |
|-----|---------|---------|
| 懒标记合并 | 累加 `tag += delta` | 覆盖 `tag = value` |
| 空标记判断 | `tag == 0` | `tag is None` |
| 下推策略 | 标记累加到子节点 | 标记覆盖子节点 |
| 历史信息 | 保留 | 丢失 |
| 典型应用 | 薪资调整、温度变化 | 染色、占用标记 |

---

## 本章小结

本章核心要点：

1. **区间覆盖的本质**：新值完全替代旧值，不依赖历史信息

2. **懒标记设计**：
   - 使用 `None` 表示无覆盖
   - 下推时直接覆盖子节点，无需合并

3. **典型应用**：
   - 染色问题
   - 区间占用/释放
   - Range Module 类问题

4. **变体扩展**：
   - 区间颜色段计数
   - 区间最值覆盖

**设计启示**：

懒标记的设计取决于操作的语义：
- 可累加操作（加法、乘法）→ 懒标记合并
- 覆盖操作 → 懒标记替换

理解操作的数学本质，是设计正确懒标记的关键。

下一章我们将学习**最大子段和查询**，这是线段树信息合并的经典高级应用。
