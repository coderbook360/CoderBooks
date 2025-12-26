# 实战：打家劫舍 II

## 问题描述

**LeetCode 213: 打家劫舍 II**

你是一个专业的小偷，计划偷窃沿街的房屋，每间房内都藏有一定的现金。这个地方所有的房屋都**围成一圈**，这意味着第一个房屋和最后一个房屋是紧挨着的。同时，相邻的房屋装有相互连通的防盗系统，**如果两间相邻的房屋在同一晚上被小偷闯入，系统会自动报警**。

给定一个代表每个房屋存放金额的非负整数数组，计算你**在不触动警报装置的情况下**，今晚能够偷窃到的最高金额。

**示例1**：
```
输入：nums = [2,3,2]
输出：3
解释：你不能先偷窃 1 号房屋（金额 = 2），然后偷窃 3 号房屋（金额 = 2），因为他们是相邻的。
```

**示例2**：
```
输入：nums = [1,2,3,1]
输出：4
解释：你可以先偷窃 1 号房屋（金额 = 1），然后偷窃 3 号房屋（金额 = 3）。
      偷窃到的最高金额 = 1 + 3 = 4。
```

**示例3**：
```
输入：nums = [1,2,3]
输出：3
```

**约束**：
- `1 <= nums.length <= 100`
- `0 <= nums[i] <= 1000`

## 问题分析

### 与打家劫舍 I 的区别

**打家劫舍 I**：房屋排成一排（线性）
```
[1] - [2] - [3] - [4] - [5]
```

**打家劫舍 II**：房屋围成一圈（环形）
```
    [1]
   /   \
 [5]   [2]
   \   /
    [4] - [3]
```

**核心约束**：第一间房和最后一间房是相邻的，**不能同时偷**

### 化环为链

**关键思想**：将环形问题转化为两个线性问题

**分类讨论**：
1. **不偷第一间房**：那么最后一间房可以考虑偷
   - 问题变为：`rob(nums[1:n])`
   
2. **不偷最后一间房**：那么第一间房可以考虑偷
   - 问题变为：`rob(nums[0:n-1])`

**答案**：取两种情况的最大值

```
max(
    rob(nums[1:n]),    // 不偷第一间
    rob(nums[0:n-1])   // 不偷最后一间
)
```

## 解法一：分解为两个子问题

### 思路

复用打家劫舍 I 的代码，分别计算两种情况

```python
def rob(nums):
    """
    打家劫舍 II
    """
    n = len(nums)
    
    # 特殊情况
    if n == 0:
        return 0
    if n == 1:
        return nums[0]
    if n == 2:
        return max(nums[0], nums[1])
    
    # 情况1：不偷第一间房（考虑 nums[1:n]）
    case1 = rob_linear(nums[1:])
    
    # 情况2：不偷最后一间房（考虑 nums[0:n-1]）
    case2 = rob_linear(nums[:n-1])
    
    return max(case1, case2)

def rob_linear(nums):
    """
    打家劫舍 I（线性）
    """
    if not nums:
        return 0
    
    n = len(nums)
    if n == 1:
        return nums[0]
    
    dp = [0] * n
    dp[0] = nums[0]
    dp[1] = max(nums[0], nums[1])
    
    for i in range(2, n):
        dp[i] = max(dp[i-1], dp[i-2] + nums[i])
    
    return dp[-1]
```

### 复杂度分析

- **时间复杂度**：O(n)（两次遍历）
- **空间复杂度**：O(n)（两个 dp 数组）

## 解法二：空间优化

### 思路

不需要完整的 dp 数组，只需要保存前两个状态

```python
def rob_optimized(nums):
    """
    打家劫舍 II（空间优化）
    """
    n = len(nums)
    
    if n == 0:
        return 0
    if n == 1:
        return nums[0]
    if n == 2:
        return max(nums[0], nums[1])
    
    # 情况1：不偷第一间
    case1 = rob_linear_optimized(nums, 1, n)
    
    # 情况2：不偷最后一间
    case2 = rob_linear_optimized(nums, 0, n - 1)
    
    return max(case1, case2)

def rob_linear_optimized(nums, start, end):
    """
    打家劫舍 I（空间优化）
    [start, end) 区间
    """
    if start >= end:
        return 0
    if start == end - 1:
        return nums[start]
    
    prev2 = nums[start]
    prev1 = max(nums[start], nums[start + 1])
    
    for i in range(start + 2, end):
        current = max(prev1, prev2 + nums[i])
        prev2 = prev1
        prev1 = current
    
    return prev1
```

### 复杂度分析

- **时间复杂度**：O(n)
- **空间复杂度**：O(1)（只用两个变量）

## 完整示例

### 示例1：`[2, 3, 2]`

```
房屋：[2, 3, 2]（环形）

情况1：不偷第一间，考虑 [3, 2]
  dp[0] = 3
  dp[1] = max(3, 2) = 3
  结果：3

情况2：不偷最后一间，考虑 [2, 3]
  dp[0] = 2
  dp[1] = max(2, 3) = 3
  结果：3

答案：max(3, 3) = 3
```

