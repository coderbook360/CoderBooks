# 动态开点线段树

## 为什么需要动态开点？

在前面的章节中，我们实现的线段树都是基于数组的完全二叉树结构。对于区间 `[0, n-1]`，需要开辟 `4n` 大小的数组空间。

**但当面对以下场景时，传统线段树遇到了困境**：

**场景一：坐标范围极大**
```python
# 需要处理区间 [0, 10^9] 的数据
# 传统线段树需要 4 * 10^9 的数组空间
# 内存直接爆炸！
```

**场景二：数据稀疏**
```python
# 只有 1000 个点，但坐标分布在 [0, 10^9] 区间内
# 点: [(5, 100), (1000000, 200), (999999999, 300), ...]
# 大部分区间为空，浪费空间
```

**场景三：动态扩展**
```python
# 初始不知道最大坐标
# 随着操作进行，坐标范围不断扩大
# 无法预先分配固定大小的数组
```

**核心矛盾**：实际使用的节点数量很少，但坐标范围很大。

思考一下，如果只访问 1000 个不同的区间，线段树最多用到多少个节点？

答案是 `O(1000 * logN)`，远小于 `4N`。

**这就是动态开点的动机：按需创建节点，只为实际访问到的区间分配空间。**

---

## 核心思想：惰性实例化

动态开点线段树不预先分配所有节点，而是在访问时才创建。

**类比生活场景**：
- **传统线段树**：购买一整本电话簿，即使只用 10 个号码
- **动态开点**：用到哪个号码就记录哪个，用便签纸按需添加

### 从数组到指针

**传统数组实现**：
```python
class SegmentTree:
    def __init__(self, n):
        self.tree = [0] * (4 * n)  # 预分配所有空间
        self.left_child = lambda i: 2 * i + 1
        self.right_child = lambda i: 2 * i + 2
```

**动态开点实现**：
```python
class Node:
    def __init__(self):
        self.val = 0         # 节点值
        self.left = None     # 左子节点（初始为空）
        self.right = None    # 右子节点（初始为空）
        self.lazy = 0        # 懒标记

class DynamicSegmentTree:
    def __init__(self, l, r):
        self.L = l          # 全局左边界
        self.R = r          # 全局右边界
        self.root = Node()  # 只创建根节点
```

**关键差异**：
1. **节点表示**：从数组索引变为对象引用
2. **子节点访问**：从计算索引变为检查指针
3. **空间使用**：从 `O(4N)` 降为 `O(操作数 * logN)`

---

## 实现：动态开点线段树

### 完整代码

```python
class Node:
    """线段树节点"""
    def __init__(self):
        self.val = 0         # 区间和/最值等
        self.lazy = 0        # 懒标记
        self.left = None     # 左子节点
        self.right = None    # 右子节点

class DynamicSegmentTree:
    """
    动态开点线段树，支持 [L, R] 范围的操作
    适用场景：坐标范围大（如 10^9）但操作数少（如 10^5）
    """
    
    def __init__(self, L: int, R: int):
        """
        初始化
        L, R: 支持的坐标范围
        """
        self.L = L
        self.R = R
        self.root = Node()
    
    def _push_down(self, node: Node, l: int, r: int):
        """
        下推懒标记
        关键：子节点不存在时才创建
        """
        if node.lazy == 0:
            return
        
        # 按需创建左子节点
        if node.left is None:
            node.left = Node()
        # 按需创建右子节点
        if node.right is None:
            node.right = Node()
        
        mid = (l + r) // 2
        # 更新左子树
        node.left.val += node.lazy * (mid - l + 1)
        node.left.lazy += node.lazy
        
        # 更新右子树
        node.right.val += node.lazy * (r - mid)
        node.right.lazy += node.lazy
        
        # 清除当前节点懒标记
        node.lazy = 0
    
    def update(self, start: int, end: int, val: int):
        """
        区间更新 [start, end]，增加 val
        """
        self._update(self.root, self.L, self.R, start, end, val)
    
    def _update(self, node: Node, l: int, r: int, 
                start: int, end: int, val: int):
        """
        递归更新
        node: 当前节点
        [l, r]: 当前节点管理的区间
        [start, end]: 目标更新区间
        val: 增加的值
        """
        # 完全覆盖：直接更新
        if start <= l and r <= end:
            node.val += val * (r - l + 1)
            node.lazy += val
            return
        
        # 无交集：不处理
        if end < l or start > r:
            return
        
        # 部分重叠：下推懒标记，递归处理
        self._push_down(node, l, r)
        
        mid = (l + r) // 2
        
        # 按需创建左子节点
        if node.left is None:
            node.left = Node()
        self._update(node.left, l, mid, start, end, val)
        
        # 按需创建右子节点
        if node.right is None:
            node.right = Node()
        self._update(node.right, mid + 1, r, start, end, val)
        
        # 更新当前节点值
        node.val = node.left.val + node.right.val
    
    def query(self, start: int, end: int) -> int:
        """
        区间查询 [start, end] 的和
        """
        return self._query(self.root, self.L, self.R, start, end)
    
    def _query(self, node: Node, l: int, r: int, 
               start: int, end: int) -> int:
        """
        递归查询
        """
        # 完全覆盖：直接返回
        if start <= l and r <= end:
            return node.val
        
        # 无交集：返回 0
        if end < l or start > r:
            return 0
        
        # 部分重叠：下推懒标记，递归处理
        self._push_down(node, l, r)
        
        mid = (l + r) // 2
        res = 0
        
        # 查询左子树（子节点不存在则跳过）
        if node.left:
            res += self._query(node.left, l, mid, start, end)
        
        # 查询右子树
        if node.right:
            res += self._query(node.right, mid + 1, r, start, end)
        
        return res
```

