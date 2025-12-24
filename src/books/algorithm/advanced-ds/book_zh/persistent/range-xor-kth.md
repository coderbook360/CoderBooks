# 区间异或第 K 大

上一章我们学习了可持久化字典树求**区间异或最大值**。本章将扩展到**区间异或第 K 大**问题。

---

## 问题描述

给定数组 a，多次询问：在区间 [l, r] 中选一个数 y，使得 x XOR y 的结果是所有可能值中第 K 大的。返回这个第 K 大的异或值。

---

## 从最大值到第 K 大

回顾区间异或最大值的思路：
- 从高位到低位，贪心选择与 x 相反的位
- 每一步都选择能让结果最大的路径

第 K 大的思路：
- 从高位到低位，**计数**每条路径有多少个数
- 根据 K 决定走哪条路径

这与主席树求第 K 小的思想完全一致！

---

## 核心算法

```python
from typing import List

class PersistentTrieKth:
    """可持久化字典树：区间异或第 K 大"""
    
    def __init__(self, nums: List[int], bit_len: int = 30):
        self.bit_len = bit_len
        self.n = len(nums)
        
        max_nodes = (self.n + 1) * (bit_len + 1)
        self.children = [[0, 0] for _ in range(max_nodes)]
        self.cnt = [0] * max_nodes
        self.tot = 0
        
        self.roots = [0] * (self.n + 1)
        self.roots[0] = self._new_node()
        
        for i, x in enumerate(nums):
            self.roots[i + 1] = self._insert(self.roots[i], x)
    
    def _new_node(self) -> int:
        self.tot += 1
        self.children[self.tot] = [0, 0]
        self.cnt[self.tot] = 0
        return self.tot
    
    def _insert(self, prev: int, x: int) -> int:
        root = self._new_node()
        self.cnt[root] = self.cnt[prev] + 1
        
        cur, cur_prev = root, prev
        
        for i in range(self.bit_len - 1, -1, -1):
            bit = (x >> i) & 1
            other = 1 - bit
            
            self.children[cur][other] = self.children[cur_prev][other]
            
            new_node = self._new_node()
            self.children[cur][bit] = new_node
            self.cnt[new_node] = self.cnt[self.children[cur_prev][bit]] + 1
            
            cur = new_node
            cur_prev = self.children[cur_prev][bit]
        
        return root
    
    def query_kth_xor(self, l: int, r: int, x: int, k: int) -> int:
        """
        查询区间 [l, r] 中与 x 异或第 k 大的值
        返回第 k 大的异或结果
        """
        root_r = self.roots[r + 1]
        root_l = self.roots[l]
        
        result = 0
        cur_r, cur_l = root_r, root_l
        
        for i in range(self.bit_len - 1, -1, -1):
            bit = (x >> i) & 1
            prefer = 1 - bit  # 异或后为 1 的路径（使结果更大）
            
            # prefer 路径在区间中有多少数
            cnt_prefer = (self.cnt[self.children[cur_r][prefer]] - 
                         self.cnt[self.children[cur_l][prefer]])
            
            if cnt_prefer >= k:
                # 第 k 大在 prefer 路径
                result |= (1 << i)
                cur_r = self.children[cur_r][prefer]
                cur_l = self.children[cur_l][prefer]
            else:
                # 第 k 大在另一条路径
                k -= cnt_prefer
                cur_r = self.children[cur_r][bit]
                cur_l = self.children[cur_l][bit]
        
        return result
```

---

## 执行过程详解

假设数组 [3, 5, 7, 2]，bit_len = 3，查询区间 [0, 3] 中与 6 异或第 2 大。

数值的二进制：
- 3 = 011
- 5 = 101
- 7 = 111
- 2 = 010
- 6 = 110（查询值）

异或结果：
- 3 XOR 6 = 011 XOR 110 = 101 = 5
- 5 XOR 6 = 101 XOR 110 = 011 = 3
- 7 XOR 6 = 111 XOR 110 = 001 = 1
- 2 XOR 6 = 010 XOR 110 = 100 = 4

排序：5, 4, 3, 1

第 2 大 = 4

### 查询过程

