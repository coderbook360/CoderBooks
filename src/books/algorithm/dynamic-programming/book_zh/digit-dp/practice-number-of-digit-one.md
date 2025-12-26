# LeetCode 233: 数字 1 的个数

## 问题描述

> 给定一个整数 `n`，计算所有小于等于 `n` 的非负整数中数字 `1` 出现的次数。

**示例 1**：
```
输入：n = 13
输出：6
解释：数字 1 出现在以下数字中：1, 10, 11, 12, 13
共 6 次（1, 1, 1, 1, 1, 1）
```

**示例 2**：
```
输入：n = 0
输出：0
```

**约束**：
- `0 <= n <= 10^9`

**LeetCode链接**：[233. Number of Digit One](https://leetcode.com/problems/number-of-digit-one/)

## 问题分析

首先要问一个问题：**暴力枚举可行吗？**

暴力方法是遍历 `0` 到 `n` 的每个数字，统计 `1` 的出现次数。时间复杂度 O(n × log n)，对于 `n = 10^9` 是不可行的。

现在我要问第二个问题：**如何用数位 DP 优化？**

**核心思想**：
- 把问题转化为：**计算 [0, n] 区间内数字 1 的总出现次数**
- 按位统计：第 i 位上 1 出现的次数
- 使用数位 DP 避免重复计算

## 解法一：数位 DP（记忆化搜索）

### 思路

**状态定义**：
- `dfs(pos, count, is_limit, is_num)`
  - `pos`：当前处理第几位（从高位到低位）
  - `count`：已经统计的 1 的个数
  - `is_limit`：当前位是否受 n 的限制
  - `is_num`：是否已经开始填数字（处理前导零）

**状态转移**：
- 枚举当前位可以填的数字 `[0, up]`
- 如果填 1，`count + 1`
- 递归到下一位

**答案**：
- `dfs(0, 0, True, False)`

### 代码实现

```python
from functools import lru_cache

def countDigitOne(n):
    """
    数位 DP 统计 [0, n] 中数字 1 的出现次数
    
    Args:
        n: 目标数字
    
    Returns:
        1 出现的总次数
    """
    s = str(n)
    
    @lru_cache(maxsize=None)
    def dfs(pos, count, is_limit):
        """
        pos: 当前处理第几位
        count: 已统计的 1 的个数
        is_limit: 当前位是否受 n 的限制
        """
        if pos == len(s):
            return count
        
        # 确定当前位可以填的最大数字
        up = int(s[pos]) if is_limit else 9
        
        ans = 0
        for digit in range(0, up + 1):
            new_count = count + (1 if digit == 1 else 0)
            ans += dfs(pos + 1, new_count, is_limit and digit == up)
        
        return ans
    
    return dfs(0, 0, True)

# 测试
print(countDigitOne(13))   # 6
print(countDigitOne(0))    # 0
print(countDigitOne(100))  # 21
```

**复杂度分析**：
- **时间**：O(log^2 n × 10)
  - log n 位，每位枚举 10 个数字
  - count 的范围是 [0, log n]
- **空间**：O(log^2 n)

### 逐步推导

以 `n = 13` 为例，展示 DFS 过程：

```
s = "13"

dfs(0, 0, True)  # 处理十位
  digit = 0: dfs(1, 0, False)
    digit = 0: dfs(2, 0, False) = 0
    digit = 1: dfs(2, 1, False) = 1
    ...
    digit = 9: dfs(2, 1, False) = 1
    返回 9 × 0 + 1 × 9 = 9
  
  digit = 1: dfs(1, 1, True)  # 十位填 1，count = 1
    digit = 0: dfs(2, 1, False) = 1
    digit = 1: dfs(2, 2, False) = 2
    digit = 2: dfs(2, 1, False) = 1
    digit = 3: dfs(2, 1, True) = 1
    返回 1 + 2 + 1 + 1 = 5

总计：9 + 5 = 14（但这里有问题，需要修正）
```

**问题**：上面的实现统计的是"包含 1 的数字个数"，而不是"1 出现的次数"。

## 解法二：数位 DP（正确版本）

### 修正思路

应该统计的是**所有数字中 1 出现的总次数**，而不是包含 1 的数字个数。

### 代码实现

```python
from functools import lru_cache

def countDigitOne_correct(n):
    """
    正确版本：统计 1 出现的总次数
    """
    s = str(n)
    
    @lru_cache(maxsize=None)
    def dfs(pos, count, is_limit):
        """
        pos: 当前处理第几位
        count: 已统计的 1 的个数
        is_limit: 当前位是否受 n 的限制
        """
        if pos == len(s):
            return count
        
        up = int(s[pos]) if is_limit else 9
        
        ans = 0
        for digit in range(0, up + 1):
            new_count = count + (1 if digit == 1 else 0)
            ans += dfs(pos + 1, new_count, is_limit and digit == up)
        
        return ans
    
    return dfs(0, 0, True)

# 测试
print(countDigitOne_correct(13))  # 6
```

**等等，这个实现还是有问题！**

让我重新分析：
- `n = 13`，数字有：`0, 1, 2, ..., 13`
- 每个数字中 1 的出现次数：
  - `0`: 0
  - `1`: 1
  - `2-9`: 0
  - `10`: 1
  - `11`: 2
  - `12`: 1
  - `13`: 1
- 总计：1 + 1 + 2 + 1 + 1 = 6

**正确的思路**：
- 不是统计"数字个数"，而是统计"每个数字中 1 的出现次数之和"

### 正确实现

```python
def countDigitOne_final(n):
    """
    最终正确版本
    """
    if n <= 0:
        return 0
    
    s = str(n)
    m = len(s)
    
    @lru_cache(maxsize=None)
    def dfs(pos, cnt_one, is_limit):
        """
        pos: 当前位置
        cnt_one: 到目前为止 1 的出现次数
        is_limit: 是否受限制
        返回：从 pos 开始到结尾，所有合法数字中 1 的总出现次数
        """
        if pos == m:
            return cnt_one
        
        up = int(s[pos]) if is_limit else 9
        res = 0
        
        for d in range(0, up + 1):
            new_cnt = cnt_one + (1 if d == 1 else 0)
            res += dfs(pos + 1, new_cnt, is_limit and d == up)
        
        return res
    
    return dfs(0, 0, True)

# 测试
print(countDigitOne_final(13))    # 6
print(countDigitOne_final(100))   # 21
print(countDigitOne_final(1000))  # 301
```

## 解法三：数学方法（按位统计）

### 思路

对于每一位，单独统计 1 出现的次数。

**公式**：
- 对于第 i 位（从右往左，从 0 开始）
- 将 n 分为三部分：`higher`, `cur`, `lower`
  - `higher`：第 i 位左边的部分
  - `cur`：第 i 位的数字
  - `lower`：第 i 位右边的部分
- 第 i 位上 1 出现的次数：
  - 如果 `cur == 0`：`higher × 10^i`
  - 如果 `cur == 1`：`higher × 10^i + lower + 1`
  - 如果 `cur >= 2`：`(higher + 1) × 10^i`

### 代码实现

```python
def countDigitOne_math(n):
    """
    数学方法：按位统计
    """
    if n <= 0:
        return 0
    
    count = 0
    factor = 1  # 10^i
    
    while factor <= n:
        higher = n // (factor * 10)
        cur = (n // factor) % 10
        lower = n % factor
        
        if cur == 0:
            count += higher * factor
        elif cur == 1:
            count += higher * factor + lower + 1
        else:  # cur >= 2
            count += (higher + 1) * factor
        
        factor *= 10
    
    return count

# 测试
print(countDigitOne_math(13))    # 6
print(countDigitOne_math(100))   # 21
print(countDigitOne_math(1000))  # 301
```

**复杂度分析**：
- **时间**：O(log n)
- **空间**：O(1)

### 逐步推导

以 `n = 13` 为例：

**个位（factor = 1）**：
```
higher = 13 // 10 = 1
cur = (13 // 1) % 10 = 3
lower = 13 % 1 = 0

cur >= 2，count += (1 + 1) × 1 = 2
```
个位上 1 出现 2 次：`1, 11`

**十位（factor = 10）**：
```
higher = 13 // 100 = 0
cur = (13 // 10) % 10 = 1
lower = 13 % 10 = 3

cur == 1，count += 0 × 10 + 3 + 1 = 4
```
十位上 1 出现 4 次：`10, 11, 12, 13`

**总计**：2 + 4 = 6

## 解法四：优化（处理前导零）

### 问题

在数位 DP 中，前导零不应该被统计。

### 优化

```python
def countDigitOne_no_leading_zero(n):
    """
    处理前导零的版本
    """
    s = str(n)
    
    @lru_cache(maxsize=None)
    def dfs(pos, cnt_one, is_limit, is_num):
        """
        is_num: 是否已经填了数字（用于跳过前导零）
        """
        if pos == len(s):
            return cnt_one if is_num else 0
        
        res = 0
        
        if not is_num:
            # 可以跳过当前位（前导零）
            res += dfs(pos + 1, cnt_one, False, False)
        
        # 确定可以填的数字范围
        start = 0 if is_num else 1
        up = int(s[pos]) if is_limit else 9
        
        for d in range(start, up + 1):
            new_cnt = cnt_one + (1 if d == 1 else 0)
            res += dfs(pos + 1, new_cnt, is_limit and d == up, True)
        
        return res
    
    return dfs(0, 0, True, False)

# 测试
print(countDigitOne_no_leading_zero(13))  # 6
```

## 常见错误

### 错误 1：统计错误

```python
# 错误：统计包含 1 的数字个数
def dfs(pos, has_one, is_limit):
    if pos == len(s):
        return 1 if has_one else 0  # 错误！

# 正确：统计 1 的总出现次数
def dfs(pos, cnt_one, is_limit):
    if pos == len(s):
        return cnt_one
```

### 错误 2：数学方法边界

```python
# 错误：factor 溢出
while factor <= n:
    ...
    factor *= 10  # 可能溢出

# 正确：检查溢出
while factor <= n:
    ...
    if factor > n // 10:
        break
    factor *= 10
```

### 错误 3：前导零处理

```python
# 错误：没有处理前导零
for d in range(0, up + 1):  # 0 可能是前导零

# 正确：根据 is_num 决定起始值
start = 0 if is_num else 1
for d in range(start, up + 1):
    ...
```

## 扩展问题

### 扩展 1：统计任意数字 d 的出现次数

```python
def countDigitD(n, d):
    """
    统计数字 d 在 [0, n] 中的出现次数
    """
    s = str(n)
    
    @lru_cache(maxsize=None)
    def dfs(pos, cnt, is_limit, is_num):
        if pos == len(s):
            return cnt if is_num else 0
        
        res = 0
        if not is_num:
            res += dfs(pos + 1, cnt, False, False)
        
        start = 0 if is_num else 1
        up = int(s[pos]) if is_limit else 9
        
        for digit in range(start, up + 1):
            new_cnt = cnt + (1 if digit == d else 0)
            res += dfs(pos + 1, new_cnt, is_limit and digit == up, True)
        
        return res
    
    # 特殊处理 d = 0 时的前导零
    if d == 0:
        # ... 需要特殊处理
        pass
    
    return dfs(0, 0, True, False)
```

### 扩展 2：统计区间 [L, R] 中 1 的出现次数

```python
def countDigitOneRange(L, R):
    """
    统计 [L, R] 中 1 的出现次数
    """
    return countDigitOne(R) - countDigitOne(L - 1)
```

### 扩展 3：统计多个数字的出现次数

```python
def countMultipleDigits(n, digits):
    """
    统计 digits 中所有数字在 [0, n] 中的出现次数
    """
    return sum(countDigitD(n, d) for d in digits)
```

## 性能对比

| 方法 | 时间复杂度 | 空间复杂度 | 代码复杂度 |
|-----|-----------|-----------|-----------|
| 暴力枚举 | O(n × log n) | O(1) | 简单 |
| 数位 DP | O(log^2 n × 10) | O(log^2 n) | 中等 |
| 数学方法 | O(log n) | O(1) | 中等 |

## 小结

### 核心思想
1. **数位 DP**：按位处理，记忆化搜索
2. **数学方法**：按位统计，分情况讨论
3. **前导零处理**：使用 `is_num` 标记

### 关键技巧
- 数位 DP 状态：`(pos, cnt_one, is_limit, is_num)`
- 数学方法分三部分：`higher`, `cur`, `lower`
- 前导零：第一个非零数字之前的 0 不计数

### 适用场景
- 统计数字出现次数
- 数位相关的计数问题
- 区间计数问题

这道题是数位 DP 的经典入门题，掌握它是学习数位 DP 的基础！
