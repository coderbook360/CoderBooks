# 翻转对

在前一章，我们解决了"计算右侧小于当前元素的个数"问题。本章我们来挑战一个更具难度的变体——**翻转对**问题。这个问题的独特之处在于：比较条件不再是简单的 `a > b`，而是 `a > 2 * b`，这个看似微小的变化会带来本质的不同。

## 问题描述

**LeetCode 493. 翻转对 (Reverse Pairs)**

给定一个数组 `nums`，如果 `i < j` 且 `nums[i] > 2 * nums[j]`，我们就将 `(i, j)` 称为一个**重要翻转对**。

返回给定数组中重要翻转对的数量。

**示例 1**：
```
输入: [1, 3, 2, 3, 1]
输出: 2
解释: 
翻转对为 (1, 4) 和 (3, 4)，
即 nums[1]=3 > 2*nums[4]=2，
   nums[3]=3 > 2*nums[4]=2
```

**示例 2**：
```
输入: [2, 4, 3, 5, 1]
输出: 3
解释:
翻转对为 (1, 4)、(2, 4) 和 (3, 4)
```

**提示**：
- 1 <= nums.length <= 5 × 10^4
- -2^31 <= nums[i] <= 2^31 - 1

## 与"逆序对"的本质区别

### 标准逆序对

在标准逆序对问题中，我们寻找满足 `i < j` 且 `nums[i] > nums[j]` 的数对。

这个条件的妙处在于：**比较关系与排序关系一致**。

当我们用归并排序处理时，一旦合并两个有序子数组，左右数组的相对顺序自然揭示了所有逆序对。

### 翻转对的挑战

但在翻转对问题中，条件变成了 `nums[i] > 2 * nums[j]`。

思考一下：假设左数组有 `[3, 5, 7]`，右数组有 `[2, 3, 4]`。

对于归并排序的合并过程：
- 比较 3 和 2，3 > 2，所以 2 先进入结果
- 比较 3 和 3，3 = 3，所以 3（左）先进入结果
- ...

但对于翻转对条件 `a > 2b`：
- 3 > 2×2=4？不满足
- 5 > 2×2=4？满足
- 7 > 2×2=4？满足

**关键问题**：归并过程中的比较顺序与翻转对的判定顺序不一致！

这意味着我们无法在标准归并的合并步骤中"顺便"统计翻转对。

## 解法一：修改归并排序

### 核心思想：分离计数与合并

既然计数和合并无法同时进行，我们就把它们**分开**：

1. **先计数**：在合并前，用双指针统计跨越左右两半的翻转对
2. **后合并**：标准归并排序的合并过程

```python
class Solution:
    def reversePairs(self, nums: list[int]) -> int:
        self.count = 0
        self._mergeSort(nums, 0, len(nums) - 1)
        return self.count
    
    def _mergeSort(self, nums: list[int], left: int, right: int) -> None:
        if left >= right:
            return
        
        mid = (left + right) // 2
        self._mergeSort(nums, left, mid)
        self._mergeSort(nums, mid + 1, right)
        
        # 关键：先计数，再合并
        self._countPairs(nums, left, mid, right)
        self._merge(nums, left, mid, right)
    
    def _countPairs(self, nums: list[int], left: int, mid: int, right: int) -> None:
        """统计跨越左右两半的翻转对"""
        # 左半部分 [left, mid] 已排序
        # 右半部分 [mid+1, right] 已排序
        j = mid + 1
        for i in range(left, mid + 1):
            # 找到第一个使得 nums[i] <= 2 * nums[j] 的位置
            while j <= right and nums[i] > 2 * nums[j]:
                j += 1
            # [mid+1, j-1] 中的所有元素都能与 nums[i] 形成翻转对
            self.count += j - (mid + 1)
    
    def _merge(self, nums: list[int], left: int, mid: int, right: int) -> None:
        """标准归并排序的合并过程"""
        temp = []
        i, j = left, mid + 1
        
        while i <= mid and j <= right:
            if nums[i] <= nums[j]:
                temp.append(nums[i])
                i += 1
            else:
                temp.append(nums[j])
                j += 1
        
        temp.extend(nums[i:mid + 1])
        temp.extend(nums[j:right + 1])
        
        for i, val in enumerate(temp):
            nums[left + i] = val
```

