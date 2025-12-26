# 实战：翻转游戏 II

## 问题描述

**LeetCode 294: 翻转游戏 II**

你和朋友玩一个叫做「翻转游戏」的游戏。游戏规则如下：

给你一个字符串 `currentState`，其中只含 `'+'` 和 `'-'`。你和朋友轮流将**连续**的两个 `"++"` 反转成 `"--"`。当一方无法进行有效的移动时为输家。

请你写出一个函数来判定**起始玩家是否存在必胜的方法**。

**示例1**：
```
输入：currentState = "++++"
输出：true
解释：起始玩家可以通过翻转中间的 "++" 来保证胜利：
     "++++" -> "+--+"
```

**示例2**：
```
输入：currentState = "+"
输出：false
```

**约束**：
- `1 <= currentState.length <= 60`
- `currentState[i]` 不是 `'+'` 就是 `'-'`

## 问题分析

### 博弈特点

- **零和游戏**：一方胜，另一方负
- **完全信息**：双方都知道当前状态
- **无随机性**：结果完全取决于策略

### Minimax 思想

**必胜状态**：存在至少一个后继状态是**必败状态**

**必败状态**：所有后继状态都是**必胜状态**，或无后继状态

**递归定义**：
```python
can_win(state) = 
  if 无可用移动:
    return False  # 必败
  else:
    return any(not can_win(next_state) for next_state in all_moves)
```

## 解法一：记忆化搜索

### 思路

使用记忆化避免重复计算相同状态

### 代码实现

```python
def canWin(currentState):
    """
    翻转游戏 II（记忆化搜索）
    """
    memo = {}
    
    def can_win_helper(state):
        # 记忆化查询
        if state in memo:
            return memo[state]
        
        # 枚举所有可能的移动
        for i in range(len(state) - 1):
            if state[i:i+2] == '++':
                # 执行移动
                next_state = state[:i] + '--' + state[i+2:]
                
                # 如果对手必败，则当前玩家必胜
                if not can_win_helper(next_state):
                    memo[state] = True
                    return True
        
        # 所有移动都导致对手必胜，则当前玩家必败
        memo[state] = False
        return False
    
    return can_win_helper(currentState)
```

### 复杂度分析

- **时间复杂度**：O(n × 2^n)（状态数 × 每个状态的移动数）
- **空间复杂度**：O(2^n)（记忆化存储）

## 解法二：博弈论优化

### Sprague-Grundy 定理

对于**无偏博弈**（Impartial Game），可以用 **SG 函数**计算必胜状态

**SG 函数定义**：
```
SG(state) = mex({SG(next_state) for all next_state})
```

其中 `mex` 是最小排除数（Minimum Excludant）

### 代码实现（进阶）

```python
def canWin_sg(currentState):
    """
    翻转游戏 II（SG 函数）
    """
    def calculate_sg(state, memo):
        if state in memo:
            return memo[state]
        
        moves = set()
        
        for i in range(len(state) - 1):
            if state[i:i+2] == '++':
                next_state = state[:i] + '--' + state[i+2:]
                moves.add(calculate_sg(next_state, memo))
        
        # 计算 mex
        sg = 0
        while sg in moves:
            sg += 1
        
        memo[state] = sg
        return sg
    
    memo = {}
    sg_value = calculate_sg(currentState, memo)
    return sg_value != 0  # SG 值非 0 表示必胜
```

## 完整示例

### 示例1："++++"

```
起始状态："++++"

可能的移动：
1. 翻转位置 0-1："--++"
2. 翻转位置 1-2："+--+"
3. 翻转位置 2-3："++--"

检查移动 2（"+--+"）：
  对手的可能移动：
    - 翻转位置 0-1："---+"（对手无法继续，对手输）
  
  存在一个移动使对手必败，所以当前玩家必胜

答案：True
```

### 示例2："+++"

```
起始状态："+++"

可能的移动：
1. 翻转位置 0-1："--+"
2. 翻转位置 1-2："+--"

检查移动 1（"--+"）：
  对手无可用移动，对手输，当前玩家胜

答案：True
```

### 示例3："++-++"

```
起始状态："++-++"

可能的移动：
1. 翻转位置 0-1："---++"
2. 翻转位置 3-4："++---"

检查移动 1（"---++"）：
  对手可能移动：
    - 翻转位置 3-4："-----"（对手无法继续，对手输）
  
  存在移动使对手必败，所以当前玩家必胜

答案：True
```

## 游戏树可视化

```
        "++++"
       /  |  \
      /   |   \
   "--++" "+--+" "++--"
    /    /   \    \
   ...  "---+" "+---" ...
        (输)   (输)
```

**分析**：
- 从 "+--+" 出发，对手只有两个选择
- 两个选择都导致对手无法继续（必败）
- 所以 "+--+" 是必胜状态
- 因此 "++++" 是必胜状态（存在必胜的后继）

## 常见错误

### 错误1：忘记记忆化

