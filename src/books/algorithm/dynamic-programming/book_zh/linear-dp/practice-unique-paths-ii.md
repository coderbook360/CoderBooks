# 实战：不同路径 II

## 问题描述

**LeetCode 63: 不同路径 II**

一个机器人位于一个 `m × n` 网格的左上角。

机器人每次只能向下或者向右移动一步。机器人试图达到网格的右下角。

现在考虑网格中有**障碍物**。那么从左上角到右下角将会有多少条不同的路径？

网格中的障碍物和空位置分别用 `1` 和 `0` 来表示。

**示例1**：
```
输入：obstacleGrid = [
  [0,0,0],
  [0,1,0],
  [0,0,0]
]
输出：2
解释：3×3 网格的正中间有一个障碍物。
从左上角到右下角一共有 2 条不同的路径：
1. 向右 -> 向右 -> 向下 -> 向下
2. 向下 -> 向下 -> 向右 -> 向右
```

**示例2**：
```
输入：obstacleGrid = [[0,1],[0,0]]
输出：1
```

**约束**：
- `m == obstacleGrid.length`
- `n == obstacleGrid[i].length`
- `1 <= m, n <= 100`
- `obstacleGrid[i][j]` 为 `0` 或 `1`

## 问题分析

### 与不同路径 I 的区别

**不同路径 I**：
```
dp[i][j] = dp[i-1][j] + dp[i][j-1]
```

**不同路径 II（有障碍物）**：
```
if obstacleGrid[i][j] == 1:
    dp[i][j] = 0  # 障碍物位置，路径数为 0
else:
    dp[i][j] = dp[i-1][j] + dp[i][j-1]
```

### 边界条件的变化

**不同路径 I**：
```
dp[0][j] = 1  # 第一行全为 1
dp[i][0] = 1  # 第一列全为 1
```

**不同路径 II**：
```
# 第一行：遇到障碍物后，后面全为 0
dp[0][0] = 1 if obstacleGrid[0][0] == 0 else 0
for j in range(1, n):
    if obstacleGrid[0][j] == 1:
        dp[0][j] = 0
    else:
        dp[0][j] = dp[0][j-1]

# 第一列：遇到障碍物后，后面全为 0
for i in range(1, m):
    if obstacleGrid[i][0] == 1:
        dp[i][0] = 0
    else:
        dp[i][0] = dp[i-1][0]
```

## 解法一：2D DP

### 代码实现

```python
def uniquePathsWithObstacles(obstacleGrid):
    """
    不同路径 II（2D DP）
    """
    if not obstacleGrid or obstacleGrid[0][0] == 1:
        return 0
    
    m, n = len(obstacleGrid), len(obstacleGrid[0])
    dp = [[0] * n for _ in range(m)]
    
    # 初始化第一个格子
    dp[0][0] = 1
    
    # 初始化第一行
    for j in range(1, n):
        if obstacleGrid[0][j] == 0:
            dp[0][j] = dp[0][j-1]
        else:
            dp[0][j] = 0  # 障碍物及之后都是 0
    
    # 初始化第一列
    for i in range(1, m):
        if obstacleGrid[i][0] == 0:
            dp[i][0] = dp[i-1][0]
        else:
            dp[i][0] = 0
    
    # 状态转移
    for i in range(1, m):
        for j in range(1, n):
            if obstacleGrid[i][j] == 1:
                dp[i][j] = 0
            else:
                dp[i][j] = dp[i-1][j] + dp[i][j-1]
    
    return dp[m-1][n-1]
```

### 复杂度分析

- **时间复杂度**：O(m × n)
- **空间复杂度**：O(m × n)

## 解法二：1D DP（空间优化）

### 思路

只保留一行的状态，滚动更新

```python
def uniquePathsWithObstacles_optimized(obstacleGrid):
    """
    不同路径 II（1D DP）
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

### 复杂度分析

- **时间复杂度**：O(m × n)
- **空间复杂度**：O(n)

## 完整示例

### 示例1：详细推导

```
obstacleGrid = [
  [0, 0, 0],
  [0, 1, 0],
  [0, 0, 0]
]

