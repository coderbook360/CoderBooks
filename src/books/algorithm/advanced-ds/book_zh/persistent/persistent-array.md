# 可持久化数组

可持久化数组是最基础的可持久化数据结构。它支持：
- **单点查询**：查询任意版本中任意位置的值
- **单点修改**：基于某个版本创建新版本，修改某个位置的值

本章将介绍两种实现方式：树形结构和块状结构。

---

## 问题定义

设计一个数据结构，支持以下操作：

1. `create(arr)` - 从数组创建初始版本（版本 0）
2. `query(version, index)` - 查询版本 version 中位置 index 的值
3. `modify(version, index, value)` - 基于版本 version，将 index 位置改为 value，返回新版本号

---

## 方法一：完全二叉树结构

### 核心思想

将数组组织成**完全二叉树**的叶子节点：

```
数组: [1, 2, 3, 4]

        根
       /   \
      节点   节点
     / \    / \
    1   2  3   4
```

修改时，只复制从叶子到根的路径。

### 数据结构

```python
from typing import List, Optional

class Node:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left: Optional['Node'] = left
        self.right: Optional['Node'] = right

class PersistentArray:
    def __init__(self, arr: List[int]):
        self.n = len(arr)
        # 将数组大小扩展到 2 的幂
        self.size = 1
        while self.size < self.n:
            self.size *= 2
        
        # 扩展数组（用 0 填充）
        extended = arr + [0] * (self.size - self.n)
        
        # 构建初始版本
        self.roots: List[Node] = []
        self.roots.append(self._build(extended, 0, self.size - 1))
    
    def _build(self, arr: List[int], left: int, right: int) -> Node:
        """递归构建完全二叉树"""
        if left == right:
            return Node(val=arr[left])
        
        mid = (left + right) // 2
        left_child = self._build(arr, left, mid)
        right_child = self._build(arr, mid + 1, right)
        
        return Node(left=left_child, right=right_child)
    
    def query(self, version: int, index: int) -> int:
        """查询指定版本的指定位置"""
        if index < 0 or index >= self.n:
            raise IndexError(f"Index {index} out of range")
        
        return self._query(self.roots[version], 0, self.size - 1, index)
    
    def _query(self, node: Node, left: int, right: int, index: int) -> int:
        if left == right:
            return node.val
        
        mid = (left + right) // 2
        if index <= mid:
            return self._query(node.left, left, mid, index)
        else:
            return self._query(node.right, mid + 1, right, index)
    
    def modify(self, version: int, index: int, value: int) -> int:
        """基于指定版本修改，返回新版本号"""
        if index < 0 or index >= self.n:
            raise IndexError(f"Index {index} out of range")
        
        old_root = self.roots[version]
        new_root = self._modify(old_root, 0, self.size - 1, index, value)
        self.roots.append(new_root)
        
        return len(self.roots) - 1
    
    def _modify(self, node: Node, left: int, right: int, 
                index: int, value: int) -> Node:
        """路径复制：只复制从叶子到根的路径"""
        if left == right:
            # 叶子节点：创建新节点
            return Node(val=value)
        
        mid = (left + right) // 2
        
        if index <= mid:
            # 修改左子树，右子树复用
            new_left = self._modify(node.left, left, mid, index, value)
            return Node(left=new_left, right=node.right)
        else:
            # 修改右子树，左子树复用
            new_right = self._modify(node.right, mid + 1, right, index, value)
            return Node(left=node.left, right=new_right)
    
    def version_count(self) -> int:
        """返回当前版本数量"""
        return len(self.roots)
```

### 使用示例

```python
# 创建可持久化数组
arr = [1, 2, 3, 4, 5]
pa = PersistentArray(arr)

# 版本 0：原始数组
print(pa.query(0, 2))  # 3

# 创建版本 1：将位置 2 改为 10
v1 = pa.modify(0, 2, 10)
print(pa.query(v1, 2))  # 10
print(pa.query(0, 2))   # 3 (版本 0 不变)

# 基于版本 0 创建版本 2：将位置 0 改为 100
v2 = pa.modify(0, 0, 100)
print(pa.query(v2, 0))  # 100
print(pa.query(v2, 2))  # 3 (继承自版本 0)

# 基于版本 1 创建版本 3
v3 = pa.modify(v1, 4, 50)
print(pa.query(v3, 2))  # 10 (继承自版本 1)
print(pa.query(v3, 4))  # 50
```

### 复杂度分析

- **空间**：初始 O(n)，每次修改 O(log n)
- **时间**：查询 O(log n)，修改 O(log n)

---

## 方法二：使用数组模拟节点

在竞赛中，为了效率，通常用数组模拟节点：

