# 区间乘区间求和

## 问题的提出

在上一章，我们掌握了「区间加 + 区间求和」的线段树实现。现在思考一个更复杂的场景：

**场景：金融投资系统**
```python
# 有 N 个账户，初始资金为 amounts
amounts = [1000, 2000, 1500, 3000, 2500, ...]

# 操作1：给账户 [10, 50] 每人发放 500 元补贴（区间加）
# 操作2：账户 [20, 80] 获得 10% 收益，资金乘以 1.1（区间乘）
# 操作3：查询账户 [30, 60] 的总资金（区间求和）

# 需要同时支持：区间加、区间乘、区间求和
```

**核心挑战**：当同一个区间既有「加法」又有「乘法」懒标记时，如何正确处理？

先思考一个简单的例子：

```python
# 初始值：[a, b, c]，区间和 = a + b + c

# 操作序列：
# 1. 区间 [0,2] 加 5  →  [a+5, b+5, c+5]
# 2. 区间 [0,2] 乘 2  →  [(a+5)*2, (b+5)*2, (c+5)*2]

# 最终每个元素：2a+10, 2b+10, 2c+10
# 区间和 = 2(a+b+c) + 30
```

如果操作顺序反过来呢？

```python
# 操作序列（反序）：
# 1. 区间 [0,2] 乘 2  →  [2a, 2b, 2c]
# 2. 区间 [0,2] 加 5  →  [2a+5, 2b+5, 2c+5]

# 最终每个元素：2a+5, 2b+5, 2c+5
# 区间和 = 2(a+b+c) + 15
```

**关键发现**：操作顺序不同，结果不同！我们需要找到一种方式，正确表示和合并这两种操作。

---

## 核心思想：统一的变换模型

### 线性变换的本质

观察两种操作对单个元素的影响：
- 加法操作：`x → x + add`
- 乘法操作：`x → x * mul`

这两种操作都是**线性变换**，可以统一表示为：

$$x \rightarrow mul \cdot x + add$$

其中 `(mul, add)` 是变换参数：
- 纯加法操作：`mul = 1, add = delta`
- 纯乘法操作：`mul = factor, add = 0`
- 恒等变换（无操作）：`mul = 1, add = 0`

### 变换的复合

当连续应用两个变换时会发生什么？

设当前变换为 `(mul₁, add₁)`，新变换为 `(mul₂, add₂)`：

$$x \xrightarrow{(mul_1, add_1)} mul_1 \cdot x + add_1 \xrightarrow{(mul_2, add_2)} mul_2 \cdot (mul_1 \cdot x + add_1) + add_2$$

展开后：

$$= mul_2 \cdot mul_1 \cdot x + mul_2 \cdot add_1 + add_2$$

因此，复合变换的参数为：

$$\begin{cases} mul_{new} = mul_2 \cdot mul_1 \\ add_{new} = mul_2 \cdot add_1 + add_2 \end{cases}$$

**这就是合并两个懒标记的公式！**

### 对区间和的影响

设区间 `[l, r]` 的原始和为 `sum`，区间长度为 `len = r - l + 1`。

应用变换 `(mul, add)` 后的新和：

$$sum_{new} = mul \cdot sum + add \cdot len$$

**推导过程**：
```
原始元素：x₁, x₂, ..., xₙ
变换后：mul·x₁+add, mul·x₂+add, ..., mul·xₙ+add

新的和 = Σ(mul·xᵢ + add)
       = mul·Σxᵢ + n·add
       = mul·sum + len·add
```

---

## 数据结构设计

### 节点结构

每个节点需要存储：
- `sum`：区间和
- `mul`：乘法懒标记
- `add`：加法懒标记

```python
class Node:
    def __init__(self):
        self.sum = 0     # 区间和
        self.mul = 1     # 乘法懒标记（初始为 1，表示无操作）
        self.add = 0     # 加法懒标记（初始为 0，表示无操作）
        self.left = None
        self.right = None
```

### 懒标记的语义

