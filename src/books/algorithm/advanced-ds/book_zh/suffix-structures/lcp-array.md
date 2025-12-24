# LCP 数组与应用

后缀数组告诉我们后缀的字典序排名，但仅此不够。要高效解决子串问题，我们还需要知道**相邻后缀之间的公共前缀长度**。这就是 **LCP 数组**（Longest Common Prefix Array）的作用。

---

## LCP 数组的定义

给定字符串 s 和它的后缀数组 SA，LCP 数组定义为：

$$LCP[i] = \text{lcp}(s[SA[i-1]:], s[SA[i]:])$$

其中 lcp(a, b) 表示字符串 a 和 b 的最长公共前缀长度。

换句话说，**LCP[i] 是后缀数组中相邻两个后缀的最长公共前缀长度**。

### 示例

```
s = "banana"
n = 6

后缀数组 SA 和对应后缀：
  SA[0] = 5: "a"
  SA[1] = 3: "ana"
  SA[2] = 1: "anana"
  SA[3] = 0: "banana"
  SA[4] = 4: "na"
  SA[5] = 2: "nana"

LCP 数组：
  LCP[0] = 0       (无前一个后缀，定义为 0)
  LCP[1] = 1       lcp("a", "ana") = 1
  LCP[2] = 3       lcp("ana", "anana") = 3
  LCP[3] = 0       lcp("anana", "banana") = 0
  LCP[4] = 0       lcp("banana", "na") = 0
  LCP[5] = 2       lcp("na", "nana") = 2
```

---

## Kasai 算法

直接计算 LCP 数组需要 O(n²) 时间。Kasai 算法利用一个关键性质，在 O(n) 时间内完成计算。

### 核心性质

设 rank[i] 表示后缀 suffix(i) 在后缀数组中的排名。如果 rank[i] > 0，令：

- k = SA[rank[i] - 1]，即排在 suffix(i) 前面的后缀的起始位置
- h = LCP[rank[i]]，即 suffix(i) 和 suffix(k) 的公共前缀长度

那么有：**LCP[rank[i+1]] ≥ h - 1**

### 为什么成立？

假设 suffix(i) = "cXXX..." 和 suffix(k) = "cYYY..." 有公共前缀 "c..."（长度 h）。

那么：
- suffix(i+1) = "XXX..."
- suffix(k+1) = "YYY..."

由于原来的公共前缀是 "c..."，去掉第一个字符后，新的公共前缀至少是原来的长度减 1。

而且，因为后缀是字典序排列的，suffix(k+1) 和 suffix(i+1) 之间的排名差最多和原来一样，所以 LCP 值不会比 h-1 更小。

### 代码实现

```python
from typing import List

def build_lcp_array(s: str, sa: List[int]) -> List[int]:
    """
    Kasai 算法构建 LCP 数组
    
    Args:
        s: 原字符串
        sa: 后缀数组
    
    Returns:
        LCP 数组
    
    时间复杂度: O(n)
    空间复杂度: O(n)
    """
    n = len(s)
    if n == 0:
        return []
    
    # 计算 rank 数组（SA 的逆）
    rank = [0] * n
    for i in range(n):
        rank[sa[i]] = i
    
    lcp = [0] * n
    h = 0  # 当前 LCP 值
    
    for i in range(n):
        if rank[i] > 0:
            # 找到排在 suffix(i) 前面的后缀
            j = sa[rank[i] - 1]
            
            # 计算公共前缀长度
            while i + h < n and j + h < n and s[i + h] == s[j + h]:
                h += 1
            
            lcp[rank[i]] = h
            
            # 关键优化：h 最多减 1
            if h > 0:
                h -= 1
    
    return lcp
```

### 复杂度分析

虽然有嵌套的 while 循环，但 h 的变化保证了 O(n) 复杂度：

- h 最多增加 n 次（每次 while 循环增加 1）
- h 最多减少 n 次（每次外层循环减少 1）
- 因此总操作数是 O(n)

---

## 完整示例

