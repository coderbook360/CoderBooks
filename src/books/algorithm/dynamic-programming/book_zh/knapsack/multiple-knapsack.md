# 多重背包与混合背包

多重背包是 01 背包和完全背包的泛化，允许每种物品有**有限的数量限制**。混合背包则是三种背包问题的综合，需要根据物品类型选择不同的处理策略。

## 多重背包问题

### 问题定义

有 `n` 种物品和一个容量为 `W` 的背包：
- 第 `i` 种物品的重量为 `w[i]`，价值为 `v[i]`
- 第 `i` 种物品**最多有 `c[i]` 个**（有限数量）

求：在不超过背包容量的前提下，能获得的最大价值。

**示例**：
```
输入: W = 10, w = [2, 3, 4], v = [1, 3, 4], c = [3, 2, 1]
      物品0: 重量2，价值1，数量3
      物品1: 重量3，价值3，数量2
      物品2: 重量4，价值4，数量1
输出: 10
解释: 选3个物品0 + 1个物品1，重量9，价值12
```

### 朴素解法：转化为 01 背包

**思想**：将第 `i` 种物品的 `c[i]` 个看作 `c[i]` 个独立物品

```python
def multiple_knapsack_naive(W, weights, values, counts):
    """
    多重背包朴素解法
    转化为 01 背包
    """
    # 展开物品
    new_weights = []
    new_values = []
    
    for i in range(len(weights)):
        for _ in range(counts[i]):
            new_weights.append(weights[i])
            new_values.append(values[i])
    
    # 01 背包
    n = len(new_weights)
    dp = [0] * (W + 1)
    
    for i in range(n):
        weight = new_weights[i]
        value = new_values[i]
        
        for w in range(W, weight - 1, -1):
            dp[w] = max(dp[w], dp[w - weight] + value)
    
    return dp[W]
```

**时间复杂度**：O(W × ∑c[i])  
**问题**：如果 `c[i]` 很大（如 1000），会超时

### 优化解法：二进制优化

**核心思想**：将 `c` 个物品拆分成若干组，每组的数量是 2 的幂次

**为什么有效？**
- 任何数字都可以用 2 的幂次表示（二进制）
- 例如：7 = 1 + 2 + 4

```python
def multiple_knapsack_binary(W, weights, values, counts):
    """
    多重背包二进制优化
    """
    # 二进制拆分
    new_weights = []
    new_values = []
    
    for i in range(len(weights)):
        weight, value, count = weights[i], values[i], counts[i]
        
        # 二进制拆分：1, 2, 4, ..., 2^k, remainder
        k = 1
        while k <= count:
            new_weights.append(k * weight)
            new_values.append(k * value)
            count -= k
            k *= 2
        
        if count > 0:
            new_weights.append(count * weight)
            new_values.append(count * value)
    
    # 01 背包
    n = len(new_weights)
    dp = [0] * (W + 1)
    
    for i in range(n):
        weight = new_weights[i]
        value = new_values[i]
        
        for w in range(W, weight - 1, -1):
            dp[w] = max(dp[w], dp[w - weight] + value)
    
    return dp[W]
```

**时间复杂度**：O(W × n × log(max(c[i])))

**示例**：将 13 个相同物品拆分
```
13 = 1 + 2 + 4 + 6
    (不是 8，因为 1+2+4+8=15 > 13)

拆分后：4 组（1个、2个、4个、6个）
原来需要循环 13 次，现在只需 4 次
```

### 单调队列优化（高级）

**思想**：对于每种物品，按余数分类，用单调队列维护最优值

```python
from collections import deque

def multiple_knapsack_monotonic_queue(W, weights, values, counts):
    """
    多重背包单调队列优化
    """
    n = len(weights)
    dp = [0] * (W + 1)
    
    for i in range(n):
        weight, value, count = weights[i], values[i], counts[i]
        
        # 按余数分组
        for remainder in range(weight):
            queue = deque()
            
            for k in range((W - remainder) // weight + 1):
                w = remainder + k * weight
                
                # 移除超出范围的元素
                while queue and queue[0][1] < k - count:
                    queue.popleft()
                
                # 当前值
                current_value = dp[w] - k * value
                
                # 维护单调性
                while queue and queue[0][0] <= current_value:
                    queue.popleft()
                
                queue.append((current_value, k))
                
                # 更新 dp
                if queue:
                    dp[w] = queue[0][0] + k * value
    
    return dp[W]
```

**时间复杂度**：O(n × W)（与完全背包相同！）

## 混合背包问题

### 问题定义

有 `n` 种物品，每种物品有三种可能：
1. **01 背包**：只能选 0 或 1 次
2. **完全背包**：可以选无限次
3. **多重背包**：最多选 `c` 次

**统一处理**：
- 01 背包：`c = 1`
- 完全背包：`c = ∞`
- 多重背包：`c` 为有限值

