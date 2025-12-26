# 极小化极大思想

## 核心概念

**Minimax 算法**是博弈论中的经典策略，用于**零和游戏**（一方的收益等于另一方的损失）。

### 基本思想

在**两人对弈**中：
- **最大化玩家**（Maximizer）：希望获得**最大**收益
- **最小化玩家**（Minimizer）：希望对手获得**最小**收益（即自己损失最小）

**递归定义**：
```
minimax(当前状态, 当前玩家) =
  if 当前玩家是最大化玩家:
    max(所有可能后继状态的 minimax 值)
  else:
    min(所有可能后继状态的 minimax 值)
```

## 核心原理

### 游戏树

```
          A (Max)
         / \
        /   \
       B     C   (Min)
      / \   / \
     D   E F   G  (Max)
    3   5 2   9
```

**计算过程**：
```
1. D = 3, E = 5, F = 2, G = 9（叶子节点）

2. B (Min层) = min(3, 5) = 3
   C (Min层) = min(2, 9) = 2

3. A (Max层) = max(3, 2) = 3

结论：最大化玩家最优策略是选择左分支，期望得分 3
```

### 对抗思维

**假设**：双方都采取**最优策略**

**推理**：
- 最大化玩家选择**最大值**
- 最小化玩家选择**最小值**（对手的最小收益 = 自己的最大收益）

## 基础模板

### 递归实现

```python
def minimax(state, is_max_player):
    """
    Minimax 算法基础模板
    """
    # 终止条件
    if is_terminal(state):
        return evaluate(state)
    
    if is_max_player:
        # 最大化玩家
        max_eval = float('-inf')
        
        for move in get_possible_moves(state):
            new_state = apply_move(state, move)
            eval_score = minimax(new_state, False)
            max_eval = max(max_eval, eval_score)
        
        return max_eval
    else:
        # 最小化玩家
        min_eval = float('inf')
        
        for move in get_possible_moves(state):
            new_state = apply_move(state, move)
            eval_score = minimax(new_state, True)
            min_eval = min(min_eval, eval_score)
        
        return min_eval
```

### 带记忆化

```python
def minimax_memo(state, is_max_player, memo=None):
    """
    Minimax + 记忆化
    """
    if memo is None:
        memo = {}
    
    # 状态哈希
    state_key = (tuple(state), is_max_player)
    if state_key in memo:
        return memo[state_key]
    
    # 终止条件
    if is_terminal(state):
        return evaluate(state)
    
    if is_max_player:
        max_eval = float('-inf')
        for move in get_possible_moves(state):
            new_state = apply_move(state, move)
            eval_score = minimax_memo(new_state, False, memo)
            max_eval = max(max_eval, eval_score)
        
        memo[state_key] = max_eval
        return max_eval
    else:
        min_eval = float('inf')
        for move in get_possible_moves(state):
            new_state = apply_move(state, move)
            eval_score = minimax_memo(new_state, True, memo)
            min_eval = min(min_eval, eval_score)
        
        memo[state_key] = min_eval
        return min_eval
```

## 实例：井字棋

### 问题

判断当前玩家是否有必胜策略

### 状态评估

```python
def evaluate_board(board, player):
    """
    评估井字棋局面
    """
    # 检查胜负
    if has_won(board, player):
        return 1  # 当前玩家胜
    elif has_won(board, opponent(player)):
        return -1  # 对手胜
    else:
        return 0  # 平局或未结束
```

### 完整代码

```python
def tic_tac_toe_minimax(board, player):
    """
    井字棋 Minimax
    """
    # 终止条件
    if is_game_over(board):
        return evaluate_board(board, player)
    
    best_score = float('-inf')
    
    for move in get_empty_cells(board):
        # 尝试走这一步
        board[move] = player
        
        # 对手的最优策略
        score = -tic_tac_toe_minimax(board, opponent(player))
        
        # 撤销
        board[move] = ' '
        
        best_score = max(best_score, score)
    
    return best_score

def has_won(board, player):
    """检查是否获胜"""
    # 横线
    for i in range(3):
        if all(board[i][j] == player for j in range(3)):
            return True
    
    # 竖线
    for j in range(3):
        if all(board[i][j] == player for i in range(3)):
            return True
    
    # 对角线
    if all(board[i][i] == player for i in range(3)):
        return True
    if all(board[i][2-i] == player for i in range(3)):
        return True
    
    return False
```

## Alpha-Beta 剪枝

### 核心思想

**剪枝**：如果已经找到更优解，就不需要继续搜索其他分支

### 原理

```
        A (Max)
       / \
      /   \
     B     C   (Min)
    / \   / \
   3   5 ...  (Max)

计算到 B = min(3, 5) = 3 时，
如果 C 的第一个子节点 < 3，
那么 C < 3，A 会选择 B，
C 的其他子节点不需要再计算
```

### 代码实现

