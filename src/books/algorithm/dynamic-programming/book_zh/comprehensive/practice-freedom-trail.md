# 自由之路（LeetCode 514）

## 问题描述

> 电子游戏中有一个圆盘形转盘，上面有 `ring` 字符串。转盘正上方有一个指针，初始指向 `ring[0]`。你需要拼写出 `key` 字符串，每次可以：
> - 顺时针或逆时针旋转转盘（代价 1）
> - 按下中心按钮拼写当前字符（代价 1）
> 
> 求最小代价。

**示例**：
```
输入：ring = "godding", key = "gd"
输出：4
解释：
1. 初始指向 'g'，按按钮 → "g"（代价 1）
2. 顺时针旋转 1 步到 'd'（代价 1）
3. 按按钮 → "gd"（代价 1）
总代价：3 + key的长度(2) = 5
等等，答案是 4？

重新分析：
ring = "godding"
       0123456
指针初始在 0 ('g')

目标：拼 "gd"
1. 当前是 'g'，按按钮 (cost = 1)
2. 需要找 'd'：
   - 位置 2: 顺时针 2 步
   - 位置 3: 顺时针 3 步
   选位置 2，cost = 2
3. 按按钮 (cost = 1)
总代价：1 + 2 + 1 = 4
```

## 解法一：动态规划

**状态定义**：
```
dp[i][j] = 拼写 key[0:i]，转盘指针在 ring[j] 的最小代价
```

**状态转移**：
```
对于 key[i]，找到 ring 中所有匹配的位置 pos
dp[i+1][pos] = min(dp[i][j] + distance(j, pos) + 1)
               (j 是上一个状态的位置)
```

**距离计算**（环形）：
```python
def distance(ring, from_pos, to_pos):
    n = len(ring)
    clockwise = (to_pos - from_pos) % n
    counterclockwise = (from_pos - to_pos) % n
    return min(clockwise, counterclockwise)
```

**完整代码**：
```python
def findRotateSteps(ring, key):
    """
    DP 解法
    """
    n, m = len(ring), len(key)
    
    # 预处理：每个字符在 ring 中的位置
    char_positions = {}
    for i, char in enumerate(ring):
        if char not in char_positions:
            char_positions[char] = []
        char_positions[char].append(i)
    
    # dp[i][j] = 拼写 key[0:i]，指针在 ring[j] 的最小代价
    dp = [[float('inf')] * n for _ in range(m + 1)]
    dp[0][0] = 0  # 初始在位置 0
    
    for i in range(m):
        char = key[i]
        for prev_pos in range(n):
            if dp[i][prev_pos] == float('inf'):
                continue
            
            # 尝试所有匹配的位置
            for pos in char_positions[char]:
                # 计算距离
                clockwise = (pos - prev_pos) % n
                counterclockwise = (prev_pos - pos) % n
                dist = min(clockwise, counterclockwise)
                
                # 更新
                dp[i+1][pos] = min(dp[i+1][pos], 
                                  dp[i][prev_pos] + dist + 1)
    
    # 找最小值
    return min(dp[m])

# 测试
print(findRotateSteps("godding", "gd"))     # 4
print(findRotateSteps("godding", "godding"))  # 13
```

**复杂度**：
- 时间：O(m × n²)（m 是 key 长度，n 是 ring 长度）
- 空间：O(m × n)

## 解法二：优化（记录字符位置）

```python
def findRotateSteps_optimized(ring, key):
    """
    优化：只遍历有该字符的位置
    """
    from collections import defaultdict
    
    n, m = len(ring), len(key)
    
    # 预处理
    char_positions = defaultdict(list)
    for i, char in enumerate(ring):
        char_positions[char].append(i)
    
    # dp[j] = 当前字符，指针在 j 的最小代价
    dp = {0: 0}  # 使用字典，只存储有效状态
    
    for char in key:
        new_dp = {}
        for pos in char_positions[char]:
            min_cost = float('inf')
            
            # 从所有前一状态转移
            for prev_pos, prev_cost in dp.items():
                clockwise = (pos - prev_pos) % n
                counterclockwise = (prev_pos - pos) % n
                dist = min(clockwise, counterclockwise)
                min_cost = min(min_cost, prev_cost + dist + 1)
            
            new_dp[pos] = min_cost
        
        dp = new_dp
    
    return min(dp.values())

# 测试
print(findRotateSteps_optimized("godding", "gd"))
```