```python
from typing import List

class PersistentArrayFast:
    def __init__(self, arr: List[int]):
        self.n = len(arr)
        self.size = 1
        while self.size < self.n:
            self.size *= 2
        
        # 预分配节点数组（估计最大节点数）
        max_nodes = 2 * self.size + self.size * 20  # 假设最多 20 次修改
        self.val = [0] * max_nodes
        self.left = [0] * max_nodes
        self.right = [0] * max_nodes
        self.node_count = 0
        
        # 版本根节点
        self.roots: List[int] = []
        
        # 构建初始版本
        extended = arr + [0] * (self.size - self.n)
        self.roots.append(self._build(extended, 0, self.size - 1))
    
    def _new_node(self) -> int:
        """分配新节点"""
        node_id = self.node_count
        self.node_count += 1
        return node_id
    
    def _build(self, arr: List[int], l: int, r: int) -> int:
        node = self._new_node()
        
        if l == r:
            self.val[node] = arr[l]
            return node
        
        mid = (l + r) // 2
        self.left[node] = self._build(arr, l, mid)
        self.right[node] = self._build(arr, mid + 1, r)
        
        return node
    
    def query(self, version: int, index: int) -> int:
        return self._query(self.roots[version], 0, self.size - 1, index)
    
    def _query(self, node: int, l: int, r: int, index: int) -> int:
        if l == r:
            return self.val[node]
        
        mid = (l + r) // 2
        if index <= mid:
            return self._query(self.left[node], l, mid, index)
        else:
            return self._query(self.right[node], mid + 1, r, index)
    
    def modify(self, version: int, index: int, value: int) -> int:
        old_root = self.roots[version]
        new_root = self._modify(old_root, 0, self.size - 1, index, value)
        self.roots.append(new_root)
        return len(self.roots) - 1
    
    def _modify(self, old: int, l: int, r: int, index: int, value: int) -> int:
        node = self._new_node()
        
        if l == r:
            self.val[node] = value
            return node
        
        mid = (l + r) // 2
        
        if index <= mid:
            self.left[node] = self._modify(self.left[old], l, mid, index, value)
            self.right[node] = self.right[old]  # 复用右子树
        else:
            self.left[node] = self.left[old]  # 复用左子树
            self.right[node] = self._modify(self.right[old], mid + 1, r, index, value)
        
        return node
```

---

## 可视化路径复制

```
初始数组: [1, 2, 3, 4]

版本 0 的树:
        R0
       /  \
      A    B
     / \  / \
    1  2 3  4

修改位置 2（值改为 10）后，版本 1:

        R1           R0
       /  \         /  \
      A    B'      A    B
     / \  / \     / \  / \
    1  2 10 4    1  2 3  4

共享节点: A, 叶子1, 叶子2, 叶子4
新建节点: R1, B', 叶子10

版本 0 和版本 1 共存，共享大部分结构！
```

---

## 方法三：Fat Node（胖节点）

另一种可持久化方法是**胖节点**：每个节点存储所有历史值和修改时间戳。

```python
class FatNode:
    def __init__(self, initial_value, version=0):
        # 存储 (version, value) 对的列表
        self.history = [(version, initial_value)]
    
    def get(self, version: int):
        """获取指定版本的值（二分查找）"""
        # 找最大的 v 使得 v <= version
        left, right = 0, len(self.history) - 1
        result = self.history[0][1]
        
        while left <= right:
            mid = (left + right) // 2
            if self.history[mid][0] <= version:
                result = self.history[mid][1]
                left = mid + 1
            else:
                right = mid - 1
        
        return result
    
    def set(self, version: int, value):
        """设置新版本的值"""
        self.history.append((version, value))

class FatNodeArray:
    def __init__(self, arr):
        self.nodes = [FatNode(v, 0) for v in arr]
        self.current_version = 0
    
    def query(self, version: int, index: int) -> int:
        return self.nodes[index].get(version)
    
    def modify(self, version: int, index: int, value: int) -> int:
        self.current_version += 1
        # 注意：Fat Node 方法主要用于部分可持久化
        # 完全可持久化需要更复杂的处理
        self.nodes[index].set(self.current_version, value)
        return self.current_version
```

**Fat Node 的特点**：
- 查询时间：O(log m)，m 是该位置的修改次数
- 修改时间：O(1)
- 空间：O(总修改次数)
- 适合修改集中在少数位置的场景

---

## 应用：可撤销操作

```python
class UndoableArray:
    """支持撤销和重做的数组"""
    
    def __init__(self, arr):
        self.pa = PersistentArray(arr)
        self.current = 0
        self.max_version = 0
    
    def get(self, index: int) -> int:
        return self.pa.query(self.current, index)
    
    def set(self, index: int, value: int) -> None:
        self.current = self.pa.modify(self.current, index, value)
        self.max_version = self.current
    
    def undo(self) -> bool:
        """撤销到上一版本"""
        if self.current > 0:
            self.current -= 1
            return True
        return False
    
    def redo(self) -> bool:
        """重做到下一版本"""
        if self.current < self.max_version:
            self.current += 1
            return True
        return False

# 使用示例
ua = UndoableArray([1, 2, 3])
ua.set(1, 10)   # [1, 10, 3]
ua.set(2, 20)   # [1, 10, 20]
print(ua.get(1))  # 10
ua.undo()         # 回到 [1, 10, 3]
print(ua.get(2))  # 3
ua.undo()         # 回到 [1, 2, 3]
print(ua.get(1))  # 2
ua.redo()         # 回到 [1, 10, 3]
print(ua.get(1))  # 10
```

---

## 与函数式列表对比

| 操作 | 可持久化数组 | 函数式列表 |
|------|------------|-----------|
| 随机访问 | O(log n) | O(n) |
| 头部插入 | O(n) | O(1) |
| 尾部插入 | O(log n) | O(n) |
| 单点修改 | O(log n) | O(n) |
| 空间（每版本）| O(log n) | O(1) |

可持久化数组适合需要随机访问的场景；函数式列表适合频繁头部操作的场景。

---

## 本章小结

本章学习了可持久化数组的实现：

1. **树形结构**
   - 将数组组织成完全二叉树
   - 路径复制实现版本管理
   - 查询/修改 O(log n)

2. **数组模拟**
   - 用数组模拟节点，减少内存分配开销
   - 竞赛常用技巧

3. **Fat Node**
   - 每个位置存储历史值
   - 适合修改集中的场景

4. **应用**
   - 撤销/重做功能
   - 版本管理

下一章我们将学习最重要的可持久化数据结构：**可持久化线段树（主席树）**。
