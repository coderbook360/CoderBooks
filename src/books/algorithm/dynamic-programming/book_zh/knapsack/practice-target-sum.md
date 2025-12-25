# 实战：目标和

目标和是 0-1 背包的方案数问题，需要巧妙的数学转化。

## 题目描述

给你一个非负整数数组 `nums` 和一个整数 `target`。向数组中的每个整数前添加 `+` 或 `-`，然后串联起所有整数，可以构造一个表达式。

返回可以通过上述方法构造的、运算结果等于 `target` 的不同表达式的数目。

📎 [LeetCode 494. 目标和](https://leetcode.cn/problems/target-sum/)

**示例**：

```
输入：nums = [1, 1, 1, 1, 1], target = 3
输出：5
解释：
-1 + 1 + 1 + 1 + 1 = 3
+1 - 1 + 1 + 1 + 1 = 3
+1 + 1 - 1 + 1 + 1 = 3
+1 + 1 + 1 - 1 + 1 = 3
+1 + 1 + 1 + 1 - 1 = 3
```

**约束**：
- `1 <= nums.length <= 20`
- `0 <= nums[i] <= 1000`
- `0 <= sum(nums[i]) <= 1000`
- `-1000 <= target <= 1000`

## 思路分析

### 方法一：直接搜索（回溯）

每个数有两种选择：+ 或 -，共 2^n 种组合。

```typescript
function findTargetSumWays(nums: number[], target: number): number {
  let count = 0;
  
  function backtrack(index: number, sum: number) {
    if (index === nums.length) {
      if (sum === target) count++;
      return;
    }
    
    backtrack(index + 1, sum + nums[index]);  // +
    backtrack(index + 1, sum - nums[index]);  // -
  }
  
  backtrack(0, 0);
  return count;
}
```

时间复杂度 O(2^n)，太慢了。

### 方法二：问题转化为背包

设添加 + 号的数之和为 P，添加 - 号的数之和为 N。

```
P - N = target
P + N = sum
```

解这个方程：
```
P = (target + sum) / 2
```

问题转化为：**从数组中选出若干个数，使它们的和等于 P，有多少种选法？**

这就是 **0-1 背包的方案数问题**！

### 边界条件

1. 如果 `target + sum` 是奇数，无解
2. 如果 `|target| > sum`，无解
3. P 必须是非负整数

## 解法一：二维 DP

```typescript
/**
 * 二维 DP
 * 时间复杂度：O(n * P)
 * 空间复杂度：O(n * P)
 */
function findTargetSumWays(nums: number[], target: number): number {
  const sum = nums.reduce((a, b) => a + b, 0);
  
  // 边界检查
  if ((sum + target) % 2 !== 0) return 0;
  if (Math.abs(target) > sum) return 0;
  
  const P = (sum + target) / 2;
  if (P < 0) return 0;
  
  const n = nums.length;
  
  // dp[i][j] = 从前 i 个数中选，和为 j 的方案数
  const dp: number[][] = Array.from(
    { length: n + 1 },
    () => new Array(P + 1).fill(0)
  );
  
  dp[0][0] = 1;  // 不选任何数，和为 0，有一种方案
  
  for (let i = 1; i <= n; i++) {
    const num = nums[i - 1];
    for (let j = 0; j <= P; j++) {
      dp[i][j] = dp[i - 1][j];  // 不选第 i 个数
      if (j >= num) {
        dp[i][j] += dp[i - 1][j - num];  // 选第 i 个数
      }
    }
  }
  
  return dp[n][P];
}
```

### 处理 0 的特殊情况

注意：当 `nums[i] = 0` 时，选或不选都不影响和，所以需要特殊处理。

上面的代码已经正确处理了：当 `j = 0` 且 `num = 0` 时，`dp[i][0] = dp[i-1][0] + dp[i-1][0] = 2 * dp[i-1][0]`。

## 解法二：一维 DP（空间优化）

```typescript
/**
 * 一维 DP
 * 时间复杂度：O(n * P)
 * 空间复杂度：O(P)
 */
function findTargetSumWays(nums: number[], target: number): number {
  const sum = nums.reduce((a, b) => a + b, 0);
  
  if ((sum + target) % 2 !== 0) return 0;
  if (Math.abs(target) > sum) return 0;
  
  const P = (sum + target) / 2;
  if (P < 0) return 0;
  
  const dp = new Array(P + 1).fill(0);
  dp[0] = 1;
  
  for (const num of nums) {
    // 逆序遍历，0-1 背包
    for (let j = P; j >= num; j--) {
      dp[j] += dp[j - num];
    }
  }
  
  return dp[P];
}
```

## 解法三：记忆化搜索

```typescript
/**
 * 记忆化搜索
 * 时间复杂度：O(n * sum)
 * 空间复杂度：O(n * sum)
 */
function findTargetSumWays(nums: number[], target: number): number {
  const memo: Map<string, number> = new Map();
  
  function dfs(index: number, sum: number): number {
    if (index === nums.length) {
      return sum === target ? 1 : 0;
    }
    
    const key = `${index},${sum}`;
    if (memo.has(key)) return memo.get(key)!;
    
    const result = dfs(index + 1, sum + nums[index]) + dfs(index + 1, sum - nums[index]);
    memo.set(key, result);
    return result;
  }
  
  return dfs(0, 0);
}
```

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 |
|-----|-----------|-----------|
| 回溯 | O(2^n) | O(n) |
| 二维 DP | O(n × P) | O(n × P) |
| 一维 DP | O(n × P) | O(P) |
| 记忆化搜索 | O(n × sum) | O(n × sum) |

其中 P = (sum + target) / 2。

## 问题转化的数学推导

```
设 P = 选择 + 的数之和
设 N = 选择 - 的数之和

有：
  P - N = target  ... (1)
  P + N = sum     ... (2)

(1) + (2) 得：
  2P = target + sum
  P = (target + sum) / 2
```

这个转化是这类问题的关键技巧。

## 变体：返回具体方案

```typescript
function findTargetSumWaysWithPaths(nums: number[], target: number): string[] {
  const results: string[] = [];
  
  function backtrack(index: number, sum: number, path: string) {
    if (index === nums.length) {
      if (sum === target) {
        results.push(path);
      }
      return;
    }
    
    backtrack(
      index + 1,
      sum + nums[index],
      path + '+' + nums[index]
    );
    backtrack(
      index + 1,
      sum - nums[index],
      path + '-' + nums[index]
    );
  }
  
  backtrack(0, 0, '');
  return results;
}
```

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [416. 分割等和子集](https://leetcode.cn/problems/partition-equal-subset-sum/) | 中等 | 可行性问题 |
| [1049. 最后一块石头的重量 II](https://leetcode.cn/problems/last-stone-weight-ii/) | 中等 | 最小差值 |
| [879. 盈利计划](https://leetcode.cn/problems/profitable-schemes/) | 困难 | 二维背包 |

## 本章小结

1. **问题转化**：`P - N = target` → `P = (sum + target) / 2`
2. **背包模型**：0-1 背包的方案数问题
3. **状态转移**：`dp[j] += dp[j - num]`
4. **边界检查**：奇偶性、范围

**核心技巧**：
- 数学变换简化问题
- 方案数用累加而非取最大
- 注意处理 0 元素和边界条件