### 为什么 `_countPairs` 能用双指针？

这里有一个巧妙的观察：

由于左右两半都已排序（升序），对于左半部分的元素 `nums[i]`：
- 如果 `nums[i] > 2 * nums[j]`，那么对于所有 `j' < j`，也有 `nums[i] > 2 * nums[j']`
- 当 `i` 增大时，`nums[i]` 变大，满足条件的 `j` 只会增多或保持不变

这就是**双指针单调性**的保证，使得时间复杂度为 O(n) 而非 O(n²)。

## 解法二：树状数组 + 离散化

归并排序是经典解法，但我们的主题是树状数组。让我们看看如何用 BIT 解决这个问题。

### 思路分析

与"计算右侧小于当前元素的个数"类似，我们从右往左遍历，维护"右侧元素"的信息。

对于每个位置 `i`，我们需要知道：在已处理的元素中（即 `j > i` 的位置），有多少个 `nums[j]` 满足 `nums[i] > 2 * nums[j]`，即 `nums[j] < nums[i] / 2`。

**关键转换**：查询有多少个已处理元素小于 `nums[i] / 2`。

### 离散化的陷阱

这里有一个微妙的问题：`nums[i] / 2` 可能不是整数！

例如，`nums[i] = 5`，则 `nums[i] / 2 = 2.5`。我们需要找的是满足 `nums[j] < 2.5` 的元素个数，也就是 `nums[j] <= 2` 的元素个数。

**解决方案**：将 `2 * nums[j]` 也加入离散化集合。

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
        s = 0
        while i > 0:
            s += self.tree[i]
            i -= i & (-i)
        return s


class Solution:
    def reversePairs(self, nums: list[int]) -> int:
        n = len(nums)
        
        # 离散化：收集所有 nums[i] 和 2*nums[j]
        all_values = set()
        for x in nums:
            all_values.add(x)
            all_values.add(2 * x)  # 关键：加入 2*x
        
        sorted_values = sorted(all_values)
        rank = {v: i + 1 for i, v in enumerate(sorted_values)}
        
        # 树状数组维护"右侧元素的 2*值"
        bit = BinaryIndexedTree(len(sorted_values))
        count = 0
        
        # 从右往左遍历
        for i in range(n - 1, -1, -1):
            # 查询：有多少个 2*nums[j] < nums[i]
            # 即 rank[2*nums[j]] < rank[nums[i]] 的个数
            target_rank = rank[nums[i]] - 1
            if target_rank >= 1:
                count += bit.query(target_rank)
            
            # 更新：加入 2*nums[i]
            bit.update(rank[2 * nums[i]])
        
        return count
