# 实战：最大正方形

## 问题描述

**LeetCode 221: 最大正方形**

在一个由 `'0'` 和 `'1'` 组成的二维矩阵内，找到只包含 `'1'` 的最大正方形，并返回其面积。

**示例1**：
```
输入：matrix = [
  ["1","0","1","0","0"],
  ["1","0","1","1","1"],
  ["1","1","1","1","1"],
  ["1","0","0","1","0"]
]
输出：4
解释：最大正方形边长为 2，面积为 2 × 2 = 4
```

**示例2**：
```
输入：matrix = [
  ["0","1"],
  ["1","0"]
]
输出：1
```

**示例3**：
```
输入：matrix = [["0"]]
输出：0
```

**约束**：
- `m == matrix.length`
- `n == matrix[i].length`
- `1 <= m, n <= 300`
- `matrix[i][j]` 为 `'0'` 或 `'1'`

## 问题分析

### 朴素思路

**枚举正方形**：遍历每个位置作为左上角，尝试不同边长

```python
def maximal_square_brute(matrix):
    """
    暴力枚举（O(m²n²)）
    """
    if not matrix or not matrix[0]:
        return 0
    
    m, n = len(matrix), len(matrix[0])
    max_side = 0
    
    for i in range(m):
        for j in range(n):
            if matrix[i][j] == '1':
                # 尝试不同边长
                side = 1
                while i + side < m and j + side < n:
                    # 检查是否全为 1
                    valid = True
                    
                    # 检查新增的行和列
                    for k in range(side + 1):
                        if matrix[i + side][j + k] == '0' or \
                           matrix[i + k][j + side] == '0':
                            valid = False
                            break
                    
                    if not valid:
                        break
                    
                    side += 1
                
                max_side = max(max_side, side)
    
    return max_side * max_side
```

**时间复杂度**：O(m²n²)（对于每个位置，检查所有可能边长）

### 动态规划优化

**关键观察**：以 `(i, j)` 为**右下角**的最大正方形边长，取决于：
- 左边 `(i, j-1)`
- 上边 `(i-1, j)`
- 左上 `(i-1, j-1)`

**状态定义**：
```
dp[i][j] = 以 (i, j) 为右下角的最大正方形边长
```

**状态转移**：
```python
if matrix[i][j] == '1':
    dp[i][j] = min(
        dp[i-1][j],      # 上边
        dp[i][j-1],      # 左边
        dp[i-1][j-1]     # 左上
    ) + 1
else:
    dp[i][j] = 0
```

**为什么取 min？**
```
假设：
  dp[i-1][j] = 2    （上边最大正方形边长为 2）
  dp[i][j-1] = 3    （左边最大正方形边长为 3）
  dp[i-1][j-1] = 2  （左上最大正方形边长为 2）

那么 dp[i][j] 最多为 2 + 1 = 3

为什么不是 3 + 1 = 4？
因为左上角只能提供 2 × 2 的正方形，
即使左边和上边更大，也无法扩展
```

## 解法一：2D DP

### 代码实现

```python
def maximalSquare(matrix):
    """
    最大正方形（2D DP）
    """
    if not matrix or not matrix[0]:
        return 0
    
    m, n = len(matrix), len(matrix[0])
    dp = [[0] * n for _ in range(m)]
    max_side = 0
    
    for i in range(m):
        for j in range(n):
            if matrix[i][j] == '1':
                if i == 0 or j == 0:
                    # 边界情况
                    dp[i][j] = 1
                else:
                    dp[i][j] = min(
                        dp[i-1][j],
                        dp[i][j-1],
                        dp[i-1][j-1]
                    ) + 1
                
                max_side = max(max_side, dp[i][j])
    
    return max_side * max_side
```

### 复杂度分析

- **时间复杂度**：O(m × n)
- **空间复杂度**：O(m × n)

## 解法二：1D DP（空间优化）

### 思路

注意到 `dp[i][j]` 只依赖当前行和上一行，可以用滚动数组

