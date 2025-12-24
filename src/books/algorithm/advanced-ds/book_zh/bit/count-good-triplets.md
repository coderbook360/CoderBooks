# 统计作战单位数

本章是树状数组部分的最后一章。我们将通过"统计作战单位数"这道题，展示树状数组在**三元组统计**问题中的优雅应用。这道题的核心思想是"枚举中间元素"，配合树状数组实现高效的左右计数。

## 问题描述

**LeetCode 1395. 统计作战单位数 (Count Number of Teams)**

`n` 名士兵站成一排。每个士兵都有一个**独一无二**的评分 `rating`。

每 3 个士兵可以组成一个作战单位，分组规则如下：
- 从队伍中选出下标分别为 `i`、`j`、`k` 的 3 名士兵，他们的评分分别为 `rating[i]`、`rating[j]`、`rating[k]`
- 作战单位需满足：`rating[i] < rating[j] < rating[k]` 或者 `rating[i] > rating[j] > rating[k]`，其中 `0 <= i < j < k < n`

请你返回按上述条件可以组建的作战单位数量。

**示例 1**：
```
输入: rating = [2, 5, 3, 4, 1]
输出: 3
解释: 可以组成三个作战单位：(2,3,4)、(5,4,1)、(5,3,1)
```

**示例 2**：
```
输入: rating = [2, 1, 3]
输出: 0
解释: 无法组成作战单位
```

**示例 3**：
```
输入: rating = [1, 2, 3, 4]
输出: 4
```

**提示**：
- n == rating.length
- 3 <= n <= 1000
- 1 <= rating[i] <= 10^5
- rating 中的元素都是唯一的

## 暴力解法

最直接的思路是三重循环：

```python
class Solution:
    def numTeams(self, rating: list[int]) -> int:
        n = len(rating)
        count = 0
        
        for i in range(n):
            for j in range(i + 1, n):
                for k in range(j + 1, n):
                    if rating[i] < rating[j] < rating[k]:
                        count += 1
                    if rating[i] > rating[j] > rating[k]:
                        count += 1
        
        return count
```

时间复杂度 O(n³)，对于 n = 1000 会超时。

## 优化思路：枚举中间元素

**关键洞察**：与其枚举三个位置，不如**固定中间元素 j**，然后统计：
- 左边有多少个比 `rating[j]` 小的元素（记为 `left_smaller`）
- 右边有多少个比 `rating[j]` 大的元素（记为 `right_larger`）

对于递增三元组 `(i, j, k)`：数量 = `left_smaller × right_larger`

同理，对于递减三元组：
- 左边有多少个比 `rating[j]` 大的元素（记为 `left_larger`）
- 右边有多少个比 `rating[j]` 小的元素（记为 `right_smaller`）

数量 = `left_larger × right_smaller`

### O(n²) 解法

```python
class Solution:
    def numTeams(self, rating: list[int]) -> int:
        n = len(rating)
        count = 0
        
        for j in range(n):
            # 统计左边比 rating[j] 小/大的个数
            left_smaller = left_larger = 0
            for i in range(j):
                if rating[i] < rating[j]:
                    left_smaller += 1
                else:
                    left_larger += 1
            
            # 统计右边比 rating[j] 小/大的个数
            right_smaller = right_larger = 0
            for k in range(j + 1, n):
                if rating[k] < rating[j]:
                    right_smaller += 1
                else:
                    right_larger += 1
            
            # 递增三元组 + 递减三元组
            count += left_smaller * right_larger
            count += left_larger * right_smaller
        
        return count
```

时间复杂度 O(n²)，可以通过本题。但我们追求更优的解法。

## 树状数组优化

### 思路分析

对于每个位置 `j`，我们需要快速知道：
1. 在 `j` 左边，有多少个值小于 `rating[j]`
2. 在 `j` 右边，有多少个值大于 `rating[j]`

这正是树状数组的强项！

**从左往右遍历**：用树状数组维护"左边已出现的值"
- `left_smaller[j]` = 查询区间 `[1, rating[j] - 1]` 的个数

**从右往左遍历**：用树状数组维护"右边已出现的值"
- `right_larger[j]` = 查询区间 `[rating[j] + 1, max_val]` 的个数

