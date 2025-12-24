# 后缀数组的构建（倍增法）

朴素方法构建后缀数组需要 O(n² log n) 的时间，对于大规模字符串不可接受。**倍增算法**（Doubling Algorithm）将复杂度降低到 O(n log n)，是实践中最常用的构建方法之一。

---

## 核心思想

倍增算法的核心思想是：**利用已有的排序结果，逐步扩展比较长度**。

### 关键观察

如果我们已经知道所有长度为 k 的子串的排名，那么可以在 O(n log n) 时间内计算所有长度为 2k 的子串的排名。

为什么？因为长度为 2k 的子串可以拆分为两个长度为 k 的部分：

```
s[i:i+2k] = s[i:i+k] + s[i+k:i+2k]
```

我们用 `(rank[i], rank[i+k])` 这个二元组来表示 s[i:i+2k] 的"特征"，然后对这些二元组排序。

### 倍增过程

1. 初始：按单个字符排序（k = 1）
2. 第一轮：按 (rank[i], rank[i+1]) 排序 → 得到长度 2 的排名
3. 第二轮：按 (rank[i], rank[i+2]) 排序 → 得到长度 4 的排名
4. ...
5. 第 log(n) 轮：按 (rank[i], rank[i+n/2]) 排序 → 得到完整后缀的排名

由于后缀长度最多 n，经过 O(log n) 轮后，排序完成。

---

## 算法详解

### 步骤 1：初始化

将字符串中每个字符映射到其 ASCII 值（或相对排名）：

```python
rank = [ord(c) for c in s]
```

### 步骤 2：迭代倍增

```python
k = 1
while k < n:
    # 用 (rank[i], rank[i+k]) 作为排序键
    # 如果 i+k >= n，则 rank[i+k] = -1（表示空）
    ...
    k *= 2
```

### 步骤 3：排序并更新排名

每轮需要：
1. 根据二元组 (rank[i], rank[i+k]) 对位置排序
2. 根据排序结果更新 rank 数组

---

## 完整实现

```python
from typing import List

def build_suffix_array_doubling(s: str) -> List[int]:
    """
    使用倍增法构建后缀数组
    时间复杂度：O(n log² n)（使用内置排序）
    空间复杂度：O(n)
    """
    n = len(s)
    if n == 0:
        return []
    if n == 1:
        return [0]
    
    # 初始化：按单个字符排序
    sa = list(range(n))
    rank = [ord(c) for c in s]
    tmp = [0] * n
    
    k = 1
    while k < n:
        # 排序键：(rank[i], rank[i+k])
        def key(i):
            second = rank[i + k] if i + k < n else -1
            return (rank[i], second)
        
        sa.sort(key=key)
        
        # 更新 rank
        tmp[sa[0]] = 0
        for i in range(1, n):
            # 如果排序键相同，rank 也相同
            if key(sa[i]) == key(sa[i-1]):
                tmp[sa[i]] = tmp[sa[i-1]]
            else:
                tmp[sa[i]] = tmp[sa[i-1]] + 1
        
        rank, tmp = tmp, rank
        
        # 如果所有 rank 都不同，提前退出
        if rank[sa[n-1]] == n - 1:
            break
        
        k *= 2
    
    return sa
```

### 复杂度分析

- 迭代次数：O(log n)
- 每次迭代：O(n log n)（排序）
- 总复杂度：**O(n log² n)**

这已经比朴素方法好很多了。下面我们介绍如何进一步优化到 O(n log n)。

---

## 基数排序优化

内置排序每次需要 O(n log n)，但我们可以利用**基数排序**将每次迭代降到 O(n)。

### 关键观察

排序键是二元组 (rank[i], rank[i+k])，每个分量的范围都是 [0, n)。

对于这种有界整数对，可以使用**两次计数排序**：先按第二关键字排序，再按第一关键字排序（稳定排序）。

### 优化实现

