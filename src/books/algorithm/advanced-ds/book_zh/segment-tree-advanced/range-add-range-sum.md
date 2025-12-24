# 区间加区间求和

## 问题场景

现在思考这样一个场景：

**场景：薪资管理系统**
```python
# 有 N 名员工,编号 0 到 N-1
salaries = [5000, 6000, 7000, 8000, 9000, ...]

# 操作1：给部门A(员工 [10, 50])每人涨薪 500
# 操作2：给部门B(员工 [30, 80])每人涨薪 300  
# 操作3：查询部门C(员工 [20, 60])的总薪资

# 需要支持：
# - 区间修改：给某个范围的员工统一加薪
# - 区间查询：查询某个范围的员工总薪资
```

**核心操作**：
1. `update(l, r, delta)`：区间 `[l, r]` 每个元素加 `delta`
2. `query(l, r)`：查询区间 `[l, r]` 的和

**朴素方法的代价**：
```python
# 方法1：直接修改数组
for i in range(l, r+1):
    arr[i] += delta  # O(N)

# 查询
sum(arr[l:r+1])  # O(N)

# 每次操作 O(N),M 次操作总共 O(M*N)
```

前面我们学过懒标记可以优化区间修改，复杂度降到 `O(logN)`。本章系统总结这一经典组合。

---

## 核心思想：懒标记

懒标记的精髓：**延迟更新，按需下推**。

### 基本原理

**1. 完全覆盖时打标记**

当更新区间完全覆盖当前节点管理的区间时：
- 更新节点的值
- 打上懒标记
- **不递归到子节点**

```python
def update(node, l, r, start, end, delta):
    # 完全覆盖
    if start <= l and r <= end:
        node.val += delta * (r - l + 1)  # 更新区间和
        node.lazy += delta                # 打懒标记
        return  # 不再递归
```

**2. 部分覆盖时下推标记**

当需要递归到子节点时：
- 先将当前节点的懒标记下推到子节点
- 再递归处理子节点

```python
def update(node, l, r, start, end, delta):
    # 部分覆盖
    push_down(node, l, r)  # 下推懒标记
    
    mid = (l + r) // 2
    update(node.left, l, mid, start, end, delta)
    update(node.right, mid+1, r, start, end, delta)
    
    push_up(node)  # 更新当前节点
```

**3. 查询时下推标记**

查询也需要递归到子节点,所以要先下推懒标记：

```python
def query(node, l, r, start, end):
    # 完全覆盖
    if start <= l and r <= end:
        return node.val
    
    # 部分覆盖
    push_down(node, l, r)  # 下推懒标记
    
    mid = (l + r) // 2
    res = 0
    res += query(node.left, l, mid, start, end)
    res += query(node.right, mid+1, r, start, end)
    return res
```

### 复杂度分析

- **区间修改**：`O(logN)`
- **区间查询**：`O(logN)`  
- **空间复杂度**：`O(N)`

---

## 实现：支持区间加的线段树

### 完整代码

```python
class Node:
    def __init__(self):
        self.val = 0      # 区间和
        self.lazy = 0     # 懒标记(待加的值)
        self.left = None
        self.right = None

class SegmentTree:
    """
    支持区间加法和区间求和的线段树
    """
    
    def __init__(self, nums):
        """
        nums: 初始数组
        """
        self.n = len(nums)
        self.nums = nums
        self.root = Node()
        self._build(self.root, 0, self.n - 1)
    
    def _build(self, node, l, r):
        """
        构建线段树
        """
        if l == r:
            node.val = self.nums[l]
            return
        
        mid = (l + r) // 2
        node.left = Node()
        node.right = Node()
        
        self._build(node.left, l, mid)
        self._build(node.right, mid + 1, r)
        
        self._push_up(node)
    
    def _push_up(self, node):
        """
        用子节点更新父节点
        """
        left_val = node.left.val if node.left else 0
        right_val = node.right.val if node.right else 0
        node.val = left_val + right_val
    
    def _push_down(self, node, l, r):
        """
        下推懒标记到子节点
        """
        if node.lazy == 0:
            return
        
        # 确保子节点存在
        if node.left is None:
            node.left = Node()
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
    
    def update(self, start, end, delta):
        """
        区间 [start, end] 每个元素加 delta
        """
        self._update(self.root, 0, self.n - 1, start, end, delta)
    
    def _update(self, node, l, r, start, end, delta):
        """
        递归更新
        """
        # 完全覆盖
        if start <= l and r <= end:
            node.val += delta * (r - l + 1)
            node.lazy += delta
            return
        
        # 无交集
        if end < l or start > r:
            return
        
        # 部分覆盖
        self._push_down(node, l, r)
        
        mid = (l + r) // 2
        self._update(node.left, l, mid, start, end, delta)
        self._update(node.right, mid + 1, r, start, end, delta)
        
        self._push_up(node)
    
    def query(self, start, end):
        """
        查询区间 [start, end] 的和
        """
        return self._query(self.root, 0, self.n - 1, start, end)
    
    def _query(self, node, l, r, start, end):
        """
        递归查询
        """
        # 完全覆盖
        if start <= l and r <= end:
            return node.val
        
        # 无交集
        if end < l or start > r:
            return 0
        
        # 部分覆盖
        self._push_down(node, l, r)
        
        mid = (l + r) // 2
        res = 0
        res += self._query(node.left, l, mid, start, end)
        res += self._query(node.right, mid + 1, r, start, end)
        
        return res
    
    def point_query(self, index):
        """
        单点查询
        """
        return self.query(index, index)
    
    def point_update(self, index, delta):
        """
        单点更新
        """
        self.update(index, index, delta)


# 测试
nums = [1, 2, 3, 4, 5]
tree = SegmentTree(nums)

print(tree.query(0, 4))  # 15 (1+2+3+4+5)

tree.update(1, 3, 10)    # [1, 12, 13, 14, 5]
print(tree.query(0, 4))  # 45 (1+12+13+14+5)
print(tree.query(1, 3))  # 39 (12+13+14)
```

