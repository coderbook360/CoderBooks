# 最大子段和查询

## 问题的提出

**经典问题回顾**：给定数组，求连续子数组的最大和。

这是一道经典的动态规划问题，Kadane 算法可以 O(N) 求解。但如果问题变成这样呢？

**进阶问题**：
```python
# 有 N 个元素的数组
nums = [2, -1, 3, -2, 4, -1, 2, 1, -5, 4]

# 操作1：修改 nums[i] = x
# 操作2：查询区间 [l, r] 内的最大子段和

# 支持 Q 次混合操作
```

**朴素方法**：每次查询暴力计算 → O(Q × N)

当 N 和 Q 都很大时（如 10^5），这个复杂度是不可接受的。

思考一下，如何利用线段树解决这个问题？

**核心挑战**：最大子段和不像区间和那样可以简单地「左子区间 + 右子区间」，因为最大子段可能**跨越左右边界**。

---

## 核心思想：信息的正确合并

### 子区间的四种情况

当合并两个子区间时，最大子段和可能来自：

1. **完全在左子区间内**
2. **完全在右子区间内**
3. **跨越中点**：左子区间的后缀 + 右子区间的前缀

```
        [       父区间       ]
        [  左子区间  ][  右子区间  ]
                    ↑
情况1:  [###]                        完全在左边
情况2:              [###]            完全在右边
情况3:         [#####]               跨越中点
```

### 需要维护的信息

为了正确合并，每个节点需要维护四个信息：

| 信息 | 含义 | 用途 |
|-----|------|-----|
| `sum` | 区间总和 | 计算前缀/后缀和 |
| `max_prefix` | 最大前缀和 | 合并时计算跨区间的右半部分 |
| `max_suffix` | 最大后缀和 | 合并时计算跨区间的左半部分 |
| `max_sub` | 最大子段和 | 最终答案 |

### 合并逻辑

设左子区间为 `L`，右子区间为 `R`，合并后的父区间为 `P`：

```python
P.sum = L.sum + R.sum

P.max_prefix = max(
    L.max_prefix,              # 最大前缀完全在左边
    L.sum + R.max_prefix       # 左边全部 + 右边的最大前缀
)

P.max_suffix = max(
    R.max_suffix,              # 最大后缀完全在右边
    R.sum + L.max_suffix       # 右边全部 + 左边的最大后缀
)

P.max_sub = max(
    L.max_sub,                 # 完全在左子区间
    R.max_sub,                 # 完全在右子区间
    L.max_suffix + R.max_prefix # 跨越中点
)
```

**关键洞察**：跨越中点的最大子段 = 左边的最大后缀 + 右边的最大前缀。

---

## 数据结构设计

```python
class Node:
    def __init__(self, val=0):
        self.sum = val          # 区间和
        self.max_prefix = val   # 最大前缀和
        self.max_suffix = val   # 最大后缀和
        self.max_sub = val      # 最大子段和
        self.left = None
        self.right = None
```

对于叶子节点（单个元素 `val`）：
- `sum = val`
- `max_prefix = val`
- `max_suffix = val`
- `max_sub = val`

---

## 完整实现