节点上的懒标记 `(mul, add)` 表示：

> 该节点的所有后代节点，需要对其值应用变换 `x → mul * x + add`

**注意**：节点自身的 `sum` 值已经应用了这个变换，但子节点还没有。

---

## 核心操作实现

### 下推操作（pushdown）

当需要访问子节点时，必须先将懒标记下推：

```python
def pushdown(self, node, l, r):
    """将懒标记下推到子节点"""
    if node.mul == 1 and node.add == 0:
        return  # 无懒标记，无需下推
    
    mid = (l + r) // 2
    left_len = mid - l + 1
    right_len = r - mid
    
    # 对左子节点应用变换
    if node.left:
        # 更新左子节点的 sum
        node.left.sum = node.mul * node.left.sum + node.add * left_len
        # 合并左子节点的懒标记
        node.left.mul = node.mul * node.left.mul
        node.left.add = node.mul * node.left.add + node.add
    
    # 对右子节点应用变换
    if node.right:
        # 更新右子节点的 sum
        node.right.sum = node.mul * node.right.sum + node.add * right_len
        # 合并右子节点的懒标记
        node.right.mul = node.mul * node.right.mul
        node.right.add = node.mul * node.right.add + node.add
    
    # 清空当前节点的懒标记
    node.mul = 1
    node.add = 0
```

**关键细节**：懒标记合并时，必须用 `node.mul` 乘以子节点的 `add`。

为什么？因为变换的复合顺序是：先应用子节点原有的变换，再应用父节点的变换。

### 区间乘法更新

```python
def range_multiply(self, node, l, r, ql, qr, factor):
    """区间 [ql, qr] 的每个元素乘以 factor"""
    if l > qr or r < ql:
        return  # 完全不相交
    
    if ql <= l and r <= qr:
        # 完全覆盖：应用乘法变换
        node.sum = factor * node.sum
        node.mul = factor * node.mul
        node.add = factor * node.add  # 注意：add 也要乘！
        return
    
    # 部分覆盖：下推后递归
    self.pushdown(node, l, r)
    mid = (l + r) // 2
    
    if ql <= mid:
        self.range_multiply(node.left, l, mid, ql, qr, factor)
    if qr > mid:
        self.range_multiply(node.right, mid + 1, r, ql, qr, factor)
    
    # 上推更新
    node.sum = node.left.sum + node.right.sum
```

**易错点**：区间乘法不仅要乘 `mul`，还要乘 `add`！

原因：懒标记 `(mul, add)` 表示变换 `x → mul*x + add`。当外层再乘以 `factor` 时：

$$factor \cdot (mul \cdot x + add) = (factor \cdot mul) \cdot x + (factor \cdot add)$$

### 区间加法更新

```python
def range_add(self, node, l, r, ql, qr, delta):
    """区间 [ql, qr] 的每个元素加上 delta"""
    if l > qr or r < ql:
        return  # 完全不相交
    
    if ql <= l and r <= qr:
        # 完全覆盖：应用加法变换
        length = r - l + 1
        node.sum = node.sum + delta * length
        node.add = node.add + delta  # mul 不变
        return
    
    # 部分覆盖：下推后递归
    self.pushdown(node, l, r)
    mid = (l + r) // 2
    
    if ql <= mid:
        self.range_add(node.left, l, mid, ql, qr, delta)
    if qr > mid:
        self.range_add(node.right, mid + 1, r, ql, qr, delta)
    
    # 上推更新
    node.sum = node.left.sum + node.right.sum
```

### 区间查询

