# 线段树原理与实现

## 为什么需要线段树？

在数组操作中，有一类问题让人头疼：**既要支持高频的区间查询，又要支持频繁的单点修改**。

假设有一个数组 `[1, 3, 5, 7, 9, 11]`，需要支持两种操作：
- 查询区间 `[L, R]` 的和（如区间 `[1, 4]` 的和是多少？）
- 修改某个位置的值（如将 `arr[2]` 改为 8）

**朴素方案的困境**：

遍历求和：
- 查询：O(N)
- 修改：O(1)
- 缺陷：查询太慢

前缀和：
- 查询：O(1)
- 修改：O(N)（需要更新后续所有前缀和）
- 缺陷：修改太慢

**核心矛盾**：如何在 O(logN) 时间内同时支持区间查询和单点修改？

这就是线段树存在的价值——**将两种操作的时间复杂度都优化到 O(logN)**。

## 线段树的设计思想

线段树（Segment Tree）是一种**二叉树结构**，每个节点存储某个区间的统计信息（如和、最大值、最小值）。

**核心思想：分治 + 预处理**
- **分治**：将大区间拆分成若干小区间，递归处理
- **预处理**：提前计算并存储每个区间的统计值
- **快速查询**：将目标区间拆分成树中已有的子区间，合并结果

### 结构示例

对于数组 `[1, 3, 5, 7, 9, 11]`，构建的线段树如下：

```
                    [0,5]: 36
                   /           \
            [0,2]: 9           [3,5]: 27
           /       \           /        \
      [0,1]: 4   [2,2]: 5  [3,4]: 16  [5,5]: 11
      /     \               /      \
[0,0]: 1  [1,1]: 3    [3,3]: 7  [4,4]: 9
```

**关键特性**：
- 叶子节点存储单个元素
- 非叶子节点存储子区间的合并结果
- 树高为 O(logN)
- 每次查询/修改最多访问 O(logN) 个节点

## 线段树的存储方式

线段树是完全二叉树（或接近完全二叉树），可以用数组存储。

**数组索引规律**：
- 根节点：索引 1
- 节点 i 的左子节点：`2 * i`
- 节点 i 的右子节点：`2 * i + 1`
- 节点 i 的父节点：`i // 2`

**数组长度**：对于长度为 N 的原始数组，线段树数组需要 `4 * N` 的空间（防止满二叉树扩展时越界）。

## 线段树的三大核心操作

### 1. 构建（Build）

**目标**：自底向上构建线段树，计算每个节点的区间统计值。

**递归思路**：
1. 叶子节点（l == r）：直接存储原数组值
2. 非叶子节点：递归构建左右子树，然后合并结果

**代码实现**：

```python
class SegmentTree:
    def __init__(self, nums):
        self.n = len(nums)
        self.tree = [0] * (4 * self.n)  # 分配 4N 空间
        if self.n > 0:
            self._build(nums, 1, 0, self.n - 1)
    
    def _build(self, nums, node, start, end):
        """构建线段树
        
        Args:
            nums: 原始数组
            node: 当前节点索引
            start: 区间左边界
            end: 区间右边界
        """
        if start == end:
            # 叶子节点
            self.tree[node] = nums[start]
            return
        
        # 递归构建左右子树
        mid = (start + end) // 2
        left_child = 2 * node
        right_child = 2 * node + 1
        
        self._build(nums, left_child, start, mid)       # 左子树
        self._build(nums, right_child, mid + 1, end)   # 右子树
        
        # 合并子树结果（这里以求和为例）
        self.tree[node] = self.tree[left_child] + self.tree[right_child]
```

**时间复杂度**：O(N)（每个节点访问一次）

### 2. 查询（Query）

**目标**：查询区间 `[L, R]` 的统计值（如区间和）。

**核心思路**：
- 当前区间完全包含在查询区间内 → 直接返回当前节点值
- 当前区间与查询区间无交集 → 返回 0（单位元）
- 当前区间部分重叠 → 递归查询左右子树，合并结果

**代码实现**：