初始化：
  dp = [1, 0, 0]

第一行 (i = 0)：
  j=0: obstacleGrid[0][0] = 0, dp[0] = 1
  j=1: obstacleGrid[0][1] = 0, dp[1] = dp[1] + dp[0] = 0 + 1 = 1
  j=2: obstacleGrid[0][2] = 0, dp[2] = dp[2] + dp[1] = 0 + 1 = 1
  dp = [1, 1, 1]

第二行 (i = 1)：
  j=0: obstacleGrid[1][0] = 0, dp[0] = dp[0] + 0 = 1
  j=1: obstacleGrid[1][1] = 1, dp[1] = 0  ← 障碍物
  j=2: obstacleGrid[1][2] = 0, dp[2] = dp[2] + dp[1] = 1 + 0 = 1
  dp = [1, 0, 1]

第三行 (i = 2)：
  j=0: obstacleGrid[2][0] = 0, dp[0] = dp[0] + 0 = 1
  j=1: obstacleGrid[2][1] = 0, dp[1] = dp[1] + dp[0] = 0 + 1 = 1
  j=2: obstacleGrid[2][2] = 0, dp[2] = dp[2] + dp[1] = 1 + 1 = 2
  dp = [1, 1, 2]

答案：2
```

**可视化**：
```
起点 → . → .
  ↓     X   ↓
  . → . → 终点

路径1：右 → 右 → 下 → 下
路径2：下 → 下 → 右 → 右
```

### 示例2：起点或终点有障碍

```
obstacleGrid = [[1]]
输出：0  # 起点有障碍，无法到达

obstacleGrid = [[0, 0], [0, 1]]
起点 → .
  ↓     X
输出：0  # 终点有障碍，无法到达
```

## 边界情况处理

### 情况1：起点有障碍

```python
if obstacleGrid[0][0] == 1:
    return 0
```

### 情况2：终点有障碍

```python
if obstacleGrid[m-1][n-1] == 1:
    return 0  # 提前返回（可选优化）
```

### 情况3：第一行/列有障碍

```
obstacleGrid = [
  [0, 1, 0],
  [0, 0, 0]
]

第一行初始化：
  dp[0][0] = 1
  dp[0][1] = 0  # 障碍物
  dp[0][2] = 0  # 障碍物后面都是 0

结果：只能从第一列向下走
```

## 常见错误

### 错误1：忘记检查起点

```python
# 错误：没有检查起点是否有障碍
def wrong_solution(obstacleGrid):
    m, n = len(obstacleGrid), len(obstacleGrid[0])
    dp = [[0] * n for _ in range(m)]
    dp[0][0] = 1  # 直接赋值 1，错误！
    
    # 如果 obstacleGrid[0][0] == 1，应该返回 0
```

### 错误2：第一行/列初始化错误

```python
# 错误：第一行遇到障碍后没有停止
for j in range(1, n):
    if obstacleGrid[0][j] == 0:
        dp[0][j] = 1  # 错误！应该是 dp[0][j-1]

# 反例：
# obstacleGrid = [[0, 1, 0, 0]]
# 正确：[1, 0, 0, 0]
# 错误：[1, 0, 1, 1]（障碍物后面也是 1）
```

### 错误3：1D DP 边界处理错误

```python
# 错误：没有检查 j > 0
for i in range(m):
    for j in range(n):
        if obstacleGrid[i][j] == 1:
            dp[j] = 0
        else:
            dp[j] += dp[j-1]  # 当 j=0 时，dp[-1] 错误！

# 正确：
if obstacleGrid[i][j] == 1:
    dp[j] = 0
elif j > 0:
    dp[j] += dp[j-1]