**复杂度**：
- 时间：O(m × k²)（k 是平均每个字符的位置数，k << n）
- 空间：O(k)

## 解法三：记忆化搜索

```python
def findRotateSteps_memo(ring, key):
    """
    记忆化搜索
    """
    from functools import lru_cache
    
    n = len(ring)
    
    # 预处理
    char_positions = {}
    for i, char in enumerate(ring):
        if char not in char_positions:
            char_positions[char] = []
        char_positions[char].append(i)
    
    @lru_cache(None)
    def dfs(key_idx, ring_pos):
        if key_idx == len(key):
            return 0
        
        char = key[key_idx]
        min_cost = float('inf')
        
        for pos in char_positions[char]:
            clockwise = (pos - ring_pos) % n
            counterclockwise = (ring_pos - pos) % n
            dist = min(clockwise, counterclockwise)
            
            cost = dist + 1 + dfs(key_idx + 1, pos)
            min_cost = min(min_cost, cost)
        
        return min_cost
    
    return dfs(0, 0)

# 测试
print(findRotateSteps_memo("godding", "gd"))
```

## 可视化示例

**ring = "godding", key = "gd"**

```
ring:  g  o  d  d  i  n  g
index: 0  1  2  3  4  5  6

初始状态：指针在 0 ('g')

Step 1: 拼 'g'
- 当前就是 'g'，按按钮
- 代价：1

Step 2: 拼 'd'
- 'd' 在位置 2 和 3
- 从位置 0 到位置 2：
  - 顺时针：2 步
  - 逆时针：7 - 2 = 5 步
  - 选 2 步
- 从位置 0 到位置 3：
  - 顺时针：3 步
  - 逆时针：7 - 3 = 4 步
  - 选 3 步
- 选位置 2，代价：2 + 1 = 3

总代价：1 + 3 = 4
```

## 常见错误

**错误 1：距离计算**
```python
# 错误：只考虑一个方向
dist = abs(to_pos - from_pos)

# 正确：考虑环形
clockwise = (to_pos - from_pos) % n
counterclockwise = (from_pos - to_pos) % n
dist = min(clockwise, counterclockwise)
```

**错误 2：初始化**
```python
# 错误：忘记初始化
dp = [[float('inf')] * n for _ in range(m + 1)]

# 正确：初始状态
dp[0][0] = 0
```

**错误 3：按按钮的代价**
```python
# 错误：只算旋转代价
cost = dist

# 正确：旋转 + 按按钮
cost = dist + 1
```

## 扩展问题

**问题一：路径重建**
```python
def findRotateStepsWithPath(ring, key):
    """
    返回最小代价和路径
    """
    # ... DP 代码 ...
    
    # 回溯路径
    path = []
    pos = min(range(n), key=lambda j: dp[m][j])
    
    for i in range(m, 0, -1):
        path.append(pos)
        char = key[i-1]
        # 找前一个位置
        for prev_pos in char_positions[char]:
            if dp[i][pos] == dp[i-1][prev_pos] + distance(prev_pos, pos) + 1:
                pos = prev_pos
                break
    
    path.append(0)
    return min(dp[m]), path[::-1]
```

**问题二：多个 key**
```python
def findRotateStepsMultiple(ring, keys):
    """
    拼写多个 key，最小总代价
    """
    total_cost = 0
    current_pos = 0
    
    for key in keys:
        cost, path = findRotateStepsWithPath(ring, key)
        total_cost += cost
        current_pos = path[-1]
    
    return total_cost
```

## 小结

| 解法 | 时间 | 空间 | 特点 |
|-----|-----|-----|-----|
| DP（二维） | O(mn²) | O(mn) | 标准解法 |
| DP优化 | O(mk²) | O(k) | 只存储有效状态 |
| 记忆化搜索 | O(mk²) | O(mk) | 实现简洁 |

**关键点**：
- 环形距离：顺时针 vs 逆时针
- 状态定义：当前字符 + 指针位置
- 预处理：字符位置映射
- 优化：只遍历有效位置