```python
def query(self, L, R):
    """查询区间 [L, R] 的和"""
    return self._query(1, 0, self.n - 1, L, R)

def _query(self, node, start, end, L, R):
    """递归查询
    
    Args:
        node: 当前节点索引
        start, end: 当前节点表示的区间
        L, R: 查询的目标区间
    """
    # 情况1：当前区间在查询区间外
    if R < start or L > end:
        return 0
    
    # 情况2：当前区间完全包含在查询区间内
    if L <= start and end <= R:
        return self.tree[node]
    
    # 情况3：部分重叠，递归查询左右子树
    mid = (start + end) // 2
    left_child = 2 * node
    right_child = 2 * node + 1
    
    left_sum = self._query(left_child, start, mid, L, R)
    right_sum = self._query(right_child, mid + 1, end, L, R)
    
    return left_sum + right_sum
```

**时间复杂度**：O(logN)（树高）

**查询示例**：查询区间 `[1, 4]`
- 访问根节点 `[0,5]`：部分重叠，递归左右子树
- 访问 `[0,2]`：与 `[1,4]` 重叠，继续递归
- 访问 `[0,1]`：部分重叠，继续递归
- 访问 `[1,1]`：完全包含，返回 3
- 访问 `[2,2]`：完全包含，返回 5
- 访问 `[3,5]`：部分重叠，继续递归
- 访问 `[3,4]`：完全包含，返回 16

最终结果：3 + 5 + 16 = 24

### 3. 更新（Update）

**目标**：修改索引 `idx` 的值为 `val`。

**核心思路**：
- 从根节点出发，找到对应的叶子节点
- 更新叶子节点的值
- 自底向上更新所有祖先节点

**代码实现**：

```python
def update(self, idx, val):
    """更新索引 idx 的值为 val"""
    self._update(1, 0, self.n - 1, idx, val)

def _update(self, node, start, end, idx, val):
    """递归更新
    
    Args:
        node: 当前节点索引
        start, end: 当前节点表示的区间
        idx: 要更新的索引
        val: 新值
    """
    if start == end:
        # 找到叶子节点，更新值
        self.tree[node] = val
        return
    
    mid = (start + end) // 2
    left_child = 2 * node
    right_child = 2 * node + 1
    
    # 递归更新对应的子树
    if idx <= mid:
        self._update(left_child, start, mid, idx, val)
    else:
        self._update(right_child, mid + 1, end, idx, val)
    
    # 更新当前节点（合并左右子树）
    self.tree[node] = self.tree[left_child] + self.tree[right_child]
```

**时间复杂度**：O(logN)（沿着树路径更新）

## 完整实现

将三大操作整合到完整的线段树类中：

```python
class SegmentTree:
    """区间求和线段树"""
    
    def __init__(self, nums):
        self.n = len(nums)
        self.tree = [0] * (4 * self.n)
        if self.n > 0:
            self._build(nums, 1, 0, self.n - 1)
    
    def _build(self, nums, node, start, end):
        if start == end:
            self.tree[node] = nums[start]
            return
        
        mid = (start + end) // 2
        left_child = 2 * node
        right_child = 2 * node + 1
        
        self._build(nums, left_child, start, mid)
        self._build(nums, right_child, mid + 1, end)
        self.tree[node] = self.tree[left_child] + self.tree[right_child]
    
    def query(self, L, R):
        """查询区间 [L, R] 的和"""
        return self._query(1, 0, self.n - 1, L, R)
    
    def _query(self, node, start, end, L, R):
        if R < start or L > end:
            return 0
        if L <= start and end <= R:
            return self.tree[node]
        
        mid = (start + end) // 2
        left_child = 2 * node
        right_child = 2 * node + 1
        
        left_sum = self._query(left_child, start, mid, L, R)
        right_sum = self._query(right_child, mid + 1, end, L, R)
        return left_sum + right_sum
    
    def update(self, idx, val):
        """更新索引 idx 的值为 val"""
        self._update(1, 0, self.n - 1, idx, val)
    
    def _update(self, node, start, end, idx, val):
        if start == end:
            self.tree[node] = val
            return
        
        mid = (start + end) // 2
        left_child = 2 * node
        right_child = 2 * node + 1
        
        if idx <= mid:
            self._update(left_child, start, mid, idx, val)
        else:
            self._update(right_child, mid + 1, end, idx, val)
        
        self.tree[node] = self.tree[left_child] + self.tree[right_child]
```

