# 实战：无重复字符的最长子串

这道题结合了**滑动窗口**和**哈希表**两个技巧。哈希表用于快速判断字符是否在当前窗口中。

## 问题描述

给定一个字符串`s`，找出其中不含有重复字符的**最长子串**的长度。

**示例**：
```
输入: s = "abcabcbb"
输出: 3
解释: 最长无重复子串是 "abc"，长度为3

输入: s = "bbbbb"
输出: 1
解释: 最长无重复子串是 "b"，长度为1

输入: s = "pwwkew"
输出: 3
解释: 最长无重复子串是 "wke"，长度为3
注意：答案是子串，不是子序列，"pwke" 不是子串
```

## 思路分析

### 暴力方法：O(n³)

枚举所有子串，检查是否有重复字符。

### 滑动窗口

维护一个"无重复字符"的窗口：
- 右指针扩展：加入新字符
- 发现重复：收缩左边界直到无重复

关键问题：如何快速判断字符是否在窗口中？用哈希表！

## 方法一：Set + 滑动窗口

```javascript
function lengthOfLongestSubstring(s) {
    const set = new Set();
    let left = 0, right = 0;
    let maxLen = 0;
    
    while (right < s.length) {
        if (!set.has(s[right])) {
            // 无重复，扩展窗口
            set.add(s[right]);
            maxLen = Math.max(maxLen, right - left + 1);
            right++;
        } else {
            // 有重复，收缩窗口
            set.delete(s[left]);
            left++;
        }
    }
    
    return maxLen;
}
```

**问题**：当发现重复时，需要一步步收缩左边界，效率不高。

## 方法二：Map + 直接跳转

用Map记录每个字符**最后出现的位置**，发现重复时直接跳转。

```javascript
/**
 * @param {string} s
 * @return {number}
 */
function lengthOfLongestSubstring(s) {
    const map = new Map();  // 字符 → 最后出现的位置
    let left = 0;
    let maxLen = 0;
    
    for (let right = 0; right < s.length; right++) {
        // 如果字符在当前窗口内出现过
        if (map.has(s[right]) && map.get(s[right]) >= left) {
            // 直接跳到重复字符的下一个位置
            left = map.get(s[right]) + 1;
        }
        
        // 更新字符的最新位置
        map.set(s[right], right);
        
        // 更新最大长度
        maxLen = Math.max(maxLen, right - left + 1);
    }
    
    return maxLen;
}
```

## 执行过程图解

以`s = "abcabcbb"`为例：

```
初始: left=0, maxLen=0, map={}

right=0, s[0]='a':
  'a' 不在窗口内
  map: {a→0}
  窗口: "a", maxLen=1

right=1, s[1]='b':
  'b' 不在窗口内
  map: {a→0, b→1}
  窗口: "ab", maxLen=2

right=2, s[2]='c':
  'c' 不在窗口内
  map: {a→0, b→1, c→2}
  窗口: "abc", maxLen=3

right=3, s[3]='a':
  'a' 在窗口内，位置0 >= left(0)
  left = 0 + 1 = 1
  map: {a→3, b→1, c→2}
  窗口: "bca", maxLen=3

right=4, s[4]='b':
  'b' 在窗口内，位置1 >= left(1)
  left = 1 + 1 = 2
  map: {a→3, b→4, c→2}
  窗口: "cab", maxLen=3

right=5, s[5]='c':
  'c' 在窗口内，位置2 >= left(2)
  left = 2 + 1 = 3
  map: {a→3, b→4, c→5}
  窗口: "abc", maxLen=3

right=6, s[6]='b':
  'b' 在窗口内，位置4 >= left(3)
  left = 4 + 1 = 5
  map: {a→3, b→6, c→5}
  窗口: "cb", maxLen=3

right=7, s[7]='b':
  'b' 在窗口内，位置6 >= left(5)
  left = 6 + 1 = 7
  map: {a→3, b→7, c→5}
  窗口: "b", maxLen=3

结果: 3
```

## 为什么要判断`>= left`？

Map中存储的是字符"曾经"出现的位置，但那个位置可能已经在窗口外了。

```
s = "abba"
处理到第二个'a'时：
  map: {a→0, b→2}
  left = 3（已经跳过了第一个'a'）
  
虽然'a'在map中，但位置0 < left(3)
说明那个'a'已经在窗口外了，不算重复
```

## 方法三：数组代替Map

如果字符集有限（如ASCII），可以用数组：

```javascript
function lengthOfLongestSubstring(s) {
    const lastIndex = new Array(128).fill(-1);
    let left = 0;
    let maxLen = 0;
    
    for (let right = 0; right < s.length; right++) {
        const charCode = s.charCodeAt(right);
        
        if (lastIndex[charCode] >= left) {
            left = lastIndex[charCode] + 1;
        }
        
        lastIndex[charCode] = right;
        maxLen = Math.max(maxLen, right - left + 1);
    }
    
    return maxLen;
}
```

数组访问比Map更快，但只适用于有限字符集。

## 复杂度分析

**时间复杂度：O(n)**
- 遍历字符串一次
- 每次Map/数组操作O(1)

**空间复杂度：O(min(m, n))**
- m是字符集大小，n是字符串长度
- 最多存储min(m, n)个字符

## 边界情况

| 输入 | 分析 | 结果 |
|------|------|------|
| `""` | 空字符串 | 0 |
| `" "` | 单空格 | 1 |
| `"au"` | 无重复 | 2 |
| `"aab"` | 开头重复 | 2 |

## 三种方法对比

| 方法 | 时间 | 空间 | 特点 |
|------|------|------|------|
| Set+收缩 | O(n) | O(min(m,n)) | 逐步收缩 |
| Map+跳转 | O(n) | O(min(m,n)) | 直接跳转 |
| 数组+跳转 | O(n) | O(m) | 最快，限字符集 |

面试推荐使用Map+跳转，代码简洁且效率高。

## 小结

无重复字符的最长子串核心：

1. **滑动窗口**：维护一个无重复的窗口
2. **哈希表记录位置**：快速定位重复字符
3. **直接跳转**：避免逐步收缩

这道题是"滑动窗口 + 哈希表"的经典组合，两个技巧配合使用，威力倍增。