```python
def suffix_array_with_lcp(s: str):
    """
    构建后缀数组和 LCP 数组的完整示例
    """
    # 构建后缀数组（使用简单方法）
    n = len(s)
    sa = sorted(range(n), key=lambda i: s[i:])
    
    # 构建 LCP 数组
    lcp = build_lcp_array(s, sa)
    
    # 打印结果
    print(f"字符串: {s}")
    print(f"{'i':>3} {'SA[i]':>5} {'LCP[i]':>6} 后缀")
    print("-" * 40)
    
    for i in range(n):
        suffix = s[sa[i]:]
        print(f"{i:>3} {sa[i]:>5} {lcp[i]:>6} {suffix}")
    
    return sa, lcp

# 测试
sa, lcp = suffix_array_with_lcp("banana")
```

输出：
```
字符串: banana
  i  SA[i] LCP[i] 后缀
----------------------------------------
  0     5      0 a
  1     3      1 ana
  2     1      3 anana
  3     0      0 banana
  4     4      0 na
  5     2      2 nana
```

---

## LCP 数组的应用

### 应用 1：统计不同子串数量

一个长度为 n 的字符串有 n(n+1)/2 个子串（包含重复）。

利用 LCP 数组可以计算**本质不同**的子串数量：

$$\text{不同子串数} = \frac{n(n+1)}{2} - \sum_{i=1}^{n-1} LCP[i]$$

**原理**：每个后缀贡献的新子串数 = 后缀长度 - 与前一个后缀的公共前缀长度。

```python
def count_distinct_substrings(s: str) -> int:
    """
    统计本质不同的子串数量
    
    时间复杂度: O(n)
    """
    n = len(s)
    if n == 0:
        return 0
    
    # 构建后缀数组和 LCP
    sa = sorted(range(n), key=lambda i: s[i:])
    lcp = build_lcp_array(s, sa)
    
    # 总子串数 - 重复部分
    total = n * (n + 1) // 2
    duplicates = sum(lcp)
    
    return total - duplicates

# 测试
print(count_distinct_substrings("banana"))  # 15
# 所有不同子串：a, an, ana, anan, anana, b, ba, ban, bana, banan, banana, n, na, nan, nana
```

### 应用 2：最长重复子串

最长重复子串就是 LCP 数组中的**最大值**。

```python
def longest_duplicate_substring(s: str) -> str:
    """
    找出最长重复子串
    LeetCode 1044. Longest Duplicate Substring
    """
    n = len(s)
    if n <= 1:
        return ""
    
    sa = sorted(range(n), key=lambda i: s[i:])
    lcp = build_lcp_array(s, sa)
    
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

# 测试
print(longest_duplicate_substring("banana"))  # "ana"
```

### 应用 3：两个后缀的 LCP

要查询任意两个后缀 suffix(i) 和 suffix(j) 的 LCP，需要利用 **RMQ**（Range Minimum Query）：

$$\text{lcp}(suffix(i), suffix(j)) = \min_{k=rank[i]+1}^{rank[j]} LCP[k]$$

其中假设 rank[i] < rank[j]。

```python
class SuffixArrayLCP:
    """
    支持任意两个后缀 LCP 查询的数据结构
    预处理: O(n log n)
    查询: O(1)
    """
    
    def __init__(self, s: str):
        self.s = s
        self.n = len(s)
        
        if self.n == 0:
            return
        
        # 构建后缀数组
        self.sa = sorted(range(self.n), key=lambda i: s[i:])
        
        # 构建 rank 数组
        self.rank = [0] * self.n
        for i in range(self.n):
            self.rank[self.sa[i]] = i
        
        # 构建 LCP 数组
        self.lcp = build_lcp_array(s, self.sa)
        
        # 构建 Sparse Table 用于 RMQ
        self._build_sparse_table()
    
    def _build_sparse_table(self):
        """构建稀疏表"""
        n = self.n
        if n == 0:
            return
        
        # log2 表
        self.log2 = [0] * (n + 1)
        for i in range(2, n + 1):
            self.log2[i] = self.log2[i // 2] + 1
        
        # 稀疏表
        k = self.log2[n] + 1
        self.sparse = [[0] * n for _ in range(k)]
        
        # 初始化
        for i in range(n):
            self.sparse[0][i] = self.lcp[i]
        
        # 填表
        for j in range(1, k):
            for i in range(n - (1 << j) + 1):
                self.sparse[j][i] = min(
                    self.sparse[j-1][i],
                    self.sparse[j-1][i + (1 << (j-1))]
                )
    
    def query_lcp(self, i: int, j: int) -> int:
        """
        查询 suffix(i) 和 suffix(j) 的 LCP
        时间复杂度: O(1)
        """
        if i == j:
            return self.n - i
        
        ri, rj = self.rank[i], self.rank[j]
        if ri > rj:
            ri, rj = rj, ri
        
        # 查询 LCP[ri+1..rj] 的最小值
        left, right = ri + 1, rj
        if left > right:
            return 0
        
        length = right - left + 1
        k = self.log2[length]
        
        return min(self.sparse[k][left], self.sparse[k][right - (1 << k) + 1])

# 测试
sa_lcp = SuffixArrayLCP("banana")
print(sa_lcp.query_lcp(1, 3))  # lcp("anana", "ana") = 3
print(sa_lcp.query_lcp(0, 4))  # lcp("banana", "na") = 0
```

