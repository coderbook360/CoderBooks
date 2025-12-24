# 后缀数组基础

后缀数组（Suffix Array）是一种强大的字符串数据结构，它能够高效地解决许多字符串问题：最长重复子串、最长公共子串、子串计数等。本章将介绍后缀数组的基本概念和朴素构建方法。

---

## 什么是后缀数组？

### 后缀的定义

给定字符串 `s`，它的**后缀**是从某个位置开始到字符串末尾的子串。

例如，字符串 `"banana"` 的所有后缀：

| 起始位置 i | 后缀 s[i:] |
|-----------|-----------|
| 0 | banana |
| 1 | anana |
| 2 | nana |
| 3 | ana |
| 4 | na |
| 5 | a |

### 后缀数组的定义

**后缀数组 SA**：将所有后缀按字典序排序后，SA[i] 表示排名第 i 的后缀的起始位置。

继续以 `"banana"` 为例：

按字典序排序：
```
a        (位置 5)
ana      (位置 3)
anana    (位置 1)
banana   (位置 0)
na       (位置 4)
nana     (位置 2)
```

因此：**SA = [5, 3, 1, 0, 4, 2]**

### 排名数组

与 SA 互为逆运算的是**排名数组 Rank**：Rank[i] 表示从位置 i 开始的后缀的排名。

```
SA[0] = 5  ⟺  Rank[5] = 0
SA[1] = 3  ⟺  Rank[3] = 1
SA[2] = 1  ⟺  Rank[1] = 2
SA[3] = 0  ⟺  Rank[0] = 3
SA[4] = 4  ⟺  Rank[4] = 4
SA[5] = 2  ⟺  Rank[2] = 5
```

**Rank = [3, 2, 5, 1, 4, 0]**

**关系**：`SA[Rank[i]] = i` 且 `Rank[SA[i]] = i`

---

## 为什么需要后缀数组？

后缀数组能够高效解决以下问题：

### 1. 子串搜索

判断模式串 P 是否是文本 T 的子串。

如果 P 是 T 的子串，那么 P 一定是 T 某个后缀的前缀。由于后缀已排序，可以用**二分查找**在 O(|P| × log|T|) 时间内完成搜索。

### 2. 最长重复子串

找出字符串中出现至少两次的最长子串。

重复子串必然是两个不同后缀的公共前缀。利用后缀数组和 LCP 数组，可以在 O(n) 时间内求解。

### 3. 最长公共子串

两个字符串的最长公共子串。

将两个字符串用特殊分隔符连接，构建后缀数组，问题转化为找相邻后缀的 LCP。

### 4. 子串计数

统计字符串中本质不同的子串个数。

总子串数 - 相邻后缀的 LCP 之和 = 本质不同子串数。

---

## 朴素构建方法

最直接的方法：生成所有后缀，然后排序。

```python
def build_suffix_array_naive(s: str) -> list[int]:
    """
    朴素方法构建后缀数组
    时间复杂度：O(n² log n)，其中比较两个后缀需要 O(n)
    """
    n = len(s)
    # 生成 (后缀, 起始位置) 对
    suffixes = [(s[i:], i) for i in range(n)]
    # 按后缀字典序排序
    suffixes.sort()
    # 提取起始位置
    return [pos for _, pos in suffixes]
```

**复杂度分析**：
- 生成后缀：O(n²)（Python 字符串切片是 O(n)）
- 排序：O(n log n) 次比较，每次比较 O(n)
- 总复杂度：O(n² log n)

这个方法对于大字符串太慢了。下一章我们将学习 O(n log n) 的倍增算法。

---

## 优化的朴素方法

通过只比较索引而不是实际切片，可以稍微优化：

```python
def build_suffix_array_optimized_naive(s: str) -> list[int]:
    """
    优化的朴素方法
    时间复杂度：O(n² log n)，但常数更小
    """
    n = len(s)
    
    # 比较函数：比较从 i 和 j 开始的后缀
    def compare(i: int, j: int) -> int:
        while i < n and j < n:
            if s[i] < s[j]:
                return -1
            elif s[i] > s[j]:
                return 1
            i += 1
            j += 1
        # 较短的后缀更小
        return (n - i) - (n - j)  # 剩余长度的差
    
    from functools import cmp_to_key
    indices = list(range(n))
    indices.sort(key=cmp_to_key(compare))
    
    return indices
```

---

## 从 SA 计算 Rank

```python
def compute_rank(sa: list[int]) -> list[int]:
    """从后缀数组计算排名数组"""
    n = len(sa)
    rank = [0] * n
    for i in range(n):
        rank[sa[i]] = i
    return rank
```

---

## 后缀数组的基本应用

### 应用 1：子串搜索

```python
def search_pattern(s: str, sa: list[int], pattern: str) -> list[int]:
    """
    在字符串 s 中搜索模式串 pattern 的所有出现位置
    使用二分查找
    """
    n = len(s)
    m = len(pattern)
    
    # 找第一个 >= pattern 的后缀
    left = 0
    right = n
    while left < right:
        mid = (left + right) // 2
        suffix = s[sa[mid]:]
        if suffix[:m] < pattern:
            left = mid + 1
        else:
            right = mid
    start = left
    
    # 找第一个 > pattern 的后缀
    left = 0
    right = n
    while left < right:
        mid = (left + right) // 2
        suffix = s[sa[mid]:]
        if suffix[:m] <= pattern:
            left = mid + 1
        else:
            right = mid
    end = left
    
    # 返回所有匹配位置
    return [sa[i] for i in range(start, end)]
```

