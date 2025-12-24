# 逆序对计数

## 问题的提出

**逆序对定义**：在数组 `nums` 中，如果 `i < j` 但 `nums[i] > nums[j]`，则称 `(i, j)` 是一个逆序对。

**示例**：
```python
nums = [7, 5, 6, 4]
逆序对：(7,5), (7,6), (7,4), (5,4), (6,4)
共 5 个逆序对
```

这是一个经典问题，有多种解法：
- 暴力枚举：O(N²)
- 归并排序：O(N log N)
- 线段树/树状数组：O(N log N)

今天我们聚焦于**线段树解法**，理解它为什么有效，以及如何推广到更复杂的变体问题。

---

## 核心思想：权值线段树

### 换个角度看问题

**原始视角**：对每个元素，统计它右边有多少个比它小的元素。

**转换视角**：从右向左遍历，对每个元素，统计已经出现的元素中有多少个比它小。

```python
nums = [7, 5, 6, 4]

从右向左遍历：
- 处理 4：已出现 {}，比 4 小的有 0 个
- 处理 6：已出现 {4}，比 6 小的有 1 个（4）
- 处理 5：已出现 {4, 6}，比 5 小的有 1 个（4）
- 处理 7：已出现 {4, 5, 6}，比 7 小的有 3 个（4, 5, 6）

逆序对总数 = 0 + 1 + 1 + 3 = 5
```

**关键操作**：
1. 查询：已出现的元素中，有多少个在范围 `[0, nums[i]-1]` 内？
2. 更新：将 `nums[i]` 标记为已出现

这正是**权值线段树**的用武之地！

### 权值线段树

普通线段树：以**下标**为区间，维护**值**的某种聚合。

权值线段树：以**值**为区间，维护**出现次数**的某种聚合。

```python
# 普通线段树：tree[i] 表示区间 [i] 内元素的和
# 权值线段树：tree[v] 表示值在区间 [v] 内的元素个数

# 示例：nums = [3, 1, 4, 1, 5]
# 权值线段树维护：
# 值 1 出现 2 次
# 值 3 出现 1 次
# 值 4 出现 1 次
# 值 5 出现 1 次
```

---

## 算法流程

```python
def count_inversions(nums):
    """使用权值线段树统计逆序对"""
    n = len(nums)
    
    # 离散化：将值映射到 [0, n-1]
    sorted_nums = sorted(set(nums))
    rank = {v: i for i, v in enumerate(sorted_nums)}
    
    # 权值线段树：维护每个值的出现次数
    max_rank = len(sorted_nums)
    tree = SegmentTree(max_rank)
    
    inversions = 0
    
    # 从右向左遍历
    for i in range(n - 1, -1, -1):
        r = rank[nums[i]]
        
        # 查询：已出现的元素中，比 nums[i] 小的有多少个
        # 即查询区间 [0, r-1] 的和
        if r > 0:
            inversions += tree.query(0, r - 1)
        
        # 更新：将 nums[i] 标记为已出现
        tree.update(r, 1)
    
    return inversions
```

**时间复杂度**：O(N log N)
- 离散化：O(N log N)
- N 次查询和更新：O(N log N)

---

## 完整实现

```python
class SegmentTreeCount:
    """权值线段树：维护区间内元素出现次数的和"""
    
    def __init__(self, n):
        self.n = n
        self.tree = [0] * (4 * n)
    
    def update(self, index, delta, idx=1, l=0, r=None):
        """将位置 index 的计数增加 delta"""
        if r is None:
            r = self.n - 1
        
        if l == r:
            self.tree[idx] += delta
            return
        
        mid = (l + r) // 2
        if index <= mid:
            self.update(index, delta, idx * 2, l, mid)
        else:
            self.update(index, delta, idx * 2 + 1, mid + 1, r)
        
        self.tree[idx] = self.tree[idx * 2] + self.tree[idx * 2 + 1]
    
    def query(self, ql, qr, idx=1, l=0, r=None):
        """查询区间 [ql, qr] 内的元素个数"""
        if r is None:
            r = self.n - 1
        
        if l > qr or r < ql:
            return 0
        
        if ql <= l and r <= qr:
            return self.tree[idx]
        
        mid = (l + r) // 2
        return (self.query(ql, qr, idx * 2, l, mid) + 
                self.query(ql, qr, idx * 2 + 1, mid + 1, r))


def count_inversions(nums):
    """统计数组中的逆序对数量"""
    if not nums:
        return 0
    
    n = len(nums)
    
    # 离散化
    sorted_unique = sorted(set(nums))
    rank = {v: i for i, v in enumerate(sorted_unique)}
    max_rank = len(sorted_unique)
    
    # 权值线段树
    tree = SegmentTreeCount(max_rank)
    
    inversions = 0
    
    # 从右向左遍历
    for i in range(n - 1, -1, -1):
        r = rank[nums[i]]
        
        # 查询比当前元素小的已出现元素个数
        if r > 0:
            inversions += tree.query(0, r - 1)
        
        # 将当前元素加入树中
        tree.update(r, 1)
    
    return inversions
```

