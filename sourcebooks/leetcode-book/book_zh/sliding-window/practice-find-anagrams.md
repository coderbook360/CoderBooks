# 实战：找到字符串中所有字母异位词

这是"字符串的排列"的变体，不是判断是否存在，而是找出**所有**满足条件的起始位置。

## 问题描述

给定两个字符串`s`和`p`，找到`s`中所有`p`的**异位词**的子串，返回这些子串的起始索引。

异位词指由相同字母重排列形成的字符串（包括相同的字符串）。

**示例**：
```
输入：s = "cbaebabacd", p = "abc"
输出：[0, 6]
解释：
起始索引 0 的子串是 "cba"，是 "abc" 的异位词
起始索引 6 的子串是 "bac"，是 "abc" 的异位词

输入：s = "abab", p = "ab"
输出：[0, 1, 2]
```

## 思路分析

和"字符串的排列"完全相同的思路：
- 固定大小的滑动窗口
- 判断窗口内字符频率是否与p相同
- 不同的是：找到时记录位置，继续滑动

## 完整实现

### 方法一：差异计数

```javascript
/**
 * @param {string} s
 * @param {string} p
 * @return {number[]}
 */
function findAnagrams(s, p) {
    if (p.length > s.length) return [];
    
    const result = [];
    const count = new Array(26).fill(0);
    const k = p.length;
    
    // 初始化
    for (let i = 0; i < k; i++) {
        count[p.charCodeAt(i) - 97]++;
        count[s.charCodeAt(i) - 97]--;
    }
    
    let diff = 0;
    for (let i = 0; i < 26; i++) {
        if (count[i] !== 0) diff++;
    }
    
    if (diff === 0) result.push(0);
    
    // 滑动
    for (let i = k; i < s.length; i++) {
        const add = s.charCodeAt(i) - 97;
        const remove = s.charCodeAt(i - k) - 97;
        
        // 加入新字符
        if (count[add] === 0) diff++;
        count[add]--;
        if (count[add] === 0) diff--;
        
        // 移出旧字符
        if (count[remove] === 0) diff++;
        count[remove]++;
        if (count[remove] === 0) diff--;
        
        if (diff === 0) {
            result.push(i - k + 1);  // 记录起始位置
        }
    }
    
    return result;
}
```

### 方法二：Map + valid计数

```javascript
function findAnagrams(s, p) {
    const need = new Map();
    for (const c of p) {
        need.set(c, (need.get(c) || 0) + 1);
    }
    
    const window = new Map();
    const result = [];
    let valid = 0;
    let left = 0;
    
    for (let right = 0; right < s.length; right++) {
        const c = s[right];
        
        // 扩展窗口
        if (need.has(c)) {
            window.set(c, (window.get(c) || 0) + 1);
            if (window.get(c) === need.get(c)) {
                valid++;
            }
        }
        
        // 收缩窗口
        while (right - left + 1 >= p.length) {
            // 判断是否是异位词
            if (valid === need.size) {
                result.push(left);
            }
            
            // 移出左边字符
            const d = s[left];
            if (need.has(d)) {
                if (window.get(d) === need.get(d)) {
                    valid--;
                }
                window.set(d, window.get(d) - 1);
            }
            left++;
        }
    }
    
    return result;
}
```

## 执行过程

```
s = "cbaebabacd", p = "abc"

初始窗口 [0,2]: "cba"
count: a=0, b=0, c=0 (p的abc各+1, s的cba各-1)
diff = 0 ✓, 记录0

滑动到 [1,3]: "bae"
移出'c': diff变化
加入'e': diff变化
diff ≠ 0

滑动到 [2,4]: "aeb"
...

滑动到 [6,8]: "bac"
diff = 0 ✓, 记录6

结果：[0, 6]
```

## 与"字符串的排列"的对比

| 问题 | 返回值 | 找到后 |
|-----|--------|-------|
| 字符串的排列 | boolean | 立即返回true |
| 找所有异位词 | number[] | 记录位置，继续 |

代码几乎相同，只是结果处理不同。

## 复杂度分析

**时间复杂度**：O(n)
- n是s的长度
- 每个字符最多访问两次

**空间复杂度**：O(1)
- 固定大小的计数数组

## 小结

找所有异位词的要点：

1. **固定窗口**：窗口大小等于p的长度
2. **滑动记录**：每次检查，满足条件就记录起始位置
3. **差异计数**：高效判断频率是否相同
4. **与排列判断同源**：代码结构几乎一样

这类问题的关键是理解"异位词 = 字符频率相同"。
