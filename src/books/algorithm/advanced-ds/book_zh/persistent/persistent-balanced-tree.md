# 可持久化平衡树

本章是可持久化数据结构部分的收尾，我们将学习**可持久化平衡树**。它结合了平衡树的灵活操作和可持久化的版本管理能力。

---

## 为什么需要可持久化平衡树？

主席树擅长区间第 K 小，但它本质上是**静态**的权值线段树。

如果需要：
- 插入/删除任意元素
- 区间翻转
- 按值分裂/合并
- 同时保留历史版本

就需要**可持久化平衡树**。

---

## 为什么选择 FHQ Treap？

| 平衡树 | 可持久化难度 | 原因 |
|--------|-------------|------|
| AVL 树 | 困难 | 旋转涉及多个节点 |
| 红黑树 | 困难 | 旋转 + 变色复杂 |
| Splay | 不可行 | 每次查询都修改结构 |
| **FHQ Treap** | **简单** | 只需分裂和合并 |

FHQ Treap 的操作天然适合可持久化：
- 分裂（Split）：沿路径创建新节点
- 合并（Merge）：沿路径创建新节点

没有旋转，路径复制非常自然。

---

## 基础：FHQ Treap 回顾

```python
import random
from typing import Optional, Tuple

class FHQTreap:
    """无旋 Treap（非可持久化版本）"""
    
    def __init__(self):
        self.root = None
    
    class Node:
        def __init__(self, val: int):
            self.val = val
            self.priority = random.random()
            self.size = 1
            self.left = None
            self.right = None
    
    def _size(self, node: Optional['Node']) -> int:
        return node.size if node else 0
    
    def _update(self, node: 'Node') -> None:
        if node:
            node.size = 1 + self._size(node.left) + self._size(node.right)
    
    def _split_by_value(self, node: Optional['Node'], val: int) -> Tuple:
        """按值分裂：左子树 <= val，右子树 > val"""
        if not node:
            return None, None
        
        if node.val <= val:
            left, right = self._split_by_value(node.right, val)
            node.right = left
            self._update(node)
            return node, right
        else:
            left, right = self._split_by_value(node.left, val)
            node.left = right
            self._update(node)
            return left, node
    
    def _merge(self, left: Optional['Node'], right: Optional['Node']) -> Optional['Node']:
        """合并两棵树（left 的所有值 < right 的所有值）"""
        if not left:
            return right
        if not right:
            return left
        
        if left.priority > right.priority:
            left.right = self._merge(left.right, right)
            self._update(left)
            return left
        else:
            right.left = self._merge(left, right.left)
            self._update(right)
            return right
```

---

## 可持久化 FHQ Treap

核心修改：**每次修改节点时创建新节点**。

