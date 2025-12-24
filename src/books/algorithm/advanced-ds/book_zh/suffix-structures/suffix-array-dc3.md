# 后缀数组的构建（DC3/SA-IS）

倍增算法能够在 O(n log n) 时间内构建后缀数组。本章将介绍两种 **O(n)** 时间复杂度的算法：**DC3**（也称 Skew 算法）和 **SA-IS**。这些算法在理论上最优，但实现较为复杂。

---

## DC3 算法（Difference Cover）

DC3 算法由 Kärkkäinen 和 Sanders 于 2003 年提出，是第一个实用的线性时间后缀数组构建算法。

### 核心思想

DC3 的核心是**分治**：

1. **分类**：将所有位置按模 3 分为三类
   - S0：位置 i % 3 == 0
   - S1：位置 i % 3 == 1
   - S2：位置 i % 3 == 2

2. **递归**：对 S1 ∪ S2 的位置进行排序（通过递归）

3. **合并**：利用 S1 ∪ S2 的排序结果，对 S0 进行排序，然后合并

### 为什么是模 3？

关键观察：任意两个相邻位置中，至少有一个属于 S1 ∪ S2。

这意味着在比较 S0 中的两个后缀时，可以先比较第一个字符，然后利用 S1 ∪ S2 的已知排名来快速决定剩余部分的大小关系。

### 算法步骤

#### 步骤 1：递归排序 S1 ∪ S2

将 S1 和 S2 中的每个位置 i 表示为三元组 `(s[i], s[i+1], s[i+2])`，然后递归排序这些三元组。

```
位置:  0 1 2 3 4 5 6
s:     b a n a n a $

S1 = {1, 4}
S2 = {2, 5}

三元组：
  位置 1: (a, n, a)
  位置 4: (n, a, $)
  位置 2: (n, a, n)
  位置 5: (a, $, ?)  # 用特殊字符填充
```

对这些三元组排序后，得到 S1 ∪ S2 中后缀的相对排名。

#### 步骤 2：排序 S0

S0 中的每个位置 i 可以表示为 `(s[i], rank[i+1])`，其中 `rank[i+1]` 是步骤 1 中计算的排名。

因为 i ∈ S0 意味着 i+1 ∈ S1，所以 `rank[i+1]` 是已知的。

#### 步骤 3：合并

将 S0 和 S1 ∪ S2 的排序结果合并。合并时的比较规则：

- 如果比较的是 S0 和 S1：比较 `(s[i], rank[i+1])` 和 `(s[j], rank[j+1])`
- 如果比较的是 S0 和 S2：比较 `(s[i], s[i+1], rank[i+2])` 和 `(s[j], s[j+1], rank[j+2])`

### 代码实现

