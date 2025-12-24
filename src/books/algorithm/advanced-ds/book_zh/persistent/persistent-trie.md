# 可持久化字典树

前面我们学习了主席树处理区间第 K 小。本章将学习**可持久化字典树（Persistent Trie）**，它是处理**区间异或问题**的利器。

---

## 为什么需要可持久化字典树？

考虑问题：给定数组 a，求区间 [l, r] 中与 x 异或最大的值。

普通字典树可以求**全局**异或最大值，但无法限制区间。

可持久化字典树通过版本控制，支持**区间查询**。

---

## 核心思想

与主席树类似：

1. **版本化**：每插入一个数，创建一个新版本
2. **前缀和**：版本 i 包含 a[0..i-1] 的信息
3. **区间查询**：用版本 r - 版本 (l-1) 得到区间信息

---

## 数据结构

```python
from typing import List

class PersistentTrie:
    """可持久化字典树：处理区间异或问题"""
    
    def __init__(self, nums: List[int], bit_len: int = 30):
        """
        nums: 数组
        bit_len: 数值的二进制位数
        """
        self.bit_len = bit_len
        self.n = len(nums)
        
        # 节点池
        max_nodes = (self.n + 1) * (bit_len + 1)
        self.children = [[0, 0] for _ in range(max_nodes)]  # 0/1 子节点
        self.cnt = [0] * max_nodes  # 经过该节点的数的个数
        self.tot = 0
        
        # 版本根
        self.roots = [0] * (self.n + 1)
        
        # 初始化：插入一个 0，方便处理前缀异或
        self.roots[0] = self._new_node()
        
        # 逐个插入元素
        for i, x in enumerate(nums):
            self.roots[i + 1] = self._insert(self.roots[i], x)
    
    def _new_node(self) -> int:
        self.tot += 1
        self.children[self.tot] = [0, 0]
        self.cnt[self.tot] = 0
        return self.tot
    
    def _insert(self, prev: int, x: int) -> int:
        """在 prev 版本基础上插入 x，返回新根"""
        root = self._new_node()
        self.cnt[root] = self.cnt[prev] + 1
        
        cur, cur_prev = root, prev
        
        for i in range(self.bit_len - 1, -1, -1):
            bit = (x >> i) & 1
            other = 1 - bit
            
            # 复制另一个子节点
            self.children[cur][other] = self.children[cur_prev][other]
            
            # 创建新的当前位子节点
            new_node = self._new_node()
            self.children[cur][bit] = new_node
            self.cnt[new_node] = self.cnt[self.children[cur_prev][bit]] + 1
            
            cur = new_node
            cur_prev = self.children[cur_prev][bit]
        
        return root
    
    def query_max_xor(self, l: int, r: int, x: int) -> int:
        """
        查询区间 [l, r] 中与 x 异或最大的值
        返回最大异或值
        """
        # 使用版本 r+1 和版本 l 做差
        root_r = self.roots[r + 1]
        root_l = self.roots[l]
        
        result = 0
        cur_r, cur_l = root_r, root_l
        
        for i in range(self.bit_len - 1, -1, -1):
            bit = (x >> i) & 1
            prefer = 1 - bit  # 希望走与 bit 相反的路径
            
            # 检查 prefer 路径在区间 [l, r] 中是否有数
            cnt_prefer = (self.cnt[self.children[cur_r][prefer]] - 
                         self.cnt[self.children[cur_l][prefer]])
            
            if cnt_prefer > 0:
                result |= (1 << i)
                cur_r = self.children[cur_r][prefer]
                cur_l = self.children[cur_l][prefer]
            else:
                cur_r = self.children[cur_r][bit]
                cur_l = self.children[cur_l][bit]
        
        return result
```

---

## 执行过程详解

以数组 [3, 5, 7, 2]，bit_len = 3 为例：

数值的二进制：
- 3 = 011
- 5 = 101
- 7 = 111
- 2 = 010

### 插入过程

**版本 0**：空字典树

**版本 1**：插入 3 (011)
```
     root1
      |
     [0,1]  -> bit 0
      |
     [0,1]  -> bit 1
      |
     [0,1]  -> bit 1
```

**版本 2**：插入 5 (101)
- 与版本 1 共享部分节点
- 第一位不同（0 vs 1），分叉

**版本 3**：插入 7 (111)

**版本 4**：插入 2 (010)

### 查询过程

查询区间 [1, 3] 中与 6 (110) 异或最大的值：

6 = 110

1. 第 2 位（最高位）= 1，希望走 0
   - 检查 root4.child[0].cnt - root1.child[0].cnt > 0?
   - 如果有，走 0，result |= 4

2. 第 1 位 = 1，希望走 0
   - 类似检查

3. 第 0 位 = 0，希望走 1
   - 类似检查

---

## 应用：区间异或最大值

### 问题描述

给定数组，求区间 [l, r] 中选两个数，使异或值最大。

### 思路

- 预处理前缀异或 prefix[i] = a[0] ^ a[1] ^ ... ^ a[i-1]
- 子区间 [l, r] 的异或 = prefix[r+1] ^ prefix[l]
- 问题转化：在 prefix[l..r+1] 中选两个数，异或最大

### 实现

