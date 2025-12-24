# 平衡树概述：AVL、红黑树、Treap

在前面的章节中，我们学习了线段树和树状数组——两种针对特定问题的高效数据结构。本章开始，我们进入**平衡树**的世界。平衡树是一类更加通用的数据结构，它支持动态插入、删除、查询的同时，保证树的高度始终为 O(log n)，从而确保所有操作的时间复杂度。

## 为什么需要平衡树？

### 二叉搜索树的问题

首先回顾二叉搜索树（BST）的基本性质：
- 左子树所有节点的值 < 根节点的值
- 右子树所有节点的值 > 根节点的值

BST 的优点是结构简单，支持高效的查找、插入、删除操作。**但问题在于**：这些操作的效率取决于树的高度。

考虑一个极端情况：按 `[1, 2, 3, 4, 5]` 的顺序插入节点：

```
1
 \
  2
   \
    3
     \
      4
       \
        5
```

这棵树退化成了链表！查找的时间复杂度从理想的 O(log n) 退化到 O(n)。

### 平衡的本质

**平衡树**的核心思想是：通过某种机制，保证树的高度始终是 O(log n)。

不同的平衡树采用不同的平衡策略：
- **AVL 树**：通过旋转操作，保证任意节点左右子树高度差不超过 1
- **红黑树**：通过着色规则和旋转，保证从根到任意叶子的路径长度差不超过 2 倍
- **Treap**：通过随机优先级，在概率意义上保证平衡
- **Splay 树**：通过"伸展"操作，将访问的节点移到根部
- **跳表（Skip List）**：虽然不是树，但提供了类似的 O(log n) 保证

## AVL 树

### 定义与性质

AVL 树是最早发明的自平衡二叉搜索树（1962年），以发明者 Adelson-Velsky 和 Landis 命名。

**平衡条件**：任意节点的左右子树高度差（称为**平衡因子**）的绝对值不超过 1。

```python
平衡因子 = height(左子树) - height(右子树)
# 合法取值：-1, 0, 1
```

### 旋转操作

当插入或删除导致某节点失衡时，AVL 树通过**旋转**来恢复平衡。

**右旋（Right Rotation）**：处理左子树过高的情况

```
    y                x
   / \              / \
  x   T3    →      T1  y
 / \                  / \
T1  T2               T2  T3
```

**左旋（Left Rotation）**：处理右子树过高的情况

```
  x                  y
 / \                / \
T1  y      →       x   T3
   / \            / \
  T2  T3         T1  T2
```

### 四种失衡情况

1. **LL 型**（左子树的左子树导致失衡）：一次右旋
2. **RR 型**（右子树的右子树导致失衡）：一次左旋
3. **LR 型**（左子树的右子树导致失衡）：先左旋后右旋
4. **RL 型**（右子树的左子树导致失衡）：先右旋后左旋

### 简化实现

```python
class AVLNode:
    def __init__(self, key: int):
        self.key = key
        self.left = None
        self.right = None
        self.height = 1


class AVLTree:
    def _height(self, node: AVLNode | None) -> int:
        return node.height if node else 0
    
    def _balance_factor(self, node: AVLNode) -> int:
        return self._height(node.left) - self._height(node.right)
    
    def _update_height(self, node: AVLNode) -> None:
        node.height = 1 + max(self._height(node.left), self._height(node.right))
    
    def _rotate_right(self, y: AVLNode) -> AVLNode:
        x = y.left
        T2 = x.right
        
        x.right = y
        y.left = T2
        
        self._update_height(y)
        self._update_height(x)
        
        return x
    
    def _rotate_left(self, x: AVLNode) -> AVLNode:
        y = x.right
        T2 = y.left
        
        y.left = x
        x.right = T2
        
        self._update_height(x)
        self._update_height(y)
        
        return y
    
    def insert(self, root: AVLNode | None, key: int) -> AVLNode:
        # 标准 BST 插入
        if not root:
            return AVLNode(key)
        
        if key < root.key:
            root.left = self.insert(root.left, key)
        else:
            root.right = self.insert(root.right, key)
        
        # 更新高度
        self._update_height(root)
        
        # 获取平衡因子
        balance = self._balance_factor(root)
        
        # LL 型
        if balance > 1 and key < root.left.key:
            return self._rotate_right(root)
        
        # RR 型
        if balance < -1 and key > root.right.key:
            return self._rotate_left(root)
        
        # LR 型
        if balance > 1 and key > root.left.key:
            root.left = self._rotate_left(root.left)
            return self._rotate_right(root)
        
        # RL 型
        if balance < -1 and key < root.right.key:
            root.right = self._rotate_right(root.right)
            return self._rotate_left(root)
        
        return root
```

