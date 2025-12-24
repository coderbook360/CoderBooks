# 最长递增子序列的个数

前几章我们用树状数组解决了各种"计数"问题——逆序对、翻转对、区间和的个数。本章我们来探索一个新的应用领域：**动态规划优化**。通过经典的"最长递增子序列的个数"问题，我们将看到树状数组如何将 O(n²) 的 DP 优化到 O(n log n)。

## 问题描述

**LeetCode 673. 最长递增子序列的个数 (Number of Longest Increasing Subsequence)**

给定一个未排序的整数数组 `nums`，返回最长递增子序列的个数。

注意：子序列是从原数组中删除一些元素（可以为0个）后得到的新数组，剩余元素的相对顺序不变。

**示例 1**：
```
输入: [1, 3, 5, 4, 7]
输出: 2
解释: 有两个最长递增子序列，分别是 [1, 3, 5, 7] 和 [1, 3, 4, 7]
```

**示例 2**：
```
输入: [2, 2, 2, 2, 2]
输出: 5
解释: 最长递增子序列的长度是 1，共有 5 个长度为 1 的子序列
```

**提示**：
- 1 <= nums.length <= 2000
- -10^6 <= nums[i] <= 10^6

## 基础 DP 解法

### 状态定义

首先回顾标准的 O(n²) DP 解法。

定义两个数组：
- `dp[i]`：以 `nums[i]` 结尾的最长递增子序列长度
- `cnt[i]`：以 `nums[i]` 结尾的最长递增子序列个数

### 状态转移

对于每个位置 `i`，枚举所有 `j < i` 且 `nums[j] < nums[i]` 的位置：

```python
for j in range(i):
    if nums[j] < nums[i]:
        if dp[j] + 1 > dp[i]:
            # 发现更长的子序列
            dp[i] = dp[j] + 1
            cnt[i] = cnt[j]
        elif dp[j] + 1 == dp[i]:
            # 发现同样长度的子序列，累加计数
            cnt[i] += cnt[j]
```

### 基础实现

```python
class Solution:
    def findNumberOfLIS(self, nums: list[int]) -> int:
        n = len(nums)
        dp = [1] * n   # 最长长度
        cnt = [1] * n  # 最长个数
        
        for i in range(n):
            for j in range(i):
                if nums[j] < nums[i]:
                    if dp[j] + 1 > dp[i]:
                        dp[i] = dp[j] + 1
                        cnt[i] = cnt[j]
                    elif dp[j] + 1 == dp[i]:
                        cnt[i] += cnt[j]
        
        max_len = max(dp)
        return sum(cnt[i] for i in range(n) if dp[i] == max_len)
```

时间复杂度 O(n²)，对于 n = 2000 足够，但我们追求更优的解法。

## 优化思路：树状数组

### 问题转换

让我们重新审视状态转移。对于位置 `i`，我们需要：

1. 找所有满足 `j < i` 且 `nums[j] < nums[i]` 的位置
2. 在这些位置中，找最大的 `dp[j]`
3. 统计 `dp[j]` 等于这个最大值的所有 `cnt[j]` 之和

如果我们按照 `nums[j]` 的值建立索引，问题就变成了：
- 查询值在 `(-∞, nums[i])` 范围内的所有元素中，`(dp[j], cnt[j])` 的"最优值"

### 什么是"最优值"？

我们需要同时维护**最大长度**和**对应计数**。定义一个合并操作：

```python
def merge(len1, cnt1, len2, cnt2):
    """合并两个 (长度, 计数) 对"""
    if len1 > len2:
        return (len1, cnt1)
    elif len1 < len2:
        return (len2, cnt2)
    else:  # len1 == len2
        return (len1, cnt1 + cnt2)
```

这个操作满足结合律，可以用树状数组维护！

### 树状数组存储什么？

树状数组的每个节点存储一个 `(max_len, cnt)` 对：
- `max_len`：该节点覆盖范围内的最大长度
- `cnt`：达到这个最大长度的子序列个数

### 离散化

由于 `nums[i]` 的范围可达 `[-10^6, 10^6]`，我们需要离散化。

**但要注意**：查询时我们需要"严格小于"，所以查询 `nums[i] - 1` 对应的 rank。

