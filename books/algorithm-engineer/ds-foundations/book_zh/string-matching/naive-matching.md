# 朴素字符串匹配

字符串匹配是编程中最基础、最常见的问题之一：给定一个主串和一个模式串，找出模式串在主串中出现的位置。

这一章，我们从最直观的**朴素匹配算法**开始。

## 问题定义

首先要明确几个术语：

- **主串（Text）**：被搜索的字符串，长度记为 n
- **模式串（Pattern）**：要查找的字符串，长度记为 m
- **匹配**：找到模式串在主串中首次出现的起始位置

```
主串 T:   A B A B D A B A C D A B A B C A B A B
          0 1 2 3 4 5 6 7 8 9 ...

模式串 P: A B A B C
          0 1 2 3 4

问题：P 在 T 中从哪个位置开始出现？
```

这个问题看起来简单，但蕴含着深刻的算法思想。本章介绍的朴素算法是基础，理解它的局限性后，我们才能更好地理解后续的 KMP、Rabin-Karp 等高级算法。

## 朴素匹配的思路

朴素算法的思路非常直接：**从主串的每个位置开始，逐个字符与模式串比较**。

```
T: A B A B D A B A C D
P: A B A B C
   ↑ ↑ ↑ ↑ ✗  （位置 0 开始，第 5 个字符不匹配）

移动一位，从位置 1 开始：
T: A B A B D A B A C D
     P: A B A B C
        ✗           （位置 1 开始，第 1 个字符就不匹配）

移动一位，从位置 2 开始：
T: A B A B D A B A C D
       P: A B A B C
          ↑ ↑ ✗     （位置 2 开始，第 3 个字符不匹配）

...继续直到找到匹配或遍历完主串
```

## 算法实现

```javascript
/**
 * 朴素字符串匹配算法
 * @param {string} text - 主串
 * @param {string} pattern - 模式串
 * @returns {number} - 匹配位置，未找到返回 -1
 */
function naiveMatch(text, pattern) {
    const n = text.length;
    const m = pattern.length;
    
    // 边界处理
    if (m === 0) return 0;
    if (n < m) return -1;
    
    // 遍历主串的每个可能的起始位置
    for (let i = 0; i <= n - m; i++) {
        let j = 0;
        
        // 逐个字符比较
        while (j < m && text[i + j] === pattern[j]) {
            j++;
        }
        
        // j 走完了模式串，说明完全匹配
        if (j === m) {
            return i;
        }
    }
    
    return -1;
}
```

代码很简洁：外层循环遍历主串的起始位置，内层循环逐字符比较。一旦找到完全匹配就返回。

### 查找所有匹配位置

如果想找出所有出现位置而不只是第一个：

```javascript
function naiveMatchAll(text, pattern) {
    const n = text.length;
    const m = pattern.length;
    const result = [];
    
    if (m === 0) return result;
    
    for (let i = 0; i <= n - m; i++) {
        let j = 0;
        while (j < m && text[i + j] === pattern[j]) {
            j++;
        }
        if (j === m) {
            result.push(i);
            // 不 return，继续查找
        }
    }
    
    return result;
}
```

## 复杂度分析

**时间复杂度**：
- **最坏情况**：O(n × m)
- **最好情况**：O(n)
- **平均情况**：O(n)

最坏情况发生在什么时候？看这个例子：

```
T: A A A A A A A A A B
P: A A A B

位置 0: 比较 A A A A, 第 4 位 A≠B，失配
位置 1: 比较 A A A A, 第 4 位 A≠B，失配
位置 2: 比较 A A A A, 第 4 位 A≠B，失配
...
```

每次都要比较 m 个字符才能发现不匹配，总共尝试 n-m+1 个位置，所以是 O(n × m)。

但实际应用中，这种"高度相似"的情况很少见。通常模式串第一个字符在主串中出现频率不高，很快就能排除不匹配的位置。所以平均情况接近 O(n)。

**空间复杂度**：O(1)，只用了几个变量。

## 朴素算法的问题

朴素算法有一个核心问题：**已匹配的信息被浪费了**。

```
T: A B A B A B A B C
P: A B A B C
         ↑ 位置 4 失配

我们已经知道：T[0..3] = "ABAB" 与 P[0..3] = "ABAB" 匹配

朴素做法：回到 T[1] 重新开始
但 T[1] = 'B'，P[0] = 'A'，显然不匹配！
这次比较是多余的。
```

更进一步，我们知道 T[0..3] = "ABAB"，它的后缀 "AB" 等于 P 的前缀 "AB"。这意味着：

```
T: A B A B A B A B C
       P: A B A B C
          ↑ 可以直接从这里继续！
```

这就是 **KMP 算法**的核心思想：利用已匹配部分的"自相似性"，跳过不必要的比较。

## JavaScript 内置方法

在实际开发中，JavaScript 提供了多种字符串匹配方法：

```javascript
// indexOf - 最常用
"hello world".indexOf("world")  // 6

// includes - 只判断是否存在
"hello world".includes("world")  // true

// search - 支持正则
"hello world".search(/world/)  // 6

// match - 返回匹配详情
"hello world".match(/world/)  // ["world", index: 6, ...]
```

这些内置方法的底层实现通常是优化过的。对于简单场景，直接使用即可。但理解底层算法有助于：
1. 在面试中展示算法功底
2. 在特殊场景下选择更优的方案
3. 理解更高级算法（KMP、Rabin-Karp）的设计思路

## 本章小结

朴素字符串匹配是最直观的方法：从每个位置开始逐字符比较。

- **优点**：简单易懂，实现容易
- **缺点**：最坏 O(n×m)，浪费已匹配信息

它的局限性引出了一个关键问题：**如何利用已匹配的信息避免重复比较？**

下一章，我们将学习 KMP 算法如何解决这个问题。KMP 通过预处理模式串，构建"失配函数"（next 数组），实现 O(n+m) 的稳定时间复杂度。
