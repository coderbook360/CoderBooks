# 实战：完全平方数

## 问题描述

**LeetCode 279: 完全平方数**

给你一个整数 `n`，返回和为 `n` 的完全平方数的**最少数量**。

**完全平方数**是一个整数，其值等于另一个整数的平方；换句话说，其值等于一个整数自乘的积。例如，`1`、`4`、`9` 和 `16` 都是完全平方数，而 `3` 和 `11` 不是。

**示例1**：
```
输入：n = 12
输出：3
解释：12 = 4 + 4 + 4
```

**示例2**：
```
输入：n = 13
输出：2
解释：13 = 4 + 9
```

**约束**：
- `1 <= n <= 10^4`

## 问题分析

### 问题本质

这是一个**完全背包问题**：
- **物品**：所有完全平方数 `1, 4, 9, 16, ...`
- **背包容量**：`n`
- **目标**：用最少的物品填满背包

### 动态规划思路

**状态定义**：
```
dp[i] = 和为 i 的完全平方数的最少数量
```

**状态转移**：
```python
dp[i] = min(dp[i - j*j] + 1) for all j where j*j <= i
```

**含义**：枚举最后一个完全平方数 `j²`，从 `dp[i - j²]` 转移过来

## 解法一：动态规划（完全背包）

### 代码实现

```python
def numSquares(n):
    """
    完全平方数（动态规划）
    """
    # 初始化
    dp = [float('inf')] * (n + 1)
    dp[0] = 0  # 和为 0 需要 0 个数
    
    # 状态转移
    for i in range(1, n + 1):
        j = 1
        while j * j <= i:
            dp[i] = min(dp[i], dp[i - j * j] + 1)
            j += 1
    
    return dp[n]
```

### 复杂度分析

- **时间复杂度**：O(n × √n)
- **空间复杂度**：O(n)

## 解法二：BFS（最短路径）

### 思路

将问题看作**图的最短路径**：
- **节点**：所有数字 `0` 到 `n`
- **边**：如果 `i + j² = k`，则有边 `i → k`
- **目标**：从 `n` 到 `0` 的最短路径

### 代码实现

```python
def numSquares_bfs(n):
    """
    完全平方数（BFS）
    """
    from collections import deque
    
    # 生成所有完全平方数
    squares = []
    i = 1
    while i * i <= n:
        squares.append(i * i)
        i += 1
    
    # BFS
    queue = deque([(n, 0)])  # (当前值, 步数)
    visited = {n}
    
    while queue:
        current, steps = queue.popleft()
        
        # 尝试减去每个完全平方数
        for square in squares:
            next_val = current - square
            
            if next_val == 0:
                return steps + 1
            
            if next_val > 0 and next_val not in visited:
                visited.add(next_val)
                queue.append((next_val, steps + 1))
    
    return -1
```

### 复杂度分析

- **时间复杂度**：O(n × √n)
- **空间复杂度**：O(n)

## 解法三：数学优化（四平方和定理）

### 拉格朗日四平方和定理

**定理**：任何正整数都可以表示为**至多 4 个**完全平方数的和。

**推论**：
1. 如果 `n` 本身是完全平方数，答案是 **1**
2. 如果 `n = a² + b²`，答案是 **2**
3. 如果 `n = 4^k × (8m + 7)`，答案是 **4**（勒让德三平方和定理）
4. 否则，答案是 **3**

### 代码实现

```python
def numSquares_math(n):
    """
    完全平方数（数学优化）
    """
    import math
    
    # 情况1：n 是完全平方数
    sqrt_n = int(math.sqrt(n))
    if sqrt_n * sqrt_n == n:
        return 1
    
    # 情况3：n = 4^k × (8m + 7)
    while n % 4 == 0:
        n //= 4
    if n % 8 == 7:
        return 4
    
    # 情况2：n = a² + b²
    for a in range(1, int(math.sqrt(n)) + 1):
        b_square = n - a * a
        b = int(math.sqrt(b_square))
        if b * b == b_square:
            return 2
    
    # 情况4：否则返回 3
    return 3
```

### 复杂度分析

- **时间复杂度**：O(√n)
- **空间复杂度**：O(1)

## 完整示例

### 示例1：n = 12（DP 方法）

```
dp[0] = 0

dp[1] = dp[1 - 1] + 1 = dp[0] + 1 = 1

dp[2] = dp[2 - 1] + 1 = dp[1] + 1 = 2

dp[3] = dp[3 - 1] + 1 = dp[2] + 1 = 3

dp[4] = min(dp[4 - 1] + 1, dp[4 - 4] + 1)
      = min(dp[3] + 1, dp[0] + 1)
      = min(4, 1) = 1

dp[5] = min(dp[5 - 1] + 1, dp[5 - 4] + 1)
      = min(dp[4] + 1, dp[1] + 1)
      = min(2, 2) = 2

dp[8] = min(dp[8 - 1] + 1, dp[8 - 4] + 1)
      = min(dp[7] + 1, dp[4] + 1)
      = min(4, 2) = 2

dp[9] = min(dp[9 - 1] + 1, dp[9 - 4] + 1, dp[9 - 9] + 1)
      = min(dp[8] + 1, dp[5] + 1, dp[0] + 1)
      = min(3, 3, 1) = 1

dp[12] = min(dp[12 - 1] + 1, dp[12 - 4] + 1, dp[12 - 9] + 1)
       = min(dp[11] + 1, dp[8] + 1, dp[3] + 1)
       = min(4, 3, 4) = 3

答案：3（12 = 4 + 4 + 4）
```

