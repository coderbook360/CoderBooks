# 区间众数查询

区间众数（Range Mode Query）是一个比区间不同数更具挑战性的问题。众数是区间内出现次数最多的数，当存在多个众数时，通常返回其中任意一个或值最小的那个。

---

## 问题定义

> 给定一个长度为 n 的数组 arr，有 q 个查询，每次询问区间 [l, r] 内的众数（出现次数最多的数）。如果有多个众数，返回值最小的。
>
> **约束**：
> - 1 ≤ n, q ≤ 10^5
> - 1 ≤ arr[i] ≤ 10^9

---

## 为什么众数难以处理？

众数问题的核心难点在于：**众数不具有可合并性**。

给定两个区间的众数，无法直接推出合并后的众数。例如：
- 区间 [1, 3]：众数是 2（出现 2 次），数组 [1, 2, 2]
- 区间 [4, 6]：众数是 3（出现 2 次），数组 [3, 3, 1]
- 合并后 [1, 6]：众数可能是 1、2 或 3（都出现 2 次）

这使得线段树、树状数组等基于区间合并的数据结构难以直接应用。

---

## 方法一：分块预处理

### 核心思想

1. 将数组分成 √n 个块
2. 预处理任意两个块之间的众数
3. 查询时，中间完整块的众数直接获取，两端零散元素暴力检查

### 关键观察

对于查询 [l, r]，设中间完整块的众数为 mode_mid：
- 最终众数要么是 mode_mid
- 要么是两端零散元素中的某个值

**为什么？** 如果最终众数不在零散元素中，它的所有出现位置都在中间完整块内，那么 mode_mid 就应该是它。

所以我们只需要检查 O(√n) 个候选值。

### 预处理

```python
import math
from collections import Counter
from typing import List, Tuple

def preprocess_mode(arr: List[int], block_size: int):
    """
    预处理任意两个块之间的众数
    返回 block_mode[i][j] = 块 i 到块 j 之间的众数
    """
    n = len(arr)
    block_count = (n + block_size - 1) // block_size
    
    # block_mode[i][j] = (众数, 出现次数)
    block_mode = [[None] * block_count for _ in range(block_count)]
    
    for i in range(block_count):
        counter = Counter()
        best_val, best_cnt = None, 0
        
        for j in range(i, block_count):
            # 将块 j 的元素加入统计
            start = j * block_size
            end = min((j + 1) * block_size, n)
            
            for k in range(start, end):
                val = arr[k]
                counter[val] += 1
                cnt = counter[val]
                
                # 更新众数（优先选择出现次数多的，次数相同选值小的）
                if cnt > best_cnt or (cnt == best_cnt and (best_val is None or val < best_val)):
                    best_val, best_cnt = val, cnt
            
            block_mode[i][j] = (best_val, best_cnt)
    
    return block_mode
```

### 查询处理

```python
def query_mode(arr: List[int], l: int, r: int, block_size: int, block_mode, val_positions) -> int:
    """
    查询 [l, r] 的众数
    val_positions: 每个值出现的位置列表（用于快速计数）
    """
    n = len(arr)
    left_block = l // block_size
    right_block = r // block_size
    
    # 收集候选众数
    candidates = set()
    
    if left_block == right_block:
        # 同一块内，所有元素都是候选
        for i in range(l, r + 1):
            candidates.add(arr[i])
    else:
        # 左边零散部分
        left_end = (left_block + 1) * block_size
        for i in range(l, left_end):
            candidates.add(arr[i])
        
        # 右边零散部分
        right_start = right_block * block_size
        for i in range(right_start, r + 1):
            candidates.add(arr[i])
        
        # 中间完整块的众数
        if left_block + 1 <= right_block - 1:
            mid_mode, _ = block_mode[left_block + 1][right_block - 1]
            if mid_mode is not None:
                candidates.add(mid_mode)
    
    # 在候选中找出真正的众数
    best_val, best_cnt = None, 0
    
    for val in candidates:
        # 使用二分查找计算 val 在 [l, r] 中出现的次数
        positions = val_positions[val]
        # bisect_left(positions, l) = 第一个 >= l 的位置
        # bisect_right(positions, r) = 第一个 > r 的位置
        import bisect
        cnt = bisect.bisect_right(positions, r) - bisect.bisect_left(positions, l)
        
        if cnt > best_cnt or (cnt == best_cnt and (best_val is None or val < best_val)):
            best_val, best_cnt = val, cnt
    
    return best_val
```

### 完整实现

