# 位运算基础回顾

## 核心位运算

### 基本操作

| 操作 | 符号 | 说明 | 示例 |
|-----|-----|------|------|
| AND | `&` | 两位都为1才为1 | `5 & 3 = 1`（0101 & 0011 = 0001）|
| OR | `\|` | 有一位为1就为1 | `5 \| 3 = 7`（0101 \| 0011 = 0111）|
| XOR | `^` | 两位不同为1 | `5 ^ 3 = 6`（0101 ^ 0011 = 0110）|
| NOT | `~` | 按位取反 | `~5 = -6`（~0101 = 1010，补码）|
| 左移 | `<<` | 左移 k 位（乘以 2^k）| `5 << 2 = 20`（0101 << 2 = 10100）|
| 右移 | `>>` | 右移 k 位（除以 2^k）| `5 >> 1 = 2`（0101 >> 1 = 0010）|

### Python 代码示例

```python
# 基本位运算
a = 5  # 0101
b = 3  # 0011

print(a & b)   # 1  (0001)
print(a | b)   # 7  (0111)
print(a ^ b)   # 6  (0110)
print(~a)      # -6 (补码表示)
print(a << 2)  # 20 (10100)
print(a >> 1)  # 2  (0010)
```

## 常用技巧

### 1. 检查第 k 位是否为 1

```python
def is_bit_set(n, k):
    """
    检查 n 的第 k 位（从右往左，从 0 开始）是否为 1
    """
    return (n & (1 << k)) != 0

# 示例
n = 5  # 0101
print(is_bit_set(n, 0))  # True  (最右边第 0 位是 1)
print(is_bit_set(n, 1))  # False (第 1 位是 0)
print(is_bit_set(n, 2))  # True  (第 2 位是 1)
```

### 2. 设置第 k 位为 1

```python
def set_bit(n, k):
    """
    将 n 的第 k 位设置为 1
    """
    return n | (1 << k)

# 示例
n = 5  # 0101
print(set_bit(n, 1))  # 7 (0111)
```

### 3. 清除第 k 位（设为 0）

```python
def clear_bit(n, k):
    """
    将 n 的第 k 位清除（设为 0）
    """
    return n & ~(1 << k)

# 示例
n = 5  # 0101
print(clear_bit(n, 0))  # 4 (0100)
print(clear_bit(n, 2))  # 1 (0001)
```

### 4. 翻转第 k 位

```python
def toggle_bit(n, k):
    """
    翻转 n 的第 k 位
    """
    return n ^ (1 << k)

# 示例
n = 5  # 0101
print(toggle_bit(n, 1))  # 7 (0111)
print(toggle_bit(n, 0))  # 4 (0100)
```

### 5. 统计 1 的个数（Hamming Weight）

```python
def count_bits(n):
    """
    统计 n 的二进制表示中 1 的个数
    """
    count = 0
    while n:
        count += n & 1
        n >>= 1
    return count

# 优化版本（Brian Kernighan 算法）
def count_bits_fast(n):
    """
    每次消除最右边的 1
    """
    count = 0
    while n:
        n &= n - 1  # 消除最右边的 1
        count += 1
    return count

# 示例
print(count_bits(5))       # 2 (0101 有 2 个 1)
print(count_bits_fast(7))  # 3 (0111 有 3 个 1)
```

### 6. 获取最右边的 1

```python
def get_rightmost_one(n):
    """
    获取最右边的 1
    """
    return n & (-n)

# 示例
n = 12  # 1100
print(get_rightmost_one(n))  # 4 (0100)
```

### 7. 消除最右边的 1

```python
def remove_rightmost_one(n):
    """
    消除最右边的 1
    """
    return n & (n - 1)

# 示例
n = 12  # 1100
print(remove_rightmost_one(n))  # 8 (1000)
```

### 8. 检查是否是 2 的幂

```python
def is_power_of_two(n):
    """
    检查 n 是否是 2 的幂
    原理：2 的幂只有一个 1
    """
    return n > 0 and (n & (n - 1)) == 0

# 示例
print(is_power_of_two(4))   # True
print(is_power_of_two(6))   # False
print(is_power_of_two(16))  # True
```

### 9. 获取所有子集

```python
def get_all_subsets(n):
    """
    获取集合 {0, 1, ..., n-1} 的所有子集
    """
    subsets = []
    for mask in range(1 << n):
        subset = []
        for i in range(n):
            if mask & (1 << i):
                subset.append(i)
        subsets.append(subset)
    return subsets

# 示例
print(get_all_subsets(3))
# [[], [0], [1], [0,1], [2], [0,2], [1,2], [0,1,2]]
```

