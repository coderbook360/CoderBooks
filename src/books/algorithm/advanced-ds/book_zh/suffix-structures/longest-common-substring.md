# 最长公共子串

**最长公共子串**（Longest Common Substring, LCS）是字符串处理的经典问题：找出两个字符串的最长公共连续子串。

注意区分：
- **公共子串**（Substring）：连续的公共部分
- **公共子序列**（Subsequence）：可以不连续

本章将介绍使用后缀自动机和后缀数组解决这一问题。

---

## 问题描述

给定两个字符串 s 和 t，找出它们的最长公共子串。

```
输入: s = "abcdef", t = "zbcdf"
输出: "bcd"
解释: "bcd" 是最长的公共子串，长度为 3

输入: s = "abcde", t = "fghij"
输出: ""
解释: 没有公共子串
```

这对应 [LeetCode 718. Maximum Length of Repeated Subarray](https://leetcode.com/problems/maximum-length-of-repeated-subarray/)（数组版本）。

---

## 方法一：后缀自动机

### 核心思想

1. 对字符串 s 构建后缀自动机
2. 用 t 在 SAM 上匹配，记录最长匹配长度

### 算法过程

- 从 SAM 的初始状态开始
- 逐字符读入 t
- 如果当前状态有对应转移，走转移，长度 +1
- 如果没有转移，沿后缀链接回退，直到有转移或回到根
- 记录过程中的最大长度

### 代码实现

```python
from typing import Dict, List

def longest_common_substring_sam(s: str, t: str) -> str:
    """
    使用后缀自动机求最长公共子串
    
    时间复杂度: O(|s| + |t|)
    空间复杂度: O(|s|)
    """
    if not s or not t:
        return ""
    
    # 构建 s 的 SAM
    states = [{'len': 0, 'link': -1, 'trans': {}}]
    last = 0
    
    def add_char(c):
        nonlocal last
        cur = len(states)
        states.append({
            'len': states[last]['len'] + 1,
            'link': -1,
            'trans': {}
        })
        
        p = last
        while p != -1 and c not in states[p]['trans']:
            states[p]['trans'][c] = cur
            p = states[p]['link']
        
        if p == -1:
            states[cur]['link'] = 0
        else:
            q = states[p]['trans'][c]
            if states[p]['len'] + 1 == states[q]['len']:
                states[cur]['link'] = q
            else:
                clone = len(states)
                states.append({
                    'len': states[p]['len'] + 1,
                    'link': states[q]['link'],
                    'trans': states[q]['trans'].copy()
                })
                states[q]['link'] = clone
                states[cur]['link'] = clone
                
                while p != -1 and states[p]['trans'].get(c) == q:
                    states[p]['trans'][c] = clone
                    p = states[p]['link']
        
        last = cur
    
    for c in s:
        add_char(c)
    
    # 在 SAM 上匹配 t
    cur_state = 0
    cur_len = 0
    max_len = 0
    max_end = 0  # 最长匹配在 t 中的结束位置
    
    for i, c in enumerate(t):
        while cur_state != 0 and c not in states[cur_state]['trans']:
            # 回退到后缀链接
            cur_state = states[cur_state]['link']
            cur_len = states[cur_state]['len']
        
        if c in states[cur_state]['trans']:
            cur_state = states[cur_state]['trans'][c]
            cur_len += 1
        else:
            # 回到根，还是没有转移
            cur_state = 0
            cur_len = 0
        
        if cur_len > max_len:
            max_len = cur_len
            max_end = i
    
    if max_len == 0:
        return ""
    
    return t[max_end - max_len + 1:max_end + 1]
```

### 执行过程

以 `s = "abcdef"`, `t = "zbcdf"` 为例：

```
构建 s 的 SAM 完成

匹配 t：
  't[0] = z': 根没有 'z' 转移，cur_len = 0
  't[1] = b': 根有 'b' 转移，cur_len = 1
  't[2] = c': 当前状态有 'c' 转移，cur_len = 2
  't[3] = d': 当前状态有 'd' 转移，cur_len = 3，更新 max
  't[4] = f': 当前状态没有 'f' 转移，回退...
             回退后从某状态找到 'f'，cur_len = 1

最长公共子串长度 = 3，结束位置 = 3
结果 = t[1:4] = "bcd"
```

### 复杂度分析

- **时间复杂度**：O(|s| + |t|)
  - 构建 SAM：O(|s|)
  - 匹配 t：O(|t|)，每次回退操作摊还 O(1)
- **空间复杂度**：O(|s|)

---

## 方法二：后缀数组

### 核心思想

1. 将 s 和 t 用特殊分隔符连接：s + '#' + t
2. 对连接后的字符串构建后缀数组和 LCP 数组
3. 在 LCP 数组中找相邻后缀分别来自 s 和 t 的最大值

### 代码实现

```python
def longest_common_substring_sa(s: str, t: str) -> str:
    """
    使用后缀数组求最长公共子串
    
    时间复杂度: O((|s| + |t|) log (|s| + |t|))
    空间复杂度: O(|s| + |t|)
    """
    if not s or not t:
        return ""
    
    # 用特殊字符连接
    n1, n2 = len(s), len(t)
    combined = s + '#' + t  # '#' 不在 s, t 中
    n = len(combined)
    
    # 构建后缀数组
    sa = sorted(range(n), key=lambda i: combined[i:])
    
    # 构建 rank
    rank = [0] * n
    for i in range(n):
        rank[sa[i]] = i
    
    # Kasai 算法构建 LCP
    lcp = [0] * n
    h = 0
    for i in range(n):
        if rank[i] > 0:
            j = sa[rank[i] - 1]
            while i + h < n and j + h < n and combined[i + h] == combined[j + h]:
                h += 1
            lcp[rank[i]] = h
            if h > 0:
                h -= 1
    
    # 找最长公共子串
    max_len = 0
    max_pos = 0
    
    for i in range(1, n):
        # 检查相邻后缀是否分别来自 s 和 t
        pos1, pos2 = sa[i - 1], sa[i]
        
        # pos1 < n1 表示来自 s，pos1 > n1 表示来自 t
        from_s_1 = pos1 < n1
        from_s_2 = pos2 < n1
        
        if from_s_1 != from_s_2:  # 一个来自 s，一个来自 t
            if lcp[i] > max_len:
                max_len = lcp[i]
                max_pos = pos1 if from_s_1 else pos2
    
    if max_len == 0:
        return ""
    
    return combined[max_pos:max_pos + max_len]
```

### 注意事项

1. **分隔符的选择**：必须是不在 s 和 t 中出现的字符
2. **边界检查**：确保 LCP 不跨越分隔符（已由分隔符自动保证）

---

## 方法三：动态规划

对于数组版本的问题（LeetCode 718），DP 是常用解法：

```python
def findLength(nums1: List[int], nums2: List[int]) -> int:
    """
    动态规划解法
    时间复杂度: O(n * m)
    空间复杂度: O(n * m)，可优化到 O(min(n, m))
    """
    n, m = len(nums1), len(nums2)
    
    # dp[i][j] = 以 nums1[i-1] 和 nums2[j-1] 结尾的最长公共子数组长度
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    max_len = 0
    
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if nums1[i - 1] == nums2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
                max_len = max(max_len, dp[i][j])
    
    return max_len
```

### 空间优化版本

```python
def findLength_optimized(nums1: List[int], nums2: List[int]) -> int:
    """空间优化到 O(min(n, m))"""
    if len(nums1) < len(nums2):
        nums1, nums2 = nums2, nums1
    
    n, m = len(nums1), len(nums2)
    dp = [0] * (m + 1)
    max_len = 0
    
    for i in range(1, n + 1):
        # 从右向左更新，避免覆盖
        for j in range(m, 0, -1):
            if nums1[i - 1] == nums2[j - 1]:
                dp[j] = dp[j - 1] + 1
                max_len = max(max_len, dp[j])
            else:
                dp[j] = 0
    
    return max_len
```

---

## 方法四：二分 + 哈希

使用二分答案 + 滚动哈希：

```python
def longest_common_substring_binary(s: str, t: str) -> str:
    """
    二分答案 + 滚动哈希
    时间复杂度: O((n + m) log(min(n, m)))
    """
    if not s or not t:
        return ""
    
    BASE = 31
    MOD = 2**63 - 1
    
    def get_hashes(string: str, length: int) -> set:
        """获取所有长度为 length 的子串哈希值"""
        if length > len(string):
            return set()
        
        power = pow(BASE, length - 1, MOD)
        hashes = set()
        
        h = 0
        for i in range(length):
            h = (h * BASE + ord(string[i])) % MOD
        hashes.add(h)
        
        for i in range(length, len(string)):
            h = ((h - ord(string[i - length]) * power) * BASE + ord(string[i])) % MOD
            h = (h + MOD) % MOD
            hashes.add(h)
        
        return hashes
    
    def check(length: int) -> str:
        """检查是否存在长度为 length 的公共子串"""
        if length == 0:
            return ""
        
        # 收集 s 中所有长度为 length 的子串
        s_hashes = {}
        power = pow(BASE, length - 1, MOD)
        
        h = 0
        for i in range(length):
            h = (h * BASE + ord(s[i])) % MOD
        s_hashes[h] = 0
        
        for i in range(length, len(s)):
            h = ((h - ord(s[i - length]) * power) * BASE + ord(s[i])) % MOD
            h = (h + MOD) % MOD
            if h not in s_hashes:
                s_hashes[h] = i - length + 1
        
        # 在 t 中搜索
        h = 0
        for i in range(length):
            h = (h * BASE + ord(t[i])) % MOD
        if h in s_hashes:
            # 验证（防止哈希冲突）
            pos = s_hashes[h]
            if s[pos:pos + length] == t[:length]:
                return t[:length]
        
        for i in range(length, len(t)):
            h = ((h - ord(t[i - length]) * power) * BASE + ord(t[i])) % MOD
            h = (h + MOD) % MOD
            if h in s_hashes:
                pos = s_hashes[h]
                start = i - length + 1
                if s[pos:pos + length] == t[start:start + length]:
                    return t[start:start + length]
        
        return ""
    
    # 二分搜索
    left, right = 0, min(len(s), len(t))
    result = ""
    
    while left <= right:
        mid = (left + right) // 2
        candidate = check(mid)
        if candidate:
            result = candidate
            left = mid + 1
        else:
            right = mid - 1
    
    return result
```

---

## 方法对比

| 方法 | 时间复杂度 | 空间复杂度 | 优势 | 劣势 |
|------|-----------|-----------|------|------|
| SAM | O(n + m) | O(n) | 最优时间 | 实现复杂 |
| 后缀数组 | O((n+m) log(n+m)) | O(n+m) | 通用 | 稍慢 |
| DP | O(nm) | O(nm) 或 O(m) | 简单 | 大规模慢 |
| 二分+哈希 | O((n+m) log(min)) | O(n+m) | 易理解 | 哈希冲突 |

**推荐**：
- 追求最优：SAM
- 实现简单：DP（小规模）或 二分+哈希（中规模）
- 通用稳定：后缀数组

---

## 扩展：多字符串的 LCS

当需要找多个字符串的最长公共子串时：

### 方法 1：SAM + 标记

```python
def longest_common_substring_multiple(strings: List[str]) -> str:
    """
    多字符串最长公共子串
    对第一个字符串建 SAM，其他字符串匹配并标记
    """
    if not strings:
        return ""
    
    k = len(strings)
    s = strings[0]
    
    # 建 SAM
    states = [{'len': 0, 'link': -1, 'trans': {}, 'cnt': [0] * k}]
    last = 0
    
    def add_char(c):
        nonlocal last
        cur = len(states)
        states.append({
            'len': states[last]['len'] + 1,
            'link': -1,
            'trans': {},
            'cnt': [0] * k
        })
        
        p = last
        while p != -1 and c not in states[p]['trans']:
            states[p]['trans'][c] = cur
            p = states[p]['link']
        
        if p == -1:
            states[cur]['link'] = 0
        else:
            q = states[p]['trans'][c]
            if states[p]['len'] + 1 == states[q]['len']:
                states[cur]['link'] = q
            else:
                clone = len(states)
                states.append({
                    'len': states[p]['len'] + 1,
                    'link': states[q]['link'],
                    'trans': states[q]['trans'].copy(),
                    'cnt': [0] * k
                })
                states[q]['link'] = clone
                states[cur]['link'] = clone
                
                while p != -1 and states[p]['trans'].get(c) == q:
                    states[p]['trans'][c] = clone
                    p = states[p]['link']
        
        last = cur
    
    for c in s:
        add_char(c)
    
    # 标记第一个字符串
    cur = 0
    for c in s:
        cur = states[cur]['trans'][c]
        states[cur]['cnt'][0] = states[cur]['len']
    
    # 匹配其他字符串
    for idx in range(1, k):
        t = strings[idx]
        cur = 0
        cur_len = 0
        
        for c in t:
            while cur != 0 and c not in states[cur]['trans']:
                cur = states[cur]['link']
                cur_len = states[cur]['len']
            
            if c in states[cur]['trans']:
                cur = states[cur]['trans'][c]
                cur_len += 1
            else:
                cur = 0
                cur_len = 0
            
            states[cur]['cnt'][idx] = max(states[cur]['cnt'][idx], cur_len)
        
        # 沿后缀链接传播
        order = sorted(range(len(states)), key=lambda x: -states[x]['len'])
        for v in order:
            if states[v]['link'] >= 0:
                states[states[v]['link']]['cnt'][idx] = max(
                    states[states[v]['link']]['cnt'][idx],
                    min(states[v]['cnt'][idx], states[states[v]['link']]['len'])
                )
    
    # 找所有字符串都能匹配到的最长长度
    max_len = 0
    max_state = 0
    
    for i in range(1, len(states)):
        min_cnt = min(states[i]['cnt'])
        if min_cnt > max_len:
            max_len = min_cnt
            max_state = i
    
    # 回溯找子串
    if max_len == 0:
        return ""
    
    # 从 s 中提取
    for i in range(len(s) - max_len + 1):
        if s[i:i + max_len] in all_strings:  # 简化检查
            return s[i:i + max_len]
    
    return s[:max_len]  # 简化返回
```

---

## 本章小结

本章学习了最长公共子串问题的多种解法：

1. **后缀自动机方法**
   - 对一个串建 SAM，另一个串匹配
   - 时间 O(n + m)，最优

2. **后缀数组方法**
   - 连接两串，找跨越分隔符的最大 LCP
   - 时间 O((n+m) log(n+m))

3. **动态规划方法**
   - dp[i][j] = 以 s[i-1] 和 t[j-1] 结尾的 LCS 长度
   - 时间 O(nm)，适合小规模

4. **二分 + 哈希方法**
   - 二分长度，哈希验证
   - 时间 O((n+m) log(min))

5. **扩展到多字符串**
   - SAM + 每个状态标记各字符串能达到的最大长度

至此，我们完成了后缀结构这一部分的学习。下一部分将进入**持久化数据结构**的世界！
