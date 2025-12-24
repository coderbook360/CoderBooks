# 区间修改区间查询

## 终极挑战

我们已经学习了两种模式：
- **PURQ**：单点修改 + 区间查询
- **RUPQ**：区间修改 + 单点查询

现在考虑最通用的需求：

**区间修改区间查询（Range Update Range Query, RURQ）**：
- `range_update(l, r, delta)`：区间 `[l, r]` 每个元素加 `delta`
- `range_query(l, r)`：查询区间 `[l, r]` 的和

这似乎需要线段树的懒惰传播。但树状数组真的做不到吗？

答案是：**可以**！通过巧妙的数学推导。

---

## 核心思想：双树状数组

### 问题分析

设差分数组为 `d`，其中 `d[i] = nums[i] - nums[i-1]`。

我们知道：
$$nums[i] = \sum_{j=1}^{i} d[j]$$

那么前缀和：
$$\sum_{i=1}^{k} nums[i] = \sum_{i=1}^{k} \sum_{j=1}^{i} d[j]$$

### 关键推导

对于 $\sum_{i=1}^{k} nums[i]$，考虑每个 $d[j]$ 被累加的次数：

- $d[1]$ 在 $nums[1], nums[2], \ldots, nums[k]$ 中都出现，共 $k$ 次
- $d[2]$ 在 $nums[2], nums[3], \ldots, nums[k]$ 中都出现，共 $k-1$ 次
- $d[j]$ 在 $nums[j], nums[j+1], \ldots, nums[k]$ 中都出现，共 $k-j+1$ 次

因此：
$$\sum_{i=1}^{k} nums[i] = \sum_{j=1}^{k} (k-j+1) \cdot d[j]$$

展开：
$$= \sum_{j=1}^{k} (k+1) \cdot d[j] - \sum_{j=1}^{k} j \cdot d[j]$$
$$= (k+1) \sum_{j=1}^{k} d[j] - \sum_{j=1}^{k} j \cdot d[j]$$

**关键发现**：我们需要维护两个量：
1. $\sum_{j=1}^{k} d[j]$ — 差分数组的前缀和
2. $\sum_{j=1}^{k} j \cdot d[j]$ — 加权差分数组的前缀和

用两个树状数组分别维护 `d[j]` 和 `j * d[j]`！

---

## 算法实现

### 区间修改

当区间 `[l, r]` 加 `delta` 时：
- `d[l] += delta`
- `d[r+1] -= delta`

对应到两个树状数组：
- `bit1[l] += delta`, `bit1[r+1] -= delta`
- `bit2[l] += l * delta`, `bit2[r+1] -= (r+1) * delta`

### 区间查询

前缀和 `prefix_sum(k)` = $(k+1) \cdot bit1.query(k) - bit2.query(k)$

区间和 = `prefix_sum(r) - prefix_sum(l-1)`

---

## 完整实现

```python
class BIT_RURQ:
    """树状数组：区间修改 + 区间查询"""
    
    def __init__(self, n):
        self.n = n
        self.bit1 = [0] * (n + 2)  # 维护 d[i]
        self.bit2 = [0] * (n + 2)  # 维护 i * d[i]
    
    def _update(self, bit, i, delta):
        while i <= self.n:
            bit[i] += delta
            i += i & (-i)
    
    def _query(self, bit, i):
        result = 0
        while i > 0:
            result += bit[i]
            i -= i & (-i)
        return result
    
    def range_update(self, l, r, delta):
        """区间 [l, r] 每个元素加 delta"""
        self._update(self.bit1, l, delta)
        self._update(self.bit1, r + 1, -delta)
        self._update(self.bit2, l, l * delta)
        self._update(self.bit2, r + 1, -(r + 1) * delta)
    
    def _prefix_sum(self, k):
        """查询 [1, k] 的前缀和"""
        return (k + 1) * self._query(self.bit1, k) - self._query(self.bit2, k)
    
    def range_query(self, l, r):
        """查询 [l, r] 的区间和"""
        return self._prefix_sum(r) - self._prefix_sum(l - 1)
```

---

## 执行流程可视化

```python
# 初始数组：[0, 0, 0, 0, 0]（1-indexed）
bit = BIT_RURQ(5)

# 操作1：区间 [2, 4] 加 3
bit.range_update(2, 4, 3)
# bit1: d[2] += 3, d[5] -= 3
# bit2: bit2[2] += 2*3=6, bit2[5] -= 5*3=15

# 操作2：查询区间 [1, 4]
# 数组现在是 [0, 3, 3, 3, 0]
# 区间和 = 0 + 3 + 3 + 3 = 9

result = bit.range_query(1, 4)
# prefix_sum(4) = 5 * query(bit1, 4) - query(bit2, 4)
#               = 5 * 3 - 6 = 9
# prefix_sum(0) = 0
# range_query = 9 - 0 = 9 ✓

# 操作3：区间 [1, 3] 加 2
bit.range_update(1, 3, 2)

# 数组现在是 [2, 5, 5, 3, 0]

# 操作4：查询区间 [2, 4]
result = bit.range_query(2, 4)
# 预期：5 + 5 + 3 = 13
```

---

## 带初始值的版本

