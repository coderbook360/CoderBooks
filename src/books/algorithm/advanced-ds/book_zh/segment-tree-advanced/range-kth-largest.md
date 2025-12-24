# 区间第 K 大

## 问题的提出

**问题描述**：给定一个数组 `nums`，支持以下操作：
- `query(l, r, k)`：查询区间 `[l, r]` 内第 k 小的元素

这是一个经典的难题。让我们先分析几种朴素方法的局限性。

**方法一：排序**
```python
def query(l, r, k):
    subarray = nums[l:r+1]
    subarray.sort()
    return subarray[k-1]
# 时间：O((r-l) log (r-l))
# 每次查询都需要排序，太慢
```

**方法二：快速选择**
```python
def query(l, r, k):
    # 使用快速选择算法
    return quickselect(nums[l:r+1], k)
# 时间：O(r-l) 平均
# 还是需要遍历整个区间
```

**方法三：权值线段树**

上一章我们学过，权值线段树可以统计某个值域内的元素个数。能否利用这一点？

```python
# 对整个数组建立权值线段树
# 查询第 k 小：从根节点开始，若左子树元素个数 >= k，递归左子树；否则递归右子树

# 问题：这只能查询全局第 k 小，无法限定区间！
```

**核心矛盾**：如何同时维护「位置信息」和「值域信息」？

---

## 核心思想：主席树（可持久化线段树）

### 关键洞察

假设我们对前缀 `[0, i]` 建立一棵权值线段树 `tree[i]`：
- `tree[0]`：只包含 `nums[0]`
- `tree[1]`：包含 `nums[0], nums[1]`
- `tree[i]`：包含 `nums[0], ..., nums[i]`

那么，`tree[r] - tree[l-1]` 就表示区间 `[l, r]` 的权值分布！

```python
# tree[r] 中值为 v 的元素个数 - tree[l-1] 中值为 v 的元素个数
# = 区间 [l, r] 中值为 v 的元素个数
```

**问题**：需要 O(N) 棵线段树，空间 O(N²)？

**解决方案**：**可持久化**！利用结构共享，每次插入只新建 O(log N) 个节点。

### 可持久化的原理

观察两棵相邻的权值线段树 `tree[i]` 和 `tree[i+1]`：
- 只在插入 `nums[i+1]` 的路径上有区别
- 其他节点完全相同

```
tree[i]:                    tree[i+1]:
     [0,7]                       [0,7]'
    /    \                      /    \
 [0,3]   [4,7]              [0,3]'  [4,7]  ← 共享！
 / \     / \                / \     / \
[0,1][2,3][4,5][6,7]     [0,1]'[2,3][4,5][6,7]  ← 大部分共享
```

**关键思想**：新版本只创建修改路径上的节点，其余节点与旧版本共享。

---

## 数据结构设计

### 节点结构

```python
class Node:
    def __init__(self):
        self.count = 0   # 该区间内的元素个数
        self.left = None
        self.right = None
```

### 插入操作（创建新版本）

```python
def insert(prev, l, r, pos):
    """基于 prev 创建新版本，在位置 pos 插入一个元素"""
    node = Node()
    node.count = prev.count + 1 if prev else 1
    
    if l == r:
        return node
    
    mid = (l + r) // 2
    
    if pos <= mid:
        # 插入左子树，右子树共享
        node.left = insert(prev.left if prev else None, l, mid, pos)
        node.right = prev.right if prev else None
    else:
        # 插入右子树，左子树共享
        node.left = prev.left if prev else None
        node.right = insert(prev.right if prev else None, mid + 1, r, pos)
    
    return node
```

### 区间第 k 小查询

```python
def query_kth(left_tree, right_tree, l, r, k):
    """查询 right_tree - left_tree 对应区间的第 k 小"""
    if l == r:
        return l  # 叶子节点，返回值
    
    mid = (l + r) // 2
    
    # 计算左子树在区间内的元素个数
    left_count = 0
    if right_tree and right_tree.left:
        left_count += right_tree.left.count
    if left_tree and left_tree.left:
        left_count -= left_tree.left.count
    
    if k <= left_count:
        # 第 k 小在左子树
        return query_kth(
            left_tree.left if left_tree else None,
            right_tree.left if right_tree else None,
            l, mid, k
        )
    else:
        # 第 k 小在右子树
        return query_kth(
            left_tree.right if left_tree else None,
            right_tree.right if right_tree else None,
            mid + 1, r, k - left_count
        )
```

---

## 完整实现