### 应用 4：统计包含特定模式的子串

```python
def count_substrings_with_pattern(text: str, pattern: str) -> int:
    """
    统计 text 中包含 pattern 作为前缀的子串数量
    
    思路：
    1. 用二分查找定位 pattern 在后缀数组中的范围
    2. 范围内每个后缀都以 pattern 开头
    """
    n = len(text)
    m = len(pattern)
    
    if n == 0 or m == 0 or m > n:
        return 0
    
    sa = sorted(range(n), key=lambda i: text[i:])
    
    # 二分查找下界
    left, right = 0, n
    while left < right:
        mid = (left + right) // 2
        suffix = text[sa[mid]:sa[mid] + m]
        if suffix < pattern:
            left = mid + 1
        else:
            right = mid
    lo = left
    
    # 二分查找上界
    left, right = 0, n
    while left < right:
        mid = (left + right) // 2
        suffix = text[sa[mid]:sa[mid] + m]
        if suffix <= pattern:
            left = mid + 1
        else:
            right = mid
    hi = left
    
    return hi - lo

# 测试
print(count_substrings_with_pattern("banana", "an"))  # 2 ("anana", "ana")
```

---

## 增强 LCP：区间 LCP 查询

除了任意两个后缀的 LCP，有时需要查询**一个区间内所有相邻后缀的最小 LCP**。

这可以用于判断某个子串在多少个位置出现：

```python
def count_occurrences(text: str, pattern: str, sa_lcp: SuffixArrayLCP) -> int:
    """
    统计 pattern 在 text 中的出现次数
    使用后缀数组 + LCP + 二分
    """
    n = len(text)
    m = len(pattern)
    
    if m > n:
        return 0
    
    sa = sa_lcp.sa
    
    # 找第一个 >= pattern 的后缀
    left, right = 0, n
    while left < right:
        mid = (left + right) // 2
        suffix = text[sa[mid]:sa[mid] + m]
        if suffix < pattern:
            left = mid + 1
        else:
            right = mid
    
    if left == n or text[sa[left]:sa[left] + m] != pattern:
        return 0
    
    first = left
    
    # 找最后一个以 pattern 开头的后缀
    left, right = first, n
    while left < right:
        mid = (left + right) // 2
        if sa_lcp.query_lcp(sa[first], sa[mid]) >= m:
            left = mid + 1
        else:
            right = mid
    
    return left - first

# 测试
sa_lcp = SuffixArrayLCP("banana")
# 注意：这个实现需要调整，仅作示意
```

---

## 本章小结

本章学习了 LCP 数组的定义、构建和应用：

1. **定义**：LCP[i] 是后缀数组中相邻两个后缀的最长公共前缀

2. **Kasai 算法**：O(n) 时间构建 LCP 数组
   - 核心性质：LCP[rank[i+1]] ≥ LCP[rank[i]] - 1
   - h 值单调变化保证线性复杂度

3. **关键应用**：
   - 统计不同子串：总数 - LCP 之和
   - 最长重复子串：LCP 最大值
   - 任意后缀 LCP：结合 RMQ 实现 O(1) 查询

4. **后缀数组 + LCP** 是处理子串问题的强大工具组合

下一章我们将应用这些知识解决经典问题：**最长重复子串**。