```python
def maximalSquare_optimized(matrix):
    """
    最大正方形（1D DP）
    """
    if not matrix or not matrix[0]:
        return 0
    
    m, n = len(matrix), len(matrix[0])
    dp = [0] * n
    max_side = 0
    prev = 0  # 记录 dp[i-1][j-1]
    
    for i in range(m):
        for j in range(n):
            temp = dp[j]  # 保存旧值（作为下一次的 prev）
            
            if matrix[i][j] == '1':
                if i == 0 or j == 0:
                    dp[j] = 1
                else:
                    dp[j] = min(dp[j], dp[j-1], prev) + 1
                
                max_side = max(max_side, dp[j])
            else:
                dp[j] = 0
            
            prev = temp
    
    return max_side * max_side
```

### 复杂度分析

- **时间复杂度**：O(m × n)
- **空间复杂度**：O(n)（只用一维数组）

## 完整示例

### 示例1：详细推导

```
矩阵：
  ["1","0","1","0","0"]
  ["1","0","1","1","1"]
  ["1","1","1","1","1"]
  ["1","0","0","1","0"]

DP 表：
初始化 dp[0][*]：
  [1, 0, 1, 0, 0]

第二行 (i = 1)：
  j=0: matrix[1][0]='1', dp[1][0]=1
  j=1: matrix[1][1]='0', dp[1][1]=0
  j=2: matrix[1][2]='1', dp[1][2]=min(dp[0][2]=1, dp[1][1]=0, dp[0][1]=0)+1=1
  j=3: matrix[1][3]='1', dp[1][3]=min(dp[0][3]=0, dp[1][2]=1, dp[0][2]=1)+1=1
  j=4: matrix[1][4]='1', dp[1][4]=min(dp[0][4]=0, dp[1][3]=1, dp[0][3]=0)+1=1
  
  [1, 0, 1, 1, 1]

第三行 (i = 2)：
  j=0: dp[2][0]=1
  j=1: matrix[2][1]='1', dp[2][1]=min(dp[1][1]=0, dp[2][0]=1, dp[1][0]=1)+1=1
  j=2: matrix[2][2]='1', dp[2][2]=min(dp[1][2]=1, dp[2][1]=1, dp[1][1]=0)+1=1
  j=3: matrix[2][3]='1', dp[2][3]=min(dp[1][3]=1, dp[2][2]=1, dp[1][2]=1)+1=2 ← 边长2
  j=4: matrix[2][4]='1', dp[2][4]=min(dp[1][4]=1, dp[2][3]=2, dp[1][3]=1)+1=2
  
  [1, 1, 1, 2, 2]

第四行 (i = 3)：
  j=0: dp[3][0]=1
  j=1: matrix[3][1]='0', dp[3][1]=0
  j=2: matrix[3][2]='0', dp[3][2]=0
  j=3: matrix[3][3]='1', dp[3][3]=min(dp[2][3]=2, dp[3][2]=0, dp[2][2]=1)+1=1
  j=4: matrix[3][4]='0', dp[3][4]=0
  
  [1, 0, 0, 1, 0]

最大边长：2
面积：2 × 2 = 4
```

## 可视化理解

```
矩阵可视化（数字表示以该位置为右下角的最大正方形边长）：

原矩阵：              DP 表：
1 0 1 0 0          1 0 1 0 0
1 0 1 1 1          1 0 1 1 1
1 1 1 1 1          1 1 1 2 2  ← 边长为 2 的正方形
1 0 0 1 0          1 0 0 1 0

边长为 2 的正方形位置：
. . . . .
. . 1 1 .
. . 1 1 .
. . . . .
```

## 常见错误

### 错误1：理解错误状态定义

```python
# 错误：以为 dp[i][j] 是从 (0,0) 到 (i,j) 的最大正方形
dp[i][j] = max(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]) + 1

# 正确：dp[i][j] 是以 (i,j) 为右下角的最大正方形边长
dp[i][j] = min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]) + 1
```

