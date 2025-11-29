# 实战：尽可能使字符串相等

这道题将滑动窗口应用到两个字符串的比较上，核心是将"相等代价"转化为"窗口内代价和"的约束。

## 问题描述

给你两个长度相同的字符串`s`和`t`。将`s`中的第`i`个字符变到`t`中的第`i`个字符需要`|s[i] - t[i]|`的开销。

你有一个最大预算`maxCost`。在转化时，总开销应不超过预算。

返回最大转化的子字符串长度。如果无法转化，返回0。

**示例**：
```
输入：s = "abcd", t = "bcdf", maxCost = 3
输出：3
解释：
"abc" -> "bcd"，开销为 |a-b| + |b-c| + |c-d| = 1+1+1 = 3

输入：s = "abcd", t = "cdef", maxCost = 3
输出：1
解释：每个字符的转化开销都是2，预算只够转1个
```

## 思路分析

### 问题转化

1. 先计算每个位置的转化代价：`cost[i] = |s[i] - t[i]|`
2. 问题变成：找最长的子数组，使得代价和 ≤ maxCost

这就是"长度最小的子数组"的反向问题：
- 原题：找代价和 ≥ target 的**最小**窗口
- 本题：找代价和 ≤ maxCost 的**最大**窗口

## 完整实现

```javascript
/**
 * @param {string} s
 * @param {string} t
 * @param {number} maxCost
 * @return {number}
 */
function equalSubstring(s, t, maxCost) {
    let left = 0;
    let cost = 0;    // 窗口内的总代价
    let maxLen = 0;
    
    for (let right = 0; right < s.length; right++) {
        // 扩展窗口，累加代价
        cost += Math.abs(s.charCodeAt(right) - t.charCodeAt(right));
        
        // 代价超限，收缩窗口
        while (cost > maxCost) {
            cost -= Math.abs(s.charCodeAt(left) - t.charCodeAt(left));
            left++;
        }
        
        // 更新最大长度
        maxLen = Math.max(maxLen, right - left + 1);
    }
    
    return maxLen;
}
```

## 执行过程

```
s = "abcd", t = "bcdf", maxCost = 3

代价数组（隐式计算）：
|a-b|=1, |b-c|=1, |c-d|=1, |d-f|=2

right=0: cost=1, cost≤3, maxLen=1
right=1: cost=2, cost≤3, maxLen=2
right=2: cost=3, cost≤3, maxLen=3
right=3: cost=5, cost>3
  收缩：cost-=1, left=1, cost=4>3
  收缩：cost-=1, left=2, cost=3≤3
  maxLen=3

结果：3
```

## 优化：不需要显式计算代价数组

原地计算每个位置的代价，不需要预处理数组。

## 另一种写法：先计算代价数组

```javascript
function equalSubstring(s, t, maxCost) {
    const n = s.length;
    
    // 预计算代价数组
    const cost = new Array(n);
    for (let i = 0; i < n; i++) {
        cost[i] = Math.abs(s.charCodeAt(i) - t.charCodeAt(i));
    }
    
    // 滑动窗口：找代价和 ≤ maxCost 的最长子数组
    let left = 0;
    let sum = 0;
    let maxLen = 0;
    
    for (let right = 0; right < n; right++) {
        sum += cost[right];
        
        while (sum > maxCost) {
            sum -= cost[left];
            left++;
        }
        
        maxLen = Math.max(maxLen, right - left + 1);
    }
    
    return maxLen;
}
```

## 复杂度分析

**时间复杂度**：O(n)
- 每个位置最多访问两次

**空间复杂度**：O(1)
- 只用了几个变量

## 变体：用前缀和 + 二分

也可以用前缀和 + 二分查找：

```javascript
function equalSubstring(s, t, maxCost) {
    const n = s.length;
    
    // 前缀和
    const prefix = new Array(n + 1).fill(0);
    for (let i = 0; i < n; i++) {
        prefix[i + 1] = prefix[i] + Math.abs(s.charCodeAt(i) - t.charCodeAt(i));
    }
    
    let maxLen = 0;
    
    for (let right = 0; right < n; right++) {
        // 二分找最小的left使得 prefix[right+1] - prefix[left] <= maxCost
        let lo = 0, hi = right + 1;
        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (prefix[right + 1] - prefix[mid] <= maxCost) {
                hi = mid;
            } else {
                lo = mid + 1;
            }
        }
        maxLen = Math.max(maxLen, right - lo + 1);
    }
    
    return maxLen;
}
```

时间O(n log n)，不如滑动窗口O(n)高效。

## 小结

使字符串相等的要点：

1. **问题转化**：相等代价 → 代价数组 → 子数组和约束
2. **窗口状态**：窗口内代价之和
3. **收缩条件**：代价和超过预算时收缩
4. **求最大窗口**：收缩后更新最大长度

这道题展示了滑动窗口的通用性：只要能定义窗口的"合法性"和"单调性"，就可以用滑动窗口解决。
