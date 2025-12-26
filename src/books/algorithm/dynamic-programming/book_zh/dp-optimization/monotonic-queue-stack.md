# 单调队列/栈优化

## 核心思想

> 当DP状态转移涉及区间最值查询时，用单调队列/栈维护候选状态，将查询复杂度从 O(k) 降到 O(1)。

**时间优化**：O(n × k) → O(n)

## 适用场景

1. **滑动窗口最值**：固定长度区间的最大/最小值
2. **DP区间最值查询**：`dp[i] = max(dp[i-k] ... dp[i-1]) + cost[i]`
3. **单调性约束**：决策单调性、斜率优化

## 示例一：滑动窗口最大值

**问题**：给定数组和窗口大小 k，返回每个窗口的最大值。

**暴力解法**（O(n × k)）：
```python
def maxSlidingWindow_brute(nums, k):
    result = []
    for i in range(len(nums) - k + 1):
        result.append(max(nums[i:i+k]))
    return result
```

**单调队列优化**（O(n)）：
```python
from collections import deque

def maxSlidingWindow(nums, k):
    """
    单调递减队列：队首始终是窗口最大值
    """
    dq = deque()  # 存储索引
    result = []
    
    for i in range(len(nums)):
        # 移除窗口外的元素
        while dq and dq[0] < i - k + 1:
            dq.popleft()
        
        # 维护单调性：移除比当前元素小的
        while dq and nums[dq[-1]] < nums[i]:
            dq.pop()
        
        dq.append(i)
        
        # 窗口形成后添加结果
        if i >= k - 1:
            result.append(nums[dq[0]])
    
    return result

# 测试
print(maxSlidingWindow([1,3,-1,-3,5,3,6,7], 3))
# [3, 3, 5, 5, 6, 7]
```

**单调队列性质**：
- 队首是窗口最大值
- 队列单调递减
- 每个元素最多入队/出队一次

## 示例二：DP 优化 - 跳跃游戏

**问题**：数组 `nums`，每次可以向前跳 1~k 步，求到达末尾的最小代价。

**状态转移**：
```
dp[i] = min(dp[i-k], ..., dp[i-1]) + nums[i]
```

**暴力 DP**（O(n × k)）：
```python
def minCost_brute(nums, k):
    n = len(nums)
    dp = [float('inf')] * n
    dp[0] = nums[0]
    
    for i in range(1, n):
        for j in range(max(0, i - k), i):
            dp[i] = min(dp[i], dp[j] + nums[i])
    
    return dp[n-1]
```

**单调队列优化**（O(n)）：
```python
from collections import deque

def minCost(nums, k):
    """
    单调递增队列：维护窗口内的最小 dp 值
    """
    n = len(nums)
    dp = [float('inf')] * n
    dp[0] = nums[0]
    
    dq = deque([0])  # 存储索引
    
    for i in range(1, n):
        # 移除窗口外的元素
        while dq and dq[0] < i - k:
            dq.popleft()
        
        # 从窗口最小值转移
        dp[i] = dp[dq[0]] + nums[i]
        
        # 维护单调性
        while dq and dp[dq[-1]] >= dp[i]:
            dq.pop()
        
        dq.append(i)
    
    return dp[n-1]

# 测试
print(minCost([1, 100, 1, 1, 1, 100, 1, 1, 100, 1], 2))
# 6
```

## 示例三：最大子数组和（长度限制）

**问题**：求长度在 `[L, R]` 之间的最大子数组和。

**状态转移**：
```
prefix[i] = sum(nums[0:i])
ans = max(prefix[i] - min(prefix[i-R] ... prefix[i-L]))
```

**单调队列维护前缀和最小值**：
```python
from collections import deque

def maxSubarraySum(nums, L, R):
    """
    长度在 [L, R] 之间的最大子数组和
    """
    n = len(nums)
    prefix = [0] * (n + 1)
    for i in range(n):
        prefix[i+1] = prefix[i] + nums[i]
    
    dq = deque()
    ans = float('-inf')
    
    for i in range(1, n + 1):
        # 添加 prefix[i-L] 到队列
        if i >= L:
            # 维护单调递增队列（前缀和最小值）
            while dq and prefix[dq[-1]] >= prefix[i-L]:
                dq.pop()
            dq.append(i - L)
        
        # 移除超出范围的
        while dq and dq[0] < i - R:
            dq.popleft()
        
        # 更新答案
        if dq:
            ans = max(ans, prefix[i] - prefix[dq[0]])
    
    return ans

# 测试
print(maxSubarraySum([1, -2, 3, -4, 5], 2, 3))
# 4（子数组 [3, -4, 5]，长度3，和=4）
```

## 单调栈应用：最大矩形面积

**问题**：柱状图中最大的矩形面积。

```python
def largestRectangleArea(heights):
    """
    单调栈：维护递增序列
    """
    stack = []
    max_area = 0
    heights.append(0)  # 哨兵
    
    for i, h in enumerate(heights):
        while stack and heights[stack[-1]] > h:
            height_idx = stack.pop()
            width = i if not stack else i - stack[-1] - 1
            max_area = max(max_area, heights[height_idx] * width)
        
        stack.append(i)
    
    return max_area

# 测试
print(largestRectangleArea([2,1,5,6,2,3]))
# 10（高度5-6的矩形，宽度2）
```

## 模板总结

**单调队列（区间最值）**：
```python
from collections import deque

dq = deque()  # 存储索引

for i in range(n):
    # 1. 移除窗口外的元素
    while dq and dq[0] < i - window_size + 1:
        dq.popleft()
    
    # 2. 维护单调性
    while dq and compare(arr[dq[-1]], arr[i]):
        dq.pop()
    
    # 3. 添加当前元素
    dq.append(i)
    
    # 4. 使用队首（最值）
    if i >= window_size - 1:
        result.append(arr[dq[0]])
```

**单调栈（左/右第一个更大/更小）**：
```python
stack = []

for i in range(n):
    while stack and compare(arr[stack[-1]], arr[i]):
        # 弹出元素找到了答案
        idx = stack.pop()
        process(idx, i)
    
    stack.append(i)
```

## 复杂度对比

| 方法 | 时间复杂度 | 空间复杂度 |
|-----|-----------|-----------|
| 暴力查询 | O(n × k) | O(1) |
| 单调队列 | O(n) | O(k) |
| 线段树 | O(n log k) | O(k) |

## 小结

- **单调队列**：维护滑动窗口的最值，O(1) 查询
- **单调栈**：查找左/右第一个满足条件的元素
- **应用**：DP优化、滑动窗口、柱状图问题
- **关键**：理解单调性，正确维护队列/栈
