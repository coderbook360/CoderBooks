# 实战：猜数字大小 II

## 问题描述

**LeetCode 375: 猜数字大小 II**

我们正在玩一个猜数游戏，游戏规则如下：

1. 我从 `1` 到 `n` 之间选择一个数字。
2. 你来猜我选了哪个数字。
3. 如果你猜到正确的数字，就会**赢得游戏**。
4. 如果你猜错了，我会告诉你，我选的数字是**更大**还是**更小**，并且你需要继续猜。
5. 每当你猜了数字 `x` 并且猜错了，你需要支付金额为 `x` 的现金。如果你花光了钱，就会**输掉游戏**。

给你一个特定的数字 `n`，返回能够**确保你获胜**的最小现金数。

**示例1**：
```
输入：n = 10
输出：16
解释：制胜策略如下：
- 数字范围是 [1,10]。你先猜测数字为 7。
  - 如果这是我选中的数字，你的总费用为 $0。否则，你需要支付 $7。
  - 如果我的数字更大，则下一步需要猜测的数字范围是 [8,10]。你可以猜 9。
    - 如果这是我选中的数字，你的总费用为 $7。否则，你需要支付 $9。
    - 如果我的数字更大，那么我选的数字一定是 10。你猜测数字为 10 并赢得游戏，总费用为 $7 + $9 = $16。
    - 如果我的数字更小，那么我选的数字一定是 8。你猜测数字为 8 并赢得游戏，总费用为 $7 + $9 = $16。
  - 如果我的数字更小，则下一步需要猜测的数字范围是 [1,6]。你可以猜 3。
    - ...
    最坏情况下总费用为 $16。
```

**示例2**：
```
输入：n = 1
输出：0
解释：只有一个可能的数字，所以你可以直接猜 1 并赢得游戏，无需支付任何费用。
```

**示例3**：
```
输入：n = 2
输出：1
解释：有两个可能的数字 1 和 2。
- 你可以先猜 1。
  - 如果这是我选中的数字，你的总费用为 $0。否则，你需要支付 $1。
  - 如果我的数字更大，那么我选的数字一定是 2。你猜测数字为 2 并赢得游戏，总费用为 $1。
最坏情况下的总费用为 $1。
```

**约束**：
- `1 <= n <= 200`

## 问题分析

### 核心理解

**目标**：无论对手选什么数字，都能确保获胜的**最小最大代价**

**Minimax 思想**：
- 我们（猜测方）希望**最小化**最坏情况的代价
- 对手（选数方）会让我们付出**最大**代价

### 状态定义

```
dp[i][j] = 在区间 [i, j] 中确保获胜的最小代价
```

### 状态转移

**枚举猜测**：在区间 `[i, j]` 中猜数字 `k`

**结果**：
- 猜对了：代价 = 0
- 猜错了（偏大）：区间变为 `[i, k-1]`，额外代价 `k`
- 猜错了（偏小）：区间变为 `[k+1, j]`，额外代价 `k`

**最坏情况**：
```
worst_case(k) = k + max(dp[i][k-1], dp[k+1][j])
```

**最优策略**：
```
dp[i][j] = min(worst_case(k) for k in [i, j])
```

## 解法：区间 DP

### 代码实现

```python
def getMoneyAmount(n):
    """
    猜数字大小 II（区间 DP）
    """
    # 初始化
    dp = [[0] * (n + 1) for _ in range(n + 1)]
    
    # 枚举区间长度
    for length in range(2, n + 1):
        for i in range(1, n - length + 2):
            j = i + length - 1
            dp[i][j] = float('inf')
            
            # 枚举猜测的数字 k
            for k in range(i, j + 1):
                # 猜 k 的最坏代价
                left_cost = dp[i][k-1] if k > i else 0
                right_cost = dp[k+1][j] if k < j else 0
                worst_case = k + max(left_cost, right_cost)
                
                dp[i][j] = min(dp[i][j], worst_case)
    
    return dp[1][n]
```

### 复杂度分析

- **时间复杂度**：O(n³)
- **空间复杂度**：O(n²)

## 完整示例

### 示例1：n = 3

```
区间 [1, 1], [2, 2], [3, 3]：
  dp[1][1] = 0
  dp[2][2] = 0
  dp[3][3] = 0

区间 [1, 2]：
  猜 1: worst = 1 + max(0, dp[2][2]) = 1 + 0 = 1
  猜 2: worst = 2 + max(dp[1][1], 0) = 2 + 0 = 2
  dp[1][2] = min(1, 2) = 1

区间 [2, 3]：
  猜 2: worst = 2 + max(0, dp[3][3]) = 2 + 0 = 2
  猜 3: worst = 3 + max(dp[2][2], 0) = 3 + 0 = 3
  dp[2][3] = min(2, 3) = 2

区间 [1, 3]：
  猜 1: worst = 1 + max(0, dp[2][3]) = 1 + 2 = 3
  猜 2: worst = 2 + max(dp[1][1], dp[3][3]) = 2 + max(0, 0) = 2
  猜 3: worst = 3 + max(dp[1][2], 0) = 3 + 1 = 4
  dp[1][3] = min(3, 2, 4) = 2

答案：2
```

**策略**：先猜 2
- 如果是 2，总代价 = 0
- 如果 < 2，猜 1，总代价 = 2
- 如果 > 2，猜 3，总代价 = 2

### 示例2：n = 10（部分）

```
dp[1][10]：
  猜 7:
    left_cost = dp[1][6]
    right_cost = dp[8][10]
    worst = 7 + max(left_cost, right_cost)
  
  枚举所有 k，取最小值
```