### 示例2：`[1, 2, 3, 1]`

```
房屋：[1, 2, 3, 1]（环形）

情况1：不偷第一间，考虑 [2, 3, 1]
  dp[0] = 2
  dp[1] = max(2, 3) = 3
  dp[2] = max(3, 2 + 1) = 3
  结果：3

情况2：不偷最后一间，考虑 [1, 2, 3]
  dp[0] = 1
  dp[1] = max(1, 2) = 2
  dp[2] = max(2, 1 + 3) = 4
  结果：4

答案：max(3, 4) = 4
```

## 解法三：统一处理

### 思路

用一个函数处理，通过参数控制区间

```python
def rob_unified(nums):
    """
    统一处理打家劫舍 II
    """
    def rob_range(start, end):
        """
        偷窃 [start, end] 区间
        """
        if start > end:
            return 0
        if start == end:
            return nums[start]
        
        prev2 = nums[start]
        prev1 = max(nums[start], nums[start + 1])
        
        for i in range(start + 2, end + 1):
            current = max(prev1, prev2 + nums[i])
            prev2 = prev1
            prev1 = current
        
        return prev1
    
    n = len(nums)
    
    if n == 0:
        return 0
    if n == 1:
        return nums[0]
    if n == 2:
        return max(nums[0], nums[1])
    
    # 不偷第一间 vs 不偷最后一间
    return max(rob_range(1, n - 1), rob_range(0, n - 2))
```

## 常见错误

### 错误1：忘记分类讨论

```python
# 错误：直接用打家劫舍 I 的代码
def rob_wrong(nums):
    n = len(nums)
    dp = [0] * n
    dp[0] = nums[0]
    dp[1] = max(nums[0], nums[1])
    
    for i in range(2, n):
        dp[i] = max(dp[i-1], dp[i-2] + nums[i])
    
    return dp[n-1]  # 错误！没有考虑环形约束

# 反例：[2, 3, 2]
# 会选择 nums[0] 和 nums[2]，但它们相邻（环形）
```

### 错误2：边界处理不当

```python
# 错误：没有处理 n == 1 和 n == 2
def rob_wrong2(nums):
    n = len(nums)
    
    # 直接调用 rob_linear，但 nums[1:] 或 nums[:n-1] 可能为空
    return max(rob_linear(nums[1:]), rob_linear(nums[:n-1]))

# 当 n == 1 时，nums[1:] 为空，rob_linear 返回 0
# 实际应该返回 nums[0]
```

### 错误3：区间重叠

```python
# 错误：两个区间有重叠
def rob_wrong3(nums):
    n = len(nums)
    
    # 区间 [0, n-1] 和 [1, n] 都包含了中间元素
    return max(rob_range(0, n-1), rob_range(1, n))

# 正确：[0, n-2] 和 [1, n-1]
```

## 变体问题

### 变体1：K 间相邻房屋不能同时偷

**问题**：相邻 k 间房屋不能同时偷

**思路**：
- 枚举第一间房偷或不偷
- 如果偷第一间房，则前 k 间房都不能偷
- 如果不偷第一间房，从第二间房开始考虑

```python
def rob_k_adjacent(nums, k):
    """
    K 间相邻房屋不能同时偷
    """
    n = len(nums)
    
    if n <= k:
        return max(nums) if nums else 0
    
    def rob_range(start, end, skip_first_k):
        dp = [0] * (end - start + 1)
        
        for i in range(start, end + 1):
            idx = i - start
            
            if skip_first_k and idx < k:
                # 跳过前 k 个
                continue
            
            dp[idx] = nums[i]
            for j in range(max(0, idx - k), idx):
                dp[idx] = max(dp[idx], dp[j] + nums[i])
        
        return max(dp)
    
    # 情况1：不偷第一间
    case1 = rob_range(1, n - 1, False)
    
    # 情况2：偷第一间（跳过第 2 到第 k 间）
    case2 = rob_range(0, n - k - 1, True)
    
    return max(case1, case2)
```

## 小结

### 核心思想
- **化环为链**：将环形问题分解为两个线性问题
- **分类讨论**：第一间房偷或不偷
- **取最大值**：比较两种情况的最优解

### 关键步骤
1. 特殊情况处理（`n <= 2`）
2. 情况1：不偷第一间房，求 `rob(nums[1:n])`
3. 情况2：不偷最后一间房，求 `rob(nums[0:n-1])`
4. 返回两者最大值

### 易错点
- ✓ 记得分类讨论
- ✓ 处理边界情况（`n == 1`, `n == 2`）
- ✗ 区间设置错误
- ✗ 忘记环形约束

### 性能优化
- **空间优化**：O(n) → O(1)
- **代码复用**：复用打家劫舍 I 的代码
- **统一接口**：用参数控制区间

这道题是**分类讨论**思想的经典应用：将复杂的环形约束，转化为两个简单的线性问题，体现了**化繁为简**的算法设计思想。
