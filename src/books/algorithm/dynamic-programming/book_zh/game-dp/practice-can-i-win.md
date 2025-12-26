# 实战：我能赢吗

## 问题描述

**LeetCode 464: 我能赢吗**

在「100 game」这个游戏中，两名玩家轮流选择从 `1` 到 `10` 的任意整数，累计整数和，先使得累计整数和**达到或超过** `100` 的玩家，即为胜者。

如果我们将游戏规则改为「玩家**不能**重复使用整数」呢？

例如，两名玩家可以轮流从公共整数池中抽取从 `1` 到 `15` 的整数（不放回），直到累计整数和 >= `desiredTotal`。

给定两个整数 `maxChoosableInteger`（整数池中可选择的最大数）和 `desiredTotal`（累计和的目标值），请判断先手玩家是否能稳赢。

假设两位玩家游戏时都**足够聪明**，每一步都是**最优解**。

**示例1**：
```
输入：maxChoosableInteger = 10, desiredTotal = 11
输出：false
解释：
无论第一个玩家选择哪个整数，他都会失败。
第一个玩家可以选择从 1 到 10 的整数。
如果第一个玩家选择 1，那么第二个玩家只能选择从 2 到 10 的整数。
第二个玩家可以通过选择整数 10（那么累积和为 11 >= 11），从而取得胜利。
同样，其他选择也会导致第一个玩家失败。
```

**示例2**：
```
输入：maxChoosableInteger = 10, desiredTotal = 0
输出：true
```

**示例3**：
```
输入：maxChoosableInteger = 10, desiredTotal = 1
输出：true
```

**约束**：
- `1 <= maxChoosableInteger <= 20`
- `0 <= desiredTotal <= 300`

## 问题分析

### 核心特点

1. **状态压缩**：已使用的数字需要记录（用位掩码）
2. **博弈问题**：Minimax 思想
3. **记忆化搜索**：避免重复计算

### 状态定义

```
can_win(used, remaining) = 
  当前玩家在已使用 used 集合的数字、
  剩余目标为 remaining 时，是否必胜
```

### 递归逻辑

```python
for i in range(1, maxChoosableInteger + 1):
    if i not in used:
        if i >= remaining:
            return True  # 直接获胜
        
        if not can_win(used | {i}, remaining - i):
            return True  # 对手必败
            
return False  # 所有选择都导致对手必胜
```

## 解法：状态压缩 + 记忆化搜索

### 位掩码表示

用整数的二进制表示已使用的数字：
```
used = 0b10101
表示数字 1, 3, 5 已被使用
```

### 代码实现

```python
def canIWin(maxChoosableInteger, desiredTotal):
    """
    我能赢吗（状态压缩 + 记忆化）
    """
    # 特殊情况
    if desiredTotal <= 0:
        return True
    
    # 所有数字之和都小于目标，无人能赢
    total_sum = maxChoosableInteger * (maxChoosableInteger + 1) // 2
    if total_sum < desiredTotal:
        return False
    
    memo = {}
    
    def can_win(used, remaining):
        # 记忆化查询
        if (used, remaining) in memo:
            return memo[(used, remaining)]
        
        # 枚举当前可选的数字
        for i in range(1, maxChoosableInteger + 1):
            mask = 1 << (i - 1)
            
            # 检查数字 i 是否已被使用
            if used & mask:
                continue
            
            # 选择数字 i
            if i >= remaining:
                # 直接获胜
                memo[(used, remaining)] = True
                return True
            
            # 选择 i 后，对手是否必败
            if not can_win(used | mask, remaining - i):
                # 对手必败，当前玩家必胜
                memo[(used, remaining)] = True
                return True
        
        # 所有选择都导致对手必胜
        memo[(used, remaining)] = False
        return False
    
    return can_win(0, desiredTotal)
```

### 复杂度分析

- **时间复杂度**：O(2^n × n)，其中 n = `maxChoosableInteger`
- **空间复杂度**：O(2^n × desiredTotal)

## 完整示例

### 示例1：maxChoosableInteger = 3, desiredTotal = 4

```
初始状态：used = 0b000, remaining = 4

玩家 1 选择：
  选 1: used = 0b001, remaining = 3
    玩家 2 选择：
      选 2: used = 0b011, remaining = 1
        玩家 1 选择：
          选 3: remaining = 1 - 3 = -2（玩家 1 胜）
      选 3: used = 0b101, remaining = 0（玩家 2 胜）
    玩家 2 能通过选 3 获胜
  
  选 2: used = 0b010, remaining = 2
    玩家 2 选择：
      选 1: used = 0b011, remaining = 1
        玩家 1 选择：
          选 3: 玩家 1 胜
      选 3: used = 0b110, remaining = -1（玩家 2 胜）
    玩家 2 能通过选 3 获胜
  
  选 3: used = 0b100, remaining = 1
    玩家 2 选择：
      选 1: remaining = 0（玩家 2 胜）
      选 2: remaining = -1（玩家 2 胜）
    玩家 2 必胜

玩家 1 的所有选择都导致玩家 2 获胜
答案：False
```

### 示例2：maxChoosableInteger = 10, desiredTotal = 11

```
玩家 1 选择 10：
  remaining = 11 - 10 = 1
  玩家 2 选择 1：
    remaining = 0（玩家 2 胜）

玩家 1 选择 9：
  remaining = 11 - 9 = 2
  玩家 2 选择 2：
    remaining = 0（玩家 2 胜）
  
...（其他选择类似）

玩家 1 无法找到必胜策略
答案：False
```

## 状态压缩详解

### 位运算操作

```python
# 检查数字 i 是否已使用
if used & (1 << (i - 1)):
    # i 已使用
    
# 标记数字 i 为已使用
used |= (1 << (i - 1))

# 检查数字 i 是否未使用
if not (used & (1 << (i - 1))):
    # i 未使用
```

