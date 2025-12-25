# 实战：最长公共子序列

最长公共子序列（LCS）是双序列 DP 的经典问题，是理解二维 DP 的最佳入门案例。

## 题目描述

给定两个字符串 `text1` 和 `text2`，返回这两个字符串的最长公共子序列的长度。如果不存在公共子序列，返回 0。

**子序列**是从原字符串删除一些字符（可以不删除）后，不改变剩余字符相对顺序形成的新字符串。

📎 [LeetCode 1143. 最长公共子序列](https://leetcode.cn/problems/longest-common-subsequence/)

**示例**：

```
输入：text1 = "abcde", text2 = "ace"
输出：3
解释：最长公共子序列是 "ace"，长度为 3

输入：text1 = "abc", text2 = "def"
输出：0
解释：没有公共子序列
```

**约束**：
- `1 <= text1.length, text2.length <= 1000`
- `text1` 和 `text2` 仅由小写英文字符组成

## 思路分析

### 为什么需要二维 DP？

单序列问题用一维 `dp[i]`，双序列问题需要二维 `dp[i][j]` 来同时追踪两个序列的位置。

### 状态定义

`dp[i][j]` = `text1[0..i-1]` 和 `text2[0..j-1]` 的最长公共子序列长度

即：text1 的前 i 个字符和 text2 的前 j 个字符的 LCS 长度。

### 状态转移

比较 `text1[i-1]` 和 `text2[j-1]`：

**情况一：相等**
```
如果 text1[i-1] == text2[j-1]：
  这个字符一定在 LCS 中
  dp[i][j] = dp[i-1][j-1] + 1
```

**情况二：不相等**
```
如果 text1[i-1] != text2[j-1]：
  这两个字符至少有一个不在 LCS 中
  dp[i][j] = max(dp[i-1][j], dp[i][j-1])
```

### 图示理解

```
    ""  a   c   e
""   0   0   0   0
a    0   1   1   1
b    0   1   1   1
c    0   1   2   2
d    0   1   2   2
e    0   1   2   3

text1 = "abcde", text2 = "ace"
LCS = "ace", 长度 = 3
```

### 转移方向

```
dp[i-1][j-1]  →  dp[i-1][j]
     ↓              ↓
dp[i][j-1]    →  dp[i][j]
```

- 如果字符相等：从左上角 + 1
- 如果不等：取上方和左方的较大值

## 解法一：递推

```typescript
/**
 * 递推
 * 时间复杂度：O(m * n)
 * 空间复杂度：O(m * n)
 */
function longestCommonSubsequence(text1: string, text2: string): number {
  const m = text1.length;
  const n = text2.length;
  
  // dp[i][j] = text1 前 i 个字符和 text2 前 j 个字符的 LCS 长度
  const dp: number[][] = Array.from(
    { length: m + 1 },
    () => new Array(n + 1).fill(0)
  );
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (text1[i - 1] === text2[j - 1]) {
        // 字符相等，LCS 长度 + 1
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        // 字符不等，取较大者
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  
  return dp[m][n];
}
```

## 解法二：空间优化

`dp[i][j]` 只依赖三个值：`dp[i-1][j-1]`、`dp[i-1][j]`、`dp[i][j-1]`

可以用一维数组 + 一个变量来优化：

```typescript
/**
 * 空间优化
 * 时间复杂度：O(m * n)
 * 空间复杂度：O(n)
 */
function longestCommonSubsequence(text1: string, text2: string): number {
  const m = text1.length;
  const n = text2.length;
  
  const dp = new Array(n + 1).fill(0);
  
  for (let i = 1; i <= m; i++) {
    let prev = 0;  // dp[i-1][j-1]
    
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];  // 保存 dp[i-1][j]，下一轮它就是 dp[i-1][j-1]
      
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

## 解法三：记忆化搜索

```typescript
/**
 * 记忆化搜索
 * 时间复杂度：O(m * n)
 * 空间复杂度：O(m * n)
 */
function longestCommonSubsequence(text1: string, text2: string): number {
  const m = text1.length;
  const n = text2.length;
  const memo: number[][] = Array.from(
    { length: m },
    () => new Array(n).fill(-1)
  );
  
  function lcs(i: number, j: number): number {
    // 边界：任一字符串为空
    if (i < 0 || j < 0) return 0;
    
    // 查备忘录
    if (memo[i][j] !== -1) return memo[i][j];
    
    if (text1[i] === text2[j]) {
      memo[i][j] = lcs(i - 1, j - 1) + 1;
    } else {
      memo[i][j] = Math.max(lcs(i - 1, j), lcs(i, j - 1));
    }
    
    return memo[i][j];
  }
  
  return lcs(m - 1, n - 1);
}
```

## 输出具体的 LCS

```typescript
function findLCS(text1: string, text2: string): string {
  const m = text1.length;
  const n = text2.length;
  
  // 先计算 dp 表
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
  
  // 回溯构建 LCS
  let lcs = '';
  let i = m, j = n;
  
  while (i > 0 && j > 0) {
    if (text1[i - 1] === text2[j - 1]) {
      lcs = text1[i - 1] + lcs;
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  
  return lcs;
}
```

## 变体问题

### 变体一：最长公共子串

📎 [LeetCode 718. 最长重复子数组](https://leetcode.cn/problems/maximum-length-of-repeated-subarray/)

子串必须连续，子序列可以不连续。

```typescript
function findLength(nums1: number[], nums2: number[]): number {
  const m = nums1.length;
  const n = nums2.length;
  
  // dp[i][j] = 以 nums1[i-1] 和 nums2[j-1] 结尾的最长公共子串
  const dp: number[][] = Array.from(
    { length: m + 1 },
    () => new Array(n + 1).fill(0)
  );
  
  let maxLen = 0;
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (nums1[i - 1] === nums2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
        maxLen = Math.max(maxLen, dp[i][j]);
      }
      // 不相等时 dp[i][j] = 0（必须连续）
    }
  }
  
  return maxLen;
}
```

**子序列 vs 子串**：

| 类型 | 连续性 | 不相等时 |
|-----|-------|---------|
| 子序列 | 不要求 | `max(dp[i-1][j], dp[i][j-1])` |
| 子串 | 必须连续 | `0` |

### 变体二：最短公共超序列

📎 [LeetCode 1092. 最短公共超序列](https://leetcode.cn/problems/shortest-common-supersequence/)

```typescript
function shortestCommonSupersequence(str1: string, str2: string): string {
  const m = str1.length;
  const n = str2.length;
  
  // 先求 LCS 的 dp 表
  const dp: number[][] = Array.from(
    { length: m + 1 },
    () => new Array(n + 1).fill(0)
  );
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  
  // 回溯构建超序列
  let result = '';
  let i = m, j = n;
  
  while (i > 0 || j > 0) {
    if (i === 0) {
      result = str2[--j] + result;
    } else if (j === 0) {
      result = str1[--i] + result;
    } else if (str1[i - 1] === str2[j - 1]) {
      result = str1[i - 1] + result;
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      result = str1[--i] + result;
    } else {
      result = str2[--j] + result;
    }
  }
  
  return result;
}
```

### 变体三：删除操作使两字符串相同

📎 [LeetCode 583. 两个字符串的删除操作](https://leetcode.cn/problems/delete-operation-for-two-strings/)

```typescript
function minDistance(word1: string, word2: string): number {
  const lcs = longestCommonSubsequence(word1, word2);
  return word1.length + word2.length - 2 * lcs;
}
```

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 |
|-----|-----------|-----------|
| 递推 | O(m × n) | O(m × n) |
| 空间优化 | O(m × n) | O(n) |
| 记忆化搜索 | O(m × n) | O(m × n) |

## 本章小结

1. **双序列 DP 模板**：`dp[i][j]` 表示两个序列前缀的关系
2. **转移逻辑**：
   - 字符相等：`dp[i-1][j-1] + 1`
   - 字符不等：`max(dp[i-1][j], dp[i][j-1])`
3. **空间优化**：一维数组 + 额外变量保存左上角
4. **输出结果**：回溯 dp 表

**LCS 的应用**：
- 文件差异比较（diff）
- DNA 序列比对
- 版本控制系统