```python
from typing import List

def build_suffix_array_optimized(s: str) -> List[int]:
    """
    使用倍增法 + 基数排序构建后缀数组
    时间复杂度：O(n log n)
    空间复杂度：O(n)
    """
    n = len(s)
    if n == 0:
        return []
    if n == 1:
        return [0]
    
    # 初始化
    sa = list(range(n))
    rank = [ord(c) for c in s]
    tmp = [0] * n
    
    def counting_sort_by_rank(sa, rank, offset):
        """按 rank[sa[i] + offset] 进行计数排序"""
        # 获取最大值
        max_rank = max(rank[i + offset] if i + offset < n else -1 for i in sa)
        min_val = -1  # 可能有 -1
        bucket_size = max_rank - min_val + 1
        
        count = [0] * bucket_size
        for i in sa:
            key = rank[i + offset] if i + offset < n else -1
            count[key - min_val] += 1
        
        # 累积
        for i in range(1, bucket_size):
            count[i] += count[i - 1]
        
        # 稳定排序（从后往前）
        result = [0] * n
        for i in range(n - 1, -1, -1):
            key = rank[sa[i] + offset] if sa[i] + offset < n else -1
            count[key - min_val] -= 1
            result[count[key - min_val]] = sa[i]
        
        return result
    
    def radix_sort(sa, rank, k):
        """基数排序：按 (rank[i], rank[i+k]) 排序"""
        # 先按第二关键字排序
        sa = counting_sort_by_rank(sa, rank, k)
        # 再按第一关键字排序（稳定）
        sa = counting_sort_by_rank(sa, rank, 0)
        return sa
    
    k = 1
    while k < n:
        # 基数排序
        sa = radix_sort(sa, rank, k)
        
        # 更新 rank
        def key(i):
            return (rank[i], rank[i + k] if i + k < n else -1)
        
        tmp[sa[0]] = 0
        for i in range(1, n):
            if key(sa[i]) == key(sa[i-1]):
                tmp[sa[i]] = tmp[sa[i-1]]
            else:
                tmp[sa[i]] = tmp[sa[i-1]] + 1
        
        rank, tmp = tmp, rank
        
        if rank[sa[n-1]] == n - 1:
            break
        
        k *= 2
    
    return sa
```

---

## 更简洁的实现

实际上，可以用一个技巧简化代码：先对第二关键字进行"隐式排序"。

```python
from typing import List

def build_suffix_array_concise(s: str) -> List[int]:
    """
    简洁版倍增算法
    时间复杂度：O(n log n)
    """
    n = len(s)
    if n == 0:
        return []
    
    # 初始化
    sa = list(range(n))
    rank = [ord(c) for c in s]
    tmp = [0] * n
    
    k = 1
    while k < n:
        # 按第二关键字排序
        # 后缀 i 的第二关键字是 rank[i+k]，如果 i+k >= n 则为 -∞
        # 技巧：i >= n-k 的位置第二关键字最小，应排在最前
        
        # 按第二关键字分组
        sa_by_second = [i - k for i in sa if i >= k]  # 第二关键字为 rank[i] 的
        sa_by_second += [i for i in range(n - k, n)]   # 第二关键字为 -∞ 的
        
        # 按第一关键字计数排序
        max_rank = max(rank)
        count = [0] * (max_rank + 1)
        for i in range(n):
            count[rank[i]] += 1
        for i in range(1, max_rank + 1):
            count[i] += count[i - 1]
        
        for i in range(n - 1, -1, -1):
            j = sa_by_second[i]
            count[rank[j]] -= 1
            sa[count[rank[j]]] = j
        
        # 更新 rank
        def key(i):
            return (rank[i], rank[i + k] if i + k < n else -1)
        
        tmp[sa[0]] = 0
        for i in range(1, n):
            tmp[sa[i]] = tmp[sa[i-1]] + (0 if key(sa[i]) == key(sa[i-1]) else 1)
        
        rank, tmp = tmp, rank
        
        if rank[sa[n-1]] == n - 1:
            break
        
        k *= 2
    
    return sa
```

---

## 执行过程示例

以 `"banana"` 为例：

### 初始化

```
s = "banana"
rank = [98, 97, 110, 97, 110, 97]  # ASCII 值
      = [b,  a,  n,   a,  n,   a]
```

### k = 1

排序键：(rank[i], rank[i+1])

```
i=0: (98, 97)   = (b, a)
i=1: (97, 110)  = (a, n)
i=2: (110, 97)  = (n, a)
i=3: (97, 110)  = (a, n)
i=4: (110, 97)  = (n, a)
i=5: (97, -1)   = (a, -)

排序后：
  i=5: (97, -1)   → rank=0
  i=1: (97, 110)  → rank=1
  i=3: (97, 110)  → rank=1
  i=0: (98, 97)   → rank=2
  i=2: (110, 97)  → rank=3
  i=4: (110, 97)  → rank=3

新 rank = [2, 1, 3, 1, 3, 0]
sa = [5, 1, 3, 0, 2, 4]
```

