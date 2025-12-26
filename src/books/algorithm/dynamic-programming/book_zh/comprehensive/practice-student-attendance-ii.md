# 学生出勤记录 II（LeetCode 552）

## 问题描述

> 学生出勤记录由 'A'（缺勤）、'L'（迟到）、'P'（到场）组成。如果记录满足以下条件，则可以获得奖励：
> - 总缺勤（'A'）次数不超过 1 次
> - 不能有连续 3 次或以上的迟到（'L'）
> 
> 给定 n，求长度为 n 的可奖励出勤记录数量。结果对 10^9+7 取模。

**示例**：
```
输入：n = 2
输出：8
解释：8 种可能：
"PP", "AP", "PA", "LP", "PL", "AL", "LA", "LL"

输入：n = 1
输出：3
解释："A", "L", "P"

输入：n = 10101
输出：183236316
```

## 解法一：动态规划

**状态定义**：
```
dp[i][j][k] = 长度为 i，已有 j 次缺勤，结尾有 k 次连续迟到的方案数
```

**约束**：
- `j ≤ 1`（最多 1 次缺勤）
- `k ≤ 2`（最多连续 2 次迟到）

**状态转移**：
```python
# 添加 'P'（到场）
dp[i+1][j][0] += dp[i][j][k]  (k = 0, 1, 2)

# 添加 'A'（缺勤）
dp[i+1][j+1][0] += dp[i][j][k]  (j = 0, k = 0,1,2)

# 添加 'L'（迟到）
dp[i+1][j][k+1] += dp[i][j][k]  (k = 0, 1)
```

**完整代码**：
```python
def checkRecord(n):
    """
    DP 解法
    """
    MOD = 10**9 + 7
    
    # dp[i][j][k]
    # i: 长度（0 到 n）
    # j: 缺勤次数（0 或 1）
    # k: 结尾连续迟到次数（0, 1, 2）
    dp = [[[0] * 3 for _ in range(2)] for _ in range(n + 1)]
    dp[0][0][0] = 1
    
    for i in range(n):
        for j in range(2):
            for k in range(3):
                if dp[i][j][k] == 0:
                    continue
                
                # 添加 'P'
                dp[i+1][j][0] = (dp[i+1][j][0] + dp[i][j][k]) % MOD
                
                # 添加 'A'（如果 j < 1）
                if j < 1:
                    dp[i+1][j+1][0] = (dp[i+1][j+1][0] + dp[i][j][k]) % MOD
                
                # 添加 'L'（如果 k < 2）
                if k < 2:
                    dp[i+1][j][k+1] = (dp[i+1][j][k+1] + dp[i][j][k]) % MOD
    
    # 统计所有合法状态
    result = 0
    for j in range(2):
        for k in range(3):
            result = (result + dp[n][j][k]) % MOD
    
    return result

# 测试
print(checkRecord(2))      # 8
print(checkRecord(1))      # 3
print(checkRecord(10101))  # 183236316
```

**复杂度**：
- 时间：O(n × 2 × 3) = O(n)
- 空间：O(n × 2 × 3) = O(n)

## 解法二：空间优化（滚动数组）

```python
def checkRecord_optimized(n):
    """
    空间优化到 O(1)
    """
    MOD = 10**9 + 7
    
    # 只需要前一天的状态
    dp = [[0] * 3 for _ in range(2)]
    dp[0][0] = 1
    
    for _ in range(n):
        new_dp = [[0] * 3 for _ in range(2)]
        
        for j in range(2):
            for k in range(3):
                if dp[j][k] == 0:
                    continue
                
                # 添加 'P'
                new_dp[j][0] = (new_dp[j][0] + dp[j][k]) % MOD
                
                # 添加 'A'
                if j < 1:
                    new_dp[j+1][0] = (new_dp[j+1][0] + dp[j][k]) % MOD
                
                # 添加 'L'
                if k < 2:
                    new_dp[j][k+1] = (new_dp[j][k+1] + dp[j][k]) % MOD
        
        dp = new_dp
    
    result = 0
    for j in range(2):
        for k in range(3):
            result = (result + dp[j][k]) % MOD
    
    return result
```

**复杂度**：
- 时间：O(n)
- 空间：O(1)

## 解法三：矩阵快速幂

**核心思想**：状态转移可以表示为矩阵乘法。

**状态向量**：
```
state = [
    dp[0][0],  # 0次A，0次连续L
    dp[0][1],  # 0次A，1次连续L
    dp[0][2],  # 0次A，2次连续L
    dp[1][0],  # 1次A，0次连续L
    dp[1][1],  # 1次A，1次连续L
    dp[1][2]   # 1次A，2次连续L
]
```

