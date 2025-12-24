# 区间和的个数

本章我们来挑战树状数组在区间问题上的一个高难度应用——**区间和的个数**。这道题结合了前缀和、离散化与树状数组，是综合运用多种技术的典型案例。

## 问题描述

**LeetCode 327. 区间和的个数 (Count of Range Sum)**

给你一个整数数组 `nums` 以及两个整数 `lower` 和 `upper`。求数组中，值位于范围 `[lower, upper]`（包含 `lower` 和 `upper`）之内的**区间和**的个数。

区间和 `S(i, j)` 表示在 `nums` 中，位置从 `i` 到 `j` 的元素之和，包含 `i` 和 `j` (`i ≤ j`)。

**示例 1**：
```
输入: nums = [-2, 5, -1], lower = -2, upper = 2
输出: 3
解释: 存在三个区间：[0, 0]、[2, 2] 和 [0, 2]，对应的区间和分别是：-2、-1、2
```

**示例 2**：
```
输入: nums = [0], lower = 0, upper = 0
输出: 1
```

**提示**：
- 1 <= nums.length <= 10^5
- -2^31 <= nums[i] <= 2^31 - 1
- -10^5 <= lower <= upper <= 10^5

## 问题分析

### 前缀和转换

首先，让我们用前缀和来转换问题。

设前缀和数组 `prefix`，其中 `prefix[0] = 0`，`prefix[i] = nums[0] + nums[1] + ... + nums[i-1]`。

区间和 `S(i, j) = prefix[j+1] - prefix[i]`。

我们需要找满足 `lower <= prefix[j+1] - prefix[i] <= upper` 的数对 `(i, j)` 的个数，其中 `0 <= i <= j < n`。

**关键转换**：对于固定的 `j`，我们需要找有多少个 `i`（其中 `i <= j`）满足：
```
lower <= prefix[j+1] - prefix[i] <= upper
```

变形得：
```
prefix[j+1] - upper <= prefix[i] <= prefix[j+1] - lower
```

这就转化为：在 `prefix[0..j]` 中，有多少个值落在 `[prefix[j+1] - upper, prefix[j+1] - lower]` 范围内？

### 这是一个"范围计数"问题

对于每个位置 `j`，我们需要：
1. 查询：在已有的前缀和中，有多少个值落在某个范围内
2. 更新：将当前前缀和加入数据结构

这正是树状数组的用武之地！

## 解法：树状数组 + 离散化

### 整体框架

```python
for j in range(n):
    # 查询：有多少个 prefix[i] 满足条件
    count += query(prefix[j+1] - upper, prefix[j+1] - lower)
    
    # 更新：将 prefix[j+1] 加入树状数组
    update(prefix[j+1])
```

等等，这里有个问题：当 `j = 0` 时，我们查询的是 `prefix[0..−1]` 范围内满足条件的值，但这个范围是空的。实际上，`prefix[0] = 0` 应该被预先加入。

让我们重新梳理：

```python
# 预先加入 prefix[0] = 0
update(prefix[0])  # prefix[0] = 0

for j in range(n):
    # 此时 prefix[0..j] 已在树状数组中
    # 查询：有多少个 prefix[i] (i in 0..j) 满足条件
    count += query(prefix[j+1] - upper, prefix[j+1] - lower)
    
    # 更新：将 prefix[j+1] 加入
    update(prefix[j+1])
```

### 离散化设计

前缀和的值可能很大（可达 10^5 × 2^31），无法直接作为数组索引。我们需要离散化。

**需要离散化的值**：
1. 所有前缀和 `prefix[0], prefix[1], ..., prefix[n]`
2. 所有查询边界 `prefix[i] - upper` 和 `prefix[i] - lower`

```python
all_values = set()
prefix = [0]
for x in nums:
    prefix.append(prefix[-1] + x)

for p in prefix:
    all_values.add(p)
    all_values.add(p - lower)
    all_values.add(p - upper)
```

### 完整实现

