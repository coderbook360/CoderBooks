# 计算右侧小于当前元素的个数

## 题目描述

**LeetCode 315: Count of Smaller Numbers After Self**

给定一个整数数组 `nums`，按要求返回一个新数组 `counts`。数组 `counts` 有该性质：`counts[i]` 的值是 `nums[i]` 右侧小于 `nums[i]` 的元素的数量。

**示例**：
```
输入：nums = [5, 2, 6, 1]
输出：[2, 1, 1, 0]

解释：
5 的右侧有 2 个更小的元素 (2 和 1)
2 的右侧有 1 个更小的元素 (1)
6 的右侧有 1 个更小的元素 (1)
1 的右侧有 0 个更小的元素
```

---

## 问题分析

**朴素方法**：对每个元素，遍历其右侧统计 → O(N²)

如何优化？

**关键观察**：从右向左遍历，对于当前元素 `nums[i]`：
- 问题变成：在已处理的元素中，有多少个小于 `nums[i]`？
- 这是一个**动态计数**问题：插入 + 查询

**树状数组视角**：
- 维护一个「值域」上的出现次数
- `update(v, 1)`：值 `v` 出现了一次
- `query(v-1)`：查询小于 `v` 的元素个数

---

## 解法：离散化 + 树状数组

### 步骤

1. **离散化**：将元素值映射到 `[1, N]` 范围
2. **从右向左遍历**：
   - 查询当前值左边（更小值）的出现次数
   - 将当前值插入树状数组

### 实现

```python
class Solution:
    def countSmaller(self, nums):
        if not nums:
            return []
        
        n = len(nums)
        
        # 1. 离散化
        sorted_unique = sorted(set(nums))
        rank = {v: i + 1 for i, v in enumerate(sorted_unique)}  # 1-indexed
        
        # 2. 树状数组
        max_rank = len(sorted_unique)
        tree = [0] * (max_rank + 1)
        
        def lowbit(x):
            return x & (-x)
        
        def update(i):
            while i <= max_rank:
                tree[i] += 1
                i += lowbit(i)
        
        def query(i):
            result = 0
            while i > 0:
                result += tree[i]
                i -= lowbit(i)
            return result
        
        # 3. 从右向左遍历
        result = [0] * n
        for i in range(n - 1, -1, -1):
            r = rank[nums[i]]
            # 查询小于当前值的元素个数
            result[i] = query(r - 1)
            # 将当前值加入
            update(r)
        
        return result
```

---

## 执行流程详解

以 `nums = [5, 2, 6, 1]` 为例：

```
离散化：
sorted_unique = [1, 2, 5, 6]
rank = {1: 1, 2: 2, 5: 3, 6: 4}

从右向左遍历：

i=3, nums[3]=1, r=1
  query(0) = 0
  update(1)
  tree: [0, 1, 0, 0, 0]
  result[3] = 0

i=2, nums[2]=6, r=4
  query(3) = tree[3] + tree[2] + tree[1] = 0 + 0 + 1 = 1
  update(4)
  tree: [0, 1, 0, 0, 1]
  result[2] = 1

i=1, nums[1]=2, r=2
  query(1) = tree[1] = 1
  update(2)
  tree: [0, 1, 1, 0, 1]
  result[1] = 1

i=0, nums[0]=5, r=3
  query(2) = tree[2] + tree[1] = 1 + 1 = 2
  update(3)
  tree: [0, 1, 1, 1, 1]
  result[0] = 2

最终结果：[2, 1, 1, 0] ✓
```

---

## 复杂度分析

| 操作 | 时间复杂度 |
|-----|----------|
| 离散化 | O(N log N) |
| N 次查询/更新 | O(N log N) |
| **总计** | **O(N log N)** |

空间复杂度：O(N)

---

## 其他解法对比

### 解法二：归并排序

在归并排序的过程中统计逆序对，需要记录每个元素的原始位置。