```

### 执行过程演示

以 `nums = [1, 3, 2, 3, 1]` 为例：

**离散化**：
- 原始值：`{1, 3, 2, 3, 1}` → `{1, 2, 3}`
- 2倍值：`{2, 6, 4, 6, 2}` → `{2, 4, 6}`
- 合并排序：`[1, 2, 3, 4, 6]`
- rank：`{1:1, 2:2, 3:3, 4:4, 6:5}`

**从右往左遍历**：

| i | nums[i] | 查询 rank | 查询结果 | 更新 2×nums[i] | BIT 状态 |
|---|---------|----------|---------|----------------|----------|
| 4 | 1 | rank[1]-1=0 | 0 | 2 (rank=2) | [0,1,0,0,0] |
| 3 | 3 | rank[3]-1=2 | 1 | 6 (rank=5) | [0,1,0,0,1] |
| 2 | 2 | rank[2]-1=1 | 0 | 4 (rank=4) | [0,1,0,1,1] |
| 1 | 3 | rank[3]-1=2 | 1 | 6 (rank=5) | [0,1,0,1,2] |
| 0 | 1 | rank[1]-1=0 | 0 | 2 (rank=2) | [0,2,0,1,2] |

总计：0 + 1 + 0 + 1 + 0 = **2**

## 整数溢出问题

**警告**：这道题有一个经典陷阱——整数溢出。

`nums[i]` 的范围是 `[-2^31, 2^31 - 1]`，而 `2 * nums[i]` 可能溢出 32 位整数范围！

在 Python 中，整数可以任意大，所以没有这个问题。但如果你使用 Java、C++ 等语言，必须使用 `long` 类型：

```java
// Java 中必须用 long
long doubleValue = 2L * nums[j];
if (nums[i] > doubleValue) {
    count++;
}
```

## 复杂度分析

**归并排序解法**：
- 时间复杂度：O(n log n)
- 空间复杂度：O(n)

**树状数组解法**：
- 时间复杂度：O(n log n)，每个元素进行一次 O(log n) 的查询和更新
- 空间复杂度：O(n)，离散化映射和树状数组

## 解法对比

| 维度 | 归并排序 | 树状数组 |
|------|---------|---------|
| 实现难度 | 中等 | 中等 |
| 代码量 | 较多 | 适中 |
| 常数因子 | 较小 | 较小 |
| 扩展性 | 仅限离线 | 可支持在线 |

对于这道题，两种方法效率相当。选择哪个取决于你更熟悉哪种技术。

## 常见错误

### 错误一：直接用 nums[i]/2 比较

```python
# 错误：整数除法丢失精度
if nums[j] < nums[i] // 2:  # 5 // 2 = 2，但 5 > 2*2.4 应该成立
```

**正确做法**：比较 `nums[i] > 2 * nums[j]` 或将 `2 * nums[j]` 离散化。

### 错误二：忘记处理边界

```python
# 错误：rank 可能为 0，导致查询错误
count += bit.query(rank[nums[i]] - 1)  # 如果 rank 是 1，则查询 0
```

**正确做法**：检查 `target_rank >= 1`。

### 错误三：离散化时遗漏 2×值

```python
# 错误：只离散化原始值
for x in nums:
    all_values.add(x)
# 缺少 all_values.add(2 * x)
```

**正确做法**：同时加入 `x` 和 `2 * x`。

## 扩展思考

### 变体：k 倍翻转对

如果条件改为 `nums[i] > k * nums[j]`，解法几乎相同：

1. 归并排序：计数时比较 `nums[i] > k * nums[j]`
2. 树状数组：离散化时加入 `k * x`，注意溢出问题

### 与逆序对的关系

翻转对可以看作"加权逆序对"的特例。更一般地，我们可以定义：

满足 `i < j` 且 `f(nums[i]) > g(nums[j])` 的数对数量。

- 标准逆序对：`f(x) = g(x) = x`
- 翻转对：`f(x) = x, g(x) = 2x`
- 可以扩展到任意单调函数组合

## 本章小结

翻转对问题是逆序对的一个重要变体，核心挑战在于比较条件与排序条件不一致。

**核心要点**：
1. **归并排序解法**：将计数和合并分开，利用排序后的单调性进行双指针统计
2. **树状数组解法**：离散化时必须包含 `2×值`，确保比较的正确性
3. **整数溢出**：在非 Python 语言中，`2 * nums[i]` 可能溢出，需要使用 64 位整数
4. **单调性利用**：无论哪种解法，都依赖于排序后的单调性来优化时间复杂度

通过这道题，我们学会了如何处理"非标准比较条件"的逆序对问题。下一章，我们将继续挑战树状数组在区间问题上的应用——区间和的个数。
