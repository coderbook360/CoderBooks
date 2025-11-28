# 实战：字母异位词分组

这道题展示了哈希表在"分组"问题中的强大能力——把具有相同特征的元素聚合在一起。

## 问题描述

给你一个字符串数组，请将**字母异位词**组合在一起。字母异位词是由重新排列源单词的所有字母得到的一个新单词。

**示例**：
```
输入: strs = ["eat","tea","tan","ate","nat","bat"]
输出: [["bat"],["nat","tan"],["ate","eat","tea"]]

解释:
- "eat", "tea", "ate" 都由 a, e, t 组成
- "tan", "nat" 都由 a, n, t 组成
- "bat" 只有自己
```

## 思路分析

### 关键洞察

字母异位词的特点：**排序后相同**。

```
"eat" → 排序 → "aet"
"tea" → 排序 → "aet"
"ate" → 排序 → "aet"
```

所以，排序后的字符串可以作为**分组的键**。

### 哈希表分组

用Map存储：`排序后的字符串 → 原字符串数组`

## 完整实现

```javascript
/**
 * @param {string[]} strs
 * @return {string[][]}
 */
function groupAnagrams(strs) {
    const map = new Map();
    
    for (const str of strs) {
        // 排序后作为键
        const key = str.split('').sort().join('');
        
        if (!map.has(key)) {
            map.set(key, []);
        }
        map.get(key).push(str);
    }
    
    return [...map.values()];
}
```

## 执行过程图解

以`["eat","tea","tan","ate","nat","bat"]`为例：

```
处理 "eat":
  排序 → "aet"
  map: {"aet" → ["eat"]}

处理 "tea":
  排序 → "aet"
  map: {"aet" → ["eat", "tea"]}

处理 "tan":
  排序 → "ant"
  map: {"aet" → ["eat", "tea"], "ant" → ["tan"]}

处理 "ate":
  排序 → "aet"
  map: {"aet" → ["eat", "tea", "ate"], "ant" → ["tan"]}

处理 "nat":
  排序 → "ant"
  map: {"aet" → ["eat", "tea", "ate"], "ant" → ["tan", "nat"]}

处理 "bat":
  排序 → "abt"
  map: {"aet" → ["eat","tea","ate"], "ant" → ["tan","nat"], "abt" → ["bat"]}

结果: [["eat","tea","ate"], ["tan","nat"], ["bat"]]
```

## 优化：用字符计数作为键

排序的时间复杂度是O(k log k)，其中k是字符串长度。

可以用字符计数代替排序，时间复杂度降为O(k)：

```javascript
function groupAnagrams(strs) {
    const map = new Map();
    
    for (const str of strs) {
        // 统计字符频率作为键
        const count = new Array(26).fill(0);
        for (const char of str) {
            count[char.charCodeAt(0) - 97]++;
        }
        const key = count.join('#');  // "1#0#0#...#0" 格式
        
        if (!map.has(key)) {
            map.set(key, []);
        }
        map.get(key).push(str);
    }
    
    return [...map.values()];
}
```

**为什么用`#`分隔？**

如果直接用`count.join('')`，会有歧义：
- `[1, 2, 3]` → "123"
- `[12, 3]` → "123"

用分隔符可以避免这个问题。

## 两种方法对比

| 方法 | 键生成时间 | 总时间复杂度 |
|------|------------|--------------|
| 排序 | O(k log k) | O(n × k log k) |
| 计数 | O(k) | O(n × k) |

其中n是字符串数量，k是平均长度。

当字符串很长时，计数法更优。但排序法代码更简洁，面试时推荐使用。

## 简洁写法

利用Map的特性：

```javascript
function groupAnagrams(strs) {
    const map = new Map();
    
    for (const str of strs) {
        const key = [...str].sort().join('');
        const group = map.get(key) || [];
        group.push(str);
        map.set(key, group);
    }
    
    return [...map.values()];
}
```

## 边界情况

| 输入 | 分析 | 结果 |
|------|------|------|
| `[""]` | 空字符串也是一组 | `[[""]]` |
| `["a"]` | 单字符 | `[["a"]]` |
| `["",""]` | 多个空字符串 | `[["",""]]` |

## 复杂度分析

**时间复杂度：O(n × k log k)**
- n个字符串
- 每个字符串排序O(k log k)

**空间复杂度：O(n × k)**
- 存储所有字符串

## 分组问题的通用模式

字母异位词分组是"分组"问题的典型代表。通用模式：

```javascript
function groupBy(items, getKey) {
    const map = new Map();
    
    for (const item of items) {
        const key = getKey(item);
        if (!map.has(key)) {
            map.set(key, []);
        }
        map.get(key).push(item);
    }
    
    return [...map.values()];
}

// 字母异位词分组
const result = groupBy(strs, str => [...str].sort().join(''));
```

## 小结

字母异位词分组的核心：

1. **特征提取**：字母异位词排序后相同
2. **哈希分组**：用排序结果作为Map的键
3. **两种键**：排序法简单，计数法更快

这道题的思想可以推广到任何"按某种特征分组"的问题——关键是找到能唯一标识这一组的"键"。