```python
class PersistentSegmentTree:
    """主席树（可持久化线段树）：支持区间第 k 小查询"""
    
    class Node:
        __slots__ = ['count', 'left', 'right']
        
        def __init__(self):
            self.count = 0
            self.left = None
            self.right = None
    
    def __init__(self, nums):
        self.n = len(nums)
        
        # 离散化
        self.sorted_vals = sorted(set(nums))
        self.rank = {v: i for i, v in enumerate(self.sorted_vals)}
        self.max_rank = len(self.sorted_vals) - 1
        
        # 构建 n+1 个版本的线段树
        # roots[i] 表示包含 nums[0..i-1] 的权值线段树
        self.roots = [None] * (self.n + 1)
        self.roots[0] = self.Node()  # 空树
        
        for i in range(self.n):
            r = self.rank[nums[i]]
            self.roots[i + 1] = self._insert(
                self.roots[i], 0, self.max_rank, r
            )
    
    def _insert(self, prev, l, r, pos):
        """创建新版本"""
        node = self.Node()
        node.count = (prev.count if prev else 0) + 1
        
        if l == r:
            return node
        
        mid = (l + r) // 2
        
        if pos <= mid:
            node.left = self._insert(
                prev.left if prev else None, l, mid, pos
            )
            node.right = prev.right if prev else None
        else:
            node.left = prev.left if prev else None
            node.right = self._insert(
                prev.right if prev else None, mid + 1, r, pos
            )
        
        return node
    
    def query(self, l, r, k):
        """查询区间 [l, r] 的第 k 小元素"""
        # roots[l] 包含 nums[0..l-1]
        # roots[r+1] 包含 nums[0..r]
        # 差值就是 nums[l..r]
        rank = self._query_kth(
            self.roots[l], self.roots[r + 1],
            0, self.max_rank, k
        )
        return self.sorted_vals[rank]
    
    def _query_kth(self, left_tree, right_tree, l, r, k):
        """查询第 k 小的值的排名"""
        if l == r:
            return l
        
        mid = (l + r) // 2
        
        # 计算左子树在区间内的元素个数
        left_count = self._get_count(right_tree, 'left') - \
                     self._get_count(left_tree, 'left')
        
        if k <= left_count:
            return self._query_kth(
                left_tree.left if left_tree else None,
                right_tree.left if right_tree else None,
                l, mid, k
            )
        else:
            return self._query_kth(
                left_tree.right if left_tree else None,
                right_tree.right if right_tree else None,
                mid + 1, r, k - left_count
            )
    
    def _get_count(self, node, child):
        """安全获取子节点的 count"""
        if node is None:
            return 0
        child_node = getattr(node, child, None)
        return child_node.count if child_node else 0
```

---

## 执行流程可视化

```python
nums = [2, 3, 1, 5, 4]

# 离散化
sorted_vals = [1, 2, 3, 4, 5]
rank = {1: 0, 2: 1, 3: 2, 4: 3, 5: 4}

# 构建主席树
# roots[0]: 空树
# roots[1]: 包含 nums[0]=2，即 rank=1
# roots[2]: 包含 nums[0..1]=[2,3]，即 rank=1,2
# roots[3]: 包含 nums[0..2]=[2,3,1]，即 rank=0,1,2
# roots[4]: 包含 nums[0..3]=[2,3,1,5]，即 rank=0,1,2,4
# roots[5]: 包含 nums[0..4]=[2,3,1,5,4]，即 rank=0,1,2,3,4

# 查询 query(1, 3, 2)：区间 [1,3] 的第 2 小
# 区间 [1,3] = [3, 1, 5]
# 排序后：[1, 3, 5]，第 2 小是 3

# roots[4] - roots[1] 的差值：
# rank=0 出现 1 次（nums[2]=1）
# rank=2 出现 1 次（nums[1]=3）
# rank=4 出现 1 次（nums[3]=5）

# 查询过程：
# 根节点：[0,4]，左子树[0,2]有 2 个元素（rank=0 和 rank=2）
# k=2 <= 2，进入左子树
# [0,2]：左子树[0,1]有 1 个元素（rank=0）
# k=2 > 1，进入右子树，k=2-1=1
# [2,2]：叶子节点，返回 rank=2
# sorted_vals[2] = 3 ✓
```

---

## 复杂度分析

| 操作 | 时间复杂度 | 空间复杂度 |
|-----|----------|-----------|
| 预处理（构建） | O(N log N) | O(N log N) |
| 单次查询 | O(log N) | O(1) |

**空间分析**：
- 每次插入创建 O(log N) 个新节点
- N 次插入共创建 O(N log N) 个节点
- 相比 N 棵完整线段树的 O(N²)，大大减少

---

## LeetCode 实战

### 静态区间第 K 小

**问题**：给定数组 `nums` 和多个查询 `(l, r, k)`，返回每个查询的答案。

```python
class Solution:
    def kthSmallest(self, nums, queries):
        tree = PersistentSegmentTree(nums)
        return [tree.query(l, r, k) for l, r, k in queries]
```

### 带修改的区间第 K 小（树状数组套主席树）

当需要支持单点修改时，可以使用**树状数组套主席树**：

