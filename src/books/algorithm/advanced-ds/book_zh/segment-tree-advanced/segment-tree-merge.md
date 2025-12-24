# 线段树合并

## 问题的提出

假设有这样一个场景：

**场景一：多个有序集合的合并**
```python
# 有 N 个有序集合，每个集合都用线段树维护
trees = [SegmentTree(range1), SegmentTree(range2), ..., SegmentTree(rangeN)]

# 需要合并所有集合，得到总的统计信息
# 朴素方法：遍历所有元素重新插入
for tree in trees:
    for element in tree:
        merged_tree.insert(element)  # O(N * M * logN)
```

**场景二：树形DP的统计**
```python
# 树上每个节点维护一个线段树，存储子树信息
# 需要合并子节点的线段树到父节点
def dfs(node):
    for child in node.children:
        dfs(child)
        # 如何高效合并 child_tree 到 node_tree？
        node.tree.merge(child.tree)
```

**核心问题**：如何高效合并两棵线段树？

**朴素方法的代价**：
- 遍历一棵树的所有元素：`O(N)`
- 逐个插入到另一棵树：`O(N * logN)`
- 总复杂度：`O(N * logN)`

思考一下，线段树是树形结构，能否像归并排序那样，利用结构特性加速合并？

答案是肯定的。这就是**线段树合并**技术。

---

## 核心思想：结构化合并

线段树合并不是逐元素操作，而是**按树的结构递归合并**。

### 关键观察

两棵管理相同区间的线段树，它们的结构是对应的：
- 根节点都管理 `[L, R]`
- 左子树都管理 `[L, mid]`
- 右子树都管理 `[mid+1, R]`

**合并策略**：
1. 如果其中一棵树的节点为空，直接返回另一棵
2. 如果两棵树的节点都存在，递归合并左右子树
3. 合并当前节点的值

**类比生活场景**：
- **朴素方法**：把一本书的每个字符抄写到另一本书
- **结构化合并**：把两本书的相同章节合并，只合并有内容的部分

### 复杂度分析

**关键**：每次合并，至少有一个节点会"消失"（被合并到另一个节点）。

- 两棵树共有 `n1 + n2` 个节点
- 每次递归处理一个节点
- 最多执行 `n1 + n2` 次递归

**时间复杂度**：`O(n1 + n2)`，其中 `n1`, `n2` 是两棵树的节点数。

对比朴素方法的 `O(N * logN)`（N 是元素总数），线段树合并在稀疏树（节点数远小于元素数）时有显著优势。

---

## 实现：动态开点线段树合并

使用动态开点线段树，因为：
1. 节点用指针表示，方便直接返回引用
2. 支持稀疏数据，合并效率更高

### 完整代码

```python
class Node:
    def __init__(self):
        self.val = 0         # 节点值（区间和/计数等）
        self.left = None     # 左子节点
        self.right = None    # 右子节点

class DynamicSegmentTree:
    def __init__(self, L: int, R: int):
        self.L = L
        self.R = R
        self.root = None  # 允许根节点为空
    
    def update(self, pos: int, val: int):
        """单点更新"""
        self.root = self._update(self.root, self.L, self.R, pos, val)
    
    def _update(self, node: Node, l: int, r: int, 
                pos: int, val: int) -> Node:
        """
        递归更新，返回更新后的节点
        """
        if node is None:
            node = Node()
        
        if l == r:  # 叶节点
            node.val += val
            return node
        
        mid = (l + r) // 2
        if pos <= mid:
            node.left = self._update(node.left, l, mid, pos, val)
        else:
            node.right = self._update(node.right, mid + 1, r, pos, val)
        
        # 更新当前节点
        left_val = node.left.val if node.left else 0
        right_val = node.right.val if node.right else 0
        node.val = left_val + right_val
        
        return node
    
    def query(self, start: int, end: int) -> int:
        """区间查询"""
        return self._query(self.root, self.L, self.R, start, end)
    
    def _query(self, node: Node, l: int, r: int, 
               start: int, end: int) -> int:
        if node is None or end < l or start > r:
            return 0
        
        if start <= l and r <= end:
            return node.val
        
        mid = (l + r) // 2
        res = 0
        res += self._query(node.left, l, mid, start, end)
        res += self._query(node.right, mid + 1, r, start, end)
        return res
    
    def merge(self, other: 'DynamicSegmentTree'):
        """
        合并另一棵线段树到当前树
        合并后 other 会被破坏（节点被复用）
        """
        self.root = self._merge(self.root, other.root, self.L, self.R)
    
    def _merge(self, node1: Node, node2: Node, 
               l: int, r: int) -> Node:
        """
        合并两个节点
        返回合并后的节点
        
        核心思想：
        1. 如果其中一个为空，返回另一个
        2. 否则递归合并左右子树
        3. 更新当前节点值
        """
        # 情况1：node1 为空，直接返回 node2
        if node1 is None:
            return node2
        
        # 情况2：node2 为空，直接返回 node1
        if node2 is None:
            return node1
        
        # 情况3：都不为空，递归合并
        
        # 叶节点：直接合并值
        if l == r:
            node1.val += node2.val
            return node1
        
        mid = (l + r) // 2
        
        # 递归合并左子树
        node1.left = self._merge(node1.left, node2.left, l, mid)
        
        # 递归合并右子树
        node1.right = self._merge(node1.right, node2.right, mid + 1, r)
        
        # 更新当前节点值
        left_val = node1.left.val if node1.left else 0
        right_val = node1.right.val if node1.right else 0
        node1.val = left_val + right_val
        
        return node1
```

