# 树状数组原理与实现

## 引入：从前缀和说起

在前面的章节中，我们学习了线段树——一种强大的区间数据结构。但你可能已经发现，线段树的实现相当复杂，代码量较大。

**问题**：有没有更简洁的数据结构，能解决类似的问题？

答案是肯定的。今天我们介绍**树状数组**（Binary Indexed Tree，简称 BIT），也叫**Fenwick Tree**。

**树状数组的特点**：
- 代码极其简洁（核心操作仅需几行）
- 常数因子小，实际运行速度快
- 能解决的问题是线段树的子集

让我们从最基本的需求开始：

```python
# 问题：支持以下操作
# 1. update(i, delta)：将 nums[i] 增加 delta
# 2. query(l, r)：查询区间 [l, r] 的和

# 朴素方法：
# update: O(1)
# query: O(N)

# 前缀和：
# update: O(N)（需要更新后续所有前缀和）
# query: O(1)
```

能否找到一种**平衡**的方法，使两种操作都达到 O(log N)？

---

## 核心思想：巧妙的分组

### lowbit 函数

树状数组的核心是 `lowbit` 函数：

$$\text{lowbit}(x) = x \land (-x)$$

它返回 `x` 的二进制表示中最低位的 1 对应的值。

**示例**：
```python
x = 12 = 1100₂
lowbit(12) = 4 = 0100₂

x = 10 = 1010₂
lowbit(10) = 2 = 0010₂

x = 8 = 1000₂
lowbit(8) = 8 = 1000₂
```

**代码实现**：
```python
def lowbit(x):
    return x & (-x)
```

**为什么这个公式有效？**

在补码表示中，`-x = ~x + 1`（按位取反加一）。

以 `x = 12 = 01100` 为例：
```
 x     = 01100
~x     = 10011
~x + 1 = 10100  （这就是 -x）

x & (-x) = 01100 & 10100 = 00100 = 4 ✓
```

取反后，最低位的 1 变成 0，它右边的 0 都变成 1。加一后，进位传播到原来最低位 1 的位置，恰好只有这一位与原数相同。

### 树状数组的结构

树状数组 `tree[]` 的定义：

$$tree[i] = \sum_{j=i-\text{lowbit}(i)+1}^{i} nums[j]$$

即 `tree[i]` 存储从 `i - lowbit(i) + 1` 到 `i` 这一段的和。

**直观理解**：

```
索引 i    二进制    lowbit(i)   tree[i] 管辖范围
  1      0001        1         [1, 1]    ← 管辖 1 个元素
  2      0010        2         [1, 2]    ← 管辖 2 个元素
  3      0011        1         [3, 3]    ← 管辖 1 个元素
  4      0100        4         [1, 4]    ← 管辖 4 个元素
  5      0101        1         [5, 5]    ← 管辖 1 个元素
  6      0110        2         [5, 6]    ← 管辖 2 个元素
  7      0111        1         [7, 7]    ← 管辖 1 个元素
  8      1000        8         [1, 8]    ← 管辖 8 个元素
```

**可视化结构**：

```
        tree[8] ─────────────────────────────┐
                                             │
        tree[4] ──────────┐                  │
                          │                  │
tree[2]──┐    tree[6]──┐  │                  │
         │             │  │                  │
tree[1] tree[2] tree[3] tree[4] tree[5] tree[6] tree[7] tree[8]
   │       │       │       │       │       │       │       │
nums[1] nums[2] nums[3] nums[4] nums[5] nums[6] nums[7] nums[8]
```

这是一种**隐式树结构**，父子关系通过 lowbit 运算确定。

---

## 核心操作

### 单点更新

当 `nums[i]` 增加 `delta` 时，需要更新所有「管辖」位置 `i` 的节点。

**规律**：从 `i` 开始，不断加上 `lowbit(i)`，直到超出范围。

```python
def update(self, i, delta):
    """将位置 i 的值增加 delta"""
    while i <= self.n:
        self.tree[i] += delta
        i += self.lowbit(i)
```

**示例**：更新位置 3

```
i = 3: tree[3] += delta
i = 3 + lowbit(3) = 3 + 1 = 4: tree[4] += delta
i = 4 + lowbit(4) = 4 + 4 = 8: tree[8] += delta
i = 8 + lowbit(8) = 8 + 8 = 16: 超出范围，停止
```

