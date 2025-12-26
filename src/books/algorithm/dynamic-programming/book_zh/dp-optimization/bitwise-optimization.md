# 状态压缩与位运算优化

## 核心思想

> 当状态空间较小（通常 n ≤ 20）时，用二进制数表示状态，结合位运算实现高效的状态转移和查询。

**优化方向**：
1. **空间优化**：用整数代替数组/集合
2. **时间优化**：位运算比普通操作快
3. **代码简洁**：一行位运算完成复杂逻辑

## 位运算基础

### 常用操作

```python
# 检查第 i 位是否为 1
def is_set(mask, i):
    return (mask >> i) & 1

# 设置第 i 位为 1
def set_bit(mask, i):
    return mask | (1 << i)

# 清除第 i 位（设为 0）
def clear_bit(mask, i):
    return mask & ~(1 << i)

# 翻转第 i 位
def toggle_bit(mask, i):
    return mask ^ (1 << i)

# 获取最低位的 1
def lowest_bit(mask):
    return mask & (-mask)

# 清除最低位的 1
def clear_lowest_bit(mask):
    return mask & (mask - 1)

# 统计 1 的个数
def popcount(mask):
    return bin(mask).count('1')

# 枚举所有子集
def subsets(mask):
    sub = mask
    while sub:
        yield sub
        sub = (sub - 1) & mask
```

### 集合操作

```python
# 并集
union = mask1 | mask2

# 交集
intersection = mask1 & mask2

# 差集
difference = mask1 & ~mask2

# 对称差
xor_diff = mask1 ^ mask2

# 子集判断
is_subset = (mask1 & mask2) == mask1

# 补集（n 位）
complement = ((1 << n) - 1) ^ mask
```

## DP 应用

### 示例一：旅行商问题（TSP）

**问题**：访问所有城市恰好一次，回到起点，最小化总距离。

**状态定义**：
```
dp[mask][i] = 访问过的城市集合为 mask，当前在城市 i 的最短路径
```

**状态转移**：
```
dp[mask][i] = min(dp[mask ^ (1<<i)][j] + dist[j][i])
             (j 在 mask 中，且 j != i)
```

**代码实现**：
```python
def tsp(dist):
    """
    旅行商问题 - 状态压缩DP
    """
    n = len(dist)
    ALL = (1 << n) - 1
    
    # dp[mask][i] = 访问 mask 中的城市，当前在 i 的最短距离
    dp = [[float('inf')] * n for _ in range(1 << n)]
    dp[1][0] = 0  # 从城市 0 开始
    
    for mask in range(1, 1 << n):
        for i in range(n):
            if not (mask & (1 << i)):
                continue
            
            # 从 j 转移到 i
            prev_mask = mask ^ (1 << i)
            for j in range(n):
                if prev_mask & (1 << j):
                    dp[mask][i] = min(dp[mask][i], 
                                     dp[prev_mask][j] + dist[j][i])
    
    # 回到起点
    return min(dp[ALL][i] + dist[i][0] for i in range(1, n))

# 测试
dist = [[0, 10, 15, 20],
        [10, 0, 35, 25],
        [15, 35, 0, 30],
        [20, 25, 30, 0]]
print(tsp(dist))  # 80
```

**复杂度**：O(2ⁿ × n²)

### 示例二：分配问题

**问题**：n 个任务分配给 n 个人，每人一个任务，最小化总代价。

**状态定义**：
```
dp[mask] = 已分配的任务集合为 mask 的最小代价
```

**状态转移**：
```
dp[mask | (1<<j)] = min(dp[mask | (1<<j)], 
                        dp[mask] + cost[popcount(mask)][j])
```

**代码实现**：
```python
def assignmentProblem(cost):
    """
    任务分配问题
    """
    n = len(cost)
    dp = [float('inf')] * (1 << n)
    dp[0] = 0
    
    for mask in range(1 << n):
        person = bin(mask).count('1')  # 当前分配到第几个人
        
        if person >= n:
            continue
        
        for task in range(n):
            if not (mask & (1 << task)):
                new_mask = mask | (1 << task)
                dp[new_mask] = min(dp[new_mask], 
                                  dp[mask] + cost[person][task])
    
    return dp[(1 << n) - 1]

# 测试
cost = [[9, 2, 7, 8],
        [6, 4, 3, 7],
        [5, 8, 1, 8],
        [7, 6, 9, 4]]
print(assignmentProblem(cost))  # 13
```