```python
class BinaryIndexedTree:
    def __init__(self, n: int):
        self.n = n
        self.tree = [0] * (n + 1)
    
    def update(self, i: int, delta: int = 1) -> None:
        while i <= self.n:
            self.tree[i] += delta
            i += i & (-i)
    
    def query(self, i: int) -> int:
        """查询 [1, i] 的和"""
        if i <= 0:
            return 0
        s = 0
        while i > 0:
            s += self.tree[i]
            i -= i & (-i)
        return s
    
    def range_query(self, left: int, right: int) -> int:
        """查询 [left, right] 的和"""
        if left > right:
            return 0
        return self.query(right) - self.query(left - 1)


class Solution:
    def countRangeSum(self, nums: list[int], lower: int, upper: int) -> int:
        n = len(nums)
        
        # 计算前缀和
        prefix = [0] * (n + 1)
        for i in range(n):
            prefix[i + 1] = prefix[i] + nums[i]
        
        # 收集所有需要离散化的值
        all_values = set()
        for p in prefix:
            all_values.add(p)
            all_values.add(p - lower)
            all_values.add(p - upper)
        
        # 离散化
        sorted_values = sorted(all_values)
        rank = {v: i + 1 for i, v in enumerate(sorted_values)}
        
        # 树状数组
        bit = BinaryIndexedTree(len(sorted_values))
        
        # 预先加入 prefix[0]
        bit.update(rank[prefix[0]])
        
        count = 0
        for j in range(n):
            # 查询边界
            left_bound = prefix[j + 1] - upper
            right_bound = prefix[j + 1] - lower
            
            # 查询有多少个 prefix[i] 在 [left_bound, right_bound] 范围内
            left_rank = rank[left_bound]
            right_rank = rank[right_bound]
            count += bit.range_query(left_rank, right_rank)
            
            # 加入 prefix[j+1]
            bit.update(rank[prefix[j + 1]])
        
        return count
```

## 执行过程演示

以 `nums = [-2, 5, -1], lower = -2, upper = 2` 为例。

**Step 1：计算前缀和**
```
prefix = [0, -2, 3, 2]
```

**Step 2：收集离散化值**
```
对于 prefix[0] = 0:  需要 0, 0-(-2)=2, 0-2=-2
对于 prefix[1] = -2: 需要 -2, -2-(-2)=0, -2-2=-4
对于 prefix[2] = 3:  需要 3, 3-(-2)=5, 3-2=1
对于 prefix[3] = 2:  需要 2, 2-(-2)=4, 2-2=0

all_values = {-4, -2, 0, 1, 2, 3, 4, 5}
sorted = [-4, -2, 0, 1, 2, 3, 4, 5]
rank = {-4:1, -2:2, 0:3, 1:4, 2:5, 3:6, 4:7, 5:8}
```

**Step 3：遍历查询**

| j | prefix[j+1] | left_bound | right_bound | 查询范围(rank) | 结果 | 更新 |
|---|-------------|-----------|-------------|---------------|------|------|
| 初始 | - | - | - | - | - | 加入 0 (rank=3) |
| 0 | -2 | -2-2=-4 | -2-(-2)=0 | [1, 3] | 1 | 加入 -2 (rank=2) |
| 1 | 3 | 3-2=1 | 3-(-2)=5 | [4, 8] | 0 | 加入 3 (rank=6) |
| 2 | 2 | 2-2=0 | 2-(-2)=4 | [3, 7] | 2 | 加入 2 (rank=5) |

**详细分析**：

**j=0**：查询满足 `-4 <= prefix[i] <= 0` 的 `i`
- 当前树状数组有：`prefix[0] = 0`
- `0` 在范围 `[-4, 0]` 内，计数 1
- 对应区间 `[0, 0]`，和为 `nums[0] = -2`

**j=1**：查询满足 `1 <= prefix[i] <= 5` 的 `i`
- 当前树状数组有：`prefix[0] = 0`, `prefix[1] = -2`
- 都不在范围 `[1, 5]` 内，计数 0

**j=2**：查询满足 `0 <= prefix[i] <= 4` 的 `i`
- 当前树状数组有：`prefix[0] = 0`, `prefix[1] = -2`, `prefix[2] = 3`
- `prefix[0] = 0` 在范围内：对应区间 `[0, 2]`，和为 2
- `prefix[2] = 3` 在范围内：对应区间 `[2, 2]`，和为 -1
- 计数 2

总计：1 + 0 + 2 = **3**

## 归并排序解法

除了树状数组，这道题也可以用归并排序解决。思路与"翻转对"类似：