### AVL 树的特点

**优点**：
- 严格平衡，查询效率最高
- 高度上界：1.44 log₂(n+2) - 0.328

**缺点**：
- 插入和删除可能触发多次旋转
- 实现复杂

## 红黑树

### 定义与性质

红黑树是一种弱平衡的二叉搜索树，它通过着色规则来保证平衡。

**五条性质**：
1. 每个节点是红色或黑色
2. 根节点是黑色
3. 每个叶子节点（NIL/空节点）是黑色
4. 红色节点的子节点必须是黑色（不能有连续的红色）
5. 从任一节点到其所有后代叶子节点的路径上，黑色节点数量相同

**高度保证**：从性质 4 和 5 可以推出，红黑树的高度不超过 2 log₂(n+1)。

### 为什么红黑树更流行？

虽然 AVL 树的查询效率略高，但红黑树在实践中更受欢迎：

1. **旋转次数更少**：红黑树的插入最多 2 次旋转，删除最多 3 次旋转；AVL 树可能需要 O(log n) 次旋转
2. **常数因子更小**：红黑树的调整操作更简单
3. **广泛应用**：C++ STL 的 `map/set`、Java 的 `TreeMap/TreeSet`、Linux 内核都使用红黑树

### 简化理解

红黑树的完整实现非常复杂（需要处理多种情况）。在 LeetCode 实战中，我们很少需要手写红黑树，而是使用语言提供的有序集合：

- **Python**：`sortedcontainers.SortedList`
- **C++**：`std::set`, `std::map`, `std::multiset`
- **Java**：`TreeSet`, `TreeMap`

## Treap

### 定义

Treap = Tree + Heap，是一种结合了 BST 和堆性质的数据结构。

每个节点有两个属性：
- **key**：满足 BST 性质
- **priority**：满足堆性质（通常是最大堆）

### 核心思想

Treap 的关键洞察是：**如果优先级是随机的，则树的期望高度是 O(log n)**。

这是因为：如果我们按优先级从大到小插入节点，得到的就是一棵普通的 BST。而随机优先级等价于随机插入顺序，随机 BST 的期望高度是 O(log n)。

### 旋转实现

```python
import random

class TreapNode:
    def __init__(self, key: int):
        self.key = key
        self.priority = random.random()  # 随机优先级
        self.left = None
        self.right = None


class Treap:
    def _rotate_right(self, node: TreapNode) -> TreapNode:
        left = node.left
        node.left = left.right
        left.right = node
        return left
    
    def _rotate_left(self, node: TreapNode) -> TreapNode:
        right = node.right
        node.right = right.left
        right.left = node
        return right
    
    def insert(self, root: TreapNode | None, key: int) -> TreapNode:
        if not root:
            return TreapNode(key)
        
        if key < root.key:
            root.left = self.insert(root.left, key)
            # 维护堆性质
            if root.left.priority > root.priority:
                root = self._rotate_right(root)
        else:
            root.right = self.insert(root.right, key)
            if root.right.priority > root.priority:
                root = self._rotate_left(root)
        
        return root
    
    def delete(self, root: TreapNode | None, key: int) -> TreapNode | None:
        if not root:
            return None
        
        if key < root.key:
            root.left = self.delete(root.left, key)
        elif key > root.key:
            root.right = self.delete(root.right, key)
        else:
            # 找到要删除的节点
            if not root.left:
                return root.right
            if not root.right:
                return root.left
            
            # 将优先级较大的子节点旋转上来
            if root.left.priority > root.right.priority:
                root = self._rotate_right(root)
                root.right = self.delete(root.right, key)
            else:
                root = self._rotate_left(root)
                root.left = self.delete(root.left, key)
        
        return root
```