## 使用示例

```python
# 构建线段树
nums = [1, 3, 5, 7, 9, 11]
seg_tree = SegmentTree(nums)

# 查询区间和
print(seg_tree.query(1, 4))  # 输出: 24 (3+5+7+9)

# 修改元素
seg_tree.update(2, 8)  # 将 nums[2] 从 5 改为 8

# 再次查询
print(seg_tree.query(1, 4))  # 输出: 27 (3+8+7+9)
```

## 线段树的通用性

上面的实现是针对**区间求和**的，但线段树的思想是通用的。只需修改合并逻辑，就能处理不同的区间查询：

**区间最大值**：
```python
# 构建和更新时
self.tree[node] = max(self.tree[left_child], self.tree[right_child])

# 查询时返回单位元
if R < start or L > end:
    return float('-inf')  # 负无穷
```

**区间最小值**：
```python
self.tree[node] = min(self.tree[left_child], self.tree[right_child])

# 查询时返回单位元
if R < start or L > end:
    return float('inf')  # 正无穷
```

**区间 GCD**：
```python
import math
self.tree[node] = math.gcd(self.tree[left_child], self.tree[right_child])

# 查询时返回单位元
if R < start or L > end:
    return 0  # GCD 的单位元
```

## 线段树 vs 其他方案

| 方案 | 查询复杂度 | 修改复杂度 | 适用场景 |
|------|-----------|-----------|---------|
| **朴素遍历** | O(N) | O(1) | 修改频繁，查询少 |
| **前缀和** | O(1) | O(N) | 静态数组，无修改 |
| **线段树** | O(logN) | O(logN) | 频繁查询+修改 |
| **树状数组** | O(logN) | O(logN) | 单点修改，区间查询（空间更优） |

**线段树的优势**：
- ✅ 支持各种区间统计操作（和、最值、GCD、XOR 等）
- ✅ 支持区间修改（通过懒惰传播技术）
- ✅ 查询和修改都是 O(logN)

**线段树的代价**：
- ❌ 空间开销大（4N）
- ❌ 实现相对复杂
- ❌ 常数较大，对于简单问题可能不如树状数组

## 常见陷阱

### 1. 索引从 1 开始

线段树节点索引通常从 1 开始（而不是 0），这样可以方便地使用 `2*i` 和 `2*i+1` 计算子节点。

**错误示例**：
```python
# 从索引 0 开始会导致左右子节点计算错误
left_child = 2 * 0  # 结果为 0，死循环
```

### 2. 数组越界

线段树需要 `4 * N` 的空间，而不是 `2 * N`。对于某些不平衡的区间分布，可能需要更多空间。

**安全做法**：
```python
self.tree = [0] * (4 * self.n)  # 始终分配 4N 空间
```

### 3. 查询区间的边界处理

查询时要注意区间的开闭关系，统一使用闭区间 `[L, R]` 可以避免混淆。

### 4. 合并操作的单位元

不同的统计操作有不同的单位元：
- 求和：0
- 求积：1
- 最大值：负无穷
- 最小值：正无穷
- GCD：0

**错误示例**：
```python
# 查询最大值时返回 0 作为单位元（错误）
if R < start or L > end:
    return 0  # 应该返回 float('-inf')
```

## 总结

线段树是一种强大的数据结构，通过**分治思想**和**预处理**，将区间查询和单点修改的复杂度都优化到 O(logN)。

**核心要点**：
1. **结构**：完全二叉树，每个节点存储区间统计信息
2. **存储**：数组实现，索引从 1 开始，需要 4N 空间
3. **构建**：自底向上，O(N) 时间
4. **查询**：递归分解目标区间，O(logN) 时间
5. **更新**：沿树路径更新节点，O(logN) 时间
6. **通用性**：修改合并逻辑，支持多种区间统计

线段树的设计体现了**用空间换时间**的思想：通过预存储所有可能的区间信息，避免每次查询都重新计算。虽然实现相对复杂，但在需要频繁进行区间操作的场景中，线段树是不可替代的利器。

下一章我们将通过具体的 LeetCode 题目，深入理解线段树在区间求和问题中的应用。