```python
def max_xor_in_range(nums: List[int], queries: List[tuple]) -> List[int]:
    """
    nums: 数组
    queries: [(l, r), ...] 查询列表
    返回: 每个查询的答案
    """
    n = len(nums)
    
    # 前缀异或
    prefix = [0] * (n + 1)
    for i in range(n):
        prefix[i + 1] = prefix[i] ^ nums[i]
    
    # 对前缀异或数组建立可持久化字典树
    trie = PersistentTrie(prefix, bit_len=30)
    
    results = []
    for l, r in queries:
        # 在 prefix[l..r+1] 中找最大异或
        max_xor = 0
        for i in range(l, r + 2):
            # 用 prefix[i] 去查询 [l, i-1] 或 [i+1, r+1] 的最大异或
            if i > l:
                xor_val = trie.query_max_xor(l, i - 1, prefix[i])
                max_xor = max(max_xor, xor_val)
        results.append(max_xor)
    
    return results
```

### 优化

上面的实现对每个查询是 O(n log V)，可以优化：

```python
def max_xor_in_range_optimized(nums: List[int], l: int, r: int) -> int:
    """优化版：O((r-l) * log V)"""
    n = len(nums)
    
    # 前缀异或
    prefix = [0] * (n + 1)
    for i in range(n):
        prefix[i + 1] = prefix[i] ^ nums[i]
    
    # 建立 [l, r+1] 范围的可持久化字典树
    trie = PersistentTrie(prefix[l:r+2], bit_len=30)
    
    max_xor = 0
    for i in range(r - l + 2):
        if i > 0:
            xor_val = trie.query_max_xor(0, i - 1, prefix[l + i])
            max_xor = max(max_xor, xor_val)
    
    return max_xor
```

---

## 与主席树的对比

| 特性 | 主席树 | 可持久化字典树 |
|------|--------|---------------|
| 解决问题 | 区间第 K 小 | 区间异或问题 |
| 树结构 | 权值线段树 | 二进制字典树 |
| 节点含义 | 值域范围 | 二进制位 |
| 查询方式 | 减法计数 | 减法计数 |

**共同点**：
- 前缀和思想
- 路径复制
- 版本管理

---

## 变体：动态可持久化字典树

如果需要支持修改，可以结合树状数组：

```python
class DynamicPersistentTrie:
    """树状数组套字典树：支持修改的区间异或查询"""
    
    def __init__(self, n: int, bit_len: int = 30):
        self.n = n
        self.bit_len = bit_len
        
        # 每个 BIT 位置一棵字典树
        self.roots = [0] * (n + 1)
        
        # 节点池（共享）
        max_nodes = n * bit_len * 40
        self.children = [[0, 0] for _ in range(max_nodes)]
        self.cnt = [0] * max_nodes
        self.tot = 0
    
    def _lowbit(self, x: int) -> int:
        return x & (-x)
    
    def _new_node(self) -> int:
        self.tot += 1
        return self.tot
    
    def _insert(self, prev: int, x: int, delta: int) -> int:
        """插入或删除"""
        root = self._new_node()
        self.cnt[root] = self.cnt[prev] + delta
        self.children[root] = self.children[prev][:]
        
        cur = root
        cur_prev = prev
        
        for i in range(self.bit_len - 1, -1, -1):
            bit = (x >> i) & 1
            new_node = self._new_node()
            self.children[cur][bit] = new_node
            self.children[new_node] = self.children[self.children[cur_prev][bit]][:]
            self.cnt[new_node] = self.cnt[self.children[cur_prev][bit]] + delta
            
            cur = new_node
            cur_prev = self.children[cur_prev][bit]
        
        return root
    
    def update(self, pos: int, old_val: int, new_val: int) -> None:
        """修改位置 pos 的值"""
        # 删除旧值
        i = pos
        while i <= self.n:
            self.roots[i] = self._insert(self.roots[i], old_val, -1)
            i += self._lowbit(i)
        
        # 插入新值
        i = pos
        while i <= self.n:
            self.roots[i] = self._insert(self.roots[i], new_val, 1)
            i += self._lowbit(i)
```

---

## 复杂度分析

| 操作 | 时间复杂度 | 空间复杂度 |
|------|-----------|-----------|
| 构建 | O(n × B) | O(n × B) |
| 单点插入 | O(B) | O(B) |
| 区间查询 | O(B) | O(1) |

其中 B 是二进制位数（通常 30）。

---

## 常见错误

### 错误 1：位数不够

```python
# 错误：bit_len 太小
trie = PersistentTrie(nums, bit_len=20)  # 最大值可能超过 2^20

# 正确：根据数据范围确定
max_val = max(nums)
bit_len = max_val.bit_length()
```

### 错误 2：版本索引错误

```python
# 错误：版本对应关系
root_r = self.roots[r]  # 应该是 r+1

# 正确：版本 i 包含前 i 个数
root_r = self.roots[r + 1]
root_l = self.roots[l]
```

### 错误 3：忘记初始化 0 版本

```python
# 错误：直接从第一个数开始
self.roots[0] = self._insert(0, nums[0])

# 正确：先有空版本
self.roots[0] = self._new_node()  # 空版本
for i, x in enumerate(nums):
    self.roots[i + 1] = self._insert(self.roots[i], x)
```

---

## 本章小结

本章学习了可持久化字典树：

1. **核心思想**
   - 版本化字典树
   - 前缀和思想处理区间

2. **实现要点**
   - 每个节点存储经过的数的个数
   - 区间查询用版本相减

3. **典型应用**
   - 区间异或最大值
   - 区间异或第 K 大（下一章）

4. **复杂度**
   - 时间：O(n × B) 构建，O(B) 查询
   - 空间：O(n × B)

下一章我们将学习可持久化字典树的进阶应用：**区间异或第 K 大**。