```python
import math
import bisect
from collections import defaultdict, Counter
from typing import List, Tuple

class RangeModeQuery:
    def __init__(self, arr: List[int]):
        self.arr = arr
        self.n = len(arr)
        
        if self.n == 0:
            return
        
        self.block_size = max(1, int(math.sqrt(self.n)))
        self.block_count = (self.n + self.block_size - 1) // self.block_size
        
        # 预处理每个值的出现位置
        self.val_positions = defaultdict(list)
        for i, v in enumerate(arr):
            self.val_positions[v].append(i)
        
        # 预处理块间众数
        self._preprocess_block_mode()
    
    def _preprocess_block_mode(self):
        """预处理任意两个块之间的众数"""
        self.block_mode = [[None] * self.block_count for _ in range(self.block_count)]
        
        for i in range(self.block_count):
            counter = Counter()
            best_val, best_cnt = None, 0
            
            for j in range(i, self.block_count):
                start = j * self.block_size
                end = min((j + 1) * self.block_size, self.n)
                
                for k in range(start, end):
                    val = self.arr[k]
                    counter[val] += 1
                    cnt = counter[val]
                    
                    if cnt > best_cnt or (cnt == best_cnt and (best_val is None or val < best_val)):
                        best_val, best_cnt = val, cnt
                
                self.block_mode[i][j] = (best_val, best_cnt)
    
    def _count_in_range(self, val: int, l: int, r: int) -> int:
        """使用二分查找计算 val 在 [l, r] 中出现的次数"""
        positions = self.val_positions[val]
        return bisect.bisect_right(positions, r) - bisect.bisect_left(positions, l)
    
    def query(self, l: int, r: int) -> int:
        """查询 [l, r] 的众数"""
        if l > r or self.n == 0:
            return None
        
        left_block = l // self.block_size
        right_block = r // self.block_size
        
        candidates = set()
        
        if left_block == right_block:
            # 同一块内
            for i in range(l, r + 1):
                candidates.add(self.arr[i])
        else:
            # 左边零散
            for i in range(l, (left_block + 1) * self.block_size):
                candidates.add(self.arr[i])
            
            # 右边零散
            for i in range(right_block * self.block_size, r + 1):
                candidates.add(self.arr[i])
            
            # 中间完整块的众数
            if left_block + 1 <= right_block - 1:
                mid_mode, _ = self.block_mode[left_block + 1][right_block - 1]
                if mid_mode is not None:
                    candidates.add(mid_mode)
        
        # 找出真正的众数
        best_val, best_cnt = None, 0
        
        for val in candidates:
            cnt = self._count_in_range(val, l, r)
            if cnt > best_cnt or (cnt == best_cnt and (best_val is None or val < best_val)):
                best_val, best_cnt = val, cnt
        
        return best_val
```

### 复杂度分析

- **预处理**：O(n × √n)（共 O(n) 个块对，每对最多 O(√n) 个元素）
- **空间**：O(n + n) = O(n)（位置列表 + 块间众数）
- **查询**：O(√n × log n)（O(√n) 个候选，每个二分 O(log n)）

---

## 方法二：莫队算法

莫队也可以解决这个问题，但需要维护额外的信息。

### 维护的信息

- `count[v]`：值 v 在当前区间的出现次数
- `cnt_freq[f]`：出现次数为 f 的值有多少个
- `max_freq`：当前区间的最大出现次数

### add/remove 操作

```python
def add(idx):
    global max_freq
    val = mapped[idx]
    
    # 更新频率统计
    if count[val] > 0:
        cnt_freq[count[val]] -= 1
    count[val] += 1
    cnt_freq[count[val]] += 1
    
    # 更新最大频率
    max_freq = max(max_freq, count[val])

def remove(idx):
    global max_freq
    val = mapped[idx]
    
    # 更新频率统计
    cnt_freq[count[val]] -= 1
    if cnt_freq[count[val]] == 0 and count[val] == max_freq:
        max_freq -= 1
    count[val] -= 1
    if count[val] > 0:
        cnt_freq[count[val]] += 1
```

### 获取众数

问题：我们知道了最大频率 max_freq，但如何知道哪个值达到了这个频率？

**方法 1**：维护一个值的列表 `vals_with_freq[f]`，但这会增加复杂度。

**方法 2**：如果只需要知道"众数的出现次数"而不是"众数是谁"，直接返回 max_freq。

**方法 3**：如果需要知道具体的众数，可以在查询时遍历所有值找出 count[v] == max_freq 的最小 v。

### 完整实现（返回众数的出现次数）