```python
def alpha_beta(state, depth, alpha, beta, is_max_player):
    """
    Alpha-Beta 剪枝
    """
    # 终止条件
    if depth == 0 or is_terminal(state):
        return evaluate(state)
    
    if is_max_player:
        max_eval = float('-inf')
        
        for move in get_possible_moves(state):
            new_state = apply_move(state, move)
            eval_score = alpha_beta(new_state, depth - 1, alpha, beta, False)
            max_eval = max(max_eval, eval_score)
            alpha = max(alpha, eval_score)
            
            # Beta 剪枝
            if beta <= alpha:
                break
        
        return max_eval
    else:
        min_eval = float('inf')
        
        for move in get_possible_moves(state):
            new_state = apply_move(state, move)
            eval_score = alpha_beta(new_state, depth - 1, alpha, beta, True)
            min_eval = min(min_eval, eval_score)
            beta = min(beta, eval_score)
            
            # Alpha 剪枝
            if beta <= alpha:
                break
        
        return min_eval
```

**初始调用**：
```python
best_score = alpha_beta(state, max_depth, float('-inf'), float('inf'), True)
```

## DP 中的 Minimax

### 转化思路

在 DP 中，Minimax 思想体现为：
```
dp[i][j] = 当前玩家在区间 [i, j] 能获得的最大优势
```

**优势定义**：
```
优势 = 当前玩家得分 - 对手得分
```

### 状态转移

```python
# 选择左端点 i
left_advantage = nums[i] - dp[i+1][j]

# 选择右端点 j
right_advantage = nums[j] - dp[i][j-1]

# 取最大
dp[i][j] = max(left_advantage, right_advantage)
```

**解释**：
- 选择 `nums[i]` 后，对手在 `[i+1, j]` 上的最大优势是 `dp[i+1][j]`
- 对手的优势 = 我们的劣势
- 所以我们的优势 = `nums[i] - dp[i+1][j]`

## 实战应用

### 应用1：预测赢家（LeetCode 486）

```python
def predict_the_winner(nums):
    """
    两人轮流从数组两端取数，判断先手是否必胜
    """
    n = len(nums)
    dp = [[0] * n for _ in range(n)]
    
    # 边界：单个元素
    for i in range(n):
        dp[i][i] = nums[i]
    
    # 枚举区间长度
    for length in range(2, n + 1):
        for i in range(n - length + 1):
            j = i + length - 1
            
            # 选左端或右端
            dp[i][j] = max(
                nums[i] - dp[i+1][j],   # 选左端
                nums[j] - dp[i][j-1]    # 选右端
            )
    
    return dp[0][n-1] >= 0
```

### 应用2：石子游戏（LeetCode 877）

```python
def stoneGame(piles):
    """
    石子游戏（简化版：数组长度为偶数）
    """
    n = len(piles)
    dp = [[0] * n for _ in range(n)]
    
    for i in range(n):
        dp[i][i] = piles[i]
    
    for length in range(2, n + 1):
        for i in range(n - length + 1):
            j = i + length - 1
            dp[i][j] = max(
                piles[i] - dp[i+1][j],
                piles[j] - dp[i][j-1]
            )
    
    return dp[0][n-1] > 0  # 先手优势 > 0
```

## 复杂度分析

| 方法 | 时间复杂度 | 空间复杂度 | 备注 |
|-----|----------|----------|------|
| 朴素 Minimax | O(b^d) | O(d) | b=分支因子, d=深度 |
| 记忆化 | O(n^2) | O(n^2) | DP 状态数 |
| Alpha-Beta | O(b^(d/2)) | O(d) | 平均剪枝 50% |

## 常见错误

### 错误1：优势定义错误

```python
# 错误：以为优势是绝对得分
dp[i][j] = max(nums[i] + dp[i+1][j], nums[j] + dp[i][j-1])

# 正确：优势是相对对手的差值
dp[i][j] = max(nums[i] - dp[i+1][j], nums[j] - dp[i][j-1])
```

### 错误2：剪枝条件错误

```python
# 错误：Alpha 剪枝条件
if alpha >= beta:  # 错误！应该是 beta <= alpha
    break

# 正确：
if beta <= alpha:
    break
```

### 错误3：递归层级混淆

```python
# 错误：没有区分当前玩家
def wrong_minimax(state):
    if is_terminal(state):
        return evaluate(state)
    
    best = float('-inf')
    for move in get_moves(state):
        new_state = apply_move(state, move)
        best = max(best, wrong_minimax(new_state))  # 错误！
    return best

# 正确：需要标记当前玩家
def correct_minimax(state, is_max_player):
    if is_terminal(state):
        return evaluate(state)
    
    if is_max_player:
        return max(correct_minimax(new_state, False) for new_state in ...)
    else:
        return min(correct_minimax(new_state, True) for new_state in ...)
```

## 小结

### 核心思想
- **最大化玩家**：追求最大收益
- **最小化玩家**：限制对手收益
- **假设**：双方都采取最优策略

### 关键技巧
1. **递归定义**：根据玩家类型选择 max/min
2. **记忆化**：避免重复计算
3. **Alpha-Beta 剪枝**：减少搜索空间
4. **DP 优势**：`dp[i][j] = max(score - dp[next_state])`

### 应用场景
- 井字棋、五子棋等棋类游戏
- 数字游戏（从数组两端取数）
- 石子游戏
- 博弈策略优化

### 优化方向
- **剪枝**：Alpha-Beta、Move Ordering
- **深度限制**：启发式评估
- **迭代加深**：ID-DFS

Minimax 算法是博弈问题的核心思想，理解"**我取最优，对手也取最优**"的对抗思维，是解决博弈型 DP 的关键。