```python
from typing import List

def build_suffix_array_dc3(s: str) -> List[int]:
    """
    DC3 算法构建后缀数组
    时间复杂度：O(n)
    """
    if not s:
        return []
    
    # 转换为数字数组，添加终止符
    arr = [ord(c) for c in s] + [0]  # 0 作为终止符，小于任何字符
    n = len(arr)
    
    def radix_sort(a, b, order, n_buckets):
        """基数排序：按 (a[i], b[i]) 排序，返回排序后的索引"""
        count = [0] * n_buckets
        for x in b:
            count[x] += 1
        for i in range(1, n_buckets):
            count[i] += count[i - 1]
        
        result = [0] * len(order)
        for i in range(len(order) - 1, -1, -1):
            idx = order[i]
            count[b[idx]] -= 1
            result[count[b[idx]]] = idx
        
        order = result
        
        count = [0] * n_buckets
        for x in a:
            count[x] += 1
        for i in range(1, n_buckets):
            count[i] += count[i - 1]
        
        result = [0] * len(order)
        for i in range(len(order) - 1, -1, -1):
            idx = order[i]
            count[a[idx]] -= 1
            result[count[a[idx]]] = idx
        
        return result
    
    def dc3_recursive(arr, n, alphabet_size):
        """DC3 递归实现"""
        n0 = (n + 2) // 3  # S0 的大小
        n1 = (n + 1) // 3  # S1 的大小
        n2 = n // 3        # S2 的大小
        n12 = n1 + n2      # S1 ∪ S2 的大小
        
        # 收集 S1 和 S2 的位置
        s12 = []
        for i in range(n + (n % 3 == 1)):
            if i % 3 != 0:
                s12.append(i)
        
        # 对三元组进行基数排序
        def get_char(i):
            return arr[i] if i < n else 0
        
        # 三轮基数排序
        order = list(range(len(s12)))
        for offset in [2, 1, 0]:
            count = [0] * alphabet_size
            for i in s12:
                count[get_char(i + offset)] += 1
            for i in range(1, alphabet_size):
                count[i] += count[i - 1]
            
            new_order = [0] * len(s12)
            for i in range(len(s12) - 1, -1, -1):
                idx = order[i]
                pos = s12[idx]
                count[get_char(pos + offset)] -= 1
                new_order[count[get_char(pos + offset)]] = idx
            order = new_order
        
        # 分配排名
        rank12 = [0] * len(s12)
        current_rank = 0
        prev_triple = None
        
        for i in order:
            pos = s12[i]
            triple = (get_char(pos), get_char(pos + 1), get_char(pos + 2))
            if triple != prev_triple:
                current_rank += 1
                prev_triple = triple
            rank12[i] = current_rank
        
        # 如果排名有重复，需要递归
        if current_rank < len(s12):
            # 构造递归字符串
            rec_arr = [0] * (len(s12) + 3)
            for i, idx in enumerate(s12):
                if idx % 3 == 1:
                    rec_arr[idx // 3] = rank12[i]
                else:
                    rec_arr[n1 + idx // 3] = rank12[i]
            
            rec_sa = dc3_recursive(rec_arr, len(s12), current_rank + 1)
            
            # 更新 rank12
            for i, pos in enumerate(rec_sa):
                rank12[pos] = i + 1
        
        # 根据排名重新排列 s12
        sa12 = [0] * len(s12)
        for i, idx in enumerate(s12):
            sa12[rank12[i] - 1] = idx
        
        # 排序 S0
        s0 = [i for i in range(0, n, 3)]
        
        # 为 S0 创建排序键
        # S0 中位置 i 的键是 (arr[i], rank12[i+1])
        def get_rank12(pos):
            if pos >= n:
                return 0
            if pos % 3 == 1:
                return rank12[s12.index(pos)]
            else:
                return rank12[s12.index(pos)]
        
        # 简化：直接用 Python 排序
        s0.sort(key=lambda i: (get_char(i), get_rank12((i + 1) % n if i + 1 < n else n)))
        
        # 合并 s0 和 sa12
        def compare(i, j):
            """比较位置 i (S0) 和位置 j (S12)"""
            if j % 3 == 1:
                # 比较 (arr[i], rank12[i+1]) 和 (arr[j], rank12[j+1])
                if get_char(i) != get_char(j):
                    return get_char(i) < get_char(j)
                return get_rank12((i + 1) % n) < get_rank12((j + 1) % n)
            else:
                # 比较两个字符 + rank
                if get_char(i) != get_char(j):
                    return get_char(i) < get_char(j)
                if get_char(i + 1) != get_char(j + 1):
                    return get_char(i + 1) < get_char(j + 1)
                return get_rank12((i + 2) % n) < get_rank12((j + 2) % n)
        
        # 合并排序
        result = []
        i, j = 0, 0
        while i < len(s0) and j < len(sa12):
            if compare(s0[i], sa12[j]):
                result.append(s0[i])
                i += 1
            else:
                result.append(sa12[j])
                j += 1
        result.extend(s0[i:])
        result.extend(sa12[j:])
        
        return result
    
    # 调用递归
    alphabet_size = max(arr) + 1
    sa = dc3_recursive(arr, n, alphabet_size)
    
    # 移除终止符位置
    return [x for x in sa if x < n - 1]
```

