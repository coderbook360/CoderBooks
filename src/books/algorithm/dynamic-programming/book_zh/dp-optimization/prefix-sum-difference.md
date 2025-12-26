# 前缀和/差分优化

## 核心思想

> 利用前缀和实现区间求和O(1)查询，利用差分实现区间修改O(1)操作，将DP中的区间操作复杂度降低。

**时间优化**：O(n²) → O(n) 或 O(n log n)

## 前缀和优化

### 基本前缀和

**定义**：
```
prefix[i] = sum(arr[0:i])
prefix[0] = 0
prefix[i] = prefix[i-1] + arr[i-1]
```

**区间和查询**：
```
sum(arr[l:r]) = prefix[r] - prefix[l]
```

**示例：子数组和**
```python
def subarray_sum(nums, k):
    """
    查找和为 k 的子数组数量
    """
    prefix_count = {0: 1}
    prefix_sum = 0
    count = 0
    
    for num in nums:
        prefix_sum += num
        # 查找 prefix_sum - k
        if prefix_sum - k in prefix_count:
            count += prefix_count[prefix_sum - k]
        
        prefix_count[prefix_sum] = prefix_count.get(prefix_sum, 0) + 1
    
    return count

# 测试
print(subarray_sum([1, 1, 1], 2))  # 2
print(subarray_sum([1, 2, 3], 3))  # 2
```

### 二维前缀和

**定义**：
```
prefix[i][j] = sum(matrix[0:i][0:j])
prefix[i][j] = prefix[i-1][j] + prefix[i][j-1] 
             - prefix[i-1][j-1] + matrix[i-1][j-1]
```

**区间和查询**（子矩阵 `[r1:r2][c1:c2]`）：
```
sum = prefix[r2][c2] - prefix[r1][c2] 
    - prefix[r2][c1] + prefix[r1][c1]
```

**示例：二维区域和检索**
```python
class NumMatrix:
    def __init__(self, matrix):
        if not matrix or not matrix[0]:
            return
        
        m, n = len(matrix), len(matrix[0])
        self.prefix = [[0] * (n + 1) for _ in range(m + 1)]
        
        for i in range(1, m + 1):
            for j in range(1, n + 1):
                self.prefix[i][j] = (self.prefix[i-1][j] + 
                                    self.prefix[i][j-1] - 
                                    self.prefix[i-1][j-1] + 
                                    matrix[i-1][j-1])
    
    def sumRegion(self, r1, c1, r2, c2):
        return (self.prefix[r2+1][c2+1] - 
                self.prefix[r1][c2+1] - 
                self.prefix[r2+1][c1] + 
                self.prefix[r1][c1])

# 测试
matrix = [[3, 0, 1, 4, 2],
          [5, 6, 3, 2, 1],
          [1, 2, 0, 1, 5]]
nm = NumMatrix(matrix)
print(nm.sumRegion(1, 1, 2, 3))  # 8
```

## 差分优化

### 一维差分

**定义**：
```
diff[i] = arr[i] - arr[i-1]
arr[i] = diff[0] + diff[1] + ... + diff[i]
```

**区间修改**（`arr[l:r]` 都加 delta）：
```
diff[l] += delta
diff[r] -= delta
```

**示例：区间加法**
```python
class RangeAddition:
    def __init__(self, n):
        self.diff = [0] * (n + 1)
    
    def add_range(self, left, right, delta):
        """区间 [left, right] 都加 delta"""
        self.diff[left] += delta
        self.diff[right + 1] -= delta
    
    def get_array(self):
        """还原数组"""
        n = len(self.diff) - 1
        arr = [0] * n
        cumsum = 0
        for i in range(n):
            cumsum += self.diff[i]
            arr[i] = cumsum
        return arr

# 测试
ra = RangeAddition(5)
ra.add_range(0, 2, 5)  # [5, 5, 5, 0, 0]
ra.add_range(1, 3, 3)  # [5, 8, 8, 3, 0]
print(ra.get_array())  # [5, 8, 8, 3, 0]
```

### 二维差分

**定义**：
```
diff[i][j] 使得 prefix_sum(diff) = matrix
```

**区间修改**（子矩阵 `[r1:r2][c1:c2]` 都加 delta）：
```
diff[r1][c1] += delta
diff[r1][c2+1] -= delta
diff[r2+1][c1] -= delta
diff[r2+1][c2+1] += delta
```