### 实现细节

由于 `rating[i]` 最大为 10^5，可以直接作为树状数组索引，无需离散化（但离散化可以节省空间）。

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
    def numTeams(self, rating: list[int]) -> int:
        n = len(rating)
        max_val = max(rating)
        
        # 从左往右，统计每个位置左边比它小/大的个数
        left_smaller = [0] * n
        left_larger = [0] * n
        bit_left = BinaryIndexedTree(max_val)
        
        for j in range(n):
            left_smaller[j] = bit_left.query(rating[j] - 1)
            left_larger[j] = j - left_smaller[j]  # 左边总共 j 个元素
            bit_left.update(rating[j])
        
        # 从右往左，统计每个位置右边比它小/大的个数
        right_smaller = [0] * n
        right_larger = [0] * n
        bit_right = BinaryIndexedTree(max_val)
        
        for j in range(n - 1, -1, -1):
            right_smaller[j] = bit_right.query(rating[j] - 1)
            right_larger[j] = (n - 1 - j) - right_smaller[j]  # 右边总共 n-1-j 个元素
            bit_right.update(rating[j])
        
        # 统计结果
        count = 0
        for j in range(n):
            count += left_smaller[j] * right_larger[j]  # 递增三元组
            count += left_larger[j] * right_smaller[j]  # 递减三元组
        
        return count
```

## 执行过程演示

以 `rating = [2, 5, 3, 4, 1]` 为例。

**第一遍：从左往右**

| j | rating[j] | query(r-1) | left_smaller | left_larger |
|---|-----------|------------|--------------|-------------|
| 0 | 2 | query(1)=0 | 0 | 0 |
| 1 | 5 | query(4)=1 | 1 | 0 |
| 2 | 3 | query(2)=1 | 1 | 1 |
| 3 | 4 | query(3)=2 | 2 | 1 |
| 4 | 1 | query(0)=0 | 0 | 4 |

**第二遍：从右往左**

| j | rating[j] | query(r-1) | right_smaller | right_larger |
|---|-----------|------------|---------------|--------------|
| 4 | 1 | query(0)=0 | 0 | 0 |
| 3 | 4 | query(3)=1 | 1 | 0 |
| 2 | 3 | query(2)=1 | 1 | 1 |
| 1 | 5 | query(4)=3 | 3 | 0 |
| 0 | 2 | query(1)=1 | 1 | 3 |

**统计结果**：

| j | left_smaller × right_larger | left_larger × right_smaller |
|---|----------------------------|----------------------------|
| 0 | 0 × 3 = 0 | 0 × 1 = 0 |
| 1 | 1 × 0 = 0 | 0 × 3 = 0 |
| 2 | 1 × 1 = 1 | 1 × 1 = 1 |
| 3 | 2 × 0 = 0 | 1 × 1 = 1 |
| 4 | 0 × 0 = 0 | 4 × 0 = 0 |

总计：0 + 0 + 1 + 0 + 0 + 0 + 0 + 1 + 1 + 0 = **3**

验证：
- 递增：(2, 3, 4) → j=2 时 left_smaller=1(是2), right_larger=1(是4) ✓
- 递减：(5, 4, 1) → j=3 时 left_larger=1(是5), right_smaller=1(是1) ✓
- 递减：(5, 3, 1) → j=2 时 left_larger=1(是5), right_smaller=1(是1) ✓

## 空间优化：离散化

如果 `rating` 值范围很大（比如 10^9），需要离散化：

```python
class Solution:
    def numTeams(self, rating: list[int]) -> int:
        n = len(rating)
        
        # 离散化
        sorted_unique = sorted(set(rating))
        rank = {v: i + 1 for i, v in enumerate(sorted_unique)}
        max_rank = len(sorted_unique)
        
        # 使用 rank 代替原始值
        left_smaller = [0] * n
        left_larger = [0] * n
        bit_left = BinaryIndexedTree(max_rank)
        
        for j in range(n):
            r = rank[rating[j]]
            left_smaller[j] = bit_left.query(r - 1)
            left_larger[j] = j - left_smaller[j]
            bit_left.update(r)
        
        # ... 右边同理
