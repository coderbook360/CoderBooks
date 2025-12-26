# 扰乱字符串（LeetCode 87）

## 问题描述

> 给定字符串 `s1` 和 `s2`，判断 `s2` 是否是 `s1` 的扰乱字符串。
> 
> **扰乱定义**：将字符串表示为二叉树，每个内部节点将字符串分成两部分，可以选择交换两个子节点。

**示例**：
```
输入：s1 = "great", s2 = "rgeat"
输出：true
解释：
    great
    /    \
   gr    eat
  / \    /  \
 g   r  e   at
           / \
          a   t
          
交换 "gr" 的子节点 → "rg"
交换 "eat" 和 "rg" → "rgeat"

输入：s1 = "abcde", s2 = "caebd"
输出：false
```

## 解法一：递归 + 记忆化

**核心思想**：
- 枚举分割点 k
- 递归判断两种情况：
  1. 不交换：`s1[0:k]` ↔ `s2[0:k]` 且 `s1[k:n]` ↔ `s2[k:n]`
  2. 交换：`s1[0:k]` ↔ `s2[n-k:n]` 且 `s1[k:n]` ↔ `s2[0:n-k]`

**代码**：
```python
def isScramble(s1, s2):
    """
    递归 + 记忆化
    """
    memo = {}
    
    def helper(s1, s2):
        if (s1, s2) in memo:
            return memo[(s1, s2)]
        
        # 基本情况
        if s1 == s2:
            return True
        
        # 字符频率不同，不可能是扰乱字符串
        if sorted(s1) != sorted(s2):
            return False
        
        n = len(s1)
        
        # 枚举分割点
        for k in range(1, n):
            # 不交换
            if helper(s1[:k], s2[:k]) and helper(s1[k:], s2[k:]):
                memo[(s1, s2)] = True
                return True
            
            # 交换
            if helper(s1[:k], s2[n-k:]) and helper(s1[k:], s2[:n-k]):
                memo[(s1, s2)] = True
                return True
        
        memo[(s1, s2)] = False
        return False
    
    return helper(s1, s2)

# 测试
print(isScramble("great", "rgeat"))  # True
print(isScramble("abcde", "caebd"))  # False
```

**复杂度**：
- 时间：O(n^4)（有 O(n^2) 个子问题，每个 O(n^2)）
- 空间：O(n^3)

## 解法二：三维DP

**状态定义**：
```
dp[i][j][len] = s1[i:i+len] 与 s2[j:j+len] 是否是扰乱字符串
```

**状态转移**：
```python
for k in range(1, len):
    # 不交换
    if dp[i][j][k] and dp[i+k][j+k][len-k]:
        dp[i][j][len] = True
    
    # 交换
    if dp[i][j+len-k][k] and dp[i+k][j][len-k]:
        dp[i][j][len] = True
```

**完整代码**：
```python
def isScramble_dp(s1, s2):
    """
    三维DP
    """
    if s1 == s2:
        return True
    
    if sorted(s1) != sorted(s2):
        return False
    
    n = len(s1)
    dp = [[[False] * (n + 1) for _ in range(n)] for _ in range(n)]
    
    # 初始化：长度为 1
    for i in range(n):
        for j in range(n):
            dp[i][j][1] = (s1[i] == s2[j])
    
    # 枚举长度
    for length in range(2, n + 1):
        for i in range(n - length + 1):
            for j in range(n - length + 1):
                # 枚举分割点
                for k in range(1, length):
                    # 不交换
                    if dp[i][j][k] and dp[i+k][j+k][length-k]:
                        dp[i][j][length] = True
                        break
                    
                    # 交换
                    if dp[i][j+length-k][k] and dp[i+k][j][length-k]:
                        dp[i][j][length] = True
                        break
    
    return dp[0][0][n]

# 测试
print(isScramble_dp("great", "rgeat"))
```

**复杂度**：
- 时间：O(n^4)
- 空间：O(n^3)

## 优化：剪枝

**剪枝技巧**：

1. **字符频率剪枝**：
```python
def can_scramble(s1, s2):
    """提前判断字符频率"""
    return sorted(s1) == sorted(s2)
```

2. **长度剪枝**：
```python
if len(s1) != len(s2):
    return False
```