---

## 执行流程可视化

```python
nums = [7, 5, 6, 4]

# 离散化
sorted_unique = [4, 5, 6, 7]
rank = {4: 0, 5: 1, 6: 2, 7: 3}

# 从右向左遍历
# i=3, nums[3]=4, r=0
#   查询 [0, -1]：0（空区间）
#   更新 rank[0] += 1
#   逆序对累计：0

# i=2, nums[2]=6, r=2
#   查询 [0, 1]：tree[0]=1, tree[1]=0 → 1
#   更新 rank[2] += 1
#   逆序对累计：1

# i=1, nums[1]=5, r=1
#   查询 [0, 0]：tree[0]=1 → 1
#   更新 rank[1] += 1
#   逆序对累计：2

# i=0, nums[0]=7, r=3
#   查询 [0, 2]：tree[0]=1, tree[1]=1, tree[2]=1 → 3
#   更新 rank[3] += 1
#   逆序对累计：5

# 结果：5
```

---

## LeetCode 实战

### 315. 计算右侧小于当前元素的个数

**LeetCode 315: Count of Smaller Numbers After Self**

给定数组 `nums`，返回一个新数组 `counts`，其中 `counts[i]` 是 `nums[i]` 右侧小于它的元素个数。

**分析**：这正是逆序对问题的变体，需要记录每个位置的贡献。

```python
class Solution:
    def countSmaller(self, nums):
        n = len(nums)
        if n == 0:
            return []
        
        # 离散化
        sorted_unique = sorted(set(nums))
        rank = {v: i for i, v in enumerate(sorted_unique)}
        max_rank = len(sorted_unique)
        
        # 权值线段树
        tree = [0] * (4 * max_rank)
        
        def update(index, idx=1, l=0, r=max_rank-1):
            if l == r:
                tree[idx] += 1
                return
            mid = (l + r) // 2
            if index <= mid:
                update(index, idx * 2, l, mid)
            else:
                update(index, idx * 2 + 1, mid + 1, r)
            tree[idx] = tree[idx * 2] + tree[idx * 2 + 1]
        
        def query(ql, qr, idx=1, l=0, r=max_rank-1):
            if l > qr or r < ql:
                return 0
            if ql <= l and r <= qr:
                return tree[idx]
            mid = (l + r) // 2
            return query(ql, qr, idx * 2, l, mid) + query(ql, qr, idx * 2 + 1, mid + 1, r)
        
        result = [0] * n
        
        # 从右向左遍历
        for i in range(n - 1, -1, -1):
            r = rank[nums[i]]
            
            if r > 0:
                result[i] = query(0, r - 1)
            
            update(r)
        
        return result
```

**复杂度**：O(N log N) 时间，O(N) 空间

### 493. 翻转对

**LeetCode 493: Reverse Pairs**

给定数组 `nums`，返回满足 `i < j` 且 `nums[i] > 2 * nums[j]` 的翻转对数量。

**分析**：与逆序对类似，但条件从 `nums[i] > nums[j]` 变成 `nums[i] > 2 * nums[j]`。

```python
class Solution:
    def reversePairs(self, nums):
        n = len(nums)
        if n <= 1:
            return 0
        
        # 构建离散化映射
        # 需要包含所有 nums[i] 和 2*nums[j]
        all_values = set(nums)
        for x in nums:
            all_values.add(2 * x)
        sorted_values = sorted(all_values)
        rank = {v: i for i, v in enumerate(sorted_values)}
        max_rank = len(sorted_values)
        
        # 权值线段树
        tree = [0] * (4 * max_rank)
        
        def update(index, idx=1, l=0, r=max_rank-1):
            if l == r:
                tree[idx] += 1
                return
            mid = (l + r) // 2
            if index <= mid:
                update(index, idx * 2, l, mid)
            else:
                update(index, idx * 2 + 1, mid + 1, r)
            tree[idx] = tree[idx * 2] + tree[idx * 2 + 1]
        
        def query(ql, qr, idx=1, l=0, r=max_rank-1):
            if ql > qr or l > qr or r < ql:
                return 0
            if ql <= l and r <= qr:
                return tree[idx]
            mid = (l + r) // 2
            return query(ql, qr, idx * 2, l, mid) + query(ql, qr, idx * 2 + 1, mid + 1, r)
        
        result = 0
        
        # 从右向左遍历
        for i in range(n - 1, -1, -1):
            # 查询：已出现的元素中，比 nums[i]/2 小的有多少个
            # 即 nums[j] < nums[i]/2，等价于 2*nums[j] < nums[i]
            target = nums[i]  # 找所有 j 使得 2*nums[j] < nums[i]
            r = rank[target]
            
            # 查询 [0, r-1]（小于 target 的元素个数）
            if r > 0:
                result += query(0, r - 1)
            
            # 注意：插入的是 2*nums[i]
            update(rank[2 * nums[i]])
        
        return result
```

