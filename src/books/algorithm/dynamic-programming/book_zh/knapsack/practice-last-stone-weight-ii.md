# 实战：最后一块石头的重量 II

## 问题描述

**LeetCode 1049: 最后一块石头的重量 II**

有一堆石头，每块石头的重量都是正整数。

每一回合，从中选出**任意两块石头**，然后将它们一起粉碎。假设石头的重量分别为 `x` 和 `y`，且 `x <= y`。那么粉碎的可能结果如下：
- 如果 `x == y`，那么两块石头都会被完全粉碎
- 如果 `x < y`，那么重量为 `x` 的石头将会被完全粉碎，而重量为 `y` 的石头新重量为 `y - x`

最后，**最多只会剩下一块石头**。返回此石头**最小的可能重量**。如果没有石头剩下，就返回 `0`。

**示例1**：
```
输入：stones = [2,7,4,1,8,1]
输出：1
解释：
组合 2 和 4，得到 2，所以数组转化为 [2,7,1,8,1]
组合 7 和 8，得到 1，所以数组转化为 [2,1,1,1]
组合 2 和 1，得到 1，所以数组转化为 [1,1,1]
组合 1 和 1，得到 0，所以数组转化为 [1]
这就是最优值
```

**示例2**：
```
输入：stones = [31,26,33,21,40]
输出：5
```

**示例3**：
```
输入：stones = [1,2]
输出：1
```

**约束**：
- `1 <= stones.length <= 30`
- `1 <= stones[i] <= 100`

## 问题分析

### 转化思路

**关键观察**：每次操作相当于给某些石头加上 `+` 号，另一些加上 `-` 号

**示例**：`[2, 7, 4, 1, 8, 1]`
```
最优分组：
  正数组：7 + 8 = 15
  负数组：2 + 4 + 1 + 1 = 8
  结果：15 - 8 = 7

实际上：+7 +8 -2 -4 -1 -1 = 7
```

**问题转化**：
- 将石头分成两堆：正堆（和为 `sum1`）、负堆（和为 `sum2`）
- 目标：使 `|sum1 - sum2|` 最小
- 约束：`sum1 + sum2 = total`

**进一步简化**：
- 设 `sum1 >= sum2`
- 则 `sum1 - sum2 = total - 2 * sum2`
- 目标：使 `sum2` 尽可能接近 `total / 2`
- **问题变为**：**01 背包问题**，背包容量为 `total / 2`，求能装的最大重量

## 解法：01 背包

### 思路

1. 计算所有石头的总重量 `total`
2. 目标容量 `target = total // 2`
3. 用 01 背包求：在不超过 `target` 的前提下，能选出的最大重量 `sum2`
4. 答案：`total - 2 * sum2`

### 代码实现

```python
def lastStoneWeightII(stones):
    """
    最后一块石头的重量 II
    """
    total = sum(stones)
    target = total // 2
    
    # 01 背包
    dp = [0] * (target + 1)
    
    for stone in stones:
        # 从右向左遍历
        for w in range(target, stone - 1, -1):
            dp[w] = max(dp[w], dp[w - stone] + stone)
    
    # 答案：total - 2 * dp[target]
    return total - 2 * dp[target]
```

### 复杂度分析

- **时间复杂度**：O(n × sum)，其中 n 是石头数量，sum 是总重量
- **空间复杂度**：O(sum)

### 为什么是 01 背包？

**核心**：每块石头只能选择一次（放入正堆或负堆）

**对比**：
- **01 背包**：每个物品选 0 次或 1 次 ✓
- **完全背包**：每个物品可以选无限次 ✗

## 完整示例

### 示例1：`[2, 7, 4, 1, 8, 1]`

**计算过程**：
```
total = 2 + 7 + 4 + 1 + 8 + 1 = 23
target = 23 // 2 = 11

01 背包：求不超过 11 的最大重量
dp[0] = 0
dp[1] = 0, ..., dp[11] = 0

石头 2:
  dp[11] = max(0, dp[9] + 2) = 2
  dp[10] = max(0, dp[8] + 2) = 2
  ...
  dp[2] = max(0, dp[0] + 2) = 2

石头 7:
  dp[11] = max(2, dp[4] + 7) = 9
  dp[9] = max(0, dp[2] + 7) = 9
  ...
  dp[7] = max(0, dp[0] + 7) = 7

石头 4:
  dp[11] = max(9, dp[7] + 4) = 11 ← 达到 target
  ...

最终 dp[11] = 11
答案 = 23 - 2 * 11 = 1
```

### 示例2：`[31, 26, 33, 21, 40]`

