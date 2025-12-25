# 实战：回文子串计数

## 题目描述

给你一个字符串 `s`，请你统计并返回这个字符串中回文子串的数目。

📎 [LeetCode 647. 回文子串](https://leetcode.cn/problems/palindromic-substrings/)

**示例**：

```
输入：s = "aaa"
输出：6
解释：6 个回文子串为 "a", "a", "a", "aa", "aa", "aaa"
```

## 方法一：区间 DP

### 状态定义

与上一题相同：

```
dp[i][j] = s[i..j] 是否是回文串
```

### 代码实现

```typescript
/**
 * 区间 DP
 * 时间复杂度：O(n²)
 * 空间复杂度：O(n²)
 */
function countSubstrings(s: string): number {
  const n = s.length;
  const dp: boolean[][] = Array.from(
    { length: n },
    () => new Array(n).fill(false)
  );
  
  let count = 0;
  
  // 枚举长度
  for (let len = 1; len <= n; len++) {
    for (let i = 0; i + len - 1 < n; i++) {
      const j = i + len - 1;
      
      if (len === 1) {
        dp[i][j] = true;
      } else if (len === 2) {
        dp[i][j] = s[i] === s[j];
      } else {
        dp[i][j] = s[i] === s[j] && dp[i + 1][j - 1];
      }
      
      if (dp[i][j]) count++;
    }
  }
  
  return count;
}
```

## 方法二：中心扩展

```typescript
/**
 * 中心扩展
 * 时间复杂度：O(n²)
 * 空间复杂度：O(1)
 */
function countSubstrings(s: string): number {
  const n = s.length;
  let count = 0;
  
  function expandAroundCenter(left: number, right: number): number {
    let cnt = 0;
    while (left >= 0 && right < n && s[left] === s[right]) {
      cnt++;
      left--;
      right++;
    }
    return cnt;
  }
  
  for (let i = 0; i < n; i++) {
    count += expandAroundCenter(i, i);      // 奇数长度
    count += expandAroundCenter(i, i + 1);  // 偶数长度
  }
  
  return count;
}
```

## 方法三：Manacher 算法

```typescript
/**
 * Manacher 算法
 * 时间复杂度：O(n)
 * 空间复杂度：O(n)
 */
function countSubstrings(s: string): number {
  // 预处理
  const t = '#' + s.split('').join('#') + '#';
  const n = t.length;
  const p = new Array(n).fill(0);
  
  let center = 0, right = 0;
  
  for (let i = 0; i < n; i++) {
    if (i < right) {
      p[i] = Math.min(right - i, p[2 * center - i]);
    }
    
    // 扩展
    let l = i - p[i] - 1;
    let r = i + p[i] + 1;
    while (l >= 0 && r < n && t[l] === t[r]) {
      p[i]++;
      l--;
      r++;
    }
    
    if (i + p[i] > right) {
      center = i;
      right = i + p[i];
    }
  }
  
  // 计算回文数量
  // p[i] 表示以 i 为中心的回文半径
  // 对应原字符串中的回文数 = (p[i] + 1) / 2（向上取整）
  let count = 0;
  for (let i = 0; i < n; i++) {
    count += Math.floor((p[i] + 1) / 2);
  }
  
  return count;
}
```

## 示例演算

以 `s = "aaa"` 为例（区间 DP）：

```
长度 1：a(0), a(1), a(2) → 3 个
长度 2：aa(0,1), aa(1,2) → 2 个
长度 3：aaa(0,2) → 1 个

总计：6 个
```

## 本章小结

1. 本题与"最长回文子串"思路完全相同
2. 只需统计所有 `dp[i][j] = true` 的数量
3. 中心扩展法更省空间
4. Manacher 时间最优，但需要理解回文数量与半径的关系

## 相关题目

- [5. 最长回文子串](./practice-longest-palindrome.md)
- [516. 最长回文子序列](./practice-longest-palindrome-subseq.md)