**时间复杂度**：O(log N)

### 前缀查询

查询 `nums[1]` 到 `nums[i]` 的和。

**规律**：从 `i` 开始，不断减去 `lowbit(i)`，累加遇到的所有 `tree` 值。

```python
def prefix_sum(self, i):
    """查询 nums[1..i] 的和"""
    result = 0
    while i > 0:
        result += self.tree[i]
        i -= self.lowbit(i)
    return result
```

**示例**：查询前缀和 [1, 7]

```
i = 7: result += tree[7]    # tree[7] = nums[7]
i = 7 - lowbit(7) = 7 - 1 = 6: result += tree[6]  # tree[6] = nums[5..6]
i = 6 - lowbit(6) = 6 - 2 = 4: result += tree[4]  # tree[4] = nums[1..4]
i = 4 - lowbit(4) = 4 - 4 = 0: 停止

结果 = tree[7] + tree[6] + tree[4] 
     = nums[7] + nums[5..6] + nums[1..4]
     = nums[1..7] ✓
```

**时间复杂度**：O(log N)

### 区间查询

利用前缀和的性质：

$$\sum_{i=l}^{r} nums[i] = \text{prefix\_sum}(r) - \text{prefix\_sum}(l-1)$$

```python
def range_sum(self, l, r):
    """查询 nums[l..r] 的和"""
    return self.prefix_sum(r) - self.prefix_sum(l - 1)
```

---

## 完整实现

```python
class BinaryIndexedTree:
    """树状数组：支持单点修改、区间查询"""
    
    def __init__(self, n):
        """初始化大小为 n 的树状数组（1-indexed）"""
        self.n = n
        self.tree = [0] * (n + 1)
    
    @staticmethod
    def lowbit(x):
        return x & (-x)
    
    def update(self, i, delta):
        """将位置 i 的值增加 delta"""
        while i <= self.n:
            self.tree[i] += delta
            i += self.lowbit(i)
    
    def prefix_sum(self, i):
        """查询 [1, i] 的前缀和"""
        result = 0
        while i > 0:
            result += self.tree[i]
            i -= self.lowbit(i)
        return result
    
    def range_sum(self, l, r):
        """查询 [l, r] 的区间和"""
        return self.prefix_sum(r) - self.prefix_sum(l - 1)


class BinaryIndexedTreeFromArray:
    """从数组构建树状数组"""
    
    def __init__(self, nums):
        """nums 是 0-indexed 的数组"""
        self.n = len(nums)
        self.tree = [0] * (self.n + 1)
        
        # 方法1：逐个插入 O(N log N)
        # for i, num in enumerate(nums):
        #     self.update(i + 1, num)
        
        # 方法2：O(N) 构建
        for i in range(1, self.n + 1):
            self.tree[i] += nums[i - 1]
            j = i + self.lowbit(i)
            if j <= self.n:
                self.tree[j] += self.tree[i]
    
    @staticmethod
    def lowbit(x):
        return x & (-x)
    
    def update(self, i, delta):
        """将 0-indexed 位置 i 的值增加 delta"""
        i += 1  # 转为 1-indexed
        while i <= self.n:
            self.tree[i] += delta
            i += self.lowbit(i)
    
    def prefix_sum(self, i):
        """查询 [0, i] 的前缀和（0-indexed）"""
        i += 1  # 转为 1-indexed
        result = 0
        while i > 0:
            result += self.tree[i]
            i -= self.lowbit(i)
        return result
    
    def range_sum(self, l, r):
        """查询 [l, r] 的区间和（0-indexed）"""
        if l == 0:
            return self.prefix_sum(r)
        return self.prefix_sum(r) - self.prefix_sum(l - 1)
```

---

## 执行流程可视化

用一个例子理解树状数组的工作过程：

```python
nums = [1, 2, 3, 4, 5, 6, 7, 8]  # 0-indexed

bit = BinaryIndexedTreeFromArray(nums)
```

**构建后的 tree 数组**：

```
tree[1] = 1                     = nums[0]
tree[2] = 1 + 2                 = nums[0..1]
tree[3] = 3                     = nums[2]
tree[4] = 1 + 2 + 3 + 4         = nums[0..3]
tree[5] = 5                     = nums[4]
tree[6] = 5 + 6                 = nums[4..5]
tree[7] = 7                     = nums[6]
tree[8] = 1+2+3+4+5+6+7+8       = nums[0..7]
```