```python
def mixed_knapsack(W, weights, values, counts):
    """
    混合背包问题
    counts[i] = -1 表示完全背包（无限）
    counts[i] = 1 表示 01 背包
    counts[i] > 1 表示多重背包
    """
    n = len(weights)
    
    # 二进制优化：展开多重背包
    new_weights = []
    new_values = []
    types = []  # 记录类型：0=01背包, 1=完全背包
    
    for i in range(n):
        weight, value, count = weights[i], values[i], counts[i]
        
        if count == -1:
            # 完全背包
            new_weights.append(weight)
            new_values.append(value)
            types.append(1)
        elif count == 1:
            # 01 背包
            new_weights.append(weight)
            new_values.append(value)
            types.append(0)
        else:
            # 多重背包：二进制拆分
            k = 1
            while k <= count:
                new_weights.append(k * weight)
                new_values.append(k * value)
                types.append(0)  # 拆分后作为 01 背包处理
                count -= k
                k *= 2
            
            if count > 0:
                new_weights.append(count * weight)
                new_values.append(count * value)
                types.append(0)
    
    # 统一 DP
    m = len(new_weights)
    dp = [0] * (W + 1)
    
    for i in range(m):
        weight = new_weights[i]
        value = new_values[i]
        item_type = types[i]
        
        if item_type == 0:
            # 01 背包：从右向左
            for w in range(W, weight - 1, -1):
                dp[w] = max(dp[w], dp[w - weight] + value)
        else:
            # 完全背包：从左向右
            for w in range(weight, W + 1):
                dp[w] = max(dp[w], dp[w - weight] + value)
    
    return dp[W]
```

## 实际应用

### 应用1：有限资源分配

```python
def allocate_resources(W, projects):
    """
    项目资源分配
    projects[i] = (cost, profit, max_count)
    """
    weights = [p[0] for p in projects]
    values = [p[1] for p in projects]
    counts = [p[2] for p in projects]
    
    return multiple_knapsack_binary(W, weights, values, counts)
```

### 应用2：库存管理

```python
def maximize_profit(capacity, items):
    """
    items[i] = (size, profit, stock)
    """
    weights = [item[0] for item in items]
    values = [item[1] for item in items]
    counts = [item[2] for item in items]
    
    return multiple_knapsack_binary(capacity, weights, values, counts)
```

## 二进制优化详解

**为什么用 2 的幂次？**

假设 `c = 13`，可以表示 0 到 13 的所有数字：
```
0 = 0
1 = 1
2 = 2
3 = 1 + 2
4 = 4
5 = 1 + 4
6 = 2 + 4
7 = 1 + 2 + 4
8 = 8 (错！应该是 1+2+4+6，因为剩余 6 个)
...
13 = 1 + 2 + 4 + 6
```

**拆分步骤**：
1. 取 1 个：剩余 12
2. 取 2 个：剩余 10
3. 取 4 个：剩余 6
4. 取 6 个：剩余 0（全部用完）

**代码逻辑**：
```python
k = 1
while k <= count:
    new_weights.append(k * weight)
    new_values.append(k * value)
    count -= k
    k *= 2

# 剩余部分
if count > 0:
    new_weights.append(count * weight)
    new_values.append(count * value)
```

## 性能对比

假设 `n = 100`, `W = 1000`, `max(c[i]) = 1000`

| 方法 | 时间复杂度 | 实际性能 |
|-----|----------|---------|
| 朴素展开 | O(W × ∑c) | 10^8（超时） |
| 二进制优化 | O(W × n × log c) | 10^6（可行） |
| 单调队列 | O(n × W) | 10^5（最快） |

## 常见错误

### 错误1：二进制拆分错误

```python
# 错误：最后没有处理剩余部分
k = 1
while k <= count:
    ...
    count -= k
    k *= 2
# 忘记 if count > 0: ...

# 正确：处理剩余部分
if count > 0:
    new_weights.append(count * weight)
    new_values.append(count * value)
```

### 错误2：混合背包时方向错误

```python
# 错误：完全背包也从右向左
for w in range(W, weight - 1, -1):
    dp[w] = max(dp[w], dp[w - weight] + value)

# 正确：根据类型选择方向
if item_type == 0:  # 01 背包
    for w in range(W, weight - 1, -1): ...
else:  # 完全背包
    for w in range(weight, W + 1): ...
```

## 小结

### 多重背包
- **朴素方法**：展开成 01 背包，O(W × ∑c)
- **二进制优化**：拆分成 log c 组，O(W × n × log c)
- **单调队列优化**：O(n × W)（最优）

### 混合背包
- 统一处理三种背包类型
- 完全背包：`c = -1`，从左向右
- 01 背包：`c = 1`，从右向左
- 多重背包：二进制拆分后作为 01 背包

### 选择建议
- 小数据：朴素方法
- 中等数据：二进制优化（推荐）
- 大规模数据：单调队列优化（复杂）

多重背包是背包问题的泛化，掌握二进制优化技巧可以高效解决大多数实际问题。