### Treap 的优点

1. **实现简单**：比红黑树简单得多
2. **期望 O(log n)**：虽然最坏情况是 O(n)，但概率极低
3. **支持高效分裂与合并**：在区间操作中非常有用

### 非旋转 Treap（FHQ Treap）

FHQ Treap 使用分裂（split）和合并（merge）代替旋转，更加优雅：

```python
def split(root: TreapNode | None, key: int) -> tuple:
    """将树分裂为 <= key 和 > key 两部分"""
    if not root:
        return None, None
    
    if root.key <= key:
        left, right = split(root.right, key)
        root.right = left
        return root, right
    else:
        left, right = split(root.left, key)
        root.left = right
        return left, root


def merge(left: TreapNode | None, right: TreapNode | None) -> TreapNode | None:
    """合并两棵树（假设 left 所有节点 < right 所有节点）"""
    if not left:
        return right
    if not right:
        return left
    
    if left.priority > right.priority:
        left.right = merge(left.right, right)
        return left
    else:
        right.left = merge(left, right.left)
        return right
```

## 三种平衡树的对比

| 维度 | AVL 树 | 红黑树 | Treap |
|------|--------|--------|-------|
| 平衡严格程度 | 严格（高度差 ≤ 1） | 较宽松（高度 ≤ 2 log n） | 期望（随机保证） |
| 查询效率 | 最高 | 略低 | 期望 O(log n) |
| 插入/删除 | 可能多次旋转 | 最多 2-3 次旋转 | 期望 O(log n) |
| 实现难度 | 中等 | 高 | 低 |
| 空间开销 | 需存储高度 | 需存储颜色 | 需存储优先级 |
| 应用场景 | 读多写少 | 通用 | 算法竞赛 |

## 在 LeetCode 中的选择

### Python 用户

Python 标准库没有内置的平衡树实现，但可以使用第三方库：

```python
from sortedcontainers import SortedList, SortedDict, SortedSet

# SortedList 支持：
sl = SortedList([3, 1, 4])
sl.add(2)           # 插入
sl.remove(3)        # 删除
sl.bisect_left(2)   # 二分查找
sl[0]               # 索引访问
```

**注意**：LeetCode 环境已预装 `sortedcontainers`。

### 替代方案

如果不能使用第三方库，可以考虑：

1. **手写 Treap**：代码量适中，足够应对大多数问题
2. **使用堆模拟**：对于某些特定问题（如中位数）
3. **树状数组/线段树**：离散化后可以模拟有序集合操作

## 本章小结

平衡树是一类保证 O(log n) 操作复杂度的数据结构。

**核心要点**：

1. **平衡的本质**：通过某种机制保证树高为 O(log n)
2. **AVL 树**：严格平衡，适合读多写少的场景
3. **红黑树**：工程实践的首选，是大多数语言有序集合的底层实现
4. **Treap**：实现简单，期望 O(log n)，算法竞赛的利器

在后续章节中，我们将不再纠结于平衡树的具体实现，而是专注于如何**使用有序集合**解决实际问题。无论底层是 AVL、红黑树还是 Treap，它们对外提供的接口是一致的：高效的插入、删除、查找、排名查询。

下一章，我们将探索有序集合在各种算法问题中的应用模式。
