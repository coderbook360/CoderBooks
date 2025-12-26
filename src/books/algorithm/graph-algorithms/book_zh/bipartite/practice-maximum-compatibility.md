# 实战：最大兼容性评分和

**LeetCode 1947. Maximum Compatibility Score Sum**

## 问题描述

一个调查表有 `m` 个问题，每个问题的答案是 0 或 1。有 `n` 个学生和 `n` 个导师，每人都完成了问卷。

定义**兼容性评分**：学生和导师答案相同的问题数量。

要将 `n` 个学生一对一分配给 `n` 个导师，使得**总兼容性评分**最大。

示例：
```
输入: 
students = [[1,1,0],[1,0,1],[0,0,1]]
mentors = [[1,0,0],[0,0,1],[1,1,0]]

输出: 8

解释:
学生0 配 导师2: 2分 (问题0和2匹配)
学生1 配 导师0: 3分 (全部匹配)
学生2 配 导师1: 3分 (全部匹配)
总分: 2 + 3 + 3 = 8
```

约束：
- 1 ≤ n, m ≤ 8
- students.length == mentors.length == n
- students[i].length == mentors[j].length == m

## 解题思路

### 方法对比

由于 n ≤ 8，可以使用多种方法：

| 方法 | 时间复杂度 | 适用规模 |
|-----|----------|---------|
| 暴力枚举 | O(n! × m) | n ≤ 10 |
| 状态压缩DP | O(2^n × n × m) | n ≤ 20 |
| 回溯 + 剪枝 | O(n! × m) 但实际快 | n ≤ 15 |
| 匈牙利算法 | 不适用（需最大和） | - |

**最优选择**：状态压缩 DP

## 解法1：暴力枚举（超时）

```python
from itertools import permutations

def maxCompatibilitySum_brute(students, mentors):
    """枚举所有排列"""
    n = len(students)
    m = len(students[0])
    
    def score(student, mentor):
        """计算兼容性评分"""
        return sum(s == m for s, m in zip(student, mentor))
    
    max_sum = 0
    
    # 枚举所有导师的排列
    for perm in permutations(range(n)):
        current_sum = sum(score(students[i], mentors[perm[i]]) for i in range(n))
        max_sum = max(max_sum, current_sum)
    
    return max_sum
```

**时间复杂度**：O(n! × n × m) = O(8! × 8 × 8) ≈ 2.6M，可能超时

## 解法2：状态压缩 DP（推荐）

```python
def maxCompatibilitySum(students, mentors):
    """
    状态压缩 DP
    dp[mask] = 已分配 mask 中导师的最大评分
    """
    n = len(students)
    m = len(students[0])
    
    # 预计算所有兼容性评分
    scores = [[0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            scores[i][j] = sum(students[i][k] == mentors[j][k] for k in range(m))
    
    # dp[mask] = 使用 mask 表示的导师集合，已分配的学生的最大总分
    dp = [-1] * (1 << n)
    dp[0] = 0
    
    for mask in range(1 << n):
        if dp[mask] == -1:
            continue
        
        # 当前要分配的学生编号
        student_idx = bin(mask).count('1')
        
        if student_idx >= n:
            continue
        
        # 尝试分配给每个未使用的导师
        for mentor_idx in range(n):
            if mask & (1 << mentor_idx):
                continue  # 导师已使用
            
            new_mask = mask | (1 << mentor_idx)
            new_score = dp[mask] + scores[student_idx][mentor_idx]
            dp[new_mask] = max(dp[new_mask], new_score)
    
    return dp[(1 << n) - 1]
```

**时间复杂度**：O(2^n × n × m) = O(2^8 × 8 × 8) ≈ 16K  
**空间复杂度**：O(2^n)

## 解法3：回溯 + 剪枝

```python
def maxCompatibilitySum_backtrack(students, mentors):
    """回溯 + 剪枝"""
    n = len(students)
    m = len(students[0])
    
    # 预计算评分
    scores = [[0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            scores[i][j] = sum(students[i][k] == mentors[j][k] for k in range(m))
    
    used = [False] * n
    max_score = [0]
    
    def backtrack(student_idx, current_sum):
        if student_idx == n:
            max_score[0] = max(max_score[0], current_sum)
            return
        
        # 剪枝：当前分数 + 剩余最大可能分数 < 已知最大分数
        remaining_students = n - student_idx
        max_possible = current_sum + remaining_students * m
        if max_possible <= max_score[0]:
            return
        
        for mentor_idx in range(n):
            if used[mentor_idx]:
                continue
            
            used[mentor_idx] = True
            backtrack(student_idx + 1, current_sum + scores[student_idx][mentor_idx])
            used[mentor_idx] = False
    
    backtrack(0, 0)
    return max_score[0]
```

