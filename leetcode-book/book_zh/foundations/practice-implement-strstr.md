# 实战：实现strStr()

这道题来自 LeetCode 第 28 题，考察字符串匹配问题。虽然看起来简单，但它引出了著名的 KMP 算法。

## 题目描述

给你两个字符串 `haystack` 和 `needle`，请你在 `haystack` 字符串中找出 `needle` 字符串的第一个匹配项的下标（下标从 0 开始）。如果 `needle` 不是 `haystack` 的一部分，则返回 `-1`。

**示例**：

```
输入：haystack = "sadbutsad", needle = "sad"
输出：0
解释："sad" 在下标 0 和 6 处匹配，第一个匹配项的下标是 0

输入：haystack = "leetcode", needle = "leeto"
输出：-1
解释："leeto" 不是 "leetcode" 的子串
```

## 暴力匹配

最直接的思路：从 haystack 的每个位置开始，尝试匹配 needle。

```javascript
function strStr(haystack, needle) {
    if (needle.length === 0) return 0;
    
    const n = haystack.length;
    const m = needle.length;
    
    // 只需要检查到 n - m 的位置
    for (let i = 0; i <= n - m; i++) {
        let match = true;
        
        // 尝试从位置 i 开始匹配
        for (let j = 0; j < m; j++) {
            if (haystack[i + j] !== needle[j]) {
                match = false;
                break;
            }
        }
        
        if (match) {
            return i;
        }
    }
    
    return -1;
}
```

## 更简洁的写法

利用 JavaScript 的 `substring` 或 `slice`：

```javascript
function strStr(haystack, needle) {
    if (needle.length === 0) return 0;
    
    const n = haystack.length;
    const m = needle.length;
    
    for (let i = 0; i <= n - m; i++) {
        if (haystack.substring(i, i + m) === needle) {
            return i;
        }
    }
    
    return -1;
}
```

或者直接用内置方法（面试时通常不允许这样写）：

```javascript
function strStr(haystack, needle) {
    return haystack.indexOf(needle);
}
```

## 图解执行过程

以 `haystack = "hello", needle = "ll"` 为例：

```
i = 0: "he" vs "ll" → 'h' != 'l' ✗
i = 1: "el" vs "ll" → 'e' != 'l' ✗
i = 2: "ll" vs "ll" → 匹配 ✓

返回 2
```

以 `haystack = "aaaaa", needle = "bba"` 为例：

```
i = 0: "aaa" vs "bba" → 'a' != 'b' ✗
i = 1: "aaa" vs "bba" → 'a' != 'b' ✗
i = 2: "aaa" vs "bba" → 'a' != 'b' ✗

返回 -1
```

## 复杂度分析

**暴力解法**：
- 时间复杂度：O((n - m + 1) × m) ≈ O(n × m)
- 空间复杂度：O(1)

当 haystack 和 needle 都很长时，暴力解法可能会超时。

## 进阶：KMP 算法（选读）

KMP 算法是一种更高效的字符串匹配算法，时间复杂度是 O(n + m)。

KMP 的核心思想是：当匹配失败时，不必从头开始，而是利用已经匹配的部分信息，跳过一些不可能匹配的位置。

```javascript
function strStr(haystack, needle) {
    if (needle.length === 0) return 0;
    
    const n = haystack.length;
    const m = needle.length;
    
    // 构建 next 数组（前缀函数）
    const next = buildNext(needle);
    
    let j = 0; // needle 指针
    
    for (let i = 0; i < n; i++) {
        // 不匹配时，利用 next 数组回退
        while (j > 0 && haystack[i] !== needle[j]) {
            j = next[j - 1];
        }
        
        // 匹配时，前进
        if (haystack[i] === needle[j]) {
            j++;
        }
        
        // 完全匹配
        if (j === m) {
            return i - m + 1;
        }
    }
    
    return -1;
}

function buildNext(pattern) {
    const m = pattern.length;
    const next = new Array(m).fill(0);
    
    let j = 0; // 前缀指针
    
    for (let i = 1; i < m; i++) {
        // 不匹配时回退
        while (j > 0 && pattern[i] !== pattern[j]) {
            j = next[j - 1];
        }
        
        // 匹配时前进
        if (pattern[i] === pattern[j]) {
            j++;
        }
        
        next[i] = j;
    }
    
    return next;
}
```

KMP 的详细原理比较复杂，这里只展示代码。如果对 KMP 感兴趣，可以单独学习。

## 实际应用中的选择

在实际开发中：
- 如果字符串不长，暴力解法完全够用
- JavaScript 的 `indexOf` 底层已经做了优化
- 只有在处理超大文本（如搜索引擎、DNA 序列匹配）时才需要 KMP

面试时，如果是简单难度的题，暴力解法通常能过。但了解 KMP 的存在和基本思想是加分项。

## 边界情况

1. **needle 为空**：按题意返回 0
2. **needle 比 haystack 长**：不可能匹配，返回 -1
3. **完全相同**：返回 0
4. **只有一个字符**：正常比较

## 小结

字符串匹配是一个经典问题：

1. **暴力解法**：简单直接，O(n × m)
2. **KMP 算法**：利用前缀函数优化，O(n + m)

对于面试和日常开发，暴力解法已经足够。但了解 KMP 等高效算法，能帮助你理解更复杂的字符串问题。

下一章，我们来看另一个字符串题——"最长公共前缀"。