### 关键设计要点

**1. 节点的惰性创建**

```python
# 传统方式：预先判断索引
if 2 * i + 1 < len(self.tree):
    # 访问左子节点

# 动态开点：检查指针
if node.left is None:
    node.left = Node()  # 首次访问时创建
```

**2. 懒标记的下推时机**

必须在访问子节点前调用 `_push_down`：
- 更新操作需要递归到子节点时
- 查询操作需要递归到子节点时

**3. 查询时的空指针处理**

```python
# 子节点不存在，意味着该区间从未被修改
# 其值为初始值 0，无需访问
if node.left:
    res += self._query(node.left, ...)
```

**4. 空间复杂度分析**

- **每次操作最多访问多少个节点？**  
  树高为 `logN`，每层最多访问 2 个节点，总共 `O(logN)` 个。

- **执行 M 次操作后创建多少节点？**  
  最坏情况：`O(M * logN)`。

- **对比传统线段树**：
  - 传统：`O(4N)`，N = 10^9 时无法接受
  - 动态：`O(M * log(R-L))`，M = 10^5 时约 10^6 量级

---

## 应用场景对比

### 场景一：Range Module（LeetCode 715）

**问题**：设计数据结构支持以下操作：
- `addRange(left, right)`：添加区间 `[left, right)`
- `queryRange(left, right)`：查询 `[left, right)` 是否完全被覆盖
- `removeRange(left, right)`：移除区间 `[left, right)`

**约束**：`1 <= left < right <= 10^9`

**方案对比**：

| 方案 | 空间复杂度 | 时间复杂度 | 是否可行 |
|------|-----------|-----------|---------|
| 传统线段树 | O(4 * 10^9) | O(logN) | ❌ 内存爆炸 |
| 动态开点 | O(M * logN) | O(logN) | ✅ 约 10^6 节点 |
| 坐标离散化 | O(4M) | O(logN) | ✅ 需预处理 |

**动态开点实现**：

```python
class RangeModule:
    def __init__(self):
        self.tree = DynamicSegmentTree(1, 10**9)
    
    def addRange(self, left: int, right: int) -> None:
        # 区间赋值为 1（表示被覆盖）
        self.tree.update(left, right - 1, 1)
    
    def queryRange(self, left: int, right: int) -> bool:
        # 查询区间和是否等于区间长度
        return self.tree.query(left, right - 1) == right - left
    
    def removeRange(self, left: int, right: int) -> None:
        # 区间赋值为 0（表示移除）
        self.tree.update(left, right - 1, -1)
```

**注意**：此题需要支持"区间赋值"而非"区间加法"，需要修改懒标记逻辑。

### 场景二：稀疏数据的区间统计

**问题**：有 N 个点 `(x, y)`，坐标范围 `[0, 10^9]`。查询任意区间 `[l, r]` 内所有点的 y 值之和。

**分析**：
- 点的数量：N ≤ 10^5
- 坐标范围：10^9
- 传统线段树：无法分配 4 * 10^9 空间
- 坐标离散化：需要预处理，无法支持动态插入

**动态开点优势**：
```python
tree = DynamicSegmentTree(0, 10**9)

# 插入点 (x, y)
for x, y in points:
    tree.update(x, x, y)  # 单点更新

# 查询区间 [l, r]
result = tree.query(l, r)
```

- 支持动态插入
- 无需预处理
- 空间随操作数增长

---

## 动态开点 vs 坐标离散化

两种方案都能解决大坐标范围问题，如何选择？

### 坐标离散化

**原理**：将 10^9 的坐标映射到 [0, M] 的小范围。

