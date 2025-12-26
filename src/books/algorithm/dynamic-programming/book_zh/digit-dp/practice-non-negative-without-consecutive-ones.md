# LeetCode 600: 不含连续 1 的非负整数

## 问题描述

> 给定一个正整数 `n`，返回在 `[0, n]` 区间内，其二进制表示不包含连续的 1 的非负整数的个数。

**示例 1**：
```
输入：n = 5
输出：5
解释：
以下是不含连续 1 的非负整数：
0 (0)
1 (1)
2 (10)
4 (100)
5 (101)
注意：3 (11) 和 6 (110) 被排除，因为它们包含连续的 1
```

**示例 2**：
```
输入：n = 1
输出：2
解释：0 和 1 都不含连续的 1
```

**示例 3**：
```
输入：n = 2
输出：3
解释：0, 1, 2 都不含连续的 1
```

**约束**：
- `1 <= n <= 10^9`

**LeetCode链接**：[600. Non-negative Integers without Consecutive Ones](https://leetcode.com/problems/non-negative-integers-without-consecutive-ones/)

## 问题分析

首先要问一个问题：**这个问题的本质是什么？**

这是一个**数位 DP 问题**，需要统计满足特定约束（二进制中不包含连续的 1）的数字个数。

现在我要问第二个问题：**为什么是数位 DP？**

因为：
1. **数位约束**：需要检查二进制的每一位
2. **连续性约束**：当前位的选择依赖于前一位
3. **范围统计**：需要统计 `[0, n]` 区间内的数字个数

## 解法一：数位 DP（记忆化搜索）

### 思路

**状态定义**：
- `dfs(pos, pre, is_limit)`
  - `pos`：当前处理第几位（从高位到低位）
  - `pre`：前一位填的数字（0 或 1）
  - `is_limit`：当前位是否受 n 的限制

**状态转移**：
- 如果 `pre == 1`，当前位只能填 0
- 如果 `pre == 0`，当前位可以填 0 或 1（受 `is_limit` 限制）

**初始化**：
- `dfs(0, 0, True)`（从第 0 位开始，前一位是 0）

**答案**：
- `dfs(0, 0, True)`

### 代码实现

```python
from functools import lru_cache

def findIntegers(n):
    """
    数位 DP：统计 [0, n] 中不含连续 1 的数字个数
    
    Args:
        n: 目标数字
    
    Returns:
        不含连续 1 的数字个数
    """
    # 将 n 转换为二进制字符串
    s = bin(n)[2:]  # 去掉 '0b' 前缀
    
    @lru_cache(maxsize=None)
    def dfs(pos, pre, is_limit):
        """
        pos: 当前处理第几位
        pre: 前一位的数字（0 或 1）
        is_limit: 当前位是否受 n 的限制
        """
        if pos == len(s):
            return 1  # 找到一个合法数字
        
        # 确定当前位可以填的最大数字
        up = int(s[pos]) if is_limit else 1
        
        ans = 0
        for digit in range(0, up + 1):
            # 约束：如果前一位是 1，当前位不能是 1
            if pre == 1 and digit == 1:
                continue
            
            ans += dfs(pos + 1, digit, is_limit and digit == up)
        
        return ans
    
    return dfs(0, 0, True)

# 测试
print(findIntegers(5))   # 5
print(findIntegers(1))   # 2
print(findIntegers(2))   # 3
print(findIntegers(10))  # 8
```

**复杂度分析**：
- **时间**：O(log n)
  - log n 位，每位最多 2 个选择
  - 状态数：O(log n × 2 × 2) = O(log n)
- **空间**：O(log n)

### 逐步推导

以 `n = 5` 为例，`s = "101"`

```
dfs(0, 0, True)  # 处理第 0 位（最高位）
  digit = 0: dfs(1, 0, False)
    digit = 0: dfs(2, 0, False)
      digit = 0: dfs(3, 0, False) = 1  # "000" = 0
      digit = 1: dfs(3, 1, False) = 1  # "001" = 1
      返回 2
    digit = 1: dfs(2, 1, False)
      digit = 0: dfs(3, 0, False) = 1  # "010" = 2
      返回 1
    返回 2 + 1 = 3
  
  digit = 1: dfs(1, 1, True)  # 第 0 位填 1
    digit = 0: dfs(2, 0, True)  # 第 1 位填 0
      digit = 0: dfs(3, 0, False) = 1  # "100" = 4
      digit = 1: dfs(3, 1, True) = 1   # "101" = 5
      返回 2
    返回 2

总计：3 + 2 = 5
```

**验证**：
- `0 (000)`: ✅
- `1 (001)`: ✅
- `2 (010)`: ✅
- `3 (011)`: ❌ 连续的 1
- `4 (100)`: ✅
- `5 (101)`: ✅

答案：5

## 解法二：动态规划（Fibonacci）

### 思路

**观察**：对于长度为 k 的二进制数，不含连续 1 的数字个数满足 **Fibonacci 数列**。

**定义**：
- `f[k]` = 长度为 k 的二进制数（允许前导零）中不含连续 1 的数字个数

**递推关系**：
- `f[k] = f[k-1] + f[k-2]`
  - 最高位填 0：剩余 k-1 位，有 `f[k-1]` 种
  - 最高位填 1，次高位必须是 0：剩余 k-2 位，有 `f[k-2]` 种

**初始化**：
- `f[1] = 2`（0, 1）
- `f[2] = 3`（00, 01, 10）

### 代码实现

```python
def findIntegers_fib(n):
    """
    使用 Fibonacci 数列的方法
    """
    if n == 0:
        return 1
    
    # 1. 预计算 Fibonacci 数列
    f = [0] * 32
    f[0] = 1
    f[1] = 2
    for i in range(2, 32):
        f[i] = f[i-1] + f[i-2]
    
    # 2. 将 n 转换为二进制
    bits = []
    while n > 0:
        bits.append(n & 1)
        n >>= 1
    bits.reverse()
    
    # 3. 计算答案
    ans = 0
    pre = 0  # 前一位的值
    
    for i, bit in enumerate(bits):
        if bit == 1:
            # 如果当前位是 1，加上"当前位填 0"的所有情况
            ans += f[len(bits) - i - 1]
            
            # 如果前一位也是 1，后面的数字都不合法
            if pre == 1:
                return ans
        
        pre = bit
    
    # n 本身也可能合法
    return ans + 1

# 测试
print(findIntegers_fib(5))   # 5
print(findIntegers_fib(1))   # 2
print(findIntegers_fib(2))   # 3
print(findIntegers_fib(10))  # 8
```

**复杂度分析**：
- **时间**：O(log n)
- **空间**：O(log n)

### 逐步推导

以 `n = 5 (101)` 为例：

**Fibonacci 数列**：
```
f[0] = 1
f[1] = 2
f[2] = 3
f[3] = 5
```

**处理过程**：
```
bits = [1, 0, 1]

i = 0, bit = 1, pre = 0:
  ans += f[3-0-1] = f[2] = 3  # "0xx" 的所有合法情况
  pre = 1

i = 1, bit = 0, pre = 1:
  pre = 0

i = 2, bit = 1, pre = 0:
  ans += f[3-2-1] = f[0] = 1  # "100" = 4
  pre = 1

ans + 1 = 3 + 1 + 1 = 5
```

**解释**：
- `i = 0`：如果第 0 位填 0，后面 2 位有 `f[2] = 3` 种（`000, 001, 010`）
- `i = 2`：如果第 2 位填 0，后面 0 位有 `f[0] = 1` 种（`100`）
- 最后加上 n 本身：`101`

## 解法三：优化空间

### 思路

不需要存储完整的 Fibonacci 数列，只需要滚动两个变量。

### 代码实现

```python
def findIntegers_optimized(n):
    """
    空间优化版本
    """
    if n == 0:
        return 1
    
    # 计算二进制位数
    k = n.bit_length()
    
    # 预计算 Fibonacci 数列
    f0, f1 = 1, 2
    fib = [f0, f1]
    for _ in range(2, k + 1):
        f0, f1 = f1, f0 + f1
        fib.append(f1)
    
    # 转换为二进制
    bits = []
    temp = n
    while temp > 0:
        bits.append(temp & 1)
        temp >>= 1
    bits.reverse()
    
    # 计算答案
    ans = 0
    pre = 0
    
    for i, bit in enumerate(bits):
        if bit == 1:
            ans += fib[len(bits) - i - 1]
            if pre == 1:
                return ans
        pre = bit
    
    return ans + 1

# 测试
print(findIntegers_optimized(5))   # 5
print(findIntegers_optimized(10))  # 8
```

## 优化技巧

### 技巧 1：位运算优化

```python
def findIntegers_bitwise(n):
    """
    使用位运算优化
    """
    if n == 0:
        return 1
    
    # Fibonacci
    f = [0] * 32
    f[0], f[1] = 1, 2
    for i in range(2, 32):
        f[i] = f[i-1] + f[i-2]
    
    ans = 0
    k = 30  # 从最高位开始
    pre = 0
    
    while k >= 0:
        if n & (1 << k):
            ans += f[k]
            if pre == 1:
                return ans
            pre = 1
        else:
            pre = 0
        k -= 1
    
    return ans + 1

# 测试
print(findIntegers_bitwise(5))  # 5
```

### 技巧 2：提前终止

如果检测到连续的 1，立即返回。

```python
# 在数位 DP 中
if pre == 1 and digit == 1:
    continue  # 跳过这种情况
```

### 技巧 3：Binet公式

Fibonacci 数列可以用 Binet 公式 O(1) 计算：
```python
import math

def fibonacci(n):
    phi = (1 + math.sqrt(5)) / 2
    return round(math.pow(phi, n) / math.sqrt(5))
```

但由于精度问题，不推荐在这道题中使用。

## 常见错误

### 错误 1：边界条件

```python
# 错误：忘记处理 n = 0
if n == 0:
    return 1  # 0 本身是合法的
```

### 错误 2：前导零

```python
# 错误：把 "001" 当作 "1"
# 在二进制表示中，前导零是允许的（因为我们统计的是 [0, n]）

# 正确：不需要特殊处理前导零
```

### 错误 3：Fibonacci 初始值

```python
# 错误
f[0] = 0  # 错误！
f[1] = 1

# 正确
f[0] = 1  # 长度 0 的数字（空），1 种
f[1] = 2  # 长度 1 的数字（0, 1），2 种
```

### 错误 4：最后加 1

```python
# 错误：忘记把 n 本身加入答案
return ans  # 错误！

# 正确：如果 n 本身不含连续 1，需要加 1
return ans + 1
```

## 扩展问题

### 扩展 1：不含连续 k 个 1

> 统计不含连续 k 个 1 的数字个数。

```python
def findIntegersNoKConsecutiveOnes(n, k):
    """
    不含连续 k 个 1
    """
    s = bin(n)[2:]
    
    @lru_cache(maxsize=None)
    def dfs(pos, consecutive_ones, is_limit):
        if pos == len(s):
            return 1
        
        up = int(s[pos]) if is_limit else 1
        ans = 0
        
        for digit in range(0, up + 1):
            new_consecutive = consecutive_ones + 1 if digit == 1 else 0
            
            if new_consecutive < k:
                ans += dfs(pos + 1, new_consecutive, is_limit and digit == up)
        
        return ans
    
    return dfs(0, 0, True)
```

### 扩展 2：区间 [L, R]

> 统计区间 [L, R] 中不含连续 1 的数字个数。

```python
def countInRange(L, R):
    return findIntegers(R) - findIntegers(L - 1)
```

### 扩展 3：返回所有合法数字

> 返回 [0, n] 中所有不含连续 1 的数字。

```python
def findAllIntegers(n):
    """
    返回所有合法数字
    """
    result = []
    for i in range(n + 1):
        binary = bin(i)[2:]
        if '11' not in binary:
            result.append(i)
    return result

# 测试
print(findAllIntegers(5))  # [0, 1, 2, 4, 5]
```

## 性能对比

| 方法 | 时间复杂度 | 空间复杂度 | 代码复杂度 |
|-----|-----------|-----------|-----------|
| 暴力枚举 | O(n × log n) | O(1) | 简单 |
| 数位 DP | O(log n) | O(log n) | 中等 |
| Fibonacci | O(log n) | O(log n) | 简单 |
| 位运算优化 | O(log n) | O(1) | 简单 |

## 小结

### 核心思想
1. **数位 DP**：按位处理，记忆化搜索
2. **Fibonacci 关系**：长度为 k 的不含连续 1 的数字个数满足 Fibonacci 数列
3. **贪心思想**：从高位到低位，统计每一位填 0 的情况

### 关键技巧
- 数位 DP 状态：`(pos, pre, is_limit)`
- Fibonacci 预计算：`f[k] = f[k-1] + f[k-2]`
- 提前终止：检测到连续 1 立即返回
- 位运算优化：避免字符串转换

### 适用场景
- 二进制数位约束问题
- 连续性约束问题
- Fibonacci 相关的计数问题

这道题完美展示了数位 DP 与 Fibonacci 数列的结合，是高质量的综合题目！
