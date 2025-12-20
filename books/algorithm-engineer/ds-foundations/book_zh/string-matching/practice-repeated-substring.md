# 实战：重复的子字符串

这道题看似简单，却有多种精妙的解法。它是 KMP 算法应用的经典案例。

## 题目描述

> **LeetCode 459. 重复的子字符串**
>
> 给定一个非空的字符串 s，检查是否可以通过由它的一个子串重复多次构成。

**示例**：

```
输入: s = "abab"
输出: true
解释: 可由子串 "ab" 重复两次构成

输入: s = "aba"
输出: false

输入: s = "abcabcabcabc"
输出: true
解释: 可由子串 "abc" 重复四次构成
```

## 解法一：枚举

最直接的思路：枚举所有可能的重复子串长度。

```javascript
function repeatedSubstringPattern(s) {
    const n = s.length;
    
    // 子串长度必须能整除 n，且最大为 n/2
    for (let len = 1; len <= n / 2; len++) {
        if (n % len !== 0) continue;
        
        const pattern = s.slice(0, len);
        const repeat = n / len;
        
        if (pattern.repeat(repeat) === s) {
            return true;
        }
    }
    
    return false;
}
```

**复杂度**：
- 时间：O(n²)（枚举长度 × 字符串比较）
- 空间：O(n)

## 解法二：字符串拼接（巧妙解法）

这个解法非常巧妙，需要一些数学直觉。

**核心观察**：如果 s 可以由子串重复构成，设重复单元为 p，则：

```
s = p + p + p + ... + p（至少 2 个）
```

那么 s + s 就是：
```
s + s = p + p + ... + p + p + p + ... + p
```

去掉 s + s 的首尾字符后，s **仍然能在其中找到**。

```javascript
function repeatedSubstringPattern(s) {
    const doubled = s + s;
    // 去掉首尾字符后查找
    return doubled.slice(1, -1).includes(s);
}
```

### 为什么有效？

以 s = "abab" 为例：

```
s + s = "abababab"
去首尾 = "bababa"

在 "bababa" 中查找 "abab"：
  b a b a b a
    a b a b    ← 位置 1 找到！
```

以 s = "aba" 为例（不是重复子串）：

```
s + s = "abaaba"
去首尾 = "baab"

在 "baab" 中查找 "aba"：找不到！
```

**直觉**：如果 s 是重复的，在 s+s 中去掉首尾后，s 的"重复性"会使它在中间重新出现。

**复杂度**：
- 时间：O(n)
- 空间：O(n)

## 解法三：KMP 的 next 数组

这是最精妙的解法，揭示了 KMP next 数组的深层含义。

**数学原理**：设 n = s.length，k = next[n-1]（最长公共前后缀长度）。

如果 s 可以由长度为 len 的子串重复构成：
- s[0..n-1-len] = s[len..n-1]
- 这意味着 s 有长度为 n-len 的公共前后缀
- 即 k ≥ n - len，所以 len ≥ n - k

最小的重复单元长度就是 n - k。

判断条件：**k > 0 且 n % (n - k) == 0**

```javascript
function repeatedSubstringPattern(s) {
    const n = s.length;
    const next = buildNext(s);
    
    const k = next[n - 1];     // 最长公共前后缀长度
    const len = n - k;         // 最小重复单元长度
    
    // k > 0 确保有公共前后缀
    // n % len == 0 确保能整除
    return k > 0 && n % len === 0;
}

function buildNext(pattern) {
    const m = pattern.length;
    const next = new Array(m).fill(0);
    
    let j = 0;
    for (let i = 1; i < m; i++) {
        while (j > 0 && pattern[i] !== pattern[j]) {
            j = next[j - 1];
        }
        if (pattern[i] === pattern[j]) {
            j++;
        }
        next[i] = j;
    }
    
    return next;
}
```

### 示例分析

**s = "abcabc"**：
```
next = [0, 0, 0, 1, 2, 3]
k = next[5] = 3
len = 6 - 3 = 3
n % len = 6 % 3 = 0 ✓

返回 true（"abc" 重复 2 次）
```

**s = "abab"**：
```
next = [0, 0, 1, 2]
k = next[3] = 2
len = 4 - 2 = 2
n % len = 4 % 2 = 0 ✓

返回 true（"ab" 重复 2 次）
```

**s = "aba"**：
```
next = [0, 0, 1]
k = next[2] = 1
len = 3 - 1 = 2
n % len = 3 % 2 = 1 ≠ 0 ✗

返回 false
```

**复杂度**：
- 时间：O(n)
- 空间：O(n)

## 三种方法对比

| 方法 | 时间复杂度 | 空间复杂度 | 难度 |
|-----|-----------|-----------|------|
| 枚举 | O(n²) | O(n) | 简单 |
| 字符串拼接 | O(n) | O(n) | 巧妙 |
| KMP | O(n) | O(n) | 深刻 |

三种方法各有特点：
- **枚举**：最直观，容易想到
- **字符串拼接**：最简洁，面试中的"巧解"
- **KMP**：最有深度，展示对 next 数组的理解

## 本章小结

这道题展示了 KMP next 数组的另一个应用：**判断字符串的周期性**。

next[n-1] 表示整个字符串的最长公共前后缀长度，n - next[n-1] 就是最小重复单元的长度。如果这个长度能整除 n，说明字符串可以由重复子串构成。

这种"从 next 数组挖掘更多信息"的思路，在很多字符串问题中都有应用。

下一章我们来看字符串哈希的基础知识。