### k = 2

排序键：(rank[i], rank[i+2])

```
i=0: (2, 3)  # rank[0]=2, rank[2]=3
i=1: (1, 1)  # rank[1]=1, rank[3]=1
i=2: (3, 3)  # rank[2]=3, rank[4]=3
i=3: (1, 0)  # rank[3]=1, rank[5]=0
i=4: (3, -1) # rank[4]=3, rank[6]不存在
i=5: (0, -1) # rank[5]=0, rank[7]不存在

排序后：
  i=5: (0, -1)  → rank=0
  i=3: (1, 0)   → rank=1
  i=1: (1, 1)   → rank=2
  i=0: (2, 3)   → rank=3
  i=4: (3, -1)  → rank=4
  i=2: (3, 3)   → rank=5

新 rank = [3, 2, 5, 1, 4, 0]
sa = [5, 3, 1, 0, 4, 2]
```

所有 rank 都不同，算法结束。

最终 **SA = [5, 3, 1, 0, 4, 2]**，与预期一致！

---

## 复杂度分析

| 操作 | 复杂度 |
|------|--------|
| 初始化 | O(n) |
| 每轮基数排序 | O(n) |
| 每轮更新 rank | O(n) |
| 迭代次数 | O(log n) |
| **总复杂度** | **O(n log n)** |

---

## 常见错误

### 1. 边界处理

当 `i + k >= n` 时，`rank[i+k]` 应该是一个比任何有效 rank 都小的值（如 -1）：

```python
second = rank[i + k] if i + k < n else -1
```

### 2. 稳定排序

基数排序必须是稳定的，否则结果会错误。计数排序从后往前遍历保证稳定性：

```python
for i in range(n - 1, -1, -1):
    # ...
```

### 3. rank 和 tmp 的交换

每轮结束后交换 rank 和 tmp，而不是复制：

```python
rank, tmp = tmp, rank
```

---

## 完整模板

```python
from typing import List

class SuffixArrayDoubling:
    """倍增法构建后缀数组"""
    
    def __init__(self, s: str):
        self.s = s
        self.n = len(s)
        self.sa = self._build()
        self.rank = self._compute_rank()
    
    def _build(self) -> List[int]:
        n = self.n
        if n == 0:
            return []
        if n == 1:
            return [0]
        
        s = self.s
        sa = list(range(n))
        rank = [ord(c) for c in s]
        tmp = [0] * n
        
        k = 1
        while k < n:
            # 按 (rank[i], rank[i+k]) 排序
            sa.sort(key=lambda i: (rank[i], rank[i+k] if i+k < n else -1))
            
            # 更新 rank
            tmp[sa[0]] = 0
            for i in range(1, n):
                prev_key = (rank[sa[i-1]], rank[sa[i-1]+k] if sa[i-1]+k < n else -1)
                curr_key = (rank[sa[i]], rank[sa[i]+k] if sa[i]+k < n else -1)
                tmp[sa[i]] = tmp[sa[i-1]] if curr_key == prev_key else tmp[sa[i-1]] + 1
            
            rank, tmp = tmp, rank
            
            if rank[sa[n-1]] == n - 1:
                break
            
            k *= 2
        
        return sa
    
    def _compute_rank(self) -> List[int]:
        rank = [0] * self.n
        for i in range(self.n):
            rank[self.sa[i]] = i
        return rank


# 测试
if __name__ == "__main__":
    sa = SuffixArrayDoubling("banana")
    print(f"SA: {sa.sa}")  # [5, 3, 1, 0, 4, 2]
    print(f"Rank: {sa.rank}")  # [3, 2, 5, 1, 4, 0]
```

---

## 本章小结

倍增算法是构建后缀数组的经典方法：

1. **核心思想**：利用长度 k 的排序结果，计算长度 2k 的排序
2. **复杂度**：
   - 使用内置排序：O(n log² n)
   - 使用基数排序：O(n log n)
3. **关键技巧**：
   - 用二元组 (rank[i], rank[i+k]) 作为排序键
   - 正确处理越界情况
   - 提前退出优化

下一章我们将介绍更高效的 O(n) 构建算法：DC3 和 SA-IS。