```

## 优化技巧

### 优化1：原地修改（不推荐）

```python
def uniquePathsWithObstacles_inplace(obstacleGrid):
    """
    原地修改（节省空间，但破坏输入）
    """
    if obstacleGrid[0][0] == 1:
        return 0
    
    m, n = len(obstacleGrid), len(obstacleGrid[0])
    obstacleGrid[0][0] = 1
    
    # 第一行
    for j in range(1, n):
        obstacleGrid[0][j] = 0 if obstacleGrid[0][j] == 1 else obstacleGrid[0][j-1]
    
    # 第一列
    for i in range(1, m):
        obstacleGrid[i][0] = 0 if obstacleGrid[i][0] == 1 else obstacleGrid[i-1][0]
    
    # 其他位置
    for i in range(1, m):
        for j in range(1, n):
            if obstacleGrid[i][j] == 1:
                obstacleGrid[i][j] = 0
            else:
                obstacleGrid[i][j] = obstacleGrid[i-1][j] + obstacleGrid[i][j-1]
    
    return obstacleGrid[m-1][n-1]
```

### 优化2：提前终止

```python
def uniquePathsWithObstacles_early_exit(obstacleGrid):
    """
    提前终止优化
    """
    if not obstacleGrid or obstacleGrid[0][0] == 1 or obstacleGrid[-1][-1] == 1:
        return 0  # 起点或终点有障碍
    
    # ... 其余代码
```

## 扩展问题

### 扩展1：最小路径和（带权重）

```python
def minPathSum(grid):
    """
    最小路径和
    """
    m, n = len(grid), len(grid[0])
    dp = [0] * n
    dp[0] = grid[0][0]
    
    # 第一行
    for j in range(1, n):
        dp[j] = dp[j-1] + grid[0][j]
    
    # 其他行
    for i in range(1, m):
        dp[0] += grid[i][0]
        
        for j in range(1, n):
            dp[j] = min(dp[j], dp[j-1]) + grid[i][j]
    
    return dp[n-1]
```

### 扩展2：允许向上或向左移动

```python
def unique_paths_all_directions(obstacleGrid):
    """
    允许四个方向移动（需要 BFS/DFS）
    """
    from collections import deque
    
    m, n = len(obstacleGrid), len(obstacleGrid[0])
    if obstacleGrid[0][0] == 1 or obstacleGrid[m-1][n-1] == 1:
        return 0
    
    queue = deque([(0, 0)])
    visited = {(0, 0)}
    count = 0
    
    while queue:
        x, y = queue.popleft()
        
        if x == m - 1 and y == n - 1:
            count += 1
            continue
        
        for dx, dy in [(0, 1), (1, 0), (0, -1), (-1, 0)]:
            nx, ny = x + dx, y + dy
            
            if 0 <= nx < m and 0 <= ny < n and \
               obstacleGrid[nx][ny] == 0 and (nx, ny) not in visited:
                visited.add((nx, ny))
                queue.append((nx, ny))
    
    return count
```

## 小结

### 核心思想
- **状态定义**：`dp[i][j]` = 到达 `(i, j)` 的路径数
- **转移方程**：
  ```python
  if obstacleGrid[i][j] == 1:
      dp[i][j] = 0
  else:
      dp[i][j] = dp[i-1][j] + dp[i][j-1]
  ```

### 关键步骤
1. **检查起点**：`obstacleGrid[0][0] == 1` 返回 0
2. **初始化边界**：第一行/列遇到障碍后全为 0
3. **状态转移**：障碍物位置路径数为 0
4. **返回终点**：`dp[m-1][n-1]`

### 易错点
- ✓ 起点/终点障碍检查
- ✓ 第一行/列障碍后全为 0
- ✓ 1D DP 时检查 `j > 0`
- ✗ 忘记障碍物处理
- ✗ 边界初始化错误

### 空间优化
- **2D → 1D**：O(m × n) → O(n)
- **原地修改**：O(n) → O(1)（但破坏输入）

这道题是不同路径 I 的扩展，核心在于**障碍物处理**：障碍物位置路径数为 0，且会阻断后续路径。