### 关键设计要点

**1. 合并的本质**

```python
# 不是复制节点，而是"移动"节点
node1.left = self._merge(node1.left, node2.left, l, mid)
# node2.left 的子树被合并到 node1.left
# node2 的结构被破坏
```

**2. 空节点处理**

```python
# 核心逻辑：谁空返回谁的"对方"
if node1 is None: return node2  # node1 空，用 node2 的数据
if node2 is None: return node1  # node2 空，保留 node1
```

这保证了时间复杂度：空节点直接跳过，不递归。

**3. 合并的副作用**

```python
tree1.merge(tree2)
# 之后 tree2 的结构被破坏，不应再使用
```

如果需要保留原树，必须先复制。

**4. 复杂度保证**

每次递归：
- 至少有一个节点为空（直接返回，O(1)）
- 或者两个节点都不为空（合并后节点数减少）

总递归次数 ≤ 两棵树的节点总数。

---

## 应用场景

### 场景一：合并多个区间计数

**问题**：有 N 个数组，每个数组包含一些数字（范围 `[1, 10^9]`）。统计所有数组中每个数字出现的总次数。

**方案对比**：

| 方案 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 哈希表合并 | O(N * M) | O(N * M) | M 为平均数组长度 |
| 线段树逐元素插入 | O(N * M * log(10^9)) | O(M * log(10^9)) | 慢 |
| 线段树合并 | O(M * log(10^9)) | O(M * log(10^9)) | 最优 |

**实现**：

```python
def merge_counts(arrays):
    """
    合并多个数组的元素计数
    arrays: List[List[int]]
    返回: {num: count}
    """
    # 为每个数组建立线段树
    trees = []
    for arr in arrays:
        tree = DynamicSegmentTree(1, 10**9)
        for num in arr:
            tree.update(num, 1)  # 计数 +1
        trees.append(tree)
    
    # 依次合并所有线段树
    result_tree = trees[0]
    for i in range(1, len(trees)):
        result_tree.merge(trees[i])
    
    # 提取结果（需要额外实现遍历功能）
    return result_tree

# 使用示例
arrays = [
    [1, 2, 3],
    [2, 3, 4],
    [3, 4, 5]
]
merged = merge_counts(arrays)
# 查询任意数字的出现次数
count_of_3 = merged.query(3, 3)  # 3 出现了 3 次
```

### 场景二：树形DP统计子树信息

**问题**：给定一棵树，每个节点有一个权值 `val[i]`。对于每个节点，统计其子树中有多少不同的权值。

**传统方法**：
```python
def dfs(node):
    count_set = {node.val}
    for child in node.children:
        child_set = dfs(child)
        count_set.update(child_set)  # O(子树大小)
    return count_set

# 总复杂度：O(N^2)（每个节点可能被访问多次）
```

**线段树合并方法**：