```python
import random
from typing import Optional, Tuple, List

class PersistentFHQTreap:
    """可持久化 FHQ Treap"""
    
    def __init__(self):
        # 节点池
        max_nodes = 10**6
        self.val = [0] * max_nodes
        self.priority = [0.0] * max_nodes
        self.size = [0] * max_nodes
        self.left = [0] * max_nodes
        self.right = [0] * max_nodes
        self.tot = 0
        
        # 版本管理
        self.versions = [0]  # versions[i] 是第 i 版本的根
    
    def _new_node(self, v: int) -> int:
        self.tot += 1
        node = self.tot
        self.val[node] = v
        self.priority[node] = random.random()
        self.size[node] = 1
        self.left[node] = 0
        self.right[node] = 0
        return node
    
    def _clone(self, node: int) -> int:
        """克隆节点"""
        if node == 0:
            return 0
        
        self.tot += 1
        new_node = self.tot
        self.val[new_node] = self.val[node]
        self.priority[new_node] = self.priority[node]
        self.size[new_node] = self.size[node]
        self.left[new_node] = self.left[node]
        self.right[new_node] = self.right[node]
        return new_node
    
    def _update(self, node: int) -> None:
        if node:
            self.size[node] = 1 + self.size[self.left[node]] + self.size[self.right[node]]
    
    def _split_by_value(self, node: int, val: int) -> Tuple[int, int]:
        """可持久化分裂：返回新节点"""
        if node == 0:
            return 0, 0
        
        new_node = self._clone(node)  # 关键：创建新节点
        
        if self.val[node] <= val:
            left, right = self._split_by_value(self.right[node], val)
            self.right[new_node] = left
            self._update(new_node)
            return new_node, right
        else:
            left, right = self._split_by_value(self.left[node], val)
            self.left[new_node] = right
            self._update(new_node)
            return left, new_node
    
    def _merge(self, left: int, right: int) -> int:
        """可持久化合并"""
        if left == 0:
            return right
        if right == 0:
            return left
        
        if self.priority[left] > self.priority[right]:
            new_node = self._clone(left)  # 克隆
            self.right[new_node] = self._merge(self.right[left], right)
            self._update(new_node)
            return new_node
        else:
            new_node = self._clone(right)  # 克隆
            self.left[new_node] = self._merge(left, self.left[right])
            self._update(new_node)
            return new_node
    
    def insert(self, version: int, val: int) -> int:
        """在版本 version 基础上插入 val，返回新版本号"""
        root = self.versions[version]
        left, right = self._split_by_value(root, val)
        new_node = self._new_node(val)
        new_root = self._merge(self._merge(left, new_node), right)
        
        self.versions.append(new_root)
        return len(self.versions) - 1
    
    def delete(self, version: int, val: int) -> int:
        """在版本 version 基础上删除一个 val，返回新版本号"""
        root = self.versions[version]
        
        # 分裂成 <= val-1, = val, > val
        left, mid_right = self._split_by_value(root, val - 1)
        mid, right = self._split_by_value(mid_right, val)
        
        # 删除一个 val（mid 中取左子树或右子树）
        if mid:
            mid = self._merge(self.left[mid], self.right[mid])
        
        new_root = self._merge(self._merge(left, mid), right)
        
        self.versions.append(new_root)
        return len(self.versions) - 1
    
    def query_kth(self, version: int, k: int) -> int:
        """查询版本 version 中第 k 小的值"""
        node = self.versions[version]
        
        while node:
            left_size = self.size[self.left[node]]
            
            if k <= left_size:
                node = self.left[node]
            elif k == left_size + 1:
                return self.val[node]
            else:
                k -= left_size + 1
                node = self.right[node]
        
        return -1  # k 超出范围
    
    def count_less(self, version: int, val: int) -> int:
        """查询版本 version 中 < val 的元素个数"""
        root = self.versions[version]
        left, _ = self._split_by_value(root, val - 1)
        count = self.size[left]
        # 注意：分裂创建了新节点，但这里只是查询，不保存版本
        return count
    
    def query_rank(self, version: int, val: int) -> int:
        """查询 val 在版本 version 中的排名（1-indexed）"""
        return self.count_less(version, val) + 1
```

---

## 按大小分裂

除了按值分裂，还可以按大小分裂（用于区间操作）：

```python
def _split_by_size(self, node: int, k: int) -> Tuple[int, int]:
    """
    按大小分裂：左边 k 个元素，右边其余
    """
    if node == 0:
        return 0, 0
    
    new_node = self._clone(node)
    left_size = self.size[self.left[node]]
    
    if k <= left_size:
        # 分裂左子树
        l, r = self._split_by_size(self.left[node], k)
        self.left[new_node] = r
        self._update(new_node)
        return l, new_node
    else:
        # 分裂右子树
        l, r = self._split_by_size(self.right[node], k - left_size - 1)
        self.right[new_node] = l
        self._update(new_node)
        return new_node, r
```

---

## 区间操作：翻转

可持久化平衡树支持区间翻转（配合懒标记）：