为了简化，我们可以在离散化时对每个值减 1 后也加入集合：

```python
all_values = set(nums)
for x in nums:
    all_values.add(x - 1)  # 用于查询 "< x"
```

或者更简单地，查询时使用 `rank[x] - 1`。

## 树状数组实现

### 修改后的树状数组

```python
class BIT:
    def __init__(self, n: int):
        self.n = n
        # 每个节点存储 (max_len, cnt)
        self.tree = [(0, 0)] * (n + 1)
    
    def _merge(self, a: tuple[int, int], b: tuple[int, int]) -> tuple[int, int]:
        """合并两个 (长度, 计数) 对"""
        if a[0] > b[0]:
            return a
        elif a[0] < b[0]:
            return b
        else:
            return (a[0], a[1] + b[1])
    
    def update(self, i: int, val: tuple[int, int]) -> None:
        """在位置 i 更新 (len, cnt)"""
        while i <= self.n:
            self.tree[i] = self._merge(self.tree[i], val)
            i += i & (-i)
    
    def query(self, i: int) -> tuple[int, int]:
        """查询 [1, i] 的最优 (len, cnt)"""
        result = (0, 0)
        while i > 0:
            result = self._merge(result, self.tree[i])
            i -= i & (-i)
        return result
```

### 完整解法

```python
class BIT:
    def __init__(self, n: int):
        self.n = n
        self.tree = [(0, 0)] * (n + 1)
    
    def _merge(self, a: tuple[int, int], b: tuple[int, int]) -> tuple[int, int]:
        if a[0] > b[0]:
            return a
        elif a[0] < b[0]:
            return b
        else:
            return (a[0], a[1] + b[1])
    
    def update(self, i: int, val: tuple[int, int]) -> None:
        while i <= self.n:
            self.tree[i] = self._merge(self.tree[i], val)
            i += i & (-i)
    
    def query(self, i: int) -> tuple[int, int]:
        if i <= 0:
            return (0, 0)
        result = (0, 0)
        while i > 0:
            result = self._merge(result, self.tree[i])
            i -= i & (-i)
        return result


class Solution:
    def findNumberOfLIS(self, nums: list[int]) -> int:
        # 离散化
        sorted_unique = sorted(set(nums))
        rank = {v: i + 1 for i, v in enumerate(sorted_unique)}
        
        n = len(sorted_unique)
        bit = BIT(n)
        
        global_max_len = 0
        global_cnt = 0
        
        for x in nums:
            r = rank[x]
            
            # 查询值 < x 的所有元素中的最优 (len, cnt)
            prev_len, prev_cnt = bit.query(r - 1)
            
            # 计算以 x 结尾的最长子序列
            if prev_len == 0:
                # 没有比 x 小的元素，x 自己成为一个长度为 1 的子序列
                cur_len, cur_cnt = 1, 1
            else:
                cur_len, cur_cnt = prev_len + 1, prev_cnt
            
            # 更新树状数组
            bit.update(r, (cur_len, cur_cnt))
            
            # 更新全局结果
            if cur_len > global_max_len:
                global_max_len = cur_len
                global_cnt = cur_cnt
            elif cur_len == global_max_len:
                global_cnt += cur_cnt
        
        return global_cnt
```

## 执行过程演示

以 `nums = [1, 3, 5, 4, 7]` 为例。

**离散化**：
```
sorted_unique = [1, 3, 4, 5, 7]
rank = {1:1, 3:2, 4:3, 5:4, 7:5}
```

**遍历过程**：

| i | x | r | query(r-1) | cur | update | global |
|---|---|---|------------|-----|--------|--------|
| 0 | 1 | 1 | (0,0) | (1,1) | (1, (1,1)) | (1, 1) |
| 1 | 3 | 2 | (1,1) | (2,1) | (2, (2,1)) | (2, 1) |
| 2 | 5 | 4 | (2,1) | (3,1) | (4, (3,1)) | (3, 1) |
| 3 | 4 | 3 | (2,1) | (3,1) | (3, (3,1)) | (3, 2) |
| 4 | 7 | 5 | (3,2) | (4,2) | (5, (4,2)) | (4, 2) |