```python
# 错误：没有记忆化，超时
def wrong_solution(state):
    for i in range(len(state) - 1):
        if state[i:i+2] == '++':
            next_state = state[:i] + '--' + state[i+2:]
            if not wrong_solution(next_state):  # 重复计算
                return True
    return False

# 正确：使用记忆化
memo = {}
def correct_solution(state):
    if state in memo:
        return memo[state]
    # ...
```

### 错误2：理解错误

```python
# 错误：以为所有后继都必败才是必胜
def wrong_logic(state):
    for next_state in get_next_states(state):
        if can_win(next_state):  # 错误！应该是 not can_win
            return False
    return True

# 正确：存在一个后继必败即可必胜
for next_state in get_next_states(state):
    if not can_win(next_state):
        return True
return False
```

### 错误3：字符串操作效率低

```python
# 低效：大量字符串拼接
next_state = state[:i] + '--' + state[i+2:]

# 优化：使用列表
state_list = list(state)
state_list[i] = '-'
state_list[i+1] = '-'
next_state = ''.join(state_list)

# 或直接用列表作为状态（需要转为 tuple 作为哈希键）
```

## 优化技巧

### 优化1：提前终止

```python
def canWin_optimized(currentState):
    """
    提前终止优化
    """
    memo = {}
    
    def helper(state):
        if state in memo:
            return memo[state]
        
        for i in range(len(state) - 1):
            if state[i:i+2] == '++':
                next_state = state[:i] + '--' + state[i+2:]
                
                if not helper(next_state):
                    memo[state] = True
                    return True  # 找到一个必胜移动，立即返回
        
        memo[state] = False
        return False
    
    return helper(currentState)
```

### 优化2：状态压缩

```python
def canWin_bitset(currentState):
    """
    位运算优化（适合大规模数据）
    """
    # 将状态转为二进制
    def state_to_int(s):
        return int(''.join('1' if c == '+' else '0' for c in s), 2)
    
    def int_to_state(num, length):
        return bin(num)[2:].zfill(length).replace('1', '+').replace('0', '-')
    
    initial_state = state_to_int(currentState)
    memo = {}
    
    def helper(state):
        if state in memo:
            return memo[state]
        
        state_str = int_to_state(state, len(currentState))
        
        for i in range(len(state_str) - 1):
            if state_str[i:i+2] == '++':
                # 位运算翻转
                next_state = state ^ (3 << (len(state_str) - i - 2))
                
                if not helper(next_state):
                    memo[state] = True
                    return True
        
        memo[state] = False
        return False
    
    return helper(initial_state)
```

## 扩展问题

### 扩展1：返回必胜移动

```python
def canWin_with_move(currentState):
    """
    返回必胜移动的位置
    """
    memo = {}
    
    def helper(state):
        if state in memo:
            return memo[state]
        
        for i in range(len(state) - 1):
            if state[i:i+2] == '++':
                next_state = state[:i] + '--' + state[i+2:]
                
                if not helper(next_state):
                    memo[state] = (True, i)
                    return (True, i)
        
        memo[state] = (False, -1)
        return (False, -1)
    
    return helper(currentState)
```

### 扩展2：计算必胜步数

```python
def min_steps_to_win(currentState):
    """
    计算最少几步必胜
    """
    memo = {}
    
    def helper(state):
        if state in memo:
            return memo[state]
        
        min_steps = float('inf')
        
        for i in range(len(state) - 1):
            if state[i:i+2] == '++':
                next_state = state[:i] + '--' + state[i+2:]
                opponent_steps = helper(next_state)
                
                if opponent_steps == float('inf'):
                    # 对手必败
                    min_steps = min(min_steps, 1)
                else:
                    # 对手需要 opponent_steps 步
                    min_steps = min(min_steps, opponent_steps + 1)
        
        memo[state] = min_steps
        return min_steps
    
    result = helper(currentState)
    return result if result != float('inf') else -1
```

## 小结

### 核心思想
- **Minimax 博弈**：存在一个后继状态是必败状态，则当前是必胜状态
- **记忆化搜索**：避免重复计算相同状态
- **递归定义**：`can_win(s) = any(not can_win(next_s))`

### 关键步骤
1. **枚举移动**：找到所有 "++" 位置
2. **递归判断**：检查翻转后对手是否必败
3. **记忆化**：缓存已计算的状态
4. **返回结果**：存在必胜移动返回 True

### 易错点
- ✓ 使用记忆化（避免超时）
- ✓ 理解必胜条件（存在一个必败后继）
- ✗ 忘记记忆化
- ✗ 混淆必胜和必败的逻辑

### 优化方向
- **提前终止**：找到必胜移动立即返回
- **状态压缩**：位运算优化字符串操作
- **Alpha-Beta 剪枝**：减少搜索空间

这道题是**博弈论 DP** 的经典应用，核心在于理解 **Minimax 思想**：我方最优策略是找到一个移动，使得对手陷入必败状态。
