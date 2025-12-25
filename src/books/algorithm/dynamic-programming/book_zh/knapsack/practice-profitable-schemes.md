# 实战：盈利计划

盈利计划是二维背包的进阶应用，同时限制人数和利润，求方案数。

## 题目描述

集团里有 `n` 名员工，他们可以完成各种各样的工作创造利润。

第 `i` 种工作会产生 `profit[i]` 的利润，它要求 `group[i]` 名成员共同参与。如果成员参与了其中一项工作，就不能参与另一项工作。

工作的任何至少产生 `minProfit` 利润的子集称为盈利计划。并且工作的成员总数最多为 `n`。

有多少种计划可以选择？因为答案很大，所以返回结果模 `10^9 + 7` 的值。

📎 [LeetCode 879. 盈利计划](https://leetcode.cn/problems/profitable-schemes/)

**示例**：

```
输入：n = 5, minProfit = 3, group = [2,2], profit = [2,3]
输出：2
解释：至少产生 3 的利润，有两种计划：
     (1) 选择第 2 项工作，利润 3
     (2) 选择两项工作，利润 5

输入：n = 10, minProfit = 5, group = [2,3,5], profit = [6,7,8]
输出：7
```

**约束**：
- `1 <= n <= 100`
- `0 <= minProfit <= 100`
- `1 <= group.length <= 100`
- `1 <= group[i] <= 100`
- `profit.length == group.length`
- `0 <= profit[i] <= 100`

## 思路分析

### 问题分析

这是一个**二维 0-1 背包的方案数问题**：
- 物品：每项工作
- 容量一：员工人数（n）
- 容量二：利润目标（minProfit）
- 目标：方案数（至少达到 minProfit）

### 与"一和零"的区别

| 问题 | 容量约束 | 目标 | 利润处理 |
|-----|---------|------|---------|
| 一和零 | 恰好 ≤ m, ≤ n | 最大数量 | - |
| 盈利计划 | ≤ n, **≥** minProfit | 方案数 | 超过也算 |

关键区别：利润可以超过 minProfit，所以利润维度需要特殊处理。

### 状态定义

`dp[j][k]` = 最多使用 j 名员工，利润至少为 k 的方案数

### 利润维度的处理

由于利润可以超过 minProfit，我们用 `min(k + p, minProfit)` 来约束利润维度：
- 利润达到 minProfit 后，再高也视为 minProfit
- 这样状态数不会爆炸

### 状态转移

```
dp[j][k] += dp[j - g][max(0, k - p)]
```

其中：
- g = group[i]（当前工作需要的人数）
- p = profit[i]（当前工作的利润）
- `max(0, k - p)`：利润可以为负，但我们取 0

## 解法一：二维 DP

```typescript
/**
 * 二维 DP
 * 时间复杂度：O(m * n * minProfit)
 * 空间复杂度：O(n * minProfit)
 */
function profitableSchemes(
  n: number,
  minProfit: number,
  group: number[],
  profit: number[]
): number {
  const MOD = 1e9 + 7;
  const m = group.length;
  
  // dp[j][k] = 最多用 j 人，利润至少 k 的方案数
  const dp: number[][] = Array.from(
    { length: n + 1 },
    () => new Array(minProfit + 1).fill(0)
  );
  
  // 初始化：0 人 0 利润有一种方案（不选任何工作）
  dp[0][0] = 1;
  
  for (let i = 0; i < m; i++) {
    const g = group[i];
    const p = profit[i];
    
    // 逆序遍历（0-1 背包）
    for (let j = n; j >= g; j--) {
      for (let k = minProfit; k >= 0; k--) {
        // 注意：利润可以超过 minProfit，用 max(0, k-p) 处理
        const prevProfit = Math.max(0, k - p);
        dp[j][k] = (dp[j][k] + dp[j - g][prevProfit]) % MOD;
      }
    }
  }
  
  // 统计所有人数下，利润至少为 minProfit 的方案数
  let result = 0;
  for (let j = 0; j <= n; j++) {
    result = (result + dp[j][minProfit]) % MOD;
  }
  
  return result;
}
```

### 优化：答案直接取 dp[n][minProfit]

```typescript
function profitableSchemes(
  n: number,
  minProfit: number,
  group: number[],
  profit: number[]
): number {
  const MOD = 1e9 + 7;
  
  // dp[j][k] = 最多用 j 人，利润至少 k 的方案数
  const dp: number[][] = Array.from(
    { length: n + 1 },
    () => new Array(minProfit + 1).fill(0)
  );
  
  // 初始化：任意人数，利润 0 都有一种方案
  for (let j = 0; j <= n; j++) {
    dp[j][0] = 1;
  }
  
  for (let i = 0; i < group.length; i++) {
    const g = group[i];
    const p = profit[i];
    
    for (let j = n; j >= g; j--) {
      for (let k = minProfit; k >= 0; k--) {
        const prevProfit = Math.max(0, k - p);
        dp[j][k] = (dp[j][k] + dp[j - g][prevProfit]) % MOD;
      }
    }
  }
  
  return dp[n][minProfit];
}
```

## 解法二：三维 DP

```typescript
/**
 * 三维 DP（更清晰的逻辑）
 * 时间复杂度：O(m * n * minProfit)
 * 空间复杂度：O(m * n * minProfit)
 */
function profitableSchemes(
  n: number,
  minProfit: number,
  group: number[],
  profit: number[]
): number {
  const MOD = 1e9 + 7;
  const m = group.length;
  
  // dp[i][j][k] = 考虑前 i 项工作，最多 j 人，利润至少 k 的方案数
  const dp: number[][][] = Array.from(
    { length: m + 1 },
    () => Array.from(
      { length: n + 1 },
      () => new Array(minProfit + 1).fill(0)
    )
  );
  
  // 初始化
  for (let j = 0; j <= n; j++) {
    dp[0][j][0] = 1;
  }
  
  for (let i = 1; i <= m; i++) {
    const g = group[i - 1];
    const p = profit[i - 1];
    
    for (let j = 0; j <= n; j++) {
      for (let k = 0; k <= minProfit; k++) {
        // 不选第 i 项工作
        dp[i][j][k] = dp[i - 1][j][k];
        
        // 选第 i 项工作
        if (j >= g) {
          const prevProfit = Math.max(0, k - p);
          dp[i][j][k] = (dp[i][j][k] + dp[i - 1][j - g][prevProfit]) % MOD;
        }
      }
    }
  }
  
  return dp[m][n][minProfit];
}
```

## 解法三：记忆化搜索

```typescript
/**
 * 记忆化搜索
 * 时间复杂度：O(m * n * minProfit)
 * 空间复杂度：O(m * n * minProfit)
 */
function profitableSchemes(
  n: number,
  minProfit: number,
  group: number[],
  profit: number[]
): number {
  const MOD = 1e9 + 7;
  const m = group.length;
  const memo: Map<string, number> = new Map();
  
  function dfs(index: number, people: number, curProfit: number): number {
    if (index === m) {
      return curProfit >= minProfit ? 1 : 0;
    }
    
    // 利润超过 minProfit 也视为 minProfit
    const key = `${index},${people},${Math.min(curProfit, minProfit)}`;
    if (memo.has(key)) return memo.get(key)!;
    
    // 不选当前工作
    let result = dfs(index + 1, people, curProfit);
    
    // 选当前工作
    if (people + group[index] <= n) {
      result = (result + dfs(index + 1, people + group[index], curProfit + profit[index])) % MOD;
    }
    
    memo.set(key, result);
    return result;
  }
  
  return dfs(0, 0, 0);
}
```

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 |
|-----|-----------|-----------|
| 二维 DP | O(m × n × minProfit) | O(n × minProfit) |
| 三维 DP | O(m × n × minProfit) | O(m × n × minProfit) |
| 记忆化搜索 | O(m × n × minProfit) | O(m × n × minProfit) |

## 关键技巧

### 1. 利润维度的压缩

利润可能超过 minProfit，但超过后都等价于"达标"，所以用 `max(0, k - p)` 处理：

```typescript
const prevProfit = Math.max(0, k - p);
```

这样利润维度最多只有 minProfit + 1 个状态。

### 2. 初始化的理解

`dp[j][0] = 1`：使用最多 j 人，利润至少 0 的方案数是 1（不选任何工作）。

### 3. 方案数用累加

与最值问题不同，方案数问题用 `+=` 而不是 `max()`。

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [474. 一和零](https://leetcode.cn/problems/ones-and-zeroes/) | 中等 | 二维背包，最值 |
| [416. 分割等和子集](https://leetcode.cn/problems/partition-equal-subset-sum/) | 中等 | 一维背包 |
| [494. 目标和](https://leetcode.cn/problems/target-sum/) | 中等 | 方案数 |

## 本章小结

1. **二维背包 + 方案数**：综合了多种技巧
2. **利润维度压缩**：超过目标也算达标
3. **初始化**：理解"0 利润"的方案数
4. **取模运算**：大数问题必须取模

**核心技巧**：
- "至少"用 `max(0, k - p)` 处理
- 方案数用累加
- 记得取模