```python
class Solution:
    def countSmaller(self, nums):
        n = len(nums)
        result = [0] * n
        # 记录 (值, 原始索引)
        indexed = list(enumerate(nums))
        
        def merge_sort(arr):
            if len(arr) <= 1:
                return arr
            
            mid = len(arr) // 2
            left = merge_sort(arr[:mid])
            right = merge_sort(arr[mid:])
            
            return merge(left, right)
        
        def merge(left, right):
            merged = []
            i = j = 0
            
            while i < len(left) and j < len(right):
                if left[i][1] <= right[j][1]:
                    # 左边元素 <= 右边元素
                    # 此时右边已经有 j 个元素小于 left[i]
                    result[left[i][0]] += j
                    merged.append(left[i])
                    i += 1
                else:
                    merged.append(right[j])
                    j += 1
            
            # 处理剩余的左边元素
            while i < len(left):
                result[left[i][0]] += j  # 右边所有元素都小于它
                merged.append(left[i])
                i += 1
            
            while j < len(right):
                merged.append(right[j])
                j += 1
            
            return merged
        
        merge_sort(indexed)
        return result
```

### 解法三：线段树

与树状数组类似，使用权值线段树。

### 解法对比

| 方法 | 时间 | 空间 | 实现难度 |
|-----|-----|-----|---------|
| 树状数组 | O(N log N) | O(N) | 简单 |
| 归并排序 | O(N log N) | O(N) | 中等 |
| 线段树 | O(N log N) | O(N) | 较复杂 |

**推荐**：树状数组实现最简洁，且容易扩展到变体问题。

---

## 变体与扩展

### 变体一：计算左侧小于当前元素的个数

只需从左向右遍历：

```python
def countSmaller_left(nums):
    # ...离散化...
    result = []
    for num in nums:
        r = rank[num]
        result.append(query(r - 1))
        update(r)
    return result
```

### 变体二：计算右侧大于当前元素的个数

查询时改为查询 `[r+1, max_rank]`：

```python
# 右侧大于 nums[i] 的个数
# = 已插入的总数 - 小于等于 nums[i] 的个数
count_greater = total_inserted - query(r)
```

### 变体三：动态排名

支持插入元素后查询排名：

```python
class DynamicRank:
    def insert(self, val):
        r = self.rank[val]
        self.update(r)
    
    def get_rank(self, val):
        r = self.rank[val]
        return self.query(r)  # 小于等于 val 的元素个数
```

---

## 常见错误与陷阱

### 错误一：离散化后索引从 0 开始

```python
# 错误：使用 0-indexed
rank = {v: i for i, v in enumerate(sorted_unique)}  # 0, 1, 2, ...

# 问题：query(0) 对于树状数组是无效的

# 正确：使用 1-indexed
rank = {v: i + 1 for i, v in enumerate(sorted_unique)}  # 1, 2, 3, ...
```

### 错误二：查询时边界

```python
# 错误：查询小于 nums[i] 的个数
result[i] = query(r)  # ← 这是小于等于！

# 正确
result[i] = query(r - 1)  # 小于 r 的，即 [1, r-1]
```

### 错误三：重复元素处理

```python
# 离散化时要保证相同的元素有相同的排名
sorted_unique = sorted(set(nums))  # set 去重
rank = {v: i + 1 for i, v in enumerate(sorted_unique)}
```

---

## 本章小结

本章核心要点：

1. **问题转化**：「右侧小于」→ 从右向左遍历，动态统计

2. **树状数组应用**：
   - 权值树状数组：以值为索引
   - update：标记值的出现
   - query：查询值域范围内的计数

3. **离散化必要性**：当值域很大时，压缩到 `[1, N]`

4. **时间复杂度**：O(N log N)，相比暴力 O(N²) 大幅优化

**解题模式**：

```
离散化 → 从某方向遍历 → 查询条件范围 → 更新当前元素
```

这个模式适用于很多「条件统计」类问题。下一章我们将继续学习**翻转对**，看看如何处理更复杂的条件。