**详细分析**：

**i=0, x=1**：
- r=1，query(0) = (0,0)
- 没有小于 1 的元素，cur = (1, 1)
- 更新 BIT[1] = (1, 1)

**i=1, x=3**：
- r=2，query(1) = (1, 1)（找到 1 对应的信息）
- cur = (1+1, 1) = (2, 1)
- 更新 BIT[2] = (2, 1)

**i=2, x=5**：
- r=4，query(3) 查询 rank <= 3 的最优值
- BIT[1]=(1,1), BIT[2]=(2,1)，合并得 (2, 1)
- cur = (3, 1)
- 更新 BIT[4] = (3, 1)

**i=3, x=4**：
- r=3，query(2) = (2, 1)
- cur = (3, 1)
- global 从 (3,1) 变为 (3, 1+1) = (3, 2)

**i=4, x=7**：
- r=5，query(4) 合并所有 <= 4 的信息
- 得到 (3, 2)（来自 5 和 4 两条路径）
- cur = (4, 2)
- global = (4, 2)

最终答案：**2**

## 细节与陷阱

### 陷阱一：查询"严格小于"

我们需要查询满足 `nums[j] < nums[i]` 的元素，是**严格小于**，不是小于等于。

```python
# 正确：查询 rank - 1
prev_len, prev_cnt = bit.query(r - 1)

# 错误：查询 rank
prev_len, prev_cnt = bit.query(r)  # 这会包含等于 x 的元素
```

### 陷阱二：初始情况处理

当 `query` 返回 `(0, 0)` 时，表示没有满足条件的前驱元素。此时 `cur = (1, 1)`，不是 `(0+1, 0) = (1, 0)`。

```python
if prev_len == 0:
    cur_len, cur_cnt = 1, 1  # 单独成为长度 1 的子序列
else:
    cur_len, cur_cnt = prev_len + 1, prev_cnt
```

### 陷阱三：相同值的处理

如果数组中有重复元素，它们会映射到相同的 rank。

例如 `nums = [1, 3, 3, 5]`：
- 第一个 3（i=1）更新后，BIT[2] = (2, 1)
- 第二个 3（i=2）查询 query(1) = (1, 1)，cur = (2, 1)
- 更新 BIT[2] = merge((2,1), (2,1)) = (2, 2)

这是正确的行为！两个 3 都可以接在 1 后面形成长度为 2 的子序列。

## 复杂度分析

**时间复杂度**：O(n log n)
- 离散化：O(n log n)
- 每个元素的查询和更新：O(log n)
- 总计：O(n log n)

**空间复杂度**：O(n)
- 离散化映射：O(n)
- 树状数组：O(n)

相比 O(n²) 的朴素 DP，这是显著的优化。

## 与线段树的对比

这道题也可以用线段树解决，而且线段树的实现可能更直观：

```python
# 线段树节点存储 (max_len, cnt)
# 查询 [1, r-1] 的最优值
# 点更新 r 位置
```

两种方法的比较：

| 维度 | 树状数组 | 线段树 |
|------|---------|--------|
| 代码量 | 较少 | 较多 |
| 常数因子 | 较小 | 较大 |
| 灵活性 | 受限（前缀查询） | 更灵活（任意区间） |
| 理解难度 | 需理解 merge 语义 | 较直观 |

对于这道题，树状数组足够，且效率更高。

## 本章小结

本章展示了树状数组在**动态规划优化**中的应用。通过维护 `(max_len, cnt)` 的最优值，我们将 O(n²) 的 LIS 计数问题优化到了 O(n log n)。

**核心要点**：

1. **树状数组可以维护非数值信息**：只要定义了满足结合律的合并操作，就可以用树状数组维护
2. **"最优值"的合并语义**：当两个信息合并时，选择长度大的；长度相同时累加计数
3. **严格小于的处理**：查询 `rank - 1` 而非 `rank`
4. **初始情况**：当没有前驱时，自己成为长度 1 的子序列

这种"自定义合并操作"的技巧，可以推广到很多其他 DP 优化问题。下一章，我们将用树状数组解决另一个经典问题——统计作战单位数。
