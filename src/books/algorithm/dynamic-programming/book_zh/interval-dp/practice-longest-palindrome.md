# 实战：最长回文子串

## 题目描述

给你一个字符串 `s`，找到 `s` 中最长的回文子串。

📎 [LeetCode 5. 最长回文子串](https://leetcode.cn/problems/longest-palindromic-substring/)

**示例**：

```
输入：s = "babad"
输出："bab"
解释："aba" 也是一个有效答案
```

## 方法一：区间 DP

### 状态定义

```
dp[i][j] = s[i..j] 是否是回文串
```

### 状态转移

```
如果 s[i] === s[j]:
    dp[i][j] = dp[i+1][j-1] (当 j - i >= 2)
    dp[i][j] = true (当 j - i < 2)

否则:
    dp[i][j] = false
```

### 代码实现

```typescript
/**
 * 区间 DP
 * 时间复杂度：O(n²)
 * 空间复杂度：O(n²)
 */
function longestPalindrome(s: string): string {
  const n = s.length;
  if (n === 0) return '';
  
  // dp[i][j] = s[i..j] 是否是回文串
  const dp: boolean[][] = Array.from(
    { length: n },
    () => new Array(n).fill(false)
  );
  
  let start = 0, maxLen = 1;
  
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
      
      if (dp[i][j] && len > maxLen) {
        start = i;
        maxLen = len;
      }
    }
  }
  
  return s.substring(start, start + maxLen);
}
```

## 方法二：中心扩展

从每个位置向两边扩展，检查回文。

```typescript
/**
 * 中心扩展
 * 时间复杂度：O(n²)
 * 空间复杂度：O(1)
 */
function longestPalindrome(s: string): string {
  const n = s.length;
  if (n === 0) return '';
  
  let start = 0, maxLen = 1;
  
  function expandAroundCenter(left: number, right: number): void {
    while (left >= 0 && right < n && s[left] === s[right]) {
      if (right - left + 1 > maxLen) {
        start = left;
        maxLen = right - left + 1;
      }
      left--;
      right++;
    }
  }
  
  for (let i = 0; i < n; i++) {
    expandAroundCenter(i, i);      // 奇数长度
    expandAroundCenter(i, i + 1);  // 偶数长度
  }
  
  return s.substring(start, start + maxLen);
}
```

## 方法三：Manacher 算法

O(n) 时间复杂度的算法，较为复杂。

```typescript
/**
 * Manacher 算法
 * 时间复杂度：O(n)
 * 空间复杂度：O(n)
 */
function longestPalindrome(s: string): string {
  // 预处理：插入分隔符
  const t = '#' + s.split('').join('#') + '#';
  const n = t.length;
  
  // p[i] = 以 t[i] 为中心的最长回文半径
  const p = new Array(n).fill(0);
  
  let center = 0, right = 0;  // 当前最右边的回文中心和右边界
  let maxCenter = 0, maxLen = 0;
  
  for (let i = 0; i < n; i++) {
    // 利用对称性
    if (i < right) {
      const mirror = 2 * center - i;
      p[i] = Math.min(right - i, p[mirror]);
    }
    
    // 中心扩展
    let left = i - p[i] - 1;
    let r = i + p[i] + 1;
    while (left >= 0 && r < n && t[left] === t[r]) {
      p[i]++;
      left--;
      r++;
    }
    
    // 更新最右边界
    if (i + p[i] > right) {
      center = i;
      right = i + p[i];
    }
    
    // 更新最长回文
    if (p[i] > maxLen) {
      maxLen = p[i];
      maxCenter = i;
    }
  }
  
  // 还原原始字符串中的位置
  const startInT = maxCenter - maxLen;
  const start = Math.floor(startInT / 2);
  
  return s.substring(start, start + maxLen);
}
```

## 示例演算

以 `s = "babad"` 为例（区间 DP）：

|   | b | a | b | a | d |
|---|---|---|---|---|---|
| b | T | F | T | F | F |
| a |   | T | F | T | F |
| b |   |   | T | F | F |
| a |   |   |   | T | F |
| d |   |   |   |   | T |

最长回文：`dp[0][2] = true`（"bab"）或 `dp[1][3] = true`（"aba"）

## 三种方法对比

| 方法 | 时间 | 空间 | 特点 |
|-----|------|------|------|
| 区间 DP | O(n²) | O(n²) | 最直观 |
| 中心扩展 | O(n²) | O(1) | 空间最优 |
| Manacher | O(n) | O(n) | 时间最优 |

## 区间 DP 的另一种写法

```typescript
function longestPalindrome(s: string): string {
  const n = s.length;
  const dp: boolean[][] = Array.from(
    { length: n },
    () => new Array(n).fill(false)
  );
  
  let start = 0, maxLen = 1;
  
  // 左端点逆序
  for (let i = n - 1; i >= 0; i--) {
    for (let j = i; j < n; j++) {
      if (s[i] === s[j]) {
        if (j - i <= 2 || dp[i + 1][j - 1]) {
          dp[i][j] = true;
          if (j - i + 1 > maxLen) {
            maxLen = j - i + 1;
            start = i;
          }
        }
      }
    }
  }
  
  return s.substring(start, start + maxLen);
}
```

## 本章小结

1. **区间 DP 思路**：`dp[i][j]` 表示子串是否回文
2. **转移条件**：两端相等且去掉两端后仍是回文
3. **中心扩展**：更省空间的 O(n²) 方法
4. **Manacher**：O(n) 但较复杂

**建议**：面试时用中心扩展（易于实现），竞赛时用 Manacher（效率最高）。
