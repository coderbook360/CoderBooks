# 最长公共子序列模型

最长公共子序列（Longest Common Subsequence，LCS）是双序列 DP 的基础问题。

## 问题定义

给定两个序列，找出它们的最长公共子序列的长度。

**公共子序列**：同时是两个序列的子序列。

**示例**：
```
s1 = "abcde"
s2 = "ace"
LCS = "ace"
长度 = 3
```

## 状态定义

```
dp[i][j] = s1[0..i-1] 和 s2[0..j-1] 的最长公共子序列长度
```

**为什么用 i-1 和 j-1？**

为了方便处理边界：`dp[0][j]` 和 `dp[i][0]` 表示空串，值为 0。

## 状态转移

```
如果 s1[i-1] === s2[j-1]:
    dp[i][j] = dp[i-1][j-1] + 1    // 公共字符，LCS 长度 +1

否则:
    dp[i][j] = max(dp[i-1][j], dp[i][j-1])  // 取较长的
```

**直观理解**：
- 相等时：两个都往前推，长度 +1
- 不等时：要么丢 s1 的最后一个，要么丢 s2 的最后一个

## 代码实现

```typescript
/**
 * 最长公共子序列
 * 时间复杂度：O(m × n)
 * 空间复杂度：O(m × n)
 */
function longestCommonSubsequence(s1: string, s2: string): number {
  const m = s1.length, n = s2.length;
  
  // dp[i][j] = s1[0..i-1] 和 s2[0..j-1] 的 LCS 长度
  const dp: number[][] = Array.from(
    { length: m + 1 },
    () => new Array(n + 1).fill(0)
  );
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  
  return dp[m][n];
}
```

## 示例演算

以 `s1 = "abcde"`, `s2 = "ace"` 为例：

|   | "" | a | c | e |
|---|---|---|---|---|
| "" | 0 | 0 | 0 | 0 |
| a | 0 | **1** | 1 | 1 |
| b | 0 | 1 | 1 | 1 |
| c | 0 | 1 | **2** | 2 |
| d | 0 | 1 | 2 | 2 |
| e | 0 | 1 | 2 | **3** |

最终答案：3

## 空间优化

由于 `dp[i][j]` 只依赖 `dp[i-1][j]`、`dp[i][j-1]`、`dp[i-1][j-1]`，可以优化到 O(n)：

```typescript
function longestCommonSubsequence(s1: string, s2: string): number {
  const m = s1.length, n = s2.length;
  const dp = new Array(n + 1).fill(0);
  
  for (let i = 1; i <= m; i++) {
    let prev = 0;  // dp[i-1][j-1]
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];  // 保存 dp[i-1][j]，下一轮变成 dp[i-1][j-1]
      if (s1[i - 1] === s2[j - 1]) {
        dp[j] = prev + 1;
      } else {
        dp[j] = Math.max(dp[j], dp[j - 1]);
      }
      prev = temp;
    }
  }
  
  return dp[n];
}
```

## 还原 LCS

如果需要输出具体的 LCS 字符串：

```typescript
function findLCS(s1: string, s2: string): string {
  const m = s1.length, n = s2.length;
  const dp: number[][] = Array.from(
    { length: m + 1 },
    () => new Array(n + 1).fill(0)
  );
  
  // 填表
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  
  // 回溯
  let i = m, j = n;
  const lcs: string[] = [];
  
  while (i > 0 && j > 0) {
    if (s1[i - 1] === s2[j - 1]) {
      lcs.push(s1[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  
  return lcs.reverse().join('');
}
```

## LCS 的变种

### 最长公共子串（连续）

子串要求连续，状态定义不同：

```typescript
// dp[i][j] = 以 s1[i-1] 和 s2[j-1] 结尾的最长公共子串长度
if (s1[i-1] === s2[j-1]) {
  dp[i][j] = dp[i-1][j-1] + 1;
} else {
  dp[i][j] = 0;  // 不相等就断开
}
```

### 最短公共超序列

包含两个字符串的最短序列：

```
最短公共超序列长度 = m + n - LCS 长度
```

### 编辑距离

把一个字符串变成另一个的最小操作数，是 LCS 的泛化。

## LCS 与编辑距离的关系

```
编辑距离（只允许删除）= m + n - 2 × LCS 长度
```

这是因为：把 s1 变成 s2，可以先删除 s1 中不属于 LCS 的字符，再插入 s2 中不属于 LCS 的字符。

## 多序列 LCS

三个或更多序列的 LCS：

```typescript
// 三序列 LCS
dp[i][j][k] = s1[0..i-1], s2[0..j-1], s3[0..k-1] 的 LCS 长度

if (s1[i-1] === s2[j-1] && s2[j-1] === s3[k-1]) {
  dp[i][j][k] = dp[i-1][j-1][k-1] + 1;
} else {
  dp[i][j][k] = max(dp[i-1][j][k], dp[i][j-1][k], dp[i][j][k-1]);
}
```

时间复杂度：O(l × m × n)

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 |
|-----|-----------|-----------|
| 标准 DP | O(m × n) | O(m × n) |
| 空间优化 | O(m × n) | O(min(m, n)) |
| 带回溯 | O(m × n) | O(m × n) |

## 经典应用

| 应用场景 | 说明 |
|---------|------|
| diff 工具 | 文件差异比较 |
| Git | 代码合并 |
| 生物信息学 | DNA/蛋白质序列比对 |
| 拼写检查 | 相似度计算 |

## 本章小结

1. **状态定义**：`dp[i][j]` = 两个前缀的 LCS 长度
2. **转移方程**：相等时 +1，不等时取 max
3. **空间优化**：可以优化到 O(n)
4. **还原路径**：回溯 dp 数组

**下一章**：我们将通过具体的 LeetCode 题目来实战 LIS 和 LCS。
