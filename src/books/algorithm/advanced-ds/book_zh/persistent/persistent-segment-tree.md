# 可持久化线段树（主席树）

**主席树**（Chairman Tree）是可持久化线段树的别称，因为发明者黄嘉泰的姓名缩写为 HJT，与中国某位主席的拼音缩写相同，故得此名。

主席树是竞赛中最常用的可持久化数据结构，主要用于解决**静态区间第 K 小**等问题。

---

## 主席树的核心思想

### 问题背景

给定数组 a，回答多次查询：区间 [l, r] 内第 k 小的元素是多少？

### 思路演进

**思路 1：每个区间建线段树**

对每个可能的区间建一棵线段树存储元素频次 → 空间 O(n²)，不可行。

**思路 2：前缀和思想**

类似前缀和：`sum[l, r] = prefix[r] - prefix[l-1]`

如果有：
- 版本 i：表示前 i 个元素的线段树
- 区间 [l, r] 的信息 = 版本 r - 版本 l-1

那么只需要 n 个版本的线段树！

**思路 3：可持久化**

连续版本之间只有一个元素的差异 → 路径复制 → O(n log n) 空间

---

## 主席树结构

### 权值线段树

主席树是基于**权值线段树**的：
- 叶子节点 i 表示值为 i 的元素个数
- 非叶子节点存储区间内元素的总数

```
值域: [1, 4]
数组: [2, 1, 3, 1]

权值线段树:
        4 (总共4个元素)
       / \
      2   2
     / \ / \
    1  1 1  0
   [1][2][3][4]
   
值 1 出现 2 次
值 2 出现 1 次
值 3 出现 1 次
值 4 出现 0 次
```

### 可持久化

每插入一个元素，创建新版本：
- 版本 0：空树
- 版本 1：包含 a[0]
- 版本 2：包含 a[0], a[1]
- ...
- 版本 n：包含 a[0..n-1]

---

## 完整实现

```python
from typing import List, Tuple

class PersistentSegmentTree:
    """可持久化线段树（主席树）"""
    
    def __init__(self, nums: List[int]):
        self.nums = nums
        self.n = len(nums)
        
        # 离散化：将值映射到 [0, m-1]
        sorted_unique = sorted(set(nums))
        self.val_to_idx = {v: i for i, v in enumerate(sorted_unique)}
        self.idx_to_val = sorted_unique
        self.m = len(sorted_unique)
        
        # 节点数组
        # 预估节点数：初始 4m + n*log(m) 次修改
        max_nodes = 4 * self.m + self.n * 20
        self.left = [0] * max_nodes
        self.right = [0] * max_nodes
        self.cnt = [0] * max_nodes  # 节点包含的元素个数
        self.node_count = 0
        
        # 版本根节点
        self.roots: List[int] = []
        
        # 建立空树作为版本 0
        self.roots.append(self._build(0, self.m - 1))
        
        # 依次插入每个元素
        for x in nums:
            idx = self.val_to_idx[x]
            old_root = self.roots[-1]
            new_root = self._insert(old_root, 0, self.m - 1, idx)
            self.roots.append(new_root)
    
    def _new_node(self) -> int:
        node = self.node_count
        self.node_count += 1
        return node
    
    def _build(self, l: int, r: int) -> int:
        """构建空的权值线段树"""
        node = self._new_node()
        self.cnt[node] = 0
        
        if l < r:
            mid = (l + r) // 2
            self.left[node] = self._build(l, mid)
            self.right[node] = self._build(mid + 1, r)
        
        return node
    
    def _insert(self, old: int, l: int, r: int, idx: int) -> int:
        """在位置 idx 插入一个元素，返回新版本根"""
        node = self._new_node()
        self.cnt[node] = self.cnt[old] + 1
        self.left[node] = self.left[old]
        self.right[node] = self.right[old]
        
        if l < r:
            mid = (l + r) // 2
            if idx <= mid:
                self.left[node] = self._insert(self.left[old], l, mid, idx)
            else:
                self.right[node] = self._insert(self.right[old], mid + 1, r, idx)
        
        return node
    
    def query_kth(self, l: int, r: int, k: int) -> int:
        """
        查询区间 [l, r]（0-indexed）内第 k 小的元素
        k 从 1 开始
        """
        # 使用版本 r+1 和版本 l 的差
        return self._query_kth(
            self.roots[l], 
            self.roots[r + 1], 
            0, self.m - 1, 
            k
        )
    
    def _query_kth(self, old: int, new: int, l: int, r: int, k: int) -> int:
        """在两个版本的差中查询第 k 小"""
        if l == r:
            return self.idx_to_val[l]
        
        mid = (l + r) // 2
        # 左子树中的元素个数差
        left_count = self.cnt[self.left[new]] - self.cnt[self.left[old]]
        
        if k <= left_count:
            return self._query_kth(self.left[old], self.left[new], l, mid, k)
        else:
            return self._query_kth(
                self.right[old], self.right[new], 
                mid + 1, r, 
                k - left_count
            )
```

### 使用示例

```python
# 数组
nums = [2, 1, 3, 1, 4, 3, 2, 1]

# 构建主席树
pst = PersistentSegmentTree(nums)

# 查询区间 [0, 3] 第 2 小
print(pst.query_kth(0, 3, 2))  # 1 (排序后 [1,1,2,3]，第2小是1)

# 查询区间 [2, 5] 第 3 小
print(pst.query_kth(2, 5, 3))  # 3 (排序后 [1,3,3,4]，第3小是3)

# 查询区间 [0, 7] 第 5 小
print(pst.query_kth(0, 7, 5))  # 2 (排序后 [1,1,1,2,2,3,3,4])
```

