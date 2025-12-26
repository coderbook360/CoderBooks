# LeetCode 1494: 并行课程 II

## 问题描述

> 给你一个整数 `n` 表示某所大学里课程的数目，编号为 `1` 到 `n`，数组 `relations` 中，`relations[i] = [xi, yi]` 表示一个先修课的关系，也就是课程 `xi` 必须在课程 `yi` 之前修完。同时你还有一个整数 `k`。
>
> 在一个学期中，你最多可以同时选修 `k` 门课程。
>
> 请你返回学完全部课程所需要的最少学期数。题目保证一定可以学完所有课程（即图中不存在环）。

**示例 1**：
```
输入：n = 4, relations = [[2,1],[3,1],[1,4]], k = 2
输出：3
解释：上图展示了题目输入的图。在第一个学期中，我们可以学习课程 2 和课程 3 。
然后第二个学期学习课程 1 ，第三个学期学习课程 4 。
```

**示例 2**：
```
输入：n = 5, relations = [[2,1],[3,1],[4,1],[1,5]], k = 2
输出：4
解释：上图展示了题目输入的图。
最佳方案是：第一学期学习课程 2 和 3，第二学期学习课程 4，第三学期学习课程 1，第四学期学习课程 5。
```

**示例 3**：
```
输入：n = 11, relations = [], k = 2
输出：6
```

**约束**：
- `1 <= n <= 15`
- `1 <= k <= n`
- `0 <= relations.length <= n * (n-1) / 2`
- `relations[i].length == 2`
- `1 <= xi, yi <= n`
- `xi != yi`
- 所有先修关系都是不同的，即没有重复的关系。
- 题目保证图中没有环。