### 代码解读

**1. 懒标记的含义**

```python
node.lazy = 5
# 表示：该节点管理的区间,每个元素都待加 5
# 但尚未实际更新到子节点
```

**2. push_down 的时机**

```python
# 只有在需要访问子节点时才 push_down
def _update(...):
    if 完全覆盖:
        return  # ✅ 不 push_down
    
    self._push_down(...)  # ✅ 部分覆盖时才 push_down
    # 递归子节点
```

**3. 懒标记的累加**

```python
# 子节点已有懒标记
node.left.lazy = 3

# 父节点下推懒标记
node.left.lazy += node.lazy  # ✅ 累加而非覆盖
```

**4. 区间和的更新**

```python
# 给区间 [l, r] 每个元素加 delta
# 区间和增加 delta * (r - l + 1)
node.val += delta * (r - l + 1)
```

---

## 应用场景

### 场景一：差分数组的替代

**传统差分数组**：
```python
diff = [0] * (n + 1)

# 区间 [l, r] 加 delta
diff[l] += delta
diff[r+1] -= delta

# 最后求前缀和得到结果
for i in range(1, n):
    diff[i] += diff[i-1]
```

**限制**：
- 只能最后一次性求前缀和
- 不支持中途查询

**线段树优势**：
- 支持多次修改
- 随时查询任意区间

### 场景二：LeetCode 307 - 区域和检索

**题目**：实现 `NumArray` 类：
- `update(index, val)`：将 `nums[index]` 更新为 `val`
- `sumRange(left, right)`：返回区间和

**线段树解法**：

```python
class NumArray:
    def __init__(self, nums: List[int]):
        self.tree = SegmentTree(nums)
        self.nums = nums[:]
    
    def update(self, index: int, val: int) -> None:
        # 单点更新：先查询旧值,计算差值
        old_val = self.nums[index]
        delta = val - old_val
        self.tree.update(index, index, delta)
        self.nums[index] = val
    
    def sumRange(self, left: int, right: int) -> int:
        return self.tree.query(left, right)
```

**复杂度**：
- 构建：O(N)
- 单次更新：O(logN)
- 单次查询：O(logN)

### 场景三：二维区间修改

**问题**：二维矩阵，支持：
- 修改子矩阵所有元素加 delta
- 查询子矩阵的和

**方法**：二维线段树（树套树）

```python
# 外层线段树管理行
# 每个节点的值是一棵线段树(管理列)
class SegmentTree2D:
    def update(self, row1, col1, row2, col2, delta):
        # 更新矩形区域 [row1, col1] 到 [row2, col2]
        ...
    
    def query(self, row1, col1, row2, col2):
        # 查询矩形区域的和
        ...
```

**复杂度**：`O(log^2 N)`

---

## 常见陷阱

### 陷阱一：忘记下推懒标记

**错误代码**：
```python
def _query(self, node, l, r, start, end):
    # ❌ 直接递归,未下推懒标记
    mid = (l + r) // 2
    res = self._query(node.left, l, mid, start, end)
    res += self._query(node.right, mid+1, r, start, end)
    return res
```

**后果**：查询结果错误,因为子节点的值未更新。

