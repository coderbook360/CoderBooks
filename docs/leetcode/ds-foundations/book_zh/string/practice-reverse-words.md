# 实战：反转字符串中的单词

这道题结合了字符串分割、数组操作和空格处理，是一道综合性题目。

## 题目描述

> **LeetCode 151. 反转字符串中的单词**
>
> 给你一个字符串 `s`，请你反转字符串中**单词**的顺序。
>
> 注意：输入字符串 `s` 中可能会存在前导空格、尾随空格或者单词间的多个空格。返回的结果字符串中，单词间应当仅用单个空格分隔，且不包含任何额外的空格。

**示例 1**：
```
输入：s = "the sky is blue"
输出："blue is sky the"
```

**示例 2**：
```
输入：s = "  hello world  "
输出："world hello"
解释：反转后的字符串中不能存在前导空格和尾随空格
```

**示例 3**：
```
输入：s = "a good   example"
输出："example good a"
解释：单词间多个空格要变成一个
```

## 题目分析

需要处理的问题：
1. 分割出所有单词
2. 反转单词顺序
3. 处理多余空格（首尾和中间）

## 解法一：使用语言特性

最简洁的方法：利用 JavaScript 的字符串和数组方法。

```javascript
function reverseWords(s) {
    return s.trim()         // 去除首尾空格
            .split(/\s+/)   // 按一个或多个空格分割
            .reverse()      // 反转数组
            .join(' ');     // 用单个空格连接
}
```

分步写更清晰：

```javascript
function reverseWords(s) {
    // 1. 去除首尾空格
    const trimmed = s.trim();
    
    // 2. 按空格分割（正则 \s+ 匹配一个或多个空白字符）
    const words = trimmed.split(/\s+/);
    
    // 3. 反转单词数组
    words.reverse();
    
    // 4. 用单个空格连接
    return words.join(' ');
}
```

执行过程：

```
s = "  hello world  "

trim() → "hello world"
split(/\s+/) → ["hello", "world"]
reverse() → ["world", "hello"]
join(' ') → "world hello"
```

**复杂度分析**：
- 时间复杂度：O(n)
- 空间复杂度：O(n)——存储单词数组

## 解法二：原地反转（进阶）

面试中可能要求不使用 `split` 和 `reverse`。思路是：

1. 去除多余空格
2. 反转整个字符串
3. 反转每个单词

```javascript
function reverseWords(s) {
    // 转为数组以便修改
    const arr = [...s];
    
    // 1. 去除多余空格（双指针）
    let slow = 0;
    for (let fast = 0; fast < arr.length; fast++) {
        if (arr[fast] !== ' ') {
            // 单词之间加一个空格
            if (slow !== 0) arr[slow++] = ' ';
            // 复制整个单词
            while (fast < arr.length && arr[fast] !== ' ') {
                arr[slow++] = arr[fast++];
            }
        }
    }
    arr.length = slow;  // 截断数组
    
    // 2. 反转整个数组
    reverse(arr, 0, arr.length - 1);
    
    // 3. 反转每个单词
    let start = 0;
    for (let i = 0; i <= arr.length; i++) {
        if (i === arr.length || arr[i] === ' ') {
            reverse(arr, start, i - 1);
            start = i + 1;
        }
    }
    
    return arr.join('');
}

function reverse(arr, left, right) {
    while (left < right) {
        [arr[left], arr[right]] = [arr[right], arr[left]];
        left++;
        right--;
    }
}
```

执行过程：

```
原始: "the sky is blue"

Step 1 - 去除多余空格（本例没有）:
"the sky is blue"

Step 2 - 整体反转:
"eulb si yks eht"

Step 3 - 逐词反转:
"blue is sky the"
```

**复杂度分析**：
- 时间复杂度：O(n)
- 空间复杂度：O(n)——JavaScript 字符串不可变，必须转数组

## 两种方法对比

| 方法 | 时间复杂度 | 空间复杂度 | 特点 |
|-----|-----------|-----------|------|
| 语言特性 | O(n) | O(n) | 简洁优雅 |
| 原地反转 | O(n) | O(n)* | 面试考察点 |

*在 C/C++ 中可以做到 O(1) 空间，JavaScript 由于字符串不可变，无法真正原地修改。

## 本章小结

这一章我们学习了反转单词的两种方法：

1. **语言特性**：`trim().split(/\s+/).reverse().join(' ')`
2. **原地反转**：去空格 → 整体反转 → 逐词反转

掌握第一种方法足以应对大多数场景。但了解第二种方法能帮你理解"翻转"技巧的更多应用。

## 常见错误

1. **多余空格处理**：直接 split(' ') 会产生空字符串

```javascript
// ❌ 错误：split 会产生空元素
"  hello  world  ".split(' ')  // ['', '', 'hello', '', 'world', '', '']

// ✅ 正确：用正则或 filter 过滤
"  hello  world  ".split(/\s+/).filter(Boolean)  // ['hello', 'world']
"  hello  world  ".trim().split(/\s+/)  // ['hello', 'world']
```

2. **忘记处理首尾空格**：先 trim() 再处理

3. **原地修改问题**：JavaScript 字符串不可变，需要转数组处理

## 相关题目

- **344. 反转字符串**：反转字符数组
- **557. 反转字符串中的单词 III**：反转每个单词内部字符
- **186. 翻转字符串里的单词 II**：原地反转，先整体反转再逐词反转

下一章，我们来看「最长公共前缀」。