```python
class Solution:
    def countRangeSum(self, nums: list[int], lower: int, upper: int) -> int:
        # 计算前缀和
        prefix = [0]
        for x in nums:
            prefix.append(prefix[-1] + x)
        
        self.lower = lower
        self.upper = upper
        self.count = 0
        
        self._mergeSort(prefix, 0, len(prefix) - 1)
        return self.count
    
    def _mergeSort(self, arr: list[int], left: int, right: int) -> None:
        if left >= right:
            return
        
        mid = (left + right) // 2
        self._mergeSort(arr, left, mid)
        self._mergeSort(arr, mid + 1, right)
        
        # 计数：对于右半部分的每个 j，统计左半部分满足条件的 i
        self._countPairs(arr, left, mid, right)
        self._merge(arr, left, mid, right)
    
    def _countPairs(self, arr: list[int], left: int, mid: int, right: int) -> None:
        # 双指针：找满足 lower <= arr[j] - arr[i] <= upper 的数对
        # 即 arr[j] - upper <= arr[i] <= arr[j] - lower
        l = r = left
        for j in range(mid + 1, right + 1):
            # 找第一个 >= arr[j] - upper 的位置
            while l <= mid and arr[l] < arr[j] - self.upper:
                l += 1
            # 找第一个 > arr[j] - lower 的位置
            while r <= mid and arr[r] <= arr[j] - self.lower:
                r += 1
            self.count += r - l
    
    def _merge(self, arr: list[int], left: int, mid: int, right: int) -> None:
        temp = []
        i, j = left, mid + 1
        
        while i <= mid and j <= right:
            if arr[i] <= arr[j]:
                temp.append(arr[i])
                i += 1
            else:
                temp.append(arr[j])
                j += 1
        
        temp.extend(arr[i:mid + 1])
        temp.extend(arr[j:right + 1])
        
        for i, val in enumerate(temp):
            arr[left + i] = val
```

## 复杂度分析

**树状数组解法**：
- 时间复杂度：O(n log n)，离散化排序 O(n log n)，每个前缀和的查询和更新 O(log n)
- 空间复杂度：O(n)，存储前缀和、离散化映射、树状数组

**归并排序解法**：
- 时间复杂度：O(n log n)
- 空间复杂度：O(n)

## 常见错误

### 错误一：忘记预先加入 prefix[0]

```python
# 错误：prefix[0] 未加入，导致 j=0 时无法统计
for j in range(n):
    count += bit.range_query(...)
    bit.update(rank[prefix[j + 1]])
```

**正确做法**：在循环开始前，先加入 `prefix[0]`。

### 错误二：离散化时遗漏查询边界

```python
# 错误：只离散化前缀和
for p in prefix:
    all_values.add(p)
# 遗漏了 p - lower 和 p - upper
```

**正确做法**：同时加入 `p`, `p - lower`, `p - upper`。

### 错误三：范围查询边界错误

```python
# 错误：left_rank 和 right_rank 没有正确使用
count += bit.query(right_rank) - bit.query(left_rank)  # 漏了 left_rank 位置
```

**正确做法**：使用 `range_query(left_rank, right_rank)` 或 `query(right) - query(left - 1)`。

### 错误四：整数溢出

前缀和可能超出 32 位整数范围。在非 Python 语言中需要使用 `long`。

## 扩展：多维区间统计

这道题可以推广到更复杂的场景：

**二维区间统计**：给定一个矩阵，统计有多少个子矩阵的和落在 `[lower, upper]` 范围内。

思路：
1. 将矩阵的每一列看作一维数组
2. 枚举行的上下边界
3. 对压缩后的一维数组使用本题算法

## 本章小结

区间和的个数是一道综合性极强的题目，完美展示了多种技术的协同工作。

**核心要点**：

1. **前缀和转换**：将区间和问题转化为前缀和的差值问题
2. **范围查询转换**：固定右端点，查询左端点满足条件的数量
3. **离散化技巧**：不仅要离散化数据本身，还要离散化所有可能的查询边界
4. **预处理细节**：`prefix[0] = 0` 必须预先加入数据结构

通过这道题，我们学会了如何将"区间和范围统计"问题转化为"点的范围计数"问题，这是树状数组的一个重要应用模式。下一章我们将探索树状数组在动态规划优化中的应用——最长递增子序列的个数。