```python
def range_query(self, node, l, r, ql, qr):
    """查询区间 [ql, qr] 的和"""
    if l > qr or r < ql:
        return 0  # 完全不相交
    
    if ql <= l and r <= qr:
        return node.sum  # 完全覆盖
    
    # 部分覆盖：下推后递归
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
class SegmentTreeMulAdd:
    """支持区间加、区间乘、区间求和的线段树"""
    
    class Node:
        __slots__ = ['sum', 'mul', 'add', 'left', 'right']
        
        def __init__(self):
            self.sum = 0
            self.mul = 1  # 乘法懒标记
            self.add = 0  # 加法懒标记
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
        """下推懒标记"""
        if node.mul == 1 and node.add == 0:
            return
        
        mid = (l + r) // 2
        left_len = mid - l + 1
        right_len = r - mid
        
        # 下推到左子节点
        node.left.sum = node.mul * node.left.sum + node.add * left_len
        node.left.mul *= node.mul
        node.left.add = node.mul * node.left.add + node.add
        
        # 下推到右子节点
        node.right.sum = node.mul * node.right.sum + node.add * right_len
        node.right.mul *= node.mul
        node.right.add = node.mul * node.right.add + node.add
        
        # 清空懒标记
        node.mul = 1
        node.add = 0
    
    def multiply(self, ql, qr, factor):
        """区间 [ql, qr] 每个元素乘以 factor"""
        self._multiply(self.root, 0, self.n - 1, ql, qr, factor)
    
    def _multiply(self, node, l, r, ql, qr, factor):
        if l > qr or r < ql:
            return
        
        if ql <= l and r <= qr:
            node.sum *= factor
            node.mul *= factor
            node.add *= factor  # 关键：add 也要乘
            return
        
        self._pushdown(node, l, r)
        mid = (l + r) // 2
        
        if ql <= mid:
            self._multiply(node.left, l, mid, ql, qr, factor)
        if qr > mid:
            self._multiply(node.right, mid + 1, r, ql, qr, factor)
        
        node.sum = node.left.sum + node.right.sum
    
    def add(self, ql, qr, delta):
        """区间 [ql, qr] 每个元素加上 delta"""
        self._add(self.root, 0, self.n - 1, ql, qr, delta)
    
    def _add(self, node, l, r, ql, qr, delta):
        if l > qr or r < ql:
            return
        
        if ql <= l and r <= qr:
            node.sum += delta * (r - l + 1)
            node.add += delta
            return
        
        self._pushdown(node, l, r)
        mid = (l + r) // 2
        
        if ql <= mid:
            self._add(node.left, l, mid, ql, qr, delta)
        if qr > mid:
            self._add(node.right, mid + 1, r, ql, qr, delta)
        
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

## 执行流程可视化

用一个例子验证我们的实现：

```python
# 初始数组：[1, 2, 3, 4, 5]
tree = SegmentTreeMulAdd([1, 2, 3, 4, 5])

# 操作1：区间 [0, 4] 加 2
tree.add(0, 4, 2)
# 数组变为：[3, 4, 5, 6, 7]

# 操作2：区间 [1, 3] 乘 3
tree.multiply(1, 3, 3)
# 数组变为：[3, 12, 15, 18, 7]

# 操作3：查询区间 [0, 4] 的和
result = tree.query(0, 4)
# 预期：3 + 12 + 15 + 18 + 7 = 55
```

**线段树状态变化**：

```
初始状态：
              [15]                 sum=15, mul=1, add=0
            /      \
        [3]         [12]           
       /   \       /    \
     [1]   [2]   [3]    [9]
                       /   \
                     [4]   [5]

加 2 后：
              [25]                 sum=25, mul=1, add=2
            /      \
        [7]         [18]           (懒标记待下推)
       /   \       /    \
     [1]   [2]   [3]    [9]        (还未更新)

区间 [1,3] 乘 3（需要下推）：
先下推到 [0,2] 和 [3,4]：
        [7+2=9]         [18+2=20] → [54]  (乘 3)
       /   \            /    \
     [3]   [4]        [5]    [11]

最终查询 [0,4]：
3 + (4*3=12) + (5*3=15) + (6*3=18) + 7 = 55 ✓
```

---

## 常见错误与陷阱

### 错误一：乘法时忘记更新 add

```python
# 错误实现
def multiply_wrong(self, node, factor):
    node.sum *= factor
    node.mul *= factor
    # 忘记：node.add *= factor  ← 致命错误！