### 示例

```
maxChoosableInteger = 5
used = 0b10101

二进制解读：
  位 0 (数字 1): 1 → 已使用
  位 1 (数字 2): 0 → 未使用
  位 2 (数字 3): 1 → 已使用
  位 3 (数字 4): 0 → 未使用
  位 4 (数字 5): 1 → 已使用
```

## 常见错误

### 错误1：忘记特殊情况

```python
# 错误：没有检查 desiredTotal <= 0
def wrong_solution(maxChoosableInteger, desiredTotal):
    memo = {}
    # ...

# 当 desiredTotal = 0 时，先手直接获胜（不需要选任何数）
```

### 错误2：没有检查总和

```python
# 错误：没有检查所有数字之和
def wrong_solution2(maxChoosableInteger, desiredTotal):
    if desiredTotal <= 0:
        return True
    
    # 直接开始搜索
    return can_win(0, desiredTotal)

# 当总和 < desiredTotal 时，无人能赢，应返回 False
```

### 错误3：状态压缩错误

```python
# 错误：位运算错误
mask = 1 << i  # 错误！应该是 1 << (i - 1)

# 数字 1 对应位 0，数字 2 对应位 1，...
```

### 错误4：理解错误

```python
# 错误：以为是概率问题
def wrong_logic(maxChoosableInteger, desiredTotal):
    # 认为每个数字被选的概率是 1/n
    # 计算期望值
    expected = sum(range(1, maxChoosableInteger + 1)) / maxChoosableInteger
    return expected >= desiredTotal

# 正确：是博弈问题，需要考虑双方最优策略
```

## 优化技巧

### 优化1：提前终止

```python
def canIWin_optimized(maxChoosableInteger, desiredTotal):
    """
    提前终止优化
    """
    if desiredTotal <= 0:
        return True
    
    total_sum = maxChoosableInteger * (maxChoosableInteger + 1) // 2
    if total_sum < desiredTotal:
        return False
    if total_sum == desiredTotal:
        return maxChoosableInteger % 2 == 1  # 奇数个数字，先手胜
    
    memo = {}
    
    def can_win(used, remaining):
        if (used, remaining) in memo:
            return memo[(used, remaining)]
        
        for i in range(maxChoosableInteger, 0, -1):  # 从大到小枚举
            mask = 1 << (i - 1)
            
            if used & mask:
                continue
            
            if i >= remaining or not can_win(used | mask, remaining - i):
                memo[(used, remaining)] = True
                return True
        
        memo[(used, remaining)] = False
        return False
    
    return can_win(0, desiredTotal)
```

### 优化2：位运算优化

```python
def canIWin_bitwise(maxChoosableInteger, desiredTotal):
    """
    位运算优化
    """
    if desiredTotal <= 0:
        return True
    
    total_sum = (1 + maxChoosableInteger) * maxChoosableInteger // 2
    if total_sum < desiredTotal:
        return False
    
    memo = {}
    
    def can_win(used, remaining):
        if used in memo:
            return memo[used]
        
        # 枚举所有未使用的数字
        available = ~used & ((1 << maxChoosableInteger) - 1)
        
        for i in range(maxChoosableInteger):
            if available & (1 << i):
                num = i + 1
                
                if num >= remaining or \
                   not can_win(used | (1 << i), remaining - num):
                    memo[used] = True
                    return True
        
        memo[used] = False
        return False
    
    return can_win(0, desiredTotal)
```

## 扩展问题

### 扩展1：返回最优策略

```python
def canIWin_with_strategy(maxChoosableInteger, desiredTotal):
    """
    返回先手必胜的策略
    """
    if desiredTotal <= 0:
        return True, []
    
    total_sum = maxChoosableInteger * (maxChoosableInteger + 1) // 2
    if total_sum < desiredTotal:
        return False, []
    
    memo = {}
    
    def can_win(used, remaining):
        if (used, remaining) in memo:
            return memo[(used, remaining)]
        
        for i in range(1, maxChoosableInteger + 1):
            mask = 1 << (i - 1)
            
            if used & mask:
                continue
            
            if i >= remaining:
                memo[(used, remaining)] = (True, [i])
                return (True, [i])
            
            opponent_result = can_win(used | mask, remaining - i)
            if not opponent_result[0]:
                memo[(used, remaining)] = (True, [i] + opponent_result[1])
                return (True, [i] + opponent_result[1])
        
        memo[(used, remaining)] = (False, [])
        return (False, [])
    
    return can_win(0, desiredTotal)
```

## 小结

### 核心思想
- **状态压缩**：用位掩码表示已使用的数字
- **Minimax**：我方选择使对手必败的策略
- **记忆化**：避免重复计算

### 关键步骤
1. **特殊情况**：`desiredTotal <= 0` 或总和不足
2. **状态压缩**：用整数表示已使用的数字集合
3. **递归搜索**：枚举可选数字，检查对手是否必败
4. **记忆化**：缓存 `(used, remaining)` 的结果

### 易错点
- ✓ 特殊情况处理（`desiredTotal <= 0`）
- ✓ 检查总和（无人能赢时返回 False）
- ✓ 位运算正确性（数字 i 对应位 i-1）
- ✗ 忘记记忆化（超时）
- ✗ 状态压缩错误

### 优化方向
- **提前终止**：从大到小枚举
- **位运算优化**：减少掩码计算
- **状态复用**：只用 `used` 作为键

这道题是**状态压缩 DP + 博弈论**的经典应用，核心在于：
1. 用位掩码表示状态（已使用的数字）
2. 用 Minimax 思想搜索必胜策略
3. 用记忆化避免重复计算