**示例：二维差分**
```python
class Matrix2DDiff:
    def __init__(self, m, n):
        self.diff = [[0] * (n + 2) for _ in range(m + 2)]
    
    def add_region(self, r1, c1, r2, c2, delta):
        """子矩阵 [r1:r2][c1:c2] 都加 delta"""
        self.diff[r1][c1] += delta
        self.diff[r1][c2+1] -= delta
        self.diff[r2+1][c1] -= delta
        self.diff[r2+1][c2+1] += delta
    
    def get_matrix(self, m, n):
        """还原矩阵"""
        matrix = [[0] * n for _ in range(m)]
        
        # 行前缀和
        for i in range(m):
            for j in range(n):
                matrix[i][j] = self.diff[i][j]
                if j > 0:
                    matrix[i][j] += matrix[i][j-1]
        
        # 列前缀和
        for i in range(1, m):
            for j in range(n):
                matrix[i][j] += matrix[i-1][j]
        
        return matrix

# 测试
md = Matrix2DDiff(3, 3)
md.add_region(0, 0, 1, 1, 5)
md.add_region(1, 1, 2, 2, 3)
print(md.get_matrix(3, 3))
```

## DP 中的应用

### 示例一：最大子数组和

**问题**：求最大连续子数组和。

**前缀和 + 最小前缀和**：
```python
def maxSubArray(nums):
    """
    sum[i:j] = prefix[j] - prefix[i]
    最大化 = prefix[j] - min(prefix[0:j])
    """
    prefix = 0
    min_prefix = 0
    max_sum = float('-inf')
    
    for num in nums:
        prefix += num
        max_sum = max(max_sum, prefix - min_prefix)
        min_prefix = min(min_prefix, prefix)
    
    return max_sum

# 测试
print(maxSubArray([-2, 1, -3, 4, -1, 2, 1, -5, 4]))  # 6
```

### 示例二：等差数列划分

**问题**：数组中等差数列（长度≥3）的子数组数量。

**差分判断**：
```python
def numberOfArithmeticSlices(nums):
    """
    用差分数组判断等差数列
    """
    if len(nums) < 3:
        return 0
    
    diff = [nums[i+1] - nums[i] for i in range(len(nums) - 1)]
    
    count = 0
    length = 1
    
    for i in range(1, len(diff)):
        if diff[i] == diff[i-1]:
            length += 1
        else:
            # 长度为 k 的等差数列有 C(k, 3) 个子数组
            count += length * (length - 1) // 2
            length = 1
    
    count += length * (length - 1) // 2
    
    return count

# 测试
print(numberOfArithmeticSlices([1, 2, 3, 4]))  # 3
```

### 示例三：区间DP + 前缀和

**问题**：石子合并（前面讲过）。

**状态转移**：
```
dp[i][j] = min(dp[i][k] + dp[k+1][j]) + sum(stones[i:j+1])
                                        ↑
                                     用前缀和O(1)计算
```

```python
def mergeStones_with_prefix(stones):
    n = len(stones)
    
    # 前缀和
    prefix = [0] * (n + 1)
    for i in range(n):
        prefix[i+1] = prefix[i] + stones[i]
    
    dp = [[0] * n for _ in range(n)]
    
    for length in range(2, n + 1):
        for i in range(n - length + 1):
            j = i + length - 1
            dp[i][j] = float('inf')
            
            for k in range(i, j):
                # O(1) 计算区间和
                cost = dp[i][k] + dp[k+1][j] + (prefix[j+1] - prefix[i])
                dp[i][j] = min(dp[i][j], cost)
    
    return dp[0][n-1]
```

## 组合技巧：前缀和 + 哈希表

**问题**：连续子数组和为 k 的倍数。

```python
def checkSubarraySum(nums, k):
    """
    利用前缀和的余数
    """
    prefix_mod = {0: -1}
    prefix = 0
    
    for i, num in enumerate(nums):
        prefix += num
        mod = prefix % k if k != 0 else prefix
        
        if mod in prefix_mod:
            if i - prefix_mod[mod] > 1:
                return True
        else:
            prefix_mod[mod] = i
    
    return False

# 测试
print(checkSubarraySum([23, 2, 4, 6, 7], 6))  # True
```

## 小结

| 技巧 | 操作 | 复杂度 | 适用场景 |
|-----|-----|-------|---------|
| 前缀和 | 区间和查询 | O(1) | 静态数组 |
| 差分 | 区间修改 | O(1) | 批量修改 |
| 前缀和+哈希 | 子数组和等于k | O(n) | 目标和问题 |
| 二维前缀和 | 子矩阵和 | O(1) | 二维区域 |

**优化原则**：
1. 频繁区间和查询 → 前缀和
2. 批量区间修改 → 差分
3. 目标和问题 → 前缀和 + 哈希表
4. DP 中的区间和 → 预处理前缀和
