# LeetCode 1601: 最多可达成的换楼请求数目

## 问题描述

> 我们有 n 栋楼，编号从 0 到 n - 1。每栋楼有若干员工。由于现在是换楼的季节，部分员工想要换一栋楼居住。
>
> 给你一个数组 `requests`，其中 `requests[i] = [fromi, toi]` 表示一个员工请求从编号为 `fromi` 的楼搬到编号为 `toi` 的楼。
>
> 一开始所有楼都是满员的，所以从请求列表中选出的任一子集的请求中，每栋楼员工净变化为 0。比如说 n = 3 且两个员工要离开楼 0，一个员工要离开楼 1，一个员工要离开楼 2，如果该请求子集选中的是前两个员工的请求，那么楼 0 的员工净变化为 -2，没有满足所有楼员工净变化为 0 的条件。
>
> 请你从原请求列表中选出尽可能多的请求，使得它们是一个可行的子集，使所有楼员工净变化为 0。返回请求数目的最大值。

**示例 1**：
```
输入：n = 5, requests = [[0,1],[1,0],[0,1],[1,2],[2,0],[3,4]]
输出：5
解释：请求从下标 0, 1, 2, 3, 4 形成了一个子集。
从楼 0 离开的员工数目为 0 (没有人离开)
从楼 1 离开的员工数目为 1 (一个人)
从楼 2 离开的员工数目为 1 (一个人)
从楼 3 离开的员工数目为 1 (一个人)
从楼 4 离开的员工数目为 0 (没有人离开)
到楼 0 的员工数目为 1 (一个人)
到楼 1 的员工数目为 1 (一个人)
到楼 2 的员工数目为 1 (一个人)
到楼 3 的员工数目为 0 (没有人)
到楼 4 的员工数目为 1 (一个人)
每栋楼的员工净变化都是 0。
```

**示例 2**：
```
输入：n = 3, requests = [[0,0],[1,2],[2,1]]
输出：3
解释：请求从下标 0, 1, 2 都可以被选中。
[0,0] 请求不改变楼 0 的员工数。
[1,2] 和 [2,1] 请求让楼 1 和 2 的员工数互换。
```

**示例 3**：
```
输入：n = 4, requests = [[0,3],[3,1],[1,2],[2,0]]
输出：4
```

**约束**：
- `1 <= n <= 20`
- `1 <= requests.length <= 16`
- `requests[i].length == 2`
- `0 <= fromi, toi < n`

