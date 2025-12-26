# LeetCode 943: 最短超级串

## 问题描述

> 给定一个字符串数组 `words`，找到一个最短的字符串，使得 `words` 中的每个字符串都是这个字符串的子串。如果有多个答案，返回任意一个。

**示例 1**：
```
输入：words = ["alex","loves","leetcode"]
输出："alexlovesleetcode"
解释："alex", "loves", "leetcode" 都是 "alexlovesleetcode" 的子串
```

**示例 2**：
```
输入：words = ["catg","ctaagt","gcta","ttca","atgcatc"]
输出："gctaagttcatgcatc"
```

**约束**：
- `1 <= words.length <= 12`
- `1 <= words[i].length <= 20`
- `words[i]` 由小写英文字母组成
- `words` 中所有字符串互不相同

**LeetCode链接**：[943. Find the Shortest Superstring](https://leetcode.com/problems/find-the-shortest-superstring/)

## 问题分析

首先要问一个问题：**这个问题的本质是什么？**

这是一个**字符串拼接优化问题**，目标是找到一个最短的超级串，使得所有字符串都是它的子串。关键在于：
- 字符串之间可能有**重叠部分**
- 拼接顺序会影响最终长度
- 需要找到最优的拼接顺序和重叠策略

现在我要问第二个问题：**为什么是状态压缩 DP？**

因为：
1. **状态是集合**：已使用的字符串集合
2. **规模小**：`words.length <= 12`，`2^12 = 4096` 可行
3. **顺序重要**：不同的拼接顺序导致不同的重叠

## 解法一：状态压缩 DP（基础版）

### 思路

**状态定义**：
- `dp[mask][i]` = 使用了 `mask` 中的字符串，最后一个字符串是 `i`，能构成的最短超级串长度

**状态转移**：
- 枚举下一个字符串 `j`（不在 `mask` 中）
- 计算 `i` 和 `j` 的重叠长度 `overlap[i][j]`
- `dp[new_mask][j] = min(dp[new_mask][j], dp[mask][i] + len(words[j]) - overlap[i][j])`

**初始化**：
- `dp[1 << i][i] = len(words[i])`（只使用字符串 `i`）

**答案**：
- 找到 `dp[(1 << n) - 1][i]` 的最小值

### 代码实现

```python
def shortestSuperstring(words):
    n = len(words)
    
    # 1. 预计算重叠长度
    overlap = [[0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            if i == j:
                continue
            # 计算 words[i] 的后缀与 words[j] 的前缀的最大重叠
            max_len = min(len(words[i]), len(words[j]))
            for k in range(max_len, 0, -1):
                if words[i][-k:] == words[j][:k]:
                    overlap[i][j] = k
                    break
    
    # 2. 状态压缩 DP
    dp = [[float('inf')] * n for _ in range(1 << n)]
    parent = [[-1] * n for _ in range(1 << n)]
    
    # 初始化：只使用一个字符串
    for i in range(n):
        dp[1 << i][i] = len(words[i])
    
    # 状态转移
    for mask in range(1 << n):
        for i in range(n):
            if not (mask & (1 << i)):  # i 不在 mask 中
                continue
            if dp[mask][i] == float('inf'):
                continue
            
            # 尝试添加字符串 j
            for j in range(n):
                if mask & (1 << j):  # j 已在 mask 中
                    continue
                
                new_mask = mask | (1 << j)
                new_len = dp[mask][i] + len(words[j]) - overlap[i][j]
                
                if new_len < dp[new_mask][j]:
                    dp[new_mask][j] = new_len
                    parent[new_mask][j] = i
    
    # 3. 找到最优解
    full_mask = (1 << n) - 1
    min_len = float('inf')
    last = -1
    for i in range(n):
        if dp[full_mask][i] < min_len:
            min_len = dp[full_mask][i]
            last = i
    
    # 4. 重构路径
    path = []
    mask = full_mask
    while last != -1:
        path.append(last)
        prev = parent[mask][last]
        mask ^= (1 << last)
        last = prev
    path.reverse()
    
    # 5. 构建超级串
    result = words[path[0]]
    for i in range(1, len(path)):
        prev_idx = path[i - 1]
        cur_idx = path[i]
        overlap_len = overlap[prev_idx][cur_idx]
        result += words[cur_idx][overlap_len:]
    
    return result

# 测试
words1 = ["alex", "loves", "leetcode"]
print(shortestSuperstring(words1))  # "alexlovesleetcode"

words2 = ["catg", "ctaagt", "gcta", "ttca", "atgcatc"]
print(shortestSuperstring(words2))  # "gctaagttcatgcatc"
```

**复杂度分析**：
- **时间**：O(n^2 × 2^n)
  - 预计算重叠：O(n^2 × L^2)，L 是字符串平均长度
  - DP：O(2^n × n^2)
  - 重构路径：O(n × L)
- **空间**：O(n × 2^n)

## 解法二：优化重叠计算

### 问题

在解法一中，重叠计算部分效率较低：
```python
for k in range(max_len, 0, -1):
    if words[i][-k:] == words[j][:k]:
        overlap[i][j] = k
        break
```

### 优化思路

使用 **KMP 算法** 或 **滚动哈希** 加速重叠计算。

### 代码实现（滚动哈希）

```python
def compute_overlap_hash(words):
    """
    使用滚动哈希计算重叠
    """
    n = len(words)
    overlap = [[0] * n for _ in range(n)]
    
    BASE = 26
    MOD = 10**9 + 7
    
    def get_hash(s):
        h = 0
        for c in s:
            h = (h * BASE + ord(c) - ord('a')) % MOD
        return h
    
    for i in range(n):
        for j in range(n):
            if i == j:
                continue
            
            max_len = min(len(words[i]), len(words[j]))
            for k in range(max_len, 0, -1):
                suffix_hash = get_hash(words[i][-k:])
                prefix_hash = get_hash(words[j][:k])
                
                if suffix_hash == prefix_hash and words[i][-k:] == words[j][:k]:
                    overlap[i][j] = k
                    break
    
    return overlap
```

**但这样优化并不明显**，因为 `n` 很小（≤12），字符串长度也不大（≤20）。

## 解法三：记忆化搜索

### 思路

使用 DFS + 记忆化代替 DP 迭代。

### 代码实现

```python
from functools import lru_cache

def shortestSuperstring_dfs(words):
    n = len(words)
    
    # 预计算重叠
    overlap = [[0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            if i == j:
                continue
            max_len = min(len(words[i]), len(words[j]))
            for k in range(max_len, 0, -1):
                if words[i][-k:] == words[j][:k]:
                    overlap[i][j] = k
                    break
    
    @lru_cache(maxsize=None)
    def dfs(mask, last):
        """
        已使用 mask 中的字符串，最后一个是 last
        返回 (最短长度, 路径)
        """
        if mask == (1 << n) - 1:
            return 0, []
        
        best_len = float('inf')
        best_path = []
        
        for nxt in range(n):
            if mask & (1 << nxt):
                continue
            
            new_mask = mask | (1 << nxt)
            add_len = len(words[nxt]) - overlap[last][nxt]
            sub_len, sub_path = dfs(new_mask, nxt)
            
            total_len = add_len + sub_len
            if total_len < best_len:
                best_len = total_len
                best_path = [nxt] + sub_path
        
        return best_len, best_path
    
    # 尝试每个起点
    min_len = float('inf')
    best_result = ""
    
    for start in range(n):
        length, path = dfs(1 << start, start)
        length += len(words[start])
        
        if length < min_len:
            min_len = length
            path = [start] + path
            
            # 构建字符串
            result = words[path[0]]
            for i in range(1, len(path)):
                prev_idx = path[i - 1]
                cur_idx = path[i]
                overlap_len = overlap[prev_idx][cur_idx]
                result += words[cur_idx][overlap_len:]
            
            best_result = result
    
    return best_result
```

**优点**：
- 代码更简洁
- 更容易理解

**缺点**：
- 路径重构更复杂
- 需要存储路径信息

## 优化技巧

### 技巧 1：剪枝

如果某个字符串是另一个字符串的子串，可以直接移除。

```python
def remove_substrings(words):
    """
    移除是其他字符串子串的字符串
    """
    n = len(words)
    is_substring = [False] * n
    
    for i in range(n):
        for j in range(n):
            if i != j and words[i] in words[j]:
                is_substring[i] = True
                break
    
    return [words[i] for i in range(n) if not is_substring[i]]

# 使用
words = remove_substrings(words)
```

### 技巧 2：初始化优化

如果某个字符串特别长，可以优先作为起点。

```python
# 按长度排序
words.sort(key=len, reverse=True)
```

### 技巧 3：状态剪枝

如果当前长度已经超过已知最优解，提前返回。

```python
if dp[mask][i] >= min_len:
    continue
```

## 常见错误

### 错误 1：重叠计算错误

```python
# 错误：忘记反向枚举
for k in range(1, max_len + 1):  # 错误！
    if words[i][-k:] == words[j][:k]:
        overlap[i][j] = k
        break  # 错误！会找到最小重叠而不是最大重叠

# 正确：反向枚举
for k in range(max_len, 0, -1):
    if words[i][-k:] == words[j][:k]:
        overlap[i][j] = k
        break
```

### 错误 2：路径重构错误

```python
# 错误：忘记反转路径
path = []
while last != -1:
    path.append(last)
    ...
# 忘记 path.reverse()

# 正确
path.reverse()
```

### 错误 3：字符串拼接错误

```python
# 错误：重复添加重叠部分
result += words[cur_idx]  # 错误！

# 正确：跳过重叠部分
result += words[cur_idx][overlap_len:]
```

## 扩展问题

### 扩展 1：返回所有最短超级串

```python
def all_shortest_superstrings(words):
    """
    返回所有长度最短的超级串
    """
    # 修改 DP，记录所有达到最优解的路径
    # ...
    pass
```

### 扩展 2：最长公共超级串

如果目标是找最长的包含所有字符串的超级串，如何修改？

**答案**：改为最大化重叠。

```python
# 状态转移改为
dp[new_mask][j] = max(dp[new_mask][j], dp[mask][i] + overlap[i][j])
```

### 扩展 3：带权重的超级串

如果每个字符串有权重，目标是最小化加权长度，如何修改？

```python
# 状态转移改为
new_len = dp[mask][i] + weight[j] * (len(words[j]) - overlap[i][j])
```

## 性能对比

| 方法 | 时间复杂度 | 空间复杂度 | 代码复杂度 |
|-----|-----------|-----------|-----------|
| 暴力枚举 | O(n! × L) | O(L) | 简单 |
| 状态压缩 DP | O(n^2 × 2^n) | O(n × 2^n) | 中等 |
| 记忆化搜索 | O(n^2 × 2^n) | O(n × 2^n) | 中等 |

## 小结

### 核心思想
1. **预计算重叠**：计算每对字符串的最大重叠长度
2. **状态压缩 DP**：`dp[mask][i]` 表示使用 `mask` 中的字符串，最后一个是 `i` 的最短长度
3. **状态转移**：枚举下一个字符串，最小化总长度
4. **路径重构**：回溯 `parent` 数组构建最优顺序

### 关键技巧
- 重叠计算要反向枚举（找最大重叠）
- 路径重构后要反转
- 字符串拼接要跳过重叠部分
- 可以剪枝移除子串

### 适用场景
- 字符串拼接优化
- DNA 序列拼接
- 文本压缩
- 路径规划（类似 TSP）

这道题完美展示了状态压缩 DP 在字符串问题中的应用！

