# 实战：不同路径

## 问题描述

**LeetCode 62: 不同路径**

一个机器人位于一个 `m × n` 网格的**左上角**（起始点在下图中标记为 "Start" ）。

机器人每次只能**向下**或者**向右**移动一步。机器人试图达到网格的**右下角**（在下图中标记为 "Finish" ）。

问总共有多少条不同的路径？

**示例1**：
```
输入：m = 3, n = 7
输出：28
```

**示例2**：
```
输入：m = 3, n = 2
输出：3
解释：
从左上角开始，总共有 3 条路径可以到达右下角。
1. 向右 -> 向下 -> 向下
2. 向下 -> 向下 -> 向右
3. 向下 -> 向右 -> 向下
```

**示例3**：
```
输入：m = 7, n = 3
输出：28
```

**约束**：
- `1 <= m, n <= 100`

## 问题分析

### 直观理解

**路径示例**（3 × 2 网格）：
```
Start → . 
  ↓     ↓
  . → Finish

路径1：右 → 下 → 下
路径2：下 → 右 → 下
路径3：下 → 下 → 右
```

**关键观察**：
- 从 `(0, 0)` 到 `(m-1, n-1)` 需要：
  - 向下移动 `m - 1` 次
  - 向右移动 `n - 1` 次
- 总共移动 `m + n - 2` 次
- 问题：在这 `m + n - 2` 次移动中，选择哪 `m - 1` 次向下？

### 数学解法：组合数

**公式**：
```
C(m+n-2, m-1) = (m+n-2)! / [(m-1)! × (n-1)!]
```

```python
def uniquePaths_math(m, n):
    """
    数学组合数解法
    """
    from math import comb
    return comb(m + n - 2, m - 1)
```

**时间复杂度**：O(m + n)  
**空间复杂度**：O(1)

## 解法一：2D DP

### 状态定义

```
dp[i][j] = 从 (0, 0) 到 (i, j) 的路径数
```

### 状态转移

```python
dp[i][j] = dp[i-1][j] + dp[i][j-1]
```

**含义**：到达 `(i, j)` 的路径数 = 从上方来 + 从左方来

### 边界条件

```python
dp[0][j] = 1  # 第一行：只能一直向右
dp[i][0] = 1  # 第一列：只能一直向下
```

### 代码实现

```python
def uniquePaths_2d(m, n):
    """
    不同路径（2D DP）
    """
    # 初始化 dp 数组
    dp = [[0] * n for _ in range(m)]
    
    # 边界条件
    for i in range(m):
        dp[i][0] = 1
    for j in range(n):
        dp[0][j] = 1
    
    # 状态转移
    for i in range(1, m):
        for j in range(1, n):
            dp[i][j] = dp[i-1][j] + dp[i][j-1]
    
    return dp[m-1][n-1]
```

### 复杂度分析

- **时间复杂度**：O(m × n)
- **空间复杂度**：O(m × n)

## 解法二：1D DP（空间优化）

### 思路

观察到 `dp[i][j]` 只依赖当前行和上一行，可以优化为一维数组

```python
def uniquePaths_1d(m, n):
    """
    不同路径（1D DP）
    """
    # 只保留一行
    dp = [1] * n
    
    for i in range(1, m):
        for j in range(1, n):
            # dp[j] = dp[j] + dp[j-1]
            # 右边是旧值（上一行），左边是新值（当前行）
            dp[j] += dp[j-1]
    
    return dp[n-1]
```

### 复杂度分析

- **时间复杂度**：O(m × n)
- **空间复杂度**：O(n)

## 完整示例

### 示例：m = 3, n = 3

```
初始化 dp：
  [1, 1, 1]

第二行 (i = 1)：
  j=1: dp[1] = dp[1] + dp[0] = 1 + 1 = 2
  j=2: dp[2] = dp[2] + dp[1] = 1 + 2 = 3
  [1, 2, 3]

第三行 (i = 2)：
  j=1: dp[1] = dp[1] + dp[0] = 2 + 1 = 3
  j=2: dp[2] = dp[2] + dp[1] = 3 + 3 = 6
  [1, 3, 6]

答案：6
```

**2D DP 可视化**：
```
  0   1   2   (列)
0 1   1   1
1 1   2   3
2 1   3   6
(行)

到达每个位置的路径数：
dp[0][0] = 1
dp[0][1] = 1
dp[0][2] = 1
dp[1][0] = 1
dp[1][1] = dp[0][1] + dp[1][0] = 1 + 1 = 2
dp[1][2] = dp[0][2] + dp[1][1] = 1 + 2 = 3
dp[2][0] = 1
dp[2][1] = dp[1][1] + dp[2][0] = 2 + 1 = 3
dp[2][2] = dp[1][2] + dp[2][1] = 3 + 3 = 6
```

## 解法三：记忆化搜索

### 思路

从终点回溯到起点

```python
def uniquePaths_memo(m, n):
    """
    不同路径（记忆化搜索）
    """
    memo = {}
    
    def dfs(i, j):
        # 边界
        if i == 0 or j == 0:
            return 1
        
        if (i, j) in memo:
            return memo[(i, j)]
        
        # 递归
        memo[(i, j)] = dfs(i-1, j) + dfs(i, j-1)
        return memo[(i, j)]
    
    return dfs(m - 1, n - 1)
```