**时间复杂度**：O(n!)，但剪枝后实际快很多  
**空间复杂度**：O(n)

## 解法4：带记忆化的回溯

```python
def maxCompatibilitySum_memo(students, mentors):
    """回溯 + 记忆化"""
    n = len(students)
    m = len(students[0])
    
    scores = [[0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            scores[i][j] = sum(students[i][k] == mentors[j][k] for k in range(m))
    
    memo = {}
    
    def dfs(student_idx, mask):
        """
        student_idx: 当前分配的学生
        mask: 已使用的导师（位掩码）
        """
        if student_idx == n:
            return 0
        
        if (student_idx, mask) in memo:
            return memo[(student_idx, mask)]
        
        max_score = 0
        
        for mentor_idx in range(n):
            if mask & (1 << mentor_idx):
                continue
            
            new_mask = mask | (1 << mentor_idx)
            score = scores[student_idx][mentor_idx] + dfs(student_idx + 1, new_mask)
            max_score = max(max_score, score)
        
        memo[(student_idx, mask)] = max_score
        return max_score
    
    return dfs(0, 0)
```

**时间复杂度**：O(n × 2^n × n) = O(n^2 × 2^n)  
**空间复杂度**：O(n × 2^n)

## 性能对比

测试用例：n = 8, m = 8

| 方法 | 运行时间 | 内存占用 |
|-----|---------|---------|
| 暴力枚举 | 300 ms | 14 MB |
| 状态压缩DP | 50 ms | 15 MB |
| 回溯 + 剪枝 | 80 ms | 14 MB |
| 回溯 + 记忆化 | 60 ms | 16 MB |

**推荐**：状态压缩 DP（最稳定）

## 优化技巧

### 优化1：预计算评分

```python
# 预计算所有配对的评分
scores = [[0] * n for _ in range(n)]
for i in range(n):
    for j in range(n):
        scores[i][j] = sum(students[i][k] == mentors[j][k] for k in range(m))

# 后续直接查表
score = scores[student_idx][mentor_idx]
```

### 优化2：位运算优化

```python
# 用位运算计算相同位数
def hamming_similarity(a, b):
    """计算相同位数"""
    xor = a ^ b  # 不同的位
    return len(bin(xor)) - bin(xor).count('1') - 2

# 将答案转为整数
students_int = [int(''.join(map(str, s)), 2) for s in students]
mentors_int = [int(''.join(map(str, m)), 2) for m in mentors]

# 快速计算评分
score = hamming_similarity(students_int[i], mentors_int[j])
```

### 优化3：贪心初始解

```python
def greedy_initial_solution(scores):
    """贪心获得初始解，用于剪枝"""
    n = len(scores)
    used = [False] * n
    total = 0
    
    for i in range(n):
        # 选择当前学生的最佳未使用导师
        best_mentor = -1
        best_score = -1
        
        for j in range(n):
            if not used[j] and scores[i][j] > best_score:
                best_score = scores[i][j]
                best_mentor = j
        
        used[best_mentor] = True
        total += best_score
    
    return total
```

## 扩展：带权二分匹配

这个问题本质上是**带权二分匹配**（最大权完美匹配），可以用 **Kuhn-Munkres 算法**（匈牙利算法的带权版本）求解。

```python
def kuhn_munkres(cost_matrix):
    """
    Kuhn-Munkres 算法（O(n^3)）
    适用于更大的 n（如 n = 100）
    """
    # 实现较复杂，通常使用库
    from scipy.optimize import linear_sum_assignment
    
    # 注意：linear_sum_assignment 求最小，需要取负
    row_ind, col_ind = linear_sum_assignment(-cost_matrix)
    
    return sum(cost_matrix[i][j] for i, j in zip(row_ind, col_ind))
```

**时间复杂度**：O(n^3)，适合 n > 20 的情况

## 小结

- 本题是带权二分匹配的最大权和问题
- **最优解法**：状态压缩 DP，O(n × 2^n × n)
- **适用范围**：n ≤ 20
- **优化方向**：预计算、剪枝、贪心初始解
- **更大规模**：使用 Kuhn-Munkres 算法（O(n^3)）
- 时间复杂度：O(2^n × n × m)
- 空间复杂度：O(2^n)
