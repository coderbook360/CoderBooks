# 实战：无重复字符的最长子串

这是一道经典的**滑动窗口 + 哈希表**组合题，也是 LeetCode 的第 3 题。

## 题目描述

> **LeetCode 3. 无重复字符的最长子串**
>
> 给定一个字符串 s，请你找出其中不含有重复字符的最长子串的长度。

**示例**：

```
输入：s = "abcabcbb"
输出：3
解释：最长无重复子串是 "abc"，长度为 3

输入：s = "pwwkew"
输出：3
解释：最长无重复子串是 "wke"，长度为 3
注意 "pwke" 是子序列，不是子串
```

## 暴力思路

最直接的想法：枚举所有子串，检查是否有重复字符。

```javascript
function lengthOfLongestSubstring(s) {
    let maxLen = 0;
    
    for (let i = 0; i < s.length; i++) {
        const seen = new Set();
        for (let j = i; j < s.length; j++) {
            if (seen.has(s[j])) break;
            seen.add(s[j]);
            maxLen = Math.max(maxLen, j - i + 1);
        }
    }
    
    return maxLen;
}
```

时间复杂度 O(n²)，能不能更快？

## 滑动窗口 + 哈希表

核心思想：维护一个"窗口"，窗口内的字符都不重复。

用 Map 记录每个字符**最后出现的位置**，当遇到重复字符时，直接跳到重复字符的下一个位置。

```javascript
function lengthOfLongestSubstring(s) {
    const map = new Map();  // 字符 → 最后出现的位置
    let maxLen = 0;
    let left = 0;  // 窗口左边界
    
    for (let right = 0; right < s.length; right++) {
        const char = s[right];
        
        // 如果字符在当前窗口内出现过，更新左边界
        if (map.has(char) && map.get(char) >= left) {
            left = map.get(char) + 1;
        }
        
        // 更新字符位置
        map.set(char, right);
        
        // 更新最大长度
        maxLen = Math.max(maxLen, right - left + 1);
    }
    
    return maxLen;
}
```

### 执行过程

```
s = "abcabcbb"

right=0, char='a':
  map 中没有 'a'
  map.set('a', 0), map = {a:0}
  窗口 [0,0] = "a", len = 1

right=1, char='b':
  map 中没有 'b'
  map.set('b', 1), map = {a:0, b:1}
  窗口 [0,1] = "ab", len = 2

right=2, char='c':
  map 中没有 'c'
  map.set('c', 2), map = {a:0, b:1, c:2}
  窗口 [0,2] = "abc", len = 3

right=3, char='a':
  map 中有 'a'，位置 0 >= left(0)
  left = 0 + 1 = 1
  map.set('a', 3), map = {a:3, b:1, c:2}
  窗口 [1,3] = "bca", len = 3

right=4, char='b':
  map 中有 'b'，位置 1 >= left(1)
  left = 1 + 1 = 2
  map.set('b', 4), map = {a:3, b:4, c:2}
  窗口 [2,4] = "cab", len = 3

right=5, char='c':
  map 中有 'c'，位置 2 >= left(2)
  left = 2 + 1 = 3
  map.set('c', 5), map = {a:3, b:4, c:5}
  窗口 [3,5] = "abc", len = 3

right=6, char='b':
  map 中有 'b'，位置 4 >= left(3)
  left = 4 + 1 = 5
  map.set('b', 6), map = {a:3, b:6, c:5}
  窗口 [5,6] = "cb", len = 2

right=7, char='b':
  map 中有 'b'，位置 6 >= left(5)
  left = 6 + 1 = 7
  map.set('b', 7), map = {a:3, b:7, c:5}
  窗口 [7,7] = "b", len = 1

最大长度：3
```

## 关键细节

### 为什么要检查 `map.get(char) >= left`？

Map 中存储的是字符**历史上**最后出现的位置，但这个位置可能已经在窗口外面了。

举个例子：`s = "abba"`

```
right=0, 'a': left=0, map={a:0}, 窗口"a"
right=1, 'b': left=0, map={a:0,b:1}, 窗口"ab"
right=2, 'b': b在位置1 >= left=0, left=2, map={a:0,b:2}, 窗口"b"
right=3, 'a': a在位置0，但0 < left=2！
             这个'a'已经不在当前窗口内了，不用更新left
             map={a:3,b:2}, 窗口"ba", len=2
```

如果不检查 `>= left`，处理 `s[3]='a'` 时会错误地把 left 更新为 1，导致错误答案。

## 复杂度分析

- **时间**：O(n)，每个字符只遍历一次
- **空间**：O(min(m, n))，m 是字符集大小，n 是字符串长度

## 本章小结

无重复字符的最长子串是滑动窗口的经典应用：

1. **滑动窗口**：维护一个无重复字符的区间 [left, right]
2. **哈希表**：记录字符位置，O(1) 判断重复
3. **关键优化**：直接跳到重复字符的下一个位置

滑动窗口 + 哈希表是一个强力组合，适用于很多子串/子数组问题。
