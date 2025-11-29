# 实战：替换后的最长重复字符

这道题展示了滑动窗口的另一种变体：不是直接维护元素，而是维护**可替换的操作次数**。

## 问题描述

给你一个字符串`s`和一个整数`k`，你可以选择字符串中的任意字符，将其更改为任何其他大写英文字符。你最多可以执行`k`次操作。

返回执行上述操作后，包含相同字母的最长子串的长度。

**示例**：
```
输入：s = "ABAB", k = 2
输出：4
解释：用 2 次操作把 "ABAB" 变成 "AAAA" 或 "BBBB"

输入：s = "AABABBA", k = 1
输出：4
解释：把中间的 'B' 变成 'A'，得到 "AAAAABA"，最长重复子串是 "AAAA"
```

## 思路分析

### 核心洞察

对于一个窗口，要使其全部相同：
- 保留出现最多的字符
- 替换其他字符

**需要替换的次数 = 窗口长度 - 窗口中最多的字符数**

当替换次数 ≤ k 时，窗口合法。

### 窗口策略

- **窗口状态**：各字符的出现次数，以及最大出现次数
- **收缩条件**：窗口长度 - 最大出现次数 > k
- **目标**：找最大的合法窗口

## 完整实现

```javascript
/**
 * @param {string} s
 * @param {number} k
 * @return {number}
 */
function characterReplacement(s, k) {
    const count = new Array(26).fill(0);
    let maxCount = 0;  // 窗口中出现最多的字符的次数
    let left = 0;
    let maxLen = 0;
    
    for (let right = 0; right < s.length; right++) {
        // 扩展窗口
        const idx = s.charCodeAt(right) - 65;  // 'A' = 65
        count[idx]++;
        maxCount = Math.max(maxCount, count[idx]);
        
        // 需要替换的次数 > k，收缩窗口
        while (right - left + 1 - maxCount > k) {
            count[s.charCodeAt(left) - 65]--;
            left++;
        }
        
        // 更新最大长度
        maxLen = Math.max(maxLen, right - left + 1);
    }
    
    return maxLen;
}
```

## 关键问题：maxCount不需要更新？

收缩窗口时，我们没有更新`maxCount`。这样做是否正确？

**是的**，因为：

1. 我们要找的是**最大**窗口
2. `maxCount`只会增大，不会减小
3. 如果当前`maxCount`不能让窗口更大，那更小的`maxCount`更不行
4. 所以不更新`maxCount`也不会漏掉更优解

这是一个巧妙的优化：用**历史最大值**代替**当前最大值**。

## 执行过程

```
s = "AABABBA", k = 1

right=0: 'A', count[A]=1, maxCount=1
  窗口长度1-1=0 ≤ 1, maxLen=1

right=1: 'A', count[A]=2, maxCount=2
  窗口长度2-2=0 ≤ 1, maxLen=2

right=2: 'B', count[B]=1, maxCount=2
  窗口长度3-2=1 ≤ 1, maxLen=3

right=3: 'A', count[A]=3, maxCount=3
  窗口长度4-3=1 ≤ 1, maxLen=4

right=4: 'B', count[B]=2, maxCount=3
  窗口长度5-3=2 > 1, 收缩
  移出'A', count[A]=2, left=1
  窗口长度4-3=1 ≤ 1, maxLen=4

right=5: 'B', count[B]=3, maxCount=3
  窗口长度5-3=2 > 1, 收缩
  移出'A', count[A]=1, left=2
  窗口长度4-3=1 ≤ 1, maxLen=4

right=6: 'A', count[A]=2, maxCount=3
  窗口长度5-3=2 > 1, 收缩
  移出'B', count[B]=2, left=3
  窗口长度4-3=1 ≤ 1, maxLen=4

结果：4
```

## 更严格的版本

如果需要精确的`maxCount`，可以每次收缩后重新计算：

```javascript
function characterReplacement(s, k) {
    const count = new Array(26).fill(0);
    let left = 0;
    let maxLen = 0;
    
    for (let right = 0; right < s.length; right++) {
        count[s.charCodeAt(right) - 65]++;
        
        // 计算当前窗口的最大字符数
        const maxCount = Math.max(...count);
        
        while (right - left + 1 - maxCount > k) {
            count[s.charCodeAt(left) - 65]--;
            left++;
        }
        
        maxLen = Math.max(maxLen, right - left + 1);
    }
    
    return maxLen;
}
```

但这样每次要O(26)计算最大值，总时间O(26n)，没有原版O(n)高效。

## 复杂度分析

**时间复杂度**：O(n)
- 每个字符最多进出窗口各一次

**空间复杂度**：O(1)
- 固定大小的计数数组

## 小结

替换后最长重复字符的要点：

1. **核心公式**：需替换数 = 窗口长度 - 最大出现次数
2. **收缩条件**：需替换数 > k
3. **优化技巧**：maxCount只增不减，不影响找最大窗口
4. **问题转化**：将"替换"问题转化为"窗口合法性"问题

这道题展示了滑动窗口的灵活性：窗口的"合法性"可以用各种方式定义。
