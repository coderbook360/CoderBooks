# 实战：分割回文串 II

## 题目描述

给你一个字符串 `s`，请你将 `s` 分割成一些子串，使每个子串都是回文串。

返回符合要求的**最少分割次数**。

📎 [LeetCode 132. 分割回文串 II](https://leetcode.cn/problems/palindrome-partitioning-ii/)

**示例**：

```
输入：s = "aab"
输出：1
解释：一次分割得到 ["aa", "b"]
```

## 问题分析

这道题需要两步：
1. 预处理：判断所有子串是否是回文
2. DP：求最少分割次数

## 方法一：两阶段 DP

### 阶段一：预处理回文判断

```
isPalin[i][j] = s[i..j] 是否是回文串
```

### 阶段二：线性 DP

```
dp[i] = s[0..i] 的最少分割次数
```

### 代码实现

```typescript
/**
 * 两阶段 DP
 * 时间复杂度：O(n²)
 * 空间复杂度：O(n²)
 */
function minCut(s: string): number {
  const n = s.length;
  
  // 阶段一：预处理回文判断
  const isPalin: boolean[][] = Array.from(
    { length: n },
    () => new Array(n).fill(false)
  );
  
  // 区间 DP 判断回文
  for (let i = n - 1; i >= 0; i--) {
    for (let j = i; j < n; j++) {
      if (s[i] === s[j]) {
        isPalin[i][j] = (j - i <= 2) || isPalin[i + 1][j - 1];
      }
    }
  }
  
  // 阶段二：线性 DP 求最少分割
  const dp = new Array(n).fill(0);
  
  for (let i = 0; i < n; i++) {
    if (isPalin[0][i]) {
      // 整个 [0, i] 是回文，不需要分割
      dp[i] = 0;
    } else {
      // 最坏情况：每个字符单独一段
      dp[i] = i;
      
      // 枚举最后一个回文的起点
      for (let j = 1; j <= i; j++) {
        if (isPalin[j][i]) {
          dp[i] = Math.min(dp[i], dp[j - 1] + 1);
        }
      }
    }
  }
  
  return dp[n - 1];
}
```

## 方法二：中心扩展优化

预处理回文可以用中心扩展，边扩展边更新 DP。

```typescript
/**
 * 中心扩展优化
 * 时间复杂度：O(n²)
 * 空间复杂度：O(n)
 */
function minCut(s: string): number {
  const n = s.length;
  
  // dp[i] = s[0..i] 的最少分割次数
  const dp = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    dp[i] = i;  // 最坏情况
  }
  
  // 中心扩展
  function expand(left: number, right: number): void {
    while (left >= 0 && right < n && s[left] === s[right]) {
      // [left, right] 是回文
      if (left === 0) {
        dp[right] = 0;
      } else {
        dp[right] = Math.min(dp[right], dp[left - 1] + 1);
      }
      left--;
      right++;
    }
  }
  
  for (let i = 0; i < n; i++) {
    expand(i, i);      // 奇数长度
    expand(i, i + 1);  // 偶数长度
  }
  
  return dp[n - 1];
}
```

## 方法三：区间 DP（直接求解）

直接用区间 DP 也可以，但效率稍低。

```typescript
function minCut(s: string): number {
  const n = s.length;
  
  // 预处理回文
  const isPalin: boolean[][] = Array.from(
    { length: n },
    () => new Array(n).fill(false)
  );
  
  for (let i = n - 1; i >= 0; i--) {
    for (let j = i; j < n; j++) {
      if (s[i] === s[j]) {
        isPalin[i][j] = (j - i <= 2) || isPalin[i + 1][j - 1];
      }
    }
  }
  
  // 区间 DP
  const dp: number[][] = Array.from(
    { length: n },
    () => new Array(n).fill(Infinity)
  );
  
  for (let i = 0; i < n; i++) {
    dp[i][i] = 0;  // 单字符不需要分割
  }
  
  for (let len = 2; len <= n; len++) {
    for (let i = 0; i + len - 1 < n; i++) {
      const j = i + len - 1;
      
      if (isPalin[i][j]) {
        dp[i][j] = 0;
      } else {
        for (let k = i; k < j; k++) {
          dp[i][j] = Math.min(dp[i][j], dp[i][k] + dp[k + 1][j] + 1);
        }
      }
    }
  }
  
  return dp[0][n - 1];
}
```

## 示例演算

以 `s = "aab"` 为例：

```
阶段一（回文预处理）：
  isPalin[0][0] = true  "a"
  isPalin[1][1] = true  "a"
  isPalin[2][2] = true  "b"
  isPalin[0][1] = true  "aa"
  isPalin[1][2] = false "ab"
  isPalin[0][2] = false "aab"

阶段二（线性 DP）：
  i = 0: isPalin[0][0] = true → dp[0] = 0
  i = 1: isPalin[0][1] = true → dp[1] = 0
  i = 2: isPalin[0][2] = false
         j = 1: isPalin[1][2] = false
         j = 2: isPalin[2][2] = true → dp[2] = dp[1] + 1 = 1
         dp[2] = 1

答案：1
```

## 方法对比

| 方法 | 时间 | 空间 | 特点 |
|-----|------|------|------|
| 两阶段 DP | O(n²) | O(n²) | 最清晰 |
| 中心扩展 | O(n²) | O(n) | 空间最优 |
| 纯区间 DP | O(n³) | O(n²) | 效率较低 |

## 本章小结

1. **分解问题**：先处理回文判断，再处理分割
2. **线性 DP 思路**：枚举最后一段回文的起点
3. **优化技巧**：中心扩展可以节省空间

## 相关题目

- [131. 分割回文串](https://leetcode.cn/problems/palindrome-partitioning/)（回溯，求所有方案）
- [5. 最长回文子串](./practice-longest-palindrome.md)
- [516. 最长回文子序列](./practice-longest-palindrome-subseq.md)
