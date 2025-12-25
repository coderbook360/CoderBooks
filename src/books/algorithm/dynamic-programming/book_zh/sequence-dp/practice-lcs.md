# 实战：最长公共子序列

## 题目描述

给定两个字符串 `text1` 和 `text2`，返回这两个字符串的最长公共子序列的长度。如果不存在公共子序列，返回 `0`。

一个字符串的子序列是指这样一个新的字符串：它是由原字符串在不改变字符的相对顺序的情况下删除某些字符（也可以不删除任何字符）后组成的新字符串。

📎 [LeetCode 1143. 最长公共子序列](https://leetcode.cn/problems/longest-common-subsequence/)

**示例**：

```
输入：text1 = "abcde", text2 = "ace" 
输出：3  
解释：最长公共子序列是 "ace"，它的长度为 3
```

## 状态定义

```
dp[i][j] = text1[0..i-1] 和 text2[0..j-1] 的最长公共子序列长度
```

## 状态转移

```
如果 text1[i-1] === text2[j-1]:
    dp[i][j] = dp[i-1][j-1] + 1
否则:
    dp[i][j] = max(dp[i-1][j], dp[i][j-1])
```

## 代码实现

### 标准 DP

```typescript
/**
 * 最长公共子序列
 * 时间复杂度：O(m × n)
 * 空间复杂度：O(m × n)
 */
function longestCommonSubsequence(text1: string, text2: string): number {
  const m = text1.length, n = text2.length;
  
  const dp: number[][] = Array.from(
    { length: m + 1 },
    () => new Array(n + 1).fill(0)
  );
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (text1[i - 1] === text2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  
  return dp[m][n];
}
```

### 空间优化

```typescript
/**
 * 空间优化版本
 * 时间复杂度：O(m × n)
 * 空间复杂度：O(n)
 */
function longestCommonSubsequence(text1: string, text2: string): number {
  const m = text1.length, n = text2.length;
  const dp = new Array(n + 1).fill(0);
  
  for (let i = 1; i <= m; i++) {
    let prev = 0;  // dp[i-1][j-1]
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];  // 保存 dp[i-1][j]
      if (text1[i - 1] === text2[j - 1]) {
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

## 示例演算

以 `text1 = "abcde"`, `text2 = "ace"` 为例：

|   | "" | a | c | e |
|---|---|---|---|---|
| "" | 0 | 0 | 0 | 0 |
| a | 0 | **1** | 1 | 1 |
| b | 0 | 1 | 1 | 1 |
| c | 0 | 1 | **2** | 2 |
| d | 0 | 1 | 2 | 2 |
| e | 0 | 1 | 2 | **3** |

对角线上的粗体数字是字符匹配时 +1 的位置。

## 还原 LCS 字符串

```typescript
function findLCS(text1: string, text2: string): string {
  const m = text1.length, n = text2.length;
  
  const dp: number[][] = Array.from(
    { length: m + 1 },
    () => new Array(n + 1).fill(0)
  );
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (text1[i - 1] === text2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  
  // 回溯构造 LCS
  let i = m, j = n;
  const lcs: string[] = [];
  
  while (i > 0 && j > 0) {
    if (text1[i - 1] === text2[j - 1]) {
      lcs.push(text1[i - 1]);
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

## 状态转移图解

```
text1[i-1] === text2[j-1]:
┌─────────────┐     ┌─────────────┐
│ dp[i-1][j-1]│ ──→ │  dp[i][j]   │
│             │ +1  │             │
└─────────────┘     └─────────────┘

text1[i-1] !== text2[j-1]:
┌─────────────┐
│ dp[i-1][j]  │ ──┐
└─────────────┘   │     ┌─────────────┐
                  ├──→  │  dp[i][j]   │  = max
┌─────────────┐   │     └─────────────┘
│ dp[i][j-1]  │ ──┘
└─────────────┘
```

## 与最长公共子串的区别

| 问题 | 特点 | 转移 |
|-----|------|------|
| 子序列 | 不连续 | 不等时取 max |
| 子串 | 连续 | 不等时归零 |

```typescript
// 最长公共子串
if (text1[i-1] === text2[j-1]) {
  dp[i][j] = dp[i-1][j-1] + 1;
} else {
  dp[i][j] = 0;  // 断开
}
```

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 |
|-----|-----------|-----------|
| 标准 DP | O(m × n) | O(m × n) |
| 空间优化 | O(m × n) | O(min(m, n)) |

## 相关题目

- [583. 两个字符串的删除操作](https://leetcode.cn/problems/delete-operation-for-two-strings/)
- [712. 两个字符串的最小ASCII删除和](https://leetcode.cn/problems/minimum-ascii-delete-sum-for-two-strings/)
- [1035. 不相交的线](https://leetcode.cn/problems/uncrossed-lines/)（本质相同）

## 本章小结

1. **状态定义**：`dp[i][j]` = 两个前缀的 LCS 长度
2. **转移方程**：匹配时 +1，不匹配取 max
3. **空间优化**：用滚动变量保存 `dp[i-1][j-1]`
4. **还原路径**：回溯 dp 数组