```python
class PersistentFHQWithReverse:
    """支持区间翻转的可持久化 FHQ Treap"""
    
    def __init__(self):
        max_nodes = 10**6
        self.val = [0] * max_nodes
        self.priority = [0.0] * max_nodes
        self.size = [0] * max_nodes
        self.left = [0] * max_nodes
        self.right = [0] * max_nodes
        self.rev = [False] * max_nodes  # 懒标记
        self.tot = 0
        self.versions = [0]
    
    def _clone(self, node: int) -> int:
        if node == 0:
            return 0
        
        self.tot += 1
        new_node = self.tot
        self.val[new_node] = self.val[node]
        self.priority[new_node] = self.priority[node]
        self.size[new_node] = self.size[node]
        self.left[new_node] = self.left[node]
        self.right[new_node] = self.right[node]
        self.rev[new_node] = self.rev[node]
        return new_node
    
    def _pushdown(self, node: int) -> int:
        """下推懒标记，返回新节点"""
        if node == 0 or not self.rev[node]:
            return node
        
        new_node = self._clone(node)
        
        # 交换子节点
        self.left[new_node], self.right[new_node] = self.right[new_node], self.left[new_node]
        
        # 传递标记到子节点
        if self.left[new_node]:
            left_clone = self._clone(self.left[new_node])
            self.rev[left_clone] = not self.rev[left_clone]
            self.left[new_node] = left_clone
        
        if self.right[new_node]:
            right_clone = self._clone(self.right[new_node])
            self.rev[right_clone] = not self.rev[right_clone]
            self.right[new_node] = right_clone
        
        self.rev[new_node] = False
        return new_node
    
    def reverse(self, version: int, l: int, r: int) -> int:
        """翻转版本 version 中的区间 [l, r]，返回新版本号"""
        root = self.versions[version]
        
        # 分裂成三部分
        left, mid_right = self._split_by_size(root, l - 1)
        mid, right = self._split_by_size(mid_right, r - l + 1)
        
        # 对 mid 打翻转标记
        if mid:
            mid = self._clone(mid)
            self.rev[mid] = not self.rev[mid]
        
        # 合并
        new_root = self._merge(self._merge(left, mid), right)
        
        self.versions.append(new_root)
        return len(self.versions) - 1
```

---

## 复杂度分析

| 操作 | 时间复杂度 | 空间复杂度 |
|------|-----------|-----------|
| 插入 | O(log n) 期望 | O(log n) |
| 删除 | O(log n) 期望 | O(log n) |
| 查询第 K 小 | O(log n) 期望 | O(1) |
| 区间翻转 | O(log n) 期望 | O(log n) |

每次修改操作产生 O(log n) 个新节点。

---

## 与其他数据结构对比

| 特性 | 主席树 | 可持久化 FHQ |
|------|--------|-------------|
| 区间第 K 小 | ✓ | ✓ |
| 单点插入 | ✗ | ✓ |
| 单点删除 | ✗ | ✓ |
| 区间翻转 | ✗ | ✓ |
| 历史版本 | ✓ | ✓ |
| 实现难度 | 中等 | 较高 |

---

## 常见错误

### 错误 1：忘记克隆

```python
# 错误：直接修改原节点
def _split(self, node, val):
    if self.val[node] <= val:
        left, right = self._split(self.right[node], val)
        self.right[node] = left  # 修改了原节点！
        
# 正确：先克隆再修改
def _split(self, node, val):
    new_node = self._clone(node)  # 先克隆
    if self.val[node] <= val:
        left, right = self._split(self.right[node], val)
        self.right[new_node] = left  # 修改新节点
```

### 错误 2：合并时克隆错误

```python
# 错误：两边都克隆
def _merge(self, left, right):
    new_left = self._clone(left)
    new_right = self._clone(right)  # 不需要

# 正确：只克隆要修改的那边
def _merge(self, left, right):
    if self.priority[left] > self.priority[right]:
        new_node = self._clone(left)  # 只克隆 left
        # right 不需要克隆，因为它没被修改
```

### 错误 3：懒标记处理

```python
# 错误：下推后不清除标记
def _pushdown(self, node):
    # ... 传递标记
    # 忘记 self.rev[node] = False

# 正确：清除当前节点标记
def _pushdown(self, node):
    # ... 传递标记
    self.rev[new_node] = False  # 清除
```

---

## 本章小结

本章学习了可持久化平衡树：

1. **为什么选择 FHQ Treap**
   - 只有分裂和合并，没有旋转
   - 路径复制自然

2. **核心操作**
   - 分裂时克隆节点
   - 合并时克隆节点
   - 懒标记需要特殊处理

3. **功能**
   - 插入、删除、查询
   - 区间翻转
   - 历史版本管理

4. **复杂度**
   - 每次操作 O(log n) 时间和空间

至此，可持久化数据结构部分全部完成。下一部分我们将进入**树链剖分与 LCA**。