```

**后果**：加法操作的效果被错误地"稀释"了。

**正确理解**：`(mul, add)` 是一个整体变换，当外层乘以 `factor` 时，整个变换都要相应调整。

### 错误二：下推时懒标记合并顺序错误

```python
# 错误实现
def pushdown_wrong(self, node, l, r):
    # 错误：直接赋值而非合并
    node.left.mul = node.mul  # ← 覆盖了子节点原有的懒标记
    node.left.add = node.add
```

**正确做法**：子节点的新懒标记 = 父节点变换 ∘ 子节点原变换

```python
# 正确实现
node.left.mul = node.mul * node.left.mul
node.left.add = node.mul * node.left.add + node.add
```

### 错误三：忽略空懒标记检查

```python
# 低效实现
def pushdown_slow(self, node, l, r):
    # 每次都执行，即使懒标记为空
    node.left.sum = node.mul * node.left.sum + node.add * left_len
    # ...
```

**优化**：当 `mul == 1 and add == 0` 时，无需任何操作。

---

## LeetCode 实战：P3373 线段树 2（洛谷模板题）

虽然 LeetCode 没有直接考察这个问题的题目，但洛谷 P3373 是经典的模板题：

**题目**：
- 操作 1：区间 `[l, r]` 每个元素乘以 `k`
- 操作 2：区间 `[l, r]` 每个元素加上 `k`
- 操作 3：查询区间 `[l, r]` 的和，对 `p` 取模

**参考代码**（带取模）：

```python
class SegmentTreeMod:
    """支持区间加、区间乘、区间求和（带取模）"""
    
    def __init__(self, nums, mod):
        self.mod = mod
        self.n = len(nums)
        # 使用数组实现，更高效
        size = 4 * self.n
        self.tree = [0] * size
        self.mul_tag = [1] * size
        self.add_tag = [0] * size
        self._build(nums, 1, 0, self.n - 1)
    
    def _build(self, nums, idx, l, r):
        if l == r:
            self.tree[idx] = nums[l] % self.mod
            return
        mid = (l + r) // 2
        self._build(nums, idx * 2, l, mid)
        self._build(nums, idx * 2 + 1, mid + 1, r)
        self.tree[idx] = (self.tree[idx * 2] + self.tree[idx * 2 + 1]) % self.mod
    
    def _pushdown(self, idx, l, r):
        mul, add = self.mul_tag[idx], self.add_tag[idx]
        if mul == 1 and add == 0:
            return
        
        mid = (l + r) // 2
        left, right = idx * 2, idx * 2 + 1
        left_len, right_len = mid - l + 1, r - mid
        
        # 更新左子节点
        self.tree[left] = (mul * self.tree[left] + add * left_len) % self.mod
        self.mul_tag[left] = (mul * self.mul_tag[left]) % self.mod
        self.add_tag[left] = (mul * self.add_tag[left] + add) % self.mod
        
        # 更新右子节点
        self.tree[right] = (mul * self.tree[right] + add * right_len) % self.mod
        self.mul_tag[right] = (mul * self.mul_tag[right]) % self.mod
        self.add_tag[right] = (mul * self.add_tag[right] + add) % self.mod
        
        # 清空懒标记
        self.mul_tag[idx] = 1
        self.add_tag[idx] = 0
    
    def multiply(self, ql, qr, k):
        self._multiply(1, 0, self.n - 1, ql, qr, k)
    
    def _multiply(self, idx, l, r, ql, qr, k):
        if l > qr or r < ql:
            return
        if ql <= l and r <= qr:
            self.tree[idx] = (self.tree[idx] * k) % self.mod
            self.mul_tag[idx] = (self.mul_tag[idx] * k) % self.mod
            self.add_tag[idx] = (self.add_tag[idx] * k) % self.mod
            return
        
        self._pushdown(idx, l, r)
        mid = (l + r) // 2
        if ql <= mid:
            self._multiply(idx * 2, l, mid, ql, qr, k)
        if qr > mid:
            self._multiply(idx * 2 + 1, mid + 1, r, ql, qr, k)
        self.tree[idx] = (self.tree[idx * 2] + self.tree[idx * 2 + 1]) % self.mod
    
    def add(self, ql, qr, k):
        self._add(1, 0, self.n - 1, ql, qr, k)
    
    def _add(self, idx, l, r, ql, qr, k):
        if l > qr or r < ql:
            return
        if ql <= l and r <= qr:
            self.tree[idx] = (self.tree[idx] + k * (r - l + 1)) % self.mod
            self.add_tag[idx] = (self.add_tag[idx] + k) % self.mod
            return
        
        self._pushdown(idx, l, r)
        mid = (l + r) // 2
        if ql <= mid:
            self._add(idx * 2, l, mid, ql, qr, k)
        if qr > mid:
            self._add(idx * 2 + 1, mid + 1, r, ql, qr, k)
        self.tree[idx] = (self.tree[idx * 2] + self.tree[idx * 2 + 1]) % self.mod
    
    def query(self, ql, qr):
        return self._query(1, 0, self.n - 1, ql, qr)
    
    def _query(self, idx, l, r, ql, qr):
        if l > qr or r < ql:
            return 0
        if ql <= l and r <= qr:
            return self.tree[idx]
        
        self._pushdown(idx, l, r)
        mid = (l + r) // 2
        result = 0
        if ql <= mid:
            result = self._query(idx * 2, l, mid, ql, qr)
        if qr > mid:
            result = (result + self._query(idx * 2 + 1, mid + 1, r, ql, qr)) % self.mod
        return result