### 10. 枚举子集的子集

```python
def enumerate_subsets(mask):
    """
    枚举 mask 的所有子集
    """
    subsets = []
    sub = mask
    while sub:
        subsets.append(sub)
        sub = (sub - 1) & mask
    return subsets

# 示例
mask = 5  # 0101 (集合 {0, 2})
print(enumerate_subsets(mask))  # [5, 4, 1]
# 5: {0, 2}
# 4: {2}
# 1: {0}
```

## 状态压缩应用

### 集合表示

```python
# 用整数表示集合
def empty_set():
    return 0

def full_set(n):
    """n 个元素的全集"""
    return (1 << n) - 1

def add_element(s, i):
    """向集合 s 添加元素 i"""
    return s | (1 << i)

def remove_element(s, i):
    """从集合 s 移除元素 i"""
    return s & ~(1 << i)

def has_element(s, i):
    """检查集合 s 是否包含元素 i"""
    return (s & (1 << i)) != 0

def union(s1, s2):
    """集合并集"""
    return s1 | s2

def intersection(s1, s2):
    """集合交集"""
    return s1 & s2

def difference(s1, s2):
    """集合差集 s1 - s2"""
    return s1 & ~s2

def complement(s, n):
    """集合补集（相对于 n 元全集）"""
    return s ^ ((1 << n) - 1)
```

### 状态转移示例

```python
def solve_tsp(n, dist):
    """
    旅行商问题（TSP）
    dp[mask][i] = 访问了 mask 中的城市，当前在城市 i 的最短路径
    """
    dp = [[float('inf')] * n for _ in range(1 << n)]
    dp[1][0] = 0  # 从城市 0 出发
    
    for mask in range(1 << n):
        for last in range(n):
            if dp[mask][last] == float('inf'):
                continue
            
            # 枚举下一个城市
            for nxt in range(n):
                if mask & (1 << nxt):
                    continue  # 已访问
                
                new_mask = mask | (1 << nxt)
                dp[new_mask][nxt] = min(
                    dp[new_mask][nxt],
                    dp[mask][last] + dist[last][nxt]
                )
    
    # 返回起点
    ans = float('inf')
    for i in range(1, n):
        ans = min(ans, dp[(1 << n) - 1][i] + dist[i][0])
    
    return ans
```

## 常见错误

### 错误1：位运算优先级

```python
# 错误：忘记加括号
if n & 1 << k:  # 错误！等价于 n & (1 << k)，但可能不是预期
    pass

# 正确：明确加括号
if (n & (1 << k)) != 0:
    pass
```

### 错误2：负数的位运算

```python
# 错误：忘记 Python 的整数是无限精度
n = -1
print(bin(n))  # -0b1（补码表示）

# 使用掩码限制位数
def safe_not(n, bits=32):
    return ~n & ((1 << bits) - 1)
```

### 错误3：越界

```python
# 错误：位移超过 32/64 位
n = 1 << 100  # Python 支持，但某些语言会溢出

# 检查范围
assert k < 32  # 32 位整数
```

## 性能对比

| 操作 | 普通方法 | 位运算方法 | 提升 |
|-----|---------|-----------|------|
| 检查集合包含 | `i in set` | `mask & (1 << i)` | 10x |
| 集合并集 | `set1 \| set2` | `mask1 \| mask2` | 100x |
| 枚举子集 | 递归 | 位运算枚举 | 10x |
| 统计元素个数 | `len(set)` | `count_bits(mask)` | 5x |

## 小结

### 核心技巧
1. **设置位**：`n \| (1 << k)`
2. **清除位**：`n & ~(1 << k)`
3. **检查位**：`(n & (1 << k)) != 0`
4. **翻转位**：`n ^ (1 << k)`
5. **统计位**：`n & (n - 1)` 消除最右边的 1
6. **枚举子集**：`sub = (sub - 1) & mask`

### 状态压缩应用
- **集合表示**：用整数表示集合
- **状态转移**：位运算加速状态更新
- **空间优化**：一个整数替代数组

### 常见场景
- 旅行商问题（TSP）
- 子集和问题
- 棋盘覆盖问题
- 图的染色问题
- 状态机模拟

掌握这些位运算技巧，是解决状态压缩 DP 问题的基础！