### 示例三：子集和问题

**问题**：数组能否分成两个和相等的子集？

**状态压缩**：
```python
def canPartition(nums):
    """
    状态压缩：用位表示可达的和
    """
    total = sum(nums)
    if total % 2 == 1:
        return False
    
    target = total // 2
    dp = 1  # 初始状态：和为 0 可达
    
    for num in nums:
        # 左移 num 位表示加上 num
        dp |= (dp << num)
    
    # 检查 target 位是否为 1
    return (dp >> target) & 1

# 测试
print(canPartition([1, 5, 11, 5]))  # True
print(canPartition([1, 2, 3, 5]))   # False
```

**原理**：
- `dp` 是一个整数，第 i 位为 1 表示和为 i 可达
- `dp << num` 表示所有可达状态加上 num
- `dp |= (dp << num)` 合并新状态

### 示例四：最短超级串

**问题**：给定字符串数组，找最短的超级串（包含所有字符串）。

**状态定义**：
```
dp[mask][i] = 包含 mask 中的字符串，最后一个是 i 的最短长度
```

**代码**（简化版）：
```python
def shortestSuperstring(words):
    n = len(words)
    
    # 预处理：重叠长度
    overlap = [[0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            if i == j:
                continue
            for k in range(min(len(words[i]), len(words[j])), 0, -1):
                if words[i][-k:] == words[j][:k]:
                    overlap[i][j] = k
                    break
    
    # DP
    dp = [[float('inf')] * n for _ in range(1 << n)]
    parent = [[(-1, -1)] * n for _ in range(1 << n)]
    
    for i in range(n):
        dp[1 << i][i] = len(words[i])
    
    for mask in range(1, 1 << n):
        for i in range(n):
            if not (mask & (1 << i)):
                continue
            
            prev_mask = mask ^ (1 << i)
            if prev_mask == 0:
                continue
            
            for j in range(n):
                if not (prev_mask & (1 << j)):
                    continue
                
                new_len = dp[prev_mask][j] + len(words[i]) - overlap[j][i]
                if new_len < dp[mask][i]:
                    dp[mask][i] = new_len
                    parent[mask][i] = (prev_mask, j)
    
    # 找最小值
    final_mask = (1 << n) - 1
    last = min(range(n), key=lambda i: dp[final_mask][i])
    
    return dp[final_mask][last]

# 测试
print(shortestSuperstring(["catg", "ctaagt", "gcta", "ttca", "atgcatc"]))
```

## 位运算优化技巧

### 枚举子集

**O(3ⁿ) 枚举所有子集的子集**：
```python
def enumerate_all_subsets(mask):
    """
    枚举 mask 的所有子集
    """
    sub = mask
    while sub:
        # 处理 sub
        print(bin(sub))
        sub = (sub - 1) & mask
```

### 枚举固定 popcount 的状态

```python
def enumerate_k_bits(n, k):
    """
    枚举 n 位中恰好 k 个 1 的所有状态
    """
    mask = (1 << k) - 1
    limit = 1 << n
    
    while mask < limit:
        yield mask
        # Gosper's Hack
        c = mask & -mask
        r = mask + c
        mask = (((r ^ mask) >> 2) // c) | r
```

### 快速幂

```python
def fast_power(base, exp, mod):
    """
    快速幂：base^exp % mod
    """
    result = 1
    while exp:
        if exp & 1:
            result = (result * base) % mod
        base = (base * base) % mod
        exp >>= 1
    return result
```

## 小结

| 技巧 | 复杂度 | 适用场景 |
|-----|-------|---------|
| 状态压缩DP | O(2ⁿ × ...) | n ≤ 20，集合状态 |
| 子集枚举 | O(3ⁿ) | 遍历子集 |
| 位运算集合 | O(1) | 集合操作 |
| Gosper's Hack | O(C(n,k)) | 固定popcount |

**优化原则**：
1. n ≤ 20 → 考虑状态压缩
2. 集合操作 → 用位运算
3. 子集遍历 → `(sub-1) & mask`
4. DP 中的集合 → 用整数表示