**LeetCode链接**：[1494. Parallel Courses II](https://leetcode.com/problems/parallel-courses-ii/)

## 问题分析

首先要问一个问题：**这个问题的本质是什么？**

这是一个**带约束的调度问题**：
- **目标**：最小化学期数
- **约束1**：先修课程关系（拓扑排序）
- **约束2**：每学期最多选 k 门课

关键难点：
- 需要同时考虑**课程依赖**和**容量限制**
- 不同的选课顺序导致不同的学期数

现在我要问第二个问题：**为什么是状态压缩 DP？**

因为：
1. **状态是集合**：已修完的课程集合
2. **规模小**：`n <= 15`，`2^15 = 32768` 可行
3. **决策空间大**：每学期可以选择多种课程组合

## 解法一：状态压缩 DP（BFS）

### 思路

**状态定义**：
- `dp[mask]` = 修完 `mask` 中的课程所需的最少学期数

**状态转移**：
- 从 `mask` 枚举所有可以修的课程子集 `next_courses`
- 要求：
  1. `next_courses` 的先修课程都在 `mask` 中
  2. `|next_courses| <= k`
- `dp[mask | next_courses] = dp[mask] + 1`

**初始化**：
- `dp[0] = 0`（没修任何课程，学期数为 0）

**答案**：
- `dp[(1 << n) - 1]`（修完所有课程）

### 代码实现

```python
from collections import deque

def minNumberOfSemesters(n, relations, k):
    """
    状态压缩 DP（BFS 版本）
    
    Args:
        n: 课程数量（编号 1 到 n）
        relations: 先修关系，relations[i] = [xi, yi] 表示 xi 是 yi 的先修课
        k: 每学期最多选 k 门课
    
    Returns:
        最少学期数
    """
    # 1. 构建先修课程 bitmask
    prereq = [0] * n
    for x, y in relations:
        x -= 1  # 转换为 0-indexed
        y -= 1
        prereq[y] |= (1 << x)  # 课程 y 的先修课程包含 x
    
    # 2. BFS
    dp = {0: 0}  # mask -> 最少学期数
    queue = deque([0])
    
    while queue:
        mask = queue.popleft()
        
        if mask == (1 << n) - 1:
            continue  # 已修完所有课程
        
        # 找到所有可以修的课程
        available = []
        for i in range(n):
            if mask & (1 << i):  # 已修完
                continue
            if (mask & prereq[i]) == prereq[i]:  # 先修课程都修完了
                available.append(i)
        
        # 枚举所有可以选择的子集（大小 <= k）
        for next_mask in enumerate_subsets_with_limit(available, k):
            new_mask = mask | next_mask
            
            if new_mask not in dp:
                dp[new_mask] = dp[mask] + 1
                queue.append(new_mask)
    
    return dp[(1 << n) - 1]

def enumerate_subsets_with_limit(available, k):
    """
    枚举 available 的所有子集，大小 <= k
    """
    subsets = []
    n = len(available)
    
    for mask in range(1, 1 << n):
        if bin(mask).count('1') > k:
            continue
        
        subset_mask = 0
        for i in range(n):
            if mask & (1 << i):
                subset_mask |= (1 << available[i])
        subsets.append(subset_mask)
    
    return subsets

# 测试
relations1 = [[2,1],[3,1],[1,4]]
print(minNumberOfSemesters(4, relations1, 2))  # 3

relations2 = [[2,1],[3,1],[4,1],[1,5]]
print(minNumberOfSemesters(5, relations2, 2))  # 4

relations3 = []
print(minNumberOfSemesters(11, relations3, 2))  # 6
```

**复杂度分析**：
- **时间**：O(3^n)
  - 枚举所有状态：O(2^n)
  - 对每个状态，枚举可选课程的子集：O(2^n)
  - 总体：O(2^n × 2^n) = O(4^n)，但实际上由于剪枝，接近 O(3^n)
- **空间**：O(2^n)

### 逐步推导

以示例 1 为例，`n = 4`, `relations = [[2,1],[3,1],[1,4]]`, `k = 2`

**预处理先修课程**：
```
prereq[0] = 0b0110 (课程 1 的先修课是课程 2, 3)
prereq[1] = 0b0000 (课程 2 无先修课)
prereq[2] = 0b0000 (课程 3 无先修课)
prereq[3] = 0b0001 (课程 4 的先修课是课程 1)
```

**BFS 过程**：
```
mask = 0b0000 (没修任何课程)
  available = [1, 2] (课程 2, 3 可修)
  next_mask = 0b0110 (选择课程 2, 3)
  dp[0b0110] = 1

mask = 0b0110 (修完课程 2, 3)
  available = [0] (课程 1 可修)
  next_mask = 0b0111 (选择课程 1)
  dp[0b0111] = 2

mask = 0b0111 (修完课程 1, 2, 3)
  available = [3] (课程 4 可修)
  next_mask = 0b1111 (选择课程 4)
  dp[0b1111] = 3
```

## 解法二：状态压缩 DP（迭代版）

### 思路

使用迭代 DP 代替 BFS，更清晰地表达状态转移。

### 代码实现

```python
def minNumberOfSemesters_dp(n, relations, k):
    """
    状态压缩 DP（迭代版本）
    """
    # 1. 构建先修课程 bitmask
    prereq = [0] * n
    for x, y in relations:
        x -= 1
        y -= 1
        prereq[y] |= (1 << x)
    
    # 2. DP
    dp = [float('inf')] * (1 << n)
    dp[0] = 0
    
    for mask in range(1 << n):
        if dp[mask] == float('inf'):
            continue
        
        # 找到所有可以修的课程
        available = 0
        for i in range(n):
            if mask & (1 << i):  # 已修完
                continue
            if (mask & prereq[i]) == prereq[i]:  # 先修课程都修完了
                available |= (1 << i)
        
        # 枚举 available 的所有子集（大小 <= k）
        sub = available
        while sub:
            if bin(sub).count('1') <= k:
                new_mask = mask | sub
                dp[new_mask] = min(dp[new_mask], dp[mask] + 1)
            sub = (sub - 1) & available
    
    return dp[(1 << n) - 1]

# 测试
relations1 = [[2,1],[3,1],[1,4]]
print(minNumberOfSemesters_dp(4, relations1, 2))  # 3
```

**优点**：
- 代码更简洁
- 避免了队列开销

## 解法三：优化（预计算所有合法子集）

### 问题

在解法二中，每次都要枚举 `available` 的子集，效率较低。

### 优化思路

**预计算**：
- 对于每个可能的 `available`，预计算所有大小 <= k 的子集
- 存储在一个字典中：`valid_subsets[available] = [sub1, sub2, ...]`

### 代码实现

```python
def minNumberOfSemesters_optimized(n, relations, k):
    """
    优化版本：预计算所有合法子集
    """
    # 1. 构建先修课程 bitmask
    prereq = [0] * n
    for x, y in relations:
        x -= 1
        y -= 1
        prereq[y] |= (1 << x)
    
    # 2. 预计算所有合法子集（大小 <= k）
    valid_subsets = {}
    for mask in range(1 << n):
        subsets = []
        sub = mask
        while sub:
            if bin(sub).count('1') <= k:
                subsets.append(sub)
            sub = (sub - 1) & mask
        valid_subsets[mask] = subsets
    
    # 3. DP
    dp = [float('inf')] * (1 << n)
    dp[0] = 0
    
    for mask in range(1 << n):
        if dp[mask] == float('inf'):
            continue
        
        # 找到所有可以修的课程
        available = 0
        for i in range(n):
            if mask & (1 << i):
                continue
            if (mask & prereq[i]) == prereq[i]:
                available |= (1 << i)
        
        # 枚举预计算的合法子集
        for sub in valid_subsets[available]:
            new_mask = mask | sub
            dp[new_mask] = min(dp[new_mask], dp[mask] + 1)
    
    return dp[(1 << n) - 1]

# 测试
relations1 = [[2,1],[3,1],[1,4]]
print(minNumberOfSemesters_optimized(4, relations1, 2))  # 3
```

## 解法四：贪心 + DP

### 思路

**观察**：如果 k >= 可修课程数，应该全部选择；否则，优先选择**后续依赖最多的课程**。

### 代码实现

```python
def minNumberOfSemesters_greedy(n, relations, k):
    """
    贪心 + DP
    """
    # 构建依赖关系
    prereq = [0] * n
    post_dep = [0] * n  # 后续依赖的课程数量
    
    for x, y in relations:
        x -= 1
        y -= 1
        prereq[y] |= (1 << x)
        post_dep[x] += 1
    
    dp = [float('inf')] * (1 << n)
    dp[0] = 0
    
    for mask in range(1 << n):
        if dp[mask] == float('inf'):
            continue
        
        # 找到所有可以修的课程
        available = []
        for i in range(n):
            if mask & (1 << i):
                continue
            if (mask & prereq[i]) == prereq[i]:
                available.append(i)
        
        # 贪心：按后续依赖数量排序
        available.sort(key=lambda i: post_dep[i], reverse=True)
        
        # 选择前 k 个（或全部）
        selected = available[:k]
        new_mask = mask
        for i in selected:
            new_mask |= (1 << i)
        
        dp[new_mask] = min(dp[new_mask], dp[mask] + 1)
    
    return dp[(1 << n) - 1]
```

**注意**：这种贪心策略不一定总是最优，但在某些情况下可以加速。

## 优化技巧

### 技巧 1：状态剪枝

如果 `dp[mask]` 已经 >= 当前最优解，跳过。

```python
if dp[mask] >= best:
    continue
```

### 技巧 2：位运算优化

使用 `__builtin_popcount`（C++）或 `bin(mask).count('1')`（Python）快速统计位数。

```python
def popcount(mask):
    count = 0
    while mask:
        mask &= mask - 1
        count += 1
    return count
```

### 技巧 3：子集枚举优化

使用 Gosper's Hack 枚举固定大小的子集。

```python
def next_combination(x):
    """
    返回下一个具有相同位数的数字
    """
    u = x & -x
    v = x + u
    return v + (((x ^ v) // u) >> 2)
```

## 常见错误

### 错误 1：先修课程判断

```python
# 错误：忘记转换为 0-indexed
prereq[y] |= (1 << x)  # x, y 应该是 0-indexed

# 正确
x -= 1
y -= 1
prereq[y] |= (1 << x)
```

### 错误 2：子集枚举

```python
# 错误：忘记处理空集
sub = available
while sub:
    ...
    sub = (sub - 1) & available
# 漏掉了空集！

# 正确：如果需要包括空集
sub = available
while True:
    ...
    if sub == 0:
        break
    sub = (sub - 1) & available
```

### 错误 3：边界条件

```python
# 错误：忘记处理无先修课的情况
if not relations:
    return (n + k - 1) // k  # 向上取整
```

## 扩展问题

### 扩展 1：最大化每学期课程数

> 如果目标是最大化每学期平均课程数，如何修改？

```python
def maximize_average_courses(n, relations, k):
    """
    最大化平均课程数 = 最小化学期数
    """
    return minNumberOfSemesters(n, relations, k)
```

### 扩展 2：带权重的课程

> 每门课程有学分，目标是最小化总学期数的同时最大化学分。

```python
def minSemestersWithCredits(n, relations, k, credits):
    """
    (最少学期数, 最大学分)
    """
    # dp[mask] = (最少学期数, 最大学分)
    # ...
    pass
```

### 扩展 3：动态 k

> 每学期的 k 可以不同，如何修改？

```python
def minSemestersWithDynamicK(n, relations, k_list):
    """
    k_list[i] 是第 i 学期的容量
    """
    # dp[mask][i] = 修完 mask，用了 i 学期，是否可行
    # ...
    pass
```

## 性能对比

| 方法 | 时间复杂度 | 空间复杂度 | 代码复杂度 |
|-----|-----------|-----------|-----------|
| BFS | O(3^n) | O(2^n) | 中等 |
| 迭代 DP | O(3^n) | O(2^n) | 简单 |
| 预计算优化 | O(3^n) | O(2^n) | 中等 |
| 贪心 + DP | O(2^n × n log n) | O(2^n) | 中等 |

## 小结

### 核心思想
1. **状态压缩**：用整数表示已修完的课程集合
2. **拓扑约束**：检查先修课程是否都修完
3. **容量限制**：每学期最多选 k 门课
4. **状态转移**：枚举所有可选课程的合法子集

### 关键技巧
- 预计算先修课程 bitmask：`prereq[i]`
- 检查先修课程：`(mask & prereq[i]) == prereq[i]`
- 枚举子集：`sub = (sub - 1) & available`
- 限制子集大小：`bin(sub).count('1') <= k`

### 适用场景
- 任务调度问题
- 课程安排问题
- 依赖关系处理
- 并行计算优化

这道题完美结合了状态压缩 DP 和拓扑排序，是高质量的综合题目！
