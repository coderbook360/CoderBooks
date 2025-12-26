# LeetCode 1012: 至少有 1 位重复的数字

## 问题描述

> 给定正整数 `n`，返回在 `[1, n]` 范围内具有至少 1 位重复数字的正整数的个数。

**示例 1**：
```
输入：n = 20
输出：1
解释：只有 11 具有重复的数字
```

**示例 2**：
```
输入：n = 100
输出：10
解释：11, 22, 33, 44, 55, 66, 77, 88, 99, 100 具有重复的数字
```

**示例 3**：
```
输入：n = 1000
输出：262
```

**约束**：
- `1 <= n <= 10^9`

**LeetCode链接**：[1012. Numbers With Repeated Digits](https://leetcode.com/problems/numbers-with-repeated-digits/)

## 问题分析

首先要问一个问题：**正向统计还是反向统计？**

直接统计"至少有 1 位重复"的数字很难，因为重复的模式太多。更简单的方法是：
- **反向思考**：统计"所有数字都不重复"的数字个数
- **答案** = n - 不重复的数字个数

现在我要问第二个问题：**如何统计"所有数字都不重复"的数字？**

这是一个经典的**数位 DP 问题**：
- 需要记录已使用的数字（用状态压缩表示）
- 按位构建数字，确保每位都不重复

## 解法一：数位 DP（记忆化搜索）

### 思路

**状态定义**：
- `dfs(pos, mask, is_limit, is_num)`
  - `pos`：当前处理第几位
  - `mask`：已使用的数字集合（10 位二进制，每位表示数字 0-9 是否使用）
  - `is_limit`：当前位是否受 n 的限制
  - `is_num`：是否已经开始填数字（处理前导零）

**状态转移**：
- 枚举当前位可以填的数字 `[0, up]`
- 如果数字 `d` 已在 `mask` 中，跳过
- 否则，将 `d` 加入 `mask`，递归到下一位

**答案**：
- 统计"所有数字都不重复"的数字个数
- `n - dfs(0, 0, True, False)`

### 代码实现

```python
from functools import lru_cache

def numDupDigitsAtMostN(n):
    """
    数位 DP：统计至少有 1 位重复的数字个数
    
    Args:
        n: 目标数字
    
    Returns:
        至少有 1 位重复的数字个数
    """
    s = str(n)
    
    @lru_cache(maxsize=None)
    def dfs(pos, mask, is_limit, is_num):
        """
        pos: 当前处理第几位
        mask: 已使用的数字集合（位掩码）
        is_limit: 当前位是否受 n 的限制
        is_num: 是否已经开始填数字
        """
        if pos == len(s):
            return 1 if is_num else 0  # 已填完且是有效数字
        
        ans = 0
        
        if not is_num:
            # 可以跳过当前位（前导零）
            ans += dfs(pos + 1, mask, False, False)
        
        # 确定可以填的数字范围
        start = 0 if is_num else 1  # 第一位不能是 0
        up = int(s[pos]) if is_limit else 9
        
        for digit in range(start, up + 1):
            # 检查数字是否已使用
            if mask & (1 << digit):
                continue  # 数字已使用，跳过
            
            # 使用数字 digit
            new_mask = mask | (1 << digit)
            ans += dfs(pos + 1, new_mask, is_limit and digit == up, True)
        
        return ans
    
    # 统计"所有数字都不重复"的数字个数
    unique_count = dfs(0, 0, True, False)
    
    # 答案 = 总数 - 不重复的数字个数
    return n - unique_count

# 测试
print(numDupDigitsAtMostN(20))    # 1
print(numDupDigitsAtMostN(100))   # 10
print(numDupDigitsAtMostN(1000))  # 262
```

**复杂度分析**：
- **时间**：O(log n × 2^10 × 10)
  - log n 位
  - 每位的 mask 有 2^10 = 1024 种状态
  - 每位枚举 10 个数字
- **空间**：O(log n × 2^10)

### 逐步推导

以 `n = 20` 为例，`s = "20"`

**统计不重复的数字**：
```
dfs(0, 0, True, False)  # 处理十位
  跳过当前位（前导零）:
    dfs(1, 0, False, False)
      digit = 1: dfs(2, 0b10, False, True) = 1  # "1"
      digit = 2: dfs(2, 0b100, False, True) = 1  # "2"
      ...
      digit = 9: dfs(2, 0b1000000000, False, True) = 1  # "9"
      返回 9
  
  digit = 1:
    dfs(1, 0b10, True, True)
      digit = 0: dfs(2, 0b11, False, True) = 1  # "10"
      ...
      digit = 9: dfs(2, 0b1000000010, False, True) = 1  # "19"
      返回 9
  
  digit = 2:
    dfs(1, 0b100, True, True)
      digit = 0: dfs(2, 0b101, True, True) = 1  # "20"
      返回 1

总计：9 + 9 + 1 = 19
```

**答案**：`20 - 19 = 1`（只有 11 有重复数字）

## 解法二：组合数学（排列）

### 思路

对于长度为 k 的数字，所有数字都不重复的数字个数可以用**排列数**计算。

**分类讨论**：
1. **长度 < n 的数字长度的数字**：
   - 长度为 k 的数字：第一位有 9 种选择（1-9），后面有 A(9, k-1) 种选择
   
2. **长度 = n 的数字长度的数字**：
   - 需要逐位统计

### 代码实现

```python
def numDupDigitsAtMostN_math(n):
    """
    组合数学方法
    """
    # 1. 计算排列数 A(m, n) = m! / (m-n)!
    def A(m, n):
        if n > m:
            return 0
        result = 1
        for i in range(n):
            result *= (m - i)
        return result
    
    # 2. 将 n 转换为数字列表
    digits = []
    temp = n
    while temp:
        digits.append(temp % 10)
        temp //= 10
    digits.reverse()
    
    k = len(digits)
    
    # 3. 统计长度 < k 的不重复数字
    unique_count = 0
    
    # 长度为 1 到 k-1 的数字
    for length in range(1, k):
        if length == 1:
            unique_count += 9  # 1-9
        else:
            # 第一位 9 种选择，后续 A(9, length-1)
            unique_count += 9 * A(9, length - 1)
    
    # 4. 统计长度 = k 的不重复数字
    used = set()
    for i, digit in enumerate(digits):
        # 统计第 i 位填 [0 (或 1), digit-1] 的情况
        count = 0
        for d in range(0 if i > 0 else 1, digit):
            if d not in used:
                count += 1
        
        # 第 i 位填 d，后续有 A(10 - len(used) - 1, k - i - 1) 种
        unique_count += count * A(10 - len(used) - 1, k - i - 1)
        
        # 如果当前数字已使用，后续不可能有不重复的数字
        if digit in used:
            break
        
        used.add(digit)
    else:
        # n 本身也不重复
        unique_count += 1
    
    return n - unique_count

# 测试
print(numDupDigitsAtMostN_math(20))    # 1
print(numDupDigitsAtMostN_math(100))   # 10
print(numDupDigitsAtMostN_math(1000))  # 262
```

**复杂度分析**：
- **时间**：O(log^2 n)
- **空间**：O(log n)

### 逐步推导

以 `n = 20` 为例：

**长度 < 2 的不重复数字**：
```
长度 1：1, 2, ..., 9，共 9 个
```

**长度 = 2 的不重复数字**：
```
digits = [2, 0]

i = 0, digit = 2:
  可以填 1（< 2），used = {}
  后续有 A(10 - 0 - 1, 2 - 0 - 1) = A(9, 1) = 9 种
  unique_count += 1 × 9 = 9
  
  digit 2 不在 used 中，used.add(2)

i = 1, digit = 0:
  可以填的数字：无（0 是最小的）
  unique_count += 0
  
  digit 0 不在 used 中，used.add(0)

n 本身（20）不重复，unique_count += 1
```

**总计**：9 + 9 + 1 = 19

**答案**：20 - 19 = 1

## 解法三：优化（提前终止）

### 思路

在数位 DP 中，如果发现当前构建的数字已经有重复，可以提前终止。

### 代码实现

```python
def numDupDigitsAtMostN_optimized(n):
    """
    优化版本：提前终止
    """
    s = str(n)
    
    @lru_cache(maxsize=None)
    def dfs(pos, mask, is_limit, is_num, has_dup):
        """
        has_dup: 是否已经有重复数字
        """
        if has_dup:
            # 如果已经有重复，后续不需要检查
            if pos == len(s):
                return 1 if is_num else 0
            
            ans = 0
            if not is_num:
                ans += dfs(pos + 1, mask, False, False, True)
            
            start = 0 if is_num else 1
            up = int(s[pos]) if is_limit else 9
            
            for digit in range(start, up + 1):
                ans += dfs(pos + 1, mask, is_limit and digit == up, True, True)
            
            return ans
        
        if pos == len(s):
            return 1 if is_num else 0
        
        ans = 0
        if not is_num:
            ans += dfs(pos + 1, mask, False, False, False)
        
        start = 0 if is_num else 1
        up = int(s[pos]) if is_limit else 9
        
        for digit in range(start, up + 1):
            if mask & (1 << digit):
                # 发现重复
                ans += dfs(pos + 1, mask, is_limit and digit == up, True, True)
            else:
                new_mask = mask | (1 << digit)
                ans += dfs(pos + 1, new_mask, is_limit and digit == up, True, False)
        
        return ans
    
    dup_count = dfs(0, 0, True, False, False)
    return dup_count
```

但这个优化实际上会让代码更复杂，不推荐。

## 常见错误

### 错误 1：前导零处理

```python
# 错误：没有处理前导零
start = 0  # 第一位可以是 0？

# 正确：第一位不能是 0
start = 0 if is_num else 1
```

### 错误 2：mask 更新

```python
# 错误：直接修改 mask
mask |= (1 << digit)
dfs(pos + 1, mask, ...)

# 正确：创建新的 mask
new_mask = mask | (1 << digit)
dfs(pos + 1, new_mask, ...)
```

### 错误 3：边界条件

```python
# 错误：忘记处理 n = 0
if n == 0:
    return 0  # 0 没有重复数字
```

### 错误 4：n 本身的处理

```python
# 错误：忘记加上 n 本身
return n - unique_count  # 错误！如果 n 本身不重复，会少算 1

# 正确：在数位 DP 中已经包含了 n 本身
```

## 扩展问题

### 扩展 1：恰好有 k 位重复

> 统计恰好有 k 位重复的数字个数。

```python
def countExactlyKDuplicates(n, k):
    """
    恰好有 k 位重复
    """
    # 需要记录重复数字的个数
    @lru_cache(maxsize=None)
    def dfs(pos, mask, dup_count, is_limit, is_num):
        if pos == len(s):
            return 1 if is_num and dup_count == k else 0
        
        # ...
        pass
    
    # ...
```

### 扩展 2：区间 [L, R]

> 统计区间 [L, R] 中至少有 1 位重复的数字个数。

```python
def countInRange(L, R):
    return numDupDigitsAtMostN(R) - numDupDigitsAtMostN(L - 1)
```

### 扩展 3：返回所有重复数字

> 返回 [1, n] 中所有至少有 1 位重复的数字。

```python
def findAllDuplicates(n):
    """
    返回所有至少有 1 位重复的数字
    """
    result = []
    for i in range(1, n + 1):
        digits = [int(d) for d in str(i)]
        if len(digits) != len(set(digits)):
            result.append(i)
    return result

# 测试
print(findAllDuplicates(20))  # [11]
```

## 性能对比

| 方法 | 时间复杂度 | 空间复杂度 | 代码复杂度 |
|-----|-----------|-----------|-----------|
| 暴力枚举 | O(n × log n) | O(1) | 简单 |
| 数位 DP | O(log n × 2^10 × 10) | O(log n × 2^10) | 中等 |
| 组合数学 | O(log^2 n) | O(log n) | 中等 |

## 小结

### 核心思想
1. **反向思考**：统计"所有数字都不重复"的数字个数
2. **数位 DP**：用状态压缩记录已使用的数字
3. **组合数学**：用排列数计算不重复数字的个数

### 关键技巧
- 数位 DP 状态：`(pos, mask, is_limit, is_num)`
- 状态压缩：`mask |= (1 << digit)` 记录已使用的数字
- 反向统计：`n - 不重复的数字个数`
- 前导零处理：`start = 0 if is_num else 1`

### 适用场景
- 数字重复性问题
- 排列组合计数问题
- 状态压缩 + 数位 DP

这道题完美展示了反向思考和状态压缩在数位 DP 中的应用，是高质量的综合题目！