```python
class BIT_RURQ_WithInit:
    """带初始值的区间修改区间查询"""
    
    def __init__(self, nums):
        """nums 是 0-indexed"""
        self.n = len(nums)
        self.bit1 = [0] * (self.n + 2)
        self.bit2 = [0] * (self.n + 2)
        
        # 初始化：将每个元素视为区间 [i, i] 的更新
        for i, num in enumerate(nums):
            self.range_update(i, i, num)
    
    def _update(self, bit, i, delta):
        i += 1  # 转为 1-indexed
        while i <= self.n:
            bit[i] += delta
            i += i & (-i)
    
    def _query(self, bit, i):
        i += 1  # 转为 1-indexed
        result = 0
        while i > 0:
            result += bit[i]
            i -= i & (-i)
        return result
    
    def range_update(self, l, r, delta):
        """区间 [l, r] 加 delta（0-indexed）"""
        l_1 = l + 1  # 转为 1-indexed
        r_1 = r + 1
        
        # 在 1-indexed 下更新
        self._update_1(l_1, delta)
        self._update_1(r_1 + 1, -delta)
        self._update_2(l_1, l_1 * delta)
        self._update_2(r_1 + 1, -(r_1 + 1) * delta)
    
    def _update_1(self, i, delta):
        while i <= self.n:
            self.bit1[i] += delta
            i += i & (-i)
    
    def _update_2(self, i, delta):
        while i <= self.n:
            self.bit2[i] += delta
            i += i & (-i)
    
    def _prefix_sum(self, k):
        """[1, k] 的前缀和（1-indexed）"""
        if k <= 0:
            return 0
        sum1 = 0
        sum2 = 0
        i = k
        while i > 0:
            sum1 += self.bit1[i]
            sum2 += self.bit2[i]
            i -= i & (-i)
        return (k + 1) * sum1 - sum2
    
    def range_query(self, l, r):
        """[l, r] 区间和（0-indexed）"""
        return self._prefix_sum(r + 1) - self._prefix_sum(l)
```

---

## 正确性验证

让我们用一个例子验证公式的正确性：

```
初始：nums = [1, 2, 3, 4, 5]
操作：区间 [2, 4] 加 10

更新后：nums = [1, 12, 13, 14, 5]

差分数组 d：
d[1] = 1
d[2] = 12 - 1 = 11
d[3] = 13 - 12 = 1
d[4] = 14 - 13 = 1
d[5] = 5 - 14 = -9

查询 prefix_sum(4)：
用公式：(4+1) * Σd[1..4] - Σ(i*d[i])
     = 5 * (1 + 11 + 1 + 1) - (1*1 + 2*11 + 3*1 + 4*1)
     = 5 * 14 - (1 + 22 + 3 + 4)
     = 70 - 30
     = 40

验证：1 + 12 + 13 + 14 = 40 ✓
```

---

## 三种模式对比

| 模式 | 区间修改 | 区间查询 | 实现方式 |
|-----|---------|---------|---------|
| PURQ | ❌ 单点 O(log N) | ✅ O(log N) | 标准树状数组 |
| RUPQ | ✅ O(log N) | ❌ 单点 O(log N) | 差分 + 树状数组 |
| RURQ | ✅ O(log N) | ✅ O(log N) | 双树状数组 |

---

## 与线段树懒惰传播的对比

| 方面 | 双树状数组 | 线段树 + 懒标记 |
|-----|----------|---------------|
| 代码量 | 约 40 行 | 约 100+ 行 |
| 常数因子 | 小 | 较大 |
| 支持操作 | 仅加法 | 通用（加、乘、赋值等）|
| 空间 | 2N | 4N |
| 理解难度 | 需要数学推导 | 递归思想直观 |

**结论**：如果只需要区间加法，双树状数组是更简洁高效的选择。

---

## 常见错误与陷阱

### 错误一：公式推导错误

```python
# 错误：前缀和公式
prefix_sum = k * query(bit1, k) - query(bit2, k)  # ← 少了 +1

# 正确
prefix_sum = (k + 1) * query(bit1, k) - query(bit2, k)
```

### 错误二：更新时权重计算错误

```python
# 错误
self._update(self.bit2, l, delta)  # ← 少了 l 的权重

# 正确
self._update(self.bit2, l, l * delta)
```

### 错误三：索引边界

```python
# 当 r = n 时，r + 1 可能越界
# 需要数组多开一个位置
self.bit1 = [0] * (n + 2)  # 而不是 (n + 1)
```

---

## 本章小结

本章核心要点：

1. **双树状数组技巧**：维护 `d[i]` 和 `i * d[i]` 两个量

2. **前缀和公式**：$\sum_{i=1}^{k} nums[i] = (k+1) \cdot \sum d[j] - \sum j \cdot d[j]$

3. **复杂度**：区间修改和区间查询都是 O(log N)

4. **适用场景**：只需要区间加法的场景，追求简洁和效率

**设计启示**：

这个技巧展示了**数学推导**在算法设计中的力量。通过分析求和的结构，我们发现可以用两个简单的量组合出复杂的区间查询。这种「分解问题」的思维方式值得借鉴。

下一章我们将学习**二维树状数组**，将一维的技巧扩展到二维矩阵操作。
