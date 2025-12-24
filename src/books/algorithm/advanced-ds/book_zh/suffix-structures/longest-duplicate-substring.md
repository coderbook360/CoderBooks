# 最长重复子串

**最长重复子串**（Longest Duplicate Substring）是字符串处理的经典问题：找出一个字符串中至少出现两次的最长子串。

这是 [LeetCode 1044. Longest Duplicate Substring](https://leetcode.com/problems/longest-duplicate-substring/)，难度为 Hard。

---

## 问题描述

给定一个字符串 s，找出其中最长的重复子串。如果不存在重复子串，返回空字符串。

```
输入: s = "banana"
输出: "ana"
解释: "ana" 出现了两次（位置 1 和位置 3）

输入: s = "abcd"
输出: ""
解释: 没有重复的子串
```

---

## 方法一：后缀数组 + LCP

**核心思想**：最长重复子串一定是某两个后缀的公共前缀。而后缀数组 + LCP 数组正好能高效解决这个问题。

### 关键观察

如果一个子串在位置 i 和位置 j 都出现（i < j），那么：
- suffix(i) 和 suffix(j) 有公共前缀
- 这个公共前缀就是重复子串

由于后缀数组按字典序排列，**相邻后缀的 LCP 最大**。因此：

$$\text{最长重复子串长度} = \max(LCP[i])$$

### 代码实现

```python
from typing import List

def longestDupSubstring(s: str) -> str:
    """
    后缀数组 + LCP 数组方法
    
    时间复杂度: O(n log n) 用于构建后缀数组
    空间复杂度: O(n)
    """
    n = len(s)
    if n <= 1:
        return ""
    
    # 构建后缀数组
    sa = sorted(range(n), key=lambda i: s[i:])
    
    # 构建 rank 数组
    rank = [0] * n
    for i in range(n):
        rank[sa[i]] = i
    
    # Kasai 算法构建 LCP 数组
    lcp = [0] * n
    h = 0
    
    for i in range(n):
        if rank[i] > 0:
            j = sa[rank[i] - 1]
            while i + h < n and j + h < n and s[i + h] == s[j + h]:
                h += 1
            lcp[rank[i]] = h
            if h > 0:
                h -= 1
    
    # 找 LCP 最大值
    max_lcp = 0
    max_idx = 0
    for i in range(1, n):
        if lcp[i] > max_lcp:
            max_lcp = lcp[i]
            max_idx = i
    
    if max_lcp == 0:
        return ""
    
    return s[sa[max_idx]:sa[max_idx] + max_lcp]
```

### 执行过程

以 `s = "banana"` 为例：

```
后缀数组构建：
  SA[0] = 5: "a"
  SA[1] = 3: "ana"
  SA[2] = 1: "anana"
  SA[3] = 0: "banana"
  SA[4] = 4: "na"
  SA[5] = 2: "nana"

LCP 数组：
  LCP[1] = 1  (a 和 ana)
  LCP[2] = 3  (ana 和 anana)  <-- 最大值
  LCP[3] = 0  (anana 和 banana)
  LCP[4] = 0  (banana 和 na)
  LCP[5] = 2  (na 和 nana)

最长重复子串 = s[SA[2]:SA[2]+3] = s[1:4] = "ana"
```

---

## 方法二：二分答案 + 哈希

另一种常用方法是**二分答案**：二分重复子串的长度 L，然后用滚动哈希判断是否存在长度为 L 的重复子串。

### 算法思路

1. 二分答案长度 L（范围 [1, n-1]）
2. 对于每个 L，用滚动哈希判断是否存在重复
3. 如果存在长度为 L 的重复，尝试更长；否则尝试更短

### 滚动哈希

滚动哈希（Rabin-Karp）可以 O(1) 时间计算相邻子串的哈希值：

$$hash(s[i:i+L]) = \sum_{j=0}^{L-1} s[i+j] \cdot base^{L-1-j} \mod M$$

$$hash(s[i+1:i+1+L]) = (hash(s[i:i+L]) - s[i] \cdot base^{L-1}) \cdot base + s[i+L]$$

### 代码实现

```python
def longestDupSubstring_binary_search(s: str) -> str:
    """
    二分答案 + 滚动哈希
    
    时间复杂度: O(n log n) 平均，O(n² log n) 最坏（哈希冲突）
    空间复杂度: O(n)
    """
    n = len(s)
    if n <= 1:
        return ""
    
    # 转换为数字数组
    nums = [ord(c) - ord('a') for c in s]
    
    # 滚动哈希参数
    BASE = 31
    MOD = 2**63 - 1
    
    def check(length: int) -> str:
        """检查是否存在长度为 length 的重复子串，返回该子串或空"""
        if length == 0:
            return ""
        
        # 计算 base^(length-1)
        power = pow(BASE, length - 1, MOD)
        
        # 计算第一个窗口的哈希值
        h = 0
        for i in range(length):
            h = (h * BASE + nums[i]) % MOD
        
        # 哈希值到起始位置的映射
        seen = {h: 0}
        
        # 滚动计算后续窗口
        for i in range(1, n - length + 1):
            # 移除最左边的字符，添加新字符
            h = ((h - nums[i - 1] * power) * BASE + nums[i + length - 1]) % MOD
            h = (h + MOD) % MOD  # 确保非负
            
            if h in seen:
                # 哈希冲突检查：实际比较字符串
                prev = seen[h]
                if s[prev:prev + length] == s[i:i + length]:
                    return s[i:i + length]
                # 如果是假阳性，可以用列表存储多个位置
            else:
                seen[h] = i
        
        return ""
    
    # 二分搜索答案长度
    left, right = 1, n - 1
    result = ""
    
    while left <= right:
        mid = (left + right) // 2
        candidate = check(mid)
        
        if candidate:
            result = candidate
            left = mid + 1  # 尝试更长
        else:
            right = mid - 1  # 尝试更短
    
    return result
```

### 处理哈希冲突

上面的代码只存储了一个位置。更稳健的做法是存储所有位置：

```python
from collections import defaultdict

def check_robust(s: str, nums: list, length: int, BASE: int, MOD: int) -> str:
    """更稳健的检查函数，处理哈希冲突"""
    n = len(s)
    if length == 0:
        return ""
    
    power = pow(BASE, length - 1, MOD)
    
    h = 0
    for i in range(length):
        h = (h * BASE + nums[i]) % MOD
    
    # 存储所有位置
    seen = defaultdict(list)
    seen[h].append(0)
    
    for i in range(1, n - length + 1):
        h = ((h - nums[i - 1] * power) * BASE + nums[i + length - 1]) % MOD
        h = (h + MOD) % MOD
        
        # 检查所有同哈希位置
        for prev in seen[h]:
            if s[prev:prev + length] == s[i:i + length]:
                return s[i:i + length]
        
        seen[h].append(i)
    
    return ""
```

---

## 方法三：后缀数组 + 二分

还可以用后缀数组配合二分来检查是否存在长度为 L 的重复子串：

```python
def longestDupSubstring_sa_binary(s: str) -> str:
    """
    后缀数组 + 二分检查
    不需要 LCP 数组，但需要多次遍历
    """
    n = len(s)
    if n <= 1:
        return ""
    
    # 构建后缀数组
    sa = sorted(range(n), key=lambda i: s[i:])
    
    def has_duplicate(length: int) -> int:
        """检查是否存在长度为 length 的重复子串，返回起始位置或 -1"""
        for i in range(1, n):
            if n - sa[i] >= length and n - sa[i-1] >= length:
                # 比较两个相邻后缀的前 length 个字符
                if s[sa[i]:sa[i] + length] == s[sa[i-1]:sa[i-1] + length]:
                    return sa[i]
        return -1
    
    left, right = 1, n - 1
    result = ""
    
    while left <= right:
        mid = (left + right) // 2
        pos = has_duplicate(mid)
        
        if pos >= 0:
            result = s[pos:pos + mid]
            left = mid + 1
        else:
            right = mid - 1
    
    return result
```

---

## 方法对比

| 方法 | 时间复杂度 | 空间复杂度 | 优势 | 劣势 |
|------|-----------|-----------|------|------|
| SA + LCP | O(n log n) | O(n) | 简洁优雅 | 需理解 LCP |
| 二分 + 哈希 | O(n log n) 平均 | O(n) | 容易理解 | 哈希冲突 |
| SA + 二分 | O(n log n · L) | O(n) | 无需 LCP | 较慢 |

**推荐**：优先使用 SA + LCP 方法，代码简洁且复杂度稳定。

---

## 完整可提交代码

```python
class Solution:
    def longestDupSubstring(self, s: str) -> str:
        n = len(s)
        if n <= 1:
            return ""
        
        # 构建后缀数组
        sa = sorted(range(n), key=lambda i: s[i:])
        
        # 构建 rank 数组
        rank = [0] * n
        for i in range(n):
            rank[sa[i]] = i
        
        # Kasai 算法
        lcp = [0] * n
        h = 0
        for i in range(n):
            if rank[i] > 0:
                j = sa[rank[i] - 1]
                while i + h < n and j + h < n and s[i + h] == s[j + h]:
                    h += 1
                lcp[rank[i]] = h
                if h > 0:
                    h -= 1
        
        # 找最大 LCP
        max_lcp, max_idx = 0, 0
        for i in range(1, n):
            if lcp[i] > max_lcp:
                max_lcp, max_idx = lcp[i], i
        
        return s[sa[max_idx]:sa[max_idx] + max_lcp] if max_lcp > 0 else ""
```

---

## 扩展问题

### 扩展 1：至少重复 K 次的最长子串

如果要求子串至少出现 K 次，需要在 LCP 数组中找连续 K-1 个值的最小值的最大值：

```python
def longestDupSubstring_k_times(s: str, k: int) -> str:
    """找出至少出现 k 次的最长子串"""
    n = len(s)
    if n < k:
        return ""
    
    # 构建后缀数组和 LCP
    sa = sorted(range(n), key=lambda i: s[i:])
    rank = [0] * n
    for i in range(n):
        rank[sa[i]] = i
    
    lcp = [0] * n
    h = 0
    for i in range(n):
        if rank[i] > 0:
            j = sa[rank[i] - 1]
            while i + h < n and j + h < n and s[i + h] == s[j + h]:
                h += 1
            lcp[rank[i]] = h
            if h > 0:
                h -= 1
    
    # 滑动窗口找连续 k-1 个 LCP 的最小值的最大值
    from collections import deque
    
    max_len = 0
    best_pos = 0
    
    min_deque = deque()  # 单调递增队列
    
    for i in range(1, n):
        # 移除窗口外的元素
        while min_deque and min_deque[0] < i - k + 2:
            min_deque.popleft()
        
        # 维护单调性
        while min_deque and lcp[min_deque[-1]] >= lcp[i]:
            min_deque.pop()
        
        min_deque.append(i)
        
        # 窗口满了，记录结果
        if i >= k - 1:
            window_min = lcp[min_deque[0]]
            if window_min > max_len:
                max_len = window_min
                best_pos = sa[i]
    
    return s[best_pos:best_pos + max_len] if max_len > 0 else ""
```

### 扩展 2：不重叠的最长重复子串

如果要求两次出现不能重叠：

```python
def longest_non_overlapping_dup(s: str) -> str:
    """找出不重叠的最长重复子串"""
    n = len(s)
    
    sa = sorted(range(n), key=lambda i: s[i:])
    rank = [0] * n
    for i in range(n):
        rank[sa[i]] = i
    
    lcp = [0] * n
    h = 0
    for i in range(n):
        if rank[i] > 0:
            j = sa[rank[i] - 1]
            while i + h < n and j + h < n and s[i + h] == s[j + h]:
                h += 1
            lcp[rank[i]] = h
            if h > 0:
                h -= 1
    
    # 二分答案
    def can_find(length):
        for i in range(1, n):
            if lcp[i] >= length:
                if abs(sa[i] - sa[i-1]) >= length:
                    return sa[i]
        return -1
    
    left, right = 1, n // 2
    result = ""
    
    while left <= right:
        mid = (left + right) // 2
        pos = can_find(mid)
        if pos >= 0:
            result = s[pos:pos + mid]
            left = mid + 1
        else:
            right = mid - 1
    
    return result
```

---

## 本章小结

本章学习了最长重复子串问题的多种解法：

1. **后缀数组 + LCP**（推荐）
   - LCP 最大值就是答案
   - 代码简洁，复杂度稳定 O(n log n)

2. **二分答案 + 哈希**
   - 二分长度，哈希验证
   - 平均 O(n log n)，需处理哈希冲突

3. **扩展问题**
   - K 次重复：滑动窗口求连续 LCP 最小值
   - 不重叠：二分 + 位置差约束

后缀数组 + LCP 的组合是解决子串问题的强大工具，值得熟练掌握。

下一章我们将学习动态规划在子序列问题中的应用：**不同的子序列 II**。
