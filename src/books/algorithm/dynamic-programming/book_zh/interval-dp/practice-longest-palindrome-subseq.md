# 实战：最长回文子序列

## 题目描述

给你一个字符串 `s`，找出其中最长的回文子序列，并返回该序列的长度。

📎 [LeetCode 516. 最长回文子序列](https://leetcode.cn/problems/longest-palindromic-subsequence/)

**示例**：

```
输入：s = "bbbab"
输出：4
解释：最长回文子序列是 "bbbb"
```

**注意**：子序列不要求连续，子串要求连续。

## 问题分析

这道题是典型的区间 DP 问题：

- **子问题**：求 `s[i..j]` 中最长回文子序列的长度
- **选择**：两端字符是否选入回文序列

## 状态定义

```
dp[i][j] = s[i..j] 中最长回文子序列的长度
```

## 状态转移

```
如果 s[i] === s[j]:
    dp[i][j] = dp[i+1][j-1] + 2

否则:
    dp[i][j] = max(dp[i+1][j], dp[i][j-1])
```

**理解**：
- 两端相等：两端都可以选入回文，加上中间部分
- 两端不等：至少有一端不能选，取较优者

## 代码实现

### 方法一：二维 DP

```typescript
/**
 * 区间 DP
 * 时间复杂度：O(n²)
 * 空间复杂度：O(n²)
 */
function longestPalindromeSubseq(s: string): number {
  const n = s.length;
  
  // dp[i][j] = s[i..j] 中最长回文子序列长度
  const dp: number[][] = Array.from(
    { length: n },
    () => new Array(n).fill(0)
  );
  
  // base case：单个字符
  for (let i = 0; i < n; i++) {
    dp[i][i] = 1;
  }
  
  // 枚举长度（从 2 开始）
  for (let len = 2; len <= n; len++) {
    for (let i = 0; i + len - 1 < n; i++) {
      const j = i + len - 1;
      
      if (s[i] === s[j]) {
        dp[i][j] = dp[i + 1][j - 1] + 2;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j - 1]);
      }
    }
  }
  
  return dp[0][n - 1];
}
```

### 方法二：左端点逆序遍历

```typescript
function longestPalindromeSubseq(s: string): number {
  const n = s.length;
  const dp: number[][] = Array.from(
    { length: n },
    () => new Array(n).fill(0)
  );
  
  // 左端点逆序
  for (let i = n - 1; i >= 0; i--) {
    dp[i][i] = 1;  // base case
    
    for (let j = i + 1; j < n; j++) {
      if (s[i] === s[j]) {
        dp[i][j] = dp[i + 1][j - 1] + 2;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j - 1]);
      }
    }
  }
  
  return dp[0][n - 1];
}
```

### 方法三：空间优化（一维数组）

```typescript
/**
 * 空间优化
 * 时间复杂度：O(n²)
 * 空间复杂度：O(n)
 */
function longestPalindromeSubseq(s: string): number {
  const n = s.length;
  const dp = new Array(n).fill(0);
  
  for (let i = n - 1; i >= 0; i--) {
    dp[i] = 1;  // dp[i][i] = 1
    let prev = 0;  // dp[i+1][j-1]
    
    for (let j = i + 1; j < n; j++) {
      const temp = dp[j];  // 保存 dp[i+1][j]
      
      if (s[i] === s[j]) {
        dp[j] = prev + 2;
      } else {
        dp[j] = Math.max(dp[j], dp[j - 1]);
      }
      
      prev = temp;
    }
  }
  
  return dp[n - 1];
}
```

## 示例演算

以 `s = "bbbab"` 为例：

```
初始：dp[i][i] = 1

长度 2：
  dp[0][1] = s[0]=s[1]='b' → dp[0][1] = 0 + 2 = 2
  dp[1][2] = s[1]=s[2]='b' → dp[1][2] = 0 + 2 = 2
  dp[2][3] = 'b'≠'a' → max(1, 1) = 1
  dp[3][4] = 'a'≠'b' → max(1, 1) = 1

长度 3：
  dp[0][2] = s[0]=s[2]='b' → dp[1][1] + 2 = 3
  dp[1][3] = 'b'≠'a' → max(dp[2][3], dp[1][2]) = max(1, 2) = 2
  dp[2][4] = 'b'='b' → dp[3][3] + 2 = 3

长度 4：
  dp[0][3] = 'b'≠'a' → max(dp[1][3], dp[0][2]) = max(2, 3) = 3
  dp[1][4] = s[1]=s[4]='b' → dp[2][3] + 2 = 3

长度 5：
  dp[0][4] = s[0]=s[4]='b' → dp[1][3] + 2 = 4

答案：4（"bbbb"）
```

## 与"最长回文子串"的对比

| 特性 | 子串 | 子序列 |
|-----|------|--------|
| 连续性 | 必须连续 | 可以不连续 |
| 状态含义 | 是否是回文 | 最长回文长度 |
| 转移 | 两端相等 + 中间是回文 | 两端相等 + 中间长度 + 2 |

## 本章小结

1. **子序列 vs 子串**：子序列允许跳跃选取
2. **状态设计**：`dp[i][j]` = 区间内最长回文子序列长度
3. **转移关键**：两端相等则 +2，否则取子问题最大值
4. **空间优化**：利用一维数组 + prev 变量

## 相关题目

- [5. 最长回文子串](./practice-longest-palindrome.md)
- [647. 回文子串](./practice-palindromic-substrings.md)
- [1312. 让字符串成为回文串的最少插入次数](https://leetcode.cn/problems/minimum-insertion-steps-to-make-a-string-palindrome/)