**注意**：上面的代码是简化版本，为了清晰展示算法思想。实际的 DC3 实现需要更多细节处理。

---

## SA-IS 算法

SA-IS（Suffix Array by Induced Sorting）由 Nong、Zhang 和 Chan 于 2009 年提出，是目前最快的线性时间后缀数组构建算法之一。

### 核心概念

#### S 型和 L 型后缀

将后缀分为两类：
- **S 型**（Smaller）：如果 suffix(i) < suffix(i+1)，或者 i = n-1
- **L 型**（Larger）：如果 suffix(i) > suffix(i+1)

```
s = "banana$"
位置: 0 1 2 3 4 5 6
字符: b a n a n a $
类型: L S L S L S S
```

#### LMS 后缀

**LMS**（Left-Most S-type）后缀是指：
- 位置 i 是 S 型
- 位置 i-1 是 L 型（或 i = 0）

LMS 后缀是算法的关键锚点。

### 算法步骤

1. **分类**：将每个位置标记为 S 型或 L 型
2. **找 LMS**：识别所有 LMS 位置
3. **诱导排序**：
   - 将 LMS 后缀放入正确的桶中
   - 从左到右诱导 L 型后缀
   - 从右到左诱导 S 型后缀
4. **递归**：如果 LMS 子串有重复，递归处理
5. **最终诱导**：用正确排序的 LMS 后缀进行最终诱导排序

### 简化实现

```python
from typing import List

def build_suffix_array_sais(s: str) -> List[int]:
    """
    SA-IS 算法构建后缀数组
    时间复杂度：O(n)
    """
    if not s:
        return []
    
    # 添加终止符（最小字符）
    s = s + chr(0)
    n = len(s)
    
    def induced_sort(s, sa, suffix_type, lms_positions, bucket_sizes, bucket_heads):
        """诱导排序"""
        n = len(s)
        
        # 初始化桶头位置
        heads = bucket_heads.copy()
        tails = [bucket_heads[i] + bucket_sizes[i] - 1 for i in range(len(bucket_sizes))]
        
        # 将 LMS 后缀放到桶的末尾
        for i in range(len(lms_positions) - 1, -1, -1):
            pos = lms_positions[i]
            c = ord(s[pos])
            sa[tails[c]] = pos
            tails[c] -= 1
        
        # 从左到右诱导 L 型后缀
        heads = bucket_heads.copy()
        for i in range(n):
            if sa[i] > 0 and suffix_type[sa[i] - 1] == 'L':
                c = ord(s[sa[i] - 1])
                sa[heads[c]] = sa[i] - 1
                heads[c] += 1
        
        # 从右到左诱导 S 型后缀
        tails = [bucket_heads[i] + bucket_sizes[i] - 1 for i in range(len(bucket_sizes))]
        for i in range(n - 1, -1, -1):
            if sa[i] > 0 and suffix_type[sa[i] - 1] == 'S':
                c = ord(s[sa[i] - 1])
                sa[tails[c]] = sa[i] - 1
                tails[c] -= 1
        
        return sa
    
    # 步骤 1：确定后缀类型
    suffix_type = [''] * n
    suffix_type[n - 1] = 'S'  # 最后一个字符（终止符）是 S 型
    
    for i in range(n - 2, -1, -1):
        if s[i] < s[i + 1]:
            suffix_type[i] = 'S'
        elif s[i] > s[i + 1]:
            suffix_type[i] = 'L'
        else:
            suffix_type[i] = suffix_type[i + 1]
    
    # 步骤 2：找 LMS 位置
    lms_positions = []
    for i in range(1, n):
        if suffix_type[i] == 'S' and suffix_type[i - 1] == 'L':
            lms_positions.append(i)
    
    # 步骤 3：计算桶信息
    alphabet_size = 256
    bucket_sizes = [0] * alphabet_size
    for c in s:
        bucket_sizes[ord(c)] += 1
    
    bucket_heads = [0] * alphabet_size
    total = 0
    for i in range(alphabet_size):
        bucket_heads[i] = total
        total += bucket_sizes[i]
    
    # 步骤 4：初始诱导排序
    sa = [-1] * n
    sa = induced_sort(s, sa, suffix_type, lms_positions, bucket_sizes, bucket_heads)
    
    # 步骤 5：为 LMS 子串分配排名
    lms_count = len(lms_positions)
    if lms_count > 0:
        # 收集排序后的 LMS 位置
        sorted_lms = [pos for pos in sa if pos in lms_positions or (pos > 0 and suffix_type[pos] == 'S' and suffix_type[pos - 1] == 'L')]
        sorted_lms = [pos for pos in sa if pos in set(lms_positions)]
        
        # 分配排名
        rank = {}
        current_rank = 0
        prev_lms = None
        
        for pos in sorted_lms:
            if prev_lms is None:
                current_rank = 0
            else:
                # 比较当前 LMS 子串和前一个
                is_different = False
                i, j = prev_lms, pos
                while True:
                    if s[i] != s[j]:
                        is_different = True
                        break
                    if suffix_type[i] == 'S' and suffix_type[i - 1] == 'L' and i != prev_lms:
                        break
                    if suffix_type[j] == 'S' and suffix_type[j - 1] == 'L' and j != pos:
                        break
                    i += 1
                    j += 1
                
                if is_different:
                    current_rank += 1
            
            rank[pos] = current_rank
            prev_lms = pos
        
        # 如果排名有重复，需要递归
        if current_rank < len(lms_positions) - 1:
            # 构造递归字符串
            rec_s = ''.join(chr(rank[pos]) for pos in lms_positions)
            rec_sa = build_suffix_array_sais(rec_s)
            
            # 根据递归结果重新排列 LMS 位置
            lms_positions = [lms_positions[i] for i in rec_sa]
        
        # 最终诱导排序
        sa = [-1] * n
        sa = induced_sort(s, sa, suffix_type, lms_positions, bucket_sizes, bucket_heads)
    
    # 移除终止符
    return [x for x in sa if x < n - 1]
```