```
total = 151
target = 75

最优分组：
  正堆：33 + 40 = 73
  负堆：31 + 26 + 21 = 78
  
等等，73 < 78？
实际上：
  正堆：40 + 33 + 31 = 104
  负堆：26 + 21 = 47
  
不对，104 > 75

正确分组：
  正堆：40 + 33 = 73
  负堆：31 + 26 + 21 = 78
  
但 73 < target = 75，所以选 73
答案 = 151 - 2 * 73 = 5
```

## 代码优化

### 提前终止

如果已经达到 `target`，可以提前返回

```python
def lastStoneWeightII_optimized(stones):
    total = sum(stones)
    target = total // 2
    
    dp = [0] * (target + 1)
    
    for stone in stones:
        for w in range(target, stone - 1, -1):
            dp[w] = max(dp[w], dp[w - stone] + stone)
        
        # 提前终止
        if dp[target] == target:
            return total - 2 * target
    
    return total - 2 * dp[target]
```

### 位运算优化（Bitset）

对于小数据范围，可以用位运算

```python
def lastStoneWeightII_bitset(stones):
    total = sum(stones)
    
    # 用位表示可达的重量
    dp = 1  # 初始：重量 0 可达
    
    for stone in stones:
        dp |= dp << stone
    
    # 找最接近 total // 2 的可达重量
    target = total // 2
    for i in range(target, -1, -1):
        if dp & (1 << i):
            return total - 2 * i
    
    return total
```

## 变体问题

### 变体1：分成相等的两堆

**问题**：能否将石头分成两堆，使得重量相等？

```python
def can_partition(stones):
    total = sum(stones)
    
    # 总和为奇数，不可能分成相等的两堆
    if total % 2 == 1:
        return False
    
    target = total // 2
    dp = [False] * (target + 1)
    dp[0] = True
    
    for stone in stones:
        for w in range(target, stone - 1, -1):
            dp[w] = dp[w] or dp[w - stone]
    
    return dp[target]
```

### 变体2：最多分成 k 堆

**问题**：将石头分成最多 k 堆，使得最大堆的重量最小

**思路**：二分答案 + 贪心验证

```python
def split_into_k_piles(stones, k):
    def can_split(max_weight):
        piles = 0
        current = 0
        
        for stone in stones:
            if stone > max_weight:
                return False
            
            if current + stone > max_weight:
                piles += 1
                current = stone
            else:
                current += stone
        
        return piles + 1 <= k
    
    left, right = max(stones), sum(stones)
    
    while left < right:
        mid = (left + right) // 2
        
        if can_split(mid):
            right = mid
        else:
            left = mid + 1
    
    return left
```

## 常见错误

### 错误1：理解错误

```python
# 错误：以为是贪心，每次选最大的两块
def wrong_solution(stones):
    stones.sort(reverse=True)
    
    while len(stones) > 1:
        x = stones.pop(0)
        y = stones.pop(0)
        
        if x != y:
            stones.append(x - y)
            stones.sort(reverse=True)
    
    return stones[0] if stones else 0

# 反例：[2, 7, 4, 1, 8, 1]
# 贪心：8-7=1, 4-2=2, 2-1=1, 1-1=0 → 结果 1（碰巧正确）
# 但对于 [1, 1, 4, 2, 2]：
#   贪心：4-2=2, 2-2=0, 1-1=0 → 结果 0
#   最优：(4+1+1) - (2+2) = 2 → 结果 2
```

### 错误2：完全背包

```python
# 错误：从左向右遍历
for stone in stones:
    for w in range(stone, target + 1):  # 错误！
        dp[w] = max(dp[w], dp[w - stone] + stone)

# 会导致同一块石头被选多次
```

### 错误3：目标容量错误

```python
# 错误：目标容量为 total
target = sum(stones)
dp = [0] * (target + 1)
...
return total - 2 * dp[target]  # 错误！dp[target] = total，答案为负数
```

## 性能对比

| 方法 | 时间复杂度 | 空间复杂度 | 备注 |
|-----|----------|----------|------|
| 01 背包 | O(n × sum) | O(sum) | 通用解法 |
| 位运算 | O(n × sum) | O(1) | 仅适用小范围 |
| 贪心 | O(n log n) | O(1) | **错误解法** |

## 小结

### 核心思想
- **问题转化**：粉碎石头 → 分成两堆 → 01 背包
- **目标**：使两堆重量差最小
- **技巧**：背包容量为 `total / 2`

### 关键步骤
1. 计算总重量 `total`
2. 目标容量 `target = total // 2`
3. 01 背包求最大重量 `sum2`
4. 答案：`total - 2 * sum2`

### 易错点
- ✓ 使用 01 背包（从右向左）
- ✗ 使用完全背包（从左向右）
- ✗ 贪心策略（局部最优 ≠ 全局最优）

这道题是 01 背包的经典应用，关键在于**问题转化**：将看似复杂的石头粉碎问题，转化为简单的背包问题。掌握这种转化思维，可以解决很多类似的优化问题。