**LeetCode链接**：[1601. Maximum Number of Achievable Transfer Requests](https://leetcode.com/problems/maximum-number-of-achievable-transfer-requests/)

## 问题分析

首先要问一个问题：**这个问题的本质是什么？**

这是一个**子集选择问题**，目标是从请求中选出尽可能多的请求，使得所有楼的**进出人数平衡**。关键约束是：
- 每个请求要么选，要么不选
- 选中的请求必须满足：对于每栋楼，进入人数 = 离开人数

现在我要问第二个问题：**为什么是状态压缩？**

因为：
1. **请求数量小**：`requests.length <= 16`，`2^16 = 65536` 可行
2. **枚举所有子集**：用状态压缩枚举所有可能的请求组合
3. **验证约束**：对每个子集，验证是否满足平衡条件

## 解法一：状态压缩（枚举所有子集）

### 思路

**枚举**：
- 用一个 `mask` 表示选中了哪些请求
- 枚举所有可能的 `mask`（`0` 到 `2^m - 1`，m 是请求数量）

**验证**：
- 对于每个 `mask`，计算每栋楼的净变化
- 如果所有楼的净变化都是 0，更新答案

**优化**：
- 记录每个 `mask` 的请求数量（popcount）
- 只在验证通过时更新答案

### 代码实现

```python
def maximumRequests(n, requests):
    """
    枚举所有请求子集，验证是否满足平衡条件
    
    Args:
        n: 楼的数量
        requests: 请求列表，requests[i] = [from, to]
    
    Returns:
        最多可达成的请求数目
    """
    m = len(requests)
    max_count = 0
    
    # 枚举所有子集
    for mask in range(1 << m):
        # 计算每栋楼的净变化
        balance = [0] * n
        count = 0
        
        for i in range(m):
            if mask & (1 << i):  # 请求 i 被选中
                from_building, to_building = requests[i]
                balance[from_building] -= 1
                balance[to_building] += 1
                count += 1
        
        # 验证是否所有楼都平衡
        if all(b == 0 for b in balance):
            max_count = max(max_count, count)
    
    return max_count

# 测试
requests1 = [[0,1],[1,0],[0,1],[1,2],[2,0],[3,4]]
print(maximumRequests(5, requests1))  # 5

requests2 = [[0,0],[1,2],[2,1]]
print(maximumRequests(3, requests2))  # 3

requests3 = [[0,3],[3,1],[1,2],[2,0]]
print(maximumRequests(4, requests3))  # 4
```

**复杂度分析**：
- **时间**：O(2^m × (m + n))
  - 枚举所有子集：O(2^m)
  - 每个子集计算平衡：O(m)
  - 验证平衡：O(n)
- **空间**：O(n)

### 逐步推导

以示例 1 为例，`n = 5`, `requests = [[0,1],[1,0],[0,1],[1,2],[2,0],[3,4]]`

**mask = 0b111110（选中请求 1, 2, 3, 4, 5）**：
```
请求 1: [1,0] → 楼 1: -1, 楼 0: +1
请求 2: [0,1] → 楼 0: -1, 楼 1: +1
请求 3: [1,2] → 楼 1: -1, 楼 2: +1
请求 4: [2,0] → 楼 2: -1, 楼 0: +1
请求 5: [3,4] → 楼 3: -1, 楼 4: +1

balance = [0, 0, 0, -1, +1]  # 不平衡
```

**mask = 0b111111（选中所有请求）**：
```
请求 0: [0,1] → 楼 0: -1, 楼 1: +1
请求 1: [1,0] → 楼 1: -1, 楼 0: +1
请求 2: [0,1] → 楼 0: -1, 楼 1: +1
请求 3: [1,2] → 楼 1: -1, 楼 2: +1
请求 4: [2,0] → 楼 2: -1, 楼 0: +1
请求 5: [3,4] → 楼 3: -1, 楼 4: +1

balance = [0, 0, 0, -1, +1]  # 不平衡
```

**mask = 0b011111（选中请求 0, 1, 2, 3, 4）**：
```
请求 0: [0,1] → 楼 0: -1, 楼 1: +1
请求 1: [1,0] → 楼 1: -1, 楼 0: +1
请求 2: [0,1] → 楼 0: -1, 楼 1: +1
请求 3: [1,2] → 楼 1: -1, 楼 2: +1
请求 4: [2,0] → 楼 2: -1, 楼 0: +1

balance = [0, 0, 0, 0, 0]  # 平衡！count = 5
```

## 解法二：优化（提前终止）

### 问题

在解法一中，即使已经找到了很好的答案，仍然会枚举所有子集。

### 优化思路

1. **按请求数量从大到小枚举**：优先尝试请求数量多的子集
2. **提前终止**：如果当前 `mask` 的请求数量小于已知最优解，跳过

### 代码实现

```python
def maximumRequests_optimized(n, requests):
    """
    优化版本：按请求数量从大到小枚举
    """
    m = len(requests)
    max_count = 0
    
    # 按 popcount 从大到小枚举
    for count in range(m, 0, -1):
        if count <= max_count:
            break  # 剪枝：无法超过已知最优解
        
        # 枚举所有 popcount = count 的 mask
        for mask in range(1 << m):
            if bin(mask).count('1') != count:
                continue
            
            # 验证平衡
            balance = [0] * n
            for i in range(m):
                if mask & (1 << i):
                    from_b, to_b = requests[i]
                    balance[from_b] -= 1
                    balance[to_b] += 1
            
            if all(b == 0 for b in balance):
                max_count = count
                break  # 找到当前 count 的可行解，继续下一个 count
    
    return max_count

# 测试
requests1 = [[0,1],[1,0],[0,1],[1,2],[2,0],[3,4]]
print(maximumRequests_optimized(5, requests1))  # 5
```

**优点**：
- 提前终止，减少枚举次数

**缺点**：
- 代码更复杂
- 最坏情况下与解法一相同

## 解法三：回溯法

### 思路

使用回溯法逐个决定每个请求是否选中。

### 代码实现

```python
def maximumRequests_backtrack(n, requests):
    """
    回溯法
    """
    m = len(requests)
    max_count = [0]  # 使用列表以便在递归中修改
    
    def backtrack(index, balance, count):
        """
        index: 当前考虑的请求下标
        balance: 每栋楼的净变化
        count: 当前选中的请求数量
        """
        if index == m:
            # 检查是否所有楼都平衡
            if all(b == 0 for b in balance):
                max_count[0] = max(max_count[0], count)
            return
        
        # 选择 1：不选当前请求
        backtrack(index + 1, balance, count)
        
        # 选择 2：选当前请求
        from_b, to_b = requests[index]
        balance[from_b] -= 1
        balance[to_b] += 1
        backtrack(index + 1, balance, count + 1)
        # 回溯
        balance[from_b] += 1
        balance[to_b] -= 1
    
    backtrack(0, [0] * n, 0)
    return max_count[0]

# 测试
requests1 = [[0,1],[1,0],[0,1],[1,2],[2,0],[3,4]]
print(maximumRequests_backtrack(5, requests1))  # 5
```

**复杂度分析**：
- **时间**：O(2^m × n)
- **空间**：O(m + n)（递归栈 + balance 数组）

## 优化技巧

### 技巧 1：预处理自环

如果某个请求是自环（`from == to`），可以直接选中。

```python
def maximumRequests_self_loop(n, requests):
    """
    优化：预处理自环
    """
    self_loops = sum(1 for from_b, to_b in requests if from_b == to_b)
    other_requests = [r for r in requests if r[0] != r[1]]
    
    # 对非自环请求进行状态压缩
    m = len(other_requests)
    max_count = 0
    
    for mask in range(1 << m):
        balance = [0] * n
        count = 0
        
        for i in range(m):
            if mask & (1 << i):
                from_b, to_b = other_requests[i]
                balance[from_b] -= 1
                balance[to_b] += 1
                count += 1
        
        if all(b == 0 for b in balance):
            max_count = max(max_count, count)
    
    return max_count + self_loops

# 测试
requests2 = [[0,0],[1,2],[2,1]]
print(maximumRequests_self_loop(3, requests2))  # 3
```

### 技巧 2：剪枝

如果当前 count + 剩余请求数量 < max_count，提前返回。

```python
def backtrack_pruning(index, balance, count, remaining):
    nonlocal max_count
    
    if count + remaining <= max_count:
        return  # 剪枝
    
    if index == m:
        if all(b == 0 for b in balance):
            max_count = max(max_count, count)
        return
    
    # 不选
    backtrack_pruning(index + 1, balance, count, remaining - 1)
    
    # 选
    from_b, to_b = requests[index]
    balance[from_b] -= 1
    balance[to_b] += 1
    backtrack_pruning(index + 1, balance, count + 1, remaining - 1)
    balance[from_b] += 1
    balance[to_b] -= 1
```

### 技巧 3：位运算优化

使用 `popcount` 快速计算请求数量。

```python
def popcount(mask):
    """
    计算 mask 中 1 的个数
    """
    count = 0
    while mask:
        mask &= mask - 1
        count += 1
    return count

# 或使用内置函数
count = bin(mask).count('1')
```

## 常见错误

### 错误 1：忘记回溯

```python
# 错误
balance[from_b] -= 1
balance[to_b] += 1
backtrack(index + 1, balance, count + 1)
# 忘记回溯！

# 正确
balance[from_b] -= 1
balance[to_b] += 1
backtrack(index + 1, balance, count + 1)
balance[from_b] += 1
balance[to_b] -= 1
```

### 错误 2：验证条件错误

```python
# 错误：使用 sum 验证
if sum(balance) == 0:  # 错误！可能有正负抵消

# 正确：检查每个楼
if all(b == 0 for b in balance):
    ...
```

### 错误 3：边界条件

```python
# 错误：忘记处理空请求
if not requests:
    return 0  # 需要特判
```

## 扩展问题

### 扩展 1：最小拒绝请求数

> 求最少需要拒绝多少个请求才能满足平衡条件。

```python
def minimumRejectedRequests(n, requests):
    max_accepted = maximumRequests(n, requests)
    return len(requests) - max_accepted
```

### 扩展 2：带权重的请求

> 每个请求有权重，目标是最大化选中请求的总权重。

```python
def maximumWeightedRequests(n, requests, weights):
    """
    dp[mask] = 选中 mask 请求的最大权重（如果平衡）
    """
    m = len(requests)
    max_weight = 0
    
    for mask in range(1 << m):
        balance = [0] * n
        weight = 0
        
        for i in range(m):
            if mask & (1 << i):
                from_b, to_b = requests[i]
                balance[from_b] -= 1
                balance[to_b] += 1
                weight += weights[i]
        
        if all(b == 0 for b in balance):
            max_weight = max(max_weight, weight)
    
    return max_weight
```

### 扩展 3：多次换楼

> 允许员工多次换楼，求最少换楼次数使所有楼平衡。

这变成了**最小费用流**问题。

## 性能对比

| 方法 | 时间复杂度 | 空间复杂度 | 代码复杂度 |
|-----|-----------|-----------|-----------|
| 状态压缩 | O(2^m × (m + n)) | O(n) | 简单 |
| 回溯法 | O(2^m × n) | O(m + n) | 简单 |
| 优化枚举 | O(2^m × n) | O(n) | 中等 |

## 小结

### 核心思想
1. **枚举所有子集**：用状态压缩枚举所有可能的请求组合
2. **验证约束**：对每个子集，检查是否所有楼都平衡
3. **更新答案**：记录满足条件的最大请求数量

### 关键技巧
- 状态压缩枚举：`for mask in range(1 << m)`
- 验证平衡：`all(b == 0 for b in balance)`
- 优化剪枝：提前终止、预处理自环
- 回溯法：逐个决定请求是否选中

### 适用场景
- 子集选择问题
- 平衡/匹配问题
- 资源分配问题
- 任务调度问题

这道题展示了状态压缩在子集枚举问题中的应用，是练习状态压缩的好题目！