```

## 复杂度分析

**时间复杂度**：O(n log M)
- M 是 `rating` 的最大值（或离散化后的不同值个数）
- 每个元素进行一次 O(log M) 的查询和更新
- 两遍遍历，总计 O(n log M)

**空间复杂度**：O(M) 或 O(n)（离散化后）

## 单遍遍历优化

实际上，我们可以只用一遍遍历。在从左往右遍历时，同时利用"总数 - 左边" = "右边"的关系：

```python
class Solution:
    def numTeams(self, rating: list[int]) -> int:
        n = len(rating)
        max_val = max(rating)
        
        # 预先统计每个值右边比它小/大的个数
        # 使用 "总共有多少个比它小" - "左边有多少个比它小" = "右边有多少个比它小"
        
        # 首先统计每个值在整个数组中的 smaller/larger 计数
        total_smaller = {}  # total_smaller[v] = 整个数组中比 v 小的个数
        
        bit_total = BinaryIndexedTree(max_val)
        for i in range(n):
            total_smaller[rating[i]] = bit_total.query(rating[i] - 1)
            bit_total.update(rating[i])
        
        # 重新从左往右遍历
        bit_left = BinaryIndexedTree(max_val)
        count = 0
        
        for j in range(n):
            left_smaller = bit_left.query(rating[j] - 1)
            left_larger = j - left_smaller
            
            # 右边比 rating[j] 小的个数 = 总共比它小的 - 左边比它小的
            right_smaller = total_smaller[rating[j]] - left_smaller
            right_larger = (n - 1 - j) - right_smaller
            
            count += left_smaller * right_larger
            count += left_larger * right_smaller
            
            bit_left.update(rating[j])
        
        return count
```

这个版本虽然逻辑稍复杂，但只需要一个树状数组和一遍主要遍历。

## 常见错误

### 错误一：忘记处理边界

```python
# 错误：当 rating[j] = 1 时，query(0) 需要特殊处理
left_smaller[j] = bit.query(rating[j] - 1)  # query(0) 应该返回 0
```

**正确做法**：在 `query` 函数中处理 `i <= 0` 的情况。

### 错误二：left_larger 计算错误

```python
# 错误：忘记左边有 j 个元素
left_larger = bit.query(max_val) - left_smaller  # 这查的是所有已加入的

# 正确：左边共 j 个元素
left_larger = j - left_smaller
```

### 错误三：数组越界

```python
# 错误：rating[j] 可能等于 max_val
bit = BinaryIndexedTree(max_val - 1)  # 大小不够
bit.update(rating[j])  # 越界！

# 正确：树状数组大小至少为 max_val
bit = BinaryIndexedTree(max_val)
```

## 扩展：k 元组统计

如果问题改为统计长度为 k 的递增/递减元组，我们可以使用动态规划：

- `dp[j][len]` = 以位置 `j` 结尾、长度为 `len` 的递增子序列个数
- 转移：`dp[j][len] = sum(dp[i][len-1])` for all `i < j` with `rating[i] < rating[j]`

用树状数组优化，时间复杂度 O(nk log n)。

## 本章小结

"统计作战单位数"展示了树状数组在**组合计数**问题中的应用。核心技巧是"枚举中间元素"，将三元组问题转化为左右两侧的独立计数。

**核心要点**：

1. **枚举中间元素**：固定中间位置 j，左右两侧的计数相乘得到三元组数量
2. **左右拆分**：分别用树状数组统计左边和右边满足条件的元素个数
3. **补集思想**：`larger = total - smaller`，避免额外的查询
4. **两遍遍历**：从左往右统计左边信息，从右往左统计右边信息

---

至此，树状数组部分的十个章节全部完成。我们从基础的点更新区间查询开始，一路探索了区间更新、二维扩展、逆序对及其变体、区间和统计、动态规划优化等高级应用。树状数组虽然功能不如线段树灵活，但在其适用场景下，代码简洁、效率极高。

下一部分，我们将进入**平衡树与有序集合**的世界，探索如何在动态数据集上高效地进行排名查询和范围操作。