```

---

## 复杂度分析

| 操作 | 时间复杂度 | 空间复杂度 |
|------|----------|-----------|
| 构建 | O(N) | O(N) |
| 区间乘 | O(log N) | O(log N) 栈空间 |
| 区间加 | O(log N) | O(log N) 栈空间 |
| 区间查询 | O(log N) | O(log N) 栈空间 |

---

## 扩展思考

### 思考一：三种操作混合？

如果需要同时支持：区间加、区间乘、区间赋值，如何处理？

**提示**：赋值操作可以看作「先乘 0，再加 value」。

但更优雅的做法是引入第三个标记 `assign`，并定义优先级：
- 赋值优先级最高，会清空 `mul` 和 `add`
- 乘法次之
- 加法最低

### 思考二：仿射变换扩展

我们实现的 `(mul, add)` 变换实际上是一维仿射变换。如果扩展到矩阵形式：

$$\begin{bmatrix} x' \\ 1 \end{bmatrix} = \begin{bmatrix} mul & add \\ 0 & 1 \end{bmatrix} \begin{bmatrix} x \\ 1 \end{bmatrix}$$

这种矩阵表示让复合操作变得非常自然：两个变换的复合就是两个矩阵相乘。

### 思考三：除法操作？

能否支持「区间除法」？

**答案**：在整数域上比较复杂，因为除法可能有精度损失。但在浮点数或有理数域上，可以将 `x / k` 视为 `x * (1/k)`，复用乘法逻辑。

---

## 本章小结

本章核心要点：

1. **统一变换模型**：用 `(mul, add)` 表示线性变换 `x → mul*x + add`，统一加法和乘法操作

2. **变换复合公式**：两个变换复合的规则是关键
   - `mul_new = mul₂ × mul₁`
   - `add_new = mul₂ × add₁ + add₂`

3. **区间和更新公式**：`sum_new = mul × sum + add × len`

4. **易错点**：乘法操作时，`add` 标记也必须乘上对应因子

5. **代码模板**：掌握支持多种操作的线段树模板，为更复杂的应用打下基础

**设计启示**：

当面对多种懒标记组合时，关键是找到一个**统一的数学模型**来表示这些操作，并推导出正确的复合规则。这种思维方式可以推广到更复杂的场景，如矩阵变换、区间 GCD 等。

下一章我们将学习**区间覆盖问题**，探索另一类重要的线段树应用。