**第 2 位**（x 的第 2 位 = 1）：
- prefer = 0（希望异或后为 1）
- 区间 [0,3] 中第 2 位为 0 的数：3, 2（共 2 个）
- cnt_prefer = 2 >= k = 2
- result |= 4，走 prefer 路径，k 保持 2

**第 1 位**（x 的第 1 位 = 1）：
- prefer = 0（希望异或后为 1）
- 在已选路径（第 2 位为 0）中，第 1 位为 0 的数：2（共 1 个）
- cnt_prefer = 1 < k = 2
- 走另一条路径，k = 2 - 1 = 1

**第 0 位**（x 的第 0 位 = 0）：
- prefer = 1（希望异或后为 1）
- 在已选路径中，第 0 位为 1 的数：3（共 1 个）
- cnt_prefer = 1 >= k = 1
- result |= 1，但实际执行需要精确计数

最终 result = 4（即 2 XOR 6）

---

## 应用：子数组异或第 K 大

### 问题

给定数组，求所有子数组异或值中第 K 大的。

### 思路

子数组 [l, r] 的异或值 = prefix[r+1] XOR prefix[l]

问题转化为：在前缀异或数组中，选两个位置 i < j，使 prefix[i] XOR prefix[j] 第 K 大。

### 实现

```python
def kth_xor_subarray(nums: List[int], k: int) -> int:
    """
    找所有子数组异或值中第 k 大的
    """
    n = len(nums)
    
    # 前缀异或
    prefix = [0] * (n + 1)
    for i in range(n):
        prefix[i + 1] = prefix[i] ^ nums[i]
    
    # 对前缀数组建立可持久化字典树
    trie = PersistentTrieKth(prefix, bit_len=30)
    
    # 二分答案
    lo, hi = 0, (1 << 30) - 1
    
    while lo < hi:
        mid = (lo + hi + 1) // 2
        
        # 计算有多少对 (i, j) 的异或值 >= mid
        count = 0
        for j in range(1, n + 1):
            # 在 [0, j-1] 中找与 prefix[j] 异或 >= mid 的个数
            count += count_ge(trie, 0, j - 1, prefix[j], mid)
        
        if count >= k:
            lo = mid
        else:
            hi = mid - 1
    
    return lo


def count_ge(trie: PersistentTrieKth, l: int, r: int, x: int, threshold: int) -> int:
    """
    计算区间 [l, r] 中与 x 异或 >= threshold 的数的个数
    """
    root_r = trie.roots[r + 1]
    root_l = trie.roots[l]
    
    count = 0
    cur_r, cur_l = root_r, root_l
    
    for i in range(trie.bit_len - 1, -1, -1):
        x_bit = (x >> i) & 1
        t_bit = (threshold >> i) & 1
        
        if t_bit == 1:
            # 必须让这一位异或后为 1
            prefer = 1 - x_bit
            cur_r = trie.children[cur_r][prefer]
            cur_l = trie.children[cur_l][prefer]
        else:
            # 这一位异或后为 1 的都满足（直接加入答案）
            prefer = 1 - x_bit
            count += (trie.cnt[trie.children[cur_r][prefer]] - 
                     trie.cnt[trie.children[cur_l][prefer]])
            # 继续走 0 路径
            cur_r = trie.children[cur_r][x_bit]
            cur_l = trie.children[cur_l][x_bit]
    
    # 最后到达的叶子也要算
    count += trie.cnt[cur_r] - trie.cnt[cur_l]
    
    return count
```

---

## 优化：直接求第 K 大

上面的二分方法复杂度较高。更高效的方法是直接枚举：

```python
def kth_xor_subarray_direct(nums: List[int], k: int) -> int:
    """
    更直接的方法：收集所有异或对，排序取第 k 大
    仅适用于 n 较小的情况
    """
    n = len(nums)
    
    prefix = [0] * (n + 1)
    for i in range(n):
        prefix[i + 1] = prefix[i] ^ nums[i]
    
    # 收集所有对
    xor_values = []
    for i in range(n + 1):
        for j in range(i + 1, n + 1):
            xor_values.append(prefix[i] ^ prefix[j])
    
    xor_values.sort(reverse=True)
    return xor_values[k - 1]
```