3. **前缀/后缀剪枝**：
```python
# 去除公共前缀
i = 0
while i < len(s1) and s1[i] == s2[i]:
    i += 1

# 去除公共后缀
j = 0
while j < len(s1) - i and s1[-(j+1)] == s2[-(j+1)]:
    j += 1

s1 = s1[i:len(s1)-j]
s2 = s2[i:len(s2)-j]
```

**优化后的代码**：
```python
def isScramble_optimized(s1, s2):
    """
    带剪枝的递归
    """
    if len(s1) != len(s2):
        return False
    
    if s1 == s2:
        return True
    
    # 去除公共前缀
    i = 0
    while i < len(s1) and s1[i] == s2[i]:
        i += 1
    
    if i > 0:
        return isScramble_optimized(s1[i:], s2[i:])
    
    # 去除公共后缀
    j = 0
    while j < len(s1) and s1[-(j+1)] == s2[-(j+1)]:
        j += 1
    
    if j > 0:
        return isScramble_optimized(s1[:len(s1)-j], s2[:len(s2)-j])
    
    # 字符频率剪枝
    if sorted(s1) != sorted(s2):
        return False
    
    n = len(s1)
    memo = {}
    
    def helper(s1, s2):
        if (s1, s2) in memo:
            return memo[(s1, s2)]
        
        if s1 == s2:
            return True
        
        if sorted(s1) != sorted(s2):
            return False
        
        n = len(s1)
        for k in range(1, n):
            if (helper(s1[:k], s2[:k]) and helper(s1[k:], s2[k:])) or \
               (helper(s1[:k], s2[n-k:]) and helper(s1[k:], s2[:n-k])):
                memo[(s1, s2)] = True
                return True
        
        memo[(s1, s2)] = False
        return False
    
    return helper(s1, s2)
```

## 可视化理解

**示例：s1 = "great", s2 = "rgeat"**

```
分割点 k=2:
s1: "gr" | "eat"
s2: "rg" | "eat"

不交换：
  "gr" ↔ "rg" ?
  
  继续分割 k=1:
  "g" | "r" ↔ "r" | "g"
  交换：✓
  
  "eat" ↔ "eat": ✓

结果：True
```

## 相关问题

**问题一：最少交换次数**
```python
def minSwaps(s1, s2):
    """
    如果 s2 是 s1 的扰乱字符串，求最少交换次数
    """
    # 扩展：记录交换次数
    pass
```

**问题二：生成所有扰乱字符串**
```python
def generateScrambles(s):
    """
    生成 s 的所有扰乱字符串
    """
    if len(s) <= 1:
        return [s]
    
    result = set([s])
    
    for k in range(1, len(s)):
        left_scrambles = generateScrambles(s[:k])
        right_scrambles = generateScrambles(s[k:])
        
        for left in left_scrambles:
            for right in right_scrambles:
                result.add(left + right)
                result.add(right + left)  # 交换
    
    return list(result)

# 测试
print(generateScrambles("abc"))
# ['abc', 'acb', 'bac', 'bca', 'cab', 'cba']
```

## 常见错误

**错误 1：遗漏交换情况**
```python
# 错误：只考虑不交换
if helper(s1[:k], s2[:k]) and helper(s1[k:], s2[k:]):
    return True

# 正确：两种情况都要考虑
```

**错误 2：边界条件**
```python
# 错误
for k in range(n):  # k=0 和 k=n 无意义

# 正确
for k in range(1, n):
```

**错误 3：记忆化键**
```python
# 错误：用索引作为键（递归时字符串已经切片）
memo[(i, j, len)]

# 正确：用字符串本身
memo[(s1, s2)]
```

## 小结

| 解法 | 时间 | 空间 | 特点 |
|-----|-----|-----|-----|
| 递归 + 记忆化 | O(n^4) | O(n^3) | 实现简单 |
| 三维DP | O(n^4) | O(n^3) | 迭代版本 |
| 剪枝优化 | O(n^4) | O(n^3) | 常数优化 |

**关键点**：
- 枚举分割点
- 两种情况：交换/不交换
- 剪枝：字符频率、公共前后缀
- 记忆化避免重复计算
