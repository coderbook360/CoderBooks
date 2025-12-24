# 区间求和问题

## 问题场景

给定一个整数数组 `nums`，实现一个类支持以下两种操作：
- `sumRange(left, right)`：返回区间 `[left, right]` 的和
- `update(index, val)`：将 `nums[index]` 的值修改为 `val`

**操作频率**：两种操作都会被频繁调用，次数可达 10^4 次。

这是线段树的经典应用场景，对应 LeetCode 题目 **307. 区域和检索 - 数组可修改**。

## 方案对比：为什么需要线段树？

### 方案一：朴素遍历

每次查询都遍历区间，累加求和。

```python
class NumArray:
    def __init__(self, nums):
        self.nums = nums
    
    def update(self, index, val):
        self.nums[index] = val  # O(1)
    
    def sumRange(self, left, right):
        return sum(self.nums[left:right+1])  # O(N)
```

**时间复杂度**：
- `update`：O(1)
- `sumRange`：O(N)

**不足**：查询操作太慢，不满足高频查询需求。

### 方案二：前缀和

预计算前缀和数组，查询通过 `prefix[right+1] - prefix[left]` 实现。

```python
class NumArray:
    def __init__(self, nums):
        self.nums = nums
        self.n = len(nums)
        # 前缀和数组
        self.prefix = [0] * (self.n + 1)
        for i in range(self.n):
            self.prefix[i + 1] = self.prefix[i] + nums[i]
    
    def update(self, index, val):
        # 需要更新后续所有前缀和
        delta = val - self.nums[index]
        self.nums[index] = val
        for i in range(index + 1, self.n + 1):
            self.prefix[i] += delta  # O(N)
    
    def sumRange(self, left, right):
        return self.prefix[right + 1] - self.prefix[left]  # O(1)
```

**时间复杂度**：
- `update`：O(N)
- `sumRange`：O(1)

**不足**：更新操作太慢，每次修改需要更新后续所有前缀和。

### 方案三：线段树

通过线段树，将两种操作的复杂度都优化到 O(logN)。

**核心优势**：
- ✅ 更新只影响从叶子到根的路径节点（O(logN)）
- ✅ 查询将目标区间拆分成树中已有的子区间（O(logN)）
- ✅ 同时满足高频查询和高频修改的需求

| 方案 | 构建 | 查询 | 更新 | 适用场景 |
|------|------|------|------|---------|
| 朴素遍历 | O(1) | O(N) | O(1) | 修改频繁，查询少 |
| 前缀和 | O(N) | O(1) | O(N) | 静态数组，无修改 |
| **线段树** | **O(N)** | **O(logN)** | **O(logN)** | **频繁查询+修改** |

## 线段树实现

### 完整代码

```python
class NumArray:
    def __init__(self, nums):
        self.n = len(nums)
        self.tree = [0] * (4 * self.n)
        self.nums = nums  # 保存原数组（可选，用于调试）
        if self.n > 0:
            self._build(nums, 1, 0, self.n - 1)
    
    def _build(self, nums, node, start, end):
        """构建线段树"""
        if start == end:
            self.tree[node] = nums[start]
            return
        
        mid = (start + end) // 2
        left_child = 2 * node
        right_child = 2 * node + 1
        
        self._build(nums, left_child, start, mid)
        self._build(nums, right_child, mid + 1, end)
        self.tree[node] = self.tree[left_child] + self.tree[right_child]
    
    def update(self, index, val):
        """更新索引 index 的值为 val"""
        self._update(1, 0, self.n - 1, index, val)
    
    def _update(self, node, start, end, index, val):
        """递归更新"""
        if start == end:
            self.tree[node] = val
            return
        
        mid = (start + end) // 2
        left_child = 2 * node
        right_child = 2 * node + 1
        
        if index <= mid:
            self._update(left_child, start, mid, index, val)
        else:
            self._update(right_child, mid + 1, end, index, val)
        
        self.tree[node] = self.tree[left_child] + self.tree[right_child]
    
    def sumRange(self, left, right):
        """查询区间 [left, right] 的和"""
        return self._query(1, 0, self.n - 1, left, right)
    
    def _query(self, node, start, end, left, right):
        """递归查询"""
        # 区间不相交
        if right < start or left > end:
            return 0
        
        # 当前区间完全包含在查询区间内
        if left <= start and end <= right:
            return self.tree[node]
        
        # 部分重叠，递归查询左右子树
        mid = (start + end) // 2
        left_child = 2 * node
        right_child = 2 * node + 1
        
        left_sum = self._query(left_child, start, mid, left, right)
        right_sum = self._query(right_child, mid + 1, end, left, right)
        return left_sum + right_sum
```

