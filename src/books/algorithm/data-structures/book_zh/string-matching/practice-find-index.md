# 实战：找出字符串中第一个匹配项的下标

这是本部分的综合练习，我们将用所学的所有方法来解决同一道题，对比它们的优劣。

## 题目回顾

> **LeetCode 28. 找出字符串中第一个匹配项的下标**
>
> 给你两个字符串 haystack 和 needle，在 haystack 中找出 needle 第一次出现的位置。

这道题我们在第 35 章已经见过，现在用本部分学到的所有方法来解决。

## 解法汇总

### 解法 1：朴素匹配

```javascript
function strStr(haystack, needle) {
    const n = haystack.length;
    const m = needle.length;
    
    if (m === 0) return 0;
    
    for (let i = 0; i <= n - m; i++) {
        if (haystack.slice(i, i + m) === needle) {
            return i;
        }
    }
    
    return -1;
}
```

- **时间**：O(n × m) 最坏
- **空间**：O(m)（slice 创建新字符串）

也可以用双指针避免 slice：

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

- **时间**：O(n × m) 最坏
- **空间**：O(1)

### 解法 2：KMP

```javascript
function strStr(haystack, needle) {
    const n = haystack.length;
    const m = needle.length;
    
    if (m === 0) return 0;
    if (n < m) return -1;
    
    // 构建 next 数组
    const next = new Array(m).fill(0);
    for (let i = 1, j = 0; i < m; i++) {
        while (j > 0 && needle[i] !== needle[j]) {
            j = next[j - 1];
        }
        if (needle[i] === needle[j]) j++;
        next[i] = j;
    }
    
    // 匹配
    for (let i = 0, j = 0; i < n; i++) {
        while (j > 0 && haystack[i] !== needle[j]) {
            j = next[j - 1];
        }
        if (haystack[i] === needle[j]) j++;
        if (j === m) return i - m + 1;
    }
    
    return -1;
}
```

- **时间**：O(n + m)
- **空间**：O(m)

### 解法 3：Rabin-Karp

```javascript
function strStr(haystack, needle) {
    const n = haystack.length;
    const m = needle.length;
    
    if (m === 0) return 0;
    if (n < m) return -1;
    
    const B = 31, MOD = 1e9 + 7;
    
    // 计算 B^(m-1)
    let highPower = 1;
    for (let i = 0; i < m - 1; i++) {
        highPower = highPower * B % MOD;
    }
    
    // 模式串哈希
    let pHash = 0;
    for (const c of needle) {
        pHash = (pHash * B + c.charCodeAt(0)) % MOD;
    }
    
    // 第一个窗口哈希
    let wHash = 0;
    for (let i = 0; i < m; i++) {
        wHash = (wHash * B + haystack.charCodeAt(i)) % MOD;
    }
    
    // 滑动窗口
    for (let i = 0; i <= n - m; i++) {
        // 哈希相等，验证实际字符串
        if (wHash === pHash && haystack.slice(i, i + m) === needle) {
            return i;
        }
        
        // 滚动计算下一个窗口哈希
        if (i < n - m) {
            wHash = ((wHash - haystack.charCodeAt(i) * highPower % MOD + MOD) * B + 
                     haystack.charCodeAt(i + m)) % MOD;
        }
    }
    
    return -1;
}
```

- **时间**：O(n + m) 期望
- **空间**：O(1)

### 解法 4：内置方法

```javascript
function strStr(haystack, needle) {
    return haystack.indexOf(needle);
}
```

一行搞定，实际开发首选。

## 算法选择指南

| 场景 | 推荐算法 | 原因 |
|-----|---------|------|
| 实际开发 | 内置方法 | 简洁高效 |
| 短字符串 | 朴素匹配 | 常数因子小 |
| 长字符串，单模式 | KMP | 稳定 O(n+m) |
| 多模式匹配 | Rabin-Karp | 易于扩展 |
| 面试中 | 先朴素，再优化 | 展示思维过程 |

## 面试技巧

1. **先确认边界**：needle 为空返回什么？haystack 比 needle 短呢？
2. **先写朴素解法**：展示基本功，确保 AC
3. **分析复杂度**：说明最坏情况和优化空间
4. **按需优化**：面试官要求时再用 KMP

## 测试用例

```javascript
const testCases = [
    ["sadbutsad", "sad", 0],
    ["leetcode", "leeto", -1],
    ["hello", "ll", 2],
    ["", "", 0],
    ["a", "", 0],
    ["", "a", -1],
    ["mississippi", "issip", 4],
    ["aaa", "aaaa", -1],
];

for (const [haystack, needle, expected] of testCases) {
    console.assert(strStr(haystack, needle) === expected,
        `Failed: strStr("${haystack}", "${needle}") should be ${expected}`);
}
```

## 本章小结

同一道题，四种解法：

1. **朴素匹配**：最直观，O(n×m)
2. **KMP**：预处理 next 数组，O(n+m)
3. **Rabin-Karp**：滚动哈希，O(n+m) 期望
4. **内置方法**：实际开发首选

理解每种方法的原理和适用场景，比死记硬背代码更重要。

下一章，我们将展望更高级的字符串算法，为进阶学习指明方向。