**查询 range_sum(2, 5)**（即 nums[2..5] = 3+4+5+6 = 18）：

```python
# 等价于 prefix_sum(5) - prefix_sum(1)

# prefix_sum(5):
# i=6: result = tree[6] = 11 (5+6)
# i=4: result = 11 + tree[4] = 11 + 10 = 21 (1+2+3+4+5+6)
# i=0: 停止
# prefix_sum(5) = 21

# prefix_sum(1):
# i=2: result = tree[2] = 3 (1+2)
# i=0: 停止
# prefix_sum(1) = 3

# range_sum = 21 - 3 = 18 ✓
```

**更新 update(3, 10)**（将 nums[3] 增加 10）：

```python
# i = 4: tree[4] += 10
# i = 8: tree[8] += 10
# 完成
```

---

## 树状数组 vs 线段树

| 方面 | 树状数组 | 线段树 |
|-----|---------|-------|
| 代码量 | 极简（~20行）| 较多（~100行）|
| 常数因子 | 小 | 较大 |
| 功能 | 限于可差分运算 | 通用 |
| 区间修改 | 需要技巧 | 原生支持（懒标记）|
| 区间最值 | 不支持 | 支持 |
| 空间 | O(N) | O(N)（但常数更大）|

**何时选择树状数组**：
- 只需要区间求和（或其他可差分运算）
- 追求代码简洁和运行效率
- 竞赛中快速编码

**何时选择线段树**：
- 需要区间最值、区间 GCD 等不可差分操作
- 需要复杂的懒惰传播
- 需要线段树合并、可持久化等高级功能

---

## 常见变体

### 变体一：支持区间修改

使用差分数组技巧，将在下一章详细讲解。

### 变体二：二维树状数组

用于二维矩阵的单点修改和矩形区域查询，将在后续章节讲解。

### 变体三：维护最大值

```python
def update_max(self, i, val):
    """将位置 i 的值更新为 max(原值, val)"""
    while i <= self.n:
        self.tree[i] = max(self.tree[i], val)
        i += self.lowbit(i)

def query_max(self, i):
    """查询 [1, i] 的最大值"""
    result = 0
    while i > 0:
        result = max(result, self.tree[i])
        i -= self.lowbit(i)
    return result
```

**注意**：这种变体只支持**单调更新**（值只增不减），否则无法正确维护最大值。

---

## 常见错误与陷阱

### 错误一：索引从 0 开始

```python
# 错误：使用 0-indexed
def update(self, i, delta):
    while i <= self.n:  # 当 i=0 时，lowbit(0)=0，死循环！
        self.tree[i] += delta
        i += self.lowbit(i)
```

**解决**：树状数组必须使用 **1-indexed**，或在调用前将索引加一。

### 错误二：更新时忘记 +=

```python
# 错误
self.tree[i] = delta  # 应该是 += 而不是 =
```

### 错误三：查询时边界处理

```python
# 查询 [l, r] 时
def range_sum(self, l, r):
    if l == 1:  # 特殊情况：从 1 开始
        return self.prefix_sum(r)
    return self.prefix_sum(r) - self.prefix_sum(l - 1)
```

---

## 本章小结

本章核心要点：

1. **lowbit 函数**：`x & (-x)`，返回最低位的 1 对应的值

2. **结构定义**：`tree[i]` 管辖 `[i - lowbit(i) + 1, i]` 范围

3. **核心操作**：
   - 更新：`i += lowbit(i)` 向上传递
   - 查询：`i -= lowbit(i)` 向下收集

4. **复杂度**：更新和查询都是 O(log N)

5. **适用场景**：需要单点修改 + 区间求和（或其他可差分操作）

**设计启示**：

树状数组的精妙之处在于利用二进制的位运算特性，将 N 个元素巧妙地组织成 O(log N) 层的隐式树结构。这种设计展示了「寻找问题结构」的思维方式——通过观察二进制表示的规律，发现了一种优雅且高效的解决方案。

下一章我们将学习**单点修改区间查询**的标准模式及其 LeetCode 实战应用。