```python
class SegmentTreeMaxSubarray:
    """支持单点修改、区间最大子段和查询的线段树"""
    
    class Node:
        __slots__ = ['sum', 'max_prefix', 'max_suffix', 'max_sub', 'left', 'right']
        
        def __init__(self, val=0):
            self.sum = val
            self.max_prefix = val
            self.max_suffix = val
            self.max_sub = val
            self.left = None
            self.right = None
    
    def __init__(self, nums):
        self.n = len(nums)
        self.root = self._build(nums, 0, self.n - 1)
    
    def _build(self, nums, l, r):
        if l == r:
            return self.Node(nums[l])
        
        mid = (l + r) // 2
        node = self.Node()
        node.left = self._build(nums, l, mid)
        node.right = self._build(nums, mid + 1, r)
        self._pushup(node)
        return node
    
    def _pushup(self, node):
        """合并左右子区间的信息"""
        L, R = node.left, node.right
        
        node.sum = L.sum + R.sum
        
        node.max_prefix = max(L.max_prefix, L.sum + R.max_prefix)
        node.max_suffix = max(R.max_suffix, R.sum + L.max_suffix)
        
        node.max_sub = max(
            L.max_sub,
            R.max_sub,
            L.max_suffix + R.max_prefix
        )
    
    def update(self, index, value):
        """单点修改：将 nums[index] 改为 value"""
        self._update(self.root, 0, self.n - 1, index, value)
    
    def _update(self, node, l, r, index, value):
        if l == r:
            # 叶子节点：更新所有字段
            node.sum = value
            node.max_prefix = value
            node.max_suffix = value
            node.max_sub = value
            return
        
        mid = (l + r) // 2
        if index <= mid:
            self._update(node.left, l, mid, index, value)
        else:
            self._update(node.right, mid + 1, r, index, value)
        
        self._pushup(node)
    
    def query(self, ql, qr):
        """查询区间 [ql, qr] 的最大子段和"""
        result = self._query(self.root, 0, self.n - 1, ql, qr)
        return result.max_sub
    
    def _query(self, node, l, r, ql, qr):
        if ql <= l and r <= qr:
            # 完全覆盖：返回节点的完整信息
            return node
        
        mid = (l + r) // 2
        
        # 只与左子区间相交
        if qr <= mid:
            return self._query(node.left, l, mid, ql, qr)
        
        # 只与右子区间相交
        if ql > mid:
            return self._query(node.right, mid + 1, r, ql, qr)
        
        # 与两边都相交：需要手动合并
        left_result = self._query(node.left, l, mid, ql, qr)
        right_result = self._query(node.right, mid + 1, r, ql, qr)
        
        return self._merge(left_result, right_result)
    
    def _merge(self, L, R):
        """合并两个查询结果"""
        result = self.Node()
        
        result.sum = L.sum + R.sum
        result.max_prefix = max(L.max_prefix, L.sum + R.max_prefix)
        result.max_suffix = max(R.max_suffix, R.sum + L.max_suffix)
        result.max_sub = max(L.max_sub, R.max_sub, L.max_suffix + R.max_prefix)
        
        return result
```

---

## 执行流程可视化

用一个例子验证我们的实现：

```python
nums = [1, -2, 3, 4, -1, 2, 1, -5, 4]
tree = SegmentTreeMaxSubarray(nums)
```

**线段树结构**：

```
                    [0,8]
                sum=7, max_sub=9
               /              \
          [0,4]                [5,8]
       sum=5, max_sub=7      sum=2, max_sub=4
       /        \             /        \
    [0,2]      [3,4]      [5,6]      [7,8]
   sum=2       sum=3      sum=3      sum=-1
   max_sub=3   max_sub=4  max_sub=3  max_sub=4
```

**查询 [2, 6]**：

1. 拆分为 `[2,4]` 和 `[5,6]`
2. `[2,4]` 的 max_sub = 7（包含 3, 4）
3. `[5,6]` 的 max_sub = 3（包含 2, 1）
4. 跨区间：`[2,4]` 的 max_suffix + `[5,6]` 的 max_prefix
   - max_suffix of [2,4] = 3 + 4 + (-1) = 6 或 4 + (-1) = 3 或 -1 → 取 6
   - max_prefix of [5,6] = 2 或 2 + 1 = 3 → 取 3
   - 跨区间 = 6 + 3 = 9
5. 结果 = max(7, 3, 9) = 9 ✓

**验证**：子数组 [3, 4, -1, 2, 1] 的和 = 9，确实是 [2,6] 内的最大子段和。

---

## LeetCode 实战

### 53. 最大子数组和

虽然这道题用 Kadane 算法更简单，但可以用线段树来练习：

```python
class Solution:
    def maxSubArray(self, nums):
        tree = SegmentTreeMaxSubarray(nums)
        return tree.query(0, len(nums) - 1)
```

### 变体：带修改的最大子数组和

```python
# 操作序列
operations = [
    ("query", 0, 8),    # 查询 [0,8] 的最大子段和
    ("update", 3, -10), # 将 nums[3] 改为 -10
    ("query", 0, 8),    # 重新查询
]

nums = [1, -2, 3, 4, -1, 2, 1, -5, 4]
tree = SegmentTreeMaxSubarray(nums)

for op in operations:
    if op[0] == "query":
        print(tree.query(op[1], op[2]))
    else:
        tree.update(op[1], op[2])
```

### GSS 系列题目

在 SPOJ（Sphere Online Judge）上有一系列经典的 GSS 题目：

**GSS1 - Can you answer these queries I**
- 单点修改
- 区间最大子段和查询

**GSS3 - Can you answer these queries III**
- 与 GSS1 类似，但需要更高效的实现