### 示例2：n = 13（数学方法）

```
1. 检查是否是完全平方数：
   sqrt(13) ≈ 3.6，不是

2. 检查是否 = 4^k × (8m + 7)：
   13 % 4 = 1，不是
   
3. 检查是否 = a² + b²：
   a = 1: 13 - 1 = 12，sqrt(12) ≈ 3.46，不是
   a = 2: 13 - 4 = 9，sqrt(9) = 3 ✓
   
   找到：13 = 2² + 3² = 4 + 9

答案：2
```

## BFS 可视化

```
n = 13 的 BFS 搜索树：

      13
     /|\\ 
    12 9 4  (减去 1, 4, 9)
    /|\ |
   11 8 5  ...
   ...
   
最短路径：13 → 9 → 0（步数 = 2）
即：13 - 4 = 9, 9 - 9 = 0
```

## 常见错误

### 错误1：初始化错误

```python
# 错误：dp[0] = 1
dp = [float('inf')] * (n + 1)
dp[0] = 1  # 错误！和为 0 应该需要 0 个数

# 正确：
dp[0] = 0
```

### 错误2：遗漏平方数

```python
# 错误：只考虑到 sqrt(n)
for i in range(1, n + 1):
    j = 1
    while j <= int(i ** 0.5):  # 错误！应该是 j*j <= i
        dp[i] = min(dp[i], dp[i - j] + 1)
        j += 1

# 正确：
while j * j <= i:
    dp[i] = min(dp[i], dp[i - j * j] + 1)
    j += 1
```

### 错误3：数学方法边界错误

```python
# 错误：没有处理 n = 1
def wrong_solution(n):
    sqrt_n = int(n ** 0.5)
    if sqrt_n * sqrt_n == n:
        return 1  # 正确
    
    # 检查 a² + b²
    for a in range(1, sqrt_n):  # 错误！应该是 range(1, sqrt_n + 1)
        b_square = n - a * a
        # ...

# 当 n = 2 时，sqrt(2) = 1，range(1, 1) 为空
# 无法检查 2 = 1² + 1²
```

## 性能对比

| 方法 | 时间复杂度 | 空间复杂度 | 备注 |
|-----|----------|----------|------|
| 动态规划 | O(n × √n) | O(n) | 通用方法 |
| BFS | O(n × √n) | O(n) | 适合小规模 |
| 数学优化 | O(√n) | O(1) | **最优** |

## 扩展问题

### 扩展1：记录具体方案

```python
def numSquares_with_path(n):
    """
    返回最少数量和具体方案
    """
    dp = [float('inf')] * (n + 1)
    dp[0] = 0
    parent = [-1] * (n + 1)
    
    for i in range(1, n + 1):
        j = 1
        while j * j <= i:
            if dp[i - j * j] + 1 < dp[i]:
                dp[i] = dp[i - j * j] + 1
                parent[i] = j * j
            j += 1
    
    # 回溯路径
    path = []
    current = n
    while current > 0:
        path.append(parent[current])
        current -= parent[current]
    
    return dp[n], path
```

### 扩展2：判断是否能表示为 k 个平方数之和

```python
def is_sum_of_k_squares(n, k):
    """
    判断 n 是否能表示为恰好 k 个完全平方数之和
    """
    dp = [[False] * (n + 1) for _ in range(k + 1)]
    dp[0][0] = True
    
    for count in range(1, k + 1):
        for num in range(1, n + 1):
            j = 1
            while j * j <= num:
                if dp[count - 1][num - j * j]:
                    dp[count][num] = True
                    break
                j += 1
    
    return dp[k][n]
```

## 小结

### 核心思想
- **DP 方法**：完全背包问题，`dp[i] = min(dp[i - j²] + 1)`
- **BFS 方法**：图的最短路径
- **数学方法**：四平方和定理

### 关键步骤
1. **DP 初始化**：`dp[0] = 0`，其他为 `∞`
2. **枚举平方数**：`j² <= i`
3. **状态转移**：`dp[i] = min(dp[i], dp[i - j²] + 1)`
4. **数学优化**：利用四平方和定理

### 易错点
- ✓ `dp[0] = 0`（和为 0 需要 0 个数）
- ✓ 枚举条件：`j² <= i`
- ✗ 忘记初始化为 `∞`
- ✗ 数学方法边界处理

### 优化建议
- **DP 方法**：O(n√n) 时间，通用且稳定
- **BFS 方法**：适合小规模数据
- **数学方法**：O(√n) 时间，最优性能

### 相关定理
- **拉格朗日四平方和定理**：任何正整数都可表示为至多 4 个平方数之和
- **勒让德三平方和定理**：`n = 4^k × (8m + 7)` 需要恰好 4 个平方数

这道题展示了**动态规划**与**数论**的结合：DP 给出通用解法，数学定理提供理论支持和性能优化。