## 最优策略分析

### 为什么猜中间？

**直觉**：猜中间能**平衡**左右两侧的最坏代价

**证明**（粗略）：
```
猜 k 的最坏代价：k + max(dp[i][k-1], dp[k+1][j])

如果 k 偏左：右侧区间大，dp[k+1][j] 大
如果 k 偏右：左侧区间大，dp[i][k-1] 大

最优：k 接近中间，使 max(left, right) 最小
```

### 贪心策略的错误

```python
# 错误：总是猜中间
def wrong_solution(n):
    def helper(i, j):
        if i >= j:
            return 0
        
        mid = (i + j) // 2
        return mid + max(helper(i, mid - 1), helper(mid + 1, j))
    
    return helper(1, n)

# 反例：n = 5
# 贪心猜 3: 3 + max(dp[1][2], dp[4][5]) = 3 + max(1, 4) = 7
# 最优猜 4: 4 + max(dp[1][3], dp[5][5]) = 4 + max(2, 0) = 6
```

## 常见错误

### 错误1：理解错误

```python
# 错误：以为是猜对的期望代价
def wrong_logic(n):
    # 认为猜 k 的代价是 k / 2（平均情况）
    return sum(range(1, n + 1)) / 2

# 正确：是保证获胜的最小最大代价（最坏情况）
```

### 错误2：状态转移错误

```python
# 错误：取 min 而不是 max
worst_case = k + min(dp[i][k-1], dp[k+1][j])  # 错误！

# 正确：对手会选择最坏情况
worst_case = k + max(dp[i][k-1], dp[k+1][j])
```

### 错误3：边界处理错误

```python
# 错误：没有检查边界
for k in range(i, j + 1):
    worst = k + max(dp[i][k-1], dp[k+1][j])  # k=i 时越界

# 正确：
left_cost = dp[i][k-1] if k > i else 0
right_cost = dp[k+1][j] if k < j else 0
worst = k + max(left_cost, right_cost)
```

## 优化技巧

### 优化1：减少枚举范围

**观察**：最优猜测通常在中间附近

```python
def getMoneyAmount_optimized(n):
    """
    优化枚举范围
    """
    dp = [[0] * (n + 1) for _ in range(n + 1)]
    
    for length in range(2, n + 1):
        for i in range(1, n - length + 2):
            j = i + length - 1
            dp[i][j] = float('inf')
            
            # 只枚举中间部分
            start = i + (j - i) // 4
            end = i + 3 * (j - i) // 4
            
            for k in range(start, end + 1):
                left_cost = dp[i][k-1] if k > i else 0
                right_cost = dp[k+1][j] if k < j else 0
                worst_case = k + max(left_cost, right_cost)
                
                dp[i][j] = min(dp[i][j], worst_case)
    
    return dp[1][n]
```

### 优化2：记忆化搜索

```python
def getMoneyAmount_memo(n):
    """
    记忆化搜索
    """
    memo = {}
    
    def dp(i, j):
        if i >= j:
            return 0
        
        if (i, j) in memo:
            return memo[(i, j)]
        
        min_cost = float('inf')
        
        for k in range(i, j + 1):
            worst_case = k + max(dp(i, k - 1), dp(k + 1, j))
            min_cost = min(min_cost, worst_case)
        
        memo[(i, j)] = min_cost
        return min_cost
    
    return dp(1, n)
```

## 扩展问题

### 扩展1：返回最优策略

```python
def getMoneyAmount_with_strategy(n):
    """
    返回最优策略序列
    """
    dp = [[0] * (n + 1) for _ in range(n + 1)]
    choice = [[0] * (n + 1) for _ in range(n + 1)]
    
    for length in range(2, n + 1):
        for i in range(1, n - length + 2):
            j = i + length - 1
            dp[i][j] = float('inf')
            
            for k in range(i, j + 1):
                left_cost = dp[i][k-1] if k > i else 0
                right_cost = dp[k+1][j] if k < j else 0
                worst_case = k + max(left_cost, right_cost)
                
                if worst_case < dp[i][j]:
                    dp[i][j] = worst_case
                    choice[i][j] = k
    
    # 构造策略
    def build_strategy(i, j):
        if i >= j:
            return []
        k = choice[i][j]
        return [(i, j, k)] + build_strategy(i, k - 1) + build_strategy(k + 1, j)
    
    return dp[1][n], build_strategy(1, n)
```

## 小结

### 核心思想
- **Minimax**：我们最小化，对手最大化
- **区间 DP**：`dp[i][j]` = 区间 `[i, j]` 的最小最大代价
- **状态转移**：枚举猜测 `k`，取最坏情况的最小值

### 关键步骤
1. **枚举区间**：从小到大枚举区间长度
2. **枚举猜测**：在区间内枚举猜测的数字 `k`
3. **计算代价**：`k + max(dp[i][k-1], dp[k+1][j])`
4. **取最优**：所有猜测中代价最小的

### 易错点
- ✓ 最坏情况：取 `max`
- ✓ 最优策略：取 `min`
- ✗ 混淆平均情况和最坏情况
- ✗ 边界处理错误

### 优化方向
- **减少枚举**：只枚举中间部分
- **记忆化搜索**：避免重复计算
- **剪枝**：提前终止无效搜索

这道题是**Minimax + 区间 DP** 的经典应用，核心在于理解**最小化最大代价**：在所有策略中，选择使最坏情况代价最小的策略。