### 错误2：忘记 min

```python
# 错误：取 max
dp[i][j] = max(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]) + 1

# 反例：
#   上边 dp[i-1][j] = 3
#   左边 dp[i][j-1] = 3
#   左上 dp[i-1][j-1] = 1
# 取 max 会得到 3+1=4，但实际只能是 1+1=2
```

### 错误3：边界处理错误

```python
# 错误：没有处理 i=0 或 j=0 的情况
for i in range(m):
    for j in range(n):
        if matrix[i][j] == '1':
            dp[i][j] = min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]) + 1
            # 当 i=0 或 j=0 时，dp[i-1][j] 或 dp[i][j-1] 越界

# 正确：特殊处理边界
if i == 0 or j == 0:
    dp[i][j] = 1 if matrix[i][j] == '1' else 0
else:
    dp[i][j] = min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]) + 1
```

## 扩展问题

### 扩展1：最大矩形

**问题**：找到只包含 `'1'` 的最大矩形

**思路**：基于最大正方形的思想，但需要维护宽度和高度

```python
def maximalRectangle(matrix):
    """
    最大矩形（单调栈）
    """
    if not matrix or not matrix[0]:
        return 0
    
    m, n = len(matrix), len(matrix[0])
    heights = [0] * n
    max_area = 0
    
    for i in range(m):
        # 更新高度数组
        for j in range(n):
            if matrix[i][j] == '1':
                heights[j] += 1
            else:
                heights[j] = 0
        
        # 计算当前行的最大矩形面积
        max_area = max(max_area, largest_rectangle_in_histogram(heights))
    
    return max_area

def largest_rectangle_in_histogram(heights):
    """
    柱状图中最大的矩形
    """
    stack = []
    max_area = 0
    heights = [0] + heights + [0]
    
    for i, h in enumerate(heights):
        while stack and heights[stack[-1]] > h:
            height = heights[stack.pop()]
            width = i - stack[-1] - 1
            max_area = max(max_area, height * width)
        
        stack.append(i)
    
    return max_area
```

### 扩展2：统计正方形数量

**问题**：统计矩阵中包含 `'1'` 的所有正方形数量

**思路**：`dp[i][j]` 表示以 `(i, j)` 为右下角的正方形数量

```python
def countSquares(matrix):
    """
    统计正方形数量
    """
    if not matrix or not matrix[0]:
        return 0
    
    m, n = len(matrix), len(matrix[0])
    dp = [[0] * n for _ in range(m)]
    total = 0
    
    for i in range(m):
        for j in range(n):
            if matrix[i][j] == 1:
                if i == 0 or j == 0:
                    dp[i][j] = 1
                else:
                    dp[i][j] = min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]) + 1
                
                # dp[i][j] 表示边长，同时也是以 (i,j) 为右下角的正方形数量
                total += dp[i][j]
    
    return total
```

## 小结

### 核心思想
- **状态定义**：`dp[i][j]` = 以 `(i, j)` 为右下角的最大正方形边长
- **转移方程**：`dp[i][j] = min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]) + 1`
- **取 min 原因**：受限于左上角的正方形大小

### 关键步骤
1. 初始化 `dp` 数组
2. 遍历矩阵，更新 `dp[i][j]`
3. 记录最大边长 `max_side`
4. 返回面积 `max_side²`

### 易错点
- ✓ 状态定义：以 `(i, j)` 为**右下角**
- ✓ 转移方程：取 **min** 而非 max
- ✗ 忘记边界处理（`i = 0` 或 `j = 0`）
- ✗ 忘记返回面积（边长的平方）

### 空间优化
- **2D → 1D**：只保留一行的状态
- **空间复杂度**：O(m × n) → O(n)

这道题是**二维 DP** 的经典问题，关键在于正确理解**状态定义**（以当前位置为右下角）和**转移方程**（取三个方向的最小值）。