```python
class TreeNode:
    def __init__(self, val):
        self.val = val
        self.children = []
        self.tree = DynamicSegmentTree(1, 10**9)

def dfs(node):
    # 插入当前节点的权值
    node.tree.update(node.val, 1)
    
    # 合并所有子节点的线段树
    for child in node.children:
        dfs(child)
        node.tree.merge(child.tree)  # O(节点数)
    
    # 统计不同权值数量
    # （需要额外维护计数信息）

# 总复杂度：O(N * logN)
```

**复杂度分析**：
- 每个节点只被访问一次
- 每次合并的复杂度为 `O(子树节点数)`
- 总复杂度：所有子树节点数之和 = `O(N * logN)`

### 场景三：区间并集

**问题**：有 N 个区间 `[l1, r1], [l2, r2], ..., [ln, rn]`。求这些区间的并集覆盖了多少个整数点。

**线段树合并方法**：

```python
def union_intervals(intervals):
    """
    计算区间并集的长度
    intervals: List[Tuple[int, int]]
    """
    trees = []
    for l, r in intervals:
        tree = DynamicSegmentTree(1, 10**9)
        tree.update_range(l, r, 1)  # 标记区间被覆盖
        trees.append(tree)
    
    # 合并所有线段树
    result = trees[0]
    for i in range(1, len(trees)):
        result.merge(trees[i])
    
    # 统计被覆盖的点数
    # （需要修改合并逻辑：val 为 1 表示被覆盖）
```

**注意**：此场景需要修改合并逻辑：
```python
# 合并时取最大值而非求和
node1.val = max(node1.val, node2.val)
```

---

## 合并策略的变体

根据不同的统计需求，合并逻辑可以灵活调整。

### 变体一：求和合并（默认）

```python
def _merge(self, node1, node2, l, r):
    # ...
    node1.val += node2.val  # 求和
    return node1
```

**适用场景**：
- 元素计数
- 区间和
- 频率统计

### 变体二：取最大值合并

```python
def _merge(self, node1, node2, l, r):
    # ...
    node1.val = max(node1.val, node2.val)  # 取最大
    return node1
```

**适用场景**：
- 区间最大值
- 区间覆盖（0/1标记）

### 变体三：取最小值合并

```python
def _merge(self, node1, node2, l, r):
    # ...
    node1.val = min(node1.val, node2.val)  # 取最小
    return node1
```

**适用场景**：
- 区间最小值
- 资源竞争（取最少可用）

### 变体四：自定义合并函数

```python
def _merge(self, node1, node2, l, r, merge_func):
    # ...
    node1.val = merge_func(node1.val, node2.val)
    return node1

# 使用示例
tree1.merge(tree2, merge_func=lambda a, b: a + b)  # 求和
tree1.merge(tree2, merge_func=lambda a, b: a | b)  # 位或
```

---

## 常见陷阱

### 陷阱一：合并后继续使用被合并的树

**错误代码**：
```python
tree1.merge(tree2)
# ❌ tree2 的结构已被破坏
result = tree2.query(1, 10)  # 结果错误！
```

**原因**：合并过程中，`tree2` 的节点被"移动"到 `tree1`，原结构不完整。

**正确做法**：
```python
# 如果需要保留 tree2，先复制
tree2_copy = tree2.copy()
tree1.merge(tree2_copy)
# tree2 仍可使用
```

### 陷阱二：忘记更新父节点值

**错误代码**：
```python
def _merge(self, node1, node2, l, r):
    if node1 is None: return node2
    if node2 is None: return node1
    
    node1.left = self._merge(node1.left, node2.left, l, mid)
    node1.right = self._merge(node1.right, node2.right, mid + 1, r)
    
    # ❌ 忘记更新 node1.val
    return node1
```

**后果**：合并后的查询结果错误。

**正确做法**：
```python
# ✅ 合并后重新计算
left_val = node1.left.val if node1.left else 0
right_val = node1.right.val if node1.right else 0
node1.val = left_val + right_val
```

### 陷阱三：递归边界错误

**错误代码**：
```python
def _merge(self, node1, node2, l, r):
    if node1 is None: return node2
    if node2 is None: return node1
    
    # ❌ 叶节点时仍递归
    mid = (l + r) // 2
    node1.left = self._merge(node1.left, node2.left, l, mid)
    # ...
```

