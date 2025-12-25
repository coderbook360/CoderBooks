# 最长递增子序列模型

最长递增子序列（Longest Increasing Subsequence，LIS）是序列 DP 中最经典的问题。

## 问题定义

给定一个序列，找出其中最长的严格递增子序列的长度。

**子序列**：从原序列中选出若干元素，保持相对顺序不变。

**示例**：
```
nums = [10, 9, 2, 5, 3, 7, 101, 18]
LIS = [2, 3, 7, 101] 或 [2, 5, 7, 101] 或 [2, 3, 7, 18]
长度 = 4
```

## 方法一：O(n²) DP

### 状态定义

```
dp[i] = 以 nums[i] 结尾的最长递增子序列长度
```

**为什么要"以 i 结尾"？**

因为子序列需要满足递增性质，我们需要知道最后一个元素是什么，才能决定能否接上新元素。

### 状态转移

```
dp[i] = max(dp[j] + 1)，其中 j < i 且 nums[j] < nums[i]
```

如果找不到这样的 j，则 `dp[i] = 1`（只包含自己）。

### 代码实现

```typescript
/**
 * O(n²) DP
 * 时间复杂度：O(n²)
 * 空间复杂度：O(n)
 */
function lengthOfLIS(nums: number[]): number {
  const n = nums.length;
  if (n === 0) return 0;
  
  // dp[i] = 以 nums[i] 结尾的 LIS 长度
  const dp = new Array(n).fill(1);  // 至少包含自己
  
  for (let i = 1; i < n; i++) {
    for (let j = 0; j < i; j++) {
      if (nums[j] < nums[i]) {
        dp[i] = Math.max(dp[i], dp[j] + 1);
      }
    }
  }
  
  return Math.max(...dp);
}
```

### 示例演算

以 `nums = [10, 9, 2, 5, 3, 7, 101, 18]` 为例：

| i | nums[i] | dp[i] | 说明 |
|---|---------|-------|------|
| 0 | 10 | 1 | 只有自己 |
| 1 | 9 | 1 | 9 < 10，无法接 |
| 2 | 2 | 1 | 2 < 10, 2 < 9，无法接 |
| 3 | 5 | 2 | 可以接在 2 后面 |
| 4 | 3 | 2 | 可以接在 2 后面 |
| 5 | 7 | 3 | 可以接在 5 或 3 后面 |
| 6 | 101 | 4 | 可以接在 7 后面 |
| 7 | 18 | 4 | 可以接在 7 后面 |

最终答案：`max(dp) = 4`

## 方法二：O(n log n) 贪心 + 二分

### 核心思想

维护一个数组 `tails`，`tails[i]` 表示长度为 `i+1` 的 LIS 的最小末尾元素。

**贪心策略**：对于相同长度的 LIS，末尾元素越小，后续能接上的可能性越大。

### 算法流程

遍历每个元素 `x`：
1. 如果 `x` 大于 `tails` 的所有元素，追加到末尾
2. 否则，用 `x` 替换 `tails` 中第一个 >= `x` 的元素

### 代码实现

```typescript
/**
 * O(n log n) 贪心 + 二分
 * 时间复杂度：O(n log n)
 * 空间复杂度：O(n)
 */
function lengthOfLIS(nums: number[]): number {
  const tails: number[] = [];
  
  for (const x of nums) {
    // 二分查找：第一个 >= x 的位置
    let left = 0, right = tails.length;
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (tails[mid] < x) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }
    
    if (left === tails.length) {
      tails.push(x);  // x 比所有元素都大，追加
    } else {
      tails[left] = x;  // 替换
    }
  }
  
  return tails.length;
}
```

### 示例演算

以 `nums = [10, 9, 2, 5, 3, 7, 101, 18]` 为例：

| 步骤 | x | tails | 操作 |
|-----|---|-------|------|
| 1 | 10 | [10] | 追加 |
| 2 | 9 | [9] | 替换 10 |
| 3 | 2 | [2] | 替换 9 |
| 4 | 5 | [2, 5] | 追加 |
| 5 | 3 | [2, 3] | 替换 5 |
| 6 | 7 | [2, 3, 7] | 追加 |
| 7 | 101 | [2, 3, 7, 101] | 追加 |
| 8 | 18 | [2, 3, 7, 18] | 替换 101 |

最终长度：4

**注意**：`tails` 数组不是 LIS 本身，只是用于计算长度。

## 如何还原 LIS

如果需要输出具体的 LIS，需要记录额外信息：

```typescript
function findLIS(nums: number[]): number[] {
  const n = nums.length;
  if (n === 0) return [];
  
  const dp = new Array(n).fill(1);
  const prev = new Array(n).fill(-1);  // 记录前驱
  
  for (let i = 1; i < n; i++) {
    for (let j = 0; j < i; j++) {
      if (nums[j] < nums[i] && dp[j] + 1 > dp[i]) {
        dp[i] = dp[j] + 1;
        prev[i] = j;  // 记录从哪里转移来
      }
    }
  }
  
  // 找到最大值的位置
  let maxLen = 0, endIdx = 0;
  for (let i = 0; i < n; i++) {
    if (dp[i] > maxLen) {
      maxLen = dp[i];
      endIdx = i;
    }
  }
  
  // 回溯构造 LIS
  const lis: number[] = [];
  let idx = endIdx;
  while (idx !== -1) {
    lis.push(nums[idx]);
    idx = prev[idx];
  }
  
  return lis.reverse();
}
```

## LIS 的变种

### 非严格递增

如果允许相等（`<=`），修改比较条件：

```typescript
// 严格递增
if (nums[j] < nums[i])

// 非严格递增
if (nums[j] <= nums[i])
```

### 最长递减子序列

反转数组或反转比较：

```typescript
// 方法一：反转数组
lengthOfLIS(nums.reverse())

// 方法二：修改比较条件
if (nums[j] > nums[i])
```

### 最长摆动序列

交替递增递减：

```typescript
// 需要两个状态
up[i] = 以 nums[i] 结尾，最后是上升的最长长度
down[i] = 以 nums[i] 结尾，最后是下降的最长长度
```

## LIS 与其他问题的关系

| 问题 | 关系 |
|-----|------|
| 俄罗斯套娃信封 | 二维 LIS |
| 最长字符串链 | 字符串版 LIS |
| 堆箱子 | 三维 LIS |
| 最长递增子序列的个数 | LIS 计数 |
| 导弹拦截 | LIS + 贪心 |

## 复杂度对比

| 方法 | 时间复杂度 | 空间复杂度 | 优势 |
|-----|-----------|-----------|------|
| DP | O(n²) | O(n) | 简单直观，可还原路径 |
| 贪心+二分 | O(n log n) | O(n) | 效率高，适合大数据 |

## 本章小结

1. **状态定义**：`dp[i]` = 以 nums[i] 结尾的 LIS 长度
2. **O(n²) 解法**：枚举所有 j < i 进行转移
3. **O(n log n) 解法**：贪心 + 二分，维护最小末尾数组
4. **还原路径**：记录前驱索引，回溯构造

**下一章**：我们将学习最长公共子序列（LCS）模型。
