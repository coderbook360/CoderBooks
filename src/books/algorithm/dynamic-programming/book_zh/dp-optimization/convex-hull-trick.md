# 斜率优化（CHT - Convex Hull Trick）

## 核心思想

> 某些DP状态转移可以表示为 `dp[i] = min/max(dp[j] + cost(j, i))`，其中 `cost(j, i)` 可以转化为**直线方程**。利用凸包维护最优决策点，查询复杂度从 O(n) 降到 O(log n) 甚至 O(1)。

**时间优化**：O(n²) → O(n log n) 或 O(n)

## 适用场景识别

**标准形式**：
```
dp[i] = min(dp[j] + a[j] × b[i] + c[i])
       = min((a[j]) × b[i] + (dp[j] + c[i]))
         ↑     ↑      ↑      ↑
        斜率   x坐标  y坐标  截距
```

**关键特征**：
1. 决策变量 j 和查询点 i 可以分离
2. 可以转化为 `y = kx + b` 的形式
3. k 或 x 具有单调性

## 示例一：任务调度

**问题**：n 个任务，第 i 个任务耗时 `t[i]`，每个任务的等待代价是 `cost × 等待时间`。求最小总代价。

**状态定义**：
```
dp[i] = 完成前 i 个任务的最小代价
```

**状态转移**：
```
dp[i] = min(dp[j] + cost[i] × sum(t[j+1:i]))
      = min(dp[j] + cost[i] × (prefix[i] - prefix[j]))
      = min(dp[j] - cost[i] × prefix[j] + cost[i] × prefix[i])
```

**转化为直线方程**：
```
y = dp[j] - cost[i] × prefix[j]
  = (-cost[i]) × prefix[j] + dp[j]
  ↑              ↑            ↑
  斜率 k         x坐标        y坐标（截距）
```

**暴力 DP**（O(n²)）：
```python
def minCost_brute(tasks, costs):
    n = len(tasks)
    prefix = [0] * (n + 1)
    for i in range(n):
        prefix[i+1] = prefix[i] + tasks[i]
    
    dp = [0] + [float('inf')] * n
    
    for i in range(1, n + 1):
        for j in range(i):
            cost = dp[j] + costs[i-1] * (prefix[i] - prefix[j])
            dp[i] = min(dp[i], cost)
    
    return dp[n]
```

**斜率优化**（O(n log n) 或 O(n)）：

关键观察：对于两个决策点 j1 < j2，如果 j1 优于 j2，则：
```
dp[j1] + cost[i] × (prefix[i] - prefix[j1]) < dp[j2] + cost[i] × (prefix[i] - prefix[j2])
=> (dp[j1] - dp[j2]) / (prefix[j1] - prefix[j2]) < cost[i]
```

**凸包维护**：
```python
from collections import deque

def minCost_CHT(tasks, costs):
    n = len(tasks)
    prefix = [0] * (n + 1)
    for i in range(n):
        prefix[i+1] = prefix[i] + tasks[i]
    
    dp = [0] + [0] * n
    
    # 单调队列维护凸包（下凸）
    dq = deque([0])
    
    def slope(j1, j2):
        """计算两点连线的斜率"""
        return (dp[j1] - dp[j2]) / (prefix[j1] - prefix[j2])
    
    for i in range(1, n + 1):
        k = costs[i-1]  # 当前查询的斜率
        
        # 队首不是最优决策，弹出
        while len(dq) >= 2 and slope(dq[0], dq[1]) < k:
            dq.popleft()
        
        j = dq[0]
        dp[i] = dp[j] + k * (prefix[i] - prefix[j])
        
        # 维护凸包：新点可能导致之前的点失效
        while len(dq) >= 2 and slope(dq[-2], dq[-1]) >= slope(dq[-1], i):
            dq.pop()
        
        dq.append(i)
    
    return dp[n]

# 测试
tasks = [1, 2, 3]
costs = [3, 2, 1]
print(minCost_CHT(tasks, costs))
```

## 示例二：LeetCode 1235 - 最大利润

**问题**：n 个工作，每个工作有 `(startTime, endTime, profit)`，选择不重叠的工作使利润最大。

**转化**：按结束时间排序后，可以用斜率优化。

## 模板：动态凸包

```python
class ConvexHullTrick:
    def __init__(self):
        self.lines = []  # (slope, intercept)
    
    def add_line(self, k, b):
        """添加直线 y = kx + b"""
        # 维护下凸包
        while len(self.lines) >= 2:
            k1, b1 = self.lines[-2]
            k2, b2 = self.lines[-1]
            # 检查是否需要删除倒数第二条线
            if (b2 - b1) * (k - k1) >= (b - b1) * (k2 - k1):
                self.lines.pop()
            else:
                break
        
        self.lines.append((k, b))
    
    def query(self, x):
        """查询 x 处的最小值"""
        # 三分查找或二分查找
        left, right = 0, len(self.lines) - 1
        while left < right:
            mid = (left + right) // 2
            k1, b1 = self.lines[mid]
            k2, b2 = self.lines[mid + 1]
            if k1 * x + b1 > k2 * x + b2:
                left = mid + 1
            else:
                right = mid
        
        k, b = self.lines[left]
        return k * x + b
```

## O(n) 优化（斜率单调）

如果查询的 x 是单调的，可以用**单调队列**代替二分：

```python
def minCost_linear(tasks, costs):
    """
    当 costs 单调递增时，可以 O(n)
    """
    n = len(tasks)
    prefix = [0] * (n + 1)
    for i in range(n):
        prefix[i+1] = prefix[i] + tasks[i]
    
    dp = [0] + [0] * n
    dq = deque([0])
    
    def cross(j1, j2, j3):
        """判断 j2 是否在 j1-j3 连线上方（需要删除）"""
        return (dp[j2] - dp[j1]) * (prefix[j3] - prefix[j2]) >= \
               (dp[j3] - dp[j2]) * (prefix[j2] - prefix[j1])
    
    for i in range(1, n + 1):
        # 弹出不优的决策点
        while len(dq) >= 2:
            j1, j2 = dq[0], dq[1]
            if dp[j1] + costs[i-1] * (prefix[i] - prefix[j1]) >= \
               dp[j2] + costs[i-1] * (prefix[i] - prefix[j2]):
                dq.popleft()
            else:
                break
        
        j = dq[0]
        dp[i] = dp[j] + costs[i-1] * (prefix[i] - prefix[j])
        
        # 维护凸包
        while len(dq) >= 2 and cross(dq[-2], dq[-1], i):
            dq.pop()
        
        dq.append(i)
    
    return dp[n]
```

## 识别斜率优化的技巧

**Step 1：写出状态转移方程**
```
dp[i] = min(dp[j] + f(i, j))
```

**Step 2：尝试分离 i 和 j**
```
dp[i] = min(dp[j] + A[j] × B[i] + C[i])
```

**Step 3：固定 i，看作关于 j 的函数**
```
y(j) = dp[j] + A[j] × B[i]
     = A[j] × B[i] + dp[j]
     ↑       ↑       ↑
    斜率     x      截距
```

**Step 4：判断单调性**
- B[i] 单调 → 可以 O(n)
- B[i] 不单调 → O(n log n)（二分/平衡树）

## 小结

| 方法 | 时间复杂度 | 条件 |
|-----|-----------|-----|
| 暴力DP | O(n²) | - |
| 斜率优化 + 二分 | O(n log n) | 无单调性要求 |
| 斜率优化 + 单调队列 | O(n) | 斜率或查询点单调 |

**应用场景**：
- 任务调度
- 批量处理
- 工厂规划
- 形如 `cost = a × b` 的转移方程
