# 不同的子序列 II

本章我们学习一道与子序列相关的经典动态规划问题：**统计本质不同的子序列数量**。

这是 [LeetCode 940. Distinct Subsequences II](https://leetcode.com/problems/distinct-subsequences-ii/)，难度为 Hard。

---

## 问题描述

给定一个字符串 s，计算 s 的**不同非空子序列**的数量。由于答案可能很大，返回结果对 10^9 + 7 取模。

```
输入: s = "abc"
输出: 7
解释: 7 个不同的子序列是 "a", "b", "c", "ab", "ac", "bc", "abc"

输入: s = "aba"
输出: 6
解释: 6 个不同的子序列是 "a", "b", "ab", "aa", "ba", "aba"
     注意 "a" 只计算一次，虽然它出现了两次

输入: s = "aaa"
输出: 3
解释: 3 个不同的子序列是 "a", "aa", "aaa"
```

---

## 关键思考

### 子序列 vs 子串

首先区分两个概念：
- **子串**（Substring）：连续的字符序列
- **子序列**（Subsequence）：可以不连续，但保持相对顺序

例如 "aba" 的子序列包括 "a", "b", "ab", "aa", "ba", "aba"，而子串只有 "a", "b", "ab", "ba", "aba"。

### 核心难点：去重

如果不考虑去重，长度为 n 的字符串有 2^n - 1 个非空子序列（每个字符选或不选）。

难点在于：**如何避免重复计数相同的子序列？**

---

## 方法一：动态规划（按字符统计）

### 状态定义

定义 `end[c]` 表示以字符 c 结尾的不同子序列数量。

### 转移过程

遍历字符串，对于每个字符 c：

1. **新增子序列**：
   - 把 c 单独作为一个子序列
   - 把 c 追加到所有已有子序列的末尾

2. **更新方式**：
   - `new_end[c] = 1 + sum(end[所有字符])`
   - 其中 1 表示 c 本身，sum 表示把 c 追加到所有已有子序列

3. **去重保证**：
   - 用 `end[c]` 直接更新（覆盖），而不是累加
   - 这样确保以 c 结尾的子序列只计算最新的

### 代码实现

```python
def distinctSubseqII(s: str) -> int:
    """
    统计不同的非空子序列数量
    
    时间复杂度: O(n)
    空间复杂度: O(26) = O(1)
    """
    MOD = 10**9 + 7
    
    # end[c] 表示以字符 c 结尾的不同子序列数量
    end = {}
    
    for c in s:
        # 新的以 c 结尾的子序列数量 = 
        #   1 (c 本身) + 所有已有子序列追加 c
        end[c] = (1 + sum(end.values())) % MOD
    
    return sum(end.values()) % MOD
```

### 执行过程

以 `s = "aba"` 为例：

```
初始: end = {}

处理 'a':
  end['a'] = 1 + 0 = 1
  当前子序列: {"a"}
  end = {'a': 1}

处理 'b':
  end['b'] = 1 + 1 = 2
  当前子序列: {"a", "b", "ab"}
  end = {'a': 1, 'b': 2}

处理 'a':
  end['a'] = 1 + (1+2) = 4
  当前子序列: {"a", "b", "ab", "aa", "ba", "aba"}
  # 注意：新的 'a' 可以生成 "a", "aa", "ba", "aba"
  # 旧的 "a" 被覆盖，因为直接赋值而非累加
  end = {'a': 4, 'b': 2}

结果: 4 + 2 = 6
```

### 为什么直接覆盖可以去重？

关键观察：**如果两个位置的字符相同，后一个位置能生成的子序列是前一个位置的超集**。

例如 "aba" 中：
- 第一个 'a'（位置0）能生成以 'a' 结尾的子序列：{"a"}
- 第三个 'a'（位置2）能生成以 'a' 结尾的子序列：{"a", "aa", "ba", "aba"}

后者包含了前者，所以直接用后者覆盖前者即可。

---

## 方法二：动态规划（累加法）

另一种等价的思路是跟踪总子序列数，遇到重复字符时减去重复部分。

### 状态定义

- `dp[i]` 表示前 i 个字符能形成的不同子序列数（包含空序列）
- `last[c]` 记录字符 c 上次出现的位置

### 转移方程

$$dp[i] = 2 \cdot dp[i-1] - dp[last[s[i]]]$$

- `2 * dp[i-1]`：每个已有子序列都可以选择加或不加当前字符
- `- dp[last[s[i]]]`：减去重复计数的部分

### 代码实现

```python
def distinctSubseqII_v2(s: str) -> int:
    """
    累加法：跟踪总数，减去重复
    """
    MOD = 10**9 + 7
    n = len(s)
    
    # dp[i] 表示前 i 个字符形成的不同子序列数（含空序列）
    dp = [0] * (n + 1)
    dp[0] = 1  # 空序列
    
    # last[c] 记录字符 c 上次出现时的 dp 值
    last = {}
    
    for i in range(1, n + 1):
        c = s[i - 1]
        dp[i] = (2 * dp[i - 1]) % MOD
        
        if c in last:
            dp[i] = (dp[i] - last[c] + MOD) % MOD
        
        last[c] = dp[i - 1]
    
    # 减去空序列
    return (dp[n] - 1 + MOD) % MOD
```

### 执行过程

以 `s = "aba"` 为例：

```
初始: dp[0] = 1 (空序列)
      last = {}

i=1, c='a':
  dp[1] = 2 * 1 = 2
  'a' 未见过
  last = {'a': 1}
  # 子序列（含空）: {∅, a}

i=2, c='b':
  dp[2] = 2 * 2 = 4
  'b' 未见过
  last = {'a': 1, 'b': 2}
  # 子序列（含空）: {∅, a, b, ab}

i=3, c='a':
  dp[3] = 2 * 4 = 8
  'a' 见过，减去 last['a'] = 1
  dp[3] = 8 - 1 = 7
  last = {'a': 4, 'b': 2}
  # 子序列（含空）: {∅, a, b, ab, aa, ba, aba}

结果: 7 - 1 = 6 (减去空序列)
```

### 为什么要减去 dp[last[c]]？

当字符 c 再次出现时，会产生重复：
- 之前以 c 结尾的子序列，现在又会被生成一次
- 这部分重复的数量正好是 dp[last[c]]

---

## 方法三：空间优化

方法一只用了一个字典，已经是 O(1) 空间。方法二也可以优化：

```python
def distinctSubseqII_optimized(s: str) -> int:
    """
    空间优化版本
    """
    MOD = 10**9 + 7
    
    total = 1  # 包含空序列
    last = {}  # 记录每个字符上次贡献的子序列数
    
    for c in s:
        new_total = (2 * total) % MOD
        
        if c in last:
            new_total = (new_total - last[c] + MOD) % MOD
        
        last[c] = total
        total = new_total
    
    return (total - 1 + MOD) % MOD  # 减去空序列
```

---

## 两种方法的等价性

方法一和方法二本质相同：

- 方法一：直接覆盖 `end[c]`，隐式去重
- 方法二：先加倍，再减去重复部分

两者的时间复杂度都是 O(n)，空间复杂度都是 O(26) = O(1)。

---

## 与后缀结构的联系

本章放在后缀结构这一部分，是因为**子序列问题和子串问题有深层联系**：

1. **子串计数**：后缀数组 + LCP 或后缀自动机
2. **子序列计数**：动态规划（本章方法）

虽然解法不同，但都涉及**字符串的组合性质**和**去重技巧**。

后缀自动机虽然主要用于子串问题，但理解其**状态压缩**的思想有助于理解子序列 DP 中的去重逻辑。

---

## 扩展问题

### 扩展 1：统计长度为 k 的不同子序列

```python
def distinctSubseqOfLengthK(s: str, k: int) -> int:
    """
    统计长度恰好为 k 的不同子序列数
    
    dp[j][c] 表示长度为 j 且以字符 c 结尾的不同子序列数
    """
    MOD = 10**9 + 7
    n = len(s)
    
    if k > n:
        return 0
    
    # dp[j] = {c: count}，表示长度为 j 且以 c 结尾的子序列数
    dp = [{} for _ in range(k + 1)]
    dp[0][''] = 1  # 空序列作为基础
    
    for c in s:
        # 从长到短更新，避免重复使用当前字符
        for j in range(min(k, len(s)), 0, -1):
            # 长度为 j 以 c 结尾 = 长度为 j-1 的所有子序列追加 c
            total = sum(dp[j-1].values()) % MOD
            dp[j][c] = total
    
    return sum(dp[k].values()) % MOD
```

### 扩展 2：求字典序第 k 小的子序列

```python
def kthDistinctSubsequence(s: str, k: int) -> str:
    """
    找出字典序第 k 小的不同子序列
    使用类似数位 DP 的思想
    """
    MOD = 10**9 + 7
    n = len(s)
    
    # 预处理：count[i][c] 表示从位置 i 开始以字符 c 开头的不同子序列数
    # 这需要倒序 DP
    count = [{} for _ in range(n + 1)]
    
    for i in range(n - 1, -1, -1):
        count[i] = count[i + 1].copy()
        c = s[i]
        # 以 c 开头的子序列 = c 本身 + c 后面的所有子序列前面加 c
        count[i][c] = 1 + sum(count[i + 1].values())
    
    # 构造答案
    result = []
    pos = 0
    
    while k > 0 and pos < n:
        # 按字典序尝试每个字符
        for c in sorted(count[pos].keys()):
            cnt = count[pos].get(c, 0)
            if cnt >= k:
                result.append(c)
                # 找到以 c 开头的子序列，继续在 c 之后搜索
                # 但要注意 k 可能就是 c 本身
                if k == 1:
                    return ''.join(result)
                k -= 1  # 减去 c 本身
                # 移动到 c 的下一个位置
                for j in range(pos, n):
                    if s[j] == c:
                        pos = j + 1
                        break
                break
            else:
                k -= cnt
    
    return ''.join(result) if k == 0 else ""
```

---

## 完整可提交代码

```python
class Solution:
    def distinctSubseqII(self, s: str) -> int:
        MOD = 10**9 + 7
        end = {}
        
        for c in s:
            end[c] = (1 + sum(end.values())) % MOD
        
        return sum(end.values()) % MOD
```

---

## 本章小结

本章学习了统计不同子序列数量的方法：

1. **按字符统计法**
   - `end[c]` 表示以字符 c 结尾的子序列数
   - 每次覆盖更新，自动去重
   - 时间 O(n)，空间 O(26)

2. **累加减重法**
   - `dp[i] = 2 * dp[i-1] - dp[last[c]]`
   - 先加倍，再减去重复
   - 两种方法等价

3. **核心技巧**
   - 相同字符后出现的可以覆盖先出现的
   - 这是因为后者生成的子序列是前者的超集

下一章我们将进入**后缀自动机**的学习，这是处理子串问题的另一个强大工具。