**正确做法**：
```python
# ✅ 先下推懒标记
self._push_down(node, l, r)
# 再递归
```

### 陷阱二：懒标记覆盖而非累加

**错误代码**：
```python
def _push_down(self, node, l, r):
    # ❌ 直接赋值
    node.left.lazy = node.lazy
    node.right.lazy = node.lazy
```

**问题**：
```python
# 第一次：区间加 5
node.left.lazy = 5

# 第二次：区间加 3
# 下推时变成:
node.left.lazy = 3  # ❌ 之前的 5 被覆盖
```

**正确做法**：
```python
# ✅ 累加
node.left.lazy += node.lazy
```

### 陷阱三：区间长度计算错误

**错误代码**：
```python
# ❌ 区间 [l, r] 的长度
length = r - l  # 错误!
```

**正确计算**：
```python
# ✅ 闭区间长度
length = r - l + 1
```

**示例**：
```python
[3, 5] 的长度 = 5 - 3 + 1 = 3  # 包含 3, 4, 5
```

### 陷阱四：push_down 调用位置

**错误代码**：
```python
def _update(self, node, l, r, start, end, delta):
    # ❌ 完全覆盖时也 push_down
    self._push_down(node, l, r)
    
    if start <= l and r <= end:
        node.val += delta * (r - l + 1)
        node.lazy += delta
        return
```

**问题**：完全覆盖时不需要访问子节点,push_down 是浪费。

**正确做法**：
```python
# ✅ 只在部分覆盖时 push_down
if start <= l and r <= end:
    # 完全覆盖,直接返回
    ...
    return

# 部分覆盖,才 push_down
self._push_down(node, l, r)
```

---

## 扩展思考

### 1. 区间乘法+区间加法

**问题**：支持两种操作：
- 区间乘 k：`[l, r]` 每个元素乘 k
- 区间加 delta：`[l, r]` 每个元素加 delta

**关键**：两种懒标记的顺序。

**数学关系**：
```python
# 操作序列：先乘 k1,再加 d1,再乘 k2,再加 d2
x' = ((x * k1) + d1) * k2 + d2
   = x * (k1 * k2) + (d1 * k2 + d2)
```

**懒标记设计**：
```python
node.mul_lazy = 1  # 乘法懒标记(初始为1)
node.add_lazy = 0  # 加法懒标记(初始为0)

# 下推时：先乘后加
child.val = child.val * node.mul_lazy + node.add_lazy * (length)
child.mul_lazy *= node.mul_lazy
child.add_lazy = child.add_lazy * node.mul_lazy + node.add_lazy
```

### 2. 区间赋值+区间求和

**问题**：支持：
- 区间赋值：`[l, r]` 所有元素变为 v
- 区间求和

**懒标记设计**：
```python
node.set_flag = False  # 是否有赋值操作
node.set_value = 0     # 赋值的值
node.add_lazy = 0      # 加法懒标记

# 下推时：赋值操作会覆盖加法标记
if node.set_flag:
    child.val = node.set_value * (length)
    child.set_flag = True
    child.set_value = node.set_value
    child.add_lazy = 0  # 清除加法标记
else:
    # 正常的加法下推
    ...
```

### 3. 持久化线段树

**问题**：保留每次修改后的历史版本。

**方法**：路径复制（详见第71章）。

---

## 本章总结

### 核心要点

1. **懒标记的本质**：延迟更新,按需下推
2. **关键操作**：
   - `push_down`：下推懒标记到子节点
   - `push_up`：用子节点更新父节点
3. **时间复杂度**：
   - 区间修改：O(logN)
   - 区间查询：O(logN)
4. **适用场景**：
   - 频繁的区间修改和查询
   - 替代差分数组(支持中途查询)

### 懒标记的要点

| 要点 | 说明 |
|------|------|
| 下推时机 | 需要访问子节点时 |
| 累加方式 | += 而非 = |
| 清除时机 | 下推后立即清除 |
| 区间长度 | r - l + 1 |

### 操作复杂度对比

| 方法 | 区间修改 | 区间查询 | 空间 |
|------|---------|---------|------|
| 朴素数组 | O(N) | O(N) | O(N) |
| 差分数组 | O(1) | O(N) | O(N) |
| 前缀和 | O(N) | O(1) | O(N) |
| 线段树+懒标记 | O(logN) | O(logN) | O(N) |

### 记住这句话

**"懒标记是线段树的灵魂。它体现了'延迟计算'的思想：不到万不得已,绝不递归到子节点。这种'懒惰'换来了O(logN)的高效。"**

下一章,我们将学习更复杂的组合：**区间乘法与区间求和**。
