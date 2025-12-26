# 通配符匹配（LeetCode 44）

## 问题描述

> 给定字符串 `s` 和模式 `p`，实现通配符匹配，支持 `?` 和 `*`：
> - `?` 匹配任意单个字符
> - `*` 匹配任意字符序列（包括空序列）

**示例**：
```
输入：s = "adceb", p = "*a*b"
输出：true
解释：第一个 * 匹配空串，第二个 * 匹配 "dce"

输入：s = "acdcb", p = "a*c?b"
输出：false
```

## 解法一：动态规划

**状态定义**：
```
dp[i][j] = s[0:i] 与 p[0:j] 是否匹配
```

**状态转移**：
```python
if p[j-1] == '*':
    dp[i][j] = dp[i][j-1]    # * 匹配空串
            or dp[i-1][j]    # * 匹配至少一个字符
elif p[j-1] == '?' or s[i-1] == p[j-1]:
    dp[i][j] = dp[i-1][j-1]
else:
    dp[i][j] = False
```

**完整代码**：
```python
def isMatch(s, p):
    """
    通配符匹配 - DP解法
    """
    m, n = len(s), len(p)
    dp = [[False] * (n + 1) for _ in range(m + 1)]
    
    # 初始化
    dp[0][0] = True
    for j in range(1, n + 1):
        if p[j-1] == '*':
            dp[0][j] = dp[0][j-1]
    
    # 状态转移
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if p[j-1] == '*':
                dp[i][j] = dp[i][j-1] or dp[i-1][j]
            elif p[j-1] == '?' or s[i-1] == p[j-1]:
                dp[i][j] = dp[i-1][j-1]
    
    return dp[m][n]

# 测试
print(isMatch("adceb", "*a*b"))      # True
print(isMatch("acdcb", "a*c?b"))     # False
print(isMatch("", "*"))              # True
print(isMatch("aa", "a"))            # False
```

**复杂度**：
- 时间：O(m × n)
- 空间：O(m × n)

## 解法二：空间优化（滚动数组）

```python
def isMatch_optimized(s, p):
    """
    空间优化到 O(n)
    """
    m, n = len(s), len(p)
    dp = [False] * (n + 1)
    dp[0] = True
    
    # 初始化第一行
    for j in range(1, n + 1):
        if p[j-1] == '*':
            dp[j] = dp[j-1]
        else:
            break
    
    # 状态转移
    for i in range(1, m + 1):
        new_dp = [False] * (n + 1)
        
        for j in range(1, n + 1):
            if p[j-1] == '*':
                new_dp[j] = new_dp[j-1] or dp[j]
            elif p[j-1] == '?' or s[i-1] == p[j-1]:
                new_dp[j] = dp[j-1]
        
        dp = new_dp
    
    return dp[n]
```

## 解法三：贪心 + 回溯

**核心思想**：
- 遇到 `*` 时，记录位置，先尝试匹配 0 个字符
- 如果后续匹配失败，回溯到 `*` 位置，尝试匹配更多字符

```python
def isMatch_greedy(s, p):
    """
    贪心 + 回溯
    """
    s_idx = p_idx = 0
    star_idx = match = -1
    
    while s_idx < len(s):
        # 字符匹配
        if p_idx < len(p) and (p[p_idx] == '?' or s[s_idx] == p[p_idx]):
            s_idx += 1
            p_idx += 1
        # 遇到 *，记录位置
        elif p_idx < len(p) and p[p_idx] == '*':
            star_idx = p_idx
            match = s_idx
            p_idx += 1
        # 回溯到 *
        elif star_idx != -1:
            p_idx = star_idx + 1
            match += 1
            s_idx = match
        else:
            return False
    
    # 检查 p 剩余部分是否都是 *
    while p_idx < len(p) and p[p_idx] == '*':
        p_idx += 1
    
    return p_idx == len(p)

# 测试
print(isMatch_greedy("adceb", "*a*b"))
```

**复杂度**：
- 时间：O(m × n)（最坏情况）
- 空间：O(1)

## 解法四：优化模式预处理

**优化技巧**：多个连续 `*` 等价于一个 `*`。

```python
def preprocess_pattern(p):
    """
    合并连续的 *
    """
    result = []
    for char in p:
        if char == '*':
            if not result or result[-1] != '*':
                result.append('*')
        else:
            result.append(char)
    return ''.join(result)

def isMatch_preprocessed(s, p):
    p = preprocess_pattern(p)
    return isMatch(s, p)

# 测试
print(isMatch_preprocessed("aa", "***a***"))  # True
```

## 对比：通配符 vs 正则表达式

| 特性 | 通配符 (*,?) | 正则表达式 (*,.) |
|-----|------------|---------------|
| `*` 含义 | 匹配任意序列 | 前一个字符重复 0-n 次 |
| 难度 | 简单 | 困难（需要处理重复） |
| DP转移 | `dp[i][j-1] \| dp[i-1][j]` | 更复杂 |

**正则表达式**（LeetCode 10）：
```python
def isMatch_regex(s, p):
    """
    正则表达式匹配（. 和 *）
    """
    m, n = len(s), len(p)
    dp = [[False] * (n + 1) for _ in range(m + 1)]
    dp[0][0] = True
    
    # 处理 a* 匹配空串的情况
    for j in range(2, n + 1):
        if p[j-1] == '*':
            dp[0][j] = dp[0][j-2]
    
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if p[j-1] == '*':
                # * 匹配 0 次
                dp[i][j] = dp[i][j-2]
                # * 匹配至少 1 次
                if p[j-2] == '.' or p[j-2] == s[i-1]:
                    dp[i][j] |= dp[i-1][j]
            elif p[j-1] == '.' or p[j-1] == s[i-1]:
                dp[i][j] = dp[i-1][j-1]
    
    return dp[m][n]
```

## 常见错误

**错误 1：忘记初始化**
```python
# 错误
dp[0][0] = True
# 正确：还需要处理 * 匹配空串
for j in range(1, n + 1):
    if p[j-1] == '*':
        dp[0][j] = dp[0][j-1]
```

**错误 2：* 的转移方向**
```python
# 错误
dp[i][j] = dp[i-1][j-1] or dp[i-1][j]
# 正确
dp[i][j] = dp[i][j-1] or dp[i-1][j]
#          ↑ 匹配0个  ↑ 匹配至少1个
```

**错误 3：贪心策略不当**
```python
# 错误：贪心让 * 匹配尽可能多
# 反例：s="ab", p="*b"，如果 * 匹配 "ab"，则失败

# 正确：先尝试匹配少，失败再回溯
```

## 扩展：多模式匹配

**问题**：给定多个模式，判断是否有任一模式匹配。

```python
def multiPatternMatch(s, patterns):
    """
    多模式通配符匹配
    """
    return any(isMatch(s, p) for p in patterns)
```

**优化**：用 Trie 树 + AC自动机优化。

## 小结

| 解法 | 时间 | 空间 | 特点 |
|-----|-----|-----|-----|
| DP | O(mn) | O(mn) | 标准解法 |
| DP优化 | O(mn) | O(n) | 滚动数组 |
| 贪心 | O(mn) | O(1) | 实现复杂 |

**关键点**：
- `*` 可以匹配 0 或多个字符
- DP转移：`dp[i][j-1]` 或 `dp[i-1][j]`
- 初始化：处理 `*` 匹配空串
- 优化：预处理合并连续 `*`