### 使用示例

```python
# 初始化
nums = [1, 3, 5, 7, 9, 11]
obj = NumArray(nums)

# 查询操作
print(obj.sumRange(0, 2))  # 输出: 9  (1+3+5)
print(obj.sumRange(1, 5))  # 输出: 35 (3+5+7+9+11)

# 更新操作
obj.update(1, 10)  # 将 nums[1] 从 3 改为 10

# 再次查询
print(obj.sumRange(0, 2))  # 输出: 16 (1+10+5)
print(obj.sumRange(1, 5))  # 输出: 42 (10+5+7+9+11)
```

## 执行流程可视化

### 初始构建

对于数组 `[1, 3, 5, 7, 9, 11]`，构建的线段树如下：

```
                [0,5]: 36
               /           \
        [0,2]: 9           [3,5]: 27
       /       \           /        \
  [0,1]: 4   [2]: 5   [3,4]: 16  [5]: 11
  /     \              /      \
[0]: 1  [1]: 3    [3]: 7   [4]: 9
```

### 查询过程：sumRange(1, 4)

查询区间 `[1, 4]` 的和：

1. 访问根节点 `[0,5]`：部分重叠，递归左右子树
2. 访问 `[0,2]`：与 `[1,4]` 重叠，继续递归
   - 访问 `[0,1]`：部分重叠，继续递归
     - 访问 `[0]`：不相交，返回 0
     - 访问 `[1]`：完全包含，返回 3
   - 访问 `[2]`：完全包含，返回 5
3. 访问 `[3,5]`：部分重叠，继续递归
   - 访问 `[3,4]`：完全包含，返回 16
   - 访问 `[5]`：不相交，返回 0

**合并结果**：3 + 5 + 16 = 24

**访问节点数**：约 8 个（树高的常数倍）

### 更新过程：update(1, 10)

将索引 1 的值从 3 改为 10：

1. 从根节点 `[0,5]` 出发
2. 进入左子树 `[0,2]`（1 <= mid）
3. 进入左子树 `[0,1]`（1 <= mid）
4. 进入右子树 `[1]`（1 > mid）
5. 找到叶子节点，更新为 10

**回溯更新祖先节点**：
- `[0,1]`：1 + 10 = 11
- `[0,2]`：11 + 5 = 16
- `[0,5]`：16 + 27 = 43

**访问节点数**：树高（logN），这里是 4 个节点。

## 性能分析

### 时间复杂度

| 操作 | 复杂度 | 说明 |
|------|--------|------|
| `__init__` | O(N) | 构建线段树 |
| `update` | O(logN) | 沿树路径更新 |
| `sumRange` | O(logN) | 查询最多访问 O(logN) 个节点 |

**查询复杂度证明**：
- 线段树高度为 `log(N)`
- 每层最多访问 4 个节点（左右边界各 2 个）
- 总访问节点数：O(logN)

### 空间复杂度

O(N)：线段树数组大小为 `4 * N`，但空间复杂度仍是 O(N)。

### 常数优化

虽然时间复杂度是 O(logN)，但实际运行时常数较大。对于某些场景，树状数组（Fenwick Tree）可能更快。

## 线段树 vs 树状数组

| 特性 | 线段树 | 树状数组 |
|------|--------|---------|
| **实现难度** | 较复杂 | 相对简单 |
| **空间开销** | 4N | 2N |
| **常数因子** | 较大 | 较小 |
| **支持操作** | 区间查询+区间修改 | 区间查询+单点修改 |
| **通用性** | 任意可合并操作 | 前缀和相关 |

