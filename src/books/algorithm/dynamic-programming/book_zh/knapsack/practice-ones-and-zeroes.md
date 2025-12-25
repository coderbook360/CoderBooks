# 实战：一和零

一和零是二维背包问题的经典案例，需要同时考虑两种容量限制。

## 题目描述

给你一个二进制字符串数组 `strs` 和两个整数 `m` 和 `n`。

请你找出并返回 `strs` 的最大子集的长度，该子集中最多有 `m` 个 0 和 `n` 个 1。

📎 [LeetCode 474. 一和零](https://leetcode.cn/problems/ones-and-zeroes/)

**示例**：

```
输入：strs = ["10", "0001", "111001", "1", "0"], m = 5, n = 3
输出：4
解释：最多有 5 个 0 和 3 个 1 的最大子集是 {"10", "0001", "1", "0"}
     共 4 个字符串
     "10" 有 1 个 0，1 个 1
     "0001" 有 3 个 0，1 个 1
     "1" 有 0 个 0，1 个 1
     "0" 有 1 个 0，0 个 1
```

**约束**：
- `1 <= strs.length <= 600`
- `1 <= strs[i].length <= 100`
- `strs[i]` 仅由 '0' 和 '1' 组成
- `1 <= m, n <= 100`

## 思路分析

### 为什么是二维背包？

- 物品：每个字符串
- 容量一：0 的个数限制（m）
- 容量二：1 的个数限制（n）
- 每个物品只能选一次 → 0-1 背包

这是一个 **二维 0-1 背包**问题。

### 状态定义

`dp[i][j]` = 使用最多 i 个 0 和 j 个 1 时，能选择的最大字符串数量

### 状态转移

对于每个字符串 str，设它包含 zeros 个 0 和 ones 个 1：

```
dp[i][j] = max(dp[i][j], dp[i - zeros][j - ones] + 1)
```

### 遍历顺序

0-1 背包，两个维度都要逆序遍历。

## 解法一：二维 DP

```typescript
/**
 * 二维 0-1 背包
 * 时间复杂度：O(l * m * n)，l 是字符串数量
 * 空间复杂度：O(m * n)
 */
function findMaxForm(strs: string[], m: number, n: number): number {
  // dp[i][j] = 使用最多 i 个 0 和 j 个 1 的最大子集大小
  const dp: number[][] = Array.from(
    { length: m + 1 },
    () => new Array(n + 1).fill(0)
  );
  
  for (const str of strs) {
    // 计算当前字符串的 0 和 1 数量
    let zeros = 0, ones = 0;
    for (const c of str) {
      if (c === '0') zeros++;
      else ones++;
    }
    
    // 逆序遍历（0-1 背包）
    for (let i = m; i >= zeros; i--) {
      for (let j = n; j >= ones; j--) {
        dp[i][j] = Math.max(dp[i][j], dp[i - zeros][j - ones] + 1);
      }
    }
  }
  
  return dp[m][n];
}
```

## 解法二：三维 DP（更直观）

```typescript
/**
 * 三维 DP
 * 时间复杂度：O(l * m * n)
 * 空间复杂度：O(l * m * n)
 */
function findMaxForm(strs: string[], m: number, n: number): number {
  const l = strs.length;
  
  // 预处理每个字符串的 0 和 1 数量
  const counts = strs.map(str => {
    let zeros = 0, ones = 0;
    for (const c of str) {
      if (c === '0') zeros++;
      else ones++;
    }
    return [zeros, ones];
  });
  
  // dp[k][i][j] = 考虑前 k 个字符串，使用最多 i 个 0 和 j 个 1 的最大子集大小
  const dp: number[][][] = Array.from(
    { length: l + 1 },
    () => Array.from(
      { length: m + 1 },
      () => new Array(n + 1).fill(0)
    )
  );
  
  for (let k = 1; k <= l; k++) {
    const [zeros, ones] = counts[k - 1];
    
    for (let i = 0; i <= m; i++) {
      for (let j = 0; j <= n; j++) {
        // 不选第 k 个字符串
        dp[k][i][j] = dp[k - 1][i][j];
        
        // 选第 k 个字符串（如果容量足够）
        if (i >= zeros && j >= ones) {
          dp[k][i][j] = Math.max(
            dp[k][i][j],
            dp[k - 1][i - zeros][j - ones] + 1
          );
        }
      }
    }
  }
  
  return dp[l][m][n];
}
```

## 解法三：记忆化搜索

```typescript
/**
 * 记忆化搜索
 * 时间复杂度：O(l * m * n)
 * 空间复杂度：O(l * m * n)
 */
function findMaxForm(strs: string[], m: number, n: number): number {
  // 预处理
  const counts = strs.map(str => {
    let zeros = 0, ones = 0;
    for (const c of str) {
      if (c === '0') zeros++;
      else ones++;
    }
    return [zeros, ones];
  });
  
  const memo: Map<string, number> = new Map();
  
  function dfs(index: number, zeroLeft: number, oneLeft: number): number {
    if (index >= strs.length) return 0;
    
    const key = `${index},${zeroLeft},${oneLeft}`;
    if (memo.has(key)) return memo.get(key)!;
    
    const [zeros, ones] = counts[index];
    
    // 不选当前字符串
    let result = dfs(index + 1, zeroLeft, oneLeft);
    
    // 选当前字符串（如果容量足够）
    if (zeroLeft >= zeros && oneLeft >= ones) {
      result = Math.max(
        result,
        dfs(index + 1, zeroLeft - zeros, oneLeft - ones) + 1
      );
    }
    
    memo.set(key, result);
    return result;
  }
  
  return dfs(0, m, n);
}
```

## 图示理解

```
strs = ["10", "0", "1"], m = 1, n = 1

预处理：
"10": zeros=1, ones=1
"0":  zeros=1, ones=0
"1":  zeros=0, ones=1

处理 "10":
dp[1][1] = max(0, dp[0][0] + 1) = 1

处理 "0":
dp[1][0] = max(0, dp[0][0] + 1) = 1
dp[1][1] = max(1, dp[0][1] + 1) = 1  // 不变

处理 "1":
dp[0][1] = max(0, dp[0][0] + 1) = 1
dp[1][1] = max(1, dp[1][0] + 1) = 2  // 选 "0" 和 "1"

答案：dp[1][1] = 2
```

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 |
|-----|-----------|-----------|
| 二维 DP | O(l × m × n) | O(m × n) |
| 三维 DP | O(l × m × n) | O(l × m × n) |
| 记忆化搜索 | O(l × m × n) | O(l × m × n) |

其中 l 是字符串数量。

## 与普通背包的对比

| 特点 | 普通 0-1 背包 | 二维背包 |
|-----|-------------|---------|
| 容量维度 | 1 维 | 2 维 |
| 状态数组 | dp[j] | dp[i][j] |
| 遍历层数 | 2 层 | 3 层 |
| 典型问题 | 分割等和子集 | 一和零 |

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [416. 分割等和子集](https://leetcode.cn/problems/partition-equal-subset-sum/) | 中等 | 一维背包 |
| [879. 盈利计划](https://leetcode.cn/problems/profitable-schemes/) | 困难 | 二维背包 + 方案数 |
| [1049. 最后一块石头的重量 II](https://leetcode.cn/problems/last-stone-weight-ii/) | 中等 | 一维背包 |

## 本章小结

1. **二维背包**：两种容量限制同时存在
2. **状态定义**：`dp[i][j]` = 两种资源分别用 i 和 j 时的最优值
3. **遍历顺序**：0-1 背包，两个维度都逆序
4. **空间优化**：可以从三维压缩到二维

**核心技巧**：
- 识别多维容量限制
- 预处理减少重复计算
- 逆序遍历保证 0-1 特性