```python
import math
from collections import defaultdict
from typing import List, Tuple

def query_mode_count_mo(arr: List[int], queries: List[Tuple[int, int]]) -> List[int]:
    """
    使用莫队返回每个查询区间众数的出现次数
    """
    n = len(arr)
    q = len(queries)
    
    if n == 0 or q == 0:
        return [0] * q
    
    # 离散化
    sorted_vals = sorted(set(arr))
    val_to_id = {v: i for i, v in enumerate(sorted_vals)}
    mapped = [val_to_id[v] for v in arr]
    M = len(sorted_vals)
    
    block_size = max(1, int(math.sqrt(n)))
    
    indexed = [(l, r, i) for i, (l, r) in enumerate(queries)]
    indexed.sort(key=lambda x: (x[0] // block_size, x[1] if (x[0] // block_size) % 2 == 0 else -x[1]))
    
    count = [0] * M
    cnt_freq = [0] * (n + 1)  # cnt_freq[f] = 有多少个值出现了 f 次
    max_freq = 0
    cur_l, cur_r = 0, -1
    results = [0] * q
    
    def add(idx):
        nonlocal max_freq
        val = mapped[idx]
        if count[val] > 0:
            cnt_freq[count[val]] -= 1
        count[val] += 1
        cnt_freq[count[val]] += 1
        max_freq = max(max_freq, count[val])
    
    def remove(idx):
        nonlocal max_freq
        val = mapped[idx]
        cnt_freq[count[val]] -= 1
        if cnt_freq[count[val]] == 0 and count[val] == max_freq:
            max_freq -= 1
        count[val] -= 1
        if count[val] > 0:
            cnt_freq[count[val]] += 1
    
    for l, r, qi in indexed:
        while cur_r < r:
            cur_r += 1
            add(cur_r)
        while cur_r > r:
            remove(cur_r)
            cur_r -= 1
        while cur_l > l:
            cur_l -= 1
            add(cur_l)
        while cur_l < l:
            remove(cur_l)
            cur_l += 1
        
        results[qi] = max_freq
    
    return results
```

---

## 方法三：随机化

对于某些应用场景，可以使用随机化方法：

### 核心思想

如果众数出现次数 ≥ k，那么随机选择 O(n/k × log n) 个元素，大概率会选中众数。

### 算法

1. 随机选择 O(log n) 个元素作为候选
2. 对每个候选，使用二分查找计算其在 [l, r] 中的出现次数
3. 返回出现次数最多的候选

### 复杂度

- 查询：O(log² n)（期望）
- 适用于众数出现次数较高的场景

---

## 方法对比

| 方法 | 预处理 | 查询 | 空间 | 适用场景 |
|------|--------|------|------|---------|
| 分块预处理 | O(n√n) | O(√n log n) | O(n) | 在线查询 |
| 莫队 | O(1) | O((n+q)√n) | O(n) | 离线查询，多次查询 |
| 随机化 | O(n log n) | O(log² n) | O(n) | 众数出现次数高 |

---

## 实战测试

```python
def test_range_mode():
    # 测试用例 1
    arr = [1, 2, 1, 2, 1, 3, 3, 3]
    rmq = RangeModeQuery(arr)
    
    assert rmq.query(0, 4) == 1  # [1,2,1,2,1] 众数是 1
    assert rmq.query(5, 7) == 3  # [3,3,3] 众数是 3
    assert rmq.query(0, 7) == 1  # 1 和 3 都出现 3 次，返回较小的 1
    
    # 测试用例 2：单元素
    arr2 = [5]
    rmq2 = RangeModeQuery(arr2)
    assert rmq2.query(0, 0) == 5
    
    # 测试用例 3：全相同
    arr3 = [7, 7, 7, 7]
    rmq3 = RangeModeQuery(arr3)
    assert rmq3.query(0, 3) == 7
    assert rmq3.query(1, 2) == 7
    
    print("All tests passed!")

test_range_mode()
```

---

## 本章小结

区间众数查询是一个比区间不同数更具挑战性的问题：

1. **核心难点**：众数不具有可合并性
2. **分块预处理**：
   - 预处理块间众数
   - 查询时检查 O(√n) 个候选
   - 复杂度 O(√n log n) 每查询
3. **莫队方法**：
   - 可以返回"众数的出现次数"
   - 返回"具体的众数"需要额外处理
4. **关键技巧**：
   - 二分查找快速计数
   - 候选值剪枝

区间众数问题展示了分块思想的精髓：**当完美解法不存在时，用 √n 的代价换取可行性**。

至此，我们完成了第六部分"分块与莫队算法"的全部内容。这些技术为处理复杂的区间查询问题提供了强大而灵活的工具。