---

## 核心操作详解

### 插入操作

```
插入值 2（离散化后索引为 1）

旧树:        新树:
    1            2
   / \          / \
  1   0   →   1   1  (复用)
 / \ / \     / \ / \
1  0 0  0   1  1 0  0
              ↑
            新节点
```

- 只复制从根到叶子的路径
- 其他节点直接复用
- 每次插入 O(log m) 个新节点

### 查询操作

```
查询区间 [l, r] 第 k 小：

版本 l:      版本 r+1:      差:
    3            5           2
   / \          / \         / \
  2   1   -    3   2    =  1   1
 / \          / \         / \
1  1         2  1        1   0

左子树差为 1，如果 k=1，在左子树找
如果 k=2，在右子树找第 k-1=1 小
```

---

## 离散化详解

### 为什么需要离散化？

值域可能很大（如 10^9），但实际出现的值最多 n 个。

离散化将值映射到连续的 [0, n-1]，使线段树节点数可控。

```python
nums = [100, 1, 50, 1, 1000]

# 离散化
sorted_unique = [1, 50, 100, 1000]  # 去重排序
val_to_idx = {1: 0, 50: 1, 100: 2, 1000: 3}
idx_to_val = [1, 50, 100, 1000]

# 映射后
mapped = [2, 0, 1, 0, 3]
```

### 离散化的实现

```python
def discretize(nums: List[int]) -> Tuple[List[int], List[int]]:
    """
    返回 (映射后的数组, 逆映射表)
    """
    sorted_unique = sorted(set(nums))
    val_to_idx = {v: i for i, v in enumerate(sorted_unique)}
    mapped = [val_to_idx[x] for x in nums]
    return mapped, sorted_unique
```

---

## 空间分析

### 节点数量

- 初始空树：O(m) 个节点（m 是离散化后的值域大小）
- 每次插入：O(log m) 个新节点
- n 次插入后：O(m + n log m) 个节点

由于 m ≤ n，总节点数是 O(n log n)。

### 实际估算

```python
n = 100000
log_n = 17  # log2(100000) ≈ 17

# 初始树约 2n 节点
# n 次插入，每次约 log(n) 节点
# 总计约 2n + n * log(n) ≈ 2n + 17n = 19n ≈ 2,000,000 节点

# 每个节点 3 个整数（left, right, cnt）
# 内存约 2M * 12B = 24MB
```

---

## 与普通线段树对比

| 特性 | 普通线段树 | 主席树 |
|------|-----------|-------|
| 空间 | O(n) | O(n log n) |
| 单次修改 | O(log n) 原地 | O(log n) 创建新版本 |
| 区间查询 | O(log n) | O(log n) |
| 历史版本 | 不支持 | 支持 |
| 区间第 K 小 | 不支持 | O(log n) |

---

## 变体：动态开点

如果不预先离散化，可以使用动态开点：

```python
class DynamicPersistentTree:
    """动态开点的主席树"""
    
    def __init__(self, min_val: int, max_val: int):
        self.min_val = min_val
        self.max_val = max_val
        
        # 节点池
        self.left = [0]
        self.right = [0]
        self.cnt = [0]
        
        # 版本根
        self.roots = [0]  # 0 表示空节点
    
    def _new_node(self) -> int:
        self.left.append(0)
        self.right.append(0)
        self.cnt.append(0)
        return len(self.cnt) - 1
    
    def insert(self, val: int) -> int:
        """插入值，返回新版本号"""
        old_root = self.roots[-1]
        new_root = self._insert(old_root, self.min_val, self.max_val, val)
        self.roots.append(new_root)
        return len(self.roots) - 1
    
    def _insert(self, old: int, l: int, r: int, val: int) -> int:
        node = self._new_node()
        self.cnt[node] = self.cnt[old] + 1
        self.left[node] = self.left[old]
        self.right[node] = self.right[old]
        
        if l < r:
            mid = (l + r) // 2
            if val <= mid:
                self.left[node] = self._insert(self.left[old], l, mid, val)
            else:
                self.right[node] = self._insert(self.right[old], mid + 1, r, val)
        
        return node
```

动态开点的优势：
- 无需预先离散化
- 适合值域大但查询少的场景

---

## 常见错误

### 错误 1：版本索引偏移

```python
# 错误：查询 [l, r] 用版本 l 和 r
query_kth(roots[l], roots[r], ...)

# 正确：应该用版本 l 和 r+1
query_kth(roots[l], roots[r + 1], ...)
```

原因：版本 i 包含前 i 个元素（0 到 i-1），查询 [l, r] 需要版本 r+1 减去版本 l。

### 错误 2：节点复用不当

```python
# 错误：直接修改旧节点
self.cnt[old] += 1

# 正确：创建新节点
node = self._new_node()
self.cnt[node] = self.cnt[old] + 1
```

### 错误 3：空间预估不足

```python
# 可能不够
max_nodes = 4 * n

# 安全估计
max_nodes = 4 * n + n * 20  # 或 40 * n
```

---

## 本章小结

本章学习了主席树的原理和实现：

1. **核心思想**
   - 基于权值线段树
   - 前缀和思想：版本 r - 版本 l-1 = 区间 [l, r]
   - 路径复制实现可持久化

2. **关键操作**
   - 插入：O(log m)，创建 log m 个新节点
   - 查询区间第 K 小：O(log m)

3. **实现要点**
   - 离散化减少值域
   - 正确的版本偏移
   - 足够的节点预分配

4. **复杂度**
   - 时间：构建 O(n log n)，查询 O(log n)
   - 空间：O(n log n)

下一章我们将应用主席树解决经典问题：**静态区间第 K 小**。