**关键技巧**：插入 `2 * nums[i]` 而不是 `nums[i]`，这样查询 `[0, nums[i]-1]` 就等价于查询 `2*nums[j] < nums[i]`。

### 327. 区间和的个数

**LeetCode 327: Count of Range Sum**

给定整数数组 `nums` 和区间 `[lower, upper]`，返回位于区间内的区间和的个数。

**分析**：区间和 = 前缀和之差。设前缀和数组为 `prefix`，需要统计满足 `lower <= prefix[j] - prefix[i] <= upper` 的 `(i, j)` 对（其中 `i < j`）。

```python
class Solution:
    def countRangeSum(self, nums, lower, upper):
        n = len(nums)
        
        # 计算前缀和
        prefix = [0] * (n + 1)
        for i in range(n):
            prefix[i + 1] = prefix[i] + nums[i]
        
        # 离散化
        # 需要包含所有 prefix[i], prefix[i]-lower, prefix[i]-upper
        all_values = set()
        for p in prefix:
            all_values.add(p)
            all_values.add(p - lower)
            all_values.add(p - upper)
        sorted_values = sorted(all_values)
        rank = {v: i for i, v in enumerate(sorted_values)}
        max_rank = len(sorted_values)
        
        # 权值线段树
        tree = [0] * (4 * max_rank)
        
        def update(index, idx=1, l=0, r=max_rank-1):
            if l == r:
                tree[idx] += 1
                return
            mid = (l + r) // 2
            if index <= mid:
                update(index, idx * 2, l, mid)
            else:
                update(index, idx * 2 + 1, mid + 1, r)
            tree[idx] = tree[idx * 2] + tree[idx * 2 + 1]
        
        def query(ql, qr, idx=1, l=0, r=max_rank-1):
            if ql > qr or l > qr or r < ql:
                return 0
            if ql <= l and r <= qr:
                return tree[idx]
            mid = (l + r) // 2
            return query(ql, qr, idx * 2, l, mid) + query(ql, qr, idx * 2 + 1, mid + 1, r)
        
        result = 0
        
        # 从左到右遍历
        for j in range(n + 1):
            # 查询满足 lower <= prefix[j] - prefix[i] <= upper 的 i
            # 即 prefix[j] - upper <= prefix[i] <= prefix[j] - lower
            low = prefix[j] - upper
            high = prefix[j] - lower
            
            ql = rank[low]
            qr = rank[high]
            result += query(ql, qr)
            
            # 将 prefix[j] 加入树中
            update(rank[prefix[j]])
        
        return result
```

---

## 与归并排序解法的对比

| 方面 | 归并排序 | 线段树/树状数组 |
|-----|---------|---------------|
| 时间复杂度 | O(N log N) | O(N log N) |
| 空间复杂度 | O(N) | O(N) |
| 代码复杂度 | 中等 | 中等 |
| 扩展性 | 一般 | 强（容易修改查询条件）|
| 在线处理 | 不支持 | 支持 |

**线段树的优势**：
1. 更容易处理变体问题（如翻转对、区间和计数）
2. 支持在线查询（边插入边查询）
3. 思路直观：查询 + 更新的模式

---

## 常见错误与陷阱

### 错误一：离散化遗漏边界

```python
# 错误：只离散化 nums
sorted_unique = sorted(set(nums))

# 对于翻转对，需要同时离散化 nums[i] 和 2*nums[j]
# 对于区间和计数，需要离散化 prefix, prefix-lower, prefix-upper
```

### 错误二：遍历方向错误

```python
# 逆序对：从右向左遍历
for i in range(n - 1, -1, -1):
    # 查询右边比当前小的
    # ...

# 如果从左向右遍历，查询的是「左边比当前小的」，意义不同
```

### 错误三：边界条件处理

```python
# 错误：没有检查 r > 0
inversions += tree.query(0, r - 1)  # 当 r=0 时，区间 [0, -1] 无效

# 正确
if r > 0:
    inversions += tree.query(0, r - 1)
```

---

## 本章小结

本章核心要点：

1. **权值线段树**：以值为区间维度，统计出现次数

2. **逆序对统计**：
   - 从右向左遍历
   - 查询已出现元素中比当前小的个数
   - 将当前元素标记为已出现

3. **离散化**：将值域压缩到 `[0, N-1]`，必须包含所有可能查询的值

4. **变体问题**：
   - 翻转对：插入 `2*nums[i]`，查询 `< nums[i]`
   - 区间和计数：查询前缀和在特定范围内的个数

**设计启示**：

权值线段树将「统计满足条件的元素个数」问题转化为「区间查询」问题。这种思路可以推广到许多统计类问题：

- 统计小于/大于某值的元素个数
- 统计在某范围内的元素个数
- 动态维护排名信息

下一章我们将学习**区间第 K 大**，引入主席树（可持久化线段树）这一强大工具。