---

## 算法对比

| 算法 | 时间复杂度 | 空间复杂度 | 实现难度 | 实际性能 |
|------|-----------|-----------|---------|---------|
| 朴素 | O(n² log n) | O(n) | 简单 | 慢 |
| 倍增 | O(n log n) | O(n) | 中等 | 较快 |
| DC3 | O(n) | O(n) | 困难 | 快 |
| SA-IS | O(n) | O(n) | 困难 | 最快 |

### 实际建议

1. **LeetCode/竞赛**：使用倍增算法或语言内置排序
2. **工业应用**：使用 SA-IS 或成熟库
3. **学习理解**：从倍增开始，理解 DC3 思想

---

## Python 实用方案

在 Python 中，由于解释器开销，手写线性算法可能反而比内置排序慢。推荐的实用方案：

```python
def build_suffix_array_practical(s: str) -> List[int]:
    """
    Python 实用版本：利用内置排序
    对于大多数 LeetCode 题目足够快
    """
    n = len(s)
    if n == 0:
        return []
    
    # 使用 Python 的 Timsort
    return sorted(range(n), key=lambda i: s[i:])
```

对于需要极致性能的场景，考虑：
1. 使用 `@functools.lru_cache` 缓存比较结果
2. 使用 Cython 或 NumPy 加速
3. 调用 C/C++ 库

---

## 本章小结

本章介绍了两种 O(n) 后缀数组构建算法：

1. **DC3 算法**：
   - 基于分治和模 3 分类
   - 递归处理 2/3 的问题规模
   - 实现复杂但思想优雅

2. **SA-IS 算法**：
   - 基于诱导排序
   - 使用 S/L 类型和 LMS 锚点
   - 实际性能最优

3. **实用建议**：
   - 大多数情况下，倍增算法足够
   - Python 中内置排序往往更快
   - 工业应用使用成熟库

下一章我们将学习与后缀数组配合使用的关键工具：**LCP 数组**。