```python
# 预处理
coords = [x for x, y in points]
coords = sorted(set(coords))
coord_map = {v: i for i, v in enumerate(coords)}

# 建树
tree = SegmentTree(len(coords))

# 操作时映射坐标
tree.update(coord_map[x], coord_map[x], y)
```

**优势**：
- 空间固定：`O(M)`，M 为不同坐标数
- 传统线段树实现，代码简洁
- 常数较小

**局限**：
- **必须预知所有坐标**
- 不支持动态插入新坐标
- 需要额外的映射表

### 动态开点

**优势**：
- **支持动态坐标**
- 无需预处理
- 代码通用性强

**局限**：
- 常数较大（指针、对象创建开销）
- 递归深度可能较大

### 选择建议

| 场景 | 推荐方案 |
|------|---------|
| 坐标已知且固定 | 坐标离散化 |
| 坐标动态增加 | 动态开点 |
| 在线查询（无法预处理） | 动态开点 |
| 追求极致性能 | 坐标离散化 |
| 代码简洁性 | 视情况而定 |

---

## 常见陷阱

### 陷阱一：忘记创建子节点

**错误代码**：
```python
def _update(self, node, l, r, start, end, val):
    # ...
    mid = (l + r) // 2
    # ❌ 直接访问可能为空的子节点
    self._update(node.left, l, mid, start, end, val)
```

**正确做法**：
```python
if node.left is None:
    node.left = Node()
self._update(node.left, l, mid, start, end, val)
```

### 陷阱二：懒标记下推顺序错误

**错误代码**：
```python
def _query(self, node, l, r, start, end):
    # ❌ 先访问子节点
    res = self._query(node.left, ...)
    # 后下推懒标记
    self._push_down(node, l, r)
```

**正确做法**：
```python
# ✅ 先下推懒标记
self._push_down(node, l, r)
# 再访问子节点
res = self._query(node.left, ...)
```

### 陷阱三：查询空节点

**错误代码**：
```python
def _query(self, node, l, r, start, end):
    # ❌ node 可能为 None
    res = self._query(node.left, ...)
```

**正确做法**：
```python
# ✅ 检查节点是否存在
if node.left:
    res += self._query(node.left, ...)
```

### 陷阱四：区间边界处理

动态开点线段树的区间是 `[L, R]`，注意与题目要求的开闭区间对应：
- LeetCode 715 使用左闭右开 `[left, right)`
- 线段树内部使用闭区间 `[left, right-1]`

```python
# 题目：[left, right)
self.tree.update(left, right - 1, val)  # 转换为 [left, right-1]
```

---

## 扩展思考

### 1. 动态开点的极限

**问题**：如果执行 10^9 次操作，动态开点还有优势吗？

**分析**：
- 创建节点数：`O(10^9 * log(10^9))` ≈ 3 * 10^10
- 传统线段树：4 * 10^9

此时动态开点反而更差。

**结论**：动态开点适合"操作数远小于坐标范围"的场景。

### 2. 内存池优化

频繁创建 `Node` 对象有开销，可以使用对象池：

```python
class NodePool:
    def __init__(self):
        self.pool = []
    
    def get_node(self):
        if self.pool:
            return self.pool.pop()
        return Node()
    
    def recycle(self, node):
        node.val = node.lazy = 0
        node.left = node.right = None
        self.pool.append(node)
```

### 3. 持久化动态线段树

结合动态开点与路径复制，实现可持久化数据结构（主席树）。

每次修改只创建 `O(logN)` 个新节点，保留历史版本。

（详见第71章：可持久化线段树）

---

## 本章总结

### 核心要点

1. **动态开点的本质**：惰性实例化，按需创建节点
2. **适用场景**：坐标范围大、操作数少
3. **空间复杂度**：`O(M * logN)`，M 为操作数
4. **关键技巧**：
   - 节点用指针/对象表示
   - 访问子节点前检查是否为空
   - 懒标记下推时机正确

### 与传统线段树的对比

| 维度 | 传统线段树 | 动态开点线段树 |
|------|-----------|---------------|
| 空间复杂度 | O(4N) | O(M * logN) |
| 时间复杂度 | O(logN) | O(logN) |
| 适用场景 | 坐标范围小 | 坐标范围大 |
| 代码复杂度 | 简单（数组） | 中等（指针） |
| 常数因子 | 小 | 较大 |

### 与坐标离散化的对比

- **离散化**：适合坐标已知、静态场景
- **动态开点**：适合坐标动态、在线场景

### 记住这句话

**"空间换时间"是算法设计的常见思路，但当空间代价过高时，"按需分配"成为更优选择。动态开点线段树体现了"用多少、开多少"的资源管理智慧。**

下一章，我们将学习**线段树合并**，探讨如何高效合并多棵线段树。