**复杂度**：O(m × log n)，其中 m 是模式串长度。

### 应用 2：计算本质不同子串数

任何子串都是某个后缀的前缀。设 LCP[i] 是 SA[i] 和 SA[i-1] 对应后缀的最长公共前缀长度。

本质不同子串数 = n×(n+1)/2 - Σ LCP[i]

（LCP 数组的计算将在后续章节介绍）

---

## 后缀数组 vs 后缀树

| 特性 | 后缀数组 | 后缀树 |
|------|---------|-------|
| 空间 | O(n) | O(n) 但常数大 |
| 构建时间 | O(n log n) 或 O(n) | O(n) |
| 实现复杂度 | 简单 | 复杂 |
| 功能 | 需配合 LCP 数组 | 直接支持多种查询 |

在实践中，后缀数组因其简洁性和较小的空间占用，往往是更好的选择。

---

## 可视化示例

让我们完整展示 `"banana"` 的后缀数组构建过程：

```
原字符串: banana
索引:     012345

所有后缀:
  i=0: banana
  i=1: anana
  i=2: nana
  i=3: ana
  i=4: na
  i=5: a

按字典序排序:
  排名 0: a      (i=5)
  排名 1: ana    (i=3)
  排名 2: anana  (i=1)
  排名 3: banana (i=0)
  排名 4: na     (i=4)
  排名 5: nana   (i=2)

后缀数组 SA = [5, 3, 1, 0, 4, 2]
排名数组 Rank = [3, 2, 5, 1, 4, 0]

验证：
  SA[Rank[0]] = SA[3] = 0 ✓
  SA[Rank[1]] = SA[2] = 1 ✓
  SA[Rank[2]] = SA[5] = 2 ✓
  ...
```

---

## 边界情况

### 空字符串

```python
if not s:
    return []
```

### 单字符字符串

```python
s = "a"
SA = [0]
Rank = [0]
```

### 全相同字符

```python
s = "aaaa"
# 后缀: a, aa, aaa, aaaa
# 排序: a < aa < aaa < aaaa
SA = [3, 2, 1, 0]  # 最短的后缀排名最前
```

---

## 完整实现

```python
from typing import List

class SuffixArray:
    """后缀数组的朴素实现"""
    
    def __init__(self, s: str):
        self.s = s
        self.n = len(s)
        self.sa = self._build()
        self.rank = self._compute_rank()
    
    def _build(self) -> List[int]:
        """构建后缀数组（朴素方法）"""
        if self.n == 0:
            return []
        
        # 使用比较键避免字符串切片
        from functools import cmp_to_key
        
        def compare(i: int, j: int) -> int:
            while i < self.n and j < self.n:
                if self.s[i] < self.s[j]:
                    return -1
                elif self.s[i] > self.s[j]:
                    return 1
                i += 1
                j += 1
            return (self.n - i) - (self.n - j)
        
        indices = list(range(self.n))
        indices.sort(key=cmp_to_key(compare))
        return indices
    
    def _compute_rank(self) -> List[int]:
        """计算排名数组"""
        rank = [0] * self.n
        for i in range(self.n):
            rank[self.sa[i]] = i
        return rank
    
    def search(self, pattern: str) -> List[int]:
        """搜索模式串的所有出现位置"""
        if not pattern or self.n == 0:
            return []
        
        m = len(pattern)
        
        # 二分找下界
        lo, hi = 0, self.n
        while lo < hi:
            mid = (lo + hi) // 2
            pos = self.sa[mid]
            suffix = self.s[pos:pos + m]
            if suffix < pattern:
                lo = mid + 1
            else:
                hi = mid
        start = lo
        
        # 二分找上界
        lo, hi = 0, self.n
        while lo < hi:
            mid = (lo + hi) // 2
            pos = self.sa[mid]
            suffix = self.s[pos:pos + m]
            if suffix <= pattern:
                lo = mid + 1
            else:
                hi = mid
        end = lo
        
        return sorted(self.sa[start:end])
    
    def get_suffix(self, rank: int) -> str:
        """获取排名为 rank 的后缀"""
        return self.s[self.sa[rank]:]


# 测试
if __name__ == "__main__":
    sa = SuffixArray("banana")
    print(f"SA: {sa.sa}")  # [5, 3, 1, 0, 4, 2]
    print(f"Rank: {sa.rank}")  # [3, 2, 5, 1, 4, 0]
    
    # 搜索模式串
    print(f"'ana' appears at: {sa.search('ana')}")  # [1, 3]
    print(f"'nan' appears at: {sa.search('nan')}")  # [2]
    print(f"'xyz' appears at: {sa.search('xyz')}")  # []
```

---

## 本章小结

本章介绍了后缀数组的基础知识：

1. **核心概念**：
   - 后缀：从位置 i 到字符串末尾的子串
   - 后缀数组 SA：后缀按字典序排序后的起始位置
   - 排名数组 Rank：SA 的逆映射

2. **朴素构建**：
   - 时间复杂度 O(n² log n)
   - 空间复杂度 O(n)

3. **基本应用**：
   - 子串搜索：O(m log n)
   - 配合 LCP 数组解决更多问题

4. **与后缀树的对比**：
   - 后缀数组更简洁、空间更小
   - 功能上需要配合 LCP 数组

下一章我们将学习 O(n log n) 的**倍增算法**，大幅提升后缀数组的构建效率。