```python
# GSS1/GSS3 完整解法
import sys
from typing import List, Tuple

def solve_gss(n: int, nums: List[int], queries: List[Tuple[int, int, int]]):
    tree = SegmentTreeMaxSubarray(nums)
    results = []
    
    for op, x, y in queries:
        if op == 0:  # 修改
            tree.update(x - 1, y)  # 1-indexed to 0-indexed
        else:  # 查询
            results.append(tree.query(x - 1, y - 1))
    
    return results
```

---

## 扩展：支持区间修改

如果需要支持区间加法操作，需要引入懒标记：

```python
class SegmentTreeMaxSubarrayLazy:
    """支持区间加法、区间最大子段和查询"""
    
    class Node:
        def __init__(self, val=0):
            self.sum = val
            self.max_prefix = val
            self.max_suffix = val
            self.max_sub = val
            self.lazy = 0  # 加法懒标记
            self.left = None
            self.right = None
    
    def _apply(self, node, l, r, delta):
        """对节点应用加法操作"""
        length = r - l + 1
        node.sum += delta * length
        node.max_prefix += delta * length  # 注意：前缀可能变大或变小
        node.max_suffix += delta * length
        node.max_sub += delta * length
        node.lazy += delta
    
    def _pushdown(self, node, l, r):
        if node.lazy == 0:
            return
        
        mid = (l + r) // 2
        self._apply(node.left, l, mid, node.lazy)
        self._apply(node.right, mid + 1, r, node.lazy)
        node.lazy = 0
```

**注意**：上面的 `_apply` 实现是**错误**的！

**为什么错误？**

考虑区间 `[1, -3, 2]`：
- 原始 max_prefix = 1
- 全体加 10 后：`[11, 7, 12]`
- 新的 max_prefix = 11 + 7 + 12 = 30 ≠ 1 + 30 = 31

**正确理解**：区间加法后，max_prefix、max_suffix、max_sub 不能简单地加上 `delta * length`。

**解决方案**：使用分块思想或者承认某些操作组合无法高效支持。

---

## 常见错误与陷阱

### 错误一：忘记处理跨区间情况

```python
# 错误实现
def query_wrong(self, node, l, r, ql, qr):
    if ql <= l and r <= qr:
        return node.max_sub  # ← 只返回了 max_sub
    
    # ... 递归查询 ...
    
    # 错误：直接取 max，没有考虑跨区间
    return max(left_result, right_result)  # ← 缺少合并逻辑
```

**正确做法**：查询时必须返回完整的四元组信息，然后正确合并。

### 错误二：初始化叶子节点时忘记处理负数

```python
# 错误实现（假设所有值非负）
class Node:
    def __init__(self, val=0):
        self.max_sub = max(0, val)  # ← 错误：如果允许空子数组则需要
```

**说明**：取决于题目定义。如果允许空子数组，max_sub 可以是 0；否则必须至少包含一个元素。

### 错误三：合并时计算前缀/后缀的公式写反

```python
# 错误实现
node.max_prefix = max(R.max_prefix, R.sum + L.max_prefix)  # ← 左右写反了
```

**正确**：max_prefix 是从左边开始的，所以应该是 `L.max_prefix` 或 `L.sum + R.max_prefix`。

---

## 复杂度分析

| 操作 | 时间复杂度 | 说明 |
|-----|----------|------|
| 构建 | O(N) | 自底向上构建 |
| 单点修改 | O(log N) | 路径上的节点需要 pushup |
| 区间查询 | O(log N) | 最多访问 O(log N) 个节点 |

空间复杂度：O(N)

---

## 本章小结

本章核心要点：

1. **信息设计**：维护 `(sum, max_prefix, max_suffix, max_sub)` 四元组

2. **合并逻辑**：
   - `sum = L.sum + R.sum`
   - `max_prefix = max(L.max_prefix, L.sum + R.max_prefix)`
   - `max_suffix = max(R.max_suffix, R.sum + L.max_suffix)`
   - `max_sub = max(L.max_sub, R.max_sub, L.max_suffix + R.max_prefix)`

3. **查询返回类型**：必须返回完整的四元组，而不仅仅是 max_sub

4. **适用场景**：
   - 带修改的最大子段和
   - 区间最大子段和查询

**设计启示**：

线段树能解决的问题范围远超「区间求和」。关键在于：
1. 识别需要维护的信息
2. 设计正确的合并逻辑（pushup）
3. 确保信息足以完成合并

这种「设计信息 → 设计合并」的思维模式，可以推广到更多复杂的区间问题。

下一章我们将学习**逆序对计数**，探索线段树在统计类问题中的应用。
