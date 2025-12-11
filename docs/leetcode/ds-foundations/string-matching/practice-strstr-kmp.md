# 实战：实现 strStr()（KMP 解法）

这是字符串匹配的经典题目。在前面的章节中，我们学习了朴素匹配和 KMP 算法的原理与实现。现在让我们用它们来解决实际问题。

## 题目描述

> **LeetCode 28. 找出字符串中第一个匹配项的下标**
>
> 给你两个字符串 haystack 和 needle，请你在 haystack 字符串中找出 needle 字符串的第一个匹配项的下标（下标从 0 开始）。
>
> 如果 needle 不是 haystack 的一部分，则返回 -1。

**示例**：

```
输入：haystack = "sadbutsad", needle = "sad"
输出：0
解释："sad" 在下标 0 和 6 处匹配，返回第一个

输入：haystack = "leetcode", needle = "leeto"
输出：-1
```

## 解法一：朴素匹配

最直观的方法：从 haystack 的每个位置开始，逐字符比较。

```javascript
function strStr(haystack, needle) {
    const n = haystack.length;
    const m = needle.length;
    
    if (m === 0) return 0;
    
    for (let i = 0; i <= n - m; i++) {
        let j = 0;
        while (j < m && haystack[i + j] === needle[j]) {
            j++;
        }
        if (j === m) return i;
    }
    
    return -1;
}
```

**复杂度**：
- 时间：O(n × m) 最坏情况
- 空间：O(1)

对于短字符串，朴素方法完全够用。但当 haystack 和 needle 都很长，且有大量重复字符时，效率会下降。

## 解法二：KMP 算法

KMP 通过预处理 needle，避免重复比较。

```javascript
function strStr(haystack, needle) {
    const n = haystack.length;
    const m = needle.length;
    
    if (m === 0) return 0;
    if (n < m) return -1;
    
    // 构建 next 数组
    const next = buildNext(needle);
    
    let j = 0;  // needle 的当前位置
    
    for (let i = 0; i < n; i++) {
        // 失配时，根据 next 数组回退
        while (j > 0 && haystack[i] !== needle[j]) {
            j = next[j - 1];
        }
        
        // 匹配时前进
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

**复杂度**：
- 时间：O(n + m)
- 空间：O(m)

## 解法三：内置方法

实际开发中，直接用语言内置方法：

```javascript
function strStr(haystack, needle) {
    return haystack.indexOf(needle);
}
```

一行搞定。但面试时通常需要手写实现。

## 三种方法对比

| 方法 | 时间复杂度 | 空间复杂度 | 适用场景 |
|-----|-----------|-----------|---------|
| 朴素匹配 | O(n×m) 最坏 | O(1) | 短字符串，简单场景 |
| KMP | O(n+m) | O(m) | 长字符串，重复模式多 |
| 内置方法 | O(n+m)* | O(1)* | 实际开发 |

*内置方法的复杂度取决于具体实现，现代浏览器通常有优化。

## 面试中如何选择

1. **先写朴素解法**：展示基本功，确保正确性
2. **分析复杂度**：说明最坏情况是 O(n×m)
3. **提出优化**：如果面试官要求，再写 KMP
4. **清晰解释**：说明 KMP 的核心思想——利用已匹配信息跳过重复比较

面试官关注的是你的**思维过程**，而不仅仅是背代码。

## 常见错误

1. **空字符串**：needle 为空应返回 0（题目规定）
2. **长度判断**：haystack 比 needle 短直接返回 -1
3. **返回位置**：是 `i - m + 1`，不是 `i`

## 本章小结

字符串匹配是面试高频题。掌握朴素方法是基础，理解 KMP 是进阶。

实际建议：
- 先确保朴素方法写对
- 能清晰解释 KMP 原理
- 能手写 KMP 代码（面试加分项）

下一章我们来看 KMP 的一个精妙应用——判断重复子字符串。
