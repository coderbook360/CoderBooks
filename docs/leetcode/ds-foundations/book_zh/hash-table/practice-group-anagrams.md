# 实战：字母异位词分组

本章学习如何设计哈希表的**键**（Key），这是一个很重要的技巧。

## 题目描述

> **LeetCode 49. 字母异位词分组**
>
> 给你一个字符串数组，请你将字母异位词组合在一起。
>
> 字母异位词是由重新排列源单词的字母得到的一个新单词，所有源单词中的字母通常恰好只用一次。

**示例**：

```
输入：strs = ["eat","tea","tan","ate","nat","bat"]
输出：[["bat"],["nat","tan"],["ate","eat","tea"]]
```

"eat"、"tea"、"ate" 是一组异位词，因为它们包含相同的字母，只是顺序不同。

## 问题分析

核心问题：如何判断两个字符串是异位词？

思考一下，"eat" 和 "tea" 有什么共同特征？

- 包含相同的字母
- 每个字母出现的次数相同

所以，我们可以把这个"共同特征"提取出来，作为哈希表的**键**。

## 解法一：排序作为键

**观察**：异位词排序后得到相同的字符串。

```
"eat" → 排序 → "aet"
"tea" → 排序 → "aet"
"ate" → 排序 → "aet"
```

排序后的字符串就是天然的"分组标识"。

```javascript
function groupAnagrams(strs) {
    const map = new Map();
    
    for (const str of strs) {
        // 排序后的字符串作为键
        const key = str.split('').sort().join('');
        
        if (!map.has(key)) {
            map.set(key, []);
        }
        map.get(key).push(str);
    }
    
    return Array.from(map.values());
}
```

### 执行过程

```
strs = ["eat","tea","tan","ate","nat","bat"]

处理 "eat": key = "aet", map = {"aet": ["eat"]}
处理 "tea": key = "aet", map = {"aet": ["eat","tea"]}
处理 "tan": key = "ant", map = {"aet": ["eat","tea"], "ant": ["tan"]}
处理 "ate": key = "aet", map = {"aet": ["eat","tea","ate"], ...}
处理 "nat": key = "ant", map = {..., "ant": ["tan","nat"]}
处理 "bat": key = "abt", map = {..., "abt": ["bat"]}

结果：[["eat","tea","ate"], ["tan","nat"], ["bat"]]
```

### 复杂度

- **时间**：O(n × k log k)，n 是字符串个数，k 是字符串最大长度
- **空间**：O(n × k)

## 解法二：字符计数作为键

排序需要 O(k log k)，能不能更快？

**另一种思路**：统计每个字母的出现次数，用计数数组作为键。

```
"eat": a=1, e=1, t=1 → "1#0#0#0#1#...#1#..."
"tea": a=1, e=1, t=1 → "1#0#0#0#1#...#1#..."  相同！
```

```javascript
function groupAnagrams(strs) {
    const map = new Map();
    
    for (const str of strs) {
        // 统计每个字母的出现次数
        const count = new Array(26).fill(0);
        for (const char of str) {
            count[char.charCodeAt(0) - 97]++;
        }
        
        // 用计数数组生成键（需要分隔符避免歧义）
        const key = count.join('#');
        
        if (!map.has(key)) {
            map.set(key, []);
        }
        map.get(key).push(str);
    }
    
    return Array.from(map.values());
}
```

### 为什么需要分隔符？

如果不用分隔符：
- count = [1, 2, 3] → "123"
- count = [12, 3] → "123"

两个不同的计数会产生相同的键，导致错误分组。

用分隔符后：
- count = [1, 2, 3] → "1#2#3"
- count = [12, 3] → "12#3"

### 复杂度

- **时间**：O(n × k)，遍历每个字符串的每个字符
- **空间**：O(n × k)

## 两种方法对比

| 方法 | 时间 | 实现难度 | 适用场景 |
|-----|------|---------|---------|
| 排序 | O(n × k log k) | 简单 | 通用，推荐面试使用 |
| 计数 | O(n × k) | 中等 | k 很大时更优 |

实际上，当 k 不大时（比如单词长度），排序方法更简洁，性能差距不明显。

## 设计哈希键的思路

这道题的核心是**设计一个好的哈希键**，使得：

1. **同一组**的元素产生**相同的键**
2. **不同组**的元素产生**不同的键**

这是一种重要的问题转化能力：把"分组"问题转化为"设计键"问题。

## 本章小结

字母异位词分组展示了设计哈希键的技巧：

1. **排序法**：异位词排序后相同，简单直观
2. **计数法**：字符计数相同，理论更优
3. **核心思想**：找到分组的"不变特征"，作为哈希键

这种"设计键"的思维在很多问题中都有应用，是哈希表的高级用法。