```python
# 思路：
# - 对于每个树状数组节点 i，维护一棵主席树
# - 树状数组节点 i 的主席树包含 [i-lowbit(i)+1, i] 范围内的元素
# - 查询时，收集 O(log N) 棵主席树，同时二分

# 时间复杂度：O(log² N) 每次操作
# 空间复杂度：O(N log² N)
```

这是一个非常高级的数据结构，超出了本章的范围。有兴趣的读者可以进一步学习。

---

## 主席树的应用场景

### 场景一：区间不同元素个数

**问题**：查询区间 `[l, r]` 内有多少个不同的元素。

**思路**：离线处理，按右端点排序，维护每个值最后出现的位置。

### 场景二：区间 mex（最小未出现正整数）

**问题**：查询区间 `[l, r]` 内最小的未出现正整数。

**思路**：在主席树上二分，找到第一个出现次数为 0 的位置。

### 场景三：树上路径第 K 小

**问题**：给定一棵树，查询路径 `(u, v)` 上的第 k 小值。

**思路**：对每个节点维护从根到该节点的主席树，利用 LCA 合并查询。

---

## 常见错误与陷阱

### 错误一：忘记离散化

```python
# 错误：直接用原始值作为下标
pos = nums[i]  # 如果 nums[i] = 10^9，无法开这么大的数组

# 正确：使用离散化后的排名
pos = rank[nums[i]]
```

### 错误二：版本号对应关系

```python
# 容易混淆的地方：
# roots[i] 包含 nums[0..i-1]，即前 i 个元素
# 查询区间 [l, r] 需要 roots[r+1] - roots[l]

# 错误
tree.query(l, r, k)  # 内部用 roots[r] - roots[l-1]

# 正确
tree.query(l, r, k)  # 内部用 roots[r+1] - roots[l]
```

### 错误三：查询时减法顺序

```python
# 正确：right_tree.count - left_tree.count
left_count = right_tree.left.count - left_tree.left.count

# 错误：left_tree.count - right_tree.count（负数！）
```

---

## 主席树 vs 归并树

**归并树**是另一种解决区间第 K 小的数据结构：

| 方面 | 主席树 | 归并树 |
|-----|-------|-------|
| 预处理 | O(N log N) | O(N log N) |
| 单次查询 | O(log N) | O(log² N) |
| 空间 | O(N log N) | O(N log N) |
| 实现复杂度 | 较高 | 中等 |
| 扩展性 | 强 | 一般 |

**结论**：主席树查询更快，但实现更复杂。

---

## 本章小结

本章核心要点：

1. **主席树本质**：可持久化的权值线段树，通过版本差分实现区间查询

2. **核心技巧**：
   - 离散化：将值域压缩到 O(N)
   - 版本管理：`roots[i]` 表示前 i 个元素的权值线段树
   - 结构共享：每次插入只创建 O(log N) 个新节点

3. **查询逻辑**：
   - 用 `roots[r+1] - roots[l]` 得到区间 `[l, r]` 的权值分布
   - 在差值树上二分找第 k 小

4. **复杂度**：
   - 预处理：O(N log N) 时间和空间
   - 查询：O(log N) 时间

**设计启示**：

可持久化是一种强大的技术，通过结构共享实现高效的版本管理。这种思想不仅适用于线段树，还可以推广到其他数据结构：

- 可持久化数组
- 可持久化并查集
- 可持久化平衡树

掌握主席树，你就打开了可持久化数据结构的大门。

---

## 线段树进阶篇总结

恭喜你完成了线段树进阶部分的学习！让我们回顾这一路的旅程：

| 章节 | 核心技术 | 应用场景 |
|-----|---------|---------|
| 动态开点 | 按需分配节点 | 大值域、稀疏数据 |
| 线段树合并 | 递归合并两棵树 | 树形 DP、有序集合合并 |
| 扫描线 | 降维 + 事件处理 | 面积并、周长并 |
| 天际线问题 | 关键点提取 | 轮廓线问题 |
| 区间加区间和 | 懒惰传播 | 批量修改 |
| 区间乘区间和 | 复合变换 | 多种操作混合 |
| 区间覆盖 | 覆盖语义懒标记 | 染色、占用标记 |
| 最大子段和 | 信息合并设计 | 带修改的最大子数组 |
| 逆序对计数 | 权值线段树 | 统计类问题 |
| 区间第 K 大 | 主席树 | 区间排名查询 |

**核心思维**：
1. 懒惰传播：延迟更新，按需下推
2. 信息设计：维护足够的信息以支持合并
3. 可持久化：版本管理，结构共享
4. 权值视角：将统计问题转化为区间查询

掌握这些技术，你已经具备解决绝大多数线段树问题的能力。下一步，可以挑战树状数组、平衡树等其他高级数据结构！