### 复杂度分析

- **时间复杂度**：O(m × n)
- **空间复杂度**：O(m × n)（递归栈 + 记忆化数组）

## 数学推导（组合数）

### 理解

从 `(0, 0)` 到 `(m-1, n-1)`：
- 总步数：`(m - 1) + (n - 1) = m + n - 2`
- 向下步数：`m - 1`
- 向右步数：`n - 1`

**问题等价于**：在 `m + n - 2` 个位置中，选择 `m - 1` 个位置向下

**组合数**：
```
C(m+n-2, m-1) = (m+n-2)! / [(m-1)! × (n-1)!]
```

### 代码实现

```python
def uniquePaths_combination(m, n):
    """
    组合数公式
    """
    # 计算 C(m+n-2, m-1)
    numerator = 1
    denominator = 1
    
    # 优化：C(n, k) = C(n, n-k)，选较小的 k
    k = min(m - 1, n - 1)
    total = m + n - 2
    
    for i in range(k):
        numerator *= (total - i)
        denominator *= (i + 1)
    
    return numerator // denominator
```

### 复杂度分析

- **时间复杂度**：O(min(m, n))
- **空间复杂度**：O(1)

## 常见错误

### 错误1：边界初始化错误

```python
# 错误：没有初始化第一行和第一列
dp = [[0] * n for _ in range(m)]
for i in range(1, m):
    for j in range(1, n):
        dp[i][j] = dp[i-1][j] + dp[i][j-1]
return dp[m-1][n-1]  # 返回 0，错误！

# 正确：初始化边界
for i in range(m):
    dp[i][0] = 1
for j in range(n):
    dp[0][j] = 1
```

### 错误2：1D DP 遍历顺序错误

```python
# 错误：从右向左遍历
for i in range(1, m):
    for j in range(n - 1, 0, -1):  # 错误方向
        dp[j] += dp[j-1]

# 正确：从左向右遍历
for i in range(1, m):
    for j in range(1, n):
        dp[j] += dp[j-1]
```

### 错误3：组合数溢出

```python
# 错误：先计算阶乘，可能溢出
from math import factorial
result = factorial(m + n - 2) // (factorial(m - 1) * factorial(n - 1))

# 正确：边乘边除
numerator = 1
denominator = 1
for i in range(min(m - 1, n - 1)):
    numerator *= (m + n - 2 - i)
    denominator *= (i + 1)
return numerator // denominator
```

## 扩展问题

### 扩展1：有障碍物的网格（LeetCode 63）

```python
def uniquePathsWithObstacles(obstacleGrid):
    """
    不同路径 II（有障碍物）
    """
    if not obstacleGrid or obstacleGrid[0][0] == 1:
        return 0
    
    m, n = len(obstacleGrid), len(obstacleGrid[0])
    dp = [0] * n
    dp[0] = 1
    
    for i in range(m):
        for j in range(n):
            if obstacleGrid[i][j] == 1:
                dp[j] = 0
            elif j > 0:
                dp[j] += dp[j-1]
    
    return dp[n-1]
```

### 扩展2：最小路径和（LeetCode 64）

```python
def minPathSum(grid):
    """
    最小路径和
    """
    m, n = len(grid), len(grid[0])
    dp = [0] * n
    dp[0] = grid[0][0]
    
    # 初始化第一行
    for j in range(1, n):
        dp[j] = dp[j-1] + grid[0][j]
    
    for i in range(1, m):
        dp[0] += grid[i][0]
        
        for j in range(1, n):
            dp[j] = min(dp[j], dp[j-1]) + grid[i][j]
    
    return dp[n-1]
```

## 性能对比

| 方法 | 时间复杂度 | 空间复杂度 | 备注 |
|-----|----------|----------|------|
| 2D DP | O(m × n) | O(m × n) | 直观易懂 |
| 1D DP | O(m × n) | O(n) | 空间优化 |
| 记忆化 | O(m × n) | O(m × n) | 递归实现 |
| 组合数 | O(min(m, n)) | O(1) | **最优** |

## 小结

### 核心思想
- **状态定义**：`dp[i][j]` = 到达 `(i, j)` 的路径数
- **转移方程**：`dp[i][j] = dp[i-1][j] + dp[i][j-1]`
- **边界条件**：第一行和第一列都是 1

### 多种解法
1. **2D DP**：O(m × n) 时间，O(m × n) 空间
2. **1D DP**：O(m × n) 时间，O(n) 空间
3. **组合数**：O(min(m, n)) 时间，O(1) 空间（**最优**）

### 易错点
- ✓ 边界条件：第一行和第一列初始化为 1
- ✓ 1D DP 遍历方向：从左向右
- ✗ 忘记初始化边界
- ✗ 组合数计算溢出

### 优化建议
- **空间优化**：2D → 1D
- **时间优化**：DP → 组合数
- **实际应用**：根据数据规模选择合适方法

这道题是**路径计数**问题的经典入门题，展示了从 DP 到数学优化的思维过程：DP 保证正确性，数学公式提升性能。
