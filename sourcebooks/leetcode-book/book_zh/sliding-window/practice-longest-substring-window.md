# 实战：无重复字符的最长子串（窗口）

这是滑动窗口的入门经典题，展示了如何用可变窗口找**最长**满足条件的子串。

## 问题描述

给定一个字符串`s`，找出其中不含重复字符的**最长子串**的长度。

**示例**：
```
输入：s = "abcabcbb"
输出：3
解释：最长子串是 "abc"，长度为 3

输入：s = "bbbbb"
输出：1

输入：s = "pwwkew"
输出：3
解释：最长子串是 "wke"
```

## 思路分析

### 暴力思路

枚举所有子串，检查是否有重复：O(n³)。

### 滑动窗口思路

维护一个无重复字符的窗口：
1. 扩展right，加入新字符
2. 如果新字符导致重复，收缩left直到无重复
3. 更新最大长度

## 完整实现

### 方法一：用Set判重

```javascript
/**
 * @param {string} s
 * @return {number}
 */
function lengthOfLongestSubstring(s) {
    const window = new Set();
    let left = 0;
    let maxLen = 0;
    
    for (let right = 0; right < s.length; right++) {
        // 如果right字符已存在，收缩窗口
        while (window.has(s[right])) {
            window.delete(s[left]);
            left++;
        }
        
        // 加入窗口
        window.add(s[right]);
        
        // 更新结果
        maxLen = Math.max(maxLen, right - left + 1);
    }
    
    return maxLen;
}
```

### 方法二：用Map记录位置

直接跳到重复字符的下一个位置，更高效：

```javascript
function lengthOfLongestSubstring(s) {
    const lastIndex = new Map();  // 记录每个字符最后出现的位置
    let left = 0;
    let maxLen = 0;
    
    for (let right = 0; right < s.length; right++) {
        if (lastIndex.has(s[right]) && lastIndex.get(s[right]) >= left) {
            // 直接跳过重复字符
            left = lastIndex.get(s[right]) + 1;
        }
        
        lastIndex.set(s[right], right);
        maxLen = Math.max(maxLen, right - left + 1);
    }
    
    return maxLen;
}
```

### 方法三：用数组代替Map

对于ASCII字符，用数组更快：

```javascript
function lengthOfLongestSubstring(s) {
    const lastIndex = new Array(128).fill(-1);
    let left = 0;
    let maxLen = 0;
    
    for (let right = 0; right < s.length; right++) {
        const code = s.charCodeAt(right);
        
        if (lastIndex[code] >= left) {
            left = lastIndex[code] + 1;
        }
        
        lastIndex[code] = right;
        maxLen = Math.max(maxLen, right - left + 1);
    }
    
    return maxLen;
}
```

## 执行过程

```
s = "abcabcbb"

Set方法：
right=0: 'a' 不在set, 加入, set={a}, maxLen=1
right=1: 'b' 不在set, 加入, set={a,b}, maxLen=2
right=2: 'c' 不在set, 加入, set={a,b,c}, maxLen=3
right=3: 'a' 在set, 删除'a', left=1, set={b,c}
         'a' 不在set, 加入, set={b,c,a}, maxLen=3
right=4: 'b' 在set, 删除'b', left=2, set={c,a}
         'b' 不在set, 加入, set={c,a,b}, maxLen=3
right=5: 'c' 在set, 删除'c', left=3, set={a,b}
         'c' 不在set, 加入, set={a,b,c}, maxLen=3
right=6: 'b' 在set, 删除'a', left=4, set={b,c}
         'b' 在set, 删除'b', left=5, set={c}
         'b' 不在set, 加入, set={c,b}, maxLen=3
right=7: 'b' 在set, 删除'c', left=6, set={b}
         'b' 在set, 删除'b', left=7, set={}
         'b' 不在set, 加入, set={b}, maxLen=3

结果：3
```

## 为什么用Map方法更好？

Set方法在收缩时可能需要多次循环删除。

Map方法记录了每个字符的位置，可以直接跳到正确位置：

```
s = "abcabc"
     ↑   ↑
     0   3

当right=3遇到'a'时：
- Set方法：需要删除a, 然后left从0变到1
- Map方法：直接 left = lastIndex['a'] + 1 = 1
```

## 复杂度分析

**Set方法**：
- 时间复杂度：O(n)，每个字符最多被访问2次
- 空间复杂度：O(min(n, m))，m是字符集大小

**Map方法**：
- 时间复杂度：O(n)
- 空间复杂度：O(min(n, m))

## 小结

最长无重复子串的要点：

1. **可变窗口**：窗口大小根据重复情况变化
2. **收缩条件**：窗口内有重复字符时收缩
3. **更新时机**：每次扩展后更新最大长度
4. **优化技巧**：用Map记录位置，避免逐个删除

这是滑动窗口"求最大"模板的典型应用。