**转移矩阵**：
```
M = [
  P  L  L  A  A  A
 [1, 1, 0, 1, 0, 0],  # dp[0][0]
 [1, 0, 1, 1, 0, 0],  # dp[0][1]
 [1, 0, 0, 1, 0, 0],  # dp[0][2]
 [0, 0, 0, 1, 1, 0],  # dp[1][0]
 [0, 0, 0, 1, 0, 1],  # dp[1][1]
 [0, 0, 0, 1, 0, 0]   # dp[1][2]
]
```

**代码实现**：
```python
def checkRecord_matrix(n):
    """
    矩阵快速幂
    """
    MOD = 10**9 + 7
    
    # 转移矩阵
    M = [
        [1, 1, 0, 1, 0, 0],
        [1, 0, 1, 1, 0, 0],
        [1, 0, 0, 1, 0, 0],
        [0, 0, 0, 1, 1, 0],
        [0, 0, 0, 1, 0, 1],
        [0, 0, 0, 1, 0, 0]
    ]
    
    def matrix_multiply(A, B):
        """矩阵乘法"""
        size = len(A)
        C = [[0] * size for _ in range(size)]
        for i in range(size):
            for j in range(size):
                for k in range(size):
                    C[i][j] = (C[i][j] + A[i][k] * B[k][j]) % MOD
        return C
    
    def matrix_power(M, n):
        """矩阵快速幂"""
        size = len(M)
        result = [[1 if i == j else 0 for j in range(size)] for i in range(size)]
        
        while n:
            if n & 1:
                result = matrix_multiply(result, M)
            M = matrix_multiply(M, M)
            n >>= 1
        
        return result
    
    # 初始状态
    initial = [1, 0, 0, 0, 0, 0]
    
    # M^n
    M_n = matrix_power(M, n)
    
    # 计算结果
    result = 0
    for i in range(6):
        for j in range(6):
            result = (result + M_n[j][i] * initial[i]) % MOD
    
    return result

# 测试
print(checkRecord_matrix(10101))
```

**复杂度**：
- 时间：O(6³ × log n) = O(log n)
- 空间：O(6²) = O(1)

## 状态转移图

```
状态图：

(0,0) --P--> (0,0)
      --L--> (0,1)
      --A--> (1,0)

(0,1) --P--> (0,0)
      --L--> (0,2)
      --A--> (1,0)

(0,2) --P--> (0,0)
      --A--> (1,0)

(1,0) --P--> (1,0)
      --L--> (1,1)

(1,1) --P--> (1,0)
      --L--> (1,2)

(1,2) --P--> (1,0)
```

## 递推公式推导

**不含 A 的情况**（记为 `f[n]`）：
```
f[1] = 2 (P, L)
f[2] = 4 (PP, PL, LP, LL)
f[3] = 7 (PPP, PPL, PLP, PLL, LPP, LPL, LLP)

递推关系：
f[n] = f[n-1] + f[n-2] + f[n-3]
(结尾是 P, 结尾是 PL, 结尾是 PLL)
```

**含一个 A 的情况**：
```
A 可以插入在任意位置，左右两侧分别用 f 填充
```

```python
def checkRecord_formula(n):
    """
    基于递推公式
    """
    MOD = 10**9 + 7
    
    # 不含 A 的方案数
    f = [0] * (n + 1)
    f[0] = 1
    if n >= 1:
        f[1] = 2
    if n >= 2:
        f[2] = 4
    
    for i in range(3, n + 1):
        f[i] = (f[i-1] + f[i-2] + f[i-3]) % MOD
    
    # 含一个 A：A 在位置 i (0 ≤ i ≤ n)
    result = f[n]  # 不含 A
    for i in range(n + 1):
        result = (result + f[i] * f[n - i]) % MOD
    
    return result
```

## 小结

| 解法 | 时间 | 空间 | 特点 |
|-----|-----|-----|-----|
| DP | O(n) | O(n) | 标准解法 |
| 滚动数组 | O(n) | O(1) | 空间优化 |
| 矩阵快速幂 | O(log n) | O(1) | n 很大时高效 |
| 递推公式 | O(n) | O(n) | 数学推导 |

**关键点**：
- 状态维度：长度 + 缺勤次数 + 连续迟到次数
- 约束条件：A ≤ 1, L 连续 ≤ 2
- 取模：每步都要取模
- 矩阵快速幂：适用于 n 很大的情况