**后果**：`l == r` 时，`mid = l`，左子树区间为 `[l, l]`，无限递归。

**正确做法**：
```python
# ✅ 叶节点特殊处理
if l == r:
    node1.val += node2.val
    return node1
```

### 陷阱四：区间不一致

**错误场景**：
```python
tree1 = DynamicSegmentTree(1, 1000)
tree2 = DynamicSegmentTree(1, 10000)  # 区间不同！
tree1.merge(tree2)  # ❌ 结果未定义
```

**要求**：两棵树必须管理相同的区间 `[L, R]`。

---

## 扩展思考

### 1. 可持久化合并

如果需要保留合并前后的所有版本，怎么办？

**方案**：路径复制（Copy-On-Write）

```python
def _merge_persistent(self, node1, node2, l, r):
    if node1 is None: return self._copy(node2)
    if node2 is None: return self._copy(node1)
    
    # 创建新节点，不修改原节点
    new_node = Node()
    
    if l == r:
        new_node.val = node1.val + node2.val
        return new_node
    
    mid = (l + r) // 2
    new_node.left = self._merge_persistent(node1.left, node2.left, l, mid)
    new_node.right = self._merge_persistent(node1.right, node2.right, mid + 1, r)
    
    # 更新值
    left_val = new_node.left.val if new_node.left else 0
    right_val = new_node.right.val if new_node.right else 0
    new_node.val = left_val + right_val
    
    return new_node
```

**复杂度**：`O((n1 + n2) * logN)`，因为需要复制路径。

### 2. 合并多棵树的顺序

假设有 N 棵树要合并，按什么顺序合并最优？

**分析**：
- 顺序合并：`tree1 + tree2 -> tree3 -> ... -> treeN`
- 复杂度：`O((n1 + n2) + (n1 + n2 + n3) + ...)`

**优化**：类似哈夫曼树，优先合并节点数少的树。

```python
import heapq

def merge_multiple(trees):
    # 最小堆，按节点数排序
    heap = [(tree.count_nodes(), tree) for tree in trees]
    heapq.heapify(heap)
    
    while len(heap) > 1:
        _, tree1 = heapq.heappop(heap)
        _, tree2 = heapq.heappop(heap)
        
        tree1.merge(tree2)
        heapq.heappush(heap, (tree1.count_nodes(), tree1))
    
    return heap[0][1]
```

### 3. 并行合并

线段树合并天然支持并行：不同子树的合并可以并行执行。

```python
# 伪代码
def parallel_merge(node1, node2, l, r):
    # ...
    # 并行合并左右子树
    left_future = async_merge(node1.left, node2.left, l, mid)
    right_future = async_merge(node1.right, node2.right, mid + 1, r)
    
    node1.left = await left_future
    node1.right = await right_future
    # ...
```

---

## 本章总结

### 核心要点

1. **线段树合并的本质**：结构化递归合并，而非逐元素操作
2. **时间复杂度**：`O(n1 + n2)`，n1、n2 为节点数
3. **关键技巧**：
   - 空节点直接返回对方
   - 递归合并左右子树
   - 更新父节点值
4. **副作用**：被合并的树结构会被破坏

### 适用场景判断

| 场景 | 是否适合线段树合并 |
|------|------------------|
| 数据稀疏 | ✅ 非常适合 |
| 需要保留原树 | ❌ 需要复制版本 |
| 多次合并 | ✅ 优先合并小树 |
| 树形DP | ✅ 经典应用 |
| 区间统计 | ✅ 高效 |

### 与其他方法的对比

| 方法 | 时间复杂度 | 空间复杂度 | 适用场景 |
|------|-----------|-----------|---------|
| 逐元素插入 | O(N * logN) | O(logN) | 数据密集 |
| 哈希表合并 | O(N) | O(N) | 小数据量 |
| 线段树合并 | O(节点数) | O(节点数) | 稀疏数据 |

### 记住这句话

**"合并的艺术在于利用结构。线段树合并不关心有多少元素,只关心有多少节点。当数据稀疏时，节点数远小于元素数，这就是线段树合并的效率来源。"**

下一章，我们将深入学习**扫描线算法**，看看如何用线段树解决复杂的几何问题。