对于大规模数据，使用可持久化字典树 + 分治或堆：

```python
import heapq

def kth_xor_subarray_heap(nums: List[int], k: int) -> int:
    """
    使用最大堆找第 k 大
    复杂度: O(k * log(n) * B)
    """
    n = len(nums)
    
    prefix = [0] * (n + 1)
    for i in range(n):
        prefix[i + 1] = prefix[i] ^ nums[i]
    
    trie = PersistentTrieKth(prefix, bit_len=30)
    
    # 最大堆：(-xor_value, j, rank_in_j)
    # 表示与 prefix[j] 异或的第 rank 大值
    heap = []
    
    for j in range(1, n + 1):
        # 初始放入每个 j 的第 1 大
        max_xor = trie.query_kth_xor(0, j - 1, prefix[j], 1)
        heapq.heappush(heap, (-max_xor, j, 1))
    
    for _ in range(k - 1):
        _, j, rank = heapq.heappop(heap)
        
        # 如果还有更多
        if rank < j:
            next_xor = trie.query_kth_xor(0, j - 1, prefix[j], rank + 1)
            heapq.heappush(heap, (-next_xor, j, rank + 1))
    
    return -heap[0][0]
```

---

## 复杂度分析

| 方法 | 时间复杂度 | 空间复杂度 |
|------|-----------|-----------|
| 暴力枚举 | O(n² log n) | O(n²) |
| 二分 + 计数 | O(n × B × log V) | O(n × B) |
| 堆 + 可持久化字典树 | O((n + k) × B × log n) | O(n × B) |

其中 B 是位数，V 是值域。

---

## 变体问题

### 变体 1：区间内第 K 小异或和

与第 K 大对称，只需调整比较方向：

```python
def query_kth_min_xor(self, l: int, r: int, x: int, k: int) -> int:
    """第 k 小：优先走异或后为 0 的路径"""
    result = 0
    cur_r, cur_l = self.roots[r + 1], self.roots[l]
    
    for i in range(self.bit_len - 1, -1, -1):
        bit = (x >> i) & 1
        same = bit  # 异或后为 0 的路径
        
        cnt_same = (self.cnt[self.children[cur_r][same]] - 
                   self.cnt[self.children[cur_l][same]])
        
        if cnt_same >= k:
            cur_r = self.children[cur_r][same]
            cur_l = self.children[cur_l][same]
        else:
            k -= cnt_same
            result |= (1 << i)
            cur_r = self.children[cur_r][1 - same]
            cur_l = self.children[cur_l][1 - same]
    
    return result
```

### 变体 2：带权值的异或

如果每个数有权值，需要在字典树节点存储权值和：

```python
# 节点额外存储
self.weight_sum = [0] * max_nodes

# 插入时更新
self.weight_sum[new_node] = self.weight_sum[prev_node] + weight
```

---

## 常见错误

### 错误 1：K 的边界

```python
# 错误：k 可能超过区间元素数
if k > r - l + 1:
    return -1  # 无效查询

# 正确：先检查
def query_kth_xor(self, l, r, x, k):
    total = self.cnt[self.roots[r + 1]] - self.cnt[self.roots[l]]
    if k > total:
        return -1  # 或抛出异常
```

### 错误 2：位运算优先级

```python
# 错误：运算符优先级
if x >> i & 1 == 0:  # 实际是 (x >> i) & (1 == 0)

# 正确：加括号
if ((x >> i) & 1) == 0:
```

---

## 本章小结

本章学习了区间异或第 K 大问题：

1. **核心思想**
   - 可持久化字典树 + 计数
   - 从高位到低位二分

2. **与第 K 小的对应**
   - 第 K 大：优先走异或为 1 的路径
   - 第 K 小：优先走异或为 0 的路径

3. **扩展应用**
   - 子数组异或第 K 大
   - 使用堆优化查询

4. **复杂度**
   - 单次查询：O(B)
   - 构建：O(n × B)

下一章我们将学习可持久化数据结构的通用模式：**历史版本查询**。
