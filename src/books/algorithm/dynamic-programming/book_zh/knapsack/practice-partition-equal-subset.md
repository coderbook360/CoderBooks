# 实战：分割等和子集

分割等和子集是 0-1 背包的经典应用，将"选择"问题转化为"是否能装满背包"的可行性问题。

## 题目描述

给你一个只包含正整数的非空数组 `nums`。请你判断是否可以将这个数组分割成两个子集，使得两个子集的元素和相等。

📎 [LeetCode 416. 分割等和子集](https://leetcode.cn/problems/partition-equal-subset-sum/)

**示例**：

```
输入：nums = [1, 5, 11, 5]
输出：true
解释：数组可以分割成 [1, 5, 5] 和 [11]

输入：nums = [1, 2, 3, 5]
输出：false
解释：数组不能分割成两个元素和相等的子集
```

**约束**：
- `1 <= nums.length <= 200`
- `1 <= nums[i] <= 100`

## 思路分析

### 问题转化

两个子集和相等，意味着每个子集的和都是 `sum/2`。

问题转化为：**能否从数组中选出一些数，使它们的和等于 sum/2？**

这就是一个 **0-1 背包的可行性问题**：
- 物品：数组中的每个数
- 重量 = 价值 = nums[i]
- 背包容量：sum/2
- 目标：能否恰好装满背包

### 提前剪枝

1. 如果 sum 是奇数，不可能分成两个相等的整数，直接返回 false
2. 如果最大元素 > sum/2，也不可能分割成功

### 状态定义

`dp[i][j]` = 是否能从前 i 个数中选出若干个，使和恰好为 j

### 状态转移

```
dp[i][j] = dp[i-1][j] || dp[i-1][j-nums[i]]
           不选第i个    选第i个
```

## 解法一：二维 DP

```typescript
/**
 * 二维 DP
 * 时间复杂度：O(n * target)
 * 空间复杂度：O(n * target)
 */
function canPartition(nums: number[]): boolean {
  const sum = nums.reduce((a, b) => a + b, 0);
  
  // 剪枝：和为奇数不可能分割
  if (sum % 2 !== 0) return false;
  
  const target = sum / 2;
  const n = nums.length;
  
  // dp[i][j] = 前 i 个数能否凑出和 j
  const dp: boolean[][] = Array.from(
    { length: n + 1 },
    () => new Array(target + 1).fill(false)
  );
  
  // 边界：和为 0 总是可以（不选任何数）
  for (let i = 0; i <= n; i++) {
    dp[i][0] = true;
  }
  
  for (let i = 1; i <= n; i++) {
    const num = nums[i - 1];
    for (let j = 1; j <= target; j++) {
      if (j >= num) {
        dp[i][j] = dp[i - 1][j] || dp[i - 1][j - num];
      } else {
        dp[i][j] = dp[i - 1][j];
      }
    }
  }
  
  return dp[n][target];
}
```

## 解法二：一维 DP（空间优化）

```typescript
/**
 * 一维 DP
 * 时间复杂度：O(n * target)
 * 空间复杂度：O(target)
 */
function canPartition(nums: number[]): boolean {
  const sum = nums.reduce((a, b) => a + b, 0);
  
  if (sum % 2 !== 0) return false;
  
  const target = sum / 2;
  const dp = new Array(target + 1).fill(false);
  dp[0] = true;
  
  for (const num of nums) {
    // 逆序遍历，0-1 背包
    for (let j = target; j >= num; j--) {
      dp[j] = dp[j] || dp[j - num];
    }
    
    // 提前终止：如果已经能凑出 target
    if (dp[target]) return true;
  }
  
  return dp[target];
}
```

### 进一步优化：位运算

使用 BigInt 位运算可以并行处理所有状态：

```typescript
/**
 * 位运算优化
 * 时间复杂度：O(n * target / 64)
 * 空间复杂度：O(target / 64)
 */
function canPartition(nums: number[]): boolean {
  const sum = nums.reduce((a, b) => a + b, 0);
  
  if (sum % 2 !== 0) return false;
  
  const target = sum / 2;
  let dp = 1n;  // 初始状态：只有 0 可达
  
  for (const num of nums) {
    dp |= dp << BigInt(num);
  }
  
  return (dp & (1n << BigInt(target))) !== 0n;
}
```

## 解法三：记忆化搜索

```typescript
/**
 * 记忆化搜索
 * 时间复杂度：O(n * target)
 * 空间复杂度：O(n * target)
 */
function canPartition(nums: number[]): boolean {
  const sum = nums.reduce((a, b) => a + b, 0);
  
  if (sum % 2 !== 0) return false;
  
  const target = sum / 2;
  const memo: Map<string, boolean> = new Map();
  
  function dfs(index: number, remain: number): boolean {
    if (remain === 0) return true;
    if (index >= nums.length || remain < 0) return false;
    
    const key = `${index},${remain}`;
    if (memo.has(key)) return memo.get(key)!;
    
    // 选或不选第 index 个数
    const result = dfs(index + 1, remain - nums[index]) || dfs(index + 1, remain);
    memo.set(key, result);
    return result;
  }
  
  return dfs(0, target);
}
```

## 输出具体分割方案

```typescript
function partitionSubsets(nums: number[]): [number[], number[]] | null {
  const sum = nums.reduce((a, b) => a + b, 0);
  
  if (sum % 2 !== 0) return null;
  
  const target = sum / 2;
  const n = nums.length;
  
  // dp 表
  const dp: boolean[][] = Array.from(
    { length: n + 1 },
    () => new Array(target + 1).fill(false)
  );
  
  for (let i = 0; i <= n; i++) dp[i][0] = true;
  
  for (let i = 1; i <= n; i++) {
    const num = nums[i - 1];
    for (let j = 1; j <= target; j++) {
      if (j >= num) {
        dp[i][j] = dp[i - 1][j] || dp[i - 1][j - num];
      } else {
        dp[i][j] = dp[i - 1][j];
      }
    }
  }
  
  if (!dp[n][target]) return null;
  
  // 回溯找出选中的元素
  const subset1: number[] = [];
  const subset2: number[] = [];
  
  let j = target;
  for (let i = n; i > 0; i--) {
    const num = nums[i - 1];
    if (j >= num && dp[i - 1][j - num]) {
      subset1.push(num);
      j -= num;
    } else {
      subset2.push(num);
    }
  }
  
  return [subset1, subset2];
}
```

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 |
|-----|-----------|-----------|
| 二维 DP | O(n × target) | O(n × target) |
| 一维 DP | O(n × target) | O(target) |
| 位运算 | O(n × target/64) | O(target/64) |
| 记忆化搜索 | O(n × target) | O(n × target) |

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [698. 划分为k个相等的子集](https://leetcode.cn/problems/partition-to-k-equal-sum-subsets/) | 中等 | k 等分 |
| [473. 火柴拼正方形](https://leetcode.cn/problems/matchsticks-to-square/) | 中等 | 4 等分 |
| [1049. 最后一块石头的重量 II](https://leetcode.cn/problems/last-stone-weight-ii/) | 中等 | 最小差值 |

## 本章小结

1. **问题转化**：两子集相等 → 能否选出和为 sum/2 的子集
2. **背包模型**：0-1 背包的可行性问题
3. **空间优化**：逆序遍历，一维数组
4. **位运算优化**：并行处理所有状态

**核心技巧**：
- 判断奇偶性提前剪枝
- 0-1 背包必须逆序遍历
- 找到 target 可以提前终止