**选择建议**：
- 需要区间修改（懒惰传播）→ 线段树
- 只需单点修改+区间查询 → 树状数组（更简洁）
- 非求和操作（如最值、GCD）→ 线段树

## 常见陷阱

### 1. 忘记处理空数组

```python
def __init__(self, nums):
    self.n = len(nums)
    self.tree = [0] * (4 * self.n)
    if self.n > 0:  # 必须检查
        self._build(nums, 1, 0, self.n - 1)
```

### 2. 查询时的边界判断顺序

必须先判断不相交，再判断完全包含：

```python
# 正确顺序
if right < start or left > end:  # 先判断不相交
    return 0
if left <= start and end <= right:  # 再判断完全包含
    return self.tree[node]
```

### 3. 更新时忘记回溯合并

更新叶子节点后，必须自底向上更新所有祖先：

```python
# 递归返回前必须执行
self.tree[node] = self.tree[left_child] + self.tree[right_child]
```

### 4. 混淆区间开闭

统一使用闭区间 `[start, end]` 可以避免混淆。

## 优化技巧

### 1. 迭代版本（减少递归开销）

对于简单的区间求和，可以用迭代代替递归：

```python
def update_iterative(self, index, val):
    """迭代版更新（减少递归开销）"""
    index += self.n  # 转换为树中的叶子索引
    self.tree[index] = val
    
    # 自底向上更新祖先
    while index > 1:
        self.tree[index // 2] = self.tree[index] + self.tree[index ^ 1]
        index //= 2
```

但这种优化需要修改存储方式，通常不值得。

### 2. 缓存中间值

如果查询模式固定（如总是查询某些特定区间），可以缓存结果：

```python
from functools import lru_cache

@lru_cache(maxsize=1000)
def sumRange(self, left, right):
    return self._query(1, 0, self.n - 1, left, right)
```

但要注意：更新操作后需要清空缓存。

## 扩展应用

线段树的框架是通用的，修改合并逻辑即可支持其他操作：

### 区间最大值

```python
def _build(self, nums, node, start, end):
    if start == end:
        self.tree[node] = nums[start]
        return
    
    mid = (start + end) // 2
    self._build(nums, 2 * node, start, mid)
    self._build(nums, 2 * node + 1, mid + 1, end)
    # 修改：合并取最大值
    self.tree[node] = max(self.tree[2 * node], self.tree[2 * node + 1])

def _query(self, node, start, end, left, right):
    if right < start or left > end:
        return float('-inf')  # 修改：返回负无穷
    if left <= start and end <= right:
        return self.tree[node]
    
    mid = (start + end) // 2
    left_max = self._query(2 * node, start, mid, left, right)
    right_max = self._query(2 * node + 1, mid + 1, end, left, right)
    return max(left_max, right_max)  # 修改：合并取最大值
```

### 区间最小值

只需将 `max` 改为 `min`，单位元改为 `float('inf')`。

### 区间 XOR

```python
# 合并操作
self.tree[node] = self.tree[2 * node] ^ self.tree[2 * node + 1]

# 查询时的单位元
if right < start or left > end:
    return 0  # XOR 的单位元
```

## 总结

区间求和问题是线段树的经典应用，展示了线段树的核心价值：**在 O(logN) 时间内同时支持区间查询和单点修改**。

**核心要点**：
1. **问题特征**：高频查询+高频修改，朴素方案和前缀和都不适用
2. **线段树优势**：两种操作都是 O(logN)，满足性能需求
3. **实现要点**：构建、查询、更新三大操作，注意边界判断
4. **通用框架**：修改合并逻辑，支持多种区间统计
5. **适用场景**：需要区间修改时首选，简单场景可考虑树状数组

线段树的实现虽然相对复杂，但一旦掌握其核心思想，就能灵活应对各种区间操作问题。下一章我们将学习线段树在区间最值问题中的应用，进一步理解线段树的通用性。
